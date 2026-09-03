import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Swal from 'sweetalert2'
import { FiAward, FiCalendar, FiMapPin, FiDollarSign, FiPlus, FiSearch, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi'
import CustomDropdown from '../components/Common/CustomDropdown'
import { getCache, setCache, invalidateCache } from '../utils/cacheManager'

const VACIO = { nombre: '', tipo: 'examen', fecha: '', lugar: '', descripcion: '', costo: '', precios_cintas: {} }
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function Examenes() {
  const navigate = useNavigate()
  const [examenes, setExamenes] = useState([])
  const [cargando, setCargando] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('proximos') // todos, proximos, pasados

  const [modalExamen, setModalExamen] = useState(false)
  const [formExamen, setFormExamen] = useState(VACIO)
  const [editando, setEditando] = useState(null)
  const [cintasConfig, setCintasConfig] = useState([])

  useEffect(() => {
    cargarExamenes()
    cargarCintas()
  }, [])

  const cargarCintas = async () => {
    try {
      const res = await api.get('/configuraciones-cintas')
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      list.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      setCintasConfig(list)
    } catch (err) {
      console.error('Error cargando cintas:', err)
    }
  }

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setModalExamen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const cargarExamenes = async (force = false) => {
    if (!force) {
      const cached = getCache('examenes_lista')
      if (cached && cached.data) {
        setExamenes(cached.data)
        setCargando(false)
      } else {
        setCargando(true)
      }
    } else {
      setCargando(true)
    }

    try {
      const res = await api.get('/eventos')
      // Filtrar únicamente eventos de tipo 'examen'
      const soloExamenes = res.data.filter(e => e.tipo === 'examen')
      soloExamenes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      setExamenes(soloExamenes)
      setCache('examenes_lista', soloExamenes)
    } catch (e) {
      const cached = getCache('examenes_lista')
      if (!cached || !cached.data) {
        console.error(e)
      }
    } finally {
      setCargando(false)
    }
  }

  // --- CRUD EXÁMENES ---
  const abrirCrear = () => {
    setFormExamen({ ...VACIO, precios_cintas: {} })
    setEditando(null)
    setModalExamen(true)
  }

  const abrirEditar = (e, ev) => {
    ev.stopPropagation()
    setFormExamen({
      nombre: e.nombre,
      tipo: 'examen',
      fecha: e.fecha,
      lugar: e.lugar || '',
      descripcion: e.descripcion || '',
      costo: e.costo || '',
      precios_cintas: e.precios_cintas || {}
    })
    setEditando(e.id)
    setModalExamen(true)
  }

  const guardarExamen = async () => {
    try {
      const payload = { ...formExamen, tipo: 'examen' }
      if (editando) {
        await api.put(`/eventos/${editando}`, payload)
      } else {
        await api.post('/eventos', payload)
      }
      setModalExamen(false)
      invalidateCache('examenes')
      invalidateCache('eventos')
      cargarExamenes(true)
    } catch (err) {
      alert('Error al guardar el examen.')
    }
  }

  const eliminarExamen = async (id, ev) => {
    ev.stopPropagation()
    Swal.fire({
      title: '¿Eliminar examen?',
      text: 'Se eliminará la convocatoria de examen y los registros de inscripción asociados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)'
    }).then(async r => {
      if (r.isConfirmed) {
        try {
          await api.delete(`/eventos/${id}`)
          invalidateCache('examenes')
          invalidateCache('eventos')
          cargarExamenes(true)
        } catch (err) {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar el examen.',
            icon: 'error',
            confirmButtonColor: 'var(--accent-blue)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
          })
        }
      }
    })
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const hoyIso = hoy.toISOString().split('T')[0]

  const examenesFiltrados = useMemo(() => {
    return examenes.filter(e => {
      // 1. Busqueda
      if (busqueda && !e.nombre.toLowerCase().includes(busqueda.toLowerCase()) && !(e.lugar || '').toLowerCase().includes(busqueda.toLowerCase())) {
        return false
      }
      // 2. Mes
      if (filtroMes && !e.fecha.startsWith(filtroMes)) return false

      // 3. Estado
      if (filtroEstado === 'proximos' && e.fecha < hoyIso) return false
      if (filtroEstado === 'pasados' && e.fecha >= hoyIso) return false

      return true
    })
  }, [examenes, busqueda, filtroMes, filtroEstado, hoyIso])

  // --- ESTADÍSTICAS ---
  const stats = useMemo(() => {
    const proximos = examenes.filter(e => e.fecha >= hoyIso)
    const delMes = examenes.filter(e => e.fecha.startsWith(hoyIso.substring(0, 7)))

    let proxMasCercano = null
    let diasFaltan = null
    if (proximos.length > 0) {
      proxMasCercano = proximos[0]
      const diffTime = Math.abs(new Date(proxMasCercano.fecha + 'T12:00:00') - hoy)
      diasFaltan = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    return { totalProximos: proximos.length, delMes: delMes.length, proxMasCercano, diasFaltan }
  }, [examenes, hoyIso])

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
          <h2 style={s.titulo}>Exámenes</h2>
          <p style={s.sub}>Gestión de evaluaciones y promociones de cinta</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={s.statBadge}>
            <span style={s.statLabel}>Próximo Examen</span>
            <span style={s.statValor}>{stats.proxMasCercano ? stats.proxMasCercano.nombre : 'Ninguno'}</span>
            <span style={s.statSub}>
              {stats.diasFaltan !== null ? (stats.diasFaltan === 0 ? '¡Es Hoy!' : `En ${stats.diasFaltan} días`) : '-'}
            </span>
          </div>
          <div style={{ ...s.statBadge, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3)' }}>
            <span style={s.statLabel}>Exámenes Programados</span>
            <span style={s.statValor}>{stats.totalProximos}</span>
            <span style={s.statSub}>Convocatorias activas</span>
          </div>
        </div>
      </div>

      <div style={s.barraAcciones}>
        <div style={s.searchWrapper}>
          <FiSearch style={s.searchIcon} size={16} />
          <input
            style={s.search}
            placeholder="Buscar examen por nombre o sede..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        <div style={s.filtrosSecundarios}>
          <CustomDropdown
            label="Todos los exámenes"
            options={[
              { value: 'todos', label: 'Todos los exámenes' },
              { value: 'proximos', label: 'Próximos a realizar' },
              { value: 'pasados', label: 'Exámenes Concluidos' }
            ]}
            value={filtroEstado}
            onChange={val => setFiltroEstado(val)}
            minWidth="180px"
          />

          <input
            type="month"
            style={{ ...s.selectFiltro, paddingRight: 14 }}
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
          />
          {filtroMes && (
            <button style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '0 4px' }} onClick={() => setFiltroMes('')}>✕</button>
          )}

          <button
            style={s.btnNuevo}
            onClick={abrirCrear}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
          >
            <FiPlus size={16} />
            <span>Nuevo Examen</span>
          </button>
        </div>
      </div>

      {/* Grid de Exámenes */}
      <div style={s.grid}>
        {examenesFiltrados.map(e => {
          const f = formatFechaBloque(e.fecha)
          const esPasado = e.fecha < hoyIso

          return (
            <div
              key={e.id}
              style={{ ...s.card, opacity: esPasado ? 0.8 : 1 }}
              onClick={() => navigate(`/examenes/${e.id}`)}
              onMouseEnter={ev => {
                ev.currentTarget.style.transform = 'translateY(-4px)'
                ev.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.12)'
              }}
              onMouseLeave={ev => {
                ev.currentTarget.style.transform = 'none'
                ev.currentTarget.style.boxShadow = 'var(--shadow-sm)'
              }}
            >
              <div style={s.cardBody}>
                <div style={s.dateBlock}>
                  <div style={s.dateMonth}>{f.m}</div>
                  <div style={s.dateDay}>{f.d}</div>
                </div>

                <div style={s.cardInfo}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={s.tipoBadge}>
                      <FiAward size={12} style={{ marginRight: '4px' }} />
                      EXAMEN DE CINTA
                    </span>
                    {esPasado ? (
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>CONCLUIDO</span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>PRÓXIMO</span>
                    )}
                  </div>
                  <h3 style={s.cardNombre}>{e.nombre}</h3>
                  <div style={s.cardDetalles}>
                    {e.lugar && (
                      <span style={s.cardDetailItem}>
                        <FiMapPin size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {e.lugar}
                      </span>
                    )}
                    {e.costo > 0 ? (
                      <span style={s.cardDetailItem}>
                        💰 Costo examen: ${parseFloat(e.costo).toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ ...s.cardDetailItem, color: '#10b981', fontWeight: '700' }}>
                        💰 Sin costo general
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={s.cardFooter}>
                <span style={s.footerLink}>Evaluar y gestionar inscritos →</span>
                <div style={{ display: 'flex', gap: '8px' }} onClick={ev => ev.stopPropagation()}>
                  <button //EDITAR EXAMEN
                    style={{ ...s.btnIcon, ...s.btnEdit }}
                    onClick={(ev) => abrirEditar(e, ev)}
                    onMouseOver={ev => {
                      ev.currentTarget.style.background = '#3b82f6';
                      ev.currentTarget.style.color = 'white';
                      ev.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={ev => {
                      ev.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                      ev.currentTarget.style.color = '#3b82f6';
                      ev.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Editar Examen"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>

                  <button //BORRAR EXAMEN
                    style={{ ...s.btnIcon, ...s.btnDel }}
                    onClick={(ev) => eliminarExamen(e.id, ev)}
                    onMouseOver={ev => {
                      ev.currentTarget.style.background = '#ef4444';
                      ev.currentTarget.style.color = 'white';
                      ev.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={ev => {
                      ev.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      ev.currentTarget.style.color = '#ef4444';
                      ev.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Borrar Examen"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {examenesFiltrados.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥋</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>No se encontraron convocatorias de examen</h3>
            <p style={{ margin: 0 }}>Crea una nueva convocatoria para evaluar y promocionar el grado de tus alumnos.</p>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR EXAMEN */}
      {modalExamen && (
        <div style={s.overlay} onClick={() => setModalExamen(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitulo}>{editando ? 'Editar Examen de Cinta' : 'Nueva Convocatoria de Examen'}</h3>
                <p style={s.modalSub}>Ingresa la fecha y detalles para la evaluación de grados</p>
              </div>
              <button style={s.btnCerrar} onClick={() => setModalExamen(false)}>✕</button>
            </div>

            <div style={s.campoGroup}>
              <label style={s.label}>Nombre del Examen / Convocatoria</label>
              <input
                style={s.input}
                placeholder="Ej. Examen de Grados - 1er Trimestre 2026"
                value={formExamen.nombre}
                onChange={e => setFormExamen({ ...formExamen, nombre: e.target.value })}
              />
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Fecha del Examen</label>
                <input
                  style={s.input}
                  type="date"
                  value={formExamen.fecha}
                  onChange={e => setFormExamen({ ...formExamen, fecha: e.target.value })}
                />
              </div>
              <div>
                <label style={s.label}>Costo General Base ($)</label>
                <input
                  style={s.input}
                  type="number"
                  placeholder="Ej. 650"
                  value={formExamen.costo}
                  onChange={e => setFormExamen({ ...formExamen, costo: e.target.value })}
                />
              </div>
            </div>

            {cintasConfig.length > 0 && (
              <div style={s.campoGroup}>
                <label style={s.label}>
                  Precios Específicos por Cinta <span style={{ fontSize: '11.5px', fontWeight: 'normal', color: 'var(--text-muted)' }}>(Opcional: si se deja vacío, aplica el costo base)</span>
                </label>
                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {cintasConfig.map(c => {
                    const val = formExamen.precios_cintas?.[String(c.id)] ?? ''
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '14px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: c.color_hex || 'var(--bg-tertiary)',
                          color: c.color_texto || 'var(--text-primary)',
                          border: '1px solid rgba(0,0,0,0.1)',
                          minWidth: '95px',
                          textAlign: 'center'
                        }}>
                          {c.nombre_nivel}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '130px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>$</span>
                          <input
                            type="number"
                            placeholder={formExamen.costo || '0'}
                            value={val}
                            onChange={e => {
                              const nuevo = e.target.value
                              setFormExamen(prev => ({
                                ...prev,
                                precios_cintas: {
                                  ...(prev.precios_cintas || {}),
                                  [String(c.id)]: nuevo
                                }
                              }))
                            }}
                            style={{
                              ...s.input,
                              padding: '6px 10px',
                              fontSize: '13px',
                              borderRadius: '8px',
                              height: '32px'
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={s.campoGroup}>
              <label style={s.label}>Lugar / Sede del Examen</label>
              <input
                style={s.input}
                placeholder="Ej. Dojo Central / Gimnasio Principal"
                value={formExamen.lugar}
                onChange={e => setFormExamen({ ...formExamen, lugar: e.target.value })}
              />
            </div>

            <div style={s.campoGroup}>
              <label style={s.label}>Observaciones / Requisitos</label>
              <textarea
                style={{ ...s.input, minHeight: '70px', resize: 'vertical' }}
                placeholder="Notas adicionales para los alumnos (ej. traer dobok completo y equipo de protección)"
                value={formExamen.descripcion}
                onChange={e => setFormExamen({ ...formExamen, descripcion: e.target.value })}
              />
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setModalExamen(false)}>Cancelar</button>
              <button style={s.btnPrimaryModal} onClick={guardarExamen}>
                {editando ? 'Guardar Cambios' : 'Crear Examen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { scrollbarGutter: 'stable', paddingBottom: '40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  titulo: { fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 },
  sub: { fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' },

  statBadge: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '12px 24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)', color: '#fff', minWidth: '160px' },
  statLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValor: { fontSize: '20px', fontWeight: '900', color: '#fff', lineHeight: 1.2, marginTop: '2px', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  statSub: { fontSize: '11px', color: 'rgba(255,255,255,0.9)', marginTop: '2px', fontWeight: '600' },

  barraAcciones: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' },
  searchWrapper: { position: 'relative', flex: 1, maxWidth: '380px' },
  searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  search: { width: '100%', padding: '10px 16px 10px 40px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '80px', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.3s ease', fontSize: '14px', boxSizing: 'border-box' },

  filtrosSecundarios: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  selectFiltro: { padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px', cursor: 'pointer', minWidth: '150px', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' },
  btnNuevo: { display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-md)', transition: 'all 0.2s' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' },
  card: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)', transition: 'all 0.3s ease', cursor: 'pointer', overflow: 'hidden' },
  cardBody: { padding: '20px', display: 'flex', gap: '16px', flex: 1 },

  dateBlock: { width: '60px', height: '65px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-primary)' },
  dateMonth: { background: 'var(--accent-blue)', color: '#fff', fontSize: '11px', fontWeight: '800', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' },
  dateDay: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900', color: 'var(--accent-blue)', background: 'var(--bg-primary)' },

  cardInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  tipoBadge: { display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.5px', background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.2)' },
  cardNombre: { fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardDetalles: { display: 'flex', flexDirection: 'column', gap: '4px' },
  cardDetailItem: { fontSize: '12px', color: 'var(--text-muted)' },

  cardFooter: { borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' },
  footerLink: { fontSize: '12px', fontWeight: '700', color: 'var(--accent-blue)' },
  btnIcon: { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease' },
  btnVer: { background: 'rgba(255, 255, 255, 0.1)', color: '#94a3b8' },
  btnEdit: { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
  btnDel: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', width: '520px', maxWidth: '90vw', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  modalTitulo: { fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 },
  modalSub: { fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' },
  btnCerrar: { background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' },

  campoGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' },
  input: { width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' },
  select: { width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none', fontSize: '14px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },

  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border)' },
  btnPrimaryModal: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-glow-blue)' },
  btnSecondary: { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer' },
}
