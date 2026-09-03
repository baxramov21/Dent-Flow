import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
  const { data, error } = await supabase
    .from('treatment_items')
    .select(`
      id,
      tooth_number,
      price_override,
      status,
      completed_at,
      services(name_uz, name),
      treatment_plans!inner(
        id,
        dentist_id,
        patients(id, full_name, phone),
        staff(id, full_name)
      )
    `)
    .eq('clinic_id', 'bd48a044-8ce8-4d35-a02e-e0268c5f3e73')
  console.log('Error:', error)
  console.log('Data Length:', data ? data.length : 0)
  console.log('Sample Data:', data ? data[0] : null)
}

test()
