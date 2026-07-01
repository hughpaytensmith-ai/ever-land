import { useState } from 'react'
import { updateItem, removeItem, useComments, addComment, useBar } from '../sync/store'
import { useUI } from '../lib/ui'
import { STATUS_COLOR, STATUS_LABEL } from '../config/theme'
import { yBands, totalDepth } from '../config/bar'
import type { BarShell, EquipItem, Placement, Status } from '../types'

const STATUSES: Status[] = ['proposed', 'confirmed', 'ordered', 'risk']

const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: 'front-top', label: 'Front · on bench' },
  { value: 'front-under', label: 'Front · under bench' },
  { value: 'back-bench', label: 'Back · on bench' },
  { value: 'back-under', label: 'Back · under bench' },
  { value: 'back-wall', label: 'Back · wall' },
  { value: 'plant', label: 'East return' },
  { value: 'overhead', label: 'Overhead' },
]

function benchHeight(item: EquipItem, bar: BarShell): number {
  return item.placement.startsWith('front') ? bar.frontHeight : bar.benchHeight
}

function yForPlacement(p: Placement, cur: EquipItem, bar: BarShell): { x: number; y: number } {
  const b = yBands(bar)
  switch (p) {
    case 'front-top':
    case 'front-under':
    case 'overhead':
      return { x: cur.x, y: cur.y >= b.aisleStart ? 80 : cur.y }
    case 'back-bench':
    case 'back-under':
    case 'back-wall':
      return { x: cur.x, y: cur.y < b.backStart ? b.backStart + 10 : cur.y }
    case 'plant':
      return { x: cur.x < bar.frontLen ? bar.frontLen + 60 : cur.x, y: Math.min(cur.y, totalDepth(bar) - cur.d) }
  }
}

