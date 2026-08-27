import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import {
  FiUsers,
  FiSearch,
  FiKey,
  FiUserCheck,
  FiHome,
  FiSlash,
  FiCheckCircle,
  FiTrash2,
  FiX,
  FiCheck,
  FiLock,
  FiShield
} from 'react-icons/fi';
import CustomDropdown from '../../components/Common/CustomDropdown';
import { getCache, setCache, invalidateCache } from '../../utils/cacheManager';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState(() => {
    const cached = getCache('admin_usuarios_all');
    return cached || [];
  });
  const [academias, setAcademias] = useState(() => {
    const cached = getCache('admin_academias_lista');
    return cached || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = getCache('admin_usuarios_all');
    return !cached;
  });
  const [search, setSearch] = useState('');

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showEscuelaModal, setShowEscuelaModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form inputs
  const [newPassword, setNewPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('secretario');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    fetchAcademias();
    fetchUsuarios();
  }, [roleFilter, tenantFilter, statusFilter]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowPasswordModal(false);
        setShowRoleModal(false);
        setShowEscuelaModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const fetchAcademias = async () => {
    try {
      const res = await api.get('/admin/academias');
      setAcademias(res.data);
      setCache('admin_academias_lista', res.data);
    } catch (err) {
      console.error('Error al cargar academias para filtro:', err);
    }
  };

  const fetchUsuarios = async (force = false) => {
    const currentKey = `admin_usuarios_${roleFilter}_${tenantFilter}_${statusFilter}`;
    if (force || !getCache(currentKey)) {
      setLoading(true);
    }
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (tenantFilter) params.tenant_id = tenantFilter;
      if (statusFilter) params.estado = statusFilter;

      const res = await api.get('/admin/usuarios', { params });
      setUsuarios(res.data);
      setCache(currentKey, res.data);
      if (!roleFilter && !tenantFilter && !statusFilter) {
        setCache('admin_usuarios_all', res.data);
      }
    } catch (err) {
      const cached = getCache(currentKey);
      if (!cached?.data) {
        toast.error('Error al cargar la lista de usuarios');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSuspension = (user) => {
    const actionText = user.is_suspended ? 'reactivar' : 'suspender';

    Swal.fire({
      title: `¿${actionText.charAt(0).toUpperCase() + actionText.slice(1)} usuario?`,
      text: `¿Estás seguro de que deseas ${actionText} la cuenta de ${user.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Sí, ${actionText}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: user.is_suspended ? 'var(--accent-green)' : 'var(--accent-red)',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await api.post(`/admin/usuarios/${user.id}/toggle-suspension`);
          toast.success(res.data.message || `Usuario actualizado correctamente`);
          invalidateCache('admin_');
          fetchUsuarios(true);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al cambiar estado de suspensión');
        }
      }
    });
  };

  const handleOpenPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setProcesando(true);
    try {
      const res = await api.post(`/admin/usuarios/${selectedUser.id}/forzar-password`, {
        password: newPassword,
      });
      toast.success(res.data.message || 'Contraseña actualizada');
      setShowPasswordModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setProcesando(false);
    }
  };

  const handleOpenRoleModal = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.role || 'secretario');
    setShowRoleModal(true);
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setProcesando(true);
    try {
      const res = await api.post(`/admin/usuarios/${selectedUser.id}/cambiar-rol`, {
        role: selectedRole,
      });
      toast.success(res.data.message || 'Rol actualizado');
      setShowRoleModal(false);
      invalidateCache('admin_');
      fetchUsuarios(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar rol');
    } finally {
      setProcesando(false);
    }
  };

  const handleOpenEscuelaModal = (user) => {
    setSelectedUser(user);
    setSelectedTenantId(user.tenant_id || '');
    setShowEscuelaModal(true);
  };

  const handleEscuelaSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTenantId) {
      toast.error('Selecciona una academia');
      return;
    }
    setProcesando(true);
    try {
      const res = await api.post(`/admin/usuarios/${selectedUser.id}/cambiar-escuela`, {
        tenant_id: selectedTenantId,
      });
      toast.success(res.data.message || 'Escuela actualizada');
      setShowEscuelaModal(false);
      invalidateCache('admin_');
      fetchUsuarios(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar escuela');
    } finally {
      setProcesando(false);
    }
  };

  const filtered = usuarios.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.escuela_nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role, isSuperadmin) => {
    if (isSuperadmin) {
      return (
        <span style={{ ...styles.badge, background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
          SuperAdmin
        </span>
      );
    }
    const badges = {
      owner: { bg: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', text: 'Administrador' },
      instructor: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', text: 'Instructor' },
      secretario: { bg: 'var(--accent-green-bg)', color: 'var(--accent-green)', text: 'Secretario' },
    };
    const b = badges[role] || { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', text: role };
    return <span style={{ ...styles.badge, background: b.bg, color: b.color }}>{b.text}</span>;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.headerIconBadge}>
              <FiUsers size={22} color="var(--accent-blue)" />
            </div>
            <h1 style={styles.title}>Gestión de Usuarios Globales</h1>
          </div>
          <p style={styles.subtitle}>Supervisa accesos, contraseñas, roles y vinculaciones de escuelas</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={styles.filterBar}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={styles.searchWrapper}>
            <FiSearch size={15} style={styles.searchIcon} />
            <input
              style={styles.search}
              placeholder="Buscar por usuario o escuela..."
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
            label="Todos los Roles"
            options={[
              { value: '', label: 'Todos los Roles' },
              { value: 'owner', label: 'Administrador (Owner)' },
              { value: 'instructor', label: 'Instructor' },
              { value: 'secretario', label: 'Secretario' },
            ]}
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
            minWidth="170px"
          />

          <CustomDropdown
            label="Todas las Academias"
            options={[
              { value: '', label: 'Todas las Academias' },
              ...academias.map((a) => ({ value: String(a.id), label: a.nombre })),
            ]}
            value={tenantFilter}
            onChange={(val) => setTenantFilter(val)}
            minWidth="180px"
          />

          <CustomDropdown
            label="Todos los Estados"
            options={[
              { value: '', label: 'Todos los Estados' },
              { value: 'activo', label: 'Cuentas Activas' },
              { value: 'suspendido', label: 'Cuentas Suspendidas' },
            ]}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            minWidth="170px"
          />
        </div>

        <span style={styles.counterText}>
          {filtered.length} usuario{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Table Card */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '12px' }}>
            Cargando usuarios del sistema...
          </p>
        </div>
      ) : (
        <div style={styles.tableCard}>
          {filtered.length === 0 ? (
            <div style={styles.empty}>No se encontraron usuarios con los filtros aplicados.</div>
          ) : (
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Usuario</th>
                    <th style={styles.th}>Academia Asignada</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Rol</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Estado</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      style={styles.tr}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={styles.td}>
                        <div style={styles.userInfo}>
                          <span style={styles.userName}>{u.name}</span>
                          <span style={styles.userEmail}>{u.email}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.schoolInfo}>
                          <span style={styles.schoolName}>{u.escuela_nombre || 'Sin Escuela Asignada'}</span>
                          {u.tenant_id && <span style={styles.schoolMeta}>Tenant ID: #{u.tenant_id}</span>}
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {getRoleBadge(u.role, u.is_superadmin)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {u.is_suspended ? (
                          <span style={{ ...styles.badge, background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>
                            SUSPENDIDO
                          </span>
                        ) : (
                          <span style={{ ...styles.badge, background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
                            ACTIVO
                          </span>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => handleOpenPasswordModal(u)}
                            style={styles.btnActionBlue}
                            title="Forzar nueva contraseña"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#3b82f6';
                              e.currentTarget.style.color = '#ffffff';
                              e.currentTarget.style.transform = 'scale(1.15)';
                              e.currentTarget.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                              e.currentTarget.style.color = 'var(--accent-blue)';
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <FiKey size={14} />
                          </button>
                          {!u.is_superadmin && (
                            <>
                              <button
                                onClick={() => handleOpenRoleModal(u)}
                                style={styles.btnActionYellow}
                                title="Cambiar rol"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#f59e0b';
                                  e.currentTarget.style.color = '#ffffff';
                                  e.currentTarget.style.transform = 'scale(1.15)';
                                  e.currentTarget.style.boxShadow = '0 0 12px rgba(245, 158, 11, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                                  e.currentTarget.style.color = 'var(--accent-yellow)';
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <FiUserCheck size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenEscuelaModal(u)}
                                style={styles.btnActionPurple}
                                title="Reasignar a otra escuela"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#a855f7';
                                  e.currentTarget.style.color = '#ffffff';
                                  e.currentTarget.style.transform = 'scale(1.15)';
                                  e.currentTarget.style.boxShadow = '0 0 12px rgba(168, 85, 247, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)';
                                  e.currentTarget.style.color = '#c084fc';
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <FiHome size={14} />
                              </button>
                              <button
                                onClick={() => handleToggleSuspension(u)}
                                style={u.is_suspended ? styles.btnActionGreen : styles.btnActionRed}
                                title={u.is_suspended ? 'Reactivar cuenta' : 'Suspender cuenta'}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = u.is_suspended ? '#22c55e' : '#ef4444';
                                  e.currentTarget.style.color = '#ffffff';
                                  e.currentTarget.style.transform = 'scale(1.15)';
                                  e.currentTarget.style.boxShadow = u.is_suspended
                                    ? '0 0 12px rgba(34, 197, 94, 0.4)'
                                    : '0 0 12px rgba(239, 68, 68, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = u.is_suspended
                                    ? 'rgba(16, 185, 129, 0.1)'
                                    : 'rgba(239, 68, 68, 0.1)';
                                  e.currentTarget.style.color = u.is_suspended
                                    ? 'var(--accent-green)'
                                    : 'var(--accent-red)';
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                {u.is_suspended ? <FiCheckCircle size={14} /> : <FiSlash size={14} />}
                              </button>
                            </>
                          )}
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

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div style={styles.overlay} onClick={() => setShowPasswordModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Forzar Contraseña</h3>
                <p style={styles.modalSubtitle}>
                  Usuario: <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
                </p>
              </div>
              <button style={styles.btnClose} onClick={() => setShowPasswordModal(false)}>
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nueva Contraseña Temporal</label>
                  <input
                    type="password"
                    style={styles.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres..."
                    required
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowPasswordModal(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={procesando} style={styles.btnPrimary}>
                  <FiCheck size={15} />
                  <span>{procesando ? 'Guardando...' : 'Actualizar Contraseña'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE MODAL */}
      {showRoleModal && (
        <div style={styles.overlay} onClick={() => setShowRoleModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Cambiar Rol de Usuario</h3>
                <p style={styles.modalSubtitle}>
                  Usuario: <strong>{selectedUser?.name}</strong>
                </p>
              </div>
              <button style={styles.btnClose} onClick={() => setShowRoleModal(false)}>
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleRoleSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Selecciona el Nuevo Rol</label>
                  <select
                    style={styles.selectModal}
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <option value="owner">Dueño / Administrador (Owner)</option>
                    <option value="instructor">Instructor</option>
                    <option value="secretario">Secretario / Recepción</option>
                  </select>
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowRoleModal(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={procesando} style={styles.btnPrimary}>
                  <FiCheck size={15} />
                  <span>{procesando ? 'Guardando...' : 'Confirmar Rol'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHOOL MODAL */}
      {showEscuelaModal && (
        <div style={styles.overlay} onClick={() => setShowEscuelaModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Reasignar Academia</h3>
                <p style={styles.modalSubtitle}>
                  Usuario: <strong>{selectedUser?.name}</strong>
                </p>
              </div>
              <button style={styles.btnClose} onClick={() => setShowEscuelaModal(false)}>
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleEscuelaSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Selecciona la Nueva Academia</label>
                  <select
                    style={styles.selectModal}
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {academias.map((a) => (
                      <option key={a.id} value={a.id}>
                        [ID: #{a.id}] — {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowEscuelaModal(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={procesando} style={styles.btnPrimary}>
                  <FiCheck size={15} />
                  <span>{procesando ? 'Guardando...' : 'Reasignar Academia'}</span>
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
  userEmail: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
  },
  schoolInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  schoolName: {
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontSize: '13px',
  },
  schoolMeta: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
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
  btnActionBlue: {
    background: 'rgba(59, 130, 246, 0.1)',
    color: 'var(--accent-blue)',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnActionYellow: {
    background: 'rgba(245, 158, 11, 0.1)',
    color: 'var(--accent-yellow)',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnActionPurple: {
    background: 'rgba(168, 85, 247, 0.1)',
    color: '#a855f7',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnActionGreen: {
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--accent-green)',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnActionRed: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--accent-red)',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
