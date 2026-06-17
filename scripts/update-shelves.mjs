import { createClient } from '@supabase/supabase-js'
import * as Y from 'yjs'
const URL='https://odnjmtbsvjbgscqbshfm.supabase.co', ROOM='ever-land'
const sb=createClient(URL, process.env.EL_KEY)
const { data } = await sb.from('bar_rooms').select('state').eq('id',ROOM).maybeSingle()
const doc=new Y.Doc(); Y.applyUpdate(doc,new Uint8Array(Buffer.from(data.state,'base64')))
const items=doc.getArray('items')
let n=0
doc.transact(()=>{
  for(let i=0;i<items.length;i++){ const m=items.get(i)
    if(m.get('key')==='shelf'){ m.set('w',4610); m.set('x',-880); m.set('y',1980); n++ }
  }
})
items.toArray().map(m=>m.toJSON()).filter(i=>i.key==='shelf')
  .forEach(s=>console.log(`  ${s.id}: ${s.w}×${s.d} @ x${s.x} y${s.y} z${s.z}`))
const full=Buffer.from(Y.encodeStateAsUpdate(doc)).toString('base64')
const { error } = await sb.from('bar_rooms').upsert({ id:ROOM, state:full, updated_at:new Date().toISOString() })
await sb.from('bar_room_backups').insert({ room:ROOM, state:full, ts:new Date().toISOString() }).then(()=>{},()=>{})
await sb.from('bar_edits').insert({ room:ROOM, author:'System', action:'extended back shelves to full 4,610mm length', ts:new Date().toISOString() }).then(()=>{},()=>{})
const ch=sb.channel('fbb:'+ROOM,{config:{broadcast:{self:false}}})
await new Promise(r=>{ch.subscribe(s=>{if(s==='SUBSCRIBED')r()})})
await ch.send({type:'broadcast',event:'ystate',payload:{b:full}})
console.log('updated',n,'shelves | upsert:',error?.message||'OK')
await new Promise(r=>setTimeout(r,400)); process.exit(0)
