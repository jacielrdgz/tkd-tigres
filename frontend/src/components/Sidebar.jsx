import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  FiGrid,
  FiUsers,
  FiClipboard,
  FiCreditCard,
  FiAward,
  FiSettings,
  FiGlobe,
  FiShield,
  FiFileText,
  FiLogOut,
  FiLoader,
  FiCalendar,
  FiEye,
  FiCamera,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';

const menu = [
  { path: '/', label: 'Dashboard', icon: <FiGrid size={18} /> },
  { path: '/alumnos', label: 'Alumnos', icon: <FiUsers size={18} /> },
  { path: '/asistencias', label: 'Asistencias', icon: <FiClipboard size={18} /> },
  { path: '/pagos', label: 'Pagos', icon: <FiCreditCard size={18} /> },
  { path: '/examenes', label: 'Exámenes', icon: <FiAward size={18} /> },
  { path: '/eventos', label: 'Eventos', icon: <FiCalendar size={18} /> },
];

const menuAjustes = { path: '/ajustes', label: 'Ajustes', icon: <FiSettings size={18} /> };

const menuSuperAdmin = [
  { path: '/admin/dashboard', label: 'Dashboard Global', icon: <FiGlobe size={18} /> },
  { path: '/admin/academias', label: 'Academias', icon: <FiShield size={18} /> },
  { path: '/admin/solicitudes', label: 'Solicitudes', icon: <FiFileText size={18} /> },
  { path: '/admin/suscripciones', label: 'Suscripciones', icon: <FiCreditCard size={18} /> },
  { path: '/admin/usuarios', label: 'Usuarios Globales', icon: <FiUsers size={18} /> },
  { path: '/admin/configuracion', label: 'Configuración Global', icon: <FiSettings size={18} /> },
];

export default function Sidebar({ mobileOpen: propMobileOpen, setMobileOpen: propSetMobileOpen }) {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [localMobileOpen, setLocalMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [modalFoto, setModalFoto] = useState(null);
  const [modalConfirmLogout, setModalConfirmLogout] = useState(false);
  const avatarInputRef = useRef(null);

  const mobileOpen = propMobileOpen !== undefined ? propMobileOpen : localMobileOpen;
  const setMobileOpen = propSetMobileOpen !== undefined ? propSetMobileOpen : setLocalMobileOpen;

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

  const tenantName = user?.tenant?.nombre || (isSuperAdmin ? 'Administrador Global' : 'Mi Escuela');
  const planLabel = isSuperAdmin ? 'SUPERADMIN' : (user?.tenant?.plan?.toUpperCase() || 'FREE');

  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const logoUrlFinal = user?.tenant?.logo
    ? ((user.tenant.logo.startsWith('data:') || user.tenant.logo.startsWith('http')) 
        ? user.tenant.logo 
        : `${import.meta.env.VITE_API_URL || ''}/storage/${user.tenant.logo}`)
    : null;

  return (
    <>
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
        <div
          style={{ ...styles.logoSection, cursor: logoUrlFinal ? 'pointer' : 'default' }}
          title={logoUrlFinal ? "Ver logo de la escuela" : tenantName}
          onClick={() => {
            if (logoUrlFinal) {
              setModalFoto({
                url: logoUrlFinal,
                titulo: tenantName,
                sub: 'Logo Oficial de la Escuela',
                isAvatar: false
              })
            }
          }}
        >
          {logoUrlFinal ? (
            <img
              src={logoUrlFinal}
              alt="Logo"
              style={styles.logoImage}
            />
          ) : (
            <div style={{ ...styles.logoImage, background: 'var(--accent-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
              <FiShield size={22} />
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
              className="sidebar-link"
            >
              <span style={styles.icon}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div style={styles.footer}>
          {/*Ajustes link*/}
          <NavLink
            to="/ajustes"
            onClick={closeMobile}
            className="sidebar-link"
            style={{ marginBottom: '4px' }}
          >
            <span style={styles.icon}>{menuAjustes.icon}</span>
            <span style={{ flex: 1 }}>{menuAjustes.label}</span>
          </NavLink>

          <div style={styles.userInfo}>
            {/* Avatar clickeable para ampliar foto */}
            <div
              style={{
                ...styles.userAvatar,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
              title="Ver foto de perfil"
              onClick={() => setModalFoto({
                url: user?.avatar_url,
                titulo: user?.name || 'Mi Perfil',
                sub: user?.role === 'owner' ? 'Administrador' : (user?.role || 'Usuario'),
                isAvatar: true
              })}
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
                uploadingAvatar ? <FiLoader className="spin" size={16} /> : (user?.name?.charAt(0)?.toUpperCase() || '?')
              )}
              {/* Overlay con icono de ver foto */}
              {avatarHover && !uploadingAvatar && (
                <div style={styles.avatarOverlay}>
                  <FiEye size={14} color="#fff" />
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
          <button
            onClick={() => setModalConfirmLogout(true)}
            style={styles.logoutBtn}
            onMouseOver={e => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <FiLogOut size={14} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* MINI MODAL CONFIRMAR CERRAR SESIÓN */}
      {modalConfirmLogout && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => setModalConfirmLogout(false)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '28px 24px',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxSizing: 'border-box',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Ícono Rojo de Logout */}
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              <FiLogOut size={24} style={{ marginLeft: '2px' }} />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
              ¿Cerrar Sesión?
            </h3>
            <p style={{ margin: '0 0 22px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
              ¿Estás seguro de que deseas salir de tu cuenta?
            </p>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setModalConfirmLogout(false)}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                  transition: 'all 0.2s ease',
                }}
                onClick={async () => {
                  setModalConfirmLogout(false);
                  await handleLogout();
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#dc2626';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(239, 68, 68, 0.45)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.35)';
                }}
              >
                Sí, Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX VER FOTO */}
      {modalFoto && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setModalFoto(null)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              boxSizing: 'border-box',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Botón X Cerrar */}
            <button
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setModalFoto(null)}
              onMouseEnter={e => e.currentTarget.style.background = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            >
              <FiX size={16} />
            </button>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', textAlign: 'center' }}>
              {modalFoto.titulo}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {modalFoto.sub}
            </p>

            {/* Imagen ampliada */}
            <div
              style={{
                width: '220px',
                height: '220px',
                borderRadius: modalFoto.isAvatar ? '50%' : '20px',
                overflow: 'hidden',
                border: '4px solid var(--accent-blue)',
                boxShadow: '0 10px 30px rgba(59, 130, 246, 0.35)',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                flexShrink: 0,
              }}
            >
              {modalFoto.url ? (
                <img
                  src={modalFoto.url}
                  alt="Vista previa"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ fontSize: '72px', fontWeight: '800', color: 'var(--accent-blue)' }}>
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              {modalFoto.isAvatar && (
                <button
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    background: 'var(--accent-blue)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                  }}
                  onClick={() => {
                    setModalFoto(null);
                    avatarInputRef.current?.click();
                  }}
                >
                  <FiCamera size={16} />
                  Cambiar foto
                </button>
              )}
              <button
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                onClick={() => setModalFoto(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom navigation */}
      {isMobile && !mobileOpen && (
        <nav style={styles.bottomNav}>
          {filteredMenu.map(item => (
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
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
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