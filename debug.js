const fs = require('fs')
const env = fs.readFileSync('.env.local', 'utf8')
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1]
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1]

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  const { data: items, error: err1 } = await supabase.from('treatment_items').select('*')
  console.log('Treatment Items Error:', err1)
  
  const { data: payments, error: err2 } = await supabase.from('payments').select('*')
  console.log('Payments Error:', err2)
}

checkData()
