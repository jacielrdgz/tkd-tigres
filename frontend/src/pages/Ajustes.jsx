import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Ajustes() {
  const { user } = useAuth();

  return (
    <div style={s.container}>
      <header style={s.headerMain}>
        <h1 style={s.titleMain}>Ajustes de la Escuela</h1>
        <p style={s.subtitleMain}>Personaliza y gestiona las herramientas de tu academia.</p>
      </header>

      <div style={s.gridCards}>
        <CardAppearance />
        {(user?.role === 'owner' || user?.role === 'secretario') && <CardConfigurarEscuela />}
        {user?.role === 'owner' && <CardUsuarios />}
      </div>
    </div>
  )
}

function CardAppearance() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ ...s.cardIcon, color: 'var(--accent-purple)', background: 'var(--accent-purple-bg)' }}>✨</span>
          <h3 style={s.cardTitle}>Apariencia</h3>
        </div>
      </div>

      <div style={s.cardBody}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Elige el tema que mejor se adapte a tu vista.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => theme !== 'light' && toggleTheme()}
            style={{
              ...s.themeBtn,
              borderColor: theme === 'light' ? 'var(--accent-blue)' : 'var(--border)',
              background: theme === 'light' ? 'var(--accent-blue-bg)' : 'var(--bg-primary)',
              color: theme === 'light' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            }}
          >
            ☀️ Modo Claro
          </button>
          <button
            onClick={() => theme !== 'dark' && toggleTheme()}
            style={{
              ...s.themeBtn,
              borderColor: theme === 'dark' ? 'var(--accent-blue)' : 'var(--border)',
              background: theme === 'dark' ? 'var(--accent-blue-bg)' : 'var(--bg-primary)',
              color: theme === 'dark' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            }}
          >
            🌙 Modo Oscuro
          </button>
        </div>
      </div>

      <div style={s.cardFooter}>
        <span style={s.cardStats}>Tema actual: {theme === 'light' ? 'Claro' : 'Oscuro'}</span>
      </div>
    </div>
  )
}

function CardConfigurarEscuela() {
  const [escuela, setEscuela] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/configuracion-escuela')
      .then(res => setEscuela(res.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ ...s.cardIcon, color: 'var(--accent-blue)', background: 'var(--accent-blue-bg)' }}>🏫</span>
          <h3 style={s.cardTitle}>Configurar mi escuela</h3>
        </div>
        <Link style={s.btnLink} to="/ajustes/configuracion">Gestionar →</Link>
      </div>

      <div style={s.cardBody}>
        {loading ? <div style={s.cardEmpty}>Cargando...</div> : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
              {escuela?.logo ? (
                <img src={`${import.meta.env.VITE_API_URL}/storage/${escuela.logo}`} alt="Logo" style={{ width: '50px', height: '50px', borderRadius: '12px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🥋</div>
              )}
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>{escuela?.nombre || 'Mi Escuela'}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{escuela?.disciplina || 'Taekwondo'}</div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Personaliza los datos de tu dojo, gestiona tus instructores, configura tus horarios y define tus grados de cintas.
            </p>
          </>
        )}
      </div>

      <div style={s.cardFooter}>
        <span style={s.cardStats}>Identidad y Operatividad</span>
        <Link style={s.btnAddQuick} to="/ajustes/configuracion">Personalizar</Link>
      </div>
    </div>
  )
}

function CardUsuarios() {
  const { user } = useAuth();

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ ...s.cardIcon, color: 'var(--accent-purple)', background: 'var(--accent-purple-bg)' }}>👥</span>
          <h3 style={s.cardTitle}>Usuarios y Roles</h3>
        </div>
        <Link style={s.btnLink} to="/ajustes/usuarios">Gestionar →</Link>
      </div>

      <div style={s.cardBody}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Controla quién puede acceder al sistema y asigna permisos específicos para instructores, administradores y secretarias.
        </p>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }}></div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tu rol actual: <strong>{user?.role?.toUpperCase()}</strong></span>
        </div>
      </div>

      <div style={s.cardFooter}>
        <span style={s.cardStats}>Seguridad y Accesos</span>
        <Link style={s.btnAddQuick} to="/ajustes/usuarios">Ver Equipo</Link>
      </div>
    </div>
  )
}

const s = {
  container: { padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' },
  headerMain: { marginBottom: '40px' },
  titleMain: { fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-1px' },
  subtitleMain: { color: 'var(--text-secondary)', fontSize: '16px', marginTop: '6px' },
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' },

  card: { background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' },
  cardHeader: { padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardIcon: { fontSize: '18px', background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '10px' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 },
  btnLink: { background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontWeight: '700', cursor: 'pointer', fontSize: '13px' },
  cardBody: { padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' },
  resumenRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  dot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 },
  resumenNombre: { fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', flex: 1 },
  resumenMeta: { fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' },
  cardEmpty: { padding: '20px', textAlign: 'center', color: 'var(--text-muted)' },
  cardFooter: { padding: '20px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardStats: { fontSize: '12px', color: 'var(--text-muted)' },
  btnAddQuick: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 18px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' },

  themeBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  }
}
