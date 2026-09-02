'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, CheckCircle } from 'lucide-react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"

export default function EditPatientModal({ patient, onClose, onSuccess }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    full_name: patient.full_name || '',
    phone: patient.phone || '',
    date_of_birth: patient.date_of_birth || '',
    gender: patient.gender || 'male',
    address: patient.address || ''
  })

  const handleChange = (e) => {
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

      setFormData(prev => ({ ...prev, [name]: formatted }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!formData.full_name.trim()) {
      setError("Bemor ismini kiriting")
      setLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender,
          address: formData.address || null
        })
        .eq('id', patient.id)

      if (updateError) throw updateError
      
      onSuccess()
    } catch (err) {
      console.error("Failed to update patient:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Profilni tahrirlash</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px', border: '1px solid #FCA5A5' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500' }}>F.I.O *</label>
            <input
              type="text"
              name="full_name"
              required
              value={formData.full_name}
              onChange={handleChange}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500' }}>Telefon *</label>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500' }}>Tug'ilgan sana</label>
              <DatePicker
                selected={formData.date_of_birth ? new Date(formData.date_of_birth) : null}
                onChange={(date) => {
                  const formattedDate = date ? date.toISOString().split('T')[0] : '';
                  setFormData(prev => ({ ...prev, date_of_birth: formattedDate }));
                }}
                dateFormat="dd.MM.yyyy"
                placeholderText="dd.mm.yyyy"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                isClearable
                customInput={<input style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500' }}>Jinsi</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="male">Erkak</option>
                <option value="female">Ayol</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500' }}>Manzili</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: '500', color: 'var(--text-secondary)' }}>
              Bekor qilish
            </button>
            <button type="submit" disabled={loading} style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--accent)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '500', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {loading ? 'Saqlanmoqda...' : <><CheckCircle size={16} /> O'zgarishlarni saqlash</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
