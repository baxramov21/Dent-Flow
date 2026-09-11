import React, { useState } from 'react'

/* ─────────────────────────────────────────
   Tooth arrays  (FDI notation)
───────────────────────────────────────── */
const ADULT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const ADULT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
const CHILD_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]
const CHILD_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]

export const TOOTH_STATUSES = [
  { id: 'healthy',    label: "Sog'lom",   color: null,      textColor: '#374151' },
  { id: 'caries',     label: 'Karies',    color: '#EF4444', textColor: '#fff' },
  { id: 'filled',     label: 'Plomba',    color: '#3B82F6', textColor: '#fff' },
  { id: 'crown',      label: 'Qoplama',   color: '#F59E0B', textColor: '#fff' },
  { id: 'bridge',     label: "Ko'prik",   color: '#8B5CF6', textColor: '#fff' },
  { id: 'implant',    label: 'Implant',   color: '#6B7280', textColor: '#fff' },
  { id: 'extracted',  label: 'Olingan',   color: null,      textColor: '#111827' },
  { id: 'root_canal', label: 'Kanal',     color: '#EC4899', textColor: '#fff' },
  { id: 'planned',    label: 'Rejada',    color: '#6366F1', textColor: '#fff' },
]

/* ─────────────────────────────────────────
   Classify tooth
───────────────────────────────────────── */
const classify = (num) => {
  const t = num % 10
  if (num >= 51 && num <= 85) {
    if (t <= 2 || t === 1) return 'ci'
    if (t === 3) return 'cc'
    return 'cm'
  }
  if (t === 8 || t === 7 || t === 6) return (num >= 30 && num < 50) ? 'lm' : 'um'
  if (t === 5 || t === 4) return 'pm'
  if (t === 3) return 'cn'
  return 'in'
}

