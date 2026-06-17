import { createClient } from '@supabase/supabase-js'
import * as Y from 'yjs'

const OLD = { url: 'https://erxxbmwxxhrabjiamfvt.supabase.co', key: 'sb_publishable_GXQRfX2RCwszaKuR19kEYQ_9wfPoTvI', room: 'fletchers-bar' }
const NEW = { url: 'https://odnjmtbsvjbgscqbshfm.supabase.co', key: process.env.EL_KEY, room: 'ever-land' }

// Target positions: front/shelves/plant = approved seed baseline; back-of-bar
// run = Hugh's captured June-4 arrangement. (carbonator moved to the front.)
const POS = {
  'ice-well': { x: 1320, y: 50 }, 'speed-rail': { x: 1300, y: 490 },
  'sparkling-station': { x: 3180, y: 60 }, 'wine-fridge': { x: 2370, y: 20 },
  'freezer': { x: -20, y: 0 }, 'glass-storage-front': { x: 610, y: 10 },
  'espresso': { x: 250, y: 1510 }, 'grinder': { x: 20, y: 1550 }, 'batch-brewer': { x: 990, y: 1570 },
  'font': { x: 1710, y: 1940 },
  'shelf-1': { x: 0, y: 1990, z: 1200 }, 'shelf-2': { x: 0, y: 1990, z: 1585 }, 'shelf-3': { x: 0, y: 1990, z: 1970 },
  'ice-machine': { x: 2730, y: 1490 }, 'co2': { x: 3820, y: 300 }, 'n2': { x: 4080, y: 300 },
  'overhead': { x: 0, y: 0 },
  // ── back-of-bar run — Hugh's June-4 "locked in" arrangement ──
  'coffee-fridge': { x: 160, y: 1500 }, 'glass-rack-1': { x: 820, y: 1500 },
  'keg-fridge': { x: 1730, y: 1500 }, 'carbonator': { x: 1910, y: 70, placement: 'front-under' },
  'glasswasher': { x: -460, y: 1500 }, 'hand-sink': { x: -880, y: 1500 },
}

const src = createClient(OLD.url, OLD.key)
const { data, error } = await src.from('bar_rooms').select('state').eq('id', OLD.room).maybeSingle()
if (error || !data?.state) { console.error('read source failed', error?.message); process.exit(1) }
const doc = new Y.Doc()
Y.applyUpdate(doc, new Uint8Array(Buffer.from(data.state, 'base64')))
const items = doc.getArray('items')

doc.transact(() => {
  for (let i = 0; i < items.length; i++) {
    const m = items.get(i)
    const id = m.get('id')
    const p = POS[id]
    if (!p) continue
    m.set('x', p.x); m.set('y', p.y)
    if (p.z !== undefined) m.set('z', p.z)
    if (p.placement) m.set('placement', p.placement)
  }
})

const list = items.toArray().map((m) => m.toJSON())
console.log('items migrated:', list.length)
console.log('back-of-bar (June-4 arrangement):')
list.filter((i) => ['hand-sink','glasswasher','coffee-fridge','glass-rack-1','keg-fridge','carbonator'].includes(i.id))
  .sort((a,b)=>a.x-b.x).forEach((i)=>console.log(`  x${i.x} y${i.y} ${i.w}×${i.d} [${i.id}] ${i.label} (${i.placement})`))

if (!NEW.key) { console.error('EL_KEY missing'); process.exit(1) }
const dst = createClient(NEW.url, NEW.key)
const full = Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64')
const { error: upErr } = await dst.from('bar_rooms').upsert({ id: NEW.room, state: full, updated_at: new Date().toISOString() })
console.log('\nwrote ever-land room to new project:', upErr?.message || 'OK')
// also snapshot into the backups table so there's an immediate restore point
await dst.from('bar_room_backups').insert({ room: NEW.room, state: full, ts: new Date().toISOString() }).then(()=>{},()=>{})
process.exit(0)
