'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { Search, Plus, Calendar, Phone, User as UserIcon, Filter, Edit2, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function PatientsPage() {
  const { clinic, isLoading: clinicLoading } = useClinic()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPatientId, setEditingPatientId] = useState(null)
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '+998-',
    date_of_birth: '',
    gender: 'male',
    address: '',
    notes: ''
  })
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest') // newest, oldest, name_asc, name_desc

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (clinicLoading) return
    if (!clinic) return

    async function fetchPatients() {
      setLoading(true)
      try {
        let query = supabase
          .from('patients')
          .select('*')
          .eq('clinic_id', clinic.id)

        const { data, error } = await query

        if (error) throw error
        setPatients(data || [])
      } catch (error) {
        console.error('Bemorlarni yuklashda xatolik:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPatients()
  }, [clinic, clinicLoading])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'phone') {
      let rawValue = value
      if (!rawValue.startsWith('+998-') && rawValue.includes('+998-')) {
         rawValue = rawValue.substring(rawValue.indexOf('+998-'))
      }
      let digits = rawValue.replace(/\D/g, '')
      if (digits.startsWith('998')) digits = digits.substring(3)
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

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPatientId(null)
    setFormData({ full_name: '', phone: '+998-', date_of_birth: '', gender: 'male', address: '', notes: '' })
  }

  const handleEdit = (patient) => {
    setFormData({
      full_name: patient.full_name,
      phone: patient.phone,
      date_of_birth: patient.date_of_birth || '',
      gender: patient.gender || 'male',
      address: patient.address || '',
      notes: patient.notes || ''
    })
    setEditingPatientId(patient.id)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm("Haqiqatan ham bu bemorni o'chirmoqchimisiz? (Barcha tarixi o'chib ketadi)")) return
    try {
      const { error } = await supabase.from('patients').delete().eq('id', id)
      if (error) throw error
      setPatients(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error("O'chirishda xatolik:", err)
      alert("Bemorni o'chirishda xatolik yuz berdi")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingPatientId) {
        const { error } = await supabase
          .from('patients')
          .update({
            ...formData,
            date_of_birth: formData.date_of_birth || null
          })
          .eq('id', editingPatientId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('patients')
          .insert([{
            ...formData,
            clinic_id: clinic.id,
            date_of_birth: formData.date_of_birth || null
          }])
        if (error) throw error
      }
      
      closeModal()
      const { data } = await supabase.from('patients').select('*').eq('clinic_id', clinic.id)
      setPatients(data || [])
    } catch (err) {
      console.error('Saqlashda xatolik:', err)
      alert("Bemorni saqlashda xatolik yuz berdi")
    }
  }

  if (clinicLoading) return <div>Klinika yuklanmoqda...</div>

  // Apply Client-side filtering and sorting
  let filteredPatients = patients.filter(p => {
    const matchesSearch = p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.phone?.includes(searchQuery)
    const matchesGender = genderFilter === 'all' || p.gender === genderFilter
    return matchesSearch && matchesGender
  })

  filteredPatients = filteredPatients.sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sortBy === 'name_asc') return a.full_name.localeCompare(b.full_name)
    if (sortBy === 'name_desc') return b.full_name.localeCompare(a.full_name)
    return 0
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Bemorlar</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Klinika bemorlari ro'yxati (Jami: {patients.length})</p>
        </div>
        <button 
          onClick={() => {
            setEditingPatientId(null)
            setFormData({ full_name: '', phone: '+998-', date_of_birth: '', gender: 'male', address: '', notes: '' })
            setIsModalOpen(true)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--accent)',
            color: 'white',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Plus size={18} />
          Yangi bemor
        </button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Filters Bar */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Ism yoki telefon orqali qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px 10px 40px',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Filter size={16} />
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}>
                <option value="all">Barcha jinslar</option>
                <option value="male">Erkak</option>
                <option value="female">Ayol</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}>
                <option value="newest">Yangi qo'shilganlar</option>
                <option value="oldest">Eski bemorlar</option>
                <option value="name_asc">Ism (A-Z)</option>
                <option value="name_desc">Ism (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Bemor F.I.O</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Telefon raqam</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Tug'ilgan sana</th>
                <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Harakatlar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Bemorlar topilmadi.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr 
                    key={patient.id} 
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                    onClick={() => router.push(`/patients/${patient.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                          <UserIcon size={20} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '500' }}>{patient.full_name}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {patient.gender === 'male' ? 'Erkak' : (patient.gender === 'female' ? 'Ayol' : '')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={14} />
                        {patient.phone}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} />
                        {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('uz-UZ') : '—'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); router.push(`/patients/${patient.id}`); }}
                          style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--accent)', backgroundColor: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                        >
                          Profil
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(patient); }} 
                          style={{ padding: '6px', borderRadius: '4px', border: 'none', backgroundColor: '#DBEAFE', color: '#1E40AF', cursor: 'pointer' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(patient.id); }} 
                          style={{ padding: '6px', borderRadius: '4px', border: 'none', backgroundColor: '#FEE2E2', color: '#991B1B', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>{editingPatientId ? 'Bemorni tahrirlash' : 'Yangi bemor qo\'shish'}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>F.I.O *</label>
                  <input type="text" name="full_name" required value={formData.full_name} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Telefon raqam *</label>
                  <input type="tel" name="phone" required minLength={17} maxLength={17} value={formData.phone} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Tug'ilgan sana</label>
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
                    customInput={<input style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--bg-card)' }} />}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Jinsi</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}>
                    <option value="male">Erkak</option>
                    <option value="female">Ayol</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>Manzili</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>Qo'shimcha ma'lumotlar</label>
                <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={closeModal} style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: '500', cursor: 'pointer', backgroundColor: 'transparent' }}>
                  Bekor qilish
                </button>
                <button type="submit" style={{ padding: '10px 16px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '500', cursor: 'pointer' }}>
                  {editingPatientId ? 'Yangilash' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
