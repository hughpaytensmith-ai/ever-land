import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'
import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js'

// ──────────────────────────────────────────────────────────────────────────
// Supabase Realtime provider for Yjs.
//
//   • Live edits + cursors  → Supabase Realtime "broadcast" (a hosted, always-
//     on websocket relay — no server of our own to run).
//   • Late-join / offline durability → a Postgres snapshot row per room, so a
//     fresh visitor sees the latest layout even when no peer is online
//     (true send-and-forget for emailing the link to Monique).
//
// Activated when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set at build.
// The anon key is public/client-safe; row access is governed by RLS (see
// supabase/schema.sql).
// ──────────────────────────────────────────────────────────────────────────

const SNAPSHOT_TABLE = 'bar_rooms'
const SAVE_DEBOUNCE_MS = 2500

function u8ToB64(u8: Uint8Array): string {
  let s = ''
  const CH = 0x8000
  for (let i = 0; i < u8.length; i += CH) {
    s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + CH)))
  }
  return btoa(s)
}
function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64)
  const u8 = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
  return u8
}

export class SupabaseProvider {
  private channel: RealtimeChannel
  private statusCbs = new Set<(c: boolean) => void>()
  private connected = false
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false

  constructor(
    private supabase: SupabaseClient,
    private room: string,
    private doc: Y.Doc,
    public awareness: Awareness,
  ) {
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
          await this.loadSnapshot()
          // ask any online peer for the freshest state, and announce presence
          this.send('yquery', new Uint8Array())
          this.broadcastAwareness([doc.clientID])
          // push current local state up so edits persist (no-op until the
          // snapshot table exists; harmless 404 otherwise)
          this.scheduleSave()
        }
      })

    doc.on('update', this.onUpdate)
    awareness.on('update', this.onAwareness)
    window.addEventListener('beforeunload', this.onUnload)
  }

  private emit() {
    this.statusCbs.forEach((cb) => cb(this.connected))
  }

  private send(event: string, bytes: Uint8Array) {
    if (this.destroyed) return
    this.channel.send({ type: 'broadcast', event, payload: { b: u8ToB64(bytes) } })
  }

  private onUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin !== this) this.send('yupdate', update) // don't echo remote updates
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

  private async loadSnapshot() {
    try {
      const { data } = await this.supabase.from(SNAPSHOT_TABLE).select('state').eq('id', this.room).maybeSingle()
      if (data?.state) Y.applyUpdate(this.doc, b64ToU8(data.state), this)
    } catch {
      /* snapshot table missing or unreachable — live broadcast still works */
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.saveSnapshot(), SAVE_DEBOUNCE_MS)
  }

  private async saveSnapshot() {
    if (this.destroyed) return
    try {
      await this.supabase
        .from(SNAPSHOT_TABLE)
        .upsert({ id: this.room, state: u8ToB64(Y.encodeStateAsUpdate(this.doc)), updated_at: new Date().toISOString() })
    } catch {
      /* persistence best-effort */
    }
  }

  onStatus(cb: (c: boolean) => void) {
    this.statusCbs.add(cb)
    return () => this.statusCbs.delete(cb)
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
