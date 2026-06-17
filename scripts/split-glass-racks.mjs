import { createClient } from '@supabase/supabase-js'
import * as Y from 'yjs'
const URL='https://odnjmtbsvjbgscqbshfm.supabase.co', ROOM='ever-land'
const sb=createClient(URL, process.env.EL_KEY)
const base = { key:'wine-glass-rack', d:120, h:280, y:1980, rot:0, z:920,
  placement:'back-wall', zone:'Back wall', status:'proposed', services:{}, color:'#CFC9BB', fixture:true }
const WEST = { ...base, id:'wine-glass-racks-w', label:'Under-shelf wine glass racks (west run)',
  product:'Avanti stemmed glass rack — triple-row 280mm, ganged ×10 under shelf 1 (~90 stems)',
  w:2970, x:-880, price:250,
  notes:'Hanging stemware filling the underside of the lowest back shelf, west of the draught font. Price = 10 × ~$25 est — confirm on Kitchen Warehouse (Avanti triple-row 28cm).' }
const EAST = { ...base, id:'wine-glass-racks-e', label:'Under-shelf wine glass racks (east run)',
  product:'Avanti stemmed glass rack — triple-row 280mm, ganged ×3 under shelf 1 (~27 stems)',
  w:980, x:2750, price:90,
  notes:'Hanging stemware filling the underside of the lowest back shelf, east of the draught font. Price = 3 × ~$25 est — confirm on Kitchen Warehouse (Avanti triple-row 28cm).' }
const { data } = await sb.from('bar_rooms').select('state').eq('id',ROOM).maybeSingle()
const doc=new Y.Doc(); Y.applyUpdate(doc,new Uint8Array(Buffer.from(data.state,'base64')))
const items=doc.getArray('items')
doc.transact(()=>{
  // drop any prior single full-length run + any stale split runs (idempotent)
  for(let i=items.length-1;i>=0;i--){ const id=items.get(i).get('id'); if(['wine-glass-racks','wine-glass-racks-w','wine-glass-racks-e'].includes(id)) items.delete(i,1) }
  for(const it of [WEST, EAST]){ const m=new Y.Map(); Object.keys(it).forEach(k=>m.set(k,it[k])); items.push([m]) }
})
const racks=items.toArray().map(m=>m.toJSON()).filter(i=>i.key==='wine-glass-rack')
racks.forEach(r=>console.log(`  ${r.id}: x${r.x}..${r.x+r.w} (w${r.w}) z${r.z}..${r.z+r.h} $${r.price}`))
console.log('total items:', items.length)
const full=Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64')
const { error } = await sb.from('bar_rooms').upsert({ id:ROOM, state:full, updated_at:new Date().toISOString() })
await sb.from('bar_room_backups').insert({ room:ROOM, state:full, ts:new Date().toISOString() }).then(()=>{},()=>{})
await sb.from('bar_edits').insert({ room:ROOM, author:'System', action:'split under-shelf wine glass racks into two runs around the draught font', ts:new Date().toISOString() }).then(()=>{},()=>{})
const ch=sb.channel('fbb:'+ROOM,{config:{broadcast:{self:false}}})
await new Promise(r=>{ch.subscribe(s=>{if(s==='SUBSCRIBED')r()})})
await ch.send({type:'broadcast',event:'ystate',payload:{b:full}})
console.log('upsert:', error?.message||'OK')
await new Promise(r=>setTimeout(r,400)); process.exit(0)
