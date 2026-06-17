import { createClient } from '@supabase/supabase-js'
import * as Y from 'yjs'
const sb=createClient('https://erxxbmwxxhrabjiamfvt.supabase.co','sb_publishable_GXQRfX2RCwszaKuR19kEYQ_9wfPoTvI')
const {data}=await sb.from('bar_rooms').select('state,updated_at').eq('id','fletchers-bar').maybeSingle()
const doc=new Y.Doc(); Y.applyUpdate(doc,new Uint8Array(Buffer.from(data.state,'base64')))
console.log('snapshot last written (updated_at):', data.updated_at)
// state vector = every clientID that has ever contributed structs + its op clock
const sv = Y.decodeStateVector(Y.encodeStateVector(doc))
console.log('\n=== distinct editing clients (each browser session/device = 1) ===')
console.log('count:', sv.size)
;[...sv.entries()].sort((a,b)=>b[1]-a[1]).forEach(([c,clk])=>console.log(`  client ${c}: ~${clk} ops`))
