'use client'
import React, { useState } from 'react'

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

const classify = (num) => {
  if (num >= 51 && num <= 85) {
    const t = num % 10
    if (t <= 2) return 'ci'
    if (t === 3) return 'cc'
    return 'cm'
  }
  const t = num % 10
  if (t === 8 || t === 7 || t === 6) return (num >= 30 && num < 50) ? 'lm' : 'um'
  if (t === 5 || t === 4) return 'pm'
  if (t === 3) return 'cn'
  return 'in'
}

/* ──────────────────────────────────────────────────────────────
   ANATOMICAL SVG PATHS — viewBox "0 0 60 140"

   Crown at TOP (y 0→65), roots DOWN (y 65→~120).
   Root ≈ crown height. S-curve taper to blunt tip.
   Seamless crown→root junction (very slight concave indent).
   Molars: moderate splay.

   Lower teeth: rendered as-is  (crown up, roots down)
   Upper teeth: rotate(180, 30, 70) → roots up, crown down
────────────────────────────────────────────────────────────── */
const DEFS = {

  /* ── INCISOR ───────────────────────────────────────────────
     Flat chisel crown. Single root, S-curve taper, root≈crown. */
  in: {
    crown: `M 17 63 C 16 52,15 38,16 24 C 17 14,20 7,30 7
            C 40 7,43 14,44 24 C 45 38,44 52,43 63
            C 38 67,22 67,17 63 Z`,
    roots: [
      `M 20 65 C 19 76,20 92,22 106 C 24 114,27 119,30 119
       C 33 119,36 114,38 106 C 40 92,41 76,40 65
       C 36 68,24 68,20 65 Z`
    ],
    grooves: [`M 30 10 C 30 26,30 44,30 63`],
    spec: `M 20 28 C 20 16,24 10,30 10 C 36 10,38 16,38 28 C 34 22,26 22,20 28 Z`
  },

  /* ── CANINE ────────────────────────────────────────────────
     Pointed cusp. One root ~1.3× crown (canines have longest root). */
  cn: {
    crown: `M 15 62 C 14 48,13 30,15 16 C 17 6,23 0,30 0
            C 37 0,43 6,45 16 C 47 30,46 48,45 62
            C 38 67,22 67,15 62 Z`,
    roots: [
      `M 18 64 C 17 76,18 96,21 112 C 23 122,27 128,30 128
       C 33 128,37 122,39 112 C 42 96,43 76,42 64
       C 38 68,22 68,18 64 Z`
    ],
    grooves: [`M 30 3 C 30 20,30 44,30 62`],
    spec: `M 19 25 C 19 12,23 5,30 5 C 37 5,41 12,41 25 C 36 18,24 18,19 25 Z`
  },

  /* ── PREMOLAR ──────────────────────────────────────────────
     Two cusps. Two roots, slight splay, blunt tips. */
  pm: {
    crown: `M 11 62 C 10 48,10 28,12 16 C 14 8,18 3,23 2
            L 26 8 C 28 5,32 5,34 8 L 37 2
            C 42 3,46 8,48 16 C 50 28,50 48,49 62
            C 42 67,18 67,11 62 Z`,
    roots: [
      /* mesial — very slight lean left */
      `M 14 64 C 13 76,13 94,15 108 C 17 116,20 121,23 119
       C 26 117,27 113,28 108 C 30 94,30 76,28 64
       C 25 68,17 68,14 64 Z`,
      /* distal — very slight lean right */
      `M 32 64 C 32 76,32 94,35 108 C 37 113,38 117,41 119
       C 44 121,47 116,49 108 C 51 94,47 76,46 64
       C 43 68,35 68,32 64 Z`
    ],
    grooves: [`M 30 6 C 30 22,30 46,30 62`],
    spec: `M 16 22 C 16 10,21 4,30 4 C 39 4,44 10,44 22 C 38 15,22 15,16 22 Z`
  },

  /* ── LOWER MOLAR ───────────────────────────────────────────
     Wide crown, 2 buccal cusps. Two roots, moderate splay.
     Mesial curves left, distal curves right. Root ≈ crown. */
  lm: {
    crown: `M 8 64 C 7 52,7 34,9 20 C 10 13,13 8,16 6
            L 20 11 L 23 6 C 28 9,33 9,37 6 L 40 11 L 44 6
            C 47 8,50 13,51 20 C 53 34,53 52,52 64
            C 44 70,16 70,8 64 Z`,
    roots: [
      /* mesial — curves left */
      `M 10 67 C 8 80,6 96,6 110 C 6 118,9 124,13 122
       C 17 120,19 115,20 110 C 22 96,23 80,24 67
       C 20 71,14 71,10 67 Z`,
      /* distal — curves right */
      `M 36 67 C 37 80,38 96,40 110 C 41 115,43 120,47 122
       C 51 124,54 118,54 110 C 54 96,51 80,50 67
       C 46 71,40 71,36 67 Z`
    ],
    grooves: [`M 31 8 C 31 20,31 40,31 64`],
    spec: `M 12 24 C 12 10,18 2,30 2 C 42 2,48 10,48 24 C 40 16,20 16,12 24 Z`
  },

  /* ── UPPER MOLAR ───────────────────────────────────────────
     Very wide crown, 3 visible cusps (MB, B, DB).
     Three roots: BM (splays left), palatal (centre, tallest),
     BD (splays right). All with moderate splay, root≈crown.  */
  um: {
    crown: `M 6 62 C 5 48,5 28,7 15 C 8 8,12 4,16 3
            L 20 9 L 24 3 C 28 1,32 1,36 3 L 40 9 L 44 3
            C 48 4,52 8,53 15 C 55 28,55 48,54 62
            C 46 68,14 68,6 62 Z`,
    roots: [
      /* buccal-mesial — moderate splay left */
      `M 9 65 C 7 78,5 95,4 109 C 4 117,7 123,11 121
       C 15 119,17 113,18 109 C 20 95,22 78,23 65
       C 18 69,12 69,9 65 Z`,
      /* palatal — centre, slightly taller */
      `M 25 65 C 24 78,24 98,26 113 C 27 120,29 125,30 125
       C 31 125,33 120,34 113 C 36 98,36 78,35 65
       C 32 69,28 69,25 65 Z`,
      /* buccal-distal — moderate splay right */
      `M 37 65 C 38 78,40 95,42 109 C 43 113,45 119,49 121
       C 53 123,56 117,56 109 C 55 95,53 78,51 65
       C 48 69,42 69,37 65 Z`
    ],
    grooves: [`M 30 4 C 30 20,30 46,30 62`],
    spec: `M 11 22 C 11 8,17 1,30 1 C 43 1,49 8,49 22 C 42 14,18 14,11 22 Z`
  },

  /* ── CHILD INCISOR ─────────────────────────────────────────── */
  ci: {
    crown: `M 19 56 C 18 46,18 30,20 18 C 22 8,38 8,40 18
            C 42 30,42 46,41 56 C 36 60,24 60,19 56 Z`,
    roots: [
      `M 22 58 C 21 70,21 85,24 98 C 25 105,28 109,30 109
       C 32 109,35 105,36 98 C 39 85,39 70,38 58
       C 34 62,26 62,22 58 Z`
    ],
    grooves: [`M 30 10 C 30 24,30 42,30 56`],
    spec: `M 22 28 C 22 18,25 13,30 13 C 35 13,38 18,38 28 C 34 22,26 22,22 28 Z`
  },

  /* ── CHILD CANINE ──────────────────────────────────────────── */
  cc: {
    crown: `M 17 56 C 16 44,15 28,18 14 C 21 4,39 4,42 14
            C 45 28,44 44,43 56 C 36 61,24 61,17 56 Z`,
    roots: [
      `M 20 58 C 19 70,19 88,22 102 C 23 110,27 114,30 114
       C 33 114,37 110,38 102 C 41 88,41 70,40 58
       C 36 62,24 62,20 58 Z`
    ],
    grooves: [`M 30 6 C 30 22,30 42,30 56`],
    spec: `M 21 24 C 21 14,24 8,30 8 C 36 8,39 14,39 24 C 35 18,25 18,21 24 Z`
  },

  /* ── CHILD MOLAR ───────────────────────────────────────────── */
  cm: {
    crown: `M 10 58 C 9 46,9 28,11 16 C 13 7,17 3,21 2
            L 24 7 L 28 2 C 32 0,36 2,39 7 L 42 2
            C 46 3,50 7,51 16 C 53 28,51 46,50 58
            C 42 64,18 64,10 58 Z`,
    roots: [
      `M 12 61 C 11 72,10 88,12 101 C 13 109,16 113,19 111
       C 22 109,23 105,24 101 C 26 88,27 72,25 61
       C 21 65,15 65,12 61 Z`,
      `M 35 61 C 34 72,33 88,37 101 C 37 105,39 109,41 111
       C 44 113,47 109,48 101 C 50 88,50 72,48 61
       C 45 65,39 65,35 61 Z`
    ],
    grooves: [`M 30 3 C 30 18,30 40,30 58`],
    spec: `M 14 22 C 14 10,19 3,30 3 C 41 3,45 10,45 22 C 40 14,20 14,14 22 Z`
  }
}

