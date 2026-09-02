'use client'

import { useClinic } from '@/context/ClinicContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ShieldAlert } from 'lucide-react'

export default function RoleGuard({ children, allowed = [] }) {
  const { staffProfile, isLoading } = useClinic()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && staffProfile) {
      if (!allowed.includes(staffProfile.role)) {
        router.replace('/') // Redirect unauthorized users to dashboard
      }
    }
  }, [isLoading, staffProfile, allowed, router])

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>Yuklanmoqda...</div>
  }

  if (!staffProfile || !allowed.includes(staffProfile.role)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: 'var(--text-secondary)' }}>
        <ShieldAlert size={48} color="var(--danger)" />
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>Ruxsat yo'q</h2>
        <p>Sizda bu sahifani ko'rish uchun yetarli huquq mavjud emas.</p>
      </div>
    )
  }

  return children
}
