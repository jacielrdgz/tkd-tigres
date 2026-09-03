import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Swal from 'sweetalert2'
import { toast } from 'react-toastify'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '../context/AuthContext'
import {
  obtenerInfoEscuelaParaPDF,
  dibujarEncabezadoMembrete,
  agregarPieDePagina,
  formatearFechaNaturalPDF,
  guardarODescargarPDF,
  guardarODescargarExcel
} from '../utils/pdfHelper'
import BotonExportar from '../components/Common/BotonExportar'
import CustomDropdown from '../components/Common/CustomDropdown'
import { getCache, setCache, invalidateCache } from '../utils/cacheManager'
import {
  FiCalendar,
  FiMapPin,
  FiDollarSign,
  FiUserPlus,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiCheck,
  FiX,
  FiSearch,
  FiCheckSquare,
  FiArrowLeft,
  FiAward,
  FiShield,
  FiFileText,
  FiChevronRight
} from 'react-icons/fi'

const COLOR_TIPO = {
  torneo:       { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  seminario:    { bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
  fogueo:       { bg: 'rgba(249, 115, 22, 0.12)', color: '#f97316', border: 'rgba(249, 115, 22, 0.3)' },
  demostracion: { bg: 'rgba(249, 115, 22, 0.12)', color: '#f97316', border: 'rgba(249, 115, 22, 0.3)' },
  otro:         { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
}

const COLOR_MEDALLA = {
  oro:        { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: 'rgba(234, 179, 8, 0.35)', label: 'Oro' },
  plata:      { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.35)', label: 'Plata' },
  bronce:     { bg: 'rgba(205, 127, 50, 0.15)', color: '#cd7f32', border: 'rgba(205, 127, 50, 0.35)', label: 'Bronce' },
  eliminado:  { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.35)', label: 'Sin medalla' },
  pendiente:  { bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b', border: 'rgba(100, 116, 139, 0.35)', label: 'Pendiente' },
}

const formatCosto = (val) => {
  if (val === null || val === undefined || val === '') return '0'
  const num = parseFloat(val)
  if (isNaN(num)) return '0'
  return num % 1 === 0 ? num.toString() : num.toFixed(2)
}

const formatFechaNatural = (fecha) => {
  if (!fecha) return 'Fecha por definir'
  const d = new Date(fecha + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

const obtenerIniciales = (nombre, apellido) => {
  if (!nombre) return '?'
  const n = nombre.charAt(0)
  const a = apellido ? apellido.charAt(0) : ''
  return (n + a).toUpperCase()
}

export default function EventoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const initialCached = getCache(`evento_detalle_${id}`)

  const [evento, setEvento] = useState(() => initialCached?.data?.evento || null)
  const [inscritos, setInscritos] = useState(() => initialCached?.data?.inscritos || [])
  const [alumnosDojo, setAlumnosDojo] = useState(() => getCache('alumnos_simple_activos')?.data || [])
  const [cintasConfig, setCintasConfig] = useState(() => {
    const cached = getCache('cintas_config')?.data
    return Array.isArray(cached) ? cached : []
  })
  const [cargando, setCargando] = useState(() => !initialCached?.data?.evento)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroPago, setFiltroPago] = useState('todos') // todos, pagado, pendiente
  const [filtroCinta, setFiltroCinta] = useState('todos')
  const [filtroMedalla, setFiltroMedalla] = useState('todos') // para torneos: todos, oro, plata, bronce, etc.

  // Modal Editar Evento Base
  const [modalEvento, setModalEvento] = useState(false)
  const [formEvento, setFormEvento] = useState({ nombre: '', tipo: '', fecha: '', lugar: '', costo: '', descripcion: '' })

  // Modal Inscribir
  const [modalInscribir, setModalInscribir] = useState(false)
  const [editandoInscrito, setEditandoInscrito] = useState(null)
  const [busquedaAlumno, setBusquedaAlumno] = useState('')
  const [formInscribir, setFormInscribir] = useState({
    alumno_id: '',
    nombre_alumno: '',
    costo: '',
    pagado: false
  })

  // Modo múltiple de inscripción
  const [modoInscribir, setModoInscribir] = useState('multiple') // 'multiple' | 'individual'
  const [filtroCintaModal, setFiltroCintaModal] = useState('todos')
  const [seleccionadosModal, setSeleccionadosModal] = useState([])
  const [costosModal, setCostosModal] = useState({})
  const [pagadosModal, setPagadosModal] = useState({})
  const [guardandoInscripcion, setGuardandoInscripcion] = useState(false)

  // Selección múltiple para acciones en lote
  const [seleccionados, setSeleccionados] = useState([])
  const [procesandoMasivo, setProcesandoMasivo] = useState(false)

  // Hover en filas
  const [rowHover, setRowHover] = useState(null)

  // Responsividad
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setModalInscribir(false)
        setModalEvento(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  // 1. CARGA INICIAL
  const cargar = async (force = false) => {
    if (!force) {
      const cached = getCache(`evento_detalle_${id}`)
      if (cached && cached.data?.evento) {
        setEvento(cached.data.evento)
        setInscritos(cached.data.inscritos || [])
        setCargando(false)
      } else {
        setCargando(true)
      }
    } else {
      setCargando(true)
    }

    try {
      const cachedCintas = getCache('cintas_config')
      const cachedAlumnos = getCache('alumnos_simple_activos')

      const [resEv, resIns, resAl, resCin] = await Promise.all([
        api.get(`/eventos/${id}`),
        api.get(`/eventos/${id}/inscritos`),
        cachedAlumnos && !force ? Promise.resolve({ data: cachedAlumnos.data }) : api.get('/alumnos?simple=1&estatus=activo'),
        cachedCintas && !force ? Promise.resolve({ data: cachedCintas.data }) : api.get('/configuraciones-cintas')
      ])

      const ev = resEv.data.evento || resEv.data
      const listIns = resIns.data || []
      setEvento(ev)
      setInscritos(listIns)
      setCache(`evento_detalle_${id}`, { evento: ev, inscritos: listIns })

      const listAlu = resAl.data.alumnos || resAl.data || []
      setAlumnosDojo(listAlu)
      setCache('alumnos_simple_activos', listAlu, 10 * 60 * 1000)

      const cintas = resCin.data?.configuraciones || resCin.data || []
      cintas.sort((a, b) => (a.orden || 0) - (b.orden || 0))
      setCintasConfig(cintas)
      setCache('cintas_config', cintas, 30 * 60 * 1000)

      setFormEvento({
        nombre: ev.nombre || '',
        tipo: ev.tipo || 'torneo',
        fecha: ev.fecha || '',
        lugar: ev.lugar || '',
        costo: ev.costo !== null && ev.costo !== undefined ? String(ev.costo) : '',
        descripcion: ev.descripcion || ''
      })
    } catch (err) {
      console.error(err)
      const cached = getCache(`evento_detalle_${id}`)
      if (!cached || !cached.data) {
        toast.error('Error al cargar la información del evento')
      }
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [id])

  const esTorneo = evento?.tipo === 'torneo'
  const cTipo = COLOR_TIPO[evento?.tipo] || COLOR_TIPO.otro

  // Resolver cinta del alumno de manera robusta
  const resolverCinta = useCallback((alumno) => {
    if (!alumno) return null
    if (alumno.cinta_config?.nombre_nivel) return alumno.cinta_config
    if (alumno.cintaConfig?.nombre_nivel) return alumno.cintaConfig
    if (alumno.configuracion_cinta_id) {
      const found = cintasConfig.find(c => String(c.id) === String(alumno.configuracion_cinta_id))
      if (found) return found
    }
    return null
  }, [cintasConfig])

  // Obtener costo real de inscripción del alumno (evita mostrar 0 cuando no ha pagado)
  const obtenerCostoInscrito = useCallback((alumno) => {
    if (!alumno) return 0
    const pInsc = parseFloat(alumno.pago_inscripcion)
    if (!isNaN(pInsc) && pInsc > 0) {
      return pInsc
    }
    const cTorneo = parseFloat(alumno.torneo_detalle?.costo_torneo)
    if (!isNaN(cTorneo) && cTorneo > 0) {
      return cTorneo
    }
    const cEv = parseFloat(evento?.costo)
    if (!isNaN(cEv) && cEv > 0) {
      return cEv
    }
    return 0
  }, [evento])

  // Abrir modal de inscripción
  const abrirModalInscribir = () => {
    setEditandoInscrito(null)
    setModoInscribir('multiple')
    setSeleccionadosModal([])
    setCostosModal({})
    setPagadosModal({})
    setBusquedaAlumno('')
    setFiltroCintaModal('todos')
    setFormInscribir({
      alumno_id: '',
      nombre_alumno: '',
      costo: evento?.costo ? String(evento.costo) : '',
      pagado: false
    })
    setModalInscribir(true)
  }

  // Abrir modal de edición individual
  const abrirEditarInscrito = (inscrito) => {
    setEditandoInscrito(inscrito)
    setModoInscribir('individual')
    setBusquedaAlumno('')
    const cuotaActual = inscrito.pago_inscripcion || inscrito.torneo_detalle?.costo_torneo || (evento?.costo ? String(evento.costo) : '')
    setFormInscribir({
      alumno_id: inscrito.id,
      nombre_alumno: `${inscrito.nombre} ${inscrito.apellido_paterno}`,
      costo: cuotaActual !== null && cuotaActual !== undefined ? String(cuotaActual) : '',
      pagado: !!inscrito.pagado
    })
    setModalInscribir(true)
  }

  // Seleccionar un alumno en modo individual
  const seleccionarAlumno = (alumno) => {
    setFormInscribir({
      ...formInscribir,
      alumno_id: alumno.id,
      nombre_alumno: `${alumno.nombre} ${alumno.apellido_paterno}`,
      costo: evento?.costo ? String(evento.costo) : '0'
    })
    setBusquedaAlumno('')
  }

  // Toggle selección modal masivo
  const toggleSeleccionarAlumnoModal = (alumnoId) => {
    setSeleccionadosModal(prev => {
      const strId = String(alumnoId)
      if (prev.includes(alumnoId)) {
        return prev.filter(item => item !== alumnoId)
      } else {
        if (costosModal[strId] === undefined) {
          setCostosModal(c => ({ ...c, [strId]: evento?.costo ? String(evento.costo) : '0' }))
        }
        return [...prev, alumnoId]
      }
    })
  }

  const toggleSeleccionarTodosModal = () => {
    if (seleccionadosModal.length === alumnosFiltradosModal.length) {
      setSeleccionadosModal([])
    } else {
      const todosIds = alumnosFiltradosModal.map(a => a.id)
      const nuevosCostos = { ...costosModal }
      alumnosFiltradosModal.forEach(a => {
        const strId = String(a.id)
        if (nuevosCostos[strId] === undefined) {
          nuevosCostos[strId] = evento?.costo ? String(evento.costo) : '0'
        }
      })
      setCostosModal(nuevosCostos)
      setSeleccionadosModal(todosIds)
    }
  }

  const cambiarCostoAlumnoModal = (alumnoId, valor) => {
    setCostosModal(prev => ({ ...prev, [String(alumnoId)]: valor }))
  }

  const togglePagadoAlumnoModal = (alumnoId) => {
    setPagadosModal(prev => ({ ...prev, [String(alumnoId)]: !prev[String(alumnoId)] }))
  }

  // Guardar inscripción masiva
  const guardarInscripcionMasiva = async () => {
    if (seleccionadosModal.length === 0) {
      return toast.warning('Selecciona al menos un alumno para inscribir')
    }

    setGuardandoInscripcion(true)
    try {
      const payloadAlumnos = seleccionadosModal.map(alumnoId => {
        const costoVal = costosModal[String(alumnoId)] !== undefined
          ? costosModal[String(alumnoId)]
          : (evento?.costo || 0)

        return {
          alumno_id: alumnoId,
          costo: parseFloat(costoVal) || 0,
          costo_torneo: parseFloat(costoVal) || 0,
          pagado: !!pagadosModal[String(alumnoId)]
        }
      })

      const res = await api.post(`/eventos/${id}/inscribir-masivo`, {
        alumnos: payloadAlumnos
      })

      toast.success(`${res.data.count || payloadAlumnos.length} alumnos inscritos correctamente`)
      setModalInscribir(false)
      setSeleccionadosModal([])
      setCostosModal({})
      setPagadosModal({})

      const resIns = await api.get(`/eventos/${id}/inscritos`)
      const listIns = resIns.data || []
      setInscritos(listIns)
      setCache(`evento_detalle_${id}`, { evento, inscritos: listIns })
      invalidateCache('eventos_lista')
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al inscribir alumnos en lote'
      toast.error(msg)
    } finally {
      setGuardandoInscripcion(false)
    }
  }

  // Guardar inscripción individual
  const guardarInscripcion = async () => {
    if (!formInscribir.alumno_id) {
      return toast.warning('Selecciona un alumno para inscribir')
    }

    setGuardandoInscripcion(true)
    try {
      const payload = {
        alumno_id: formInscribir.alumno_id,
        costo: parseFloat(formInscribir.costo) || 0,
        costo_torneo: parseFloat(formInscribir.costo) || 0,
        pagado: formInscribir.pagado
      }

      if (editandoInscrito) {
        await api.put(`/eventos/${id}/alumnos/${formInscribir.alumno_id}`, payload)
        toast.success('Inscripción actualizada correctamente')
      } else {
        await api.post(`/eventos/${id}/inscribir`, payload)
        toast.success('Alumno inscrito correctamente')
      }

      setModalInscribir(false)
      const resIns = await api.get(`/eventos/${id}/inscritos`)
      const listIns = resIns.data || []
      setInscritos(listIns)
      setCache(`evento_detalle_${id}`, { evento, inscritos: listIns })
      invalidateCache('eventos_lista')
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al guardar la inscripción'
      toast.error(msg)
    } finally {
      setGuardandoInscripcion(false)
    }
  }

  // Guardar cambios del evento base
  const guardarEventoBase = async () => {
    if (!formEvento.nombre.trim()) return toast.warning('Ingresa el nombre del evento')
    if (!formEvento.fecha) return toast.warning('Selecciona la fecha del evento')

    try {
      await api.put(`/eventos/${id}`, {
        ...formEvento,
        costo: formEvento.costo !== '' ? parseFloat(formEvento.costo) : null
      })
      toast.success('Evento actualizado')
      setModalEvento(false)
      const resEv = await api.get(`/eventos/${id}`)
      const evData = resEv.data.evento || resEv.data
      setEvento(evData)
      setCache(`evento_detalle_${id}`, { evento: evData, inscritos })
      invalidateCache('eventos_lista')
    } catch (err) {
      toast.error('Error al actualizar el evento')
    }
  }

  // Actualizar atributo optimista
  const actualizarAtributo = async (alumnoId, cambios) => {
    const prevInscritos = [...inscritos]
    const alumnoObj = inscritos.find(a => a.id === alumnoId)
    const costoVal = obtenerCostoInscrito(alumnoObj)

    const payload = { ...cambios }
    if (cambios.pagado === true && !cambios.costo_torneo && !cambios.costo) {
      payload.costo_torneo = costoVal
      payload.costo = costoVal
    }

    setInscritos(prev => prev.map(a => {
      if (a.id !== alumnoId) return a
      const updated = { ...a, ...payload }
      if (payload.pagado === true && (!a.pago_inscripcion || parseFloat(a.pago_inscripcion) === 0)) {
        updated.pago_inscripcion = costoVal
      }
      if (cambios.resultado_torneo !== undefined && updated.torneo_detalle) {
        updated.torneo_detalle = { ...updated.torneo_detalle, resultado: cambios.resultado_torneo }
      }
      return updated
    }))

    try {
      await api.put(`/eventos/${id}/alumnos/${alumnoId}`, payload)
      invalidateCache(`evento_detalle_${id}`)
      invalidateCache('eventos_lista')
      if (cambios.pagado !== undefined) {
        toast.success(cambios.pagado ? 'Pago registrado' : 'Pago marcado como pendiente')
      } else if (cambios.resultado_torneo !== undefined) {
        toast.info('Resultado actualizado')
      }
    } catch (err) {
      setInscritos(prevInscritos)
      toast.error('Error al actualizar los datos del alumno')
    }
  }

  // Eliminar inscripción individual
  const eliminarInscripcion = async (alumnoId, nombreAlumno) => {
    const result = await Swal.fire({
      title: '¿Quitar alumno del evento?',
      html: `¿Estás seguro de quitar a <strong>${nombreAlumno}</strong> de este evento?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)'
    })

    if (!result.isConfirmed) return

    const prevInscritos = [...inscritos]
    setInscritos(prev => prev.filter(a => a.id !== alumnoId))
    setSeleccionados(prev => prev.filter(itemId => itemId !== alumnoId))

    try {
      await api.delete(`/eventos/${id}/alumnos/${alumnoId}`)
      invalidateCache(`evento_detalle_${id}`)
      invalidateCache('eventos_lista')
      toast.success('Alumno quitado del evento')
    } catch (err) {
      setInscritos(prevInscritos)
      toast.error('Error al quitar al alumno')
    }
  }

  // Selección múltiple
  const toggleSeleccionarAlumno = (alumnoId) => {
    setSeleccionados(prev =>
      prev.includes(alumnoId) ? prev.filter(itemId => itemId !== alumnoId) : [...prev, alumnoId]
    )
  }

  const toggleSeleccionarTodo = () => {
    if (seleccionados.length === inscritosFiltrados.length) {
      setSeleccionados([])
    } else {
      setSeleccionados(inscritosFiltrados.map(a => a.id))
    }
  }

  const pagarMasivo = async () => {
    const listaTarget = seleccionados.length > 0 ? seleccionados : inscritosFiltrados.map(a => a.id)
    if (listaTarget.length === 0) return toast.warning('No hay alumnos seleccionados')

    const result = await Swal.fire({
      title: '¿Marcar cuotas como pagadas?',
      html: `Se registrará como <strong>PAGADA</strong> la cuota de <strong>${listaTarget.length}</strong> alumnos.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, marcar ${listaTarget.length} pagados`,
      confirmButtonColor: '#3b82f6',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)'
    })

    if (!result.isConfirmed) return

    const prevInscritos = [...inscritos]
    const targetSet = new Set(listaTarget)

    setInscritos(prev => prev.map(a => {
      if (!targetSet.has(a.id)) return a
      const costoVal = obtenerCostoInscrito(a)
      return { ...a, pagado: true, pago_inscripcion: costoVal }
    }))
    setSeleccionados([])
    setProcesandoMasivo(true)

    try {
      await Promise.all(
        listaTarget.map(alumnoId => {
          const alu = prevInscritos.find(a => a.id === alumnoId)
          const costoVal = obtenerCostoInscrito(alu)
          return api.put(`/eventos/${id}/alumnos/${alumnoId}`, { pagado: true, costo_torneo: costoVal, costo: costoVal })
        })
      )
      invalidateCache(`evento_detalle_${id}`)
      invalidateCache('eventos_lista')
      toast.success(`${listaTarget.length} pagos registrados correctamente`)
    } catch (err) {
      setInscritos(prevInscritos)
      toast.error('Error al registrar pagos masivos')
    } finally {
      setProcesandoMasivo(false)
    }
  }

  // Generar recibo individual
  const generarRecibo = async (alumno) => {
    try {
      const escInfo = await obtenerInfoEscuelaParaPDF()
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' })

      const nomAlumno = `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.trim()
      const cintaObj = resolverCinta(alumno)
      const cintaTxt = cintaObj?.nombre_nivel || 'Sin cinta'
      const costoVal = obtenerCostoInscrito(alumno)

      const startY = dibujarEncabezadoMembrete(doc, {
        escuelaInfo: escInfo,
        tipoReporte: 'RECIBO OFICIAL DE EVENTO',
        subtituloEtiqueta: 'Evento / Fecha:',
        subtituloValor: `${evento?.nombre || 'Evento'} • ${formatearFechaNaturalPDF(evento?.fecha)}`
      })

      // Tarjeta de datos del alumno
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(14, startY, 188, 24, 2, 2, 'F')
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(14, startY, 188, 24, 2, 2, 'S')

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text(`Alumno: ${nomAlumno}`, 20, startY + 9)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text(`Grado actual: ${cintaTxt}`, 20, startY + 17)
      doc.text(`Folio de Alumno: #${String(alumno.id).padStart(4, '0')}`, 130, startY + 17)

      // Tabla de desglose
      const fechaPagoStr = alumno.fecha_pago ? formatearFechaNaturalPDF(alumno.fecha_pago) : formatearFechaNaturalPDF(new Date().toISOString().split('T')[0])

      autoTable(doc, {
        startY: startY + 30,
        head: [['CONCEPTO', 'SEDE / LUGAR', 'FECHA DE PAGO', 'MONTO']],
        body: [[
          `Inscripción a ${evento?.tipo?.toUpperCase() || 'EVENTO'}: ${evento?.nombre || ''}`,
          evento?.lugar || 'Sede oficial',
          fechaPagoStr,
          `$${costoVal.toFixed(2)}`
        ]],
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontSize: 9, halign: 'center', textColor: 255 },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        styles: { fontSize: 8.5, cellPadding: 5, halign: 'center' },
        margin: { left: 14, right: 14 }
      })

      const finalY = doc.lastAutoTable.finalY + 12
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(130, finalY, 72, 18, 2, 2, 'F')
      doc.setDrawColor(37, 99, 235)
      doc.roundedRect(130, finalY, 72, 18, 2, 2, 'S')

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(37, 99, 235)
      doc.text(`PAGADO: $${costoVal.toFixed(2)}`, 166, finalY + 11.5, { align: 'center' })

      // Firmas
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.line(24, 230, 84, 230)
      doc.text("Firma de Administración", 54, 235, { align: 'center' })
      doc.line(130, 230, 190, 230)
      doc.text("Sello del Dojo", 160, 235, { align: 'center' })

      agregarPieDePagina(doc, user)

      await guardarODescargarPDF(doc, `Recibo_${(evento?.nombre || 'Evento').replace(/\s+/g, '_')}_${nomAlumno.replace(/\s+/g, '_')}.pdf`)
      toast.success('Recibo PDF generado correctamente')
    } catch (e) {
      console.error(e)
      toast.error('Error al generar el recibo PDF')
    }
  }

  // --- FILTRADO DE INSCRITOS ---
  const inscritosFiltrados = useMemo(() => {
    return inscritos.filter(a => {
      const nombreCompleto = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.toLowerCase()
      if (busqueda && !nombreCompleto.includes(busqueda.toLowerCase())) return false

      if (filtroPago === 'pagado' && !a.pagado) return false
      if (filtroPago === 'pendiente' && a.pagado) return false

      const cid = a.configuracion_cinta_id || a.cintaConfig?.id || a.cinta_config?.id
      if (filtroCinta !== 'todos' && String(cid) !== String(filtroCinta)) return false

      if (esTorneo && filtroMedalla !== 'todos') {
        const med = a.torneo_detalle?.resultado || 'pendiente'
        if (med !== filtroMedalla) return false
      }

      return true
    })
  }, [inscritos, busqueda, filtroPago, filtroCinta, filtroMedalla, esTorneo])

  // --- ESTADÍSTICAS ---
  const stats = useMemo(() => {
    const total = inscritos.length
    const pagados = inscritos.filter(a => a.pagado).length
    const pendientesPago = total - pagados
    const recaudado = inscritos.filter(a => a.pagado).reduce((acc, a) => {
      const costoVal = obtenerCostoInscrito(a)
      return acc + costoVal
    }, 0)

    return { total, pagados, pendientesPago, recaudado }
  }, [inscritos, obtenerCostoInscrito])

  // Filtrado de alumnos para modal masivo
  const alumnosFiltradosModal = useMemo(() => {
    const yaInscritosIds = new Set(inscritos.map(i => i.id))
    return alumnosDojo
      .filter(a => !yaInscritosIds.has(a.id))
      .filter(a => {
        if (filtroCintaModal !== 'todos') {
          const cid = a.configuracion_cinta_id || a.cintaConfig?.id || a.cinta_config?.id
          if (String(cid) !== String(filtroCintaModal)) return false
        }
        if (busquedaAlumno) {
          const nom = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.toLowerCase()
          if (!nom.includes(busquedaAlumno.toLowerCase())) return false
        }
        return true
      })
  }, [alumnosDojo, inscritos, filtroCintaModal, busquedaAlumno])

  // --- EXPORTAR EXCEL ---
  const exportarExcel = async () => {
    if (inscritosFiltrados.length === 0) return toast.warning('No hay participantes para exportar')

    const data = inscritosFiltrados.map((a, i) => {
      const row = {
        '#': i + 1,
        'Alumno': `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.trim(),
        'Grado / Cinta': a.cintaConfig?.nombre_nivel || a.cinta_config?.nombre_nivel || 'Sin cinta',
        'Cuota': `$${formatCosto(a.pago_inscripcion || a.torneo_detalle?.costo_torneo || evento?.costo)}`,
        'Estado de Pago': a.pagado ? 'PAGADO' : 'PENDIENTE'
      }
      if (esTorneo) {
        row['Resultado / Medalla'] = (a.torneo_detalle?.resultado || 'pendiente').toUpperCase()
      }
      return row
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inscritos')
    const filename = `Participantes_${(evento?.nombre || 'Evento').replace(/\s+/g, '_')}.xlsx`
    await guardarODescargarExcel(wb, filename)
    toast.success('Archivo Excel generado exitosamente')
  }

  // --- EXPORTAR PDF ---
  const exportarPDF = async () => {
    if (inscritosFiltrados.length === 0) return toast.warning('No hay participantes para exportar')

    const escInfo = await obtenerInfoEscuelaParaPDF()
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' })

    const startY = dibujarEncabezadoMembrete(doc, {
      escuelaInfo: escInfo,
      tipoReporte: `LISTA DE PARTICIPANTES - ${evento?.tipo?.toUpperCase() || 'EVENTO'}`,
      subtituloEtiqueta: 'Evento / Fecha:',
      subtituloValor: `${evento?.nombre || 'Evento'} • ${formatearFechaNaturalPDF(evento?.fecha)}`
    })

    const tableColumn = ['#', 'Nombre Alumno', 'Grado / Cinta', 'Cuota', 'Estado', ...(esTorneo ? ['Resultado'] : [])]
    const tableRows = inscritosFiltrados.map((a, i) => {
      const fila = [
        i + 1,
        `${a.nombre} ${a.apellido_paterno}`,
        a.cintaConfig?.nombre_nivel || a.cinta_config?.nombre_nivel || '-',
        `$${formatCosto(a.pago_inscripcion || a.torneo_detalle?.costo_torneo || evento?.costo)}`,
        a.pagado ? 'PAGADO' : 'PENDIENTE'
      ]
      if (esTorneo) {
        fila.push((a.torneo_detalle?.resultado || 'pendiente').toUpperCase())
      }
      return fila
    })

    autoTable(doc, {
      startY: startY,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8.5, cellPadding: 2.5, halign: 'center' },
      styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 60, halign: 'left' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 30, halign: 'center' },
        ...(esTorneo ? { 5: { cellWidth: 28, halign: 'center' } } : {})
      },
      margin: { left: 14, right: 14, bottom: 24 },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 4) {
          data.cell.styles.textColor = data.cell.raw === 'PAGADO' ? [16, 185, 129] : [239, 68, 68]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    })

    agregarPieDePagina(doc, user)
    await guardarODescargarPDF(doc, `Participantes_${(evento?.nombre || 'Evento').replace(/\s+/g, '_')}.pdf`)
    toast.success('Lista en PDF generada exitosamente')
  }

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '16px', fontWeight: '700' }}>Cargando evento...</div>
      </div>
    )
  }

  if (!evento) {
    return (
      <div style={s.emptyState}>
        <FiCalendar size={36} color="var(--accent-blue)" style={{ marginBottom: '12px' }} />
        <h3>Evento no encontrado</h3>
        <button style={s.btnBack} onClick={() => navigate('/eventos')}>
          ← Volver a Eventos
        </button>
      </div>
    )
  }

  return (
    <div style={s.page}>
      {/* ── BOTÓN VOLVER ── */}
      <button
        style={s.btnBack}
        onClick={() => navigate('/eventos')}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateX(-3px)'
          e.currentTarget.style.color = 'var(--accent-blue)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
      >
        <FiArrowLeft size={16} />
        <span>Volver a Eventos</span>
      </button>

      {/* ── HERO HEADER DEL EVENTO ── */}
      <div style={s.heroCard}>
        <div style={s.heroInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ ...s.tipoBadge, background: cTipo.bg, color: cTipo.color, border: `1px solid ${cTipo.border}` }}>
              {(evento.tipo === 'demostracion' || evento.tipo === 'fogueo') ? 'FOGUEO' : (evento.tipo?.toUpperCase() || 'EVENTO')}
            </span>
            <span style={s.heroFecha}>
              <FiCalendar size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {formatFechaNatural(evento.fecha)}
            </span>
            {evento.lugar && (
              <span style={s.heroLugar}>
                <FiMapPin size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                {evento.lugar}
              </span>
            )}
            <span style={s.heroCosto}>
              <FiDollarSign size={13} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
              {evento.costo > 0 ? `Cuota base: $${parseFloat(evento.costo).toFixed(2)}` : 'Evento Gratuito'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
            <h1 style={s.heroTitulo}>{evento.nombre}</h1>
            <button
              style={s.btnEditEventoMini}
              onClick={() => setModalEvento(true)}
              title="Editar datos del evento"
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
                e.currentTarget.style.transform = 'none'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
          </div>

          {evento.descripcion && (
            <p style={s.heroDesc}>{evento.descripcion}</p>
          )}
        </div>

        <div style={s.heroActions}>
          <button
            style={s.btnInscribir}
            onClick={abrirModalInscribir}
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
            <FiUserPlus size={16} />
            <span>Inscribir alumno</span>
          </button>
        </div>
      </div>

      {/* ── SUMMARY CARDS DE PARTICIPACIÓN Y RECAUDACIÓN ── */}
      <div style={s.statsGrid}>
        {/* Inscritos Totales */}
        <div style={s.statCard}>
          <div style={{ ...s.statIconBox, background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)' }}>
            <FiUsers size={22} />
          </div>
          <div style={s.statContent}>
            <span style={s.statLabel}>Inscritos Totales</span>
            <div style={{ ...s.statValor, color: 'var(--accent-blue)' }}>{stats.total}</div>
            <span style={s.statSublabel}>Alumnos registrados</span>
          </div>
        </div>

        {/* Cuotas Pagadas */}
        <div style={s.statCard}>
          <div style={{ ...s.statIconBox, background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-green)' }}>
            <FiCheckCircle size={22} />
          </div>
          <div style={s.statContent}>
            <span style={s.statLabel}>Cuotas Pagadas</span>
            <div style={{ ...s.statValor, color: 'var(--accent-green)' }}>{stats.pagados}</div>
            <span style={s.statSublabel}>Al corriente con pago</span>
          </div>
        </div>

        {/* Pendientes de Pago */}
        <div style={s.statCard}>
          <div style={{ ...s.statIconBox, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <FiClock size={22} />
          </div>
          <div style={s.statContent}>
            <span style={s.statLabel}>Pendientes de Pago</span>
            <div style={{ ...s.statValor, color: '#f59e0b' }}>{stats.pendientesPago}</div>
            <span style={s.statSublabel}>Por liquidar cuota</span>
          </div>
        </div>

        {/* Total Recaudado */}
        <div style={s.statCard}>
          <div style={{ ...s.statIconBox, background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-green)' }}>
            <FiDollarSign size={22} />
          </div>
          <div style={s.statContent}>
            <span style={s.statLabel}>Total Recaudado</span>
            <div style={{ ...s.statValor, color: 'var(--text-primary)' }}>
              ${Math.round(stats.recaudado).toLocaleString('es-MX')}
            </div>
            <span style={s.statSublabel}>Cuotas cobradas con éxito</span>
          </div>
        </div>
      </div>

      {/* ── BARRA DE HERRAMIENTAS Y ACCIONES ── */}
      <div style={s.barraAcciones}>
        <div style={s.searchWrapper}>
          <FiSearch style={s.searchIcon} size={16} />
          <input
            style={s.search}
            placeholder="Buscar participante por nombre..."
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
            label="Estado de pago"
            icon={<FiDollarSign size={13} />}
            options={[
              { value: 'todos', label: 'Todos los pagos' },
              { value: 'pagado', label: 'Pagados' },
              { value: 'pendiente', label: 'Pendientes de pago' }
            ]}
            value={filtroPago}
            onChange={val => setFiltroPago(val)}
            minWidth="195px"
          />

          <CustomDropdown
            label="Todas las cintas"
            icon={<FiShield size={13} />}
            options={[
              { value: 'todos', label: 'Todas las cintas' },
              ...cintasConfig.map(c => ({ value: String(c.id), label: c.nombre_nivel }))
            ]}
            value={filtroCinta}
            onChange={val => setFiltroCinta(val)}
            minWidth="185px"
          />

          {esTorneo && (
            <CustomDropdown
              label="Todas las medallas"
              icon={<FiAward size={13} />}
              options={[
                { value: 'todos', label: 'Todas las medallas' },
                { value: 'oro', label: 'Medalla de Oro' },
                { value: 'plata', label: 'Medalla de Plata' },
                { value: 'bronce', label: 'Medalla de Bronce' },
                { value: 'eliminado', label: 'Sin medalla' },
                { value: 'pendiente', label: 'Pendiente' }
              ]}
              value={filtroMedalla}
              onChange={val => setFiltroMedalla(val)}
              minWidth="185px"
            />
          )}

          <BotonExportar onExportarExcel={exportarExcel} onExportarPDF={exportarPDF} />
        </div>
      </div>

      {/* ── BARRA FLOTANTE DE SELECCIÓN MASIVA ── */}
      {seleccionados.length > 0 && (
        <div style={s.bulkBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: '700', color: 'var(--accent-blue)', fontSize: '13.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <FiCheckSquare size={16} />
              <span>{seleccionados.length} alumno{seleccionados.length > 1 ? 's' : ''} seleccionado{seleccionados.length > 1 ? 's' : ''}</span>
            </span>
            <button style={s.btnDesmarcar} onClick={() => setSeleccionados([])}>
              Desmarcar selección
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              style={s.btnPagarMasivo}
              onClick={pagarMasivo}
              disabled={procesandoMasivo}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(59, 130, 246, 0.4)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.35)'
              }}
            >
              <FiDollarSign size={15} />
              <span>Marcar Pagados ({seleccionados.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ── VISTA RESPONSIVA: TABLA EN ESCRITORIO / TARJETAS EN MÓVIL ── */}
      {isMobile ? (
        /* VISTA MÓVIL (TARJETAS TÁCTILES SIN SCROLL HORIZONTAL) */
        <div style={s.mobileCardList}>
          {inscritosFiltrados.length === 0 ? (
            <div style={s.emptyState}>
              <FiUsers size={36} color="var(--accent-blue)" style={{ marginBottom: '10px' }} />
              <p style={{ margin: 0, fontSize: '13.5px' }}>No hay participantes con los filtros aplicados</p>
            </div>
          ) : (
            inscritosFiltrados.map((a) => {
              const cintaActual = resolverCinta(a)
              const isSelected = seleccionados.includes(a.id)
              const costoMostrar = obtenerCostoInscrito(a)
              const resTorneo = a.torneo_detalle?.resultado || 'pendiente'
              const cMed = COLOR_MEDALLA[resTorneo] || COLOR_MEDALLA.pendiente

              return (
                <div
                  key={a.id}
                  style={{
                    ...s.mobileCard,
                    background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-secondary)',
                    borderColor: isSelected ? 'var(--accent-blue)' : 'var(--border)'
                  }}
                >
                  {/* Fila superior: Checkbox, Avatar, Nombre y Acciones */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSeleccionarAlumno(a.id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-blue)', flexShrink: 0 }}
                      />
                      <div style={s.avatarSmall}>
                        {a.foto_url ? (
                          <img src={a.foto_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          obtenerIniciales(a.nombre, a.apellido_paterno)
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontWeight: '700',
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/alumnos/${a.id}`)}
                          title="Ver perfil del alumno"
                        >
                          {a.nombre} {a.apellido_paterno}
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción móvil */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {!!a.pagado && (
                        <button
                          style={{ ...s.btnIcon, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}
                          onClick={() => generarRecibo(a)}
                          title="Descargar Recibo PDF"
                        >
                          <FiFileText size={14} />
                        </button>
                      )}
                      <button
                        style={{ ...s.btnIcon, ...s.btnEdit }}
                        onClick={() => abrirEditarInscrito(a)}
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#3b82f6'
                          e.currentTarget.style.color = 'white'
                          e.currentTarget.style.transform = 'scale(1.1)'
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
                          e.currentTarget.style.color = '#3b82f6'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                        title="Editar inscripción"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button
                        style={{ ...s.btnIcon, ...s.btnDel }}
                        onClick={() => eliminarInscripcion(a.id, `${a.nombre} ${a.apellido_paterno}`)}
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#ef4444'
                          e.currentTarget.style.color = 'white'
                          e.currentTarget.style.transform = 'scale(1.1)'
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                          e.currentTarget.style.color = '#ef4444'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                        title="Quitar participante"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Fila intermedia: Cinta y Resultado si aplica */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        ...s.badgeCinta,
                        background: cintaActual?.color_hex || 'var(--bg-tertiary)',
                        color: cintaActual?.color_texto || 'var(--text-primary)'
                      }}
                    >
                      {cintaActual?.nombre_nivel || 'Sin grado'}
                    </span>

                    {esTorneo && (
                      <select
                        style={{
                          ...s.selectMedalla,
                          background: cMed.bg,
                          color: cMed.color,
                          borderColor: cMed.border
                        }}
                        value={resTorneo}
                        onChange={e => actualizarAtributo(a.id, { resultado_torneo: e.target.value })}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="oro">Medalla de Oro</option>
                        <option value="plata">Medalla de Plata</option>
                        <option value="bronce">Medalla de Bronce</option>
                        <option value="eliminado">Sin medalla</option>
                      </select>
                    )}
                  </div>

                  {/* Fila inferior: Costo y Toggle de Pago */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        ${formatCosto(costoMostrar)}
                      </span>
                      <button
                        style={{
                          ...s.btnBadgeStatus,
                          background: a.pagado ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: a.pagado ? '#10b981' : '#ef4444',
                          border: `1px solid ${a.pagado ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
                        }}
                        onClick={() => actualizarAtributo(a.id, { pagado: !a.pagado, costo: costoMostrar, costo_torneo: costoMostrar })}
                        title="Toca para cambiar estado de pago"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {a.pagado ? <FiCheck size={11} strokeWidth={2.5} /> : <FiX size={11} strokeWidth={2.5} />}
                          <span>{a.pagado ? 'PAGADO' : 'PENDIENTE'}</span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        /* VISTA ESCRITORIO (TABLA DETALLADA) */
        <div style={s.tableContainer}>
          <div style={s.tablaScroll}>
            <table style={s.table}>
              <colgroup>
                <col style={{ width: '45px' }} />  {/* Checkbox */}
                <col style={{ width: '280px' }} /> {/* Alumno */}
                <col style={{ width: '160px' }} /> {/* Grado Actual */}
                <col style={{ width: '110px' }} /> {/* Costo */}
                <col style={{ width: '150px' }} /> {/* Estado de Pago */}
                {esTorneo && <col style={{ width: '150px' }} />} {/* Resultado */}
                <col style={{ width: '110px' }} /> {/* Acciones */}
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...s.th, textAlign: 'center', paddingLeft: '12px' }}>
                    <input
                      type="checkbox"
                      checked={inscritosFiltrados.length > 0 && seleccionados.length === inscritosFiltrados.length}
                      onChange={toggleSeleccionarTodo}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-blue)' }}
                      title="Seleccionar / desmarcar todos"
                    />
                  </th>
                  <th style={{ ...s.th, textAlign: 'left' }}>Alumno</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Grado Actual</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Costo</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Estado de Pago</th>
                  {esTorneo && <th style={{ ...s.th, textAlign: 'center' }}>Resultado</th>}
                  <th style={{ ...s.th, textAlign: 'center', paddingRight: '20px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inscritosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={esTorneo ? 7 : 6} style={{ ...s.td, padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay participantes registrados que coincidan con los filtros aplicados
                    </td>
                  </tr>
                ) : (
                  inscritosFiltrados.map((a) => {
                    const cintaActual = resolverCinta(a)
                    const costoMostrar = obtenerCostoInscrito(a)
                    const resTorneo = a.torneo_detalle?.resultado || 'pendiente'
                    const cMed = COLOR_MEDALLA[resTorneo] || COLOR_MEDALLA.pendiente

                    return (
                      <tr
                        key={a.id}
                        style={{
                          ...s.tr,
                          background: seleccionados.includes(a.id)
                            ? 'rgba(59, 130, 246, 0.1)'
                            : (rowHover === a.id ? 'var(--bg-tertiary)' : 'transparent'),
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={() => setRowHover(a.id)}
                        onMouseLeave={() => setRowHover(null)}
                      >
                        {/* Checkbox */}
                        <td style={{ ...s.td, textAlign: 'center', paddingLeft: '12px' }}>
                          <input
                            type="checkbox"
                            checked={seleccionados.includes(a.id)}
                            onChange={() => toggleSeleccionarAlumno(a.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-blue)' }}
                          />
                        </td>

                        {/* ALUMNO */}
                        <td style={{ ...s.td, textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={s.avatarSmall}>
                              {a.foto_url ? (
                                <img src={a.foto_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                obtenerIniciales(a.nombre, a.apellido_paterno)
                              )}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: '700',
                                  color: 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer'
                                }}
                                onClick={() => navigate(`/alumnos/${a.id}`)}
                                title="Clic para ver perfil"
                              >
                                {a.nombre} {a.apellido_paterno}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Grado Actual */}
                        <td style={{ ...s.td, textAlign: 'center' }}>
                          <span
                            style={{
                              ...s.badgeCinta,
                              background: cintaActual?.color_hex || 'var(--bg-tertiary)',
                              color: cintaActual?.color_texto || 'var(--text-primary)',
                            }}
                          >
                            {cintaActual?.nombre_nivel || 'Sin grado'}
                          </span>
                        </td>

                        {/* Costo */}
                        <td style={{ ...s.td, textAlign: 'center' }}>
                          <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>
                            ${formatCosto(costoMostrar)}
                          </span>
                        </td>

                        {/* Toggle Pago */}
                        <td style={{ ...s.td, textAlign: 'center' }}>
                          <button
                            style={{
                              ...s.btnBadgeStatus,
                              background: a.pagado ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: a.pagado ? '#10b981' : '#ef4444',
                              border: `1px solid ${a.pagado ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
                            }}
                            onClick={() => actualizarAtributo(a.id, { pagado: !a.pagado, costo: costoMostrar, costo_torneo: costoMostrar })}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'scale(1.04)'
                              e.currentTarget.style.boxShadow = a.pagado ? '0 0 12px rgba(16, 185, 129, 0.4)' : '0 0 12px rgba(239, 68, 68, 0.4)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'none'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                            title="Clic para cambiar estado de pago"
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {a.pagado ? <FiCheck size={12} strokeWidth={2.5} /> : <FiX size={12} strokeWidth={2.5} />}
                              <span>{a.pagado ? 'PAGADO' : 'PENDIENTE'}</span>
                            </span>
                          </button>
                        </td>

                        {/* Resultado / Medalla si es torneo */}
                        {esTorneo && (
                          <td style={{ ...s.td, textAlign: 'center' }}>
                            <select
                              style={{
                                ...s.selectMedalla,
                                background: cMed.bg,
                                color: cMed.color,
                                borderColor: cMed.border
                              }}
                              value={resTorneo}
                              onChange={e => actualizarAtributo(a.id, { resultado_torneo: e.target.value })}
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="oro">Medalla de Oro</option>
                              <option value="plata">Medalla de Plata</option>
                              <option value="bronce">Medalla de Bronce</option>
                              <option value="eliminado">Sin medalla</option>
                            </select>
                          </td>
                        )}

                        {/* Acciones */}
                        <td style={{ ...s.td, textAlign: 'center', paddingRight: '20px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                            {!!a.pagado && (
                              <button
                                style={{ ...s.btnIcon, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}
                                onClick={() => generarRecibo(a)}
                                onMouseOver={e => {
                                  e.currentTarget.style.background = '#f59e0b'
                                  e.currentTarget.style.color = 'white'
                                  e.currentTarget.style.transform = 'scale(1.1)'
                                }}
                                onMouseOut={e => {
                                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.12)'
                                  e.currentTarget.style.color = '#f59e0b'
                                  e.currentTarget.style.transform = 'scale(1)'
                                }}
                                title="Descargar Recibo PDF"
                              >
                                <FiFileText size={15} />
                              </button>
                            )}

                            <button
                              style={{ ...s.btnIcon, ...s.btnEdit }}
                              onClick={() => abrirEditarInscrito(a)}
                              onMouseOver={e => {
                                e.currentTarget.style.background = '#3b82f6'
                                e.currentTarget.style.color = 'white'
                                e.currentTarget.style.transform = 'scale(1.1)'
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
                                e.currentTarget.style.color = '#3b82f6'
                                e.currentTarget.style.transform = 'scale(1)'
                              }}
                              title="Editar"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>

                            <button
                              style={{ ...s.btnIcon, ...s.btnDel }}
                              onClick={() => eliminarInscripcion(a.id, `${a.nombre} ${a.apellido_paterno}`)}
                              onMouseOver={e => {
                                e.currentTarget.style.background = '#ef4444'
                                e.currentTarget.style.color = 'white'
                                e.currentTarget.style.transform = 'scale(1.1)'
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                                e.currentTarget.style.color = '#ef4444'
                                e.currentTarget.style.transform = 'scale(1)'
                              }}
                              title="Quitar"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL INSCRIBIR (MULTIPLE / INDIVIDUAL) ── */}
      {modalInscribir && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: modoInscribir === 'multiple' ? '700px' : '520px' }} className="mobile-fullscreen-modal">
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ ...s.statIconBox, width: '38px', height: '38px', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)' }}>
                  <FiUserPlus size={18} />
                </div>
                <div>
                  <h3 style={s.modalTitulo}>{editandoInscrito ? 'Editar Inscripción' : 'Inscribir Participante'}</h3>
                  <p style={s.modalSub}>{editandoInscrito ? 'Modifica la cuota o estado de pago' : 'Selecciona alumnos para el evento'}</p>
                </div>
              </div>
              <button
                className="btn-cerrar-circular"
                style={s.btnCerrarCircular}
                onClick={() => setModalInscribir(false)}
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Pestañas de modo (solo al crear) */}
            {!editandoInscrito && (
              <div style={s.modoSelector}>
                <button
                  style={modoInscribir === 'multiple' ? s.modoBtnActive : s.modoBtn}
                  onClick={() => setModoInscribir('multiple')}
                >
                  Inscripción en Lote (Múltiple)
                </button>
                <button
                  style={modoInscribir === 'individual' ? s.modoBtnActive : s.modoBtn}
                  onClick={() => setModoInscribir('individual')}
                >
                  Inscripción Individual
                </button>
              </div>
            )}

            <div style={s.modalContent}>
              {modoInscribir === 'multiple' && !editandoInscrito ? (
                /* MODO MÚLTIPLE */
                <div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                      <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={15} />
                      <input
                        style={{ ...s.input, paddingLeft: '36px', height: '38px' }}
                        placeholder="Buscar alumno..."
                        value={busquedaAlumno}
                        onChange={e => setBusquedaAlumno(e.target.value)}
                      />
                    </div>
                    <select
                      style={{ ...s.select, width: '160px', height: '38px' }}
                      value={filtroCintaModal}
                      onChange={e => setFiltroCintaModal(e.target.value)}
                    >
                      <option value="todos">Todas las cintas</option>
                      {cintasConfig.map(c => (
                        <option key={c.id} value={String(c.id)}>{c.nombre_nivel}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>
                      {alumnosFiltradosModal.length} alumnos disponibles ({seleccionadosModal.length} seleccionados)
                    </span>
                    <button
                      type="button"
                      style={s.btnTextoSecundario}
                      onClick={toggleSeleccionarTodosModal}
                    >
                      {seleccionadosModal.length === alumnosFiltradosModal.length ? 'Desmarcar todos' : 'Seleccionar todos'}
                    </button>
                  </div>

                  <div style={s.listaAlumnosModal}>
                    {alumnosFiltradosModal.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No hay alumnos disponibles para inscribir
                      </div>
                    ) : (
                      alumnosFiltradosModal.map(a => {
                        const isSel = seleccionadosModal.includes(a.id)
                        const strId = String(a.id)
                        const costoVal = costosModal[strId] !== undefined ? costosModal[strId] : (evento?.costo ? String(evento.costo) : '0')
                        const pagadoVal = !!pagadosModal[strId]
                        const cintaActual = a.cintaConfig || a.cinta_config

                        return (
                          <div
                            key={a.id}
                            style={{
                              ...s.itemAlumnoModal,
                              background: isSel ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-primary)',
                              borderColor: isSel ? 'var(--accent-blue)' : 'var(--border)'
                            }}
                          >
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                              <input
                                type="checkbox"
                                checked={isSel}
                                onChange={() => toggleSeleccionarAlumnoModal(a.id)}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                              />
                              <div style={s.avatarTiny}>
                                {obtenerIniciales(a.nombre, a.apellido_paterno)}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {a.nombre} {a.apellido_paterno}
                                </div>
                                <div style={{ fontSize: '11px', color: cintaActual?.color_hex || 'var(--text-muted)' }}>
                                  {cintaActual?.nombre_nivel || 'Sin cinta'}
                                </div>
                              </div>
                            </label>

                            {isSel && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    style={{ ...s.input, width: '70px', height: '30px', padding: '0 6px', fontSize: '12px', textAlign: 'right' }}
                                    value={costoVal}
                                    onChange={e => cambiarCostoAlumnoModal(a.id, e.target.value)}
                                  />
                                </div>
                                <button
                                  type="button"
                                  style={{
                                    ...s.btnMiniTogglePago,
                                    background: pagadoVal ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
                                    color: pagadoVal ? '#10b981' : 'var(--text-muted)',
                                    borderColor: pagadoVal ? 'rgba(16, 185, 129, 0.35)' : 'var(--border)'
                                  }}
                                  onClick={() => togglePagadoAlumnoModal(a.id)}
                                >
                                  {pagadoVal ? 'Pagado' : 'Pendiente'}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* MODO INDIVIDUAL / EDITAR */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {!editandoInscrito ? (
                    <div style={s.campoGroup}>
                      <label style={s.label}>Seleccionar Alumno *</label>
                      <div style={{ position: 'relative' }}>
                        <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={15} />
                        <input
                          style={{ ...s.input, paddingLeft: '36px' }}
                          placeholder="Escribe el nombre del alumno..."
                          value={formInscribir.nombre_alumno || busquedaAlumno}
                          onChange={e => {
                            setBusquedaAlumno(e.target.value)
                            setFormInscribir({ ...formInscribir, alumno_id: '', nombre_alumno: '' })
                          }}
                        />
                      </div>

                      {busquedaAlumno && !formInscribir.alumno_id && (
                        <div style={s.dropdownSugerencias}>
                          {alumnosDojo
                            .filter(a => `${a.nombre} ${a.apellido_paterno}`.toLowerCase().includes(busquedaAlumno.toLowerCase()))
                            .slice(0, 5)
                            .map(a => (
                              <div
                                key={a.id}
                                style={s.itemSugerencia}
                                onClick={() => seleccionarAlumno(a)}
                              >
                                <span style={{ fontWeight: '600' }}>{a.nombre} {a.apellido_paterno}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.cintaConfig?.nombre_nivel || a.cinta_config?.nombre_nivel || ''}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={s.campoGroup}>
                      <label style={s.label}>Alumno</label>
                      <div style={{ ...s.input, display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
                        <strong>{formInscribir.nombre_alumno}</strong>
                      </div>
                    </div>
                  )}

                  <div style={s.campoGroup}>
                    <label style={s.label}>Cuota de Inscripción ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      style={s.input}
                      placeholder="0.00"
                      value={formInscribir.costo}
                      onChange={e => setFormInscribir({ ...formInscribir, costo: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      id="chkPagadoIndiv"
                      checked={formInscribir.pagado}
                      onChange={e => setFormInscribir({ ...formInscribir, pagado: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                    />
                    <label htmlFor="chkPagadoIndiv" style={{ fontSize: '13.5px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600' }}>
                      Marcar cuota como pagada inmediatamente
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setModalInscribir(false)}>
                Cancelar
              </button>
              {modoInscribir === 'multiple' && !editandoInscrito ? (
                <button
                  style={s.btnPrimaryModal}
                  onClick={guardarInscripcionMasiva}
                  disabled={guardandoInscripcion || seleccionadosModal.length === 0}
                >
                  {guardandoInscripcion ? 'Inscribiendo...' : `Inscribir ${seleccionadosModal.length} Alumnos`}
                </button>
              ) : (
                <button
                  style={s.btnPrimaryModal}
                  onClick={guardarInscripcion}
                  disabled={guardandoInscripcion}
                >
                  {guardandoInscripcion ? 'Guardando...' : (editandoInscrito ? 'Guardar Cambios' : 'Inscribir Alumno')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR EVENTO BASE ── */}
      {modalEvento && (
        <div style={s.overlay}>
          <div style={s.modal} className="mobile-fullscreen-modal">
            <div style={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ ...s.statIconBox, width: '38px', height: '38px', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-blue)' }}>
                  <FiCalendar size={18} />
                </div>
                <div>
                  <h3 style={s.modalTitulo}>Editar Evento</h3>
                  <p style={s.modalSub}>Modifica los datos principales de la convocatoria</p>
                </div>
              </div>
              <button
                className="btn-cerrar-circular"
                style={s.btnCerrarCircular}
                onClick={() => setModalEvento(false)}
              >
                <FiX size={18} />
              </button>
            </div>

            <div style={s.modalContent}>
              <div style={s.campoGroup}>
                <label style={s.label}>Nombre del Evento *</label>
                <input
                  style={s.input}
                  value={formEvento.nombre}
                  onChange={e => setFormEvento({ ...formEvento, nombre: e.target.value })}
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
                    type="date"
                    style={{ ...s.input, colorScheme: 'dark' }}
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
                    value={formEvento.lugar}
                    onChange={e => setFormEvento({ ...formEvento, lugar: e.target.value })}
                  />
                </div>

                <div style={s.campoGroup}>
                  <label style={s.label}>Costo General ($)</label>
                  <input
                    type="number"
                    min="0"
                    style={s.input}
                    value={formEvento.costo}
                    onChange={e => setFormEvento({ ...formEvento, costo: e.target.value })}
                  />
                </div>
              </div>

              <div style={s.campoGroup}>
                <label style={s.label}>Descripción / Observaciones</label>
                <textarea
                  style={{ ...s.input, minHeight: '75px', resize: 'vertical' }}
                  value={formEvento.descripcion}
                  onChange={e => setFormEvento({ ...formEvento, descripcion: e.target.value })}
                />
              </div>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setModalEvento(false)}>
                Cancelar
              </button>
              <button style={s.btnPrimaryModal} onClick={guardarEventoBase}>
                Guardar Cambios
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
    scrollbarGutter: 'stable',
    paddingBottom: '50px'
  },
  btnBack: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '16px',
    padding: '4px 0',
    transition: 'all 0.2s ease'
  },

  // HERO CARD
  heroCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '24px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
    marginBottom: '24px',
    boxShadow: 'var(--shadow-sm)'
  },
  heroInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    minWidth: '280px'
  },
  tipoBadge: {
    padding: '3px 9px',
    borderRadius: '6px',
    fontSize: '10.5px',
    fontWeight: '800',
    letterSpacing: '0.04em'
  },
  heroFecha: {
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
    fontWeight: '600'
  },
  heroLugar: {
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
    fontWeight: '500'
  },
  heroCosto: {
    fontSize: '12.5px',
    color: 'var(--accent-green)',
    fontWeight: '700'
  },
  heroTitulo: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.02em',
    lineHeight: 1.2
  },
  heroDesc: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
    maxWidth: '650px'
  },
  btnEditEventoMini: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  heroActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  btnInscribir: {
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  statValor: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: '3px 0 1px',
    lineHeight: 1.2
  },
  statSublabel: {
    fontSize: '11.5px',
    color: 'var(--text-muted)'
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

  // BULK BAR
  bulkBar: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--accent-blue)',
    borderRadius: '14px',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)',
    flexWrap: 'wrap'
  },
  btnDesmarcar: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '12.5px',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  btnPagarMasivo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'linear-gradient(135deg, var(--accent-blue), #2563eb)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
    transition: 'all 0.2s ease'
  },

  // TABLA ESCRITORIO
  tableContainer: {
    background: 'var(--bg-secondary)',
    borderRadius: '16px',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-md)',
    width: '100%',
    boxSizing: 'border-box'
  },
  tablaScroll: {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    boxSizing: 'border-box'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '100%'
  },
  th: {
    padding: '12px 14px',
    textAlign: 'center',
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
    fontWeight: '700'
  },
  tr: {
    borderBottom: '1px solid var(--border)'
  },
  td: {
    padding: '12px 14px',
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
    verticalAlign: 'middle'
  },
  avatarSmall: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'var(--accent-blue-bg)',
    color: 'var(--accent-blue)',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    flexShrink: 0,
    border: '2px solid var(--border)'
  },
  badgeCinta: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    border: '1px solid rgba(0,0,0,0.1)'
  },
  btnBadgeStatus: {
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: '0.02em',
    fontFamily: 'Inter, sans-serif'
  },
  selectMedalla: {
    padding: '4px 10px',
    borderRadius: '16px',
    border: '1px solid',
    fontSize: '11.5px',
    fontWeight: '700',
    outline: 'none',
    cursor: 'pointer'
  },

  // ICON BUTTONS
  btnIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  btnEdit: {
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6'
  },
  btnDel: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444'
  },

  // TARJETAS MÓVILES
  mobileCardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%'
  },
  mobileCard: {
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '14px 16px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.15s ease'
  },

  // MODALES
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
  modoSelector: {
    display: 'flex',
    padding: '6px',
    margin: '12px 24px 0',
    background: 'var(--bg-tertiary)',
    borderRadius: '12px',
    gap: '6px'
  },
  modoBtn: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  modoBtnActive: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    background: 'var(--bg-secondary)',
    color: 'var(--accent-blue)',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)'
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
  listaAlumnosModal: {
    maxHeight: '260px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '4px'
  },
  itemAlumnoModal: {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    transition: 'all 0.15s ease'
  },
  avatarTiny: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontSize: '11px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  btnMiniTogglePago: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    border: '1px solid',
    cursor: 'pointer'
  },
  btnTextoSecundario: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    fontWeight: '600',
    padding: '2px 0'
  },
  dropdownSugerencias: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    marginTop: '4px',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 10,
    overflow: 'hidden'
  },
  itemSugerencia: {
    padding: '10px 14px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border)',
    fontSize: '13px'
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
  }
}
