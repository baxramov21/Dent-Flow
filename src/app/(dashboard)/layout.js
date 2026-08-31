import { ClinicProvider } from '@/context/ClinicContext'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClinicCheck from '@/components/ClinicCheck'
import LogoutButton from '@/components/LogoutButton'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <ClinicProvider>
      <div style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
        <Sidebar />

        {/* Main Content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header */}
          <header style={{
            height: '64px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 32px',
            justifyContent: 'flex-end',
            backdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 14px',
                borderRadius: '999px',
                backgroundColor: 'var(--bg-hover)',
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: '28px', height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366F1, #818CF8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '700',
                }}>
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{user.email}</span>
              </div>
              <LogoutButton variant="icon" />
            </div>
          </header>

          {/* Page Content */}
          <div style={{ padding: '28px 32px', flex: 1 }}>
            <ClinicCheck>{children}</ClinicCheck>
          </div>
        </main>
      </div>
    </ClinicProvider>
  )
}

