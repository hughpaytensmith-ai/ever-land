import { useUI } from '../lib/ui'

// Full Studio Plenty SP185_DD01 set, rendered from the PDF (13 sheets) — so the
// whole floorplan / elevations / perspectives are on hand for reference.
const SHEETS: { src: string; label: string; primary?: boolean }[] = [
  { src: '/assets/plans/sheet-01.png', label: 'Cover' },
  { src: '/assets/plans/sheet-02.png', label: 'Ground floor — GA plan (1:50)' },
  { src: '/assets/plans/sheet-03.png', label: 'Reflected ceiling plan (RCP)' },
  { src: '/assets/plans/sheet-04.png', label: 'Sheet 4' },
  { src: '/assets/plans/sheet-05.png', label: 'Interior elevations (A.05)' },
  { src: '/assets/plans/sheet-06.png', label: 'Interior elevations (A.06)' },
  { src: '/assets/plans/sheet-07.png', label: 'A.07 — Bar & kitchen plan (primary)', primary: true },
  { src: '/assets/plans/sheet-08.png', label: 'Sheet 8' },
  { src: '/assets/plans/sheet-09.png', label: 'Sheet 9' },
  { src: '/assets/plans/sheet-10.png', label: 'Sheet 10' },
  { src: '/assets/plans/sheet-11.png', label: 'Concept perspectives (A.11)' },
  { src: '/assets/plans/sheet-12.png', label: 'Sheet 12' },
  { src: '/assets/plans/sheet-13.png', label: 'Sheet 13' },
]

export default function ReferenceDrawer() {
  const { showReference, toggleReference } = useUI()
  if (!showReference) return null
  return (
    <div className="flex w-[320px] shrink-0 flex-col border-r border-stone/30 bg-paper">
      <div className="flex items-center justify-between border-b border-stone/30 px-3 py-2">
        <span className="wordmark text-[14px] text-navy">Reference plans</span>
        <button onClick={toggleReference} className="text-[12px] text-stone hover:text-ink">close ✕</button>
      </div>
      <div className="space-y-3 overflow-y-auto px-3 py-3">
        <p className="text-[11px] leading-snug text-stone">
          Studio Plenty SP185_DD01 (rev 27/5/2026, WIP — not for construction). Click a sheet to open it full-size.{' '}
          <a href="/assets/SP185_DD01.pdf" target="_blank" rel="noreferrer" className="text-pine underline">Open full PDF ↗</a>
        </p>
        {SHEETS.map((s) => (
          <a key={s.src} href={s.src} target="_blank" rel="noreferrer"
            className={`block overflow-hidden rounded-md border bg-white ${s.primary ? 'border-pine' : 'border-stone/25'}`}>
            <img src={s.src} alt={s.label} loading="lazy" className="block w-full" />
            <div className={`px-2 py-1 text-[11px] ${s.primary ? 'font-semibold text-pine' : 'text-ink/70'}`}>{s.label}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
