import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROUTE_TITLES = {
  '/': 'Dashboard',
  '/alumnos': 'Alumnos',
  '/asistencias': 'Asistencias',
  '/pagos': 'Pagos',
  '/eventos': 'Eventos',
  '/ajustes': 'Ajustes',
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

  // Determinar título
  let title = ROUTE_TITLES[location.pathname] || (user?.tenant?.nombre || 'Tigres');
  if (location.pathname.startsWith('/eventos/')) {
    title = 'Detalle de Evento';
  } else if (location.pathname.startsWith('/admin/academias/')) {
    title = 'Detalle de Academia';
  }

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

  // Mostrar el menú de 3 puntos (⋮) solo en ciertas páginas que tienen exportaciones u otras opciones
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
      // Asistencias tiene botones en AsistenciasTopbar con ids específicos
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
        <h1 style={styles.title}>{user?.tenant?.nombre || title}</h1>
      </div>

      <div style={styles.right} ref={menuRef}>
        {showOptions && (
          <div style={{ position: 'relative' }}>
            <button style={styles.btnOptions} onClick={() => setMenuOpen(!menuOpen)} aria-label="Opciones">
              ⋮
            </button>
            {menuOpen && (
              <div style={styles.dropdown}>
                <button style={styles.dropdownItem} onClick={() => handleAction('excel')}>
                  📊 Exportar a Excel
                </button>
                <button style={styles.dropdownItem} onClick={() => handleAction('pdf')}>
                  📄 Exportar a PDF
                </button>
              </div>
            )}
          </div>
        )}
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
    padding: '0 16px',
    zIndex: 100,
    boxShadow: 'var(--shadow-sm)',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  btnMenu: {
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
  },
  btnOptions: {
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '40px',
    right: '0',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    width: '180px',
    boxShadow: 'var(--shadow-md)',
    zIndex: 110,
    overflow: 'hidden',
  },
  dropdownItem: {
    width: '100%',
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    textAlign: 'left',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '500',
  },
};
