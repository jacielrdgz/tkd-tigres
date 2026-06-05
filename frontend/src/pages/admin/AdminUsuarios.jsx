import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [academias, setAcademias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form inputs
  const [newPassword, setNewPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('secretario');
  const [procesando, setProcesando] = useState(false);
  const [showEscuelaModal, setShowEscuelaModal] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');

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
    } catch (err) {
      console.error('Error al cargar academias para filtro:', err);
    }
  };

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (tenantFilter) params.tenant_id = tenantFilter;
      if (statusFilter) params.estado = statusFilter;

      const res = await api.get('/admin/usuarios', { params });
      setUsuarios(res.data);
    } catch (err) {
      toast.error('Error al cargar la lista de usuarios');
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
      confirmButtonColor: user.is_suspended ? 'var(--accent-green)' : 'var(--accent-red)',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await api.post(`/admin/usuarios/${user.id}/toggle-suspension`);
          toast.success(res.data.message || `Usuario actualizado correctamente`);
          fetchUsuarios();
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
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setProcesando(true);
    try {
      await api.post(`/admin/usuarios/${selectedUser.id}/reset-password`, {
        password: newPassword
      });
      toast.success('Contraseña restablecida con éxito');
      setShowPasswordModal(false);
    } catch (err) {
      toast.error('Error al restablecer la contraseña');
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
      await api.post(`/admin/usuarios/${selectedUser.id}/role`, {
        role: selectedRole
      });
      toast.success('Rol de usuario actualizado');
      setShowRoleModal(false);
      fetchUsuarios();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar el rol');
    } finally {
      setProcesando(false);
    }
  };

  const handleDeleteUser = (user) => {
    Swal.fire({
      title: '¿Eliminar usuario permanentemente?',
      html: `<p>Se eliminará la cuenta de <strong>${user.name}</strong> (${user.email}).</p><p style="color:#ef4444;font-weight:bold;">Esta acción no se puede deshacer.</p>`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await api.delete(`/admin/usuarios/${user.id}`);
          toast.success(res.data.message || 'Usuario eliminado');
          fetchUsuarios();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al eliminar usuario');
        }
      }
    });
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
        tenant_id: selectedTenantId
      });
      toast.success(res.data.message || 'Escuela actualizada');
      setShowEscuelaModal(false);
      fetchUsuarios();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar escuela');
    } finally {
      setProcesando(false);
    }
  };

  // Local client side search filter
  const filtered = usuarios.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.escuela_nombre.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role, isSuperadmin) => {
    if (isSuperadmin) {
      return <span style={{ ...styles.badge, background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>SuperAdmin</span>;
    }
    const badges = {
      owner: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', text: 'Administrador' },
      instructor: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', text: 'Instructor' },
      secretario: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', text: 'Secretario' },
    };
    const b = badges[role] || { bg: 'rgba(255,255,255,0.05)', color: '#fff', text: role };
    return <span style={{ ...styles.badge, background: b.bg, color: b.color }}>{b.text}</span>;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestión de Usuarios</h1>
          <p style={styles.subtitle}>Administra los accesos, contraseñas y roles de todos los usuarios en el sistema</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={styles.filterBar}>
        <div style={styles.searchContainer}>
          <input
            style={styles.search}
            placeholder="🔍 Buscar por nombre, correo o academia..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={styles.filtersContainer}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Rol</label>
            <select
              style={styles.select}
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="">Todos los Roles</option>
              <option value="owner">Administrador (Owner)</option>
              <option value="instructor">Instructor</option>
              <option value="secretario">Secretario</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Academia</label>
            <select
              style={styles.select}
              value={tenantFilter}
              onChange={e => setTenantFilter(e.target.value)}
            >
              <option value="">Todas las Academias</option>
              {academias.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Estado</label>
            <select
              style={styles.select}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="suspendido">Suspendido</option>
            </select>
          </div>
        </div>
      </div>

      {/* USERS TABLE */}
      {loading ? (
        <div style={styles.loading}>Cargando usuarios de la plataforma...</div>
      ) : (
        <div style={styles.tableCard}>
          {filtered.length === 0 ? (
            <div style={styles.empty}>No se encontraron usuarios que coincidan con los filtros.</div>
          ) : (
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Usuario</th>
                    <th style={styles.th}>Academia / Escuela</th>
                    <th style={styles.th}>Rol</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Último Ingreso</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.userInfo}>
                          <strong>{u.name}</strong>
                          <span>{u.email}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={u.is_superadmin ? { color: 'var(--accent-purple)', fontWeight: 'bold' } : {}}>
                          {u.escuela_nombre}
                        </span>
                      </td>
                      <td style={styles.td}>{getRoleBadge(u.role, u.is_superadmin)}</td>
                      <td style={styles.td}>
                        {u.is_suspended ? (
                          <span style={{ ...styles.statusIndicator, background: '#ef4444' }}>Suspendido</span>
                        ) : (
                          <span style={{ ...styles.statusIndicator, background: '#22c55e' }}>Activo</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {u.last_login_at 
                          ? new Date(u.last_login_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                          : 'Sin ingresos'}
                      </td>
                      <td style={styles.td}>
                        {!u.is_superadmin ? (
                          <div style={styles.actions}>
                            <button
                              onClick={() => handleOpenRoleModal(u)}
                              style={styles.btnRole}
                              onMouseOver={e => {
                                e.currentTarget.style.background = '#a855f7';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(168,85,247,0.1)';
                                e.currentTarget.style.color = '#a855f7';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Cambiar Rol"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleOpenPasswordModal(u)}
                              style={styles.btnPassword}
                              onMouseOver={e => {
                                e.currentTarget.style.background = '#f59e0b';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(245,158,11,0.1)';
                                e.currentTarget.style.color = '#f59e0b';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Restablecer Contraseña"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleToggleSuspension(u)}
                              style={u.is_suspended ? styles.btnActivar : styles.btnSuspender}
                              onMouseOver={e => {
                                if (u.is_suspended) {
                                  e.currentTarget.style.background = '#22c55e';
                                  e.currentTarget.style.color = 'white';
                                } else {
                                  e.currentTarget.style.background = '#f97316';
                                  e.currentTarget.style.color = 'white';
                                }
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseOut={e => {
                                if (u.is_suspended) {
                                  e.currentTarget.style.background = 'rgba(34,197,94,0.1)';
                                  e.currentTarget.style.color = '#22c55e';
                                } else {
                                  e.currentTarget.style.background = 'rgba(249,115,22,0.1)';
                                  e.currentTarget.style.color = '#f97316';
                                }
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title={u.is_suspended ? 'Activar cuenta' : 'Suspender cuenta'}
                            >
                              {u.is_suspended ? (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"/>
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenEscuelaModal(u)}
                              style={styles.btnEscuela}
                              onMouseOver={e => {
                                e.currentTarget.style.background = '#3b82f6';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(59,130,246,0.1)';
                                e.currentTarget.style.color = '#3b82f6';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Cambiar Escuela"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              style={styles.btnEliminar}
                              onMouseOver={e => {
                                e.currentTarget.style.background = '#ef4444';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                                e.currentTarget.style.color = '#ef4444';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Eliminar usuario"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>Sin acciones</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {showPasswordModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Restablecer Contraseña</h3>
                <p style={styles.modalSubtitle}>Modificando credenciales para: <strong>{selectedUser?.name}</strong></p>
              </div>
              <button 
                style={styles.btnClose} 
                onClick={() => setShowPasswordModal(false)}
                onMouseOver={e => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'scale(1.15)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >×</button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nueva Contraseña</label>
                  <input
                    type="password"
                    style={styles.input}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button 
                  type="button" 
                  style={styles.btnCancel} 
                  onClick={() => setShowPasswordModal(false)}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >Cancelar</button>
                <button 
                  type="submit" 
                  style={styles.btnSubmit} 
                  disabled={procesando}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {procesando ? 'Procesando...' : 'Guardar Nueva Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE CHANGE MODAL */}
      {showRoleModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Cambiar Rol de Usuario</h3>
                <p style={styles.modalSubtitle}>Asigna una nueva jerarquía para: <strong>{selectedUser?.name}</strong></p>
              </div>
              <button 
                style={styles.btnClose} 
                onClick={() => setShowRoleModal(false)}
                onMouseOver={e => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'scale(1.15)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >×</button>
            </div>
            <form onSubmit={handleRoleSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Selecciona el Rol</label>
                  <select
                    style={styles.input}
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value)}
                    required
                  >
                    <option value="owner">Administrador (Owner)</option>
                    <option value="instructor">Instructor</option>
                    <option value="secretario">Secretario</option>
                  </select>
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button 
                  type="button" 
                  style={styles.btnCancel} 
                  onClick={() => setShowRoleModal(false)}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >Cancelar</button>
                <button 
                  type="submit" 
                  style={styles.btnSubmit} 
                  disabled={procesando}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {procesando ? 'Procesando...' : 'Actualizar Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHOOL CHANGE MODAL */}
      {showEscuelaModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Cambiar Escuela / Academia</h3>
                <p style={styles.modalSubtitle}>Reasignando a: <strong>{selectedUser?.name}</strong></p>
              </div>
              <button 
                style={styles.btnClose} 
                onClick={() => setShowEscuelaModal(false)}
                onMouseOver={e => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'scale(1.15)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >×</button>
            </div>
            <form onSubmit={handleEscuelaSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Selecciona la Academia</label>
                  <select
                    style={styles.input}
                    value={selectedTenantId}
                    onChange={e => setSelectedTenantId(e.target.value)}
                    required
                  >
                    <option value="">-- Seleccionar --</option>
                    {academias.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
                {selectedUser?.tenant_id && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                    Escuela actual: <strong>{selectedUser.escuela_nombre}</strong>
                  </p>
                )}
              </div>
              <div style={styles.modalFooter}>
                <button 
                  type="button" 
                  style={styles.btnCancel} 
                  onClick={() => setShowEscuelaModal(false)}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >Cancelar</button>
                <button 
                  type="submit" 
                  style={styles.btnSubmit} 
                  disabled={procesando}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {procesando ? 'Procesando...' : 'Guardar Cambio'}
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
  
  filterBar: { 
    display: 'flex', 
    flexWrap: 'wrap', 
    gap: '20px', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    marginBottom: '24px' 
  },
  searchContainer: { flex: '1 1 300px', maxWidth: '450px' },
  search: { width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none' },
  
  filtersContainer: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  filterLabel: { fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  select: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 16px', color: '#fff', fontSize: '13px', outline: 'none', minWidth: '150px', cursor: 'pointer' },
  
  tableCard: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  empty: { padding: '50px', textAlign: 'center', color: 'var(--text-muted)' },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.2s' },
  td: { padding: '16px 24px', fontSize: '14px', verticalAlign: 'middle' },
  
  userInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' },
  statusIndicator: { display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', color: '#fff' },
  
  actions: { display: 'flex', gap: '6px', flexWrap: 'nowrap' },
  btnRole: { width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.1)', color: '#a855f7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
  btnPassword: { width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
  btnActivar: { width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
  btnSuspender: { width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.1)', color: '#f97316', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
  btnEscuela: { width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
  btnEliminar: { width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' },
  modal: { background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', width: '450px', maxWidth: '90vw', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden' },
  modalHeader: { padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 },
  modalSubtitle: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' },
  btnClose: { background: 'none', border: 'none', fontSize: '24px', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' },
  modalBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  input: { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#fff', fontSize: '14px', outline: 'none' },
  modalFooter: { padding: '20px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  btnCancel: { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  btnSubmit: { background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }
};
