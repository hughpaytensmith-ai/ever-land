import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'
import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js'

// ──────────────────────────────────────────────────────────────────────────
// Supabase Realtime provider for Yjs.
//   • Live edits + cursors → Supabase Realtime broadcast.
//   • Durability → a Postgres snapshot row per room (bar_rooms).
//   • Audit log → bar_edits (who/what/when).  • Safety net → bar_room_backups.
//
// HARD RULE (the data-loss fix): we only ever SEED a room we've confirmed is
// empty server-side. `snapshotChecked` resolves after the first load attempt so
// bootstrap can decide safely; on a load error we report it so bootstrap treats
// the room as "exists" and never clobbers it with defaults.
// ──────────────────────────────────────────────────────────────────────────

const SNAPSHOT_TABLE = 'bar_rooms'
const EDITS_TABLE = 'bar_edits'
const BACKUPS_TABLE = 'bar_room_backups'
const SAVE_DEBOUNCE_MS = 2500
const BACKUP_MIN_INTERVAL_MS = 10 * 60 * 1000

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export interface SnapshotCheck { existed: boolean; errored: boolean }
export interface EditEntry { author: string | null; action: string | null; ts: string }

function u8ToB64(u8: Uint8Array): string {
  let s = ''
  const CH = 0x8000
  for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + CH)))
  return btoa(s)
}
function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64)
  const u8 = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
  return u8
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class SupabaseProvider {
  private channel: RealtimeChannel
  private statusCbs = new Set<(c: boolean) => void>()
  private saveStatusCbs = new Set<(s: SaveStatus) => void>()
  private connected = false
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false
  private lastBackupAt = 0
  private snapshotCheckedDone = false
  private snapshotResolve!: (v: SnapshotCheck) => void
  /** Resolves after the first snapshot load attempt — bootstrap awaits this
   *  before deciding whether to seed, so a populated room is never re-seeded. */
  public snapshotChecked: Promise<SnapshotCheck>

  constructor(
    private supabase: SupabaseClient,
    private room: string,
    private doc: Y.Doc,
    public awareness: Awareness,
  ) {
    this.snapshotChecked = new Promise((res) => (this.snapshotResolve = res))
    this.channel = supabase.channel('fbb:' + room, { config: { broadcast: { self: false } } })
    this.channel
      .on('broadcast', { event: 'yupdate' }, ({ payload }) => Y.applyUpdate(doc, b64ToU8(payload.b), this))
      .on('broadcast', { event: 'ystate' }, ({ payload }) => Y.applyUpdate(doc, b64ToU8(payload.b), this))
      .on('broadcast', { event: 'yquery' }, () => this.sendState())
      .on('broadcast', { event: 'awareness' }, ({ payload }) => applyAwarenessUpdate(awareness, b64ToU8(payload.b), this))
      .subscribe(async (status) => {
        const wasConnected = this.connected
        this.connected = status === 'SUBSCRIBED'
        if (this.connected !== wasConnected) this.emit()
        if (this.connected) {
          await this.loadSnapshot() // merges server state (CRDT) + resolves snapshotChecked once
          this.send('yquery', new Uint8Array())
          this.broadcastAwareness([doc.clientID])
        }
      })

    doc.on('update', this.onUpdate)
    awareness.on('update', this.onAwareness)
    window.addEventListener('beforeunload', this.onUnload)
  }

  private emit() {
    this.statusCbs.forEach((cb) => cb(this.connected))
  }
  private emitSave(s: SaveStatus) {
    this.saveStatusCbs.forEach((cb) => cb(s))
  }

  private send(event: string, bytes: Uint8Array) {
    if (this.destroyed) return
    this.channel.send({ type: 'broadcast', event, payload: { b: u8ToB64(bytes) } })
  }

  private onUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin !== this) this.send('yupdate', update)
    this.scheduleSave()
  }
  private sendState() {
    this.send('ystate', Y.encodeStateAsUpdate(this.doc))
  }
  private broadcastAwareness(clients: number[]) {
    this.send('awareness', encodeAwarenessUpdate(this.awareness, clients))
  }
  private onAwareness = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
    this.broadcastAwareness([...added, ...updated, ...removed])
  }
  private onUnload = () => this.awareness.setLocalState(null)

  // ── snapshot load (retrying; never falsely reports "empty" on error) ──
  private async loadSnapshot() {
    let result: SnapshotCheck = { existed: false, errored: true }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, error } = await this.supabase.from(SNAPSHOT_TABLE).select('state').eq('id', this.room).maybeSingle()
        if (error) throw error
        if (data?.state) {
          Y.applyUpdate(this.doc, b64ToU8(data.state), this)
          result = { existed: true, errored: false }
        } else {
          result = { existed: false, errored: false } // confirmed empty
        }
        break
      } catch {
        await sleep(400 * (attempt + 1))
      }
    }
    if (!this.snapshotCheckedDone) {
      this.snapshotCheckedDone = true
      this.snapshotResolve(result)
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.saveSnapshot(), SAVE_DEBOUNCE_MS)
  }

  private async saveSnapshot() {
    if (this.destroyed) return
    // Never persist an empty doc over a real room (belt-and-suspenders vs the clobber).
    if ((this.doc.getArray('items') as Y.Array<unknown>).length === 0) return
    this.emitSave('saving')
    const state = u8ToB64(Y.encodeStateAsUpdate(this.doc))
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { error } = await this.supabase
          .from(SNAPSHOT_TABLE)
          .upsert({ id: this.room, state, updated_at: new Date().toISOString() })
        if (error) throw error
        this.emitSave('saved')
        this.maybeBackup(state)
        return
      } catch {
        await sleep(600 * (attempt + 1))
      }
    }
    this.emitSave('error')
  }

  private maybeBackup(state: string) {
    const now = Date.now()
    if (now - this.lastBackupAt < BACKUP_MIN_INTERVAL_MS) return
    this.lastBackupAt = now
    this.supabase.from(BACKUPS_TABLE).insert({ room: this.room, state, ts: new Date().toISOString() }).then(
      () => {},
      () => {},
    )
  }

  // ── audit log ──
  logEdit(author: string | null, action: string) {
    if (this.destroyed) return
    this.supabase.from(EDITS_TABLE).insert({ room: this.room, author, action, ts: new Date().toISOString() }).then(
      () => {},
      () => {},
    )
  }
  async fetchEdits(limit = 60): Promise<EditEntry[]> {
    try {
      const { data } = await this.supabase
        .from(EDITS_TABLE)
        .select('author,action,ts')
        .eq('room', this.room)
        .order('ts', { ascending: false })
        .limit(limit)
      return (data as EditEntry[]) ?? []
    } catch {
      return []
    }
  }

  onStatus(cb: (c: boolean) => void) {
    this.statusCbs.add(cb)
    return () => this.statusCbs.delete(cb)
  }
  onSaveStatus(cb: (s: SaveStatus) => void) {
    this.saveStatusCbs.add(cb)
    return () => this.saveStatusCbs.delete(cb)
  }

  destroy() {
    this.destroyed = true
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.doc.off('update', this.onUpdate)
    this.awareness.off('update', this.onAwareness)
    window.removeEventListener('beforeunload', this.onUnload)
    this.supabase.removeChannel(this.channel)
  }
}

export function createSupabaseClient(): SupabaseClient | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
  if (!url || !key) return null
  return createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } })
}
