import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [datos, setDatos] = useState({
    alumnos_activos: 0,
    pagos_pendientes: 0,
    pagos_vencidos: 0,
    asistencias_hoy: 0,
    eventos_proximos: []
  })

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const obtenerDashboard = async () => {
      try {
        const res = await api.get('/dashboard')
        // Sincronizamos los datos asegurando que sean números válidos
        setDatos({
          alumnos_activos: Number(res.data.alumnos_activos) || 0,
          pagos_pendientes: Number(res.data.pagos_pendientes) || 0,
          pagos_vencidos: Number(res.data.pagos_vencidos) || 0,
          asistencias_hoy: Number(res.data.asistencias_hoy) || 0,
          eventos_proximos: res.data.eventos_proximos || []
        })
      } catch (err) {
        console.error("Error Dashboard:", err)
        setError('Error al conectar con el servidor de Tigres Do')
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
          color="#3b82f6" 
          icon="👥" 
          label="Alumnos Activos" 
          valor={datos.alumnos_activos} 
          subtext="En lista de asistencia"
        />
        <Card 
          color="#f59e0b" 
          icon="⏳" 
          label="Pagos Pendientes" 
          valor={datos.pagos_pendientes} 
          subtext="Mes en curso"
        />
        <Card 
          color="#ef4444" 
          icon="⚠️" 
          label="Pagos Vencidos" 
          valor={datos.pagos_vencidos} 
          subtext="Requieren atención"
        />
        <Card 
          color="#10b981" 
          icon="✅" 
          label="Asistencias Hoy" 
          valor={datos.asistencias_hoy} 
          subtext="Registradas hoy"
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
  if (t === 'examen') return { background: '#1e2d4a', color: '#60a5fa' }
  if (t === 'torneo') return { background: '#2d1f00', color: '#fbbf24' }
  return { background: '#1e2130', color: '#94a3b8' }
}

const s = {
  loading: { color: '#94a3b8', padding: '50px', textAlign: 'center', fontSize: '18px' },
  error: { color: '#f87171', padding: '50px', textAlign: 'center' },
  headerRow: { marginBottom: '30px' },
  titulo: { fontSize: '26px', fontWeight: '800', color: '#f8fafc', margin: 0 },
  sub: { fontSize: '14px', color: '#64748b', marginTop: '4px' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' },
  card: { background: '#13151f', border: '1px solid #1e2130', borderRadius: '12px', padding: '24px' },
  cardIcon: { fontSize: '20px', marginBottom: '10px' },
  cardValor: { fontSize: '42px', fontWeight: '900', lineHeight: '1' },
  cardLabel: { fontSize: '14px', color: '#f1f5f9', fontWeight: '600', marginTop: '8px' },
  cardSubtext: { fontSize: '11px', color: '#475569', marginTop: '4px', textTransform: 'uppercase' },
  subtitulo: { fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '15px' },
  vacio: { background: '#13151f', padding: '40px', borderRadius: '12px', textAlign: 'center', color: '#475569', border: '1px dashed #334155' },
  tabla: { background: '#13151f', border: '1px solid #1e2130', borderRadius: '12px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '14px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #1e2130', letterSpacing: '1px' },
  tr: { borderBottom: '1px solid #1e2130' },
  td: { padding: '16px', fontSize: '14px', color: '#cbd5e1' },
  eventoNombre: { fontWeight: '700', color: '#f8fafc' },
  badge: { padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  dias: { fontSize: '13px', fontWeight: '600' }
}