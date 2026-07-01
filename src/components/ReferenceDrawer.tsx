import { useEffect, useState } from 'react'
import { useUI } from '../lib/ui'

// Prefix public assets with the app's base path so they resolve under a
// sub-path deploy (e.g. GitHub Pages /ever-land/) as well as root.
const asset = (p: string) => import.meta.env.BASE_URL + p
const PDF_HREF = asset('assets/SP185_DD01.pdf')

// Full Studio Plenty SP185_DD01 set, rendered from the PDF (13 sheets) — so the
// whole floorplan / elevations / perspectives are on hand for reference.
const SHEETS: { src: string; label: string; primary?: boolean }[] = [
  { src: asset('assets/plans/sheet-01.png'), label: 'Cover' },
  { src: asset('assets/plans/sheet-02.png'), label: 'Ground floor — GA plan (1:50)' },
  { src: asset('assets/plans/sheet-03.png'), label: 'Reflected ceiling plan (RCP)' },
  { src: asset('assets/plans/sheet-04.png'), label: 'Sheet 4' },
  { src: asset('assets/plans/sheet-05.png'), label: 'Interior elevations (A.05)' },
  { src: asset('assets/plans/sheet-06.png'), label: 'Interior elevations (A.06)' },
  { src: asset('assets/plans/sheet-07.png'), label: 'A.07 — Bar & kitchen plan (primary)', primary: true },
  { src: asset('assets/plans/sheet-08.png'), label: 'Sheet 8' },
  { src: asset('assets/plans/sheet-09.png'), label: 'Sheet 9' },
  { src: asset('assets/plans/sheet-10.png'), label: 'Sheet 10' },
  { src: asset('assets/plans/sheet-11.png'), label: 'Concept perspectives (A.11)' },
  { src: asset('assets/plans/sheet-12.png'), label: 'Sheet 12' },
  { src: asset('assets/plans/sheet-13.png'), label: 'Sheet 13' },
]

export default function ReferenceDrawer() {
  const { showReference, toggleReference } = useUI()
  // index of the sheet open in the full-screen viewer (null = drawer only)
  const [viewer, setViewer] = useState<number | null>(null)
  if (!showReference) return null
  return (
    <>
      <div className="flex w-[320px] shrink-0 flex-col border-r border-stone/30 bg-paper">
        <div className="flex items-center justify-between border-b border-stone/30 px-3 py-2">
          <span className="wordmark text-[14px] text-navy">Reference plans</span>
          <button onClick={toggleReference} className="text-[12px] text-stone hover:text-ink">close ✕</button>
        </div>
        <div className="space-y-3 overflow-y-auto px-3 py-3">
          <p className="text-[11px] leading-snug text-stone">
            Studio Plenty SP185_DD01 (rev 27/5/2026, WIP — not for construction). Click a sheet to open it full-screen.{' '}
            <a href={PDF_HREF} target="_blank" rel="noreferrer" className="text-pine underline">Open full PDF ↗</a>
          </p>
          {SHEETS.map((s, i) => (
            <button
              key={s.src}
              onClick={() => setViewer(i)}
              className={`block w-full overflow-hidden rounded-md border bg-white text-left ${s.primary ? 'border-pine' : 'border-stone/25'} hover:ring-2 hover:ring-pine/40`}
            >
              <img src={s.src} alt={s.label} loading="lazy" className="block w-full" />
              <div className={`px-2 py-1 text-[11px] ${s.primary ? 'font-semibold text-pine' : 'text-ink/70'}`}>{s.label}</div>
            </button>
          ))}
        </div>
      </div>

      {viewer !== null && (
        <SheetViewer
          sheets={SHEETS}
          index={viewer}
          onIndex={setViewer}
          onClose={() => setViewer(null)}
          pdfHref={PDF_HREF}
        />
      )}
    </>
  )
}

// Full-screen, in-app sheet viewer — stays inside the builder (no new browser
// tab), with a clear Back button, prev/next, and a fit ⇄ 100% zoom toggle.
function SheetViewer({
  sheets,
  index,
  onIndex,
  onClose,
  pdfHref,
}: {
  sheets: { src: string; label: string }[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  pdfHref: string
}) {
  const [zoom, setZoom] = useState(false)
  const sheet = sheets[index]
  const go = (d: number) => onIndex(Math.min(sheets.length - 1, Math.max(0, index + d)))

  useEffect(() => {
    setZoom(false) // reset to fit when the sheet changes
  }, [index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink/95 backdrop-blur-sm">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-2.5">
        <button
          onClick={onClose}
          className="rounded-md bg-paper px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-white"
        >
          ← Back to builder
        </button>
        <div className="min-w-0 flex-1 truncate text-center text-[13px] text-paper">
          {sheet.label} <span className="text-paper/50">· {index + 1}/{sheets.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => !z)}
            className="rounded-md border border-white/25 px-2.5 py-1.5 text-[12px] text-paper hover:bg-white/10"
            title="Toggle fit / actual size"
          >
            {zoom ? 'Fit' : '100%'}
          </button>
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-white/25 px-2.5 py-1.5 text-[12px] text-paper hover:bg-white/10"
          >
            Open PDF ↗
          </a>
        </div>
      </div>

      {/* image area — click empty space to close */}
      <div
        className={`relative flex-1 ${zoom ? 'overflow-auto' : 'overflow-hidden'} flex items-center justify-center p-3`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <img
          src={sheet.src}
          alt={sheet.label}
          onClick={() => setZoom((z) => !z)}
          className={zoom ? 'max-w-none cursor-zoom-out' : 'max-h-full max-w-full object-contain cursor-zoom-in'}
        />

        {/* prev / next */}
        {index > 0 && (
          <button
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-paper/90 px-3 py-2 text-[16px] text-ink shadow-panel hover:bg-white"
            title="Previous sheet (←)"
          >
            ‹
          </button>
        )}
        {index < sheets.length - 1 && (
          <button
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-paper/90 px-3 py-2 text-[16px] text-ink shadow-panel hover:bg-white"
            title="Next sheet (→)"
          >
            ›
          </button>
        )}
      </div>
    </div>
  )
}
