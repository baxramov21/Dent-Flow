import React, { useState } from 'react'

/* ─────────────────────────────────────────
   Tooth arrays  (FDI notation)
───────────────────────────────────────── */
const ADULT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const ADULT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
const CHILD_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]
const CHILD_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]

export const TOOTH_STATUSES = [
  { id: 'healthy',    label: "Sog'lom",          color: null,      textColor: '#374151' },
  { id: 'caries',     label: 'Karies',            color: '#EF4444', textColor: '#fff' },
  { id: 'filled',     label: 'Plomba',            color: '#3B82F6', textColor: '#fff' },
  { id: 'crown',      label: 'Qoplama',           color: '#F59E0B', textColor: '#fff' },
  { id: 'bridge',     label: "Ko'prik",           color: '#8B5CF6', textColor: '#fff' },
  { id: 'implant',    label: 'Implant',           color: '#6B7280', textColor: '#fff' },
  { id: 'extracted',  label: 'Olingan',           color: null,      textColor: '#111827' },
  { id: 'root_canal', label: 'Kanal',             color: '#EC4899', textColor: '#fff' },
  { id: 'planned',    label: 'Rejada',            color: '#6366F1', textColor: '#fff' },
]

/* ─────────────────────────────────────────
   Classify tooth by FDI number
───────────────────────────────────────── */
const classify = (num) => {
  const t = num % 10
  // child teeth: 1-5 in each quadrant
  if (num >= 51 && num <= 85) {
    if (t <= 2) return 'ci'      // child incisor
    if (t === 3) return 'cc'     // child canine
    return 'cm'                  // child molar
  }
  if (t >= 6 && t <= 8) return num >= 30 && num < 50 ? 'lm' : 'um'
  if (t === 4 || t === 5) return 'pm'
  if (t === 3) return 'cn'
  return 'in'
}

