'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formattedEmail = `${username}@dentflow.uz`

    const { error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="card" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>DentFlow</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Sign in to your clinic</p>
      </div>

      {error && (
        <div style={{ padding: '12px', backgroundColor: 'var(--danger)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="username" style={{ fontSize: '14px', fontWeight: '500' }}>Login</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="shifo_admin"
            required
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="password" style={{ fontSize: '14px', fontWeight: '500' }}>Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px',
            backgroundColor: 'var(--accent)',
            color: 'white',
            borderRadius: 'var(--radius-sm)',
            fontWeight: '500',
            marginTop: '8px',
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
