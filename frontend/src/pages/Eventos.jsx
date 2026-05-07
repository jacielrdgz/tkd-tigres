import { useEffect, useState } from 'react'
import api from '../api/axios'

const VACIO = {
  nombre: '',
  tipo: 'examen',
  fecha: '',
  descripcion: '',
}

const COLOR_TIPO = {
  examen:    { bg: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' },
  torneo:    { bg: 'var(--accent-green-bg)', color: 'var(--accent-green)' },
  seminario: { bg: 'var(--accent-purple-bg)', color: 'var(--accent-purple)' },
}

export default function Eventos() {
  const [eventos, setEventos]   = useState([])
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(VACIO)
  const [editando, setEditando] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargar = () => {
    setCargando(true)
    api.get('/eventos')
      .then(res => setEventos(res.data))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [])

  const abrirCrear = () => { setForm(VACIO); setEditando(null); setModal(true) }

  const abrirEditar = (e) => {
    setForm({
      nombre:      e.nombre,
      tipo:        e.tipo,
      fecha:       e.fecha,
      descripcion: e.descripcion || '',
    })
    setEditando(e.id)
    setModal(true)
  }

  const cerrar = () => setModal(false)

  const guardar = async () => {
    try {
      if (editando) {
        await api.put(`/eventos/${editando}`, form)
      } else {
        await api.post('/eventos', form)
      }
      cerrar()
      cargar()
    } catch (err) {
      alert('Error al guardar. Verifica los campos.')
    }
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return
    await api.delete(`/eventos/${id}`)
    cargar()
  }

  const esPasado = (fecha) => new Date(fecha) < new Date()

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Eventos</h2>
          <p style={s.sub}>Torneos, exámenes y seminarios</p>
        </div>
        <button style={s.btnPrimary} onClick={abrirCrear}>+ Nuevo evento</button>
      </div>

      <div style={s.grid}>
        {cargando ? (
          <p style={s.vacio}>Cargando...</p>
        ) : eventos.length === 0 ? (
          <p style={s.vacio}>No hay eventos registrados</p>
        ) : eventos.map(e => {
          const c = COLOR_TIPO[e.tipo] || { bg: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
          const pasado = esPasado(e.fecha)
          return (
            <div key={e.id} style={{ ...s.card, opacity: pasado ? 0.6 : 1 }}>
              <div style={s.cardTop}>
                <span style={{ ...s.tipoBadge, background: c.bg, color: c.color }}>
                  {e.tipo.charAt(0).toUpperCase() + e.tipo.slice(1)}
                </span>
                {pasado && <span style={s.pasadoBadge}>Finalizado</span>}
              </div>
              <div style={s.cardNombre}>{e.nombre}</div>
              <div style={s.cardFecha}>📅 {e.fecha}</div>
              {e.descripcion && (
                <div style={s.cardDesc}>{e.descripcion}</div>
              )}
              <div style={s.cardAcciones}>
                <button style={s.btnEdit} onClick={() => abrirEditar(e)}>✏️ Editar</button>
                <button style={s.btnDel}  onClick={() => eliminar(e.id)}>🗑️ Eliminar</button>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitulo}>{editando ? 'Editar evento' : 'Nuevo evento'}</h3>
              <button style={s.btnCerrar} onClick={cerrar}>✕</button>
            </div>

            <div style={s.campoGroup}>
              <label style={s.label}>Nombre del evento</label>
              <input style={s.input} type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Tipo</label>
                <select style={s.select} value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                  <option value="examen">Examen</option>
                  <option value="torneo">Torneo</option>
                  <option value="seminario">Seminario</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Fecha</label>
                <input style={s.input} type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} />
              </div>
            </div>

            <div style={s.campoGroup}>
              <label style={s.label}>Descripción (opcional)</label>
              <textarea
                style={{ ...s.input, height: '80px', resize: 'vertical' }}
                value={form.descripcion}
                onChange={e => setForm({...form, descripcion: e.target.value})}
              />
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={cerrar}>Cancelar</button>
              <button style={s.btnPrimary}   onClick={guardar}>
                {editando ? 'Guardar cambios' : 'Crear evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  titulo:       { fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' },
  sub:          { fontSize: '14px', color: 'var(--text-secondary)' },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  card:         { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  cardTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tipoBadge:    { padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  pasadoBadge:  { fontSize: '11px', color: 'var(--text-muted)' },
  cardNombre:   { fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' },
  cardFecha:    { fontSize: '13px', color: 'var(--text-secondary)' },
  cardDesc:     { fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' },
  cardAcciones: { display: 'flex', gap: '8px', marginTop: '4px' },
  btnEdit:      { flex: 1, padding: '7px', background: 'var(--accent-blue-bg)', border: 'none', borderRadius: '6px', color: 'var(--accent-blue)', fontSize: '13px', cursor: 'pointer' },
  btnDel:       { flex: 1, padding: '7px', background: 'var(--accent-red-bg)', border: 'none', borderRadius: '6px', color: 'var(--accent-red)', fontSize: '13px', cursor: 'pointer' },
  vacio:        { color: 'var(--text-muted)', fontSize: '14px' },
  btnPrimary:   { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '14px', cursor: 'pointer', fontWeight: '600' },
  btnSecondary: { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 18px', fontSize: '14px', cursor: 'pointer' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:        { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  modalTitulo:  { fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' },
  btnCerrar:    { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' },
  grid2:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  campoGroup:   { marginBottom: '16px' },
  label:        { display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' },
  input:        { width: '100%', padding: '9px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' },
  select:       { width: '100%', padding: '9px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' },
  modalFooter:  { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' },
}