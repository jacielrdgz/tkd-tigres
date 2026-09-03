import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Swal from 'sweetalert2'
import { toast } from 'react-toastify'
import {
  FiArrowLeft,
  FiAward,
  FiCalendar,
  FiMapPin,
  FiDollarSign,
  FiUserPlus,
  FiSearch,
  FiCheck,
  FiX,
  FiDownload,
  FiTrash2,
  FiEdit2,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiShield,
  FiChevronDown,
  FiUsers,
  FiUser,
  FiArrowRight
} from 'react-icons/fi'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '../context/AuthContext'
import { obtenerInfoEscuelaParaPDF, dibujarEncabezadoMembrete, agregarPieDePagina, formatearFechaNaturalPDF, guardarODescargarPDF, guardarODescargarExcel } from '../utils/pdfHelper'
import CustomDropdown from '../components/Common/CustomDropdown'
import BotonExportar from '../components/Common/BotonExportar'
import * as XLSX from 'xlsx'

const formatCosto = (val) => {
  if (val === null || val === undefined || val === '') return '0'
  const num = parseFloat(val)
  return isNaN(num) ? '0' : Math.round(num).toString()
}

const obtenerIniciales = (nombre, apellido) => {
  if (!nombre) return '?'
  const n = nombre.trim().charAt(0)
  const a = apellido ? apellido.trim().charAt(0) : ''
  return (n + a).toUpperCase()
}

const formatearFechaNatural = (fechaStr) => {
  if (!fechaStr) return '-'
  const parts = String(fechaStr).split('-')
  if (parts.length !== 3) return fechaStr
  const year = parts[0]
  const monthIdx = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]
  if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11 || isNaN(day)) return fechaStr
  return `${day} de ${meses[monthIdx]} de ${year}`
}

