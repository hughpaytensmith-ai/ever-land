import { createClient } from '@supabase/supabase-js'
const sb=createClient('https://erxxbmwxxhrabjiamfvt.supabase.co','sb_publishable_GXQRfX2RCwszaKuR19kEYQ_9wfPoTvI')
const {data}=await sb.from('bar_rooms').select('state,updated_at').eq('id','fletchers-bar').maybeSingle()
const fs=await import('node:fs'); const p=process.argv[2]
fs.writeFileSync(p,data.state); console.log('backed up',data.state.length,'chars to',p,'| updated_at',data.updated_at)
process.exit(0)