/* ─────────────────────────────────────────
   SVG tooth paths — viewBox "0 0 60 160"
   Upper teeth: crown top (y≈0–55), roots down (y≈55–155)
   Lower teeth: same path but flipped via transform
───────────────────────────────────────── */
const PATHS = {
  // ── Central / Lateral Incisor ──────────────────────────────
  in: {
    crown: 'M 18 55 C 16 45 15 30 17 18 C 20 5 40 5 43 18 C 45 30 44 45 42 55 Z',
    roots: [
      'M 22 55 C 22 80 24 115 28 140 C 29 148 31 150 30 150 C 29 150 30 148 32 140 C 36 115 38 80 38 55 Z'
    ],
    highlight: 'M 22 25 C 22 15 26 10 30 10 C 34 10 35 15 34 25 C 32 20 28 20 22 25 Z'
  },
  // ── Canine ────────────────────────────────────────────────
  cn: {
    crown: 'M 15 55 C 14 42 13 28 16 15 C 20 2 40 2 44 15 C 47 28 46 42 45 55 Z',
    roots: [
      'M 20 55 C 19 82 21 120 25 148 C 26 154 30 158 30 158 C 30 158 34 154 35 148 C 39 120 41 82 40 55 Z'
    ],
    highlight: 'M 21 22 C 22 12 26 7 30 7 C 34 7 36 12 36 22 C 32 16 28 16 21 22 Z'
  },
  // ── Premolar ──────────────────────────────────────────────
  pm: {
    crown: 'M 11 55 C 10 42 11 28 14 18 C 17 6 22 2 30 2 C 38 2 43 6 46 18 C 49 28 50 42 49 55 Z',
    roots: [
      'M 16 55 C 15 80 16 112 18 138 C 19 146 21 150 22 148 C 23 146 24 142 24 138 C 25 112 27 80 27 55 Z',
      'M 33 55 C 33 80 35 112 36 138 C 36 142 37 146 38 148 C 39 150 41 146 42 138 C 44 112 45 80 44 55 Z'
    ],
    highlight: 'M 17 22 C 18 10 22 5 30 5 C 38 5 42 10 43 22 C 38 14 22 14 17 22 Z'
  },
  // ── Upper Molar ───────────────────────────────────────────
  um: {
    crown: 'M 7 55 C 6 42 7 26 10 14 C 13 4 19 0 30 0 C 41 0 47 4 50 14 C 53 26 54 42 53 55 Z',
    roots: [
      // buccal-mesial
      'M 10 55 C 9 78 9 108 11 132 C 12 140 14 144 15 142 C 16 140 17 136 17 130 C 18 108 20 78 21 55 Z',
      // palatal (center, tall)
      'M 25 55 C 24 82 25 118 26 145 C 26 152 28 156 30 156 C 32 156 34 152 34 145 C 35 118 36 82 35 55 Z',
      // buccal-distal
      'M 39 55 C 40 78 42 108 43 130 C 43 136 44 140 45 142 C 46 144 48 140 49 132 C 51 108 51 78 50 55 Z'
    ],
    highlight: 'M 13 20 C 14 8 19 2 30 2 C 41 2 46 8 47 20 C 40 12 20 12 13 20 Z'
  },
  // ── Lower Molar ───────────────────────────────────────────
  lm: {
    crown: 'M 7 55 C 6 42 7 26 10 14 C 13 4 19 0 30 0 C 41 0 47 4 50 14 C 53 26 54 42 53 55 Z',
    roots: [
      // mesial root
      'M 10 55 C 9 78 9 108 11 134 C 12 142 14 146 16 144 C 18 142 19 138 20 134 C 22 108 23 78 23 55 Z',
      // distal root
      'M 37 55 C 37 78 38 108 40 134 C 41 138 42 142 44 144 C 46 146 48 142 49 134 C 51 108 51 78 50 55 Z'
    ],
    highlight: 'M 13 20 C 14 8 19 2 30 2 C 41 2 46 8 47 20 C 40 12 20 12 13 20 Z'
  },
  // ── Child Incisor ────────────────────────────────────────
  ci: {
    crown: 'M 20 55 C 18 44 18 30 20 20 C 23 8 37 8 40 20 C 42 30 42 44 40 55 Z',
    roots: [
      'M 24 55 C 24 76 25 100 27 118 C 28 124 30 126 30 126 C 30 126 32 124 33 118 C 35 100 36 76 36 55 Z'
    ],
    highlight: 'M 22 26 C 23 16 26 12 30 12 C 34 12 37 16 38 26 C 34 20 26 20 22 26 Z'
  },
  // ── Child Canine ─────────────────────────────────────────
  cc: {
    crown: 'M 17 55 C 16 42 16 28 19 16 C 22 5 38 5 41 16 C 44 28 44 42 43 55 Z',
    roots: [
      'M 22 55 C 21 78 22 108 24 128 C 25 134 28 138 30 138 C 32 138 35 134 36 128 C 38 108 39 78 38 55 Z'
    ],
    highlight: 'M 21 22 C 22 12 26 8 30 8 C 34 8 38 12 39 22 C 34 15 26 15 21 22 Z'
  },
  // ── Child Molar ──────────────────────────────────────────
  cm: {
    crown: 'M 9 55 C 8 42 9 26 12 15 C 15 5 21 0 30 0 C 39 0 45 5 48 15 C 51 26 52 42 51 55 Z',
    roots: [
      'M 11 55 C 10 76 10 102 12 120 C 13 128 15 130 17 128 C 19 126 20 122 20 120 C 22 102 23 76 23 55 Z',
      'M 37 55 C 37 76 38 102 40 120 C 40 122 41 126 43 128 C 45 130 47 128 48 120 C 50 102 50 76 49 55 Z'
    ],
    highlight: 'M 14 20 C 15 9 20 3 30 3 C 40 3 45 9 46 20 C 40 13 20 13 14 20 Z'
  }
}

