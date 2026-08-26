import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import {
  FiSettings,
  FiCreditCard,
  FiAlertTriangle,
  FiMail,
  FiSave,
  FiCheck,
  FiSliders,
  FiLock
} from 'react-icons/fi';

export default function AdminConfiguracion() {
  const [config, setConfig] = useState({
    precio_plan_mensual: 500.0,
    dias_trial: 30,
    correo_bienvenida_texto: '',
    correo_rechazo_texto: '',
    modo_mantenimiento: false,
    modo_mantenimiento_mensaje: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/admin/configuracion');
      setConfig({
        precio_plan_mensual: parseFloat(res.data.precio_plan_mensual) || 500.0,
        dias_trial: parseInt(res.data.dias_trial) || 30,
        correo_bienvenida_texto: res.data.correo_bienvenida_texto || '',
        correo_rechazo_texto: res.data.correo_rechazo_texto || '',
        modo_mantenimiento: !!res.data.modo_mantenimiento,
        modo_mantenimiento_mensaje: res.data.modo_mantenimiento_mensaje || '',
      });
    } catch {
      toast.error('Error al cargar la configuración global');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleMaintenanceToggle = (e) => {
    const isChecked = e.target.checked;

    if (isChecked) {
      Swal.fire({
        title: '¿Activar Modo Mantenimiento?',
        text: 'Esto bloqueará el acceso a todos los usuarios de las academias de inmediato. Solo tú (SuperAdmin) podrás acceder al sistema.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, activar mantenimiento',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'var(--accent-red)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
      }).then((result) => {
        if (result.isConfirmed) {
          setConfig((prev) => ({ ...prev, modo_mantenimiento: true }));
        } else {
          e.target.checked = false;
        }
      });
    } else {
      setConfig((prev) => ({ ...prev, modo_mantenimiento: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dataToSend = {
        ...config,
        precio_plan_mensual: parseFloat(config.precio_plan_mensual),
        dias_trial: parseInt(config.dias_trial),
        modo_mantenimiento: config.modo_mantenimiento ? 1 : 0,
      };

      const res = await api.post('/admin/configuracion', dataToSend);
      toast.success(res.data.message || 'Configuración guardada con éxito');

      if (res.data.config) {
        setConfig({
          precio_plan_mensual: parseFloat(res.data.config.precio_plan_mensual) || 500.0,
          dias_trial: parseInt(res.data.config.dias_trial) || 30,
          correo_bienvenida_texto: res.data.config.correo_bienvenida_texto || '',
          correo_rechazo_texto: res.data.config.correo_rechazo_texto || '',
          modo_mantenimiento: !!res.data.config.modo_mantenimiento,
          modo_mantenimiento_mensaje: res.data.config.modo_mantenimiento_mensaje || '',
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '12px' }}>
          Cargando configuración...
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.headerIconBadge}>
              <FiSettings size={22} color="var(--accent-blue)" />
            </div>
            <h1 style={styles.title}>Configuración Global</h1>
          </div>
          <p style={styles.subtitle}>Ajustes, costos y políticas para todo el ecosistema multi-tenant</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.formLayout}>
        {/* PANEL IZQUIERDO */}
        <div style={styles.column}>
          {/* LICENCIA Y PLANES */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ ...styles.cardIconBox, background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>
                <FiCreditCard size={18} />
              </div>
              <h2 style={styles.cardTitle}>Suscripciones y Periodo de Prueba</h2>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Costo del Plan Mensual (MXN)</label>
                <div style={styles.inputWithAddon}>
                  <span style={styles.addon}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    name="precio_plan_mensual"
                    style={styles.inputAddonField}
                    value={config.precio_plan_mensual}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <small style={styles.helpText}>Precio base cobrado mensualmente por el uso del sistema.</small>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Días de Periodo de Prueba (Trial)</label>
                <input
                  type="number"
                  name="dias_trial"
                  style={styles.input}
                  value={config.dias_trial}
                  onChange={handleInputChange}
                  required
                />
                <small style={styles.helpText}>Días de acceso gratuito para nuevas academias al ser aprobadas.</small>
              </div>
            </div>
          </div>

          {/* MANTENIMIENTO */}
          <div
            style={{
              ...styles.card,
              border: config.modo_mantenimiento ? '1px solid var(--accent-red)' : '1px solid var(--border)',
            }}
          >
            <div style={styles.cardHeader}>
              <div style={{ ...styles.cardIconBox, background: 'rgba(239, 68, 68, 0.12)', color: 'var(--accent-red)' }}>
                <FiAlertTriangle size={18} />
              </div>
              <h2 style={styles.cardTitle}>Modo Mantenimiento</h2>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.toggleRow}>
                <div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px' }}>Activar Mantenimiento</strong>
                  <p style={styles.helpText}>Bloquea el acceso a todas las academias de forma temporal.</p>
                </div>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    style={styles.switchInput}
                    checked={config.modo_mantenimiento}
                    onChange={handleMaintenanceToggle}
                  />
                  <span
                    style={{
                      ...styles.slider,
                      background: config.modo_mantenimiento ? 'var(--accent-red)' : 'var(--bg-tertiary)',
                    }}
                  >
                    <span
                      style={{
                        ...styles.sliderKnob,
                        transform: config.modo_mantenimiento ? 'translateX(24px)' : 'translateX(0px)',
                      }}
                    />
                  </span>
                </label>
              </div>

              {config.modo_mantenimiento && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Mensaje de Bloqueo</label>
                  <textarea
                    name="modo_mantenimiento_mensaje"
                    style={styles.textarea}
                    rows="3"
                    value={config.modo_mantenimiento_mensaje}
                    onChange={handleInputChange}
                    placeholder="El sistema se encuentra en mantenimiento programado..."
                  />
                  <small style={styles.helpText}>Este texto será mostrado a los usuarios cuando intenten ingresar.</small>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div style={styles.column}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ ...styles.cardIconBox, background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc' }}>
                <FiMail size={18} />
              </div>
              <h2 style={styles.cardTitle}>Plantillas de Correo</h2>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Mensaje de Bienvenida / Aprobación</label>
                <textarea
                  name="correo_bienvenida_texto"
                  style={styles.textarea}
                  rows="4"
                  value={config.correo_bienvenida_texto}
                  onChange={handleInputChange}
                  placeholder="¡Felicidades! Tu academia ha sido aprobada exitosamente..."
                />
                <small style={styles.helpText}>Se enviará al administrador cuando su cuenta sea aprobada.</small>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Mensaje de Rechazo</label>
                <textarea
                  name="correo_rechazo_texto"
                  style={styles.textarea}
                  rows="4"
                  value={config.correo_rechazo_texto}
                  onChange={handleInputChange}
                  placeholder="Lamentamos informarte que tu solicitud no fue aceptada..."
                />
                <small style={styles.helpText}>Texto por defecto para solicitudes no autorizadas.</small>
              </div>
            </div>
          </div>
        </div>

        {/* BOTÓN GUARDAR */}
        <div style={styles.bottomBar}>
          <button
            type="submit"
            disabled={saving}
            style={{
              ...styles.btnSave,
              opacity: saving ? 0.7 : 1,
            }}
          >
            <FiSave size={16} />
            <span>{saving ? 'Guardando cambios...' : 'Guardar Configuración'}</span>
          </button>
        </div>
      </form>
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
  formLayout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '24px',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  card: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-md)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '18px 24px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-primary)',
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
  cardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  cardBody: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
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
  inputWithAddon: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  addon: {
    padding: '10px 14px',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-muted)',
    fontWeight: '700',
    fontSize: '13px',
    borderRight: '1px solid var(--border)',
  },
  inputAddonField: {
    flex: 1,
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  textarea: {
    padding: '10px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'vertical',
  },
  helpText: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    width: '52px',
    height: '28px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  switchInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  slider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '28px',
    transition: '0.2s',
    border: '1px solid var(--border)',
  },
  sliderKnob: {
    position: 'absolute',
    content: '""',
    height: '22px',
    width: '22px',
    left: '2px',
    bottom: '2px',
    backgroundColor: '#fff',
    borderRadius: '50%',
    transition: '0.2s ease',
    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
  },
  bottomBar: {
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  btnSave: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--accent-blue)',
    border: 'none',
    borderRadius: '10px',
    padding: '11px 24px',
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: 'var(--shadow-glow-blue)',
    transition: 'all 0.15s ease',
  },
};
