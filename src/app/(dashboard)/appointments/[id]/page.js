'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, User, Phone, MapPin, Calendar, CreditCard } from 'lucide-react'
import AppointmentForm from '@/components/AppointmentForm'
import CheckoutView from '@/components/CheckoutView'
import Link from 'next/link'

export default function AppointmentManagerPage({ params }) {
  const router = useRouter()
  const supabase = createClient()
  const { id } = use(params) // Next.js 15 recommendation for params
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'checkout'

  const fetchAppointment = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (id, full_name, phone, address),
          staff:dentist_id (id, full_name)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setAppointment(data)
    } catch (error) {
      console.error('Error fetching appointment:', error)
      alert('Qabul ma`lumotlarini yuklashda xatolik yuz berdi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointment()
  }, [id])

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Yuklanmoqda...</div>
  }

  if (!appointment) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Qabul topilmadi</h2>
        <button onClick={() => router.back()} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
          Ortga qaytish
        </button>
      </div>
    )
  }

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (iso) => new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled': return { bg: '#EFF6FF', color: '#1E40AF', label: 'Kutmoqda' }
      case 'in_chair': return { bg: '#FFF7ED', color: '#C2410C', label: 'Qabulda' }
      case 'completed': return { bg: '#F0FDF4', color: '#15803D', label: 'Yakunlandi' }
      case 'cancelled': return { bg: '#FEF2F2', color: '#B91C1C', label: 'Bekor qilindi' }
      default: return { label: status, bg: '#F3F4F6', color: '#4B5563' }
    }
  }

  const badge = getStatusBadge(appointment.status)

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Button */}
      <button 
        onClick={() => router.back()} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '24px', fontSize: '14px', fontWeight: '500' }}
      >
        <ArrowLeft size={18} /> Ortga qaytish
      </button>

      {/* Main Card */}
      <div className="card" style={{ width: '100%', backgroundColor: 'var(--bg-page)', display: 'flex', flexDirection: 'column', padding: 0 }}>
        
        {/* Header section similar to Patient Profile */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderBottom: '1px solid var(--border)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <User size={28} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Link href={`/patients/${appointment.patients?.id}`} style={{ textDecoration: 'none' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                    {appointment.patients?.full_name}
                  </h2>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={14} /> {appointment.patients?.phone || 'Kiritilmagan'}
                  </span>
                  {appointment.patients?.address && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} /> {appointment.patients.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
            <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', backgroundColor: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
              {formatDate(appointment.start_time)} • {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
               <User size={14} /> {appointment.staff?.full_name}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: 'white', padding: '0 24px' }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              padding: '16px 24px', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              border: 'none', borderBottom: activeTab === 'details' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'details' ? 'var(--accent)' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
            }}
          >
            <Calendar size={16} /> Qabul ma'lumotlari
          </button>
          <button
            onClick={() => setActiveTab('checkout')}
            style={{
              padding: '16px 24px', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              border: 'none', borderBottom: activeTab === 'checkout' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'checkout' ? 'var(--accent)' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
            }}
          >
            <CreditCard size={16} /> Muolajalar va To'lov
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, backgroundColor: 'var(--bg-page)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
          {activeTab === 'details' && (
            <div style={{ padding: '24px', backgroundColor: 'white', margin: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <AppointmentForm 
                initialData={appointment}
                onSuccess={() => router.back()} 
                onCancel={() => router.back()} 
              />
            </div>
          )}
          {activeTab === 'checkout' && (
            <CheckoutView 
              appointment={appointment}
              onSuccess={() => router.back()}
              onClose={() => router.back()}
            />
          )}
        </div>
      </div>
    </div>
  )
}