/* ── Shared SVG gradient defs (rendered once) ─────────────────── */
function SharedDefs() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute', pointerEvents: 'none' }}>
      <defs>
        {/* 3-D cylindrical gradient: dark edge → bright centre → dark edge */}
        <linearGradient id="toothBody" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#A8A6A4" />
          <stop offset="10%"  stopColor="#D4D2D0" />
          <stop offset="28%"  stopColor="#F0EFED" />
          <stop offset="46%"  stopColor="#FDFCFB" />
          <stop offset="52%"  stopColor="#FFFFFF" />
          <stop offset="62%"  stopColor="#F5F4F2" />
          <stop offset="80%"  stopColor="#DCDAD8" />
          <stop offset="100%" stopColor="#A8A6A4" />
        </linearGradient>
        {/* Vertical: bright top → slight dark at root apex */}
        <linearGradient id="toothVert" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="38%"  stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.11" />
        </linearGradient>
        {/* Specular highlight: soft oval, simulates light from upper-left */}
        <radialGradient id="toothSpec" cx="45%" cy="32%" r="45%" fx="40%" fy="18%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="50%"  stopColor="#FFFFFF" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}

/* ── Spring-bounce keyframe (injected once) ──────────────────── */
const SPRING_STYLE = `
  @keyframes toothSelect {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.38); }
    65%  { transform: scale(1.26); }
    80%  { transform: scale(1.33); }
    100% { transform: scale(1.30); }
  }
  @keyframes toothDeselect {
    0%   { transform: scale(1.30); }
    60%  { transform: scale(0.96); }
    100% { transform: scale(1); }
  }
  .tooth-selected  { animation: toothSelect  0.32s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .tooth-normal    { animation: toothDeselect 0.22s ease-out forwards; }
`
let styleInjected = false
function injectStyle() {
  if (styleInjected || typeof document === 'undefined') return
  styleInjected = true
  const el = document.createElement('style')
  el.textContent = SPRING_STYLE
  document.head.appendChild(el)
}

