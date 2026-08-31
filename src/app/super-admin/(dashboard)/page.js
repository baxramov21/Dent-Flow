'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Shield, CheckCircle, XCircle, Search, Plus, Key, Settings, UserPlus, BarChart3 } from 'lucide-react'
import { 
  createNewClinicAction, 
  updateAdminCredentialsAction, 
  updateSubscriptionDateAction,
  assignAdminToClinicAction,
  getClinicStatsAction,
  fetchClinicsWithAdminsAction
} from '@/app/actions/super-admin'

export default function SuperAdminDashboard() {
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [credentialsModal, setCredentialsModal] = useState(null) // { userId, username }
  const [showSettingsModal, setShowSettingsModal] = useState(false) // Settings modal for self
  const [showAssignAdminModal, setShowAssignAdminModal] = useState(null) // holds clinic_id
  const [showStatsModal, setShowStatsModal] = useState(null) // holds clinic_id

  // Form states
  const [newClinic, setNewClinic] = useState({ name: '', username: '', password: '', date: '' })
  const [credUpdates, setCredUpdates] = useState({ username: '', password: '' })
  const [myNewPassword, setMyNewPassword] = useState('')
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' })
  
  // Stats state
  const [clinicStats, setClinicStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchClinics()
  }, [])

  const fetchClinics = async () => {
    setLoading(true)
    const res = await fetchClinicsWithAdminsAction()
    if (res.success) {
      setClinics(res.clinics)
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/super-admin/login')
  }

  const toggleStatus = async (id, currentStatus) => {
    const { error } = await supabase
      .from('clinics')
      .update({ is_active: !currentStatus })
      .eq('id', id)
    
    if (!error) fetchClinics()
    else alert("Xatolik yuz berdi")
  }

  const handleUpdateDate = async (clinicId, newDate) => {
    if (!newDate) return
    const res = await updateSubscriptionDateAction(clinicId, new Date(newDate).toISOString())
    if (res.success) fetchClinics()
    else alert(res.error)
  }

  const handleCreateClinic = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const res = await createNewClinicAction({
      clinicName: newClinic.name,
      username: newClinic.username,
      password: newClinic.password,
      subscriptionEndDate: new Date(newClinic.date).toISOString()
    })
    setIsSubmitting(false)
    
    if (res.success) {
      setShowAddModal(false)
      setNewClinic({ name: '', username: '', password: '', date: '' })
      fetchClinics()
    } else {
      alert("Xatolik: " + res.error)
    }
  }

  const handleUpdateCredentials = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const res = await updateAdminCredentialsAction(credentialsModal.userId, credUpdates.username, credUpdates.password)
    setIsSubmitting(false)

    if (res.success) {
      setCredentialsModal(null)
      setCredUpdates({ username: '', password: '' })
      fetchClinics() // Refresh to show new username
      alert("Ma'lumotlar muvaffaqiyatli o'zgartirildi!")
    } else {
      alert("Xatolik: " + res.error)
    }
  }

  const handleMyPasswordChange = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password: myNewPassword })
    setIsSubmitting(false)
    
    if (error) {
      alert("Xatolik: " + error.message)
    } else {
      setShowSettingsModal(false)
      setMyNewPassword('')
      alert("Sizning parolingiz muvaffaqiyatli o'zgartirildi!")
    }
  }

  const handleAssignAdmin = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const res = await assignAdminToClinicAction(showAssignAdminModal, newAdmin.username, newAdmin.password)
    setIsSubmitting(false)
    
    if (res.success) {
      setShowAssignAdminModal(null)
      setNewAdmin({ username: '', password: '' })
      fetchClinics()
      alert("Yangi admin muvaffaqiyatli biriktirildi!")
    } else {
      alert("Xatolik: " + res.error)
    }
  }

  const openStatsModal = async (clinicId) => {
    setShowStatsModal(clinicId)
    setLoadingStats(true)
    const res = await getClinicStatsAction(clinicId)
    if (res.success) {
      setClinicStats(res.stats)
    } else {
      alert("Statistikani yuklashda xatolik: " + res.error)
      setShowStatsModal(null)
    }
    setLoadingStats(false)
  }

  const filtered = clinics.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'var(--font-inter)' }}>
      {/* Top Navbar */}
      <div style={{ backgroundColor: '#111', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield color="#F59E0B" />
          <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>DentFlow Super Admin</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <button onClick={() => setShowSettingsModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Settings size={18} />
            <span>Sozlamalar</span>
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
            <LogOut size={18} />
            <span>Chiqish</span>
          </button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>Mijoz Klinikalar ({clinics.length})</h2>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Klinika qidirish..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '14px', backgroundColor: 'transparent' }}
              />
            </div>
            
            <button 
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--accent)', color: 'white', borderRadius: 'var(--radius-sm)', fontWeight: '500', cursor: 'pointer', border: 'none' }}
            >
              <Plus size={18} /> Yangi Klinika Qo'shish
            </button>
          </div>
        </div>

        {loading ? (
          <p>Yuklanmoqda...</p>
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'visible' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <th style={{ padding: '16px', fontWeight: '600' }}>Klinika nomi</th>
                  <th style={{ padding: '16px', fontWeight: '600' }}>Holat</th>
                  <th style={{ padding: '16px', fontWeight: '600' }}>Obuna muddati</th>
                  <th style={{ padding: '16px', fontWeight: '600', textAlign: 'right' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(clinic => {
                  return (
                    <tr key={clinic.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px', fontWeight: '500' }}>
                        {clinic.name}
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Login: {clinic.adminUsername ? <span style={{ color: '#0369A1' }}>{clinic.adminUsername}</span> : <span style={{ color: '#DC2626' }}>Yoq</span>}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500',
                          backgroundColor: clinic.is_active ? '#D1FAE5' : '#FEE2E2',
                          color: clinic.is_active ? '#065F46' : '#991B1B'
                        }}>
                          {clinic.is_active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {clinic.is_active ? 'Faol' : 'Bloklangan'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                        <input 
                          type="date" 
                          defaultValue={clinic.subscription_end_date ? new Date(clinic.subscription_end_date).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleUpdateDate(clinic.id, e.target.value)}
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => openStatsModal(clinic.id)}
                            title="Statistika"
                            style={{
                              padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
                              border: '1px solid #E5E7EB', backgroundColor: '#F3F4F6', color: '#374151',
                              display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <BarChart3 size={14} /> Statistika
                          </button>
                          
                          {clinic.adminUserId ? (
                            <button 
                              onClick={() => {
                                setCredentialsModal({ userId: clinic.adminUserId, username: clinic.adminUsername })
                                setCredUpdates({ username: clinic.adminUsername || '', password: '' })
                              }}
                              title="Login/Parolni almashtirish"
                              style={{
                                padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
                                border: '1px solid #E5E7EB', backgroundColor: 'white', color: '#374151',
                                display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <Key size={14} /> Login / Parol
                            </button>
                          ) : (
                            <button 
                              onClick={() => setShowAssignAdminModal(clinic.id)}
                              title="Yangi admin biriktirish"
                              style={{
                                padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
                                border: '1px solid #93C5FD', backgroundColor: '#EFF6FF', color: '#1D4ED8',
                                display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500'
                              }}
                            >
                              <UserPlus size={14} /> Admin Qo'shish
                            </button>
                          )}
                          <button 
                            onClick={() => toggleStatus(clinic.id, clinic.is_active)}
                            style={{
                              padding: '6px 12px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer',
                              border: `1px solid ${clinic.is_active ? '#FCA5A5' : '#A7F3D0'}`,
                              backgroundColor: 'transparent',
                              color: clinic.is_active ? '#DC2626' : '#059669'
                            }}
                          >
                            {clinic.is_active ? 'Bloklash' : 'Faollashtirish'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Klinika topilmadi.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADD CLINIC MODAL */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: '400px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>Yangi Klinika Qo'shish</h3>
            <form onSubmit={handleCreateClinic} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Klinika nomi</label>
                <input required type="text" value={newClinic.name} onChange={e => setNewClinic({...newClinic, name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Admin Username (Login ID)</label>
                <input required type="text" value={newClinic.username} onChange={e => setNewClinic({...newClinic, username: e.target.value})} placeholder="masalan: dent_admin" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Admin Paroli</label>
                <input required type="password" value={newClinic.password} onChange={e => setNewClinic({...newClinic, password: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Obuna muddati</label>
                <input required type="date" value={newClinic.date} onChange={e => setNewClinic({...newClinic, date: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#E5E7EB', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Bekor qilish</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {isSubmitting ? 'Qo\'shilmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDENTIALS RESET MODAL */}
      {credentialsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: '350px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>Login & Parolni Yangilash</h3>
            <form onSubmit={handleUpdateCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Login ID (Username)</label>
                <input type="text" value={credUpdates.username} onChange={e => setCredUpdates({...credUpdates, username: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Yangi parol (ixtiyoriy)</label>
                <input type="password" value={credUpdates.password} onChange={e => setCredUpdates({...credUpdates, password: e.target.value})} placeholder="Bo'sh qolsa, o'zgarmaydi" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setCredentialsModal(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#E5E7EB', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Bekor qilish</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {isSubmitting ? 'Saqlanmoqda...' : 'Yangilash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MY SETTINGS MODAL */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: '350px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>O'z Parolimni O'zgartirish</h3>
            <form onSubmit={handleMyPasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Yangi parol</label>
                <input required type="password" value={myNewPassword} onChange={e => setMyNewPassword(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowSettingsModal(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#E5E7EB', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Bekor qilish</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {isSubmitting ? 'Saqlanmoqda...' : 'O\'zgartirish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN ADMIN MODAL */}
      {showAssignAdminModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: '350px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>Admin Biriktirish</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Bu klinika uchun yangi admin profil yaratiladi.</p>
            <form onSubmit={handleAssignAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Yangi Username (Login ID)</label>
                <input required type="text" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} placeholder="shifo_admin" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Parol</label>
                <input required type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAssignAdminModal(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#E5E7EB', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Bekor qilish</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {isSubmitting ? 'Saqlanmoqda...' : 'Biriktirish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATS MODAL */}
      {showStatsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={20} color="var(--accent)" /> Klinika Statistikasi
              </h3>
              <button onClick={() => setShowStatsModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <XCircle size={20} />
              </button>
            </div>
            
            {loadingStats ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Ma'lumotlar yuklanmoqda...
              </div>
            ) : clinicStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Jami Bemorlar:</span>
                  <span style={{ fontWeight: '700', fontSize: '16px' }}>{clinicStats.patients}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Jami Qabullar:</span>
                  <span style={{ fontWeight: '700', fontSize: '16px' }}>{clinicStats.appointments}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#EFF6FF', borderRadius: 'var(--radius-sm)', border: '1px solid #BFDBFE' }}>
                  <span style={{ color: '#1E40AF', fontWeight: '500' }}>Umumiy Tushum:</span>
                  <span style={{ fontWeight: '800', fontSize: '18px', color: '#1D4ED8' }}>
                    {clinicStats.revenue.toLocaleString()} UZS
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--danger)' }}>
                Ma'lumot topilmadi.
              </div>
            )}
            
            <button onClick={() => setShowStatsModal(null)} style={{ width: '100%', padding: '12px', marginTop: '24px', backgroundColor: '#E5E7EB', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
              Yopish
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
