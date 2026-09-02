import React, { useState, useEffect, useRef } from 'react'
import { FiChevronDown } from 'react-icons/fi'

export default function CustomDropdown({
  label,
  options = [],
  value,
  onChange,
  minWidth = '160px',
  isMobile = false,
  customStyle = {},
  icon = null,
  alignRight = false,
}) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((o) => String(o.value) === String(value))
  const displayLabel = selectedOption ? selectedOption.label : label
  const isFilterActive = selectedOption && selectedOption.value !== '' && selectedOption.value !== 'id' && selectedOption.value !== 'activo'

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        width: isMobile ? '100%' : (minWidth || '175px'),
        minWidth: isMobile ? '0' : (minWidth || '175px'),
        maxWidth: isMobile ? '100%' : (minWidth || '175px'),
        ...customStyle
      }}
      ref={dropdownRef}
    >
      <button
        type="button"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '5px' : '7px',
          width: '100%',
          height: isMobile ? '36px' : 'auto',
          padding: isMobile ? '0 10px' : '9px 14px',
          background: open ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
          border: '1px solid',
          borderColor: open ? 'var(--accent-blue)' : 'var(--border)',
          borderRadius: '10px',
          color: 'var(--text-secondary)',
          fontSize: isMobile ? '11.5px' : '13px',
          fontWeight: '600',
          fontFamily: 'inherit',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: open ? '0 0 10px rgba(59, 130, 246, 0.25)' : 'none',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.borderColor = 'var(--accent-blue)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.transform = 'none'
          }
        }}
      >
        {icon && (
          <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--text-muted)' }}>
            {icon}
          </span>
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'left',
            marginRight: '4px',
          }}
          title={displayLabel}
        >
          {displayLabel}
        </span>
        <FiChevronDown
          size={isMobile ? 11 : 13}
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: open ? 'var(--accent-blue)' : 'var(--text-muted)',
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            ...(alignRight ? { right: 0 } : { left: 0 }),
            minWidth: '100%',
            width: 'max-content',
            maxWidth: '280px',
            maxHeight: '260px',
            overflowY: 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '6px',
            zIndex: 100,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value)
            return (
              <button
                key={opt.value}
                type="button"
                style={{
                  flexShrink: 0,
                  background: isSelected ? 'var(--accent-blue-bg)' : 'transparent',
                  color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '13px',
                  lineHeight: '1.3',
                  fontWeight: isSelected ? '700' : '500',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--bg-tertiary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
