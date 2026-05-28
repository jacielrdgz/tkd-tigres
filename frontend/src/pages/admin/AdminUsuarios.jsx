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

  useEffect(() => {
    fetchAcademias();
    fetchUsuarios();
  }, [roleFilter, tenantFilter, statusFilter]);

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
                              title="Cambiar Rol"
                            >
                              🛡️ Rol
                            </button>
                            <button
                              onClick={() => handleOpenPasswordModal(u)}
                              style={styles.btnPassword}
                              title="Restablecer Contraseña"
                            >
                              🔑 Contraseña
                            </button>
                            <button
                              onClick={() => handleToggleSuspension(u)}
                              style={u.is_suspended ? styles.btnActivar : styles.btnSuspender}
                              title={u.is_suspended ? 'Activar cuenta' : 'Suspender cuenta'}
                            >
                              {u.is_suspended ? '✔️ Activar' : '🚫 Suspender'}
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
              <button style={styles.btnClose} onClick={() => setShowPasswordModal(false)}>×</button>
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
                <button type="button" style={styles.btnCancel} onClick={() => setShowPasswordModal(false)}>Cancelar</button>
                <button type="submit" style={styles.btnSubmit} disabled={procesando}>
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
              <button style={styles.btnClose} onClick={() => setShowRoleModal(false)}>×</button>
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
                <button type="button" style={styles.btnCancel} onClick={() => setShowRoleModal(false)}>Cancelar</button>
                <button type="submit" style={styles.btnSubmit} disabled={procesando}>
                  {procesando ? 'Procesando...' : 'Actualizar Rol'}
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
  
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  btnRole: { padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  btnPassword: { padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  btnActivar: { padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  btnSuspender: { padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' },
  modal: { background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', width: '450px', maxWidth: '90vw', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden' },
  modalHeader: { padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 },
  modalSubtitle: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' },
  btnClose: { background: 'none', border: 'none', fontSize: '24px', color: 'var(--text-muted)', cursor: 'pointer' },
  modalBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  input: { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#fff', fontSize: '14px', outline: 'none' },
  modalFooter: { padding: '20px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  btnCancel: { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' },
  btnSubmit: { background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '800', cursor: 'pointer' }
};