function ToothSVG({ num, isUpper, status, crownColor, isSelected, hasSelection, onClick }) {
  const type = classify(num)
  const def  = DEFS[type]
  if (!def) return null

  // Inject spring keyframes on first render
  React.useEffect(() => { injectStyle() }, [])

  const isExtracted = status === 'extracted'
  const flip = isUpper ? 'rotate(180 30 70)' : ''
  // Dim unselected teeth when another is selected
  const dimmed = !isSelected && hasSelection && !isExtracted

  return (
    <div
      onClick={onClick}
      className={isSelected ? 'tooth-selected' : (hasSelection ? 'tooth-normal' : '')}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        cursor: 'pointer',
        opacity: isExtracted ? 0.12 : dimmed ? 0.55 : 1,
        transition: 'opacity 0.22s ease',
        zIndex: isSelected ? 20 : 1, position: 'relative'
      }}
    >
      {!isUpper && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: isSelected ? '#A5B4FC' : '#9CA3AF',
          textShadow: isSelected ? '0 0 10px rgba(165,180,252,0.9)' : 'none',
          transition: 'all 0.2s'
        }}>
          {num}
        </span>
      )}

      <div style={{
        width: 44, height: 106,
        filter: isSelected
          /* Triple-layer glow: tight core + soft halo + wide bloom */
          ? 'drop-shadow(0 0 3px rgba(165,180,252,1)) drop-shadow(0 0 10px rgba(99,102,241,0.85)) drop-shadow(0 0 22px rgba(99,102,241,0.45))'
          : 'drop-shadow(0 2px 5px rgba(0,0,0,0.45))',
        transition: 'filter 0.22s ease'
      }}>
        <svg viewBox="0 0 60 140" width="100%" height="100%" overflow="visible">
          <g transform={flip}>
            {/* Roots */}
            {def.roots.map((rPath, i) => (
              <React.Fragment key={i}>
                <path d={rPath} fill="url(#toothBody)" stroke={isSelected ? 'none' : '#939190'} strokeWidth="0.5" />
                <path d={rPath} fill="url(#toothVert)" />
              </React.Fragment>
            ))}
            {/* Crown */}
            <path d={def.crown} fill="url(#toothBody)" stroke={isSelected ? 'none' : '#939190'} strokeWidth="0.7" />
            <path d={def.crown} fill="url(#toothVert)" />
            {/* Colour tint */}
            {crownColor && (
              <>
                <path d={def.crown} fill={crownColor} opacity="0.72" />
                <path d={def.crown} fill="url(#toothBody)" opacity="0.18" />
              </>
            )}
            {/* Groove lines */}
            {def.grooves?.map((gp, i) => (
              <path key={i} d={gp} fill="none" stroke="#88817E" strokeWidth="0.9"
                strokeLinecap="round" opacity="0.28" />
            ))}
            {/* Specular highlight */}
            <path d={def.spec} fill="url(#toothSpec)" />

            {/* ── SELECTION RING: indigo outline on every shape ── */}
            {isSelected && (
              <>
                {def.roots.map((rp, i) => (
                  <path key={`sel-r${i}`} d={rp} fill="none"
                    stroke="#818CF8" strokeWidth="2.8" strokeLinejoin="round" opacity="0.95" />
                ))}
                <path d={def.crown} fill="none"
                  stroke="#818CF8" strokeWidth="2.8" strokeLinejoin="round" opacity="0.95" />
              </>
            )}
          </g>

          {isExtracted && (
            <>
              <line x1="6" y1="8" x2="54" y2="132" stroke="#374151" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="54" y1="8" x2="6" y2="132" stroke="#374151" strokeWidth="3.5" strokeLinecap="round" />
            </>
          )}
        </svg>
      </div>

      {isUpper && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: isSelected ? '#A5B4FC' : '#9CA3AF',
          textShadow: isSelected ? '0 0 10px rgba(165,180,252,0.9)' : 'none',
          transition: 'all 0.2s'
        }}>
          {num}
        </span>
      )}
    </div>
  )
}

