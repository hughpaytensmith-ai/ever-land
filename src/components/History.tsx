import { useEffect, useState } from 'react'
import { useUI } from '../lib/ui'
import { fetchEdits } from '../sync/store'
import type { EditEntry } from '../sync/supabase'

function ago(ts: string): string {
  const d = Date.now() - new Date(ts).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/** Slide-over panel showing the audit log (who changed what, when). */
export default function History() {
  const showHistory = useUI((s) => s.showHistory)
  const toggleHistory = useUI((s) => s.toggleHistory)
  const [edits, setEdits] = useState<EditEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!showHistory) return
    setLoading(true)
    fetchEdits(80).then((e) => {
      setEdits(e)
      setLoading(false)
    })
  }, [showHistory])

  if (!showHistory) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={toggleHistory}>
      <aside
        className="flex h-full w-[360px] max-w-[90vw] flex-col border-l border-stone/30 bg-paper shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone/20 px-4 py-3">
          <span className="wordmark text-[15px] text-pine">Edit history</span>
          <button onClick={toggleHistory} className="rounded px-2 py-0.5 text-[13px] leading-none text-stone hover:bg-white hover:text-ink">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading && <p className="text-[12px] text-stone">Loading…</p>}
          {!loading && edits.length === 0 && <p className="text-[12px] text-stone">No edits recorded yet.</p>}
          <ul className="space-y-2">
            {edits.map((e, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2 border-b border-stone/15 pb-2 text-[12px]">
                <span className="text-ink">
                  <span className="font-semibold">{e.author || 'Someone'}</span> {e.action}
                </span>
                <span className="shrink-0 text-[11px] text-stone">{ago(e.ts)}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
