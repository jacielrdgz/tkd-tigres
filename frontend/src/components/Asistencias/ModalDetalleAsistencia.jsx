import React, { useState, useMemo } from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiCheck } from 'react-icons/fi';

/**
 * ModalDetalleAsistencia Component
 * 
 * Un modal premium para mostrar las estadísticas de asistencia de un alumno y su historial mensual.
 */
const ModalDetalleAsistencia = ({ estaAbierto, alCerrar, alumno, historial = [] }) => {
  const [fechaVista, setFechaVista] = useState(new Date());

  // --- Cerrar con ESC ---
  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') alCerrar();
    };
    if (estaAbierto) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [estaAbierto, alCerrar]);


  // --- Lógica del Calendario ---
  const diasSemana = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁ'];

  const datosCalendario = useMemo(() => {
    if (!estaAbierto || !alumno) return [];

    const anio = fechaVista.getFullYear();
    const mes = fechaVista.getMonth();

    const primerDia = new Date(anio, mes, 1).getDay();
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();

    const dias = [];
    for (let i = 0; i < primerDia; i++) {
      dias.push({ dia: null, fecha: null });
    }
    for (let d = 1; d <= diasEnMes; d++) {
      const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const registro = historial.find(h => h.fecha === fechaStr);
      dias.push({
        dia: d,
        fecha: fechaStr,
        estatus: registro ? (registro.presente ? 'presente' : 'falta') : 'ninguno',
        esHoy: new Date().toLocaleDateString('sv-SE') === fechaStr
      });
    }
    while (dias.length < 42) {
      dias.push({ dia: null, fecha: null });
    }
    return dias;
  }, [fechaVista, historial, estaAbierto, alumno]);

  const nombreMes = fechaVista.toLocaleString('es-ES', { month: 'long' });
  const nombreAnio = fechaVista.getFullYear();

  const cambiarMes = (offset) => {
    setFechaVista(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  // --- Cálculo de Estadísticas ---
  const estadisticas = useMemo(() => {
    if (!estaAbierto || !alumno) return { total: 0, asistio: 0, falto: 0, porcentaje: 0 };

    const mesStr = `${fechaVista.getFullYear()}-${String(fechaVista.getMonth() + 1).padStart(2, '0')}`;
    const registrosMes = historial.filter(h => h.fecha.startsWith(mesStr));

    const asistio = registrosMes.filter(r => r.presente).length;
    const total = registrosMes.length;
    const falto = total - asistio;
    const porcentaje = total > 0 ? Math.round((asistio / total) * 100) : 0;

    return { total, asistio, falto, porcentaje };
  }, [historial, fechaVista, estaAbierto, alumno]);

  if (!estaAbierto || !alumno) return null;

  // --- Estilos ---
  const s = {
    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '16px',
    },
    modal: {
      backgroundColor: 'var(--bg-secondary)',
      backgroundImage: 'radial-gradient(var(--border) 0.5px, transparent 0.5px)',
      backgroundSize: '12px 12px',
      width: '100%',
      maxWidth: '700px',
      maxHeight: 'calc(100vh - 40px)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      overflowY: 'auto',
      position: 'relative',
      animation: 'modalFadeIn 0.3s ease-out',
      border: '1px solid var(--border)',
    },
    btnCerrar: {
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '36px',
      height: '36px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      transition: 'all 0.2s',
      zIndex: 10,
    },
    cabecera: {
      padding: '24px 24px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    avatar: {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '20px',
      fontWeight: '700',
      boxShadow: '0 8px 12px -3px rgba(0, 0, 0, 0.2)',
    },
    contenedorNombre: {
      display: 'flex',
      flexDirection: 'column',
    },
    nombre: {
      fontSize: '22px',
      fontWeight: '800',
      color: 'var(--text-primary)',
      letterSpacing: '-0.01em',
      lineHeight: '1.2',
      textTransform: 'capitalize',
      fontFamily: '"Inter", sans-serif',
    },
    subtexto: {
      fontSize: '13px',
      color: 'var(--text-muted)',
      marginTop: '2px',
      fontWeight: '500',
    },
    filaStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '10px',
      padding: '0 24px 20px',
    },
    tarjetaStat: {
      backgroundColor: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 6px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    },
    labelStat: {
      fontSize: '10px',
      fontWeight: '700',
      color: 'var(--text-dim)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    valorStat: {
      fontSize: '20px',
      fontWeight: '800',
      color: 'var(--text-primary)',
    },
    porcentaje: {
      color: 'var(--accent-green)',
    },
    seccionCalendario: {
      padding: '0 24px 24px',
    },
    cabeceraCalendario: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
    },
    tituloMes: {
      fontSize: '18px',
      fontWeight: '800',
      color: 'var(--text-primary)',
      textTransform: 'capitalize',
    },
    btnsNav: {
      display: 'flex',
      gap: '6px',
    },
    btnNav: {
      width: '28px',
      height: '28px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'var(--text-muted)',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '6px',
    },
    nombreDia: {
      textAlign: 'center',
      fontSize: '11px',
      fontWeight: '700',
      color: 'var(--text-dim)',
      paddingBottom: '6px',
    },
    celdaDia: {
      aspectRatio: '1/1',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '13px',
      fontWeight: '600',
      position: 'relative',
      border: '1px solid transparent',
      transition: 'all 0.2s',
    },
    numDia: {
      marginBottom: '1px',
    },
    iconoEstatus: {
      fontSize: '9px',
    }
  };

  const obtenerEstiloDia = (dia) => {
    if (!dia.dia) return { visibility: 'hidden' };

    let estilo = { ...s.celdaDia };

    if (dia.estatus === 'presente') {
      estilo.backgroundColor = 'var(--accent-green-bg)';
      estilo.borderColor = 'var(--accent-green)';
      estilo.color = 'var(--accent-green)';
    } else if (dia.estatus === 'falta') {
      estilo.backgroundColor = 'var(--accent-red-bg)';
      estilo.borderColor = 'var(--accent-red)';
      estilo.color = 'var(--accent-red)';
    } else {
      estilo.color = 'var(--text-muted)';
      estilo.backgroundColor = 'var(--bg-primary)';
      estilo.borderColor = 'var(--border)';
    }

    if (dia.esHoy) {
      estilo.boxShadow = '0 0 0 2px var(--text-primary)';
      estilo.borderColor = 'var(--text-primary)';
      estilo.color = 'var(--text-primary)';
    }

    return estilo;
  };

  const getIniciales = (nombre, apellido) => {
    return (nombre?.charAt(0) || '') + (apellido?.charAt(0) || '');
  };

  const limpiarUrl = (url) => url ? url.replace(/\\\//g, '/') : null;

  const formatearHora = (hora) => {
    if (!hora) return '';
    try {
      const [h, m] = hora.split(':');
      const hInt = parseInt(h);
      const ampm = hInt >= 12 ? 'PM' : 'AM';
      const h12 = hInt % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    } catch (e) {
      return hora;
    }
  };

  const obtenerInfoHorario = (h) => {
    if (!h) return alumno.horario || 'Sin Horario';
    const dias = h.dias ? h.dias.toUpperCase() : '';
    const hora = `${formatearHora(h.hora_inicio)} - ${formatearHora(h.hora_fin)}`;
    return `${h.nombre} (${dias} ${hora})`;
  };

  return (
    <div style={s.overlay} onClick={alCerrar}>
      <div className="attendance-modal-content" style={s.modal} onClick={e => e.stopPropagation()}>
        <button style={s.btnCerrar} onClick={alCerrar}>
          <FiX size={20} />
        </button>

        <div style={s.cabecera}>
          <div style={{ ...s.avatar, position: 'relative', overflow: 'hidden' }}>
            {alumno.foto_url ? (
              <img
                src={limpiarUrl(alumno.foto_url)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
              />
            ) : null}
            <div style={{ display: alumno.foto_url ? 'none' : 'flex' }}>
              {getIniciales(alumno.nombre, alumno.apellido_paterno)}
            </div>
          </div>
          <div style={s.contenedorNombre}>
            <h2 style={s.nombre}>
              {(alumno.nombre + ' ' + alumno.apellido_paterno + (alumno.apellido_materno ? ' ' + alumno.apellido_materno : '')).toLowerCase()}
            </h2>
            <div style={s.subtexto}>
              ID: #{alumno.id} • {alumno.cinta_config?.nombre_nivel || 'Sin Cinta'}
            </div>
            <div style={{ ...s.subtexto, color: 'var(--accent-blue)' }}>
              {obtenerInfoHorario(alumno.horario_config)}
            </div>
          </div>
        </div>

        <div style={s.filaStats}>
          <div style={s.tarjetaStat}>
            <span style={s.labelStat}>CLASES</span>
            <span style={s.valorStat}>{estadisticas.total}</span>
          </div>
          <div style={s.tarjetaStat}>
            <span style={s.labelStat}>ASISTIÓ</span>
            <span style={s.valorStat}>{estadisticas.asistio}</span>
          </div>
          <div style={s.tarjetaStat}>
            <span style={s.labelStat}>FALTÓ</span>
            <span style={s.valorStat}>{estadisticas.falto}</span>
          </div>
          <div style={s.tarjetaStat}>
            <span style={s.labelStat}>%</span>
            <span style={{ ...s.valorStat, ...s.porcentaje }}>{estadisticas.porcentaje}%</span>
          </div>
        </div>

        <div style={s.seccionCalendario}>
          <div style={s.cabeceraCalendario}>
            <h3 style={s.tituloMes}>{nombreMes} {nombreAnio}</h3>
            <div style={s.btnsNav}>
              <button style={s.btnNav} onClick={() => cambiarMes(-1)}><FiChevronLeft /></button>
              <button style={s.btnNav} onClick={() => cambiarMes(1)}><FiChevronRight /></button>
            </div>
          </div>

          <div style={s.grid}>
            {diasSemana.map(d => (
              <div key={d} style={s.nombreDia}>{d}</div>
            ))}
            {datosCalendario.map((dia, i) => (
              <div key={i} style={obtenerEstiloDia(dia)}>
                {dia.dia && (
                  <>
                    <span style={s.numDia}>{dia.dia}</span>
                    {dia.estatus === 'presente' && <FiCheck style={s.iconoEstatus} />}
                    {dia.estatus === 'falta' && <span style={s.iconoEstatus}>✕</span>}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        .attendance-modal-content::-webkit-scrollbar {
          width: 8px;
        }
        
        .attendance-modal-content::-webkit-scrollbar-track {
          background: var(--bg-primary);
          border-radius: 10px;
        }
        
        .attendance-modal-content::-webkit-scrollbar-thumb {
          background: var(--accent-blue);
          border-radius: 10px;
          border: 2px solid var(--bg-primary);
        }
        
        .attendance-modal-content::-webkit-scrollbar-thumb:hover {
          background: var(--accent-purple);
        }
      `}</style>
    </div>
  );
};

export default ModalDetalleAsistencia;
