import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

export default function AdminSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    action_type: 'new',
    nombre_escuela: '',
    tenant_id: '',
    role: 'owner',
  });

  useEffect(() => {
    fetchSolicitudes();
    fetchTenants();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      const res = await api.get('/admin/solicitudes');
      setSolicitudes(res.data);
    } catch {
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await api.get('/admin/academias');
      setTenants(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const abrirAprobar = (u) => {
    setSelectedUser(u);
    setForm({
      action_type: 'new',
      nombre_escuela: u.escuela_solicitada || '',
      tenant_id: tenants[0]?.id || '',
      role: 'owner',
    });
    setShowModal(true);
  };

  const handleAprobarSubmit = async (e) => {
    e.preventDefault();
    if (form.action_type === 'new' && !form.nombre_escuela.trim()) {
      toast.error('Especifica el nombre de la escuela');
      return;
    }
    if (form.action_type === 'existing' && !form.tenant_id) {
      toast.error('Selecciona una escuela existente');
      return;
    }

    setProcesando(selectedUser.id);
    try {
      await api.post(`/admin/solicitudes/${selectedUser.id}/aprobar`, form);
      toast.success('¡Solicitud aprobada con éxito!');
      setShowModal(false);
      fetchSolicitudes();
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aprobar');
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazar = (u) => {
    Swal.fire({
      title: 'Rechazar Solicitud',
      text: `Ingresa el motivo del rechazo para enviar por correo a ${u.name}:`,
      input: 'textarea',
      inputPlaceholder: 'Ej. No pudimos verificar la autenticidad de tu dojo...',
      inputAttributes: {
        'aria-label': 'Escribe el motivo aquí'
      },
      showCancelButton: true,
      confirmButtonText: 'Declinar Registro',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
      inputValidator: (value) => {
        if (!value) {
          return '¡Debes escribir un motivo de rechazo!';
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        setProcesando(u.id);
        try {
          await api.post(`/admin/solicitudes/${u.id}/rechazar`, { motivo: result.value });
          toast.info('Solicitud declinada e email enviado.');
          fetchSolicitudes();
        } catch {
          toast.error('Error al rechazar');
        } finally {
          setProcesando(null);
        }
      }
    });
  };

  if (loading) {
    return <div style={styles.loading}>Cargando solicitudes...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Solicitudes de Registro</h1>
          <p style={styles.subtitle}>Valida y aprueba cuentas de nuevas academias</p>
        </div>
      </div>

      <div style={styles.tableCard}>
        {solicitudes.length === 0 ? (
          <div style={styles.empty}>No hay solicitudes pendientes en este momento.</div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Contacto</th>
                  <th style={styles.th}>Escuela Solicitada</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Fecha Solicitud</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map(s => (
                  <tr key={s.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={styles.avatarMini}>{s.name.charAt(0).toUpperCase()}</div>
                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <strong style={{ color: s.escuela_solicitada ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {s.escuela_solicitada || 'No especificada'}
                      </strong>
                    </td>
                    <td style={styles.td}>{s.email}</td>
                    <td style={styles.td}>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          onClick={() => abrirAprobar(s)}
                          disabled={procesando === s.id}
                          style={styles.btnAprobar}
                        >
                          {procesando === s.id ? '⏳' : '✅ Aprobar'}
                        </button>
                        <button
                          onClick={() => handleRechazar(s)}
                          disabled={procesando === s.id}
                          style={styles.btnRechazar}
                        >
                          {procesando === s.id ? '⏳' : '❌ Rechazar'}
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

      {/* APPROVAL MODAL */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Aprobar Academia</h3>
                <p style={styles.modalSubtitle}>Asigna escuela y rol para: <strong>{selectedUser?.name}</strong></p>
              </div>
              <button style={styles.btnClose} onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleAprobarSubmit}>
              <div style={styles.modalBody}>
                
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
                      <input type="radio" checked={form.action_type === 'new'} onChange={() => {}} />
                      <label style={styles.radioLabel}>Nueva Escuela</label>
                    </div>
                    <div 
                      style={{
                        ...styles.radioOption,
                        borderColor: form.action_type === 'existing' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)',
                        background: form.action_type === 'existing' ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.02)',
                      }}
                      onClick={() => setForm({ ...form, action_type: 'existing' })}
                    >
                      <input type="radio" checked={form.action_type === 'existing'} onChange={() => {}} />
                      <label style={styles.radioLabel}>Asignar a Existente</label>
                    </div>
                  </div>
                </div>

                {form.action_type === 'new' ? (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nombre de la Nueva Escuela</label>
                    <input 
                      style={styles.input} 
                      value={form.nombre_escuela} 
                      onChange={e => setForm({ ...form, nombre_escuela: e.target.value })}
                      placeholder="Ej. Tigres Do Central"
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

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Rol de Acceso Inicial</label>
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
                </div>

              </div>
              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnCancel} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" style={styles.btnSubmit} disabled={procesando !== null}>
                  {procesando ? 'Procesando...' : 'Aprobar y Enviar Correo'}
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
  container: { padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' },
  loading: { padding: '60px', textAlign: 'center', color: 'var(--text-muted)' },
  header: { marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' },
  tableCard: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  empty: { padding: '50px', textAlign: 'center', color: 'var(--text-muted)' },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '16px 24px', fontSize: '14px', verticalAlign: 'middle' },
  avatarMini: { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' },
  actions: { display: 'flex', gap: '8px' },
  btnAprobar: { padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' },
  btnRechazar: { padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' },
  modal: { background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', width: '500px', maxWidth: '90vw', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden' },
  modalHeader: { padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '20px', fontWeight: '800', color: '#fff', margin: 0 },
  modalSubtitle: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' },
  btnClose: { background: 'none', border: 'none', fontSize: '24px', color: 'var(--text-muted)', cursor: 'pointer' },
  modalBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  input: { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#fff', fontSize: '14px', outline: 'none' },
  radioGroup: { display: 'flex', gap: '12px' },
  radioOption: { flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' },
  radioLabel: { fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer' },
  modalFooter: { padding: '20px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  btnCancel: { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' },
  btnSubmit: { background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '800', cursor: 'pointer' }
};
