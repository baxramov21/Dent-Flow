'use client'

import { useState } from 'react'
import { X, User, Phone, MapPin, Calendar, CreditCard, ChevronRight } from 'lucide-react'
import AppointmentForm from './AppointmentForm'
import CheckoutView from './CheckoutView'

export default function AppointmentManagerModal({ appointment, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'checkout'

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

  const badge = getStatusBadge(appointment?.status)

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--bg-page)', display: 'flex', flexDirection: 'column', padding: 0 }}>
        
        {/* Header section similar to Patient Profile */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderBottom: '1px solid var(--border)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <User size={28} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                  {appointment?.patients?.full_name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={14} /> {appointment?.patients?.phone || 'Kiritilmagan'}
                  </span>
                  {appointment?.patients?.address && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} /> {appointment.patients.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--text-secondary)' }}>
              <X size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
            <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', backgroundColor: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
              {formatDate(appointment?.start_time)} • {formatTime(appointment?.start_time)} - {formatTime(appointment?.end_time)}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
               <User size={14} /> {appointment?.staff?.full_name}
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
                onSuccess={onSuccess} 
                onCancel={onClose} 
              />
            </div>
          )}
          {activeTab === 'checkout' && (
            <CheckoutView 
              appointment={appointment}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}
