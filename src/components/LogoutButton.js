'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton({ variant = 'icon' }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (variant === 'text') {
    return (
      <button 
        onClick={handleLogout}
        style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}
      >
        <LogOut size={16} />
        Log out
      </button>
    )
  }

  return (
    <button 
      onClick={handleLogout}
      title="Log out"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', padding: '8px', borderRadius: 'var(--radius-sm)' }}
    >
      <LogOut size={20} />
    </button>
  )
}
