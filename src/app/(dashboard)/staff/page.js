'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import { Plus, User as UserIcon, Mail, Phone, Lock, Filter, Edit } from 'lucide-react'
import { createStaffMember, updateStaffMember } from '@/app/actions/staff'

import RoleGuard from '@/components/RoleGuard'

export default function StaffPage() {
  return (
    <RoleGuard allowed={['admin']}>
      <StaffPageContent />
    </RoleGuard>
  )
}

function StaffPageContent() {
  const { clinic, isLoading: clinicLoading } = useClinic()
  const supabase = createClient()

  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Filters
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchStaff = async () => {
    if (!clinic) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('clinic_id', clinic.id)
        .order('role')
      
      if (error) throw error
      setStaffList(data || [])
    } catch (err) {
      console.error('Xodimlarni yuklashda xatolik:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clinicLoading && clinic) {
      fetchStaff()
    }
  }, [clinic, clinicLoading])

  const handleAddSubmit = async (formData) => {
    setIsSubmitting(true)
    setErrorMsg('')
    
    const result = await createStaffMember(clinic.id, formData)
    
    setIsSubmitting(false)
    
    if (result.error) {
      setErrorMsg(result.error)
    } else {
      setIsAddModalOpen(false)
      fetchStaff()
    }
  }

  const handleEditSubmit = async (formData) => {
    setIsSubmitting(true)
    setErrorMsg('')
    
    const result = await updateStaffMember(selectedStaff.id, formData)
    
    setIsSubmitting(false)
    
    if (result.error) {
      setErrorMsg(result.error)
    } else {
      setIsEditModalOpen(false)
      setSelectedStaff(null)
      fetchStaff()
    }
  }

  const openEditModal = (staff) => {
    setSelectedStaff(staff)
    setErrorMsg('')
    setIsEditModalOpen(true)
  }

  const roleLabels = {
    'admin': 'Admin',
    'dentist': 'Tish shifokori',
    'receptionist': 'Qabulxona xodimi'
  }

  if (clinicLoading) return <div>Yuklanmoqda...</div>

  const filteredStaff = staffList.filter(staff => {
    const matchesRole = roleFilter === 'all' || staff.role === roleFilter
    const matchesStatus = statusFilter === 'all' ? true : (statusFilter === 'active' ? staff.is_active : !staff.is_active)
    return matchesRole && matchesStatus
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Xodimlar</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Klinika shifokorlari va xodimlarini boshqarish</p>
        </div>
        <button 
          onClick={() => { setErrorMsg(''); setIsAddModalOpen(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--accent)', color: 'white', padding: '10px 16px', borderRadius: 'var(--radius-sm)', fontWeight: '500', cursor: 'pointer', border: 'none' }}
        >
          <Plus size={18} />
          Yangi xodim
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Filters */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Filter size={18} color="var(--text-muted)" />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}>
            <option value="all">Barcha lavozimlar</option>
            <option value="admin">Admin</option>
            <option value="dentist">Tish shifokori</option>
            <option value="receptionist">Qabulxona xodimi</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}>
            <option value="all">Barcha holatlar</option>
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
          </select>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Xodim</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Lavozimi</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Telefon</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Holati</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', width: '80px' }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td></tr>
            ) : filteredStaff.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Xodimlar topilmadi</td></tr>
            ) : (
              filteredStaff.map(staff => (
                <tr key={staff.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                        <UserIcon size={18} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '500' }}>{staff.full_name}</span>
                        {staff.specialization && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{staff.specialization}</span>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                    {roleLabels[staff.role] || staff.role}
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{staff.phone || '—'}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                      backgroundColor: staff.is_active ? '#D1FAE5' : '#F3F4F6',
                      color: staff.is_active ? '#065F46' : '#9CA3AF'
                    }}>
                      {staff.is_active ? 'Faol' : 'Nofaol'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <button
                      onClick={() => openEditModal(staff)}
                      title="Tahrirlash"
                      style={{ padding: '6px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADD STAFF MODAL */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Yangi xodim qo'shish</h2>
            
            {errorMsg && (
              <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px' }}>
                {errorMsg}
              </div>
            )}

            <form action={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>F.I.SH. *</label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" name="full_name" required placeholder="Dr. Alisher Valiyev" style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Lavozimi *</label>
                  <select name="role" required style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
                    <option value="dentist">Tish shifokori</option>
                    <option value="admin">Admin</option>
                    <option value="receptionist">Qabulxona</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Ixtisoslashuv</label>
                  <input type="text" name="specialization" placeholder="Jarroh, Ortoped..." style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>Telefon raqam</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" name="phone" placeholder="+998 90 123 45 67" style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" disabled={isSubmitting} onClick={() => setIsAddModalOpen(false)} style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: '500', cursor: 'pointer', backgroundColor: 'transparent' }}>
                  Bekor qilish
                </button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '10px 16px', backgroundColor: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: '500', opacity: isSubmitting ? 0.7 : 1, border: 'none', cursor: 'pointer' }}>
                  {isSubmitting ? 'Qo\'shilmoqda...' : 'Xodim qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {isEditModalOpen && selectedStaff && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Xodimni tahrirlash</h2>
            
            {errorMsg && (
              <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px' }}>
                {errorMsg}
              </div>
            )}

            <form action={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>F.I.SH. *</label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" name="full_name" required defaultValue={selectedStaff.full_name} style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Lavozimi *</label>
                  <select name="role" required defaultValue={selectedStaff.role} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
                    <option value="dentist">Tish shifokori</option>
                    <option value="admin">Admin</option>
                    <option value="receptionist">Qabulxona</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Ixtisoslashuv</label>
                  <input type="text" name="specialization" defaultValue={selectedStaff.specialization || ''} style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>Telefon raqam</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" name="phone" defaultValue={selectedStaff.phone || ''} style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>Holati</label>
                <select name="is_active" required defaultValue={selectedStaff.is_active ? 'true' : 'false'} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
                  <option value="true">Faol</option>
                  <option value="false">Nofaol</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" disabled={isSubmitting} onClick={() => { setIsEditModalOpen(false); setSelectedStaff(null); }} style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: '500', cursor: 'pointer', backgroundColor: 'transparent' }}>
                  Bekor qilish
                </button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '10px 16px', backgroundColor: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: '500', opacity: isSubmitting ? 0.7 : 1, border: 'none', cursor: 'pointer' }}>
                  {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
