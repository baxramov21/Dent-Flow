import React, { useState } from 'react'

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

export const TOOTH_STATUSES = [
  { id: 'healthy', label: "Sog'lom", color: '#F8FAFC', textColor: '#374151' },
  { id: 'caries', label: 'Karies', color: '#EF4444', textColor: '#FFFFFF' },
  { id: 'filled', label: 'Plomba', color: '#3B82F6', textColor: '#FFFFFF' },
  { id: 'crown', label: 'Qoplama (Koronka)', color: '#F59E0B', textColor: '#FFFFFF' },
  { id: 'bridge', label: "Ko'prik (Most)", color: '#8B5CF6', textColor: '#FFFFFF' },
  { id: 'implant', label: 'Implant', color: '#10B981', textColor: '#FFFFFF' },
  { id: 'extracted', label: 'Olingan', color: '#111827', textColor: '#FFFFFF' },
  { id: 'root_canal', label: 'Kanal davolangan', color: '#EC4899', textColor: '#FFFFFF' },
  { id: 'planned', label: 'Rejada', color: '#EEF2FF', textColor: '#6366F1', border: '2px dashed #6366F1' },
]

// Determine tooth type for shape
const getToothShape = (num) => {
  const t = num % 10;
  if (t >= 6 && t <= 8) return 'molar';
  if (t === 4 || t === 5) return 'premolar';
  if (t === 3) return 'canine';
  return 'incisor';
}

const getPathForShape = (shape) => {
  switch (shape) {
    case 'molar':
      return "M 6 2 C 4 10, 4 18, 5 22 C 6 30, 18 30, 19 22 C 20 18, 20 10, 18 2 C 17 5, 15 8, 12 8 C 9 8, 7 5, 6 2 Z";
    case 'premolar':
      return "M 10 2 C 8 10, 6 16, 6 22 C 6 28, 18 28, 18 22 C 18 16, 16 10, 14 2 C 13 3, 11 3, 10 2 Z";
    case 'canine':
      return "M 11 2 C 9 10, 7 16, 7 22 C 7 26, 12 31, 12 31 C 12 31, 17 26, 17 22 C 17 16, 15 10, 13 2 C 12 2, 12 2, 11 2 Z";
    case 'incisor':
    default:
      return "M 11 2 C 9 10, 8 16, 8 22 C 8 29, 16 29, 16 22 C 16 16, 15 10, 13 2 C 12 2, 12 2, 11 2 Z";
  }
}

