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
    const email = formData.get('email')
    const password = formData.get('password')
    const fullName = formData.get('full_name')
    const role = formData.get('role') // 'admin', 'dentist', 'receptionist'
    const phone = formData.get('phone')

    // 1. Create the user in Supabase Auth using the Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm their email for MVP
      user_metadata: { full_name: fullName }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return { error: 'Auth xatoligi: ' + authError.message }
    }

    const newUserId = authData.user.id

    // 2. Insert into the public.staff table
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert([{
        clinic_id: clinicId,
        user_id: newUserId,
        full_name: fullName,
        role: role,
        phone: phone,
        is_active: true
      }])

    if (staffError) {
      // Rollback: delete the auth user if staff insertion failed
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      console.error('Staff error:', staffError)
      return { error: 'Xodimni saqlashda xatolik: ' + staffError.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Server xatoligi:', err)
    return { error: 'Ichki server xatoligi yuz berdi' }
  }
}
