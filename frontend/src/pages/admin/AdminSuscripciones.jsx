import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';

export default function AdminSuscripciones() {
  const [suscripciones, setSuscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterMes, setFilterMes] = useState('');
  
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
          mes_vencimiento: filterMes
        }
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
      meses: 1
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
      monto: item.suscripcion_monto || 500
    });
    setShowPlanModal(true);
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    setProcesando(true);
    try {
      await api.post(`/admin/suscripciones/${selectedAcademia.id}/plan`, planForm);
      toast.success('Plan modificado con éxito');
      setShowPlanModal(false);
      fetchSuscripciones();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al modificar plan');
    } finally {
      setProcesando(false);
    }
  };

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

  const meses = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Control de Suscripciones</h1>
          <p style={styles.subtitle}>Supervisa fechas de vigencia, pagos de licencias y planes activos</p>
        </div>
      </div>

      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Estado:</label>
          <select style={styles.select} value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="trial">Trial</option>
            <option value="activa">Activa</option>
            <option value="cancelada">Vencida</option>
            <option value="suspendida">Suspendida</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Mes de Vencimiento:</label>
          <select style={styles.select} value={filterMes} onChange={e => setFilterMes(e.target.value)}>
            <option value="">Cualquier mes</option>
            {meses.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Cargando información de suscripciones...</div>
      ) : (
        <div style={styles.tableCard}>
          {suscripciones.length === 0 ? (
            <div style={styles.empty}>No se encontraron registros de suscripción.</div>
          ) : (
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Academia</th>
                    <th style={styles.th}>Plan</th>
                    <th style={styles.th}>Costo Pactado</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Vence el</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suscripciones.map(s => {
                    const isExpiring = s.dias_restantes >= 0 && s.dias_restantes <= 7 && s.suscripcion_estado !== 'suspendida' && !s.is_suspended;
                    return (
                      <tr 
                        key={s.id} 
                        style={{
                          ...styles.tr,
                          borderLeft: isExpiring ? '4px solid var(--accent-red)' : 'none',
                          background: isExpiring ? 'rgba(239,68,68,0.02)' : 'transparent'
                        }}
                      >
                        <td style={styles.td}>
                          <div style={styles.schoolInfo}>
                            <strong>{s.nombre}</strong>
                            {isExpiring && <span style={styles.warningText}>⚠️ Vence en {s.dias_restantes} días</span>}
                          </div>
                        </td>
                        <td style={{ ...styles.td, textTransform: 'uppercase', fontWeight: 'bold' }}>{s.plan}</td>
                        <td style={{ ...styles.td, color: 'var(--accent-green)', fontWeight: 'bold' }}>${s.suscripcion_monto.toLocaleString()}</td>
                        <td style={styles.td}>{getStatusBadge(s.suscripcion_estado, s.is_suspended)}</td>
                        <td style={styles.td}>{s.suscripcion_hasta || 'Indefinido'}</td>
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <button onClick={() => abrirRenovar(s)} style={styles.btnAction} title="Renovar suscripción">💳 Renovar</button>
                            <button onClick={() => abrirCambiarPlan(s)} style={styles.btnActionSecondary} title="Cambiar plan/costo">⚙️ Cambiar Plan</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RENOVAR MODAL */}
      {showRenovarModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Renovar Suscripción</h3>
                <p style={styles.modalSubtitle}>Amplía vigencia para: <strong>{selectedAcademia?.nombre}</strong></p>
              </div>
              <button style={styles.btnClose} onClick={() => setShowRenovarModal(false)}>×</button>
            </div>
            <form onSubmit={handleRenovarSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Meses a Extender</label>
                  <select 
                    style={styles.input} 
                    value={renovarForm.meses} 
                    onChange={e => setRenovarForm({ ...renovarForm, meses: parseInt(e.target.value) })}
                    required
                  >
                    {[1, 2, 3, 6, 12].map(m => (
                      <option key={m} value={m}>{m} {m === 1 ? 'Mes' : 'Meses'}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Monto a Cobrar ($)</label>
                  <input 
                    type="number"
                    style={styles.input} 
                    value={renovarForm.monto} 
                    onChange={e => setRenovarForm({ ...renovarForm, monto: parseFloat(e.target.value) })}
                    required
                    min="0"
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnCancel} onClick={() => setShowRenovarModal(false)}>Cancelar</button>
                <button type="submit" style={styles.btnSubmit} disabled={procesando}>
                  {procesando ? 'Procesando...' : 'Confirmar Renovación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMBIAR PLAN MODAL */}
      {showPlanModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Modificar Plan de Academia</h3>
                <p style={styles.modalSubtitle}>Ajusta plan actual de: <strong>{selectedAcademia?.nombre}</strong></p>
              </div>
              <button style={styles.btnClose} onClick={() => setShowPlanModal(false)}>×</button>
            </div>
            <form onSubmit={handlePlanSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Plan</label>
                  <select 
                    style={styles.input} 
                    value={planForm.plan} 
                    onChange={e => setPlanForm({ ...planForm, plan: e.target.value })}
                    required
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Costo Mensual ($)</label>
                  <input 
                    type="number"
                    style={styles.input} 
                    value={planForm.monto} 
                    onChange={e => setPlanForm({ ...planForm, monto: parseFloat(e.target.value) })}
                    required
                    min="0"
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnCancel} onClick={() => setShowPlanModal(false)}>Cancelar</button>
                <button type="submit" style={styles.btnSubmit} disabled={procesando}>
                  {procesando ? 'Procesando...' : 'Guardar Cambios'}
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
  filterBar: { display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  filterLabel: { fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' },
  select: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', outline: 'none' },
  tableCard: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  empty: { padding: '40px', textAlign: 'center', color: 'var(--text-muted)' },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.2s' },
  td: { padding: '16px 24px', fontSize: '14px', verticalAlign: 'middle' },
  schoolInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  warningText: { fontSize: '12px', color: 'var(--accent-red)', fontWeight: '700' },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' },
  actions: { display: 'flex', gap: '10px' },
  btnAction: { background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  btnActionSecondary: { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' },
  modal: { background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', width: '450px', maxWidth: '90vw', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden' },
  modalHeader: { padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 },
  modalSubtitle: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' },
  btnClose: { background: 'none', border: 'none', fontSize: '24px', color: 'var(--text-muted)', cursor: 'pointer' },
  modalBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' },
  input: { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', outline: 'none' },
  modalFooter: { padding: '16px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  btnCancel: { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 18px', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' },
  btnSubmit: { background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: '800', cursor: 'pointer' }
};
