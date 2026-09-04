'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import { History, CreditCard, Search, Calendar, User, FileText, Download, Filter } from 'lucide-react'
import AppleSelect from '@/components/AppleSelect'
import AppleDateRange from '@/components/AppleDateRange'

const DATE_PRESETS = [
  { value: 'all_time', label: 'Barcha vaqt' },
  { value: 'today', label: 'Bugun' },
  { value: 'this_week', label: 'Shu hafta' },
  { value: 'this_month', label: 'Shu oy' },
  { value: 'this_year', label: 'Shu yil' },
  { value: 'custom', label: 'Maxsus oraliq' }
]

export default function HistoryPage() {
  const { clinic, isLoading: clinicLoading, isAdmin, permissions, staffProfile } = useClinic()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState('procedures') // 'procedures' | 'payments' | 'debts'
  const [loading, setLoading] = useState(true)
  
  // Data
  const [procedures, setProcedures] = useState([])
  const [payments, setPayments] = useState([])
  
  const [searchQuery, setSearchQuery] = useState('')

  // Debt Payment Modal State
  const [payDebtModal, setPayDebtModal] = useState({ isOpen: false, patient: null, maxAmount: 0 })
  const [debtAmount, setDebtAmount] = useState('')
  const [debtMethod, setDebtMethod] = useState('cash')
  const [isPaying, setIsPaying] = useState(false)

  // Filters
  const [datePreset, setDatePreset] = useState('all_time')
  const [customStart, setCustomStart] = useState(null)
  const [customEnd, setCustomEnd] = useState(null)
  const [selectedDentist, setSelectedDentist] = useState('all')
  const [dentists, setDentists] = useState([])

  const fetchDentists = async () => {
    if (!clinic) return
    const { data } = await supabase
      .from('staff')
      .select('id, full_name')
      .eq('clinic_id', clinic.id)
      .eq('role', 'dentist')
    if (data) setDentists(data)
  }

  const getDateRange = () => {
    const now = new Date()
    let start, end

    if (datePreset === 'today') {
      start = new Date(now.setHours(0, 0, 0, 0))
      end = new Date(start)
      end.setDate(start.getDate() + 1)
    } else if (datePreset === 'this_week') {
      start = new Date(now.setDate(now.getDate() - now.getDay() + 1))
      start.setHours(0, 0, 0, 0)
      end = new Date(start)
      end.setDate(start.getDate() + 7)
    } else if (datePreset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    } else if (datePreset === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear() + 1, 0, 1)
    } else if (datePreset === 'custom') {
      if (!customStart || !customEnd) return null
      start = new Date(customStart)
      end = new Date(customEnd)
      end.setDate(end.getDate() + 1) // include end day fully
    } else {
      return null // all_time
    }

    return { start: start.toISOString(), end: end.toISOString() }
  }

  const fetchData = async () => {
    if (!clinic) return
    setLoading(true)
    try {
      // 1. Fetch Completed Procedures
      let procQuery = supabase
        .from('treatment_items')
        .select(`
          id,
          tooth_number,
          price_override,
          completed_at,
          services(name_uz, name),
          treatment_plans!inner(
            id,
            dentist_id,
            patients(id, full_name, phone),
            staff(id, full_name)
          )
        `)
        .eq('clinic_id', clinic.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (staffProfile?.role === 'dentist') {
        procQuery = procQuery.eq('treatment_plans.dentist_id', staffProfile.id)
      }

      const range = getDateRange()
      if (range) {
        procQuery = procQuery.gte('completed_at', range.start).lt('completed_at', range.end)
      }

      if (selectedDentist !== 'all') {
        procQuery = procQuery.eq('treatment_plans.dentist_id', selectedDentist)
      }

      const { data: procData, error: procError } = await procQuery
      if (procError) throw procError
      setProcedures(procData || [])

      if (permissions?.canViewFinancials) {
        let payQuery = supabase
          .from('payments')
          .select(`
            id,
            amount,
            payment_method,
            notes,
            paid_at,
            patients(id, full_name),
            treatment_plans!inner(id, title, dentist_id)
          `)
          .eq('clinic_id', clinic.id)
          .order('paid_at', { ascending: false })

        if (range) {
          payQuery = payQuery.gte('paid_at', range.start).lt('paid_at', range.end)
        }

        if (selectedDentist !== 'all') {
          payQuery = payQuery.eq('treatment_plans.dentist_id', selectedDentist)
        }

        const { data: payData, error: payError } = await payQuery
        if (payError) throw payError
        setPayments(payData || [])
      } else {
        setPayments([])
      }

    } catch (error) {
      console.error('Tarixni yuklashda xatolik:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clinicLoading && clinic) {
      fetchDentists()
      fetchData()
    }
  }, [clinic, clinicLoading, datePreset, customStart, customEnd, selectedDentist])

  const handlePayDebt = async (e) => {
    e.preventDefault()
    if (!payDebtModal.patient || !debtAmount || Number(debtAmount) <= 0) return
    
    setIsPaying(true)
    try {
      const { error } = await supabase.from('payments').insert({
        clinic_id: clinic.id,
        patient_id: payDebtModal.patient.id,
        amount: Number(debtAmount),
        payment_method: debtMethod,
        notes: "Qarz to'lovi"
      })

      if (error) throw error

      setPayDebtModal({ isOpen: false, patient: null, maxAmount: 0 })
      setDebtAmount('')
      setDebtMethod('cash')
      fetchData() // Refresh data
    } catch (error) {
      console.error("Qarz to'lovida xatolik:", error)
      alert("Xatolik yuz berdi: " + error.message)
    } finally {
      setIsPaying(false)
    }
  }

  const filteredProcedures = procedures.filter(p => {
    const q = searchQuery.toLowerCase()
    const patientName = p.treatment_plans?.patients?.full_name?.toLowerCase() || ''
    const serviceName = (p.services?.name_uz || p.services?.name || '').toLowerCase()
    return patientName.includes(q) || serviceName.includes(q)
  })

  const filteredPayments = payments.filter(p => {
    const q = searchQuery.toLowerCase()
    const patientName = p.patients?.full_name?.toLowerCase() || ''
    const planName = p.treatment_plans?.title?.toLowerCase() || ''
    return patientName.includes(q) || planName.includes(q)
  })

  // Calculate Debts
  const patientDebts = {}
  
  procedures.forEach(p => {
    const patientId = p.treatment_plans?.patients?.id
    if (!patientId) return
    if (!patientDebts[patientId]) {
      patientDebts[patientId] = {
        patient: p.treatment_plans.patients,
        totalBilled: 0,
        totalPaid: 0,
        debt: 0
      }
    }
    patientDebts[patientId].totalBilled += (p.price_override || 0)
  })

  payments.forEach(p => {
    const patientId = p.patients?.id
    if (!patientId) return
    if (!patientDebts[patientId]) {
      patientDebts[patientId] = {
        patient: p.patients,
        totalBilled: 0,
        totalPaid: 0,
        debt: 0
      }
    }
    patientDebts[patientId].totalPaid += (p.amount || 0)
  })

  const debtors = Object.values(patientDebts)
    .map(d => ({ ...d, debt: d.totalBilled - d.totalPaid }))
    .filter(d => d.debt > 0)
    .sort((a, b) => b.debt - a.debt)

  const filteredDebtors = debtors.filter(d => {
    const q = searchQuery.toLowerCase()
    return d.patient?.full_name?.toLowerCase().includes(q) || d.patient?.phone?.includes(q)
  })

  // KPIs
  const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0)
  const totalProcedures = procedures.length
  const avgCheck = totalProcedures > 0 ? (totalRevenue / totalProcedures) : 0
  const totalDebt = debtors.reduce((acc, d) => acc + d.debt, 0)

  if (clinicLoading) return <div>Yuklanmoqda...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Tarix & Hisobotlar</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Bajarilgan barcha muolajalar va qabul qilingan to'lovlar</p>
        </div>
        
        {/* Tab Toggle */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <button 
            onClick={() => setActiveTab('procedures')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '4px', border: 'none', fontWeight: '500', cursor: 'pointer',
              backgroundColor: activeTab === 'procedures' ? 'var(--bg-hover)' : 'transparent',
              color: activeTab === 'procedures' ? 'var(--accent)' : 'var(--text-secondary)'
            }}
          >
            <FileText size={18} />
            Muolajalar
          </button>
          
          {permissions?.canViewFinancials && (
            <>
              <button 
                onClick={() => setActiveTab('payments')}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '4px', border: 'none', fontWeight: '500', cursor: 'pointer',
                  backgroundColor: activeTab === 'payments' ? 'var(--bg-hover)' : 'transparent',
                  color: activeTab === 'payments' ? 'var(--accent)' : 'var(--text-secondary)'
                }}
              >
                <CreditCard size={18} />
                To'lovlar
              </button>
              <button 
                onClick={() => setActiveTab('debts')}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '4px', border: 'none', fontWeight: '500', cursor: 'pointer',
                  backgroundColor: activeTab === 'debts' ? 'var(--bg-hover)' : 'transparent',
                  color: activeTab === 'debts' ? '#EF4444' : 'var(--text-secondary)'
                }}
              >
                <User size={18} />
                Qarzdorlik
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left Sidebar: Filters & Calendar */}
        <div style={{ 
          width: '340px', 
          display: 'flex', flexDirection: 'column', gap: '24px',
          flexShrink: 0
        }}>
          <div className="card" style={{ 
            padding: '24px', 
            display: 'flex', flexDirection: 'column', gap: '24px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--accent)',
            boxShadow: '0 4px 24px rgba(99, 102, 241, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontWeight: '600' }}>
              <Filter size={18} /> <span style={{ fontSize: '16px' }}>Filtrlar</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Vaqt oralig'i</label>
                <AppleSelect 
                  value={datePreset}
                  onChange={setDatePreset}
                  options={DATE_PRESETS}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>Shifokor</label>
                <AppleSelect 
                  value={selectedDentist}
                  onChange={setSelectedDentist}
                  options={[
                    { value: 'all', label: 'Barcha shifokorlar' },
                    ...dentists.map(d => ({ value: d.id, label: `Dr. ${d.full_name}` }))
                  ]}
                />
              </div>
            </div>

            {datePreset === 'custom' && (
              <div style={{ 
                animation: 'fadeIn 0.3s ease',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)'
              }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '500' }}>Kalendardan tanlang</label>
                <div className="apple-datepicker-container">
                  <AppleDateRange 
                    startDate={customStart}
                    endDate={customEnd}
                    onChange={({ start, end }) => {
                      setCustomStart(start)
                      setCustomEnd(end)
                    }}
                    inline={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', minWidth: '0' }}>
          
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: permissions?.canViewFinancials ? 'repeat(4, 1fr)' : 'repeat(1, 1fr)', gap: '24px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Jami muolajalar</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{totalProcedures}</p>
            </div>
            
            {permissions?.canViewFinancials && (
              <>
                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Jami tushum</h3>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px', color: '#10B981' }}>{totalRevenue.toLocaleString()} UZS</p>
                </div>
                <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>O'rtacha chek</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px', color: '#3B82F6' }}>{Math.round(avgCheck).toLocaleString()} UZS</p>
            </div>
            <div 
              className="card" 
              onClick={() => setActiveTab('debts')}
              style={{ padding: '20px', borderLeft: '4px solid #EF4444', cursor: 'pointer', transition: 'background-color 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
            >
              <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Jami Qarzdorlik</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px', color: '#EF4444' }}>{totalDebt.toLocaleString()} UZS</p>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Toolbar */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Bemor yoki xizmat nomini qidiring..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}
            />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: '500', cursor: 'pointer' }}>
            <Download size={18} /> CSV Yuklash
          </button>
        </div>

        {/* Procedures Table */}
        {activeTab === 'procedures' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Sana</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Bemor</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Muolaja</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Shifokor</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Narxi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td></tr>
              ) : filteredProcedures.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Muolajalar topilmadi</td></tr>
              ) : (
                filteredProcedures.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} />
                        {p.completed_at ? new Date(p.completed_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{p.treatment_plans?.patients?.full_name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.treatment_plans?.patients?.phone}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: '500' }}>{p.services?.name_uz || p.services?.name}</span>
                        {p.tooth_number && (
                          <span style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: 'var(--bg-hover)', borderRadius: '4px', width: 'fit-content' }}>
                            Tish: {p.tooth_number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} />
                        {p.treatment_plans?.staff?.full_name}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: '600' }}>
                      {(p.price_override || 0).toLocaleString()} UZS
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Payments Table */}
        {activeTab === 'payments' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Sana</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Bemor</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Davolash rejasi</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>To'lov turi</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Summa</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>To'lovlar topilmadi</td></tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} />
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>
                      {p.patients?.full_name}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      {p.treatment_plans?.title || '—'}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                        backgroundColor: p.payment_method === 'cash' ? '#FEF3C7' : (p.payment_method === 'card' ? '#DBEAFE' : '#E0E7FF'),
                        color: p.payment_method === 'cash' ? '#D97706' : (p.payment_method === 'card' ? '#1E40AF' : '#4338CA')
                      }}>
                        {p.payment_method === 'cash' ? 'Naqd' : (p.payment_method === 'card' ? 'Karta' : 'O\'tkazma')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: '600', color: '#10B981' }}>
                      +{p.amount?.toLocaleString()} UZS
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Debts Table */}
        {activeTab === 'debts' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Bemor</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Jami hisoblangan</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>To'langan</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Qolgan Qarz</th>
                <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td></tr>
              ) : filteredDebtors.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Qarzdor bemorlar yo'q</td></tr>
              ) : (
                filteredDebtors.map(d => (
                  <tr key={d.patient.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{d.patient.full_name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{d.patient.phone}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      {d.totalBilled.toLocaleString()} UZS
                    </td>
                    <td style={{ padding: '16px 24px', color: '#10B981', fontWeight: '500' }}>
                      {d.totalPaid.toLocaleString()} UZS
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#EF4444' }}>
                      {d.debt.toLocaleString()} UZS
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button 
                        onClick={() => {
                          setPayDebtModal({ isOpen: true, patient: d.patient, maxAmount: d.debt })
                          setDebtAmount(d.debt.toString())
                          setDebtMethod('cash')
                        }}
                        style={{ padding: '6px 12px', backgroundColor: 'var(--bg-hover)', color: 'var(--accent)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                      >
                        To'lov qo'shish
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>

      {/* Pay Debt Modal */}
      {payDebtModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Qarz to'lash - {payDebtModal.patient?.full_name}</h2>
            
            <form onSubmit={handlePayDebt}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Summa (UZS)</label>
                <input 
                  type="number" 
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  max={payDebtModal.maxAmount}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}
                />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Jami qarz: {payDebtModal.maxAmount.toLocaleString()} UZS
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>To'lov turi</label>
                <select 
                  value={debtMethod}
                  onChange={(e) => setDebtMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}
                >
                  <option value="cash">Naqd pul</option>
                  <option value="card">Plastik karta</option>
                  <option value="transfer">Pul o'tkazmasi</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setPayDebtModal({ isOpen: false, patient: null, maxAmount: 0 })}
                  style={{ padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: '500' }}
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit" 
                  disabled={isPaying}
                  style={{ padding: '8px 16px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: isPaying ? 'not-allowed' : 'pointer', fontWeight: '500' }}
                >
                  {isPaying ? 'Saqlanmoqda...' : 'To\'lovni qabul qilish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
