import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import { getCache, setCache, invalidateCache, TTL_STATIC } from '../../utils/cacheManager'
import { FiUser, FiCamera, FiUserPlus, FiX } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'

const formatFechaNatural = (fecha) => {
  if (!fecha) return '-'
  const d = new Date(fecha + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

const modalCredencialStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modalCard: { background: 'var(--bg-secondary)', borderRadius: '16px', width: '580px', maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)', boxSizing: 'border-box' },
  cardHeader: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' },
  cardTitle: { fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0, paddingRight: '8px', lineHeight: 1.3 },
  btnCerrarCircular: {
    width: '34px',
    height: '34px',
    minWidth: '34px',
    minHeight: '34px',
    borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    aspectRatio: '1 / 1',
    padding: 0,
    transition: 'all 0.15s ease',
  },
  cardBody: { padding: '24px 28px', display: 'flex', gap: '20px', alignItems: 'flex-start', textAlign: 'left' },
  avatarBox: { width: '170px', height: '210px', flexShrink: 0, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '12px' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInicialesBox: { width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarIniciales: { fontSize: '48px', fontWeight: '700', color: '#ffffff' },
  cardInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 },
  infoItem: { display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '7px', paddingTop: '4px' },
  infoLabel: { fontWeight: '700', color: 'var(--text-muted)', fontSize: '13.5px', textAlign: 'right', width: '75px', minWidth: '75px', flexShrink: 0 },
  infoValue: { color: 'var(--text-primary)', fontSize: '13.5px', fontWeight: '700', textAlign: 'left', flex: 1, wordBreak: 'break-word' },
  cardFooter: { padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  btnAceptar: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    padding: '10px 24px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '13px',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    letterSpacing: '0.2px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },
  btnImprimir: {
    background: 'var(--accent-blue)',
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '13px',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    letterSpacing: '0.2px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },
  btnWhatsapp: {
    background: 'linear-gradient(135deg, #25D366 0%, #1ebd5a 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '13px',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    letterSpacing: '0.2px',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: 'none',
    transition: 'all 0.2s ease',
  },
}

export default function InstructorManager() {
  const [instructores, setInstructores] = useState(() => {
    const cached = getCache('instructores_lista')
    return cached?.data || []
  })
  const [cintas, setCintas] = useState(() => {
    const cached = getCache('cintas_config')
    return cached?.data || []
  })
  const [loading, setLoading] = useState(() => {
    const cachedInst = getCache('instructores_lista')
    return !cachedInst?.data
  })
  const [showModal, setShowModal] = useState(false)
  const [showCredencial, setShowCredencial] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_nacimiento: '',
    telefono: '',
    configuracion_cinta_id: '',
    foto: null
  })
  const [preview, setPreview] = useState(null)

  const fetchData = async (silent = false) => {
    const cachedInst = getCache('instructores_lista')
    const cachedCintas = getCache('cintas_config')
    if (cachedInst?.data && !silent) {
      setInstructores(cachedInst.data)
      if (cachedCintas?.data) setCintas(cachedCintas.data)
      setLoading(false)
    } else if (!silent && (!instructores || instructores.length === 0)) {
      setLoading(true)
    }

    try {
      const [resInst, resCintas] = await Promise.all([
        api.get('/instructores'),
        api.get('/configuraciones-cintas')
      ])
      const listInst = Array.isArray(resInst.data) ? resInst.data : (resInst.data?.data || [])
      const listCintas = Array.isArray(resCintas.data) ? resCintas.data : (resCintas.data?.data || [])
      setInstructores(listInst)
      setCintas(listCintas)
      setCache('instructores_lista', listInst, TTL_STATIC)
      setCache('cintas_config', listCintas, TTL_STATIC)
    } catch {
      if (!cachedInst?.data) toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false)
        setShowCredencial(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const handleOpenModal = (inst = null) => {
    if (inst) {
      setSelected(inst)
      setForm({
        nombre: inst.nombre,
        apellido_paterno: inst.apellido_paterno,
        apellido_materno: inst.apellido_materno || '',
        fecha_nacimiento: inst.fecha_nacimiento || '',
        telefono: inst.telefono || '',
        configuracion_cinta_id: inst.configuracion_cinta_id || '',
        foto: null
      })
      setPreview(inst.foto_url ? ((inst.foto_url.startsWith('http') || inst.foto_url.startsWith('data:')) ? inst.foto_url : `${import.meta.env.VITE_API_URL || ''}/storage/${inst.foto_url}`) : null)
    } else {
      setSelected(null)
      setForm({
        nombre: '',
        apellido_paterno: '',
        apellido_materno: '',
        fecha_nacimiento: '',
        telefono: '',
        configuracion_cinta_id: '',
        foto: null
      })
      setPreview(null)
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.nombre || !form.apellido_paterno) return toast.error('Nombre y Apellido Paterno son obligatorios')
    
    setSaving(true)
    const formData = new FormData()
    formData.append('nombre', form.nombre.trim())
    formData.append('apellido_paterno', form.apellido_paterno.trim())
    if (form.apellido_materno) formData.append('apellido_materno', form.apellido_materno.trim())
    if (form.fecha_nacimiento) formData.append('fecha_nacimiento', form.fecha_nacimiento)
    if (form.telefono) formData.append('telefono', form.telefono.trim())
    if (form.configuracion_cinta_id) formData.append('configuracion_cinta_id', form.configuracion_cinta_id)
    if (form.foto) formData.append('foto', form.foto)

    try {
      if (selected) {
        formData.append('_method', 'PUT')
        await api.post(`/instructores/${selected.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toast.success('Instructor actualizado')
      } else {
        await api.post('/instructores', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toast.success('Instructor agregado')
      }
      invalidateCache('instructores_lista')
      setShowModal(false)
      await fetchData(true)
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Error al guardar'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (inst) => {
    Swal.fire({
      title: '¿Eliminar instructor?',
      text: `Se borrará a ${inst.nombre} del sistema.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)', color: 'var(--text-primary)'
    }).then(async r => {
      if (r.isConfirmed) {
        try {
          await api.delete(`/instructores/${inst.id}`)
          toast.success('Eliminado')
          invalidateCache('instructores_lista')
          fetchData(true)
        } catch { toast.error('Error al eliminar') }
      }
    })
  }

  const openCredencial = (inst) => {
    setSelected(inst)
    setShowCredencial(true)
  }

  const getCintaLabel = (inst) => {
    const config = inst?.cinta_config || inst?.cintaConfig
    if (config) return config.nombre_nivel
    const id = inst?.configuracion_cinta_id
    const cinta = cintas.find(c => c.id === parseInt(id))
    return cinta ? cinta.nombre_nivel : 'Sin cinta'
  }

  const getCintaColor = (inst) => {
    const config = inst?.cinta_config || inst?.cintaConfig
    if (config) return config.color_hex
    const id = inst?.configuracion_cinta_id
    const cinta = cintas.find(c => c.id === parseInt(id))
    return cinta ? cinta.color_hex : 'var(--bg-tertiary)'
  }

  return (
    <div style={{ ...s.container, paddingBottom: isMobile ? '85px' : '40px' }}>
      <div style={{ ...s.headerRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '16px' : '0' }}>
        <div>
          <h3 style={s.tabTitle}>Nuestros Instructores</h3>
          <p style={s.tabSubtitle}>Gestiona el equipo docente de tu academia.</p>
        </div>
        <button 
          style={{ ...s.btnAdd, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }} 
          onClick={() => handleOpenModal()}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)'
            e.currentTarget.style.filter = 'brightness(1.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.filter = 'none'
          }}
        >
          <FiUserPlus size={16} />
          <span>Nuevo Instructor</span>
        </button>
      </div>

      {loading ? <div style={s.loading}>Cargando equipo...</div> : (
        <div style={{ ...s.grid, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))' }}>
          {instructores.map(inst => (
            <div key={inst.id} style={{ ...s.instCard, padding: isMobile ? '14px' : '20px', gap: isMobile ? '12px' : '20px' }}>
              <div style={{ ...s.instPhoto, width: isMobile ? '52px' : '70px', height: isMobile ? '52px' : '70px', borderRadius: isMobile ? '14px' : '18px' }}>
                {inst.foto_url ? (
                  <img 
                    src={(inst.foto_url.startsWith('http') || inst.foto_url.startsWith('data:')) ? inst.foto_url : `${import.meta.env.VITE_API_URL || ''}/storage/${inst.foto_url}`} 
                    alt="Foto" 
                    style={s.photo} 
                  />
                ) : (
                  <div style={s.photoPlaceholder}>
                    <FiUser size={isMobile ? 26 : 32} color="var(--text-muted)" />
                  </div>
                )}
              </div>
              <div style={s.instInfo}>
                <div style={{
                  ...s.instName,
                  fontSize: isMobile ? '15px' : '16px',
                  whiteSpace: 'normal',
                  lineHeight: '1.25',
                  marginBottom: '4px'
                }}>
                  {inst.nombre} {inst.apellido_paterno}
                </div>
                <div style={{...s.instBadge, background: getCintaColor(inst)}}>
                  {getCintaLabel(inst)}
                </div>
              </div>
              <div style={{ ...s.instActions, gap: '8px' }}>
                <button
                  className="btn-action-icon btn-action-view"
                  onClick={() => openCredencial(inst)}
                  title="Ver Credencial"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="16" rx="2" ry="2"/>
                    <line x1="7" y1="8" x2="17" y2="8"/>
                    <line x1="7" y1="12" x2="17" y2="12"/>
                    <line x1="7" y1="16" x2="13" y2="16"/>
                  </svg>
                </button>
                <button
                  className="btn-action-icon btn-action-edit"
                  onClick={() => handleOpenModal(inst)}
                  title="Editar"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  className="btn-action-icon btn-action-del"
                  onClick={() => handleDelete(inst)}
                  title="Eliminar"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {instructores.length === 0 && <div style={s.empty}>No has agregado instructores todavía.</div>}
        </div>
      )}

      {/* Modal Registro/Edición */}
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h4 style={s.modalTitle}>{selected ? 'Editar Instructor' : 'Nuevo Instructor'}</h4>
              <button 
                style={s.btnClose} 
                onClick={() => setShowModal(false)}
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
            
            <div style={{ ...s.modalBody, ...(isMobile ? { flexDirection: 'column', alignItems: 'center', padding: '20px 16px', gap: '20px' } : {}) }}>
              <div style={{ ...s.modalPhotoSection, ...(isMobile ? { width: '100%', display: 'flex', justifyContent: 'center' } : {}) }}>
                <div style={s.modalPhotoFrame}>
                  {preview ? (
                    <img 
                      src={preview} 
                      alt="" 
                      style={s.modalPhoto} 
                      onError={() => setPreview(null)}
                    />
                  ) : (
                    <div style={s.modalPhotoPlaceholder}>
                      <FiUser size={48} color="var(--text-muted)" />
                    </div>
                  )}
                  <label style={s.modalBtnUpload}>
                    <FiCamera size={12} style={{ marginRight: '4px' }} /> Foto
                    <input type="file" hidden accept="image/*" onChange={e => {
                      const f = e.target.files[0]
                      if(f) { setForm({...form, foto: f}); setPreview(URL.createObjectURL(f)) }
                    }} />
                  </label>
                </div>
              </div>

              <div style={{ ...s.modalForm, ...(isMobile ? { width: '100%' } : {}) }}>
                <div style={s.modalGrid}>
                  <div style={s.inputGroup}>
                    <label style={s.label}>Nombre(s)</label>
                    <input style={s.input} value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej. Ricardo" />
                  </div>
                  <div style={s.inputGroup}>
                    <label style={s.label}>Apellidos</label>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <input style={s.input} value={form.apellido_paterno} onChange={e => setForm({...form, apellido_paterno: e.target.value})} placeholder="Paterno" />
                      <input style={s.input} value={form.apellido_materno} onChange={e => setForm({...form, apellido_materno: e.target.value})} placeholder="Materno" />
                    </div>
                  </div>
                  <div style={s.inputGroup}>
                    <label style={s.label}>Fecha de Nacimiento</label>
                    <input style={s.input} type="date" value={form.fecha_nacimiento} onChange={e => setForm({...form, fecha_nacimiento: e.target.value})} />
                  </div>
                  <div style={s.inputGroup}>
                    <label style={s.label}>Teléfono</label>
                    <input style={s.input} value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} placeholder="Ej. 8112345678" />
                  </div>
                  <div style={s.inputGroup}>
                    <label style={s.label}>Grado / Cinta</label>
                    <select style={s.input} value={form.configuracion_cinta_id} onChange={e => setForm({...form, configuracion_cinta_id: e.target.value})}>
                      <option value="">Seleccionar grado...</option>
                      {cintas.map(c => <option key={c.id} value={c.id}>{c.nombre_nivel}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div style={s.modalFooter}>
              <button 
                style={s.btnCancel} 
                onClick={() => setShowModal(false)}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >Cancelar</button>
              <button 
                style={s.btnSave} 
                onClick={handleSave} 
                disabled={saving}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >{saving ? 'Guardando...' : 'Guardar Instructor'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Credencial */}
      {showCredencial && selected && (
        <div style={modalCredencialStyles.overlay} onClick={() => setShowCredencial(false)}>
          <div style={modalCredencialStyles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={modalCredencialStyles.cardHeader}>
              <h3 style={modalCredencialStyles.cardTitle}>
                {selected.nombre} {selected.apellido_paterno} {selected.apellido_materno || ''}
              </h3>
              <button
                type="button"
                className="btn-cerrar-circular"
                style={modalCredencialStyles.btnCerrarCircular}
                onClick={() => setShowCredencial(false)}
                aria-label="Cerrar modal"
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
                  e.currentTarget.style.color = 'var(--accent-red)'
                  e.currentTarget.style.transform = 'rotate(90deg)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <FiX size={17} />
              </button>
            </div>
            <div style={{
              ...modalCredencialStyles.cardBody,
              ...(isMobile ? { flexDirection: 'column', alignItems: 'center', padding: '18px 16px', gap: '16px' } : {})
            }}>
              <div style={{
                ...modalCredencialStyles.avatarBox,
                ...(isMobile ? { width: '130px', height: '160px', borderRadius: '12px' } : {})
              }}>
                {selected.foto_url ? (
                  <img
                    src={(selected.foto_url.startsWith('http') || selected.foto_url.startsWith('data:')) ? selected.foto_url : `${import.meta.env.VITE_API_URL || ''}/storage/${selected.foto_url}`}
                    alt={selected.nombre}
                    style={modalCredencialStyles.avatarImg}
                  />
                ) : (
                  <div style={modalCredencialStyles.avatarInicialesBox}>
                    <span style={{
                      ...modalCredencialStyles.avatarIniciales,
                      ...(isMobile ? { fontSize: '42px' } : {})
                    }}>
                      {(selected.nombre?.charAt(0) || '') + (selected.apellido_paterno?.charAt(0) || '')}
                    </span>
                  </div>
                )}
              </div>
              <div style={{
                ...modalCredencialStyles.cardInfo,
                ...(isMobile ? { width: '100%', gap: '8px' } : {})
              }}>
                <div style={modalCredencialStyles.infoItem}>
                  <span style={{ ...modalCredencialStyles.infoLabel, ...(isMobile ? { minWidth: '80px', fontSize: '13px' } : {}) }}>Rol:</span>
                  <span style={{ ...modalCredencialStyles.infoValue, ...(isMobile ? { fontSize: '13px' } : {}) }}>Instructor</span>
                </div>
                <div style={modalCredencialStyles.infoItem}>
                  <span style={{ ...modalCredencialStyles.infoLabel, ...(isMobile ? { minWidth: '80px', fontSize: '13px' } : {}) }}>Grado:</span>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: getCintaColor(selected),
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: isMobile ? '12px' : '12.5px',
                    display: 'inline-block'
                  }}>
                    {getCintaLabel(selected)}
                  </span>
                </div>
                <div style={modalCredencialStyles.infoItem}>
                  <span style={{ ...modalCredencialStyles.infoLabel, ...(isMobile ? { minWidth: '80px', fontSize: '13px' } : {}) }}>Teléfono:</span>
                  <span style={{ ...modalCredencialStyles.infoValue, ...(isMobile ? { fontSize: '13px' } : {}) }}>{selected.telefono || '-'}</span>
                </div>
                <div style={modalCredencialStyles.infoItem}>
                  <span style={{ ...modalCredencialStyles.infoLabel, ...(isMobile ? { minWidth: '80px', fontSize: '13px' } : {}) }}>F. Nac.:</span>
                  <span style={{ ...modalCredencialStyles.infoValue, ...(isMobile ? { fontSize: '13px' } : {}) }}>{formatFechaNatural(selected.fecha_nacimiento)}</span>
                </div>
              </div>
            </div>
            <div style={{
              ...modalCredencialStyles.cardFooter,
              ...(isMobile ? { padding: '14px 16px', gap: '10px' } : {})
            }}>
              {selected.telefono && (
                <a
                  href={'https://wa.me/52' + selected.telefono?.replace(/\s+/g, '')}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...modalCredencialStyles.btnWhatsapp,
                    ...(isMobile ? { flex: 1, justifyContent: 'center', padding: '9px 12px' } : {})
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.filter = 'brightness(1.08)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.filter = 'none'
                  }}
                >
                  <FaWhatsapp size={18} />
                  <span>WhatsApp</span>
                </a>
              )}
              <button
                style={{
                  ...modalCredencialStyles.btnImprimir,
                  ...(isMobile ? { flex: 1, justifyContent: 'center', padding: '9px 12px' } : {})
                }}
                onClick={() => window.print()}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
                  e.currentTarget.style.filter = 'brightness(1.08)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.filter = 'none'
                }}
              >
                Imprimir
              </button>
              <button
                style={{
                  ...modalCredencialStyles.btnAceptar,
                  ...(isMobile ? { flex: 1, justifyContent: 'center', padding: '9px 12px' } : {})
                }}
                onClick={() => setShowCredencial(false)}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                  e.currentTarget.style.color = '#ffffff'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  container: { animation: 'fadeIn 0.3s ease-in-out' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  tabTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 },
  tabSubtitle: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' },
  btnAdd: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--accent-blue)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 18px',
    fontSize: '13.5px',
    fontWeight: '700',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    letterSpacing: '0.2px',
    cursor: 'pointer',
    boxShadow: 'none',
    transition: 'all 0.2s ease',
  },
  loading: { padding: '60px', textAlign: 'center', color: 'var(--text-muted)' },
  empty: { gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px dashed var(--border)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  instCard: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', transition: 'all 0.2s' },
  instPhoto: { width: '70px', height: '70px', borderRadius: '18px', background: 'var(--bg-primary)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' },
  photo: { width: '100%', height: '100%', objectFit: 'cover' },
  photoPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' },
  instInfo: { flex: 1, minWidth: 0 },
  instName: { fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  instBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', color: '#fff', textTransform: 'uppercase' },
  instActions: { display: 'flex', gap: '8px' },
  btnIcon: { background: 'var(--bg-tertiary)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', transition: 'all 0.2s' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '28px', width: '600px', maxWidth: '95vw', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { margin: 0, fontSize: '20px', fontWeight: '900' },
  btnClose: { background: 'none', border: 'none', fontSize: '28px', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' },
  modalBody: { padding: '30px', display: 'flex', gap: '30px' },
  modalPhotoSection: { width: '160px' },
  modalPhotoFrame: { width: '160px', height: '200px', borderRadius: '24px', background: 'var(--bg-primary)', border: '2px dashed var(--border)', overflow: 'hidden', position: 'relative' },
  modalPhoto: { width: '100%', height: '100%', objectFit: 'cover' },
  modalPhotoPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px' },
  modalBtnUpload: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px', fontSize: '11px', fontWeight: '800', textAlign: 'center', cursor: 'pointer' },
  modalForm: { flex: 1 },
  modalGrid: { display: 'flex', flexDirection: 'column', gap: '18px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' },
  modalFooter: { padding: '24px', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  btnCancel: { background: 'none', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 24px', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  btnSave: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 30px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' },

  credCard: { background: 'var(--bg-secondary)', borderRadius: '30px', width: '400px', maxWidth: '95vw', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' },
  credHeader: { padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' },
  credTitle: { margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase' },
  credBody: { padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  credPhotoBox: { width: '150px', height: '180px', borderRadius: '24px', background: 'var(--bg-primary)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '20px' },
  credPhoto: { width: '100%', height: '100%', objectFit: 'cover' },
  credPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px' },
  credInfo: { width: '100%' },
  credLabel: { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' },
  credValue: { fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '16px' },
  credValueSmall: { fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' },
  credCinta: { display: 'inline-block', padding: '6px 20px', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '900', marginBottom: '24px', textTransform: 'uppercase' },
  credGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '20px' },
  credFooter: { padding: '24px', borderTop: '1px solid var(--border)', textAlign: 'center' },
  btnPrimary: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 40px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }
}
