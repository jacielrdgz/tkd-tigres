import React from 'react'
import { FiDownload, FiClipboard, FiChevronDown } from 'react-icons/fi'

export default function AsistenciasTopbar({
  mesActual,
  totalActivos,
  onExportar,
  onRegistrar,
}) {
  const [exportOpen, setExportOpen] = React.useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const mesStr = new Date(mesActual + '-02').toLocaleString('es-ES', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div style={s.topbar}>
      <div>
        <h1 style={s.titulo}>Control de Asistencias</h1>
        <p style={s.subtitulo}>
          <span style={s.dot} />
          <span style={{ textTransform: 'capitalize' }}>{mesStr}</span>
          <span style={s.sep}>·</span>
          <span>{totalActivos} alumnos activos</span>
        </p>
      </div>

      <div style={s.acciones}>
        {/* Exportar con dropdown */}
        <div style={{ position: 'relative' }} ref={ref}>
          <button
            id="btn-exportar-asistencias"
            style={s.btnSecundario}
            onClick={() => setExportOpen(v => !v)}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
          >
            <FiDownload size={15} />
            Exportar
            <FiChevronDown
              size={13}
              style={{ transform: exportOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
            />
          </button>

          {exportOpen && (
            <div style={s.dropdown}>
              <button
                style={{ ...s.btnExportExcel, width: '100%', justifyContent: 'center' }}
                onClick={() => { onExportar('excel'); setExportOpen(false) }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Excel
              </button>
              <button
                style={{ ...s.btnExportPdf, width: '100%', justifyContent: 'center' }}
                onClick={() => { onExportar('pdf'); setExportOpen(false) }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                PDF
              </button>
            </div>
          )}
        </div>

        {/* Registrar pase de lista */}
        <button
          id="btn-registrar-asistencia"
          style={s.btnPrimario}
          onClick={onRegistrar}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 0 30px rgba(59,130,246,0.5)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'var(--shadow-glow-blue)'
            e.currentTarget.style.transform = 'none'
          }}
        >
          <FiClipboard size={15} />
          Registrar
        </button>
      </div>
    </div>
  )
}

const s = {
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  titulo: {
    fontSize: '26px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  subtitulo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: 'var(--text-muted)',
    marginTop: '4px',
    fontWeight: '500',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: 'var(--accent-green)',
    boxShadow: '0 0 6px var(--accent-green)',
    display: 'inline-block',
    flexShrink: 0,
  },
  sep: { color: 'var(--border-hover)', fontWeight: 300 },
  acciones: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  btnSecundario: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '10px 18px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  btnPrimario: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '10px 20px',
    background: 'var(--accent-blue)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: 'var(--shadow-glow-blue)',
    fontFamily: 'inherit',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '8px',
    zIndex: 100,
    minWidth: '160px',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  btnExportExcel: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', },
  btnExportPdf: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)', },
}
