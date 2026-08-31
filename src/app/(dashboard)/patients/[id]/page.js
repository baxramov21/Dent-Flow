'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, User as UserIcon, Phone, Calendar, MapPin, Activity, Clock, FileText, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { useClinic } from '@/context/ClinicContext'

export default function PatientProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { clinic, isLoading: clinicLoading } = useClinic()

  const [patient, setPatient] = useState(null)
  const [medicalHistory, setMedicalHistory] = useState([])
  const [treatmentPlans, setTreatmentPlans] = useState([])
  const [patientAppointments, setPatientAppointments] = useState([])
  const [dentists, setDentists] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'medical' | 'treatments' | 'appointments'
  
  // States for forms
  const [isAddingCondition, setIsAddingCondition] = useState(false)
  const [newCondition, setNewCondition] = useState({ condition: '', details: '' })

  const [isAddingPlan, setIsAddingPlan] = useState(false)
  const [newPlan, setNewPlan] = useState({ title: '', dentist_id: '', notes: '' })
  
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [activePlanId, setActivePlanId] = useState(null)
  const [services, setServices] = useState([])
  const [newItem, setNewItem] = useState({ service_id: '', tooth_number: '', quantity: 1, unit_price: 0 })
  
  const [expandedPlanId, setExpandedPlanId] = useState(null)

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          dentist:dentist_id (full_name),
          items:treatment_items (
            *,
            service:service_id (name, name_uz, price)
          )
        `)
        .eq('patient_id', id)
        
      if (error) throw error
      setTreatmentPlans(data || [])
    } catch (err) {
      console.error('Rejalarni yuklashda xatolik:', err)
    }
  }

  useEffect(() => {
    if (!id || clinicLoading) return

    async function loadData() {
      setLoading(true)
      try {
        const [patientRes, medicalRes, staffRes, servicesRes, appointmentsRes] = await Promise.all([
          supabase.from('patients').select('*').eq('id', id).single(),
          supabase.from('medical_history').select('*').eq('patient_id', id).order('reported_at', { ascending: false }),
          supabase.from('staff').select('id, full_name').eq('clinic_id', clinic.id).eq('role', 'dentist'),
          supabase.from('services').select('*').eq('clinic_id', clinic.id).eq('is_active', true),
          supabase.from('appointments').select('*, staff:dentist_id(full_name)').eq('patient_id', id).order('start_time', { ascending: false })
        ])

        if (patientRes.error) throw patientRes.error
        
        setPatient(patientRes.data)
        if (!medicalRes.error) setMedicalHistory(medicalRes.data)
        if (!staffRes.error) setDentists(staffRes.data)
        if (!servicesRes.error) setServices(servicesRes.data)
        if (!appointmentsRes.error) setPatientAppointments(appointmentsRes.data)
        
        await fetchPlans()

      } catch (err) {
        console.error('Bemor ma`lumotlarini yuklashda xatolik:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, clinicLoading])

  const calculateAge = (dob) => {
    if (!dob) return 'N/A'
    const diff = Date.now() - new Date(dob).getTime()
    return Math.abs(new Date(diff).getUTCFullYear() - 1970)
  }

  const handleAddCondition = async (e) => {
    e.preventDefault()
    if (!newCondition.condition.trim()) return
    try {
      const { data, error } = await supabase
        .from('medical_history')
        .insert([{
          patient_id: id,
          clinic_id: clinic.id,
          condition: newCondition.condition,
          details: newCondition.details
        }])
        .select()
        .single()
      if (error) throw error
      setMedicalHistory(prev => [data, ...prev])
      setIsAddingCondition(false)
      setNewCondition({ condition: '', details: '' })
    } catch (err) {
      alert("Holatni saqlashda xatolik")
    }
  }

  const handleCreatePlan = async (e) => {
    e.preventDefault()
    if (!newPlan.title.trim() || !newPlan.dentist_id) return
    try {
      const { error } = await supabase
        .from('treatment_plans')
        .insert([{
          patient_id: id,
          clinic_id: clinic.id,
          dentist_id: newPlan.dentist_id,
          title: newPlan.title,
          notes: newPlan.notes
        }])
      
      if (error) throw error
      setIsAddingPlan(false)
      setNewPlan({ title: '', dentist_id: '', notes: '' })
      await fetchPlans()
    } catch (err) {
      alert("Rejani saqlashda xatolik")
    }
  }

  const handleServiceSelect = (e) => {
    const serviceId = e.target.value
    const service = services.find(s => s.id === serviceId)
    setNewItem(prev => ({ ...prev, service_id: serviceId, unit_price: service ? service.price : 0 }))
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    try {
      // Parse teeth numbers (e.g. "14, 25" -> [14, 25])
      let teeth = []
      if (newItem.tooth_number) {
        teeth = newItem.tooth_number.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t))
      }
      
      // If no teeth specified but quantity > 1, create multiple rows without tooth numbers
      // If teeth are specified, create one row per tooth (ignoring quantity field for simplicity, or we can use Math.max(quantity, teeth.length))
      const insertCount = Math.max(newItem.quantity, teeth.length || 1)
      
      const insertRows = []
      for (let i = 0; i < insertCount; i++) {
        insertRows.push({
          treatment_plan_id: activePlanId,
          clinic_id: clinic.id,
          service_id: newItem.service_id,
          tooth_number: teeth[i] || null,
          price_override: newItem.unit_price,
          status: 'planned'
        })
      }

      const { error } = await supabase
        .from('treatment_items')
        .insert(insertRows)
      
      if (error) throw error
      setIsAddingItem(false)
      setNewItem({ service_id: '', tooth_number: '', quantity: 1, unit_price: 0 })
      await fetchPlans()
    } catch (err) {
      console.error(err)
      alert("Xizmatni qo'shishda xatolik: " + err.message)
    }
  }

  const handleToggleItemStatus = async (item) => {
    try {
      const newStatus = item.status === 'completed' ? 'planned' : 'completed'
      
      const updateData = { status: newStatus }
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else {
        updateData.completed_at = null
      }

      const { error } = await supabase
        .from('treatment_items')
        .update(updateData)
        .eq('id', item.id)
      
      if (error) throw error
      await fetchPlans()
    } catch (err) {
      alert("Holatni o'zgartirishda xatolik")
    }
  }

  const calculatePlanTotal = (items) => {
    if (!items || items.length === 0) return 0
    return items.reduce((acc, item) => acc + (item.price_override || 0), 0)
  }

  if (loading || clinicLoading) return <div>Yuklanmoqda...</div>
  if (!patient) return <div>Bemor topilmadi</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/patients">
          <button style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ArrowLeft size={20} />
          </button>
        </Link>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Bemor profili</h1>
        </div>
      </div>

      {/* Patient Info Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
          <UserIcon size={40} />
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{patient.full_name}</h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', textTransform: 'capitalize' }}>
              {patient.gender === 'male' ? 'Erkak' : patient.gender === 'female' ? 'Ayol' : patient.gender} • {calculateAge(patient.date_of_birth)} yosh
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              <Phone size={16} /> {patient.phone}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              <Calendar size={16} /> {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : '—'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              <MapPin size={16} /> {patient.address || "Manzil ko'rsatilmagan"}
            </div>
          </div>
        </div>
        <div>
          <button style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: '500' }}>
            Profilni tahrirlash
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '32px' }}>
        {[
          { id: 'overview', label: 'Umumiy', icon: <Activity size={16} /> },
          { id: 'medical', label: 'Tibbiy tarix', icon: <FileText size={16} /> },
          { id: 'treatments', label: 'Davolash rejalari', icon: <UserIcon size={16} /> },
          { id: 'appointments', label: 'Qabullar', icon: <Clock size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 0',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? '600' : '400',
              marginBottom: '-1px'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ marginTop: '8px' }}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Umumiy izohlar</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                  {patient.notes || "Umumiy izohlar yo'q."}
                </p>
              </div>
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>So'nggi davolash</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Faol davolash yo'q.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
                  Ogohlantirishlar
                </h3>
                {medicalHistory.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {medicalHistory.slice(0,3).map(mh => (
                      <li key={mh.id} style={{ marginBottom: '8px' }}>{mh.condition}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Tibbiy ogohlantirishlar yo'q.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MEDICAL HISTORY TAB */}
        {activeTab === 'medical' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Tibbiy holatlar va allergiyalar</h3>
              <button 
                onClick={() => setIsAddingCondition(!isAddingCondition)}
                style={{ color: 'var(--accent)', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={16} /> Holat qo'shish
              </button>
            </div>

            {isAddingCondition && (
              <form onSubmit={handleAddCondition} style={{ backgroundColor: 'var(--bg-page)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" placeholder="Holat (masalan: Penitsillin allergiyasi)" required value={newCondition.condition} onChange={(e) => setNewCondition(prev => ({ ...prev, condition: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }} />
                <textarea placeholder="Qo'shimcha ma'lumotlar..." rows={2} value={newCondition.details} onChange={(e) => setNewCondition(prev => ({ ...prev, details: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', resize: 'vertical' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" onClick={() => setIsAddingCondition(false)} style={{ padding: '8px 16px', fontSize: '14px' }}>Bekor qilish</button>
                  <button type="submit" style={{ padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>Saqlash</button>
                </div>
              </form>
            )}

            {medicalHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>Tibbiy tarix yozuvlari yo'q.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {medicalHistory.map(record => (
                  <div key={record.id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h4 style={{ fontWeight: '600', color: 'var(--danger)' }}>{record.condition}</h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(record.reported_at).toLocaleDateString()}
                      </span>
                    </div>
                    {record.details && <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>{record.details}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TREATMENTS TAB */}
        {activeTab === 'treatments' && (
          <div className="card">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Davolash rejalari</h3>
              <button 
                onClick={() => setIsAddingPlan(!isAddingPlan)}
                style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={16} /> Yangi reja yaratish
              </button>
            </div>

            {isAddingPlan && (
              <form onSubmit={handleCreatePlan} style={{ backgroundColor: 'var(--bg-page)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: '500' }}>Reja nomi *</label>
                    <input type="text" required placeholder="Masalan: Tishlarni tozalash va plomba" value={newPlan.title} onChange={(e) => setNewPlan(prev => ({ ...prev, title: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: '500' }}>Shifokor *</label>
                    <select required value={newPlan.dentist_id} onChange={(e) => setNewPlan(prev => ({ ...prev, dentist_id: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--bg-card)' }}>
                      <option value="" disabled>Shifokorni tanlang</option>
                      {dentists.map(d => (
                        <option key={d.id} value={d.id}>{d.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Izohlar</label>
                  <textarea rows={2} value={newPlan.notes} onChange={(e) => setNewPlan(prev => ({ ...prev, notes: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" onClick={() => setIsAddingPlan(false)} style={{ padding: '8px 16px', fontSize: '14px' }}>Bekor qilish</button>
                  <button type="submit" style={{ padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>Yaratish</button>
                </div>
              </form>
            )}

            {treatmentPlans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>Davolash rejalari mavjud emas.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {treatmentPlans.map(plan => {
                  const isExpanded = expandedPlanId === plan.id
                  const totalAmount = calculatePlanTotal(plan.items)
                  return (
                    <div key={plan.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <div 
                        onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-hover)', cursor: 'pointer' }}
                      >
                        <div>
                          <h4 style={{ fontWeight: '600', fontSize: '16px' }}>{plan.title}</h4>
                          <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <span>Shifokor: {plan.dentist?.full_name}</span>
                            <span>Holat: <strong style={{ textTransform: 'capitalize' }}>{plan.status}</strong></span>
                            <span>Umumiy: <strong style={{ color: 'var(--text-primary)' }}>{totalAmount.toLocaleString()} so'm</strong></span>
                          </div>
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
                          {plan.notes && (
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                              <strong>Izoh:</strong> {plan.notes}
                            </p>
                          )}
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h5 style={{ fontWeight: '600', fontSize: '14px' }}>Xizmatlar</h5>
                            <button 
                              onClick={() => { setActivePlanId(plan.id); setIsAddingItem(true); }}
                              style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: '500' }}
                            >
                              + Xizmat qo'shish
                            </button>
                          </div>
                          
                          {plan.items && plan.items.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                              <thead>
                                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                                  <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: '500' }}>Xizmat</th>
                                  <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: '500' }}>Tish</th>
                                  <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: '500' }}>Narxi</th>
                                  <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: '500' }}>Holat</th>
                                </tr>
                              </thead>
                              <tbody>
                                {plan.items.map(item => (
                                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 0' }}>{item.service?.name_uz || item.service?.name}</td>
                                    <td style={{ padding: '12px 0' }}>{item.tooth_number || '—'}</td>
                                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '500' }}>{item.price_override?.toLocaleString()} so'm</td>
                                    <td style={{ padding: '12px 0', textAlign: 'center' }}>
                                      <span 
                                        onClick={() => handleToggleItemStatus(item)}
                                        style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', cursor: 'pointer', userSelect: 'none', backgroundColor: item.status === 'completed' ? '#D1FAE5' : '#FEF3C7', color: item.status === 'completed' ? '#065F46' : '#92400E', transition: 'all 0.2s' }}
                                        title="Holatni o'zgartirish uchun bosing"
                                      >
                                        {item.status === 'completed' ? 'Yakunlangan' : 'Jarayonda'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '13px' }}>
                              Ushbu rejaga hali xizmatlar qo'shilmagan.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* APPOINTMENTS TAB */}
        {activeTab === 'appointments' && (
          <div className="card">
            {patientAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                Ushbu bemorda qabullar tarixi mavjud emas.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Sana</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Vaqti</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Shifokor</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {patientAppointments.map(apt => (
                    <tr key={apt.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px' }}>{new Date(apt.start_time).toLocaleDateString('uz-UZ')}</td>
                      <td style={{ padding: '16px' }}>{new Date(apt.start_time).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ padding: '16px' }}>{apt.staff?.full_name || '—'}</td>
                      <td style={{ padding: '16px', textTransform: 'capitalize' }}>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500',
                          backgroundColor: apt.status === 'completed' ? '#D1FAE5' : apt.status === 'cancelled' ? '#FEE2E2' : '#E0E7FF',
                          color: apt.status === 'completed' ? '#065F46' : apt.status === 'cancelled' ? '#991B1B' : '#4338CA'
                        }}>
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

      {/* Add Item Modal */}
      {isAddingItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Xizmat qo'shish</h2>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>Xizmat turini tanlang *</label>
                <select required value={newItem.service_id} onChange={handleServiceSelect} style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                  <option value="" disabled>Tanlang...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name_uz || s.name} ({s.price.toLocaleString()} so'm)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>Tish raqami (Ixtiyoriy)</label>
                <input type="text" placeholder="Masalan: 14, 25" value={newItem.tooth_number} onChange={e => setNewItem({...newItem, tooth_number: e.target.value})} style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Miqdori *</label>
                  <input type="number" min="1" required value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Narxi (so'm) *</label>
                  <input type="number" required value={newItem.unit_price} onChange={e => setNewItem({...newItem, unit_price: parseInt(e.target.value)})} style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsAddingItem(false)} style={{ padding: '8px 16px', fontSize: '14px' }}>Bekor qilish</button>
                <button type="submit" disabled={!newItem.service_id} style={{ padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '14px', opacity: !newItem.service_id ? 0.7 : 1 }}>Qo'shish</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
