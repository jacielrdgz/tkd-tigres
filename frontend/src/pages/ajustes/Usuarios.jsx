import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Usuarios() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tenants, setTenants] = useState([])

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'instructor',
    tenant_id: ''
  })

  const fetchUsuarios = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setUsuarios(data)
    } catch { toast.error('Error al cargar usuarios') }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsuarios()
    if (currentUser?.is_superadmin) {
      api.get('/admin/academias')
        .then(res => setTenants(res.data))
        .catch(err => console.error('Error al cargar escuelas', err))
    }
  }, [currentUser])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowModal(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const handleOpenModal = (user = null) => {
    if (user) {
      setSelected(user)
      setForm({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        tenant_id: user.tenant_id || ''
      })
    } else {
      setSelected(null)
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'instructor',
        tenant_id: tenants[0]?.id || ''
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.email || (!selected && !form.password)) {
      return toast.error('Faltan campos obligatorios')
    }

    setSaving(true)
    try {
      if (selected) {
        await api.put(`/users/${selected.id}`, form)
        toast.success('Usuario actualizado')
      } else {
        await api.post('/users', form)
        toast.success('Usuario creado correctamente')
      }
      setShowModal(false)
      fetchUsuarios()
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al procesar'
      toast.error(msg)
    } finally { setSaving(false) }
  }

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
          const res = await api.post(`/users/${user.id}/toggle-suspension`);
          toast.success(res.data.message || `Usuario actualizado correctamente`);
          fetchUsuarios();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Error al cambiar estado de suspensión');
        }
      }
    });
  };

  const handleDelete = (user) => {
    Swal.fire({
      title: '¿Eliminar acceso?',
      text: `El usuario ${user.name} ya no podrá entrar al sistema.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)', color: 'var(--text-primary)'
    }).then(async r => {
      if (r.isConfirmed) {
        try {
          await api.delete(`/users/${user.id}`)
          toast.success('Acceso eliminado')
          fetchUsuarios()
        } catch (err) {
          toast.error(err.response?.data?.message || 'No se pudo eliminar')
        }
      }
    })
  }

  const getRoleLabel = (u) => {
    if (u.is_superadmin) return 'SuperAdmin'
    const roles = {
      owner: 'Administrador',
      instructor: 'Instructor',
      secretario: 'Secretario'
    }
    return roles[u.role] || u.role
  }

  return (
    <div style={s.page}>
      <button style={s.btnBack} onClick={() => navigate('/ajustes')}>← Volver a ajustes</button>
      
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Usuarios y Roles</h2>
          <p style={s.subtitle}>Gestiona quién tiene acceso a tu academia y qué acciones puede realizar.</p>
        </div>
        <button style={s.btnAdd} onClick={() => handleOpenModal()}>+ Nuevo Usuario</button>
      </div>

      {loading ? <div style={s.loading}>Cargando equipo...</div> : (
        <div style={s.grid}>
          {usuarios.map(u => (
            <div key={u.id} style={s.card}>
              <div style={s.cardAvatar}>{u.name.charAt(0).toUpperCase()}</div>
              <div style={s.cardInfo}>
                <div style={s.cardName}>{u.name}</div>
                <div style={s.cardEmail}>{u.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <div style={s.cardRoleBadge}>{getRoleLabel(u)}</div>
                  {!!u.is_suspended && (
                    <span style={{ ...s.cardRoleBadge, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>SUSPENDIDO</span>
                  )}
                </div>
                {currentUser?.is_superadmin && (
                  <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    🏫 <strong>{u.tenant?.nombre || 'Global / Sistema'}</strong>
                    {u.tenant_id && <span style={{ marginLeft: '6px', color: 'var(--text-muted)' }}>(ID: {u.tenant_id})</span>}
                  </div>
                )}
                
                {/* Botones de acción alineados debajo */}
                <div style={s.cardActions}>
                  {u.id !== currentUser?.id && u.role !== 'owner' && (
                    <button
                      style={u.is_suspended ? s.btnActivar : s.btnSuspender}
                      onClick={() => handleToggleSuspension(u)}
                      title={u.is_suspended ? "Activar cuenta" : "Suspender cuenta"}
                    >
                      {u.is_suspended ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                      )}
                    </button>
                  )}
                  <button
                    style={s.btnEdit}
                    onClick={() => handleOpenModal(u)}
                    onMouseOver={e => {
                      e.currentTarget.style.background = '#3b82f6';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                      e.currentTarget.style.color = '#3b82f6';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Editar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button
                    style={s.btnDel}
                    onClick={() => handleDelete(u)}
                    onMouseOver={e => {
                      e.currentTarget.style.background = '#ef4444';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Borrar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{selected ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button style={s.btnClose} onClick={() => setShowModal(false)}>×</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.inputGroup}>
                <label style={s.label}>Nombre Completo</label>
                <input style={s.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej. Juan Pérez" />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Correo Electrónico</label>
                <input style={s.input} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="usuario@correo.com" />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Contraseña {selected && '(dejar en blanco para no cambiar)'}</label>
                <input style={s.input} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
              </div>
              {currentUser?.is_superadmin && (
                <div style={s.inputGroup}>
                  <label style={s.label}>Escuela / Dojo (Tenant)</label>
                  <select style={s.input} value={form.tenant_id} onChange={e => setForm({...form, tenant_id: e.target.value})}>
                    <option value="">Seleccionar escuela...</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>[ID: {t.id}] — {t.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={s.inputGroup}>
                <label style={s.label}>Rol en la Academia</label>
                <select style={s.input} value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="owner">Administrador</option>
                  <option value="instructor">Instructor</option>
                  <option value="secretario">Secretario</option>
                </select>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.btnCancel} onClick={() => setShowModal(false)}>Cancelar</button>
              <button style={s.btnSave} onClick={handleSave} disabled={saving}>{saving ? 'Procesando...' : 'Guardar Usuario'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { padding: '40px 24px', maxWidth: '1000px', margin: '0 auto' },
  btnBack: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', padding: '8px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', marginBottom: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 },
  subtitle: { color: 'var(--text-secondary)', fontSize: '15px', marginTop: '4px' },
  btnAdd: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '800', cursor: 'pointer', boxShadow: 'var(--shadow-md)' },
  loading: { padding: '60px', textAlign: 'center', color: 'var(--text-muted)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  card: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', transition: 'transform 0.2s' },
  cardAvatar: { width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800' },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardEmail: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' },
  cardRoleBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' },
  cardActions: { display: 'flex', gap: '8px' },
  btnEdit: { width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
  btnDel: { width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
  btnActivar: { width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
  btnSuspender: { width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
  
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '28px', width: '450px', maxWidth: '95vw', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { margin: 0, fontSize: '20px', fontWeight: '900' },
  btnClose: { background: 'none', border: 'none', fontSize: '24px', color: 'var(--text-muted)', cursor: 'pointer' },
  modalBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' },
  modalFooter: { padding: '24px', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  btnCancel: { background: 'none', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 20px', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' },
  btnSave: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '800', cursor: 'pointer' }
}
