import { useEffect, useState } from 'react'
import Header from './components/Header'
import Plan2D from './components/Plan2D'
import View3D from './components/View3D'
import SidePanel from './components/SidePanel'
import ReferenceDrawer from './components/ReferenceDrawer'
import ElevationView from './components/ElevationView'
import ErrorBoundary, { ThreeDFallback } from './components/ErrorBoundary'
import { sync, bootstrap, initPresence, undo, redo, getItemSnapshot, getBarSnapshot, updateItem } from './sync/store'
import { baseHeight } from './lib/geometry'
import { useUI } from './lib/ui'
import type { EquipItem } from './types'

const NAME_KEY = 'fletchers-bar:name'

export default function App() {
  const [ready, setReady] = useState(false)
  const [connected, setConnected] = useState(false)
  const view = useUI((s) => s.view)
  const name = useUI((s) => s.name)
  const setName = useUI((s) => s.setName)
  const showPanel = useUI((s) => s.showPanel)
  const togglePanel = useUI((s) => s.togglePanel)
  const [draftName, setDraftName] = useState('')

  // bootstrap sync + seed the §6 default layout
  useEffect(() => {
    const off = sync().onStatus(setConnected)
    bootstrap(() => setReady(true))
    // restore a remembered name
    const saved = localStorage.getItem(NAME_KEY)
    if (saved) {
      setName(saved)
    }
    return off
  }, [setName])

  // start presence once we have a name
  useEffect(() => {
    if (name) {
      initPresence(name)
      localStorage.setItem(NAME_KEY, name)
    }
  }, [name])

  // keyboard: undo/redo + arrow-key nudge of the selected item.
  // Live state is read via useUI.getState() so the handler never goes stale.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      const mod = e.metaKey || e.ctrlKey

      // undo / redo — ⌘Z, ⇧⌘Z (and ⌘Y)
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        redo()
        return
      }
      if (mod) return

      // arrow-key nudge — 10mm, or 1mm with Shift
      const horiz = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
      const vert = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
      if (!horiz && !vert) return
      const id = useUI.getState().selectedId
      if (!id) return
      e.preventDefault()
      const it = getItemSnapshot(id)
      if (!it) return
      const step = e.shiftKey ? 1 : 10
      const v = useUI.getState().view
      const fx = useUI.getState().flipX
      const patch: Partial<EquipItem> = {}
      if (v === '2d' || v === '3d') {
        // plan/3D: horizontal → X (flip-aware in the plan), vertical → Y (depth)
        if (horiz) patch.x = it.x + (fx && v === '2d' ? -horiz : horiz) * step
        if (vert) patch.y = it.y + vert * step
      } else {
        // elevation: horizontal → along-axis (X for N/S, depth for E/W; mirrored
        // on the flipped faces S/E), vertical → base height z (up = raise)
        const flipFace = v === 'south' || v === 'east'
        const axisIsX = v === 'north' || v === 'south'
        if (horiz) {
          const s = (flipFace ? -horiz : horiz) * step
          if (axisIsX) patch.x = it.x + s
          else patch.y = it.y + s
        }
        if (vert) {
          const base = typeof it.z === 'number' ? it.z : baseHeight(it, getBarSnapshot())
          patch.z = Math.max(0, base + (vert === -1 ? step : -step))
        }
      }
      updateItem(id, patch)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-paper">
        <div className="wordmark animate-pulse text-[22px] text-pine">Fletcher's — Bar Builder</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-paper text-ink">
      <Header connected={connected} />
      <div className="relative flex min-h-0 flex-1">
        <ReferenceDrawer />
        <main className="min-w-0 flex-1">
          {/* Each view is isolated: a 3D/WebGL failure shows a small fallback in
              that pane only — the 2D plan + elevations stay fully usable. */}
          {view === '2d' ? (
            <ErrorBoundary label="2D">
              <Plan2D />
            </ErrorBoundary>
          ) : view === '3d' ? (
            <ErrorBoundary label="3D" fallback={<ThreeDFallback />}>
              <View3D />
            </ErrorBoundary>
          ) : (
            <ErrorBoundary key={view} label="elevation">
              <ElevationView dir={view} />
            </ErrorBoundary>
          )}
        </main>
        {showPanel && (
          <>
            {/* dim backdrop behind the drawer on phones */}
            <div className="fixed inset-0 z-30 bg-ink/30 md:hidden" onClick={togglePanel} aria-hidden />
            <SidePanel />
          </>
        )}
      </div>

      {!name && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setName(draftName.trim() || 'Guest')
            }}
            className="w-[340px] rounded-xl border border-stone/30 bg-paper p-6 shadow-panel"
          >
            <div className="wordmark text-[22px] text-pine">Fletcher's — Bar Builder</div>
            <p className="mt-1 text-[12px] text-stone">
              Shared live layout for the Fletcher's bar. Enter a name so your collaborator can see your cursor.
            </p>
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Your name (Hugh / Monique…)"
              className="mt-4 w-full rounded-md border border-stone/30 px-3 py-2 text-[14px]"
            />
            <button className="mt-3 w-full rounded-md bg-pine py-2 text-[14px] font-semibold text-white hover:bg-pine/90">
              Open the bar
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
