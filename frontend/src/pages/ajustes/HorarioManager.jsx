import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'

export default function HorarioManager() {
  const [horarios, setHorarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({
    nombre: '',
    hora_inicio: '16:00',
    hora_fin: '17:00',
    dias: 'Lunes, Miércoles, Viernes'
  })

  const fetchHorarios = () => {
    setLoading(true)
    api.get('/horarios')
      .then(res => setHorarios(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchHorarios() }, [])

  const handleOpenModal = (h = null) => {
    if (h) {
      setSelected(h)
      setForm({
        nombre: h.nombre,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        dias: h.dias || ''
      })
    } else {
      setSelected(null)
      setForm({ nombre: '', hora_inicio: '16:00', hora_fin: '17:00', dias: 'Lunes, Miércoles, Viernes' })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.nombre || !form.hora_inicio || !form.hora_fin) return toast.error('Faltan datos obligatorios')
    
    setSaving(true)
    try {
      if (selected) {
        await api.put(`/horarios/${selected.id}`, form)
        toast.success('Horario actualizado')
      } else {
        await api.post('/horarios', form)
        toast.success('Horario creado')
      }
      setShowModal(false)
      fetchHorarios()
    } catch (err) {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (h) => {
    Swal.fire({
      title: '¿Eliminar horario?',
      text: `Se borrará el horario "${h.nombre}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)', color: 'var(--text-primary)'
    }).then(async r => {
      if (r.isConfirmed) {
        try {
          await api.delete(`/horarios/${h.id}`)
          toast.success('Eliminado')
          fetchHorarios()
        } catch { toast.error('Error al eliminar') }
      }
    })
  }

  return (
    <div>
      <div style={s.headerRow}>
        <h3 style={s.tabTitle}>Gestión de Horarios</h3>
        <button style={s.btnAdd} onClick={() => handleOpenModal()}>+ Nuevo Horario</button>
      </div>

      {loading ? <div style={s.loading}>Cargando horarios...</div> : (
        <div style={s.list}>
          <div style={s.listHeader}>
            <span style={{ flex: 1 }}>Nombre / Grupo</span>
            <span style={{ width: '150px' }}>Hora</span>
            <span style={{ width: '250px' }}>Días</span>
            <span style={{ width: '100px' }}>Acciones</span>
          </div>
          {horarios.map(h => (
            <div key={h.id} style={s.row}>
              <div style={{ flex: 1, fontWeight: '700', color: 'var(--text-primary)' }}>{h.nombre}</div>
              <div style={{ width: '150px', fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600' }}>
                {h.hora_inicio?.slice(0, 5)} - {h.hora_fin?.slice(0, 5)}
              </div>
              <div style={{ width: '250px', fontSize: '13px', color: 'var(--text-secondary)' }}>{h.dias}</div>
              <div style={{ width: '100px', display: 'flex', gap: '8px' }}>
                <button style={s.btnIconEdit} onClick={() => handleOpenModal(h)}>✏️</button>
                <button style={s.btnIconDel} onClick={() => handleDelete(h)}>🗑️</button>
              </div>
            </div>
          ))}
          {horarios.length === 0 && <div style={s.empty}>No hay horarios configurados.</div>}
        </div>
      )}

      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h4 style={s.modalTitle}>{selected ? 'Editar Horario' : 'Nuevo Horario'}</h4>
              <button style={s.btnClose} onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div style={s.modalBody}>
              <div style={s.inputGroup}>
                <label style={s.label}>Nombre del Grupo / Clase</label>
                <input style={s.input} value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej. Infantiles Principiantes" />
              </div>
              
              <div style={s.grid}>
                <div style={s.inputGroup}>
                  <label style={s.label}>Hora Inicio</label>
                  <input type="time" style={s.input} value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})} />
                </div>
                <div style={s.inputGroup}>
                  <label style={s.label}>Hora Fin</label>
                  <input type="time" style={s.input} value={form.hora_fin} onChange={e => setForm({...form, hora_fin: e.target.value})} />
                </div>
              </div>

              <div style={s.inputGroup}>
                <label style={s.label}>Días de clase</label>
                <input style={s.input} value={form.dias} onChange={e => setForm({...form, dias: e.target.value})} placeholder="Ej. Lunes, Miércoles y Viernes" />
              </div>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnCancel} onClick={() => setShowModal(false)}>Cancelar</button>
              <button style={s.btnSave} onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Horario'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  tabTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 },
  btnAdd: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontWeight: '800', cursor: 'pointer', fontSize: '14px' },
  loading: { padding: '40px', textAlign: 'center', color: 'var(--text-muted)' },
  list: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' },
  listHeader: { display: 'flex', padding: '12px 24px', background: 'var(--bg-tertiary)', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  row: { display: 'flex', padding: '16px 24px', borderBottom: '1px solid var(--border)', alignItems: 'center', transition: '0.2s' },
  empty: { padding: '40px', textAlign: 'center', color: 'var(--text-muted)' },
  btnIconEdit: { background: 'var(--accent-blue-bg)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnIconDel: { background: 'var(--accent-red-bg)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', width: '450px', maxWidth: '95vw', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '800' },
  btnClose: { background: 'none', border: 'none', fontSize: '24px', color: 'var(--text-muted)', cursor: 'pointer' },
  modalBody: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' },
  input: { width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' },
  modalFooter: { padding: '20px 24px', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  btnCancel: { background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 20px', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' },
  btnSave: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontWeight: '800', cursor: 'pointer' }
}
