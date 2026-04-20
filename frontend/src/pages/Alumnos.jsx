import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const CINTAS = [
  'blanca', 'blanca_avanzada', 'amarilla', 'amarilla_avanzada',
  'naranja', 'naranja_avanzada', 'verde', 'verde_avanzada',
  'azul', 'azul_avanzada', 'marrón', 'marrón_avanzada',
  'roja', 'roja_avanzada', 'negra'
]


const COLOR_CINTA = {
  blanca: '#e2e8f0', blanca_avanzada: '#cbd5e1',
  amarilla: '#ff9204ff', amarilla_avanzada: '#ff9204ff',
  naranja: '#fc770aff', naranja_avanzada: '#fc770aff',
  verde: '#015520ff', verde_avanzada: '#015520ff',
  azul: '#003575ff', azul_avanzada: '#003575ff',
  marrón: '#8b45136c', marrón_avanzada: '#8b45136c',
  roja: '#ff0000c5', roja_avanzada: '#ff0000c5',
  negra: '#1e293b',
}

const limpiarDato = (val) => {
  if (val === null || val === undefined || val === 'null' || val === 'NULL' || val === '') return '-'
  return typeof val === 'string' ? val.trim() : val
}

const capitalizar = (str) =>
  str ? str.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : ''

const obtenerIniciales = (nombre, apellido) => {
  if (!nombre) return '?'
  const n = limpiarDato(nombre).charAt(0)
  const a = apellido ? limpiarDato(apellido).charAt(0) : ''
  return (n + a).toUpperCase()
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
  cinta: 'blanca',
  horario: '', // Nuevo campo
  estatus: 'activo',
}

