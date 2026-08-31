'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import { Clock, User, Phone, Play, CheckCircle, CreditCard, XCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function QueuePage() {
  const { clinic, isLoading: clinicLoading } = useClinic()
  const supabase = createClient()
  
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [dentists, setDentists] = useState([])
  const [selectedDentist, setSelectedDentist] = useState('all')

  const fetchQueue = async () => {
    if (!clinic) return
    setLoading(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          status,
          treatment_plan_id,
          patients(full_name, phone, id),
          dentist_id,
          staff(full_name)
        `)
        .eq('clinic_id', clinic.id)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time', { ascending: true })

      if (error) throw error
      setAppointments(data || [])
    } catch (error) {
      console.error('Queue fetching error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDentists = async () => {
    if (!clinic) return
    const { data } = await supabase
      .from('staff')
      .select('id, full_name')
      .eq('clinic_id', clinic.id)
      .eq('role', 'dentist')
    if (data) setDentists(data)
  }

  useEffect(() => {
    if (clinicLoading || !clinic) return
    fetchQueue()
    fetchDentists()

    // Supabase Realtime Subscription
    const channel = supabase
      .channel('appointments-queue')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinic.id}` }, 
        (payload) => {
          // Re-fetch to ensure we get joined patient/staff data correctly
          fetchQueue() 
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clinic, clinicLoading])

  const updateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id)
      
      if (error) throw error

      // Auto-complete associated treatment items and generate payment
      if (newStatus === 'completed') {
        const appointment = appointments.find(a => a.id === id)
        if (appointment) {
          
          let planId = appointment.treatment_plan_id
          
          // If appointment wasn't explicitly linked to a plan, find the patient's active plan
          if (!planId && appointment.patients?.id) {
            const { data: plans } = await supabase
              .from('treatment_plans')
              .select('id')
              .eq('patient_id', appointment.patients.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
            
            if (plans && plans.length > 0) {
              planId = plans[0].id
              // Optionally link it back
              await supabase.from('appointments').update({ treatment_plan_id: planId }).eq('id', id)
            }
          }

          if (planId) {
            // 1. Fetch items that are about to be completed
            const { data: itemsToComplete } = await supabase
              .from('treatment_items')
              .select('price_override')
              .eq('treatment_plan_id', planId)
              .in('status', ['planned', 'in_progress'])
              
            // 2. Complete them
            await supabase
              .from('treatment_items')
              .update({ status: 'completed', completed_at: new Date().toISOString() })
              .eq('treatment_plan_id', planId)
              .in('status', ['planned', 'in_progress'])

            // 3. Generate a payment record automatically
            if (itemsToComplete && itemsToComplete.length > 0) {
              const totalAmount = itemsToComplete.reduce((acc, item) => acc + (item.price_override || 0), 0)
              if (totalAmount > 0) {
                await supabase
                  .from('payments')
                  .insert({
                    clinic_id: clinic.id,
                    patient_id: appointment.patients.id,
                    treatment_plan_id: planId,
                    amount: totalAmount,
                    payment_method: 'cash', // Default to cash for quick checkout
                    paid_at: new Date().toISOString(),
                    notes: 'Avtomatik to\'lov (Qabul yakunlanganda)'
                  })
              }
            }
          }
        }
      }

      // Optimistic update
      setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, status: newStatus } : apt))
    } catch (err) {
      console.error("Xatolik yuz berdi:", err)
      alert("Holatni o'zgartirishda xatolik yuz berdi.")
    }
  }

  // Filter and compute stats
  const filteredAppointments = appointments.filter(apt => selectedDentist === 'all' || apt.dentist_id === selectedDentist)
  
  const stats = {
    waiting: filteredAppointments.filter(a => a.status === 'scheduled' || a.status === 'arrived').length,
    inChair: filteredAppointments.filter(a => a.status === 'in_chair').length,
    completed: filteredAppointments.filter(a => a.status === 'completed' || a.status === 'billing').length,
    total: filteredAppointments.length
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled': return { label: 'Kutmoqda', bg: '#F3F4F6', color: '#4B5563' }
      case 'arrived': return { label: 'Keldi', bg: '#DBEAFE', color: '#1E40AF' }
      case 'in_chair': return { label: 'Qabulda', bg: '#FEF3C7', color: '#D97706' }
      case 'billing': return { label: 'To\'lovda', bg: '#E0E7FF', color: '#4338CA' }
      case 'completed': return { label: 'Yakunlandi', bg: '#D1FAE5', color: '#065F46' }
      case 'cancelled': return { label: 'Bekor qilindi', bg: '#FEE2E2', color: '#991B1B' }
      default: return { label: status, bg: '#F3F4F6', color: '#4B5563' }
    }
  }

  if (clinicLoading) return <div>Yuklanmoqda...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock color="var(--accent)" /> Bugungi navbat (Real-vaqt)
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Bugungi barcha bemorlar va ularning joriy holati</p>
        </div>
        
        <div>
          <select 
            value={selectedDentist}
            onChange={(e) => setSelectedDentist(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}
          >
            <option value="all">Barcha shifokorlar</option>
            {dentists.map(d => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Jami qabullar</h4>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total}</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Kutish xonasida</h4>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E40AF' }}>{stats.waiting}</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Hozir qabulda</h4>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#D97706' }}>{stats.inChair}</p>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Yakunlandi</h4>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#065F46' }}>{stats.completed}</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 24px', fontWeight: '600' }}>Vaqt</th>
              <th style={{ padding: '12px 24px', fontWeight: '600' }}>Bemor</th>
              <th style={{ padding: '12px 24px', fontWeight: '600' }}>Shifokor</th>
              <th style={{ padding: '12px 24px', fontWeight: '600' }}>Holat</th>
              <th style={{ padding: '12px 24px', fontWeight: '600', textAlign: 'right' }}>Tezkor harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td></tr>
            ) : filteredAppointments.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Bugun uchun qabullar yo'q</td></tr>
            ) : (
              filteredAppointments.map((apt) => {
                const badge = getStatusBadge(apt.status)
                return (
                  <tr key={apt.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', backgroundColor: apt.status === 'in_chair' ? '#FFFBEB' : 'transparent' }}>
                    <td style={{ padding: '16px 24px', fontWeight: '600', fontSize: '15px' }}>
                      {new Date(apt.start_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                          <User size={18} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <Link href={`/patients/${apt.patients?.id}`} style={{ fontWeight: '500', color: 'var(--text-primary)', textDecoration: 'none' }}>
                            {apt.patients?.full_name}
                          </Link>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Phone size={10} /> {apt.patients?.phone}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {apt.staff?.full_name}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                        backgroundColor: badge.bg, color: badge.color
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {apt.status === 'scheduled' && (
                          <button onClick={() => updateStatus(apt.id, 'arrived')} title="Keldi" style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#DBEAFE', color: '#1E40AF', border: 'none', cursor: 'pointer' }}>
                            <ArrowRight size={18} />
                          </button>
                        )}
                        {(apt.status === 'scheduled' || apt.status === 'arrived') && (
                          <button onClick={() => updateStatus(apt.id, 'in_chair')} title="Qabulni boshlash" style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#FEF3C7', color: '#D97706', border: 'none', cursor: 'pointer' }}>
                            <Play size={18} />
                          </button>
                        )}
                        {apt.status === 'in_chair' && (
                          <button onClick={() => updateStatus(apt.id, 'billing')} title="To'lovga yuborish" style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#E0E7FF', color: '#4338CA', border: 'none', cursor: 'pointer' }}>
                            <CreditCard size={18} />
                          </button>
                        )}
                        {apt.status === 'billing' && (
                          <button onClick={() => updateStatus(apt.id, 'completed')} title="Yakunlash" style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#065F46', border: 'none', cursor: 'pointer' }}>
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {(apt.status === 'scheduled' || apt.status === 'arrived') && (
                          <button onClick={() => updateStatus(apt.id, 'cancelled')} title="Bekor qilish" style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#991B1B', border: 'none', cursor: 'pointer' }}>
                            <XCircle size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
