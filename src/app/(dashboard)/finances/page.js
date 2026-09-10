'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import { Wallet, TrendingUp, CheckCircle, Clock, CreditCard } from 'lucide-react'
import { payoutCommissions } from '@/app/actions/finance'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function FinancesPage() {
  const { clinic, isLoading: clinicLoading } = useClinic()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [finances, setFinances] = useState({
    totalRevenue: 0,
    totalCommissions: 0,
    unpaidCommissions: 0
  })
  const [doctors, setDoctors] = useState([])
  
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchFinances = async () => {
    if (!clinic) return
    setLoading(true)
    try {
      // 1. Fetch total revenue from payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('clinic_id', clinic.id)
      
      const revenue = paymentsData?.reduce((acc, curr) => acc + curr.amount, 0) || 0

      // 2. Fetch commissions
      const { data: commissionsData } = await supabase
        .from('doctor_commissions')
        .select('amount, status, dentist_id')
        .eq('clinic_id', clinic.id)
        
      const allComms = commissionsData || []
      const totalComms = allComms.reduce((acc, curr) => acc + curr.amount, 0)
      const unpaidComms = allComms.filter(c => c.status === 'unpaid').reduce((acc, curr) => acc + curr.amount, 0)

      setFinances({
        totalRevenue: revenue,
        totalCommissions: totalComms,
        unpaidCommissions: unpaidComms
      })

      // 3. Aggregate doctor data
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, full_name, default_commission_rate')
        .eq('clinic_id', clinic.id)
        .eq('role', 'dentist')
        
      const docs = staffData?.map(doc => {
        const docComms = allComms.filter(c => c.dentist_id === doc.id)
        const unpaid = docComms.filter(c => c.status === 'unpaid').reduce((acc, curr) => acc + curr.amount, 0)
        const paid = docComms.filter(c => c.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0)
        return {
          ...doc,
          unpaid,
          paid,
          total: unpaid + paid
        }
      }) || []
      
      setDoctors(docs)

    } catch (err) {
      console.error('Moliya yuklashda xatolik:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clinicLoading && clinic) {
      fetchFinances()
    }
  }, [clinic, clinicLoading])

  const handlePayout = async (dentistId, amount) => {
    if (amount <= 0) return
    if (!confirm('Haqiqatan ham bu komissiyani to\'langan deb belgilamoqchimisiz?')) return
    
    setIsProcessing(true)
    try {
      const res = await payoutCommissions(clinic.id, dentistId, amount)
      if (res.error) throw new Error(res.error)
      await fetchFinances()
    } catch (err) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  if (clinicLoading) return <div>Yuklanmoqda...</div>

  // Prepare chart data
  const chartData = doctors.map(doc => ({
    name: doc.full_name.split(' ')[0],
    Tolanmagan: doc.unpaid,
    Tolangan: doc.paid
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Moliyaviy Tahlil</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Daromadlar va shifokorlar komissiyasi boshqaruvi</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#ECFDF5', borderRadius: '12px' }}>
              <Wallet color="#10B981" size={24} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-secondary)' }}>Umumiy Daromad</div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{finances.totalRevenue.toLocaleString()} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>UZS</span></div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '12px' }}>
              <TrendingUp color="#3B82F6" size={24} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-secondary)' }}>Jami Komissiyalar</div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{finances.totalCommissions.toLocaleString()} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>UZS</span></div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '12px' }}>
              <Clock color="#EF4444" size={24} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-secondary)' }}>To'lanmagan Qarzlar</div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: finances.unpaidCommissions > 0 ? '#EF4444' : 'inherit' }}>
            {finances.unpaidCommissions.toLocaleString()} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>UZS</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Doctors Table */}
        <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Shifokorlar Balansi</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Shifokor</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Standart %</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>To'langan</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>To'lanmagan (Qarz)</th>
                <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Amal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center' }}>Yuklanmoqda...</td></tr>
              ) : doctors.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center' }}>Shifokorlar topilmadi</td></tr>
              ) : (
                doctors.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{doc.full_name}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{doc.default_commission_rate}%</td>
                    <td style={{ padding: '16px 24px', color: '#10B981', fontWeight: '500' }}>{doc.paid.toLocaleString()}</td>
                    <td style={{ padding: '16px 24px', color: doc.unpaid > 0 ? '#EF4444' : 'inherit', fontWeight: '600' }}>{doc.unpaid.toLocaleString()}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handlePayout(doc.id, doc.unpaid)}
                        disabled={doc.unpaid <= 0 || isProcessing}
                        style={{ 
                          padding: '8px 16px', 
                          borderRadius: 'var(--radius-sm)', 
                          backgroundColor: doc.unpaid > 0 ? 'var(--text-primary)' : 'var(--bg-hover)', 
                          color: doc.unpaid > 0 ? 'var(--bg-page)' : 'var(--text-muted)',
                          border: 'none', 
                          fontWeight: '500', 
                          cursor: doc.unpaid > 0 ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto'
                        }}
                      >
                        <CreditCard size={16} />
                        To'lash
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Chart */}
        <div className="card" style={{ width: '400px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '24px' }}>Komissiya taqsimoti</h3>
          {doctors.length > 0 && !loading ? (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Bar dataKey="Tolangan" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Tolanmagan" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Ma'lumot yo'q
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
