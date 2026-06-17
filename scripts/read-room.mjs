import { createClient } from '@supabase/supabase-js'
import * as Y from 'yjs'
import { writeFileSync } from 'node:fs'
const URL = 'https://erxxbmwxxhrabjiamfvt.supabase.co'
const KEY = 'sb_publishable_GXQRfX2RCwszaKuR19kEYQ_9wfPoTvI'
const ROOM = 'fletchers-bar'
const sb = createClient(URL, KEY)
const { data, error } = await sb.from('bar_rooms').select('state,updated_at').eq('id', ROOM).maybeSingle()
if (error) { console.error('ERR', error.message); process.exit(1) }
if (!data?.state) { console.log('NO SNAPSHOT ROW'); process.exit(0) }
writeFileSync('/tmp/fbb-snapshot-backup.b64', data.state)
console.log('updated_at:', data.updated_at, '| backed up to /tmp/fbb-snapshot-backup.b64 (', data.state.length, 'b64 chars)')
const doc = new Y.Doc()
Y.applyUpdate(doc, new Uint8Array(Buffer.from(data.state, 'base64')))
const items = doc.getArray('items').toArray().map(m => m.toJSON())
console.log('\nitem count:', items.length)
console.log('\n=== BACK-UNDER run (where the change happens) ===')
items.filter(i => i.placement === 'back-under').sort((a,b)=>a.x-b.x)
  .forEach(i => console.log(`  x${i.x}–${i.x + i.w}  y${i.y}  ${i.w}×${i.d}×${i.h}  [${i.id}] ${i.label} (key=${i.key})`))
console.log('\n=== coffee-fridge full record ===')
console.log(JSON.stringify(items.find(i => i.id === 'coffee-fridge'), null, 1))
console.log('\n=== all ids ==='); console.log(items.map(i=>i.id).join(', '))
process.exit(0)
