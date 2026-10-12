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
    const commission = formData.get('default_commission_rate')

    // Insert into the public.staff table directly without an auth user
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert([{
        clinic_id: clinicId,
        full_name: fullName,
        role: role,
        specialization: specialization || null,
        phone: phone || null,
        default_commission_rate: commission ? parseInt(commission) : 0,
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
    const commission = formData.get('default_commission_rate')

    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .update({
        full_name: fullName,
        role: role,
        specialization: specialization || null,
        phone: phone || null,
        default_commission_rate: commission ? parseInt(commission) : 0,
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

export async function getStaffDeletionInfo(staffId) {
  try {
    const [{ count: appointmentCount, error: apptErr }, { count: planCount, error: planErr }] = await Promise.all([
      supabaseAdmin.from('appointments').select('id', { count: 'exact', head: true }).eq('dentist_id', staffId),
      supabaseAdmin.from('treatment_plans').select('id', { count: 'exact', head: true }).eq('dentist_id', staffId)
    ])

    if (apptErr) throw apptErr
    if (planErr) throw planErr

    const appts = appointmentCount || 0
    const plans = planCount || 0

    return {
      success: true,
      hasRecords: appts > 0 || plans > 0,
      appointmentCount: appts,
      planCount: plans
    }
  } catch (err) {
    console.error('getStaffDeletionInfo error:', err)
    return { error: "Ma'lumotlarni tekshirishda xatolik yuz berdi" }
  }
}

export async function deactivateStaffMember(staffId) {
  try {
    const { error } = await supabaseAdmin
      .from('staff')
      .update({ is_active: false })
      .eq('id', staffId)

    if (error) {
      console.error('Staff deactivate error:', error)
      return { error: 'Xodimni nofaol qilishda xatolik: ' + error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Server error deactivating staff:', err)
    return { error: 'Ichki server xatoligi yuz berdi' }
  }
}

export async function deleteStaffMember(staffId, { force = false } = {}) {
  try {
    // 1. Fetch staff member to see role and user_id
    const { data: staff, error: fetchErr } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .single()

    if (fetchErr || !staff) {
      return { error: 'Xodim topilmadi' }
    }

    // 2. Check if records exist
    const [{ count: appointmentCount }, { count: planCount }] = await Promise.all([
      supabaseAdmin.from('appointments').select('id', { count: 'exact', head: true }).eq('dentist_id', staffId),
      supabaseAdmin.from('treatment_plans').select('id', { count: 'exact', head: true }).eq('dentist_id', staffId)
    ])

    const totalRecords = (appointmentCount || 0) + (planCount || 0)
    if (totalRecords > 0 && !force) {
      return {
        error: "Ushbu xodimga bog'langan qabullar yoki davolash rejalari mavjud",
        hasRecords: true,
        appointmentCount: appointmentCount || 0,
        planCount: planCount || 0
      }
    }

    // 3. If force is requested and records exist, clean up dependencies
    if (force && totalRecords > 0) {
      // Clean up commissions & payouts
      await supabaseAdmin.from('doctor_commissions').delete().eq('dentist_id', staffId)
      await supabaseAdmin.from('payouts').delete().eq('dentist_id', staffId)

      // Clean up appointments
      const { data: appts } = await supabaseAdmin
        .from('appointments')
        .select('id')
        .eq('dentist_id', staffId)

      if (appts && appts.length > 0) {
        const apptIds = appts.map(a => a.id)
        // Clean up notifications referencing appointments
        await supabaseAdmin.from('notifications').delete().in('appointment_id', apptIds)
        // Delete appointments
        await supabaseAdmin.from('appointments').delete().eq('dentist_id', staffId)
      }

      // Clean up treatment plans
      const { data: plans } = await supabaseAdmin
        .from('treatment_plans')
        .select('id')
        .eq('dentist_id', staffId)

      if (plans && plans.length > 0) {
        const planIds = plans.map(p => p.id)
        // Payments referencing treatment plans
        await supabaseAdmin.from('payments').update({ treatment_plan_id: null }).in('treatment_plan_id', planIds)
        // Treatment items cascade when plans are deleted, but delete explicitly to be safe
        await supabaseAdmin.from('treatment_items').delete().in('treatment_plan_id', planIds)
        // Delete treatment plans
        await supabaseAdmin.from('treatment_plans').delete().eq('dentist_id', staffId)
      }
    }

    // 4. Delete staff record
    const { error: deleteErr } = await supabaseAdmin
      .from('staff')
      .delete()
      .eq('id', staffId)

    if (deleteErr) {
      console.error('Staff deletion error:', deleteErr)
      return { error: "Xodimni o'chirishda xatolik yuz berdi: " + deleteErr.message }
    }

    // 5. Delete auth user if one exists
    if (staff.user_id) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(staff.user_id)
      } catch (authErr) {
        console.warn('Auth user deletion warning:', authErr)
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Server error deleting staff:', err)
    return { error: 'Ichki server xatoligi yuz berdi' }
  }
}
