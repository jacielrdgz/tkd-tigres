import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import api from '../api/axios'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  FiDownload,
  FiChevronDown,
  FiUserPlus,
  FiSearch,
  FiAward,
  FiUsers,
  FiClock,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiFileText,
  FiCheck,
  FiFilter,
  FiX,
  FiCamera,
} from 'react-icons/fi'
import CustomDropdown from '../components/Common/CustomDropdown'
import { obtenerInfoEscuelaParaPDF, dibujarEncabezadoMembrete, agregarPieDePagina, guardarODescargarPDF, guardarODescargarExcel } from '../utils/pdfHelper'
import { getCache, setCache, invalidateCache } from '../utils/cacheManager'

const limpiarDato = (val) => {
  if (val === null || val === undefined || val === 'null' || val === 'NULL' || val === '') return '-'
  return typeof val === 'string' ? val.trim() : val
}

const tieneFoto = (foto) => {
  if (!foto || foto === 'null' || foto === 'NULL' || foto === '') return false
  return true
}

const capitalizar = (str) =>
  str ? str.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : ''

const obtenerIniciales = (nombre, apellido) => {
  if (!nombre) return '?'
  const n = limpiarDato(nombre).charAt(0)
  const a = apellido ? limpiarDato(apellido).charAt(0) : ''
  return (n + a).toUpperCase()
}

const formatHora = (hora) => {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hrs = parseInt(h)
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  const h12 = hrs % 12 || 12
  return `${h12}:${m} ${ampm}`
}