export default function SpecCard({ item }: { item: EquipItem }) {
  const name = useUI((s) => s.name) ?? 'Guest'
  const select = useUI((s) => s.select)
  const comments = useComments(item.id)
  const bar = useBar()
  const [draft, setDraft] = useState('')

  const num = (k: keyof EquipItem) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    if (!Number.isNaN(v)) updateItem(item.id, { [k]: v } as Partial<EquipItem>)
  }

  const bh = benchHeight(item, bar)
  const anchors: { label: string; z: number | undefined; title: string }[] = [
    { label: 'Floor', z: 0, title: 'Sit on the floor' },
    { label: 'On bench', z: bh, title: 'Sit on top of the bench' },
    { label: 'Under benchtop', z: Math.max(0, bh - item.h), title: 'Lock to the underside of the benchtop (hangs below)' },
    { label: 'Auto', z: undefined, title: 'Use the default for this placement' },
  ]

  return (
    <div className="rounded-lg border border-stone/30 bg-white shadow-panel">
      <div className="flex items-start justify-between gap-2 border-b border-stone/20 px-3 py-2">
        <input
          value={item.label}
          onChange={(e) => updateItem(item.id, { label: e.target.value })}
          className="wordmark min-w-0 flex-1 rounded bg-transparent px-1 text-[15px] leading-tight text-ink hover:bg-paper focus:bg-paper focus:outline-none"
          title="Rename"
        />
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => updateItem(item.id, { hidden: !item.hidden })} title={item.hidden ? 'Show' : 'Hide'} className="rounded px-1 text-[12px] text-stone hover:bg-paper hover:text-ink">
            {item.hidden ? '🚫' : '👁'}
          </button>
          <button onClick={() => { updateItem(item.id, { archived: true }); select(null) }} className="rounded px-1.5 py-0.5 text-[11px] text-stone hover:bg-paper hover:text-ink" title="Archive (remove from schedule, restorable)">
            archive
          </button>
          <button onClick={() => removeItem(item.id)} className="rounded px-1.5 py-0.5 text-[11px] text-stone hover:bg-terracotta/10 hover:text-terracotta" title="Delete permanently">
            delete
          </button>
        </div>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="text-[11px] text-stone">{item.zone}</div>
        <p className="text-[12px] leading-snug text-ink/80">{item.product}</p>

        <div className="grid grid-cols-3 gap-2">
          {(['w', 'd', 'h'] as const).map((k) => (
            <label key={k} className="text-[11px] text-stone">
              {k.toUpperCase()} (mm)
              <input type="number" value={item[k]} onChange={num(k)} className="mt-0.5 w-full rounded border border-stone/30 px-1.5 py-1 text-[12px] text-ink" />
            </label>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <label className="flex-1 text-[11px] text-stone">
            Status
            <select value={item.status} onChange={(e) => updateItem(item.id, { status: e.target.value as Status })}
              className="mt-0.5 w-full rounded border border-stone/30 px-1.5 py-1 text-[12px]" style={{ color: STATUS_COLOR[item.status] }}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </label>
          <label className="flex-1 text-[11px] text-stone">
            Price (AUD)
            <input type="number" value={item.price ?? ''} placeholder="—"
              onChange={(e) => updateItem(item.id, { price: e.target.value === '' ? null : Number(e.target.value) })}
              className="mt-0.5 w-full rounded border border-stone/30 px-1.5 py-1 text-[12px] text-ink" />
          </label>
          <button onClick={() => updateItem(item.id, { rot: (item.rot + 90) % 360 })} className="h-[30px] rounded border border-stone/30 px-2 text-[12px] text-ink hover:bg-paper" title="Rotate 90°">
            ⟳ {item.rot}°
          </button>
        </div>

        <label className="block text-[11px] text-stone">
          Placement (layer)
          <select value={item.placement} onChange={(e) => { const p = e.target.value as Placement; updateItem(item.id, { placement: p, ...yForPlacement(p, item, bar) }) }}
            className="mt-0.5 w-full rounded border border-stone/30 bg-white px-1.5 py-1 text-[12px] text-ink">
            {PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>

        {/* vertical anchor */}
        <div>
          <div className="mb-1 text-[11px] text-stone">Vertical anchor {item.z != null && <span className="text-ink/60">· base {Math.round(item.z)}mm</span>}</div>
          <div className="flex flex-wrap gap-1">
            {anchors.map((a) => {
              const active = a.z === undefined ? item.z == null : item.z === a.z
              return (
                <button key={a.label} title={a.title}
                  onClick={() => updateItem(item.id, { z: a.z })}
                  className={`rounded border px-2 py-1 text-[11px] ${active ? 'border-pine bg-pine/10 text-pine' : 'border-stone/30 text-ink/70 hover:bg-paper'}`}>
                  {a.label}
                </button>
              )
            })}
          </div>
          <p className="mt-1 text-[10px] italic text-stone">Or drag vertically in an elevation view to set the height.</p>
        </div>

        {servicesLine(item) && (
          <div className="text-[11px] text-stone"><span className="font-semibold text-ink/70">Services: </span>{servicesLine(item)}</div>
        )}

        {item.notes && (
          <div className={`rounded-md border px-2.5 py-2 text-[11.5px] leading-snug ${item.status === 'risk' ? 'border-terracotta/40 bg-terracotta/5 text-ink/85' : 'border-stone/25 bg-paper text-ink/75'}`}>
            {item.status === 'risk' && <span className="font-semibold text-terracotta">Fit-risk · </span>}
            {item.notes}
            <span className="mt-1 block text-[10px] italic text-stone">Confirm exact model + dims with AU supplier before ordering.</span>
          </div>
        )}

        <div className="border-t border-stone/20 pt-2">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone">Comments</div>
          {comments.length === 0 && <div className="text-[11px] text-stone/70">No comments yet.</div>}
          <ul className="space-y-1">
            {comments.map((c) => (
              <li key={c.id} className="text-[12px] text-ink/80"><span className="font-semibold text-pine">{c.author}: </span>{c.text}</li>
            ))}
          </ul>
          <form className="mt-1.5 flex gap-1" onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return; addComment({ id: crypto.randomUUID(), itemId: item.id, author: name, text: draft.trim(), ts: Date.now() }); setDraft('') }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a note…" className="flex-1 rounded border border-stone/30 px-2 py-1 text-[12px]" />
            <button className="rounded bg-pine px-2 py-1 text-[12px] text-white hover:bg-pine/90">Post</button>
          </form>
        </div>
      </div>
    </div>
  )
}

function servicesLine(item: EquipItem): string {
  const s = item.services
  const parts: string[] = []
  if (s.power) parts.push(`power ${s.power}`)
  if (s.water) parts.push('water')
  if (s.drain) parts.push('drain')
  if (s.gas) parts.push(`gas ${s.gas}`)
  if (s.data) parts.push('data')
  return parts.join(' · ')
}
