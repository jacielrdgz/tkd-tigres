import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

export default function AdminConfiguracion() {
  const [config, setConfig] = useState({
    precio_plan_mensual: 500.00,
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
        precio_plan_mensual: parseFloat(res.data.precio_plan_mensual) || 500.00,
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
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
        confirmButtonColor: 'var(--accent-red)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
      }).then((result) => {
        if (result.isConfirmed) {
          setConfig(prev => ({ ...prev, modo_mantenimiento: true }));
        } else {
          // Reset toggle
          e.target.checked = false;
        }
      });
    } else {
      setConfig(prev => ({ ...prev, modo_mantenimiento: false }));
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
        modo_mantenimiento: config.modo_mantenimiento ? 1 : 0
      };

      const res = await api.post('/admin/configuracion', dataToSend);
      toast.success(res.data.message || 'Configuración guardada con éxito');
      
      // Update local state with returned config to ensure parity
      if (res.data.config) {
        setConfig({
          precio_plan_mensual: parseFloat(res.data.config.precio_plan_mensual) || 500.00,
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
    return <div style={styles.loading}>Cargando configuración...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Configuración Global</h1>
          <p style={styles.subtitle}>Ajustes y políticas para todo el ecosistema multi-tenant TKD Tigres</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.formLayout}>
        {/* PANEL IZQUIERDO: SUSCRIPCIONES Y MANTENIMIENTO */}
        <div style={styles.column}>
          
          {/* LICENCIA Y PLANES */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>💳</span>
              <h2 style={styles.cardTitle}>Suscripciones y Trial</h2>
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
          <div style={{ ...styles.card, border: config.modo_mantenimiento ? '1px solid var(--accent-red)' : '1px solid var(--border)' }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>⚠️</span>
              <h2 style={styles.cardTitle}>Modo Mantenimiento</h2>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.toggleRow}>
                <div>
                  <strong>Activar Mantenimiento</strong>
                  <p style={styles.helpText}>Bloquea el acceso a todas las academias de forma temporal.</p>
                </div>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    style={styles.switchInput}
                    checked={config.modo_mantenimiento}
                    onChange={handleMaintenanceToggle}
                  />
                  <span style={{
                    ...styles.slider,
                    background: config.modo_mantenimiento ? 'var(--accent-red)' : '#334155'
                  }}>
                    <span style={{
                      ...styles.sliderKnob,
                      transform: config.modo_mantenimiento ? 'translateX(24px)' : 'translateX(0px)'
                    }} />
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
                    placeholder="El sistema se encuentra en mantenimiento..."
                  />
                  <small style={styles.helpText}>Este texto será mostrado a los usuarios cuando intenten ingresar.</small>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* PANEL DERECHO: PLANTILLAS DE CORREO */}
        <div style={styles.column}>
          
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>✉️</span>
              <h2 style={styles.cardTitle}>Textos de Correos del Sistema</h2>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Texto de Bienvenida (Aprobación)</label>
                <textarea
                  name="correo_bienvenida_texto"
                  style={styles.textarea}
                  rows="4"
                  value={config.correo_bienvenida_texto}
                  onChange={handleInputChange}
                  placeholder="Escribe el mensaje de bienvenida..."
                />
                <small style={styles.helpText}>Enviado al aprobador de la solicitud. Indica que ya pueden acceder a su cuenta.</small>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Texto de Rechazo (Declinación)</label>
                <textarea
                  name="correo_rechazo_texto"
                  style={styles.textarea}
                  rows="4"
                  value={config.correo_rechazo_texto}
                  onChange={handleInputChange}
                  placeholder="Escribe el mensaje de rechazo..."
                />
                <small style={styles.helpText}>Enviado cuando se declina una solicitud. Se complementa con el motivo particular ingresado al rechazar.</small>
              </div>
            </div>
          </div>

          <div style={styles.submitContainer}>
            <button
              type="submit"
              style={styles.btnSave}
              disabled={saving}
            >
              {saving ? '⏳ Guardando Ajustes...' : '💾 Guardar Configuración'}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}

const styles = {
  container: { padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' },
  loading: { padding: '60px', textAlign: 'center', color: 'var(--text-muted)' },
  header: { marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' },

  formLayout: { display: 'flex', gap: '24px', flexWrap: 'wrap' },
  column: { flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '24px' },

  card: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', padding: '24px', boxShadow: 'var(--shadow-sm)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' },
  cardIcon: { fontSize: '20px' },
  cardTitle: { fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0 },
  cardBody: { display: 'flex', flexDirection: 'column', gap: '20px' },

  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  input: { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#fff', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' },
  textarea: { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#fff', fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' },
  helpText: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' },

  inputWithAddon: { display: 'flex', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)' },
  addon: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', borderRight: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' },
  inputAddonField: { flex: 1, border: 'none', background: 'transparent', padding: '12px 14px', color: '#fff', fontSize: '14px', outline: 'none' },

  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  
  // Custom switch toggle
  switch: { position: 'relative', display: 'inline-block', width: '50px', height: '26px' },
  switchInput: { opacity: 0, width: 0, height: 0 },
  slider: { 
    position: 'absolute', 
    cursor: 'pointer', 
    inset: 0, 
    borderRadius: '34px', 
    transition: '0.4s', 
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    padding: '3px'
  },
  sliderKnob: {
    height: '18px',
    width: '18px',
    background: '#fff',
    borderRadius: '50%',
    transition: '0.4s ease-in-out'
  },
  
  submitContainer: { display: 'flex', justifyContent: 'flex-end', marginTop: '12px' },
  btnSave: { 
    background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '12px', 
    padding: '14px 28px', 
    fontWeight: '800', 
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(59,130,246,0.2)'
  }
};
