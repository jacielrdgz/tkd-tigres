import React, { useEffect } from 'react';
import { FiX, FiCalendar, FiCheck, FiX as FiXIcon } from 'react-icons/fi';

/**
 * ModalDetalleAsistenciaDia Component
 * 
 * Desglose premium de asistencia para un día específico.
 * Incluye lista de alumnos con estatus visual (Check/X) y grado (cinta).
 */
const ModalDetalleAsistenciaDia = ({ estaAbierto, alCerrar, fecha, alumnos, historial }) => {
  
  useEffect(() => {
    const manejarTeclaEsc = (e) => {
      if (e.key === 'Escape' && estaAbierto) alCerrar();
    };
    window.addEventListener('keydown', manejarTeclaEsc);
    return () => window.removeEventListener('keydown', manejarTeclaEsc);
  }, [estaAbierto, alCerrar]);

  if (!estaAbierto || !fecha) return null;

  const registrosDia = historial.filter(h => h.fecha === fecha);
  const alumnosData = registrosDia.map(r => {
    const alu = alumnos.find(a => a.id === r.alumno_id);
    return { ...alu, presente: r.presente };
  }).sort((a, b) => b.presente - a.presente || a.nombre.localeCompare(b.nombre));

  const fechaFormateada = new Date(fecha + 'T12:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const mesAnio = new Date(fecha + 'T12:00').toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  });

  const s = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease-out',
    },
    modal: {
      backgroundColor: 'var(--bg-secondary)',
      width: '95%',
      maxWidth: '550px',
      maxHeight: '85vh',
      borderRadius: '32px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      border: '1px solid var(--border)',
      animation: 'modalEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    header: {
      padding: '30px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      position: 'relative',
      background: 'linear-gradient(to right, var(--bg-tertiary), transparent)',
    },
    iconBox: {
      width: '56px',
      height: '56px',
      borderRadius: '18px',
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--accent-blue)',
      boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.2)',
    },
    titleGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    },
    title: {
      fontSize: '22px',
      fontWeight: '900',
      color: 'var(--text-primary)',
      margin: 0,
      textTransform: 'capitalize',
    },
    subtitle: {
      fontSize: '14px',
      color: 'var(--text-muted)',
      textTransform: 'capitalize',
    },
    btnClose: {
      position: 'absolute',
      top: '24px',
      right: '24px',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border)',
      color: 'var(--text-muted)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
    },
    scrollArea: {
      padding: '24px',
      overflowY: 'auto',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    row: (presente) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '14px 20px',
      borderRadius: '20px',
      backgroundColor: presente ? 'var(--bg-tertiary)' : 'rgba(239, 68, 68, 0.05)',
      border: `1px solid ${presente ? 'var(--border)' : 'rgba(239, 68, 68, 0.15)'}`,
      transition: 'transform 0.2s, background 0.2s',
    }),
    statusBox: (presente) => ({
      width: '32px',
      height: '32px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: presente ? 'var(--accent-green)' : 'var(--accent-red)',
      color: '#fff',
      boxShadow: `0 4px 10px ${presente ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
    }),
    nombre: {
      flex: 1,
      fontSize: '15px',
      fontWeight: '700',
      color: 'var(--text-primary)',
      textTransform: 'capitalize',
    },
    cintaGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      color: 'var(--text-secondary)',
      fontWeight: '600',
    },
    cintaDot: (color) => ({
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: color || 'var(--border)',
      boxShadow: `0 0 6px ${color}80`,
    })
  };

  return (
    <div style={s.overlay} onClick={alCerrar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={s.iconBox}>
            <FiCalendar size={28} />
          </div>
          <div style={s.titleGroup}>
            <h2 style={s.title}>{fechaFormateada}</h2>
            <span style={s.subtitle}>{mesAnio}</span>
          </div>
          <button style={s.btnClose} onClick={alCerrar} className="btn-close-hover">
            <FiX size={20} />
          </button>
        </div>

        <div style={s.scrollArea} className="custom-scroll">
          {alumnosData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No hay registros para este día.
            </div>
          ) : (
            alumnosData.map((a, i) => (
              <div key={i} style={s.row(a.presente)} className="student-row-hover">
                <div style={s.statusBox(a.presente)}>
                  {a.presente ? <FiCheck size={18} /> : <FiXIcon size={18} />}
                </div>
                <span style={s.nombre}>{`${a.nombre.toLowerCase()} ${a.apellido_paterno.toLowerCase()} ${a.apellido_materno?.toLowerCase() || ''}`}</span>
                <div style={s.cintaGroup}>
                  <div style={s.cintaDot(a.cinta_config?.color_hex)} />
                  {a.cinta_config?.nombre_nivel || 'Sin cinta'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .btn-close-hover:hover {
          background-color: var(--accent-red) !important;
          color: #fff !important;
          transform: rotate(90deg);
        }
        .student-row-hover:hover {
          transform: translateX(4px);
          background-color: var(--bg-tertiary) !important;
          border-color: var(--accent-blue) !important;
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: var(--border); borderRadius: 10px; }
      `}</style>
    </div>
  );
};

export default ModalDetalleAsistenciaDia;
