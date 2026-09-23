'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Save, Printer, AlertCircle, CheckCircle, ChevronDown, Download } from 'lucide-react'

const TOOTH_STATUSES = {
  healthy: { label: 'Sog\'lom', color: '#CBD5E1', bg: '#FFFFFF' },
  caries: { label: 'Kariyes', color: '#F59E0B', bg: '#FEF3C7' },
  filled: { label: 'Plomba', color: '#3B82F6', bg: '#DBEAFE' },
  crown: { label: 'Koronka', color: '#8B5CF6', bg: '#EDE9FE' },
  extracted: { label: 'Olib tashlangan', color: '#EF4444', bg: '#FEE2E2' },
  root_canal: { label: 'Kanal davolangan', color: '#EC4899', bg: '#FCE7F3' },
  implant: { label: 'Implant', color: '#06B6D4', bg: '#CFFAFE' },
  bridge: { label: 'Ko\'prik', color: '#6366F1', bg: '#E0E7FF' },
  planned: { label: 'Rejalashtirilgan', color: '#64748B', bg: '#F1F5F9' },
}

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

const FACIAL_SYMMETRY_OPTIONS = [
  'Simmetrik',
  'Assimetrik - chap tomonda shish',
  'Assimetrik - o\'ng tomonda shish',
  'Assimetrik - pastki jag\' siljishi',
]

const LYMPH_NODES_OPTIONS = [
  'Kattalashmagan, og\'riqsiz',
  'Kattalashgan, og\'riqsiz',
  'Kattalashgan, og\'riqli',
  'Submandibular limfa tugunlari kattalashgan',
]

