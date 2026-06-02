import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'
import { nanoid } from 'nanoid'
import { SupabaseProvider, createSupabaseClient } from './supabase'

// Pluggable realtime layer. Priority: Supabase Realtime → y-websocket → local.

export type SyncMode = 'local' | 'websocket' | 'supabase'

export interface SyncHandle {
  doc: Y.Doc
  awareness: Awareness
  mode: SyncMode
  room: string
  onStatus: (cb: (connected: boolean) => void) => () => void
  destroy: () => void
}

const WS_URL_ENV = (import.meta.env.VITE_SYNC_WS_URL as string | undefined)?.trim() || ''
const SAME_ORIGIN = (import.meta.env.VITE_SYNC_SAME_ORIGIN as string | undefined) === '1'

function resolveWsUrl(): string {
  if (WS_URL_ENV) return WS_URL_ENV
  if (SAME_ORIGIN && typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.host}`
  }
  return ''
}
const WS_URL = resolveWsUrl()

export function getRoom(): string {
  const params = new URLSearchParams(window.location.search)
  let room = params.get('room')
  if (!room) {
    room = 'fletchers-' + nanoid(8)
    params.set('room', room)
    const url = `${window.location.pathname}?${params.toString()}${window.location.hash}`
    window.history.replaceState({}, '', url)
  }
  return room
}

/** Same-origin BroadcastChannel provider — syncs tabs with no server. */
class BroadcastProvider {
  private bc: BroadcastChannel
  private destroyed = false
  constructor(room: string, private doc: Y.Doc, private awareness: Awareness) {
    this.bc = new BroadcastChannel('fletchers-bar:' + room)
    this.bc.onmessage = this.onMessage
    doc.on('update', this.onDocUpdate)
    awareness.on('update', this.onAwarenessUpdate)
    this.bc.postMessage({ t: 'query' })
    this.broadcastAwareness([doc.clientID])
    window.addEventListener('beforeunload', this.beforeUnload)
  }
  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return
    this.bc.postMessage({ t: 'update', d: update })
  }
  private broadcastAwareness(clients: number[]) {
    this.bc.postMessage({ t: 'awareness', d: encodeAwarenessUpdate(this.awareness, clients) })
  }
  private onAwarenessUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
    this.broadcastAwareness([...added, ...updated, ...removed])
  }
  private onMessage = (e: MessageEvent) => {
    if (this.destroyed) return
    const msg = e.data
    if (msg.t === 'update') Y.applyUpdate(this.doc, msg.d, this)
    else if (msg.t === 'query') {
      this.bc.postMessage({ t: 'update', d: Y.encodeStateAsUpdate(this.doc) })
      this.broadcastAwareness(Array.from(this.awareness.getStates().keys()))
    } else if (msg.t === 'awareness') applyAwarenessUpdate(this.awareness, msg.d, this)
  }
  private beforeUnload = () => this.awareness.setLocalState(null)
  destroy() {
    this.destroyed = true
    this.doc.off('update', this.onDocUpdate)
    this.awareness.off('update', this.onAwarenessUpdate)
    window.removeEventListener('beforeunload', this.beforeUnload)
    this.bc.close()
  }
}

export function createSync(): SyncHandle {
  const room = getRoom()
  const doc = new Y.Doc()
  const statusCbs = new Set<(c: boolean) => void>()
  const idb = new IndexeddbPersistence('fletchers-bar:' + room, doc)

  let mode: SyncMode
  let awareness: Awareness
  let ws: WebsocketProvider | null = null
  let bc: BroadcastProvider | null = null
  let sb: SupabaseProvider | null = null

  const supabase = createSupabaseClient()

  if (supabase) {
    mode = 'supabase'
    awareness = new Awareness(doc)
    sb = new SupabaseProvider(supabase, room, doc, awareness)
    sb.onStatus((connected) => statusCbs.forEach((cb) => cb(connected)))
  } else if (WS_URL) {
    mode = 'websocket'
    ws = new WebsocketProvider(WS_URL, room, doc)
    awareness = ws.awareness
    ws.on('status', (e: { status: string }) => {
      const connected = e.status === 'connected'
      statusCbs.forEach((cb) => cb(connected))
    })
  } else {
    mode = 'local'
    awareness = new Awareness(doc)
    bc = new BroadcastProvider(room, doc, awareness)
    idb.whenSynced.then(() => statusCbs.forEach((cb) => cb(true)))
  }

  return {
    doc,
    awareness,
    mode,
    room,
    onStatus(cb) {
      statusCbs.add(cb)
      return () => statusCbs.delete(cb)
    },
    destroy() {
      bc?.destroy()
      ws?.destroy()
      sb?.destroy()
      idb.destroy()
      doc.destroy()
    },
  }
}
