import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiCamera, FiChevronDown } from 'react-icons/fi'
import api from '../api/axios'
import './PerfilAlumno.css'
import Swal from 'sweetalert2'
import ModalAlumno from '../components/Asistencias/ModalAlumno'
import { invalidateCache } from '../utils/cacheManager'

// Helper para limpiar strings nulos/vacíos
const limpiarDato = (val) => {
  if (val === null || val === undefined || val === 'null' || val === 'NULL' || val === '') return '-'
  return typeof val === 'string' ? val.trim() : val
}

const tieneFoto = (foto) => {
  if (!foto || foto === 'null' || foto === 'NULL' || foto === '') return false
  return true
}

const capitalizar = (str) =>
  str ? str.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : ''

const obtenerIniciales = (nombre, apellido) => {
  if (!nombre) return '?'
  const n = limpiarDato(nombre).charAt(0)
  const a = apellido ? limpiarDato(apellido).charAt(0) : ''
  return (n + a).toUpperCase()
}

const formatFechaNatural = (fecha) => {
  if (!fecha) return '-'
  const d = new Date(fecha + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

const formatMonto = (monto) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0)
}

const formatHora = (hora) => {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hrs = parseInt(h)
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  const h12 = hrs % 12 || 12
  return `${h12}:${m} ${ampm}`
}

const editModalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px 20px', width: '520px', maxWidth: '94vw', maxHeight: '86vh', overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' },
  modalTitulo: { color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', margin: 0 },
  btnCerrarCircular: {
    width: '34px',
    height: '34px',
    minWidth: '34px',
    minHeight: '34px',
    borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    aspectRatio: '1 / 1',
    padding: 0,
    transition: 'all 0.15s ease',
  },
  fotoUploadArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px', gap: '5px' },
  fotoPreviewBox: { width: '84px', height: '84px', borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.15)', cursor: 'pointer', overflow: 'hidden', background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0, boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.3)' },
  fotoPreviewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  fotoPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  btnQuitarFoto: { background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: '11px', cursor: 'pointer', fontWeight: '600' },
  grid2: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '8px 10px', alignItems: 'start', width: '100%', boxSizing: 'border-box' },
  campoGroup: { display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%', boxSizing: 'border-box' },
  label: { display: 'flex', alignItems: 'center', minHeight: '24px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', lineHeight: 1.2, fontFamily: 'Inter, sans-serif' },
  input: { width: '100%', maxWidth: '100%', minWidth: 0, fontSize: '13.5px', height: '38px', minHeight: '38px', padding: '0 10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: '#ffffff', outline: 'none', boxSizing: 'border-box', transition: 'all 0.15s ease', colorScheme: 'dark', fontFamily: 'Inter, sans-serif' },
  inputError: { marginTop: '3px', fontSize: '11px', color: 'var(--accent-red)', lineHeight: 1.2 },
  select: { width: '100%', fontSize: '13.5px', height: '38px', padding: '0 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: '#ffffff', outline: 'none', boxSizing: 'border-box', cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'Inter, sans-serif' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' },
  btnPrimary: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '13.5px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', letterSpacing: '0.2px', fontWeight: '700', cursor: 'pointer', boxShadow: 'none', transition: 'all 0.2s ease' },
  btnSecondary: { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 24px', fontSize: '13.5px', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', letterSpacing: '0.2px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease' },
}

function Campo({ label, value, onChange, type = 'text', full, error, required, placeholder, inputMode, pattern }) {
  return (
    <div style={full ? { gridColumn: '1 / -1', minWidth: 0, width: '100%' } : { minWidth: 0, width: '100%' }}>
      <label style={editModalStyles.label}>
        {label} {required ? <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span> : null}
      </label>
      <input
        style={{
          ...editModalStyles.input,
          border: error ? '1px solid #ef4444' : editModalStyles.input.border,
          boxShadow: error ? '0 0 0 3px rgba(239,68,68,.12)' : 'none',
        }}
        type={type}
        inputMode={inputMode}
        pattern={pattern}
        placeholder={placeholder || ''}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      />
      {error ? <div style={editModalStyles.inputError}>{error}</div> : null}
    </div>
  )
}

function CampoFecha({ label, value, onChange, error, required, placeholder = 'dd/mm/aaaa' }) {
  const hiddenDateRef = useRef(null)

  const formatDisplay = (val) => {
    if (!val) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-')
      return `${d}/${m}/${y}`
    }
    return val
  }

  const [textVal, setTextVal] = useState(formatDisplay(value))

  useEffect(() => {
    setTextVal(formatDisplay(value))
  }, [value])

  const handleTextChange = (e) => {
    let raw = e.target.value.replace(/[^0-9/]/g, '')
    let digits = raw.replace(/\D/g, '').slice(0, 8)
    let formatted = ''
    if (digits.length <= 2) formatted = digits
    else if (digits.length <= 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
    else formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`

    setTextVal(formatted)

    if (formatted.length === 10) {
      const [d, m, y] = formatted.split('/')
      if (parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31 && parseInt(y, 10) >= 1900) {
        onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
      }
    } else if (formatted.length === 0) {
      onChange('')
    }
  }

  const openPicker = () => {
    if (hiddenDateRef.current) {
      if (typeof hiddenDateRef.current.showPicker === 'function') {
        hiddenDateRef.current.showPicker()
      } else {
        hiddenDateRef.current.focus()
        hiddenDateRef.current.click()
      }
    }
  }

  return (
    <div style={{ minWidth: 0, width: '100%', position: 'relative' }}>
      <label style={editModalStyles.label}>
        {label} {required ? <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span> : null}
      </label>
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        <input
          style={{
            ...editModalStyles.input,
            paddingRight: '36px',
            border: error ? '1px solid #ef4444' : editModalStyles.input.border,
            boxShadow: error ? '0 0 0 3px rgba(239,68,68,.12)' : 'none',
            display: 'flex',
            alignItems: 'center',
            lineHeight: '38px',
          }}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={textVal}
          onChange={handleTextChange}
        />
        <button
          type="button"
          onClick={openPicker}
          style={{
            position: 'absolute',
            right: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            height: '28px',
            width: '28px',
            borderRadius: '6px',
            transition: 'color 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--accent-blue)'
            e.currentTarget.style.background = 'var(--accent-blue-bg)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.background = 'none'
          }}
          title="Abrir calendario"
          aria-label="Seleccionar fecha"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
        <input
          ref={hiddenDateRef}
          type="date"
          tabIndex={-1}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            width: '1px',
            height: '1px',
            bottom: 0,
            left: 0,
          }}
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value)
          }}
        />
      </div>
      {error ? <div style={editModalStyles.inputError}>{error}</div> : null}
    </div>
  )
}

function FormDropdown({ label, required, options = [], value, onChange, placeholder = 'Seleccionar...', error, searchable = false }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, openUp: false })
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < 220 && rect.top > 220
      setDropdownPos({
        top: openUp ? (rect.top - 6) : (rect.bottom + 6),
        left: rect.left,
        width: rect.width,
        openUp,
      })
    }
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }

    const handleScrollOrResize = () => {
      if (open) updatePosition()
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setSearch('')
      if (searchable || options.length > 5) {
        setTimeout(() => {
          if (searchInputRef.current) searchInputRef.current.focus()
        }, 60)
      }
    }
  }, [open, searchable, options.length])

  const toggleOpen = () => {
    if (!open) {
      updatePosition()
    }
    setOpen((v) => !v)
  }

  const selectedOption = options.find((o) => String(o.value) === String(value))
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  const filteredOptions = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()) || (o.value === '' && search === ''))
    : options

  return (
    <div style={editModalStyles.campoGroup}>
      <label style={editModalStyles.label}>
        {label} {required ? <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span> : null}
      </label>
      <div style={{ position: 'relative', width: '100%' }}>
        <button
          ref={buttonRef}
          type="button"
          style={{
            ...editModalStyles.input,
            width: '100%',
            maxWidth: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            padding: '0 10px 0 12px',
            color: (selectedOption && selectedOption.value !== '') ? '#ffffff' : 'var(--text-muted)',
            cursor: 'pointer',
            border: error ? '1px solid #ef4444' : (open ? '1px solid var(--accent-blue)' : '1px solid var(--border)'),
            boxShadow: error ? '0 0 0 3px rgba(239,68,68,.12)' : (open ? '0 0 10px rgba(59, 130, 246, 0.25)' : 'none'),
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
          onClick={toggleOpen}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              width: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
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
              color: open ? 'var(--accent-blue)' : '#ffffff',
              flexShrink: 0,
            }}
          />
        </button>

        {open && createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: dropdownPos.openUp ? 'auto' : `${dropdownPos.top}px`,
              bottom: dropdownPos.openUp ? `${window.innerHeight - dropdownPos.top}px` : 'auto',
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`,
              maxHeight: '230px',
              overflowY: 'auto',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '5px',
              zIndex: 99999,
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              boxSizing: 'border-box',
            }}
          >
            {(searchable || options.length > 5) && (
              <div style={{ padding: '2px 2px 5px 2px', borderBottom: '1px solid var(--border)', marginBottom: '3px' }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="form-dropdown-search-input"
                  placeholder="Escribir para filtrar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    fontSize: '12.5px',
                    height: '32px',
                    minHeight: '32px',
                    padding: '0 8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                      if (filteredOptions.length > 0) {
                        const targetOpt = filteredOptions.find((o) => o.value !== '') || filteredOptions[0]
                        if (targetOpt) {
                          onChange(targetOpt.value)
                          setOpen(false)
                        }
                      }
                    }
                  }}
                />
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Sin resultados
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    style={{
                      flexShrink: 0,
                      minHeight: '34px',
                      width: '100%',
                      background: isSelected ? 'var(--accent-blue-bg)' : 'transparent',
                      color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      fontWeight: isSelected ? '700' : '500',
                      fontFamily: 'Inter, sans-serif',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      boxSizing: 'border-box',
                    }}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)'
                        e.currentTarget.style.color = '#ffffff'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })
            )}
          </div>,
          document.body
        )}
      </div>
      {error ? <div style={editModalStyles.inputError}>{error}</div> : null}
    </div>
  )
}

const modalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modalCard: { background: 'var(--bg-secondary)', borderRadius: '16px', width: '580px', maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)', boxSizing: 'border-box' },
  cardHeader: { background: 'var(--bg-tertiary)', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' },
  cardTitle: { fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0, paddingRight: '8px', lineHeight: 1.3 },
  btnCerrarWhite: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' },
  cardBody: { padding: '24px 28px', display: 'flex', gap: '20px', alignItems: 'flex-start', textAlign: 'left' },
  avatarBox: { width: '170px', height: '210px', flexShrink: 0, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '12px' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInicialesBox: { width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarIniciales: { fontSize: '48px', fontWeight: '700', color: '#ffffff' },
  cardInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 },
  infoItem: { display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '7px', paddingTop: '4px' },
  infoLabel: { fontWeight: '700', color: 'var(--text-muted)', fontSize: '13.5px', textAlign: 'right', width: '75px', minWidth: '75px', flexShrink: 0 },
  infoValue: { color: 'var(--text-primary)', fontSize: '13.5px', fontWeight: '700', textAlign: 'left', flex: 1, wordBreak: 'break-word' },
  cardFooter: { padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: '12px', background: 'var(--bg-tertiary)', flexWrap: 'wrap' },
  btnAceptar: { background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '9px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' },
  btnWhatsapp: { border: '1px solid var(--accent-green)', color: 'var(--accent-green)', background: 'var(--accent-green-bg)', padding: '9px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' },
}

function InfoItem({ label, value, isMobile }) {
  return (
    <div style={modalStyles.infoItem}>
      <span style={{
        ...modalStyles.infoLabel,
        ...(isMobile ? { width: '70px', minWidth: '70px', fontSize: '13px' } : {})
      }}>{label}:</span>
      <span style={{
        ...modalStyles.infoValue,
        ...(isMobile ? { fontSize: '13px' } : {})
      }}>{value}</span>
    </div>
  )
}

export default function PerfilAlumno() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [verFotoModal, setVerFotoModal] = useState(false)
  const [showCredencialModal, setShowCredencialModal] = useState(false)
  const [showAsistenciasModal, setShowAsistenciasModal] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)

  // Edit Modal States & Ref
  const [horarios, setHorarios] = useState([])
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [eliminarFoto, setEliminarFoto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    cargarPerfil()
  }, [id])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !guardando) {
        setVerFotoModal(false)
        setShowCredencialModal(false)
        cerrarEditar()
        setShowAsistenciasModal(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [guardando])

  const cargarPerfil = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/alumnos/${id}/perfil`)
      setData(res.data)
      const horRes = await api.get('/horarios')
      setHorarios(horRes.data)
    } catch (err) {
      console.error(err)
      setError('No se pudo cargar la información del alumno. Por favor, intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const cerrarEditar = () => {
    setModalEditar(false)
    setErrors({})
    setFotoFile(null)
    setFotoPreview(null)
    setEliminarFoto(false)
  }

  const abrirEditar = () => {
    setErrors({})
    setFotoFile(null)
    setFotoPreview(alumno.foto_url && tieneFoto(alumno.foto) ? alumno.foto_url : null)
    setEliminarFoto(false)
    setForm({
      ...alumno,
      nombre: alumno.nombre || '',
      apellido_paterno: alumno.apellido_paterno || '',
      apellido_materno: alumno.apellido_materno || '',
      nombre_tutor: alumno.nombre_tutor || '',
      telefono_tutor: alumno.telefono_tutor || '',
      fecha_ingreso: alumno.fecha_ingreso || '',
      email: alumno.email || '',
      fecha_nacimiento: alumno.fecha_nacimiento || '',
      configuracion_cinta_id: alumno.configuracion_cinta_id ? String(alumno.configuracion_cinta_id) : '',
      horario_id: alumno.horario_id ? String(alumno.horario_id) : '',
      estatus: alumno.estatus || 'activo',
      dia_pago: alumno.dia_pago || 1,
    })
    setModalEditar(true)
  }

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
    setEliminarFoto(false)
  }

  const validar = () => {
    const e = {}
    if (!form.nombre?.trim()) e.nombre = ['El nombre es obligatorio.']
    if (!form.apellido_paterno?.trim()) e.apellido_paterno = ['El apellido paterno es obligatorio.']
    if (!form.apellido_materno?.trim()) e.apellido_materno = ['El apellido materno es obligatorio.']
    if (!form.fecha_nacimiento) e.fecha_nacimiento = ['La fecha de nacimiento es obligatoria.']
    if (!form.horario_id) e.horario_id = ['Debes seleccionar un horario para el alumno.']
    if (!form.configuracion_cinta_id) e.configuracion_cinta_id = ['Debes seleccionar una cinta para el alumno.']
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = ['Correo inválido.']
    return e
  }

  const guardar = async () => {
    if (guardando) return

    try {
      const e = validar()
      setErrors(e)
      if (Object.keys(e).length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: Object.values(e)[0][0],
          background: '#13151f',
          color: '#fff',
          customClass: { popup: 'swal-custom-premium' }
        })
        return
      }

      setGuardando(true)

      const formData = new FormData()
      const EXCLUIR = ['foto_url', 'foto', 'id', 'edad', 'cinta_config', 'ultimo_pago', 'estatus_pago', 'racha_faltas', 'created_at', 'updated_at']
      Object.entries(form).forEach(([k, v]) => {
        if (!EXCLUIR.includes(k) && v !== null && v !== undefined) {
          formData.append(k, v)
        }
      })
      if (eliminarFoto) {
        formData.append('eliminar_foto', '1')
      }
      if (fotoFile && fotoFile instanceof File) {
        formData.append('foto', fotoFile)
      }

      const originalAlumno = data.alumno
      const currentFotoUrl = fotoFile ? fotoPreview : (eliminarFoto ? null : originalAlumno?.foto_url)
      const cintaSel = cintas_config?.find(c => String(c.id) === String(form.configuracion_cinta_id))
      const horarioSel = horarios?.find(h => String(h.id) === String(form.horario_id))

      // 1. Guardar y mostrar en UI de inmediato
      setData(prev => ({
        ...prev,
        alumno: {
          ...prev.alumno,
          ...form,
          foto_url: currentFotoUrl,
          foto: eliminarFoto ? null : (fotoFile ? 'pending' : prev.alumno.foto),
          cinta_config: cintaSel || prev.alumno.cinta_config,
          horario: horarioSel || prev.alumno.horario
        }
      }))
      setModalEditar(false)
      setGuardando(false)
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: 'Alumno actualizado correctamente.',
        background: '#13151f',
        color: '#fff',
        timer: 1500,
        showConfirmButton: false,
        customClass: { popup: 'swal-custom-premium' }
      })

      // 2. Persistir en backend en segundo plano
      formData.append('_method', 'PUT')
      api.post(`/alumnos/${originalAlumno.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
        .then(res => {
          if (res.data) {
            setData(prev => ({
              ...prev,
              alumno: {
                ...prev.alumno,
                ...res.data,
                cinta_config: res.data.cinta_config || cintaSel || prev.alumno.cinta_config,
                horario: res.data.horario || horarioSel || prev.alumno.horario
              }
            }))
          }
          invalidateCache('alumnos')
        })
        .catch(err => {
          console.error('Error en segundo plano al actualizar alumno:', err)
          if (originalAlumno) {
            setData(prev => ({
              ...prev,
              alumno: originalAlumno
            }))
          }
          const msg = err.response?.data?.message || (err.response?.data?.errors ? Object.values(err.response.data.errors)[0][0] : 'Error al guardar cambios en el servidor.')
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: msg,
            background: '#13151f',
            color: '#fff',
            customClass: { popup: 'swal-custom-premium' }
          })
        })
    } catch (err) {
      setGuardando(false)
      console.error('Error al procesar formulario:', err)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error inesperado al guardar.',
        background: '#13151f',
        color: '#fff',
        customClass: { popup: 'swal-custom-premium' }
      })
    }
  }

  if (loading) {
    return (
      <div className="perfil-container">
        {/* Skeleton para Topbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ width: '150px', height: '32px', background: 'var(--bg-secondary)', borderRadius: '6px', animation: 'skeletonPulse 1.5s infinite' }} />
          <div style={{ width: '220px', height: '32px', background: 'var(--bg-secondary)', borderRadius: '6px', animation: 'skeletonPulse 1.5s infinite' }} />
        </div>

        {/* Skeleton para Header */}
        <div style={{ height: '140px', background: 'var(--bg-secondary)', borderRadius: '16px', marginBottom: '24px', animation: 'skeletonPulse 1.5s infinite' }} />

        {/* Skeleton para Stats */}
        <div className="perfil-stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: '88px', background: 'var(--bg-secondary)', borderRadius: '10px', animation: 'skeletonPulse 1.5s infinite' }} />
          ))}
        </div>

        {/* Skeleton para Timeline */}
        <div style={{ height: '160px', background: 'var(--bg-secondary)', borderRadius: '16px', marginBottom: '24px', animation: 'skeletonPulse 1.5s infinite' }} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="perfil-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ color: 'var(--accent-yellow)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Error</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error || 'No se encontró el perfil'}</p>
        <button 
          onClick={() => navigate('/alumnos')} 
          className="btn" 
          style={{ background: 'var(--accent-blue)', color: '#fff', padding: '10px 20px', borderRadius: '8px' }}
        >
          Volver a alumnos
        </button>
      </div>
    )
  }

  const { alumno, stats, pago_pendiente, historial_pagos, historial_examenes, historial_eventos, racha_asistencia, ultima_falta, ultimas_30_clases, cintas_config, academia, fecha_registro, dias_asistencia } = data

  // Calcular porcentaje de progreso en las cintas
  const totalCintas = cintas_config.length
  const indexActual = cintas_config.findIndex(c => c.id === alumno.configuracion_cinta_id)

  const half = Math.ceil(totalCintas / 2)
  const row1 = cintas_config.slice(0, half)
  const row2 = cintas_config.slice(half)

  let pctRow1 = 0
  let pctRow2 = 0

  if (indexActual >= 0) {
    if (indexActual < half) {
      pctRow1 = half > 1 ? (indexActual / (half - 1)) * 100 : 0
      pctRow2 = 0
    } else {
      pctRow1 = 100
      pctRow2 = row2.length > 1 ? ((indexActual - half) / (row2.length - 1)) * 100 : 100
    }
  }

  // Obtener siguiente cinta si existe
  const siguienteCinta = indexActual >= 0 && indexActual < totalCintas - 1 ? cintas_config[indexActual + 1] : null

  return (
    <div className="perfil-container">
      {/* 1. Topbar */}
      <div className="perfil-topbar">
        <button className="perfil-btn-volver" onClick={() => navigate('/alumnos')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Volver a alumnos
        </button>
        <div className="perfil-topbar-actions">
          <button 
            className="perfil-btn-credencial"
            onClick={() => setShowCredencialModal(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" ry="2"/>
              <line x1="7" y1="8" x2="17" y2="8"/>
              <line x1="7" y1="12" x2="17" y2="12"/>
              <line x1="7" y1="16" x2="13" y2="16"/>
            </svg>
            Ver Credencial
          </button>
          <button 
            className="perfil-btn-editar"
            onClick={abrirEditar}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Editar perfil
          </button>
        </div>
      </div>

      {/* 2. Header del perfil */}
      <div className="perfil-header-card">
        <div className="perfil-header-accent-line" />
        <div className="perfil-header-flex">
          <div 
            className="perfil-avatar-container"
            style={{ cursor: tieneFoto(alumno.foto) ? 'pointer' : 'default' }}
            onClick={() => { if (tieneFoto(alumno.foto)) setVerFotoModal(true) }}
          >
            {tieneFoto(alumno.foto) ? (
              <img 
                src={alumno.foto_url} 
                alt={alumno.nombre} 
                className="perfil-avatar-img"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
              />
            ) : null}
            <div style={{ 
              display: tieneFoto(alumno.foto) ? 'none' : 'flex', 
              width: '100%', 
              height: '100%', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '32px'
            }}>
              {obtenerIniciales(alumno.nombre, alumno.apellido_paterno)}
            </div>
          </div>
          <div className="perfil-header-info">
            <div className="perfil-header-title-flex">
              <h2 className="perfil-nombre">
                {alumno.nombre} {alumno.apellido_paterno} {alumno.apellido_materno || ''}
              </h2>
              <span style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: '700',
                background: alumno.estatus === 'activo' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                color: alumno.estatus === 'activo' ? 'var(--accent-green)' : 'var(--accent-red)',
                textTransform: 'uppercase'
              }}>
                {capitalizar(alumno.estatus)}
              </span>
              <span style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: '700',
                background: alumno.cinta_config?.color_hex || 'var(--bg-tertiary)',
                color: alumno.cinta_config?.color_texto || 'var(--text-primary)',
                boxShadow: alumno.cinta_config?.color_hex ? `0 0 10px ${alumno.cinta_config.color_hex}40` : 'none'
              }}>
                {alumno.cinta_config?.nombre_nivel || 'Sin cinta'}
              </span>
            </div>
            <div className="perfil-meta-flex">
              <div className="perfil-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                <span>Academia: {academia}</span>
              </div>
              <div className="perfil-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>Horario: {alumno.horario_config ? `${formatHora(alumno.horario_config.hora_inicio)} - ${formatHora(alumno.horario_config.hora_fin)}` : '-'}</span>
              </div>
              <div className="perfil-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>
                <span>Días de clase: {dias_asistencia}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Alerta de pago pendiente */}
      {pago_pendiente && (
        <div className="perfil-alerta-pago">
          <div className="perfil-alerta-info">
            <span className="perfil-alerta-icon" style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-yellow)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </span>
            <div>
              <div style={{ fontWeight: '700' }}>Pago Pendiente Detectado</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {pago_pendiente.concepto} · <strong>{formatMonto(pago_pendiente.monto)}</strong> · Vence el {formatFechaNatural(pago_pendiente.vence)}
              </div>
            </div>
          </div>
          <button 
            className="btn"
            style={{ background: 'var(--accent-yellow)', color: '#000', fontWeight: '700', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
            onClick={() => navigate('/pagos')}
          >
            Registrar Pago
          </button>
        </div>
      )}

      {/* 4. Cards de stats */}
      <div className="perfil-stats-grid">
        <div className="perfil-stat-card">
          <div className="perfil-stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div className="perfil-stat-info">
            <div className="perfil-stat-label">Pagos</div>
            <div className="perfil-stat-val">{stats.total_pagos}</div>
            <div className="perfil-stat-sub">{formatMonto(stats.monto_acumulado)} acumulado</div>
          </div>
        </div>

        <div className="perfil-stat-card">
          <div className="perfil-stat-icon-wrapper" style={{ 
            background: stats.pct_asistencia >= 80 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)', 
            color: stats.pct_asistencia >= 80 ? 'var(--accent-green)' : 'var(--accent-red)' 
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          </div>
          <div className="perfil-stat-info">
            <div className="perfil-stat-label">Asistencia</div>
            <div className="perfil-stat-val">{stats.pct_asistencia}%</div>
            <div className="perfil-stat-sub" style={{ 
              color: stats.variacion_asistencia >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
              fontWeight: '600'
            }}>
              {stats.variacion_asistencia >= 0 ? `+${stats.variacion_asistencia}%` : `${stats.variacion_asistencia}%`} vs mes anterior
            </div>
          </div>
        </div>

        <div className="perfil-stat-card">
          <div className="perfil-stat-icon-wrapper" style={{ background: 'rgba(167, 139, 250, 0.1)', color: 'var(--accent-purple)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path></svg>
          </div>
          <div className="perfil-stat-info">
            <div className="perfil-stat-label">Exámenes</div>
            <div className="perfil-stat-val">{stats.total_examenes}</div>
            <div className="perfil-stat-sub">{stats.examenes_aprobados} aprobados</div>
          </div>
        </div>

        <div className="perfil-stat-card">
          <div className="perfil-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-yellow)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path><path d="M12 2a6.37 6.37 0 0 1 6 6.66c0 3.32-2.4 6-6 6s-6-2.68-6-6A6.37 6.37 0 0 1 12 2z"></path></svg>
          </div>
          <div className="perfil-stat-info">
            <div className="perfil-stat-label">Torneos</div>
            <div className="perfil-stat-val">{stats.total_torneos}</div>
            <div className="perfil-stat-sub">Participaciones</div>
          </div>
        </div>
      </div>

      {/* 5. Progresión de grado */}
      <div className="perfil-progresion-card">
        <h3 className="perfil-progresion-title">Progresión de Grados</h3>
        <div className="perfil-cintas-timeline-container" style={{ marginBottom: '24px' }}>
          <div className="perfil-cintas-timeline" style={{ minWidth: 'unset' }}>
            <div className="perfil-cintas-linea-detras" />
            <div className="perfil-cintas-linea-progreso" style={{ width: `${pctRow1}%` }} />
            {row1.map((cinta, idx) => {
              const completada = idx < indexActual
              const actual = cinta.id === alumno.configuracion_cinta_id
              const pendiente = idx > indexActual

              let claseCirculo = 'pendiente'
              if (completada) claseCirculo = 'completada'
              if (actual) claseCirculo = 'actual'

              return (
                <div key={cinta.id} className="perfil-cinta-nodo">
                  <div 
                    className={`perfil-cinta-circulo ${claseCirculo}`} 
                    style={{ 
                      background: completada ? 'var(--accent-green)' : (cinta.color_hex || 'var(--bg-tertiary)'),
                      color: completada ? '#ffffff' : (cinta.color_texto || 'var(--text-primary)')
                    }}
                    title={cinta.nombre_nivel}
                  >
                    {completada ? '✓' : idx + 1}
                  </div>
                  <span className={`perfil-cinta-nombre ${actual ? 'actual' : ''}`}>
                    {cinta.nombre_nivel}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {row2.length > 0 && (
          <div className="perfil-cintas-timeline-container" style={{ marginTop: '10px' }}>
            <div className="perfil-cintas-timeline" style={{ minWidth: 'unset' }}>
              <div className="perfil-cintas-linea-detras" />
              <div className="perfil-cintas-linea-progreso" style={{ width: `${pctRow2}%` }} />
              {row2.map((cinta, idx) => {
                const absoluteIndex = half + idx
                const completada = absoluteIndex < indexActual
                const actual = cinta.id === alumno.configuracion_cinta_id
                const pendiente = absoluteIndex > indexActual

                let claseCirculo = 'pendiente'
                if (completada) claseCirculo = 'completada'
                if (actual) claseCirculo = 'actual'

                return (
                  <div key={cinta.id} className="perfil-cinta-nodo">
                    <div 
                      className={`perfil-cinta-circulo ${claseCirculo}`} 
                      style={{ 
                        background: completada ? 'var(--accent-green)' : (cinta.color_hex || 'var(--bg-tertiary)'),
                        color: completada ? '#ffffff' : (cinta.color_texto || 'var(--text-primary)')
                      }}
                      title={cinta.nombre_nivel}
                    >
                      {completada ? '✓' : absoluteIndex + 1}
                    </div>
                    <span className={`perfil-cinta-nombre ${actual ? 'actual' : ''}`}>
                      {cinta.nombre_nivel}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '12px', textAlign: 'center' }}>
          Grado actual: <span style={{ color: 'var(--text-primary)' }}>{alumno.cinta_config?.nombre_nivel || 'Sin cinta'}</span>
          {siguienteCinta && (
            <>
              {' → Siguiente grado: '}
              <span style={{ color: 'var(--accent-blue)' }}>{siguienteCinta.nombre_nivel}</span>
            </>
          )}
        </div>
      </div>

      {/* 6. Racha de asistencia */}
      <div className="perfil-racha-card">
        <div className="perfil-racha-left">
          <div className="perfil-racha-flama" style={{ color: '#ef4444' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
          </div>
          <div>
            <div className="perfil-racha-num">{racha_asistencia} clases</div>
            <div className="perfil-racha-label" style={{ marginBottom: '6px' }}>Racha de asistencia consecutiva</div>
            <button
              className="perfil-btn-ver-asistencia"
              onClick={() => setShowAsistenciasModal(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Ver asistencia
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <div className="perfil-calendario-puntos">
            {ultimas_30_clases.map((presente, idx) => (
              <div 
                key={idx} 
                className={`perfil-punto-clase ${presente === 1 ? 'asistio' : 'falto'}`}
                title={presente === 1 ? 'Asistió' : 'Faltó'}
              />
            ))}
          </div>
          {ultima_falta && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Última falta registrada: {formatFechaNatural(ultima_falta)}
            </div>
          )}
        </div>
      </div>

      {/* 7. Grid Dos Columnas (Información y Exámenes) */}
      <div className="perfil-double-grid">
        {/* Info Personal */}
        <div className="perfil-panel">
          <h3 className="perfil-panel-title">Información Personal</h3>
          <div style={{ flex: 1 }}>
            <div className="perfil-info-item">
              <span className="perfil-info-label">ID Alumno</span>
              <span className="perfil-info-val">#{alumno.id}</span>
            </div>
            <div className="perfil-info-item">
              <span className="perfil-info-label">Fecha de Registro</span>
              <span className="perfil-info-val">{formatFechaNatural(fecha_registro)}</span>
            </div>
            <div className="perfil-info-item">
              <span className="perfil-info-label">Academia</span>
              <span className="perfil-info-val">{academia}</span>
            </div>
            <div className="perfil-info-item">
              <span className="perfil-info-label">Tutor</span>
              <span className="perfil-info-val">{limpiarDato(alumno.nombre_tutor)}</span>
            </div>
            <div className="perfil-info-item">
              <span className="perfil-info-label">Teléfono Tutor</span>
              <span className="perfil-info-val">
                <a href={`tel:${alumno.telefono_tutor}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
                  {limpiarDato(alumno.telefono_tutor)}
                </a>
              </span>
            </div>
            <div className="perfil-info-item">
              <span className="perfil-info-label">Correo</span>
              <span className="perfil-info-val">
                {alumno.email && alumno.email !== 'null' ? (
                  <a href={`mailto:${alumno.email}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
                    {alumno.email}
                  </a>
                ) : '-'}
              </span>
            </div>
            <div className="perfil-info-item">
              <span className="perfil-info-label">Fecha de Nacimiento</span>
              <span className="perfil-info-val">{formatFechaNatural(alumno.fecha_nacimiento)} ({alumno.edad} años)</span>
            </div>
            <div className="perfil-info-item">
              <span className="perfil-info-label">Día de Pago</span>
              <span className="perfil-info-val">Día {alumno.dia_pago || 1} de cada mes</span>
            </div>
            <div className="perfil-info-item">
              <span className="perfil-info-label">Horario asignado</span>
              <span className="perfil-info-val">
                {alumno.horario_config ? `${formatHora(alumno.horario_config.hora_inicio)} - ${formatHora(alumno.horario_config.hora_fin)}` : '-'}
              </span>
            </div>
            <div className="perfil-info-item">
              <span className="perfil-info-label">Días de asistencia</span>
              <span className="perfil-info-val">{dias_asistencia}</span>
            </div>
          </div>
        </div>

        {/* Historial Exámenes */}
        <div className="perfil-panel">
          <h3 className="perfil-panel-title">Historial de Exámenes</h3>
          <div className="perfil-list-items">
            {historial_examenes.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No hay registros de exámenes</div>
            ) : (
              historial_examenes.map(ex => (
                <div key={ex.id} className="perfil-list-item">
                  <div className="perfil-list-left">
                    <div className="perfil-list-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path></svg>
                    </div>
                    <div className="perfil-list-details">
                      <span className="perfil-list-title">{ex.nombre}</span>
                      <span className="perfil-list-subtitle">{formatFechaNatural(ex.fecha)}</span>
                    </div>
                  </div>
                  <div className="perfil-list-right">
                    <div className="perfil-badge-grado-cambio">
                      <span className="perfil-cinta-mini" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        {ex.grado_anterior}
                      </span>
                      <span>→</span>
                      <span className="perfil-cinta-mini" style={{ background: 'var(--border)', color: 'var(--text-primary)', fontWeight: '700' }}>
                        {ex.grado_nuevo}
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      color: ex.resultado === 'aprobado' ? 'var(--accent-green)' : 'var(--accent-red)',
                      textTransform: 'uppercase'
                    }}>
                      {ex.resultado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 8. Grid Dos Columnas (Pagos y Eventos) */}
      <div className="perfil-double-grid">
        {/* Historial Pagos */}
        <div className="perfil-panel">
          <h3 className="perfil-panel-title">
            <span>Historial de Pagos</span>
            <button 
              className="btn" 
              style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', fontSize: '12px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/pagos')}
            >
              + Nuevo Pago
            </button>
          </h3>
          <div className="perfil-list-items">
            {historial_pagos.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No hay registros de pagos</div>
            ) : (
              historial_pagos.map(pago => (
                <div key={pago.id} className="perfil-list-item">
                  <div className="perfil-list-left">
                    <div className="perfil-list-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    </div>
                    <div className="perfil-list-details">
                      <span className="perfil-list-title">{pago.concepto}</span>
                      <span className="perfil-list-subtitle">
                        {pago.fecha_pago ? formatFechaNatural(pago.fecha_pago) : 'Sin fecha'} · Método: {pago.metodo_pago}
                      </span>
                    </div>
                  </div>
                  <div className="perfil-list-right">
                    <span className="perfil-list-val">{formatMonto(pago.monto)}</span>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      color: pago.estado === 'pagado' ? 'var(--accent-green)' : (pago.estado === 'vencido' ? 'var(--accent-red)' : 'var(--accent-yellow)'),
                      textTransform: 'uppercase'
                    }}>
                      {pago.estado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Participación Eventos */}
        <div className="perfil-panel">
          <h3 className="perfil-panel-title">Participación en Eventos</h3>
          <div className="perfil-list-items">
            {historial_eventos.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No hay participación registrada</div>
            ) : (
              historial_eventos.map(ev => (
                <div key={ev.id} className="perfil-list-item">
                  <div className="perfil-list-left">
                    <div className="perfil-list-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path><path d="M12 2a6.37 6.37 0 0 1 6 6.66c0 3.32-2.4 6-6 6s-6-2.68-6-6A6.37 6.37 0 0 1 12 2z"></path></svg>
                    </div>
                    <div className="perfil-list-details">
                      <span className="perfil-list-title">{ev.nombre}</span>
                      <span className="perfil-list-subtitle">{formatFechaNatural(ev.fecha)} · {ev.modalidad}</span>
                    </div>
                  </div>
                  <div className="perfil-list-right">
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: '700',
                      background: ev.resultado === 'oro' ? 'rgba(251, 191, 36, 0.2)' : (ev.resultado === 'plata' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(217, 119, 6, 0.2)'),
                      color: ev.resultado === 'oro' ? '#f59e0b' : (ev.resultado === 'plata' ? '#9ca3af' : '#d97706'),
                      textTransform: 'uppercase'
                    }}>
                      {ev.resultado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal de Foto de Perfil */}
      {verFotoModal && (
        <div 
          className="perfil-lightbox-overlay" 
          onClick={() => setVerFotoModal(false)}
        >
          <div className="perfil-lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="perfil-lightbox-close" onClick={() => setVerFotoModal(false)}>✕</button>
            <img src={alumno.foto_url} alt={alumno.nombre} className="perfil-lightbox-img" />
          </div>
        </div>
      )}

      {/* Modal Credencial de Alumno */}
      {showCredencialModal && (
        <div style={modalStyles.overlay} onClick={() => setShowCredencialModal(false)}>
          <div style={modalStyles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={modalStyles.cardHeader}>
              <h3 style={modalStyles.cardTitle}>
                {alumno.nombre} {alumno.apellido_paterno} {alumno.apellido_materno || ''}
              </h3>
              <button style={modalStyles.btnCerrarWhite} onClick={() => setShowCredencialModal(false)}>✕</button>
            </div>
            <div style={{
              ...modalStyles.cardBody,
              ...(isMobile ? { flexDirection: 'column', alignItems: 'center', padding: '18px 16px', gap: '16px' } : {})
            }}>
              <div style={{
                ...modalStyles.avatarBox,
                ...(isMobile ? { width: '130px', height: '160px', borderRadius: '12px' } : {})
              }}>
                {tieneFoto(alumno.foto) ? (
                  <img 
                    src={alumno.foto_url} 
                    alt="foto" 
                    style={modalStyles.avatarImg}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                  />
                ) : null}
                <div style={{
                  ...modalStyles.avatarInicialesBox,
                  display: tieneFoto(alumno.foto) ? 'none' : 'flex'
                }}>
                  <span style={{
                    ...modalStyles.avatarIniciales,
                    ...(isMobile ? { fontSize: '42px' } : {})
                  }}>
                    {obtenerIniciales(alumno.nombre, alumno.apellido_paterno)}
                  </span>
                </div>
              </div>
              <div style={{
                ...modalStyles.cardInfo,
                ...(isMobile ? { width: '100%', gap: '8px' } : {})
              }}>
                <InfoItem label="ID" value={alumno.id} isMobile={isMobile} />
                <InfoItem label="F. Nac." value={alumno.fecha_nacimiento} isMobile={isMobile} />
                <InfoItem label="Edad" value={alumno.edad ? `${alumno.edad} años` : '-'} isMobile={isMobile} />
                <InfoItem label="Cinta" value={alumno.cinta_config?.nombre_nivel || 'Sin cinta'} isMobile={isMobile} />
                <InfoItem label="Tutor" value={limpiarDato(alumno.nombre_tutor)} isMobile={isMobile} />
                <InfoItem label="Teléfono" value={limpiarDato(alumno.telefono_tutor)} isMobile={isMobile} />
                <InfoItem label="Correo" value={(alumno.email && alumno.email !== 'NULL' && alumno.email !== 'null') ? alumno.email : 'N/A'} isMobile={isMobile} />
                <InfoItem label="Status" value={capitalizar(alumno.estatus)} isMobile={isMobile} />
              </div>
            </div>
            <div style={{
              ...modalStyles.cardFooter,
              ...(isMobile ? { padding: '14px 16px', gap: '10px' } : {})
            }}>
              <a
                href={'https://wa.me/52' + alumno.telefono_tutor?.replace(/\s+/g, '')}
                target="_blank"
                rel="noreferrer"
                style={{
                  ...modalStyles.btnWhatsapp,
                  ...(isMobile ? { flex: 1, justifyContent: 'center', padding: '9px 12px' } : {})
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.517 2.011.808 3.146.809 3.181 0 5.767-2.584 5.768-5.764 0-3.18-2.586-5.763-5.768-5.763zm4.52 8.161c-.199.557-1.162 1.058-1.597 1.115-.41.054-.935.086-1.503-.099-.345-.113-.775-.262-1.328-.489-2.315-.953-3.82-3.308-3.936-3.461-.116-.155-.945-1.258-.945-2.399 0-1.141.594-1.701.806-1.933.211-.231.462-.29.616-.29.154 0 .308.001.442.008.14.007.33-.053.516.39.186.444.636 1.547.692 1.659.056.111.093.242.019.39-.074.148-.112.241-.223.37-.111.13-.233.29-.333.389-.111.111-.228.232-.098.455.13.223.577.95 1.24 1.54.853.759 1.567.994 1.79.1.223-.112.455-.228.678-.541.222-.314.185-.537.408-.65s.445-.074.743.074c.297.149 1.874.883 2.196 1.043.322.16.537.241.616.37.079.13.079.752-.12 1.309z" />
                </svg>
                WHATSAPP
              </a>
              <button
                style={{
                  ...modalStyles.btnAceptar,
                  ...(isMobile ? { flex: 1, justifyContent: 'center', padding: '9px 12px' } : {})
                }}
                onClick={() => setShowCredencialModal(false)}
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Asistencias por Alumno */}
      {showAsistenciasModal && (
        <ModalAlumno
          alumno={alumno}
          onCerrar={() => setShowAsistenciasModal(false)}
        />
      )}

      {/* Modal Editar Alumno */}
      {modalEditar && (
        <div
          style={editModalStyles.overlay}
          className="mobile-fullscreen-overlay"
          onClick={guardando ? undefined : (e => { if (e.target === e.currentTarget) cerrarEditar(); })}
        >
          <div
            style={{
              ...editModalStyles.modal,
              pointerEvents: guardando ? 'none' : 'auto'
            }}
            className="mobile-fullscreen-modal"
            onKeyDown={e => {
              if (guardando) return
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault()
                guardar()
              }
            }}
          >
            <div style={editModalStyles.modalHeader}>
              <h3 style={editModalStyles.modalTitulo}>Editar alumno</h3>
              <button
                type="button"
                className="btn-cerrar-circular"
                style={{
                  ...editModalStyles.btnCerrarCircular,
                  opacity: guardando ? 0.5 : 1,
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  pointerEvents: guardando ? 'none' : 'auto'
                }}
                onClick={guardando ? undefined : cerrarEditar}
                disabled={guardando}
                aria-label="Cerrar modal"
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
                  e.currentTarget.style.color = 'var(--accent-red)'
                  e.currentTarget.style.transform = 'rotate(90deg)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <FiX size={17} />
              </button>
            </div>

            <div style={editModalStyles.fotoUploadArea}>
              <div
                style={editModalStyles.fotoPreviewBox}
                onClick={() => fileRef.current.click()}
                title="Toca para seleccionar foto"
              >
                {fotoPreview ? (
                  <img
                    src={fotoPreview}
                    alt=""
                    style={editModalStyles.fotoPreviewImg}
                    onError={() => setFotoPreview(null)}
                  />
                ) : (
                  <div style={editModalStyles.fotoPlaceholder}>
                    <FiCamera size={26} color="#ffffff" style={{ marginBottom: '4px' }} />
                    <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: '700' }}>
                      Subir foto
                    </span>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFoto}
              />
              {fotoPreview && (
                <button
                  type="button"
                  style={editModalStyles.btnQuitarFoto}
                  onClick={() => { setFotoFile(null); setFotoPreview(null); setEliminarFoto(true) }}
                >
                  Quitar foto
                </button>
              )}
            </div>

            <div style={editModalStyles.grid2}>
              <Campo label="Nombre(s)" value={form.nombre} error={errors.nombre?.[0]} required onChange={v => { setForm({ ...form, nombre: v }); if (errors.nombre) setErrors(prev => ({ ...prev, nombre: undefined })) }} />
              <Campo label="Apellido paterno" value={form.apellido_paterno} error={errors.apellido_paterno?.[0]} required onChange={v => { setForm({ ...form, apellido_paterno: v }); if (errors.apellido_paterno) setErrors(prev => ({ ...prev, apellido_paterno: undefined })) }} />
              <Campo label="Apellido materno" value={form.apellido_materno} error={errors.apellido_materno?.[0]} required onChange={v => { setForm({ ...form, apellido_materno: v }); if (errors.apellido_materno) setErrors(prev => ({ ...prev, apellido_materno: undefined })) }} />
              <CampoFecha label="Fecha de nacimiento" value={form.fecha_nacimiento} placeholder="dd/mm/aaaa" error={errors.fecha_nacimiento?.[0]} required onChange={v => { setForm({ ...form, fecha_nacimiento: v }); if (errors.fecha_nacimiento) setErrors(prev => ({ ...prev, fecha_nacimiento: undefined })) }} />
              <Campo label="Nombre del tutor" value={form.nombre_tutor} error={errors.nombre_tutor?.[0]} onChange={v => { setForm({ ...form, nombre_tutor: v }); if (errors.nombre_tutor) setErrors(prev => ({ ...prev, nombre_tutor: undefined })) }} />
              <Campo
                label="Teléfono del tutor"
                value={form.telefono_tutor}
                placeholder="10 dígitos"
                error={errors.telefono_tutor?.[0]}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={v => {
                  const limpio = v.replace(/[^0-9]/g, '')
                  setForm({ ...form, telefono_tutor: limpio })
                  if (errors.telefono_tutor) setErrors(prev => ({ ...prev, telefono_tutor: undefined }))
                }}
              />
              <CampoFecha label="Fecha de ingreso (Opcional)" value={form.fecha_ingreso} placeholder="dd/mm/aaaa" error={errors.fecha_ingreso?.[0]} onChange={v => { setForm({ ...form, fecha_ingreso: v }); if (errors.fecha_ingreso) setErrors(prev => ({ ...prev, fecha_ingreso: undefined })) }} />
              <Campo
                label="Correo electrónico"
                value={form.email}
                placeholder="ejemplo@correo.com"
                error={errors.email?.[0]}
                onChange={v => {
                  setForm({ ...form, email: v })
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                }}
                type="email"
              />

              <FormDropdown
                label="Horario Asignado"
                required
                placeholder="Seleccionar horario..."
                searchable
                options={[
                  { value: '', label: 'Seleccionar horario...' },
                  ...horarios.map(h => ({
                    value: String(h.id),
                    label: `${h.nombre} (${formatHora(h.hora_inicio)} - ${formatHora(h.hora_fin)})`
                  }))
                ]}
                value={form.horario_id}
                error={errors.horario_id?.[0]}
                onChange={val => {
                  setForm({ ...form, horario_id: val })
                  if (errors.horario_id) setErrors(prev => ({ ...prev, horario_id: undefined }))
                }}
              />

              <FormDropdown
                label="Cinta"
                required
                searchable
                placeholder="Seleccionar cinta..."
                options={[
                  { value: '', label: 'Seleccionar cinta...' },
                  ...(cintas_config || []).map(c => ({
                    value: String(c.id),
                    label: c.nombre_nivel
                  }))
                ]}
                value={form.configuracion_cinta_id}
                error={errors.configuracion_cinta_id?.[0]}
                onChange={val => {
                  setForm({ ...form, configuracion_cinta_id: val })
                  if (errors.configuracion_cinta_id) setErrors(prev => ({ ...prev, configuracion_cinta_id: undefined }))
                }}
              />

              <FormDropdown
                label="Estatus"
                options={[
                  { value: 'activo', label: 'Activo' },
                  { value: 'inactivo', label: 'Inactivo' }
                ]}
                value={form.estatus}
                onChange={val => setForm({ ...form, estatus: val })}
              />

              <div style={editModalStyles.campoGroup}>
                <label style={editModalStyles.label}>Día de pago (1-31)</label>
                <input
                  style={editModalStyles.input}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  max="31"
                  value={form.dia_pago || ''}
                  placeholder="Ej. 1"
                  onChange={e => {
                    let val = e.target.value === '' ? '' : parseInt(e.target.value);
                    if (val !== '' && val > 31) val = 31;
                    if (val !== '' && val < 1) val = 1;
                    setForm({ ...form, dia_pago: val });
                  }}
                />
              </div>
            </div>

            <div style={editModalStyles.modalFooter}>
              <button
                type="button"
                style={{
                  ...editModalStyles.btnSecondary,
                  opacity: guardando ? 0.5 : 1,
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  pointerEvents: guardando ? 'none' : 'auto'
                }}
                onClick={guardando ? undefined : cerrarEditar}
                disabled={guardando}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                  e.currentTarget.style.borderColor = 'var(--border-hover)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={{
                  ...editModalStyles.btnPrimary,
                  opacity: guardando ? 0.75 : 1,
                  cursor: guardando ? 'not-allowed' : 'pointer'
                }}
                onClick={guardar}
                disabled={guardando}
                onMouseEnter={e => {
                  if (!guardando) {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)'
                    e.currentTarget.style.filter = 'brightness(1.08)'
                  }
                }}
                onMouseLeave={e => {
                  if (!guardando) {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.filter = 'none'
                  }
                }}
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
