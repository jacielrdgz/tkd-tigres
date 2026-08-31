import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiBell, FiMoreVertical } from 'react-icons/fi';

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
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  const planLabel = isSuperAdmin ? 'ADMIN' : (user?.tenant?.plan?.toUpperCase() || 'PRO');

  const logoUrlFinal = user?.tenant?.logo
    ? ((user.tenant.logo.startsWith('data:') || user.tenant.logo.startsWith('http')) 
        ? user.tenant.logo 
        : `${import.meta.env.VITE_API_URL || ''}/storage/${user.tenant.logo}`)
    : null;

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mostrar el menú de opciones en ciertas páginas que tienen exportaciones
  const showOptions = ['/alumnos', '/pagos', '/asistencias'].includes(location.pathname);

  // Ejecutar acciones de exportación buscando los botones del DOM
  const handleAction = (type) => {
    setMenuOpen(false);
    const buttons = Array.from(document.querySelectorAll('button'));
    
    if (location.pathname === '/alumnos') {
      const btn = type === 'excel' 
        ? buttons.find(b => b.innerText.toLowerCase().includes('excel') || b.title?.toLowerCase().includes('excel'))
        : buttons.find(b => b.innerText.toLowerCase().includes('pdf') || b.title?.toLowerCase().includes('pdf'));
      if (btn) btn.click();
    } else if (location.pathname === '/pagos') {
      const btn = type === 'excel'
        ? buttons.find(b => b.innerText.toLowerCase().includes('excel') || b.title?.toLowerCase().includes('excel'))
        : buttons.find(b => b.innerText.toLowerCase().includes('pdf') || b.title?.toLowerCase().includes('pdf'));
      if (btn) btn.click();
    } else if (location.pathname === '/asistencias') {
      const btn = type === 'excel'
        ? document.querySelector('#btn-exportar-excel')
        : document.querySelector('#btn-exportar-pdf');
      if (btn) btn.click();
    }
  };

  return (
    <header style={styles.topbar}>
      <div style={styles.left}>
        <button style={styles.btnMenu} onClick={onToggleSidebar} aria-label="Menu principal">
          ☰
        </button>

        {/* Logo / Avatar de la academia */}
        <div style={styles.logoBadge}>
          {logoUrlFinal ? (
            <img src={logoUrlFinal} alt="logo" style={styles.logoImg} />
          ) : (
            <span style={styles.logoIcon}>🥋</span>
          )}
        </div>

        {/* Nombre de la escuela */}
        <span style={styles.title}>{title}</span>

        {/* Badge de Plan */}
        <span style={styles.planBadge}>{planLabel}</span>
      </div>

      <div style={styles.right} ref={menuRef}>
        <div style={{ position: 'relative' }}>
          <button 
            style={styles.btnBell} 
            onClick={() => setMenuOpen(!menuOpen)} 
            aria-label="Notificaciones y opciones"
          >
            <FiBell size={20} />
            <span style={styles.notificationDot} />
          </button>
          {menuOpen && (
            <div style={styles.dropdown}>
              <div style={styles.dropdownHeader}>
                <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                  {title}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: '600' }}>
                  Plan {planLabel}
                </span>
              </div>
              {showOptions && (
                <>
                  <button style={styles.dropdownItem} onClick={() => handleAction('excel')}>
                    📊 Exportar a Excel
                  </button>
                  <button style={styles.dropdownItem} onClick={() => handleAction('pdf')}>
                    📄 Exportar a PDF
                  </button>
                </>
              )}
              <button 
                style={styles.dropdownItem} 
                onClick={() => { setMenuOpen(false); navigate('/ajustes'); }}
              >
                ⚙️ Ajustes de Escuela
              </button>
            </div>
          )}
        </div>
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
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '140px',
  },
  planBadge: {
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '0.5px',
    padding: '2px 7px',
    borderRadius: '6px',
    background: 'rgba(59, 130, 246, 0.15)',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    flexShrink: 0,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  btnBell: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '6px 8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: '6px',
    right: '8px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--accent-blue)',
    boxShadow: '0 0 6px var(--accent-blue)',
  },
  dropdown: {
    position: 'absolute',
    top: '44px',
    right: '0',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    width: '210px',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 110,
    overflow: 'hidden',
    padding: '4px',
  },
  dropdownHeader: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginBottom: '4px',
  },
  dropdownItem: {
    width: '100%',
    padding: '10px 12px',
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    textAlign: 'left',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '500',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};
