import { useItems, useBar } from '../sync/store'
import { computeWarnings } from '../lib/geometry'
import { useUI } from '../lib/ui'

export default function Warnings() {
  const items = useItems()
  const bar = useBar()
  const select = useUI((s) => s.select)
  const warnings = computeWarnings(items, bar)

  if (!warnings.length)
    return (
      <div className="rounded-md border border-pine/30 bg-pine/5 px-3 py-2 text-[12px] text-pine">
        ✓ No fit issues — everything sits in its zone.
      </div>
    )

  return (
    <div className="rounded-md border border-terracotta/40 bg-terracotta/5 px-3 py-2">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-terracotta">
        {warnings.length} soft warning{warnings.length > 1 ? 's' : ''} · informational, never blocking
      </div>
      <ul className="space-y-1">
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
    </div>
  )
}
