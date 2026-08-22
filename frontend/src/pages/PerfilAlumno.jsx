import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import api from '../api/axios'
import './PerfilAlumno.css'
import Swal from 'sweetalert2'
import ModalAlumno from '../components/Asistencias/ModalAlumno'

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
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '580px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  modalTitulo: { color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', margin: 0 },
  btnCerrar: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' },
  fotoUploadArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', gap: '8px' },
  fotoPreviewBox: { width: '100px', height: '100px', borderRadius: '50%', border: '2px dashed var(--border)', cursor: 'pointer', overflow: 'hidden', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fotoPreviewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  fotoPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  btnQuitarFoto: { background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: '12px', cursor: 'pointer' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  campoGroup: { marginTop: '1px' },
  label: { display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' },
  input: { width: '100%', fontSize: '14px', padding: '9px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' },
  inputError: { marginTop: '6px', fontSize: '12px', color: 'var(--accent-red)', lineHeight: 1.2 },
  select: { width: '100%', padding: '9px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' },
  btnSecondary: { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  btnPrimary: { background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-md)', transition: 'all 0.2s' },
}

function Campo({ label, value, onChange, type = 'text', full, error, required }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : {}}>
      <label style={editModalStyles.label}>{label} {required && <span style={{ color: 'var(--accent-red)' }}>*</span>}</label>
      <input
        type={type}
        value={value || ''}
        style={{ ...editModalStyles.input, borderColor: error ? 'var(--accent-red)' : 'var(--border)' }}
        onChange={e => onChange(e.target.value)}
      />
      {error && <div style={editModalStyles.inputError}>{error}</div>}
    </div>
  )
}

const modalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modalCard: { background: 'var(--bg-secondary)', borderRadius: '16px', width: '580px', maxWidth: '95vw', border: '1px solid var(--border)' },
  cardHeader: { background: 'var(--bg-tertiary)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' },
  cardTitle: { fontSize: '18px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 },
  btnCerrarWhite: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' },
  cardBody: { padding: '30px', display: 'flex', gap: '18px', alignItems: 'flex-start', textAlign: 'left' },
  avatarBox: { width: '180px', height: '220px', flexShrink: 0, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '8px' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInicialesBox: { width: '100%', height: '100%', background: 'var(--accent-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarIniciales: { fontSize: '56px', fontWeight: '700', color: 'var(--accent-blue)' },
  cardInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' },
  infoItem: { display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: '6px' },
  infoLabel: { width: '100px', fontWeight: '700', color: 'var(--text-muted)', fontSize: '15px', textAlign: 'right', marginRight: '20px' },
  infoValue: { color: 'var(--text-primary)', fontSize: '14.5px', fontWeight: '500' },
  cardFooter: { padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: '15px', background: 'var(--bg-tertiary)' },
  btnAceptar: { background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '8px 30px', borderRadius: '5px', fontWeight: '600', cursor: 'pointer' },
  btnWhatsapp: { border: '1px solid var(--accent-green)', color: 'var(--accent-green)', background: 'var(--accent-green-bg)', padding: '8px 30px', borderRadius: '5px', fontWeight: '700', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center' },
}

function InfoItem({ label, value }) {
  return (
    <div style={modalStyles.infoItem}>
      <span style={modalStyles.infoLabel}>{label}:</span>
      <span style={modalStyles.infoValue}>{value}</span>
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
    cargarPerfil()
  }, [id])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setVerFotoModal(false)
        setShowCredencialModal(false)
        setModalEditar(false)
        setShowAsistenciasModal(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

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
      email: alumno.email || '',
      fecha_nacimiento: alumno.fecha_nacimiento || '',
      configuracion_cinta_id: alumno.configuracion_cinta_id || '',
      horario_id: alumno.horario_id || '',
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
    if (!form.nombre_tutor?.trim()) e.nombre_tutor = ['El nombre del tutor es obligatorio.']
    if (!form.telefono_tutor?.trim()) e.telefono_tutor = ['El teléfono del tutor es obligatorio.']
    if (!form.fecha_nacimiento) e.fecha_nacimiento = ['La fecha de nacimiento es obligatoria.']
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = ['Correo inválido.']
    return e
  }

  const guardar = async () => {
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

      formData.append('_method', 'PUT')
      await api.post(`/alumnos/${alumno.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: 'Alumno actualizado correctamente.',
        background: '#13151f',
        color: '#fff',
        timer: 2000,
        showConfirmButton: false,
        customClass: { popup: 'swal-custom-premium' }
      })

      setModalEditar(false)
      cargarPerfil()
    } catch (err) {
      console.error('Detalles del error:', err.response?.data)
      if (err.response?.data?.errors) {
        const errores = err.response.data.errors
        setErrors(errores)
        const primerError = Object.values(errores)[0][0]
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: primerError,
          background: '#13151f',
          color: '#fff',
          customClass: { popup: 'swal-custom-premium' }
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al guardar.',
          background: '#13151f',
          color: '#fff',
          customClass: { popup: 'swal-custom-premium' }
        })
      }
    } finally {
      setGuardando(false)
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
              background: 'var(--accent-blue-bg)',
              color: 'var(--accent-blue)',
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
              <button style={modalStyles.btnCerrarWhite} onClick={() => setShowCredencialModal(false)}>X</button>
            </div>
            <div style={modalStyles.cardBody}>
              <div style={modalStyles.avatarBox}>
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
                  <span style={modalStyles.avatarIniciales}>
                    {obtenerIniciales(alumno.nombre, alumno.apellido_paterno)}
                  </span>
                </div>
              </div>
              <div style={modalStyles.cardInfo}>
                <InfoItem label="ID" value={alumno.id} />
                <InfoItem label="F. Nac." value={alumno.fecha_nacimiento} />
                <InfoItem label="Edad" value={alumno.edad + ' años'} />
                <InfoItem label="Cinta" value={alumno.cinta_config?.nombre_nivel || 'Sin cinta'} />
                <InfoItem label="Tutor" value={limpiarDato(alumno.nombre_tutor)} />
                <InfoItem label="Teléfono" value={limpiarDato(alumno.telefono_tutor)} />
                <InfoItem label="Correo" value={(alumno.email && alumno.email !== 'NULL' && alumno.email !== 'null') ? alumno.email : 'N/A'} />
                <InfoItem label="Status" value={capitalizar(alumno.estatus)} />
              </div>
            </div>
            <div style={modalStyles.cardFooter}>
              <a
                href={'https://wa.me/52' + alumno.telefono_tutor?.replace(/\s+/g, '')}
                target="_blank"
                rel="noreferrer"
                style={modalStyles.btnWhatsapp}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.517 2.011.808 3.146.809 3.181 0 5.767-2.584 5.768-5.764 0-3.18-2.586-5.763-5.768-5.763zm4.52 8.161c-.199.557-1.162 1.058-1.597 1.115-.41.054-.935.086-1.503-.099-.345-.113-.775-.262-1.328-.489-2.315-.953-3.82-3.308-3.936-3.461-.116-.155-.945-1.258-.945-2.399 0-1.141.594-1.701.806-1.933.211-.231.462-.29.616-.29.154 0 .308.001.442.008.14.007.33-.053.516.39.186.444.636 1.547.692 1.659.056.111.093.242.019.39-.074.148-.112.241-.223.37-.111.13-.233.29-.333.389-.111.111-.228.232-.098.455.13.223.577.95 1.24 1.54.853.759 1.567.994 1.79.1.223-.112.455-.228.678-.541.222-.314.185-.537.408-.65s.445-.074.743.074c.297.149 1.874.883 2.196 1.043.322.16.537.241.616.37.079.13.079.752-.12 1.309z" />
                </svg>
                WHATSAPP
              </a>
              <button style={modalStyles.btnAceptar} onClick={() => setShowCredencialModal(false)}>CERRAR</button>
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
        <div style={editModalStyles.overlay} className="mobile-fullscreen-overlay" onClick={() => setModalEditar(false)}>
          <div style={editModalStyles.modal} className="mobile-fullscreen-modal" onClick={e => e.stopPropagation()}>
            <div style={editModalStyles.modalHeader}>
              <h3 style={editModalStyles.modalTitulo}>Editar alumno</h3>
              <button style={editModalStyles.btnCerrar} onClick={() => setModalEditar(false)}>X</button>
            </div>

            <div style={editModalStyles.fotoUploadArea}>
              <div style={editModalStyles.fotoPreviewBox} onClick={() => fileRef.current.click()}>
                {fotoPreview ? (
                  <img src={fotoPreview} alt="preview" style={editModalStyles.fotoPreviewImg} />
                ) : (
                  <div style={editModalStyles.fotoPlaceholder}>
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></svg>
                    <span style={{ fontSize: '25px', color: '#3b82f6', fontWeight: '700' }}>
                      {form.nombre || form.apellido_paterno
                        ? obtenerIniciales(form.nombre, form.apellido_paterno)
                        : '+'
                      }
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                      {form.nombre ? 'Agregar foto' : 'Foto'}
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
                  style={editModalStyles.btnQuitarFoto}
                  onClick={() => { setFotoFile(null); setFotoPreview(null); setEliminarFoto(true) }}
                >
                  Quitar foto
                </button>
              )}
            </div>

            <div style={editModalStyles.grid2} className="mobile-grid-1">
              <Campo label="Nombre(s)" value={form.nombre} error={errors.nombre?.[0]} required onChange={v => { setForm({ ...form, nombre: v }); if (errors.nombre) setErrors(prev => ({ ...prev, nombre: undefined })) }} />
              <Campo label="Apellido paterno" value={form.apellido_paterno} error={errors.apellido_paterno?.[0]} required onChange={v => { setForm({ ...form, apellido_paterno: v }); if (errors.apellido_paterno) setErrors(prev => ({ ...prev, apellido_paterno: undefined })) }} />
              <Campo label="Apellido materno" value={form.apellido_materno} error={errors.apellido_materno?.[0]} required onChange={v => { setForm({ ...form, apellido_materno: v }); if (errors.apellido_materno) setErrors(prev => ({ ...prev, apellido_materno: undefined })) }} />
              <Campo label="Fecha de nacimiento" value={form.fecha_nacimiento} error={errors.fecha_nacimiento?.[0]} required onChange={v => { setForm({ ...form, fecha_nacimiento: v }); if (errors.fecha_nacimiento) setErrors(prev => ({ ...prev, fecha_nacimiento: undefined })) }} type="date" />
              <Campo label="Nombre del tutor" value={form.nombre_tutor} error={errors.nombre_tutor?.[0]} required onChange={v => { setForm({ ...form, nombre_tutor: v }); if (errors.nombre_tutor) setErrors(prev => ({ ...prev, nombre_tutor: undefined })) }} />
              <Campo label="Teléfono del tutor" value={form.telefono_tutor} error={errors.telefono_tutor?.[0]} required onChange={v => { setForm({ ...form, telefono_tutor: v }); if (errors.telefono_tutor) setErrors(prev => ({ ...prev, telefono_tutor: undefined })) }} />
              <Campo label="Correo electrónico" value={form.email} error={errors.email?.[0]} onChange={v => { setForm({ ...form, email: v }); if (errors.email) setErrors(prev => ({ ...prev, email: undefined })) }} type="email" full />

              <div style={editModalStyles.campoGroup}>
                <label style={editModalStyles.label}>Horario Asignado</label>
                <select
                  style={editModalStyles.select}
                  value={form.horario_id || ''}
                  onChange={e => setForm({ ...form, horario_id: e.target.value })}
                >
                  <option value="">Seleccionar horario...</option>
                  {horarios.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nombre} ({formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)})
                    </option>
                  ))}
                </select>
              </div>

              <div style={editModalStyles.campoGroup}>
                <label style={editModalStyles.label}>Cinta</label>
                <select 
                  style={editModalStyles.select} 
                  value={form.configuracion_cinta_id || ''} 
                  onChange={e => setForm({ ...form, configuracion_cinta_id: e.target.value })}
                >
                  <option value="">Seleccionar cinta...</option>
                  {cintas_config?.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre_nivel}</option>
                  ))}
                </select>
              </div>

              <div style={editModalStyles.campoGroup}>
                <label style={editModalStyles.label}>Estatus</label>
                <select 
                  style={editModalStyles.select} 
                  value={form.estatus || 'activo'} 
                  onChange={e => setForm({ ...form, estatus: e.target.value })}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              <div style={editModalStyles.campoGroup}>
                <label style={editModalStyles.label}>Día de pago mensual (1-31)</label>
                <input
                  style={editModalStyles.input}
                  type="number"
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
              <button style={editModalStyles.btnSecondary} onClick={() => setModalEditar(false)} disabled={guardando}>Cancelar</button>
              <button
                style={{ ...editModalStyles.btnPrimary, opacity: guardando ? 0.75 : 1, cursor: guardando ? 'not-allowed' : 'pointer' }}
                onClick={guardar}
                disabled={guardando}
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
