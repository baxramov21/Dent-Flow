'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, User, Phone, Lock, Sparkles } from 'lucide-react'
import { registerClinic } from '@/app/actions/register'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    clinicName: '',
    adminName: '',
    phone: '+998',
    password: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const res = await registerClinic(formData)
      if (res.error) {
        throw new Error(res.error)
      }
      
      router.push('/login?registered=true')
    } catch (error) {
      setErrorMsg(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366F1, #818CF8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', marginBottom: '16px'
        }}>
          <Sparkles size={24} />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Ro'yxatdan o'tish</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center' }}>
          Yangi klinika ochish uchun ma'lumotlarni kiriting
        </p>
      </div>

      {errorMsg && (
        <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Klinika nomi</label>
          <div style={{ position: 'relative' }}>
            <Building2 size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              required
              value={formData.clinicName}
              onChange={e => setFormData({...formData, clinicName: e.target.value})}
              style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-page)', outline: 'none', color: 'var(--text-primary)' }}
              placeholder="Masalan: DentFlow Clinic"
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Ismingiz (Rahbar)</label>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              required
              value={formData.adminName}
              onChange={e => setFormData({...formData, adminName: e.target.value})}
              style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-page)', outline: 'none', color: 'var(--text-primary)' }}
              placeholder="Ism Familiya"
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Telefon raqam (Login)</label>
          <div style={{ position: 'relative' }}>
            <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              required
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-page)', outline: 'none', color: 'var(--text-primary)' }}
              placeholder="+998"
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Parol</label>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="password" 
              required
              minLength={6}
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-page)', outline: 'none', color: 'var(--text-primary)' }}
              placeholder="Kamida 6ta belgi"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            marginTop: '10px',
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--accent)',
            color: 'white',
            fontWeight: '600',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'Yaratilmoqda...' : 'Ro\'yxatdan o\'tish'}
        </button>
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
        Klinikangiz bormi?{' '}
        <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}>
          Tizimga kiring
        </Link>
      </div>

    </div>
  )
}
