import React, { useState } from 'react'

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

export const TOOTH_STATUSES = [
  { id: 'healthy', label: "Sog'lom", color: '#FFFFFF', textColor: '#374151' },
  { id: 'caries', label: 'Karies', color: '#EF4444', textColor: '#FFFFFF' },
  { id: 'filled', label: 'Plomba', color: '#3B82F6', textColor: '#FFFFFF' },
  { id: 'crown', label: 'Qoplama (Koronka)', color: '#F59E0B', textColor: '#FFFFFF' },
  { id: 'bridge', label: "Ko'prik (Most)", color: '#8B5CF6', textColor: '#FFFFFF' },
  { id: 'implant', label: 'Implant', color: '#10B981', textColor: '#FFFFFF' },
  { id: 'extracted', label: 'Olingan', color: '#111827', textColor: '#FFFFFF' },
  { id: 'root_canal', label: 'Kanal davolangan', color: '#EC4899', textColor: '#FFFFFF' },
  { id: 'planned', label: 'Rejada', color: '#EEF2FF', textColor: '#6366F1', border: '2px dashed #6366F1' },
]

// Determine tooth type
const getToothShape = (num) => {
  const t = num % 10;
  if (t >= 6 && t <= 8) return 'molar';
  if (t === 4 || t === 5) return 'premolar';
  if (t === 3) return 'canine';
  return 'incisor';
}

const PATHS = {
  incisor: "M 10 2 C 8 2, 7 15, 7 24 C 7 30, 8 38, 12 38 C 16 38, 17 30, 17 24 C 17 15, 16 2, 14 2 Z", 
  canine: "M 12 0 C 8 0, 7 15, 7 24 C 7 30, 12 40, 12 40 C 12 40, 17 30, 17 24 C 17 15, 16 0, 12 0 Z",
  premolar: "M 9 2 C 8 10, 6 18, 6 26 C 6 34, 18 34, 18 26 C 18 18, 16 10, 15 2 C 14 3, 10 3, 9 2 Z",
  molar: "M 5 2 C 3 12, 4 18, 4 22 C 4 35, 20 35, 20 22 C 20 18, 21 12, 19 2 C 17 8, 15 12, 12 12 C 9 12, 7 8, 5 2 Z"
}

const getOcclusalElement = (shape) => {
  switch(shape) {
    case 'molar': return <rect x="3" y="6" width="18" height="12" rx="6" />;
    case 'premolar': return <ellipse cx="12" cy="12" rx="7" ry="5" />;
    case 'canine': return <circle cx="12" cy="12" r="5" />;
    case 'incisor':
    default: return <ellipse cx="12" cy="12" rx="6" ry="3" />;
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

  // A single helper to render a tooth column
  const renderToothColumn = (num, isUpper) => {
    const data = getToothStatus(num)
    const statusDef = TOOTH_STATUSES.find(s => s.id === data.status) || TOOTH_STATUSES[0]
    const isSelected = selectedTooth === num
    const shape = getToothShape(num)
    const isExtracted = data.status === 'extracted';
    
    // Fill color for SVGs
    const fillColor = statusDef.color === '#FFFFFF' ? '#F8FAFC' : statusDef.color;

    const AnatomySvg = () => (
      <div style={{ position: 'relative', width: '32px', height: '52px', transition: 'all 0.2s', opacity: isExtracted ? 0.3 : 1 }}>
        <svg viewBox="0 0 24 40" width="100%" height="100%" style={{ transform: isUpper ? 'none' : 'rotate(180deg)', overflow: 'visible', filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.15))' }}>
          <defs>
            <linearGradient id={`grad-${num}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="60%" stopColor={fillColor} />
              <stop offset="100%" stopColor={fillColor} stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id={`highlight-${num}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path d={PATHS[shape]} fill={`url(#grad-${num})`} stroke={data.status === 'planned' ? '#6366F1' : 'rgba(0,0,0,0.1)'} strokeWidth={data.status === 'planned' ? '1.5' : '0.5'} strokeDasharray={data.status === 'planned' ? '3 2' : 'none'} />
          <path d={PATHS[shape]} fill={`url(#highlight-${num})`} style={{ mixBlendMode: 'overlay' }} />
        </svg>
        {isExtracted && (
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#EF4444', fontWeight: '900', fontSize: '24px', textShadow: '0 0 8px rgba(255,255,255,1)' }}>✕</span>
        )}
      </div>
    )

    const OcclusalSvg = () => (
      <div style={{ width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: isExtracted ? 0.3 : 1 }}>
        <svg viewBox="0 0 24 24" width="100%" height="100%" style={{ overflow: 'visible', filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.15))' }}>
          {React.cloneElement(getOcclusalElement(shape), { 
            fill: `url(#grad-${num})`, 
            stroke: data.status === 'planned' ? '#6366F1' : 'rgba(0,0,0,0.15)',
            strokeWidth: data.status === 'planned' ? '1.5' : '0.5',
            strokeDasharray: data.status === 'planned' ? '3 2' : 'none'
          })}
        </svg>
      </div>
    )

    const NumberLabel = () => (
      <span style={{ fontSize: '12px', fontWeight: '700', color: isSelected ? 'var(--accent)' : 'var(--text-secondary)' }}>
        {num}
      </span>
    )

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
          padding: '8px',
          borderRadius: '8px',
          backgroundColor: isSelected ? '#EEF2FF' : 'transparent',
          boxShadow: isSelected ? '0 0 0 2px var(--accent)' : 'none',
          transition: 'all 0.2s',
          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
          zIndex: isSelected ? 10 : 1
        }}
      >
        {isUpper ? (
          <>
            <AnatomySvg />
            <OcclusalSvg />
            <NumberLabel />
          </>
        ) : (
          <>
            <NumberLabel />
            <OcclusalSvg />
            <AnatomySvg />
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center' }}>
      
      {/* Chart Canvas */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px', 
        padding: '40px 24px', 
        backgroundColor: '#1E293B', // Dark theme background specifically for the chart to match the reference UI
        borderRadius: '24px',
        border: '1px solid #334155',
        boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.3)',
        overflowX: 'auto',
        width: '100%'
      }}>
        
        {/* Upper Teeth Row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', minWidth: 'fit-content' }}>
          {UPPER_TEETH.map(num => renderToothColumn(num, true))}
        </div>

        {/* Lower Teeth Row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', minWidth: 'fit-content' }}>
          {LOWER_TEETH.map(num => renderToothColumn(num, false))}
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
          boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.1)'
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
              border: status.border || '1px solid rgba(0,0,0,0.1)'
            }} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>{status.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
