'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function createStaffMember(clinicId, formData) {
  try {
    const fullName = formData.get('full_name')
    const role = formData.get('role') // 'admin', 'dentist', 'receptionist'
    const phone = formData.get('phone')
    const specialization = formData.get('specialization')

    // Insert into the public.staff table directly without an auth user
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert([{
        clinic_id: clinicId,
        full_name: fullName,
        role: role,
        specialization: specialization || null,
        phone: phone || null,
        is_active: true
      }])

    if (staffError) {
      console.error('Staff error:', staffError)
      return { error: 'Xodimni saqlashda xatolik: ' + staffError.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Server xatoligi:', err)
    return { error: 'Ichki server xatoligi yuz berdi' }
  }
}

export async function updateStaffMember(staffId, formData) {
  try {
    const fullName = formData.get('full_name')
    const role = formData.get('role')
    const phone = formData.get('phone')
    const specialization = formData.get('specialization')
    const is_active = formData.get('is_active') === 'true'

    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .update({
        full_name: fullName,
        role: role,
        specialization: specialization || null,
        phone: phone || null,
        is_active: is_active
      })
      .eq('id', staffId)

    if (staffError) {
      console.error('Staff update error:', staffError)
      return { error: 'Xodimni yangilashda xatolik: ' + staffError.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Server xatoligi:', err)
    return { error: 'Ichki server xatoligi yuz berdi' }
  }
}

