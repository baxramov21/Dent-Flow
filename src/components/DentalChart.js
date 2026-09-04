import React, { useState } from 'react'

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

export const TOOTH_STATUSES = [
  { id: 'healthy', label: "Sog'lom", color: '#E5E7EB', textColor: '#374151' },
  { id: 'caries', label: 'Karies', color: '#EF4444', textColor: '#FFFFFF' },
  { id: 'filled', label: 'Plomba', color: '#3B82F6', textColor: '#FFFFFF' },
  { id: 'crown', label: 'Qoplama (Koronka)', color: '#F59E0B', textColor: '#FFFFFF' },
  { id: 'bridge', label: "Ko'prik (Most)", color: '#8B5CF6', textColor: '#FFFFFF' },
  { id: 'implant', label: 'Implant', color: '#10B981', textColor: '#FFFFFF' },
  { id: 'extracted', label: 'Olingan', color: '#4B5563', textColor: '#FFFFFF' },
  { id: 'root_canal', label: 'Kanal davolangan', color: '#EC4899', textColor: '#FFFFFF' },
  { id: 'planned', label: 'Rejada', color: '#EEF2FF', textColor: '#6366F1', border: '2px dashed #6366F1' },
]

export default function DentalChart({ toothData = [], onUpdateTooth, readOnly = false }) {
  const [selectedTooth, setSelectedTooth] = useState(null)
  
  // toothData is array of { tooth_number, status, notes }
  const getToothStatus = (number) => {
    return toothData.find(t => t.tooth_number === number) || { status: 'healthy', notes: '' }
  }

  const handleToothClick = (number) => {
    if (readOnly) return
    setSelectedTooth(selectedTooth === number ? null : number)
  }

  const handleStatusChange = (statusId) => {
    if (!selectedTooth || readOnly) return
    const current = getToothStatus(selectedTooth)
    onUpdateTooth(selectedTooth, statusId, current.notes)
    setSelectedTooth(null)
  }

  const renderTooth = (num) => {
    const data = getToothStatus(num)
    const statusDef = TOOTH_STATUSES.find(s => s.id === data.status) || TOOTH_STATUSES[0]
    const isSelected = selectedTooth === num

    return (
      <div 
        key={num}
        onClick={() => handleToothClick(num)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          cursor: readOnly ? 'default' : 'pointer',
          position: 'relative'
        }}
      >
        <div style={{
          width: '32px',
          height: '42px',
          backgroundColor: statusDef.color,
          border: statusDef.border || '1px solid rgba(0,0,0,0.1)',
          borderRadius: '8px 8px 16px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: statusDef.textColor,
          fontWeight: 'bold',
          fontSize: '14px',
          boxShadow: isSelected ? '0 0 0 4px rgba(99, 102, 241, 0.3)' : 'none',
          transition: 'all 0.2s',
          transform: isSelected ? 'scale(1.1)' : 'scale(1)'
        }}>
          {data.status === 'extracted' ? '✕' : ''}
        </div>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: '600', 
          color: isSelected ? 'var(--accent)' : 'var(--text-secondary)'
        }}>
          {num}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center' }}>
      
      {/* Chart */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '40px', 
        padding: '32px', 
        backgroundColor: 'var(--bg-panel)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        overflowX: 'auto',
        width: '100%'
      }}>
        
        {/* Upper Teeth */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', minWidth: 'fit-content' }}>
          {UPPER_TEETH.slice(0, 8).map(renderTooth)}
          <div style={{ width: '24px' }}></div> {/* Midline Gap */}
          {UPPER_TEETH.slice(8, 16).map(renderTooth)}
        </div>

        {/* Lower Teeth */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', minWidth: 'fit-content' }}>
          {LOWER_TEETH.slice(0, 8).map(renderTooth)}
          <div style={{ width: '24px' }}></div> {/* Midline Gap */}
          {LOWER_TEETH.slice(8, 16).map(renderTooth)}
        </div>

      </div>

      {/* Editor Panel (Only visible when a tooth is clicked and not readOnly) */}
      {!readOnly && selectedTooth && (
        <div style={{ 
          width: '100%', 
          padding: '24px', 
          backgroundColor: 'var(--bg-panel)', 
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--accent)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
            {selectedTooth}-Tish holatini belgilash
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {TOOTH_STATUSES.map(status => (
              <button
                key={status.id}
                onClick={() => handleStatusChange(status.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: status.color,
                  color: status.textColor,
                  border: status.border || '1px solid rgba(0,0,0,0.1)',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={e => e.currentTarget.style.opacity = '1'}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginTop: '16px' }}>
        {TOOTH_STATUSES.map(status => (
          <div key={status.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '16px', height: '16px', borderRadius: '4px', 
              backgroundColor: status.color, border: status.border || '1px solid rgba(0,0,0,0.1)' 
            }} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{status.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
