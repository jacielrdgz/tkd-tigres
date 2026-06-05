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

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const formatHora = (hora) => {
    if (!hora) return ''
    const [h, m] = hora.split(':')
    const hrs = parseInt(h)
    const ampm = hrs >= 12 ? 'p. m.' : 'a. m.'
    const h12 = hrs % 12 || 12
    const hStr = String(h12).padStart(2, '0')
    return `${hStr}:${m} ${ampm}`
  }

  const fetchHorarios = () => {
    setLoading(true)
    api.get('/horarios')
      .then(res => setHorarios(res.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchHorarios() }, [])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowModal(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

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

  const handleToggleDia = (dia) => {
    let list = form.dias ? form.dias.split(',').map(d => d.trim()).filter(Boolean) : [];
    if (list.includes(dia)) {
      list = list.filter(d => d !== dia);
    } else {
      list.push(dia);
      list.sort((a, b) => diasSemana.indexOf(a) - diasSemana.indexOf(b));
    }
    setForm({ ...form, dias: list.join(', ') });
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
            <span style={{ width: '280px' }}>Nombre / Grupo</span>
            <span style={{ width: '260px' }}>Hora</span>
            <span style={{ flex: 1 }}>Días</span>
            <span style={{ width: '100px', textAlign: 'right', paddingRight: '8px' }}>Acciones</span>
          </div>
          {horarios.map(h => (
            <div key={h.id} style={s.row}>
              <div style={{ width: '280px', fontWeight: '700', color: 'var(--text-primary)' }}>{h.nombre}</div>
              <div style={{ width: '260px', fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600' }}>
                {formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)}
              </div>
              <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>{h.dias}</div>
              <div style={{ width: '100px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  style={s.btnIconEdit} 
                  onClick={() => handleOpenModal(h)}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Editar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button 
                  style={s.btnIconDel} 
                  onClick={() => handleDelete(h)}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Eliminar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
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
                <div style={s.diasContainer}>
                  {diasSemana.map(dia => {
                    const activo = form.dias ? form.dias.split(',').map(d => d.trim()).includes(dia) : false;
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => handleToggleDia(dia)}
                        style={{
                          ...s.diaBtn,
                          ...(activo ? s.diaBtnActive : {})
                        }}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
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
  btnIconEdit: { background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s' },
  btnIconDel: { background: 'var(--accent-red-bg)', color: 'var(--accent-red)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s' },
  
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
  btnCancel: { background: 'none', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 20px', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' },
  btnSave: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 24px', fontWeight: '800', cursor: 'pointer' },
  diasContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' },
  diaBtn: { padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  diaBtnActive: { background: 'var(--accent-blue)', color: '#fff', borderColor: 'var(--accent-blue)' }
}
