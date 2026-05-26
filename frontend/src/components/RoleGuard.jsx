import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Componente para proteger elementos visuales basados en roles.
 * Ejemplo:
 * <RoleGuard roles={['owner']}>
 *   <button>Eliminar</button>
 * </RoleGuard>
 */
export function RoleGuard({ roles, children, fallback = null }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return fallback;
  }

  return <>{children}</>;
}
