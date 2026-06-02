import { useState } from 'react'
import { useItems, useBar } from '../sync/store'
import { computeWarnings } from '../lib/geometry'
import { useUI } from '../lib/ui'

export default function Warnings() {
  const items = useItems()
  const bar = useBar()
  const select = useUI((s) => s.select)
  const warnings = computeWarnings(items, bar)
  // Collapsed by default — these are informational, never blocking, so keep
  // them out of the way until asked for. Preference is remembered.
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem('fbb:warnOpen') === '1'
    } catch {
      return false
    }
  })
  const toggle = () =>
    setOpen((o) => {
      const v = !o
      try {
        localStorage.setItem('fbb:warnOpen', v ? '1' : '0')
      } catch {
        /* ignore */
      }
      return v
    })

  if (!warnings.length)
    return (
      <div className="rounded-md border border-pine/30 bg-pine/5 px-3 py-2 text-[12px] text-pine">
        ✓ No fit issues — everything sits in its zone.
      </div>
    )

  return (
    <div className="rounded-md border border-terracotta/40 bg-terracotta/5">
      <button onClick={toggle} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-terracotta">
          {warnings.length} soft warning{warnings.length > 1 ? 's' : ''} · informational
        </span>
        <span className="shrink-0 text-[11px] text-terracotta">{open ? 'hide ▾' : 'show ▸'}</span>
      </button>
      {open && (
        <ul className="space-y-1 px-3 pb-2">
          {warnings.map((w, i) => (
            <li
              key={i}
              className={`text-[12px] text-ink/80 ${w.itemIds ? 'cursor-pointer hover:text-ink' : ''}`}
              onClick={() => w.itemIds && select(w.itemIds[0])}
            >
              • {w.msg}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
