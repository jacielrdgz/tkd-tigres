import React, { useMemo } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';

/**
 * VistaAsistenciaPorFecha Component
 * 
 * Versión Premium con estética moderna, inspirada en las especificaciones del usuario.
 */
const VistaAsistenciaPorFecha = ({ historial, alumnos, onDiaClick, fechaVista, onCambiarMes }) => {
  const mesActual = fechaVista.getMonth();
  const anioActual = fechaVista.getFullYear();

  const estadisticasMes = useMemo(() => {
    const mesStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
    const registrosMes = historial.filter(h => h.fecha.startsWith(mesStr));
    
    const fechasUnicas = [...new Set(registrosMes.map(r => r.fecha))];
    const totalClases = fechasUnicas.length;
    
    const totalAsistencias = registrosMes.filter(r => r.presente).length;
    const totalEsperado = registrosMes.length;
    const promedio = totalEsperado > 0 ? Math.round((totalAsistencias / totalEsperado) * 100) : 0;
    
    let diasBaja = 0;
    fechasUnicas.forEach(f => {
      const regs = registrosMes.filter(r => r.fecha === f);
      const asis = regs.filter(r => r.presente).length;
      if (regs.length > 0 && (asis / regs.length) < 0.7) diasBaja++;
    });

    return { totalClases, promedio, diasBaja, totalAsistencias, totalEsperado };
  }, [historial, mesActual, anioActual]);

  const diasSemana = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁ'];
  
  const datosCalendario = useMemo(() => {
    const primerDia = new Date(anioActual, mesActual, 1).getDay();
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
    
    const dias = [];
    for (let i = 0; i < primerDia; i++) {
      dias.push({ dia: null, fecha: null });
    }
    
    for (let d = 1; d <= diasEnMes; d++) {
      const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const registrosDia = historial.filter(h => h.fecha === fechaStr);
      
      const asistieron = registrosDia.filter(r => r.presente).length;
      const totalAlumnos = registrosDia.length;
      const porcentaje = totalAlumnos > 0 ? Math.round((asistieron / totalAlumnos) * 100) : 0;
      
      dias.push({
        dia: d,
        fecha: fechaStr,
        asistieron,
        totalAlumnos,
        porcentaje,
        esHoy: new Date().toLocaleDateString('sv-SE') === fechaStr
      });
    }
    
    while (dias.length < 42) {
      dias.push({ dia: null, fecha: null });
    }
    return dias;
  }, [mesActual, anioActual, historial]);

  const nombreMes = fechaVista.toLocaleString('es-ES', { month: 'long' });

  const s = {
    container: {
      padding: '24px 0',
      animation: 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    statsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '24px',
      marginBottom: '32px',
    },
    statCard: {
      backgroundColor: 'var(--bg-secondary)',
      padding: '30px 20px',
      borderRadius: '24px',
      border: '1px solid var(--border)',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      boxShadow: 'var(--shadow-sm)',
    },
    statLabel: {
      fontSize: '12px',
      fontWeight: '800',
      color: 'var(--text-dim)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '900',
      color: 'var(--text-primary)',
      fontFamily: '"Outfit", "Inter", sans-serif',
    },
    calendarContainer: {
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '32px',
      border: '1px solid var(--border)',
      padding: '32px',
      boxShadow: 'var(--shadow-lg)',
    },
    calHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '28px',
    },
    mesTitulo: {
      fontSize: '26px',
      fontWeight: '900',
      color: 'var(--text-primary)',
      textTransform: 'capitalize',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    navGroup: {
      display: 'flex',
      gap: '12px',
    },
    btnNav: {
      width: '44px',
      height: '44px',
      borderRadius: '14px',
      border: '1px solid var(--border)',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '16px',
    },
    labelDia: {
      textAlign: 'center',
      fontSize: '12px',
      fontWeight: '900',
      color: 'var(--text-dim)',
      paddingBottom: '16px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    celdaDia: (activo, porcentaje, hoy) => {
      const esBajo = porcentaje < 70;
      let styles = {
        aspectRatio: '1.4/1',
        borderRadius: '20px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '2px solid transparent',
      };

      if (!activo) {
        styles.opacity = 0.3;
        styles.backgroundColor = 'transparent';
      } else {
        styles.cursor = 'pointer';
        if (esBajo) {
          styles.backgroundColor = 'rgba(239, 68, 68, 0.05)';
          styles.borderColor = 'rgba(239, 68, 68, 0.2)';
        } else {
          styles.backgroundColor = 'rgba(16, 185, 129, 0.05)';
          styles.borderColor = 'rgba(16, 185, 129, 0.2)';
        }
      }

      if (hoy) {
        styles.borderColor = 'var(--accent-blue)';
        styles.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.15)';
      }

      return styles;
    },
    numDia: {
      fontSize: '15px',
      fontWeight: '900',
      color: 'var(--text-dim)',
    },
    infoDia: (porcentaje) => ({
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }),
    txtInfo: (porcentaje) => ({
      fontSize: '11px',
      fontWeight: '800',
      color: porcentaje < 70 ? 'var(--accent-red)' : 'var(--accent-green)',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    }),
    barraBg: {
      height: '6px',
      width: '100%',
      backgroundColor: 'var(--border)',
      borderRadius: '10px',
      overflow: 'hidden',
    },
    barraProgreso: (percent) => ({
      height: '100%',
      width: `${percent}%`,
      backgroundColor: percent < 70 ? 'var(--accent-red)' : 'var(--accent-green)',
      borderRadius: '10px',
      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
    })
  };

  return (
    <div style={s.container}>
      {/* Tarjetas de Estadísticas */}
      <div style={s.statsRow}>
        <div style={s.statCard}>
          <span style={s.statLabel}>CLASES EN EL MES</span>
          <span style={s.statValue}>{estadisticasMes.totalClases}</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>PROMEDIO ASISTENCIA</span>
          <span style={{ ...s.statValue, color: 'var(--accent-green)' }}>
            {estadisticasMes.totalAsistencias}/{estadisticasMes.totalEsperado}
            <span style={{ fontSize: '18px', color: 'var(--text-dim)', marginLeft: '8px' }}>
              • {estadisticasMes.promedio}%
            </span>
          </span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>DÍAS CON BAJA ASISTENCIA</span>
          <span style={{ ...s.statValue, color: 'var(--accent-red)' }}>{estadisticasMes.diasBaja}</span>
        </div>
      </div>

      {/* Calendario */}
      <div style={s.calendarContainer}>
        <div style={s.calHeader}>
          <h3 style={s.mesTitulo}>
            <FiCalendar style={{ color: 'var(--accent-blue)' }} />
            {nombreMes} {anioActual}
          </h3>
          <div style={s.navGroup}>
            <button style={s.navBtn} onClick={() => onCambiarMes(new Date(anioActual, mesActual - 1, 1))} className="btn-cal-nav">
              <FiChevronLeft size={22} />
            </button>
            <button style={s.navBtn} onClick={() => onCambiarMes(new Date(anioActual, mesActual + 1, 1))} className="btn-cal-nav">
              <FiChevronRight size={22} />
            </button>
          </div>
        </div>

        <div style={s.grid}>
          {diasSemana.map(d => (
            <div key={d} style={s.labelDia}>{d}</div>
          ))}
          {datosCalendario.map((d, i) => {
            const tieneDatos = d.totalAlumnos > 0;
            return (
              <div 
                key={i} 
                style={s.celdaDia(tieneDatos, d.porcentaje, d.esHoy)}
                onClick={() => tieneDatos && onDiaClick(d.fecha)}
                className={tieneDatos ? 'cal-cell-active' : ''}
              >
                {d.dia && (
                  <>
                    <span style={s.numDia}>{d.dia}</span>
                    {tieneDatos && (
                      <div style={s.infoDia(d.porcentaje)}>
                        <div style={s.barraBg}>
                          <div style={s.barraProgreso(d.porcentaje)} />
                        </div>
                        <span style={s.txtInfo(d.porcentaje)}>
                          {d.asistieron}/{d.totalAlumnos} • {d.porcentaje}%
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .btn-cal-nav:hover {
          background-color: var(--bg-tertiary) !important;
          color: var(--text-primary) !important;
          transform: translateY(-2px);
        }
        .cal-cell-active:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: var(--shadow-lg);
          border-color: var(--accent-blue) !important;
          z-index: 10;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default VistaAsistenciaPorFecha;
