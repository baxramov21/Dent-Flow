'use client'

import { useClinic } from '@/context/ClinicContext'
import { Building2, Mail, Phone, MapPin, Globe, Clock, Coffee, Send } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

import RoleGuard from '@/components/RoleGuard'

export default function SettingsPage() {
  return (
    <RoleGuard allowed={['admin']}>
      <SettingsPageContent />
    </RoleGuard>
  )
}

function SettingsPageContent() {
  const { clinic, isLoading } = useClinic()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  
  const [workStart, setWorkStart] = useState('09:00')
  const [workEnd, setWorkEnd] = useState('18:00')
  const [breakStart, setBreakStart] = useState('13:00')
  const [breakEnd, setBreakEnd] = useState('14:00')

  const [telegramChatId, setTelegramChatId] = useState('')
  const [reportFrequency, setReportFrequency] = useState('daily')
  const [reportTime, setReportTime] = useState('18:00')

  useEffect(() => {
    if (clinic) {
      setName(clinic.name || '')
      setPhone(clinic.phone || '')
      setAddress(clinic.address || '')
      
      if (clinic.working_hours) {
        setWorkStart(clinic.working_hours.work_start_time || '09:00')
        setWorkEnd(clinic.working_hours.work_end_time || '18:00')
        setBreakStart(clinic.working_hours.break_start_time || '13:00')
        setBreakEnd(clinic.working_hours.break_end_time || '14:00')
      }

      setTelegramChatId(clinic.telegram_chat_id || '')
      setReportFrequency(clinic.report_frequency || 'daily')
      setReportTime(clinic.report_time || '18:00')
    }
  }, [clinic])

  const handleSaveInfo = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.from('clinics').update({
      name, phone, address
    }).eq('id', clinic.id)
    setIsSubmitting(false)
    if (error) alert("Xatolik: " + error.message)
    else alert("Klinika ma'lumotlari saqlandi!")
  }

  const handleSaveHours = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.from('clinics').update({
      working_hours: {
        ...(clinic.working_hours || {}),
        work_start_time: workStart,
        work_end_time: workEnd,
        break_start_time: breakStart,
        break_end_time: breakEnd
      }
    }).eq('id', clinic.id)
    setIsSubmitting(false)
    if (error) alert("Xatolik: " + error.message)
    else alert("Ish vaqtlari muvaffaqiyatli saqlandi!")
  }

  const handleSaveTelegram = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.from('clinics').update({
      telegram_chat_id: telegramChatId,
      report_frequency: reportFrequency,
      report_time: reportTime
    }).eq('id', clinic.id)
    setIsSubmitting(false)
    if (error) alert("Xatolik: " + error.message)
    else alert("Telegram sozlamalari saqlandi!")
  }

  if (isLoading) return <div>Yuklanmoqda...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Sozlamalar</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Klinika profilini va tizim sozlamalarini boshqarish.</p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} color="var(--accent)" /> Klinika ma'lumotlari
        </h2>
        
        <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>Klinika nomi</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>Telefon raqami</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90 123 45 67" style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>Manzil</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} placeholder="Klinika manzili..." style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', resize: 'vertical' }} />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" disabled={isSubmitting} style={{ padding: '10px 24px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontWeight: '500' }}>
              Saqlash
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={20} color="var(--accent)" /> Ish vaqti va tanaffus
        </h2>
        
        <form onSubmit={handleSaveHours} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <h4 style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>Standart Ish Vaqti</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Boshlanishi:</span>
                <input type="time" required value={workStart} onChange={e => setWorkStart(e.target.value)} style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
              </div>
              <span style={{ color: 'var(--text-muted)' }}>-</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Tugashi:</span>
                <input type="time" required value={workEnd} onChange={e => setWorkEnd(e.target.value)} style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', color: '#B45309' }}>
              <Coffee size={16} /> Tushlik Tanaffusi
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Bu vaqt oralig'ida yangi navbatlar yozilishiga ruxsat berilmaydi.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Boshlanishi:</span>
                <input type="time" required value={breakStart} onChange={e => setBreakStart(e.target.value)} style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
              </div>
              <span style={{ color: 'var(--text-muted)' }}>-</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Tugashi:</span>
                <input type="time" required value={breakEnd} onChange={e => setBreakEnd(e.target.value)} style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" disabled={isSubmitting} style={{ padding: '10px 24px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontWeight: '500' }}>
              Ish vaqtlarini saqlash
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={20} color="var(--accent)" /> Tizim sozlamalari
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h4 style={{ fontWeight: '500' }}>Tizim tili</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Interfeys tilini tanlang</p>
            </div>
            <select style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <option value="uz">O'zbekcha</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Send size={20} color="#0088cc" /> Telegram Xabarnomalar
        </h2>
        
        <form onSubmit={handleSaveTelegram} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Kunlik yoki haftalik moliyaviy hisobotlarni Telegram orqali qabul qiling.
            Tizim @DentFlowBot orqali xabar yuboradi. Boshlash uchun botga o'tib <code>/start</code> ni bosing.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>Telegram Chat ID</label>
              <input 
                type="text" 
                value={telegramChatId} 
                onChange={e => setTelegramChatId(e.target.value)} 
                placeholder="Masalan: 123456789" 
                style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} 
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chat ID ni bilish uchun @userinfobot ga yozing</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>Xabar yuborish vaqti</label>
              <input 
                type="time" 
                value={reportTime} 
                onChange={e => setReportTime(e.target.value)} 
                style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>Chastota</label>
            <select 
              value={reportFrequency} 
              onChange={e => setReportFrequency(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
            >
              <option value="daily">Har kuni</option>
              <option value="weekly">Har haftada (Yakshanba)</option>
              <option value="monthly">Har oyda</option>
              <option value="never">Yuborilmasin</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" disabled={isSubmitting} style={{ padding: '10px 24px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontWeight: '500' }}>
              Telegram sozlamalarini saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
