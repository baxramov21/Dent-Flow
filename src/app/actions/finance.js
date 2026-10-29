'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

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

// ---------------------------------------------------------------------------
// Sync-safe deletions
// Revenue, debt and commissions are always computed live from the
// payments / treatment_items / doctor_commissions tables, so every deletion
// below removes all related rows together to keep those numbers consistent.
// ---------------------------------------------------------------------------

// Returns the caller's staff record (clinic scope) or throws.
async function requireStaff() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Avtorizatsiyadan o\'tilmagan')

  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('id, clinic_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!staff) throw new Error('Xodim profili topilmadi')
  return staff
}

// Remove loyalty points that were earned from `amount` of payment.
async function reverseLoyaltyForAmount(clinicId, patientId, amount) {
  if (!patientId || !amount || amount <= 0) return
  try {
    const { data: clinic } = await supabaseAdmin
      .from('clinics')
      .select('loyalty_earn_rate')
      .eq('id', clinicId)
      .single()
    const earnRate = clinic?.loyalty_earn_rate || 10000
    const points = Math.floor(amount / earnRate)
    if (points <= 0) return

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('loyalty_points')
      .eq('id', patientId)
      .single()
    const current = patient?.loyalty_points || 0
    const removed = Math.min(points, current)
    if (removed <= 0) return

    await supabaseAdmin
      .from('patients')
      .update({ loyalty_points: current - removed })
      .eq('id', patientId)

    await supabaseAdmin.from('loyalty_transactions').insert([{
      clinic_id: clinicId,
      patient_id: patientId,
      points: -removed,
      reason: 'To\'lov bekor qilindi'
    }])
  } catch (e) {
    console.warn('Loyalty reversal failed', e)
  }
}

// Delete one payment row and reverse the loyalty points it earned.
async function removePaymentRow(payment) {
  const { error } = await supabaseAdmin.from('payments').delete().eq('id', payment.id)
  if (error) throw error
  await reverseLoyaltyForAmount(payment.clinic_id, payment.patient_id, payment.amount)
}

// Remove up to `amount` from a plan's payments, newest first.
// Payments that reach zero are deleted; otherwise their amount is lowered.
async function reducePlanPayments(planId, amount) {
  if (!planId || amount <= 0) return 0
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('id, amount, clinic_id, patient_id')
    .eq('treatment_plan_id', planId)
    .order('paid_at', { ascending: false })

  let remaining = amount
  for (const p of payments || []) {
    if (remaining <= 0) break
    if (p.amount <= remaining) {
      await removePaymentRow(p)
      remaining -= p.amount
    } else {
      const { error } = await supabaseAdmin
        .from('payments')
        .update({ amount: p.amount - remaining })
        .eq('id', p.id)
      if (error) throw error
      await reverseLoyaltyForAmount(p.clinic_id, p.patient_id, remaining)
      remaining = 0
    }
  }
  return amount - remaining
}

// Total of completed procedures and of payments on a plan.
async function getPlanTotals(planId) {
  const [{ data: items }, { data: pays }] = await Promise.all([
    supabaseAdmin
      .from('treatment_items')
      .select('price_override, services(price)')
      .eq('treatment_plan_id', planId)
      .eq('status', 'completed'),
    supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('treatment_plan_id', planId)
  ])
  const billed = (items || []).reduce((s, i) => s + (i.price_override ?? i.services?.price ?? 0), 0)
  const paid = (pays || []).reduce((s, p) => s + (p.amount || 0), 0)
  return { billed, paid }
}

/**
 * Delete a procedure together with its commission. If the procedure was
 * completed and paid, the matching payment amount is removed as well
 * (only the part that is now an overpayment, so real debts are not erased),
 * and the loyalty points earned from that payment are taken back.
 */
export async function deleteProcedure(itemId) {
  try {
    const staff = await requireStaff()

    const { data: item, error: itemErr } = await supabaseAdmin
      .from('treatment_items')
      .select('id, clinic_id, status, price_override, treatment_plan_id, services(price)')
      .eq('id', itemId)
      .single()
    if (itemErr || !item) return { error: 'Muolaja topilmadi' }
    if (item.clinic_id !== staff.clinic_id) return { error: 'Ruxsat yo\'q' }

    const price = item.price_override ?? item.services?.price ?? 0

    // 1. Commission (paid or unpaid)
    await supabaseAdmin.from('doctor_commissions').delete().eq('treatment_item_id', itemId)

    // 2. The procedure itself
    const { error: delErr } = await supabaseAdmin.from('treatment_items').delete().eq('id', itemId)
    if (delErr) throw delErr

    // 3. Payment: remove whatever is now overpaid on this plan (capped at the item price)
    let paymentRemoved = 0
    if (item.status === 'completed' && item.treatment_plan_id && price > 0) {
      const { billed, paid } = await getPlanTotals(item.treatment_plan_id)
      const overpaid = Math.max(0, paid - billed)
      paymentRemoved = await reducePlanPayments(item.treatment_plan_id, Math.min(overpaid, price))
    }

    return { success: true, paymentRemoved }
  } catch (err) {
    console.error('deleteProcedure error:', err)
    return { error: 'Muolajani o\'chirishda xatolik: ' + err.message }
  }
}

/**
 * Delete a single payment and reverse the loyalty points it earned.
 */
