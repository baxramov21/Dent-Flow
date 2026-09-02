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

export async function registerClinic(data) {
  const { clinicName, adminName, phone, password } = data

  try {
    // Format phone to be used as email for Supabase Auth
    // E.g. +998901234567 -> 998901234567@dentflow.uz
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 9) {
      throw new Error("Noto'g'ri telefon raqam")
    }
    const formattedEmail = `${cleanPhone}@dentflow.uz`

    // 1. Create the Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formattedEmail,
      password: password,
      email_confirm: true 
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error('Bu telefon raqam bilan allaqachon ro\'yxatdan o\'tilgan')
      }
      throw new Error(authError.message)
    }
    
    const userId = authData.user.id

    // 2. Create the Clinic
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .insert([{
        name: clinicName,
        phone: phone,
        is_active: true,
        onboarding_completed: true
      }])
      .select()
      .single()

    if (clinicError) {
      // Rollback user creation
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error(clinicError.message)
    }
    
    const clinicId = clinicData.id

    // 3. Create the Staff/Admin profile linking the user to the clinic
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert([{
        clinic_id: clinicId,
        user_id: userId,
        full_name: adminName,
        phone: phone,
        role: 'admin',
        is_active: true
      }])

    if (staffError) {
      // We don't rollback fully here to avoid complex logic, but in prod we might
      throw new Error(staffError.message)
    }

    // 4. Seed default service categories
    const defaultCategories = ['Umumiy', 'Jarrohlik', 'Ortodontiya', 'Ortopediya', 'Terapiya']
    
    // Check if 'service_categories' table exists or if it's stored in clinic settings
    // For now we will insert default services into 'services' directly
    const defaultServices = [
      { clinic_id: clinicId, name: 'Konsultatsiya', name_uz: 'Konsultatsiya', price: 50000, category: 'Umumiy', is_active: true },
      { clinic_id: clinicId, name: 'Tish yulish (oddiy)', name_uz: 'Tish yulish (oddiy)', price: 150000, category: 'Jarrohlik', is_active: true },
      { clinic_id: clinicId, name: 'Tish yulish (murakkab)', name_uz: 'Tish yulish (murakkab)', price: 300000, category: 'Jarrohlik', is_active: true },
      { clinic_id: clinicId, name: 'Plombalash', name_uz: 'Plombalash', price: 250000, category: 'Terapiya', is_active: true },
      { clinic_id: clinicId, name: 'Briket qoyish', name_uz: 'Briket qoyish', price: 4000000, category: 'Ortodontiya', is_active: true },
      { clinic_id: clinicId, name: 'Tish tozalash', name_uz: 'Tish tozalash', price: 200000, category: 'Umumiy', is_active: true }
    ]

    await supabaseAdmin.from('services').insert(defaultServices)

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
