const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.rpc('get_schema', {}); 
  // Wait, RPC might not exist. Let's just query 1 row from patients.
  const { data: d2 } = await supabase.from('patients').select('*').limit(1);
  console.log(Object.keys(d2[0]));
}
run();