/* ── 5-Surface Diagram ────────────────────────────────────────── */
const SURFS = [
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
        {SURFS.map(s => {
          const stId = surfaces?.[s.id]
          const st   = TOOTH_STATUSES.find(x => x.id === stId)
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
        {[['B',50,14],['L',50,93],['M',11,52],['D',89,52],['O',50,54]].map(([id,x,y]) => (
          <text key={id} x={x} y={y} textAnchor="middle" fontSize="9" fill="#64748B" pointerEvents="none">{id}</text>
        ))}
      </svg>
      <span style={{ fontSize: 11, color: '#94A3B8' }}>
        {activeSurface ? `Tanlangan: ${SURFS.find(s => s.id === activeSurface)?.label}` : 'Bosing'}
      </span>
    </div>
  )
}

/* ── Main DentalChart ─────────────────────────────────────────── */
export default function DentalChart({ toothData = [], onUpdateTooth, readOnly = false }) {
  const [selectedTooth, setSelectedTooth] = useState(null)
  const [viewType,      setViewType]      = useState('adult')
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
    let newStatus   = cur.status
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
    <div style={{
      display: 'flex',
      alignItems: isUpper ? 'flex-end' : 'flex-start',
      justifyContent: 'center', gap: 5, minWidth: 'fit-content'
    }}>
      {nums.map(num => {
        const d  = getParsed(num)
        const st = TOOTH_STATUSES.find(s => s.id === d.status)
        return (
          <ToothSVG key={num} num={num} isUpper={isUpper}
            status={d.status}
            crownColor={st?.color && d.status !== 'healthy' ? st.color : null}
            isSelected={selectedTooth === num}
            hasSelection={!!selectedTooth}
            onClick={() => handleClick(num)}
          />
        )
      })}
    </div>
  )

  const curData = selectedTooth ? getParsed(selectedTooth) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      <SharedDefs />

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
        background: 'linear-gradient(145deg, #1C1F2E 0%, #141623 100%)',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '28px 16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'center' }}>
          {renderRow(upperRow, true)}
          <div style={{ height: 14 }} />
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
            <SurfaceDiagram surfaces={curData?.surfaces} activeSurface={activeSurface}
              onToggle={(id) => setActiveSurface(prev => prev === id ? null : id)} />
            <div style={{ flex: 1, minWidth: 240 }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#64748B' }}>
                {activeSurface
                  ? `"${SURFS.find(s => s.id === activeSurface)?.label}" yuzasi uchun holat`
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
