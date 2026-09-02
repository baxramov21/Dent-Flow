'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import { History, CreditCard, Search, Calendar, User, FileText, Download } from 'lucide-react'

export default function HistoryPage() {
  const { clinic, isLoading: clinicLoading } = useClinic()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState('procedures') // 'procedures' | 'payments' | 'debts'
  const [loading, setLoading] = useState(true)
  
  // Data
  const [procedures, setProcedures] = useState([])
  const [payments, setPayments] = useState([])
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = async () => {
    if (!clinic) return
    setLoading(true)
    try {
      // 1. Fetch Completed Procedures
      const { data: procData, error: procError } = await supabase
        .from('treatment_items')
        .select(`
          id,
          tooth_number,
          price_override,
          completed_at,
          services(name_uz, name),
          treatment_plans(
            id,
            patients(id, full_name, phone),
            staff(id, full_name)
          )
        `)
        .eq('clinic_id', clinic.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (procError) throw procError
      setProcedures(procData || [])

      // 2. Fetch Payments
      const { data: payData, error: payError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_method,
          notes,
          paid_at,
          patients(id, full_name),
          treatment_plans(id, title)
        `)
        .eq('clinic_id', clinic.id)
        .order('paid_at', { ascending: false })

      if (payError) throw payError
      setPayments(payData || [])

    } catch (error) {
      console.error('Tarixni yuklashda xatolik:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clinicLoading && clinic) {
      fetchData()
    }
  }, [clinic, clinicLoading])

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
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Jami muolajalar</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{totalProcedures}</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Jami tushum</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px', color: '#10B981' }}>{totalRevenue.toLocaleString()} UZS</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>O'rtacha chek</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px', color: '#3B82F6' }}>{Math.round(avgCheck).toLocaleString()} UZS</p>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #EF4444' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Jami Qarzdorlik</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px', color: '#EF4444' }}>{totalDebt.toLocaleString()} UZS</p>
        </div>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td></tr>
              ) : filteredDebtors.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Qarzdor bemorlar yo'q</td></tr>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

      </div>
    </div>
  )
}
