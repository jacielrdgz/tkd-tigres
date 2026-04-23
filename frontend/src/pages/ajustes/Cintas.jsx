import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import { useNavigate } from 'react-router-dom'

export default function Cintas() {
  const navigate = useNavigate()
  const [cintas, setCintas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ nombre: '', bg: '#3b82f6', tx: '#ffffff' })

  const fetchCintas = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/configuraciones-cintas')
      setCintas(data)
    } catch { toast.error('Error al conectar') }
    setLoading(false)
  }

  useEffect(() => { fetchCintas() }, [])

  const autoText = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
    return (((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128) ? '#000000' : '#ffffff'
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) return toast.error('Falta el nombre')
    setSaving(true)
    try {
      const payload = { nombre_nivel: form.nombre, color_hex: form.bg, color_texto: form.tx }
      if (editId) {
        await api.put(`/configuraciones-cintas/${editId}`, payload)
        toast.success('Actualizado correctamente')
      } else {
        const orden = cintas.length > 0 ? Math.max(...cintas.map(c => c.orden || 0)) + 1 : 1
        await api.post('/configuraciones-cintas', { ...payload, orden })
        toast.success('Grado creado')
      }
      setForm({ nombre: '', bg: '#3b82f6', tx: '#ffffff' }); setEditId(null); fetchCintas()
    } catch (err) {
      toast.error('Error al procesar el cambio')
    } finally { setSaving(false) }
  }

  const startEdit = (c) => {
    setEditId(c.id)
    setForm({ nombre: c.nombre_nivel, bg: c.color_hex, tx: c.color_texto })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = (c) => {
    Swal.fire({
      title: '¿Confirmar borrado?',
      text: `El grado "${c.nombre_nivel}" se eliminará del sistema.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
      confirmButtonColor: '#ef4444',
      background: '#0b0c14', color: '#fff'
    }).then(async r => {
      if (r.isConfirmed) {
        try {
          await api.delete(`/configuraciones-cintas/${c.id}`)
          toast.success('Cinta eliminada')
          fetchCintas()
        } catch { toast.error('No se pudo borrar') }
      }
    })
  }

  return (
    <div style={s.pageTool}>
      <button style={s.btnBack} onClick={() => navigate('/ajustes')}>← Volver a ajustes</button>

      <div style={s.toolHeaderRow}>
        <div>
          <h2 style={s.titleTool}>Configuración de Grados</h2>
          <p style={s.subtitleMain}>Administra la escala de cintas y sus identificadores visuales.</p>
        </div>
      </div>

      <div style={s.toolLayout}>
        {/* Editor Lateral */}
        <div style={s.toolFormCard}>
          <h4 style={s.toolLabel}>{editId ? 'Editando Grado' : 'Nuevo Grado'}</h4>
          <input 
            style={s.toolInput} 
            placeholder="Nombre del nivel..." 
            value={form.nombre} 
            onChange={e => setForm({...form, nombre: e.target.value})} 
          />
          
          <div style={s.toolPickerRow}>
            <div style={s.pickerCell}>
              <label style={s.pickerLabel}>Fondo</label>
              <input type="color" value={form.bg} onChange={e => { setForm({...form, bg: e.target.value, tx: autoText(e.target.value)}) }} style={s.colorPick} />
            </div>
            <div style={s.pickerCell}>
              <label style={s.pickerLabel}>Texto</label>
              <input type="color" value={form.tx} onChange={e => setForm({...form, tx: e.target.value})} style={s.colorPick} />
            </div>
          </div>

          <div style={{ ...s.toolPreview, background: form.bg, color: form.tx }}>
            {form.nombre || 'VISTA PREVIA'}
          </div>

          <div style={s.btnGroup}>
            <button style={s.btnSave} onClick={handleSave} disabled={saving}>{saving ? '...' : (editId ? 'Guardar' : 'Crear Grado')}</button>
            {editId && <button style={s.btnCancel} onClick={() => {setEditId(null); setForm({nombre:'', bg:'#3b82f6', tx:'#ffffff'})}}>Cancelar</button>}
          </div>
        </div>

        {/* Lista de Registros */}
        <div style={{ flex: 1 }}>
          <div style={s.listHeader}>
            <span>Grado</span>
            <span>Acciones</span>
          </div>
          <div style={s.toolList}>
            {loading ? <div style={s.toolEmpty}>Buscando...</div> :
              cintas.map((c, i) => (
                <div key={c.id} style={{ ...s.toolRow, borderColor: editId === c.id ? '#3b82f6' : '#1e2130' }}>
                  <div style={s.toolRowLeft}>
                    <span style={s.toolOrder}>#{i + 1}</span>
                    <div style={{ ...s.toolBadge, background: c.color_hex, color: c.color_texto }}>{c.nombre_nivel}</div>
                    <span style={s.toolHex}>{c.color_hex.toUpperCase()}</span>
                  </div>
                  <div style={s.toolActions}>
                    <button style={{ ...s.btnIcon, ...s.btnEdit }} onClick={() => startEdit(c)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button style={{ ...s.btnIcon, ...s.btnDel }} onClick={() => handleDelete(c)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  subtitleMain: { color: '#475569', fontSize: '15px', marginTop: '4px' },
  pageTool: { padding: '40px 24px', maxWidth: '1100px', margin: '0 auto' },
  btnBack: { background: '#13151f', border: '1px solid #1e2130', borderRadius: '10px', color: '#64748b', padding: '8px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', marginBottom: '24px' },
  toolHeaderRow: { marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titleTool: { fontSize: '28px', fontWeight: '900', color: '#fff', margin: 0 },
  toolLayout: { display: 'flex', gap: '32px', alignItems: 'flex-start' },
  toolFormCard: { width: '340px', background: '#0b0c14', borderRadius: '20px', border: '1px solid #1e2130', padding: '24px', position: 'sticky', top: '24px' },
  toolLabel: { fontSize: '11px', color: '#475569', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' },
  toolInput: { width: '100%', background: '#000', border: '1px solid #1e2130', borderRadius: '12px', padding: '14px', color: '#fff', marginBottom: '20px', fontSize: '14px' },
  toolPickerRow: { display: 'flex', gap: '20px', marginBottom: '24px' },
  pickerCell: { display: 'flex', flexDirection: 'column', gap: '6px' },
  pickerLabel: { fontSize: '10px', fontWeight: '800', color: '#334155' },
  colorPick: { width: '40px', height: '40px', border: 'none', background: 'transparent', cursor: 'pointer' },
  toolPreview: { padding: '14px', borderRadius: '12px', fontSize: '13px', fontWeight: '900', textAlign: 'center', marginBottom: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' },
  btnGroup: { display: 'flex', gap: '10px' },
  btnSave: { flex: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: '800', cursor: 'pointer' },
  btnCancel: { background: '#13151f', color: '#64748b', border: '1px solid #1e2130', borderRadius: '12px', padding: '12px', cursor: 'pointer' },
  listHeader: { display: 'flex', justifyContent: 'space-between', padding: '10px 20px', fontSize: '12px', color: '#334155', fontWeight: '800', textTransform: 'uppercase' },
  toolList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  toolRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#0b0c14', border: '1px solid #1e2130', borderRadius: '16px' },
  toolRowLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  toolOrder: { fontSize: '12px', color: '#334155', fontWeight: '900', width: '24px' },
  toolBadge: { padding: '8px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: '900', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' },
  toolHex: { fontSize: '11px', color: '#334155', fontFamily: 'monospace' },
  toolActions: { display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' },
  btnIcon: { padding: '5px', borderRadius: '6px', border: '1px solid #1e2130', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', },
  btnEdit: { background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)' },
  btnDel: { background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)' },
  toolEmpty: { textAlign: 'center', padding: '40px', color: '#334155' }
}