export default function ExamenDetalle() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()

  const [examen, setExamen] = useState(null)
  const [inscritos, setInscritos] = useState([])
  const [alumnosDojo, setAlumnosDojo] = useState([])
  const [cintasConfig, setCintasConfig] = useState([])
  const [cargando, setCargando] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroResultado, setFiltroResultado] = useState('todos') // todos, pendiente, aprobado, reprobado
  const [filtroCinta, setFiltroCinta] = useState('todos')

  // Modal Inscribir
  const [modalInscribir, setModalInscribir] = useState(false)
  const [editandoInscrito, setEditandoInscrito] = useState(null)
  const [busquedaAlumno, setBusquedaAlumno] = useState('')
  const [formInscribir, setFormInscribir] = useState({
    alumno_id: '',
    nombre_alumno: '',
    grado_actual_id: '',
    grado_siguiente_id: '',
    costo_examen: '',
    pagado: false,
    fecha_pago: '',
  })
  const [guardandoInscripcion, setGuardandoInscripcion] = useState(false)
  const [modoInscribir, setModoInscribir] = useState('multiple') // 'multiple' | 'individual'
  const [seleccionadosModal, setSeleccionadosModal] = useState([])
  const [costosModal, setCostosModal] = useState({})
  const [pagadosModal, setPagadosModal] = useState({})
  const [filtroCintaModal, setFiltroCintaModal] = useState('todos')

  // Selección Múltiple y Acciones Masivas
  const [seleccionados, setSeleccionados] = useState([])
  const [procesandoMasivo, setProcesandoMasivo] = useState(false)

  // Hover de fila en tabla
  const [rowHover, setRowHover] = useState(null)

  // Dropdown Exportar
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    cargarTodo()
  }, [id])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setModalInscribir(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const cargarTodo = async () => {
    setCargando(true)
    try {
      const [resEx, resIns, resAlu, resCin] = await Promise.all([
        api.get(`/eventos/${id}`),
        api.get(`/eventos/${id}/inscritos`),
        api.get('/alumnos'),
        api.get('/configuraciones-cintas')
      ])
      setExamen(resEx.data)
      setInscritos(Array.isArray(resIns.data) ? resIns.data : [])

      const listAlu = Array.isArray(resAlu.data) 
        ? resAlu.data 
        : (Array.isArray(resAlu.data?.data) ? resAlu.data.data : [])
      setAlumnosDojo(listAlu)
      setCintasConfig(Array.isArray(resCin.data) ? resCin.data : (resCin.data?.data || []))
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la información del examen')
    } finally {
      setCargando(false)
    }
  }

  const obtenerGradosAlumno = useCallback((alumno) => {
    if (!alumno) return { actual: null, siguiente: null }
    const cintasOrdenadas = [...cintasConfig].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    let actual = cintasOrdenadas.find(c => String(c.id) === String(alumno.configuracion_cinta_id || alumno.cinta_config?.id || alumno.cintaConfig?.id))
    if (!actual && cintasOrdenadas.length > 0) {
      actual = cintasOrdenadas[0]
    }
    const idx = actual ? cintasOrdenadas.findIndex(c => String(c.id) === String(actual.id)) : -1
    let siguiente = (idx >= 0 && idx < cintasOrdenadas.length - 1) ? cintasOrdenadas[idx + 1] : actual
    return { actual, siguiente }
  }, [cintasConfig])

  const obtenerCostoSugerido = useCallback((alumno) => {
    const { actual } = obtenerGradosAlumno(alumno)
    if (actual && examen?.precios_cintas) {
      const p = examen.precios_cintas[String(actual.id)]
      if (p !== undefined && p !== null && p !== '') {
        const num = parseFloat(p)
        return isNaN(num) ? String(p) : Math.round(num).toString()
      }
    }
    if (examen?.costo !== null && examen?.costo !== undefined && examen?.costo !== '') {
      const num = parseFloat(examen.costo)
      return isNaN(num) ? String(examen.costo) : Math.round(num).toString()
    }
    return ''
  }, [obtenerGradosAlumno, examen])

  const abrirModalInscribir = async () => {
    setEditandoInscrito(null)
    setModoInscribir('multiple')
    setSeleccionadosModal([])
    setCostosModal({})
    setPagadosModal({})
    setFiltroCintaModal('todos')
    setFormInscribir({
      alumno_id: '',
      nombre_alumno: '',
      grado_actual_id: '',
      grado_siguiente_id: '',
      costo_examen: (examen?.costo !== null && examen?.costo !== undefined && examen?.costo !== '') ? Math.round(parseFloat(examen.costo)).toString() : '',
      pagado: false,
      fecha_pago: '',
    })
    setBusquedaAlumno('')
    setModalInscribir(true)
    try {
      const [resAlu, resCin] = await Promise.all([
        api.get('/alumnos'),
        api.get('/configuraciones-cintas')
      ])
      const listAlu = Array.isArray(resAlu.data) 
        ? resAlu.data 
        : (Array.isArray(resAlu.data?.data) ? resAlu.data.data : [])
      setAlumnosDojo(listAlu)
      const listCin = Array.isArray(resCin.data) ? resCin.data : (resCin.data?.data || [])
      if (listCin.length > 0) setCintasConfig(listCin)
    } catch (e) {
      console.error('Error cargando alumnos y cintas para el modal:', e)
    }
  }

  const abrirEditarInscrito = async (alumno) => {
    const exDet = alumno.examen_detalle || {}
    const gradoAct = exDet.grado_actual || alumno.cinta_config
    const gradoSig = exDet.grado_siguiente

    setEditandoInscrito(alumno.id)
    setModoInscribir('individual')
    setFormInscribir({
      alumno_id: String(alumno.id),
      nombre_alumno: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.trim(),
      grado_actual_id: gradoAct ? String(gradoAct.id) : '',
      grado_siguiente_id: gradoSig ? String(gradoSig.id) : '',
      costo_examen: exDet.costo_examen || alumno.pago_inscripcion || examen?.costo || '',
      pagado: !!alumno.pagado,
      fecha_pago: alumno.fecha_pago || ''
    })
    setBusquedaAlumno('')
    setModalInscribir(true)

    if (cintasConfig.length === 0) {
      try {
        const resCin = await api.get('/configuraciones-cintas')
        const listCin = Array.isArray(resCin.data) ? resCin.data : (resCin.data?.data || [])
        if (listCin.length > 0) setCintasConfig(listCin)
      } catch (e) {
        console.error(e)
      }
    }
  }

  const toggleSeleccionarTodoModal = (alumnosDisponibles) => {
    if (seleccionadosModal.length === alumnosDisponibles.length) {
      setSeleccionadosModal([])
    } else {
      setSeleccionadosModal(alumnosDisponibles.map(a => a.id))
    }
  }

  const toggleSeleccionarAlumnoModal = (alumnoId) => {
    setSeleccionadosModal(prev =>
      prev.includes(alumnoId) ? prev.filter(i => i !== alumnoId) : [...prev, alumnoId]
    )
  }

  const guardarInscripcionMasiva = async () => {
    if (seleccionadosModal.length === 0) {
      return toast.warning('Selecciona al menos un alumno para inscribir')
    }

    setGuardandoInscripcion(true)
    try {
      const payloadAlumnos = seleccionadosModal.map(alumnoId => {
        const alumno = alumnosDojo.find(a => String(a.id) === String(alumnoId))
        const { actual, siguiente } = obtenerGradosAlumno(alumno)
        const costo = costosModal[String(alumnoId)] !== undefined && costosModal[String(alumnoId)] !== ''
          ? costosModal[String(alumnoId)]
          : obtenerCostoSugerido(alumno)

        return {
          alumno_id: alumnoId,
          grado_actual_id: actual?.id || null,
          grado_siguiente_id: siguiente?.id || null,
          costo_examen: costo !== '' ? parseFloat(costo) : 0,
          pagado: !!pagadosModal[String(alumnoId)]
        }
      })

      const res = await api.post(`/eventos/${id}/inscribir-masivo`, {
        alumnos: payloadAlumnos
      })

      toast.success(`¡${res.data.count || payloadAlumnos.length} alumnos inscritos correctamente! 🎉`)
      setModalInscribir(false)
      setSeleccionadosModal([])
      setCostosModal({})
      setPagadosModal({})

      // Actualizar únicamente la lista de inscritos (sin parpadeo)
      const resIns = await api.get(`/eventos/${id}/inscritos`)
      setInscritos(Array.isArray(resIns.data) ? resIns.data : [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al inscribir alumnos en lote')
    } finally {
      setGuardandoInscripcion(false)
    }
  }

  const seleccionarAlumno = async (alumno) => {
    const nombreCompleto = `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.trim()
    
    // 1. Cálculo instantáneo local del grado actual y siguiente
    const cintasOrdenadas = [...cintasConfig].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    let actual = cintasOrdenadas.find(c => String(c.id) === String(alumno.configuracion_cinta_id || alumno.cinta_config?.id || alumno.cintaConfig?.id))
    if (!actual && cintasOrdenadas.length > 0) {
      actual = cintasOrdenadas[0]
    }
    const idx = actual ? cintasOrdenadas.findIndex(c => String(c.id) === String(actual.id)) : -1
    let siguiente = (idx >= 0 && idx < cintasOrdenadas.length - 1) ? cintasOrdenadas[idx + 1] : actual

    setFormInscribir(prev => {
      // Auto-determinar costo según cinta del alumno
      let costoAutoFill = prev.costo_examen || ((examen?.costo !== null && examen?.costo !== undefined && examen?.costo !== '') ? Math.round(parseFloat(examen.costo)).toString() : '')
      if (actual && examen?.precios_cintas) {
        const precioCinta = examen.precios_cintas[String(actual.id)]
        if (precioCinta !== undefined && precioCinta !== null && precioCinta !== '') {
          const num = parseFloat(precioCinta)
          costoAutoFill = isNaN(num) ? String(precioCinta) : Math.round(num).toString()
        }
      }
      return {
        ...prev,
        alumno_id: String(alumno.id),
        nombre_alumno: nombreCompleto,
        grado_actual_id: actual ? String(actual.id) : '',
        grado_siguiente_id: siguiente ? String(siguiente.id) : '',
        costo_examen: costoAutoFill
      }
    })
    setBusquedaAlumno('')

    // 2. Confirmación asíncrona vía API
    try {
      const res = await api.get(`/alumnos/${alumno.id}/predecir-grado`)
      const { grado_actual, grado_siguiente } = res.data
      if (grado_actual || grado_siguiente) {
        setFormInscribir(prev => ({
          ...prev,
          grado_actual_id: grado_actual ? String(grado_actual.id) : prev.grado_actual_id,
          grado_siguiente_id: grado_siguiente ? String(grado_siguiente.id) : prev.grado_siguiente_id,
        }))
      }
    } catch (e) {
      console.error('Error al predecir grado desde API:', e)
    }
  }

  const guardarInscripcion = async () => {
    if (!formInscribir.alumno_id) return toast.warning('Selecciona un alumno')
    if (!formInscribir.grado_actual_id || !formInscribir.grado_siguiente_id) {
      return toast.warning('Selecciona el grado actual y el grado siguiente')
    }
    setGuardandoInscripcion(true)
    try {
      if (editandoInscrito) {
        await api.put(`/eventos/${id}/alumnos/${editandoInscrito}`, formInscribir)
        toast.success('Inscripción actualizada correctamente')
      } else {
        await api.post(`/eventos/${id}/inscribir`, formInscribir)
        toast.success('Alumno inscrito correctamente')
      }
      setModalInscribir(false)
      setEditandoInscrito(null)
      setFormInscribir({ alumno_id: '', nombre_alumno: '', grado_actual_id: '', grado_siguiente_id: '', costo_examen: '', pagado: false, fecha_pago: '' })
      // Solo recargar la lista de inscritos, no toda la página
      const resIns = await api.get(`/eventos/${id}/inscritos`)
      setInscritos(Array.isArray(resIns.data) ? resIns.data : [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar inscripción')
    } finally {
      setGuardandoInscripcion(false)
    }
  }

  const actualizarAtributo = async (alumnoId, cambios) => {
    // Guardar estado previo para poder revertir en caso de error
    const prevInscritos = [...inscritos]
    
    // Actualización optimista inmediata
    setInscritos(prev => prev.map(a => {
      if (a.id !== alumnoId) return a
      const updated = { ...a }
      if (cambios.pagado !== undefined) updated.pagado = cambios.pagado
      if (cambios.resultado_examen) {
        updated.examen_detalle = { ...updated.examen_detalle, resultado: cambios.resultado_examen }
      }
      return updated
    }))
    
    try {
      await api.put(`/eventos/${id}/alumnos/${alumnoId}`, cambios)
      if (cambios.resultado_examen === 'aprobado') {
        toast.success('¡Alumno APROBADO! Su cinta ha sido promovida automáticamente en su perfil.')
      } else if (cambios.resultado_examen) {
        toast.info('Resultado actualizado')
      } else {
        toast.success('Registro actualizado')
      }
    } catch (err) {
      // Revertir en caso de error
      setInscritos(prevInscritos)
      toast.error('No se pudo actualizar el registro')
    }
  }

  const eliminarInscripcion = async (alumnoId, nombreAlumno) => {
    Swal.fire({
      title: '¿Quitar alumno del examen?',
      text: `Se eliminará a ${nombreAlumno} de esta lista de examen.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)'
    }).then(async r => {
      if (r.isConfirmed) {
        const prevInscritos = [...inscritos]
        setInscritos(prev => prev.filter(a => a.id !== alumnoId))
        setSeleccionados(prev => prev.filter(i => i !== alumnoId))
        try {
          await api.delete(`/eventos/${id}/alumnos/${alumnoId}`)
          toast.success('Inscripción eliminada')
        } catch {
          setInscritos(prevInscritos)
          toast.error('Error al eliminar inscripción')
        }
      }
    })
  }

  // --- SELECCIÓN MÚLTIPLE Y ACCIONES MASIVAS ---
  const toggleSeleccionarTodo = () => {
    if (seleccionados.length === inscritosFiltrados.length) {
      setSeleccionados([])
    } else {
      setSeleccionados(inscritosFiltrados.map(a => a.id))
    }
  }

  const toggleSeleccionarAlumno = (alumnoId) => {
    setSeleccionados(prev =>
      prev.includes(alumnoId) ? prev.filter(i => i !== alumnoId) : [...prev, alumnoId]
    )
  }

  const aprobarMasivo = async (idsAprobar = null) => {
    const listaTarget = idsAprobar || (seleccionados.length > 0 ? seleccionados : inscritosFiltrados.map(a => a.id))
    if (listaTarget.length === 0) return toast.warning('No hay alumnos seleccionados para aprobar')

    const result = await Swal.fire({
      title: '¿Aprobar alumnos?',
      html: `Se marcarán como <strong>APROBADOS</strong> a <strong>${listaTarget.length}</strong> alumnos.<br/><small style="color:#64748b;">Sus cintas serán promovidas automáticamente en su perfil.</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, aprobar ${listaTarget.length}`,
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Cancelar',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)'
    })

    if (!result.isConfirmed) return

    const prevInscritos = [...inscritos]
    const targetSet = new Set(listaTarget)
    
    // Actualización optimista inmediata
    setInscritos(prev => prev.map(a => {
      if (!targetSet.has(a.id)) return a
      return { ...a, examen_detalle: { ...a.examen_detalle, resultado: 'aprobado' } }
    }))
    setSeleccionados([])

    setProcesandoMasivo(true)
    try {
      await Promise.all(
        listaTarget.map(alumnoId =>
          api.put(`/eventos/${id}/alumnos/${alumnoId}`, { resultado_examen: 'aprobado' })
        )
      )
      toast.success(`¡${listaTarget.length} alumnos aprobados y promovidos exitosamente! 🎉`)
    } catch (err) {
      setInscritos(prevInscritos)
      toast.error('Error al procesar la aprobación masiva')
    } finally {
      setProcesandoMasivo(false)
    }
  }

  const pagarMasivo = async (idsPagar = null) => {
    const listaTarget = idsPagar || (seleccionados.length > 0 ? seleccionados : inscritosFiltrados.map(a => a.id))
    if (listaTarget.length === 0) return toast.warning('No hay alumnos seleccionados para registrar pago')

    const result = await Swal.fire({
      title: '¿Marcar cuota como pagada?',
      html: `Se registrará como <strong>PAGADO</strong> el examen de <strong>${listaTarget.length}</strong> alumnos.`,
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
    
    // Actualización optimista inmediata
    setInscritos(prev => prev.map(a => {
      if (!targetSet.has(a.id)) return a
      return { ...a, pagado: true }
    }))
    setSeleccionados([])

    setProcesandoMasivo(true)
    try {
      await Promise.all(
        listaTarget.map(alumnoId =>
          api.put(`/eventos/${id}/alumnos/${alumnoId}`, { pagado: true })
        )
      )
      toast.success(`¡${listaTarget.length} pagos registrados correctamente! 💰`)
    } catch (err) {
      setInscritos(prevInscritos)
      toast.error('Error al registrar los pagos masivos')
    } finally {
      setProcesandoMasivo(false)
    }
  }

  // --- FILTRADO Y ORDENAMIENTO DE INSCRITOS ---
  const getOrdenCinta = (alumno) => {
    if (alumno.examen_detalle?.grado_actual?.orden !== undefined && alumno.examen_detalle?.grado_actual?.orden !== null) {
      return parseInt(alumno.examen_detalle.grado_actual.orden, 10)
    }
    if (alumno.cinta_config?.orden !== undefined && alumno.cinta_config?.orden !== null) {
      return parseInt(alumno.cinta_config.orden, 10)
    }
    if (alumno.examen_detalle?.grado_actual_id !== undefined && alumno.examen_detalle?.grado_actual_id !== null) {
      return parseInt(alumno.examen_detalle.grado_actual_id, 10)
    }
    return 999
  }

  const getEdad = (alumno) => {
    if (alumno.edad !== undefined && alumno.edad !== null) return parseInt(alumno.edad, 10)
    if (alumno.fecha_nacimiento) {
      const fn = new Date(alumno.fecha_nacimiento)
      const hoy = new Date()
      let e = hoy.getFullYear() - fn.getFullYear()
      const m = hoy.getMonth() - fn.getMonth()
      if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) e--
      return e
    }
    return 999
  }

  const inscritosFiltrados = useMemo(() => {
    return inscritos
      .filter(a => {
        const nombreCompleto = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.toLowerCase()
        if (busqueda && !nombreCompleto.includes(busqueda.toLowerCase())) return false

        const resultado = a.examen_detalle?.resultado || 'pendiente'
        if (filtroResultado !== 'todos' && resultado !== filtroResultado) return false

        const gradoActualId = a.examen_detalle?.grado_actual_id
        if (filtroCinta !== 'todos' && String(gradoActualId) !== String(filtroCinta)) return false

        return true
      })
      .sort((a, b) => {
        const ordenA = getOrdenCinta(a)
        const ordenB = getOrdenCinta(b)
        if (ordenA !== ordenB) {
          return ordenA - ordenB // menor a mayor cinta
        }
        const edadA = getEdad(a)
        const edadB = getEdad(b)
        return edadA - edadB // menor a mayor edad si la cinta es la misma
      })
  }, [inscritos, busqueda, filtroResultado, filtroCinta])

  // --- ESTADÍSTICAS DEL EXAMEN ---
  const stats = useMemo(() => {
    const total = inscritos.length
    const aprobados = inscritos.filter(a => a.examen_detalle?.resultado === 'aprobado').length
    const reprobados = inscritos.filter(a => a.examen_detalle?.resultado === 'reprobado').length
    const pendientes = inscritos.filter(a => !a.examen_detalle?.resultado || a.examen_detalle?.resultado === 'pendiente').length
    const recaudado = inscritos.filter(a => a.pagado).reduce((acc, a) => acc + (parseFloat(a.pago_inscripcion) || 0), 0)

    return { total, aprobados, reprobados, pendientes, recaudado }
  }, [inscritos])

  // --- EXPORTAR EXCEL ---
  const exportarExcel = async () => {
    if (inscritosFiltrados.length === 0) {
      return toast.warning('No hay alumnos para exportar')
    }
    const data = inscritosFiltrados.map((a, i) => ({
      '#': i + 1,
      'Alumno': `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.trim(),
      'Grado Actual': a.examen_detalle?.grado_actual?.nombre_nivel || a.cinta_config?.nombre_nivel || '-',
      'Grado Siguiente': a.examen_detalle?.grado_siguiente?.nombre_nivel || '-',
      'Costo Examen': (a.examen_detalle?.costo_examen || a.pago_inscripcion) ? `$${formatCosto(a.examen_detalle?.costo_examen || a.pago_inscripcion)}` : '-',
      'Estado de Pago': a.pagado ? 'PAGADO' : 'PENDIENTE',
      'Resultado': (a.examen_detalle?.resultado || 'pendiente').toUpperCase()
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Acta Examen')
    const filename = `Acta_Examen_${(examen?.nombre || 'Grados').replace(/\s+/g, '_')}.xlsx`
    await guardarODescargarExcel(wb, filename)
    toast.success('Archivo Excel generado 📊')
  }

  // --- EXPORTAR PDF (Hoja Membretada) ---
  const exportarPDF = async () => {
    if (inscritosFiltrados.length === 0) {
      return toast.warning('No hay alumnos para exportar')
    }

    const escuelaInfo = await obtenerInfoEscuelaParaPDF()
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' })

    const startY = dibujarEncabezadoMembrete(doc, {
      escuelaInfo,
      tipoReporte: 'ACTA DE EXAMEN',
      subtituloEtiqueta: 'Examen / Fecha:',
      subtituloValor: `${(examen?.nombre || 'Examen')} • ${formatearFechaNaturalPDF(examen?.fecha)}`
    })

    // TABLA
    const tableColumn = ['#', 'Nombre Alumno', 'Grado Actual', 'Aspirado', 'Costo', 'Estado', 'Resultado']
    const tableRows = inscritosFiltrados.map((a, i) => [
      i + 1,
      `${a.nombre} ${a.apellido_paterno}`,
      a.examen_detalle?.grado_actual?.nombre_nivel || a.cinta_config?.nombre_nivel || '-',
      a.examen_detalle?.grado_siguiente?.nombre_nivel || '-',
      `$${formatCosto(a.pago_inscripcion)}`,
      a.pagado ? 'PAGADO' : 'PENDIENTE',
      (a.examen_detalle?.resultado || 'pendiente').toUpperCase()
    ])

    autoTable(doc, {
      startY: startY,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8.5, cellPadding: 2, halign: 'center' },
      styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 46, halign: 'left' },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 24, halign: 'center' },
        6: { cellWidth: 26, halign: 'center' }
      },
      margin: { left: 14, right: 14, bottom: 24 },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'PAGADO') {
            data.cell.styles.textColor = [16, 185, 129]
            data.cell.styles.fontStyle = 'bold'
          } else {
            data.cell.styles.textColor = [239, 68, 68]
            data.cell.styles.fontStyle = 'bold'
          }
        }
        if (data.section === 'body' && data.column.index === 6) {
          if (data.cell.raw === 'APROBADO') {
            data.cell.styles.textColor = [16, 185, 129]
            data.cell.styles.fontStyle = 'bold'
          } else if (data.cell.raw === 'REPROBADO') {
            data.cell.styles.textColor = [239, 68, 68]
            data.cell.styles.fontStyle = 'bold'
          }
        }
      }
    })

    // TOTAL DE INGRESOS (AL FINAL DE LA TABLA)
    const totalIngresos = inscritosFiltrados.reduce((acc, curr) => {
      const monto = parseFloat(curr.pago_inscripcion || curr.examen_detalle?.costo_examen || 0)
      return acc + (curr.pagado ? (isNaN(monto) ? 0 : monto) : 0)
    }, 0)

    const summaryY = doc.lastAutoTable.finalY + 6
    if (summaryY < 250) {
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(37, 99, 235)
      doc.roundedRect(125, summaryY, 75, 13, 2, 2, 'FD')

      doc.setFontSize(9)
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'bold')
      doc.text('Total Recaudado:', 130, summaryY + 8.5)
      doc.setTextColor(16, 185, 129)
      doc.setFontSize(11)
      doc.text(`$${Math.round(totalIngresos)}`, 195, summaryY + 8.5, { align: 'right' })
    }

    // FOOTER
    agregarPieDePagina(doc, user)

    const filename = `Acta_Examen_${(examen?.nombre || 'Grados').replace(/\s+/g, '_')}.pdf`
    await guardarODescargarPDF(doc, filename)
    toast.success('Documento PDF generado 📄')
  }

  // Alumnos no inscritos aún para el modal (soporta búsqueda y filtro por cinta)
  const alumnosFiltradosModal = useMemo(() => {
    const inscritosIds = new Set(inscritos.map(i => String(i.id || i.alumno_id)))
    let disponibles = alumnosDojo.filter(a => !inscritosIds.has(String(a.id)))

    if (filtroCintaModal !== 'todos') {
      disponibles = disponibles.filter(a => {
        const cintaId = a.configuracion_cinta_id || a.cinta_config?.id || a.cintaConfig?.id
        return String(cintaId) === String(filtroCintaModal)
      })
    }

    if (!busquedaAlumno.trim()) return disponibles
    const q = busquedaAlumno.toLowerCase().trim()
    return disponibles.filter(a => {
      const nom = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.toLowerCase()
      return nom.includes(q)
    })
  }, [busquedaAlumno, alumnosDojo, inscritos, filtroCintaModal])

  if (cargando) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Cargando información del examen...</p>
      </div>
    )
  }

  return (
    <div style={s.page}>
      {/* Botón Volver */}
      <button style={s.btnVolver} onClick={() => navigate('/examenes')}>
        <FiArrowLeft size={16} />
        <span>Volver a Exámenes</span>
      </button>

      {/* Card Header del Examen */}
      <div style={s.headerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={s.badgeTipo}>
                <FiAward size={12} style={{ marginRight: '4px' }} />
                EXAMEN DE CINTA
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>• {formatearFechaNatural(examen?.fecha)}</span>
            </div>
            <h1 style={s.titulo}>{examen?.nombre}</h1>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
              {examen?.lugar && (
                <span style={s.infoSub}>
                  <FiMapPin size={14} style={{ marginRight: '4px' }} />
                  {examen.lugar}
                </span>
              )}
              <span style={s.infoSub}>
                💰 Costo Base: ${formatCosto(examen?.costo)}
              </span>
            </div>
          </div>

          <button
            style={s.btnInscribir}
            onClick={abrirModalInscribir}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.5)'
              e.currentTarget.style.filter = 'brightness(1.1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'var(--shadow-glow-blue)'
              e.currentTarget.style.filter = 'none'
            }}
          >
            <FiUserPlus size={16} />
            <span>Inscribir Alumno</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div style={s.gridStats}>
        <div style={s.statCard}>
          <span style={s.statTitle}>Inscritos Totales</span>
          <span style={s.statNumber}>{stats.total}</span>
          <span style={s.statSub}>Alumnos convocados</span>
        </div>
        <div style={{ ...s.statCard, borderLeft: '4px solid #10b981' }}>
          <span style={s.statTitle}>Aprobados</span>
          <span style={{ ...s.statNumber, color: '#10b981' }}>{stats.aprobados}</span>
          <span style={s.statSub}>Promovidos a nueva cinta</span>
        </div>
        <div style={{ ...s.statCard, borderLeft: '4px solid #f59e0b' }}>
          <span style={s.statTitle}>Pendientes</span>
          <span style={{ ...s.statNumber, color: '#f59e0b' }}>{stats.pendientes}</span>
          <span style={s.statSub}>Por evaluar</span>
        </div>
        <div style={{ ...s.statCard, borderLeft: '4px solid #3b82f6' }}>
          <span style={s.statTitle}>Total Recaudado</span>
          <span style={{ ...s.statNumber, color: 'var(--accent-blue)' }}>${Math.round(stats.recaudado)}</span>
          <span style={s.statSub}>Cuotas de examen pagadas</span>
        </div>
      </div>

      {/* Controles de Filtrado y Exportación */}
      <div style={s.barraAcciones}>
        <div style={s.searchWrapper}>
          <FiSearch style={s.searchIcon} size={16} />
          <input
            style={s.search}
            placeholder="Buscar por nombre de alumno..."
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
            label="Todos los resultados"
            options={[
              { value: 'todos', label: 'Todos los resultados' },
              { value: 'aprobado', label: 'Aprobados' },
              { value: 'pendiente', label: 'Pendientes' },
              { value: 'reprobado', label: 'No Aprobados' }
            ]}
            value={filtroResultado}
            onChange={val => setFiltroResultado(val)}
            minWidth="175px"
          />

          <CustomDropdown
            label="Todas las cintas"
            options={[
              { value: 'todos', label: 'Todas las cintas' },
              ...cintasConfig.map(c => ({ value: String(c.id), label: c.nombre_nivel }))
            ]}
            value={filtroCinta}
            onChange={val => setFiltroCinta(val)}
            minWidth="160px"
          />

          {/* Botón Aprobar Todos (cuando no hay selección individual) */}
          <button
            style={s.btnAprobarTodos}
            onClick={() => aprobarMasivo(inscritosFiltrados.map(a => a.id))}
            disabled={procesandoMasivo || inscritosFiltrados.length === 0}
            title="Aprobar masivamente a todos los alumnos mostrados"
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <FiCheckCircle size={14} />
            <span>Aprobar Todos</span>
          </button>

          <BotonExportar onExportarExcel={exportarExcel} onExportarPDF={exportarPDF} />
        </div>
      </div>

      {/* Barra de Acciones Masivas cuando hay selección */}
      {seleccionados.length > 0 && (
        <div style={s.bulkBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: '700', color: 'var(--accent-blue)', fontSize: '13.5px' }}>
              ☑ {seleccionados.length} alumno{seleccionados.length > 1 ? 's' : ''} seleccionado{seleccionados.length > 1 ? 's' : ''}
            </span>
            <button style={s.btnDesmarcar} onClick={() => setSeleccionados([])}>
              Desmarcar selección
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              style={s.btnAprobarMasivo}
              onClick={() => aprobarMasivo(seleccionados)}
              disabled={procesandoMasivo}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 185, 129, 0.4)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.35)'
              }}
            >
              <FiCheckCircle size={15} />
              <span>Aprobar Seleccionados ({seleccionados.length})</span>
            </button>

            <button
              style={s.btnPagarMasivo}
              onClick={() => pagarMasivo(seleccionados)}
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

      {/* Tabla de Inscritos */}
      <div style={s.tableContainer}>
        <div style={s.tablaScroll}>
          <table style={s.table}>
            <colgroup>
              <col style={{ width: '38px' }} />  {/* Checkbox */}
              <col style={{ width: '45px' }} />  {/* # */}
              <col style={{ width: '220px' }} /> {/* Alumno */}
              <col style={{ width: '135px' }} /> {/* Grado Actual */}
              <col style={{ width: '145px' }} /> {/* Grado a Aspirar */}
              <col style={{ width: '75px' }} />  {/* Costo */}
              <col style={{ width: '125px' }} /> {/* Estado de Pago */}
              <col style={{ width: '100px' }} /> {/* Resultado */}
              <col style={{ width: '105px' }} /> {/* Acciones */}
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
                <th style={{ ...s.th, textAlign: 'center' }}>#</th>
                <th style={{ ...s.th, textAlign: 'left' }}>Alumno</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Grado Actual</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Grado a Aspirar</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Costo</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Estado de Pago</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Resultado</th>
                <th style={{ ...s.th, textAlign: 'center', paddingRight: '20px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inscritosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ ...s.td, padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No hay alumnos inscritos en este examen que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                inscritosFiltrados.map((a, i) => {
                  const res = a.examen_detalle?.resultado || 'pendiente'
                  const gradoAct = a.examen_detalle?.grado_actual
                  const gradoSig = a.examen_detalle?.grado_siguiente

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
                      <td style={{ ...s.td, textAlign: 'center', paddingLeft: '12px' }}>
                        <input
                          type="checkbox"
                          checked={seleccionados.includes(a.id)}
                          onChange={() => toggleSeleccionarAlumno(a.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-blue)' }}
                        />
                      </td>
                      <td style={{ ...s.td, textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        {i + 1}
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
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer'
                              }}
                              onClick={() => navigate(`/alumnos/${a.id}`)}
                              title="Clic para ver perfil"
                            >
                              {a.nombre} {a.apellido_paterno}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                              #{i + 1}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Grado Actual */}
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <span
                          style={{
                            ...s.badgeCinta,
                            background: gradoAct?.color_hex || 'var(--bg-tertiary)',
                            color: gradoAct?.color_texto || 'var(--text-primary)',
                          }}
                        >
                          {gradoAct?.nombre_nivel || 'Sin grado'}
                        </span>
                      </td>

                      {/* Grado a Aspirar */}
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <span
                          style={{
                            ...s.badgeCinta,
                            background: gradoSig?.color_hex || 'var(--accent-blue-bg)',
                            color: gradoSig?.color_texto || 'var(--accent-blue)',
                          }}
                        >
                          {gradoSig?.nombre_nivel || 'Siguiente'}
                        </span>
                      </td>

                      {/* Costo Examen */}
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>
                          ${formatCosto(a.pago_inscripcion)}
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
                          onClick={() => actualizarAtributo(a.id, { pagado: !a.pagado })}
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
                          {a.pagado ? '✓ PAGADO' : '✗ PENDIENTE'}
                        </button>
                      </td>

                      {/* Resultado Dropdown */}
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <select
                          style={{
                            ...s.selectResultado,
                            borderColor: res === 'aprobado' ? '#10b981' : (res === 'reprobado' ? '#ef4444' : 'var(--border)'),
                            color: res === 'aprobado' ? '#10b981' : (res === 'reprobado' ? '#ef4444' : 'var(--text-primary)'),
                            background: res === 'aprobado' ? 'rgba(16, 185, 129, 0.12)' : (res === 'reprobado' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary)')
                          }}
                          value={res}
                          onChange={e => actualizarAtributo(a.id, { resultado_examen: e.target.value })}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)'
                            e.currentTarget.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.25)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="aprobado">Aprobado</option>
                          <option value="reprobado">No Aprobado</option>
                        </select>
                      </td>

                      {/* Acciones */}
                      <td style={{ ...s.td, textAlign: 'center', paddingRight: '20px' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          <button //EDITAR
                            style={{ ...s.btnIcon, ...s.btnEdit }}
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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>

                          <button //BORRAR
                            style={{ ...s.btnIcon, ...s.btnDel }}
                            onClick={() => eliminarInscripcion(a.id, `${a.nombre} ${a.apellido_paterno}`)}
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
                            title="Borrar"
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

      {/* MODAL INSCRIBIR / EDITAR ALUMNO */}
      {modalInscribir && (
        <div style={s.overlay} onClick={() => setModalInscribir(false)}>
          <div
            style={{
              ...s.modal,
              width: (modoInscribir === 'multiple' && !editandoInscrito) ? '590px' : '490px',
              maxWidth: '94vw',
              overflow: 'visible'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitulo}>
                  {editandoInscrito
                    ? 'Editar Inscripción'
                    : (modoInscribir === 'multiple' ? 'Inscribir Alumnos en Lote' : 'Inscribir Alumno')}
                </h3>
                <p style={s.modalSub}>
                  {editandoInscrito
                    ? 'Modifica los datos del alumno para este examen'
                    : (modoInscribir === 'multiple'
                      ? 'Selecciona varios alumnos y convócalos en 1 solo clic'
                      : 'Selecciona al alumno para asignar su grado actual y ascenso')}
                </p>
              </div>
              <button style={s.btnCerrar} onClick={() => setModalInscribir(false)} title="Cerrar">
                <FiX size={18} />
              </button>
            </div>

            {/* Selector de Modo (solo cuando es nuevo registro) */}
            {!editandoInscrito && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setModoInscribir('multiple')}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: modoInscribir === 'multiple' ? 'var(--accent-blue)' : 'transparent',
                    color: modoInscribir === 'multiple' ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FiUsers size={14} />
                  <span>Inscribir Varios (Lote)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoInscribir('individual')}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: modoInscribir === 'individual' ? 'var(--accent-blue)' : 'transparent',
                    color: modoInscribir === 'individual' ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FiUser size={14} />
                  <span>Individual</span>
                </button>
              </div>
            )}

            {/* MODO MÚLTIPLE (LOTE) */}
            {modoInscribir === 'multiple' && !editandoInscrito ? (
              <div>
                {/* Barra de búsqueda y filtro por cinta */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <FiSearch style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={14} />
                    <input
                      style={{ ...s.input, padding: '7px 12px 7px 34px', height: '34px', fontSize: '12.5px', borderRadius: '8px' }}
                      placeholder="Buscar alumno por nombre..."
                      value={busquedaAlumno}
                      onChange={e => setBusquedaAlumno(e.target.value)}
                    />
                  </div>
                  <select
                    style={{ ...s.select, width: '150px', height: '34px', padding: '4px 8px', fontSize: '12px', borderRadius: '8px' }}
                    value={filtroCintaModal}
                    onChange={e => setFiltroCintaModal(e.target.value)}
                  >
                    <option value="todos">Todas las cintas</option>
                    {cintasConfig.map(c => (
                      <option key={c.id} value={String(c.id)}>{c.nombre_nivel}</option>
                    ))}
                  </select>
                </div>

                {/* Encabezado de Selección */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={alumnosFiltradosModal.length > 0 && seleccionadosModal.length === alumnosFiltradosModal.length}
                      onChange={() => toggleSeleccionarTodoModal(alumnosFiltradosModal)}
                      style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--accent-blue)' }}
                    />
                    <span>Seleccionar todos ({alumnosFiltradosModal.length})</span>
                  </label>
                  {seleccionadosModal.length > 0 && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                      onClick={() => setSeleccionadosModal([])}
                    >
                      Desmarcar ({seleccionadosModal.length})
                    </button>
                  )}
                </div>

                {/* Lista de Alumnos con espaciado amplio */}
                <div style={{
                  maxHeight: '290px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  background: 'var(--bg-primary)',
                  padding: '6px'
                }}>
                  {alumnosFiltradosModal.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No hay alumnos disponibles para inscribir con los filtros seleccionados
                    </div>
                  ) : (
                    alumnosFiltradosModal.map(a => {
                      const { actual, siguiente } = obtenerGradosAlumno(a)
                      const isSelected = seleccionadosModal.includes(a.id)
                      const costoSugerido = obtenerCostoSugerido(a)
                      const costoVal = costosModal[String(a.id)] !== undefined ? costosModal[String(a.id)] : costoSugerido
                      const pagadoVal = !!pagadosModal[String(a.id)]
                      const nombreCompleto = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.trim()

                      return (
                        <div
                          key={a.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            padding: '9px 12px',
                            marginBottom: '5px',
                            borderRadius: '10px',
                            background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                            border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.4)' : 'var(--border)'}`,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSeleccionarAlumnoModal(a.id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-blue)', flexShrink: 0 }}
                            />
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {obtenerIniciales(a.nombre, a.apellido_paterno)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {nombreCompleto}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  padding: '2px 7px',
                                  borderRadius: '8px',
                                  background: actual?.color_hex || 'var(--bg-tertiary)',
                                  color: actual?.color_texto || 'var(--text-primary)'
                                }}>
                                  {actual?.nombre_nivel || 'Sin cinta'}
                                </span>
                                <FiArrowRight size={11} style={{ color: 'var(--text-muted)' }} />
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  padding: '2px 7px',
                                  borderRadius: '8px',
                                  background: siguiente?.color_hex || 'var(--accent-blue-bg)',
                                  color: siguiente?.color_texto || 'var(--accent-blue)'
                                }}>
                                  {siguiente?.nombre_nivel || 'Siguiente'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Costo del examen para este alumno (editable)">
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>$</span>
                              <input
                                type="number"
                                step="1"
                                placeholder={costoSugerido || '0'}
                                value={costoVal}
                                onChange={e => {
                                  const val = e.target.value
                                  setCostosModal(prev => ({ ...prev, [String(a.id)]: val }))
                                  if (!isSelected) {
                                    setSeleccionadosModal(prev => [...prev, a.id])
                                  }
                                }}
                                style={{
                                  ...s.input,
                                  width: '74px',
                                  height: '30px',
                                  padding: '3px 8px',
                                  fontSize: '12.5px',
                                  fontWeight: '600',
                                  borderRadius: '6px',
                                  textAlign: 'right'
                                }}
                              />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--text-muted)', cursor: 'pointer' }} title="Marcar como pagado de inmediato">
                              <input
                                type="checkbox"
                                checked={pagadoVal}
                                onChange={e => {
                                  const chk = e.target.checked
                                  setPagadosModal(prev => ({ ...prev, [String(a.id)]: chk }))
                                  if (!isSelected && chk) {
                                    setSeleccionadosModal(prev => [...prev, a.id])
                                  }
                                }}
                                style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#10b981' }}
                              />
                              <span style={{ color: pagadoVal ? '#10b981' : 'var(--text-secondary)', fontWeight: pagadoVal ? '700' : '600' }}>
                                Pagado
                              </span>
                            </label>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div style={s.modalFooter}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: seleccionadosModal.length > 0 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                      {seleccionadosModal.length} alumno{seleccionadosModal.length !== 1 ? 's' : ''} seleccionado{seleccionadosModal.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button style={s.btnSecondary} onClick={() => setModalInscribir(false)} disabled={guardandoInscripcion}>
                      Cancelar
                    </button>
                    <button
                      style={{
                        ...s.btnPrimaryModal,
                        opacity: seleccionadosModal.length === 0 || guardandoInscripcion ? 0.6 : 1,
                        cursor: seleccionadosModal.length === 0 || guardandoInscripcion ? 'not-allowed' : 'pointer'
                      }}
                      onClick={guardarInscripcionMasiva}
                      disabled={seleccionadosModal.length === 0 || guardandoInscripcion}
                    >
                      <FiCheckCircle size={14} />
                      <span>{guardandoInscripcion ? 'Inscribiendo...' : `Inscribir ${seleccionadosModal.length} Alumno${seleccionadosModal.length !== 1 ? 's' : ''}`}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* MODO INDIVIDUAL / EDITAR */
              <div>
                <div style={{ position: 'relative', marginBottom: '14px' }}>
                  <label style={s.label}>Alumno</label>
                  <input
                    style={{
                      ...s.input,
                      background: 'var(--bg-primary)',
                      borderColor: formInscribir.alumno_id ? 'var(--accent-blue)' : 'var(--border)'
                    }}
                    placeholder="Escribe el nombre del alumno..."
                    value={formInscribir.nombre_alumno || busquedaAlumno}
                    disabled={!!editandoInscrito}
                    onChange={e => {
                      const val = e.target.value
                      setBusquedaAlumno(val)
                      if (formInscribir.alumno_id) {
                        setFormInscribir(prev => ({ ...prev, alumno_id: '', nombre_alumno: '' }))
                      }
                    }}
                  />
                  {!formInscribir.alumno_id && busquedaAlumno && alumnosFiltradosModal.length > 0 && (
                    <div style={s.dropdown}>
                      {alumnosFiltradosModal.map(a => {
                        const cintaActual = cintasConfig.find(c => String(c.id) === String(a.configuracion_cinta_id)) || a.cinta_config || a.cintaConfig;
                        return (
                          <div 
                            key={a.id} 
                            style={{ ...s.dropItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} 
                            onMouseDown={() => seleccionarAlumno(a)}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                                {a.nombre} {a.apellido_paterno} {a.apellido_materno || ''}
                              </div>
                            </div>
                            {cintaActual && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '2px 7px',
                                borderRadius: '10px',
                                background: cintaActual.color_hex || 'var(--bg-tertiary)',
                                color: cintaActual.color_texto || 'var(--text-primary)',
                                border: '1px solid rgba(0,0,0,0.1)'
                              }}>
                                {cintaActual.nombre_nivel}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={s.grid2}>
                  <div>
                    <label style={s.label}>Grado Actual</label>
                    <select
                      style={s.select}
                      value={String(formInscribir.grado_actual_id || '')}
                      onChange={e => setFormInscribir(prev => ({ ...prev, grado_actual_id: e.target.value }))}
                    >
                      <option value="">-- Cinta Actual --</option>
                      {cintasConfig.map(c => (
                        <option key={c.id} value={String(c.id)}>{c.nombre_nivel}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={s.label}>Grado a Aspirar</label>
                    <select
                      style={s.select}
                      value={String(formInscribir.grado_siguiente_id || '')}
                      onChange={e => setFormInscribir(prev => ({ ...prev, grado_siguiente_id: e.target.value }))}
                    >
                      <option value="">-- Cinta Siguiente --</option>
                      {cintasConfig.map(c => (
                        <option key={c.id} value={String(c.id)}>{c.nombre_nivel}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={s.grid2}>
                  <div>
                    <label style={s.label}>Costo del Examen ($)</label>
                    <input
                      style={s.input}
                      type="number"
                      placeholder="Ej. 650"
                      value={formInscribir.costo_examen}
                      onChange={e => setFormInscribir({ ...formInscribir, costo_examen: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
                    <input
                      type="checkbox"
                      id="chkPagado"
                      checked={formInscribir.pagado}
                      onChange={e => setFormInscribir({ ...formInscribir, pagado: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10b981' }}
                    />
                    <label htmlFor="chkPagado" style={{ fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      Marcar como pagado
                    </label>
                  </div>
                </div>

                <div style={s.modalFooter}>
                  <button style={s.btnSecondary} onClick={() => setModalInscribir(false)} disabled={guardandoInscripcion}>
                    Cancelar
                  </button>
                  <button style={s.btnPrimaryModal} onClick={guardarInscripcion} disabled={guardandoInscripcion}>
                    <FiCheckCircle size={13} />
                    <span>{guardandoInscripcion ? 'Guardando...' : (editandoInscrito ? 'Guardar Cambios' : 'Inscribir Alumno')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { paddingBottom: '40px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' },

  btnVolver: { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '16px', padding: '6px 0' },

  headerCard: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)', boxSizing: 'border-box', width: '100%' },
  badgeTipo: { display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)' },
  titulo: { fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' },
  infoSub: { fontSize: '13px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' },

  btnInscribir: { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 20px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-md)' },

  gridStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px', width: '100%', boxSizing: 'border-box' },
  statCard: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column' },
  statTitle: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' },
  statNumber: { fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', margin: '4px 0' },
  statSub: { fontSize: '11px', color: 'var(--text-muted)' },

  barraAcciones: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' },
  searchWrapper: { position: 'relative', flex: 1, maxWidth: '350px' },
  searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  search: { width: '100%', padding: '10px 16px 10px 40px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '80px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', boxSizing: 'border-box' },

  filtrosSecundarios: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  selectFiltro: { padding: '9px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px', cursor: 'pointer' },
  btnSecundario: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' },
  btnExport: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },

  btnAprobarTodos: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '10px', color: '#10b981', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease' },

  bulkBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(16, 185, 129, 0.12))', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '14px', padding: '12px 20px', marginBottom: '16px', boxShadow: 'var(--shadow-md)' },
  btnAprobarMasivo: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)', transition: 'all 0.2s ease' },
  btnPagarMasivo: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)', transition: 'all 0.2s ease' },
  btnDesmarcar: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' },

  tableContainer: { background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', minHeight: 'auto', boxShadow: 'var(--shadow-md)', width: '100%', boxSizing: 'border-box' },
  tablaScroll: { width: '100%', overflowX: 'auto', overflowY: 'hidden', boxSizing: 'border-box' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '100%' },
  th: { padding: '12px 14px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 14px', fontSize: '14px', color: 'var(--text-secondary)', verticalAlign: 'middle' },

  avatarSmall: { width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, border: '2px solid var(--border)' },
  badgeCinta: { padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-block', textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle' },
  btnBadgeStatus: { padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease', letterSpacing: '0.2px' },
  selectResultado: { padding: '4px 8px', borderRadius: '8px', border: '1px solid', fontSize: '11.5px', fontWeight: '700', outline: 'none', cursor: 'pointer', transition: 'all 0.2s ease' },

  btnIcon: { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease' },
  btnVer: { background: 'rgba(255, 255, 255, 0.1)', color: '#94a3b8' },
  btnEdit: { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
  btnDel: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '18px', padding: '22px 26px', width: '590px', maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  modalTitulo: { fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 },
  modalSub: { fontSize: '12.5px', color: 'var(--text-muted)', margin: '3px 0 0' },
  btnCerrar: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', transition: 'all 0.15s ease' },

  campoGroup: { marginBottom: '12px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' },
  input: { width: '100%', padding: '9px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' },
  select: { width: '100%', padding: '9px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none', fontSize: '13px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' },

  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' },
  btnPrimaryModal: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', boxShadow: 'var(--shadow-glow-blue)', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  btnSecondary: { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', fontWeight: '600', fontSize: '12.5px', cursor: 'pointer' },

  dropdown: { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100, maxHeight: '220px', overflowY: 'auto' },
  dropItem: { padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' },

  btnSecundario: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '9px 16px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  dropdownExport: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '8px',
    zIndex: 100,
    minWidth: '150px',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  btnExportExcel: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' },
  btnExportPdf: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' },
}
