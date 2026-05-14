import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'

export default function InstructorManager() {
  const [instructores, setInstructores] = useState([])
  const [cintas, setCintas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCredencial, setShowCredencial] = useState(false)
  const [saving, setSaving] = useState(false)
  
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

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resInst, resCintas] = await Promise.all([
        api.get('/instructores'),
        api.get('/configuraciones-cintas')
      ])
      setInstructores(resInst.data)
      setCintas(resCintas.data)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

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
      setPreview(inst.foto_url ? `${import.meta.env.VITE_API_URL || ''}/storage/${inst.foto_url}` : null)
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
    formData.append('nombre', form.nombre)
    formData.append('apellido_paterno', form.apellido_paterno)
    formData.append('apellido_materno', form.apellido_materno)
    
    if (form.fecha_nacimiento) formData.append('fecha_nacimiento', form.fecha_nacimiento)
    formData.append('telefono', form.telefono)
    if (form.configuracion_cinta_id) formData.append('configuracion_cinta_id', form.configuracion_cinta_id)
    if (form.foto) formData.append('foto', form.foto)

    try {
      if (selected) {
        formData.append('_method', 'PUT')
        await api.post(`/instructores/${selected.id}`, formData)
        toast.success('Instructor actualizado')
      } else {
        await api.post('/instructores', formData)
        toast.success('Instructor agregado')
      }
      setShowModal(false)
      await fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar')
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
          fetchData()
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
    <div style={s.container}>
      <div style={s.headerRow}>
        <div>
          <h3 style={s.tabTitle}>Nuestros Instructores</h3>
          <p style={s.tabSubtitle}>Gestiona el equipo docente de tu academia.</p>
        </div>
        <button style={s.btnAdd} onClick={() => handleOpenModal()}>+ Nuevo Instructor</button>
      </div>

      {loading ? <div style={s.loading}>Cargando equipo...</div> : (
        <div style={s.grid}>
          {instructores.map(inst => (
            <div key={inst.id} style={s.instCard}>
              <div style={s.instPhoto}>
                {inst.foto_url ? (
                  <img src={`${import.meta.env.VITE_API_URL}/storage/${inst.foto_url}`} alt="Foto" style={s.photo} />
                ) : (
                  <div style={s.photoPlaceholder}>🥋</div>
                )}
              </div>
              <div style={s.instInfo}>
                <div style={s.instName}>{inst.nombre} {inst.apellido_paterno}</div>
                <div style={{...s.instBadge, background: getCintaColor(inst)}}>
                  {getCintaLabel(inst)}
                </div>
              </div>
              <div style={s.instActions}>
                <button style={s.btnIcon} onClick={() => openCredencial(inst)} title="Ver Credencial">🪪</button>
                <button style={s.btnIcon} onClick={() => handleOpenModal(inst)} title="Editar">✏️</button>
                <button style={{...s.btnIcon, color: 'var(--accent-red)'}} onClick={() => handleDelete(inst)} title="Eliminar">🗑️</button>
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
              <button style={s.btnClose} onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div style={s.modalBody}>
              <div style={s.modalPhotoSection}>
                <div style={s.modalPhotoFrame}>
                  {preview ? <img src={preview} style={s.modalPhoto} /> : <div style={s.modalPhotoPlaceholder}>🥋</div>}
                  <label style={s.modalBtnUpload}>
                    📷 Foto
                    <input type="file" hidden accept="image/*" onChange={e => {
                      const f = e.target.files[0]
                      if(f) { setForm({...form, foto: f}); setPreview(URL.createObjectURL(f)) }
                    }} />
                  </label>
                </div>
              </div>

              <div style={s.modalForm}>
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
              <button style={s.btnCancel} onClick={() => setShowModal(false)}>Cancelar</button>
              <button style={s.btnSave} onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Instructor'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Credencial */}
      {showCredencial && selected && (
        <div style={s.overlay}>
          <div style={s.credCard}>
            <div style={s.credHeader}>
              <h4 style={s.credTitle}>Credencial de Instructor</h4>
              <button style={s.btnClose} onClick={() => setShowCredencial(false)}>×</button>
            </div>
            <div style={s.credBody}>
              <div style={s.credPhotoBox}>
                {selected.foto_url ? (
                  <img src={`${import.meta.env.VITE_API_URL}/storage/${selected.foto_url}`} style={s.credPhoto} />
                ) : (
                  <div style={s.credPlaceholder}>🥋</div>
                )}
              </div>
              <div style={s.credInfo}>
                <div style={s.credLabel}>Instructor</div>
                <div style={s.credValue}>{selected.nombre} {selected.apellido_paterno}</div>
                
                <div style={s.credLabel}>Grado Actual</div>
                <div style={{...s.credCinta, background: getCintaColor(selected)}}>
                  {getCintaLabel(selected)}
                </div>

                <div style={s.credGrid}>
                  <div>
                    <div style={s.credLabel}>Teléfono</div>
                    <div style={s.credValueSmall}>{selected.telefono || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={s.credLabel}>Nacimiento</div>
                    <div style={s.credValueSmall}>{selected.fecha_nacimiento || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={s.credFooter}>
              <button style={s.btnPrimary} onClick={() => window.print()}>Imprimir Credencial</button>
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
  tabTitle: { fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 },
  tabSubtitle: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' },
  btnAdd: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '800', cursor: 'pointer', fontSize: '14px', boxShadow: 'var(--shadow-md)' },
  loading: { padding: '60px', textAlign: 'center', color: 'var(--text-muted)' },
  empty: { gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px dashed var(--border)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  instCard: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', transition: 'transform 0.2s' },
  instPhoto: { width: '70px', height: '70px', borderRadius: '18px', background: 'var(--bg-primary)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' },
  photo: { width: '100%', height: '100%', objectFit: 'cover' },
  photoPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' },
  instInfo: { flex: 1, minWidth: 0 },
  instName: { fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  instBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', color: '#fff', textTransform: 'uppercase' },
  instActions: { display: 'flex', gap: '8px' },
  btnIcon: { background: 'var(--bg-tertiary)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '28px', width: '600px', maxWidth: '95vw', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { margin: 0, fontSize: '20px', fontWeight: '900' },
  btnClose: { background: 'none', border: 'none', fontSize: '28px', color: 'var(--text-muted)', cursor: 'pointer' },
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
  btnCancel: { background: 'none', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 24px', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' },
  btnSave: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 30px', fontWeight: '800', cursor: 'pointer' },

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
  btnPrimary: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 40px', fontWeight: '800', cursor: 'pointer' }
}
