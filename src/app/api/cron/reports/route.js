import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram'

// Bypass Next.js default caching for this route
export const dynamic = 'force-dynamic'

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

export async function GET(request) {
  try {
    // Basic security: require a CRON_SECRET header to match Vercel's authorization
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current hour in UTC+5 (Tashkent)
    // We do simple matching. E.g. if it is 18:00 in Tashkent, we send reports scheduled for 18:xx
    const now = new Date()
    const tashkentOffset = 5 * 60 * 60 * 1000
    const localNow = new Date(now.getTime() + tashkentOffset)
    const currentHour = localNow.getUTCHours()

    const { data: clinics, error: clinicsError } = await supabaseAdmin
      .from('clinics')
      .select('id, name, telegram_chat_id, report_frequency, report_time')
      .not('telegram_chat_id', 'is', null)
      .neq('telegram_chat_id', '')
      .neq('report_frequency', 'never')

    if (clinicsError) throw clinicsError

    const reportsSent = []

    for (const clinic of clinics) {
      if (!clinic.report_time) continue
      
      const clinicHour = parseInt(clinic.report_time.split(':')[0])
      
      // Check if it's the right hour
      if (clinicHour !== currentHour) {
        continue
      }

      // Check frequency
      const dayOfWeek = localNow.getUTCDay() // 0 is Sunday
      if (clinic.report_frequency === 'weekly' && dayOfWeek !== 0) {
        continue // Only send weekly reports on Sunday
      }
      if (clinic.report_frequency === 'monthly' && localNow.getUTCDate() !== 1) {
        continue // Only send monthly on 1st of month
      }

      // We should calculate today's KPIs
      const startOfDay = new Date(localNow)
      startOfDay.setUTCHours(0, 0, 0, 0)
      startOfDay.setTime(startOfDay.getTime() - tashkentOffset) // back to UTC
      
      const { data: payments } = await supabaseAdmin
        .from('payments')
        .select('amount')
        .eq('clinic_id', clinic.id)
        .gte('paid_at', startOfDay.toISOString())

      const { data: procedures } = await supabaseAdmin
        .from('treatment_items')
        .select('id')
        .eq('clinic_id', clinic.id)
        .eq('status', 'completed')
        .gte('completed_at', startOfDay.toISOString())

      const totalRevenue = payments?.reduce((acc, p) => acc + p.amount, 0) || 0
      const totalProcedures = procedures?.length || 0

      const reportMessage = `
🏥 <b>${clinic.name}</b>
📊 ${clinic.report_frequency === 'daily' ? 'Kunlik' : 'Muntazam'} Hisobot

💰 <b>Tushum:</b> ${totalRevenue.toLocaleString()} UZS
🩺 <b>Muolajalar soni:</b> ${totalProcedures} ta

<i>DentFlow - Stomatologiya CRM</i>
      `.trim()

      const success = await sendTelegramMessage(clinic.telegram_chat_id, reportMessage)
      if (success) {
        reportsSent.push(clinic.id)
      }
    }

    return NextResponse.json({ success: true, sentTo: reportsSent })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
