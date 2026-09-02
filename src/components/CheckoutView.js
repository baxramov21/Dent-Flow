'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, DollarSign, CheckCircle } from 'lucide-react'

export default function CheckoutView({ appointment, onSuccess, onClose }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [fetching, setFetching] = useState(true)
  const [clinicServices, setClinicServices] = useState([])
  const [expandedCategories, setExpandedCategories] = useState({})
  const [isAddingService, setIsAddingService] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')

  const [amountPaid, setAmountPaid] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  useEffect(() => {
    if (!appointment) return

    async function loadItems() {
      try {
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, name, price, category')
          .eq('clinic_id', appointment.clinic_id)
          .eq('is_active', true)
          .order('name')
          
        setClinicServices(servicesData || [])

        if (!appointment.treatment_plan_id) {
          setItems([])
          setFetching(false)
          return
        }

        const { data, error } = await supabase
          .from('treatment_items')
          .select('id, service_id, price_override, status, services(name, price)')
          .eq('treatment_plan_id', appointment.treatment_plan_id)
          .in('status', ['planned', 'in_progress', 'completed'])

        if (error) throw error
        
        const mapped = (data || []).map(item => ({
          ...item,
          selected: item.status !== 'completed',
          finalPrice: item.price_override
        }))

        setItems(mapped)
      } catch (err) {
        console.error("Error loading items:", err)
      } finally {
        setFetching(false)
      }
    }

    loadItems()
  }, [appointment])

  const toggleItem = (id) => {
    setItems(items.map(item => item.id === id ? { ...item, selected: !item.selected } : item))
  }

  const handlePriceChange = (id, newPrice) => {
    setItems(items.map(item => item.id === id ? { ...item, finalPrice: Number(newPrice) } : item))
  }

  const handleAddService = (srvId) => {
    const srv = clinicServices.find(s => s.id === srvId)
    if (!srv) return

    const newItem = {
      id: `temp_${Date.now()}_${Math.random()}`,
      service_id: srv.id,
      price_override: srv.price,
      finalPrice: srv.price,
      status: 'planned',
      services: { name: srv.name },
      selected: true,
      isNew: true
    }
    
    setItems([...items, newItem])
  }

  const handleAddNewCustomService = async () => {
    if (!newServiceName.trim() || !newServicePrice) return
    const priceValue = parseInt(newServicePrice)
    
    const { data, error } = await supabase.from('services').insert([{
       clinic_id: appointment.clinic_id,
       name: newServiceName,
       price: priceValue,
       is_active: true
    }]).select().single()

    if (!error && data) {
       setClinicServices(prev => [...prev, data])
       setExpandedCategories(prev => ({ ...prev, [data.category || 'Boshqa']: true }))
       setNewServiceName('')
       setNewServicePrice('')
       setIsAddingService(false)
       
       const newItem = {
         id: `temp_${Date.now()}_${Math.random()}`,
         service_id: data.id,
         price_override: data.price,
         finalPrice: data.price,
         status: 'planned',
         services: { name: data.name },
         selected: true,
         isNew: true
       }
       setItems(prevItems => [...prevItems, newItem])
    }
  }

  const totalCost = items
    .filter(i => i.selected)
    .reduce((sum, i) => sum + (Number(i.finalPrice) || 0), 0)

  const paidVal = Number(amountPaid) || 0
  const remainingBalance = Math.max(0, totalCost - paidVal)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const selectedItems = items.filter(i => i.selected)
      
      let currentPlanId = appointment.treatment_plan_id
      
      // If no treatment plan exists and we have items, create one
      if (!currentPlanId && selectedItems.length > 0) {
        const { data: newPlan, error: pErr } = await supabase
          .from('treatment_plans')
          .insert([{
            clinic_id: appointment.clinic_id,
            patient_id: appointment.patient_id,
            dentist_id: appointment.dentist_id,
            title: 'Tezkor qabul rejasi',
            status: 'active'
          }])
          .select('id').single()
          
        if (pErr) throw pErr
        currentPlanId = newPlan.id
        
        // Link to appointment immediately
        await supabase
          .from('appointments')
          .update({ treatment_plan_id: currentPlanId })
          .eq('id', appointment.id)
      }
      
      // 1. Update treatment items
      if (selectedItems.length > 0) {
        for (const item of selectedItems) {
          if (item.isNew) {
            await supabase
              .from('treatment_items')
              .insert({
                treatment_plan_id: currentPlanId,
                service_id: item.service_id,
                status: 'completed',
                price_override: item.finalPrice,
                completed_at: new Date().toISOString()
              })
          } else {
            await supabase
              .from('treatment_items')
              .update({
                status: 'completed',
                price_override: item.finalPrice,
                completed_at: new Date().toISOString()
              })
              .eq('id', item.id)
          }
        }
      }

      // 2. Determine Payment Status
      let paymentStatus = 'unpaid'
      if (paidVal >= totalCost && totalCost > 0) paymentStatus = 'paid'
      else if (paidVal > 0) paymentStatus = 'partially_paid'
      else if (totalCost === 0) paymentStatus = 'paid'

      // 3. Update Appointment
      const { error: apptError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          payment_status: paymentStatus,
          total_cost: totalCost
        })
        .eq('id', appointment.id)

      if (apptError) throw apptError

      // 4. Log Payment if paidVal > 0
      if (paidVal > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert([{
            clinic_id: appointment.clinic_id,
            patient_id: appointment.patient_id,
            treatment_plan_id: currentPlanId,
            appointment_id: appointment.id,
            amount: paidVal,
            payment_method: paymentMethod,
            notes: 'Avtomatik to\'lov (Qabul yakunlanganda)'
          }])
        if (paymentError) throw paymentError
      }

      // 5. Update Patient Debt
      if (remainingBalance > 0) {
        const { data: patient, error: pError } = await supabase
          .from('patients')
          .select('total_debt')
          .eq('id', appointment.patient_id)
          .single()
        
        if (!pError) {
          const currentDebt = patient.total_debt || 0
          await supabase
            .from('patients')
            .update({ total_debt: currentDebt + remainingBalance })
            .eq('id', appointment.patient_id)
        }
      }

      onSuccess()
    } catch (err) {
      console.error("Error during checkout:", err)
      alert("Xatolik yuz berdi: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', padding: '16px', backgroundColor: 'var(--bg-card)' }}>

        {fetching ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Yuklanmoqda...</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Service Catalog (Accordion) */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Klinika xizmatlari (Qo'shish)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {Object.entries(
                  clinicServices.reduce((acc, s) => {
                    const cat = s.category || 'Boshqa'
                    if (!acc[cat]) acc[cat] = []
                    acc[cat].push(s)
                    return acc
                  }, {})
                ).map(([category, srvs]) => (
                  <div key={category} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <button type="button" onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--bg-card)', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                      {category}
                      <span style={{ color: 'var(--text-muted)' }}>{expandedCategories[category] ? '▼' : '▶'}</span>
                    </button>
                    {expandedCategories[category] && (
                      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'white', borderTop: '1px solid var(--border)' }}>
                        {srvs.map(s => (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bg-hover)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{s.name}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{(s.price).toLocaleString()} UZS</span>
                            </div>
                            <button type="button" onClick={() => handleAddService(s.id)} style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)', backgroundColor: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                              + Qo'shish
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Treatment Items Selection (Cart) */}
            <div style={{ borderTop: '2px dashed var(--border)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bajarilgan xizmatlar (Ro'yxat)</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {items.length === 0 && (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Xizmatlar yo'q. Yuqoridan yoki pastdan yangi xizmat qo'shing.</p>
                )}
                
                {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: item.selected ? 'var(--bg-hover)' : 'transparent' }}>
                      <input 
                        type="checkbox" 
                        checked={item.selected} 
                        onChange={() => toggleItem(item.id)}
                        disabled={item.status === 'completed'}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: item.status === 'completed' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                          {item.services?.name}
                        </span>
                        {item.status === 'completed' && <span style={{ fontSize: '11px', color: '#065F46' }}>Avvalgi qabulda yakunlangan</span>}
                      </div>
                      
                      {item.selected && item.status !== 'completed' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Narx (so'm):</span>
                          <input 
                            type="number" 
                            value={item.finalPrice || ''}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                            style={{ width: '100px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
              
              {!isAddingService ? (
                <button type="button" onClick={() => setIsAddingService(true)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', color: 'var(--accent)', backgroundColor: 'transparent', border: '1px dashed var(--accent)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '500', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  + Boshqa xizmat (ad-hoc) qo'shish
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px', padding: '12px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Xizmat nomi (Masalan: Ukol qilish)" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} style={{ flex: 1, minWidth: '150px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', outline: 'none' }} />
                  <input type="number" placeholder="Narxi (so'm)" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} style={{ width: '220px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', outline: 'none' }} />
                  <button type="button" onClick={handleAddNewCustomService} style={{ padding: '8px 16px', backgroundColor: 'var(--text-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>Qo'shish</button>
                  <button type="button" onClick={() => setIsAddingService(false)} style={{ padding: '8px 12px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Bekor qilish</button>
                </div>
              )}
            </div>

            <hr style={{ borderTop: '1px solid var(--border)' }} />

            {/* Totals & Payment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>Umumiy Summa (Jami)</label>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalCost.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>so'm</span></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>To'lov Turi</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none', fontSize: '14px' }}>
                  <option value="cash">Naqd</option>
                  <option value="card">Plastik karta (Humo/Uzcard)</option>
                  <option value="transfer">Pul o'tkazma (Click/Payme)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>Bugun To'landi</label>
                <input 
                  type="number" 
                  value={amountPaid} 
                  onChange={(e) => setAmountPaid(e.target.value)} 
                  placeholder="Summani kiriting"
                  style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none', fontSize: '16px', fontWeight: '500' }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>Qoldiq (Bir qismini keyinroq to'lash)</label>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: remainingBalance > 0 ? '#991B1B' : '#065F46' }}>
                  {remainingBalance.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>so'm</span>
                </div>
              </div>
            </div>

            {remainingBalance > 0 && (
              <div style={{ padding: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-sm)', color: '#991B1B', fontSize: '13px' }}>
                <strong>Eslatma:</strong> Qoldiq summa bemorning umumiy qarziga avtomatik qo'shiladi.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button type="button" onClick={onClose} style={{ padding: '12px 24px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: '500', color: 'var(--text-secondary)' }}>
                Bekor qilish
              </button>
              <button type="submit" disabled={loading} style={{ padding: '12px 24px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: '#065F46', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loading ? 'Saqlanmoqda...' : <><CheckCircle size={18} /> Qabulni yakunlash</>}
              </button>
            </div>
          </form>
        )}
      </div>
  )
}
