'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(email, password) {
  const supabase = await createClient()

  let authRes = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // Fallback for case-insensitive password
  if (authRes.error && authRes.error.message.includes('Invalid login credentials')) {
    const variations = [
      password.toLowerCase(),
      password.charAt(0).toUpperCase() + password.slice(1).toLowerCase(),
      password.toUpperCase()
    ]

    for (const variant of variations) {
      if (variant === password) continue
      
      const retryRes = await supabase.auth.signInWithPassword({
        email,
        password: variant,
      })

      if (!retryRes.error) {
        authRes = retryRes
        break
      }
    }
  }

  if (authRes.error) {
    return { error: authRes.error.message }
  }

  redirect('/dashboard')
}
