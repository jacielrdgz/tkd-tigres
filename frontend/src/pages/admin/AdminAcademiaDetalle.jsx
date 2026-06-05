import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

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
      icon: 'error',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: '#ef4444',
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
    return <div style={styles.loading}>Cargando información...</div>;
  }

  const { academia, owner, stats, historial_suscripciones } = data;

  const getStatusBadge = (estado, isSuspended) => {
    if (isSuspended || estado === 'suspendida') {
      return <span style={{ ...styles.badge, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>SUSPENDIDA</span>;
    }
    const badges = {
      trial: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', text: 'TRIAL' },
      activa: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', text: 'ACTIVA' },
      cancelada: { bg: 'rgba(100,116,139,0.1)', color: '#64748b', text: 'VENCIDA' },
    };
    const b = badges[estado] || { bg: 'rgba(255,255,255,0.05)', color: '#fff', text: estado.toUpperCase() };
    return <span style={{ ...styles.badge, background: b.bg, color: b.color }}>{b.text}</span>;
  };

  return (
    <div style={styles.container}>
      <button 
        style={styles.btnBack} 
        onClick={() => navigate('/admin/academias')}
        onMouseOver={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.color = '#ffffff';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = 'var(--bg-secondary)';
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >← Volver a academias</button>

      <div style={styles.header}>
        <div>
          <span style={styles.idLabel}>ACADEMIA ID: {academia.id}</span>
          <h1 style={styles.title}>{academia.nombre}</h1>
          <p style={styles.subtitle}>Detalle completo y registro de cobros</p>
        </div>
        <div>
          {getStatusBadge(academia.suscripcion_estado, academia.is_suspended)}
        </div>
      </div>

      <div style={styles.grid}>
        {/* Info Box */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Datos Generales</h3>
          <div style={styles.infoList}>
            <div style={styles.infoItem}>
              <strong>Dueño:</strong>
              <span style={styles.infoValue}>{owner ? owner.name : 'No asignado'}</span>
            </div>
            <div style={styles.infoItem}>
              <strong>Correo:</strong>
              <span style={styles.infoValue}>{owner ? owner.email : 'No asignado'}</span>
            </div>
            <div style={styles.infoItem}>
              <strong>Dirección:</strong>
              <span style={styles.infoValue}>{academia.direccion || 'Sin dirección registrada'}</span>
            </div>
            {academia.ciudad && (
              <div style={styles.infoItem}>
                <strong>Ciudad:</strong>
                <span style={styles.infoValue}>{academia.ciudad}</span>
              </div>
            )}
            {academia.estado && (
              <div style={styles.infoItem}>
                <strong>Estado:</strong>
                <span style={styles.infoValue}>{academia.estado}</span>
              </div>
            )}
            <div style={styles.infoItem}>
              <strong>Teléfono:</strong>
              <span style={styles.infoValue}>{academia.telefono || 'Sin teléfono registrado'}</span>
            </div>
            <div style={styles.infoItem}>
              <strong>Disciplina:</strong>
              <span style={{ ...styles.infoValue, textTransform: 'capitalize' }}>{academia.disciplina}</span>
            </div>
            <div style={styles.infoItem}>
              <strong>Fecha de Alta:</strong>
              <span style={styles.infoValue}>{academia.created_at}</span>
            </div>
          </div>
        </div>

        {/* Stats & Subscription */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Suscripción & Estadísticas</h3>
          <div style={styles.infoList}>
            <div style={styles.infoItem}>
              <strong>Plan de Licencia:</strong>
              <span style={{ ...styles.infoValue, textTransform: 'uppercase', color: 'var(--accent-blue)', fontWeight: 'bold' }}>{academia.plan}</span>
            </div>
            <div style={styles.infoItem}>
              <strong>Precio Pactado:</strong>
              <span style={{ ...styles.infoValue, color: 'var(--accent-green)', fontWeight: 'bold' }}>${academia.suscripcion_monto.toLocaleString()} / mes</span>
            </div>
            <div style={styles.infoItem}>
              <strong>Próximo Vencimiento:</strong>
              <span style={styles.infoValue}>{academia.suscripcion_hasta ? new Date(academia.suscripcion_hasta).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Indefinido'}</span>
            </div>
            <div style={styles.divider} />
            <div style={styles.infoItem}>
              <strong>Alumnos Inscritos:</strong>
              <span style={styles.infoValue}>👥 {stats.total_alumnos}</span>
            </div>
            <div style={styles.infoItem}>
              <strong>Pagos en Dojo:</strong>
              <span style={styles.infoValue}>💳 {stats.total_pagos_registrados} registros</span>
            </div>
            <div style={styles.infoItem}>
              <strong>Último Acceso:</strong>
              <span style={styles.infoValue}>
                {stats.ultimo_acceso ? new Date(stats.ultimo_acceso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Sin ingresos'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Renovaciones */}
      <div style={{ ...styles.sectionCard, marginTop: '30px' }}>
        <h3 style={styles.sectionTitle}>Historial de Cobros de Suscripción</h3>
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
                {historial_suscripciones.map(h => (
                  <tr key={h.id} style={styles.tr}>
                    <td style={{ ...styles.td, textTransform: 'uppercase', fontWeight: 600 }}>{h.plan}</td>
                    <td style={{ ...styles.td, color: 'var(--accent-green)', fontWeight: 'bold' }}>${(floatVal(h.monto)).toLocaleString()}</td>
                    <td style={styles.td}>{h.fecha_pago}</td>
                    <td style={styles.td}>{h.valido_hasta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usuarios de la Academia */}
      <div style={{ ...styles.sectionCard, marginTop: '30px' }}>
        <h3 style={styles.sectionTitle}>Usuarios de esta Academia</h3>
        {usuarios.length === 0 ? (
          <p style={styles.emptyHistorial}>No hay usuarios registrados en esta academia.</p>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>Correo</th>
                  <th style={styles.th}>Rol</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{u.name}</td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '800',
                        background: u.role === 'owner' ? 'rgba(59,130,246,0.1)' : u.role === 'instructor' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                        color: u.role === 'owner' ? '#3b82f6' : u.role === 'instructor' ? '#f59e0b' : '#10b981',
                      }}>
                        {u.role === 'owner' ? 'Administrador' : u.role === 'instructor' ? 'Instructor' : 'Secretario'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#fff',
                        background: u.is_suspended ? '#ef4444' : '#22c55e',
                      }}>
                        {u.is_suspended ? 'Suspendido' : 'Activo'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: '1px solid rgba(239,68,68,0.3)',
                          background: 'rgba(239,68,68,0.1)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#ef4444';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Eliminar usuario"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
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

function floatVal(v) {
  const f = parseFloat(v);
  return isNaN(f) ? 0 : f;
}

const styles = {
  container: { padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' },
  loading: { padding: '60px', textAlign: 'center', color: 'var(--text-muted)' },
  btnBack: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', padding: '8px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', marginBottom: '24px', transition: 'all 0.2s' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px', borderBottom: '1px solid var(--border)', paddingBottom: '24px' },
  idLabel: { fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', background: 'var(--accent-blue-bg)', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.5px' },
  title: { fontSize: '32px', fontWeight: '900', marginTop: '8px' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' },
  badge: { display: 'inline-block', padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', letterSpacing: '0.5px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' },
  sectionCard: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px' },
  sectionTitle: { fontSize: '18px', fontWeight: '800', color: '#fff', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' },
  infoList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  infoItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '14px', gap: '16px' },
  infoValue: { textAlign: 'right', maxWidth: '70%', wordBreak: 'break-word', whiteSpace: 'normal' },
  divider: { height: '1px', background: 'var(--border)', margin: '10px 0' },
  emptyHistorial: { color: 'var(--text-muted)', textAlign: 'center', padding: '24px' },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '14px 16px', fontSize: '13px' }
};
