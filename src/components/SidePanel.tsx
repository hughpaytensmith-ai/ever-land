import { useState } from 'react'
import { nanoid } from 'nanoid'
import Warnings from './Warnings'
import SpecCard from './SpecCard'
import Schedule from './Schedule'
import ShellEditor from './ShellEditor'
import { useItems, addItem } from '../sync/store'
import { useUI } from '../lib/ui'
import { EQUIPMENT_LIBRARY } from '../config/equipment'
import { CATEGORY_COLOR } from '../config/equipment'
import type { EquipItem } from '../types'

type Tab = 'schedule' | 'shell'

export default function SidePanel() {
  const items = useItems()
  const { selectedId, select } = useUI()
  const togglePanel = useUI((s) => s.togglePanel)
  const [tab, setTab] = useState<Tab>('schedule')
  const selected = items.find((i) => i.id === selectedId) ?? null

  const addFromLibrary = (key: string) => {
    if (key === '__blank') {
      const item: EquipItem = {
        id: nanoid(8), key: 'custom', label: 'New item', product: 'Custom item',
        w: 600, d: 600, h: 850, x: 1500, y: 200, rot: 0,
        placement: 'front-under', zone: 'Unplaced', status: 'proposed', price: null,
        services: {}, color: CATEGORY_COLOR.fixture,
      }
      addItem(item); select(item.id); return
    }
    const t = EQUIPMENT_LIBRARY.find((l) => l.key === key)
    if (!t) return
    const item: EquipItem = {
      id: nanoid(8), key: t.key, label: t.label, product: t.label,
      w: t.w, d: t.d, h: t.h, x: 1500, y: 200, rot: 0,
      placement: t.placement, zone: 'Unplaced', status: 'proposed', price: null,
      services: {}, color: t.color,
    }
    addItem(item); select(item.id)
  }

  return (
    <aside className="z-40 flex h-full w-[380px] max-w-[88vw] shrink-0 flex-col border-l border-stone/30 bg-paper max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:shadow-panel">
      <div className="flex items-center justify-between border-b border-stone/20 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-stone">Details</span>
        <button
          onClick={togglePanel}
          title="Hide panel"
          className="rounded px-2 py-0.5 text-[13px] leading-none text-stone hover:bg-white hover:text-ink"
        >
          ✕
        </button>
      </div>
      <div className="space-y-3 overflow-y-auto px-4 py-4">
        <Warnings />
        {selected && <SpecCard item={selected} />}

        <div className="flex gap-1 rounded-md border border-stone/30 bg-white p-1">
          {(['schedule', 'shell'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded px-2 py-1 text-[12px] font-medium ${tab === t ? 'bg-pine text-white' : 'text-ink/70 hover:bg-paper'}`}>
              {t === 'schedule' ? 'Equipment schedule' : 'Bar shell'}
            </button>
          ))}
        </div>

        {tab === 'schedule' ? (
          <>
            <Schedule />
            <label className="block text-[11px] text-stone">
              Add equipment
              <select value="" onChange={(e) => e.target.value && addFromLibrary(e.target.value)}
                className="mt-0.5 w-full rounded border border-stone/30 bg-white px-2 py-1.5 text-[12px]">
                <option value="">+ add a piece…</option>
                <option value="__blank">＋ Blank item (name it yourself)</option>
                {EQUIPMENT_LIBRARY.map((l) => (
                  <option key={l.key} value={l.key}>{l.label}</option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <ShellEditor />
        )}
      </div>
    </aside>
  )
}
