import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  FiUsers,
  FiAlertCircle,
  FiDollarSign,
  FiCheckCircle,
  FiArrowUpRight,
  FiCalendar,
  FiPlus,
  FiChevronRight,
  FiClock
} from 'react-icons/fi'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { getCache, setCache } from '../utils/cacheManager'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (user?.is_superadmin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [datos, setDatos] = useState(() => {
    const cached = getCache('dashboard_stats')
    return cached?.data || {
      alumnos_activos: 0,
      pagos_al_corriente: 0,
      pagos_pendientes: 0,
      ingresos_mes: 0,
      asistencias_hoy: 0,
      eventos_proximos: []
    }
  })

  const [cargando, setCargando] = useState(() => {
    const cached = getCache('dashboard_stats')
    return !cached?.data
  })
  const [error, setError] = useState(null)

  useEffect(() => {
    const obtenerDashboard = async () => {
      try {
        const res = await api.get('/dashboard')
        const data = {
          alumnos_activos: Number(res.data.alumnos_activos) || 0,
          pagos_al_corriente: Number(res.data.pagos_al_corriente) || 0,
          pagos_pendientes: Number(res.data.pagos_pendientes) || 0,
          ingresos_mes: Number(res.data.ingresos_mes) || 0,
          asistencias_hoy: Number(res.data.asistencias_hoy) || 0,
          eventos_proximos: res.data.eventos_proximos || []
        }
        setDatos(data)
        setCache('dashboard_stats', data)
      } catch (err) {
        console.error("Error Dashboard:", err)
        const cached = getCache('dashboard_stats')
        if (!cached?.data) {
          setError('Error al conectar con el servidor')
        }
      } finally {
        setCargando(false)
      }
    }

    obtenerDashboard()
  }, [])

  if (cargando) {
    return (
      <div style={s.loadingContainer}>
        <div style={s.spinner} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '14px' }}>
          Cargando panel de control...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={s.errorContainer}>
        <FiAlertCircle size={36} color="var(--accent-red)" />
        <p style={{ color: 'var(--accent-red)', marginTop: '12px', fontWeight: '600' }}>{error}</p>
        <button
          type="button"
          style={s.btnReintentar}
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    )
  }

  const fechaHeader = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  // Cálculo de cobranza
  const totalEvaluados = (datos.pagos_al_corriente || 0) + (datos.pagos_pendientes || 0)
  const pctCobranza = totalEvaluados > 0
    ? Math.round(((datos.pagos_al_corriente || 0) / totalEvaluados) * 100)
    : 0

  return (
    <div style={s.container}>
      {/* CABECERA */}
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Panel de Control</h2>
          <p style={s.sub}>{fechaHeader.charAt(0).toUpperCase() + fechaHeader.slice(1)}</p>
        </div>
      </div>

      {/* CARDS PRINCIPALES (GRID 2x2 EN MÓVIL, 4 COLS EN ESCRITORIO) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? '12px' : '20px',
        marginBottom: isMobile ? '20px' : '28px'
      }}>
        <MetricCard
          color="var(--accent-blue)"
          badgeBg="var(--accent-blue-bg)"
          icon={<FiUsers size={isMobile ? 18 : 22} />}
          label="Alumnos Activos"
          valor={datos.alumnos_activos}
          subtext="En lista actual"
          onClick={() => navigate('/alumnos')}
          isMobile={isMobile}
        />
        <MetricCard
          color="var(--accent-red)"
          badgeBg="var(--accent-red-bg)"
          icon={<FiAlertCircle size={isMobile ? 18 : 22} />}
          label="Pagos Pendientes"
          valor={datos.pagos_pendientes}
          subtext="Periodo actual"
          onClick={() => navigate('/pagos')}
          isMobile={isMobile}
        />
        <MetricCard
          color="var(--accent-green)"
          badgeBg="var(--accent-green-bg)"
          icon={<FiDollarSign size={isMobile ? 18 : 22} />}
          label="Ingresos del Mes"
          valor={`$${datos.ingresos_mes.toLocaleString('es-MX')}`}
          subtext="Recaudado este mes"
          onClick={() => navigate('/pagos')}
          isMobile={isMobile}
        />
        <MetricCard
          color="var(--accent-purple)"
          badgeBg="rgba(168, 85, 247, 0.12)"
          icon={<FiCheckCircle size={isMobile ? 18 : 22} />}
          label="Asistencias Hoy"
          valor={datos.asistencias_hoy}
          subtext="Presentes hoy"
          onClick={() => navigate('/asistencias')}
          isMobile={isMobile}
        />
      </div>

      {/* WIDGET DE EFICIENCIA DE COBRANZA */}
      {totalEvaluados > 0 && (
        <div style={s.cobranzaCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: pctCobranza >= 80 ? 'var(--accent-green)' : (pctCobranza >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)')
              }} />
              <span style={{ fontSize: isMobile ? '12.5px' : '13.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Progreso de Cobranza del Mes
              </span>
            </div>
            <span style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {pctCobranza}%
            </span>
          </div>

          <div style={s.progressBarBg}>
            <div style={{
              ...s.progressBarFill,
              width: `${pctCobranza}%`,
              background: pctCobranza >= 80
                ? 'linear-gradient(90deg, #10b981, #059669)'
                : (pctCobranza >= 50 ? 'linear-gradient(90deg, #3b82f6, #6366f1)' : 'linear-gradient(90deg, #f59e0b, #ef4444)')
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <FiCheckCircle size={13} color="var(--accent-green)" />
              {datos.pagos_al_corriente} al corriente
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <FiClock size={13} color="var(--accent-yellow)" />
              {datos.pagos_pendientes} pendientes
            </span>
          </div>
        </div>
      )}

      {/* CALENDARIO DE EVENTOS */}
      <div style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiCalendar size={18} color="var(--accent-blue)" />
            <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Próximos Eventos y Exámenes
            </h2>
          </div>
          <button
            type="button"
            style={s.btnVerTodos}
            onClick={() => navigate('/eventos')}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent-blue)'
              e.currentTarget.style.color = 'var(--accent-blue)'
              e.currentTarget.style.background = 'var(--bg-tertiary)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 3px 10px rgba(59, 130, 246, 0.15)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.background = 'var(--bg-secondary)'
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <span>Ver todos</span>
            <FiArrowUpRight size={14} />
          </button>
        </div>

        {datos.eventos_proximos.length === 0 ? (
          <div style={s.vacioModerno}>
            <div style={s.vacioIconBox}>
              <FiCalendar size={28} color="var(--text-muted)" />
            </div>
            <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Sin eventos programados
            </p>
            <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              No hay exámenes ni torneos próximos registrados en el calendario.
            </p>
            <button
              type="button"
              style={s.btnCrearEvento}
              onClick={() => navigate('/eventos')}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.35)'
                e.currentTarget.style.filter = 'brightness(1.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'var(--shadow-glow-blue)'
                e.currentTarget.style.filter = 'none'
              }}
            >
              <FiPlus size={15} />
              <span>Programar Evento</span>
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '12px'
          }}>
            {datos.eventos_proximos.map(e => {
              const dias = diasRestantes(e.fecha)
              const badgeStyle = colorTipo(e.tipo)
              return (
                <div
                  key={e.id}
                  style={s.eventoCard}
                  onClick={() => navigate(e.tipo?.toLowerCase() === 'examen' ? `/examenes/${e.id}` : `/eventos/${e.id}`)}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent-blue)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ ...s.badgeModerno, background: badgeStyle.background, color: badgeStyle.color }}>
                      {e.tipo || 'Evento'}
                    </span>
                    <span style={{
                      ...s.diasBadge,
                      background: dias === 0 ? 'rgba(239, 68, 68, 0.15)' : (dias <= 7 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.12)'),
                      color: dias === 0 ? '#ef4444' : (dias <= 7 ? '#f59e0b' : '#22c55e'),
                    }}>
                      <FiClock size={11} />
                      {dias === 0 ? '¡Hoy es el evento!' : (dias === 1 ? 'Mañana' : `Faltan ${dias} días`)}
                    </span>
                  </div>

                  <div style={s.eventoTitulo}>{e.nombre}</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <FiCalendar size={13} />
                      {formatearFecha(e.fecha)}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: '600' }}>
                      Ver detalles
                      <FiChevronRight size={14} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Tarjeta de métrica con micro-interacción y redirección
