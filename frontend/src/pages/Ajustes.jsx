import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useNavigate } from 'react-router-dom'

export default function Ajustes() {
  return (
    <div style={s.container}>
      <header style={s.headerMain}>
        <h1 style={s.titleMain}>Ajustes de la Escuela</h1>
        <p style={s.subtitleMain}>Personaliza y gestiona las herramientas de tu academia.</p>
      </header>

      <div style={s.gridCards}>
        <CardResumenCintas />

        {/* CARD: USUARIOS */}
        <div style={{ ...s.card, opacity: 0.6 }}>
          <div style={s.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={s.cardIcon}>👤</span>
              <h3 style={s.cardTitle}>Usuarios y Roles</h3>
            </div>
          </div>
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#475569', fontSize: '14px' }}>
            Próximamente: Gestiona el acceso de tus profesores y administrativos.
          </div>
        </div>
      </div>
    </div>
  )
}

function CardResumenCintas() {
  const navigate = useNavigate()
  const [cintas, setCintas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/configuraciones-cintas')
      .then(res => setCintas(res.data))
      .finally(() => setLoading(false))
  }, [])

  const preview = cintas.slice(0, 5)

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ ...s.cardIcon, color: '#3b82f6', background: 'rgba(59,130,246,0.1)' }}>🥋</span>
          <h3 style={s.cardTitle}>Configuración de cintas</h3>
        </div>
        <button style={s.btnLink} onClick={() => navigate('/ajustes/cintas')}>Editar →</button>
      </div>

      <div style={s.cardBody}>
        {loading ? <div style={s.cardEmpty}>Cargando...</div> :
          cintas.length === 0 ? <div style={s.cardEmpty}>No hay cintas configuradas.</div> :
          preview.map(c => (
            <div key={c.id} style={s.resumenRow}>
              <div style={{ ...s.dot, background: c.color_hex }} />
              <span style={s.resumenNombre}>{c.nombre_nivel}</span>
              <span style={s.resumenMeta}>{c.color_hex.toUpperCase()} · orden {c.orden}</span>
            </div>
          ))
        }
        {cintas.length > 5 && (
          <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px', textAlign: 'center' }}>
            + {cintas.length - 5} grados más...
          </div>
        )}
      </div>

      <div style={s.cardFooter}>
        <span style={s.cardStats}>{cintas.length} cintas configuradas</span>
        <button style={s.btnAddQuick} onClick={() => navigate('/ajustes/cintas')}>+ Gestionar grado</button>
      </div>
    </div>
  )
}

const s = {
  container: { padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' },
  headerMain: { marginBottom: '40px' },
  titleMain: { fontSize: '32px', fontWeight: '800', color: '#fff', letterSpacing: '-1px' },
  subtitleMain: { color: '#475569', fontSize: '16px', marginTop: '6px' },
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' },

  card: { background: '#0b0c14', borderRadius: '24px', border: '1px solid #1e2130', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  cardHeader: { padding: '24px', borderBottom: '1px solid #1e2130', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardIcon: { fontSize: '18px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '10px' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#e2e8f0', margin: 0 },
  btnLink: { background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: '700', cursor: 'pointer', fontSize: '13px' },
  cardBody: { padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' },
  resumenRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  dot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 },
  resumenNombre: { fontSize: '14px', fontWeight: '600', color: '#cbd5e1', flex: 1 },
  resumenMeta: { fontSize: '11px', color: '#334155', fontFamily: 'monospace' },
  cardEmpty: { padding: '20px', textAlign: 'center', color: '#334155' },
  cardFooter: { padding: '20px 24px', borderTop: '1px solid #1e2130', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardStats: { fontSize: '12px', color: '#475569' },
  btnAddQuick: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' },
}
