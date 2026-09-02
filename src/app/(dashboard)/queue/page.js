'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import { Clock, User, Phone, Play, CheckCircle, CreditCard, XCircle, ArrowRight, Edit } from 'lucide-react'
import Link from 'next/link'
import AppointmentForm from '@/components/AppointmentForm'
import CheckoutModal from '@/components/CheckoutModal'

export default function QueuePage() {
  const { clinic, isLoading: clinicLoading } = useClinic()
  const supabase = createClient()
  
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [dentists, setDentists] = useState([])
  const [selectedDentist, setSelectedDentist] = useState('all')
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [checkoutAppointment, setCheckoutAppointment] = useState(null)

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
    waiting: filteredAppointments.filter(a => a.status === 'scheduled').length,
    inChair: filteredAppointments.filter(a => a.status === 'in_chair').length,
    completed: filteredAppointments.filter(a => a.status === 'completed').length,
    total: filteredAppointments.length
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled': return { bg: '#EFF6FF', color: '#1E40AF', label: 'Waiting' }
      case 'in_chair': return { bg: '#FFF7ED', color: '#C2410C', label: 'In the appointment' }
      case 'completed': return { bg: '#F0FDF4', color: '#15803D', label: 'Finished' }
      case 'cancelled': return { bg: '#FEF2F2', color: '#B91C1C', label: 'Canceled' }
      default: return { label: status, bg: '#F3F4F6', color: '#4B5563' }
    }
  }

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'paid': return { label: 'To\'landi', bg: '#D1FAE5', color: '#065F46' }
      case 'partially_paid': return { label: 'Qisman to\'landi', bg: '#FEF3C7', color: '#D97706' }
      case 'unpaid': return { label: 'Bir qismini keyinroq to\'lash', bg: '#FEE2E2', color: '#991B1B' }
      default: return null
    }
  }

  if (clinicLoading) return <div>Yuklanmoqda...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock color="var(--accent)" /> Bugungi navbat (Real-vaqt)
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Bugungi barcha bemorlar va ularning joriy holati</p>
        </div>
      </div>
        
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', width: '100%', scrollbarWidth: 'none' }}>
        <button
          onClick={() => setSelectedDentist('all')}
          style={{
            padding: '8px 16px', borderRadius: '20px', border: '1px solid', whiteSpace: 'nowrap', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s',
            backgroundColor: selectedDentist === 'all' ? 'var(--accent)' : 'var(--bg-card)',
            color: selectedDentist === 'all' ? 'white' : 'var(--text-secondary)',
            borderColor: selectedDentist === 'all' ? 'var(--accent)' : 'var(--border)'
          }}
        >
          Barchasi
        </button>
        {dentists.map(d => (
          <button
            key={d.id}
            onClick={() => setSelectedDentist(d.id)}
            style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid', whiteSpace: 'nowrap', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s',
              backgroundColor: selectedDentist === d.id ? 'var(--accent)' : 'var(--bg-card)',
              color: selectedDentist === d.id ? 'white' : 'var(--text-secondary)',
              borderColor: selectedDentist === d.id ? 'var(--accent)' : 'var(--border)'
            }}
          >
            {d.full_name}
          </button>
        ))}
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
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
                const payBadge = getPaymentBadge(apt.payment_status)
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ 
                          padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                          backgroundColor: badge.bg, color: badge.color
                        }}>
                          {badge.label}
                        </span>
                        {payBadge && (
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                            backgroundColor: payBadge.bg, color: payBadge.color
                          }}>
                            {payBadge.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={() => setEditingAppointment(apt)} title="Tahrirlash" style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'all 0.2s' }}>
                          <Edit size={18} />
                        </button>
                        {apt.status === 'scheduled' && (
                          <button onClick={() => updateStatus(apt.id, 'in_chair')} title="Qabulni boshlash" style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#FFF7ED', color: '#C2410C', border: '1px solid #FFEDD5', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <Play size={18} />
                          </button>
                        )}
                        {apt.status === 'in_chair' && (
                          <button onClick={() => setCheckoutAppointment(apt)} title="To'lov va Yakunlash" style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <CreditCard size={18} />
                          </button>
                        )}
                        {(apt.status === 'scheduled' || apt.status === 'in_chair') && (
                          <button onClick={() => updateStatus(apt.id, 'cancelled')} title="Bekor qilish" style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', cursor: 'pointer', transition: 'all 0.2s' }}>
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

      {editingAppointment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--bg-card)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Qabulni tahrirlash</h2>
            <AppointmentForm 
              initialData={editingAppointment}
              onSuccess={() => { setEditingAppointment(null); fetchQueue(); }} 
              onCancel={() => setEditingAppointment(null)} 
            />
          </div>
        </div>
      )}

      {checkoutAppointment && (
        <CheckoutModal 
          appointment={checkoutAppointment} 
          onClose={() => setCheckoutAppointment(null)} 
          onSuccess={() => { setCheckoutAppointment(null); fetchQueue(); }} 
        />
      )}
    </div>
  )
}
