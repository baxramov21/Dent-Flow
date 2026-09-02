import Link from 'next/link'
import { Calendar, Users, Clock, History, BriefcaseMedical, ClipboardList, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const features = [
    { icon: Calendar, title: 'Qulay Kalendar', desc: 'Bemorlarni yozish va navbatni boshqarish juda oson.' },
    { icon: Users, title: 'Bemorlar Bazasi', desc: 'Barcha bemorlar tarixi va tibbiy kartalari bir joyda.' },
    { icon: Clock, title: 'Navbatni Boshqarish', desc: 'Jonli navbat tizimi orqali kutish vaqtini kamaytiring.' },
    { icon: History, title: 'Tarix va Moliya', desc: 'Tushumlar, qarzdorlik va barcha to\'lovlarni kuzating.' },
    { icon: BriefcaseMedical, title: 'Xizmatlar', desc: 'Klinika xizmatlari va narxlarni qulay boshqarish.' },
    { icon: ClipboardList, title: 'Xodimlar', desc: 'Shifokorlar va adminlar uchun rollar.' },
  ]

  return (
    <div style={{ padding: '60px 40px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '80px', alignItems: 'center' }}>
      
      {/* Hero Section */}
      <div style={{ textAlign: 'center', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '800', lineHeight: '1.2', color: 'var(--text-primary)' }}>
          Stomatologiya uchun mukammal boshqaruv tizimi
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          DentFlow orqali klinikangiz ishini avtomatlashtiring. Bemorlar, kalendar, moliya va xodimlar – barchasi bitta qulay platformada.
        </p>
        <Link href="/register" style={{
          marginTop: '16px',
          backgroundColor: 'var(--accent)',
          color: 'white',
          padding: '16px 32px',
          borderRadius: 'var(--radius-lg)',
          fontSize: '18px',
          fontWeight: '600',
          textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
          transition: 'all 0.2s ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          Bepul boshlash
          <CheckCircle2 size={20} />
        </Link>
      </div>

      {/* Features Grid */}
      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {features.map((feat, idx) => {
          const Icon = feat.icon
          return (
            <div key={idx} className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '12px', 
                backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={24} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>{feat.title}</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>{feat.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <footer style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: '40px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
        <p>&copy; 2026 DentFlow. Barcha huquqlar himoyalangan.</p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Email: info@dentflow.uz</span>
          <span>Telefon: +998 90 123 45 67</span>
        </div>
      </footer>

    </div>
  )
}
