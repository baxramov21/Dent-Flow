'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"

export default function AppointmentForm({ onSuccess, onCancel }) {
  const { clinic } = useClinic()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Data for dropdowns
  const [patients, setPatients] = useState([])
  const [dentists, setDentists] = useState([])
  
  // Form State
  const [formData, setFormData] = useState({
    patient_id: '',
    dentist_id: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    duration_minutes: 30,
    notes: ''
  })

  // New Patient State
  const [isNewPatient, setIsNewPatient] = useState(false)
  const [newPatientData, setNewPatientData] = useState({
    full_name: '',
    phone: '+998-',
    date_of_birth: '',
    gender: 'male',
    address: '',
    condition: ''
  })

  // Services State
  const [services, setServices] = useState([])
  const [selectedServices, setSelectedServices] = useState({}) // { id: quantity }
  const [expandedCategories, setExpandedCategories] = useState({}) // { categoryName: boolean }
  const [isAddingService, setIsAddingService] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')

  useEffect(() => {
    if (!clinic) return

    async function loadDropdownData() {
      try {
        const [patientsRes, staffRes, servicesRes] = await Promise.all([
          supabase.from('patients').select('id, full_name').eq('clinic_id', clinic.id).order('full_name'),
          supabase.from('staff').select('id, full_name, specialization').eq('clinic_id', clinic.id).eq('role', 'dentist'),
          supabase.from('services').select('id, name, price, category').eq('clinic_id', clinic.id).eq('is_active', true).order('name')
        ])

        if (patientsRes.error) throw patientsRes.error
        if (staffRes.error) throw staffRes.error
        if (servicesRes.error) throw servicesRes.error

        setPatients(patientsRes.data || [])
        setDentists(staffRes.data || [])
        setServices(servicesRes.data || [])

        // Set defaults if available
        if (staffRes.data && staffRes.data.length > 0) {
          setFormData(prev => ({ ...prev, dentist_id: staffRes.data[0].id }))
        }
      } catch (err) {
        console.error('Error loading form data:', err)
      }
    }

    loadDropdownData()
  }, [clinic])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleNewPatientChange = (e) => {
    const { name, value } = e.target
    if (name === 'phone') {
      let rawValue = value
      if (!rawValue.startsWith('+998-') && rawValue.includes('+998-')) {
         rawValue = rawValue.substring(rawValue.indexOf('+998-'))
      }
      let digits = rawValue.replace(/\D/g, '')
      if (digits.startsWith('998')) {
         digits = digits.substring(3)
      }
      digits = digits.substring(0, 9)

      let formatted = '+998-'
      if (digits.length > 0) formatted += digits.substring(0, 2)
      if (digits.length > 2) formatted += '-' + digits.substring(2, 5)
      if (digits.length > 5) formatted += '-' + digits.substring(5, 7)
      if (digits.length > 7) formatted += '-' + digits.substring(7, 9)

      setNewPatientData(prev => ({ ...prev, [name]: formatted }))
    } else {
      setNewPatientData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleAddNewService = async () => {
    if (!newServiceName.trim() || !newServicePrice) return
    const priceValue = parseInt(newServicePrice) * 1000
    
    const { data, error } = await supabase.from('services').insert([{
       clinic_id: clinic.id,
       name: newServiceName,
       price: priceValue,
       is_active: true
    }]).select().single()

    if (!error && data) {
       setServices(prev => [...prev, data])
       setSelectedServices(prev => ({ ...prev, [data.id]: 1 }))
       setExpandedCategories(prev => ({ ...prev, [data.category || 'Boshqa']: true }))
       setNewServiceName('')
       setNewServicePrice('')
       setIsAddingService(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Working Hours Validation
      const workStart = clinic?.working_hours?.work_start_time || '09:00'
      const workEnd = clinic?.working_hours?.work_end_time || '18:00'
      const breakStart = clinic?.working_hours?.break_start_time || '13:00'
      const breakEnd = clinic?.working_hours?.break_end_time || '14:00'
      
      const apptStart = formData.start_time
      
      const [startH, startM] = apptStart.split(':').map(Number)
      const duration = parseInt(formData.duration_minutes) || 30
      const endH = startH + Math.floor((startM + duration) / 60)
      const endM = (startM + duration) % 60
      const apptEnd = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`

      if (apptStart < workStart || apptEnd > workEnd) {
        throw new Error(`Klinika ish vaqti ${workStart} dan ${workEnd} gacha. Iltimos, boshqa vaqt tanlang.`)
      }

      if (apptStart < breakEnd && apptEnd > breakStart) {
        throw new Error(`Klinika tushlik tanaffusida (${breakStart} - ${breakEnd}). Ushbu vaqtga navbat yozib bo'lmaydi.`)
      }

      let finalPatientId = formData.patient_id
      let planId = null

      if (isNewPatient) {
        if (!newPatientData.full_name.trim()) throw new Error("Bemor ismini kiriting")
        if (newPatientData.phone.length < 17) throw new Error("Telefon raqamini to'liq kiriting (+998-xx-xxx-xx-xx)")
        if (!newPatientData.date_of_birth) throw new Error("Tug'ilgan sanani kiriting")
        if (!newPatientData.address.trim()) throw new Error("Manzilni kiriting")
        if (!newPatientData.condition.trim()) throw new Error("Kasalliklarni kiriting (yo'q bo'lsa 'Yo'q' deb yozing)")
        
        // 1. Create Patient
        const { data: newPat, error: patError } = await supabase
          .from('patients')
          .insert([{
            clinic_id: clinic.id,
            full_name: newPatientData.full_name,
            phone: newPatientData.phone,
            date_of_birth: newPatientData.date_of_birth || null,
            gender: newPatientData.gender,
            address: newPatientData.address || null
          }])
          .select()
          .single()
          
        if (patError) throw patError
        finalPatientId = newPat.id

        // 1.5 Add Medical History if provided
        if (newPatientData.condition.trim()) {
           await supabase.from('medical_history').insert([{
             clinic_id: clinic.id,
             patient_id: finalPatientId,
             condition: newPatientData.condition
           }])
        }

        // 2. Create Active Treatment Plan for them
        const { data: planData, error: planError } = await supabase
          .from('treatment_plans')
          .insert([{
            clinic_id: clinic.id,
            patient_id: finalPatientId,
            dentist_id: formData.dentist_id,
            title: 'Asosiy davolash rejasi',
            status: 'active',
            notes: formData.notes || 'Avtomatik yaratilgan reja'
          }])
          .select().single()
          
        if (planError) throw planError
        planId = planData.id

      } else {
        if (!finalPatientId) throw new Error("Bemorni tanlang")
        
        // Find active plan for existing patient
        const { data: activePlan } = await supabase
          .from('treatment_plans')
          .select('id')
          .eq('patient_id', finalPatientId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (activePlan) {
           planId = activePlan.id
        } else {
           const { data: newPlan } = await supabase.from('treatment_plans')
             .insert([{ clinic_id: clinic.id, patient_id: finalPatientId, dentist_id: formData.dentist_id, title: 'Asosiy davolash rejasi', status: 'active', notes: 'Avtomatik yaratilgan reja' }])
             .select().single()
           if (newPlan) planId = newPlan.id
        }
      }

      // Create full ISO strings for start and end
      const startDateTime = new Date(`${formData.date}T${formData.start_time}:00`)
      const endDateTime = new Date(startDateTime.getTime() + formData.duration_minutes * 60000)

      // ---- Double-booking conflict check ----
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id, start_time, end_time')
        .eq('dentist_id', formData.dentist_id)
        .eq('clinic_id', clinic.id)
        .not('status', 'in', '("cancelled")')
        .lt('start_time', endDateTime.toISOString())
        .gt('end_time', startDateTime.toISOString())

      if (conflicts && conflicts.length > 0) {
        const conflictTime = new Date(conflicts[0].start_time)
          .toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
        const dentistName = dentists.find(d => d.id === formData.dentist_id)?.full_name || 'Shifokor'
        throw new Error(`${dentistName} soat ${conflictTime} da allaqachon band! Iltimos boshqa vaqtni tanlang.`)
      }
      // ---- End conflict check ----

      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert([{
          clinic_id: clinic.id,
          patient_id: finalPatientId,
          dentist_id: formData.dentist_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'scheduled',
          notes: formData.notes
        }])
        .select()
        .single()

      if (insertError) throw insertError

      // Add selected services to treatment items
      const selectedIds = Object.keys(selectedServices)
      if (planId && selectedIds.length > 0) {
         const itemsToInsert = []
         
         for (const serviceId of selectedIds) {
            const quantity = selectedServices[serviceId]
            const svc = services.find(s => s.id === serviceId)
            if (!svc) continue
            
            for (let i = 0; i < quantity; i++) {
               itemsToInsert.push({
                  treatment_plan_id: planId,
                  service_id: serviceId,
                  price_override: svc.price,
                  status: 'planned',
                  clinic_id: clinic.id
               })
            }
         }
         
         if (itemsToInsert.length > 0) {
           const { error: itemsError } = await supabase.from('treatment_items').insert(itemsToInsert)
           if (itemsError) console.error("Error inserting treatment items:", itemsError)
         }
      }
      
      onSuccess(data)
    } catch (err) {
      console.error('Failed to book appointment:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {error && (
        <div style={{ position: 'fixed', top: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '16px 24px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: '500', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '400px', animation: 'modalSlideUp 0.3s ease-out' }}>
          <div style={{ fontSize: '20px' }}>⚠️</div>
          <div style={{ flex: 1, lineHeight: '1.4' }}>{error}</div>
          <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#991B1B', fontSize: '24px', cursor: 'pointer', padding: '0 4px', lineHeight: '1' }}>&times;</button>
        </div>
      )}

      {/* Segmented Control for Patient Type */}
      <div style={{ display: 'flex', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', padding: '4px' }}>
        <button 
          type="button"
          onClick={() => setIsNewPatient(false)}
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: 'none', fontWeight: '500', cursor: 'pointer',
            backgroundColor: !isNewPatient ? 'white' : 'transparent',
            boxShadow: !isNewPatient ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            color: !isNewPatient ? 'var(--text-primary)' : 'var(--text-secondary)',
            transition: 'all 0.2s'
          }}
        >
          Mavjud bemor
        </button>
        <button 
          type="button"
          onClick={() => setIsNewPatient(true)}
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: 'none', fontWeight: '500', cursor: 'pointer',
            backgroundColor: isNewPatient ? 'white' : 'transparent',
            boxShadow: isNewPatient ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            color: isNewPatient ? 'var(--accent)' : 'var(--text-secondary)',
            transition: 'all 0.2s'
          }}
        >
          Yangi bemor qo'shish
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!isNewPatient ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>Bemorni tanlang *</label>
            <select
              name="patient_id"
              required={!isNewPatient}
              value={formData.patient_id}
              onChange={handleChange}
              style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', backgroundColor: 'var(--bg-card)' }}
            >
              <option value="" disabled>Bemorni tanlang...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
            {patients.length === 0 && (
              <span style={{ fontSize: '12px', color: 'var(--danger)' }}>Bemorlar topilmadi. Iltimos, "Yangi bemor qo'shish"ni tanlang.</span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '-8px' }}>Bemor ma'lumotlari</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>F.I.O *</label>
                <input
                  type="text"
                  name="full_name"
                  placeholder="Ism familiya"
                  required={isNewPatient}
                  value={newPatientData.full_name}
                  onChange={handleNewPatientChange}
                  style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>Telefon *</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="+998..."
                  required={isNewPatient}
                  value={newPatientData.phone}
                  onChange={handleNewPatientChange}
                  style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>Tug'ilgan sana</label>
                <DatePicker
                  selected={newPatientData.date_of_birth ? new Date(newPatientData.date_of_birth) : null}
                  onChange={(date) => {
                    const formattedDate = date ? date.toISOString().split('T')[0] : '';
                    setNewPatientData(prev => ({ ...prev, date_of_birth: formattedDate }));
                  }}
                  dateFormat="dd.MM.yyyy"
                  placeholderText="dd.mm.yyyy"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  isClearable
                  required={isNewPatient}
                  customInput={<input style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--bg-card)' }} />}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>Jinsi</label>
                <select
                  name="gender"
                  value={newPatientData.gender}
                  onChange={handleNewPatientChange}
                  style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', backgroundColor: 'white', width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="male">Erkak</option>
                  <option value="female">Ayol</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500' }}>Manzili *</label>
              <input
                type="text"
                name="address"
                placeholder="Yashash manzili"
                required={isNewPatient}
                value={newPatientData.address}
                onChange={handleNewPatientChange}
                style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500' }}>Tibbiy holati / Kasalliklari *</label>
              <input
                type="text"
                name="condition"
                placeholder="Allergiyalar, surunkali kasalliklar (yo'q bo'lsa 'Yo'q')..."
                required={isNewPatient}
                value={newPatientData.condition}
                onChange={handleNewPatientChange}
                style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}
      </div>

      <hr style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />

      <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '-8px' }}>Muolajalar (Xizmatlar)</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
         {Object.entries(
           services.reduce((acc, s) => {
             const cat = s.category || 'Boshqa'
             if (!acc[cat]) acc[cat] = []
             acc[cat].push(s)
             return acc
           }, {})
         ).map(([category, items]) => (
           <div key={category} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
             <button type="button" onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--bg-card)', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
               {category}
               <span style={{ color: 'var(--text-muted)' }}>{expandedCategories[category] ? '▼' : '▶'}</span>
             </button>
             {expandedCategories[category] && (
               <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'white', borderTop: '1px solid var(--border)' }}>
                 {items.map(s => (
                   <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: selectedServices[s.id] ? '#F0F9FF' : 'transparent', transition: 'all 0.2s' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                       <input type="checkbox" checked={!!selectedServices[s.id]} onChange={() => {
                          setSelectedServices(prev => {
                             if (prev[s.id]) {
                               const copy = { ...prev }; delete copy[s.id]; return copy;
                             }
                             return { ...prev, [s.id]: 1 }
                          })
                       }} style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }} />
                       <span style={{ fontSize: '14px', fontWeight: selectedServices[s.id] ? '500' : '400', color: selectedServices[s.id] ? 'var(--accent)' : 'var(--text-primary)' }}>{s.name}</span>
                       <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>({(s.price).toLocaleString()} UZS)</span>
                     </label>
                     {selectedServices[s.id] && (
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '2px' }}>
                         <button type="button" onClick={(e) => { 
                            e.preventDefault()
                            setSelectedServices(prev => {
                               const qty = (prev[s.id] || 0) - 1
                               if (qty <= 0) {
                                 const copy = { ...prev }; delete copy[s.id]; return copy;
                               }
                               return { ...prev, [s.id]: qty }
                            })
                         }} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', backgroundColor: '#F3F4F6', cursor: 'pointer', color: 'var(--text-primary)' }}>-</button>
                         <span style={{ fontSize: '13px', fontWeight: '600', minWidth: '16px', textAlign: 'center' }}>{selectedServices[s.id]}</span>
                         <button type="button" onClick={(e) => { 
                            e.preventDefault()
                            setSelectedServices(prev => ({ ...prev, [s.id]: (prev[s.id] || 0) + 1 }))
                         }} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', backgroundColor: '#F3F4F6', cursor: 'pointer', color: 'var(--text-primary)' }}>+</button>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             )}
           </div>
         ))}
         {services.length === 0 && <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Klinikada xizmatlar topilmadi. Qo'shing.</span>}
         
         {!isAddingService ? (
           <button type="button" onClick={() => setIsAddingService(true)} style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '13px', color: 'var(--accent)', backgroundColor: 'transparent', border: '1px dashed var(--accent)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '500' }}>
             + Boshqa xizmat qo'shish
           </button>
         ) : (
           <div style={{ display: 'flex', gap: '8px', padding: '12px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
             <input type="text" placeholder="Xizmat nomi (Masalan: Tish yulish)" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', outline: 'none' }} />
             <input type="number" placeholder="Narxi (Ming so'mda, Masalan: 50)" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} style={{ width: '220px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', outline: 'none' }} />
             <button type="button" onClick={handleAddNewService} style={{ padding: '8px 16px', backgroundColor: 'var(--text-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>Qo'shish</button>
             <button type="button" onClick={() => setIsAddingService(false)} style={{ padding: '8px 12px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Bekor qilish</button>
           </div>
         )}
      </div>

      <hr style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />

      <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '-8px' }}>Qabul ma'lumotlari</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '13px', fontWeight: '500' }}>Shifokor *</label>
        <select
          name="dentist_id"
          required
          value={formData.dentist_id}
          onChange={handleChange}
          style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', backgroundColor: 'var(--bg-card)' }}
        >
          <option value="" disabled>Shifokorni tanlang</option>
          {dentists.map(d => (
            <option key={d.id} value={d.id}>{d.full_name} ({d.specialization || 'Shifokor'})</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500' }}>Sana *</label>
          <input
            type="date"
            name="date"
            required
            value={formData.date}
            onChange={handleChange}
            style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none' }}
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500' }}>Boshlanish vaqti *</label>
          <DatePicker
            selected={formData.start_time ? new Date(`1970-01-01T${formData.start_time}:00`) : null}
            onChange={(date) => {
              if (date) {
                const time = date.toTimeString().split(' ')[0].substring(0, 5);
                handleChange({ target: { name: 'start_time', value: time } });
              }
            }}
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={15}
            timeCaption="Vaqt"
            dateFormat="HH:mm"
            timeFormat="HH:mm"
            minTime={new Date(new Date().setHours(9, 0, 0, 0))}
            maxTime={new Date(new Date().setHours(19, 0, 0, 0))}
            customInput={<input style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '13px', fontWeight: '500' }}>Davomiyligi (daqiqa) *</label>
        <select
          name="duration_minutes"
          value={formData.duration_minutes}
          onChange={handleChange}
          style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', backgroundColor: 'var(--bg-card)' }}
        >
          <option value={15}>15 daqiqa (Konsultatsiya)</option>
          <option value={30}>30 daqiqa (Standart)</option>
          <option value={60}>1 soat (Kengaytirilgan)</option>
          <option value={90}>1.5 soat (Murakkab)</option>
          <option value={120}>2 soat (Jarrohlik)</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '13px', fontWeight: '500' }}>Izoh</label>
        <textarea
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleChange}
          placeholder="Tashrif sababi yoki qo'shimcha ma'lumotlar..."
          style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
        <button 
          type="button" 
          onClick={onCancel}
          style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: '500', cursor: 'pointer', backgroundColor: 'transparent' }}
        >
          Bekor qilish
        </button>
        <button 
          type="submit"
          disabled={loading || (!isNewPatient && !formData.patient_id)}
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontWeight: '600',
            opacity: loading || (!isNewPatient && !formData.patient_id) ? 0.7 : 1,
            cursor: loading || (!isNewPatient && !formData.patient_id) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Saqlanmoqda...' : 'Qabulga yozish'}
        </button>
      </div>
    </form>
  )
}
