import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import { useNavigate } from 'react-router-dom'
import { FiAward } from 'react-icons/fi'

const SUGGESTED_COLORS = [
  { bg: '#ffffff', tx: '#000000', label: 'Blanca' },
  { bg: '#ffd700', tx: '#000000', label: 'Amarilla' },
  { bg: '#ff4d00', tx: '#ffffff', label: 'Naranja' },
  { bg: '#015520', tx: '#ffffff', label: 'Verde' },
  { bg: '#003575', tx: '#ffffff', label: 'Azul' },
  { bg: '#8b4513', tx: '#ffffff', label: 'Marrón' },
  { bg: '#ff0000', tx: '#ffffff', label: 'Roja' },
  { bg: '#1e293b', tx: '#ffffff', label: 'Negra' },
]

export default function Cintas({ isEmbedded = false }) {
  const navigate = useNavigate()
  const [cintas, setCintas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ nombre: '', bg: '#3b82f6', tx: '#ffffff' })
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [hoveredRowId, setHoveredRowId] = useState(null)

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
    if (!isEmbedded) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = (c) => {
    Swal.fire({
      title: '¿Confirmar borrado?',
      text: `El grado "${c.nombre_nivel}" se eliminará del sistema.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)', color: 'var(--text-primary)'
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

  const handleDragStart = (idx) => {
    setDragIdx(idx)
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  const handleDrop = async (idx) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null)
      setDragOverIdx(null)
      return
    }
    const updated = [...cintas]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(idx, 0, moved)
    setCintas(updated)
    setDragIdx(null)
    setDragOverIdx(null)

    try {
      await api.post('/configuraciones-cintas/reorder', {
        orden: updated.map(c => c.id)
      })
      toast.success('Orden actualizado')
    } catch {
      toast.error('Error al guardar el orden')
      fetchCintas()
    }
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const moveItem = async (fromIdx, direction) => {
    const toIdx = fromIdx + direction
    if (toIdx < 0 || toIdx >= cintas.length) return
    const updated = [...cintas]
    const [moved] = updated.splice(fromIdx, 1)
    updated.splice(toIdx, 0, moved)
    setCintas(updated)

    try {
      await api.post('/configuraciones-cintas/reorder', {
        orden: updated.map(c => c.id)
      })
    } catch {
      toast.error('Error al guardar el orden')
      fetchCintas()
    }
  }

  const renderBeltPreview = (bg, tx, nombre) => {
    return (
      <div style={{
        ...s.previewBelt,
        backgroundColor: bg,
        color: tx,
        boxShadow: `0 8px 20px ${bg}25, inset 0 2px 4px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.15)`
      }}>
        <span style={{ ...s.previewText, color: tx }}>
          {nombre || 'VISTA PREVIA'}
        </span>
      </div>
    )
  }

  return (
    <div style={isEmbedded ? {} : s.pageTool}>
      {!isEmbedded && (
        <>
          <button
            style={s.btnBack}
            onClick={() => navigate('/ajustes')}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-tertiary)'
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.borderColor = 'var(--accent-blue)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--bg-secondary)'
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.transform = 'none'
            }}
          >
            ← Volver a ajustes
          </button>
          <div style={s.toolHeaderRow}>
            <div>
              <h2 style={s.titleTool}>Configuración de Grados</h2>
              <p style={s.subtitleMain}>Administra la escala de cintas y sus identificadores visuales.</p>
            </div>
          </div>
        </>
      )}

      <div style={s.toolLayout}>
        {/* Editor Lateral */}
        <div style={s.toolFormCard}>
          <div style={s.cardHeaderGlow} />
          <h4 style={s.toolLabel}>
            <FiAward size={16} style={{ marginRight: '6px' }} />
            {editId ? 'Editando Grado' : 'Nuevo Grado'}
          </h4>
          
          <div style={s.inputContainer}>
            <label style={s.fieldLabel}>Nombre de la Cinta</label>
            <input 
              style={s.toolInput} 
              placeholder="Ej. Amarilla Avanzada..." 
              value={form.nombre} 
              onChange={e => setForm({...form, nombre: e.target.value})} 
            />
          </div>

          <label style={s.fieldLabel}>Colores Predefinidos</label>
          <div style={s.suggestedGrid}>
            {SUGGESTED_COLORS.map((sc, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setForm({ ...form, bg: sc.bg, tx: sc.tx })}
                style={{
                  ...s.suggestedColorBtn,
                  backgroundColor: sc.bg,
                  border: form.bg === sc.bg ? '2.5px solid var(--accent-blue)' : '1px solid var(--border)',
                  transform: form.bg === sc.bg ? 'scale(1.05)' : 'scale(1)',
                }}
                title={`Color ${sc.label}`}
              >
                <div style={{ ...s.suggestedInner, backgroundColor: sc.tx }} />
              </button>
            ))}
          </div>
          
          <div style={s.toolPickerRow}>
            <div style={s.pickerCell}>
              <label style={s.pickerLabel}>Fondo Manual</label>
              <div style={s.colorInputWrapper}>
                <input type="color" value={form.bg} onChange={e => { setForm({...form, bg: e.target.value, tx: autoText(e.target.value)}) }} style={s.colorPick} />
                <span style={s.colorHexVal}>{form.bg.toUpperCase()}</span>
              </div>
            </div>
            <div style={s.pickerCell}>
              <label style={s.pickerLabel}>Texto Manual</label>
              <div style={s.colorInputWrapper}>
                <input type="color" value={form.tx} onChange={e => setForm({...form, tx: e.target.value})} style={s.colorPick} />
                <span style={s.colorHexVal}>{form.tx.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <label style={s.fieldLabel}>Vista Previa del Grado</label>
          {renderBeltPreview(form.bg, form.tx, form.nombre)}

          <div style={s.btnGroup}>
            <button
              style={s.btnSave}
              onClick={handleSave}
              disabled={saving}
              onMouseEnter={e => {
                if (!saving) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.4)'
                  e.currentTarget.style.filter = 'brightness(1.1)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.2)'
                e.currentTarget.style.filter = 'none'
              }}
            >
              {saving ? '...' : (editId ? 'Guardar Cambios' : 'Crear Grado')}
            </button>
            {editId && (
              <button 
                style={s.btnCancel} 
                onClick={() => {setEditId(null); setForm({nombre:'', bg:'#3b82f6', tx:'#ffffff'})}}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.color = '#ffffff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Lista de Registros */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.listHeader}>
            <span>Grados Registrados</span>
            <span>Acciones y Orden</span>
          </div>
          <div style={s.toolList}>
            {loading ? (
              <div style={s.toolEmpty}>
                <div style={s.spinner} />
                <p>Cargando grados...</p>
              </div>
            ) : cintas.length === 0 ? (
              <div style={s.toolEmpty}>No hay grados registrados. Utiliza el editor lateral para crear uno.</div>
            ) : (
              cintas.map((c, i) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={handleDragEnd}
                  onMouseEnter={() => setHoveredRowId(c.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  style={{
                    ...s.toolRow,
                    borderColor: editId === c.id 
                      ? 'var(--accent-blue)' 
                      : dragOverIdx === i 
                      ? 'var(--accent-purple)' 
                      : 'var(--border)',
                    opacity: dragIdx === i ? 0.5 : 1,
                    transform: dragOverIdx === i 
                      ? 'translateY(-2px) scale(1.01)' 
                      : hoveredRowId === c.id 
                      ? 'translateY(-1px)' 
                      : 'none',
                    boxShadow: hoveredRowId === c.id 
                      ? '0 6px 16px rgba(0, 0, 0, 0.2)' 
                      : '0 2px 4px rgba(0, 0, 0, 0.05)',
                    background: hoveredRowId === c.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                  }}
                >
                  <div style={s.toolRowLeft}>
                    <span style={s.toolDragHandle} title="Arrastra para reordenar">⠿</span>
                    <span style={s.toolOrder}>#{i + 1}</span>
                    <div style={{
                      ...s.rowBeltPreview,
                      backgroundColor: c.color_hex,
                      color: c.color_texto,
                      boxShadow: `inset 0 1px 2px rgba(255,255,255,0.1), 0 2px 4px ${c.color_hex}25`
                    }}>
                      <span style={{ position: 'relative', zIndex: 3 }}>{c.nombre_nivel}</span>
                    </div>
                    <span style={s.toolHex}>{c.color_hex.toUpperCase()}</span>
                  </div>
                  <div style={s.toolActions}>
                    <button style={{ ...s.btnIcon, ...s.btnMove }} onClick={() => moveItem(i, -1)} disabled={i === 0} title="Subir">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                    </button>
                    <button style={{ ...s.btnIcon, ...s.btnMove }} onClick={() => moveItem(i, 1)} disabled={i === cintas.length - 1} title="Bajar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                    <button
                      style={{ ...s.btnIcon, ...s.btnEdit }}
                      onClick={() => startEdit(c)}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#3b82f6'
                        e.currentTarget.style.color = '#ffffff'
                        e.currentTarget.style.transform = 'scale(1.1)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(59,130,246,0.1)'
                        e.currentTarget.style.color = 'var(--accent-blue)'
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                      title="Editar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button
                      style={{ ...s.btnIcon, ...s.btnDel }}
                      onClick={() => handleDelete(c)}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#ef4444'
                        e.currentTarget.style.color = '#ffffff'
                        e.currentTarget.style.transform = 'scale(1.1)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                        e.currentTarget.style.color = 'var(--accent-red)'
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                      title="Borrar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  subtitleMain: { color: 'var(--text-secondary)', fontSize: '15px', marginTop: '4px' },
  pageTool: { paddingBottom: '40px', width: '100%', boxSizing: 'border-box' },
  btnBack: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', padding: '8px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', marginBottom: '24px' },
  toolHeaderRow: { marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titleTool: { fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 },
  toolLayout: { display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' },
  
  // Card styling
  toolFormCard: { 
    width: '360px', 
    background: 'linear-gradient(145deg, var(--bg-secondary) 0%, rgba(30, 41, 59, 0.4) 100%)', 
    borderRadius: '24px', 
    border: '1px solid rgba(255, 255, 255, 0.08)', 
    padding: '28px', 
    position: 'sticky', 
    top: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  cardHeaderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
  },
  toolLabel: { fontSize: '14px', color: '#fff', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' },
  
  // Fields styling
  inputContainer: { display: 'flex', flexDirection: 'column', gap: '6px' },
  fieldLabel: { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  toolInput: { width: '100%', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', ':focus': { borderColor: 'var(--accent-blue)' } },
  
  // Suggested colors
  suggestedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
  },
  suggestedColorBtn: {
    height: '36px',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
    padding: 0,
    outline: 'none',
  },
  suggestedInner: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    opacity: 0.5,
  },

  // Color picker row
  toolPickerRow: { display: 'flex', gap: '16px' },
  pickerCell: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  pickerLabel: { fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' },
  colorInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '6px 10px',
    gap: '8px',
  },
  colorPick: { width: '28px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, borderRadius: '6px', overflow: 'hidden' },
  colorHexVal: { fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 'bold' },

  // Belt shape rendering in form
  previewBelt: {
    height: '52px',
    borderRadius: '14px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  beltTexture: {
    position: 'absolute',
    inset: 0,
    background: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.03), rgba(0,0,0,0.03) 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
    pointerEvents: 'none',
  },
  beltStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '8px',
    top: 'calc(50% - 4px)',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
    zIndex: 1,
  },
  beltTip: {
    position: 'absolute',
    right: '20px',
    top: 0,
    bottom: 0,
    width: '32px',
    backgroundColor: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
  },
  tipStripes: {
    height: '60%',
    width: '10px',
    display: 'flex',
    justifyContent: 'space-around',
  },
  previewText: {
    position: 'relative',
    zIndex: 3,
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
    fontWeight: '900',
    fontSize: '13px',
    letterSpacing: '0.5px',
  },

  // Save buttons
  btnGroup: { display: 'flex', gap: '10px' },
  btnSave: { flex: 1, background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)', transition: 'all 0.2s' },
  btnCancel: { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', cursor: 'pointer', fontWeight: '700' },
  
  // List styling
  listHeader: { display: 'flex', justifyContent: 'space-between', padding: '10px 20px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' },
  toolList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  
  // Belt rows
  toolRow: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '12px 20px', 
    background: 'var(--bg-secondary)', 
    border: '1px solid var(--border)', 
    borderRadius: '20px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  toolRowLeft: { display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 },
  toolDragHandle: { fontSize: '16px', color: 'var(--text-muted)', cursor: 'grab', padding: '0 4px', userSelect: 'none', ':hover': { color: 'var(--accent-purple)' } },
  toolOrder: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' },
  rowBeltPreview: {
    padding: '8px 18px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '900',
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    minWidth: '150px',
  },
  toolHex: { fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.8 },
  
  // Action buttons inside rows
  toolActions: { display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' },
  btnIcon: { width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', },
  btnEdit: { background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)', borderColor: 'rgba(59,130,246,0.2)', ':hover': { background: 'var(--accent-blue)', color: '#fff' } },
  btnDel: { background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.2)', ':hover': { background: 'var(--accent-red)', color: '#fff' } },
  btnMove: { background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', borderColor: 'var(--border)', ':hover': { background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }, ':disabled': { opacity: 0.3, cursor: 'not-allowed', ':hover': { background: 'transparent', color: 'var(--text-muted)' } } },
  
  toolEmpty: { textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '1px dashed var(--border)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' },
  spinner: { width: '28px', height: '28px', border: '3px solid var(--border)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }
}
