export async function sendTelegramMessage(chatId, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is missing')
    return false
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    })

    const data = await res.json()
    if (!data.ok) {
      console.error('Telegram xato:', data.description)
      return false
    }

    return true
  } catch (error) {
    console.error('Telegram fetch xato:', error)
    return false
  }
}
