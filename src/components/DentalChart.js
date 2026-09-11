import React, { useState } from 'react'

const ADULT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const ADULT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

const CHILD_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]
const CHILD_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]

export const TOOTH_STATUSES = [
  { id: 'healthy', label: "Sog'lom", color: '#FFFFFF', textColor: '#374151' },
  { id: 'caries', label: 'Karies', color: '#EF4444', textColor: '#FFFFFF' },
  { id: 'filled', label: 'Plomba', color: '#3B82F6', textColor: '#FFFFFF' },
  { id: 'crown', label: 'Qoplama (Koronka)', color: '#F59E0B', textColor: '#FFFFFF' },
  { id: 'bridge', label: "Ko'prik (Most)", color: '#8B5CF6', textColor: '#FFFFFF' },
  { id: 'implant', label: 'Implant', color: '#9CA3AF', textColor: '#FFFFFF' },
  { id: 'extracted', label: 'Olingan', color: 'transparent', textColor: '#111827' },
  { id: 'root_canal', label: 'Kanal davolangan', color: '#EC4899', textColor: '#FFFFFF' },
  { id: 'planned', label: 'Rejada', color: '#EEF2FF', textColor: '#6366F1', border: '2px dashed #6366F1' },
]

// Sleek unified vector paths
const TEETH_DEFS = {
  incisor: "M 22 15 C 24 -5, 36 -5, 38 15 C 38 50, 42 75, 42 95 C 42 110, 18 110, 18 95 C 18 75, 22 50, 22 15 Z",
  canine: "M 22 15 C 24 -10, 36 -10, 38 15 C 38 50, 46 75, 46 95 C 46 105, 30 115, 30 115 C 30 115, 14 105, 14 95 C 14 75, 22 50, 22 15 Z",
  premolar: "M 18 20 C 20 -5, 40 -5, 42 20 C 42 50, 46 70, 46 90 C 46 105, 14 105, 14 90 C 14 70, 18 50, 18 20 Z",
  upperMolar: "M 12 25 C 10 5, 25 0, 28 20 C 30 5, 45 0, 45 20 C 48 5, 52 10, 48 25 C 45 50, 50 65, 50 85 C 50 105, 10 105, 10 85 C 10 65, 15 50, 12 25 Z",
  lowerMolar: "M 15 25 C 12 5, 28 0, 30 20 C 32 0, 48 5, 45 25 C 42 50, 48 65, 48 85 C 48 105, 12 105, 12 85 C 12 65, 18 50, 15 25 Z"
}

const getToothShape = (num) => {
  const t = num % 10;
  if (t >= 6 && t <= 8) return num > 30 && num < 50 ? 'lowerMolar' : 'upperMolar'; // Molar logic
  if (t === 4 || t === 5) return 'premolar';
  if (t === 3) return 'canine';
  return 'incisor';
}

const SurfaceDiagram = ({ selectedSurfaces, onToggleSurface }) => {
  const surfaces = [
    { id: 'B', path: "M 0 0 L 100 0 L 70 30 L 30 30 Z", label: "Buccal" },
    { id: 'L', path: "M 0 100 L 100 100 L 70 70 L 30 70 Z", label: "Lingual" },
    { id: 'M', path: "M 0 0 L 30 30 L 30 70 L 0 100 Z", label: "Mesial" },
    { id: 'D', path: "M 100 0 L 70 30 L 70 70 L 100 100 Z", label: "Distal" },
    { id: 'O', path: "M 30 30 L 70 30 L 70 70 L 30 70 Z", label: "Occlusal" },
  ]
  return (
    <svg viewBox="0 0 100 100" width="80" height="80" style={{ cursor: 'pointer', display: 'block', margin: '0 auto' }}>
      {surfaces.map(s => {
        const isSel = selectedSurfaces[s.id];
        const colorObj = TOOTH_STATUSES.find(st => st.id === isSel);
        const fill = colorObj ? colorObj.color : '#F1F5F9';
        return (
          <g key={s.id} onClick={() => onToggleSurface(s.id)}>
            <path 
              d={s.path} 
              fill={fill} 
              stroke="#CBD5E1" 
              strokeWidth="2"
              style={{ transition: 'all 0.2s' }}
            />
            <title>{s.label}</title>
          </g>
        )
      })}
    </svg>
  )
}

