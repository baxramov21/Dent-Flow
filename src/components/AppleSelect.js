'use client'
import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export default function AppleSelect({ value, onChange, options, placeholder = "Tanlang", icon: Icon }) {
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

  const selectedOption = options.find(o => o.value === value)

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
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
          minWidth: '200px',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {Icon && <Icon size={16} color="var(--text-secondary)" />}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown size={16} style={{ 
          color: 'var(--text-secondary)',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '16px',
          padding: '6px',
          boxShadow: '0 12px 48px -12px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.05)',
          animation: 'appleFadeInDown 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          maxHeight: '300px',
          overflowY: 'auto',
          scrollbarWidth: 'none'
        }}>
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: value === option.value ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: value === option.value ? '600' : '500',
                fontSize: '14px',
                transition: 'all 0.1s ease',
              }}
              onMouseOver={(e) => {
                if (value !== option.value) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'
              }}
              onMouseOut={(e) => {
                if (value !== option.value) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {option.label}
              {value === option.value && <Check size={16} />}
            </div>
          ))}
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes appleFadeInDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </div>
  )
}
