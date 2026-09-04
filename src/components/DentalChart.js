import React, { useState } from 'react'

const UPPER_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
const LOWER_TEETH = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17]

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
          gap: '12px',
          cursor: readOnly ? 'default' : 'pointer',
          position: 'relative'
        }}
      >
        <div style={{
          position: 'relative',
          width: '44px',
          height: '58px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
          filter: isSelected ? 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.5))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))',
        }}>
          <svg 
            viewBox="0 0 24 24" 
            width="100%" 
            height="100%" 
            fill={statusDef.color}
            stroke={data.status === 'planned' ? '#6366F1' : 'rgba(0,0,0,0.15)'}
            strokeWidth={data.status === 'planned' ? '1.5' : '1'}
            strokeDasharray={data.status === 'planned' ? '3 2' : 'none'}
            style={{ 
              transform: num <= 16 ? 'rotate(180deg)' : 'none',
              overflow: 'visible'
            }}
          >
            <path d="M10 21c-2.3 0-3-1.6-3-3s.4-4 .4-4c-.7-2-1.4-3.4-1.4-5a6 6 0 1 1 12 0c0 1.6-.7 3-1.4 5 0 0 1.1 2.6 1.1 4s-.7 3-3 3-1.5-1.5-3-1.5S12.3 21 10 21z" />
          </svg>
          {data.status === 'extracted' && (
            <span style={{ 
              position: 'absolute', 
              color: statusDef.textColor, 
              fontWeight: '900', 
              fontSize: '24px',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>✕</span>
          )}
        </div>
        <span style={{ 
          fontSize: '14px', 
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
        gap: '64px', 
        padding: '40px 32px', 
        backgroundColor: 'var(--bg-panel)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        overflowX: 'auto',
        width: '100%'
      }}>
        
        {/* Upper Teeth */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', minWidth: 'fit-content' }}>
          {UPPER_TEETH.slice(0, 8).map(renderTooth)}
          <div style={{ width: '32px' }}></div> {/* Midline Gap */}
          {UPPER_TEETH.slice(8, 16).map(renderTooth)}
        </div>

        {/* Lower Teeth */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', minWidth: 'fit-content' }}>
          {LOWER_TEETH.slice(0, 8).map(renderTooth)}
          <div style={{ width: '32px' }}></div> {/* Midline Gap */}
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