export async function deletePayment(paymentId) {
  try {
    const staff = await requireStaff()
    if (staff.role !== 'admin') return { error: 'Faqat admin to\'lovni o\'chira oladi' }

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('id, amount, clinic_id, patient_id')
      .eq('id', paymentId)
      .single()
    if (error || !payment) return { error: 'To\'lov topilmadi' }
    if (payment.clinic_id !== staff.clinic_id) return { error: 'Ruxsat yo\'q' }

    await removePaymentRow(payment)
    return { success: true }
  } catch (err) {
    console.error('deletePayment error:', err)
    return { error: 'To\'lovni o\'chirishda xatolik: ' + err.message }
  }
}

/**
 * Batch delete multiple procedures and/or payments in a single server call.
 * Checks auth once and processes all staged deletions together.
 */
export async function batchSaveHistoryDeletions({ procedureIds = [], paymentIds = [] }) {
  try {
    const staff = await requireStaff()
    if (staff.role !== 'admin') return { error: 'Faqat admin o\'zgartirishlarni saqlay oladi' }

    // 1. Delete explicitly staged payments first
    if (paymentIds.length > 0) {
      const { data: payments } = await supabaseAdmin
        .from('payments')
        .select('id, amount, clinic_id, patient_id')
        .in('id', paymentIds)
        .eq('clinic_id', staff.clinic_id)

      for (const p of payments || []) {
        await removePaymentRow(p)
      }
    }

    // 2. Delete staged procedures + their commissions + any remaining overpaid plan payments
    if (procedureIds.length > 0) {
      const { data: items } = await supabaseAdmin
        .from('treatment_items')
        .select('id, clinic_id, status, price_override, treatment_plan_id, services(price)')
        .in('id', procedureIds)
        .eq('clinic_id', staff.clinic_id)

      const validItems = items || []
      if (validItems.length > 0) {
        const validIds = validItems.map(i => i.id)

        // Delete all commissions and items in bulk
        await supabaseAdmin.from('doctor_commissions').delete().in('treatment_item_id', validIds)
        const { error: delErr } = await supabaseAdmin.from('treatment_items').delete().in('id', validIds)
        if (delErr) throw delErr

        // Group removed completed price by treatment_plan_id
        const planPriceRemoved = {}
        for (const item of validItems) {
          if (item.status === 'completed' && item.treatment_plan_id) {
            const price = item.price_override ?? item.services?.price ?? 0
            if (price > 0) {
              planPriceRemoved[item.treatment_plan_id] = (planPriceRemoved[item.treatment_plan_id] || 0) + price
            }
          }
        }

        // For each affected plan, reduce overpaid payments once
        for (const [planId, removedPrice] of Object.entries(planPriceRemoved)) {
          const { billed, paid } = await getPlanTotals(planId)
          const overpaid = Math.max(0, paid - billed)
          if (overpaid > 0) {
            await reducePlanPayments(planId, Math.min(overpaid, removedPrice))
          }
        }
      }
    }

    return { success: true }
  } catch (err) {
    console.error('batchSaveHistoryDeletions error:', err)
    return { error: 'Saqlashda xatolik: ' + err.message }
  }
}

/**
 * Undo the billing side of an appointment that was completed within the
 * last 24h and is now cancelled: procedures go back to "planned", their
 * commissions are removed, and the payments taken for them are deleted
 * (with loyalty points reversed).
 */
export async function revertAppointmentBilling(appointmentId) {
  try {
    const staff = await requireStaff()

    const { data: appt } = await supabaseAdmin
      .from('appointments')
      .select('id, clinic_id, patient_id, treatment_plan_id')
      .eq('id', appointmentId)
      .single()
    if (!appt) return { error: 'Qabul topilmadi' }
    if (appt.clinic_id !== staff.clinic_id) return { error: 'Ruxsat yo\'q' }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const planId = appt.treatment_plan_id
    const patientId = appt.patient_id

    if (planId) {
      // Procedures completed recently on this plan
      const { data: items } = await supabaseAdmin
        .from('treatment_items')
        .select('id')
        .eq('treatment_plan_id', planId)
        .eq('status', 'completed')
        .gte('completed_at', since)
      const itemIds = (items || []).map(i => i.id)

      if (itemIds.length > 0) {
        await supabaseAdmin.from('doctor_commissions').delete().in('treatment_item_id', itemIds)
        await supabaseAdmin
          .from('treatment_items')
          .update({ status: 'planned', completed_at: null, price_override: null })
          .in('id', itemIds)
      }

      // All payments taken on this plan recently (any note)
      const { data: planPays } = await supabaseAdmin
        .from('payments')
        .select('id, amount, clinic_id, patient_id')
        .eq('treatment_plan_id', planId)
        .gte('paid_at', since)
      for (const p of planPays || []) await removePaymentRow(p)
    }

    if (patientId) {
      // Keep previous behaviour for auto / debt payments without a plan
      const { data: otherPays } = await supabaseAdmin
        .from('payments')
        .select('id, amount, clinic_id, patient_id')
        .eq('patient_id', patientId)
        .is('treatment_plan_id', null)
        .or(`notes.like.Avtomatik to'lov%,notes.eq.Qarz to'lovi`)
        .gte('paid_at', since)
      for (const p of otherPays || []) await removePaymentRow(p)

      await supabaseAdmin
        .from('medical_history')
        .delete()
        .eq('patient_id', patientId)
        .eq('condition', 'Bajarilgan muolajalar')
        .gte('reported_at', since)
    }

    return { success: true }
  } catch (err) {
    console.error('revertAppointmentBilling error:', err)
    return { error: 'Qabulni bekor qilishda xatolik: ' + err.message }
  }
}