export default function DentalChart({ toothData = [], onUpdateTooth, readOnly = false }) {
  const [selectedTooth, setSelectedTooth] = useState(null)
  const [viewType, setViewType] = useState('adult') // 'adult' | 'child'
  const [activeSurface, setActiveSurface] = useState(null) // Which surface we are currently editing
  
  const getParsedData = (number) => {
    const t = toothData.find(x => x.tooth_number === number) || { status: 'healthy', notes: '' };
    let surfaces = {};
    let textNote = t.notes;
    try {
      const parsed = JSON.parse(t.notes);
      if (parsed && typeof parsed === 'object' && parsed.surfaces) {
        surfaces = parsed.surfaces;
        textNote = parsed.text || '';
      }
    } catch (e) {
      // Not JSON, ignore
    }
    return { ...t, surfaces, textNote };
  }

  const handleToothClick = (number) => {
    if (readOnly) return
    setSelectedTooth(selectedTooth === number ? null : number)
    setActiveSurface(null)
  }

  const handleStatusChange = (statusId) => {
    if (!selectedTooth || readOnly) return
    
    const current = getParsedData(selectedTooth)
    let newStatus = current.status;
    let newSurfaces = { ...current.surfaces };

    if (activeSurface) {
      if (statusId === 'healthy') {
        delete newSurfaces[activeSurface]
      } else {
        newSurfaces[activeSurface] = statusId
      }
      // If we just added a major status to a surface, perhaps tint the whole tooth to match if it was healthy
      if (statusId !== 'healthy' && newStatus === 'healthy') {
        newStatus = statusId; 
      }
    } else {
      newStatus = statusId;
      if (statusId === 'healthy') newSurfaces = {}; // Clear surfaces if resetting tooth
    }

    const newNotes = JSON.stringify({ surfaces: newSurfaces, text: current.textNote });
    onUpdateTooth(selectedTooth, newStatus, newNotes)
    
    // Auto-close if editing whole tooth, but stay open if editing surfaces
    if (!activeSurface) setSelectedTooth(null);
  }

  const renderToothColumn = (num, isUpper) => {
    const data = getParsedData(num)
    const statusDef = TOOTH_STATUSES.find(s => s.id === data.status) || TOOTH_STATUSES[0]
    const isSelected = selectedTooth === num
    const shapePath = TEETH_DEFS[getToothShape(num)]
    
    const isExtracted = data.status === 'extracted';
    
    // Determine fill
    const isNeutralStatus = ['healthy', 'extracted', 'planned'].includes(statusDef.id);
    const toothColor = isNeutralStatus ? '#F8FAFC' : statusDef.color;

    // Helper to get surface color dots
    const getSurfColor = (surfId) => {
      if (!data.surfaces[surfId]) return null;
      const st = TOOTH_STATUSES.find(s => s.id === data.surfaces[surfId]);
      return st ? st.color : null;
    }

    const AnatomySvg = () => (
      <div style={{ position: 'relative', width: '40px', height: '80px', transition: 'all 0.3s', filter: isSelected ? 'drop-shadow(0 0 8px rgba(99,102,241,0.6))' : 'none', opacity: isExtracted ? 0.3 : 1 }}>
        <svg viewBox="0 0 60 120" width="100%" height="100%" style={{ transform: isUpper ? 'none' : 'rotate(180deg)', overflow: 'visible' }}>
          <defs>
            <linearGradient id="sleekTooth" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="20%" stopColor="#FFFFFF" />
              <stop offset="80%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <linearGradient id="lightingOverlay" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.2" />
              <stop offset="20%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Base shape with gradient */}
          <path d={shapePath} fill={isNeutralStatus ? "url(#sleekTooth)" : toothColor} stroke="#94A3B8" strokeWidth="1" />
          
          {/* Lighting Overlay for colored teeth */}
          {!isNeutralStatus && (
            <path d={shapePath} fill="url(#lightingOverlay)" style={{ mixBlendMode: 'overlay' }} />
          )}

          {/* Surface Indicator Dots */}
          {getSurfColor('B') && <circle cx="30" cy="70" r="4" fill={getSurfColor('B')} />}
          {getSurfColor('O') && <circle cx="30" cy="90" r="5" fill={getSurfColor('O')} />}
          {getSurfColor('M') && <circle cx="20" cy="85" r="4" fill={getSurfColor('M')} />}
          {getSurfColor('D') && <circle cx="40" cy="85" r="4" fill={getSurfColor('D')} />}
          {getSurfColor('L') && <circle cx="30" cy="105" r="4" fill={getSurfColor('L')} />}
        </svg>

        {/* Extracted X Overlay */}
        {isExtracted && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <span style={{ color: '#111827', fontSize: '32px', fontWeight: '300' }}>✕</span>
          </div>
        )}
      </div>
    )

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
          padding: '4px',
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
            <span style={{ fontSize: '13px', fontWeight: '600', color: isSelected ? 'var(--accent)' : '#475569' }}>{num}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '13px', fontWeight: '600', color: isSelected ? 'var(--accent)' : '#475569' }}>{num}</span>
            <AnatomySvg />
          </>
        )}
      </div>
    )
  }

  const upperRow = viewType === 'adult' ? ADULT_UPPER : CHILD_UPPER;
  const lowerRow = viewType === 'adult' ? ADULT_LOWER : CHILD_LOWER;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', width: '100%' }}>
      
      {/* Controls */}
      <div style={{ display: 'flex', gap: '16px', alignSelf: 'flex-start' }}>
        <button 
          onClick={() => setViewType('adult')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--accent)', background: viewType === 'adult' ? 'var(--accent)' : 'transparent', color: viewType === 'adult' ? 'white' : 'var(--accent)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          Doimiy tishlar (Kattalar)
        </button>
        <button 
          onClick={() => setViewType('child')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--accent)', background: viewType === 'child' ? 'var(--accent)' : 'transparent', color: viewType === 'child' ? 'white' : 'var(--accent)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          Sut tishlari (Bolalar)
        </button>
      </div>

      {/* Chart Canvas */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '40px', 
        padding: '60px 24px', 
        backgroundColor: '#FFFFFF',
        position: 'relative',
        borderRadius: '24px',
        border: '1px solid #E2E8F0',
        overflowX: 'auto',
        width: '100%'
      }}>
        {/* Soft reddish background glow line to simulate gums */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '120px', transform: 'translateY(-50%)', background: 'linear-gradient(to bottom, rgba(239,68,68,0) 0%, rgba(239,68,68,0.15) 50%, rgba(239,68,68,0) 100%)', pointerEvents: 'none' }} />
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', minWidth: 'fit-content', position: 'relative' }}>
          {upperRow.map(num => renderToothColumn(num, true))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', minWidth: 'fit-content', position: 'relative' }}>
          {lowerRow.map(num => renderToothColumn(num, false))}
        </div>
      </div>

      {/* Editor Popover/Panel */}
      {!readOnly && selectedTooth && (
        <div style={{ 
          width: '100%', padding: '24px', backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--accent)', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>
              {selectedTooth}-Tishni tahrirlash
            </h3>
            <button onClick={() => setSelectedTooth(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            
            {/* 5-Surface Diagram */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Yuzalar (Surfaces)</span>
              <SurfaceDiagram 
                selectedSurfaces={getParsedData(selectedTooth).surfaces} 
                onToggleSurface={(surfId) => setActiveSurface(activeSurface === surfId ? null : surfId)}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {activeSurface ? `Tanlangan yuza: ${activeSurface}` : 'Yuzani tanlash uchun bosing'}
              </span>
            </div>

            {/* Status Buttons */}
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>
                {activeSurface ? `${activeSurface} yuzasi uchun holatni tanlang` : 'Butun tish uchun holatni tanlang'}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {TOOTH_STATUSES.map(status => (
                  <button
                    key={status.id}
                    onClick={() => handleStatusChange(status.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', borderRadius: '12px',
                      backgroundColor: status.id === 'healthy' || status.id === 'extracted' ? '#F8FAFC' : status.color,
                      color: status.id === 'healthy' || status.id === 'extracted' ? '#333' : status.textColor,
                      border: status.border || '1px solid rgba(0,0,0,0.1)',
                      fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: (status.id !== 'healthy' && status.id !== 'extracted') ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', padding: '20px', backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)' }}>
        {TOOTH_STATUSES.map(status => (
          <div key={status.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '6px', backgroundColor: status.id === 'healthy' || status.id === 'extracted' ? '#E2E8F0' : status.color, border: status.border || '1px solid rgba(0,0,0,0.1)' }} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>{status.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
