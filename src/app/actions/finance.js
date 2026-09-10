'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function toggleTreatmentItemStatus(itemId, currentStatus) {
  try {
    const newStatus = currentStatus === 'completed' ? 'planned' : 'completed'
    
    // Update the item
    const updateData = { status: newStatus }
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else {
      updateData.completed_at = null
    }

    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('treatment_items')
      .update(updateData)
      .eq('id', itemId)
      .select(`
        *,
        treatment_plans(dentist_id),
        services(price, commission_rate)
      `)
      .single()

    if (updateError) throw updateError

    // If marked as completed, generate commission
    if (newStatus === 'completed') {
      const dentistId = updatedItem.treatment_plans.dentist_id
      const price = updatedItem.price_override || updatedItem.services.price
      
      // Get dentist's default commission rate
      const { data: dentist } = await supabaseAdmin
        .from('staff')
        .select('default_commission_rate')
        .eq('id', dentistId)
        .single()
        
      const defaultRate = dentist?.default_commission_rate || 0
      const serviceRate = updatedItem.services.commission_rate
      
      // Service rate overrides default if it's set (not null)
      const appliedRate = (serviceRate !== null && serviceRate !== undefined) ? serviceRate : defaultRate
      
      const commissionAmount = Math.floor(price * (appliedRate / 100))
      
      if (commissionAmount > 0) {
        await supabaseAdmin.from('doctor_commissions').upsert({
          clinic_id: updatedItem.clinic_id,
          dentist_id: dentistId,
          treatment_item_id: itemId,
          amount: commissionAmount,
          status: 'unpaid'
        }, { onConflict: 'treatment_item_id' })
      }
    } else {
      // If un-completed, delete any unpaid commission for this item
      await supabaseAdmin
        .from('doctor_commissions')
        .delete()
        .eq('treatment_item_id', itemId)
        .eq('status', 'unpaid')
    }

    return { success: true }
  } catch (err) {
    console.error('toggleTreatmentItemStatus error:', err)
    return { error: 'Holatni o\'zgartirishda xatolik: ' + err.message }
  }
}

export async function payoutCommissions(clinicId, dentistId, amount) {
  try {
    // Insert into payouts
    const { error: payoutError } = await supabaseAdmin.from('payouts').insert({
      clinic_id: clinicId,
      dentist_id: dentistId,
      amount: amount,
      notes: 'Komissiya to\'lovi'
    })
    
    if (payoutError) throw payoutError
    
    // Mark unpaid commissions as paid
    const { error: updateError } = await supabaseAdmin
      .from('doctor_commissions')
      .update({ status: 'paid' })
      .eq('clinic_id', clinicId)
      .eq('dentist_id', dentistId)
      .eq('status', 'unpaid')
      
    if (updateError) throw updateError
    
    return { success: true }
  } catch (err) {
    console.error('payoutCommissions error:', err)
    return { error: 'To\'lovni amalga oshirishda xatolik: ' + err.message }
  }
}
