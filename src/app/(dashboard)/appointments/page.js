'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import { Plus, Clock, Calendar as CalendarIcon, User as UserIcon, Phone, ChevronLeft, ChevronRight, User } from 'lucide-react'
import AppointmentForm from '@/components/AppointmentForm'

export default function AppointmentsPage() {
  const { clinic, isLoading: clinicLoading } = useClinic()
  const supabase = createClient()
  
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dentists, setDentists] = useState([])
  
  // Calendar States
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('day') // 'day' | 'week'
  const [selectedDentist, setSelectedDentist] = useState('all')

  const fetchDentists = async () => {
    if (!clinic) return
    const { data } = await supabase
      .from('staff')
      .select('id, full_name')
      .eq('clinic_id', clinic.id)
      .eq('role', 'dentist')
    if (data) setDentists(data)
  }

  const fetchAppointments = async () => {
    if (!clinic) return
    setLoading(true)
    
    // Calculate date range based on view mode
    const start = new Date(currentDate)
    const end = new Date(currentDate)
    
    if (viewMode === 'day') {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    } else {
      // Week mode (Mon-Sun)
      const day = start.getDay()
      const diff = start.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
      start.setDate(diff)
      start.setHours(0, 0, 0, 0)
      
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (id, full_name, phone),
          staff:dentist_id (id, full_name, specialization)
        `)
        .eq('clinic_id', clinic.id)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true })
        
      if (error) throw error
      setAppointments(data || [])
    } catch (error) {
      console.error('Qabullarni yuklashda xatolik:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (clinicLoading || !clinic) return
    fetchDentists()
    fetchAppointments()
  }, [clinic, clinicLoading, currentDate, viewMode])

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction)
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7))
    }
    setCurrentDate(newDate)
  }

  const STATUS_OPTIONS = [
    { value: 'scheduled', label: 'Waiting' },
    { value: 'in_chair', label: 'In the appointment' },
    { value: 'completed', label: 'Finished' },
    { value: 'cancelled', label: 'Canceled' }
  ];

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);
      
      if (error) throw error;
      
      if (newStatus === 'completed') {
        const appointment = appointments.find(a => a.id === appointmentId)
        if (appointment && appointment.patients?.id) {
          
          let planId = appointment.treatment_plan_id
          
          if (!planId) {
            const { data: plans } = await supabase
              .from('treatment_plans')
              .select('id')
              .eq('patient_id', appointment.patients.id)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
            
            if (plans && plans.length > 0) {
              planId = plans[0].id
              await supabase.from('appointments').update({ treatment_plan_id: planId }).eq('id', appointmentId)
            }
          }

          if (planId) {
            const { data: itemsToComplete } = await supabase
              .from('treatment_items')
              .select('price_override')
              .eq('treatment_plan_id', planId)
              .in('status', ['planned', 'in_progress'])
              
            await supabase
              .from('treatment_items')
              .update({ status: 'completed', completed_at: new Date().toISOString() })
              .eq('treatment_plan_id', planId)
              .in('status', ['planned', 'in_progress'])

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
                    payment_method: 'cash',
                    paid_at: new Date().toISOString(),
                    notes: 'Avtomatik to\'lov (Qabul yakunlanganda)'
                  })
              }
            }
          }
        }
      }

      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      ));
    } catch (error) {
      console.error('Holatni yangilashda xatolik:', error);
      alert('Holatni yangilashda xatolik yuz berdi');
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'scheduled': return { bg: '#EFF6FF', text: '#1E40AF', label: 'Waiting', border: '#BFDBFE' }
      case 'in_chair': return { bg: '#FFF7ED', text: '#C2410C', label: 'In the appointment', border: '#FFEDD5' }
      case 'completed': return { bg: '#F0FDF4', text: '#15803D', label: 'Finished', border: '#BBF7D0' }
      case 'cancelled': return { bg: '#FEF2F2', text: '#B91C1C', label: 'Canceled', border: '#FECACA' }
      default: return { bg: '#F8FAFC', text: '#475569', label: status, border: '#E2E8F0' }
    }
  }

  const formatTime = (isoString) => new Date(isoString).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
  
  const getWeekDays = () => {
    const day = currentDate.getDay()
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(currentDate)
    monday.setDate(diff)
    
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }

  const filteredAppointments = appointments.filter(a => selectedDentist === 'all' || a.dentist_id === selectedDentist)

  const renderDayView = () => {
    const hours = Array.from({ length: 11 }, (_, i) => i + 8) // 8:00 to 18:00
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        {hours.map(hour => {
          const hourApps = filteredAppointments.filter(a => new Date(a.start_time).getHours() === hour)
          return (
            <div key={hour} style={{ display: 'flex', minHeight: '80px', backgroundColor: 'var(--bg-card)' }}>
              <div style={{ width: '80px', padding: '12px', borderRight: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>
                {hour}:00
              </div>
              <div style={{ flex: 1, padding: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {hourApps.map(apt => {
                  const style = getStatusColor(apt.status)
                  return (
                    <div key={apt.id} style={{ 
                      backgroundColor: 'var(--bg-card)', 
                      border: '1px solid var(--border)',
                      borderLeft: `4px solid ${style.text}`,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      padding: '12px', borderRadius: 'var(--radius-sm)', width: '260px',
                      display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                          {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                        </span>
                        <select
                          value={apt.status}
                          onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                          style={{
                            fontSize: '12px', fontWeight: '600', color: style.text, backgroundColor: style.bg,
                            padding: '4px 24px 4px 10px', borderRadius: '16px', border: `1px solid ${style.border}`, appearance: 'none',
                            cursor: 'pointer', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s',
                            backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23${style.text.replace('#', '')}%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '8px auto'
                          }}
                          onMouseOver={(e) => e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'}
                          onMouseOut={(e) => e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)' }}>{apt.patients?.full_name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={12} color="#64748B"/> 
                        </div>
                        {apt.staff?.full_name}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderWeekView = () => {
    const weekDays = getWeekDays()
    const isToday = (date) => {
      const today = new Date()
      return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
    }
    
    return (
      <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflowX: 'auto', backgroundColor: 'var(--bg-card)' }}>
        {weekDays.map((date, i) => {
          const dayApps = filteredAppointments.filter(a => new Date(a.start_time).getDate() === date.getDate())
          const today = isToday(date)
          
          return (
            <div key={i} style={{ flex: 1, minWidth: '150px', borderRight: i < 6 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ 
                padding: '12px', textAlign: 'center', borderBottom: '1px solid var(--border)',
                backgroundColor: today ? '#EFF6FF' : 'transparent',
                color: today ? '#2563EB' : 'var(--text-primary)'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '500', textTransform: 'uppercase' }}>
                  {date.toLocaleDateString('uz-UZ', { weekday: 'short' })}
                </div>
                <div style={{ fontSize: '20px', fontWeight: today ? 'bold' : '500' }}>
                  {date.getDate()}
                </div>
              </div>
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '400px' }}>
                {dayApps.map(apt => {
                  const style = getStatusColor(apt.status)
                  return (
                    <div key={apt.id} style={{ 
                      backgroundColor: 'var(--bg-card)', 
                      border: '1px solid var(--border)',
                      borderLeft: `4px solid ${style.text}`,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      padding: '10px', borderRadius: 'var(--radius-sm)',
                      display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                          {formatTime(apt.start_time)}
                        </span>
                        <select
                          value={apt.status}
                          onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                          style={{
                            fontSize: '10px', fontWeight: '600', color: style.text, backgroundColor: style.bg,
                            padding: '2px 18px 2px 6px', borderRadius: '10px', border: 'none', appearance: 'none',
                            cursor: 'pointer', outline: 'none',
                            backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23${style.text.replace('#', '')}%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', backgroundSize: '8px auto'
                          }}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {apt.patients?.full_name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={10} color="#64748B" /> {apt.staff?.full_name}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (clinicLoading) return <div>Yuklanmoqda...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Kalendar</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Klinika qabullar taqvimi</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--accent)', 
            color: 'white', padding: '10px 16px', borderRadius: 'var(--radius-sm)', fontWeight: '500'
          }}
        >
          <Plus size={18} />
          Yangi qabul
        </button>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Top Row: Date & View Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => navigateDate(-1)} style={{ padding: '8px', backgroundColor: 'var(--bg-hover)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => setCurrentDate(new Date())} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-hover)', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '500', cursor: 'pointer' }}>
                Bugun
              </button>
              <button onClick={() => navigateDate(1)} style={{ padding: '8px', backgroundColor: 'var(--bg-hover)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                <ChevronRight size={20} />
              </button>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', minWidth: '150px' }}>
              {viewMode === 'day' 
                ? currentDate.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })
                : `${getWeekDays()[0].toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })} - ${getWeekDays()[6].toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' })}`
              }
            </h2>
          </div>

          <div style={{ display: 'flex', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', padding: '4px' }}>
            <button 
              onClick={() => setViewMode('day')}
              style={{ padding: '6px 16px', borderRadius: '4px', border: 'none', fontWeight: '500', cursor: 'pointer',
                backgroundColor: viewMode === 'day' ? 'white' : 'transparent',
                boxShadow: viewMode === 'day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Kunlik
            </button>
            <button 
              onClick={() => setViewMode('week')}
              style={{ padding: '6px 16px', borderRadius: '4px', border: 'none', fontWeight: '500', cursor: 'pointer',
                backgroundColor: viewMode === 'week' ? 'white' : 'transparent',
                boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Haftalik
            </button>
          </div>
        </div>

        {/* Bottom Row: Doctor Tabs */}
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
        </div>

        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Yuklanmoqda...</div>
      ) : (
        viewMode === 'day' ? renderDayView() : renderWeekView()
      )}
      
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Yangi qabul</h2>
            <AppointmentForm 
              onSuccess={() => { setIsModalOpen(false); fetchAppointments(); }} 
              onCancel={() => setIsModalOpen(false)} 
            />
          </div>
        </div>
      )}
    </div>
  )
}
