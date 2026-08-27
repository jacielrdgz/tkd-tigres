import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiShield,
  FiUsers,
  FiDollarSign,
  FiClock,
  FiFileText,
  FiTrendingUp,
  FiCreditCard,
  FiSettings,
  FiRefreshCw,
  FiActivity,
  FiCheckCircle,
  FiArrowRight
} from 'react-icons/fi';
import { getCache, setCache } from '../../utils/cacheManager';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(() => {
    const cached = getCache('admin_dashboard_metrics');
    return cached?.data || {
      academias_activas: 0,
      total_alumnos: 0,
      ingresos_mes: 0,
      academias_por_vencer: 0,
      solicitudes_pendientes: 0,
      nuevas_academias_este_mes: 0,
    };
  });
  const [loading, setLoading] = useState(() => {
    const cached = getCache('admin_dashboard_metrics');
    return !cached?.data;
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.is_superadmin) {
      navigate('/');
      return;
    }
    fetchMetrics();
  }, [user, navigate]);

  const fetchMetrics = async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const res = await api.get('/admin/dashboard');
      setMetrics(res.data);
      setCache('admin_dashboard_metrics', res.data);
    } catch (err) {
      const cached = getCache('admin_dashboard_metrics');
      if (!cached?.data) {
        toast.error('Error al cargar métricas del sistema');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '12px' }}>
          Cargando panel de control global...
        </p>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Academias Activas',
      value: metrics.academias_activas,
      icon: <FiShield size={24} />,
      color: '#3b82f6',
      bgGlow: 'rgba(59, 130, 246, 0.12)',
      borderGlow: 'rgba(59, 130, 246, 0.25)',
      link: '/admin/academias',
      subtext: 'Escuelas registradas'
    },
    {
      label: 'Alumnos en el Sistema',
      value: metrics.total_alumnos.toLocaleString(),
      icon: <FiUsers size={24} />,
      color: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.12)',
      borderGlow: 'rgba(16, 185, 129, 0.25)',
      link: '/admin/usuarios',
      subtext: 'Practicantes activos'
    },
    {
      label: 'Ingresos del Mes',
      value: `$${metrics.ingresos_mes.toLocaleString()}`,
      icon: <FiDollarSign size={24} />,
      color: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.12)',
      borderGlow: 'rgba(245, 158, 11, 0.25)',
      link: '/admin/suscripciones',
      subtext: 'Recaudación licencias'
    },
    {
      label: 'Vencen en 7 Días',
      value: metrics.academias_por_vencer,
      icon: <FiClock size={24} />,
      color: '#ef4444',
      bgGlow: 'rgba(239, 68, 68, 0.12)',
      borderGlow: 'rgba(239, 68, 68, 0.25)',
      link: '/admin/suscripciones?filter=expiring',
      subtext: 'Requieren renovación'
    },
    {
      label: 'Solicitudes Pendientes',
      value: metrics.solicitudes_pendientes,
      icon: <FiFileText size={24} />,
      color: '#8b5cf6',
      bgGlow: 'rgba(139, 92, 246, 0.12)',
      borderGlow: 'rgba(139, 92, 246, 0.25)',
      link: '/admin/solicitudes',
      subtext: 'Por validar y autorizar'
    },
    {
      label: 'Nuevas este Mes',
      value: metrics.nuevas_academias_este_mes,
      icon: <FiTrendingUp size={24} />,
      color: '#06b6d4',
      bgGlow: 'rgba(6, 182, 212, 0.12)',
      borderGlow: 'rgba(6, 182, 212, 0.25)',
      link: '/admin/academias',
      subtext: 'Crecimiento mensual'
    },
  ];

  const quickActions = [
    {
      to: '/admin/solicitudes',
      icon: <FiFileText size={22} />,
      color: '#8b5cf6',
      title: 'Aprobar Solicitudes',
      desc: 'Ver registros de academias pendientes de validación',
    },
    {
      to: '/admin/academias',
      icon: <FiShield size={22} />,
      color: '#3b82f6',
      title: 'Gestión de Academias',
      desc: 'Supervisar estadísticas, suspender o activar escuelas',
    },
    {
      to: '/admin/suscripciones',
      icon: <FiCreditCard size={22} />,
      color: '#10b981',
      title: 'Cobros y Planes',
      desc: 'Renovar vigencia o cambiar costos de licencias',
    },
    {
      to: '/admin/configuracion',
      icon: <FiSettings size={22} />,
      color: '#f59e0b',
      title: 'Configuración Global',
      desc: 'Definir precios por defecto y parámetros del sistema',
    },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.headerIconBadge}>
              <FiActivity size={22} color="var(--accent-blue)" />
            </div>
            <h1 style={styles.title}>Panel de Control Global</h1>
          </div>
          <p style={styles.subtitle}>Supervisión de todo el ecosistema TKD Tigres</p>
        </div>
        <button
          style={styles.btnRefresh}
          onClick={fetchMetrics}
          disabled={refreshing}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--accent-blue)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <FiRefreshCw
            size={14}
            style={{
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
              color: 'var(--accent-blue)',
            }}
          />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={styles.grid}>
        {kpis.map((kpi, idx) => (
          <Link
            key={idx}
            to={kpi.link}
            style={styles.card}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = kpi.borderGlow;
              e.currentTarget.style.boxShadow = `0 8px 24px ${kpi.bgGlow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div
              style={{
                ...styles.cardIconBox,
                background: kpi.bgGlow,
                color: kpi.color,
                border: `1px solid ${kpi.borderGlow}`,
              }}
            >
              {kpi.icon}
            </div>
            <div style={styles.cardContent}>
              <div style={styles.cardLabel}>{kpi.label}</div>
              <div style={styles.cardValue}>{kpi.value}</div>
              <div style={styles.cardSubtext}>{kpi.subtext}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Acciones de Administración Rápida</h3>
          <span style={styles.sectionBadge}>SuperAdmin Tools</span>
        </div>
        <div style={styles.actionsGrid}>
          {quickActions.map((act, i) => (
            <Link
              key={i}
              to={act.to}
              style={styles.actionBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = act.color;
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.boxShadow = `0 6px 20px ${act.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--bg-primary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  ...styles.actionIcon,
                  background: `${act.color}15`,
                  color: act.color,
                  border: `1px solid ${act.color}30`,
                }}
              >
                {act.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.actionTitle}>{act.title}</div>
                <p style={styles.actionDesc}>{act.desc}</p>
              </div>
              <FiArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
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
    marginBottom: '32px',
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
  btnRefresh: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '9px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'pointer',
  },
  cardIconBox: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    marginBottom: '4px',
  },
  cardValue: {
    fontSize: '26px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    lineHeight: '1.1',
  },
  cardSubtext: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  sectionCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  sectionBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--accent-blue)',
    background: 'var(--accent-blue-bg)',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid rgba(59, 130, 246, 0.2)',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '14px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    textDecoration: 'none',
    color: 'var(--text-primary)',
    transition: 'all 0.2s ease',
  },
  actionIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '2px',
  },
  actionDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: '1.3',
  },
};
