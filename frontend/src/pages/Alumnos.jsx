import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useSearchParams } from 'react-router-dom'




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
  return url.replace(/\\\//g, '/')
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
}

export default function Alumnos() {
  const [alumnos, setAlumnos] = useState([])
  const [cintasConfig, setCintasConfig] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()

  // Estados de filtros — se inicializan desde la URL
  const [busqueda, setBusqueda] = useState(searchParams.get('busqueda') || '')
  const [busquedaInput, setBusquedaInput] = useState(searchParams.get('busqueda') || '')
  const [modal, setModal] = useState(false)
  const [modalVer, setModalVer] = useState(false)
  const [alumnoVer, setAlumnoVer] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [errors, setErrors] = useState({})
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [eliminarFoto, setEliminarFoto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(false)
  const [alumnoEliminar, setAlumnoEliminar] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [editando, setEditando] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [todosLosAlumnos, setTodosLosAlumnos] = useState([])
  const [rowHover, setRowHover] = useState(null)
  const [tabHover, setTabHover] = useState(null)
  const [horarios, setHorarios] = useState([]);

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

  const cargar = () => {
    setCargando(true)
    // Siempre traemos TODOS sin filtrar por estatus
    api.get('/alumnos', { params: { search: busqueda } })
      .then(res => setTodosLosAlumnos(res.data))
      .catch(() => {
        setTodosLosAlumnos([])
        toastError('No se pudieron cargar los alumnos')
      })
      .finally(() => setCargando(false))
  }

  const alternarEstatus = async (alumno) => {
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
    api.get('/configuraciones-cintas')
      .then(res => setCintasConfig(res.data))
      .catch(err => console.error("Error cargando cintas", err))
  }

  const cargarHorarios = () => {
    api.get('/horarios')
      .then(res => setHorarios(res.data))
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
    const handleEsc = (event) => {
      if (event.key === 'Escape') cerrar()
    }
    if (modal || modalVer) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [modal, modalVer])
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') cerrar()
    }
    if (modal || modalVer) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => { window.removeEventListener('keydown', handleEsc) }
  }, [modal, modalVer])

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

  const abrirVer = (a) => { setAlumnoVer(a); setModalVer(true) }

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
    if (!form.nombre_tutor?.trim()) e.nombre_tutor = ['El nombre del tutor es obligatorio.']
    if (!form.telefono_tutor?.trim()) e.telefono_tutor = ['El teléfono del tutor es obligatorio.']
    if (!form.fecha_nacimiento) e.fecha_nacimiento = ['La fecha de nacimiento es obligatoria.']
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
      cerrar()
      cargar()
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
      cargar()
    } catch (err) {
      toastError('No se pudo eliminar el alumno')
    } finally {
      setEliminandoId(null)
    }
  }

  const tieneFoto = (url) => url && typeof url === 'string' && url.length > 5

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
      case 'id': return a.id - b.id
      case 'cinta_asc': {
        const oA = a.cinta_config?.orden ?? 999
        const oB = b.cinta_config?.orden ?? 999
        return oA - oB
      }
      case 'cinta_desc': {
        const oA = a.cinta_config?.orden ?? 999
        const oB = b.cinta_config?.orden ?? 999
        return oB - oA
      }
      case 'edad_asc': return a.edad - b.edad
      case 'edad_desc': return b.edad - a.edad
      case 'horario_asc': return (a.horarioConfig?.nombre || '').localeCompare(b.horarioConfig?.nombre || '')
      default: return a.id - b.id
    }
  })

  const hayFiltrosActivos = cintaFiltro || edadFiltro || horarioFiltro || orden !== 'id'

  const exportarExcel = () => {
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
      const data = alumnosMostrados.map(a => ({
        ID: a.id,
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
      XLSX.writeFile(wb, `Lista_Alumnos_${new Date().toISOString().split('T')[0]}.xlsx`)
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

  const exportarPDF = () => {
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
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.setTextColor(20, 30, 40)
      doc.text("Reporte de Alumnos - TKD Tigres", 14, 20)

      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28)
      doc.text(`Total de alumnos listados: ${alumnosMostrados.length}`, 14, 34)

      const tableColumn = ["ID", "Nombre Alumno", "Edad", "Cinta", "Teléfono Tutor", "Estatus"]
      const tableRows = alumnosMostrados.map(a => [
        a.id || '-',
        `${limpiarDato(a.nombre)} ${limpiarDato(a.apellido_paterno)} ${limpiarDato(a.apellido_materno)}`,
        `${a.edad || 0} años`,
        a.cinta_config?.nombre_nivel || 'Sin cinta',
        limpiarDato(a.telefono_tutor),
        capitalizar(a.estatus || 'activo')
      ])

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8 },
        columnStyles: {
          1: { cellWidth: 60 }
        }
      })

      doc.save(`Reporte_Alumnos_${new Date().toISOString().split('T')[0]}.pdf`)
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
        <button
          style={s.btnNuevoAlumno}
          onClick={abrirCrear}
          onMouseOver={e => handleHover(e, 'rgba(59, 130, 246, 0.6)')}
          onMouseOut={e => handleOut(e, 'rgba(59, 130, 246, 0.4)')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nuevo alumno
        </button>
      </div>

      <div style={s.barraAcciones}>
        <input
          style={s.search}
          placeholder="Buscar por nombre..."
          value={busquedaInput}
          onChange={e => setBusquedaInput(e.target.value)}
        />
        {/* Contador de resultados */}
        {!cargando && (
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
        <div style={s.tabs}>
          <button
            style={estatusFiltro === 'todos' ? s.tabActiveAzul : (tabHover === 'todos' ? s.tabHover : s.tab)}
            onClick={() => setEstatusFiltro('todos')}
            onMouseEnter={() => setTabHover('todos')}
            onMouseLeave={() => setTabHover(null)}
          >
            Todos ({cargando ? '--' : totalTodos})
          </button>
          <button
            style={estatusFiltro === 'activo' ? s.tabActiveVerde : (tabHover === 'activo' ? s.tabHover : s.tab)}
            onClick={() => setEstatusFiltro('activo')}
            onMouseEnter={() => setTabHover('activo')}
            onMouseLeave={() => setTabHover(null)}
          >
            Activos ({cargando ? '--' : totalActivos})
          </button>
          <button
            style={estatusFiltro === 'inactivo' ? s.tabActiveRojo : (tabHover === 'inactivo' ? s.tabHover : s.tab)}
            onClick={() => setEstatusFiltro('inactivo')}
            onMouseEnter={() => setTabHover('inactivo')}
            onMouseLeave={() => setTabHover(null)}
          >
            Inactivos ({cargando ? '--' : totalInactivos})
          </button>
        </div>
      </div>

      <div style={s.filtrosSecundarios}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select 
            style={{ ...s.selectFiltro, width: '150px' }} 
            value={cintaFiltro} 
            onChange={e => setCintaFiltro(e.target.value)}
          >
            <option value="">Todas las cintas</option>
            {cintasConfig.map(c => <option key={c.id} value={c.id}>{c.nombre_nivel}</option>)}
          </select>

          <select style={{ ...s.selectFiltro, width: '150px' }} value={edadFiltro} onChange={e => setEdadFiltro(e.target.value)}>
            <option value="">Todas las edades</option>
            <option value="infantil">Infantil (3-11)</option>
            <option value="cadete">Cadete (12-14)</option>
            <option value="juvenil">Juvenil (15-17)</option>
            <option value="adultos">Adultos (+18)</option>
          </select>

          <select style={{ ...s.selectFiltro, width: '160px' }} value={horarioFiltro} onChange={e => setHorarioFiltro(e.target.value)}>
            <option value="">Todos los horarios</option>
            {horarios.map(h => (
              <option key={h.id} value={h.id}>{h.nombre} ({formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)})</option>
            ))}
          </select>

          <select style={{ ...s.selectFiltro, width: '160px' }} value={orden} onChange={e => setOrden(e.target.value)}>
            <option value="id">Ordenar por ID</option>
            <option value="cinta_desc">Cinta (Mayor a menor)</option>
            <option value="cinta_asc">Cinta (Menor a mayor)</option>
            <option value="edad_asc">Edad (Menor a mayor)</option>
            <option value="edad_desc">Edad (Mayor a menor)</option>
            <option value="horario_asc">Horario (Temprano a tarde)</option>
          </select>

          <div style={{ ...s.btnLimpiarWrapper, visibility: (cintaFiltro || edadFiltro || horarioFiltro || orden !== 'id' || busqueda) ? 'visible' : 'hidden' }}>
            <button
              style={s.btnLimpiar}
              onClick={() => { setCintaFiltro(''); setEdadFiltro(''); setHorarioFiltro(''); setOrden('id'); setBusquedaInput(''); setBusqueda('') }}
            >
              ↻ Limpiar
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button style={s.btnExportExcel} onClick={exportarExcel}
            onMouseOver={e => handleHover(e, 'rgba(16, 185, 129, 0.5)')}
            onMouseOut={e => handleOut(e, 'rgba(16, 185, 129, 0.3)')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Excel
          </button>
          <button style={s.btnExportPdf} onClick={exportarPDF}
            onMouseOver={e => handleHover(e, 'rgba(239, 68, 68, 0.5)')}
            onMouseOut={e => handleOut(e, 'rgba(239, 68, 68, 0.3)')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path></svg>
            PDF
          </button>
        </div>
      </div>

      {/* Skeleton pulse animation */}
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
              <col style={{ width: '65px' }} />  {/* Foto */}
              <col style={{ width: '260px' }} /> {/* Alumno */}
              <col style={{ width: '90px' }} /> {/* Edad */}
              <col style={{ width: '150px' }} /> {/* Cinta */}
              <col style={{ width: '130px' }} /> {/* Teléfono */}
              <col style={{ width: '110px' }} /> {/* Estatus */}
              <col style={{ width: '150px' }} /> {/* Acciones */}
            </colgroup>
            <thead>
              {/* Reemplaza el <tr> de los títulos por este: */}
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
                alumnosMostrados.map(a => (
                  <tr
                    key={a.id}
                    style={{
                      ...s.tr,
                      background: rowHover === a.id ? '#1a1d2e' : 'transparent',
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

                    {/* ALUMNO: ALINEADO A LA IZQUIERDA */}
                    <td style={{ ...s.td, textAlign: 'left' }}>
                      <div
                        style={{
                          ...s.nombreNom,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '240px'
                        }}
                        title={`${a.nombre} ${a.apellido_paterno} ${a.apellido_materno}`}
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
                        ID: {a.id} {a.email && a.email !== 'NULL' && a.email !== 'null' && (
                          <span style={{ opacity: 0.5 }}> | {a.email}</span>
                        )}
                      </div>
                    </td>

                    <td style={s.td}>{a.edad} años</td>

                    {/* CINTA: CENTRADA CON BADGE */}
                    <td style={s.td}>
                      <span style={{
                        ...s.cinta,
                        background: a.cinta_config?.color_hex || '#334155',
                        color: a.cinta_config?.color_texto || '#fff',
                        display: 'inline-block',
                        minWidth: '100px',
                        textAlign: 'center'
                      }}>
                        {a.cinta_config?.nombre_nivel || 'Sin cinta'}
                      </span>
                    </td>

                    <td style={s.td}>{a.telefono_tutor || '-'}</td>

                    <td style={s.td}>
                      <span
                        onClick={() => alternarEstatus(a)}
                        style={{
                          ...s.badge,
                          background: a.estatus === 'activo' ? s.statusActivoBg : s.statusInactivoBg,
                          color: a.estatus === 'activo' ? s.statusActivoText : s.statusInactivoText,
                          cursor: 'pointer',
                          userSelect: 'none'
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
                          onClick={() => abrirVer(a)}
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
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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

      {modalVer && alumnoVer && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>
                {alumnoVer.nombre} {alumnoVer.apellido_paterno} {alumnoVer.apellido_materno}
              </h3>
              <button style={s.btnCerrarWhite} onClick={cerrar}>X</button>
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

      {/* Deletion modal replaced by Swal.fire */}

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitulo}>{editando ? 'Editar alumno' : 'Nuevo alumno'}</h3>
              <button style={s.btnCerrar} onClick={cerrar}>X</button>
            </div>

            <div style={s.fotoUploadArea}>
              <div style={s.fotoPreviewBox} onClick={() => fileRef.current.click()}>
                {fotoPreview ? (
                  <img src={fotoPreview} alt="preview" style={s.fotoPreviewImg} />
                ) : (
                  <div style={s.fotoPlaceholder}>
                    {/*/Icono SVG*/}
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></svg>
                    <span style={{ fontSize: '22px', color: '#3b82f6', fontWeight: '700' }}>
                      {form.nombre || form.apellido_paterno
                        ? obtenerIniciales(form.nombre, form.apellido_paterno)
                        : '+'
                      }
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                      {form.nombre ? 'Agregar foto' : 'Foto'}
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
                  style={s.btnQuitarFoto}
                  onClick={() => { setFotoFile(null); setFotoPreview(null); setEliminarFoto(true) }}
                >
                  Quitar foto
                </button>
              )}
            </div>

            <div style={s.grid2}>
              <Campo label="Nombre(s)" value={form.nombre} error={errors.nombre?.[0]} required onChange={v => { setForm({ ...form, nombre: v }); if (errors.nombre) setErrors(prev => ({ ...prev, nombre: undefined })) }} />
              <Campo label="Apellido paterno" value={form.apellido_paterno} error={errors.apellido_paterno?.[0]} required onChange={v => { setForm({ ...form, apellido_paterno: v }); if (errors.apellido_paterno) setErrors(prev => ({ ...prev, apellido_paterno: undefined })) }} />
              <Campo label="Apellido materno" value={form.apellido_materno} error={errors.apellido_materno?.[0]} required onChange={v => { setForm({ ...form, apellido_materno: v }); if (errors.apellido_materno) setErrors(prev => ({ ...prev, apellido_materno: undefined })) }} />
              <Campo label="Fecha de nacimiento" value={form.fecha_nacimiento} error={errors.fecha_nacimiento?.[0]} required onChange={v => { setForm({ ...form, fecha_nacimiento: v }); if (errors.fecha_nacimiento) setErrors(prev => ({ ...prev, fecha_nacimiento: undefined })) }} type="date" />
              <Campo label="Nombre del tutor" value={form.nombre_tutor} error={errors.nombre_tutor?.[0]} required onChange={v => { setForm({ ...form, nombre_tutor: v }); if (errors.nombre_tutor) setErrors(prev => ({ ...prev, nombre_tutor: undefined })) }} />
              <Campo label="Teléfono del tutor" value={form.telefono_tutor} error={errors.telefono_tutor?.[0]} required onChange={v => { setForm({ ...form, telefono_tutor: v }); if (errors.telefono_tutor) setErrors(prev => ({ ...prev, telefono_tutor: undefined })) }} />
              <Campo label="Correo electrónico" value={form.email} error={errors.email?.[0]} onChange={v => { setForm({ ...form, email: v }); if (errors.email) setErrors(prev => ({ ...prev, email: undefined })) }} type="email" full />

              <div style={s.campoGroup}>
  <label style={s.label}>Horario Asignado</label>
  <select
    style={s.select}
    value={form.horario_id}
    onChange={e => setForm({ ...form, horario_id: e.target.value })}
  >
    <option value="">Seleccionar horario...</option>
    
    {/* Conexión por ID */}
    {horarios.map((h) => (
      <option key={h.id} value={h.id}>
        {h.nombre} ({formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)})
      </option>
    ))}
    
  </select>
</div>
              <div style={s.campoGroup}>
                <label style={s.label}>Cinta</label>
                <select style={s.select} value={form.configuracion_cinta_id} onChange={e => setForm({ ...form, configuracion_cinta_id: e.target.value })}>
                  <option value="">Seleccionar cinta...</option>
                  {cintasConfig.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre_nivel}</option>
                  ))}
                </select>
              </div>

              <div style={s.campoGroup}>
                <label style={s.label}>Estatus</label>
                <select style={s.select} value={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.value })}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={cerrar} disabled={guardando}>Cancelar</button>
              <button
                style={{ ...s.btnPrimary, opacity: guardando ? 0.75 : 1, cursor: guardando ? 'not-allowed' : 'pointer' }}
                onClick={guardar}
                disabled={guardando}
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

function Campo({ label, value, onChange, type = 'text', full, error, required }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : {}}>
      <label style={s.label}>
        {label} {required ? <span style={{ color: '#f87171' }}>*</span> : null}
      </label>
      <input
        style={{
          ...s.input,
          border: error ? '1px solid #ef4444' : s.input.border,
          boxShadow: error ? '0 0 0 3px rgba(239,68,68,.12)' : 'none',
        }}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
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
      background: 'linear-gradient(90deg, #1e2130 25%, #2a2f45 50%, #1e2130 75%)',
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
      background: 'linear-gradient(90deg, #13151f 25%, #1e2130 50%, #13151f 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
      border: '2px solid #1e2130',
      flexShrink: 0,
      margin: '0 auto'
    }} />
  )
}

const s = {
  statusActivoBg: '#14532d',
  statusActivoText: '#4ade80',
  statusInactivoBg: '#450a0a',
  statusInactivoText: '#f87171',

  container: { scrollbarGutter: 'stable', paddingBottom: '40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  titulo: { fontSize: '24px', fontWeight: '700', color: '#f1f5f9' },
  sub: { fontSize: '15px', color: '#64748b', marginTop: '2px' },
  barraAcciones: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '16px' },
  search: { flex: 1, maxWidth: '395px', padding: '10px 16px', background: '#13151f', border: '1px solid #1e2130', borderRadius: '80px', color: '#e2e8f0', outline: 'none', transition: 'all 0.3s ease' },
  tabs: { display: 'flex', background: '#13151f', padding: '4px', borderRadius: '10px', border: '1px solid #1e2130', flexShrink: 0 },
  tab: { padding: '8px 16px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', minWidth: '120px', textAlign: 'center', transition: 'all 0.2s', borderRadius: '8px' },
  tabHover: { padding: '8px 16px', background: 'rgba(255,255,255,0.03)', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', minWidth: '120px', textAlign: 'center', transition: 'all 0.2s', borderRadius: '8px' },
  tabActiveVerde: { padding: '8px 20px', background: 'linear-gradient(135deg, #14532d, #059669)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', minWidth: '120px', textAlign: 'center', boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)', transition: 'all 0.2s' },
  tabActiveRojo: { padding: '8px 20px', background: 'linear-gradient(135deg, #450a0a, #ef4444)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', minWidth: '120px', textAlign: 'center', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s' },
  tabActiveAzul: { padding: '8px 20px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', minWidth: '120px', textAlign: 'center', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s' },
  filtrosSecundarios: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap', gap: '16px' },
  selectFiltro: { padding: '10px 14px', background: '#13151f', border: '1px solid #1e2130', borderRadius: '12px', color: '#cbd5e1', outline: 'none', fontSize: '13px', cursor: 'pointer', minWidth: '150px', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
  btnLimpiarWrapper: { display: 'inline-block', width: '90px' },
  btnLimpiar: { width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', },
  btnLimpiarHover: { background: 'rgba(255,255,255,0.1)', borderColor: '#475569' },
  btnExportExcel: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', },
  btnExportPdf: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)', },
  tabla: { background: '#13151f', borderRadius: '16px', border: '1px solid #1e2130', overflow: 'hidden', minHeight: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' },
  tablaScroll: { width: '100%', overflowX: 'auto', overflowY: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '1000px' },
  th: { padding: '10px 16px', textAlign: 'center', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #1e2130', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', },
  td: { padding: '10px 16px', fontSize: '14px', color: '#cbd5e1', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', },
  tdCenter: { padding: '32px', textAlign: 'center', color: '#475569' },
  fotoTabla: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #1e2130' },
  fotoVacia: { width: '40px', height: '40px', borderRadius: '50%', background: '#1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#60a5fa' },
  nombreNom: { fontWeight: '600', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis' },
  emailSub: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  cinta: { padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-block', minWidth: '100px' },
  badge: { padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', },
  acciones: { display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' },
  btnVer: { background: 'rgba(148, 163, 184, 0.1)', border: '1px solid #1e2130', borderRadius: '6px', padding: '5px 5px', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', boxShadow: '0 4px 4px rgba(248, 250, 252, 0.4)', },
  btnEdit: { background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #1e2130', borderRadius: '6px', padding: '5px 5px', cursor: 'pointer', color: '#60a5fa', fontSize: '12px', boxShadow: '0 4px 4px rgba(59, 130, 246, 0.4)', },
  btnDel: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #1e2130', borderRadius: '6px', padding: '5px 5px', cursor: 'pointer', color: '#f87171', fontSize: '12px', boxShadow: '0 4px 4px rgba(239, 68, 68, 0.4)', },
  btnNuevoAlumno: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.4)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' },
  btnPrimary: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s' },
  btnSecondary: { background: '#0f1117', color: '#94a3b8', border: '1px solid #1e2130', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(5, 5, 10, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' },

  // Dark ModalVer original structure
  modalCard: { background: '#13151f', borderRadius: '11px', width: '650px', maxWidth: '95vw', overflow: 'hidden', border: '1px solid #1e2130' },
  cardHeader: { background: '#0d3b5c', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '10px', borderTopRightRadius: '10px' },
  cardTitle: { fontSize: '18px', fontWeight: '600', textTransform: 'uppercase', color: '#fff' },
  btnCerrarWhite: { background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' },
  cardBody: { padding: '30px', display: 'flex', gap: '18px', alignItems: 'flex-start' },
  avatarBox: { width: '180px', height: '220px', flexShrink: 0, border: '1px solid #1e2130', overflow: 'hidden', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '8px' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInicialesBox: { width: '100%', height: '100%', background: '#1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarIniciales: { fontSize: '56px', fontWeight: '700', color: '#60a5fa' },
  cardInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' },
  infoItem: { display: 'flex', borderBottom: '1px solid #1e2130', paddingBottom: '6px' },
  infoLabel: { width: '100px', fontWeight: '700', color: '#64748b', fontSize: '15px', textAlign: 'right', marginRight: '20px' },
  infoValue: { color: '#cbd5e1', fontSize: '14.5px', fontWeight: '500' },
  cardFooter: { padding: '20px', borderTop: '1px solid #1e2130', display: 'flex', justifyContent: 'center', gap: '15px', background: '#0f1117' },
  btnAceptar: { background: '#1e2130', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 30px', borderRadius: '5px', fontWeight: '600', cursor: 'pointer' },
  btnWhatsapp: { border: '1px solid #166534', color: '#4ade80', background: '#14532d', padding: '8px 30px', borderRadius: '5px', fontWeight: '700', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center' },
  modal: { background: '#13151f', border: '5px solid #1e2130', borderRadius: '16px', padding: '28px', width: '580px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  modalTitulo: { color: '#f1f5f9', fontSize: '18px', fontWeight: '700' },
  btnCerrar: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' },
  fotoUploadArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', gap: '8px' },
  fotoPreviewBox: { width: '100px', height: '100px', borderRadius: '50%', border: '2px dashed #334155', cursor: 'pointer', overflow: 'hidden', background: '#1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fotoPreviewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  fotoPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  btnQuitarFoto: { background: 'none', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  campoGroup: { marginTop: '1px' },
  label: { display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' },
  input: { width: '100%', fontSize: '14px', padding: '9px 12px', background: '#0f1117', border: '1px solid #1e2130', borderRadius: '8px', color: '#e2e8f0', outline: 'none' },
  inputError: { marginTop: '6px', fontSize: '12px', color: '#f87171', lineHeight: 1.2 },
  select: { width: '100%', padding: '9px 12px', background: '#0f1117', border: '1px solid #1e2130', borderRadius: '8px', color: '#e2e8f0', outline: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #1e2130', paddingTop: '20px' },
  btnIcon: {
    padding: '8px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    background: 'rgba(255, 255, 255, 0.05)',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', // Azul degradado
  },
}
