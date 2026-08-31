'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import { Users, Calendar, Activity, TrendingUp, Clock, User, ArrowRight, Sparkles, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

export default function DashboardOverview() {
  const { clinic, isLoading: clinicLoading } = useClinic()
  const supabase = createClient()

  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    activePlans: 0
  })
  const [loading, setLoading] = useState(true)
  const [queue, setQueue] = useState([])
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    async function fetchDashboardData() {
      if (!clinic) return
      setLoading(true)

      try {
        // 1. Total Patients
        const { count: patientsCount } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinic.id)

        // 2. Today's Appointments
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const { count: appointmentsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinic.id)
          .gte('start_time', today.toISOString())
          .lt('start_time', tomorrow.toISOString())

        // 3. Active Plans
        const { count: plansCount } = await supabase
          .from('treatment_plans')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinic.id)
          .eq('status', 'active')

        setStats({
          totalPatients: patientsCount || 0,
          todayAppointments: appointmentsCount || 0,
          activePlans: plansCount || 0
        })

        // 4. Queue (Today's Waiting/In Chair)
        const { data: queueData } = await supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            status,
            patients(full_name)
          `)
          .eq('clinic_id', clinic.id)
          .in('status', ['scheduled', 'arrived', 'in_chair'])
          .gte('start_time', today.toISOString())
          .lt('start_time', tomorrow.toISOString())
          .order('start_time', { ascending: true })
          .limit(5)

        setQueue(queueData || [])

        // 5. Chart Data: Last 7 Days Revenue
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
        sevenDaysAgo.setHours(0, 0, 0, 0)

        const { data: payments } = await supabase
          .from('payments')
          .select('amount, paid_at')
          .eq('clinic_id', clinic.id)
          .gte('paid_at', sevenDaysAgo.toISOString())
          .order('paid_at', { ascending: true })

        // Aggregate by day
        const dailyRevenue = {}
        const dayNames = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan']
        
        for (let i = 0; i < 7; i++) {
          const d = new Date(sevenDaysAgo)
          d.setDate(d.getDate() + i)
          dailyRevenue[d.toDateString()] = {
            name: dayNames[d.getDay()],
            daromad: 0,
            date: d
          }
        }

        if (payments) {
          payments.forEach(p => {
            const dateStr = new Date(p.paid_at).toDateString()
            if (dailyRevenue[dateStr]) {
              dailyRevenue[dateStr].daromad += p.amount
            }
          })
        }

        setChartData(Object.values(dailyRevenue))

      } catch (error) {
        console.error("Dashboard yuklashda xatolik:", error)
      } finally {
        setLoading(false)
      }
    }

    if (!clinicLoading) {
      fetchDashboardData()
    }
  }, [clinic, clinicLoading])

  if (clinicLoading) return <div>Yuklanmoqda...</div>

  const kpiCards = [
    {
      label: 'Jami bemorlar',
      value: loading ? '...' : stats.totalPatients,
      icon: Users,
      gradient: 'linear-gradient(135deg, #6366F1, #818CF8)',
      shadowColor: 'rgba(99, 102, 241, 0.25)',
      bgLight: '#EEF2FF',
    },
    {
      label: 'Bugungi qabullar',
      value: loading ? '...' : stats.todayAppointments,
      icon: Calendar,
      gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
      shadowColor: 'rgba(59, 130, 246, 0.25)',
      bgLight: '#DBEAFE',
    },
    {
      label: 'Faol davolashlar',
      value: loading ? '...' : stats.activePlans,
      icon: Activity,
      gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
      shadowColor: 'rgba(245, 158, 11, 0.25)',
      bgLight: '#FEF3C7',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #312E81 0%, #4338CA 40%, #6366F1 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px 36px',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.25)',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-40px', right: '-20px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '80px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', top: '10px', left: '50%', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={18} style={{ opacity: 0.8 }} />
            <span style={{ fontSize: '13px', fontWeight: '500', opacity: 0.75, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Boshqaruv paneli</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Xush kelibsiz, DentFlow! 👋
          </h1>
          <p style={{ fontSize: '14px', opacity: 0.7, lineHeight: 1.5 }}>
            Klinikangizning bugungi umumiy holati va tezkor statistikasi.
          </p>
        </div>
        
        <Link href="/appointments" style={{ position: 'relative', zIndex: 1, textDecoration: 'none' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            color: 'white',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}>
            <Zap size={16} />
            Kalendarga o'tish
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {kpiCards.map((card, i) => {
          const Icon = card.icon
          return (
            <div key={i} className="card" style={{ 
              display: 'flex', alignItems: 'center', gap: '20px',
              padding: '24px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ 
                width: '52px', height: '52px', 
                borderRadius: '14px',
                background: card.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',
                boxShadow: `0 6px 16px ${card.shadowColor}`,
                flexShrink: 0,
              }}>
                <Icon size={24} strokeWidth={2} />
              </div>
              <div>
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', letterSpacing: '0.02em' }}>{card.label}</h3>
                <p style={{ fontSize: '30px', fontWeight: '700', marginTop: '2px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  {card.value}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: '20px' }}>
        
        {/* Chart Section */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.01em' }}>Haftalik daromad</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>So'nggi 7 kunlik tushumlar</p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
              fontSize: '12px',
              fontWeight: '600',
            }}>
              <TrendingUp size={14} />
              7 kun
            </div>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            {loading ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#818CF8" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', padding: '12px 16px' }}
                    formatter={(value) => [`${value.toLocaleString()} UZS`, 'Daromad']}
                  />
                  <Bar dataKey="daromad" fill="url(#barGrad)" radius={[6, 6, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Queue Summary Widget */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.01em' }}>Kutish xonasi</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Bugungi navbat</p>
            </div>
            <Link href="/queue" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>
              Barchasi <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
          ) : queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'var(--bg-hover)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Clock size={24} style={{ opacity: 0.4 }} />
              </div>
              <p style={{ fontSize: '14px' }}>Hozircha kutayotganlar yo'q</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {queue.map(app => (
                <div key={app.id} style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px', 
                  padding: '12px', 
                  borderRadius: '12px',
                  backgroundColor: app.status === 'in_chair' ? '#FFFBEB' : 'transparent',
                  transition: 'background 0.2s',
                }}>
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '10px', 
                    background: app.status === 'in_chair' 
                      ? 'linear-gradient(135deg, #F59E0B, #FBBF24)' 
                      : 'var(--bg-hover)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    color: app.status === 'in_chair' ? 'white' : 'var(--text-muted)',
                    flexShrink: 0,
                  }}>
                    <User size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontWeight: '500', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.patients?.full_name}</h4>
                    <span style={{ 
                      fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px',
                      backgroundColor: app.status === 'in_chair' ? '#FEF3C7' : '#F1F5F9',
                      color: app.status === 'in_chair' ? '#D97706' : '#64748B'
                    }}>
                      {app.status === 'in_chair' ? 'Qabulda' : 'Kutmoqda'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(app.start_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
