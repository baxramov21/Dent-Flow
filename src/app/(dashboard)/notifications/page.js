'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import { Bell, CheckCircle, XCircle, Clock, Smartphone, MessageCircle } from 'lucide-react'

export default function NotificationsPage() {
  const { clinic, isLoading: clinicLoading } = useClinic()
  const supabase = createClient()
  
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    if (!clinic) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          message,
          status,
          sent_at,
          created_at,
          patients (full_name, phone)
        `)
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false })
        .limit(50)
        
      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      console.error('Xabarnomalarni yuklashda xatolik:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clinicLoading && clinic) {
      fetchNotifications()
    }
  }, [clinic, clinicLoading])

  if (clinicLoading) return <div>Yuklanmoqda...</div>

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#ECFDF5', color: '#10B981', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}><CheckCircle size={14} /> Yuborildi</span>
      case 'failed':
        return <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#FEF2F2', color: '#EF4444', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}><XCircle size={14} /> Xatolik</span>
      default:
        return <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#FFFBEB', color: '#F59E0B', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}><Clock size={14} /> Kutilmoqda</span>
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'telegram':
        return <div style={{ padding: '8px', backgroundColor: '#EFF6FF', color: '#3B82F6', borderRadius: '8px' }}><MessageCircle size={18} /></div>
      case 'eskiz':
      case 'sms':
        return <div style={{ padding: '8px', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '8px' }}><Smartphone size={18} /></div>
      default:
        return <div style={{ padding: '8px', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '8px' }}><Bell size={18} /></div>
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Xabarnomalar tarixi</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Bemorlarga yuborilgan Telegram va SMS eslatmalar</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Turi</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Bemor</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Xabar matni</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Holat</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Vaqt</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center' }}>Yuklanmoqda...</td></tr>
            ) : notifications.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Hech qanday xabarnoma topilmadi</td></tr>
            ) : (
              notifications.map((notif) => (
                <tr key={notif.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getTypeIcon(notif.type)}
                      <span style={{ fontSize: '13px', fontWeight: '500', textTransform: 'capitalize' }}>{notif.type}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: '500' }}>{notif.patients?.full_name || 'Noma\'lum'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{notif.patients?.phone || ''}</div>
                  </td>
                  <td style={{ padding: '16px 24px', maxWidth: '300px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {notif.message}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {getStatusBadge(notif.status)}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {notif.sent_at ? new Date(notif.sent_at).toLocaleString('uz-UZ') : new Date(notif.created_at).toLocaleString('uz-UZ')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
