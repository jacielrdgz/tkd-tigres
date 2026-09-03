import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';

const ROUTE_TITLES = {
  '/': 'Dashboard',
  '/alumnos': 'Alumnos',
  '/asistencias': 'Asistencias',
  '/pagos': 'Pagos',
  '/eventos': 'Eventos',
  '/examenes': 'Exámenes',
  '/ajustes': 'Ajustes',
  '/ajustes/configuracion': 'Configurar Escuela',
  '/ajustes/configuracion/general': 'Datos del Dojang',
  '/ajustes/configuracion/instructores': 'Instructores',
  '/ajustes/configuracion/horarios': 'Horarios',
  '/ajustes/configuracion/cintas': 'Grados y Cintas',
  '/admin/dashboard': 'Dashboard Global',
  '/admin/academias': 'Academias',
  '/admin/solicitudes': 'Solicitudes',
  '/admin/suscripciones': 'Suscripciones',
  '/admin/usuarios': 'Usuarios Globales',
  '/admin/configuracion': 'Configuración Global',
};

export default function Topbar({ onToggleSidebar }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Determinar título y plan
  const isSuperAdmin = user?.is_superadmin;
  let title = '';
  if (isSuperAdmin) {
    title = ROUTE_TITLES[location.pathname] || 'Panel Global';
    if (location.pathname.startsWith('/admin/academias/')) {
      title = 'Detalle de Academia';
    }
  } else {
    title = user?.tenant?.nombre || 'Mi Escuela';
  }

  const planLabel = isSuperAdmin ? 'SUPERADMIN ADMIN' : (user?.tenant?.plan?.toUpperCase() || 'PRO');

  const logoUrlFinal = user?.tenant?.logo
    ? ((user.tenant.logo.startsWith('data:') || user.tenant.logo.startsWith('http')) 
        ? user.tenant.logo 
        : `${import.meta.env.VITE_API_URL || ''}/storage/${user.tenant.logo}`)
    : null;

  return (
    <header style={styles.topbar}>
      <div style={styles.left}>
        <button style={styles.btnMenu} onClick={onToggleSidebar} aria-label="Menu principal">
          ☰
        </button>

        {/* Logo / Avatar de la academia */}
        {!isSuperAdmin && (
          <div style={styles.logoBadge}>
            {logoUrlFinal ? (
              <img src={logoUrlFinal} alt="logo" style={styles.logoImg} />
            ) : (
              <span style={styles.logoIcon}>🥋</span>
            )}
          </div>
        )}

        {/* Nombre de la escuela / modulo */}
        <span style={styles.title}>{title}</span>

        {/* Badge de Plan */}
        {!isSuperAdmin && <span style={styles.planBadge}>{planLabel}</span>}
      </div>

      <div style={styles.right}>
        <button 
          style={styles.btnTheme} 
          onClick={toggleTheme} 
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label="Cambiar tema"
        >
          {theme === 'dark' ? <FiSun size={18} color="#f59e0b" /> : <FiMoon size={18} color="var(--text-secondary)" />}
        </button>
      </div>
    </header>
  );
}

// Styles object compatible with the rest of the application
const styles = {
  topbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 14px',
    zIndex: 100,
    boxShadow: 'var(--shadow-sm)',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    flex: 1,
  },
  btnMenu: {
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '22px',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--accent-blue-bg)',
    border: '1.5px solid rgba(59, 130, 246, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  logoIcon: {
    fontSize: '16px',
  },
  title: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '1.2',
  },
  planBadge: {
    background: 'rgba(59, 130, 246, 0.12)',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    fontSize: '10px',
    fontWeight: '800',
    padding: '2px 7px',
    borderRadius: '20px',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  btnTheme: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};
