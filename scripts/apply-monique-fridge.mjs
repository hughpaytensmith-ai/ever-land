import { createClient } from '@supabase/supabase-js'
import * as Y from 'yjs'
const URL = 'https://erxxbmwxxhrabjiamfvt.supabase.co'
const KEY = 'sb_publishable_GXQRfX2RCwszaKuR19kEYQ_9wfPoTvI'
const ROOM = 'fletchers-bar'
const sb = createClient(URL, KEY)

const { data, error } = await sb.from('bar_rooms').select('state').eq('id', ROOM).maybeSingle()
if (error || !data?.state) { console.error('read err', error?.message); process.exit(1) }
const doc = new Y.Doc()
Y.applyUpdate(doc, new Uint8Array(Buffer.from(data.state, 'base64')))
const items = doc.getArray('items')

let cf = null, hasGlassRack = false
for (let i = 0; i < items.length; i++) {
  const id = items.get(i).get('id')
  if (id === 'coffee-fridge') cf = items.get(i)
  if (id === 'glass-rack-1') hasGlassRack = true
}
if (!cf) { console.error('coffee-fridge not found — aborting'); process.exit(1) }

let updateBytes = null
doc.on('update', (u) => { updateBytes = u })

doc.transact(() => {
  cf.set('key', 'ub-fridge-1door')
  cf.set('product', '1-door under-bench fridge — solid silver/black front')
  cf.set('w', 600)
  cf.set('price', 1200) // EST — confirm vs sheet (was 1900 for the 2-door)
  if (!hasGlassRack) {
    const g = new Y.Map()
    const item = {
      id: 'glass-rack-1', key: 'glass-rack',
      label: 'Glass rack (under-bench)',
      product: 'Under-bench clean-glass rack storage',
      w: 500, d: 500, h: 850, x: 820, y: 1500, rot: 0,
      placement: 'back-under', zone: 'Back · coffee', status: 'proposed',
      price: 350, services: {}, color: '#CFC9BB', fixture: false,
      notes: 'Added per Monique — extra under-bench glass storage in the space freed by switching the 2-door fridge to a 1-door. Price est., confirm.',
    }
    Object.entries(item).forEach(([k, v]) => g.set(k, v))
    items.push([g])
  }
}, 'monique-migration')

// broadcast the incremental update to any connected clients (live)
const ch = sb.channel('fbb:' + ROOM, { config: { broadcast: { self: false } } })
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('subscribe timeout')), 10000)
  ch.subscribe((s) => { if (s === 'SUBSCRIBED') { clearTimeout(t); res() } })
})
await ch.send({ type: 'broadcast', event: 'yupdate', payload: { b: Buffer.from(updateBytes).toString('base64') } })

// persist the snapshot for cold loads
const full = Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64')
const { error: upErr } = await sb.from('bar_rooms').upsert({ id: ROOM, state: full, updated_at: new Date().toISOString() })
console.log('broadcast sent + snapshot upsert:', upErr?.message || 'OK')

const after = items.toArray().map((m) => m.toJSON())
console.log('\ncoffee-fridge →', JSON.stringify({ ...after.find(i=>i.id==='coffee-fridge') }))
console.log('\nglass-rack-1  →', JSON.stringify({ ...after.find(i=>i.id==='glass-rack-1') }))
console.log('\nitem count:', after.length, '(was 23 → expect 24)')
await new Promise((r) => setTimeout(r, 800))
process.exit(0)
