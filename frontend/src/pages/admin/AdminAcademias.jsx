import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import {
  FiShield,
  FiSearch,
  FiEye,
  FiCheckCircle,
  FiSlash,
  FiTrash2,
  FiUsers,
  FiClock,
  FiCalendar
} from 'react-icons/fi';
import { formatearFechaNatural, formatearFechaHora } from '../../utils/dateHelper';

export default function AdminAcademias() {
  const [academias, setAcademias] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAcademias();
  }, []);

  const fetchAcademias = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/academias');
      setAcademias(res.data);
    } catch (err) {
      toast.error('Error al cargar la lista de academias');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspender = (id, nombre) => {
    Swal.fire({
      title: `¿Suspender academia: ${nombre}?`,
      text: 'Todos los usuarios de esta escuela perderán acceso de inmediato.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, suspender',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.post(`/admin/academias/${id}/suspender`);
          toast.info('Academia suspendida');
          fetchAcademias();
        } catch {
          toast.error('Error al suspender');
        }
      }
    });
  };

  const handleActivar = async (id) => {
    try {
      await api.post(`/admin/academias/${id}/activar`);
      toast.success('Academia reactivada');
      fetchAcademias();
    } catch {
      toast.error('Error al reactivar');
    }
  };

  const handleEliminar = (id, nombre) => {
    Swal.fire({
      title: `¿Eliminar permanentemente a ${nombre}?`,
      text: 'Esta acción es irreversible y borrará alumnos, asistencias y pagos relacionados de la base de datos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar todo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/admin/academias/${id}`);
          toast.success('Academia eliminada');
          fetchAcademias();
        } catch {
          toast.error('Error al eliminar');
        }
      }
    });
  };

  const filtered = academias.filter((a) =>
    a.nombre.toLowerCase().includes(search.toLowerCase()) ||
    a.owner_name.toLowerCase().includes(search.toLowerCase()) ||
    a.owner_email.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (estado, isSuspended) => {
    if (isSuspended || estado === 'suspendida') {
      return (
        <span style={{ ...styles.badge, background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>
          SUSPENDIDA
        </span>
      );
    }
    const badges = {
      trial: { bg: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', text: 'TRIAL' },
      activa: { bg: 'var(--accent-green-bg)', color: 'var(--accent-green)', text: 'ACTIVA' },
      cancelada: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', text: 'VENCIDA' },
    };
    const b = badges[estado] || { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', text: estado.toUpperCase() };
    return <span style={{ ...styles.badge, background: b.bg, color: b.color }}>{b.text}</span>;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.headerIconBadge}>
              <FiShield size={22} color="var(--accent-blue)" />
            </div>
            <h1 style={styles.title}>Gestión de Academias</h1>
          </div>
          <p style={styles.subtitle}>Supervisa, activa, suspende o elimina escuelas asociadas</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchWrapper}>
          <FiSearch size={15} style={styles.searchIcon} />
          <input
            style={styles.search}
            placeholder="Buscar por escuela, dueño o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-blue)';
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.3)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-secondary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        <span style={styles.counterText}>
          {filtered.length} academia{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Table Card */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '12px' }}>
            Cargando academias del sistema...
          </p>
        </div>
      ) : (
        <div style={styles.tableCard}>
          {filtered.length === 0 ? (
            <div style={styles.empty}>No se encontraron academias asociadas.</div>
          ) : (
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Academia</th>
                    <th style={styles.th}>Dueño / Contacto</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Estado</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Alumnos</th>
                    <th style={styles.th}>Último Acceso</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr
                      key={a.id}
                      style={styles.tr}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={styles.td}>
                        <div style={styles.schoolInfo}>
                          <span style={styles.schoolName}>{a.nombre}</span>
                          <span style={styles.schoolMeta}>
                            ID: #{a.id} · Registro: {formatearFechaNatural(a.fecha_registro)}
                          </span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.schoolInfo}>
                          <span style={styles.ownerName}>{a.owner_name}</span>
                          <span style={styles.ownerEmail}>{a.owner_email}</span>
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {getStatusBadge(a.suscripcion_estado, a.is_suspended)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.alumnosBadge}>
                          <FiUsers size={12} />
                          {a.alumnos_registrados}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateMeta}>
                          {formatearFechaHora(a.ultimo_acceso)}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={styles.actions}>
                          <Link
                            to={`/admin/academias/${a.id}`}
                            style={styles.btnActionBlue}
                            title="Ver detalle de academia"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#3b82f6';
                              e.currentTarget.style.color = '#ffffff';
                              e.currentTarget.style.transform = 'scale(1.15)';
                              e.currentTarget.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                              e.currentTarget.style.color = 'var(--accent-blue)';
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <FiEye size={15} />
                          </Link>
                          {a.is_suspended || a.suscripcion_estado === 'suspendida' ? (
                            <button
                              onClick={() => handleActivar(a.id)}
                              style={styles.btnActionGreen}
                              title="Reactivar academia"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#22c55e';
                                e.currentTarget.style.color = '#ffffff';
                                e.currentTarget.style.transform = 'scale(1.15)';
                                e.currentTarget.style.boxShadow = '0 0 12px rgba(34, 197, 94, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                                e.currentTarget.style.color = 'var(--accent-green)';
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <FiCheckCircle size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspender(a.id, a.nombre)}
                              style={styles.btnActionYellow}
                              title="Suspender acceso temporalmente"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f59e0b';
                                e.currentTarget.style.color = '#ffffff';
                                e.currentTarget.style.transform = 'scale(1.15)';
                                e.currentTarget.style.boxShadow = '0 0 12px rgba(245, 158, 11, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                                e.currentTarget.style.color = 'var(--accent-yellow)';
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <FiSlash size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEliminar(a.id, a.nombre)}
                            style={styles.btnActionRed}
                            title="Eliminar permanentemente"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#ef4444';
                              e.currentTarget.style.color = '#ffffff';
                              e.currentTarget.style.transform = 'scale(1.15)';
                              e.currentTarget.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              e.currentTarget.style.color = 'var(--accent-red)';
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '32px 24px',
    maxWidth: '1280px',
    margin: '0 auto',
    color: 'var(--text-primary)',
  },
  loadingContainer: {
    padding: '80px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid var(--border)',
    borderTopColor: 'var(--accent-blue)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '28px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerIconBadge: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'var(--accent-blue-bg)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '26px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    marginTop: '4px',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
    maxWidth: '380px',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  search: {
    width: '100%',
    padding: '10px 16px 10px 42px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '80px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.25s ease',
    boxSizing: 'border-box',
  },
  counterText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '600',
  },
  tableCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-md)',
  },
  empty: {
    padding: '60px 20px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  tableResponsive: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 20px',
    textAlign: 'left',
    fontSize: '11.5px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.15s ease',
  },
  td: {
    padding: '14px 20px',
    fontSize: '13px',
    verticalAlign: 'middle',
  },
  schoolInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  schoolName: {
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontSize: '14px',
  },
  schoolMeta: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
  },
  ownerName: {
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontSize: '13px',
  },
  ownerEmail: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.4px',
  },
  alumnosBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    background: 'var(--bg-tertiary)',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
  },
  dateMeta: {
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
  },
  actions: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  btnActionBlue: {
    background: 'rgba(59, 130, 246, 0.1)',
    color: 'var(--accent-blue)',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  },
  btnActionGreen: {
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--accent-green)',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnActionYellow: {
    background: 'rgba(245, 158, 11, 0.1)',
    color: 'var(--accent-yellow)',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnActionRed: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--accent-red)',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};