export default function Alumnos() {
  const [alumnos, setAlumnos] = useState([])
  const [busqueda, setBusqueda] = useState('')
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
  const [estatusFiltro, setEstatusFiltro] = useState('activo')

  // Nuevos estados para filtros y orden
  const [cintaFiltro, setCintaFiltro] = useState('')
  const [edadFiltro, setEdadFiltro] = useState('')
  const [horarioFiltro, setHorarioFiltro] = useState('')
  const [orden, setOrden] = useState('id')

  const [totales, setTotales] = useState({ activo: '--', inactivo: '--' })
  const fileRef = useRef()

  const cargar = () => {
    setCargando(true)
    const params = { search: busqueda }
    if (estatusFiltro !== 'todos') params.estatus = estatusFiltro

    api.get('/alumnos', { params })
      .then(res => {
        setAlumnos(res.data)

        // Sincronización inteligente de totales en cada carga
        const act = res.data.filter(a => a.estatus === 'activo').length
        const ina = res.data.filter(a => a.estatus === 'inactivo').length
        setTotales({ activo: act, inactivo: ina, todos: res.data.length })
      })
      .catch(() => {
        setAlumnos([])
        toastError('No se pudieron cargar los alumnos')
      })
      .finally(() => setCargando(false))
  }

  const alternarEstatus = async (alumno) => {
    try {
      await api.patch(`/alumnos/${alumno.id}/toggle-estatus`)
      toastSuccess("Estatus actualizado")
      cargar()
    } catch (err) {
      toastError("No se pudo cambiar el estatus")
    }
  };

  useEffect(() => { cargar() }, [busqueda, estatusFiltro])

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

      // IMPORTANTE: Asegúrate de usar 'cinta' (que es lo que usa tu array CINTAS)
      cinta: alumno.cinta || 'blanca',
      horario: alumno.horario || '',
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

      // Agregamos todos los campos de texto, permitiendo strings vacíos (Laravel los hará null)
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined && k !== 'foto_url' && k !== 'foto' && k !== 'id' && k !== 'edad') {
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
  const horariosUnicos = [...new Set(alumnos.map(a => a.horario).filter(Boolean))].sort()
  let alumnosMostrados = [...alumnos]

  // Filtros
  if (cintaFiltro) alumnosMostrados = alumnosMostrados.filter(a => a.cinta === cintaFiltro)
  if (horarioFiltro) alumnosMostrados = alumnosMostrados.filter(a => a.horario === horarioFiltro)
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

  // Ordenamiento
  alumnosMostrados.sort((a, b) => {
    switch (orden) {
      case 'id': return a.id - b.id
      case 'cinta_asc': return CINTAS.indexOf(a.cinta) - CINTAS.indexOf(b.cinta)
      case 'cinta_desc': return CINTAS.indexOf(b.cinta) - CINTAS.indexOf(a.cinta)
      case 'edad_asc': return a.edad - b.edad
      case 'edad_desc': return b.edad - a.edad
      case 'horario_asc': return (a.horario || '').localeCompare(b.horario || '')
      default: return a.id - b.id
    }
  })
  // ----------------------------------------------

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
        Cinta: capitalizar(a.cinta || 'blanca'),
        Teléfono: limpiarDato(a.telefono_tutor),
        Estatus: capitalizar(a.estatus || 'activo'),
        Horario: limpiarDato(a.horario)
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
        capitalizar(a.cinta || 'blanca'),
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
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)'; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nuevo alumno
        </button>
      </div>

      <div style={s.barraAcciones}>
        <input
          style={s.search}
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <div style={s.tabs}>
          <button
            style={estatusFiltro === 'todos' ? s.tabActiveAzul : s.tab}
            onClick={() => setEstatusFiltro('todos')}
          >
            Todos ({cargando && estatusFiltro === 'todos' ? '--' : (estatusFiltro === 'todos' ? alumnos.length : (totales.todos || '--'))})
          </button>
          <button
            style={estatusFiltro === 'activo' ? s.tabActiveVerde : s.tab}
            onClick={() => setEstatusFiltro('activo')}
          >
            Activos ({cargando && estatusFiltro === 'activo' ? '--' : (estatusFiltro === 'activo' ? alumnos.length : totales.activo)})
          </button>
          <button
            style={estatusFiltro === 'inactivo' ? s.tabActiveRojo : s.tab}
            onClick={() => setEstatusFiltro('inactivo')}
          >
            Inactivos ({cargando && estatusFiltro === 'inactivo' ? '--' : (estatusFiltro === 'inactivo' ? alumnos.length : totales.inactivo)})
          </button>
        </div>
      </div>

      <div style={s.filtrosSecundarios}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select style={{ ...s.selectFiltro, width: '150px' }} value={cintaFiltro} onChange={e => setCintaFiltro(e.target.value)}>
            <option value="">Todas las cintas</option>
            {CINTAS.map(c => <option key={c} value={c}>{capitalizar(c)}</option>)}
          </select>

          <select style={{ ...s.selectFiltro, width: '140px' }} value={edadFiltro} onChange={e => setEdadFiltro(e.target.value)}>
            <option value="">Todas las edades</option>
            <option value="infantil">Infantil (3-11)</option>
            <option value="cadete">Cadete (12-14)</option>
            <option value="juvenil">Juvenil (15-17)</option>
            <option value="adultos">Adultos (+18)</option>
          </select>

          <select style={{ ...s.selectFiltro, width: '160px' }} value={horarioFiltro} onChange={e => setHorarioFiltro(e.target.value)}>
            <option value="">Todos los horarios</option>
            {horariosUnicos.map(h => <option key={h} value={h}>{h}</option>)}
          </select>

          <select style={{ ...s.selectFiltro, width: '160px' }} value={orden} onChange={e => setOrden(e.target.value)}>
            <option value="id">Ordenar por ID</option>
            <option value="cinta_desc">Cinta (Mayor a menor)</option>
            <option value="cinta_asc">Cinta (Menor a mayor)</option>
            <option value="edad_asc">Edad (Menor a mayor)</option>
            <option value="edad_desc">Edad (Mayor a menor)</option>
            <option value="horario_asc">Horario (Temprano a tarde)</option>
          </select>

          <div style={{ ...s.btnLimpiarWrapper, visibility: (cintaFiltro || edadFiltro || horarioFiltro || orden !== 'id') ? 'visible' : 'hidden' }}>
            <button
              style={s.btnLimpiar}
              onClick={() => { setCintaFiltro(''); setEdadFiltro(''); setHorarioFiltro(''); setOrden('id') }}
            >
              ↻ Limpiar
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button style={s.btnExportExcel} onClick={exportarExcel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Excel
          </button>
          <button style={s.btnExportPdf} onClick={exportarPDF}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path></svg>
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
                  <tr key={i} style={s.tr}>
                    <td style={s.td}><SkeletonCircle /></td>
                    <td style={{ ...s.td, textAlign: 'left' }}><SkeletonLines /></td>
                    <td style={s.td}><SkeletonBlock w="40px" /></td>
                    <td style={s.td}><SkeletonBlock w="100px" h={24} /></td>
                    <td style={s.td}><SkeletonBlock w="90px" /></td>
                    <td style={s.td}><SkeletonBlock w="80px" h={24} /></td>
                    <td style={s.td}>
                      <div style={s.acciones}>
                        <SkeletonBlock w={35} h={32} />
                        <SkeletonBlock w={35} h={32} />
                        <SkeletonBlock w={35} h={32} />
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
                  <tr key={a.id} style={s.tr}>
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
                        background: COLOR_CINTA[a.cinta] || '#334155',
                        color: a.cinta && a.cinta.includes('blanca') ? '#0f172a' : '#fff',
                        display: 'inline-block',
                        minWidth: '100px',
                        textAlign: 'center'
                      }}>
                        {capitalizar(a.cinta)}
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
                        <button
                          style={{ ...s.btnIcon, background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8' }}
                          onClick={() => abrirVer(a)}
                          title="Ver"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>

                        <button
                          style={{ ...s.btnIcon, background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}
                          onClick={() => abrirEditar(a)}
                          title="Editar"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>

                        <button
                          style={{ ...s.btnIcon, background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}
                          onClick={() => abrirEliminar(a)}
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
                <InfoItem label="Cinta" value={capitalizar(alumnoVer.cinta)} />
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
                  value={form.horario}
                  onChange={e => setForm({ ...form, horario: e.target.value })}
                >
                  <option value="">Seleccionar horario...</option>
                  <option value="Horario 1">Horario 1 (4:00 PM - 5:00 PM)</option>
                  <option value="Horario 2">Horario 2 (5:00 PM - 6:00 PM)</option>
                  <option value="Horario 3">Horario 3 (6:00 PM - 7:15 PM)</option>
                  <option value="Horario Tigres Do">Horario Tigres Do (5:00 PM - 6:00 PM)</option>

                </select>
              </div>
              <div style={s.campoGroup}>
                <label style={s.label}>Cinta</label>
                <select style={s.select} value={form.cinta} onChange={e => setForm({ ...form, cinta: e.target.value })}>
                  {CINTAS.map(c => (
                    <option key={c} value={c}>{capitalizar(c)}</option>
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

function SkeletonCircle() {
  return (
    <div style={{
      width: 36,
      height: 36,
      borderRadius: 999,
      background: 'linear-gradient(90deg, #1e2130 25%, #2a2f45 50%, #1e2130 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
      border: '2px solid #111827'
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
  search: { flex: 1, maxWidth: '600px', padding: '10px 16px', background: '#13151f', border: '1px solid #1e2130', borderRadius: '80px', color: '#e2e8f0', outline: 'none' },
  tabs: { display: 'flex', background: '#13151f', padding: '4px', borderRadius: '10px', border: '1px solid #1e2130', flexShrink: 0 },
  tab: { padding: '8px 16px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', minWidth: '120px', textAlign: 'center' },
  tabActiveVerde: { padding: '8px 16px', background: '#14532d', border: 'none', color: '#4ade80', borderRadius: '8px', fontWeight: '600', fontSize: '13px', minWidth: '120px', textAlign: 'center' },
  tabActiveRojo: { padding: '8px 16px', background: '#450a0a', border: 'none', color: '#f87171', borderRadius: '8px', fontWeight: '600', fontSize: '13px', minWidth: '120px', textAlign: 'center' },
  tabActiveAzul: { padding: '8px 16px', background: '#1e3a8a', border: 'none', color: '#60a5fa', borderRadius: '8px', fontWeight: '600', fontSize: '13px', minWidth: '120px', textAlign: 'center' },
  filtrosSecundarios: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  selectFiltro: { padding: '8px 8px', background: '#0f1117', border: '1px solid #1e2130', borderRadius: '8px', color: '#cbd5e1', outline: 'none', fontSize: '13px', cursor: 'pointer', minWidth: '140px' },
  btnLimpiarWrapper: { display: 'inline-block', width: '90px' },
  btnLimpiar: { width: '100%', padding: '8px 10px', background: '#1e2130', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  btnExportExcel: { background: '#065f46', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', whiteSpace: 'nowrap' },
  btnExportPdf: { background: '#991b1b', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', whiteSpace: 'nowrap' },
  tabla: { background: '#13151f', borderRadius: '12px', border: '1px solid #1e2130', overflow: 'hidden', minHeight: '400px' },
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
  btnVer: { background: '#0f172a', border: '1px solid #1e2130', borderRadius: '6px', padding: '5px 5px', cursor: 'pointer', color: '#94a3b8', fontSize: '12px' },
  btnEdit: { background: '#1e2d4a', border: 'none', borderRadius: '6px', padding: '5px 5px', cursor: 'pointer', color: '#60a5fa', fontSize: '12px' },
  btnDel: { background: '#2d1515', border: 'none', borderRadius: '6px', padding: '5px 5px', cursor: 'pointer', color: '#f87171', fontSize: '12px' },
  btnNuevoAlumno: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' },
  btnPrimary: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary: { background: '#1e2130', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },

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
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    background: 'rgba(255, 255, 255, 0.05)',
  },
}