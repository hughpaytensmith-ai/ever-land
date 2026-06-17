import * as Y from 'yjs'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createSync, type SyncHandle } from './doc'
import type { SaveStatus } from './supabase'
import type { BarShell, CommentThread, EquipItem, PresenceState } from '../types'
import { DEFAULT_BAR } from '../config/bar'
import { buildDefaultItems } from '../config/equipment'
import { PRESENCE_COLORS } from '../config/theme'

// ── Singleton sync handle ──────────────────────────────────────────────────
let _sync: SyncHandle | null = null
export function sync(): SyncHandle {
  if (!_sync) _sync = createSync()
  return _sync
}

function yItems(): Y.Array<Y.Map<unknown>> {
  return sync().doc.getArray('items') as Y.Array<Y.Map<unknown>>
}
function yBar(): Y.Map<unknown> {
  return sync().doc.getMap('bar')
}
function yComments(): Y.Array<Y.Map<unknown>> {
  return sync().doc.getArray('comments') as Y.Array<Y.Map<unknown>>
}
function yVersions(): Y.Map<unknown> {
  return sync().doc.getMap('versions')
}

// ── (de)serialisation ───────────────────────────────────────────────────────
function itemToY(item: EquipItem): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  ;(Object.keys(item) as (keyof EquipItem)[]).forEach((k) => m.set(k, item[k]))
  return m
}
function yToItem(m: Y.Map<unknown>): EquipItem {
  return m.toJSON() as EquipItem
}

// ── Seeding ──────────────────────────────────────────────────────────────────
// Bump SEED_VERSION whenever the authoritative default layout changes. Rooms on
// an older version re-seed to the new layout (this is how the SP185 A.07
// correction propagates to the existing shared room).
export const SEED_VERSION = 6

// Seed ONLY a genuinely empty room — never wipe a populated one. (bootstrap also
// only calls this when the server snapshot is confirmed absent.) The old
// version-mismatch reseed did `items.delete(all)` and was the cause of the
// repeated data loss; layout changes now go via in-place migrations / scripts.
export function ensureSeeded() {
  const bar = yBar()
  const items = yItems()
  if (items.length > 0) {
    if (bar.get('seedVersion') === undefined) bar.set('seedVersion', SEED_VERSION)
    return
  }
  sync().doc.transact(() => {
    Object.entries(DEFAULT_BAR).forEach(([k, v]) => bar.set(k, v))
    bar.set('seeded', true)
    bar.set('seedVersion', SEED_VERSION)
    buildDefaultItems().forEach((it) => items.push([itemToY(it)]))
  })
}

// Migrate the bar SHELL dims in-place (without touching items) when the shell
// calibration changes — so the back-bar length fix reaches existing rooms
// while preserving the saved arrangement.
export const SHELL_VERSION = 1
export function migrateShell() {
  const bar = yBar()
  if (bar.get('shellVersion') === SHELL_VERSION) return
  sync().doc.transact(() => {
    if (bar.get('backLen') !== DEFAULT_BAR.backLen) bar.set('backLen', DEFAULT_BAR.backLen)
    bar.set('shellVersion', SHELL_VERSION)
  })
}

/** Remove duplicate items by id (self-heals a rare concurrent double-seed in a
 *  shared room — CRDT merge can otherwise leave two copies). Keeps the first. */
export function dedupeItems() {
  const arr = yItems()
  const seen = new Set<unknown>()
  const dup: number[] = []
  for (let i = 0; i < arr.length; i++) {
    const id = arr.get(i).get('id')
    if (seen.has(id)) dup.push(i)
    else seen.add(id)
  }
  if (dup.length) {
    sync().doc.transact(() => {
      for (let k = dup.length - 1; k >= 0; k--) arr.delete(dup[k], 1)
    })
  }
}

/** Wait for the server snapshot check, then seed ONLY if the room is confirmed
 *  empty — so a slow/cold load can never re-seed defaults over a saved room. */
export function bootstrap(onReady: () => void) {
  const s = sync()
  const finish = (snapshotExisted: boolean) => {
    if (!snapshotExisted) ensureSeeded() // seed only a confirmed-empty room
    migrateShell()
    dedupeItems()
    undoManager().clear() // keep the seed/migration out of the undo stack
    setTimeout(dedupeItems, 1800)
    onReady()
  }
  if (s.mode === 'supabase') {
    let done = false
    const go = (existed: boolean) => {
      if (done) return
      done = true
      finish(existed)
    }
    // On a load error we pass existed=true so we NEVER seed over a room that's
    // merely slow/unreachable. Backstop timeout also assumes "exists" (safe).
    s.snapshotChecked.then(({ existed, errored }) => go(existed || errored))
    setTimeout(() => go(true), 8000)
  } else if (s.mode === 'websocket') {
    setTimeout(() => finish(false), 1000)
  } else {
    setTimeout(() => finish(false), 250)
  }
}

