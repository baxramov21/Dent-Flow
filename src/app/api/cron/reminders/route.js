import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram'
import { sendEskizSms } from '@/lib/eskiz'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req) {
  // 1. Verify Vercel Cron Secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 2. Calculate time window (Appointments starting anytime tomorrow)
    const now = new Date()
    // Start of tomorrow (in local time ideally, but UTC is fine since we add 24h roughly)
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0).toISOString()
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59).toISOString()

    // 3. Fetch appointments
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        start_time,
        clinic_id,
        patient_id,
        status,
        clinics(name, phone),
        patients(id, full_name, phone, telegram_chat_id)
      `)
      .gte('start_time', tomorrowStart)
      .lte('start_time', tomorrowEnd)
      .in('status', ['scheduled', 'confirmed'])

    if (error) {
      console.error('Error fetching appointments for cron:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ ok: true, message: 'No upcoming appointments found' })
    }

    let sentCount = 0

    // 4. Process each appointment
    for (const appt of appointments) {
      // Check if a reminder was already sent
      const { data: existingNotification } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('appointment_id', appt.id)
        .in('status', ['sent', 'delivered'])
        .single()

      if (existingNotification) continue // Skip if already sent

      const patient = appt.patients
      const clinic = appt.clinics
      const timeString = new Date(appt.start_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' })
      const dateString = new Date(appt.start_time).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', timeZone: 'Asia/Tashkent' })

      const message = `Hurmatli ${patient.full_name}, eslatib o'tamiz:\nErtaga, ${dateString} kuni soat ${timeString} da "${clinic.name}" klinikasida qabulingiz bor.\nMa'lumot uchun: ${clinic.phone || ''}`

      let sent = false
      let methodUsed = ''

      // 5. Try Telegram first if linked
      if (patient.telegram_chat_id) {
        sent = await sendTelegramMessage(patient.telegram_chat_id, message)
        if (sent) methodUsed = 'telegram'
      }

      // 6. Fallback to SMS if Telegram failed or not linked
      if (!sent && patient.phone) {
        sent = await sendEskizSms(patient.phone, message)
        if (sent) methodUsed = 'eskiz'
      }

      // 7. Log notification
      if (sent) {
        await supabaseAdmin.from('notifications').insert({
          clinic_id: appt.clinic_id,
          appointment_id: appt.id,
          patient_id: patient.id,
          type: methodUsed,
          template: 'appointment_reminder_24h',
          message: message,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        sentCount++
      } else {
        await supabaseAdmin.from('notifications').insert({
          clinic_id: appt.clinic_id,
          appointment_id: appt.id,
          patient_id: patient.id,
          type: patient.telegram_chat_id ? 'telegram' : 'eskiz',
          template: 'appointment_reminder_24h',
          message: message,
          status: 'failed'
        })
      }
    }

    return NextResponse.json({ ok: true, sent: sentCount })
  } catch (err) {
    console.error('Cron job error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
