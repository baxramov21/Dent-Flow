import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req) {
  try {
    const { clinic_id, bot_token } = await req.json()
    
    if (!clinic_id) {
      return NextResponse.json({ error: 'Missing clinic_id' }, { status: 400 })
    }

    if (!bot_token) {
      return NextResponse.json({ error: 'Missing bot token' }, { status: 400 })
    }

    // 1. Determine base URL (Fallback to Vercel production URL if NEXT_PUBLIC_APP_URL is missing)
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) {
      // In production, Vercel sets VERCEL_PROJECT_PRODUCTION_URL
      if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      } else {
        return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL environment variable is missing' }, { status: 500 })
      }
    }

    // 2. Construct specific webhook URL
    const webhookUrl = `${baseUrl}/api/webhook/telegram?clinic_id=${clinic_id}`

    // 3. Register with Telegram
    const telegramRes = await fetch(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    })

    const data = await telegramRes.json()

    if (!data.ok) {
      console.error('Telegram setWebhook error:', data)
      return NextResponse.json({ error: data.description || 'Failed to register webhook with Telegram' }, { status: 400 })
    }

    // 4. Update the clinic record in DB
    const { error: dbError } = await supabaseAdmin
      .from('clinics')
      .update({ telegram_bot_token: bot_token })
      .eq('id', clinic_id)

    if (dbError) {
      console.error('Database error saving bot token:', dbError)
      return NextResponse.json({ error: 'Failed to save bot token in database' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Webhook registered successfully' })

  } catch (error) {
    console.error('Webhook registration error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
