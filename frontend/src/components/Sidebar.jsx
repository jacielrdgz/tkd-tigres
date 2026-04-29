import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/tigreslogo.jpg';

const menu = [
  { path: '/', label: 'Dashboard', icon: '▦' },
  { path: '/alumnos', label: 'Alumnos', icon: '👥' },
  { path: '/asistencias', label: 'Asistencias', icon: '📋' },
  { path: '/pagos', label: 'Pagos', icon: '💳' },
  { path: '/eventos', label: 'Eventos', icon: '🏆' },
];

const menuAjustes = { path: '/ajustes', label: 'Ajustes', icon: '⚙️' };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMobile = () => {
    if (isMobile) setMobileOpen(false);
  };

  const tenantName = user?.tenant?.nombre || 'Mi Escuela';
  const planLabel = user?.tenant?.plan?.toUpperCase() || 'FREE';

  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          style={styles.hamburger}
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <span style={styles.hamburgerLine} />
          <span style={styles.hamburgerLine} />
          <span style={styles.hamburgerLine} />
        </button>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div style={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside style={{
        ...styles.sidebar,
        ...(isMobile ? {
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: mobileOpen ? '4px 0 30px rgba(0,0,0,0.5)' : 'none',
        } : {}),
      }}>
        {/* Logo & tenant info */}
        <div style={styles.logoSection}>
          <img
            src={user?.tenant?.logo || logoImg}
            alt="Logo"
            style={styles.logoImage}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.logoTitle}>{tenantName}</div>
            <div style={styles.logoSub}>{fechaHoy}</div>
          </div>
          <span style={styles.planBadge}>{planLabel}</span>
        </div>

        {/* Navigation */}
        <nav style={styles.nav}>
          {menu.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={closeMobile}
              style={({ isActive }) => ({
                ...styles.link,
                ...(isActive ? styles.linkActive : {}),
              })}
            >
              <span style={styles.icon}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div style={styles.footer}>
          {/* Ajustes link */}
          <NavLink
            to="/ajustes"
            onClick={closeMobile}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? styles.linkActive : {}),
              marginBottom: '4px',
            })}
          >
            <span style={styles.icon}>{menuAjustes.icon}</span>
            <span style={{ flex: 1 }}>{menuAjustes.label}</span>
          </NavLink>

          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.userName}>{user?.name || 'Usuario'}</div>
              <div style={styles.userRole}>{user?.role === 'owner' ? 'Administrador' : user?.role || 'Rol'}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      {isMobile && !mobileOpen && (
        <nav style={styles.bottomNav}>
          {[...menu, menuAjustes].map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                ...styles.bottomNavItem,
                color: isActive ? '#60a5fa' : '#64748b',
              })}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ fontSize: '9px', fontWeight: 600 }}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    minHeight: '100vh',
    background: '#13151f',
    borderRight: '1px solid #1e2130',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 200,
    transition: 'transform 0.3s ease',
  },
  hamburger: {
    position: 'fixed',
    top: '16px',
    left: '16px',
    zIndex: 150,
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    background: '#13151f',
    border: '1px solid #1e2130',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
  },
  hamburgerLine: {
    width: '18px',
    height: '2px',
    background: '#94a3b8',
    borderRadius: '2px',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 150,
    backdropFilter: 'blur(2px)',
  },
  logoSection: {
    padding: '20px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid #1e2130',
  },
  logoImage: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  logoTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: '1.2',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoSub: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  planBadge: {
    fontSize: '9px',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '6px',
    background: '#1e2d4a',
    color: '#60a5fa',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  nav: {
    padding: '16px 12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 12px',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#94a3b8',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
    fontWeight: '500',
  },
  linkActive: {
    background: '#1e2d4a',
    color: '#60a5fa',
    fontWeight: '600',
  },
  icon: {
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
  },
  footer: {
    padding: '16px',
    borderTop: '1px solid #1e2130',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    color: '#fff',
    flexShrink: 0,
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    width: '100%',
    padding: '8px',
    background: '#1e2130',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.15s',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65px',
    background: '#13151f',
    borderTop: '1px solid #1e2130',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 100,
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  bottomNavItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    textDecoration: 'none',
    padding: '6px 12px',
    transition: 'color 0.15s',
  },
};