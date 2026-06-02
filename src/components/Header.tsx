import { useState } from 'react'
import { useItems, useBar, usePresence, useVersionNames, saveVersion, restoreVersion, undo, redo, useUndoState } from '../sync/store'
import { sync } from '../sync/store'
import { useUI, type ViewMode } from '../lib/ui'
import { toCSV, downloadText, downloadDataUrl, buildSchedulePdf } from '../lib/export'
import { planSnapshot, threeSnapshot } from '../lib/snapshot'

export default function Header({ connected }: { connected: boolean }) {
  const items = useItems()
  const bar = useBar()
  const presence = usePresence()
  const versions = useVersionNames()
  const { canUndo, canRedo } = useUndoState()
  const { view, setView, showOverhead, toggleOverhead, showReference, toggleReference, flipX, toggleFlip, showPanel, togglePanel, name } = useUI()
  const [copied, setCopied] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const mode = sync().mode
  const isCloud = mode === 'supabase' || mode === 'websocket'

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  const myColor = presence.length >= 0 ? '#35705E' : '#35705E'

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-stone/30 bg-paper px-4 py-2.5">
      <div className="flex items-baseline gap-2">
        <span className="wordmark text-[20px] font-semibold text-pine">Fletcher's</span>
        <span className="text-[12px] text-stone">— Bar Builder</span>
      </div>

      {/* view toggle */}
      <div className="ml-2 flex rounded-md border border-stone/30 bg-white p-0.5">
        {(['2d', '3d', 'north', 'south', 'east', 'west'] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded px-2 py-1 text-[12px] font-medium capitalize ${
              view === v ? 'bg-ink text-paper' : 'text-ink/60 hover:bg-paper'
            }`}
          >
            {v === '2d' ? 'Plan' : v === '3d' ? '3D' : v}
          </button>
        ))}
      </div>

      <button
        onClick={toggleOverhead}
        className={`rounded-md border px-2.5 py-1 text-[12px] ${
          showOverhead ? 'border-ochre bg-ochre/10 text-walnut' : 'border-stone/30 text-stone'
        }`}
      >
        Overhead joinery
      </button>
      <button
        onClick={toggleReference}
        className={`rounded-md border px-2.5 py-1 text-[12px] ${
          showReference ? 'border-navy bg-navy/10 text-navy' : 'border-stone/30 text-stone'
        }`}
      >
        Reference (A.07 + renders)
      </button>
      <button
        onClick={toggleFlip}
        className={`rounded-md border px-2.5 py-1 text-[12px] ${
          flipX ? 'border-pine bg-pine/10 text-pine' : 'border-stone/30 text-stone'
        }`}
        title="Flip the plan east ⇄ west"
      >
        Flip ⇄
      </button>

      {/* undo / redo (local edits only) */}
      <div className="ml-1 flex rounded-md border border-stone/30 bg-white p-0.5">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (⌘Z)"
          className="rounded px-2 py-1 text-[12px] text-ink hover:bg-paper disabled:opacity-30"
        >
          ↶
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (⇧⌘Z)"
          className="rounded px-2 py-1 text-[12px] text-ink hover:bg-paper disabled:opacity-30"
        >
          ↷
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* hide / show the right details panel */}
        <button
          onClick={togglePanel}
          className={`rounded-md border px-2.5 py-1 text-[12px] ${
            showPanel ? 'border-pine bg-pine/10 text-pine' : 'border-stone/30 text-stone'
          }`}
          title={showPanel ? 'Hide the details panel' : 'Show the details panel'}
        >
          Details
        </button>

        {/* presence */}
        <div className="flex items-center -space-x-1.5">
          <Avatar name={name ?? 'You'} color={myColor} ring />
          {presence.map((p) => (
            <Avatar key={p.id} name={p.state.name} color={p.state.color} />
          ))}
        </div>

        {/* versions */}
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value
            if (v === '__save') {
              const n = window.prompt('Name this version (e.g. "Option A")')
              if (n) saveVersion(n, Date.now())
            } else if (v) {
              restoreVersion(v)
            }
          }}
          className="rounded-md border border-stone/30 bg-white px-2 py-1 text-[12px] text-ink"
          title="Versions"
        >
          <option value="">Versions…</option>
          <option value="__save">＋ Save current as…</option>
          {versions.length > 0 && <option disabled>──────────</option>}
          {versions.map((v) => (
            <option key={v} value={v}>
              ↺ {v}
            </option>
          ))}
        </select>

        {/* export */}
        <div className="relative">
          <button
            onClick={() => setExportOpen((o) => !o)}
            className="rounded-md border border-stone/30 bg-white px-2.5 py-1 text-[12px] text-ink hover:bg-paper"
          >
            Export ▾
          </button>
          {exportOpen && (
            <div
              className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-md border border-stone/30 bg-white text-[12px] shadow-panel"
              onMouseLeave={() => setExportOpen(false)}
            >
              <ExportItem label="Equipment schedule (CSV)" onClick={() => { downloadText('fletchers-bar-schedule.csv', toCSV(items, bar)); setExportOpen(false) }} />
              <ExportItem label="Full schedule + plans (PDF)" onClick={() => { buildSchedulePdf(items, bar, planSnapshot.get?.(), threeSnapshot.get?.()); setExportOpen(false) }} />
              <ExportItem label="2D plan (PNG)" onClick={() => { const d = planSnapshot.get?.(); if (d) downloadDataUrl('fletchers-bar-plan.png', d); setExportOpen(false) }} />
              <ExportItem label="3D snapshot (PNG)" onClick={() => { const d = threeSnapshot.get?.(); if (d) downloadDataUrl('fletchers-bar-3d.png', d); setExportOpen(false) }} />
            </div>
          )}
        </div>

        {/* share */}
        <button
          onClick={share}
          className="rounded-md bg-pine px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-pine/90"
          title={isCloud ? 'Live cross-device link — share with anyone' : 'Local link — same-browser tabs sync live'}
        >
          {copied ? 'Link copied ✓' : 'Share link'}
        </button>

        <span
          className={`flex items-center gap-1 text-[11px] ${isCloud && connected ? 'text-pine' : 'text-stone'}`}
          title={
            mode === 'supabase'
              ? 'Live via Supabase Realtime'
              : mode === 'websocket'
                ? 'Live via WebSocket'
                : 'Local sync (this browser only)'
          }
        >
          <span className={`h-2 w-2 rounded-full ${isCloud && connected ? 'bg-pine' : 'bg-stone'}`} />
          {isCloud ? (connected ? 'Live' : 'Connecting…') : 'Local'}
        </span>
      </div>
    </header>
  )
}

function Avatar({ name, color, ring }: { name: string; color: string; ring?: boolean }) {
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ${ring ? 'ring-2 ring-paper' : 'ring-2 ring-paper'}`}
      style={{ background: color }}
      title={name}
    >
      {initials}
    </span>
  )
}

function ExportItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full px-3 py-2 text-left text-ink hover:bg-paper">
      {label}
    </button>
  )
}
