'use client'
import React, { useState, useRef, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { Calendar } from 'lucide-react'

export default function AppleDateRange({ startDate, endDate, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDate = (date) => {
    if (!date) return 'Tanlang'
    return new Intl.DateTimeFormat('uz-UZ', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  }

  const handleDateChange = (dates) => {
    const [start, end] = dates
    onChange({ start, end })
    if (start && end) {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border)',
          color: 'var(--text-primary)',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Calendar size={16} color="var(--text-secondary)" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{formatDate(startDate)}</span>
          <span style={{ color: 'var(--text-muted)' }}>—</span>
          <span style={{ color: !endDate ? 'var(--text-muted)' : 'inherit' }}>{formatDate(endDate)}</span>
        </div>
      </button>

      {isOpen && (
        <div className="apple-datepicker-container" style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          zIndex: 50,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 12px 48px -12px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.05)',
          animation: 'appleFadeInDown 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <DatePicker
            selected={startDate}
            onChange={handleDateChange}
            startDate={startDate}
            endDate={endDate}
            selectsRange
            inline
            monthsShown={2}
          />
        </div>
      )}
    </div>
  )
}
