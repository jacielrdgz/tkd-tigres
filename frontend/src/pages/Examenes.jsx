import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Swal from 'sweetalert2'
import {
  FiAward,
  FiCalendar,
  FiMapPin,
  FiDollarSign,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiX,
  FiChevronRight,
  FiTag
} from 'react-icons/fi'
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
  const [filtroEstado, setFiltroEstado] = useState('todos') // todos, proximos, pasados

  // Modal
  const [modalExamen, setModalExamen] = useState(false)
  const [formExamen, setFormExamen] = useState(VACIO)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [cintasConfig, setCintasConfig] = useState([])

  // Responsividad
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
      const res = await api.get('/eventos?tipo=examen')
      const soloExamenes = (res.data || [])
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
      nombre: e.nombre || '',
      tipo: 'examen',
      fecha: e.fecha || '',
      lugar: e.lugar || '',
      descripcion: e.descripcion || '',
      costo: e.costo !== null && e.costo !== undefined ? e.costo : '',
      precios_cintas: e.precios_cintas || {}
    })
    setEditando(e.id)
    setModalExamen(true)
  }

  const guardarExamen = async () => {
    if (!formExamen.nombre.trim()) {
      Swal.fire({
        title: 'Campo requerido',
        text: 'Por favor ingresa un nombre para la convocatoria de examen.',
        icon: 'warning',
        confirmButtonColor: 'var(--accent-blue)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)'
      })
      return
    }

    if (!formExamen.fecha) {
      Swal.fire({
        title: 'Campo requerido',
        text: 'Por favor selecciona la fecha del examen.',
        icon: 'warning',
        confirmButtonColor: 'var(--accent-blue)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)'
      })
      return
    }

    setGuardando(true)
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
      Swal.fire({
        title: 'Error',
        text: 'No se pudo guardar la convocatoria del examen.',
        icon: 'error',
        confirmButtonColor: 'var(--accent-blue)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)'
      })
    } finally {
      setGuardando(false)
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
      if (busqueda) {
        const q = busqueda.toLowerCase().trim()
        const nom = (e.nombre || '').toLowerCase()
        const lug = (e.lugar || '').toLowerCase()
        if (!nom.includes(q) && !lug.includes(q)) return false
      }
      if (filtroMes && !e.fecha.startsWith(filtroMes)) return false

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

    return {
      totalProximos: proximos.length,
      delMes: delMes.length,
      proxMasCercano,
      diasFaltan,
      totalHistorico: examenes.length
    }
  }, [examenes, hoyIso, hoy])

  const formatFechaBloque = (fechaStr) => {
    if (!fechaStr) return { d: '-', m: '-' }
    const d = new Date(fechaStr + 'T12:00:00')
    return {
      d: String(d.getDate()).padStart(2, '0'),
      m: MESES_CORTO[d.getMonth()] || '-'
    }
  }

  return (
    <div style={s.page}>
      {/* HEADER PRINCIPAL */}
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Exámenes</h2>
          <p style={s.sub}>Gestión de evaluaciones y promociones de grado</p>
        </div>

        <button
          style={s.btnNuevo}
          onClick={abrirCrear}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)'
            e.currentTarget.style.filter = 'brightness(1.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.filter = 'none'
          }}
        >
          <FiPlus size={16} />
          <span>Nuevo examen</span>
        </button>
      </div>

      {/* TARJETAS RESUMEN (SUMMARY CARDS IDÉNTICAS A PAGOS Y ASISTENCIAS) */}
      <div style={{ ...s.statsGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
        {/* Card 1: Próximo Examen */}
        <div style={s.statCard}>
          <div style={{ ...s.statIconBox, background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)' }}>
            <FiAward size={22} />
          </div>
          <div style={s.statContent}>
            <span style={s.statLabel}>Próximo Examen</span>
            <div style={s.statValor} title={stats.proxMasCercano?.nombre || ''}>
              {cargando ? '—' : (stats.proxMasCercano ? stats.proxMasCercano.nombre : 'Sin programar')}
            </div>
            <span style={s.statSublabel}>
              {stats.proxMasCercano ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: stats.diasFaltan === 0 ? 'var(--accent-green)' : 'var(--accent-blue)',
                  fontWeight: '700'
                }}>
                  <FiClock size={11} />
                  {stats.diasFaltan === 0 ? '¡Es Hoy!' : `En ${stats.diasFaltan} día${stats.diasFaltan !== 1 ? 's' : ''}`}
                </span>
              ) : 'No hay exámenes agendados'}
            </span>
          </div>
        </div>

        {/* Card 2: Convocatorias Activas */}
        <div style={s.statCard}>
          <div style={{ ...s.statIconBox, background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-green)' }}>
            <FiCalendar size={22} />
          </div>
          <div style={s.statContent}>
            <span style={s.statLabel}>Convocatorias Activas</span>
            <div style={{ ...s.statValor, color: 'var(--accent-green)' }}>
              {cargando ? '—' : stats.totalProximos}
            </div>
            <span style={s.statSublabel}>
              {stats.delMes > 0 ? `${stats.delMes} agendado${stats.delMes !== 1 ? 's' : ''} este mes` : 'Próximas evaluaciones'}
            </span>
          </div>
        </div>

        {/* Card 3: Total Histórico */}
        <div style={s.statCard}>
          <div style={{ ...s.statIconBox, background: 'rgba(139, 92, 246, 0.12)', color: 'var(--accent-purple)' }}>
            <FiUsers size={22} />
          </div>
          <div style={s.statContent}>
            <span style={s.statLabel}>Total Convocatorias</span>
            <div style={{ ...s.statValor, color: 'var(--accent-purple)' }}>
              {cargando ? '—' : stats.totalHistorico}
            </div>
            <span style={s.statSublabel}>Historial acumulado</span>
          </div>
        </div>
      </div>

      {/* BARRA DE ACCIONES Y FILTROS */}
      <div style={s.barraAcciones}>
        <div style={s.searchWrapper}>
          <FiSearch style={s.searchIcon} size={16} />
          <input
            style={s.search}
            placeholder="Buscar por nombre o sede..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--accent-blue)'
              e.currentTarget.style.background = 'var(--bg-tertiary)'
              e.currentTarget.style.boxShadow = '0 0 12px rgba(59, 130, 246, 0.3)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'var(--bg-secondary)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        <div style={s.filtrosSecundarios}>
          <CustomDropdown
            label="Todos los exámenes"
            icon={<FiAward size={13} />}
            options={[
              { value: 'todos', label: 'Todos los exámenes' },
              { value: 'proximos', label: 'Próximos a realizar' },
              { value: 'pasados', label: 'Exámenes Concluidos' }
            ]}
            value={filtroEstado}
            onChange={val => setFiltroEstado(val)}
            minWidth="205px"
          />

          <input
            type="month"
            style={s.selectMonth}
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
            title="Filtrar por mes del examen"
          />
        </div>
      </div>

      {/* GRID DE CONVOCATORIAS */}
      {cargando ? (
        <div style={s.grid}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ ...s.card, minHeight: '170px', opacity: 0.5, animation: 'pulse 1.5s infinite' }}>
              <div style={{ padding: '20px' }}>
                <div style={{ height: '20px', background: 'var(--bg-tertiary)', borderRadius: '6px', width: '60%', marginBottom: '12px' }} />
                <div style={{ height: '14px', background: 'var(--bg-tertiary)', borderRadius: '4px', width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : examenesFiltrados.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIconCircle}>
            <FiAward size={36} color="var(--accent-blue)" />
          </div>
          <h3 style={s.emptyTitle}>No se encontraron convocatorias</h3>
          <p style={s.emptySubtitle}>
            {busqueda || filtroMes || filtroEstado !== 'todos'
              ? 'Prueba modificando o limpiando los filtros para ver más resultados.'
              : 'Crea una nueva convocatoria para evaluar y promocionar el grado de tus alumnos.'}
          </p>
          {(busqueda || filtroMes || filtroEstado !== 'todos') && (
            <button
              style={{ ...s.btnSecondary, marginTop: '16px' }}
              onClick={() => { setBusqueda(''); setFiltroMes(''); setFiltroEstado('todos') }}
            >
              Limpiar todos los filtros
            </button>
          )}
        </div>
      ) : (
        <div style={s.grid}>
          {examenesFiltrados.map(e => {
            const f = formatFechaBloque(e.fecha)
            const esPasado = e.fecha < hoyIso
            const costoNum = parseFloat(e.costo)
            const tienePreciosCintas = e.precios_cintas && Object.keys(e.precios_cintas).length > 0

            return (
              <div
                key={e.id}
                style={{ ...s.card, opacity: esPasado ? 0.88 : 1 }}
                onClick={() => navigate(`/examenes/${e.id}`)}
                onMouseEnter={ev => {
                  ev.currentTarget.style.transform = 'translateY(-3px)'
                  ev.currentTarget.style.borderColor = 'var(--accent-blue)'
                  ev.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.25)'
                }}
                onMouseLeave={ev => {
                  ev.currentTarget.style.transform = 'none'
                  ev.currentTarget.style.borderColor = 'var(--border)'
                  ev.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                }}
              >
                <div style={s.cardBody}>
                  {/* Bloque de fecha minimalista */}
                  <div style={s.dateBlock}>
                    <div style={s.dateMonth}>{f.m}</div>
                    <div style={s.dateDay}>{f.d}</div>
                  </div>

                  {/* Info principal */}
                  <div style={s.cardInfo}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={s.tipoBadge}>
                        <FiAward size={11} style={{ marginRight: '4px' }} />
                        CONVOCATORIA
                      </span>
                      {esPasado ? (
                        <span style={s.badgeConcluido}>
                          <FiCheckCircle size={10} style={{ marginRight: '3px' }} />
                          CONCLUIDO
                        </span>
                      ) : (
                        <span style={s.badgeProximo}>
                          <FiClock size={10} style={{ marginRight: '3px' }} />
                          PRÓXIMO
                        </span>
                      )}
                    </div>

                    <h3 style={s.cardNombre} title={e.nombre}>{e.nombre}</h3>

                    <div style={s.cardDetalles}>
                      {e.lugar && (
                        <span style={s.cardDetailItem} title={e.lugar}>
                          <FiMapPin size={12} style={{ marginRight: '5px', flexShrink: 0, color: 'var(--text-muted)' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.lugar}</span>
                        </span>
                      )}
                      <span style={s.cardDetailItem}>
                        <FiDollarSign size={12} style={{ marginRight: '5px', flexShrink: 0, color: 'var(--accent-green)' }} />
                        {costoNum > 0 ? (
                          <span>Costo general: <strong>${costoNum.toFixed(2)}</strong></span>
                        ) : (
                          <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>Sin costo general</span>
                        )}
                      </span>
                      {tienePreciosCintas && (
                        <span style={{ ...s.cardDetailItem, color: 'var(--accent-blue)' }}>
                          <FiTag size={12} style={{ marginRight: '5px', flexShrink: 0 }} />
                          Precios diferenciados por cinta
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer de tarjeta */}
                <div style={s.cardFooter}>
                  <span style={s.footerLink}>
                    <span>Ver inscritos y evaluar</span>
                    <FiChevronRight size={14} />
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }} onClick={ev => ev.stopPropagation()}>
                    <button
                      style={s.btnActionEdit}
                      onClick={(ev) => abrirEditar(e, ev)}
                      title="Editar Convocatoria"
                      onMouseOver={ev => {
                        ev.currentTarget.style.background = '#3b82f6'
                        ev.currentTarget.style.color = 'white'
                        ev.currentTarget.style.transform = 'scale(1.1)'
                      }}
                      onMouseOut={ev => {
                        ev.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
                        ev.currentTarget.style.color = '#3b82f6'
                        ev.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>

                    <button
                      style={s.btnActionDelete}
                      onClick={(ev) => eliminarExamen(e.id, ev)}
                      title="Eliminar Convocatoria"
                      onMouseOver={ev => {
                        ev.currentTarget.style.background = '#ef4444'
                        ev.currentTarget.style.color = 'white'
                        ev.currentTarget.style.transform = 'scale(1.1)'
                      }}
                      onMouseOut={ev => {
                        ev.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                        ev.currentTarget.style.color = '#ef4444'
                        ev.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL CREAR / EDITAR EXAMEN (RESPONSIVO Y PULIDO) */}
      {modalExamen && (
        <div style={s.overlay} className="mobile-fullscreen-overlay" onClick={() => setModalExamen(false)}>
          <div
            style={s.modal}
            className="mobile-fullscreen-modal"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault()
                guardarExamen()
              }
            }}
          >
            {/* Header del Modal */}
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitulo}>{editando ? 'Editar Convocatoria' : 'Nueva Convocatoria'}</h3>
                <p style={s.modalSub}>Configura la fecha, costo y sede para la evaluación de grados</p>
              </div>
              <button
                type="button"
                className="btn-cerrar-circular"
                style={s.btnCerrarCircular}
                onClick={() => setModalExamen(false)}
                title="Cerrar modal"
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
                  e.currentTarget.style.color = 'var(--accent-red)'
                  e.currentTarget.style.transform = 'rotate(90deg)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <FiX size={17} />
              </button>
            </div>

            {/* Campos del Formulario */}
            <div style={s.campoGroup}>
              <label style={s.label}>
                Nombre de la Convocatoria <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                style={s.input}
                placeholder="Ej. Examen de Grados - 1er Trimestre 2026"
                value={formExamen.nombre}
                autoFocus
                onChange={e => setFormExamen({ ...formExamen, nombre: e.target.value })}
              />
            </div>

            <div style={s.grid2} className="mobile-grid-1">
              <div>
                <label style={s.label}>
                  Fecha del Examen <span style={{ color: '#ef4444' }}>*</span>
                </label>
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
                  placeholder="Ej. 650.00"
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
                <div style={s.cintasBox}>
                  {cintasConfig.map(c => {
                    const val = formExamen.precios_cintas?.[String(c.id)] ?? ''
                    return (
                      <div key={c.id} style={s.cintaRow}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          background: c.color_hex || 'var(--bg-tertiary)',
                          color: c.color_texto || 'var(--text-primary)',
                          border: '1px solid rgba(0,0,0,0.15)',
                          minWidth: '100px',
                          textAlign: 'center'
                        }}>
                          {c.nombre_nivel}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '130px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>$</span>
                          <input
                            type="number"
                            placeholder={formExamen.costo || '0.00'}
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
                              padding: '5px 10px',
                              fontSize: '13px',
                              borderRadius: '8px',
                              height: '32px',
                              textAlign: 'right'
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
                style={{ ...s.input, minHeight: '74px', height: 'auto', resize: 'vertical', padding: '10px 12px' }}
                placeholder="Notas adicionales (ej. traer dobok limpio completo, equipo de protección y credencial)"
                value={formExamen.descripcion}
                onChange={e => setFormExamen({ ...formExamen, descripcion: e.target.value })}
              />
            </div>

            {/* Footer Modal */}
            <div style={s.modalFooter}>
              <button
                type="button"
                style={s.btnSecondary}
                onClick={() => setModalExamen(false)}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={s.btnPrimaryModal}
                onClick={guardarExamen}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : (editando ? 'Guardar Cambios' : 'Crear Convocatoria')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: {
    paddingBottom: '40px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  titulo: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0
  },
  sub: {
    fontSize: '15px',
    color: 'var(--text-muted)',
    marginTop: '2px',
    margin: 0
  },
  btnNuevo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--accent-blue)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 18px',
    fontSize: '13.5px',
    fontWeight: '700',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    letterSpacing: '0.2px',
    cursor: 'pointer',
    boxShadow: 'none',
    transition: 'all 0.2s ease'
  },

  // SUMMARY CARDS
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: 'var(--shadow-sm)',
    minHeight: '94px',
    boxSizing: 'border-box',
    transition: 'all 0.15s ease',
    overflow: 'hidden'
  },
  statIconBox: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flex: 1
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  statValor: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    lineHeight: 1.25,
    marginTop: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  statSublabel: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    marginTop: '3px'
  },

  // TOOLBAR Y FILTROS
  barraAcciones: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px'
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
    minWidth: '240px',
    maxWidth: '380px'
  },
  searchIcon: {
    position: 'absolute',
    left: '13px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)'
  },
  search: {
    width: '100%',
    padding: '0 16px 0 38px',
    height: '38px',
    minHeight: '38px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '13.5px',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.2s ease'
  },
  filtrosSecundarios: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  selectMonth: {
    height: '38px',
    boxSizing: 'border-box',
    padding: '0 14px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    colorScheme: 'dark',
    transition: 'border-color 0.15s ease',
    boxShadow: 'var(--shadow-sm)'
  },

  // GRID DE CARDS
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
    gap: '18px'
  },
  card: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    overflow: 'hidden'
  },
  cardBody: {
    padding: '18px 20px',
    display: 'flex',
    gap: '14px',
    flex: 1
  },
  dateBlock: {
    width: '56px',
    height: '62px',
    borderRadius: '12px',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
    background: 'var(--bg-primary)'
  },
  dateMonth: {
    background: 'var(--accent-blue)',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '800',
    textAlign: 'center',
    padding: '3px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  dateDay: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: '900',
    color: 'var(--text-primary)',
    background: 'var(--bg-primary)'
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  tipoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '20px',
    fontSize: '9.5px',
    fontWeight: '800',
    letterSpacing: '0.04em',
    background: 'var(--accent-blue-bg)',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(59, 130, 246, 0.2)'
  },
  badgeProximo: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: '800',
    color: 'var(--accent-green)',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '2px 7px',
    borderRadius: '6px',
    letterSpacing: '0.03em'
  },
  badgeConcluido: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    background: 'var(--bg-tertiary)',
    padding: '2px 7px',
    borderRadius: '6px',
    letterSpacing: '0.03em'
  },
  cardNombre: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: '2px 0 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  cardDetalles: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    marginTop: '4px'
  },
  cardDetailItem: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center'
  },

  cardFooter: {
    borderTop: '1px solid var(--border)',
    padding: '10px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.12)'
  },
  footerLink: {
    fontSize: '12.5px',
    fontWeight: '600',
    color: 'var(--accent-blue)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  btnActionEdit: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  btnActionDelete: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },

  // EMPTY STATE
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--text-muted)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px'
  },
  emptyIconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(59, 130, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px'
  },
  emptyTitle: {
    margin: '0 0 6px',
    fontSize: '17px',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  emptySubtitle: {
    margin: 0,
    fontSize: '13.5px',
    maxWidth: '420px',
    marginLeft: 'auto',
    marginRight: 'auto',
    lineHeight: 1.4
  },

  // MODAL
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1050
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '24px 22px',
    width: '520px',
    maxWidth: '94vw',
    maxHeight: '86vh',
    overflowY: 'auto',
    boxSizing: 'border-box',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '18px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border)'
  },
  modalTitulo: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0
  },
  modalSub: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    margin: '3px 0 0'
  },
  btnCerrarCircular: {
    width: '34px',
    height: '34px',
    minWidth: '34px',
    minHeight: '34px',
    borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    aspectRatio: '1 / 1',
    padding: 0,
    transition: 'all 0.15s ease'
  },

  campoGroup: {
    marginBottom: '14px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12.5px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    marginBottom: '5px',
    fontFamily: 'Inter, sans-serif'
  },
  input: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    fontSize: '13.5px',
    height: '38px',
    minHeight: '38px',
    padding: '0 12px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.15s ease'
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '14px'
  },

  cintasBox: {
    maxHeight: '180px',
    overflowY: 'auto',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '8px 10px',
    background: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  cintaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px'
  },

  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border)'
  },
  btnPrimaryModal: {
    background: 'var(--accent-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-glow-blue)',
    transition: 'all 0.15s ease',
    fontFamily: 'Inter, sans-serif'
  },
  btnSecondary: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'Inter, sans-serif'
  }
}

