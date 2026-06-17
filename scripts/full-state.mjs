import { createClient } from '@supabase/supabase-js'
import * as Y from 'yjs'
const URL='https://erxxbmwxxhrabjiamfvt.supabase.co', KEY='sb_publishable_GXQRfX2RCwszaKuR19kEYQ_9wfPoTvI', ROOM='fletchers-bar'
const sb=createClient(URL,KEY)
const {data}=await sb.from('bar_rooms').select('state').eq('id',ROOM).maybeSingle()
const doc=new Y.Doc(); Y.applyUpdate(doc,new Uint8Array(Buffer.from(data.state,'base64')))
const bar=doc.getMap('bar').toJSON()
console.log('seedVersion:', bar.seedVersion, '| shellVersion:', bar.shellVersion, '| frontLen:', bar.frontLen, 'backLen:', bar.backLen)
const versions=doc.getMap('versions'); console.log('saved versions:', Array.from(versions.keys()))
const items=doc.getArray('items').toArray().map(m=>m.toJSON())
console.log('\nTOTAL ITEMS:', items.length)
console.log('\n=== ALL ITEMS ===')
items.sort((a,b)=>(a.placement+a.x).localeCompare(b.placement+b.x)).forEach(i=>
  console.log(`[${i.id}] ${i.label} | ${i.placement} | x${i.x} y${i.y} ${i.w}×${i.d} | key=${i.key} | $${i.price ?? '—'}${i.hidden?' HIDDEN':''}${i.archived?' ARCHIVED':''}`))
// compare to seed ids
const seedIds=['dj-booth','garnish-rail','ice-well','speed-rail','sparkling-station','wine-fridge','freezer','glass-storage-front','coffee-fridge','espresso','grinder','batch-brewer','keg-fridge','font','carbonator','shelf-1','shelf-2','shelf-3','glasswasher','hand-sink','ice-machine','co2','n2','overhead']
const liveIds=items.map(i=>i.id)
console.log('\nMISSING vs seed:', seedIds.filter(id=>!liveIds.includes(id)))
console.log('EXTRA (added):', liveIds.filter(id=>!seedIds.includes(id)))
process.exit(0)
