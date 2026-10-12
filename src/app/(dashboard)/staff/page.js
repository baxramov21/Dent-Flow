'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import { Plus, User as UserIcon, Mail, Phone, Lock, Filter, Edit, Trash2, AlertTriangle, AlertCircle } from 'lucide-react'
import { createStaffMember, updateStaffMember, deleteStaffMember, deactivateStaffMember, getStaffDeletionInfo } from '@/app/actions/staff'

import RoleGuard from '@/components/RoleGuard'

export default function StaffPage() {
  return (
    <RoleGuard allowed={['admin']}>
      <StaffPageContent />
    </RoleGuard>
  )
}

function StaffPageContent() {
  const { clinic, staffProfile, isLoading: clinicLoading } = useClinic()
  const supabase = createClient()

  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState(null)
  const [deleteInfoLoading, setDeleteInfoLoading] = useState(false)
  const [deletionInfo, setDeletionInfo] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  
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

  const openDeleteModal = async (staff) => {
    setStaffToDelete(staff)
    setDeleteError('')
    setDeletionInfo(null)
    setDeleteInfoLoading(true)
    setIsDeleteModalOpen(true)

    const res = await getStaffDeletionInfo(staff.id)
    setDeleteInfoLoading(false)
    if (res.error) {
      setDeleteError(res.error)
    } else {
      setDeletionInfo(res)
    }
  }

  const handleDeleteConfirm = async (force = false) => {
    if (!staffToDelete) return
    setDeleteSubmitting(true)
    setDeleteError('')

    const res = await deleteStaffMember(staffToDelete.id, { force })
    setDeleteSubmitting(false)

    if (res.error) {
      setDeleteError(res.error)
      if (res.hasRecords && !force) {
        setDeletionInfo({
          hasRecords: true,
          appointmentCount: res.appointmentCount || 0,
          planCount: res.planCount || 0
        })
      }
    } else {
      setIsDeleteModalOpen(false)
      setStaffToDelete(null)
      fetchStaff()
    }
  }

  const handleDeactivateConfirm = async () => {
    if (!staffToDelete) return
    setDeleteSubmitting(true)
    setDeleteError('')

    const res = await deactivateStaffMember(staffToDelete.id)
    setDeleteSubmitting(false)

    if (res.error) {
      setDeleteError(res.error)
    } else {
      setIsDeleteModalOpen(false)
      setStaffToDelete(null)
      fetchStaff()
    }
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
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Komissiya (%)</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Holati</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', width: '100px' }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td></tr>
            ) : filteredStaff.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Xodimlar topilmadi</td></tr>
            ) : (
              filteredStaff.map(staff => {
                const isSelf = staffProfile?.id === staff.id
                return (
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
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{staff.default_commission_rate ? `${staff.default_commission_rate}%` : '0%'}</td>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(staff)}
                          title="Tahrirlash"
                          style={{ padding: '6px', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(staff)}
                          title={isSelf ? "O'zingizni o'chira olmaysiz" : "O'chirish"}
                          disabled={isSelf}
                          style={{
                            padding: '6px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            cursor: isSelf ? 'not-allowed' : 'pointer',
                            color: isSelf ? 'var(--text-muted)' : '#EF4444',
                            opacity: isSelf ? 0.35 : 1
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Telefon raqam</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" name="phone" placeholder="+998 90 123 45 67" style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Standart komissiya (%)</label>
                  <input type="number" name="default_commission_rate" defaultValue={0} min={0} max={100} style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Telefon raqam</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" name="phone" defaultValue={selectedStaff.phone || ''} style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Standart komissiya (%)</label>
                  <input type="number" name="default_commission_rate" defaultValue={selectedStaff.default_commission_rate || 0} min={0} max={100} style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
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

      {/* DELETE STAFF MODAL */}
      {isDeleteModalOpen && staffToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', flexShrink: 0 }}>
                <Trash2 size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Xodimni o'chirish</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Xodimni tizimdan olib tashlash yoki nofaol qilish</p>
              </div>
            </div>

            {deleteError && (
              <div style={{ padding: '12px 14px', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Staff info card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', border: '1px solid var(--border)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <UserIcon size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: '600', fontSize: '15px' }}>{staffToDelete.full_name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {roleLabels[staffToDelete.role] || staffToDelete.role} {staffToDelete.specialization ? `• ${staffToDelete.specialization}` : ''} {staffToDelete.phone ? `• ${staffToDelete.phone}` : ''}
                </span>
              </div>
            </div>

            {deleteInfoLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Bog'langan ma'lumotlar tekshirilmoqda...
              </div>
            ) : deletionInfo?.hasRecords ? (
              <div>
                <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', padding: '14px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
                  <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '13px', color: '#92400E', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Bog'langan ma'lumotlar mavjud!</div>
                    <div>Ushbu shifokorga bog'langan <strong>{deletionInfo.appointmentCount} ta qabul</strong>{deletionInfo.planCount > 0 ? ` va ${deletionInfo.planCount} ta davolash rejasi` : ''} mavjud.</div>
                    <div style={{ marginTop: '6px', color: '#78350F' }}>
                      Bemorlar tarixini saqlab qolish uchun shifokorni <strong>Nofaol</strong> holatga o'tkazish tavsiya etiladi.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={handleDeactivateConfirm}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '500',
                      cursor: 'pointer',
                      border: 'none',
                      fontSize: '14px',
                      opacity: deleteSubmitting ? 0.7 : 1
                    }}
                  >
                    {deleteSubmitting ? 'Bajarilmoqda...' : 'Nofaol qilish (Tavsiya etiladi)'}
                  </button>

                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={() => handleDeleteConfirm(true)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: '#FEE2E2',
                      color: '#DC2626',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '500',
                      cursor: 'pointer',
                      border: '1px solid #FCA5A5',
                      fontSize: '14px',
                      opacity: deleteSubmitting ? 0.7 : 1
                    }}
                  >
                    <Trash2 size={16} />
                    {deleteSubmitting ? 'O\'chirilmoqda...' : 'Butunlay o\'chirish (Qabullar bilan birga)'}
                  </button>

                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={() => { setIsDeleteModalOpen(false); setStaffToDelete(null); }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '500',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                  Haqiqatan ham ushbu xodimni butunlay o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={() => { setIsDeleteModalOpen(false); setStaffToDelete(null); }}
                    style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: '500', cursor: 'pointer', backgroundColor: 'transparent', fontSize: '14px' }}
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={() => handleDeleteConfirm(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: '#DC2626',
                      color: 'white',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: '500',
                      cursor: 'pointer',
                      border: 'none',
                      fontSize: '14px',
                      opacity: deleteSubmitting ? 0.7 : 1
                    }}
                  >
                    <Trash2 size={16} />
                    {deleteSubmitting ? 'O\'chirilmoqda...' : 'O\'chirish'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