/* ─────────────────────────────────────────
   Single Tooth SVG renderer
───────────────────────────────────────── */
function ToothSVG({ num, isUpper, status, crownColor, isSelected, onClick }) {
  const type = classify(num)
  const def = PATHS[type]
  if (!def) return null

  const isExtracted = status === 'extracted'
  const uid = `t${num}`

  // For lower teeth we flip vertically so roots point down
  const transform = isUpper ? '' : 'scale(1,-1) translate(0,-160)'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        transition: 'transform 0.18s',
        transform: isSelected ? 'scale(1.12)' : 'scale(1)',
        zIndex: isSelected ? 10 : 1,
        position: 'relative'
      }}
    >
      {/* Number label */}
      {!isUpper && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: isSelected ? '#6366F1' : '#475569',
          letterSpacing: 0.2
        }}>{num}</span>
      )}

      <div style={{
        width: 44, height: 100,
        filter: isSelected
          ? 'drop-shadow(0 0 6px rgba(99,102,241,0.7))'
          : 'drop-shadow(0 2px 3px rgba(0,0,0,0.18))',
        opacity: isExtracted ? 0.18 : 1,
        transition: 'all 0.18s'
      }}>
        <svg
          viewBox="0 0 60 160"
          width="100%" height="100%"
          overflow="visible"
        >
          <defs>
            {/* Main tooth body gradient — creates the 3-D cylinder look */}
            <linearGradient id={`${uid}-body`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#C0BFBD" />
              <stop offset="12%"  stopColor="#D8D7D5" />
              <stop offset="35%"  stopColor="#F2F1EF" />
              <stop offset="50%"  stopColor="#FFFFFF" />
              <stop offset="65%"  stopColor="#EDECEB" />
              <stop offset="85%"  stopColor="#D0CFCD" />
              <stop offset="100%" stopColor="#B8B7B5" />
            </linearGradient>

            {/* Subtle vertical gradient for depth (top brighter, root tip darker) */}
            <linearGradient id={`${uid}-vert`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.6" />
              <stop offset="40%"  stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
            </linearGradient>

            {/* Crown color overlay when status is set */}
            {crownColor && (
              <linearGradient id={`${uid}-col`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#000000" stopOpacity="0.25" />
                <stop offset="20%"  stopColor={crownColor} stopOpacity="0.85" />
                <stop offset="50%"  stopColor={crownColor} stopOpacity="0.95" />
                <stop offset="80%"  stopColor={crownColor} stopOpacity="0.85" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
              </linearGradient>
            )}

            {/* Highlight oval — the bright specular spot on the crown */}
            <radialGradient id={`${uid}-hi`} cx="50%" cy="40%" r="45%" fx="50%" fy="25%">
              <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="60%"  stopColor="#FFFFFF" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g transform={transform}>
            {/* Roots */}
            {def.roots.map((rPath, i) => (
              <React.Fragment key={i}>
                <path d={rPath} fill={`url(#${uid}-body)`} stroke="#ABA9A6" strokeWidth="0.6" />
                <path d={rPath} fill={`url(#${uid}-vert)`} />
              </React.Fragment>
            ))}

            {/* Crown body */}
            <path d={def.crown} fill={`url(#${uid}-body)`} stroke="#B0AEAB" strokeWidth="0.7" />
            {/* Crown vertical shading */}
            <path d={def.crown} fill={`url(#${uid}-vert)`} />
            {/* Crown color overlay */}
            {crownColor && (
              <path d={def.crown} fill={`url(#${uid}-col)`} />
            )}
            {/* Specular highlight */}
            <path d={def.highlight} fill={`url(#${uid}-hi)`} />
          </g>

          {/* Extracted X */}
          {isExtracted && (
            <g>
              <line x1="5" y1="5" x2="55" y2="155" stroke="#374151" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="55" y1="5" x2="5" y2="155" stroke="#374151" strokeWidth="3.5" strokeLinecap="round" />
            </g>
          )}
        </svg>
      </div>

      {isUpper && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: isSelected ? '#6366F1' : '#475569',
          letterSpacing: 0.2
        }}>{num}</span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   5-Surface diagram
───────────────────────────────────────── */
const SURF_PATHS = [
  { id: 'B', d: 'M 0 0 L 100 0 L 72 28 L 28 28 Z',        label: 'Buccal' },
  { id: 'L', d: 'M 0 100 L 100 100 L 72 72 L 28 72 Z',    label: 'Lingual' },
  { id: 'M', d: 'M 0 0 L 28 28 L 28 72 L 0 100 Z',        label: 'Mesial' },
  { id: 'D', d: 'M 100 0 L 72 28 L 72 72 L 100 100 Z',    label: 'Distal' },
  { id: 'O', d: 'M 28 28 L 72 28 L 72 72 L 28 72 Z',       label: 'Occlusal' },
]

function SurfaceDiagram({ surfaces, activeSurface, onToggle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Yuzani tanlang</span>
      <svg viewBox="0 0 100 100" width={90} height={90} style={{ cursor: 'pointer' }}>
        {SURF_PATHS.map(s => {
          const statusId = surfaces?.[s.id]
          const st = TOOTH_STATUSES.find(x => x.id === statusId)
          const isActive = activeSurface === s.id
          return (
            <g key={s.id} onClick={() => onToggle(s.id)}>
              <path
                d={s.d}
                fill={st ? st.color || '#E2E8F0' : isActive ? '#E0E7FF' : '#F1F5F9'}
                stroke={isActive ? '#6366F1' : '#CBD5E1'}
                strokeWidth={isActive ? 2.5 : 1.5}
                style={{ transition: 'all 0.15s' }}
              />
              <title>{s.label}</title>
            </g>
          )
        })}
        {/* Surface labels */}
        <text x="50" y="14" textAnchor="middle" fontSize="9" fill="#64748B">B</text>
        <text x="50" y="92" textAnchor="middle" fontSize="9" fill="#64748B">L</text>
        <text x="11" y="52" textAnchor="middle" fontSize="9" fill="#64748B">M</text>
        <text x="89" y="52" textAnchor="middle" fontSize="9" fill="#64748B">D</text>
        <text x="50" y="54" textAnchor="middle" fontSize="9" fill="#64748B">O</text>
      </svg>
      <span style={{ fontSize: 11, color: '#94A3B8' }}>
        {activeSurface ? `Tanlangan: ${SURF_PATHS.find(s => s.id === activeSurface)?.label}` : 'Yuza bosing'}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────
   Main DentalChart component
───────────────────────────────────────── */
export default function DentalChart({ toothData = [], onUpdateTooth, readOnly = false }) {
  const [selectedTooth, setSelectedTooth] = useState(null)
  const [viewType, setViewType] = useState('adult')
  const [activeSurface, setActiveSurface] = useState(null)

  /* Parse tooth data — surfaces stored as JSON in notes */
  const getParsed = (number) => {
    const raw = toothData.find(x => x.tooth_number === number) || { status: 'healthy', notes: '' }
    let surfaces = {}, textNote = ''
    try {
      const p = JSON.parse(raw.notes)
      if (p?.surfaces) { surfaces = p.surfaces; textNote = p.text || '' }
    } catch (_) { textNote = raw.notes || '' }
    return { ...raw, surfaces, textNote }
  }

  const handleClick = (num) => {
    if (readOnly) return
    setSelectedTooth(prev => prev === num ? null : num)
    setActiveSurface(null)
  }

  const applyStatus = (statusId) => {
    if (!selectedTooth) return
    const cur = getParsed(selectedTooth)
    let newStatus = cur.status
    let newSurfaces = { ...cur.surfaces }

    if (activeSurface) {
      if (statusId === 'healthy') delete newSurfaces[activeSurface]
      else newSurfaces[activeSurface] = statusId
      if (statusId !== 'healthy' && newStatus === 'healthy') newStatus = statusId
    } else {
      newStatus = statusId
      if (statusId === 'healthy') newSurfaces = {}
    }

    const notes = JSON.stringify({ surfaces: newSurfaces, text: cur.textNote })
    onUpdateTooth(selectedTooth, newStatus, notes)
    if (!activeSurface) setSelectedTooth(null)
  }

  const upperRow = viewType === 'adult' ? ADULT_UPPER : CHILD_UPPER
  const lowerRow = viewType === 'adult' ? ADULT_LOWER : CHILD_LOWER

  const renderRow = (nums, isUpper) => (
    <div style={{ display: 'flex', alignItems: isUpper ? 'flex-end' : 'flex-start', gap: 3, justifyContent: 'center', minWidth: 'fit-content' }}>
      {nums.map(num => {
        const d = getParsed(num)
        const st = TOOTH_STATUSES.find(s => s.id === d.status)
        const crownColor = (st && st.color && d.status !== 'healthy') ? st.color : null
        return (
          <ToothSVG
            key={num}
            num={num}
            isUpper={isUpper}
            status={d.status}
            crownColor={crownColor}
            isSelected={selectedTooth === num}
            onClick={() => handleClick(num)}
          />
        )
      })}
    </div>
  )

  const curData = selectedTooth ? getParsed(selectedTooth) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>

      {/* ── Toggle ───────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[['adult', 'Doimiy tishlar (Kattalar)'], ['child', 'Sut tishlari (Bolalar)']].map(([v, label]) => (
          <button key={v} onClick={() => { setViewType(v); setSelectedTooth(null) }} style={{
            padding: '7px 18px', borderRadius: 20,
            border: '1.5px solid #6366F1',
            background: viewType === v ? '#6366F1' : 'transparent',
            color: viewType === v ? '#fff' : '#6366F1',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.18s'
          }}>{label}</button>
        ))}
      </div>

      {/* ── Chart canvas ─────────────────────────── */}
      <div style={{
        position: 'relative',
        overflowX: 'auto',
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E2E8F0',
        padding: '32px 20px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)'
      }}>
        {/* Gum band — the pink horizontal band in the reference image */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          height: 64,
          background: 'linear-gradient(to bottom, rgba(251,191,191,0) 0%, rgba(252,165,165,0.55) 40%, rgba(252,165,165,0.55) 60%, rgba(251,191,191,0) 100%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {renderRow(upperRow, true)}
          <div style={{ height: 10 }} />
          {renderRow(lowerRow, false)}
        </div>
      </div>

      {/* ── Editor panel ─────────────────────────── */}
      {!readOnly && selectedTooth && (
        <div style={{
          background: '#fff', borderRadius: 20,
          border: '1.5px solid #6366F1',
          padding: 24, boxShadow: '0 8px 24px -6px rgba(99,102,241,0.15)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
              Tish #{selectedTooth} — tahrirlash
            </h3>
            <button onClick={() => setSelectedTooth(null)} style={{
              background: 'none', border: 'none', fontSize: 22, color: '#94A3B8', cursor: 'pointer', lineHeight: 1
            }}>×</button>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Surface diagram */}
            <SurfaceDiagram
              surfaces={curData?.surfaces}
              activeSurface={activeSurface}
              onToggle={(id) => setActiveSurface(prev => prev === id ? null : id)}
            />

            {/* Status buttons */}
            <div style={{ flex: 1, minWidth: 240 }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#64748B' }}>
                {activeSurface
                  ? `"${SURF_PATHS.find(s => s.id === activeSurface)?.label}" yuzasi uchun holat`
                  : 'Butun tish uchun holat'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {TOOTH_STATUSES.map(s => (
                  <button key={s.id} onClick={() => applyStatus(s.id)} style={{
                    padding: '10px 14px', borderRadius: 12,
                    background: !s.color ? '#F1F5F9' : s.color,
                    color: s.color ? s.textColor : '#374151',
                    border: s.id === 'planned' ? '1.5px dashed #6366F1' : '1px solid rgba(0,0,0,0.08)',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: s.color ? '0 2px 6px -1px rgba(0,0,0,0.12)' : 'none'
                  }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Legend ───────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 14, padding: '16px 20px',
        background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0'
      }}>
        {TOOTH_STATUSES.filter(s => s.id !== 'healthy').map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 14, height: 14, borderRadius: 4,
              background: s.color || '#E2E8F0',
              border: s.id === 'planned' ? '1.5px dashed #6366F1' : '1px solid rgba(0,0,0,0.1)'
            }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>{s.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
