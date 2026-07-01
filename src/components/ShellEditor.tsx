import { useBar, updateBar } from '../sync/store'
import { useUI } from '../lib/ui'
import { SPACES } from '../config/spaces'
import { downloadText } from '../lib/export'
import type { BarShell, Space } from '../types'

type Field = { key: keyof BarShell; label: string; min: number; max: number; step: number }
const fieldsFor = (space: Space): Field[] => [
  { key: 'frontLen', label: 'Front run length', min: 2000, max: 6000, step: 10 },
  { key: 'frontDepth', label: 'Front depth', min: 350, max: 900, step: 10 },
  { key: 'frontHeight', label: 'Front height', min: 800, max: 1200, step: 10 },
  { key: 'aisle', label: 'Staff aisle (clear)', min: 600, max: 1600, step: 10 },
  { key: 'backLen', label: 'Back run length', min: 2000, max: 6000, step: 10 },
  { key: 'backDepth', label: 'Back depth', min: 400, max: 900, step: 10 },
  { key: 'benchHeight', label: 'Back bench height', min: 700, max: 1100, step: 10 },
  // east return is a bar-only feature (dish-drop corner)
  ...(space === 'bar' ? [{ key: 'eastReturn', label: 'East return', min: 400, max: 2000, step: 10 } as Field] : []),
]

export default function ShellEditor() {
  const bar = useBar()
  const space = useUI((s) => s.space)
  const FIELDS = fieldsFor(space)
  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-snug text-ink/70">
        The shell is <span className="font-semibold text-ink">adjustable, not a hard constraint</span>. Define the kit + a sensible
        arrangement; the design team builds the floor plan around the envelope you export.
      </p>
      <div className="space-y-2.5 rounded-md border border-stone/25 bg-white p-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <div className="flex items-center justify-between text-[11px] text-stone">
              <span>{f.label}</span>
              <span className="font-mono text-ink">{bar[f.key]} mm</span>
            </div>
            <input
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={bar[f.key]}
              onChange={(e) => updateBar({ [f.key]: Number(e.target.value) } as Partial<BarShell>)}
              className="w-full accent-pine"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => downloadText(`ever-land-${space}-envelope.csv`, envelopeCsv(bar, space))}
        className="w-full rounded-md border border-pine bg-pine/5 px-3 py-2 text-[12px] font-semibold text-pine hover:bg-pine/10"
      >
        ⬇ Export {SPACES[space].label.toLowerCase()} envelope (CSV)
      </button>
    </div>
  )
}

function envelopeCsv(bar: BarShell, space: Space): string {
  const rows = [
    `${SPACES[space].label} envelope (mm)`,
    `Front run length,${bar.frontLen}`,
    `Front depth,${bar.frontDepth}`,
    `Front height,${bar.frontHeight}`,
    `Staff aisle (clear),${bar.aisle}`,
    `Back run length,${bar.backLen}`,
    `Back depth,${bar.backDepth}`,
    `Back bench height,${bar.benchHeight}`,
  ]
  if (space === 'bar') rows.push(`East return,${bar.eastReturn}`)
  return rows.join('\n')
}
