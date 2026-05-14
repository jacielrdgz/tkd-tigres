import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'

const tieneFoto = (foto) => {
  if (!foto || foto === 'null' || foto === 'NULL' || foto === '') return false
  return true
}

const limpiarUrl = (url) => {
  if (!url) return null
  return url.replace(/\\\//g, '/')
}

const obtenerIniciales = (nombre, apellido) => {
  if (!nombre) return '?'
  const n = nombre.charAt(0)
  const a = apellido ? apellido.charAt(0) : ''
  return (n + a).toUpperCase()
}

const formatCosto = (val) => {
  if (!val) return '-'
  const num = parseFloat(val)
  if (isNaN(num)) return '-'
  return num % 1 === 0 ? num.toString() : num.toFixed(2)
}

export default function EventoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [evento, setEvento]       = useState(null)
  const [inscritos, setInscritos] = useState([])
  const [alumnos, setAlumnos]     = useState([])
  const [cintas, setCintas]       = useState([])
  const [cargando, setCargando]   = useState(true)
  const [rowHover, setRowHover]   = useState(null)

  // Modal editar evento base
  const [modalEvento, setModalEvento] = useState(false)
  const [formEvento, setFormEvento]   = useState({ nombre: '', tipo: '', fecha: '', lugar: '', costo: '' })

  // Modal inscripción
  const [modalInscripcion, setModalInscripcion] = useState(false)
  const [busquedaAlumno, setBusquedaAlumno]     = useState('')
  const [guardando, setGuardando]               = useState(false)
  const [editandoInscrito, setEditandoInscrito] = useState(null)
  const [form, setForm] = useState({
    alumno_id: '', nombre_alumno: '', pagado: false,
    grado_actual_id: '', grado_siguiente_id: '', costo_examen: ''
  })

  // Búsqueda en tabla
  const [busquedaTabla, setBusquedaTabla] = useState('')

  useEffect(() => { cargar() }, [id])

  const cargar = async () => {
    setCargando(true)
    try {
      const [resEv, resIns, resA, resC] = await Promise.all([
        api.get(`/eventos/${id}`),
        api.get(`/eventos/${id}/inscritos`),
        api.get('/alumnos'),
        api.get('/configuraciones-cintas'),
      ])
      setEvento(resEv.data)
      setInscritos(resIns.data)
      setAlumnos(resA.data.filter(a => a.estatus === 'activo'))
      setCintas(resC.data)
      setFormEvento({ 
        nombre: resEv.data.nombre, 
        tipo: resEv.data.tipo, 
        fecha: resEv.data.fecha, 
        lugar: resEv.data.lugar || '', 
        costo: resEv.data.costo || '' 
      })
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  const recargarInscritos = async () => {
    const res = await api.get(`/eventos/${id}/inscritos`)
    setInscritos(res.data)
  }

  const guardarEvento = async () => {
    try {
      await api.put(`/eventos/${id}`, formEvento)
      setModalEvento(false)
      cargar()
    } catch (e) { alert('Error al actualizar evento') }
  }

  const abrirInscripcion = () => {
    setForm({ 
      alumno_id: '', 
      nombre_alumno: '', 
      pagado: false, 
      grado_actual_id: '', 
      grado_siguiente_id: '', 
      costo: evento?.costo || '' 
    })
    setBusquedaAlumno('')
    setEditandoInscrito(null)
    setModalInscripcion(true)
  }

  const abrirEditarInscrito = (inscrito) => {
    setForm({
      alumno_id: inscrito.id,
      nombre_alumno: `${inscrito.nombre} ${inscrito.apellido_paterno}`,
      pagado: inscrito.pagado,
      grado_actual_id: inscrito.examen_detalle?.grado_actual_id || '',
      grado_siguiente_id: inscrito.examen_detalle?.grado_siguiente_id || inscrito.torneo_detalle?.grado_siguiente_id || '',
      costo: esExamen ? (inscrito.examen_detalle?.costo_examen) : (inscrito.torneo_detalle?.costo_torneo || evento?.costo || '')
    })
    setEditandoInscrito(inscrito.id)
    setModalInscripcion(true)
  }

  const seleccionarAlumno = async (alumno) => {
    try {
      const res = await api.get(`/alumnos/${alumno.id}/predecir-grado`)
      setForm(prev => ({
        ...prev,
        alumno_id: alumno.id,
        nombre_alumno: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.trim(),
        grado_actual_id: res.data.grado_actual?.id || '',
        grado_siguiente_id: res.data.grado_siguiente?.id || '',
        costo: prev.costo || evento?.costo || ''
      }))
    } catch (e) {
      setForm(prev => ({
        ...prev,
        alumno_id: alumno.id,
        nombre_alumno: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.trim(),
        costo: prev.costo || evento?.costo || ''
      }))
    } finally {
      setBusquedaAlumno('')
    }
  }

  const guardarInscripcion = async () => {
    if (!form.alumno_id) return
    setGuardando(true)
    try {
      const payload = {
        alumno_id: form.alumno_id,
        pagado: form.pagado,
        grado_actual_id: form.grado_actual_id,
        grado_siguiente_id: form.grado_siguiente_id,
      }
      
      if (esExamen) {
        payload.costo_examen = form.costo === '' ? null : form.costo
      } else {
        payload.costo_torneo = form.costo === '' ? null : form.costo
      }

      if (editandoInscrito) {
        await api.put(`/eventos/${id}/alumnos/${editandoInscrito}`, payload)
      } else {
        await api.post(`/eventos/${id}/inscribir`, payload)
      }
      
      setModalInscripcion(false)
      recargarInscritos()
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar inscripción.')
    } finally {
      setGuardando(false)
    }
  }

  const actualizarAtributo = async (alumnoId, data) => {
    try {
      await api.put(`/eventos/${id}/alumnos/${alumnoId}`, data)
      recargarInscritos()
    } catch (e) { console.error(e) }
  }

  const eliminarInscrito = async (alumnoId) => {
    if (!confirm('¿Eliminar inscripción?')) return
    await api.delete(`/eventos/${id}/alumnos/${alumnoId}`)
    recargarInscritos()
  }

  const alumnosFiltrados = useMemo(() => {
    if (!busquedaAlumno || busquedaAlumno.length < 1) return []
    return alumnos.filter(a =>
      `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno}`.toLowerCase().includes(busquedaAlumno.toLowerCase())
    ).slice(0, 6)
  }, [alumnos, busquedaAlumno])

  const inscritosFiltrados = useMemo(() => {
    if (!busquedaTabla) return inscritos
    return inscritos.filter(a =>
      `${a.nombre} ${a.apellido_paterno}`.toLowerCase().includes(busquedaTabla.toLowerCase())
    )
  }, [inscritos, busquedaTabla])

  const COLOR_TIPO = {
    examen:       { bg: 'var(--accent-blue-bg)',   color: 'var(--accent-blue)' },
    torneo:       { bg: 'var(--accent-green-bg)',  color: 'var(--accent-green)' },
    demostracion: { bg: 'var(--accent-orange-bg)', color: 'var(--accent-orange)' },
    seminario:    { bg: 'var(--accent-purple-bg)', color: 'var(--accent-purple)' },
  }

  if (cargando) return (
    <div style={{ padding: '40px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>Cargando...</div>
  )
  if (!evento) return (
    <div style={{ padding: '40px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>Evento no encontrado.</div>
  )

  const c = COLOR_TIPO[evento.tipo] || { bg: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
  const esExamen = evento.tipo === 'examen'

  const headers = [
    '#', 'Alumno',
    ...(esExamen ? ['Grado Actual', 'Grado Siguiente'] : []),
    'Costo', 'Pagado', 'Resultado', 'Acciones'
  ]

  return (
    <div style={s.container}>

      {/* ── HEADER ── */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button style={s.btnBack} onClick={() => navigate('/eventos')}>← Volver</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={s.titulo}>{evento.nombre}</h2>
              <span style={{ ...s.badge, background: c.bg, color: c.color }}>{evento.tipo.toUpperCase()}</span>
              <button 
                style={{ ...s.btnEditMini, marginLeft: '8px' }} 
                onClick={() => setModalEvento(true)}
                title="Editar evento"
              >
                ✏️
              </button>
            </div>
            <p style={s.sub}>📅 {evento.fecha}{evento.lugar ? ` · 📍 ${evento.lugar}` : ''}</p>
          </div>
        </div>
        <button style={s.btnNuevo} onClick={abrirInscripcion}>+ Inscribir Alumno</button>
      </div>

      {/* ── BARRA BÚSQUEDA ── */}
      <div style={s.barraAcciones}>
        <input
          style={s.search}
          placeholder="🔍  Buscar inscrito..."
          value={busquedaTabla}
          onChange={e => setBusquedaTabla(e.target.value)}
        />
        <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>
          {inscritosFiltrados.length} inscritos
        </span>
      </div>

      {/* ── TABLA ── */}
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      <div style={s.tabla}>
        <div style={s.tablaScroll}>
          <table style={{ ...s.table, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '45px' }} />
              <col style={{ width: '220px' }} />
              {esExamen && <col style={{ width: '140px' }} />}
              {esExamen && <col style={{ width: '140px' }} />}
              <col style={{ width: '90px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead>
              <tr>
                {headers.map(h => (
                  <th key={h} style={{ ...s.th, textAlign: h === 'Alumno' ? 'left' : 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inscritosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} style={s.tdCenter}>
                    {busquedaTabla ? 'No se encontraron resultados.' : 'Aún no hay alumnos inscritos.'}
                  </td>
                </tr>
              ) : (
                inscritosFiltrados.map((a, idx) => (
                  <tr
                    key={a.id}
                    style={{
                      ...s.tr,
                      background: rowHover === a.id ? 'var(--bg-tertiary)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={() => setRowHover(a.id)}
                    onMouseLeave={() => setRowHover(null)}
                  >
                    {/* # */}
                    <td style={{ ...s.td, color: 'var(--text-muted)', fontWeight: '500' }}>{idx + 1}</td>

                    {/* Alumno */}
                    <td style={{ ...s.td, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={s.fotoBox}>
                          {tieneFoto(a.foto_url) ? (
                            <img 
                              src={limpiarUrl(a.foto_url)} 
                              alt="foto" 
                              style={s.fotoImg} 
                              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
                            />
                          ) : null}
                          <div style={{ ...s.fotoVacia, display: tieneFoto(a.foto_url) ? 'none' : 'flex' }}>
                            {obtenerIniciales(a.nombre, a.apellido_paterno)}
                          </div>
                        </div>
                        <div>
                          <div style={{ ...s.nombreNom, maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.nombre} {a.apellido_paterno}
                          </div>
                          <div style={s.emailSub}>ID: {a.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Grado Actual */}
                    {esExamen && (
                      <td style={s.td}>
                        <span style={{ 
                          ...s.cinta, 
                          background: a.examen_detalle?.grado_actual?.color_hex || 'var(--bg-tertiary)', 
                          color: a.examen_detalle?.grado_actual?.color_texto || 'var(--text-primary)' 
                        }}>
                          {a.examen_detalle?.grado_actual?.nombre_nivel || '-'}
                        </span>
                      </td>
                    )}

                    {/* Grado Siguiente */}
                    {esExamen && (
                      <td style={s.td}>
                        <span style={{ 
                          ...s.cinta, 
                          background: a.examen_detalle?.grado_siguiente?.color_hex || 'var(--accent-blue-bg)', 
                          color: a.examen_detalle?.grado_siguiente?.color_texto || 'var(--accent-blue)' 
                        }}>
                          {a.examen_detalle?.grado_siguiente?.nombre_nivel || '-'}
                        </span>
                      </td>
                    )}

                    {/* Costo */}
                    <td style={s.td}>
                      {esExamen
                        ? (a.examen_detalle?.costo_examen ? `$${formatCosto(a.examen_detalle.costo_examen)}` : '-')
                        : (a.torneo_detalle?.costo_torneo ? `$${formatCosto(a.torneo_detalle.costo_torneo)}` : '-')}
                    </td>

                    {/* Pagado */}
                    <td style={s.td}>
                      <button
                        onClick={() => actualizarAtributo(a.id, { pagado: !a.pagado })}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.filter = 'brightness(1.1)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.filter = 'brightness(1)';
                        }}
                        style={{
                          ...s.paymentBadge,
                          background: a.pagado ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: a.pagado ? '#22c55e' : '#ef4444',
                          borderColor: a.pagado ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        <span style={{ fontSize: '10px' }}>{a.pagado ? '●' : '○'}</span>
                        {a.pagado ? 'PAGADO' : 'PENDIENTE'}
                      </button>
                    </td>

                    {/* Resultado */}
                    <td style={s.td}>
                      <select
                        style={s.selectCompact}
                        value={esExamen ? (a.examen_detalle?.resultado || 'pendiente') : (a.torneo_detalle?.resultado || 'pendiente')}
                        onChange={e => actualizarAtributo(a.id, esExamen ? { resultado_examen: e.target.value } : { resultado_torneo: e.target.value })}
                        onMouseOver={e => {
                          e.currentTarget.style.borderColor = 'var(--accent-blue)';
                          e.currentTarget.style.background = 'var(--bg-secondary)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.background = 'var(--bg-tertiary)';
                        }}
                      >
                        <option value="pendiente">Pendiente</option>
                        {esExamen ? (
                          <>
                            <option value="aprobado">Aprobado</option>
                            <option value="reprobado">Reprobado</option>
                          </>
                        ) : (
                          <>
                            <option value="oro">Oro</option>
                            <option value="plata">Plata</option>
                            <option value="bronce">Bronce</option>
                            <option value="eliminado">Eliminado</option>
                          </>
                        )}
                      </select>
                    </td>

                    {/* Acciones */}
                    <td style={s.td}>
                      <div style={s.acciones}>
                        <button
                          style={{ ...s.btnIcon, ...s.btnEditRow }}
                          onClick={() => abrirEditarInscrito(a)}
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button
                          style={{ ...s.btnIcon, ...s.btnDelRow }}
                          onClick={() => eliminarInscrito(a.id)}
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
                          title="Eliminar"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL INSCRIBIR ── */}
      {modalInscripcion && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, overflow: 'visible' }}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitulo}>{editandoInscrito ? 'Editar Inscripción' : 'Inscribir Alumno'}</h3>
              <button style={s.btnCerrar} onClick={() => setModalInscripcion(false)}>✕</button>
            </div>

            <div style={s.grid2}>
              {/* Buscador (solo si no es edición) */}
              <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                <label style={s.label}>Alumno</label>
                <input
                  style={{ ...s.input, background: editandoInscrito ? 'var(--bg-tertiary)' : 'var(--bg-primary)' }}
                  placeholder="Escribe el nombre..."
                  value={form.nombre_alumno || busquedaAlumno}
                  readOnly={!!editandoInscrito}
                  autoFocus={!editandoInscrito}
                  onChange={e => {
                    if (editandoInscrito) return
                    setBusquedaAlumno(e.target.value)
                    if (form.alumno_id) setForm({ ...form, alumno_id: '', nombre_alumno: '' })
                  }}
                />
                {!editandoInscrito && alumnosFiltrados.length > 0 && (
                  <div style={s.dropdown}>
                    {alumnosFiltrados.map(a => (
                      <div key={a.id} style={s.dropItem} onMouseDown={() => seleccionarAlumno(a)}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{a.nombre} {a.apellido_paterno} {a.apellido_materno}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {a.id}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Grados (solo examen) */}
              {esExamen && (
                <>
                  <div>
                    <label style={s.label}>Grado Actual</label>
                    <select disabled style={{ ...s.select, opacity: 0.6, background: 'var(--bg-tertiary)' }} value={form.grado_actual_id}>
                      <option value="">-</option>
                      {cintas.map(c => <option key={c.id} value={c.id}>{c.nombre_nivel}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Grado Siguiente</label>
                    <select style={s.select} value={form.grado_siguiente_id} onChange={e => setForm({ ...form, grado_siguiente_id: e.target.value })}>
                      <option value="">-</option>
                      {cintas.map(c => <option key={c.id} value={c.id}>{c.nombre_nivel}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label style={s.label}>{esExamen ? 'Costo Examen' : 'Costo Torneo'} ($)</label>
                <input style={s.input} type="number" value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.pagado} onChange={e => setForm({ ...form, pagado: e.target.checked })} />
                  ¿Pago realizado?
                </label>
              </div>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setModalInscripcion(false)}>Cancelar</button>
              <button style={s.btnPrimary} onClick={guardarInscripcion} disabled={!form.alumno_id || guardando}>
                {guardando ? 'Guardando...' : (editandoInscrito ? 'Guardar Cambios' : 'Inscribir Ahora')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR EVENTO BASE ── */}
      {modalEvento && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitulo}>Editar Detalles del Evento</h3>
              <button style={s.btnCerrar} onClick={() => setModalEvento(false)}>✕</button>
            </div>
            <div style={s.campoGroup}>
              <label style={s.label}>Nombre del Evento</label>
              <input 
                style={s.input} 
                value={formEvento.nombre} 
                onChange={e => setFormEvento({...formEvento, nombre: e.target.value})} 
              />
            </div>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>Tipo</label>
                <select 
                  style={s.select} 
                  value={formEvento.tipo} 
                  onChange={e => setFormEvento({...formEvento, tipo: e.target.value})}
                >
                  <option value="examen">Examen</option>
                  <option value="torneo">Torneo</option>
                  <option value="seminario">Seminario</option>
                  <option value="demostracion">Demostración</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Fecha</label>
                <input 
                  style={s.input} 
                  type="date" 
                  value={formEvento.fecha} 
                  onChange={e => setFormEvento({...formEvento, fecha: e.target.value})} 
                />
              </div>
            </div>
            <div style={s.campoGroup}>
              <label style={s.label}>Lugar</label>
              <input 
                style={s.input} 
                value={formEvento.lugar} 
                onChange={e => setFormEvento({...formEvento, lugar: e.target.value})} 
              />
            </div>
            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setModalEvento(false)}>Cancelar</button>
              <button style={s.btnPrimary} onClick={guardarEvento}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


const s = {
  container:   { scrollbarGutter: 'stable', paddingBottom: '40px', fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  titulo:      { fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 },
  sub:         { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' },
  badge:       { padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' },
  btnBack:     { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 16px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px', transition: 'all 0.2s' },
  btnNuevo:    { background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-md)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' },
  barraAcciones: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '16px' },
  search:      { flex: 1, maxWidth: '395px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '80px', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.3s ease', fontSize: '14px' },
  tabla:       { background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-md)', width: '100%', boxSizing: 'border-box' },
  tablaScroll: { width: '100%', overflowX: 'auto', overflowY: 'hidden' },
  table:       { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '1000px' },
  th:          { padding: '10px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'var(--bg-tertiary)' },
  tr:          { borderBottom: '1px solid var(--border)' },
  td:          { padding: '10px 16px', fontSize: '14px', color: 'var(--text-secondary)', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden' },
  tdCenter:    { padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' },
  fotoBox:     { width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border)', flexShrink: 0, background: 'var(--bg-tertiary)', position: 'relative' },
  fotoImg:     { width: '100%', height: '100%', objectFit: 'cover' },
  fotoVacia:   { width: '100%', height: '100%', background: 'var(--accent-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: 'var(--accent-blue)', position: 'absolute', top: 0, left: 0 },
  nombreNom:   { fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' },
  emailSub:    { fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' },
  cinta:       { padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'inline-block', minWidth: '100px', textAlign: 'center' },
  btnEditMini: { background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' },
  paymentBadge: { 
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '12px', 
    fontSize: '11px', fontWeight: '800', cursor: 'pointer', border: 'none', transition: 'all 0.2s ease', outline: 'none'
  },
  btnIcon:     { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease' },
  btnEditRow:  { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
  btnDelRow:   { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
  selectCompact: { 
    padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--border)', 
    fontSize: '12px', fontWeight: '700', background: 'var(--bg-tertiary)', 
    color: 'var(--text-primary)', cursor: 'pointer', maxWidth: '140px', 
    outline: 'none', transition: 'all 0.2s', appearance: 'none',
    textAlign: 'center', boxShadow: 'var(--shadow-sm)'
  },
  acciones:    { display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal:       { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  modalTitulo: { color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700' },
  btnCerrar:   { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' },
  grid2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  label:       { display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' },
  input:       { width: '100%', fontSize: '14px', padding: '9px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' },
  select:      { width: '100%', padding: '9px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' },
  btnPrimary:  { background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-md)', transition: 'all 0.2s' },
  btnSecondary:{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  dropdown:    { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 100, maxHeight: '220px', overflowY: 'auto' },
  dropItem:    { padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' },
}
