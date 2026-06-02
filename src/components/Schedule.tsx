import { useItems, updateItem } from '../sync/store'
import { useUI } from '../lib/ui'
import { STATUS_COLOR, STATUS_LABEL } from '../config/theme'
import { itemIndexMap } from '../lib/indexing'
import type { EquipItem, Placement } from '../types'

const GROUPS: { key: Placement[]; title: string }[] = [
  { key: ['front-top', 'front-under'], title: 'Front bar' },
  { key: ['back-bench', 'back-under', 'back-wall'], title: 'Back-of-bar' },
  { key: ['plant'], title: 'Plant / gas' },
  { key: ['overhead'], title: 'Overhead' },
]

export default function Schedule() {
  const items = useItems()
  const { selectedId, select } = useUI()
  const idx = itemIndexMap(items)
  const active = items.filter((i) => !i.archived)
  const archived = items.filter((i) => i.archived)
  const total = active.reduce((s, i) => s + (i.price ?? 0), 0)

  return (
    <div className="space-y-3">
      {GROUPS.map((g) => {
        const rows = items.filter((i) => g.key.includes(i.placement) && !i.archived)
        if (!rows.length) return null
        return (
          <div key={g.title}>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone">{g.title}</div>
            <div className="overflow-hidden rounded-md border border-stone/25 bg-white">
              {rows.map((it) => (
                <Row key={it.id} item={it} n={idx.get(it.id) ?? 0} selected={selectedId === it.id} onSelect={() => select(it.id)} />
              ))}
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-between rounded-md bg-ink px-3 py-2 text-paper">
        <span className="text-[12px]">Total · priced items</span>
        <span className="wordmark text-[15px]">A$ {total.toLocaleString()}</span>
      </div>

      {archived.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone">Archived ({archived.length})</div>
          <div className="overflow-hidden rounded-md border border-stone/25 bg-white">
            {archived.map((it) => (
              <div key={it.id} className="flex items-center gap-2 border-b border-stone/15 px-2.5 py-1.5 text-[12px] text-stone last:border-0">
                <span className="flex-1 truncate line-through">{it.label}</span>
                <button onClick={() => updateItem(it.id, { archived: false })} className="rounded px-1.5 py-0.5 text-[11px] text-pine hover:bg-paper">restore</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ item, n, selected, onSelect }: { item: EquipItem; n: number; selected: boolean; onSelect: () => void }) {
  return (
    <div className={`flex items-center gap-2 border-b border-stone/15 px-2 py-1.5 last:border-0 ${selected ? 'bg-paper' : ''} ${item.hidden ? 'opacity-45' : ''}`}>
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink text-[9px] font-semibold text-paper">{n}</span>
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: item.color }} />
        <span className="flex-1 truncate text-[12.5px] text-ink">{item.label}</span>
        <span className="shrink-0 text-[10px] text-stone">{item.w}×{item.d}</span>
        <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white" style={{ background: STATUS_COLOR[item.status] }}>
          {STATUS_LABEL[item.status]}
        </span>
        <span className="w-12 shrink-0 text-right text-[11px] text-ink/70">{item.price != null ? `$${item.price}` : '—'}</span>
      </button>
      <button
        onClick={() => updateItem(item.id, { hidden: !item.hidden })}
        title={item.hidden ? 'Show' : 'Hide'}
        className="shrink-0 rounded px-1 text-[12px] text-stone hover:bg-paper hover:text-ink"
      >
        {item.hidden ? '🚫' : '👁'}
      </button>
    </div>
  )
}
