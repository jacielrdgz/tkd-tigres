import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Swal from 'sweetalert2'
import { toast } from 'react-toastify'
import {
  FiAward,
  FiCalendar,
  FiMapPin,
  FiDollarSign,
  FiPlus,
  FiSearch,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiChevronRight,
  FiActivity,
  FiBookOpen
} from 'react-icons/fi'
import CustomDropdown from '../components/Common/CustomDropdown'
import { getCache, setCache, invalidateCache } from '../utils/cacheManager'

const VACIO = { nombre: '', tipo: 'torneo', fecha: '', lugar: '', descripcion: '', costo: '' }

const COLOR_TIPO = {
  torneo:       { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  seminario:    { bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
  fogueo:       { bg: 'rgba(249, 115, 22, 0.12)', color: '#f97316', border: 'rgba(249, 115, 22, 0.3)' },
  demostracion: { bg: 'rgba(249, 115, 22, 0.12)', color: '#f97316', border: 'rgba(249, 115, 22, 0.3)' },
  otro:         { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
}

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function Eventos() {
  const navigate = useNavigate()
  const [eventos, setEventos] = useState(() => {
    const c = getCache('eventos_lista')?.data
    return Array.isArray(c) ? c : (c ? Object.values(c) : [])
  })
  const [submodulo, setSubmodulo] = useState('todos') // 'todos' | 'torneos' | 'seminarios' | 'fogueos'
  const [cargando, setCargando] = useState(() => !getCache('eventos_lista')?.data)

  // Filtros (por defecto en 'todos')
  const [busqueda, setBusqueda] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos') // todos, proximos, pasados

  // Modal
  const [modalEvento, setModalEvento] = useState(false)
  const [formEvento, setFormEvento] = useState(VACIO)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Responsividad
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    cargarEventos()
  }, [])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !guardando) setModalEvento(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [guardando])

  const cargarEventos = async (force = false) => {
    if (!force) {
      const cached = getCache('eventos_lista')
      if (cached && cached.data) {
        const cachedList = Array.isArray(cached.data) ? cached.data : Object.values(cached.data)
        setEventos(cachedList)
        setCargando(false)
      } else {
        setCargando(true)
      }
    } else {
      setCargando(true)
    }

    try {
      const res = await api.get('/eventos?excluir=examen')
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.data ? Object.values(res.data.data) : Object.values(res.data || {}))
      const evs = [...rawList]
      evs.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      setEventos(evs)
      setCache('eventos_lista', evs)
    } catch (e) {
      const cached = getCache('eventos_lista')
      if (!cached || !cached.data) {
        console.error('Error al cargar eventos:', e)
      }
    } finally {
      setCargando(false)
    }
  }

  // --- CRUD EVENTOS ---
  const abrirCrear = () => {
    let tipoDefault = 'torneo'
    if (submodulo === 'seminarios') tipoDefault = 'seminario'
    else if (submodulo === 'fogueos') tipoDefault = 'fogueo'

    setFormEvento({ ...VACIO, tipo: tipoDefault })
    setEditando(null)
    setModalEvento(true)
  }

  const abrirEditar = (e, ev) => {
    ev.stopPropagation()
    if (String(e.id).startsWith('temp_')) {
      toast('Sincronizando con el servidor, un momento...', { icon: '⏳' })
      return
    }
    const tipoNormalizado = e.tipo === 'demostracion' ? 'fogueo' : (e.tipo || 'torneo')
    setFormEvento({
      nombre: e.nombre || '',
      tipo: tipoNormalizado,
      fecha: e.fecha || '',
      lugar: e.lugar || '',
      descripcion: e.descripcion || '',
      costo: e.costo !== null && e.costo !== undefined ? String(e.costo) : ''
    })
    setEditando(e.id)
    setModalEvento(true)
  }

  const guardarEvento = async () => {
    if (guardando) return

    if (!formEvento.nombre.trim()) {
      return toast.warning('Ingresa el nombre del evento')
    }
    if (!formEvento.fecha) {
      return toast.warning('Selecciona la fecha del evento')
    }

    setGuardando(true)

    const isEdit = !!editando
    const eventoId = editando
    const payload = {
      ...formEvento,
      costo: formEvento.costo !== '' && formEvento.costo !== null && formEvento.costo !== undefined ? parseFloat(formEvento.costo) : null
    }

    if (isEdit) {
      const originalEvento = eventos.find(e => e.id === eventoId)
      const optimisticEvento = {
        ...originalEvento,
        ...payload
      }

      // 1. Guardar y mostrar en UI de inmediato
      setEventos(prev => {
        const next = prev.map(e => e.id === eventoId ? optimisticEvento : e)
        next.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
        return next
      })
      setModalEvento(false)
      setGuardando(false)
      toast.success('Evento actualizado exitosamente')

      // 2. Persistir en segundo plano
      api.put(`/eventos/${eventoId}`, payload)
        .then(res => {
          if (res.data) {
            setEventos(prev => {
              const next = prev.map(e => e.id === eventoId ? { ...optimisticEvento, ...res.data } : e)
              next.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
              return next
            })
          }
          invalidateCache('eventos')
          invalidateCache('eventos_lista')
        })
        .catch(err => {
          console.error('Error en segundo plano al actualizar evento:', err)
          if (originalEvento) {
            setEventos(prev => {
              const next = prev.map(e => e.id === eventoId ? originalEvento : e)
              next.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
              return next
            })
          }
          const msg = err.response?.data?.message || 'Error al guardar el evento en el servidor'
          toast.error(msg)
        })

    } else {
      const tempId = 'temp_' + Date.now()
      const optimisticEvento = {
        ...payload,
        id: tempId,
        alumnos_count: 0,
        total_recaudado: 0,
        pendientes_pago: 0,
        alumnos: [],
        created_at: new Date().toISOString()
      }

      // 1. Inserción optimista instantánea
      setEventos(prev => {
        const next = [...prev, optimisticEvento]
        next.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
        return next
      })
      setModalEvento(false)
      setGuardando(false)
      toast.success('Evento creado exitosamente')

      // 2. Persistir en segundo plano
      api.post('/eventos', payload)
        .then(res => {
          if (res.data) {
            setEventos(prev => {
              const next = prev.map(e => e.id === tempId ? { ...optimisticEvento, ...res.data } : e)
              next.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
              return next
            })
          }
          invalidateCache('eventos')
          invalidateCache('eventos_lista')
        })
        .catch(err => {
          console.error('Error en segundo plano al crear evento:', err)
          setEventos(prev => prev.filter(e => e.id !== tempId))
          const msg = err.response?.data?.message || 'Error al guardar el evento en el servidor'
          toast.error(msg)
        })
    }
  }

  const eliminarEvento = async (id, ev) => {
    ev.stopPropagation()
    if (String(id).startsWith('temp_')) {
      toast('Sincronizando con el servidor, un momento...', { icon: '⏳' })
      return
    }

    const result = await Swal.fire({
      title: '¿Eliminar evento?',
      text: 'Se eliminará permanentemente la convocatoria y sus registros asociados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)'
    })

    if (!result.isConfirmed) return

    try {
      await api.delete(`/eventos/${id}`)
      toast.success('Evento eliminado correctamente')
      invalidateCache('eventos')
      invalidateCache('eventos_lista')
      cargarEventos(true)
    } catch (err) {
      toast.error('No se pudo eliminar el evento')
    }
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const hoyIso = hoy.toISOString().split('T')[0]

  // --- FILTRADO DE EVENTOS ---
  const eventosFiltrados = useMemo(() => {
    return eventos.filter(e => {
      // 1. Tipo / Submódulo
      if (submodulo === 'torneos' && e.tipo !== 'torneo') return false
      if (submodulo === 'seminarios' && e.tipo !== 'seminario') return false
      if (submodulo === 'fogueos' && e.tipo !== 'fogueo' && e.tipo !== 'demostracion') return false

      // 2. Búsqueda por texto (nombre o lugar)
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const nombreMatch = (e.nombre || '').toLowerCase().includes(q)
        const lugarMatch = (e.lugar || '').toLowerCase().includes(q)
        if (!nombreMatch && !lugarMatch) return false
      }

      // 3. Filtro de mes (YYYY-MM)
      if (filtroMes && !e.fecha?.startsWith(filtroMes)) return false

      // 4. Filtro de estado
      if (filtroEstado === 'proximos' && e.fecha < hoyIso) return false
      if (filtroEstado === 'pasados' && e.fecha >= hoyIso) return false

      return true
    })
  }, [eventos, submodulo, busqueda, filtroMes, filtroEstado, hoyIso])

  // --- AGRUPACIÓN POR CATEGORÍAS PARA LA VISTA "TODOS" ---
  const categorias = useMemo(() => {
    const torneos = eventosFiltrados.filter(e => e.tipo === 'torneo')
    const seminarios = eventosFiltrados.filter(e => e.tipo === 'seminario')
    const fogueos = eventosFiltrados.filter(e => e.tipo === 'fogueo' || e.tipo === 'demostracion')
    const otros = eventosFiltrados.filter(e => e.tipo !== 'torneo' && e.tipo !== 'seminario' && e.tipo !== 'fogueo' && e.tipo !== 'demostracion')

    const lista = []
    if (torneos.length > 0) {
      lista.push({
        id: 'torneos',
        titulo: 'Torneos',
        icono: <FiAward size={16} />,
        color: '#10b981',
        bgIcon: 'rgba(16, 185, 129, 0.12)',
        items: torneos
      })
    }
    if (seminarios.length > 0) {
      lista.push({
        id: 'seminarios',
        titulo: 'Seminarios',
        icono: <FiBookOpen size={16} />,
        color: '#a855f7',
        bgIcon: 'rgba(168, 85, 247, 0.12)',
        items: seminarios
      })
    }
    if (fogueos.length > 0) {
      lista.push({
        id: 'fogueos',
        titulo: 'Fogueos',
        icono: <FiActivity size={16} />,
        color: '#f97316',
        bgIcon: 'rgba(249, 115, 22, 0.12)',
        items: fogueos
      })
    }
    if (otros.length > 0) {
      lista.push({
        id: 'otros',
        titulo: 'Otros Eventos',
        icono: <FiCalendar size={16} />,
        color: '#3b82f6',
        bgIcon: 'rgba(59, 130, 246, 0.12)',
        items: otros
      })
    }
    return lista
  }, [eventosFiltrados])

  // --- ESTADÍSTICAS DEL MÓDULO ---
  const stats = useMemo(() => {
    const proximos = eventos.filter(e => e.fecha >= hoyIso)
    const delMes = eventos.filter(e => e.fecha?.startsWith(hoyIso.substring(0, 7)))

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
      totalHistorico: eventos.length
    }
  }, [eventos, hoyIso, hoy])

  const formatFechaBloque = (fechaStr) => {
    if (!fechaStr) return { d: '-', m: '-' }
    const d = new Date(fechaStr + 'T12:00:00')
    return {
      d: String(d.getDate()).padStart(2, '0'),
      m: MESES_CORTO[d.getMonth()] || '-'
    }
  }

  // Renderizar tarjeta individual de evento
  const renderCard = (e) => {
    const f = formatFechaBloque(e.fecha)
    const esPasado = e.fecha < hoyIso
    const c = COLOR_TIPO[e.tipo] || COLOR_TIPO.otro
    const costoNum = parseFloat(e.costo) || 0
    const labelTipo = (e.tipo === 'demostracion' || e.tipo === 'fogueo') ? 'FOGUEO' : e.tipo.toUpperCase()

    return (
      <div
        key={e.id}
        style={{
          ...s.card,
          opacity: esPasado ? 0.8 : 1
        }}
        onClick={() => {
          if (String(e.id).startsWith('temp_')) {
            toast('Sincronizando con el servidor, un momento...', { icon: '⏳' })
            return
          }
          navigate(`/eventos/${e.id}`)
        }}
        onMouseEnter={ev => {
          ev.currentTarget.style.transform = 'translateY(-3px)'
          ev.currentTarget.style.boxShadow = 'var(--shadow-lg)'
          ev.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'
        }}
        onMouseLeave={ev => {
          ev.currentTarget.style.transform = 'none'
          ev.currentTarget.style.boxShadow = 'var(--shadow-sm)'
          ev.currentTarget.style.borderColor = 'var(--border)'
        }}
      >
        <div style={s.cardBody}>
          {/* Bloque de fecha tipo calendario */}
          <div style={{ ...s.dateBlock, borderColor: c.border }}>
            <div style={{ ...s.dateMonth, background: c.color }}>{f.m}</div>
            <div style={{ ...s.dateDay, color: c.color }}>{f.d}</div>
          </div>

          {/* Info principal */}
          <div style={s.cardInfo}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ ...s.tipoBadge, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                {labelTipo}
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
                  <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>Sin costo / Gratuito</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Footer de tarjeta */}
        <div style={s.cardFooter}>
          <span style={s.footerLink}>
            <span>Ver inscritos y detalles</span>
            <FiChevronRight size={14} />
          </span>

          <div style={{ display: 'flex', gap: '6px' }} onClick={ev => ev.stopPropagation()}>
            <button
              style={s.btnActionEdit}
              onClick={(ev) => abrirEditar(e, ev)}
              title="Editar Evento"
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
              onClick={(ev) => eliminarEvento(e.id, ev)}
              title="Eliminar Evento"
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
  }

  return (
    <div style={s.page}>
      {/* HEADER PRINCIPAL */}
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Eventos</h2>
          <p style={s.sub}>Gestión de torneos, seminarios y actividades del dojo</p>
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
          <span>Nuevo evento</span>
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ ...s.statsGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
        {/* Card 1: Próximo Evento */}
        <div style={s.statCard}>
          <div style={{ ...s.statIconBox, background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)' }}>
            <FiCalendar size={22} />
          </div>
          <div style={s.statContent}>
            <span style={s.statLabel}>Próximo Evento</span>
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
              ) : 'No hay eventos agendados'}
            </span>
          </div>
        </div>

        {/* Card 2: Convocatorias Activas */}
        <div style={s.statCard}>
          <div style={{ ...s.statIconBox, background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-green)' }}>
            <FiClock size={22} />
          </div>
          <div style={s.statContent}>
            <span style={s.statLabel}>Eventos Activos</span>
            <div style={{ ...s.statValor, color: 'var(--accent-green)' }}>
              {cargando ? '—' : stats.totalProximos}
            </div>
            <span style={s.statSublabel}>
              {stats.delMes > 0 ? `${stats.delMes} agendado${stats.delMes !== 1 ? 's' : ''} este mes` : 'Próximas actividades'}
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

      {/* SUBNAV TIPO PILL PARA CATEGORÍAS */}
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
          style={submodulo === 'seminarios' ? s.subnavBtnActive : s.subnavBtn}
          onClick={() => setSubmodulo('seminarios')}
        >
          Seminarios
        </button>
        <button
          style={submodulo === 'fogueos' ? s.subnavBtnActive : s.subnavBtn}
          onClick={() => setSubmodulo('fogueos')}
        >
          Fogueos
        </button>
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
            label="Todos los estados"
            icon={<FiAward size={13} />}
            options={[
              { value: 'todos', label: 'Todos los estados' },
              { value: 'proximos', label: 'Próximos a realizar' },
              { value: 'pasados', label: 'Eventos Concluidos' }
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
            title="Filtrar por mes del evento"
          />
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: AGRUPADO POR CATEGORÍAS EN 'TODOS' O DIRECTO EN SUBMÓDULO */}
      <div style={{ minHeight: '400px' }}>
        {cargando ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>Cargando eventos...</div>
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIconCircle}>
              <FiCalendar size={32} color="var(--accent-blue)" />
            </div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700' }}>
              No se encontraron eventos
            </h3>
            <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '400px' }}>
              {busqueda || filtroMes || filtroEstado !== 'todos' || submodulo !== 'todos'
                ? 'No hay eventos que coincidan con los filtros aplicados. Intenta restablecer los filtros.'
                : 'Aún no has registrado ningún evento. Crea uno para comenzar a registrar participantes.'}
            </p>
            {(busqueda || filtroMes || filtroEstado !== 'todos' || submodulo !== 'todos') ? (
              <button
                style={s.btnResetFiltros}
                onClick={() => { setBusqueda(''); setFiltroMes(''); setFiltroEstado('todos'); setSubmodulo('todos'); }}
              >
                Restablecer filtros
              </button>
            ) : (
              <button style={s.btnNuevo} onClick={abrirCrear}>
                <FiPlus size={16} />
                <span>Crear Primer Evento</span>
              </button>
            )}
          </div>
        ) : submodulo === 'todos' ? (
          /* MODO 'TODOS': DIVIDIDO POR CATEGORÍAS (SI INCLUYE) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {categorias.map(cat => (
              <div key={cat.id}>
                <div style={s.categoriaHeader}>
                  <div style={{ ...s.catIconBox, background: cat.bgIcon, color: cat.color }}>
                    {cat.icono}
                  </div>
                  <h3 style={s.catTitulo}>{cat.titulo}</h3>
                  <span style={{ ...s.catBadge, color: cat.color, background: cat.bgIcon }}>
                    {cat.items.length} {cat.items.length === 1 ? 'evento' : 'eventos'}
                  </span>
                </div>
                <div style={s.grid}>
                  {cat.items.map(renderCard)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* MODO PESTAÑA INDIVIDUAL (TORNEOS, SEMINARIOS O FOGUEOS) */
          <div style={s.grid}>
            {eventosFiltrados.map(renderCard)}
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR EVENTO */}
      {modalEvento && (
        <div style={s.overlay} onClick={guardando ? undefined : () => setModalEvento(false)}>
          <div
            style={{
              ...s.modal,
              pointerEvents: guardando ? 'none' : 'auto'
            }}
            className="mobile-fullscreen-modal"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (guardando) return
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault()
                guardarEvento()
              }
            }}
          >
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ ...s.statIconBox, width: '38px', height: '38px', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)' }}>
                  <FiCalendar size={18} />
                </div>
                <div>
                  <h3 style={s.modalTitulo}>{editando ? 'Editar Evento' : 'Crear Nuevo Evento'}</h3>
                  <p style={s.modalSub}>Completa los datos de la convocatoria para tu actividad</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-cerrar-circular"
                style={{
                  ...s.btnCerrarCircular,
                  opacity: guardando ? 0.5 : 1,
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  pointerEvents: guardando ? 'none' : 'auto'
                }}
                onClick={guardando ? undefined : () => setModalEvento(false)}
                disabled={guardando}
                title="Cerrar modal"
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>✕</span>
              </button>
            </div>

            <div style={s.modalContent}>
              <div style={s.campoGroup}>
                <label style={s.label}>Nombre del Evento *</label>
                <input
                  style={s.input}
                  placeholder="Ej. Torneo Abierto TKD Tigres 2026"
                  value={formEvento.nombre}
                  onChange={e => setFormEvento({ ...formEvento, nombre: e.target.value })}
                  autoFocus
                />
              </div>

              <div style={s.grid2} className="mobile-grid-1">
                <div style={s.campoGroup}>
                  <label style={s.label}>Tipo de Evento *</label>
                  <select
                    style={s.select}
                    value={formEvento.tipo}
                    onChange={e => setFormEvento({ ...formEvento, tipo: e.target.value })}
                  >
                    <option value="torneo">Torneo / Competencia</option>
                    <option value="seminario">Seminario / Curso</option>
                    <option value="fogueo">Fogueo / Intercambio</option>
                    <option value="otro">Otro Evento / Convivencia</option>
                  </select>
                </div>

                <div style={s.campoGroup}>
                  <label style={s.label}>Fecha del Evento *</label>
                  <input
                    style={{ ...s.input, colorScheme: 'dark' }}
                    type="date"
                    value={formEvento.fecha}
                    onChange={e => setFormEvento({ ...formEvento, fecha: e.target.value })}
                  />
                </div>
              </div>

              <div style={s.grid2} className="mobile-grid-1">
                <div style={s.campoGroup}>
                  <label style={s.label}>Ubicación / Sede</label>
                  <input
                    style={s.input}
                    placeholder="Ej. Gimnasio Municipal o Dojo Central"
                    value={formEvento.lugar}
                    onChange={e => setFormEvento({ ...formEvento, lugar: e.target.value })}
                  />
                </div>

                <div style={s.campoGroup}>
                  <label style={s.label}>Costo General de Inscripción ($)</label>
                  <input
                    style={s.input}
                    type="number"
                    min="0"
                    step="10"
                    placeholder="0.00 (dejar vacío si es gratis)"
                    value={formEvento.costo}
                    onChange={e => setFormEvento({ ...formEvento, costo: e.target.value })}
                  />
                </div>
              </div>

              <div style={s.campoGroup}>
                <label style={s.label}>Descripción / Observaciones</label>
                <textarea
                  style={{ ...s.input, minHeight: '75px', resize: 'vertical' }}
                  placeholder="Detalles sobre categorías, reglamento, horario o requisitos especiales..."
                  value={formEvento.descripcion}
                  onChange={e => setFormEvento({ ...formEvento, descripcion: e.target.value })}
                />
              </div>
            </div>

            <div style={s.modalFooter}>
              <button
                type="button"
                style={{
                  ...s.btnSecondary,
                  opacity: guardando ? 0.5 : 1,
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  pointerEvents: guardando ? 'none' : 'auto'
                }}
                onClick={guardando ? undefined : () => setModalEvento(false)}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={{
                  ...s.btnPrimaryModal,
                  opacity: guardando ? 0.75 : 1,
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  pointerEvents: guardando ? 'none' : 'auto'
                }}
                onClick={guardando ? undefined : guardarEvento}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : (editando ? 'Guardar Cambios' : 'Crear Evento')}
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
    paddingBottom: '40px'
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
    transition: 'all 0.2s ease',
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
    marginTop: '3px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },

  // SUBNAV TIPO PILL
  subnav: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '12px',
    marginBottom: '20px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch'
  },
  subnavBtn: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--text-muted)',
    fontSize: '13.5px',
    fontWeight: '600',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: '10px',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box'
  },
  subnavBtnActive: {
    background: 'var(--bg-tertiary)',
    color: 'var(--accent-blue)',
    border: '1px solid var(--border)',
    fontSize: '13.5px',
    fontWeight: '600',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: '10px',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box'
  },

  // TOOLBAR
  barraAcciones: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '14px',
    marginBottom: '24px'
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
    minWidth: '240px',
    maxWidth: '380px'
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)'
  },
  search: {
    width: '100%',
    height: '38px',
    padding: '0 14px 0 38px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontSize: '13.5px',
    boxSizing: 'border-box'
  },
  filtrosSecundarios: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
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

  // SECCIONES DE CATEGORÍA
  categoriaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '14px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border)'
  },
  catIconBox: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  catTitulo: {
    fontSize: '16px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.01em'
  },
  catBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '6px',
    letterSpacing: '0.02em'
  },

  // GRID Y CARDS
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '18px'
  },
  card: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  cardBody: {
    padding: '16px',
    display: 'flex',
    gap: '14px',
    flex: 1
  },
  dateBlock: {
    width: '56px',
    height: '62px',
    borderRadius: '12px',
    border: '1px solid',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    background: 'var(--bg-primary)',
    textAlign: 'center'
  },
  dateMonth: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
    padding: '2px 0',
    letterSpacing: '0.05em'
  },
  dateDay: {
    fontSize: '22px',
    fontWeight: '900',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    lineHeight: 1
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0,
    flex: 1
  },
  tipoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '0.04em'
  },
  badgeProximo: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: '800',
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.12)',
    padding: '2px 7px',
    borderRadius: '6px'
  },
  badgeConcluido: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: '800',
    color: 'var(--text-muted)',
    background: 'var(--bg-tertiary)',
    padding: '2px 7px',
    borderRadius: '6px'
  },
  cardNombre: {
    margin: '2px 0 0',
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  cardDetalles: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '4px',
    fontSize: '12px',
    color: 'var(--text-secondary)'
  },
  cardDetailItem: {
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  cardFooter: {
    borderTop: '1px solid var(--border)',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--bg-primary)',
    fontSize: '12px'
  },
  footerLink: {
    color: 'var(--accent-blue)',
    fontWeight: '600',
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
    background: 'var(--bg-secondary)',
    borderRadius: '20px',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  emptyIconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '20px',
    background: 'rgba(59, 130, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px'
  },
  btnResetFiltros: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },

  // MODAL
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px'
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: 'var(--shadow-2xl)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflow: 'hidden'
  },
  modalHeader: {
    padding: '18px 24px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitulo: {
    fontSize: '17px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0
  },
  modalSub: {
    fontSize: '12.5px',
    color: 'var(--text-muted)',
    marginTop: '2px',
    margin: 0
  },
  btnCerrarCircular: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  modalContent: {
    padding: '20px 24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  campoGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  input: {
    height: '40px',
    padding: '0 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '13.5px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  select: {
    height: '40px',
    padding: '0 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '13.5px',
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box'
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    background: 'var(--bg-primary)'
  },
  btnSecondary: {
    padding: '9px 16px',
    borderRadius: '10px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  btnPrimaryModal: {
    padding: '9px 20px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent-blue), #2563eb)',
    border: 'none',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-glow-blue)'
  }
}