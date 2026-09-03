import React, { useState, useEffect, useRef } from 'react'
import { FiDownload, FiChevronDown } from 'react-icons/fi'

export default function BotonExportar({ onExportarExcel, onExportarPDF, disabled = false, dropUp = false, align = 'right', className = 'mobile-hide' }) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={exportRef} className={className}>
      <button
        type="button"
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '9px 16px',
          background: exportOpen ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
          border: '1px solid',
          borderColor: exportOpen ? 'var(--accent-blue)' : 'var(--border)',
          borderRadius: '10px',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          fontWeight: '600',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: 'inherit',
          boxShadow: exportOpen ? '0 0 12px rgba(59, 130, 246, 0.3)' : 'none',
          opacity: disabled ? 0.6 : 1,
        }}
        onClick={() => !disabled && setExportOpen((v) => !v)}
        onMouseEnter={(e) => {
          if (!exportOpen && !disabled) {
            e.currentTarget.style.background = 'var(--bg-tertiary)'
            e.currentTarget.style.borderColor = 'var(--accent-blue)'
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }
        }}
        onMouseLeave={(e) => {
          if (!exportOpen && !disabled) {
            e.currentTarget.style.background = 'var(--bg-secondary)'
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.transform = 'none'
          }
        }}
      >
        <FiDownload size={15} style={{ color: exportOpen ? 'var(--accent-blue)' : 'inherit' }} />
        <span>Exportar</span>
        <FiChevronDown
          size={13}
          style={{
            transform: dropUp
              ? (exportOpen ? 'none' : 'rotate(180deg)')
              : (exportOpen ? 'rotate(180deg)' : 'none'),
            transition: '0.2s ease',
            color: exportOpen ? 'var(--accent-blue)' : 'var(--text-muted)',
          }}
        />
      </button>

      {exportOpen && (
        <div
          style={{
            position: 'absolute',
            ...(dropUp ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }),
            ...(align === 'left' ? { left: 0 } : { right: 0 }),
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '8px',
            zIndex: 1000,
            minWidth: '150px',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {onExportarExcel && (
            <button
              type="button"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                width: '100%',
              }}
              onClick={() => {
                onExportarExcel()
                setExportOpen(false)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.5)'
                e.currentTarget.style.filter = 'brightness(1.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)'
                e.currentTarget.style.filter = 'none'
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Excel
            </button>
          )}

          {onExportarPDF && (
            <button
              type="button"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                width: '100%',
              }}
              onClick={() => {
                onExportarPDF()
                setExportOpen(false)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.5)'
                e.currentTarget.style.filter = 'brightness(1.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)'
                e.currentTarget.style.filter = 'none'
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              PDF
            </button>
          )}
        </div>
      )}
    </div>
  )
}
