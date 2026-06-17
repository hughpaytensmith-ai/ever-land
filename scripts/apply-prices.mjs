import { createClient } from '@supabase/supabase-js'
import * as Y from 'yjs'
const URL='https://odnjmtbsvjbgscqbshfm.supabase.co', ROOM='ever-land'
const sb=createClient(URL, process.env.EL_KEY)
// Authoritative trade-est prices recovered from the price-sync (sheet 1GHey…, ~$52,520).
// coffee-fridge overridden to a 1-door estimate (sheet's 1900 was the 2-door); glass-rack est.
const PRICES = {
  'ice-well':640,'speed-rail':255,'keg-fridge':3825,'font':1915,'freezer':1235,
  'ice-machine':4230,'wine-fridge':1900,'coffee-fridge':1200,'batch-brewer':2680,
  'grinder':1925,'espresso':19635,'glasswasher':8290,'carbonator':1235,'n2':555,
  'co2':250,'sparkling-station':350,'hand-sink':1700,'glass-rack-1':350,
}
const { data } = await sb.from('bar_rooms').select('state').eq('id',ROOM).maybeSingle()
const doc=new Y.Doc(); Y.applyUpdate(doc, new Uint8Array(Buffer.from(data.state,'base64')))
const items=doc.getArray('items')
let applied=0, total=0
doc.transact(()=>{
  for(let i=0;i<items.length;i++){ const m=items.get(i); const id=m.get('id'); if(PRICES[id]!=null){ m.set('price', PRICES[id]); applied++; total+=PRICES[id] } }
})
const full=Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64')
const { error } = await sb.from('bar_rooms').upsert({ id:ROOM, state:full, updated_at:new Date().toISOString() })
await sb.from('bar_room_backups').insert({ room:ROOM, state:full, ts:new Date().toISOString() }).then(()=>{},()=>{})
await sb.from('bar_edits').insert({ room:ROOM, author:'System', action:'restored equipment prices from the costing sheet', ts:new Date().toISOString() }).then(()=>{},()=>{})
// broadcast so any open client updates live
const ch=sb.channel('fbb:'+ROOM,{config:{broadcast:{self:false}}})
await new Promise(r=>{ch.subscribe(s=>{if(s==='SUBSCRIBED')r()})})
await ch.send({type:'broadcast',event:'ystate',payload:{b:full}})
console.log('prices applied to',applied,'items | schedule total ≈ $'+total.toLocaleString(),'ex-GST | upsert:',error?.message||'OK')
await new Promise(r=>setTimeout(r,500)); process.exit(0)
