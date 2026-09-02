import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  // Wait, supabase js doesn't have a direct raw SQL execution method via the client unless it's a rpc.
  // I need to know if there's a way.
  console.log('Skipping js migration, we need to use a direct SQL execution.')
}
run()
