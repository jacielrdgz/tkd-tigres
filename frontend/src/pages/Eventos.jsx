import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const VACIO = { nombre: '', tipo: 'examen', fecha: '', lugar: '', descripcion: '', costo: '' }

const COLOR_TIPO = {
  examen:       { bg: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' },
  torneo:       { bg: 'var(--accent-green-bg)', color: 'var(--accent-green)' },
  demostracion: { bg: 'var(--accent-orange-bg)', color: 'var(--accent-orange)' },
  seminario:    { bg: 'var(--accent-purple-bg)', color: 'var(--accent-purple)' },
}

export default function Eventos() {
  const navigate = useNavigate()
  const [eventos, setEventos]   = useState([])
  const [submodulo, setSubmodulo] = useState('examenes') 
  const [cargando, setCargando] = useState(true)

  const [modalEvento, setModalEvento] = useState(false)
  const [formEvento, setFormEvento]   = useState(VACIO)
  const [editando, setEditando]       = useState(null)

  useEffect(() => { cargarDatosBasicos() }, [])

  const cargarDatosBasicos = async () => {
    setCargando(true)
    try {
      const resE = await api.get('/eventos')
      setEventos(resE.data)
    } catch (e) { console.error(e) } 
    finally { setCargando(false) }
  }


  // --- CRUD EVENTOS ---
  const abrirCrear = () => { 
    setFormEvento({ ...VACIO, tipo: submodulo === 'otros' ? 'seminario' : (submodulo === 'examenes' ? 'examen' : 'torneo') })
    setEditando(null)
    setModalEvento(true) 
  }
  
  const abrirEditar = (e, ev) => {
    ev.stopPropagation()
    setFormEvento({
      nombre: e.nombre, tipo: e.tipo, fecha: e.fecha,
      lugar: e.lugar || '', descripcion: e.descripcion || '', costo: e.costo || ''
    })
    setEditando(e.id)
    setModalEvento(true)
  }

  const guardarEvento = async () => {
    try {
      if (editando) await api.put(`/eventos/${editando}`, formEvento)
      else await api.post('/eventos', formEvento)
      setModalEvento(false)
      cargarDatosBasicos()
    } catch (err) { alert('Error al guardar.') }
  }
  const eliminarEvento = async (id, ev) => {
    ev.stopPropagation()
    if (!confirm('¿Eliminar evento?')) return
    await api.delete(`/eventos/${id}`)
    cargarDatosBasicos()
  }

  const eventosFiltrados = useMemo(() => {
    return eventos.filter(e => {
      if (submodulo === 'examenes') return e.tipo === 'examen'
      if (submodulo === 'torneos') return e.tipo === 'torneo'
      return e.tipo === 'seminario' || e.tipo === 'demostracion' || e.tipo === 'otros'
    })
  }, [eventos, submodulo])




  // --- RENDER ---
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div><h2 style={s.titulo}>Eventos</h2><p style={s.sub}>Gestión de actividades y evaluaciones</p></div>
        <button style={s.btnPrimary} onClick={abrirCrear}>+ Nuevo Evento</button>
      </div>

      <div style={s.subnav}>
        <button style={submodulo === 'examenes' ? s.subnavBtnActive : s.subnavBtn} onClick={() => setSubmodulo('examenes')}>Exámenes</button>
        <button style={submodulo === 'torneos'  ? s.subnavBtnActive : s.subnavBtn} onClick={() => setSubmodulo('torneos')}>Torneos</button>
        <button style={submodulo === 'otros'    ? s.subnavBtnActive : s.subnavBtn} onClick={() => setSubmodulo('otros')}>Otros</button>
      </div>

      <div style={s.grid}>
        {eventosFiltrados.map(e => {
          const c = COLOR_TIPO[e.tipo] || { bg: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
          return (
            <div key={e.id} style={{ ...s.card, cursor: 'pointer' }} onClick={() => navigate(`/eventos/${e.id}`)}>
              <div style={s.cardTop}><span style={{ ...s.tipoBadge, background: c.bg, color: c.color }}>{e.tipo.toUpperCase()}</span></div>
              <div style={s.cardNombre}>{e.nombre}</div>
              <div style={s.cardFecha}>📅 {e.fecha}</div>
              {e.lugar && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>📍 {e.lugar}</div>}
              <div style={s.cardAcciones}>
                <button style={s.btnEdit} onClick={(ev) => abrirEditar(e, ev)}>✏️ Editar</button>
                <button style={s.btnDel}  onClick={(ev) => eliminarEvento(e.id, ev)}>🗑️</button>
              </div>
            </div>
          )
        })}
        {eventosFiltrados.length === 0 && (
          <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>No hay eventos en esta categoría.</p>
        )}
      </div>

      {/* MODAL CREAR / EDITAR EVENTO */}
      {modalEvento && (
        <div style={s.overlay}><div style={s.modal}>
          <div style={s.modalHeader}><h3 style={s.modalTitulo}>{editando ? 'Editar Evento' : 'Nuevo Evento'}</h3><button style={s.btnCerrar} onClick={() => setModalEvento(false)}>✕</button></div>
          <div style={s.campoGroup}><label style={s.label}>Nombre</label><input style={s.input} value={formEvento.nombre} onChange={e=>setFormEvento({...formEvento, nombre: e.target.value})} /></div>
          <div style={s.grid2}>
            <div><label style={s.label}>Tipo</label><select style={s.select} value={formEvento.tipo} onChange={e=>setFormEvento({...formEvento, tipo: e.target.value})}>
              <option value="examen">Examen</option><option value="torneo">Torneo</option><option value="seminario">Seminario</option><option value="demostracion">Demostración</option>
            </select></div>
            <div><label style={s.label}>Fecha</label><input style={s.input} type="date" value={formEvento.fecha} onChange={e=>setFormEvento({...formEvento, fecha: e.target.value})} /></div>
          </div>
          <div style={s.grid2}>
            <div><label style={s.label}>Lugar</label><input style={s.input} value={formEvento.lugar} onChange={e=>setFormEvento({...formEvento, lugar: e.target.value})} /></div>
            <div><label style={s.label}>Costo General ($)</label><input style={s.input} type="number" value={formEvento.costo} onChange={e=>setFormEvento({...formEvento, costo: e.target.value})} /></div>
          </div>
          <div style={s.modalFooter}><button style={s.btnSecondary} onClick={() => setModalEvento(false)}>Cancelar</button><button style={s.btnPrimary} onClick={guardarEvento}>Guardar</button></div>
        </div></div>
      )}
    </div>
  )
}

const s = {
  page:            { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header:          { display: 'flex', justifyContent: 'space-between', marginBottom: '24px' },
  titulo:          { fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' },
  sub:             { fontSize: '14px', color: 'var(--text-secondary)' },
  subnav:          { display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '24px' },
  subnavBtn:       { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', padding: '8px 16px', cursor: 'pointer', borderRadius: '8px' },
  subnavBtnActive: { background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', fontSize: '14px', fontWeight: '700', padding: '8px 16px', borderRadius: '8px' },
  grid:            { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  card:            { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)', transition: 'border-color 0.2s, box-shadow 0.2s' },
  cardTop:         { marginBottom: '12px' },
  tipoBadge:       { padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' },
  cardNombre:      { fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' },
  cardFecha:       { fontSize: '13px', color: 'var(--text-secondary)' },
  cardAcciones:    { display: 'flex', gap: '8px', marginTop: '16px' },
  btnEdit:         { flex: 1, padding: '8px', background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  btnDel:          { padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  overlay:         { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:           { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '24px', padding: '32px', width: '500px', maxWidth: '90vw' },
  modalHeader:     { display: 'flex', justifyContent: 'space-between', marginBottom: '24px' },
  modalTitulo:     { fontSize: '20px', fontWeight: '800' },
  btnCerrar:       { background: 'var(--bg-tertiary)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' },
  campoGroup:      { marginBottom: '16px' },
  label:           { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' },
  input:           { width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', boxSizing: 'border-box' },
  select:          { width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', boxSizing: 'border-box' },
  grid2:           { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  modalFooter:     { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' },
  btnPrimary:      { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary:    { background: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer' },
}