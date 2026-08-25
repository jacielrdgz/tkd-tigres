import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { FiShield, FiUsers, FiClock, FiAward } from 'react-icons/fi'

export default function AjustesEscuela() {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { id: 'general', label: 'Datos del Dojang', icon: <FiShield size={18} />, path: '/ajustes/configuracion/general' },
    { id: 'instructores', label: 'Instructores', icon: <FiUsers size={18} />, path: '/ajustes/configuracion/instructores' },
    { id: 'horarios', label: 'Horarios', icon: <FiClock size={18} />, path: '/ajustes/configuracion/horarios' },
    { id: 'cintas', label: 'Grados y Cintas', icon: <FiAward size={18} />, path: '/ajustes/configuracion/cintas' },
  ]

  const activeTab = tabs.find(t => location.pathname === t.path)?.id || 'general'

  return (
    <div style={s.container}>
      <button
        style={s.btnBack}
        onClick={() => navigate('/ajustes')}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--bg-tertiary)'
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.borderColor = 'var(--accent-blue)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--bg-secondary)'
          e.currentTarget.style.color = 'var(--text-muted)'
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.transform = 'none'
        }}
      >
        ← Volver a ajustes
      </button>

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
            onMouseEnter={e => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.transform = 'none'
              }
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
  container: { paddingBottom: '40px', width: '100%', boxSizing: 'border-box' },
  btnBack: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', padding: '8px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', marginBottom: '24px' },
  header: { marginBottom: '28px' },
  title: { fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' },
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