/* ─────────────────────────────────────────────────────────────────
   SVG tooth paths — viewBox "0 0 60 160"
   
   DESIGN: crown at TOP (y≈0..60), roots at BOTTOM (y≈60..158)
   - Lower teeth rendered AS-IS  (crown up, roots down)
   - Upper teeth rendered with rotate(180, 30, 80) so crown is at 
     bottom (gumline) and roots point up — matching reference image
──────────────────────────────────────────────────────────────────*/
const PATHS = {

  /* ── Central / Lateral Incisor ─────────── */
  in: {
    // flat shovel crown
    crown: `M 16 62
            C 16 48, 16 30, 17 16
            C 19 4, 41 4, 43 16
            C 44 30, 44 48, 44 62
            C 38 65, 22 65, 16 62 Z`,
    // single straight root
    roots: [`M 22 63
             C 21 85, 22 115, 26 142
             C 27 150, 29 154, 30 154
             C 31 154, 33 150, 34 142
             C 38 115, 39 85, 38 63
             C 33 65, 27 65, 22 63 Z`],
    // specular highlight oval inside crown
    spec: `M 23 30 C 23 18, 26 12, 30 12 C 34 12, 37 18, 37 30
           C 34 26, 26 26, 23 30 Z`
  },

  /* ── Canine ─────────────────────────────── */
  cn: {
    crown: `M 15 62
            C 14 46, 13 26, 16 12
            C 19 1, 41 1, 44 12
            C 47 26, 46 46, 45 62
            C 38 66, 22 66, 15 62 Z`,
    roots: [`M 20 64
             C 19 88, 20 122, 24 150
             C 26 157, 29 160, 30 160
             C 31 160, 34 157, 36 150
             C 40 122, 41 88, 40 64
             C 35 67, 25 67, 20 64 Z`],
    spec: `M 21 28 C 21 14, 25 7, 30 7 C 35 7, 39 14, 39 28
           C 35 22, 25 22, 21 28 Z`
  },

  /* ── Premolar ─────────────────────────────── */
  pm: {
    crown: `M 11 62
            C 10 46, 11 26, 14 13
            C 17 3, 23 0, 30 0
            C 37 0, 43 3, 46 13
            C 49 26, 50 46, 49 62
            C 42 67, 18 67, 11 62 Z`,
    roots: [
      // mesial root
      `M 14 64
       C 13 88, 14 115, 17 138
       C 18 146, 20 150, 22 148
       C 24 146, 25 142, 26 138
       C 28 115, 29 88, 28 64
       C 24 67, 18 67, 14 64 Z`,
      // distal root
      `M 32 64
       C 31 88, 32 115, 35 138
       C 36 142, 37 146, 38 148
       C 40 150, 42 146, 43 138
       C 46 115, 47 88, 46 64
       C 42 67, 36 67, 32 64 Z`
    ],
    spec: `M 17 26 C 17 12, 22 4, 30 4 C 38 4, 43 12, 43 26
           C 38 18, 22 18, 17 26 Z`
  },

  /* ── Upper Molar (3 roots) ────────────────── */
  um: {
    crown: `M 7 60
            C 5 44, 6 24, 9 12
            C 12 2, 20 0, 30 0
            C 40 0, 48 2, 51 12
            C 54 24, 55 44, 53 60
            C 44 65, 16 65, 7 60 Z`,
    roots: [
      // buccal-mesial (left)
      `M 9 62
       C 8 84, 8 110, 10 132
       C 11 140, 13 145, 15 143
       C 17 141, 19 137, 20 132
       C 22 110, 23 84, 22 62
       C 18 66, 12 66, 9 62 Z`,
      // palatal (center, tallest)
      `M 25 63
       C 24 88, 24 120, 26 147
       C 27 154, 29 158, 30 158
       C 31 158, 33 154, 34 147
       C 36 120, 36 88, 35 63
       C 32 67, 28 67, 25 63 Z`,
      // buccal-distal (right)
      `M 38 62
       C 37 84, 37 110, 40 132
       C 41 137, 43 141, 45 143
       C 47 145, 49 140, 50 132
       C 52 110, 52 84, 51 62
       C 48 66, 42 66, 38 62 Z`
    ],
    spec: `M 13 24 C 13 10, 19 2, 30 2 C 41 2, 47 10, 47 24
           C 40 16, 20 16, 13 24 Z`
  },

  /* ── Lower Molar (2 roots) ────────────────── */
  lm: {
    crown: `M 7 60
            C 5 44, 6 24, 9 12
            C 12 2, 20 0, 30 0
            C 40 0, 48 2, 51 12
            C 54 24, 55 44, 53 60
            C 44 65, 16 65, 7 60 Z`,
    roots: [
      // mesial
      `M 9 62
       C 8 86, 8 114, 11 138
       C 13 146, 15 150, 17 148
       C 19 146, 21 142, 22 138
       C 25 114, 26 86, 25 62
       C 20 66, 12 66, 9 62 Z`,
      // distal
      `M 35 62
       C 34 86, 34 114, 38 138
       C 39 142, 41 146, 43 148
       C 45 150, 47 146, 49 138
       C 52 114, 52 86, 51 62
       C 48 66, 40 66, 35 62 Z`
    ],
    spec: `M 13 24 C 13 10, 19 2, 30 2 C 41 2, 47 10, 47 24
           C 40 16, 20 16, 13 24 Z`
  },

  /* ── Child Incisor ─────────────────────────── */
  ci: {
    crown: `M 18 56 C 18 44, 18 28, 20 16 C 22 6, 38 6, 40 16
            C 42 28, 42 44, 42 56 C 37 60, 23 60, 18 56 Z`,
    roots: [`M 22 57 C 21 76, 22 102, 26 122 C 27 129, 29 132, 30 132
             C 31 132, 33 129, 34 122 C 38 102, 39 76, 38 57
             C 34 61, 26 61, 22 57 Z`],
    spec: `M 22 30 C 22 18, 25 13, 30 13 C 35 13, 38 18, 38 30 C 34 24, 26 24, 22 30 Z`
  },

  /* ── Child Canine ──────────────────────────── */
  cc: {
    crown: `M 17 56 C 16 44, 15 28, 18 14 C 21 4, 39 4, 42 14
            C 45 28, 44 44, 43 56 C 37 60, 23 60, 17 56 Z`,
    roots: [`M 21 57 C 20 78, 21 108, 25 130 C 26 137, 29 140, 30 140
             C 31 140, 34 137, 35 130 C 39 108, 40 78, 39 57
             C 34 61, 26 61, 21 57 Z`],
    spec: `M 22 28 C 22 16, 25 10, 30 10 C 35 10, 38 16, 38 28 C 34 22, 26 22, 22 28 Z`
  },

  /* ── Child Molar ───────────────────────────── */
  cm: {
    crown: `M 10 58 C 9 44, 10 26, 13 14 C 16 4, 22 0, 30 0
            C 38 0, 44 4, 47 14 C 50 26, 51 44, 50 58
            C 42 63, 18 63, 10 58 Z`,
    roots: [
      `M 12 60 C 11 80, 11 105, 14 124 C 15 131, 17 135, 19 133
       C 21 131, 22 127, 23 124 C 26 105, 27 80, 26 60
       C 22 64, 14 64, 12 60 Z`,
      `M 34 60 C 33 80, 33 105, 37 124 C 38 127, 39 131, 41 133
       C 43 135, 45 131, 46 124 C 49 105, 49 80, 48 60
       C 46 64, 38 64, 34 60 Z`
    ],
    spec: `M 15 24 C 15 10, 20 3, 30 3 C 40 3, 45 10, 45 24 C 38 16, 22 16, 15 24 Z`
  }
}