const formatFechaNatural = (fecha) => {
  if (!fecha) return '-'
  const d = new Date(fecha + 'T12:00:00') // Evitar desfase de zona horaria
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

const toastSuccess = (msg) => {
  toast.success(msg, {
    style: {
      borderLeft: '4px solid #22c55e'
    }
  })
}

const toastError = (msg) => {
  toast.error(msg, {
    style: {
      borderLeft: '4px solid #ef4444'
    }
  })
}
const limpiarUrl = (url) => {
  if (!url) return null
  if (url.startsWith('data:')) return url
  const clean = url.replace(/\\\//g, '/')
  if (clean.startsWith('http')) return clean
  return `${import.meta.env.VITE_API_URL || ''}/storage/${clean}`
}

const VACIO = {
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  nombre_tutor: '',
  telefono_tutor: '',
  email: '',
  fecha_nacimiento: '',
  configuracion_cinta_id: '',
  horario_id: '',
  estatus: 'activo',
  fecha_ingreso: '',
}

export default function Alumnos() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [alumnos, setAlumnos] = useState([])
  const [cintasConfig, setCintasConfig] = useState(() => {
    const c = getCache('cintas_config')?.data
    return Array.isArray(c) ? c : (c ? Object.values(c) : [])
  })
  const [searchParams, setSearchParams] = useSearchParams()

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)
  const [isTablet, setIsTablet] = useState(window.innerWidth > 640 && window.innerWidth <= 1024)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth <= 640)
      setIsTablet(window.innerWidth > 640 && window.innerWidth <= 1024)
    }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Estados de exportación
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

  // Estados de filtros — se inicializan desde la URL
  const [busqueda, setBusqueda] = useState(searchParams.get('busqueda') || '')
  const [busquedaInput, setBusquedaInput] = useState(searchParams.get('busqueda') || '')
  const [modal, setModal] = useState(false)
  const [modalVer, setModalVer] = useState(false)
  const [alumnoVer, setAlumnoVer] = useState(null)
  const [historialAlumno, setHistorialAlumno] = useState(null)
  const [historialData, setHistorialData] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [modalManual, setModalManual] = useState(false)
  const [formManual, setFormManual] = useState({
    grado_anterior_id: '', grado_nuevo_id: '', fecha_ascenso: new Date().toISOString().split('T')[0], actualizar_cinta: false
  })
  const [form, setForm] = useState(VACIO)
  const [errors, setErrors] = useState({})
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [eliminarFoto, setEliminarFoto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(false)
  const [alumnoEliminar, setAlumnoEliminar] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [editando, setEditando] = useState(null)
  const [cargando, setCargando] = useState(() => !getCache(`alumnos_search_${searchParams.get('busqueda') || 'all'}`)?.data && !getCache('alumnos_search_all')?.data)
  const [guardando, setGuardando] = useState(false)
  const [todosLosAlumnos, setTodosLosAlumnos] = useState(() => {
    const c = getCache(`alumnos_search_${searchParams.get('busqueda') || 'all'}`)?.data || getCache('alumnos_search_all')?.data
    return Array.isArray(c) ? c : (c ? Object.values(c) : [])
  })
  const [rowHover, setRowHover] = useState(null)
  const [tabHover, setTabHover] = useState(null)
  const [horarios, setHorarios] = useState(() => {
    const c = getCache('horarios_lista')?.data
    return Array.isArray(c) ? c : (c ? Object.values(c) : [])
  });

  // Filtros — se inicializan desde la URL
  const [estatusFiltro, setEstatusFiltro] = useState(searchParams.get('estatus') || 'activo')
  const [cintaFiltro, setCintaFiltro] = useState(searchParams.get('cinta') || '')
  const [edadFiltro, setEdadFiltro] = useState(searchParams.get('edad') || '')
  const [horarioFiltro, setHorarioFiltro] = useState(searchParams.get('horario') || '')
  const [orden, setOrden] = useState(searchParams.get('orden') || 'id')

  const fileRef = useRef()

  // Totales siempre correctos
  const totalTodos = todosLosAlumnos.length
  const totalActivos = todosLosAlumnos.filter(a => a.estatus === 'activo').length
  const totalInactivos = todosLosAlumnos.filter(a => a.estatus === 'inactivo').length

  const cargar = (force = false) => {
    const cacheKey = `alumnos_search_${busqueda || 'all'}`
    if (!force) {
      const cached = getCache(cacheKey)
      if (cached && cached.data) {
        const cachedList = Array.isArray(cached.data) ? cached.data : Object.values(cached.data)
        setTodosLosAlumnos(cachedList)
        setCargando(false)
      } else {
        setCargando(true)
      }
    } else {
      setCargando(true)
    }

    // Siempre traemos TODOS sin filtrar por estatus
    api.get('/alumnos', { params: { search: busqueda } })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ? Object.values(res.data.data) : Object.values(res.data || {}))
        setTodosLosAlumnos(list)
        setCache(cacheKey, list)
      })
      .catch(() => {
        const cached = getCache(cacheKey)
        if (!cached || !cached.data) {
          setTodosLosAlumnos([])
          toastError('No se pudieron cargar los alumnos')
        }
      })
      .finally(() => setCargando(false))
  }

  const alternarEstatus = async (alumno) => {
    // Invalida la caché de alumnos
    invalidateCache('alumnos')

    // Actualiza INMEDIATAMENTE sin esperar la API
    setTodosLosAlumnos(prev => prev.map(a =>
      a.id === alumno.id
        ? { ...a, estatus: a.estatus === 'activo' ? 'inactivo' : 'activo' }
        : a
    ))

    try {
      await api.patch(`/alumnos/${alumno.id}/toggle-estatus`)
      toastSuccess('Estatus actualizado')
    } catch (err) {
      // Si falla, revierte el cambio
      setTodosLosAlumnos(prev => prev.map(a =>
        a.id === alumno.id
          ? { ...a, estatus: a.estatus === 'activo' ? 'inactivo' : 'activo' }
          : a
      ))
      toastError('No se pudo cambiar el estatus')
    }
  }
  // Debounce — espera 300ms después de que el usuario deja de escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusqueda(busquedaInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [busquedaInput])

  const cargarCintas = () => {
    const cached = getCache('cintas_config')
    if (cached && cached.data) {
      const cachedList = Array.isArray(cached.data) ? cached.data : Object.values(cached.data)
      setCintasConfig(cachedList)
    }
    api.get('/configuraciones-cintas')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || Object.values(res.data || {}))
        setCintasConfig(list)
        setCache('cintas_config', list)
      })
      .catch(err => console.error("Error cargando cintas", err))
  }

  const cargarHorarios = () => {
    const cached = getCache('horarios_lista')
    if (cached && cached.data) {
      const cachedList = Array.isArray(cached.data) ? cached.data : Object.values(cached.data)
      setHorarios(cachedList)
    }
    api.get('/horarios')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || Object.values(res.data || {}))
        setHorarios(list)
        setCache('horarios_lista', list)
      })
      .catch(err => console.error("Error cargando horarios", err))
  }

  // Recarga cuando cambia búsqueda
  useEffect(() => { cargar() }, [busqueda])
  // Carga inicial de cintas y horarios
  useEffect(() => {
    cargarCintas()
    cargarHorarios()
  }, [])
  // Sincroniza filtros en la URL automáticamente
  useEffect(() => {
    const params = {}
    if (busqueda) params.busqueda = busqueda
    if (estatusFiltro !== 'activo') params.estatus = estatusFiltro
    if (cintaFiltro) params.cinta = cintaFiltro
    if (edadFiltro) params.edad = edadFiltro
    if (horarioFiltro) params.horario = horarioFiltro
    if (orden !== 'id') params.orden = orden
    setSearchParams(params, { replace: true })
  }, [busqueda, estatusFiltro, cintaFiltro, edadFiltro, horarioFiltro, orden])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setModal(false)
        setModalVer(false)
        setHistorialAlumno(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => { window.removeEventListener('keydown', handleEsc) }
  }, [])

  const editId = searchParams.get('edit')
  useEffect(() => {
    if (editId && todosLosAlumnos.length > 0) {
      const student = todosLosAlumnos.find(a => String(a.id) === String(editId))
      if (student) {
        abrirEditar(student)
        const newParams = Object.fromEntries(searchParams.entries())
        delete newParams.edit
        setSearchParams(newParams, { replace: true })
      }
    }
  }, [editId, todosLosAlumnos])

  const abrirCrear = () => {
    setForm(VACIO)
    setErrors({})
    setFotoFile(null)
    setFotoPreview(null)
    setEliminarFoto(false)
    setEditando(null)
    setModal(true)
  }

  const abrirEditar = (alumno) => {
    setErrors({})
    setForm({
      ...alumno, // Trae todos los datos base
      nombre: alumno.nombre || '',
      apellido_paterno: alumno.apellido_paterno || '',
      apellido_materno: alumno.apellido_materno || '',
      nombre_tutor: alumno.nombre_tutor || '',
      telefono_tutor: alumno.telefono_tutor || '',
      email: alumno.email || '',
      fecha_nacimiento: alumno.fecha_nacimiento || '',

      // La cinta se almacena como FK
      configuracion_cinta_id: alumno.configuracion_cinta_id || '',
      horario_id: alumno.horario_id || '',
      estatus: alumno.estatus || 'activo',
      dia_pago: alumno.dia_pago || 1,
      fecha_ingreso: alumno.fecha_ingreso || '',
    });

    // 3. CORRECCIÓN DE FOTO:
    // Mostramos la foto actual en el círculo de previsualización del modal
    if (alumno.foto_url) {
      setFotoPreview(limpiarUrl(alumno.foto_url));
    } else {
      setFotoPreview(null);
    }

    // 4. Resetear estados de archivos nuevos para esta edición
    setFotoFile(null);
    setEliminarFoto(false);

    // 5. Establecemos el ID para el modo edición y abrimos el modal
    setEditando(alumno.id);
    setModal(true);
  };

  const abrirVer = (a) => {
    setAlumnoVer(a)
    setModalVer(true)
  }

  const abrirHistorial = async (a) => {
    setHistorialAlumno(a)
    setHistorialData([])
    setCargandoHistorial(true)
    try {
      const res = await api.get(`/alumnos/${a.id}`)
      setHistorialData(res.data.historial_grados || [])
    } catch (e) { console.error(e) }
    finally { setCargandoHistorial(false) }
  }

  const guardarHistorialManual = async () => {
    if (!formManual.grado_nuevo_id || !formManual.fecha_ascenso) return
    try {
      await api.post(`/alumnos/${historialAlumno.id}/historial-manual`, formManual)
      toastSuccess('Historial registrado correctamente')
      setModalManual(false)
      invalidateCache('alumnos')
      abrirHistorial(historialAlumno) // Recargar
      cargar(true) // Recargar lista principal por si cambió la cinta
    } catch (e) { toastError('Error al registrar historial') }
  }

  const cerrar = () => {
    setModal(false)
    setModalVer(false)
    setAlumnoVer(null)
    setErrors({})
    setFotoFile(null)
    setFotoPreview(null)
    setEliminarFoto(false)
  }

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
    setEliminarFoto(false)
  }

  const validar = () => {
    const e = {}
    if (!form.nombre?.trim()) e.nombre = ['El nombre es obligatorio.']
    if (!form.apellido_paterno?.trim()) e.apellido_paterno = ['El apellido paterno es obligatorio.']
    if (!form.apellido_materno?.trim()) e.apellido_materno = ['El apellido materno es obligatorio.']
    if (!form.fecha_nacimiento) e.fecha_nacimiento = ['La fecha de nacimiento es obligatoria.']
    if (!form.horario_id) e.horario_id = ['Debes seleccionar un horario para el alumno.']
    if (!form.configuracion_cinta_id) e.configuracion_cinta_id = ['Debes seleccionar una cinta para el alumno.']
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = ['Correo inválido.']
    return e
  }

  const guardar = async () => {
    try {
      const e = validar()
      setErrors(e)
      if (Object.keys(e).length > 0) {
        toast.error(Object.values(e)[0][0])
        return
      }

      setGuardando(true)
      const data = new FormData()

      // Campos a excluir: relaciones cargadas por Eloquent, campos generados y archivos
      const EXCLUIR = ['foto_url', 'foto', 'id', 'edad', 'cinta_config', 'ultimo_pago', 'estatus_pago', 'racha_faltas']
      Object.entries(form).forEach(([k, v]) => {
        if (!EXCLUIR.includes(k) && v !== null && v !== undefined) {
          data.append(k, v)
        }
      })
      if (eliminarFoto) {
        data.append('eliminar_foto', '1')
      }
      // CRITICO: Solo enviar 'foto' si es un ARCHIVO nuevo (File)
      // Esto evita el error "The foto field must be an image" al enviar el string de la URL
      if (fotoFile && fotoFile instanceof File) {
        data.append('foto', fotoFile)
      }

      if (editando) {
        data.append('_method', 'PUT')
        await api.post(`/alumnos/${editando}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toastSuccess("Alumno actualizado")
      } else {
        await api.post('/alumnos', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toastSuccess("Alumno creado")
      }
      invalidateCache('alumnos')
      cerrar()
      cargar(true)
    } catch (err) {
      console.error('Detalles del error:', err.response?.data)

      if (err.response?.data?.errors) {
        const errores = err.response.data.errors
        setErrors(errores)
        const primerError = Object.values(errores)[0][0]
        toast.error(primerError)
      } else {
        toastError("Error al guardar.")
      }
    } finally {
      setGuardando(false)
    }


  }

  const abrirEliminar = (alumno) => {
    if (!alumno) return

    Swal.fire({
      title: '¿Eliminar alumno?',
      text: `Estás a punto de borrar a ${alumno.nombre}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#13151f',
      color: '#fff',
      customClass: {
        popup: 'swal-custom-premium'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        confirmarEliminar(alumno.id)
      }
    })
  }

  const confirmarEliminar = async (id) => {
    try {
      setEliminandoId(id)
      await api.delete(`/alumnos/${id}`)
      toastSuccess('Alumno eliminado correctamente 🗑️')
      invalidateCache('alumnos')
      cargar(true)
    } catch (err) {
      toastError('No se pudo eliminar el alumno')
    } finally {
      setEliminandoId(null)
    }
  }

  // -- PROCESAMIENTO DE DATOS (Filtros y Orden) --


  // Filtro por estatus primero
  const alumnosPorEstatus = estatusFiltro === 'todos'
    ? todosLosAlumnos
    : todosLosAlumnos.filter(a => a.estatus === estatusFiltro)

  let alumnosMostrados = [...alumnosPorEstatus]

  if (cintaFiltro) alumnosMostrados = alumnosMostrados.filter(a => String(a.configuracion_cinta_id) === String(cintaFiltro))
  if (horarioFiltro) alumnosMostrados = alumnosMostrados.filter(a => String(a.horario_id) === String(horarioFiltro))
  if (edadFiltro) {
    alumnosMostrados = alumnosMostrados.filter(a => {
      const e = a.edad
      if (edadFiltro === 'infantil') return e >= 3 && e <= 11
      if (edadFiltro === 'cadete') return e >= 12 && e <= 14
      if (edadFiltro === 'juvenil') return e >= 15 && e <= 17
      if (edadFiltro === 'adultos') return e >= 18
      return true
    })
  }
  alumnosMostrados.sort((a, b) => {
    switch (orden) {
      case 'id': {
        if (horarioFiltro) {
          const ordA = a.cinta_config?.orden ?? a.cintaConfig?.orden ?? 999
          const ordB = b.cinta_config?.orden ?? b.cintaConfig?.orden ?? 999
          if (ordA !== ordB) return ordA - ordB
          const edA = a.edad ?? 0
          const edB = b.edad ?? 0
          if (edA !== edB) return edA - edB
        }
        return a.id - b.id
      }
      case 'cinta_asc': {
        const oA = a.cinta_config?.orden ?? 999
        const oB = b.cinta_config?.orden ?? 999
        if (oA !== oB) return oA - oB
        const edA = a.edad ?? 0
        const edB = b.edad ?? 0
        if (edA !== edB) return edA - edB
        return a.id - b.id
      }
      case 'cinta_desc': {
        const oA = a.cinta_config?.orden ?? 999
        const oB = b.cinta_config?.orden ?? 999
        if (oA !== oB) return oB - oA
        const edA = a.edad ?? 0
        const edB = b.edad ?? 0
        if (edA !== edB) return edA - edB
        return a.id - b.id
      }
      case 'edad_asc': return (a.edad ?? 0) - (b.edad ?? 0) || a.id - b.id
      case 'edad_desc': return (b.edad ?? 0) - (a.edad ?? 0) || a.id - b.id
      case 'horario_asc': {
        const horaA = a.horario_config?.hora_inicio || a.horarioConfig?.hora_inicio || '23:59:59'
        const horaB = b.horario_config?.hora_inicio || b.horarioConfig?.hora_inicio || '23:59:59'
        if (horaA !== horaB) return horaA.localeCompare(horaB)

        const ordA = a.cinta_config?.orden ?? a.cintaConfig?.orden ?? 999
        const ordB = b.cinta_config?.orden ?? b.cintaConfig?.orden ?? 999
        if (ordA !== ordB) return ordA - ordB

        const edA = a.edad ?? 0
        const edB = b.edad ?? 0
        if (edA !== edB) return edA - edB

        return a.id - b.id
      }
      default: return a.id - b.id
    }
  })

  const hayFiltrosActivos = cintaFiltro || edadFiltro || horarioFiltro || orden !== 'id'

  const exportarExcel = async () => {
    if (alumnosMostrados.length === 0) {
      return Swal.fire({
        title: 'Reporte Vacío',
        text: 'No hay alumnos que coincidan con los filtros actuales para exportar.',
        icon: 'info',
        confirmButtonColor: '#3b82f6',
        background: '#13151f',
        color: '#fff'
      })
    }

    try {
      const data = alumnosMostrados.map((a, i) => ({
        '#': i + 1,
        Nombre: `${limpiarDato(a.nombre)} ${limpiarDato(a.apellido_paterno)} ${limpiarDato(a.apellido_materno)}`,
        Edad: `${a.edad || 0} años`,
        Cinta: a.cinta_config?.nombre_nivel || 'Sin cinta',
        Teléfono: limpiarDato(a.telefono_tutor),
        Estatus: capitalizar(a.estatus || 'activo'),
        Horario: a.horarioConfig?.nombre || '-'
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Alumnos")
      await guardarODescargarExcel(wb, `Lista_Alumnos_${new Date().toISOString().split('T')[0]}.xlsx`)
      toastSuccess("Archivo Excel generado 📊")
    } catch (err) {
      toastError("Error al generar Excel")
    }
  }
  const handleHover = (e, color) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = `0 6px 20px ${color}`;
  };

  const handleOut = (e, color) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = `0 4px 15px ${color}`;
  };

  const exportarPDF = async () => {
    if (alumnosMostrados.length === 0) {
      return Swal.fire({
        title: 'Reporte Vacío',
        text: 'No hay alumnos que coincidan con los filtros actuales para exportar.',
        icon: 'info',
        confirmButtonColor: '#3b82f6',
        background: '#13151f',
        color: '#fff'
      })
    }

    try {
      const escuelaInfo = await obtenerInfoEscuelaParaPDF(user)
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' })

      // Dibujar membrete oficial superior
      const startY = dibujarEncabezadoMembrete(doc, {
        escuelaInfo,
        tipoReporte: 'REPORTE ALUMNOS',
        subtituloEtiqueta: 'Total Listados:',
        subtituloValor: `${alumnosMostrados.length} ALUMNOS`
      })

      const tableColumn = ["#", "Nombre Alumno", "Edad", "Cinta", "Teléfono Tutor", "Estatus"]
      const tableRows = alumnosMostrados.map((a, idx) => [
        idx + 1,
        `${limpiarDato(a.nombre)} ${limpiarDato(a.apellido_paterno)} ${limpiarDato(a.apellido_materno)}`,
        a.edad ? `${a.edad} años` : '-',
        a.cinta_config?.nombre_nivel || 'Sin cinta',
        limpiarDato(a.telefono_tutor) || '-',
        capitalizar(a.estatus || 'activo')
      ])

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8.5, cellPadding: 2, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 56, halign: 'left' },
          2: { cellWidth: 24, halign: 'center' },
          3: { cellWidth: 32, halign: 'center' },
          4: { cellWidth: 38, halign: 'center' },
          5: { cellWidth: 26, halign: 'center' }
        },
        margin: { left: 15, right: 15, bottom: 18 }
      })

      // Agregar pie de página membretado con fecha exacta y usuario
      agregarPieDePagina(doc, user)

      await guardarODescargarPDF(doc, `Reporte_Alumnos_${new Date().toISOString().split('T')[0]}.pdf`)
      toastSuccess("Documento PDF generado 📄")
    } catch (err) {
      console.error(err)
      toastError("Error al generar PDF")
    }
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Alumnos</h2>
          <p style={s.sub}>Gestión de estudiantes y grados</p>
        </div>
        {user?.role !== 'instructor' && (
          <button
            style={s.btnNuevoAlumno}
            className="mobile-hide"
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
            <FiUserPlus size={16} />
            <span>Nuevo alumno</span>
          </button>
        )}
      </div>

      {/* BARRA DE BÚSQUEDA Y CONTADOR */}
      <div style={isMobile ? s.searchRowMobile : s.barraAcciones}>
        <div style={isMobile ? s.searchWrapperMobile : s.searchWrapperDesktop}>
          <FiSearch style={s.searchIcon} size={17} />
          <input
            style={s.search}
            placeholder="Buscar por nombre..."
            value={busquedaInput}
            onChange={e => setBusquedaInput(e.target.value)}
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

        {/* Contador de resultados en desktop */}
        {!isMobile && !cargando && (
          <div style={{
            fontSize: '14px',
            color: hayFiltrosActivos ? '#60a5fa' : '#647fa5ff',
            marginBottom: '1px',
            display: 'flex',
            alignItems: 'right',
            gap: '6px'
          }}>
            {hayFiltrosActivos
              ? <>
                <span style={{ color: '#60a5fa', fontWeight: '600' }}>
                  {alumnosMostrados.length}
                </span>
                {` de ${alumnosPorEstatus.length} alumnos`}
                <span style={{ color: '#647fa5ff' }}>· Filtros activos</span>
              </>
              : `${alumnosMostrados.length} alumno${alumnosMostrados.length !== 1 ? 's' : ''}`
            }
          </div>
        )}

        {/* Tabs de estatus en Desktop */}
        {!isMobile && (
          <div style={s.tabs}>
            <button
              type="button"
              style={estatusFiltro === 'todos' ? s.tabActiveAzul : (tabHover === 'todos' ? s.tabHover : s.tab)}
              onClick={() => setEstatusFiltro('todos')}
              onMouseEnter={e => {
                setTabHover('todos')
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                setTabHover(null)
                e.currentTarget.style.transform = 'none'
              }}
            >
              Todos ({cargando ? '--' : totalTodos})
            </button>
            <button
              type="button"
              style={estatusFiltro === 'activo' ? s.tabActiveVerde : (tabHover === 'activo' ? s.tabHover : s.tab)}
              onClick={() => setEstatusFiltro('activo')}
              onMouseEnter={e => {
                setTabHover('activo')
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                setTabHover(null)
                e.currentTarget.style.transform = 'none'
              }}
            >
              Activos ({cargando ? '--' : totalActivos})
            </button>
            <button
              type="button"
              style={estatusFiltro === 'inactivo' ? s.tabActiveRojo : (tabHover === 'inactivo' ? s.tabHover : s.tab)}
              onClick={() => setEstatusFiltro('inactivo')}
              onMouseEnter={e => {
                setTabHover('inactivo')
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                setTabHover(null)
                e.currentTarget.style.transform = 'none'
              }}
            >
              Inactivos ({cargando ? '--' : totalInactivos})
            </button>
          </div>
        )}
      </div>

      {/* FILTROS PRINCIPALES */}
      {!isMobile ? (
        <div style={s.filtrosSecundarios}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* 1. Cintas */}
            <CustomDropdown
              label="Todas las cintas"
              icon={<FiAward size={13} />}
              options={[
                { value: '', label: 'Todas las cintas' },
                ...cintasConfig.map(c => ({ value: String(c.id), label: c.nombre_nivel }))
              ]}
              value={cintaFiltro}
              onChange={val => setCintaFiltro(val)}
              minWidth="175px"
            />

            {/* 2. Edades */}
            <CustomDropdown
              label="Todas las edades"
              icon={<FiUsers size={13} />}
              options={[
                { value: '', label: 'Todas las edades' },
                { value: 'infantil', label: 'Infantil (3-11)' },
                { value: 'cadete', label: 'Cadete (12-14)' },
                { value: 'juvenil', label: 'Juvenil (15-17)' },
                { value: 'adultos', label: 'Adultos (+18)' },
              ]}
              value={edadFiltro}
              onChange={val => setEdadFiltro(val)}
              minWidth="185px"
            />

            {/* 3. Horarios */}
            <CustomDropdown
              label="Todos los horarios"
              icon={<FiClock size={13} />}
              options={[
                { value: '', label: 'Todos los horarios' },
                ...horarios.map(h => ({
                  value: String(h.id),
                  label: `${h.nombre} (${formatHora(h.hora_inicio)} - ${formatHora(h.hora_fin)})`
                }))
              ]}
              value={horarioFiltro}
              onChange={val => setHorarioFiltro(val)}
              minWidth="190px"
            />

            {/* 4. Ordenar */}
            <CustomDropdown
              label="Ordenar por ID"
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>}
              options={[
                { value: 'id', label: 'Ordenar por ID' },
                { value: 'cinta_desc', label: 'Cinta (Mayor a menor)' },
                { value: 'cinta_asc', label: 'Cinta (Menor a mayor)' },
                { value: 'edad_asc', label: 'Edad (Menor a mayor)' },
                { value: 'edad_desc', label: 'Edad (Mayor a menor)' },
                { value: 'horario_asc', label: 'Horario (Temprano a tarde)' },
              ]}
              value={orden}
              onChange={val => setOrden(val)}
              minWidth="170px"
            />

            {/* Botón Limpiar */}
            <div style={{ ...s.btnLimpiarWrapper, visibility: (cintaFiltro || edadFiltro || horarioFiltro || orden !== 'id' || busqueda) ? 'visible' : 'hidden' }}>
              <button
                type="button"
                style={s.btnLimpiar}
                onClick={() => { setCintaFiltro(''); setEdadFiltro(''); setHorarioFiltro(''); setOrden('id'); setBusquedaInput(''); setBusqueda('') }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'
                  e.currentTarget.style.borderColor = 'var(--accent-red)'
                  e.currentTarget.style.color = 'var(--accent-red)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Limpiar</span>
              </button>
            </div>
          </div>

          {/* 6. Exportar con dropdown en Desktop */}
          <div style={{ position: 'relative' }} ref={exportRef}>
            <button
              type="button"
              style={{
                ...s.btnSecundario,
                borderColor: exportOpen ? 'var(--accent-blue)' : 'var(--border)',
                boxShadow: exportOpen ? '0 0 12px rgba(59, 130, 246, 0.3)' : 'none'
              }}
              onClick={() => setExportOpen(v => !v)}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-tertiary)'
                e.currentTarget.style.borderColor = 'var(--accent-blue)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-secondary)'
                e.currentTarget.style.borderColor = exportOpen ? 'var(--accent-blue)' : 'var(--border)'
                e.currentTarget.style.transform = 'none'
              }}
            >
              <FiDownload size={15} />
              Exportar
              <FiChevronDown
                size={13}
                style={{ transform: exportOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
              />
            </button>

            {exportOpen && (
              <div style={s.dropdownExport}>
                <button
                  type="button"
                  style={{ ...s.btnExportExcel, width: '100%', justifyContent: 'center' }}
                  onClick={() => { exportarExcel(); setExportOpen(false) }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Excel
                </button>
                <button
                  type="button"
                  style={{ ...s.btnExportPdf, width: '100%', justifyContent: 'center' }}
                  onClick={() => { exportarPDF(); setExportOpen(false) }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  PDF
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Vista Móvil: Grid 3x2 con los 6 botones alineados de igual ancho */
        <div style={{ width: '100%', marginBottom: '16px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            width: '100%',
          }}>
            {/* 1. Estatus */}
            <CustomDropdown
              label="Estatus"
              icon={<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: estatusFiltro === 'activo' ? '#22c55e' : (estatusFiltro === 'inactivo' ? '#ef4444' : '#3b82f6'), display: 'inline-block' }} />}
              options={[
                { value: 'activo', label: `Activos (${cargando ? '--' : totalActivos})` },
                { value: 'todos', label: `Todos (${cargando ? '--' : totalTodos})` },
                { value: 'inactivo', label: `Inactivos (${cargando ? '--' : totalInactivos})` },
              ]}
              value={estatusFiltro}
              onChange={val => setEstatusFiltro(val)}
              minWidth="100%"
              isMobile={true}
              alignRight={false}
            />

            {/* 2. Cintas */}
            <CustomDropdown
              label="Cintas"
              icon={<FiAward size={12} />}
              options={[
                { value: '', label: 'Cintas' },
                ...cintasConfig.map(c => ({ value: String(c.id), label: c.nombre_nivel }))
              ]}
              value={cintaFiltro}
              onChange={val => setCintaFiltro(val)}
              minWidth="100%"
              isMobile={true}
              alignRight={false}
            />

            {/* 3. Edades */}
            <CustomDropdown
              label="Edades"
              icon={<FiUsers size={12} />}
              options={[
                { value: '', label: 'Edades' },
                { value: 'infantil', label: 'Infantil (3-11)' },
                { value: 'cadete', label: 'Cadete (12-14)' },
                { value: 'juvenil', label: 'Juvenil (15-17)' },
                { value: 'adultos', label: 'Adultos (+18)' },
              ]}
              value={edadFiltro}
              onChange={val => setEdadFiltro(val)}
              minWidth="100%"
              isMobile={true}
              alignRight={true}
            />

            {/* 4. Horarios */}
            <CustomDropdown
              label="Horarios"
              icon={<FiClock size={12} />}
              options={[
                { value: '', label: 'Horarios' },
                ...horarios.map(h => ({
                  value: String(h.id),
                  label: `${h.nombre} (${formatHora(h.hora_inicio)} - ${formatHora(h.hora_fin)})`
                }))
              ]}
              value={horarioFiltro}
              onChange={val => setHorarioFiltro(val)}
              minWidth="100%"
              isMobile={true}
              alignRight={false}
            />

            {/* 5. Ordenar */}
            <CustomDropdown
              label="Ordenar"
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></svg>}
              options={[
                { value: 'id', label: 'Ordenar' },
                { value: 'cinta_desc', label: 'Cinta (Mayor a menor)' },
                { value: 'cinta_asc', label: 'Cinta (Menor a mayor)' },
                { value: 'edad_asc', label: 'Edad (Menor a mayor)' },
                { value: 'edad_desc', label: 'Edad (Mayor a menor)' },
                { value: 'horario_asc', label: 'Horario (Temprano a tarde)' },
              ]}
              value={orden}
              onChange={val => setOrden(val)}
              minWidth="100%"
              isMobile={true}
              alignRight={false}
            />

            {/* 6. Exportar */}
            <div style={{ position: 'relative', width: '100%' }} ref={exportRef}>
              <button
                type="button"
                style={{
                  ...s.btnSecundario,
                  width: '100%',
                  height: '36px',
                  borderColor: exportOpen ? 'var(--accent-blue)' : 'var(--border)',
                  boxShadow: exportOpen ? '0 0 10px rgba(59, 130, 246, 0.25)' : 'none',
                  padding: '0 8px',
                  fontSize: '11.5px',
                  gap: '4px',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                  borderRadius: '10px'
                }}
                onClick={() => setExportOpen(v => !v)}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                  e.currentTarget.style.borderColor = 'var(--accent-blue)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                  e.currentTarget.style.borderColor = exportOpen ? 'var(--accent-blue)' : 'var(--border)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'hidden' }}>
                  <FiDownload size={12} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Exportar</span>
                </span>
                <FiChevronDown
                  size={12}
                  style={{ transform: exportOpen ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }}
                />
              </button>

              {exportOpen && (
                <div style={{ ...s.dropdownExport, right: 0, left: 'auto', minWidth: '130px', zIndex: 1000 }}>
                  <button
                    type="button"
                    style={{ ...s.btnExportExcel, width: '100%', justifyContent: 'center' }}
                    onClick={() => { exportarExcel(); setExportOpen(false) }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Excel
                  </button>
                  <button
                    type="button"
                    style={{ ...s.btnExportPdf, width: '100%', justifyContent: 'center' }}
                    onClick={() => { exportarPDF(); setExportOpen(false) }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Badge para Limpiar filtros activos en móvil */}
          {(cintaFiltro || edadFiltro || horarioFiltro || orden !== 'id' || estatusFiltro !== 'activo' || busqueda) && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
              <button
                type="button"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '20px',
                  color: '#ef4444',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '4px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => { setCintaFiltro(''); setEdadFiltro(''); setHorarioFiltro(''); setOrden('id'); setEstatusFiltro('activo'); setBusquedaInput(''); setBusqueda('') }}
              >
                <span>✕ Limpiar filtros activos</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Skeleton pulse animation */}
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {(isMobile || isTablet) ? (
        <>
          <div style={s.cardsGrid}>
            {cargando ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={s.cardItemLoader}>
                  <SkeletonCircle size={44} />
                  <div style={{ flex: 1, textAlign: 'left', marginLeft: '12px' }}>
                    <SkeletonBlock w="180px" h={14} />
                    <div style={{ height: '6px' }} />
                    <SkeletonBlock w="100px" h={11} />
                  </div>
                </div>
              ))
            ) : alumnosMostrados.length === 0 ? (
              <div style={{ ...s.tdCenter, padding: '40px', color: '#64748b', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                No hay alumnos registrados que coincidan con los filtros
              </div>
            ) : (
              alumnosMostrados.map((a, idx) => (
                <div
                  key={a.id}
                  style={{
                    ...s.cardItemMobile,
                    borderLeft: `4px solid ${a.cinta_config?.color_hex || 'var(--border)'}`,
                    background: rowHover === a.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                  }}
                  onClick={() => navigate(`/alumnos/${a.id}`)}
                  onMouseEnter={() => setRowHover(a.id)}
                  onMouseLeave={() => setRowHover(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    {/* Avatar circular con foto o iniciales */}
                    <div style={s.avatarBoxMobile}>
                      {tieneFoto(a.foto_url) ? (
                        <img
                          src={limpiarUrl(a.foto_url)}
                          alt="foto"
                          style={s.avatarImgMobile}
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                        />
                      ) : null}
                      <div style={{ ...s.avatarInicialesMobile, display: tieneFoto(a.foto_url) ? 'none' : 'flex' }}>
                        {obtenerIniciales(a.nombre, a.apellido_paterno)}
                      </div>
                    </div>

                    {/* Información del alumno */}
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={s.cardNombreMobile}>
                        {a.nombre} {a.apellido_paterno} {a.apellido_materno || ''}
                      </div>
                      <div style={s.cardSubMobile}>
                        {a.edad} años • {a.email || (a.telefono_tutor ? `Tel. ${a.telefono_tutor}` : 'Sin contacto')}
                      </div>
                      <div style={s.cardBadgesRow}>
                        <span style={{
                          ...s.cintaBadgeMobile,
                          background: a.cinta_config?.color_hex || 'var(--bg-tertiary)',
                          color: a.cinta_config?.color_texto || 'var(--text-primary)'
                        }}>
                          {a.cinta_config?.nombre_nivel || 'Sin cinta'}
                        </span>
                        <span style={{
                          ...s.statusBadgeMobile,
                          background: a.estatus === 'activo' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: a.estatus === 'activo' ? '#10b981' : '#ef4444',
                          border: a.estatus === 'activo' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                          {capitalizar(a.estatus)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones en línea a la derecha (Ver, Editar, Borrar) */}
                  <div style={s.cardActionsMobile} onClick={e => e.stopPropagation()}>
                    <button
                      style={s.btnCardActionVer}
                      onClick={() => abrirVer(a)}
                      title="Ver información"
                    >
                      <FiEye size={15} />
                    </button>
                    {user?.role !== 'instructor' && (
                      <button
                        style={s.btnCardActionEdit}
                        onClick={() => abrirEditar(a)}
                        title="Editar alumno"
                      >
                        <FiEdit2 size={14} />
                      </button>
                    )}
                    {user?.role === 'owner' && (
                      <button
                        style={s.btnCardActionDel}
                        onClick={() => abrirEliminar(a)}
                        title="Borrar alumno"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {user?.role !== 'instructor' && (
            <button className="fab-button" onClick={abrirCrear} title="Nuevo alumno">
              +
            </button>
          )}
        </>
      ) : (
        <div style={s.tabla}>
          <div style={s.tablaScroll}>
            <table style={{ ...s.table, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '65px' }} />  {/* Foto */}
                <col style={{ width: '260px' }} /> {/* Alumno */}
                <col style={{ width: '90px' }} /> {/* Edad */}
                <col style={{ width: '150px' }} /> {/* Cinta */}
                <col style={{ width: '130px' }} /> {/* Teléfono */}
                <col style={{ width: '110px' }} /> {/* Estatus */}
                <col style={{ width: '150px' }} /> {/* Acciones */}
              </colgroup>
              <thead>
                <tr>
                  {['Foto', 'Alumno', 'Edad', 'Cinta', 'Teléfono', 'Estatus', 'Acciones'].map(h => (
                    <th
                      key={h}
                      style={{ ...s.th, textAlign: h === 'Alumno' ? 'left' : 'center' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ ...s.tr, height: '61px' }}> {/* Altura exacta de fila real */}
                      <td style={s.td}><SkeletonCircle size={40} /></td>
                      <td style={{ ...s.td, textAlign: 'left' }}>
                        <SkeletonBlock w="180px" h={14} />
                        <div style={{ height: '4px' }} />
                        <SkeletonBlock w="100px" h={11} />
                      </td>
                      <td style={s.td}><SkeletonBlock w="50px" h={14} /></td>
                      <td style={s.td}><SkeletonBlock w="100px" h={24} /></td>
                      <td style={s.td}><SkeletonBlock w="90px" h={14} /></td>
                      <td style={s.td}><SkeletonBlock w="80px" h={24} /></td>
                      <td style={s.td}>
                        <div style={{ ...s.acciones, justifyContent: 'center', gap: '8px' }}>
                          <SkeletonCircle size={32} />
                          <SkeletonCircle size={32} />
                          <SkeletonCircle size={32} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : alumnosMostrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...s.td, padding: '40px', color: '#64748b' }}>
                      No hay alumnos registrados que coincidan con los filtros
                    </td>
                  </tr>
                ) : (
                  alumnosMostrados.map((a, idx) => (
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
                      <td style={s.td}>
                        <div style={{ position: 'relative', width: '36px', height: '36px', margin: '0 auto' }}>
                          {tieneFoto(a.foto_url) ? (
                            <img
                              src={limpiarUrl(a.foto_url)}
                              alt="foto"
                              style={s.fotoTabla}
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                            />
                          ) : null}
                          <div style={{ ...s.fotoVacia, display: tieneFoto(a.foto_url) ? 'none' : 'flex' }}>
                            {obtenerIniciales(a.nombre, a.apellido_paterno)}
                          </div>
                        </div>
                      </td>

                      {/* ALUMNO: CLICKABLE PARA HISTORIAL */}
                      <td style={{ ...s.td, textAlign: 'left' }}>
                        <div
                          style={{
                            ...s.nombreNom,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '240px',
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/alumnos/${a.id}`)}
                          title={`${a.nombre} ${a.apellido_paterno} (Clic para ver perfil)`}
                        >
                          {a.nombre} {a.apellido_paterno} {a.apellido_materno}
                        </div>
                        <div
                          style={{
                            ...s.emailSub,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '240px'
                          }}
                        >
                          {`#${idx + 1}`} {a.email && a.email !== 'NULL' && a.email !== 'null' && (
                            <span style={{ opacity: 0.5 }}> | {a.email}</span>
                          )}
                        </div>
                      </td>

                      <td style={s.td}>{a.edad} años</td>

                      {/* CINTA: CENTRADA CON BADGE */}
                      <td style={s.td}>
                        <span style={{
                          ...s.cinta,
                          background: a.cinta_config?.color_hex || 'var(--bg-tertiary)',
                          color: a.cinta_config?.color_texto || 'var(--text-primary)',
                        }}>
                          {a.cinta_config?.nombre_nivel || 'Sin cinta'}
                        </span>
                      </td>

                      <td style={s.td}>{a.telefono_tutor || '-'}</td>

                      <td style={s.td}>
                        <span
                          title={user?.role !== 'instructor' ? `Clic para cambiar estatus (Actual: ${capitalizar(a.estatus)})` : ''}
                          onClick={() => {
                            if (user?.role !== 'instructor') {
                              alternarEstatus(a)
                            }
                          }}
                          onMouseEnter={e => {
                            if (user?.role !== 'instructor') {
                              e.currentTarget.style.background = a.estatus === 'activo'
                                ? 'rgba(16, 185, 129, 0.3)'
                                : 'rgba(239, 68, 68, 0.3)'
                            }
                          }}
                          onMouseLeave={e => {
                            if (user?.role !== 'instructor') {
                              e.currentTarget.style.background = a.estatus === 'activo'
                                ? s.statusActivoBg
                                : s.statusInactivoBg
                            }
                          }}
                          style={{
                            ...s.badge,
                            background: a.estatus === 'activo' ? s.statusActivoBg : s.statusInactivoBg,
                            color: a.estatus === 'activo' ? s.statusActivoText : s.statusInactivoText,
                            cursor: user?.role !== 'instructor' ? 'pointer' : 'default',
                            userSelect: 'none',
                            transition: 'background 0.15s ease',
                            display: 'inline-block',
                          }}
                        >
                          {capitalizar(a.estatus)}
                        </span>
                      </td>

                      {/* ACCIONES: CENTRADAS */}
                      <td style={s.td}>
                        <div style={s.acciones}>
                          <button //VER
                            style={{ ...s.btnIcon, ...s.btnVer }}
                            onClick={() => navigate(`/alumnos/${a.id}`)}
                            onMouseOver={e => {
                              e.currentTarget.style.background = '#94a3b8';
                              e.currentTarget.style.color = 'white';
                              e.currentTarget.style.transform = 'scale(1.1)';

                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.color = '#94a3b8';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title="Ver"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          </button>

                          {user?.role !== 'instructor' && (
                            <button //EDITAR
                              style={{ ...s.btnIcon, ...s.btnEdit }}
                              onClick={() => abrirEditar(a)}
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
                          )}

                          {user?.role === 'owner' && (
                            <button //BORRAR
                              style={{ ...s.btnIcon, ...s.btnDel }}
                              onClick={() => abrirEliminar(a)}
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
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalVer && alumnoVer && (
        <div style={s.overlay} className="mobile-fullscreen-overlay">
          <div style={s.modalCard} className="mobile-fullscreen-modal">
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>
                {alumnoVer.nombre} {alumnoVer.apellido_paterno} {alumnoVer.apellido_materno}
              </h3>
              <button className="btn-cerrar-circular" style={s.btnCerrarCircular} onClick={cerrar} aria-label="Cerrar modal"><FiX size={16} /></button>
            </div>
            <div style={s.cardBody}>
              <div style={s.avatarBox}>
                {tieneFoto(alumnoVer.foto_url) ? (
                  <img
                    src={limpiarUrl(alumnoVer.foto_url)}
                    alt="foto"
                    style={s.avatarImg}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                  />
                ) : null}
                <div style={{
                  ...s.avatarInicialesBox,
                  display: tieneFoto(alumnoVer.foto_url) ? 'none' : 'flex'
                }}>
                  <span style={s.avatarIniciales}>
                    {obtenerIniciales(alumnoVer.nombre, alumnoVer.apellido_paterno)}
                  </span>
                </div>
              </div>
              <div style={s.cardInfo}>
                <InfoItem label="ID" value={alumnoVer.id} />
                <InfoItem label="F. Nac." value={alumnoVer.fecha_nacimiento} />
                <InfoItem label="F. Ingreso" value={alumnoVer.fecha_ingreso || 'No registrada'} />
                <InfoItem label="Edad" value={alumnoVer.edad + ' años'} />
                <InfoItem label="Cinta" value={alumnoVer.cinta_config?.nombre_nivel || 'Sin cinta'} />
                <InfoItem label="Tutor" value={limpiarDato(alumnoVer.nombre_tutor)} />
                <InfoItem label="Teléfono" value={limpiarDato(alumnoVer.telefono_tutor)} />
                <InfoItem label="Correo" value={(alumnoVer.email && alumnoVer.email !== 'NULL' && alumnoVer.email !== 'null') ? alumnoVer.email : 'N/A'} />
                <InfoItem label="Status" value={capitalizar(alumnoVer.estatus)} />
              </div>
            </div>
            <div style={s.cardFooter}>
              <a
                href={'https://wa.me/52' + alumnoVer.telefono_tutor?.replace(/\s+/g, '')}
                target="_blank"
                rel="noreferrer"
                style={s.btnWhatsapp}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.517 2.011.808 3.146.809 3.181 0 5.767-2.584 5.768-5.764 0-3.18-2.586-5.763-5.768-5.763zm4.52 8.161c-.199.557-1.162 1.058-1.597 1.115-.41.054-.935.086-1.503-.099-.345-.113-.775-.262-1.328-.489-2.315-.953-3.82-3.308-3.936-3.461-.116-.155-.945-1.258-.945-2.399 0-1.141.594-1.701.806-1.933.211-.231.462-.29.616-.29.154 0 .308.001.442.008.14.007.33-.053.516.39.186.444.636 1.547.692 1.659.056.111.093.242.019.39-.074.148-.112.241-.223.37-.111.13-.233.29-.333.389-.111.111-.228.232-.098.455.13.223.577.95 1.24 1.54.853.759 1.567.994 1.79.1.223-.112.455-.228.678-.541.222-.314.185-.537.408-.65s.445-.074.743.074c.297.149 1.874.883 2.196 1.043.322.16.537.241.616.37.079.13.079.752-.12 1.309z" />
                </svg>
                WHATSAPP
              </a>
              <button style={s.btnAceptar} onClick={cerrar}>CERRAR</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE HISTORIAL DE GRADOS ── */}
      {historialAlumno && (
        <div style={s.overlay} className="mobile-fullscreen-overlay" onClick={() => setHistorialAlumno(null)}>
          <div style={s.modalHistorial} className="mobile-fullscreen-modal" onClick={e => e.stopPropagation()}>
            <div style={s.modalHistorialHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={s.avatarSm}>
                  {tieneFoto(historialAlumno.foto_url)
                    ? <img src={limpiarUrl(historialAlumno.foto_url)} alt="" style={s.avatarImg} />
                    : <div style={s.avatarInicialSm}>{obtenerIniciales(historialAlumno.nombre, historialAlumno.apellido_paterno)}</div>
                  }
                </div>
                <div>
                  <div style={s.drawerNombre}>{historialAlumno.nombre} {historialAlumno.apellido_paterno}</div>
                  <div style={s.drawerSub}>{historialAlumno.cinta_config?.nombre_nivel || 'Sin cinta'}{historialAlumno.edad ? ` · ${historialAlumno.edad} años` : ''}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{ ...s.btnPrimary, padding: '8px 16px', fontSize: '12px' }}
                  onClick={() => {
                    setFormManual({
                      grado_anterior_id: historialAlumno.configuracion_cinta_id || '',
                      grado_nuevo_id: '',
                      fecha_ascenso: new Date().toISOString().split('T')[0],
                      actualizar_cinta: false
                    })
                    setModalManual(true)
                  }}
                >
                  + MANUAL
                </button>
                <button style={s.btnCerrarWhite} onClick={() => setHistorialAlumno(null)}>✕</button>
              </div>
            </div>

            <div style={s.modalHistorialContent}>
              {cargandoHistorial ? (
                <div style={s.emptyHistorial}>Cargando historial...</div>
              ) : historialData.length === 0 ? (
                <div style={s.emptyHistorial}>Sin ascensos registrados aún</div>
              ) : (
                <>
                  {/* Resumen */}
                  <div style={s.resumenHistorial}>
                    <div style={s.resumenHistItem}>
                      <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-green)' }}>
                        {historialData.length}
                      </span>
                      <span style={s.resumenLabel}>Ascensos</span>
                    </div>
                    <div style={s.resumenHistItem}>
                      <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-green)' }}>
                        {historialData.length > 0 ? formatFechaNatural(historialData[0].fecha_ascenso) : '-'}
                      </span>
                      <span style={s.resumenLabel}>Último Grado</span>
                    </div>
                  </div>

                  {/* Lista */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {historialData.map(h => (
                      <div key={h.id} style={s.historialItem}>
                        <div style={{ ...s.accentBar, background: h.grado_nuevo?.color_hex || 'var(--accent-blue)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={s.historialGrado}>{h.grado_nuevo?.nombre_nivel || 'Grado desconocido'}</div>
                            <div style={s.historialFecha}>
                              {h.fecha_ascenso ? formatFechaNatural(h.fecha_ascenso) : '-'}
                            </div>
                          </div>
                          <div style={s.historialDetalle}>
                            {h.evento?.nombre || 'Examen manual'} · Anterior: {h.grado_anterior?.nombre_nivel || '-'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CARGA MANUAL DE GRADO ── */}
      {modalManual && (
        <div style={{ ...s.overlay, zIndex: 1100 }} className="mobile-fullscreen-overlay">
          <div style={{ ...s.modalCard, width: '450px' }} className="mobile-fullscreen-modal">
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>Registro de Grado Manual</h3>
              <button className="btn-cerrar-circular" style={s.btnCerrarCircular} onClick={() => setModalManual(false)} aria-label="Cerrar modal"><FiX size={16} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={s.label}>Grado Anterior</label>
                <select style={s.select} value={formManual.grado_anterior_id} onChange={e => setFormManual({ ...formManual, grado_anterior_id: e.target.value })}>
                  <option value="">- Ninguno -</option>
                  {cintasConfig.map(c => <option key={c.id} value={c.id}>{c.nombre_nivel}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={s.label}>Grado Obtenido</label>
                <select style={s.select} value={formManual.grado_nuevo_id} onChange={e => setFormManual({ ...formManual, grado_nuevo_id: e.target.value })}>
                  <option value="">- Seleccionar -</option>
                  {cintasConfig.map(c => <option key={c.id} value={c.id}>{c.nombre_nivel}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={s.label}>Fecha</label>
                <input type="date" style={s.input} value={formManual.fecha_ascenso} onChange={e => setFormManual({ ...formManual, fecha_ascenso: e.target.value })} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={formManual.actualizar_cinta} onChange={e => setFormManual({ ...formManual, actualizar_cinta: e.target.checked })} />
                  ¿Actualizar grado actual del alumno?
                </label>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setModalManual(false)}>CANCELAR</button>
              <button style={s.btnPrimary} onClick={guardarHistorialManual}>GUARDAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion modal replaced by Swal.fire */}

      {modal && (
        <div style={s.overlay} className="mobile-fullscreen-overlay">
          <div
            style={s.modal}
            className="mobile-fullscreen-modal"
            onKeyDown={e => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault()
                guardar()
              }
            }}
          >
            <div style={s.modalHeader}>
              <h3 style={s.modalTitulo}>{editando ? 'Editar alumno' : 'Nuevo alumno'}</h3>
              <button
                type="button"
                className="btn-cerrar-circular"
                style={s.btnCerrarCircular}
                onClick={cerrar}
                aria-label="Cerrar modal"
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

            <div style={s.fotoUploadArea}>
              <div
                style={s.fotoPreviewBox}
                onClick={() => fileRef.current.click()}
                title="Toca para seleccionar foto"
              >
                {fotoPreview ? (
                  <img 
                    src={fotoPreview} 
                    alt="" 
                    style={s.fotoPreviewImg} 
                    onError={() => setFotoPreview(null)}
                  />
                ) : (
                  <div style={s.fotoPlaceholder}>
                    <FiCamera size={26} color="var(--accent-blue)" style={{ marginBottom: '4px' }} />
                    <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '600' }}>
                      {form.nombre ? 'Cambiar foto' : 'Subir foto'}
                    </span>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFoto}
              />
              {fotoPreview && (
                <button
                  type="button"
                  style={s.btnQuitarFoto}
                  onClick={() => { setFotoFile(null); setFotoPreview(null); setEliminarFoto(true) }}
                >
                  Quitar foto
                </button>
              )}
            </div>

            <div style={s.grid2} className="mobile-grid-1">
              <Campo label="Nombre(s)" value={form.nombre} error={errors.nombre?.[0]} required onChange={v => { setForm({ ...form, nombre: v }); if (errors.nombre) setErrors(prev => ({ ...prev, nombre: undefined })) }} />
              <Campo label="Apellido paterno" value={form.apellido_paterno} error={errors.apellido_paterno?.[0]} required onChange={v => { setForm({ ...form, apellido_paterno: v }); if (errors.apellido_paterno) setErrors(prev => ({ ...prev, apellido_paterno: undefined })) }} />
              <Campo label="Apellido materno" value={form.apellido_materno} error={errors.apellido_materno?.[0]} required onChange={v => { setForm({ ...form, apellido_materno: v }); if (errors.apellido_materno) setErrors(prev => ({ ...prev, apellido_materno: undefined })) }} />
              <CampoFecha label="Fecha de nacimiento" value={form.fecha_nacimiento} placeholder="dd/mm/aaaa" error={errors.fecha_nacimiento?.[0]} required onChange={v => { setForm({ ...form, fecha_nacimiento: v }); if (errors.fecha_nacimiento) setErrors(prev => ({ ...prev, fecha_nacimiento: undefined })) }} />
              <Campo label="Nombre del tutor" value={form.nombre_tutor} error={errors.nombre_tutor?.[0]} onChange={v => { setForm({ ...form, nombre_tutor: v }); if (errors.nombre_tutor) setErrors(prev => ({ ...prev, nombre_tutor: undefined })) }} />
              <Campo
                label="Teléfono del tutor"
                value={form.telefono_tutor}
                placeholder="10 dígitos"
                error={errors.telefono_tutor?.[0]}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={v => {
                  const limpio = v.replace(/[^0-9]/g, '')
                  setForm({ ...form, telefono_tutor: limpio })
                  if (errors.telefono_tutor) setErrors(prev => ({ ...prev, telefono_tutor: undefined }))
                }}
              />
              <CampoFecha label="Fecha de ingreso (Opcional)" value={form.fecha_ingreso} placeholder="dd/mm/aaaa" error={errors.fecha_ingreso?.[0]} onChange={v => { setForm({ ...form, fecha_ingreso: v }); if (errors.fecha_ingreso) setErrors(prev => ({ ...prev, fecha_ingreso: undefined })) }} />
              <Campo
                label="Correo electrónico"
                value={form.email}
                placeholder="ejemplo@correo.com"
                error={errors.email?.[0]}
                onChange={v => {
                  setForm({ ...form, email: v })
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                }}
                type="email"
              />

              <FormDropdown
                label="Horario Asignado"
                required
                placeholder="Seleccionar horario..."
                searchable
                options={[
                  { value: '', label: 'Seleccionar horario...' },
                  ...horarios.map(h => ({
                    value: String(h.id),
                    label: `${h.nombre} (${formatHora(h.hora_inicio)} - ${formatHora(h.hora_fin)})`
                  }))
                ]}
                value={form.horario_id}
                error={errors.horario_id?.[0]}
                onChange={val => {
                  setForm({ ...form, horario_id: val })
                  if (errors.horario_id) setErrors(prev => ({ ...prev, horario_id: undefined }))
                }}
              />

              <FormDropdown
                label="Cinta"
                required
                searchable
                placeholder="Seleccionar cinta..."
                options={[
                  { value: '', label: 'Seleccionar cinta...' },
                  ...cintasConfig.map(c => ({
                    value: String(c.id),
                    label: c.nombre_nivel
                  }))
                ]}
                value={form.configuracion_cinta_id}
                error={errors.configuracion_cinta_id?.[0]}
                onChange={val => {
                  setForm({ ...form, configuracion_cinta_id: val })
                  if (errors.configuracion_cinta_id) setErrors(prev => ({ ...prev, configuracion_cinta_id: undefined }))
                }}
              />

              <FormDropdown
                label="Estatus"
                options={[
                  { value: 'activo', label: 'Activo' },
                  { value: 'inactivo', label: 'Inactivo' }
                ]}
                value={form.estatus}
                onChange={val => setForm({ ...form, estatus: val })}
              />

              <div style={s.campoGroup}>
                <label style={s.label}>Día de pago (1-31)</label>
                <input
                  style={s.input}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  max="31"
                  value={form.dia_pago || ''}
                  placeholder="Ej. 1"
                  onChange={e => {
                    let val = e.target.value === '' ? '' : parseInt(e.target.value);
                    if (val !== '' && val > 31) val = 31;
                    if (val !== '' && val < 1) val = 1;
                    setForm({ ...form, dia_pago: val });
                  }}
                />
              </div>
            </div>

            <div style={s.modalFooter}>
              <button
                type="button"
                style={s.btnSecondary}
                onClick={cerrar}
                disabled={guardando}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                  e.currentTarget.style.borderColor = 'var(--border-hover)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.transform = 'none'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={{
                  ...s.btnPrimary,
                  opacity: guardando ? 0.75 : 1,
                  cursor: guardando ? 'not-allowed' : 'pointer'
                }}
                onClick={guardar}
                disabled={guardando}
                onMouseEnter={e => {
                  if (!guardando) {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.45)'
                  }
                }}
                onMouseLeave={e => {
                  if (!guardando) {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'var(--shadow-glow-blue)'
                  }
                }}
              >
                {guardando ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Crear alumno')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div style={s.infoItem}>
      <span style={s.infoLabel}>{label}:</span>
      <span style={s.infoValue}>{value}</span>
    </div>
  )
}

function Campo({ label, value, onChange, type = 'text', full, error, required, placeholder, inputMode, pattern }) {
  return (
    <div style={full ? { gridColumn: '1 / -1', minWidth: 0, width: '100%' } : { minWidth: 0, width: '100%' }}>
      <label style={s.label}>
        {label} {required ? <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span> : null}
      </label>
      <input
        style={{
          ...s.input,
          border: error ? '1px solid #ef4444' : s.input.border,
          boxShadow: error ? '0 0 0 3px rgba(239,68,68,.12)' : 'none',
        }}
        type={type}
        inputMode={inputMode}
        pattern={pattern}
        placeholder={placeholder || ''}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      />
      {error ? <div style={s.inputError}>{error}</div> : null}
    </div>
  )
}

function CampoFecha({ label, value, onChange, error, required, placeholder = 'dd/mm/aaaa' }) {
  const hiddenDateRef = useRef(null)

  const formatDisplay = (val) => {
    if (!val) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-')
      return `${d}/${m}/${y}`
    }
    return val
  }

  const [textVal, setTextVal] = useState(formatDisplay(value))

  useEffect(() => {
    setTextVal(formatDisplay(value))
  }, [value])

  const handleTextChange = (e) => {
    let raw = e.target.value.replace(/[^0-9/]/g, '')
    let digits = raw.replace(/\D/g, '').slice(0, 8)
    let formatted = ''
    if (digits.length <= 2) formatted = digits
    else if (digits.length <= 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
    else formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`

    setTextVal(formatted)

    if (formatted.length === 10) {
      const [d, m, y] = formatted.split('/')
      if (parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31 && parseInt(y, 10) >= 1900) {
        onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
      }
    } else if (formatted.length === 0) {
      onChange('')
    }
  }

  const openPicker = () => {
    if (hiddenDateRef.current) {
      if (typeof hiddenDateRef.current.showPicker === 'function') {
        hiddenDateRef.current.showPicker()
      } else {
        hiddenDateRef.current.focus()
        hiddenDateRef.current.click()
      }
    }
  }

  return (
    <div style={{ minWidth: 0, width: '100%', position: 'relative' }}>
      <label style={s.label}>
        {label} {required ? <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span> : null}
      </label>
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        <input
          style={{
            ...s.input,
            paddingRight: '36px',
            border: error ? '1px solid #ef4444' : s.input.border,
            boxShadow: error ? '0 0 0 3px rgba(239,68,68,.12)' : 'none',
            display: 'flex',
            alignItems: 'center',
            lineHeight: '38px',
          }}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={textVal}
          onChange={handleTextChange}
        />
        <button
          type="button"
          onClick={openPicker}
          style={{
            position: 'absolute',
            right: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            height: '28px',
            width: '28px',
            borderRadius: '6px',
            transition: 'color 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--accent-blue)'
            e.currentTarget.style.background = 'var(--accent-blue-bg)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.background = 'none'
          }}
          title="Abrir calendario"
          aria-label="Seleccionar fecha"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
        <input
          ref={hiddenDateRef}
          type="date"
          tabIndex={-1}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            width: '1px',
            height: '1px',
            bottom: 0,
            left: 0,
          }}
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value)
          }}
        />
      </div>
      {error ? <div style={s.inputError}>{error}</div> : null}
    </div>
  )
}

function FormDropdown({ label, required, options = [], value, onChange, placeholder = 'Seleccionar...', error, searchable = false }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, openUp: false })
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < 220 && rect.top > 220
      setDropdownPos({
        top: openUp ? (rect.top - 6) : (rect.bottom + 6),
        left: rect.left,
        width: rect.width,
        openUp,
      })
    }
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }

    const handleScrollOrResize = () => {
      if (open) updatePosition()
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setSearch('')
      if (searchable || options.length > 5) {
        setTimeout(() => {
          if (searchInputRef.current) searchInputRef.current.focus()
        }, 60)
      }
    }
  }, [open, searchable, options.length])

  const toggleOpen = () => {
    if (!open) {
      updatePosition()
    }
    setOpen((v) => !v)
  }

  const selectedOption = options.find((o) => String(o.value) === String(value))
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  const filteredOptions = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()) || (o.value === '' && search === ''))
    : options

  return (
    <div style={s.campoGroup}>
      <label style={s.label}>
        {label} {required ? <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span> : null}
      </label>
      <div style={{ position: 'relative', width: '100%' }}>
        <button
          ref={buttonRef}
          type="button"
          style={{
            ...s.input,
            width: '100%',
            maxWidth: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            padding: '0 10px 0 12px',
            color: (selectedOption && selectedOption.value !== '') ? '#ffffff' : 'var(--text-muted)',
            cursor: 'pointer',
            border: error ? '1px solid #ef4444' : (open ? '1px solid var(--accent-blue)' : '1px solid var(--border)'),
            boxShadow: error ? '0 0 0 3px rgba(239,68,68,.12)' : (open ? '0 0 10px rgba(59, 130, 246, 0.25)' : 'none'),
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
          onClick={toggleOpen}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              width: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
            }}
            title={displayLabel}
          >
            {displayLabel}
          </span>
          <FiChevronDown
            size={13}
            style={{
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              color: open ? 'var(--accent-blue)' : '#ffffff',
              flexShrink: 0,
            }}
          />
        </button>

        {open && createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: dropdownPos.openUp ? 'auto' : `${dropdownPos.top}px`,
              bottom: dropdownPos.openUp ? `${window.innerHeight - dropdownPos.top}px` : 'auto',
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`,
              maxHeight: '230px',
              overflowY: 'auto',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '5px',
              zIndex: 99999,
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              boxSizing: 'border-box',
            }}
          >
            {(searchable || options.length > 5) && (
              <div style={{ padding: '2px 2px 5px 2px', borderBottom: '1px solid var(--border)', marginBottom: '3px' }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="form-dropdown-search-input"
                  placeholder="Escribir para filtrar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    fontSize: '12.5px',
                    height: '32px',
                    minHeight: '32px',
                    padding: '0 8px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                      if (filteredOptions.length > 0) {
                        const targetOpt = filteredOptions.find((o) => o.value !== '') || filteredOptions[0]
                        if (targetOpt) {
                          onChange(targetOpt.value)
                          setOpen(false)
                        }
                      }
                    }
                  }}
                />
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div style={{ padding: '10px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Sin resultados
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    style={{
                      flexShrink: 0,
                      minHeight: '34px',
                      width: '100%',
                      background: isSelected ? 'var(--accent-blue-bg)' : 'transparent',
                      color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      fontWeight: isSelected ? '700' : '500',
                      fontFamily: 'Inter, sans-serif',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      boxSizing: 'border-box',
                    }}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)'
                        e.currentTarget.style.color = '#ffffff'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })
            )}
          </div>,
          document.body
        )}
      </div>
      {error ? <div style={s.inputError}>{error}</div> : null}
    </div>
  )
}

function SkeletonBlock({ w = '100%', h = 12 }) {
  return (
    <div style={{
      height: h,
      width: w,
      borderRadius: 6,
      background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--border) 50%, var(--bg-tertiary) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeletonPulse 1.5s ease-in-out infinite'
    }} />
  )
}

function SkeletonLines() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SkeletonBlock w="85%" h={13} />
      <SkeletonBlock w="60%" h={10} />
    </div>
  )
}

function SkeletonCircle({ size = 40 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--border) 50%, var(--bg-tertiary) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
      border: '2px solid var(--border)',
      flexShrink: 0,
      margin: '0 auto'
    }} />
  )
}

const s = {
  statusActivoBg: 'var(--accent-green-bg)',
  statusActivoText: 'var(--accent-green)',
  statusInactivoBg: 'var(--accent-red-bg)',
  statusInactivoText: 'var(--accent-red)',

  container: { scrollbarGutter: 'stable', paddingBottom: '40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  titulo: { fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' },
  sub: { fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' },
  barraAcciones: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '16px' },
  searchRowMobile: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px', width: '100%' },
  searchWrapperDesktop: { position: 'relative', flex: 1, maxWidth: '395px' },
  searchWrapperMobile: { position: 'relative', width: '100%' },
  searchIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' },
  search: { width: '100%', padding: '10px 16px 10px 40px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.3s ease', boxSizing: 'border-box', fontSize: '13.5px' },
  tabs: { display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)', flexShrink: 0 },
  tabsMobile: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px', width: '100%' },
  tab: { padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', minWidth: '120px', textAlign: 'center', transition: 'all 0.2s', borderRadius: '8px' },
  tabHover: { padding: '8px 16px', background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', minWidth: '120px', textAlign: 'center', transition: 'all 0.2s', borderRadius: '8px' },
  tabActiveVerde: { padding: '8px 20px', background: 'var(--accent-green)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', minWidth: '120px', textAlign: 'center', boxShadow: 'var(--shadow-glow-green)', transition: 'all 0.2s' },
  tabActiveRojo: { padding: '8px 20px', background: 'var(--accent-red)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', minWidth: '120px', textAlign: 'center', boxShadow: 'var(--shadow-glow-red)', transition: 'all 0.2s' },
  tabActiveAzul: { padding: '8px 20px', background: 'var(--accent-blue)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', minWidth: '120px', textAlign: 'center', boxShadow: 'var(--shadow-glow-blue)', transition: 'all 0.2s' },

  // Mobile segmented tabs
  tabActiveAzulMobile: { padding: '9px 4px', background: 'var(--accent-blue)', border: 'none', color: '#fff', borderRadius: '10px', fontWeight: '700', fontSize: '12.5px', textAlign: 'center', boxShadow: '0 2px 10px rgba(59, 130, 246, 0.4)', transition: 'all 0.15s ease', cursor: 'pointer' },
  tabActiveVerdeMobile: { padding: '9px 4px', background: 'var(--accent-green)', border: 'none', color: '#fff', borderRadius: '10px', fontWeight: '700', fontSize: '12.5px', textAlign: 'center', boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)', transition: 'all 0.15s ease', cursor: 'pointer' },
  tabActiveRojoMobile: { padding: '9px 4px', background: 'var(--accent-red)', border: 'none', color: '#fff', borderRadius: '10px', fontWeight: '700', fontSize: '12.5px', textAlign: 'center', boxShadow: '0 2px 10px rgba(239, 68, 68, 0.4)', transition: 'all 0.15s ease', cursor: 'pointer' },
  tabInactiveMobile: { padding: '9px 4px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '10px', fontWeight: '600', fontSize: '12.5px', textAlign: 'center', transition: 'all 0.15s ease', cursor: 'pointer' },
  tabVerdeInactiveMobile: { padding: '9px 4px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', color: 'var(--accent-green)', borderRadius: '10px', fontWeight: '600', fontSize: '12.5px', textAlign: 'center', transition: 'all 0.15s ease', cursor: 'pointer' },

  filtrosSecundarios: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap', gap: '16px' },
  filtrosSecundariosMobile: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', width: '100%' },
  filtrosGridMobile: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', width: '100%' },
  rowOrdenExportMobile: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%' },

  // Mobile export container
  exportBoxMobile: { display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '5px 8px', flexShrink: 0 },
  exportLabelMobile: { fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' },
  btnMiniExcel: { width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)', flexShrink: 0 },
  btnMiniPdf: { width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)', flexShrink: 0 },
  btnLimpiarMobile: { width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: '13px', fontWeight: '700' },

  selectFiltro: {
    padding: '9px 32px 9px 14px',
    backgroundColor: 'var(--bg-secondary)',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
    backgroundPosition: 'right 12px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '14px 14px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    outline: 'none',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    boxShadow: 'none',
  },
  btnLimpiarWrapper: { display: 'inline-block', width: '90px' },
  btnLimpiar: {
    width: '100%',
    padding: '9px 14px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    boxShadow: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  btnLimpiarHover: { background: 'var(--bg-tertiary)', borderColor: 'var(--border)' },
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
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
    boxShadow: 'none',
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
  btnExportExcel: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', },
  btnExportPdf: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)', },
  tabla: { background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', minHeight: 'auto', boxShadow: 'var(--shadow-md)' },
  tablaScroll: { width: '100%', overflowX: 'auto', overflowY: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '1000px' },
  th: { padding: '10px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', },
  td: { padding: '10px 16px', fontSize: '14px', color: 'var(--text-secondary)', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', },
  tdCenter: { padding: '32px', textAlign: 'center', color: 'var(--text-muted)' },
  fotoTabla: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' },
  fotoVacia: { width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: 'var(--accent-blue)' },
  nombreNom: { fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' },
  emailSub: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  cinta: { padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-block', textAlign: 'center', minWidth: '110px', verticalAlign: 'middle' },
  badge: { padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', },
  acciones: { display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' },
  btnVer: { background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 5px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px' },
  btnEdit: { background: 'var(--accent-blue-bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 5px', cursor: 'pointer', color: 'var(--accent-blue)', fontSize: '12px' },
  btnDel: { background: 'var(--accent-red-bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 5px', cursor: 'pointer', color: 'var(--accent-red)', fontSize: '12px' },
  btnNuevoAlumno: {
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
  btnPrimary: { background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-md)', transition: 'all 0.2s' },
  btnSecondary: { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },

  // MODAL HISTORIAL (Estilo Pagos.jsx)
  modalHistorial: { background: 'var(--bg-secondary)', borderRadius: '16px', width: '580px', maxWidth: '95vw', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' },
  modalHistorialHeader: { padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' },
  avatarSm: { width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border)', background: 'var(--bg-primary)', flexShrink: 0 },
  avatarInicialSm: { width: '100%', height: '100%', background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800' },
  drawerNombre: { fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' },
  drawerSub: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  modalHistorialContent: { padding: '28px', maxHeight: '70vh', overflowY: 'auto', background: 'var(--bg-secondary)' },
  emptyHistorial: { textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' },
  resumenHistorial: { display: 'flex', gap: '15px', marginBottom: '28px' },
  resumenHistItem: { flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  resumenLabel: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
  historialItem: { background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', transition: '0.2s' },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px' },
  historialGrado: { fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' },
  historialDetalle: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' },
  historialFecha: { fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' },
  historialLabel: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', marginTop: '2px' },

  // Dark ModalVer original structure
  modalCard: { background: 'var(--bg-secondary)', borderRadius: '11px', width: '650px', maxWidth: '95vw', border: '1px solid var(--border)' },
  cardHeader: { background: 'var(--bg-tertiary)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' },
  cardTitle: { fontSize: '18px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-primary)' },
  btnCerrarWhite: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' },
  cardBody: { padding: '30px', display: 'flex', gap: '18px', alignItems: 'flex-start' },
  avatarBox: { width: '180px', height: '220px', flexShrink: 0, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '8px' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInicialesBox: { width: '100%', height: '100%', background: 'var(--accent-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarIniciales: { fontSize: '56px', fontWeight: '700', color: 'var(--accent-blue)' },
  cardInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' },
  infoItem: { display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: '6px' },
  infoLabel: { width: '100px', fontWeight: '700', color: 'var(--text-muted)', fontSize: '15px', textAlign: 'right', marginRight: '20px' },
  infoValue: { color: 'var(--text-primary)', fontSize: '14.5px', fontWeight: '500' },
  cardFooter: { padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: '15px', background: 'var(--bg-tertiary)' },
  btnAceptar: { background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '8px 30px', borderRadius: '5px', fontWeight: '600', cursor: 'pointer' },
  btnWhatsapp: { border: '1px solid var(--accent-green)', color: 'var(--accent-green)', background: 'var(--accent-green-bg)', padding: '8px 30px', borderRadius: '5px', fontWeight: '700', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center' },
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px 20px', width: '520px', maxWidth: '94vw', maxHeight: '86vh', overflowY: 'auto', boxSizing: 'border-box', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' },
  modalTitulo: { color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', margin: 0 },
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
    transition: 'all 0.15s ease',
  },
  fotoUploadArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px', gap: '5px' },
  fotoPreviewBox: { width: '84px', height: '84px', borderRadius: '50%', border: '1.5px solid rgba(59, 130, 246, 0.25)', cursor: 'pointer', overflow: 'hidden', background: 'rgba(59, 130, 246, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
  fotoPreviewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  fotoPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  btnQuitarFoto: { background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: '11px', cursor: 'pointer', fontWeight: '600' },
  grid2: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '8px 10px', alignItems: 'start', width: '100%', boxSizing: 'border-box' },
  campoGroup: { display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%', boxSizing: 'border-box' },
  label: { display: 'flex', alignItems: 'center', minHeight: '24px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', lineHeight: 1.2, fontFamily: 'Inter, sans-serif' },
  input: { width: '100%', maxWidth: '100%', minWidth: 0, fontSize: '13.5px', height: '38px', minHeight: '38px', padding: '0 10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: '#ffffff', outline: 'none', boxSizing: 'border-box', transition: 'all 0.15s ease', colorScheme: 'dark', fontFamily: 'Inter, sans-serif' },
  inputError: { marginTop: '3px', fontSize: '11px', color: 'var(--accent-red)', lineHeight: 1.2 },
  select: { width: '100%', fontSize: '13.5px', height: '38px', padding: '0 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: '#ffffff', outline: 'none', boxSizing: 'border-box', cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'Inter, sans-serif' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' },
  btnIcon: {
    padding: '8px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    background: 'var(--bg-tertiary)',
  },
  cardsGrid: { display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '20px' },
  cardItem: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' },
  cardItemLoader: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' },

  // MOBILE CARD STYLES
  cardItemMobile: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '12px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  },
  avatarBoxMobile: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden',
    position: 'relative',
    border: '2px solid rgba(59, 130, 246, 0.25)',
  },
  avatarImgMobile: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarInicialesMobile: {
    width: '100%',
    height: '100%',
    background: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
    fontWeight: '800',
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  },
  cardNombreMobile: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '1.25',
  },
  cardSubMobile: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    marginTop: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardBadgesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '6px',
    flexWrap: 'wrap',
  },
  cintaBadgeMobile: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10.5px',
    fontWeight: '700',
    letterSpacing: '0.2px',
    display: 'inline-block',
  },
  statusBadgeMobile: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10.5px',
    fontWeight: '700',
    letterSpacing: '0.2px',
    display: 'inline-block',
  },
  cardActionsMobile: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  btnCardActionVer: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnCardActionEdit: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnCardActionDel: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
}
