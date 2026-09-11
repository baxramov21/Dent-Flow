import React, { useState } from 'react'

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

export const TOOTH_STATUSES = [
  { id: 'healthy', label: "Sog'lom", color: '#FFFFFF', textColor: '#374151' },
  { id: 'caries', label: 'Karies', color: '#EF4444', textColor: '#FFFFFF' },
  { id: 'filled', label: 'Plomba', color: '#3B82F6', textColor: '#FFFFFF' },
  { id: 'crown', label: 'Qoplama (Koronka)', color: '#F59E0B', textColor: '#FFFFFF' },
  { id: 'bridge', label: "Ko'prik (Most)", color: '#8B5CF6', textColor: '#FFFFFF' },
  { id: 'implant', label: 'Implant', color: '#9CA3AF', textColor: '#FFFFFF' },
  { id: 'extracted', label: 'Olingan', color: '#111827', textColor: '#FFFFFF' },
  { id: 'root_canal', label: 'Kanal davolangan', color: '#EC4899', textColor: '#FFFFFF' },
  { id: 'planned', label: 'Rejada', color: '#EEF2FF', textColor: '#6366F1', border: '2px dashed #6366F1' },
]

// Detailed Anatomical Shapes
const TEETH_DEFS = {
  incisor: {
    root: "M 16 5 C 18 -5, 24 -5, 26 5 C 28 30, 25 50, 21 50 C 17 50, 14 30, 16 5 Z",
    crown: "M 14 50 C 14 60, 14 75, 15 80 C 21 81, 27 81, 27 80 C 28 75, 28 60, 28 50 C 25 52, 17 52, 14 50 Z",
    occlusal: <rect x="14" y="8" width="14" height="6" rx="3" />
  },
  canine: {
    root: "M 14 5 C 17 -10, 25 -10, 28 5 C 30 30, 27 50, 21 50 C 15 50, 12 30, 14 5 Z",
    crown: "M 14 50 C 14 60, 19 78, 21 80 C 23 78, 28 60, 28 50 C 25 52, 17 52, 14 50 Z",
    occlusal: <circle cx="21" cy="11" r="5" />
  },
  premolar: {
    root: "M 15 10 C 17 -2, 25 -2, 27 10 C 28 30, 26 50, 21 50 C 16 50, 14 30, 15 10 Z",
    crown: "M 12 50 C 12 65, 17 75, 21 75 C 25 75, 30 65, 30 50 C 26 53, 16 53, 12 50 Z",
    occlusal: <ellipse cx="21" cy="11" rx="7" ry="5" />
  },
  upperMolar: {
    root: "M 11 15 C 9 0, 15 0, 17 15 C 19 35, 17 50, 17 50 C 13 50, 9 35, 11 15 Z M 31 15 C 33 0, 27 0, 25 15 C 23 35, 25 50, 25 50 C 29 50, 33 35, 31 15 Z M 19 10 C 19 -5, 23 -5, 23 10 C 23 35, 21 50, 21 50 C 19 50, 19 35, 19 10 Z",
    crown: "M 9 50 C 7 65, 11 75, 17 75 C 21 72, 21 72, 25 75 C 31 75, 35 65, 33 50 C 25 53, 17 53, 9 50 Z",
    occlusal: <rect x="8" y="4" width="26" height="14" rx="6" />
  },
  lowerMolar: {
    root: "M 13 15 C 9 0, 17 0, 19 15 C 21 35, 17 50, 17 50 C 13 50, 11 35, 13 15 Z M 29 15 C 33 0, 25 0, 23 15 C 21 35, 25 50, 25 50 C 29 50, 31 35, 29 15 Z",
    crown: "M 9 50 C 7 65, 11 75, 17 75 C 21 72, 21 72, 25 75 C 31 75, 35 65, 33 50 C 25 53, 17 53, 9 50 Z",
    occlusal: <rect x="8" y="4" width="26" height="14" rx="6" />
  }
}

