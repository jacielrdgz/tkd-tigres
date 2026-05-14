import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'

export default function AjustesEscuela() {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { id: 'general', label: 'Datos del Dojo', icon: '🏫', path: '/ajustes/configuracion/general' },
    { id: 'instructores', label: 'Instructores', icon: '🥋', path: '/ajustes/configuracion/instructores' },
    { id: 'horarios', label: 'Horarios', icon: '⏰', path: '/ajustes/configuracion/horarios' },
    { id: 'cintas', label: 'Grados y Cintas', icon: '🏷️', path: '/ajustes/configuracion/cintas' },
  ]

  const activeTab = tabs.find(t => location.pathname === t.path)?.id || 'general'

  return (
    <div style={s.container}>
      <button style={s.btnBack} onClick={() => navigate('/ajustes')}>← Volver a ajustes</button>

      <header style={s.header}>
        <h1 style={s.title}>Configurar mi escuela</h1>
        <p style={s.subtitle}>Personaliza la identidad y operatividad de tu academia.</p>
      </header>

      <div style={s.tabsContainer}>
        {tabs.map(tab => (
          <Link
            key={tab.id}
            to={tab.path}
            style={{
              ...s.tabBtn,
              textDecoration: 'none',
              ...(activeTab === tab.id ? s.tabBtnActive : {})
            }}
          >
            <span style={s.tabIcon}>{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </div>

      <div style={s.contentArea}>
        <Outlet />
      </div>
    </div>
  )
}

const s = {
  container: { padding: '40px 24px', maxWidth: '1100px', margin: '0 auto' },
  btnBack: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', padding: '8px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', marginBottom: '24px' },
  header: { marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 },
  subtitle: { color: 'var(--text-secondary)', fontSize: '15px', marginTop: '4px' },
  tabsContainer: { display: 'flex', gap: '10px', borderBottom: '1px solid var(--border)', marginBottom: '30px', paddingBottom: '2px', overflowX: 'auto' },
  tabBtn: { 
    padding: '12px 24px', 
    background: 'none', 
    border: 'none', 
    borderBottom: '3px solid transparent', 
    color: 'var(--text-muted)', 
    fontSize: '14px', 
    fontWeight: '700', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px',
    transition: '0.2s',
    whiteSpace: 'nowrap'
  },
  tabBtnActive: { color: 'var(--accent-blue)', borderBottomColor: 'var(--accent-blue)' },
  tabIcon: { fontSize: '18px' },
  contentArea: { animation: 'fadeIn 0.3s ease-in-out' }
}
