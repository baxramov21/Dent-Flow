'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useClinic } from '@/context/ClinicContext'
import { Plus, Search, Filter, TrendingUp, Package, Edit2, Trash2 } from 'lucide-react'

export default function ServicesPage() {
  const { clinic, isLoading: clinicLoading } = useClinic()
  const supabase = createClient()

  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Barchasi')
  const [statusFilter, setStatusFilter] = useState('all') // all, active, inactive
  
  const [formData, setFormData] = useState({
    name_uz: '',
    category: '',
    price: '',
    duration_minutes: 30,
    is_active: true
  })

  const fetchServices = async () => {
    if (!clinic) return
    setLoading(true)
    try {
      // Fetch services and their linked treatment items for usage stats
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          treatment_items (id, status, price_override)
        `)
        .eq('clinic_id', clinic.id)
        .order('category')
        .order('name_uz')
      
      if (error) throw error

      // Calculate usage stats dynamically
      const servicesWithStats = data.map(srv => {
        const completedItems = srv.treatment_items?.filter(item => item.status === 'completed') || []
        const usageCount = completedItems.length
        const totalRevenue = completedItems.reduce((acc, item) => acc + (item.price_override || srv.price), 0)
        
        return { ...srv, usageCount, totalRevenue }
      })

      setServices(servicesWithStats)
    } catch (err) {
      console.error('Xizmatlarni yuklashda xatolik:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clinicLoading && clinic) {
      fetchServices()
    }
  }, [clinic, clinicLoading])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingServiceId(null)
    setFormData({ name_uz: '', category: '', price: '', duration_minutes: 30, is_active: true })
  }

  const handleEdit = (srv) => {
    setFormData({
      name_uz: srv.name_uz || srv.name,
      category: srv.category || '',
      price: srv.price,
      duration_minutes: srv.duration_minutes || 30,
      is_active: srv.is_active
    })
    setEditingServiceId(srv.id)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm("Haqiqatan ham bu xizmatni o'chirmoqchimisiz? (Agar u avvalroq ishlatilgan bo'lsa xatolik berishi mumkin)")) return
    try {
      const { error } = await supabase.from('services').delete().eq('id', id)
      if (error) throw error
      fetchServices()
    } catch (err) {
      console.error("O'chirishda xatolik:", err)
      alert("Xizmatni o'chirishda xatolik yuz berdi (balki bu xizmat allaqachon muolajalarda ishlatilgan bo'lishi mumkin)")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingServiceId) {
        const { error } = await supabase
          .from('services')
          .update({
            name: formData.name_uz, // fallback for legacy column
            name_uz: formData.name_uz,
            category: formData.category || 'Umumiy',
            price: parseInt(formData.price),
            duration_minutes: parseInt(formData.duration_minutes),
            is_active: formData.is_active
          })
          .eq('id', editingServiceId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('services')
          .insert([{
            clinic_id: clinic.id,
            name: formData.name_uz, // fallback for legacy column
            name_uz: formData.name_uz,
            category: formData.category || 'Umumiy',
            price: parseInt(formData.price),
            duration_minutes: parseInt(formData.duration_minutes),
            is_active: formData.is_active
          }])
        if (error) throw error
      }

      closeModal()
      fetchServices()
    } catch (err) {
      console.error('Xizmat saqlashda xatolik:', err)
      alert("Xizmatni saqlashda xatolik yuz berdi")
    }
  }

  // Extract unique categories
  const categories = ['Barchasi', ...new Set(services.map(s => s.category).filter(Boolean))]

  // Apply filters
  const filteredServices = services.filter(srv => {
    const matchesSearch = (srv.name_uz || srv.name).toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'Barchasi' || srv.category === selectedCategory
    const matchesStatus = statusFilter === 'all' ? true : (statusFilter === 'active' ? srv.is_active : !srv.is_active)
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  if (clinicLoading) return <div>Yuklanmoqda...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Xizmatlar katalogi</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Klinika ko'rsatadigan xizmatlar va narxlar</p>
        </div>
        <button 
          onClick={() => {
            setEditingServiceId(null)
            setFormData({ name_uz: '', category: '', price: '', duration_minutes: 30, is_active: true })
            setIsModalOpen(true)
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--accent)', color: 'white', padding: '10px 16px', borderRadius: 'var(--radius-sm)', fontWeight: '500', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={18} />
          Yangi xizmat
        </button>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Categories Sidebar */}
        <div className="card" style={{ width: '240px', padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
            Toifalar
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{ 
                  textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: 'none', 
                  backgroundColor: selectedCategory === cat ? 'var(--bg-hover)' : 'transparent',
                  color: selectedCategory === cat ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: selectedCategory === cat ? '600' : '400',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Filters Bar */}
          <div className="card" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Xizmat nomini qidiring..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} color="var(--text-secondary)" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }}
              >
                <option value="all">Barcha holatlar</option>
                <option value="active">Faqat faollari</option>
                <option value="inactive">Faqat nofaollari</option>
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>Xizmat nomi</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>Narxi (UZS)</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>Davomiyligi</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>Foydalanish / Daromad</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>Holati</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Yuklanmoqda...</td></tr>
                ) : filteredServices.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Xizmatlar topilmadi</td></tr>
                ) : (
                  filteredServices.map(srv => (
                    <tr key={srv.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '16px 24px', fontWeight: '500' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Package size={16} color="var(--text-muted)" />
                          {srv.name_uz || srv.name}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: '600', color: 'var(--text-primary)' }}>{srv.price?.toLocaleString()} so'm</td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '14px' }}>{srv.duration_minutes} daq</td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{srv.usageCount} marta</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <TrendingUp size={10} color="#10B981" /> {srv.totalRevenue?.toLocaleString()} so'm
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                          backgroundColor: srv.is_active ? '#D1FAE5' : '#F3F4F6',
                          color: srv.is_active ? '#065F46' : '#9CA3AF'
                        }}>
                          {srv.is_active ? 'Faol' : 'Nofaol'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button onClick={() => handleEdit(srv)} style={{ padding: '6px', borderRadius: '4px', border: 'none', backgroundColor: '#DBEAFE', color: '#1E40AF', cursor: 'pointer' }}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(srv.id)} style={{ padding: '6px', borderRadius: '4px', border: 'none', backgroundColor: '#FEE2E2', color: '#991B1B', cursor: 'pointer' }}>
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

      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>{editingServiceId ? 'Xizmatni tahrirlash' : 'Yangi xizmat qo\'shish'}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>Xizmat nomi (O'zbekcha) *</label>
                <input type="text" name="name_uz" required value={formData.name_uz} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500' }}>Toifasi (Masalan: Terapiya, Jarrohlik)</label>
                <input type="text" name="category" value={formData.category} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Narxi (so'm) *</label>
                  <input type="number" name="price" required min="0" value={formData.price} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>Davomiyligi (daqiqa) *</label>
                  <input type="number" name="duration_minutes" required min="5" value={formData.duration_minutes} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                <label htmlFor="is_active" style={{ fontSize: '14px', fontWeight: '500' }}>Faol (Mijozlar yozilishi mumkin)</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={closeModal} style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: '500', cursor: 'pointer', backgroundColor: 'transparent' }}>
                  Bekor qilish
                </button>
                <button type="submit" style={{ padding: '10px 16px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '500', cursor: 'pointer' }}>
                  {editingServiceId ? 'Yangilash' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