const getToothShape = (num) => {
  const t = num % 10;
  if (t >= 6 && t <= 8) return num > 30 ? 'lowerMolar' : 'upperMolar';
  if (t === 4 || t === 5) return 'premolar';
  if (t === 3) return 'canine';
  return 'incisor';
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

  const renderToothColumn = (num, isUpper) => {
    const data = getToothStatus(num)
    const statusDef = TOOTH_STATUSES.find(s => s.id === data.status) || TOOTH_STATUSES[0]
    const isSelected = selectedTooth === num
    const shapeType = getToothShape(num)
    const defs = TEETH_DEFS[shapeType]
    
    const isExtracted = data.status === 'extracted';
    const isImplant = data.status === 'implant';
    const isRootCanal = data.status === 'root_canal';
    const isCrown = data.status === 'crown';
    const isCaries = data.status === 'caries';
    
    // Fill color for the crown (Root usually stays natural unless it's an implant)
    let crownColor = statusDef.color === '#FFFFFF' ? '#F8FAFC' : statusDef.color;
    if (isImplant) crownColor = '#FFFFFF'; // Implant crowns are usually white, screw is grey

    const AnatomySvg = () => (
      <div style={{ position: 'relative', width: '42px', height: '80px', transition: 'all 0.2s', opacity: isExtracted ? 0.2 : 1 }}>
        <svg viewBox="0 0 42 85" width="100%" height="100%" style={{ transform: isUpper ? 'none' : 'rotate(180deg)', overflow: 'visible', filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.4))' }}>
          <defs>
            {/* Natural Root Gradient */}
            <linearGradient id={`root-${num}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D4B88B" />
              <stop offset="50%" stopColor="#E8D5B5" />
              <stop offset="100%" stopColor="#C4A471" />
            </linearGradient>
            {/* Crown Gradient */}
            <linearGradient id={`crown-${num}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="30%" stopColor={crownColor} />
              <stop offset="70%" stopColor={crownColor} />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            {/* Implant Metallic Gradient */}
            <linearGradient id={`metal-${num}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6B7280" />
              <stop offset="50%" stopColor="#D1D5DB" />
              <stop offset="100%" stopColor="#4B5563" />
            </linearGradient>
          </defs>

          {/* Render Root or Implant Screw */}
          {isImplant ? (
            <g>
              <path d="M 17 10 L 25 10 L 25 45 L 21 50 L 17 45 Z" fill={`url(#metal-${num})`} stroke="#374151" strokeWidth="1" />
              {/* Screw Threads */}
              {[15, 20, 25, 30, 35, 40].map(y => (
                <line key={y} x1="16" y1={y} x2="26" y2={y} stroke="#374151" strokeWidth="1.5" />
              ))}
            </g>
          ) : (
            <path 
              d={defs.root} 
              fill={`url(#root-${num})`} 
              stroke="#A88B5D" 
              strokeWidth="0.5" 
            />
          )}

          {/* Root Canal Indicator */}
          {isRootCanal && !isImplant && (
             <path d={defs.root} fill="none" stroke="#EC4899" strokeWidth="3" opacity="0.6" style={{ transform: 'scale(0.8) translate(5px, 10px)' }} />
          )}

          {/* Render Crown */}
          <path 
            d={defs.crown} 
            fill={`url(#crown-${num})`} 
            stroke={data.status === 'planned' ? '#6366F1' : 'rgba(0,0,0,0.2)'} 
            strokeWidth={data.status === 'planned' ? '1.5' : '0.5'} 
            strokeDasharray={data.status === 'planned' ? '3 2' : 'none'} 
          />
          
          {/* Subtle highlight overlay on crown */}
          <path d={defs.crown} fill="url(#highlight)" style={{ mixBlendMode: 'overlay' }} />
          
          {/* Caries Spot (if caries, add a dark spot to the crown) */}
          {isCaries && (
            <circle cx="21" cy="65" r="4" fill="#7F1D1D" opacity="0.8" />
          )}
        </svg>
        {isExtracted && (
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#EF4444', fontWeight: '900', fontSize: '28px' }}>✕</span>
        )}
      </div>
    )

    const OcclusalSvg = () => (
      <div style={{ width: '32px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: isExtracted ? 0.2 : 1 }}>
        <svg viewBox="0 0 42 24" width="100%" height="100%" style={{ overflow: 'visible', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.4))' }}>
          {React.cloneElement(defs.occlusal, { 
            fill: `url(#crown-${num})`, 
            stroke: data.status === 'planned' ? '#6366F1' : 'rgba(0,0,0,0.3)',
            strokeWidth: data.status === 'planned' ? '1.5' : '1'
          })}
          {isCaries && (
            <circle cx="21" cy="11" r="3" fill="#7F1D1D" opacity="0.8" />
          )}
        </svg>
      </div>
    )

    const NumberLabel = () => (
      <span style={{ fontSize: '12px', fontWeight: '700', color: isSelected ? 'white' : '#9CA3AF' }}>
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
          padding: '8px 4px',
          borderRadius: '8px',
          backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
          boxShadow: isSelected ? '0 0 0 1px #6366F1' : 'none',
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
        gap: '40px', 
        padding: '40px 24px', 
        backgroundColor: '#1E2330', // Very dark blue/grey matching Derec app
        borderRadius: '24px',
        border: '1px solid #334155',
        boxShadow: 'inset 0 4px 30px rgba(0,0,0,0.5)',
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
