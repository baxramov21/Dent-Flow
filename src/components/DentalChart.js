import React, { useState } from 'react'

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

export const TOOTH_STATUSES = [
  { id: 'healthy', label: "Sog'lom", color: '#F8FAFC', textColor: '#374151' },
  { id: 'caries', label: 'Karies', color: '#EF4444', textColor: '#FFFFFF' },
  { id: 'filled', label: 'Plomba', color: '#FCD34D', textColor: '#92400E' }, // Yellowish like reference
  { id: 'crown', label: 'Qoplama (Koronka)', color: '#1E3A8A', textColor: '#FFFFFF' }, // Dark blue like reference
  { id: 'bridge', label: "Ko'prik (Most)", color: '#8B5CF6', textColor: '#FFFFFF' },
  { id: 'implant', label: 'Implant', color: '#9CA3AF', textColor: '#FFFFFF' },
  { id: 'extracted', label: 'Olingan', color: 'transparent', textColor: '#111827' },
  { id: 'root_canal', label: 'Kanal davolangan', color: '#06B6D4', textColor: '#FFFFFF' }, // Cyan line in reference
  { id: 'planned', label: 'Rejada', color: '#EEF2FF', textColor: '#6366F1', border: '2px dashed #6366F1' },
]

// 3D Path definitions (ViewBox 0 0 60 120)
const TEETH_PATHS = {
  incisor: {
    roots: [
      <path key="r1" d="M 22 60 C 22 30, 27 10, 30 5 C 33 10, 38 30, 38 60 Z" />
    ],
    crown: "M 20 60 C 20 70, 18 90, 20 100 C 22 105, 38 105, 40 100 C 42 90, 40 70, 40 60 C 35 63, 25 63, 20 60 Z"
  },
  canine: {
    roots: [
      <path key="r1" d="M 20 60 C 20 30, 25 5, 30 0 C 35 5, 40 30, 40 60 Z" />
    ],
    crown: "M 20 60 C 20 75, 24 95, 28 105 C 30 110, 32 110, 32 105 C 36 95, 40 75, 40 60 C 35 63, 25 63, 20 60 Z"
  },
  premolar: {
    roots: [
      <path key="r1" d="M 24 60 C 24 35, 27 15, 30 10 C 33 15, 36 35, 36 60 Z" />
    ],
    crown: "M 18 60 C 18 70, 22 80, 26 85 C 28 87, 32 87, 34 85 C 38 80, 42 70, 42 60 C 36 63, 24 63, 18 60 Z"
  },
  upperMolar: {
    roots: [
      <path key="r1" d="M 28 60 C 28 35, 29 10, 30 5 C 31 10, 32 35, 32 60 Z" fill="url(#rootDark)" />, 
      <path key="r2" d="M 20 60 C 18 40, 12 20, 16 10 C 20 15, 26 35, 26 60 Z" />, 
      <path key="r3" d="M 40 60 C 42 40, 48 20, 44 10 C 40 15, 34 35, 34 60 Z" />
    ],
    crown: "M 14 60 C 12 75, 14 90, 20 95 C 24 98, 26 95, 30 95 C 34 95, 36 98, 40 95 C 46 90, 48 75, 46 60 C 36 64, 24 64, 14 60 Z"
  },
  lowerMolar: {
    roots: [
      <path key="r1" d="M 22 60 C 20 35, 16 15, 20 10 C 24 15, 28 35, 28 60 Z" />,
      <path key="r2" d="M 38 60 C 40 35, 44 15, 40 10 C 36 15, 32 35, 32 60 Z" />
    ],
    crown: "M 14 60 C 12 75, 14 90, 20 95 C 24 98, 26 95, 30 95 C 34 95, 36 98, 40 95 C 46 90, 48 75, 46 60 C 36 64, 24 64, 14 60 Z"
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
    const defs = TEETH_PATHS[shapeType]
    
    const isExtracted = data.status === 'extracted';
    const isImplant = data.status === 'implant';
    const isRootCanal = data.status === 'root_canal';
    const isCaries = data.status === 'caries';
    
    // Determine crown fill
    const isNeutralStatus = ['healthy', 'extracted', 'planned', 'root_canal'].includes(statusDef.id);
    const crownColor = isNeutralStatus ? '#F8FAFC' : statusDef.color;

    const AnatomySvg = () => (
      <div style={{ position: 'relative', width: '48px', height: '96px', transition: 'all 0.2s', filter: isSelected ? 'drop-shadow(0 0 8px rgba(99,102,241,0.6))' : 'none' }}>
        <svg viewBox="0 0 60 120" width="100%" height="100%" style={{ transform: isUpper ? 'none' : 'rotate(180deg)', overflow: 'visible' }}>
          <defs>
            {/* Extremely realistic root gradient (tan/yellowish bone) */}
            <linearGradient id="root3D" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8A7A63" />
              <stop offset="20%" stopColor="#C9BBA5" />
              <stop offset="50%" stopColor="#EADDC7" />
              <stop offset="80%" stopColor="#C9BBA5" />
              <stop offset="100%" stopColor="#7A6A53" />
            </linearGradient>
            
            {/* Darker root gradient for background roots */}
            <linearGradient id="rootDark" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6B5C47" />
              <stop offset="50%" stopColor="#A3937C" />
              <stop offset="100%" stopColor="#6B5C47" />
            </linearGradient>

            {/* Implant Metallic Gradient */}
            <linearGradient id="metal3D" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4B5563" />
              <stop offset="30%" stopColor="#D1D5DB" />
              <stop offset="50%" stopColor="#F3F4F6" />
              <stop offset="70%" stopColor="#9CA3AF" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Crown Lighting Overlay (Black/White to simulate 3D volume) */}
            <linearGradient id="crownLighting" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
              <stop offset="15%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
            </linearGradient>
            
            {/* Subtle inner shadow at the cementoenamel junction */}
            <radialGradient id="cejShadow" cx="50%" cy="50%" r="50%" fx="50%" fy="0%">
               <stop offset="0%" stopColor="#000000" stopOpacity="0.3"/>
               <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
            </radialGradient>
          </defs>

          {/* Render Roots or Implant */}
          <g>
            {isImplant ? (
              <g>
                <path d="M 22 60 L 22 20 L 26 10 L 34 10 L 38 20 L 38 60 Z" fill="url(#metal3D)" stroke="#374151" strokeWidth="1" />
                {[20, 25, 30, 35, 40, 45, 50, 55].map(y => (
                  <line key={y} x1="21" y1={y} x2="39" y2={y+2} stroke="#1F2937" strokeWidth="2" opacity="0.6" />
                ))}
              </g>
            ) : (
              <g stroke="#8A7A63" strokeWidth="0.5">
                {React.Children.map(defs.roots, child => 
                  React.cloneElement(child, { fill: child.props.fill || "url(#root3D)" })
                )}
              </g>
            )}
          </g>

          {/* Root Canal indicator (Cyan line down root) */}
          {isRootCanal && !isImplant && (
             <path d="M 30 15 L 30 55" stroke="#06B6D4" strokeWidth="3" opacity="0.8" />
          )}

          {/* Render Crown Base Color */}
          <path 
            d={defs.crown} 
            fill={crownColor} 
          />
          
          {/* Render Crown 3D Lighting Overlay */}
          <path 
            d={defs.crown} 
            fill="url(#crownLighting)" 
            style={{ mixBlendMode: 'overlay' }} 
          />
          <path 
            d={defs.crown} 
            fill="url(#crownLighting)" 
            style={{ mixBlendMode: 'multiply', opacity: 0.3 }} 
          />
          
          {/* CEJ Shadow overlay (where crown meets root) */}
          <path d="M 14 60 Q 30 65 46 60 Q 30 55 14 60 Z" fill="url(#cejShadow)" opacity="0.5" />

          {/* Caries Spot */}
          {isCaries && (
            <circle cx="30" cy="80" r="6" fill="#7F1D1D" opacity="0.9" />
          )}
        </svg>

        {/* Extracted X Overlay */}
        {isExtracted && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
             <svg viewBox="0 0 60 120" width="100%" height="100%">
               <line x1="5" y1="5" x2="55" y2="115" stroke="#111827" strokeWidth="3" />
               <line x1="55" y1="5" x2="5" y2="115" stroke="#111827" strokeWidth="3" />
             </svg>
          </div>
        )}
      </div>
    )

    const NumberLabel = () => (
      <span style={{ fontSize: '13px', fontWeight: '800', color: isSelected ? 'var(--accent)' : '#64748B' }}>
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
          backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
          transition: 'all 0.2s',
          transform: isSelected ? 'scale(1.1)' : 'scale(1)',
          zIndex: isSelected ? 10 : 1
        }}
      >
        {isUpper ? (
          <>
            <AnatomySvg />
            <NumberLabel />
          </>
        ) : (
          <>
            <NumberLabel />
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
        gap: '60px', 
        padding: '60px 24px', 
        backgroundColor: '#EAEBE7', // Light olive/grey background matching user's newest screenshot perfectly
        borderRadius: '24px',
        border: '1px solid #D1D5DB',
        boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.05)',
        overflowX: 'auto',
        width: '100%'
      }}>
        
        {/* Upper Teeth Row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', minWidth: 'fit-content' }}>
          {UPPER_TEETH.map(num => renderToothColumn(num, true))}
        </div>

        {/* Lower Teeth Row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', minWidth: 'fit-content' }}>
          {LOWER_TEETH.map(num => renderToothColumn(num, false))}
        </div>

      </div>

      {/* Editor Panel */}
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
                  backgroundColor: status.id === 'healthy' || status.id === 'extracted' ? '#F8FAFC' : status.color,
                  color: status.id === 'healthy' || status.id === 'extracted' ? '#333' : status.textColor,
                  border: status.border || '1px solid rgba(0,0,0,0.1)',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (status.id !== 'healthy' && status.id !== 'extracted') ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
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
              backgroundColor: status.id === 'healthy' || status.id === 'extracted' ? '#E2E8F0' : status.color, 
              border: status.border || '1px solid rgba(0,0,0,0.1)'
            }} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>{status.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