function MetricCard({ color, badgeBg, icon, label, valor, subtext, onClick, isMobile }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      style={{
        ...s.cardBase,
        borderColor: hover ? color : 'var(--border)',
        transform: hover ? 'translateY(-3px)' : 'none',
        boxShadow: hover ? `0 8px 24px ${color}26` : 'var(--shadow-sm)',
        padding: isMobile ? '16px 14px' : '22px 20px',
      }}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Encabezado de la tarjeta: Badge con icono SVG y flecha de enlace */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '10px' : '14px' }}>
        <div style={{
          ...s.iconBadge,
          background: badgeBg,
          color: color,
          width: isMobile ? '36px' : '44px',
          height: isMobile ? '36px' : '44px',
        }}>
          {icon}
        </div>

        <div style={{
          ...s.arrowIconBox,
          color: hover ? color : 'var(--text-muted)',
          transform: hover ? 'translate(2px, -2px)' : 'none',
        }}>
          <FiArrowUpRight size={isMobile ? 15 : 18} />
        </div>
      </div>

      {/* Valor principal */}
      <div style={{
        ...s.cardValor,
        color: color,
        fontSize: isMobile ? '26px' : '34px',
      }}>
        {valor}
      </div>

      {/* Etiqueta y subtítulo */}
      <div style={{
        ...s.cardLabel,
        fontSize: isMobile ? '12.5px' : '14px',
      }}>
        {label}
      </div>

      <div style={{
        ...s.cardSubtext,
        fontSize: isMobile ? '10px' : '11px',
      }}>
        {subtext}
      </div>
    </div>
  )
}

