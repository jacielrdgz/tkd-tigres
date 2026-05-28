import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import logoImg from '../assets/tigreslogo.jpg';

const menu = [
  { path: '/', label: 'Dashboard', icon: '▦' },
  { path: '/alumnos', label: 'Alumnos', icon: '👥' },
  { path: '/asistencias', label: 'Asistencias', icon: '📋' },
  { path: '/pagos', label: 'Pagos', icon: '💳' },
  { path: '/eventos', label: 'Eventos', icon: '🏆' },
];

const menuAjustes = { path: '/ajustes', label: 'Ajustes', icon: '⚙️' };

const menuSuperAdmin = [
  { path: '/admin/dashboard', label: 'Dashboard Global', icon: '🌍' },
  { path: '/admin/academias', label: 'Academias', icon: '🏫' },
  { path: '/admin/solicitudes', label: 'Solicitudes', icon: '📝' },
  { path: '/admin/suscripciones', label: 'Suscripciones', icon: '💳' },
  { path: '/admin/usuarios', label: 'Usuarios Globales', icon: '👥' },
  { path: '/admin/configuracion', label: 'Configuración Global', icon: '⚙️' },
];

export default function Sidebar() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  // Si es superadmin, mostramos el menú global
  const isSuperAdmin = user?.is_superadmin;
  const filteredMenu = isSuperAdmin ? menuSuperAdmin : menu;

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

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    setUploadingAvatar(true);
    try {
      await api.post('/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser();
      toast.success('¡Foto actualizada!');
    } catch {
      toast.error('No se pudo subir la foto');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const closeMobile = () => {
    if (isMobile) setMobileOpen(false);
  };

  const tenantName = isSuperAdmin ? 'Administrador Global' : (user?.tenant?.nombre || 'Mi Escuela');
  const planLabel = isSuperAdmin ? 'SUPERADMIN' : (user?.tenant?.plan?.toUpperCase() || 'FREE');

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
          {user?.tenant?.logo ? (
            <img
              src={`${import.meta.env.VITE_API_URL || ''}/storage/${user.tenant.logo}`}
              alt="Logo"
              style={styles.logoImage}
            />
          ) : (
            <div style={{ ...styles.logoImage, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              🥋
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.logoTitle}>{tenantName}</div>
            <div style={styles.logoSub}>{fechaHoy}</div>
          </div>
          <span style={styles.planBadge}>{planLabel}</span>
        </div>

        {/* Navigation */}
        <nav style={styles.nav}>
          {filteredMenu.map(item => (
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
          {/* Asistencias antiguo link (temporal) - Comentado por ahora
          <NavLink
            to="/asistencias-antiguo"
            onClick={closeMobile}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? styles.linkActive : {}),
              marginBottom: '4px',
              border: '1px dashed var(--accent-red)',
              borderRadius: '10px',
              background: isActive ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
              color: isActive ? 'var(--accent-red)' : 'var(--text-secondary)'
            })}
          >
            <span style={styles.icon}>📋⚠️</span>
            <span style={{ flex: 1, fontSize: '12.5px', fontWeight: 'bold' }}>Asistencias ANTIGUO</span>
          </NavLink>
          */}

          {/*Ajustes link*/}
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
            {/* Avatar clickeable */}
            <div
              style={{
                ...styles.userAvatar,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
              title="Cambiar foto"
              onClick={() => avatarInputRef.current?.click()}
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                uploadingAvatar ? '⏳' : (user?.name?.charAt(0)?.toUpperCase() || '?')
              )}
              {/* Overlay de edición */}
              {avatarHover && !uploadingAvatar && (
                <div style={styles.avatarOverlay}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
              )}
            </div>
            {/* Input file oculto */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.userName}>{user?.name || 'Usuario'}</div>
              <div style={styles.userRole}>
                {user?.is_superadmin 
                  ? 'SuperAdmin' 
                  : user?.role === 'owner' 
                    ? 'Administrador' 
                    : user?.role === 'instructor' 
                      ? 'Instructor' 
                      : user?.role === 'secretario' 
                        ? 'Secretario' 
                        : user?.role || 'Rol'}
              </div>
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
          {[...filteredMenu, menuAjustes].map(item => (
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
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
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
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-md)',
  },
  hamburgerLine: {
    width: '18px',
    height: '2px',
    background: 'var(--text-secondary)',
    borderRadius: '2px',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 150,
    backdropFilter: 'blur(2px)',
  },
  logoSection: {
    padding: '20px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border)',
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
    color: 'var(--text-primary)',
    lineHeight: '1.2',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  planBadge: {
    fontSize: '9px',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '6px',
    background: 'var(--accent-blue-bg)',
    color: 'var(--accent-blue)',
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
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
    fontWeight: '500',
  },
  linkActive: {
    background: 'var(--accent-blue-bg)',
    color: 'var(--accent-blue)',
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
    borderTop: '1px solid var(--border)',
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
    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    color: '#fff',
    flexShrink: 0,
    transition: 'opacity 0.2s',
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    borderRadius: '50%',
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userRole: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    width: '100%',
    padding: '8px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
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
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border)',
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
};;