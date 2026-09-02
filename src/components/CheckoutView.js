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
  const [selectedServiceId, setSelectedServiceId] = useState('')

  const [amountPaid, setAmountPaid] = useState('')

  useEffect(() => {
    if (!appointment) return

    async function loadItems() {
      try {
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
        
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, name, price')
          .eq('clinic_id', appointment.clinic_id)
          .eq('is_active', true)
          .order('name')
          
        setClinicServices(servicesData || [])

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

  const handleAddService = () => {
    if (!selectedServiceId) return
    const srv = clinicServices.find(s => s.id === selectedServiceId)
    if (!srv) return

    const newItem = {
      id: `temp_${Date.now()}`,
      service_id: srv.id,
      price_override: srv.price,
      finalPrice: srv.price,
      status: 'planned',
      services: { name: srv.name },
      selected: true,
      isNew: true
    }
    
    setItems([...items, newItem])
    setSelectedServiceId('')
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
      
      // 1. Update treatment items
      if (selectedItems.length > 0) {
        for (const item of selectedItems) {
          if (item.isNew) {
            await supabase
              .from('treatment_items')
              .insert({
                treatment_plan_id: appointment.treatment_plan_id,
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
            treatment_plan_id: appointment.treatment_plan_id,
            appointment_id: appointment.id,
            amount: paidVal,
            payment_method: paymentMethod
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
            
            {/* Treatment Items Selection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bajarilgan xizmatlar</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    style={{ padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
                  >
                    <option value="">+ Xizmat qo'shish</option>
                    {clinicServices.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.price} so'm)</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddService}
                    disabled={!selectedServiceId}
                    style={{ padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: selectedServiceId ? 'var(--accent)' : 'var(--bg-hover)', color: selectedServiceId ? 'white' : 'var(--text-secondary)', cursor: selectedServiceId ? 'pointer' : 'not-allowed' }}
                  >
                    Qo'shish
                  </button>
                </div>
              </div>
              
              {items.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Xizmatlar yo'q. Yangi xizmat qo'shing.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
