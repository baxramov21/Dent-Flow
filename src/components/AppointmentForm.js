'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import DatePicker, { registerLocale } from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import uz from 'date-fns/locale/uz'
import CheckoutView from '@/components/CheckoutView'
import { Calendar, CreditCard } from 'lucide-react'

registerLocale('uz', uz)

export default function AppointmentForm({ initialData = null, patientToEdit = null, onSuccess, onCancel, defaultIsNewPatient = false }) {
  const { clinic } = useClinic()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Data for dropdowns
  const [patients, setPatients] = useState([])
  const [dentists, setDentists] = useState([])
  const [uniqueAddresses, setUniqueAddresses] = useState([])
  
  // Form State
  const [formData, setFormData] = useState({
    patient_id: initialData?.patient_id || '',
    dentist_id: initialData?.dentist_id || '',
    date: initialData ? new Date(new Date(initialData.start_time).getTime() + (5 * 60 * 60 * 1000)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], // UTC+5 offset fix
    start_time: initialData ? new Date(new Date(initialData.start_time).getTime() + (5 * 60 * 60 * 1000)).toISOString().substring(11, 16) : '09:00',
    duration_minutes: initialData ? Math.round((new Date(initialData.end_time) - new Date(initialData.start_time)) / 60000) : 30,
    notes: initialData?.notes || ''
  })
  
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'checkout'

  // New Patient State
  const [isNewPatient, setIsNewPatient] = useState(defaultIsNewPatient || !!patientToEdit)
  const [scheduleAppointment, setScheduleAppointment] = useState(true)
  const [newPatientData, setNewPatientData] = useState({
    full_name: patientToEdit?.full_name || '',
    phone: patientToEdit?.phone || '+998-',
    date_of_birth: patientToEdit?.date_of_birth || '',
    gender: patientToEdit?.gender || 'male',
    address: patientToEdit?.address || '',
    condition: ''
  })

  // Services State
  const [services, setServices] = useState([])
  const [selectedServices, setSelectedServices] = useState({}) // { id: quantity }
  const [expandedCategories, setExpandedCategories] = useState({}) // { categoryName: boolean }
  const [isAddingService, setIsAddingService] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  const [patientFinancials, setPatientFinancials] = useState(null)

  useEffect(() => {
    if (!clinic) return

    async function loadDropdownData() {
      try {
        const [patientsRes, staffRes, servicesRes] = await Promise.all([
          supabase.from('patients').select('id, full_name, address').eq('clinic_id', clinic.id).order('full_name'),
          supabase.from('staff').select('id, full_name, specialization').eq('clinic_id', clinic.id).eq('role', 'dentist'),
          supabase.from('services').select('id, name, price, category').eq('clinic_id', clinic.id).eq('is_active', true).order('name')
        ])

        if (patientsRes.error) throw patientsRes.error
        if (staffRes.error) throw staffRes.error
        if (servicesRes.error) throw servicesRes.error

        setPatients(patientsRes.data || [])
        setDentists(staffRes.data || [])
        setServices(servicesRes.data || [])

        const unique = [...new Set((patientsRes.data || []).map(p => p.address).filter(Boolean))]
        setUniqueAddresses(unique)

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

  useEffect(() => {
    async function loadPatientData() {
      if (!formData.patient_id || !clinic) {
        setPatientFinancials(null)
        if (!initialData) setSelectedServices({})
        return
      }

      let planIdToLoad = initialData?.treatment_plan_id
      if (!planIdToLoad) {
        const { data: activePlan } = await supabase
          .from('treatment_plans')
          .select('id')
          .eq('patient_id', formData.patient_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (activePlan) planIdToLoad = activePlan.id
      }

      if (planIdToLoad) {
        const { data: existingItems } = await supabase
          .from('treatment_items')
          .select('service_id')
          .eq('treatment_plan_id', planIdToLoad)
          .in('status', ['planned', 'in_progress'])
        
        if (existingItems) {
          const sel = {}
          existingItems.forEach(item => {
            sel[item.service_id] = (sel[item.service_id] || 0) + 1
          })
          setSelectedServices(sel)
        }
      }

      const [itemsRes, paymentsRes] = await Promise.all([
        supabase.from('treatment_items').select('price_override, treatment_plans!inner(patient_id)').eq('status', 'completed').eq('treatment_plans.patient_id', formData.patient_id).not('price_override', 'is', null),
        supabase.from('payments').select('amount').eq('patient_id', formData.patient_id)
      ])

      const totalBilled = (itemsRes.data || []).reduce((sum, i) => sum + (i.price_override || 0), 0)
      const totalPaid = (paymentsRes.data || []).reduce((sum, p) => sum + (p.amount || 0), 0)
      const debt = Math.max(0, totalBilled - totalPaid)

      setPatientFinancials({ totalBilled, totalPaid, debt })
    }
    
    loadPatientData()
  }, [formData.patient_id, clinic, initialData, supabase])

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
      // Create full ISO strings for start and end
      const startDateTime = new Date(`${formData.date}T${formData.start_time}:00`)
      const endDateTime = new Date(startDateTime.getTime() + (parseInt(formData.duration_minutes) || 30) * 60000)

      let finalPatientId = formData.patient_id
      let planId = null

      if (isNewPatient) {
        if (!newPatientData.full_name.trim()) throw new Error("Bemor ismini kiriting")
        if (newPatientData.phone.length < 17) throw new Error("Telefon raqamini to'liq kiriting (+998-xx-xxx-xx-xx)")
        if (!newPatientData.date_of_birth) throw new Error("Tug'ilgan sanani kiriting")
        
        if (patientToEdit) {
          // Update existing patient
          const { error: patError } = await supabase
            .from('patients')
            .update({
              full_name: newPatientData.full_name,
              phone: newPatientData.phone,
              date_of_birth: newPatientData.date_of_birth || null,
              gender: newPatientData.gender,
              address: newPatientData.address || null
            })
            .eq('id', patientToEdit.id)
            
          if (patError) throw patError
          finalPatientId = patientToEdit.id
        } else {
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
        }

        // 1.5 Add Medical History if provided
        if (newPatientData.condition.trim() && newPatientData.condition.trim().toLowerCase() !== "yo'q") {
           await supabase.from('medical_history').insert([{
             clinic_id: clinic.id,
             patient_id: finalPatientId,
             condition: newPatientData.condition
           }])
        }

        if (!scheduleAppointment) {
          onSuccess()
          return
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


      if (initialData?.id) {
        // Update existing appointment
        const { data, error: updateError } = await supabase
          .from('appointments')
          .update({
            dentist_id: formData.dentist_id,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            notes: formData.notes
          })
          .eq('id', initialData.id)
          .select()
          .single()

        if (updateError) throw updateError
        onSuccess(data)
        return
      }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Tab Navigation when editing an existing patient */}
      {patientToEdit && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            style={{
              padding: '12px 24px', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              border: 'none', borderBottom: activeTab === 'details' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'details' ? 'var(--accent)' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
            }}
          >
            <Calendar size={16} /> Bemor Ma'lumotlari
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checkout')}
            style={{
              padding: '12px 24px', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              border: 'none', borderBottom: activeTab === 'checkout' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'checkout' ? 'var(--accent)' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
            }}
          >
            <CreditCard size={16} /> Muolajalar va To'lov
          </button>
        </div>
      )}

      {error && (
        <div style={{ position: 'fixed', top: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '16px 24px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: '500', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '400px', animation: 'modalSlideUp 0.3s ease-out' }}>
          <div style={{ fontSize: '20px' }}>⚠️</div>
          <div style={{ flex: 1, lineHeight: '1.4' }}>{error}</div>
          <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#991B1B', fontSize: '24px', cursor: 'pointer', padding: '0 4px', lineHeight: '1' }}>&times;</button>
        </div>
      )}

      <div style={{ display: activeTab === 'details' ? 'block' : 'none' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Segmented Control for Patient Type - Only show when creating NEW appointment and not editing a patient */}
          {!initialData?.id && !patientToEdit && (
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
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!isNewPatient || initialData?.id ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>{initialData?.id ? 'Bemor' : 'Bemorni tanlang *'}</label>
            <select
              name="patient_id"
              required={!isNewPatient}
              value={formData.patient_id}
              onChange={handleChange}
              disabled={!!initialData?.id}
              style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', backgroundColor: initialData?.id ? 'var(--bg-hover)' : 'var(--bg-card)' }}
            >
              <option value="" disabled>Bemorni tanlang...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
            {patients.length === 0 && !initialData?.id && (
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
                  selected={
                    newPatientData.date_of_birth && !isNaN(new Date(newPatientData.date_of_birth).getTime())
                      ? new Date(newPatientData.date_of_birth)
                      : null
                  }
                  onChange={(date) => {
                    if (!date || isNaN(date.getTime())) return;
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    setNewPatientData(prev => ({ ...prev, date_of_birth: `${year}-${month}-${day}` }));
                  }}
                  onChangeRaw={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length > 8) val = val.substring(0, 8);
                    
                    let formatted = val;
                    if (val.length > 2) {
                       formatted = val.substring(0, 2) + '.' + val.substring(2);
                    }
                    if (val.length > 4) {
                       formatted = val.substring(0, 2) + '.' + val.substring(2, 4) + '.' + val.substring(4);
                    }
                    e.target.value = formatted;

                    if (!e.target.value) {
                      setNewPatientData(prev => ({ ...prev, date_of_birth: '' }));
                    }
                  }}
                  locale="uz"
                  dateFormat="dd.MM.yyyy"
                  placeholderText="dd.mm.yyyy"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  isClearable
                  customInput={<input maxLength={10} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--bg-card)' }} />}
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
                list="address-suggestions-modal"
                placeholder="Yashash manzili"
                required={isNewPatient}
                value={newPatientData.address}
                onChange={handleNewPatientChange}
                style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
              <datalist id="address-suggestions-modal">
                {uniqueAddresses.map(addr => (
                  <option key={addr} value={addr} />
                ))}
              </datalist>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500' }}>Tibbiy holati / Kasalliklari</label>
              <input
                type="text"
                name="condition"
                placeholder="Allergiyalar, surunkali kasalliklar (bo'sh qoldirilsa 'Yo'q' deb olinadi)..."
                value={newPatientData.condition}
                onChange={handleNewPatientChange}
                style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}
      </div>

          <hr style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />

      {!isNewPatient && formData.patient_id && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '-8px' }}>Bemor Qarzdorligi (Hisoboti)</h3>
          {patientFinancials ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '12px', backgroundColor: patientFinancials.debt > 0 ? '#FEF2F2' : '#F8FAFC', border: patientFinancials.debt > 0 ? '1px solid #FECACA' : '1px solid #E2E8F0', borderRadius: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Jami xizmatlar</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{patientFinancials.totalBilled.toLocaleString()} UZS</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>To'langan</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#15803D' }}>{patientFinancials.totalPaid.toLocaleString()} UZS</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', color: patientFinancials.debt > 0 ? '#B91C1C' : 'var(--text-secondary)' }}>Qarzdorlik</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: patientFinancials.debt > 0 ? '#B91C1C' : 'var(--text-primary)' }}>{patientFinancials.debt.toLocaleString()} UZS</span>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Yuklanmoqda...</span>
          )}
          <hr style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
        </>
      )}

      {isNewPatient && (
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={scheduleAppointment} 
              onChange={(e) => setScheduleAppointment(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Bemor uchun yangi qabul belgilash</span>
          </label>
        </div>
      )}

      {(scheduleAppointment || !isNewPatient) && (
        <>
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
        <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>Shifokor *</label>
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
          <label style={{ fontSize: '13px', fontWeight: '500' }}>Kelgan vaqti *</label>
          <input 
            type="time" 
            name="start_time" 
            required 
            value={formData.start_time} 
            onChange={handleChange} 
            style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
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
      </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
          Bekor qilish
        </button>
        <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--accent)', color: 'white', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Saqlanmoqda...' : (isNewPatient && !scheduleAppointment ? 'Bemorni saqlash' : (initialData?.id ? 'O\'zgarishlarni saqlash' : 'Qabulga yozish'))}
        </button>
      </div>
        </form>
      </div>

      {activeTab === 'checkout' && patientToEdit && (
        <CheckoutView 
          patient={patientToEdit} 
          clinicId={clinic.id} 
          dentistId={formData.dentist_id} 
          onSuccess={() => {
             alert('Muvaffaqiyatli saqlandi!')
             if(onSuccess) onSuccess()
          }}
          onClose={onCancel}
        />
      )}
    </div>
  )
}
