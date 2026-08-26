import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import {
  FiFileText,
  FiCheck,
  FiX,
  FiClock,
  FiMail,
  FiUser,
  FiMapPin,
  FiSearch,
  FiLayers
} from 'react-icons/fi';
import { formatearFechaNatural } from '../../utils/dateHelper';

export default function AdminSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [search, setSearch] = useState('');

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

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
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
        'aria-label': 'Escribe el motivo aquí',
      },
      showCancelButton: true,
      confirmButtonText: 'Confirmar Rechazo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setProcesando(u.id);
        try {
          await api.post(`/admin/solicitudes/${u.id}/rechazar`, {
            motivo: result.value || 'No se cumplieron los requisitos para la apertura de la cuenta.',
          });
          toast.info('Solicitud rechazada');
          fetchSolicitudes();
        } catch {
          toast.error('Error al rechazar');
        } finally {
          setProcesando(null);
        }
      }
    });
  };

  const filtered = solicitudes.filter((s) =>
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.escuela_solicitada || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.headerIconBadge}>
              <FiFileText size={22} color="var(--accent-blue)" />
            </div>
            <h1 style={styles.title}>Solicitudes de Registro</h1>
          </div>
          <p style={styles.subtitle}>Valida y aprueba nuevas academias o cuentas pendientes de verificación</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchWrapper}>
          <FiSearch size={15} style={styles.searchIcon} />
          <input
            style={styles.search}
            placeholder="Buscar por solicitante, correo o escuela..."
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
          {filtered.length} solicitud{filtered.length === 1 ? '' : 'es'} pendiente{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Table Card */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '12px' }}>
            Cargando solicitudes...
          </p>
        </div>
      ) : (
        <div style={styles.tableCard}>
          {filtered.length === 0 ? (
            <div style={styles.empty}>
              <FiCheck size={36} color="var(--accent-green)" style={{ marginBottom: '10px' }} />
              <div>No hay solicitudes pendientes de validación por ahora.</div>
            </div>
          ) : (
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Solicitante</th>
                    <th style={styles.th}>Escuela Sugerida</th>
                    <th style={styles.th}>Contacto</th>
                    <th style={styles.th}>Fecha Solicitud</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      style={styles.tr}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={styles.td}>
                        <div style={styles.userInfo}>
                          <span style={styles.userName}>{s.name}</span>
                          <span style={styles.userRole}>Rol solicitado: Owner</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={styles.schoolBadge}>
                            {s.escuela_solicitada || 'Sin especificar'}
                          </span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.contactInfo}>
                          <span>{s.email}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>{s.telefono || 'Sin teléfono'}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateMeta}>
                          {formatearFechaNatural(s.created_at)}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => abrirAprobar(s)}
                            disabled={procesando === s.id}
                            style={styles.btnAprobar}
                            title="Aprobar y asignar escuela"
                          >
                            <FiCheck size={14} />
                            <span>{procesando === s.id ? 'Aprobando...' : 'Aprobar'}</span>
                          </button>
                          <button
                            onClick={() => handleRechazar(s)}
                            disabled={procesando === s.id}
                            style={styles.btnRechazar}
                            title="Rechazar solicitud"
                          >
                            <FiX size={14} />
                            <span>Rechazar</span>
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

      {/* APPROVAL MODAL */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Aprobar Academia</h3>
                <p style={styles.modalSubtitle}>
                  Asigna escuela y rol para: <strong>{selectedUser?.name}</strong>
                </p>
              </div>
              <button style={styles.btnClose} onClick={() => setShowModal(false)}>
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleAprobarSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Asignación de Escuela</label>
                  <div style={styles.radioGroup}>
                    <div
                      style={{
                        ...styles.radioOption,
                        borderColor: form.action_type === 'new' ? 'var(--accent-blue)' : 'var(--border)',
                        background: form.action_type === 'new' ? 'var(--accent-blue-bg)' : 'var(--bg-primary)',
                      }}
                      onClick={() => setForm({ ...form, action_type: 'new' })}
                    >
                      <input
                        type="radio"
                        checked={form.action_type === 'new'}
                        onChange={() => {}}
                        style={{ accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                      />
                      <label style={styles.radioLabel}>Nueva Escuela</label>
                    </div>
                    <div
                      style={{
                        ...styles.radioOption,
                        borderColor: form.action_type === 'existing' ? 'var(--accent-blue)' : 'var(--border)',
                        background: form.action_type === 'existing' ? 'var(--accent-blue-bg)' : 'var(--bg-primary)',
                      }}
                      onClick={() => setForm({ ...form, action_type: 'existing' })}
                    >
                      <input
                        type="radio"
                        checked={form.action_type === 'existing'}
                        onChange={() => {}}
                        style={{ accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                      />
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
                      onChange={(e) => setForm({ ...form, nombre_escuela: e.target.value })}
                      placeholder="Ej. TKD Tigres Central"
                      required
                    />
                  </div>
                ) : (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Selecciona Escuela Existente</label>
                    <select
                      style={styles.selectModal}
                      value={form.tenant_id}
                      onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar academia...</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          [ID: #{t.id}] — {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Rol en la Escuela</label>
                  <select
                    style={styles.selectModal}
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="owner">Dueño / Administrador de Escuela (Owner)</option>
                    <option value="instructor">Instructor</option>
                    <option value="secretario">Secretario / Recepcionista</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando === selectedUser?.id}
                  style={{
                    ...styles.btnPrimary,
                    opacity: procesando === selectedUser?.id ? 0.7 : 1,
                  }}
                >
                  <FiCheck size={15} />
                  <span>{procesando === selectedUser?.id ? 'Procesando...' : 'Confirmar Aprobación'}</span>
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
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
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  userName: {
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontSize: '14px',
  },
  userRole: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
  },
  schoolBadge: {
    background: 'var(--bg-tertiary)',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '12.5px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
  },
  dateMeta: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
  },
  actions: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  btnAprobar: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '7px 14px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    transition: 'all 0.15s ease',
  },
  btnRechazar: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--accent-red)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '520px',
    boxShadow: 'var(--shadow-xl)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
  },
  modalSubtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '4px',
    marginBottom: 0,
  },
  btnClose: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
  },
  modalBody: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12.5px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
  },
  radioGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  radioLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  input: {
    padding: '10px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  selectModal: {
    padding: '10px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg-primary)',
  },
  btnSecondary: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '9px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--accent-blue)',
    border: 'none',
    borderRadius: '10px',
    padding: '9px 18px',
    fontSize: '13px',
    fontWeight: '700',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: 'var(--shadow-glow-blue)',
  },
};