// ── React hooks ──────────────────────────────────────────────────────────────
// getSnapshot must return a STABLE reference until the Yjs type actually
// changes — otherwise useSyncExternalStore detects a "changed" store on every
// render and loops. We cache the computed value and only recompute when a
// deep-observe bumps the version.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useY<T>(target: any, read: () => T): T {
  const version = useRef(0)
  const cache = useRef<{ v: number; val: T } | null>(null)
  const subscribe = useCallback(
    (cb: () => void) => {
      const handler = () => {
        version.current++
        cb()
      }
      target.observeDeep(handler)
      return () => target.unobserveDeep(handler)
    },
    [target],
  )
  const getSnapshot = () => {
    if (!cache.current || cache.current.v !== version.current) {
      cache.current = { v: version.current, val: read() }
    }
    return cache.current.val
  }
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function useItems(): EquipItem[] {
  return useY(yItems(), () => yItems().map(yToItem))
}

export function useBar(): BarShell {
  return useY(yBar(), () => {
    const m = yBar()
    const out = { ...DEFAULT_BAR }
    ;(Object.keys(DEFAULT_BAR) as (keyof BarShell)[]).forEach((k) => {
      const v = m.get(k)
      if (typeof v === 'number') out[k] = v
    })
    return out
  })
}

export function useComments(itemId?: string): CommentThread[] {
  return useY(yComments(), () => {
    const all = yComments().map((m) => m.toJSON() as CommentThread)
    return (itemId ? all.filter((c) => c.itemId === itemId) : all).sort((a, b) => a.ts - b.ts)
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────
// Edit log: who is making changes (set from the name prompt) + a short summary
// of each committed change, written to the bar_edits audit table.
let currentAuthor: string | null = null
function logEdit(action: string) {
  try {
    sync().logEdit(currentAuthor, action)
  } catch {
    /* logging is best-effort, never blocks an edit */
  }
}
function describePatch(patch: Partial<EquipItem>): string {
  const k = Object.keys(patch)
  if (k.includes('x') || k.includes('y')) return 'moved'
  if (k.includes('label')) return 'renamed'
  if (k.includes('placement')) return 're-homed'
  if (k.includes('w') || k.includes('d') || k.includes('h')) return 'resized'
  if (k.includes('z')) return 'set the height of'
  if (k.includes('rot')) return 'rotated'
  if (k.includes('hidden')) return patch.hidden ? 'hid' : 'showed'
  if (k.includes('archived')) return patch.archived ? 'archived' : 'restored'
  if (k.includes('status')) return 'set the status of'
  if (k.includes('price')) return 'priced'
  return 'edited'
}

function findItem(id: string): Y.Map<unknown> | null {
  const arr = yItems()
  for (let i = 0; i < arr.length; i++) {
    const m = arr.get(i)
    if (m.get('id') === id) return m
  }
  return null
}

export function updateItem(id: string, patch: Partial<EquipItem>) {
  const m = findItem(id)
  if (!m) return
  const label = (m.get('label') as string) || 'item'
  sync().doc.transact(() => {
    Object.entries(patch).forEach(([k, v]) => m.set(k, v as unknown))
  })
  logEdit(`${describePatch(patch)} ${label}`)
}

/** Current value of an item (non-reactive) — for the keyboard nudge handler. */
export function getItemSnapshot(id: string): EquipItem | null {
  const m = findItem(id)
  return m ? (m.toJSON() as EquipItem) : null
}

export function addItem(item: EquipItem) {
  yItems().push([itemToY(item)])
  logEdit(`added ${item.label}`)
}

export function removeItem(id: string) {
  const arr = yItems()
  for (let i = 0; i < arr.length; i++) {
    if (arr.get(i).get('id') === id) {
      const label = (arr.get(i).get('label') as string) || 'item'
      arr.delete(i, 1)
      logEdit(`removed ${label}`)
      return
    }
  }
}

export function updateBar(patch: Partial<BarShell>) {
  const m = yBar()
  sync().doc.transact(() => {
    Object.entries(patch).forEach(([k, v]) => m.set(k, v))
  })
  logEdit('adjusted the bar shell')
}

/** Current bar shell (non-reactive) — for the keyboard nudge handler. */
export function getBarSnapshot(): BarShell {
  const m = yBar()
  const out = { ...DEFAULT_BAR }
  ;(Object.keys(DEFAULT_BAR) as (keyof BarShell)[]).forEach((k) => {
    const v = m.get(k)
    if (typeof v === 'number') out[k] = v
  })
  return out
}

// ── Undo / redo ───────────────────────────────────────────────────────────
// Y.UndoManager over the items + bar. Its default trackedOrigins = {null}, so
// only LOCAL edits (our doc.transact, which carries no origin) are captured;
// remote provider edits (Supabase/WS/IndexedDB apply updates with the provider
// instance as origin) are excluded — so Undo never reverts a collaborator's
// change. captureTimeout coalesces rapid edits (a drag) into one undo step.
let _undo: Y.UndoManager | null = null
export function undoManager(): Y.UndoManager {
  if (!_undo) _undo = new Y.UndoManager([yItems(), yBar()], { captureTimeout: 350 })
  return _undo
}
export function undo() {
  undoManager().undo()
}
export function redo() {
  undoManager().redo()
}
export function useUndoState(): { canUndo: boolean; canRedo: boolean } {
  const mgr = undoManager()
  const [s, setS] = useState(() => ({ canUndo: mgr.canUndo(), canRedo: mgr.canRedo() }))
  useEffect(() => {
    const update = () => setS({ canUndo: mgr.canUndo(), canRedo: mgr.canRedo() })
    mgr.on('stack-item-added', update)
    mgr.on('stack-item-popped', update)
    mgr.on('stack-cleared', update)
    update()
    return () => {
      mgr.off('stack-item-added', update)
      mgr.off('stack-item-popped', update)
      mgr.off('stack-cleared', update)
    }
  }, [mgr])
  return s
}

export function addComment(c: CommentThread) {
  const m = new Y.Map<unknown>()
  Object.entries(c).forEach(([k, v]) => m.set(k, v))
  yComments().push([m])
}

// ── Versions (named snapshots) ───────────────────────────────────────────────
export interface Snapshot {
  name: string
  ts: number
  items: EquipItem[]
  bar: BarShell
}

export function saveVersion(name: string, ts: number) {
  const snap: Snapshot = {
    name,
    ts,
    items: yItems().map(yToItem),
    bar: yBar().toJSON() as BarShell,
  }
  yVersions().set(name, snap)
}

export function listVersions(): Snapshot[] {
  return (Array.from(yVersions().values()) as Snapshot[]).sort((a, b) => b.ts - a.ts)
}

export function restoreVersion(name: string) {
  const snap = yVersions().get(name) as Snapshot | undefined
  if (!snap) return
  sync().doc.transact(() => {
    const items = yItems()
    items.delete(0, items.length)
    snap.items.forEach((it) => items.push([itemToY(it)]))
    const bar = yBar()
    Object.entries(snap.bar).forEach(([k, v]) => bar.set(k, v))
  })
}

export function useVersionNames(): string[] {
  return useY(yVersions(), () => listVersions().map((s) => s.name))
}

// ── Presence / awareness ─────────────────────────────────────────────────────
let _presenceInit = false
export function initPresence(name: string) {
  currentAuthor = name // attribute edits to this person in the audit log
  const a = sync().awareness
  const color = PRESENCE_COLORS[a.clientID % PRESENCE_COLORS.length]
  a.setLocalState({ name, color, cursor: null } satisfies PresenceState)
  _presenceInit = true
}

// ── Save status + audit feed (for the Header indicator + History panel) ──────
export function useSaveStatus(): SaveStatus {
  const [s, setS] = useState<SaveStatus>('idle')
  useEffect(() => sync().onSaveStatus(setS), [])
  return s
}
export function fetchEdits(limit?: number) {
  return sync().fetchEdits(limit)
}

export function setCursor(x: number | null, y: number | null) {
  if (!_presenceInit) return
  const a = sync().awareness
  const prev = a.getLocalState() as PresenceState | null
  if (!prev) return
  a.setLocalStateField('cursor', x === null || y === null ? null : { x, y })
}

export function usePresence(): { id: number; state: PresenceState }[] {
  const a = sync().awareness
  const [states, setStates] = useState<{ id: number; state: PresenceState }[]>([])
  useEffect(() => {
    const update = () => {
      const out: { id: number; state: PresenceState }[] = []
      a.getStates().forEach((s, id) => {
        if (id === a.clientID) return
        if (s && (s as PresenceState).name) out.push({ id, state: s as PresenceState })
      })
      setStates(out)
    }
    a.on('change', update)
    update()
    return () => a.off('change', update)
  }, [a])
  return states
}