function diasRestantes(fechaStr) {
  if (!fechaStr) return 0
  const hoy = new Date()
  const evt = new Date(fechaStr + 'T00:00:00')
  hoy.setHours(0, 0, 0, 0)
  evt.setHours(0, 0, 0, 0)
  const diff = Math.round((evt - hoy) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function formatearFecha(f) {
  if (!f) return ''
  return new Date(f + 'T00:00:00').toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function colorTipo(tipo) {
  const t = tipo?.toLowerCase() || ''
  if (t.includes('examen')) return { background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }
  if (t.includes('torneo')) return { background: 'var(--accent-yellow-bg)', color: 'var(--accent-yellow)' }
  if (t.includes('seminario')) return { background: 'rgba(168, 85, 247, 0.12)', color: 'var(--accent-purple)' }
  return { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
}

const s = {
  container: { scrollbarGutter: 'stable', paddingBottom: '40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  titulo: { fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' },
  sub: { fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' },

  // Acciones rápidas en desktop
  quickBtnPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '9px 16px',
    background: 'var(--accent-blue)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
    transition: 'all 0.15s ease',
  },
  quickBtnSecondary: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '9px 14px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },

  // Acciones rápidas en móvil
  quickActionsMobile: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '12px',
    marginBottom: '16px',
    scrollbarWidth: 'none',
  },
  quickPillPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '7px 14px',
    background: 'var(--accent-blue)',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.35)',
  },
  quickPillSecondary: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '7px 14px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    flexShrink: 0,
  },

  // Tarjeta de métrica base
  cardBase: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    outline: 'none',
  },
  iconBadge: {
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  arrowIconBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  cardValor: {
    fontWeight: '900',
    lineHeight: '1.15',
    letterSpacing: '-0.5px',
  },
  cardLabel: {
    color: 'var(--text-primary)',
    fontWeight: '700',
    marginTop: '6px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardSubtext: {
    color: 'var(--text-muted)',
    marginTop: '3px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    fontWeight: '600',
  },

  // Widget de cobranza
  cobranzaCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '16px 20px',
    boxShadow: 'var(--shadow-sm)',
  },
  progressBarBg: {
    height: '7px',
    background: 'var(--bg-tertiary)',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '10px',
    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Eventos y exámenes
  btnVerTodos: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
  vacioModerno: {
    background: 'var(--bg-secondary)',
    border: '1px dashed var(--border)',
    borderRadius: '16px',
    padding: '36px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacioIconBox: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  btnCrearEvento: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: 'var(--accent-blue)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-glow-blue)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
  },
  eventoCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '16px 18px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  badgeModerno: {
    padding: '4px 9px',
    borderRadius: '6px',
    fontSize: '10.5px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  diasBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
  },
  eventoTitulo: {
    fontSize: '14.5px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: '1.3',
  },

  // Estados de carga y error
  loadingContainer: {
    minHeight: 'calc(100vh - 120px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid var(--border)',
    borderTopColor: 'var(--accent-blue)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorContainer: {
    minHeight: 'calc(100vh - 120px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center',
  },
  btnReintentar: {
    marginTop: '16px',
    padding: '8px 18px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontWeight: '600',
    cursor: 'pointer',
  }
}