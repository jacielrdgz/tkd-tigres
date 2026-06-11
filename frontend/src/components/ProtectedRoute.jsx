import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protege rutas que requieren autenticación.
 * Si el usuario no está autenticado, redirige a /login.
 * Muestra un spinner mientras verifica el token.
 */
export default function ProtectedRoute({ children, allowedRoles, requireSuperAdmin, requireTenant }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={s.container}>
        <div style={s.spinner} />
        <p style={s.text}>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si requiere ser superadmin y no lo es, redirige al home
  if (requireSuperAdmin && !user.is_superadmin) {
    return <Navigate to="/" replace />;
  }

  // Si requiere ser tenant (usuario de escuela) y es superadmin, redirige al panel global
  if (requireTenant && user.is_superadmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && !user.is_superadmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

const s = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f1117',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #1e2130',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  text: {
    color: '#64748b',
    fontSize: '14px',
  },
};
