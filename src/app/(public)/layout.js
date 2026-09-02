import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export const metadata = {
  title: 'DentFlow - Stomatologiya CRM',
  description: 'Stomatologiya klinikalari uchun to\'liq boshqaruv tizimi',
}

export default function PublicLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }}>
      {/* Navbar */}
      <header style={{ 
        padding: '16px 40px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366F1, #818CF8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <Sparkles size={24} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            DentFlow
          </span>
        </div>
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500' }}>
            Tizimga kirish
          </Link>
          <Link href="/register" style={{ 
            backgroundColor: 'var(--accent)', color: 'white', padding: '10px 20px', 
            borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = 'var(--accent-hover)'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'var(--accent)'}>
            Ro'yxatdan o'tish
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