export default function DentalChart({ toothData = [], onUpdateTooth, readOnly = false }) {
  const [selectedTooth, setSelectedTooth] = useState(null)
  
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

  const renderTooth = (num, index, isUpper) => {
    const data = getToothStatus(num)
    const statusDef = TOOTH_STATUSES.find(s => s.id === data.status) || TOOTH_STATUSES[0]
    const isSelected = selectedTooth === num
    const shape = getToothShape(num)

    // Calculate Arch Transformation
    const distFromCenter = index - 7.5;
    const absDist = Math.abs(distFromCenter);
    const yOffsetCurve = 90 - (Math.pow(absDist, 2) * 1.5);
    const translateY = isUpper ? yOffsetCurve : -yOffsetCurve;
    const rotation = isUpper ? distFromCenter * 4 : -distFromCenter * 4;
    const scale = 1 - (absDist * 0.015); // Slightly smaller at edges

    const isExtracted = data.status === 'extracted';

    return (
      <div 
        key={num}
        onClick={() => handleToothClick(num)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          cursor: readOnly ? 'default' : 'pointer',
          position: 'relative',
          transform: `translateY(${translateY}px) rotate(${rotation}deg) scale(${scale})`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: isSelected ? 10 : 1,
          flexDirection: isUpper ? 'column' : 'column-reverse'
        }}
      >
        <div style={{
          position: 'relative',
          width: '36px',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          transform: isSelected ? 'scale(1.2)' : 'scale(1)',
          opacity: isExtracted ? 0.3 : 1,
        }}>
          <svg 
            viewBox="0 0 24 32" 
            width="100%" 
            height="100%" 
            style={{ 
              transform: isUpper ? 'none' : 'rotate(180deg)',
              overflow: 'visible',
              filter: `drop-shadow(0px 8px 10px rgba(0,0,0,0.15)) drop-shadow(0px 2px 4px rgba(0,0,0,0.1))`
            }}
          >
            <defs>
              <linearGradient id={`grad-${num}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="40%" stopColor={statusDef.color} />
                <stop offset="100%" stopColor={statusDef.color} stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id={`highlight-${num}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            {/* Base colored shape with simulated 3D depth */}
            <path 
              d={getPathForShape(shape)} 
              fill={`url(#grad-${num})`}
              stroke={data.status === 'planned' ? '#6366F1' : 'rgba(0,0,0,0.05)'}
              strokeWidth={data.status === 'planned' ? '1.5' : '0.5'}
              strokeDasharray={data.status === 'planned' ? '3 2' : 'none'}
            />
            {/* Highlight overlay for realism */}
            <path 
              d={getPathForShape(shape)} 
              fill={`url(#highlight-${num})`}
              style={{ mixBlendMode: 'overlay' }}
            />
          </svg>
          
          {isExtracted && (
            <span style={{ 
              position: 'absolute', 
              color: '#EF4444', 
              fontWeight: '900', 
              fontSize: '28px',
              textShadow: '0 0 10px rgba(255,255,255,0.8)'
            }}>✕</span>
          )}
          {isSelected && (
            <div style={{
              position: 'absolute',
              inset: '-8px',
              borderRadius: '50%',
              border: '2px solid var(--accent)',
              boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
              pointerEvents: 'none'
            }}/>
          )}
        </div>
        <span style={{ 
          fontSize: '14px', 
          fontWeight: '700', 
          color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
          backgroundColor: isSelected ? '#EEF2FF' : 'transparent',
          padding: '2px 6px',
          borderRadius: '4px',
          boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
          // Revert rotation for the text so it's always straight
          transform: `rotate(${isUpper ? -rotation : rotation}deg)`
        }}>
          {num}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', alignItems: 'center' }}>
      
      {/* Chart Canvas */}
      <div style={{ 
        position: 'relative',
        display: 'flex', 
        flexDirection: 'column', 
        gap: '120px', 
        padding: '80px 40px', 
        backgroundColor: '#F8FAFC',
        backgroundImage: 'radial-gradient(circle at center, #FFFFFF 0%, #F1F5F9 100%)',
        borderRadius: '32px',
        border: '1px solid #E2E8F0',
        boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.03)',
        overflowX: 'auto',
        overflowY: 'hidden',
        width: '100%',
        minHeight: '500px',
        justifyContent: 'center'
      }}>
        
        {/* Upper Teeth Arch */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', minWidth: 'fit-content', paddingBottom: '40px' }}>
          {UPPER_TEETH.map((num, idx) => renderTooth(num, idx, true))}
        </div>

        {/* Lower Teeth Arch */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', minWidth: 'fit-content', paddingTop: '40px' }}>
          {LOWER_TEETH.map((num, idx) => renderTooth(num, idx, false))}
        </div>

      </div>

      {/* Editor Panel (Only visible when a tooth is clicked and not readOnly) */}
      {!readOnly && selectedTooth && (
        <div style={{ 
          width: '100%', 
          padding: '24px', 
          backgroundColor: 'white', 
          borderRadius: '24px',
          border: '1px solid var(--accent)',
          boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.1), 0 8px 10px -6px rgba(99, 102, 241, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {selectedTooth}-Tish holatini belgilash
            </h3>
            <button onClick={() => setSelectedTooth(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
            {TOOTH_STATUSES.map(status => (
              <button
                key={status.id}
                onClick={() => handleStatusChange(status.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: status.id === 'healthy' ? '#F8FAFC' : status.color,
                  color: status.id === 'healthy' ? '#333' : status.textColor,
                  border: status.border || (status.id === 'healthy' ? '1px solid #E2E8F0' : '1px solid rgba(0,0,0,0.1)'),
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: status.id !== 'healthy' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', marginTop: '8px', padding: '20px', backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)' }}>
        {TOOTH_STATUSES.map(status => (
          <div key={status.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '18px', height: '18px', borderRadius: '6px', 
              backgroundColor: status.id === 'healthy' ? '#E2E8F0' : status.color, 
              border: status.border || '1px solid rgba(0,0,0,0.1)',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)'
            }} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>{status.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
