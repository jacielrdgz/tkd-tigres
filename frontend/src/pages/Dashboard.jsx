import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { getCache, setCache } from '../utils/cacheManager'

export default function Dashboard() {
  const { user } = useAuth()

  if (user?.is_superadmin) {
    return <Navigate to="/admin/dashboard" replace />
  }
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

  if (cargando) return <div style={s.loading}>Cargando estadísticas de la escuela...</div>
  if (error)    return <div style={s.error}>{error}</div>

  const fechaHeader = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div style={{ padding: '20px' }}>
      <div style={s.headerRow}>
        <div>
          <h2 style={s.titulo}>Panel de Control</h2>
          <p style={s.sub}>{fechaHeader.charAt(0).toUpperCase() + fechaHeader.slice(1)}</p>
        </div>
      </div>

      {/* CARDS PRINCIPALES */}
      <div style={s.cards}>
        <Card 
          color="var(--accent-blue)" 
          icon="👥" 
          label="Alumnos Activos" 
          valor={datos.alumnos_activos} 
          subtext="En lista actual"
        />
        <Card 
          color="var(--accent-red)" 
          icon="⏳" 
          label="Pagos Pendientes" 
          valor={datos.pagos_pendientes} 
          subtext="Periodo actual"
        />
        <Card 
          color="var(--accent-green)" 
          icon="💰" 
          label="Ingresos del Mes" 
          valor={`$${datos.ingresos_mes.toLocaleString()}`} 
          subtext="Recaudado hoy"
        />
        <Card 
          color="var(--accent-purple)" 
          icon="✅" 
          label="Asistencias Hoy" 
          valor={datos.asistencias_hoy} 
          subtext="Presentes hoy"
        />
      </div>

      <h3 style={s.subtitulo}>Calendario de Eventos</h3>

      {datos.eventos_proximos.length === 0 ? (
        <div style={s.vacio}>
          <p>No hay exámenes o torneos próximos registrados.</p>
        </div>
      ) : (
        <div style={s.tabla}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Evento', 'Tipo', 'Fecha', 'Días restantes'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.eventos_proximos.map(e => {
                const dias = diasRestantes(e.fecha)
                return (
                  <tr key={e.id} style={s.tr}>
                    <td style={s.td}>
                      <span style={s.eventoNombre}>{e.nombre}</span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, ...colorTipo(e.tipo) }}>
                        {e.tipo}
                      </span>
                    </td>
                    <td style={s.td}>{formatearFecha(e.fecha)}</td>
                    <td style={s.td}>
                      <span style={{
                        ...s.dias,
                        color: dias === 0 ? '#f87171' : dias <= 7 ? '#f87171' : '#4ade80'
                      }}>
                        {dias === 0 ? '¡Hoy es el evento!' : `Faltan ${dias} días`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Componentes Reutilizables internos
function Card({ color, icon, label, valor, subtext }) {
  return (
    <div style={{ ...s.card, borderTop: `4px solid ${color}` }}>
      <div style={s.cardIcon}>{icon}</div>
      <div style={{ ...s.cardValor, color }}>{valor}</div>
      <div style={s.cardLabel}>{label}</div>
      <div style={s.cardSubtext}>{subtext}</div>
    </div>
  )
}

function diasRestantes(fechaStr) {
  const hoy = new Date()
  const evt = new Date(fechaStr + 'T00:00:00')
  hoy.setHours(0, 0, 0, 0)
  evt.setHours(0, 0, 0, 0)
  const diff = Math.round((evt - hoy) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function formatearFecha(f) {
  return new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function colorTipo(tipo) {
  const t = tipo?.toLowerCase()
  if (t === 'examen') return { background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }
  if (t === 'torneo') return { background: 'var(--accent-yellow-bg)', color: 'var(--accent-yellow)' }
  return { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
}

const s = {
  loading: { color: 'var(--text-muted)', padding: '50px', textAlign: 'center', fontSize: '18px' },
  error: { color: 'var(--accent-red)', padding: '50px', textAlign: 'center' },
  headerRow: { marginBottom: '30px' },
  titulo: { fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 },
  sub: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' },
  card: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' },
  cardIcon: { fontSize: '20px', marginBottom: '10px' },
  cardValor: { fontSize: '42px', fontWeight: '900', lineHeight: '1' },
  cardLabel: { fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600', marginTop: '8px' },
  cardSubtext: { fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', textTransform: 'uppercase' },
  subtitulo: { fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '15px' },
  vacio: { background: 'var(--bg-secondary)', padding: '40px', borderRadius: '12px', textAlign: 'center', color: 'var(--text-dim)', border: '1px dashed var(--border-hover)' },
  tabla: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '14px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', letterSpacing: '1px' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' },
  eventoNombre: { fontWeight: '700', color: 'var(--text-primary)' },
  badge: { padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  dias: { fontSize: '13px', fontWeight: '600' }
}