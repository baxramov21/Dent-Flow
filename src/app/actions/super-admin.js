'use server'

import { createClient } from '@supabase/supabase-js'

// Initialize a separate Supabase client with the Service Role Key.
// This key bypasses RLS and allows Admin API actions like creating users securely.
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

export async function createNewClinicAction(data) {
  const { clinicName, username, password, subscriptionEndDate } = data

  try {
    const formattedEmail = `${username}@dentflow.uz`

    // 1. Create the Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formattedEmail,
      password: password,
      email_confirm: true // Skip email verification
    })

    if (authError) throw new Error(authError.message)
    const userId = authData.user.id

    // 2. Create the Clinic
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .insert([{
        name: clinicName,
        is_active: true,
        subscription_end_date: subscriptionEndDate
      }])
      .select()
      .single()

    if (clinicError) throw new Error(clinicError.message)
    const clinicId = clinicData.id

    // 3. Create the Staff/Admin profile linking the user to the clinic
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert([{
        clinic_id: clinicId,
        user_id: userId,
        full_name: `${clinicName} Admin`,
        role: 'admin',
        is_active: true
      }])

    if (staffError) throw new Error(staffError.message)

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updateAdminCredentialsAction(userId, newUsername, newPassword) {
  try {
    const updates = {}
    if (newUsername) updates.email = `${newUsername}@dentflow.uz`
    if (newPassword) updates.password = newPassword

    if (Object.keys(updates).length === 0) return { success: true }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function fetchClinicsWithAdminsAction() {
  try {
    // 1. Fetch clinics and staff
    const { data: clinics, error: clinicsError } = await supabaseAdmin
      .from('clinics')
      .select('*, staff(user_id, full_name, role)')
      .order('created_at', { ascending: false })
      
    if (clinicsError) throw new Error(clinicsError.message)

    // 2. Fetch all users from auth to map emails
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    if (usersError) throw new Error(usersError.message)

    const userMap = {}
    usersData.users.forEach(u => {
      userMap[u.id] = u.email
    })

    // 3. Combine
    const populatedClinics = clinics.map(clinic => {
      const admin = clinic.staff?.find(s => s.role === 'admin')
      let adminUsername = null
      if (admin && userMap[admin.user_id]) {
        adminUsername = userMap[admin.user_id].split('@')[0]
      }
      return {
        ...clinic,
        adminUsername,
        adminUserId: admin?.user_id || null
      }
    })

    return { success: true, clinics: populatedClinics }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updateSubscriptionDateAction(clinicId, newDate) {
  try {
    const { error } = await supabaseAdmin
      .from('clinics')
      .update({ subscription_end_date: newDate })
      .eq('id', clinicId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function assignAdminToClinicAction(clinicId, username, password) {
  try {
    const formattedEmail = `${username}@dentflow.uz`

    // 1. Create the Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formattedEmail,
      password: password,
      email_confirm: true // Skip email verification
    })

    if (authError) throw new Error(authError.message)
    const userId = authData.user.id

    // 2. Fetch the clinic name
    const { data: clinicData } = await supabaseAdmin
      .from('clinics')
      .select('name')
      .eq('id', clinicId)
      .single()

    const clinicName = clinicData?.name || 'Clinic'

    // 3. Insert into staff table
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert([{
        clinic_id: clinicId,
        user_id: userId,
        full_name: `${clinicName} Admin`,
        role: 'admin',
        is_active: true
      }])

    if (staffError) throw new Error(staffError.message)

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getClinicStatsAction(clinicId) {
  try {
    // Total Patients
    const { count: patientsCount, error: pError } = await supabaseAdmin
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)

    if (pError) throw new Error(pError.message)

    // Total Appointments
    const { count: appointmentsCount, error: aError } = await supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      
    if (aError) throw new Error(aError.message)

    // Total Revenue (Sum of payments.amount)
    const { data: paymentsData, error: payError } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('clinic_id', clinicId)
      
    if (payError) throw new Error(payError.message)
    
    const totalRevenue = paymentsData.reduce((sum, record) => sum + (record.amount || 0), 0)

    return { 
      success: true, 
      stats: {
        patients: patientsCount || 0,
        appointments: appointmentsCount || 0,
        revenue: totalRevenue
      }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
