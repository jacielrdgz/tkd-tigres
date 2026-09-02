import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Swal from 'sweetalert2'
import CustomDropdown from '../components/Common/CustomDropdown'
import { getCache, setCache, invalidateCache } from '../utils/cacheManager'

const VACIO = { nombre: '', tipo: 'torneo', fecha: '', lugar: '', descripcion: '', costo: '' }

const COLOR_TIPO = {
  torneo:       { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  demostracion: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: 'rgba(249, 115, 22, 0.3)' },
  seminario:    { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
}

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function Eventos() {
  const navigate = useNavigate()
  const [eventos, setEventos]   = useState([])
  const [submodulo, setSubmodulo] = useState('todos') 
  const [cargando, setCargando] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('proximos') // todos, proximos, pasados

  const [modalEvento, setModalEvento] = useState(false)
  const [formEvento, setFormEvento]   = useState(VACIO)
  const [editando, setEditando]       = useState(null)

  useEffect(() => { cargarDatosBasicos() }, [])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setModalEvento(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const cargarDatosBasicos = async (force = false) => {
    if (!force) {
      const cached = getCache('eventos_lista')
      if (cached && cached.data) {
        setEventos(cached.data)
        setCargando(false)
      } else {
        setCargando(true)
      }
    } else {
      setCargando(true)
    }

    try {
      const resE = await api.get('/eventos')
      // Excluir exámenes ya que tienen su propio módulo independiente
      const evs = resE.data
        .filter(e => e.tipo !== 'examen')
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      setEventos(evs)
      setCache('eventos_lista', evs)
    } catch (e) {
      const cached = getCache('eventos_lista')
      if (!cached || !cached.data) {
        console.error(e)
      }
    } finally {
      setCargando(false)
    }
  }


  // --- CRUD EVENTOS ---
  const abrirCrear = () => { 
    setFormEvento({ ...VACIO, tipo: submodulo === 'otros' ? 'seminario' : 'torneo' })
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
      invalidateCache('eventos')
      cargarDatosBasicos(true)
    } catch (err) { alert('Error al guardar.') }
  }
  const eliminarEvento = async (id, ev) => {
    ev.stopPropagation()
    Swal.fire({
      title: '¿Confirmar borrado?',
      text: 'El evento se eliminará permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)', color: 'var(--text-primary)'
    }).then(async r => {
      if (r.isConfirmed) {
        try {
          await api.delete(`/eventos/${id}`)
          invalidateCache('eventos')
          cargarDatosBasicos(true)
        } catch (err) {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar el evento.',
            icon: 'error',
            confirmButtonColor: 'var(--accent-blue)',
            background: 'var(--bg-secondary)', color: 'var(--text-primary)'
          })
        }
      }
    })
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const hoyIso = hoy.toISOString().split('T')[0]

  const eventosFiltrados = useMemo(() => {
    return eventos.filter(e => {
      // 1. Tipo
      if (submodulo === 'torneos' && e.tipo !== 'torneo') return false
      if (submodulo === 'otros' && e.tipo === 'torneo') return false

      // 2. Busqueda
      if (busqueda && !e.nombre.toLowerCase().includes(busqueda.toLowerCase()) && !(e.lugar || '').toLowerCase().includes(busqueda.toLowerCase())) return false

      // 3. Mes
      if (filtroMes && !e.fecha.startsWith(filtroMes)) return false

      // 4. Estado
      if (filtroEstado === 'proximos' && e.fecha < hoyIso) return false
      if (filtroEstado === 'pasados' && e.fecha >= hoyIso) return false

      return true
    })
  }, [eventos, submodulo, busqueda, filtroMes, filtroEstado, hoyIso])

  // --- ESTADISTICAS ---
  const stats = useMemo(() => {
    const proximos = eventos.filter(e => e.fecha >= hoyIso)
    const delMes = eventos.filter(e => e.fecha.startsWith(hoyIso.substring(0, 7)))
    
    let proxMasCercano = null
    let diasFaltan = null
    if (proximos.length > 0) {
      proxMasCercano = proximos[0]
      const diffTime = Math.abs(new Date(proxMasCercano.fecha + 'T12:00:00') - hoy)
      diasFaltan = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    return { totalProximos: proximos.length, delMes: delMes.length, proxMasCercano, diasFaltan }
  }, [eventos, hoyIso])

  const formatFechaBloque = (fechaStr) => {
    if (!fechaStr) return { d: '-', m: '-' }
    const d = new Date(fechaStr + 'T12:00:00')
    return {
      d: String(d.getDate()).padStart(2, '0'),
      m: MESES_CORTO[d.getMonth()].toUpperCase()
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Eventos</h2>
          <p style={s.sub}>Gestión de actividades y evaluaciones</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={s.statBadge}>
            <span style={s.statLabel}>Próximo evento</span>
            <span style={s.statValor}>{stats.proxMasCercano ? stats.proxMasCercano.nombre : 'Ninguno'}</span>
            <span style={s.statSub}>
              {stats.diasFaltan !== null ? (stats.diasFaltan === 0 ? '¡Es Hoy!' : `En ${stats.diasFaltan} días`) : '-'}
            </span>
          </div>
          <div style={{ ...s.statBadge, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3)' }}>
            <span style={s.statLabel}>Total próximos</span>
            <span style={s.statValor}>{stats.totalProximos}</span>
            <span style={s.statSub}>Eventos programados</span>
          </div>
        </div>
      </div>

      <div style={s.subnav}>
        <button
          style={submodulo === 'todos' ? s.subnavBtnActive : s.subnavBtn}
          onClick={() => setSubmodulo('todos')}
        >
          Todos los Eventos
        </button>
        <button
          style={submodulo === 'torneos' ? s.subnavBtnActive : s.subnavBtn}
          onClick={() => setSubmodulo('torneos')}
        >
          Torneos
        </button>
        <button
          style={submodulo === 'otros' ? s.subnavBtnActive : s.subnavBtn}
          onClick={() => setSubmodulo('otros')}
        >
          Seminarios y Otros
        </button>
      </div>

      <div style={s.barraAcciones}>
        <div style={s.searchWrapper}>
          <svg style={s.searchIcon} width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            style={s.search}
            placeholder="Buscar por nombre o lugar..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        <div style={s.filtrosSecundarios}>
          <CustomDropdown
            label="Todos los estados"
            options={[
              { value: 'todos', label: 'Todos los estados' },
              { value: 'proximos', label: 'Próximos (Por venir)' },
              { value: 'pasados', label: 'Eventos Pasados' }
            ]}
            value={filtroEstado}
            onChange={val => setFiltroEstado(val)}
            minWidth="175px"
          />

          <input
            type="month"
            style={{ ...s.selectFiltro, paddingRight: 14 }}
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
          />
          {filtroMes && (
            <button style={{ background:'none', border:'none', color:'var(--accent-red)', cursor:'pointer', padding:'0 4px' }} onClick={() => setFiltroMes('')}>✕</button>
          )}

          <button
            style={{ ...s.btnNuevo, transition: 'all 0.2s' }}
            onClick={abrirCrear}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
          >
            + Nuevo Evento
          </button>
        </div>
      </div>

      <div style={s.grid}>
        {eventosFiltrados.map(e => {
          const c = COLOR_TIPO[e.tipo] || { bg: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: 'var(--border)' }
          const f = formatFechaBloque(e.fecha)
          const esPasado = e.fecha < hoyIso
          
          return (
            <div 
              key={e.id} 
              style={{ ...s.card, opacity: esPasado ? 0.75 : 1 }} 
              onClick={() => navigate(`/eventos/${e.id}`)}
              onMouseEnter={ev => { ev.currentTarget.style.transform = 'translateY(-4px)'; ev.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.1)' }}
              onMouseLeave={ev => { ev.currentTarget.style.transform = 'none'; ev.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
            >
              <div style={s.cardBody}>
                <div style={{ ...s.dateBlock, borderColor: c.border }}>
                  <div style={{ ...s.dateMonth, background: c.color }}>{f.m}</div>
                  <div style={{ ...s.dateDay, color: c.color }}>{f.d}</div>
                </div>

                <div style={s.cardInfo}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ ...s.tipoBadge, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                      {e.tipo.toUpperCase()}
                    </span>
                    {esPasado ? (
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>FINALIZADO</span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>PRÓXIMO</span>
                    )}
                  </div>
                  <h3 style={s.cardNombre}>{e.nombre}</h3>
                  <div style={s.cardDetalles}>
                    {e.lugar && <span style={s.cardDetailItem}>📍 {e.lugar}</span>}
                    {e.costo > 0 ? (
                      <span style={s.cardDetailItem}>💰 ${parseFloat(e.costo).toFixed(2)}</span>
                    ) : (
                      <span style={{ ...s.cardDetailItem, color: '#10b981', fontWeight: '700' }}>💰 GRATIS</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={s.cardFooter}>
                <span style={s.footerLink}>Ver detalles e inscritos →</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{ ...s.btnIconEdit, transition: 'all 0.2s' }}
                    onClick={(ev) => abrirEditar(e, ev)}
                    onMouseOver={ev => {
                      ev.currentTarget.style.background = 'var(--accent-blue)';
                      ev.currentTarget.style.color = '#ffffff';
                      ev.currentTarget.style.transform = 'translateY(-2px)';
                      ev.currentTarget.style.boxShadow = '0 4px 10px rgba(59, 130, 246, 0.3)';
                    }}
                    onMouseOut={ev => {
                      ev.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)';
                      ev.currentTarget.style.color = 'var(--accent-blue)';
                      ev.currentTarget.style.transform = 'translateY(0)';
                      ev.currentTarget.style.boxShadow = 'none';
                    }}
                    title="Editar"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button
                    style={{ ...s.btnIconTrash, transition: 'all 0.2s' }}
                    onClick={(ev) => eliminarEvento(e.id, ev)}
                    onMouseOver={ev => {
                      ev.currentTarget.style.background = 'var(--accent-red)';
                      ev.currentTarget.style.color = '#ffffff';
                      ev.currentTarget.style.transform = 'translateY(-2px)';
                      ev.currentTarget.style.boxShadow = '0 4px 10px rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseOut={ev => {
                      ev.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      ev.currentTarget.style.color = 'var(--accent-red)';
                      ev.currentTarget.style.transform = 'translateY(0)';
                      ev.currentTarget.style.boxShadow = 'none';
                    }}
                    title="Eliminar"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {eventosFiltrados.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>No se encontraron eventos</h3>
            <p style={{ margin: 0 }}>Intenta ajustar los filtros o crea un nuevo evento.</p>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR EVENTO */}
      {modalEvento && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitulo}>{editando ? 'Editar Evento' : 'Crear Nuevo Evento'}</h3>
                <p style={s.modalSub}>Completa los detalles para tu actividad</p>
              </div>
              <button style={s.btnCerrar} onClick={() => setModalEvento(false)}>✕</button>
            </div>
            
            <div style={s.campoGroup}>
              <label style={s.label}>Nombre del Evento</label>
              <input style={s.input} placeholder="Ej. Torneo Estatal 2026" value={formEvento.nombre} onChange={e=>setFormEvento({...formEvento, nombre: e.target.value})} />
            </div>
            
            <div style={s.grid2}>
              <div>
                <label style={s.label}>Tipo de Evento</label>
                <select style={s.select} value={formEvento.tipo} onChange={e=>setFormEvento({...formEvento, tipo: e.target.value})}>
                  <option value="torneo">Torneo / Competencia</option>
                  <option value="seminario">Seminario / Curso</option>
                  <option value="demostracion">Demostración</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Fecha</label>
                <input style={s.input} type="date" value={formEvento.fecha} onChange={e=>setFormEvento({...formEvento, fecha: e.target.value})} />
              </div>
            </div>
            
            <div style={s.grid2}>
              <div>
                <label style={s.label}>Ubicación / Lugar</label>
                <input style={s.input} placeholder="Ej. Gimnasio Municipal" value={formEvento.lugar} onChange={e=>setFormEvento({...formEvento, lugar: e.target.value})} />
              </div>
              <div>
                <label style={s.label}>Costo General ($)</label>
                <input style={s.input} type="number" placeholder="Ej. 500" value={formEvento.costo} onChange={e=>setFormEvento({...formEvento, costo: e.target.value})} />
              </div>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setModalEvento(false)}>Cancelar</button>
              <button style={s.btnPrimaryModal} onClick={guardarEvento}>{editando ? 'Guardar Cambios' : 'Crear Evento'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page:            { scrollbarGutter: 'stable', paddingBottom: '40px' },
  header:          { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  titulo:          { fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 },
  sub:             { fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' },
  
  statBadge: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '12px 24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)', color: '#fff', minWidth: '160px' },
  statLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValor: { fontSize: '20px', fontWeight: '900', color: '#fff', lineHeight: 1.2, marginTop: '2px', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  statSub: { fontSize: '11px', color: 'rgba(255,255,255,0.9)', marginTop: '2px', fontWeight: '600' },

  subnav:          { display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' },
  subnavBtn:       { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', padding: '8px 16px', cursor: 'pointer', borderRadius: '8px', transition: '0.2s' },
  subnavBtnActive: { background: 'var(--bg-tertiary)', color: 'var(--accent-blue)', fontSize: '14px', fontWeight: '700', padding: '8px 16px', borderRadius: '8px', transition: '0.2s' },
  
  barraAcciones:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' },
  searchWrapper:   { position: 'relative', flex: 1, maxWidth: '350px' },
  searchIcon:      { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  search:          { width: '100%', padding: '10px 16px 10px 40px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '80px', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.3s ease', fontSize: '14px', boxSizing: 'border-box' },
  
  filtrosSecundarios: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  selectFiltro:    { padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px', cursor: 'pointer', minWidth: '150px', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' },
  btnNuevo:        { background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-md)', transition: 'all 0.2s' },

  grid:            { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  card:            { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)', transition: 'all 0.3s ease', cursor: 'pointer', overflow: 'hidden' },
  cardBody:        { padding: '20px', display: 'flex', gap: '16px', flex: 1 },
  
  dateBlock:       { width: '60px', height: '65px', borderRadius: '12px', border: '1px solid', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-primary)' },
  dateMonth:       { color: '#fff', fontSize: '11px', fontWeight: '800', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' },
  dateDay:         { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900', background: 'var(--bg-primary)' },

  cardInfo:        { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  tipoBadge:       { padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px' },
  cardNombre:      { fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardDetalles:    { display: 'flex', flexDirection: 'column', gap: '4px' },
  cardDetailItem:  { fontSize: '12px', color: 'var(--text-muted)' },

  cardFooter:      { borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' },
  footerLink:      { fontSize: '12px', fontWeight: '700', color: 'var(--accent-blue)' },
  btnIconEdit:     { background: 'rgba(96, 165, 250, 0.1)', color: 'var(--accent-blue)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', padding: 0 },
  btnIconTrash:    { background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', padding: 0 },

  overlay:         { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:           { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', width: '520px', maxWidth: '90vw', boxShadow: 'var(--shadow-lg)' },
  modalHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  modalTitulo:     { fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 },
  modalSub:        { fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' },
  btnCerrar:       { background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' },
  
  campoGroup:      { marginBottom: '16px' },
  label:           { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' },
  input:           { width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' },
  select:          { width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none', fontSize: '14px' },
  grid2:           { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  
  modalFooter:     { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border)' },
  btnPrimaryModal: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-glow-blue)' },
  btnSecondary:    { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer' },
}