export default function Forma046Tab({ patient, clinicId }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [selectedTooth, setSelectedTooth] = useState(null)
  const [cardData, setCardData] = useState({
    card_number: '',
    chief_complaints: '',
    illness_history: '',
    life_history: '',
    allergic_reactions: '',
    facial_symmetry: '',
    lymph_nodes: '',
    oral_mucosa: '',
    dental_formula: {},
    diagnosis: '',
    mkb10_code: '',
    treatment_plan_text: '',
  })
  const [existingId, setExistingId] = useState(null)

  // Load existing dental card data
  useEffect(() => {
    const loadCard = async () => {
      if (!patient?.id || !clinicId) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('dental_cards')
          .select('*')
          .eq('patient_id', patient.id)
          .single()

        if (data && !error) {
          setExistingId(data.id)
          setCardData({
            card_number: data.card_number || `DK-${patient.id.slice(0, 6).toUpperCase()}`,
            chief_complaints: data.chief_complaints || '',
            illness_history: data.illness_history || '',
            life_history: data.life_history || '',
            allergic_reactions: data.allergic_reactions || '',
            facial_symmetry: data.facial_symmetry || '',
            lymph_nodes: data.lymph_nodes || '',
            oral_mucosa: data.oral_mucosa || '',
            dental_formula: data.dental_formula || {},
            diagnosis: data.diagnosis || '',
            mkb10_code: data.mkb10_code || '',
            treatment_plan_text: data.treatment_plan_text || '',
          })
        } else {
          // No card yet, set auto card number
          setCardData(prev => ({ ...prev, card_number: `DK-${patient.id.slice(0, 6).toUpperCase()}` }))
        }

        // Also load existing tooth_status data to pre-populate dental formula
        const { data: toothData } = await supabase
          .from('tooth_status')
          .select('tooth_number, status')
          .eq('patient_id', patient.id)

        if (toothData && toothData.length > 0 && (!data || !data.dental_formula || Object.keys(data.dental_formula).length === 0)) {
          const formula = {}
          toothData.forEach(t => {
            formula[t.tooth_number] = t.status
          })
          setCardData(prev => ({ ...prev, dental_formula: { ...formula, ...prev.dental_formula } }))
        }
      } catch (err) {
        console.error('046 forma yuklashda xatolik:', err)
      } finally {
        setLoading(false)
      }
    }
    loadCard()
  }, [patient?.id, clinicId])

  const handleFieldChange = (field, value) => {
    setCardData(prev => ({ ...prev, [field]: value }))
  }

  const handleToothClick = (toothNum) => {
    setSelectedTooth(selectedTooth === toothNum ? null : toothNum)
  }

  const handleToothStatusChange = (toothNum, status) => {
    setCardData(prev => ({
      ...prev,
      dental_formula: { ...prev.dental_formula, [toothNum]: status }
    }))
    setSelectedTooth(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const payload = {
        clinic_id: clinicId,
        patient_id: patient.id,
        ...cardData,
        updated_at: new Date().toISOString(),
      }

      if (existingId) {
        const { error } = await supabase
          .from('dental_cards')
          .update(payload)
          .eq('id', existingId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('dental_cards')
          .insert([payload])
          .select()
          .single()
        if (error) throw error
        if (data) setExistingId(data.id)
      }

      // Also sync dental_formula to tooth_status table
      const toothEntries = Object.entries(cardData.dental_formula)
      if (toothEntries.length > 0) {
        for (const [num, status] of toothEntries) {
          await supabase
            .from('tooth_status')
            .upsert({
              clinic_id: clinicId,
              patient_id: patient.id,
              tooth_number: parseInt(num),
              status: status,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'patient_id,tooth_number' })
        }
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('046 forma saqlashda xatolik:', err)
      alert('Saqlashda xatolik yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const element = document.getElementById('forma-046-print-area')
      
      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `046_Forma_${cardData.card_number || 'Bemor'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }
      
      // Add a temporary class to hide elements during PDF generation
      element.classList.add('pdf-generating')
      await html2pdf().from(element).set(opt).save()
      element.classList.remove('pdf-generating')
      
    } catch (err) {
      console.error('PDF yaratishda xatolik:', err)
      alert('PDF yuklab olishda xatolik yuz berdi')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p>046 Forma yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  const getToothStatus = (num) => cardData.dental_formula[num] || 'healthy'
  const getToothStyle = (num) => {
    const status = getToothStatus(num)
    const config = TOOTH_STATUSES[status] || TOOTH_STATUSES.healthy
    const isSelected = selectedTooth === num
    return {
      width: '40px',
      height: '48px',
      borderRadius: 'var(--radius-sm)',
      border: isSelected ? `2px solid var(--accent)` : `1px solid ${config.color}40`,
      backgroundColor: config.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      position: 'relative',
      boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
      transform: isSelected ? 'scale(1.1)' : 'scale(1)',
    }
  }

  // Styles
  const sectionStyle = {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    padding: '24px',
    marginBottom: '20px',
  }

  const sectionTitleStyle = {
    fontSize: '13px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const labelStyle = {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    display: 'block',
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-primary)',
  }

  const textareaStyle = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
  }

  const readonlyFieldStyle = {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-hover)',
    border: '1px solid var(--border-light)',
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: '500',
  }

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '36px',
  }

  return (
    <div id="forma-046-print-area" style={{ display: 'flex', flexDirection: 'column', gap: '0', backgroundColor: 'var(--bg-card)' }}>
      {/* Floating Save Bar */}
      <div className="no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: '0',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Stomatologik Tibbiy Karta
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              046 Forma • Karta №: {cardData.card_number}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {saveSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '13px', fontWeight: '500', animation: 'fadeIn 0.3s ease' }}>
              <CheckCircle size={16} />
              Saqlandi
            </div>
          )}
          <button
            type="button"
            className="no-print"
            onClick={handleDownloadPDF}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <Download size={16} />
            PDF Yuklash
          </button>
          <button
            type="button"
            className="no-print"
            onClick={handlePrint}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <Printer size={16} />
            Chop etish
          </button>
          <button
            type="button"
            className="no-print"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'var(--accent)',
              color: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: saving ? 0.7 : 1,
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Save size={16} />
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>

      {/* 1. Patient Info (Read-Only) */}
      <div style={{ ...sectionStyle, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-light)' }}>
        <div style={sectionTitleStyle}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
          Bemor ma'lumotlari
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>F.I.O</label>
            <div style={readonlyFieldStyle}>{patient?.full_name || '—'}</div>
          </div>
          <div>
            <label style={labelStyle}>Tug'ilgan sana</label>
            <div style={readonlyFieldStyle}>
              {patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('uz-UZ') : '—'}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Jinsi</label>
            <div style={readonlyFieldStyle}>
              {patient?.gender === 'male' ? 'Erkak' : patient?.gender === 'female' ? 'Ayol' : '—'}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Telefon</label>
            <div style={readonlyFieldStyle}>{patient?.phone || '—'}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Manzil</label>
            <div style={readonlyFieldStyle}>{patient?.address || '—'}</div>
          </div>
        </div>
      </div>

      {/* 2. Anamnez */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
          Anamnez
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Asosiy shikoyatlar</label>
            <textarea
              style={textareaStyle}
              placeholder="Bemor nimadan shikoyat qilmoqda..."
              value={cardData.chief_complaints}
              onChange={(e) => handleFieldChange('chief_complaints', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Kasallik anamnezi</label>
            <textarea
              style={textareaStyle}
              placeholder="Kasallik qachon va qanday boshlangan..."
              value={cardData.illness_history}
              onChange={(e) => handleFieldChange('illness_history', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Hayot anamnezi</label>
            <textarea
              style={textareaStyle}
              placeholder="Surunkali kasalliklar, operatsiyalar..."
              value={cardData.life_history}
              onChange={(e) => handleFieldChange('life_history', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Allergik reaktsiyalar</label>
            <textarea
              style={textareaStyle}
              placeholder="Dori-darmonlarga allergiya, boshqa allergiyalar..."
              value={cardData.allergic_reactions}
              onChange={(e) => handleFieldChange('allergic_reactions', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3. Ko'rik */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
          Ko'rik
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Yuz simmetriyasi</label>
            <select
              style={selectStyle}
              value={cardData.facial_symmetry}
              onChange={(e) => handleFieldChange('facial_symmetry', e.target.value)}
            >
              <option value="">Tanlang...</option>
              {FACIAL_SYMMETRY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Og'iz bo'shlig'i shilliq qavatining holati</label>
            <textarea
              style={textareaStyle}
              placeholder="Og'iz bo'shlig'i shilliq qavatining holati..."
              value={cardData.oral_mucosa}
              onChange={(e) => handleFieldChange('oral_mucosa', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 4. Dental Formula */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#8B5CF6' }} />
          Tish formulasi
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', padding: '12px 16px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
          {Object.entries(TOOTH_STATUSES).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: val.bg, border: `1px solid ${val.color}60` }} />
              {val.label}
            </div>
          ))}
        </div>

        {/* Upper Teeth */}
        <div style={{ marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginBottom: '2px' }}>
            {UPPER_TEETH.map(num => (
              <div style={{ width: '40px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }} key={`label-${num}`}>
                {num}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', position: 'relative' }}>
            {UPPER_TEETH.map(num => (
              <div key={num} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => handleToothClick(num)}
                  style={getToothStyle(num)}
                >
                  <span style={{ fontSize: '16px' }}>🦷</span>
                  <span style={{ fontSize: '8px', fontWeight: '700', color: TOOTH_STATUSES[getToothStatus(num)]?.color || '#10B981' }}>
                    {getToothStatus(num) !== 'healthy' ? TOOTH_STATUSES[getToothStatus(num)]?.label?.slice(0, 3) : ''}
                  </span>
                </button>
                {/* Dropdown for tooth status */}
                {selectedTooth === num && (
                  <div style={{
                    position: 'absolute',
                    top: '52px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 50,
                    minWidth: '160px',
                    padding: '4px',
                    animation: 'fadeIn 0.15s ease',
                  }}>
                    {Object.entries(TOOTH_STATUSES).map(([key, val]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleToothStatusChange(num, key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 10px',
                          border: 'none',
                          backgroundColor: getToothStatus(num) === key ? val.bg : 'transparent',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                          fontWeight: getToothStatus(num) === key ? '600' : '400',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = val.bg}
                        onMouseLeave={(e) => {
                          if (getToothStatus(num) !== key) e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: val.color }} />
                        {val.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Divider line representing gum line */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
          <div style={{ width: `${UPPER_TEETH.length * 42}px`, height: '2px', backgroundColor: 'var(--border)', borderRadius: '1px' }} />
        </div>

        {/* Lower Teeth */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', position: 'relative' }}>
            {LOWER_TEETH.map(num => (
              <div key={num} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => handleToothClick(num)}
                  style={getToothStyle(num)}
                >
                  <span style={{ fontSize: '8px', fontWeight: '700', color: TOOTH_STATUSES[getToothStatus(num)]?.color || '#10B981' }}>
                    {getToothStatus(num) !== 'healthy' ? TOOTH_STATUSES[getToothStatus(num)]?.label?.slice(0, 3) : ''}
                  </span>
                  <span style={{ fontSize: '16px' }}>🦷</span>
                </button>
                {/* Dropdown for tooth status */}
                {selectedTooth === num && (
                  <div style={{
                    position: 'absolute',
                    bottom: '52px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 50,
                    minWidth: '160px',
                    padding: '4px',
                    animation: 'fadeIn 0.15s ease',
                  }}>
                    {Object.entries(TOOTH_STATUSES).map(([key, val]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleToothStatusChange(num, key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 10px',
                          border: 'none',
                          backgroundColor: getToothStatus(num) === key ? val.bg : 'transparent',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                          fontWeight: getToothStatus(num) === key ? '600' : '400',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = val.bg}
                        onMouseLeave={(e) => {
                          if (getToothStatus(num) !== key) e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: val.color }} />
                        {val.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px' }}>
            {LOWER_TEETH.map(num => (
              <div style={{ width: '40px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }} key={`label-${num}`}>
                {num}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Tashxis */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          Tashxis
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start' }}>
          <div>
            <label style={labelStyle}>Tashxis matni</label>
            <textarea
              style={{ ...textareaStyle, minHeight: '100px' }}
              placeholder="Klinik tashxis: ..."
              value={cardData.diagnosis}
              onChange={(e) => handleFieldChange('diagnosis', e.target.value)}
            />
          </div>
          <div style={{ minWidth: '160px' }}>
            <label style={labelStyle}>MKB-10 Kodi</label>
            <input
              type="text"
              style={inputStyle}
              placeholder="Masalan: K02.1"
              value={cardData.mkb10_code}
              onChange={(e) => handleFieldChange('mkb10_code', e.target.value)}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Xalqaro kasalliklar klassifikatsiyasi
            </p>
          </div>
        </div>
      </div>

      {/* 6. Davolash Rejasi */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
          Davolash rejasi
        </div>
        <textarea
          style={{ ...textareaStyle, minHeight: '120px' }}
          placeholder="Davolash rejasini batafsil yozing..."
          value={cardData.treatment_plan_text}
          onChange={(e) => handleFieldChange('treatment_plan_text', e.target.value)}
        />
      </div>

      {/* Bottom Save Button */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '8px 0 24px' }}>
        <button
          type="button"
          onClick={handleDownloadPDF}
          style={{
            padding: '12px 24px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Download size={16} />
          PDF Yuklash
        </button>
        <button
          type="button"
          onClick={handlePrint}
          style={{
            padding: '12px 24px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Printer size={16} />
          Chop etish
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 32px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: 'var(--accent)',
            color: 'white',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: saving ? 0.7 : 1,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Save size={16} />
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .pdf-generating .no-print {
          display: none !important;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #forma-046-print-area, #forma-046-print-area * {
            visibility: visible;
          }
          #forma-046-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          
          /* Override the fixed modal styles during print to avoid blank pages */
          div[style*="position: fixed"] {
            position: absolute !important;
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  )
}
