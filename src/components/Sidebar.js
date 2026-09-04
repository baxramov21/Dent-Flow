'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, ClipboardList, BriefcaseMedical, Settings, Clock, History, Sparkles } from 'lucide-react'
import { useClinic } from '@/context/ClinicContext'

export default function Sidebar() {
  const pathname = usePathname()
  const { permissions } = useClinic()

  const mainLinks = [
    { href: '/appointments', label: 'Kalendar', icon: Calendar },
    { href: '/dashboard', label: 'Umumiy ko\'rinish', icon: LayoutDashboard },
    { href: '/queue', label: 'Navbat', icon: Clock },
    { href: '/patients', label: 'Bemorlar', icon: Users },
  ]

  const managementLinks = [
    ...(permissions?.canManageServices ? [{ href: '/services', label: 'Xizmatlar', icon: BriefcaseMedical }] : []),
    { href: '/history', label: 'Tarix', icon: History },
    ...(permissions?.canManageStaff ? [{ href: '/staff', label: 'Xodimlar', icon: ClipboardList }] : []),
  ]

  const otherLinks = [
    ...(permissions?.canManageSettings ? [{ href: '/settings', label: 'Sozlamalar', icon: Settings }] : []),
  ]

  const renderLink = (link) => {
    const Icon = link.icon
    const isActive = link.href === '/dashboard' 
      ? pathname === '/dashboard' 
      : pathname.startsWith(link.href)
      
    return (
      <Link 
        key={link.href} 
        href={link.href}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          borderRadius: '10px',
          backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
          color: isActive ? '#A5B4FC' : 'rgba(255,255,255,0.55)',
          transition: 'all 0.2s ease',
          textDecoration: 'none',
          fontWeight: isActive ? '600' : '400',
          fontSize: '14px',
          letterSpacing: '0.01em',
          position: 'relative',
        }}
      >
        {isActive && (
          <span style={{
            position: 'absolute',
            left: '-24px',
            width: '3px',
            height: '20px',
            borderRadius: '0 4px 4px 0',
            background: 'linear-gradient(180deg, #818CF8, #6366F1)',
          }} />
        )}
        <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
        {link.label}
      </Link>
    )
  }

  return (
    <aside style={{
      width: '250px',
      background: 'linear-gradient(180deg, #0F0F1A 0%, #111827 50%, #0F172A 100%)',
      color: 'var(--text-inverse)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      height: '100vh',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px', paddingLeft: '4px' }}>
        <div style={{
          width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src="/logo-transparent.png" alt="DentFlow Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em', color: '#F8FAFC' }}>DentFlow</h2>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: '500', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Klinika CRM</span>
        </div>
      </div>
      
      {/* Main Nav */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: '14px', marginBottom: '8px', display: 'block' }}>Asosiy</span>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {mainLinks.map(renderLink)}
        </nav>
      </div>

      {/* Management Nav */}
      <div style={{ marginTop: '20px', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: '14px', marginBottom: '8px', display: 'block' }}>Boshqaruv</span>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {managementLinks.map(renderLink)}
        </nav>
      </div>

      {/* Bottom spacer */}
      <div style={{ flex: 1 }} />

      {/* Other Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
        {otherLinks.map(renderLink)}
      </nav>
    </aside>
  )
}
