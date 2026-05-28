import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function SuperDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendientes, setPendientes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    action_type: 'new', // 'new' | 'existing'
    nombre_escuela: '',
    tenant_id: '',
    role: 'owner', // Default to Administrador (owner)
  });

  useEffect(() => {
    if (!user?.is_superadmin) {
      navigate('/');
      return;
    }
    fetchPendientes();
    fetchTenants();
  }, [user, navigate]);

  const fetchPendientes = async () => {
    try {
      const res = await api.get('/superadmin/pendientes');
      setPendientes(res.data);
    } catch (err) {
      toast.error('Error al cargar solicitudes pendientes');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await api.get('/superadmin/tenants');
      setTenants(res.data);
    } catch (err) {
      console.error('Error al cargar escuelas existentes', err);
    }
  };

  const abrirModalAprobacion = (u) => {
    setSelectedUser(u);
    setForm({
      action_type: 'new',
      nombre_escuela: u.escuela_solicitada || '',
      tenant_id: tenants[0]?.id || '',
      role: 'owner', // Administrador por defecto
    });
    setShowModal(true);
  };

  const handleConfirmarAprobacion = async (e) => {
    e.preventDefault();
    if (form.action_type === 'new' && !form.nombre_escuela.trim()) {
      toast.error('Por favor, ingresa el nombre de la escuela.');
      return;
    }
    if (form.action_type === 'existing' && !form.tenant_id) {
      toast.error('Por favor, selecciona una escuela existente.');
      return;
    }

    setProcesando(selectedUser.id);
    try {
      await api.post(`/superadmin/aprobar/${selectedUser.id}`, {
        action_type: form.action_type,
        nombre_escuela: form.nombre_escuela,
        tenant_id: form.tenant_id,
        role: form.role
      });
      toast.success('¡Solicitud aprobada y escuela asignada!');
      setShowModal(false);
      fetchPendientes();
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aprobar');
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazar = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta solicitud permanentemente?')) return;

    setProcesando(id);
    try {
      await api.delete(`/superadmin/rechazar/${id}`);
      toast.info('Solicitud rechazada.');
      fetchPendientes();
    } catch (err) {
      toast.error('Error al rechazar');
    } finally {
      setProcesando(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', color: '#fff' }}>Cargando panel global...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Panel de Administrador Global</h1>
          <p style={styles.subtitle}>Gestión de todo el ecosistema SaaS</p>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📝</div>
          <div style={styles.statInfo}>
            <div style={styles.statLabel}>Solicitudes Pendientes</div>
            <div style={styles.statValue}>{pendientes.length}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🏫</div>
          <div style={styles.statInfo}>
            <div style={styles.statLabel}>Escuelas Registradas</div>
            <div style={styles.statValue}>{tenants.length}</div>
          </div>
        </div>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h2 style={styles.tableTitle}>Nuevas Solicitudes de Escuelas</h2>
        </div>

        {pendientes.length === 0 ? (
          <div style={styles.emptyState}>
            No hay solicitudes pendientes en este momento.
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nombre del Contacto</th>
                  <th style={styles.th}>Escuela Solicitada</th>
                  <th style={styles.th}>Correo Electrónico</th>
                  <th style={styles.th}>Fecha de Solicitud</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((p) => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={styles.avatarMini}>{p.name.charAt(0).toUpperCase()}</div>
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontStyle: p.escuela_solicitada ? 'normal' : 'italic', color: p.escuela_solicitada ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {p.escuela_solicitada || 'No especificada'}
                      </span>
                    </td>
                    <td style={styles.td}>{p.email}</td>
                    <td style={styles.td}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <div style={styles.actionsBox}>
                        <button
                          style={styles.btnAprobar}
                          onClick={() => abrirModalAprobacion(p)}
                          disabled={procesando === p.id}
                          title="Aprobar y crear/asignar escuela"
                        >
                          {procesando === p.id ? '⏳' : '✅ Aprobar'}
                        </button>
                        <button
                          style={styles.btnRechazar}
                          onClick={() => handleRechazar(p.id)}
                          disabled={procesando === p.id}
                          title="Rechazar y eliminar"
                        >
                          {procesando === p.id ? '⏳' : '❌'}
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

      {/* MODAL DE APROBACIÓN */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Aprobar Solicitud</h3>
                <p style={styles.modalSubtitle}>Asigna escuela y rol para: <strong>{selectedUser?.name}</strong></p>
              </div>
              <button style={styles.btnClose} onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleConfirmarAprobacion}>
              <div style={styles.modalBody}>
                
                {/* Tipo de Acción (Crear escuela vs Asignar a existente) */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Asignación de Escuela</label>
                  <div style={styles.radioGroup}>
                    <div 
                      style={{
                        ...styles.radioOption,
                        borderColor: form.action_type === 'new' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)',
                        background: form.action_type === 'new' ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.02)',
                      }}
                      onClick={() => setForm({ ...form, action_type: 'new' })}
                    >
                      <input 
                        type="radio" 
                        id="action-new" 
                        name="action_type" 
                        checked={form.action_type === 'new'} 
                        onChange={() => {}} // handled by onClick
                        style={{ cursor: 'pointer' }}
                      />
                      <label htmlFor="action-new" style={styles.radioLabel}>Nueva Escuela</label>
                    </div>
                    <div 
                      style={{
                        ...styles.radioOption,
                        borderColor: form.action_type === 'existing' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)',
                        background: form.action_type === 'existing' ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.02)',
                      }}
                      onClick={() => setForm({ ...form, action_type: 'existing' })}
                    >
                      <input 
                        type="radio" 
                        id="action-existing" 
                        name="action_type" 
                        checked={form.action_type === 'existing'} 
                        onChange={() => {}} // handled by onClick
                        style={{ cursor: 'pointer' }}
                      />
                      <label htmlFor="action-existing" style={styles.radioLabel}>Escuela Existente</label>
                    </div>
                  </div>
                </div>

                {/* Campos condicionales de escuela */}
                {form.action_type === 'new' ? (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre de la Nueva Escuela</label>
                    <input 
                      style={styles.input} 
                      value={form.nombre_escuela} 
                      onChange={e => setForm({ ...form, nombre_escuela: e.target.value })}
                      placeholder="Ej. Leones Oriente Do"
                      required
                    />
                  </div>
                ) : (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Selecciona Escuela Existente</label>
                    <select 
                      style={styles.input} 
                      value={form.tenant_id} 
                      onChange={e => setForm({ ...form, tenant_id: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>[ID: {t.id}] — {t.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Selector de Rol */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Rol a Asignar</label>
                  <select 
                    style={styles.input} 
                    value={form.role} 
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    required
                  >
                    <option value="owner">Administrador (Owner)</option>
                    <option value="instructor">Instructor</option>
                    <option value="secretario">Secretario</option>
                  </select>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Por defecto se recomienda rol <strong>Administrador</strong> para fundadores de escuela.
                  </p>
                </div>

              </div>
              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnCancel} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" style={styles.btnSubmit} disabled={procesando !== null}>
                  {procesando ? 'Procesando...' : 'Aprobar e Iniciar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    color: 'var(--text-primary)',
  },
  header: {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    background: 'linear-gradient(145deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.8) 100%)',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid rgba(51,65,85,0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  statIcon: {
    width: '60px',
    height: '60px',
    background: 'rgba(59,130,246,0.1)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    border: '1px solid rgba(59,130,246,0.2)',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#fff',
    lineHeight: '1',
  },
  tableCard: {
    background: 'var(--bg-secondary)',
    borderRadius: '20px',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-md)',
  },
  tableHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.02)',
  },
  tableTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '15px',
  },
  tableResponsive: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '16px 24px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(0,0,0,0.1)',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.2s',
  },
  td: {
    padding: '16px 24px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    verticalAlign: 'middle',
  },
  avatarMini: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--accent-blue)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  actionsBox: {
    display: 'flex',
    gap: '8px',
  },
  btnAprobar: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(34, 197, 94, 0.1)',
    color: '#22c55e',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  btnRechazar: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  // Estilos del Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
  },
  modal: {
    background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    width: '500px',
    maxWidth: '90vw',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '24px 24px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#fff',
    margin: 0,
  },
  modalSubtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  btnClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '800',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  input: {
    width: '100%',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '12px 14px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  radioGroup: {
    display: 'flex',
    gap: '12px',
  },
  radioOption: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  radioLabel: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#fff',
    cursor: 'pointer',
  },
  modalFooter: {
    padding: '20px 24px',
    background: 'rgba(0,0,0,0.2)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  btnCancel: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    padding: '12px 20px',
    color: 'var(--text-secondary)',
    fontWeight: '700',
    cursor: 'pointer',
  },
  btnSubmit: {
    background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontWeight: '800',
    cursor: 'pointer',
  }
};
