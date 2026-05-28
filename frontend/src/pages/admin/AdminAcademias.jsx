import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';

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

  const filtered = academias.filter(a =>
    a.nombre.toLowerCase().includes(search.toLowerCase()) ||
    a.owner_name.toLowerCase().includes(search.toLowerCase()) ||
    a.owner_email.toLowerCase().includes(search.toLowerCase())
  );

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
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestión de Academias</h1>
          <p style={styles.subtitle}>Supervisa, activa, suspende o elimina escuelas asociadas</p>
        </div>
      </div>

      <div style={styles.filterBar}>
        <input
          style={styles.search}
          placeholder="🔍 Buscar por escuela, dueño o correo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={styles.loading}>Cargando academias del sistema...</div>
      ) : (
        <div style={styles.tableCard}>
          {filtered.length === 0 ? (
            <div style={styles.empty}>No se encontraron academias.</div>
          ) : (
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Academia</th>
                    <th style={styles.th}>Dueño / Contacto</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Alumnos</th>
                    <th style={styles.th}>Último Acceso</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.schoolInfo}>
                          <strong>{a.nombre}</strong>
                          <span>ID: {a.id} · Registro: {a.fecha_registro}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.schoolInfo}>
                          <strong>{a.owner_name}</strong>
                          <span>{a.owner_email}</span>
                        </div>
                      </td>
                      <td style={styles.td}>{getStatusBadge(a.suscripcion_estado, a.is_suspended)}</td>
                      <td style={styles.td}>👥 {a.alumnos_registrados}</td>
                      <td style={styles.td}>
                        {a.ultimo_acceso ? new Date(a.ultimo_acceso).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Sin ingresos'}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <Link to={`/admin/academias/${a.id}`} style={styles.btnLink} title="Ver detalle">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          </Link>
                          {a.is_suspended || a.suscripcion_estado === 'suspendida' ? (
                            <button onClick={() => handleActivar(a.id)} style={styles.btnActivar} title="Reactivar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </button>
                          ) : (
                            <button onClick={() => handleSuspender(a.id, a.nombre)} style={styles.btnSuspender} title="Suspender">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                            </button>
                          )}
                          <button onClick={() => handleEliminar(a.id, a.nombre)} style={styles.btnDelete} title="Eliminar permanentemente">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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
  container: { padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' },
  loading: { padding: '60px', textAlign: 'center', color: 'var(--text-muted)' },
  header: { marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' },
  filterBar: { marginBottom: '24px' },
  search: { width: '100%', maxWidth: '400px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' },
  tableCard: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  empty: { padding: '40px', textAlign: 'center', color: 'var(--text-muted)' },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.2s' },
  td: { padding: '16px 24px', fontSize: '14px', verticalAlign: 'middle' },
  schoolInfo: { display: 'flex', flexDirection: 'column', gap: '3px' },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' },
  actions: { display: 'flex', gap: '10px' },
  btnLink: { background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textDecoration: 'none', color: '#fff' },
  btnActivar: { background: 'rgba(34,197,94,0.1)', border: 'none', color: '#22c55e', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnSuspender: { background: 'rgba(245,158,11,0.1)', border: 'none', color: '#f59e0b', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnDelete: { background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
