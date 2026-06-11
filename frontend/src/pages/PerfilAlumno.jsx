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

export default function PerfilAlumno() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarPerfil()
  }, [id])

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
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
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

  const { alumno, stats, pago_pendiente, historial_pagos, historial_examenes, historial_eventos, racha_asistencia, ultima_falta, ultimas_30_clases, cintas_config } = data

  // Calcular porcentaje de progreso en las cintas
  const cintaActualOrden = alumno.cinta_config?.orden ?? 0
  const totalCintas = cintas_config.length
  const indexActual = cintas_config.findIndex(c => c.id === alumno.configuracion_cinta_id)
  const pctProgreso = totalCintas > 1 ? (Math.max(0, indexActual) / (totalCintas - 1)) * 100 : 0

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
            className="btn" 
            style={{ 
              background: 'var(--bg-secondary)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--border)',
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            onClick={() => navigate(`/alumnos?edit=${alumno.id}`)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Editar perfil
          </button>
          <button 
            className="btn" 
            style={{ 
              background: 'var(--accent-blue)', 
              color: '#fff', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/pagos')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Registrar pago
          </button>
        </div>
      </div>

      {/* 2. Header del perfil */}
      <div className="perfil-header-card">
        <div className="perfil-header-accent-line" />
        <div className="perfil-header-flex">
          <div className="perfil-avatar-container">
            {tieneFoto(alumno.foto) ? (
              <img 
                src={alumno.foto_url} 
                alt={alumno.nombre} 
                className="perfil-avatar-img"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
              />
            ) : null}
            <div style={{ display: tieneFoto(alumno.foto) ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              {obtenerIniciales(alumno.nombre, alumno.apellido_paterno)}
            </div>
          </div>
          <div className="perfil-header-info">
            <div className="perfil-header-title-flex">
              <h2 className="perfil-nombre">
                {alumno.apellido_paterno} {alumno.apellido_materno ? alumno.apellido_materno + ' ' : ''}, {alumno.nombre}
              </h2>
              <span style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
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
                fontSize: '11px',
                fontWeight: '700',
                background: alumno.cinta_config?.color_hex || 'var(--bg-tertiary)',
                color: alumno.cinta_config?.color_texto || 'var(--text-primary)',
                boxShadow: alumno.cinta_config?.color_hex ? `0 0 10px ${alumno.cinta_config.color_hex}40` : 'none'
              }}>
                {alumno.cinta_config?.nombre_nivel || 'Sin cinta'}
              </span>
            </div>
            <div className="perfil-meta-grid">
              <div className="perfil-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>Registrado: {formatFechaNatural(alumno.created_at?.split('T')[0])}</span>
              </div>
              <div className="perfil-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>Horario: {alumno.horario_config?.nombre || '-'}</span>
              </div>
              <div className="perfil-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>Tutor: {limpiarDato(alumno.nombre_tutor)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Alerta de pago pendiente */}
      {pago_pendiente && (
        <div className="perfil-alerta-pago">
          <div className="perfil-alerta-info">
            <span className="perfil-alerta-icon">⚠️</span>
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
            💰
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
            📊
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
            🎓
          </div>
          <div className="perfil-stat-info">
            <div className="perfil-stat-label">Exámenes</div>
            <div className="perfil-stat-val">{stats.total_examenes}</div>
            <div className="perfil-stat-sub">{stats.examenes_aprobados} aprobados</div>
          </div>
        </div>

        <div className="perfil-stat-card">
          <div className="perfil-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-yellow)' }}>
            🏆
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
        <div className="perfil-cintas-timeline-container">
          <div className="perfil-cintas-timeline">
            <div className="perfil-cintas-linea-detras" />
            <div className="perfil-cintas-linea-progreso" style={{ width: `${pctProgreso}%` }} />
            {cintas_config.map((cinta, idx) => {
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
                      background: cinta.color_hex || 'var(--bg-tertiary)',
                      color: cinta.color_texto || 'var(--text-primary)'
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
          <div className="perfil-racha-flama">🔥</div>
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
              <span className="perfil-info-val">{alumno.horario_config?.nombre || '-'}</span>
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
                    <div className="perfil-list-icon" style={{ background: 'rgba(167, 139, 250, 0.1)' }}>🎓</div>
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
                    <div className="perfil-list-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>💰</div>
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
                    <div className="perfil-list-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>🏆</div>
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
    </div>
  )
}
