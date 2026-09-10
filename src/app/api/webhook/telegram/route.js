import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)


// Helper to send messages back to telegram
async function sendMessage(botToken, chatId, text, replyMarkup = null) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  }
  if (replyMarkup) {
    body.reply_markup = replyMarkup
  }
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

export async function POST(req) {
  try {
    const body = await req.json()
    
    // Validate telegram payload
    if (!body.message) {
      return NextResponse.json({ ok: true })
    }

    const { chat, text, contact } = body.message
    const chatId = chat.id
    
    // Extract clinic_id from URL
    const url = new URL(req.url)
    const clinicId = url.searchParams.get('clinic_id')
    
    if (!clinicId) {
      console.error('Missing clinic_id in webhook URL')
      return NextResponse.json({ ok: true })
    }
    
    // Fetch clinic's bot token
    const { data: clinic, error: clinicErr } = await supabaseAdmin
      .from('clinics')
      .select('telegram_bot_token')
      .eq('id', clinicId)
      .single()
      
    if (clinicErr || !clinic || !clinic.telegram_bot_token) {
      console.error('Clinic not found or no bot token configured')
      return NextResponse.json({ ok: true })
    }
    
    const botToken = clinic.telegram_bot_token

    // Handle /start command
    if (text === '/start') {
      const replyMarkup = {
        keyboard: [
          [{ text: "📞 Telefon raqamni yuborish", request_contact: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
      
      await sendMessage(
        botToken,
        chatId, 
        "Assalomu alaykum! DentFlow klinika tizimiga xush kelibsiz. \n\nIltimos, profilingizni ulash uchun pastdagi tugma orqali telefon raqamingizni yuboring:", 
        replyMarkup
      )
      return NextResponse.json({ ok: true })
    }

    // Handle contact sharing
    if (contact) {
      let phone = contact.phone_number
      // Ensure phone format has +
      if (!phone.startsWith('+')) {
        phone = '+' + phone
      }

      // Search for patient with this phone number
      const { data: patients, error } = await supabaseAdmin
        .from('patients')
        .select('id, full_name')
        // Often phone numbers in DB might have spaces or lack '+', so we should try to match the digits
        // For exact match:
        .eq('phone', phone)
        
      if (error) {
        console.error('Database error in telegram webhook:', error)
        await sendMessage(botToken, chatId, "Xatolik yuz berdi. Iltimos keyinroq urinib ko'ring.")
        return NextResponse.json({ ok: true })
      }

      if (patients && patients.length > 0) {
        // Update all patient records that match this phone number (they might be registered in multiple clinics)
        for (const p of patients) {
          await supabaseAdmin
            .from('patients')
            .update({ telegram_chat_id: chatId.toString() })
            .eq('id', p.id)
        }
        
        await sendMessage(
          botToken,
          chatId, 
          `Rahmat, ${patients[0].full_name}! Profilingiz muvaffaqiyatli ulandi. Endi sizga qabul vaqtlari haqida eslatmalar yuborib turiladi.`,
          { remove_keyboard: true }
        )
      } else {
        // If exact match fails, they might have entered '+998 90 123 45 67' in the DB.
        // Let's do an ILIKE or a second check without '+' if needed, but for now we tell them it's not found.
        await sendMessage(
          botToken,
          chatId, 
          "Kechirasiz, ushbu raqamga bog'langan profil topilmadi. Raqamingiz klinika ro'yxatidan o'tganiga ishonch hosil qiling.",
          { remove_keyboard: true }
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
