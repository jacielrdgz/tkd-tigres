import React, { useRef } from 'react'
import { FiCalendar, FiChevronDown } from 'react-icons/fi'
import { useTheme } from '../../context/ThemeContext'

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function formatMesLabel(val, isMobile = false) {
  if (!val) return isMobile ? 'Mes' : 'Seleccionar mes'
  const parts = val.split('-')
  if (parts.length < 2) return val
  const y = parts[0]
  const m = parseInt(parts[1], 10) - 1
  return `${MESES_CORTOS[m] || parts[1]} ${y}`
}

export default function CampoFiltroMes({ value, onChange, isMobile }) {
  const inputRef = useRef(null)

  let currentTheme = 'light'
  try {
    const themeCtx = useTheme()
    if (themeCtx?.theme) currentTheme = themeCtx.theme
  } catch {
    // fallback if outside provider
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: isMobile ? '100%' : '175px',
        minWidth: isMobile ? '0' : '175px',
        height: isMobile ? '36px' : '38px',
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        boxSizing: 'border-box',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        padding: isMobile ? '0 8px' : '0 12px',
        gap: isMobile ? '4px' : '6px',
        fontFamily: 'inherit',
      }}
      onClick={() => {
        try {
          inputRef.current?.showPicker?.()
        } catch {
          inputRef.current?.focus?.()
        }
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
        e.currentTarget.style.borderColor = 'var(--accent-blue)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'none'
      }}
    >
      <FiCalendar size={isMobile ? 12 : 14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

      <span style={{
        flex: 1,
        minWidth: 0,
        fontSize: isMobile ? '11.5px' : '13px',
        fontWeight: '600',
        fontFamily: 'inherit',
        color: 'var(--text-secondary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'left',
        marginRight: '2px',
      }}>
        {formatMesLabel(value, isMobile)}
      </span>

      <FiChevronDown
        size={isMobile ? 11 : 13}
        style={{ color: 'var(--text-muted)', flexShrink: 0 }}
      />

      <input
        ref={inputRef}
        type="month"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        tabIndex={-1}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          pointerEvents: 'none',
          zIndex: 2,
          colorScheme: currentTheme === 'dark' ? 'dark' : 'light',
        }}
      />
    </div>
  )
}
