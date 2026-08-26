import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  FiCreditCard,
  FiRepeat,
  FiSliders,
  FiCalendar,
  FiDollarSign,
  FiX,
  FiCheck,
  FiClock,
  FiSearch
} from 'react-icons/fi';
import { formatearFechaNatural } from '../../utils/dateHelper';
import CustomDropdown from '../../components/Common/CustomDropdown';

export default function AdminSuscripciones() {
  const [suscripciones, setSuscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [search, setSearch] = useState('');

  // Modales
  const [selectedAcademia, setSelectedAcademia] = useState(null);
  const [showRenovarModal, setShowRenovarModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Form states
  const [renovarForm, setRenovarForm] = useState({ monto: 500, meses: 1 });
  const [planForm, setPlanForm] = useState({ plan: 'pro', monto: 500 });

  useEffect(() => {
    fetchSuscripciones();
  }, [filterEstado, filterMes]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowRenovarModal(false);
        setShowPlanModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const fetchSuscripciones = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/suscripciones', {
        params: {
          estado: filterEstado,
          mes_vencimiento: filterMes,
        },
      });
      setSuscripciones(res.data);
    } catch {
      toast.error('Error al cargar suscripciones');
    } finally {
      setLoading(false);
    }
  };

  const abrirRenovar = (item) => {
    setSelectedAcademia(item);
    setRenovarForm({
      monto: item.suscripcion_monto || 500,
      meses: 1,
    });
    setShowRenovarModal(true);
  };

  const handleRenovarSubmit = async (e) => {
    e.preventDefault();
    setProcesando(true);
    try {
      await api.post(`/admin/suscripciones/${selectedAcademia.id}/renovar`, renovarForm);
      toast.success('Suscripción renovada correctamente');
      setShowRenovarModal(false);
      fetchSuscripciones();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al renovar');
    } finally {
      setProcesando(false);
    }
  };

  const abrirCambiarPlan = (item) => {
    setSelectedAcademia(item);
    setPlanForm({
      plan: item.plan || 'pro',
      monto: item.suscripcion_monto || 500,
    });
    setShowPlanModal(true);
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    setProcesando(true);
    try {
      await api.post(`/admin/suscripciones/${selectedAcademia.id}/plan`, planForm);
      toast.success('Plan y costo actualizados');
      setShowPlanModal(false);
      fetchSuscripciones();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar plan');
    } finally {
      setProcesando(false);
    }
  };

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
    const b = badges[estado] || { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', text: estado ? estado.toUpperCase() : 'PENDIENTE' };
    return <span style={{ ...styles.badge, background: b.bg, color: b.color }}>{b.text}</span>;
  };

  const meses = [
    { value: '', label: 'Cualquier mes' },
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  const filtered = suscripciones.filter((s) =>
    (s.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.owner_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.owner_email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.headerIconBadge}>
              <FiCreditCard size={22} color="var(--accent-blue)" />
            </div>
            <h1 style={styles.title}>Control de Suscripciones</h1>
          </div>
          <p style={styles.subtitle}>Supervisa fechas de vigencia, pagos de licencias y planes activos</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={styles.searchWrapper}>
            <FiSearch size={15} style={styles.searchIcon} />
            <input
              style={styles.search}
              placeholder="Buscar por academia..."
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

          <CustomDropdown
            label="Todos los estados"
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'trial', label: 'Trial' },
              { value: 'activa', label: 'Activa' },
              { value: 'cancelada', label: 'Vencida' },
              { value: 'suspendida', label: 'Suspendida' },
            ]}
            value={filterEstado}
            onChange={(val) => setFilterEstado(val)}
            minWidth="170px"
          />

          <CustomDropdown
            label="Cualquier mes"
            options={meses}
            value={filterMes}
            onChange={(val) => setFilterMes(val)}
            minWidth="170px"
          />
        </div>

        <span style={styles.counterText}>
          {filtered.length} registro{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Table Card */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '12px' }}>
            Cargando información de suscripciones...
          </p>
        </div>
      ) : (
        <div style={styles.tableCard}>
          {filtered.length === 0 ? (
            <div style={styles.empty}>No se encontraron registros de suscripción.</div>
          ) : (
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Academia</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Plan</th>
                    <th style={styles.th}>Costo Pactado</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Estado</th>
                    <th style={styles.th}>Vence el</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      style={styles.tr}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={styles.td}>
                        <div style={styles.schoolInfo}>
                          <span style={styles.schoolName}>{item.nombre}</span>
                          <span style={styles.schoolMeta}>
                            Dueño: {item.owner_name} · {item.owner_email}
                          </span>
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.planBadge}>{item.plan?.toUpperCase() || 'PRO'}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.priceMeta}>${item.suscripcion_monto || 500} MXN/mes</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {getStatusBadge(item.suscripcion_estado, item.is_suspended)}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateMeta}>
                          {item.suscripcion_vence
                            ? formatearFechaNatural(item.suscripcion_vence)
                            : 'Ilimitado / Sin vencimiento'}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => abrirRenovar(item)}
                            style={styles.btnRenovar}
                            title="Renovar meses de vigencia"
                          >
                            <FiRepeat size={13} />
                            <span>Renovar</span>
                          </button>
                          <button
                            onClick={() => abrirCambiarPlan(item)}
                            style={styles.btnPlan}
                            title="Ajustar plan o tarifa pactada"
                          >
                            <FiSliders size={13} />
                            <span>Plan</span>
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

      {/* RENEW MODAL */}
      {showRenovarModal && (
        <div style={styles.overlay} onClick={() => setShowRenovarModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Renovar Suscripción</h3>
                <p style={styles.modalSubtitle}>
                  Academia: <strong>{selectedAcademia?.nombre}</strong>
                </p>
              </div>
              <button style={styles.btnClose} onClick={() => setShowRenovarModal(false)}>
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleRenovarSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Meses a Extender</label>
                  <select
                    style={styles.selectModal}
                    value={renovarForm.meses}
                    onChange={(e) => setRenovarForm({ ...renovarForm, meses: parseInt(e.target.value) })}
                  >
                    <option value={1}>1 Mes (+30 días)</option>
                    <option value={3}>3 Meses (+90 días)</option>
                    <option value={6}>6 Meses (+180 días)</option>
                    <option value={12}>1 Año (+365 días)</option>
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Monto Recibido ($ MXN)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={renovarForm.monto}
                    onChange={(e) => setRenovarForm({ ...renovarForm, monto: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowRenovarModal(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={procesando} style={styles.btnPrimary}>
                  <FiCheck size={15} />
                  <span>{procesando ? 'Guardando...' : 'Aplicar Renovación'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLAN MODAL */}
      {showPlanModal && (
        <div style={styles.overlay} onClick={() => setShowPlanModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Cambiar Plan y Costo</h3>
                <p style={styles.modalSubtitle}>
                  Academia: <strong>{selectedAcademia?.nombre}</strong>
                </p>
              </div>
              <button style={styles.btnClose} onClick={() => setShowPlanModal(false)}>
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handlePlanSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Plan de Licencia</label>
                  <select
                    style={styles.selectModal}
                    value={planForm.plan}
                    onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })}
                  >
                    <option value="basic">Basic (Básico)</option>
                    <option value="pro">Pro (Recomendado)</option>
                    <option value="enterprise">Enterprise (Ilimitado)</option>
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Costo Mensual Pactado ($ MXN)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={planForm.monto}
                    onChange={(e) => setPlanForm({ ...planForm, monto: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowPlanModal(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={procesando} style={styles.btnPrimary}>
                  <FiCheck size={15} />
                  <span>{procesando ? 'Guardando...' : 'Guardar Cambios'}</span>
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
    minWidth: '220px',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  search: {
    width: '100%',
    padding: '9px 14px 9px 38px',
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
  planBadge: {
    background: 'var(--accent-blue-bg)',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '0.5px',
  },
  priceMeta: {
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontSize: '13.5px',
  },
  dateMeta: {
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.4px',
  },
  actions: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  btnRenovar: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    transition: 'all 0.15s ease',
  },
  btnPlan: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '7px 12px',
    fontSize: '12px',
    fontWeight: '600',
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
    maxWidth: '480px',
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
