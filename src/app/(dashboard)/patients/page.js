'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import { Search, Plus, Calendar, Phone, User as UserIcon, Filter, Edit2, Trash2, Clock } from 'lucide-react'
import Link from 'next/link'
import AppointmentForm from '@/components/AppointmentForm'

export default function PatientsPage() {
  const { clinic, isLoading: clinicLoading } = useClinic()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState(null)
  
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
          .select('*, appointments(start_time, status), treatment_plans(id, status, created_at, treatment_items(status))')
          .eq('clinic_id', clinic.id)

        const { data, error } = await query

        if (error) throw error
        
        // Compute last/next visits
        const enhancedData = (data || []).map(patient => {
          const completed = (patient.appointments || []).filter(a => a.status === 'completed').sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
          const future = (patient.appointments || []).filter(a => ['scheduled', 'confirmed', 'in_progress'].includes(a.status)).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
          return {
            ...patient,
            lastVisit: completed.length > 0 ? completed[0].start_time : null,
            nextVisit: future.length > 0 ? future[0].start_time : null
          }
        })
        
        setPatients(enhancedData)
      } catch (error) {
        console.error('Bemorlarni yuklashda xatolik:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPatients()
  }, [clinic, clinicLoading])

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
          onClick={() => setIsAppointmentModalOpen(true)}
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
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Qo'shilgan sana</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Tashriflar holati</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>Protseduralar</th>
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
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} />
                        {new Date(patient.created_at).toLocaleDateString('uz-UZ')}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px' }}>Oxirgi: {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('uz-UZ') : '—'}</span>
                        <span style={{ fontSize: '12px' }}>Keyingi: {patient.nextVisit ? new Date(patient.nextVisit).toLocaleDateString('uz-UZ') : '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {patient.treatment_plans && patient.treatment_plans.length > 0 ? (
                          patient.treatment_plans.filter(p => p.status === 'active').map(plan => {
                            const items = plan.treatment_items || []
                            const total = items.length
                            const completed = items.filter(i => i.status === 'completed').length
                            return (
                              <div key={plan.id} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: completed === total && total > 0 ? '#10B981' : '#F59E0B' }} />
                                {completed}/{total} bajarildi
                              </div>
                            )
                          })
                        ) : (
                          <span style={{ fontSize: '12px' }}>Davolash rejasi yo'q</span>
                        )}
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
                          onClick={(e) => { e.stopPropagation(); setEditingPatient(patient); }} 
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

      {isAppointmentModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Yangi bemor qo'shish</h2>
            <AppointmentForm
               defaultIsNewPatient={true}
               onSuccess={() => {
                 setIsAppointmentModalOpen(false)
                 window.location.reload() // Or re-fetch patients
               }}
               onCancel={() => setIsAppointmentModalOpen(false)}
            />
          </div>
        </div>
      )}

      {editingPatient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Profilni tahrirlash</h2>
            <AppointmentForm
              patientToEdit={editingPatient}
              onSuccess={() => {
                setEditingPatient(null)
                window.location.reload()
              }}
              onCancel={() => setEditingPatient(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
