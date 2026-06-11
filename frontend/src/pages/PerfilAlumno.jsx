import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../api/axios'
import './PerfilAlumno.css'
import Swal from 'sweetalert2'

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

export default function PerfilAlumno() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [verFotoModal, setVerFotoModal] = useState(false)
  const [showCredencialModal, setShowCredencialModal] = useState(false)

  useEffect(() => {
    cargarPerfil()
  }, [id])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setVerFotoModal(false)
        setShowCredencialModal(false)
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
    } catch (err) {
      console.error(err)
      setError('No se pudo cargar la información del alumno. Por favor, intente de nuevo.')
    } finally {
      setLoading(false)
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
            onClick={() => navigate(`/alumnos?edit=${alumno.id}`)}
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
            <div className="perfil-racha-label">Racha de asistencia consecutiva</div>
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
        <div className="perfil-lightbox-overlay" onClick={() => setShowCredencialModal(false)}>
          <div className="perfil-cred-card" onClick={e => e.stopPropagation()}>
            <div className="perfil-cred-header">
              <h4 className="perfil-cred-title">
                {alumno.nombre} {alumno.apellido_paterno} {alumno.apellido_materno || ''}
              </h4>
              <button 
                className="perfil-cred-close" 
                onClick={() => setShowCredencialModal(false)}
              >×</button>
            </div>
            <div className="perfil-cred-body">
              <div className="perfil-cred-photo-box">
                {tieneFoto(alumno.foto) ? (
                  <img src={alumno.foto_url} className="perfil-cred-photo" alt="Foto" />
                ) : null}
                <div style={{
                  display: tieneFoto(alumno.foto) ? 'none' : 'flex',
                  width: '100%',
                  height: '100%',
                  background: 'var(--accent-blue-bg)',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '56px', fontWeight: '700', color: 'var(--accent-blue)' }}>
                    {obtenerIniciales(alumno.nombre, alumno.apellido_paterno)}
                  </span>
                </div>
              </div>
              <div className="perfil-cred-info">
                <div className="perfil-cred-info-item">
                  <span className="perfil-cred-info-label">ID:</span>
                  <span className="perfil-cred-info-value">{alumno.id}</span>
                </div>
                <div className="perfil-cred-info-item">
                  <span className="perfil-cred-info-label">F. Nac.:</span>
                  <span className="perfil-cred-info-value">{alumno.fecha_nacimiento}</span>
                </div>
                <div className="perfil-cred-info-item">
                  <span className="perfil-cred-info-label">Edad:</span>
                  <span className="perfil-cred-info-value">{alumno.edad} años</span>
                </div>
                <div className="perfil-cred-info-item">
                  <span className="perfil-cred-info-label">Cinta:</span>
                  <span className="perfil-cred-info-value">{alumno.cinta_config?.nombre_nivel || 'Sin cinta'}</span>
                </div>
                <div className="perfil-cred-info-item">
                  <span className="perfil-cred-info-label">Tutor:</span>
                  <span className="perfil-cred-info-value">{limpiarDato(alumno.nombre_tutor)}</span>
                </div>
                <div className="perfil-cred-info-item">
                  <span className="perfil-cred-info-label">Teléfono:</span>
                  <span className="perfil-cred-info-value">{limpiarDato(alumno.telefono_tutor)}</span>
                </div>
                <div className="perfil-cred-info-item">
                  <span className="perfil-cred-info-label">Correo:</span>
                  <span className="perfil-cred-info-value">
                    {(alumno.email && alumno.email !== 'NULL' && alumno.email !== 'null') ? alumno.email : 'N/A'}
                  </span>
                </div>
                <div className="perfil-cred-info-item">
                  <span className="perfil-cred-info-label">Status:</span>
                  <span className="perfil-cred-info-value">{capitalizar(alumno.estatus)}</span>
                </div>
              </div>
            </div>
            <div className="perfil-cred-footer">
              <a
                href={'https://wa.me/52' + alumno.telefono_tutor?.replace(/\s+/g, '')}
                target="_blank"
                rel="noreferrer"
                className="perfil-cred-btn-whatsapp"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.517 2.011.808 3.146.809 3.181 0 5.767-2.584 5.768-5.764 0-3.18-2.586-5.763-5.768-5.763zm4.52 8.161c-.199.557-1.162 1.058-1.597 1.115-.41.054-.935.086-1.503-.099-.345-.113-.775-.262-1.328-.489-2.315-.953-3.82-3.308-3.936-3.461-.116-.155-.945-1.258-.945-2.399 0-1.141.594-1.701.806-1.933.211-.231.462-.29.616-.29.154 0 .308.001.442.008.14.007.33-.053.516.39.186.444.636 1.547.692 1.659.056.111.093.242.019.39-.074.148-.112.241-.223.37-.111.13-.233.29-.333.389-.111.111-.228.232-.098.455.13.223.577.95 1.24 1.54.853.759 1.567.994 1.79.1.223-.112.455-.228.678-.541.222-.314.185-.537.408-.65s.445-.074.743.074c.297.149 1.874.883 2.196 1.043.322.16.537.241.616.37.079.13.079.752-.12 1.309z" />
                </svg>
                WHATSAPP
              </a>
              <button className="perfil-cred-btn-cerrar" onClick={() => setShowCredencialModal(false)}>CERRAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
