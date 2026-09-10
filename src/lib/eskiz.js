export async function sendEskizSms(email, password, phone, message) {
  
  if (!email || !password) {
    console.error('ESKIZ credentials missing in .env')
    return false
  }

  try {
    // 1. Get Token
    const authRes = await fetch('https://notify.eskiz.uz/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    const authData = await authRes.json()
    if (!authData.data || !authData.data.token) {
      console.error('Eskiz auth error:', authData)
      return false
    }

    const token = authData.data.token

    // Format phone number to remove + and spaces
    const formattedPhone = phone.replace(/\D/g, '')

    // 2. Send SMS
    const formData = new URLSearchParams()
    formData.append('mobile_phone', formattedPhone)
    formData.append('message', message)
    formData.append('from', '4546') // Standard Eskiz sender

    const sendRes = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })

    const sendData = await sendRes.json()
    if (sendData.status === 'error') {
      console.error('Eskiz send error:', sendData)
      return false
    }

    return true
  } catch (error) {
    console.error('Eskiz integration error:', error)
    return false
  }
}
