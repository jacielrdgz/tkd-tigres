import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    academias_activas: 0,
    total_alumnos: 0,
    ingresos_mes: 0,
    academias_por_vencer: 0,
    solicitudes_pendientes: 0,
    nuevas_academias_este_mes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_superadmin) {
      navigate('/');
      return;
    }
    fetchMetrics();
  }, [user, navigate]);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setMetrics(res.data);
    } catch (err) {
      toast.error('Error al cargar métricas del sistema');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Cargando panel global...</div>;
  }

  const kpis = [
    { label: 'Academias Activas', value: metrics.academias_activas, icon: '🏫', color: 'var(--accent-blue)', link: '/admin/academias' },
    { label: 'Alumnos en el Sistema', value: metrics.total_alumnos.toLocaleString(), icon: '👥', color: '#10b981', link: '/admin/usuarios' },
    { label: 'Ingresos del Mes', value: `$${metrics.ingresos_mes.toLocaleString()}`, icon: '💰', color: 'var(--accent-green)', link: '/admin/suscripciones' },
    { label: 'Vencen en 7 Días', value: metrics.academias_por_vencer, icon: '⏳', color: 'var(--accent-red)', link: '/admin/suscripciones?filter=expiring' },
    { label: 'Solicitudes Pendientes', value: metrics.solicitudes_pendientes, icon: '📝', color: 'var(--accent-purple)', link: '/admin/solicitudes' },
    { label: 'Nuevas este Mes', value: metrics.nuevas_academias_este_mes, icon: '✨', color: '#06b6d4', link: '/admin/academias' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Panel de Control Global</h1>
          <p style={styles.subtitle}>Supervisión de todo el ecosistema GymCloud</p>
        </div>
        <button style={styles.btnRefresh} onClick={fetchMetrics} title="Recargar métricas">🔄 Actualizar</button>
      </div>

      <div style={styles.grid}>
        {kpis.map((kpi, idx) => (
          <Link key={idx} to={kpi.link} style={styles.card}>
            <div style={{ ...styles.cardIconBox, background: `${kpi.color}15`, color: kpi.color, border: `1px solid ${kpi.color}30` }}>
              {kpi.icon}
            </div>
            <div style={styles.cardContent}>
              <div style={styles.cardLabel}>{kpi.label}</div>
              <div style={styles.cardValue}>{kpi.value}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={styles.row}>
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Acciones de Administración Rápida</h3>
          <div style={styles.actionsGrid}>
            <Link to="/admin/solicitudes" style={styles.actionBtn}>
              <span style={styles.actionIcon}>📝</span>
              <div>
                <strong>Aprobar Solicitudes</strong>
                <p>Ver registros de academias pendientes de validación</p>
              </div>
            </Link>
            <Link to="/admin/academias" style={styles.actionBtn}>
              <span style={styles.actionIcon}>🏫</span>
              <div>
                <strong>Gestión de Academias</strong>
                <p>Ver estadísticas, suspender o activar tenants</p>
              </div>
            </Link>
            <Link to="/admin/suscripciones" style={styles.actionBtn}>
              <span style={styles.actionIcon}>💳</span>
              <div>
                <strong>Cobros y Planes</strong>
                <p>Renovar vigencia o cambiar costos de licencias</p>
              </div>
            </Link>
            <Link to="/admin/configuracion" style={styles.actionBtn}>
              <span style={styles.actionIcon}>⚙️</span>
              <div>
                <strong>Configuración Global</strong>
                <p>Definir precios por defecto y correos del sistema</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' },
  loading: { padding: '60px', textAlign: 'center', color: 'var(--text-muted)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' },
  title: { fontSize: '32px', fontWeight: '900', letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '15px', marginTop: '6px' },
  btnRefresh: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 18px', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' },
  
  card: { display: 'flex', alignItems: 'center', gap: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', textDecoration: 'none', transition: 'transform 0.2s, border-color 0.2s', boxShadow: 'var(--shadow-sm)' },
  cardIconBox: { width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 },
  cardContent: { flex: 1, minWidth: 0 },
  cardLabel: { fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '4px' },
  cardValue: { fontSize: '28px', fontWeight: '900', color: '#fff' },

  row: { display: 'grid', gridTemplateColumns: '1fr', gap: '24px' },
  sectionCard: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', padding: '28px' },
  sectionTitle: { fontSize: '18px', fontWeight: '800', color: '#fff', marginBottom: '20px' },
  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' },
  actionBtn: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '16px', textDecoration: 'none', color: 'var(--text-primary)', transition: 'all 0.2s' },
  actionIcon: { fontSize: '24px', width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};
