import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import {
  FiArrowLeft,
  FiShield,
  FiUser,
  FiMail,
  FiMapPin,
  FiPhone,
  FiCalendar,
  FiCreditCard,
  FiDollarSign,
  FiUsers,
  FiClock,
  FiTrash2,
  FiActivity
} from 'react-icons/fi';
import { formatearFechaNatural, formatearFechaHora } from '../../utils/dateHelper';

export default function AdminAcademiaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    fetchDetail();
    fetchUsuarios();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/academias/${id}`);
      setData(res.data);
    } catch {
      toast.error('Error al cargar detalle de la academia');
      navigate('/admin/academias');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const res = await api.get(`/admin/academias/${id}/usuarios`);
      setUsuarios(res.data);
    } catch {
      console.error('Error al cargar usuarios de la academia');
    }
  };

  const handleDeleteUser = (user) => {
    Swal.fire({
      title: '¿Eliminar usuario?',
      html: `Se eliminará permanentemente a <strong>${user.name}</strong> (${user.email}).`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/admin/usuarios/${user.id}`);
          toast.success('Usuario eliminado');
          fetchUsuarios();
          fetchDetail();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al eliminar');
        }
      }
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '12px' }}>
          Cargando información de la academia...
        </p>
      </div>
    );
  }

  const { academia, owner, stats, historial_suscripciones } = data;

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
    const b = badges[estado] || { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', text: estado ? estado.toUpperCase() : 'DESCONOCIDO' };
    return <span style={{ ...styles.badge, background: b.bg, color: b.color }}>{b.text}</span>;
  };

  const floatVal = (val) => parseFloat(val) || 0;

  return (
    <div style={styles.container}>
      {/* Botón Volver */}
      <button
        style={styles.btnBack}
        onClick={() => navigate('/admin/academias')}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.borderColor = 'var(--accent-blue)';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <FiArrowLeft size={16} />
        <span>Volver a academias</span>
      </button>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={styles.idLabel}>ACADEMIA ID: #{academia.id}</span>
            <span style={styles.disciplineBadge}>{academia.disciplina || 'Taekwondo'}</span>
          </div>
          <h1 style={styles.title}>{academia.nombre}</h1>
          <p style={styles.subtitle}>Supervisión integral, usuarios y registro histórico de cobros</p>
        </div>
        <div>{getStatusBadge(academia.suscripcion_estado, academia.is_suspended)}</div>
      </div>

      <div style={styles.grid}>
        {/* Info Box */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={{ ...styles.cardIconBox, background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>
              <FiShield size={18} />
            </div>
            <h3 style={styles.sectionTitle}>Datos Generales de la Escuela</h3>
          </div>
          <div style={styles.infoList}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Dueño / Responsable:</span>
              <span style={styles.infoValue}>{owner ? owner.name : 'No asignado'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Correo Electrónico:</span>
              <span style={styles.infoValue}>{owner ? owner.email : 'No asignado'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Dirección:</span>
              <span style={styles.infoValue}>{academia.direccion || 'Sin dirección registrada'}</span>
            </div>
            {academia.ciudad && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Ciudad:</span>
                <span style={styles.infoValue}>{academia.ciudad}</span>
              </div>
            )}
            {academia.estado && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Estado:</span>
                <span style={styles.infoValue}>{academia.estado}</span>
              </div>
            )}
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Teléfono:</span>
              <span style={styles.infoValue}>{academia.telefono || 'Sin teléfono registrado'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Fecha de Registro:</span>
              <span style={styles.infoValue}>{formatearFechaNatural(academia.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Stats & Subscription */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={{ ...styles.cardIconBox, background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
              <FiActivity size={18} />
            </div>
            <h3 style={styles.sectionTitle}>Suscripción & Métricas</h3>
          </div>
          <div style={styles.infoList}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Plan de Licencia:</span>
              <span style={styles.planBadge}>{academia.plan?.toUpperCase() || 'PRO'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Tarifa Pactada:</span>
              <span style={{ ...styles.infoValue, color: 'var(--accent-green)', fontWeight: '700' }}>
                ${(academia.suscripcion_monto || 0).toLocaleString()} MXN / mes
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Próximo Vencimiento:</span>
              <span style={styles.infoValue}>
                {formatearFechaNatural(academia.suscripcion_hasta)}
              </span>
            </div>
            <div style={styles.divider} />
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Alumnos Inscritos:</span>
              <span style={styles.metricBadge}>
                <FiUsers size={13} />
                {stats.total_alumnos} alumnos
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Pagos Registrados:</span>
              <span style={styles.metricBadge}>
                <FiCreditCard size={13} />
                {stats.total_pagos_registrados} recibos
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Último Acceso:</span>
              <span style={styles.infoValue}>
                {formatearFechaHora(stats.ultimo_acceso)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Cobros */}
      <div style={{ ...styles.sectionCard, marginTop: '24px' }}>
        <div style={styles.sectionHeader}>
          <div style={{ ...styles.cardIconBox, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <FiDollarSign size={18} />
          </div>
          <h3 style={styles.sectionTitle}>Historial de Cobros de Suscripción</h3>
        </div>
        {historial_suscripciones.length === 0 ? (
          <p style={styles.emptyHistorial}>No hay renovaciones registradas todavía.</p>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Plan</th>
                  <th style={styles.th}>Monto Cobrado</th>
                  <th style={styles.th}>Fecha de Pago</th>
                  <th style={styles.th}>Válido Hasta</th>
                </tr>
              </thead>
              <tbody>
                {historial_suscripciones.map((h) => (
                  <tr
                    key={h.id}
                    style={styles.tr}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...styles.td, fontWeight: 700, textTransform: 'uppercase' }}>{h.plan}</td>
                    <td style={{ ...styles.td, color: 'var(--accent-green)', fontWeight: '700' }}>
                      ${floatVal(h.monto).toLocaleString()} MXN
                    </td>
                    <td style={styles.td}>{formatearFechaNatural(h.fecha_pago)}</td>
                    <td style={styles.td}>{formatearFechaNatural(h.valido_hasta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usuarios de la Academia */}
      <div style={{ ...styles.sectionCard, marginTop: '24px' }}>
        <div style={styles.sectionHeader}>
          <div style={{ ...styles.cardIconBox, background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc' }}>
            <FiUsers size={18} />
          </div>
          <h3 style={styles.sectionTitle}>Personal y Usuarios de la Academia</h3>
        </div>
        {usuarios.length === 0 ? (
          <p style={styles.emptyHistorial}>No hay usuarios vinculados a esta escuela.</p>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>Correo</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Rol</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Estado</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr
                    key={u.id}
                    style={styles.tr}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...styles.td, fontWeight: 700 }}>{u.name}</td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={styles.userRoleBadge}>{u.role}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {u.is_suspended ? (
                        <span style={{ ...styles.badge, background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>
                          SUSPENDIDO
                        </span>
                      ) : (
                        <span style={{ ...styles.badge, background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
                          ACTIVO
                        </span>
                      )}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        style={styles.btnActionRed}
                        title="Eliminar usuario"
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
                        <FiTrash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
  btnBack: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    marginBottom: '20px',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '28px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  idLabel: {
    fontSize: '11px',
    fontWeight: '800',
    color: 'var(--accent-blue)',
    letterSpacing: '0.8px',
  },
  disciplineBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    background: 'var(--bg-tertiary)',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  title: {
    fontSize: '26px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: '4px 0 0 0',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    marginTop: '4px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '20px',
  },
  sectionCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '22px',
    boxShadow: 'var(--shadow-md)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '18px',
  },
  cardIconBox: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  infoLabel: {
    color: 'var(--text-muted)',
    fontWeight: '600',
  },
  infoValue: {
    color: 'var(--text-primary)',
    fontWeight: '600',
  },
  planBadge: {
    background: 'var(--accent-blue-bg)',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    padding: '3px 8px',
    borderRadius: '8px',
    fontSize: '11.5px',
    fontWeight: '800',
  },
  metricBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--bg-primary)',
    padding: '3px 10px',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontWeight: '600',
    fontSize: '12.5px',
    border: '1px solid var(--border)',
  },
  userRoleBadge: {
    background: 'var(--bg-tertiary)',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11.5px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'capitalize',
  },
  divider: {
    height: '1px',
    background: 'var(--border)',
    margin: '6px 0',
  },
  emptyHistorial: {
    color: 'var(--text-muted)',
    fontSize: '13px',
    padding: '16px 0',
    margin: 0,
  },
  tableResponsive: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '11.5px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border)',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.15s ease',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    verticalAlign: 'middle',
  },
  btnActionRed: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--accent-red)',
    border: 'none',
    borderRadius: '8px',
    width: '30px',
    height: '30px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};