/* ─────────────────────────────────────────
   Single Tooth SVG
───────────────────────────────────────── */
function ToothSVG({ num, isUpper, status, crownColor, isSelected, onClick }) {
  const type = classify(num)
  const def = PATHS[type]
  if (!def) return null

  const isExtracted = status === 'extracted'
  const uid = `g${num}`

  /*
    Standard orientation: crown at top, root at bottom.
    Upper jaw teeth in a dental chart have roots pointing UP 
    and crowns at the gumline (bottom of the visual column).
    So we rotate 180° around the centre of the viewbox for upper teeth.
  */
  const toothTransform = isUpper ? 'rotate(180 30 80)' : ''

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        cursor: 'pointer',
        transition: 'transform 0.18s',
        transform: isSelected ? 'scale(1.13)' : 'scale(1)',
        zIndex: isSelected ? 10 : 1,
        position: 'relative'
      }}
    >
      {/* Number — above SVG for lower, below SVG for upper */}
      {!isUpper && (
        <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#6366F1' : '#475569' }}>
          {num}
        </span>
      )}

      <div style={{
        width: 42, height: 104,
        filter: isSelected
          ? 'drop-shadow(0 0 7px rgba(99,102,241,0.65))'
          : 'drop-shadow(0 1px 3px rgba(0,0,0,0.22))',
        opacity: isExtracted ? 0.15 : 1,
        transition: 'all 0.18s'
      }}>
        <svg viewBox="0 0 60 160" width="100%" height="100%" overflow="visible">
          <defs>
            {/* Lateral gradient: dark edges, bright centre — gives 3-D cylinder feel */}
            <linearGradient id={`${uid}b`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#B0AEAC" />
              <stop offset="10%"  stopColor="#D4D2D0" />
              <stop offset="30%"  stopColor="#EFEFED" />
              <stop offset="50%"  stopColor="#FFFFFF" />
              <stop offset="70%"  stopColor="#EBEAE8" />
              <stop offset="90%"  stopColor="#CECECC" />
              <stop offset="100%" stopColor="#AFAFAD" />
            </linearGradient>

            {/* Vertical shading: bright top, darker towards root tip */}
            <linearGradient id={`${uid}v`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="35%"  stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.10" />
            </linearGradient>

            {/* Specular highlight (bright oval near top of crown) */}
            <radialGradient id={`${uid}s`} cx="50%" cy="35%" r="50%" fx="50%" fy="20%">
              <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="55%"  stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>

            {/* Crown colour tint overlay */}
            {crownColor && (
              <linearGradient id={`${uid}c`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#000" stopOpacity="0.28" />
                <stop offset="18%"  stopColor={crownColor} stopOpacity="0.82" />
                <stop offset="50%"  stopColor={crownColor} stopOpacity="0.92" />
                <stop offset="82%"  stopColor={crownColor} stopOpacity="0.82" />
                <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
              </linearGradient>
            )}
          </defs>

          <g transform={toothTransform}>
            {/* ── Roots ── */}
            {def.roots.map((rp, i) => (
              <React.Fragment key={i}>
                <path d={rp} fill={`url(#${uid}b)`} stroke="#A8A6A3" strokeWidth="0.5" />
                <path d={rp} fill={`url(#${uid}v)`} />
              </React.Fragment>
            ))}

            {/* ── Crown body ── */}
            <path d={def.crown} fill={`url(#${uid}b)`} stroke="#A8A6A3" strokeWidth="0.6" />
            <path d={def.crown} fill={`url(#${uid}v)`} />

            {/* ── Crown colour overlay ── */}
            {crownColor && <path d={def.crown} fill={`url(#${uid}c)`} />}

            {/* ── Specular highlight (inside crown) ── */}
            <path d={def.spec} fill={`url(#${uid}s)`} />
          </g>

          {/* Extracted cross */}
          {isExtracted && (
            <>
              <line x1="6" y1="8" x2="54" y2="152" stroke="#374151" strokeWidth="3.5" strokeLinecap="round"/>
              <line x1="54" y1="8" x2="6" y2="152" stroke="#374151" strokeWidth="3.5" strokeLinecap="round"/>
            </>
          )}
        </svg>
      </div>

      {isUpper && (
        <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#6366F1' : '#475569' }}>
          {num}
        </span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   5-Surface diagram
───────────────────────────────────────── */
const SURF_PATHS = [
  { id: 'B', d: 'M 0 0 L 100 0 L 72 28 L 28 28 Z', label: 'Buccal' },
  { id: 'L', d: 'M 0 100 L 100 100 L 72 72 L 28 72 Z', label: 'Lingual' },
  { id: 'M', d: 'M 0 0 L 28 28 L 28 72 L 0 100 Z', label: 'Mesial' },
  { id: 'D', d: 'M 100 0 L 72 28 L 72 72 L 100 100 Z', label: 'Distal' },
  { id: 'O', d: 'M 28 28 L 72 28 L 72 72 L 28 72 Z', label: 'Occlusal' },
]

function SurfaceDiagram({ surfaces, activeSurface, onToggle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Yuzani tanlang</span>
      <svg viewBox="0 0 100 100" width={88} height={88} style={{ cursor: 'pointer' }}>
        {SURF_PATHS.map(s => {
          const stId = surfaces?.[s.id]
          const st = TOOTH_STATUSES.find(x => x.id === stId)
          const isAct = activeSurface === s.id
          return (
            <g key={s.id} onClick={() => onToggle(s.id)}>
              <path d={s.d}
                fill={st ? (st.color || '#E2E8F0') : (isAct ? '#E0E7FF' : '#F1F5F9')}
                stroke={isAct ? '#6366F1' : '#CBD5E1'}
                strokeWidth={isAct ? 2.5 : 1.5}
                style={{ transition: 'all 0.15s' }}
              />
              <title>{s.label}</title>
            </g>
          )
        })}
        <text x="50" y="14"  textAnchor="middle" fontSize="9" fill="#64748B" pointerEvents="none">B</text>
        <text x="50" y="93"  textAnchor="middle" fontSize="9" fill="#64748B" pointerEvents="none">L</text>
        <text x="11" y="52"  textAnchor="middle" fontSize="9" fill="#64748B" pointerEvents="none">M</text>
        <text x="89" y="52"  textAnchor="middle" fontSize="9" fill="#64748B" pointerEvents="none">D</text>
        <text x="50" y="54"  textAnchor="middle" fontSize="9" fill="#64748B" pointerEvents="none">O</text>
      </svg>
      <span style={{ fontSize: 11, color: '#94A3B8' }}>
        {activeSurface ? `Tanlangan: ${SURF_PATHS.find(s => s.id === activeSurface)?.label}` : 'Bosing'}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
export default function DentalChart({ toothData = [], onUpdateTooth, readOnly = false }) {
  const [selectedTooth, setSelectedTooth] = useState(null)
  const [viewType, setViewType]   = useState('adult')
  const [activeSurface, setActiveSurface] = useState(null)

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
    onUpdateTooth(selectedTooth, newStatus, JSON.stringify({ surfaces: newSurfaces, text: cur.textNote }))
    if (!activeSurface) setSelectedTooth(null)
  }

  const upperRow = viewType === 'adult' ? ADULT_UPPER : CHILD_UPPER
  const lowerRow = viewType === 'adult' ? ADULT_LOWER : CHILD_LOWER

  const renderRow = (nums, isUpper) => (
    <div style={{ display: 'flex', alignItems: isUpper ? 'flex-end' : 'flex-start', gap: 4, justifyContent: 'center', minWidth: 'fit-content' }}>
      {nums.map(num => {
        const d = getParsed(num)
        const st = TOOTH_STATUSES.find(s => s.id === d.status)
        const crownColor = st?.color && d.status !== 'healthy' ? st.color : null
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>

      {/* Toggle */}
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

      {/* Chart */}
      <div style={{
        overflowX: 'auto',
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E2E8F0',
        padding: '24px 16px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          {renderRow(upperRow, true)}
          <div style={{ height: 12 }} />
          {renderRow(lowerRow, false)}
        </div>
      </div>

      {/* Editor */}
      {!readOnly && selectedTooth && (
        <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #6366F1', padding: 24, boxShadow: '0 8px 24px -6px rgba(99,102,241,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
              Tish #{selectedTooth} — tahrirlash
            </h3>
            <button onClick={() => setSelectedTooth(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#94A3B8', cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <SurfaceDiagram
              surfaces={curData?.surfaces}
              activeSurface={activeSurface}
              onToggle={(id) => setActiveSurface(prev => prev === id ? null : id)}
            />
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
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: s.color ? '0 2px 6px -1px rgba(0,0,0,0.12)' : 'none'
                  }}>{s.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, padding: '14px 18px', background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0' }}>
        {TOOTH_STATUSES.filter(s => s.id !== 'healthy').map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: s.color || '#E2E8F0', border: s.id === 'planned' ? '1.5px dashed #6366F1' : '1px solid rgba(0,0,0,0.1)' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>{s.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
