import { createClient } from '@supabase/supabase-js'
const sb=createClient('https://erxxbmwxxhrabjiamfvt.supabase.co','sb_publishable_GXQRfX2RCwszaKuR19kEYQ_9wfPoTvI')
const ch=sb.channel('fbb:fletchers-bar',{config:{broadcast:{self:false}}})
const names=new Set()
ch.on('broadcast',{event:'awareness'},()=>{}) // app uses yjs awareness over broadcast (binary) — names not trivially decodable here
await new Promise(res=>{ch.subscribe(s=>{if(s==='SUBSCRIBED')res()})})
ch.send({type:'broadcast',event:'yquery',payload:{b:''}}) // nudge peers to announce
await new Promise(r=>setTimeout(r,5000))
console.log('presence listen complete (note: collaborator NAMES live only in ephemeral awareness, not stored)')
process.exit(0)
