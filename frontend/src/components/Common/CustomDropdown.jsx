import React, { useState, useEffect, useRef } from 'react'
import { FiChevronDown } from 'react-icons/fi'

export default function CustomDropdown({
  label,
  options = [],
  value,
  onChange,
  minWidth = '160px',
  isMobile = false,
  customStyle = {}
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

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        width: isMobile ? '100%' : minWidth,
        maxWidth: isMobile ? '100%' : minWidth,
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
          gap: '8px',
          width: '100%',
          padding: '9px 12px',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: open ? 'var(--accent-blue)' : 'var(--border)',
          backgroundColor: open ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
          color: selectedOption && selectedOption.value !== '' ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: '13.5px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: open ? '0 0 12px rgba(59, 130, 246, 0.25)' : 'var(--shadow-sm)',
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
        <span
          style={{
            flex: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'left',
            marginRight: '6px',
          }}
          title={displayLabel}
        >
          {displayLabel}
        </span>
        <FiChevronDown
          size={13}
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
            left: 0,
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
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
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
                  borderRadius: '8px',
                  padding: '7px 10px',
                  fontSize: '13px',
                  lineHeight: '1.3',
                  fontWeight: isSelected ? '700' : '500',
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
