import { useAuth } from '../context/AuthContext';

export function usePermissions() {
  const { isOwner, isSecretario, isInstructor } = useAuth();

  return {
    canDelete: isOwner,
    canCreate: isOwner || isSecretario,
    canEdit: isOwner || isSecretario,
    canViewPagos: isOwner || isSecretario,
    canViewReportes: isOwner,
    isOwner,
    isSecretario,
    isInstructor
  };
}
