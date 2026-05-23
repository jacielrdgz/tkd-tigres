import React, { useEffect, useCallback, useState, useMemo } from 'react'
import { useBlocker, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import Swal from 'sweetalert2'
import { toast } from 'react-toastify'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const SkeletonCircle = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', animation: 'skeletonPulse 1.5s infinite ease-in-out', margin: '0 auto' }} />
)
const SkeletonBlock = ({ w, h }) => (
  <div style={{ width: w, height: h, borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', animation: 'skeletonPulse 1.5s infinite ease-in-out', margin: '0 auto' }} />
)

const formatHora = (hora) => {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hrs = parseInt(h)
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  const h12 = hrs % 12 || 12
  return `${h12}:${m} ${ampm}`
}

const norm = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : ""
const getDiaSemana = (fechaStr) => {
  const fe = new Date(fechaStr + 'T12:00')
  const dia = fe.toLocaleDateString('es-ES', { weekday: 'long' })
  return dia.charAt(0).toUpperCase() + dia.slice(1)
}

export default function Asistencias() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [alumnos, setAlumnos] = useState([])
  const [cintasConfig, setCintasConfig] = useState([])
  const [horarios, setHorarios] = useState([])
  const [asistencias, setAsistencias] = useState({})

  // Sincronización con URL
  const [busqueda, setBusqueda] = useState(searchParams.get('q') || '')
  const [busquedaInput, setBusquedaInput] = useState(searchParams.get('q') || '')
  const [filtroPrincipal, setFiltroPrincipal] = useState(searchParams.get('v') || 'todos')
  const [filtroCinta, setFiltroCinta] = useState(searchParams.get('c') || '')
  const [filtroHorario, setFiltroHorario] = useState(searchParams.get('h') || '')
  const [fecha, setFecha] = useState(searchParams.get('f') || new Date().toLocaleDateString('sv-SE'))
  const [soloHoy, setSoloHoy] = useState(searchParams.get('sh') === 'true')

  const [rowHover, setRowHover] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [hayCambios, setHayCambios] = useState(false)
  const [rowExpandida, setRowExpandida] = useState({})
  const [idsTocados, setIdsTocados] = useState(new Set())

  const [modalHistorial, setModalHistorial] = useState(false)
  const [alumnoHistorial, setAlumnoHistorial] = useState(null)
  const [historialCompleto, setHistorialCompleto] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [filtroMesHistorial, setFiltroMesHistorial] = useState('')

  // Efecto para abrir modal desde URL
  useEffect(() => {
    const mAlumnoId = searchParams.get('ma')
    const mMes = searchParams.get('mm')
    if (mAlumnoId && alumnos.length > 0) {
      const alu = alumnos.find(a => String(a.id) === String(mAlumnoId))
      if (alu) {
        setAlumnoHistorial(alu)
        setFiltroMesHistorial(mMes || '')
        setModalHistorial(true)
        // No llamamos a cargarInformacion porque ya están los alumnos, 
        // pero necesitamos cargar el historial del alumno específico
        api.get(`/asistencias/alumno-legacy/${alu.id}`).then(res => setHistorialCompleto(res.data))
      }
    }
  }, [alumnos, searchParams])

  const limpiarUrl = (url) => url ? url.replace(/\\\//g, '/') : null
  const obtenerIniciales = (nombre, apellido) => {
    if (!nombre) return '?'
    return (nombre.trim().charAt(0) + (apellido ? apellido.trim().charAt(0) : '')).toUpperCase()
  }

  // Lógica para colores del semáforo de pagos
  const obtenerColorPago = (estatus) => {
    switch (estatus) {
      case 'pagado': return 'var(--accent-green)';
      case 'vencido': return 'var(--accent-red)';
      case 'pendiente': return 'var(--accent-yellow)';
      default: return 'var(--text-muted)';
    }
  }

  const cargarInformacion = useCallback(async () => {
    setCargando(true)
    setHayCambios(false)
    try {
      const [resAlumnos, resAsistencias, resCintas, resHorarios] = await Promise.all([
        api.get('/alumnos'),
        api.get('/asistencias', { params: { fecha } }),
        api.get('/configuraciones-cintas'),
        api.get('/horarios')
      ])

      const todos = resAlumnos.data
      const datosAsist = resAsistencias.data
      setHorarios(resHorarios.data)
      setCintasConfig(resCintas.data)

      const mapa = {}
      todos.forEach(a => {
        const registro = datosAsist.find(r => r.alumno_id === a.id)
        mapa[a.id] = registro ? !!registro.presente : false
      })

      setAlumnos(todos.filter(a => a.estatus === 'activo' || (mapa[a.id])))
      setAsistencias(mapa)

      // 2. Verificar RESPALDO LOCAL después de cargar datos reales
      const backup = localStorage.getItem(`backup_asis_${fecha}`)
      if (backup) {
        const backupData = JSON.parse(backup)
        Swal.fire({
          title: 'Respaldo encontrado',
          text: `Hay asistencias no guardadas registradas localmente para esta fecha. ¿Deseas recuperarlas?`,
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Sí, restaurar',
          cancelButtonText: 'No, descartar',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)'
        }).then((result) => {
          if (result.isConfirmed) {
            setAsistencias(prev => ({ ...prev, ...backupData }))
            setHayCambios(true)
            setIdsTocados(new Set(Object.keys(backupData).map(id => Number(id))))
            toast.info('Asistencias restauradas del respaldo local')
          } else {
            localStorage.removeItem(`backup_asis_${fecha}`)
          }
        })
      }
    } catch (err) {
      toast.error('Error al cargar datos')
    } finally { setCargando(false) }
  }, [fecha])

  useEffect(() => { cargarInformacion() }, [cargarInformacion])

  // Actualizar URL cuando cambian los filtros
  useEffect(() => {
    const params = {}
    if (busqueda) params.q = busqueda
    if (filtroPrincipal !== 'todos') params.v = filtroPrincipal
    if (filtroCinta) params.c = filtroCinta
    if (filtroHorario) params.h = filtroHorario
    if (fecha !== new Date().toLocaleDateString('sv-SE')) params.f = fecha
    if (soloHoy) params.sh = 'true'

    // Params del modal
    if (modalHistorial && alumnoHistorial) {
      params.ma = alumnoHistorial.id
      if (filtroMesHistorial) params.mm = filtroMesHistorial
    }

    setSearchParams(params, { replace: true })
  }, [busqueda, filtroPrincipal, filtroCinta, filtroHorario, fecha, soloHoy, modalHistorial, alumnoHistorial, filtroMesHistorial, setSearchParams])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hayCambios) {
        const msg = 'Tienes registros de asistencia que no se han guardado en el servidor. Si sales ahora, perderás esta información.'
        e.returnValue = msg
        return msg
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hayCambios])

  const blocker = useBlocker(({ nextLocation }) => {
    return hayCambios && nextLocation.pathname !== window.location.pathname;
  });

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmNavigation = async () => {
        const result = await Swal.fire({
          title: '¿Salir sin guardar?',
          text: 'Tienes registros de asistencia que no se han guardado en el servidor. Si sales ahora, perderás esta información.',
          icon: 'warning',
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: '💾 Guardar y Salir',
          denyButtonText: '🚪 Salir de todos modos',
          cancelButtonText: '↩ Cancelar',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          confirmButtonColor: 'var(--accent-blue)',
          denyButtonColor: 'var(--accent-red)',
          cancelButtonColor: 'var(--bg-tertiary)',
          allowOutsideClick: false
        });

        if (result.isConfirmed) {
          await guardar();
          blocker.proceed();
        } else if (result.isDenied) {
          blocker.proceed();
        } else {
          blocker.reset();
        }
      };
      confirmNavigation();
    }
  }, [blocker]);

  // Lógica de RESPALDO AUTOMÁTICO en localStorage
  useEffect(() => {
    if (hayCambios && fecha) {
      localStorage.setItem(`backup_asis_${fecha}`, JSON.stringify(asistencias))
    }
  }, [asistencias, hayCambios, fecha])

  useEffect(() => {
    const timer = setTimeout(() => setBusqueda(busquedaInput), 300)
    return () => clearTimeout(timer)
  }, [busquedaInput])

  const diaSeleccionado = useMemo(() => getDiaSemana(fecha), [fecha])

  const alumnosFiltrados = useMemo(() => {
    const filtrados = alumnos.filter(a => {
      const nombreCompleto = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.toLowerCase()
      const cumpleNombre = nombreCompleto.includes(busqueda.toLowerCase())
      let cumpleFiltro = true

      if (filtroPrincipal === 'presentes') cumpleFiltro = asistencias[a.id] === true
      if (filtroPrincipal === 'ausentes') cumpleFiltro = asistencias[a.id] === false
      if (filtroCinta) cumpleFiltro = cumpleFiltro && (String(a.configuracion_cinta_id) === String(filtroCinta))

      if (filtroHorario) {
        cumpleFiltro = cumpleFiltro && (
          (a.horario_id && String(a.horario_id) === String(filtroHorario)) ||
          a.horario === filtroHorario
        )
      }

      const tieneClaseHoy = a.horario_config?.dias && norm(a.horario_config.dias).includes(norm(diaSeleccionado))
      if (soloHoy) cumpleFiltro = cumpleFiltro && tieneClaseHoy

      return cumpleNombre && cumpleFiltro
    });

    // Agrupa automáticamente los alumnos por horario si hay diferentes en la vista
    // PRIORIDAD: Los que tienen clase el día seleccionado van arriba
    return filtrados.sort((a, b) => {
      const hoyA = a.horario_config?.dias && norm(a.horario_config.dias).includes(norm(diaSeleccionado)) ? 0 : 1
      const hoyB = b.horario_config?.dias && norm(b.horario_config.dias).includes(norm(diaSeleccionado)) ? 0 : 1

      if (hoyA !== hoyB) return hoyA - hoyB

      const hA = a.horario_config?.nombre || a.horario || 'Z'
      const hB = b.horario_config?.nombre || b.horario || 'Z'
      if (hA !== hB) return hA.localeCompare(hB)
      return a.nombre.localeCompare(b.nombre)
    })
  }, [alumnos, busqueda, filtroPrincipal, filtroCinta, filtroHorario, asistencias, soloHoy, diaSeleccionado])

  const stats = useMemo(() => {
    const total = alumnos.length
    const presentes = alumnos.filter(a => asistencias[a.id]).length
    const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0
    return { presentes, ausentes: total - presentes, porcentaje, total }
  }, [alumnos, asistencias])

  const toggleAsistencia = (id) => {
    setAsistencias(prev => ({ ...prev, [id]: !prev[id] }))
    setHayCambios(true)
    setIdsTocados(prev => new Set(prev).add(id))
  }

  const toggleTodos = () => {
    const todosPresentes = alumnosFiltrados.every(a => asistencias[a.id])
    const nuevoMapa = { ...asistencias }
    alumnosFiltrados.forEach(a => {
      nuevoMapa[a.id] = !todosPresentes
      setIdsTocados(prev => new Set(prev).add(a.id))
    })
    setAsistencias(nuevoMapa)
    setHayCambios(true)
  }

  const guardar = async () => {
    if (alumnos.length === 0) return toast.warning('No hay datos para guardar')
    setGuardando(true)
    try {
      const lista = alumnos.map(a => ({
        alumno_id: a.id,
        presente: asistencias[a.id] || false
      }))
      await api.post('/asistencias/registrar-dia', { fecha, asistencias: lista })
      setHayCambios(false)
      setIdsTocados(new Set())
      localStorage.removeItem(`backup_asis_${fecha}`) // Limpiar al guardar con éxito
      Swal.fire({
        icon: 'success',
        title: 'Asistencia Guardada',
        text: `Registrado con éxito (${stats.presentes} presentes)`,
        timer: 1800,
        showConfirmButton: false,
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        iconColor: 'var(--accent-green)'
      })
    } catch (err) {
      toast.error('Error al guardar')
    } finally { setGuardando(false) }
  }

  const abrirHistorialCompleto = async (alumno) => {
    setAlumnoHistorial(alumno)
    setModalHistorial(true)
    setCargandoHistorial(true)
    setHistorialCompleto([])
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    setFiltroMesHistorial(mesActual)
    try {
      const res = await api.get(`/asistencias/alumno-legacy/${alumno.id}`)
      setHistorialCompleto(res.data)
    } catch (err) {
      toast.error('Error al cargar el historial del alumno')
    } finally {
      setCargandoHistorial(false)
    }
  }

  const abrirWhatsApp = (a, e) => {
    e.stopPropagation()
    if (!a.telefono_tutor || a.telefono_tutor.trim() === '') {
      return toast.warning('Este alumno no tiene teléfono registrado')
    }
    const tel = '52' + a.telefono_tutor.replace(/\D/g, '')
    const msg = encodeURIComponent(`Hola tutor de ${a.nombre}, notamos que ha faltado a sus últimas clases de Taekwondo. ¿Todo se encuentra bien? ¡Esperamos verlo pronto por el tatami!`)
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank')
  }

  const exportarPDF = () => {
    if (alumnosFiltrados.length === 0) return toast.warning('No hay datos para exportar')
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.setTextColor(20, 30, 40)
    doc.text("Reporte de Asistencias - TKD Tigres", 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Fecha del pase de lista: ${fecha}`, 14, 28)

    const tableColumn = ["Nombre Alumno", "Cinta", "Horario", "Estatus Auditoria", "Asistencia Actual"]
    const tableRows = alumnosFiltrados.map(a => [
      `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
      a.cinta_config?.nombre_nivel || 'Sin cinta',
      a.horario_config
        ? `${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)} - ${formatHora(a.horario_config.hora_fin)})`
        : (a.horario || '-'),
      `${a.racha_faltas || 0} Faltas Seguidas | ${a.racha_asistencias || 0} Asistencias Seguidas`,
      asistencias[a.id] ? 'PRESENTE' : 'AUSENTE'
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'striped',
    })
    doc.save(`Asistencias_${fecha}.pdf`)
  }

  const exportarExcel = () => {
    if (alumnosFiltrados.length === 0) return toast.warning('No hay datos para exportar')
    const data = alumnosFiltrados.map(a => ({
      "Nombre Completo": `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
      "Cinta": a.cinta_config?.nombre_nivel || 'Sin cinta',
      "Categoria": a.edad <= 11 ? 'Infantil' : (a.edad <= 14 ? 'Cadete' : (a.edad <= 17 ? 'Juvenil' : 'Adulto')),
      "Horario": a.horario_config
        ? `${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)} - ${formatHora(a.horario_config.hora_fin)})`
        : (a.horario || '-'),
      "Faltas Seguidas (Racha)": a.racha_faltas || 0,
      "Asistencias Seguidas (Racha)": a.racha_asistencias || 0,
      "Asistencia Hoy": asistencias[a.id] ? 'PRESENTE' : 'AUSENTE'
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencias")
    XLSX.writeFile(workbook, `Asistencias_${fecha}.xlsx`)
  }

  const toggleRow = (id) => setRowExpandida(prev => ({ ...prev, [id]: !prev[id] }))
  const handleHover = (e, color) => {
    e.currentTarget.style.background = color
    e.currentTarget.style.transform = 'translateY(-2px)'
    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)'
  }
  const handleOut = (e, color) => {
    e.currentTarget.style.background = color
    e.currentTarget.style.transform = 'translateY(0)'
    e.currentTarget.style.boxShadow = 'none'
  }

  const [tabHover, setTabHover] = useState(null)

  return (
    <div style={{ ...s.container }}>
      <div style={s.header}>
        <div>
          <h1 style={s.titulo}>Control de Asistencias</h1>
          <p style={s.sub}>Visualiza y registra el pase de lista diario</p>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button
            style={{
              ...s.btnPrimary,
              backgroundColor: hayCambios ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
              color: hayCambios ? '#fff' : 'var(--text-secondary)',
              boxShadow: hayCambios ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none',
              padding: '10px 24px',
              animation: hayCambios ? 'pulseBlue 2s infinite' : 'none',
              cursor: (guardando) ? 'not-allowed' : 'pointer',
              opacity: (guardando || !hayCambios) ? 0.7 : 1
            }}
            onClick={guardar}
            disabled={guardando}
          >
            {guardando ? '...' : hayCambios ? '💾 Guardar Asistencias' : 'Sin cambios'}
          </button>
        </div>
      </div>

      <div style={s.barraAcciones}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flex: 1 }}>
          <input
            style={s.search}
            placeholder="Buscar por nombre..."
            value={busquedaInput}
            onChange={e => setBusquedaInput(e.target.value)}
          />
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: (busqueda || filtroPrincipal !== 'todos' || filtroCinta || filtroHorario || soloHoy) ? '#60a5fa' : '#475569',
            transition: 'color 0.3s'
          }}>
            {alumnosFiltrados.length} alumnos
          </div>
        </div>

        <div style={s.tabs}>
          <button
            style={filtroPrincipal === 'todos' ? s.tabActiveAzul : (tabHover === 'todos' ? s.tabHover : s.tab)}
            onClick={() => setFiltroPrincipal('todos')}
            onMouseEnter={() => setTabHover('todos')}
            onMouseLeave={() => setTabHover(null)}
          >
            Todos ({stats.total})
          </button>
          <button
            style={filtroPrincipal === 'presentes' ? s.tabActiveVerde : (tabHover === 'presentes' ? s.tabHover : s.tab)}
            onClick={() => setFiltroPrincipal('presentes')}
            onMouseEnter={() => setTabHover('presentes')}
            onMouseLeave={() => setTabHover(null)}
          >
            Presentes ({stats.presentes})
          </button>
          <button
            style={filtroPrincipal === 'ausentes' ? s.tabActiveRojo : (tabHover === 'ausentes' ? s.tabHover : s.tab)}
            onClick={() => setFiltroPrincipal('ausentes')}
            onMouseEnter={() => setTabHover('ausentes')}
            onMouseLeave={() => setTabHover(null)}
          >
            Ausentes ({stats.ausentes})
          </button>
        </div>
      </div>

      <div style={{ ...s.filtrosSecundarios, flexWrap: 'nowrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
          <select
            style={{ ...s.selectFiltro, flex: 1, minWidth: '130px', maxWidth: '160px' }}
            value={filtroCinta}
            onChange={e => setFiltroCinta(e.target.value)}
          >
            <option value="">Todas las cintas</option>
            {cintasConfig.map(c => <option key={c.id} value={c.id}>{c.nombre_nivel}</option>)}
          </select>

          <select style={{ ...s.selectFiltro, flex: 1, minWidth: '140px', maxWidth: '170px' }} value={filtroHorario} onChange={e => setFiltroHorario(e.target.value)}>
            <option value="">Todos los horarios</option>
            {horarios.map(h => (
              <option key={h.id} value={h.id}>{h.nombre} ({formatHora(h.hora_inicio)})</option>
            ))}
          </select>

          <input
            type="date"
            style={{ ...s.selectFiltro, width: '150px' }}
            value={fecha}
            onChange={e => setFecha(e.target.value)}
          />

          <button
            onClick={() => setSoloHoy(!soloHoy)}
            style={{
              ...s.btnDoc,
              borderColor: soloHoy ? 'var(--accent-blue)' : 'var(--border)',
              background: soloHoy ? 'var(--accent-blue-bg)' : 'transparent',
              color: soloHoy ? 'var(--accent-blue)' : 'var(--text-secondary)',
              minWidth: '140px',
              padding: '8px 12px'
            }}
          >
            {soloHoy ? `📅 Solo ${diaSeleccionado}` : '📅 Todos los Días'}
          </button>

          <div style={{
            ...s.btnLimpiarWrapper,
            width: 'auto',
            visibility: (filtroCinta || filtroHorario || busqueda || soloHoy || (fecha && fecha !== new Date().toLocaleDateString('sv-SE'))) ? 'visible' : 'hidden'
          }}>
            <button
              style={{ ...s.btnLimpiar, padding: '8px 12px' }}
              onClick={() => {
                setFiltroCinta('');
                setFiltroHorario('');
                setBusquedaInput('');
                setBusqueda('');
                setSoloHoy(false);
                setFecha(new Date().toLocaleDateString('sv-SE'));
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--border-hover)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              ↻ Limpiar
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button style={{ ...s.btnExportBlue, padding: '10px 12px' }} onClick={toggleTodos}
            onMouseOver={e => handleHover(e, 'rgba(59, 130, 246, 0.5)')}
            onMouseOut={e => handleOut(e, 'rgba(59, 130, 246, 0.3)')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Marcar Todos
          </button>
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

      <style>{`
        ${keyframes}
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      <div style={s.tablaContenedor}>
        <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
          <table style={s.table}>
            <colgroup>
              <col style={{ width: '55px' }} />
              <col style={{ width: '280px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '140px' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...s.th, textAlign: 'center' }}>Foto</th>
                <th style={{ ...s.th, textAlign: 'left' }}>Nombre Completo</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Cinta</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Estatus</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ ...s.tr, height: '70px' }}>
                    <td style={{ ...s.td, width: '80px' }}><SkeletonCircle size={40} /></td>
                    <td style={{ ...s.td, width: '300px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ width: '180px', height: '14px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', animation: 'skeletonPulse 1.5s infinite ease-in-out' }} />
                          <div style={{ width: '100px', height: '10px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', animation: 'skeletonPulse 1.5s infinite ease-in-out', opacity: 0.5 }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ ...s.td, width: '150px' }}>
                      <div style={{ width: '120px', height: '26px', borderRadius: '20px', backgroundColor: 'var(--bg-tertiary)', animation: 'skeletonPulse 1.5s infinite ease-in-out', margin: '0 auto' }} />
                    </td>
                    <td style={{ ...s.td, width: '110px' }}>
                      <div style={{ width: '70px', height: '24px', borderRadius: '20px', backgroundColor: 'var(--bg-tertiary)', animation: 'skeletonPulse 1.5s infinite ease-in-out', margin: '0 auto' }} />
                    </td>
                    <td style={{ ...s.td, width: '160px' }}>
                      <div style={{ width: '110px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', animation: 'skeletonPulse 1.5s infinite ease-in-out', margin: '0 auto' }} />
                    </td>
                  </tr>
                ))
              ) : alumnosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...s.td, padding: '60px', color: 'var(--text-muted)' }}>
                    No hay alumnos registrados que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                alumnosFiltrados.map(a => (
                  <React.Fragment key={a.id}>
                    <tr
                      style={{ ...s.tr, background: rowHover === a.id ? 'var(--bg-tertiary)' : 'transparent', transition: 'background 0.15s', cursor: 'pointer' }}
                      onMouseEnter={() => setRowHover(a.id)}
                      onMouseLeave={() => setRowHover(null)}
                      onClick={() => toggleRow(a.id)}
                    >
                      <td style={s.td} onClick={e => e.stopPropagation()}>
                        <div style={{ position: 'relative', width: '40px', height: '40px', margin: '0 auto' }}>
                          {a.foto_url ? (
                            <img src={limpiarUrl(a.foto_url)} alt="" style={s.fotoTabla}
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                          ) : null}
                          <div style={{ ...s.fotoVacia, display: a.foto_url ? 'none' : 'flex' }}>
                            {obtenerIniciales(a.nombre, a.apellido_paterno)}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...s.td, textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* SEMÁFORO DE PAGOS */}
                          <div
                            title={`Estatus de pago: ${a.estatus_pago || 'N/A'}`}
                            style={{
                              width: '10px', height: '10px', borderRadius: '50%',
                              backgroundColor: obtenerColorPago(a.estatus_pago),
                              boxShadow: `0 0 6px ${obtenerColorPago(a.estatus_pago)}`
                            }}
                          />

                          <div style={s.nombreNom}>
                            {`${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`}
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '2px' }}>

                              {/* El ID ahora aparece primero a la izquierda */}
                              <span style={{ marginRight: '8px', color: 'var(--text-dim)', fontWeight: 'bold' }}>ID:{a.id}</span>

                              {a.horario_config ? (
                                `🕒 ${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)} - ${formatHora(a.horario_config.hora_fin)})`
                              ) : (
                                a.horario ? `🕒 ${a.horario}` : 'Sin horario'
                              )}

                            </div>
                          </div>

                          {/* ALERTA DE GAMIFICACIÓN (3 o más asistencias seguidas) */}
                          {a.racha_asistencias >= 3 && (
                            <span title={`¡Constancia brillante! Tiene ${a.racha_asistencias} clases seguidas asistiendo`} style={{ cursor: 'help', fontSize: '18px', filter: 'drop-shadow(0 0 5px rgba(251, 191, 36, 0.8))' }}>🔥</span>
                          )}

                          {/* ALERTA DE DESERCIÓN Y WHATSAPP (3 o más faltas seguidas) */}
                          {a.racha_faltas >= 3 && (
                            <button
                              onClick={(e) => abrirWhatsApp(a, e)}
                              title="Contactar Tutor por WhatsApp"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: 0, filter: 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.6))', transform: 'scale(1.1)' }}
                            >
                              ⚠️
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={s.td} onClick={e => e.stopPropagation()}>
                        <span style={{
                          ...s.cinta,
                          background: a.cinta_config?.color_hex || 'var(--bg-tertiary)',
                          color: a.cinta_config?.color_texto || 'var(--text-primary)',
                          display: 'inline-block', width: '140px'
                        }}>{a.cinta_config?.nombre_nivel || 'Sin cinta'}</span>
                      </td>
                      <td style={s.td} onClick={e => e.stopPropagation()}>
                        <span style={{
                          ...s.badge,
                          background: a.estatus === 'activo' ? s.statusActivoBg : s.statusInactivoBg,
                          color: a.estatus === 'activo' ? s.statusActivoText : s.statusInactivoText,
                          textTransform: 'capitalize' // También puedes usar CSS para hacerlo más fácil
                        }}>
                          {a.estatus === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={s.td} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleAsistencia(a.id); }}
                          style={{
                            ...s.btnAsis,
                            backgroundColor: asistencias[a.id] ? '#14532d' : '#b91c1c', // Rojo sangre oscuro
                            color: '#ffffff', // Blanco puro para contraste total
                            borderColor: idsTocados.has(a.id) ? '#60a5fa' : (asistencias[a.id] ? '#4ade80' : '#f87171'),
                            boxShadow: idsTocados.has(a.id) ? '0 0 20px rgba(96,165,250,0.6)' : 'none',
                            borderWidth: idsTocados.has(a.id) ? '3px' : '1px',
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            fontWeight: '900'
                          }}
                        >
                          {asistencias[a.id] ? 'PRESENTE' : 'AUSENTE'}
                        </button>
                      </td>
                    </tr>

                    {/* FILA EXPANDIDA DEL HISTORIAL */}
                    {rowExpandida[a.id] && (
                      <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
                        <td colSpan={5} style={{ padding: '20px 24px', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>📅 Historial de Clases Recientes</span>
                              {a.racha_faltas > 0 && <span style={{ padding: '2px 8px', background: 'var(--accent-red-bg)', color: 'var(--accent-red)', borderRadius: '4px', fontSize: '10px' }}>Inasistente actual</span>}
                              {a.racha_asistencias > 0 && <span style={{ padding: '2px 8px', background: 'var(--accent-green-bg)', color: 'var(--accent-green)', borderRadius: '4px', fontSize: '10px' }}>Asistente actual</span>}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                              {a.ultimas_asistencias && a.ultimas_asistencias.length > 0 ? (
                                a.ultimas_asistencias.map((ua, idx) => {
                                  const colorHex = ua.presente ? '#10b981' : '#ef4444';
                                  return (
                                    <div key={idx} title={ua.presente ? 'Asistió' : 'Faltó'} style={{
                                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                                      background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                                      minWidth: '60px'
                                    }}>
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
                                        {new Date(ua.fecha + 'T12:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }).toUpperCase()}
                                      </span>
                                      <div style={{
                                        width: '16px', height: '16px', borderRadius: '50%',
                                        background: colorHex,
                                        boxShadow: `0 0 8px ${colorHex}80`,
                                        border: '2px solid var(--bg-secondary)'
                                      }} />
                                    </div>
                                  )
                                })
                              ) : (
                                <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }}>
                                  🗓️ No hay registros anteriores disponibles para este alumno.
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => abrirHistorialCompleto(a)}
                              style={{ marginTop: '12px', padding: '8px 16px', background: 'var(--bg-tertiary)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-start', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}
                              onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.2)'}
                              onMouseOut={e => e.currentTarget.style.filter = 'brightness(1)'}
                            >
                              🗓️ Consultar Historial Específico Completo
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL HISTORIAL COMPLETO */}
      {modalHistorial && alumnoHistorial && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>Expediente de Asistencias</h3>
              <button style={s.btnCerrarWhite} onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'} onClick={() => setModalHistorial(false)}>✖</button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: '700' }}>
                  {alumnoHistorial.nombre} {alumnoHistorial.apellido_paterno}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>BUSCAR MES:</span>
                  <input
                    type="month"
                    value={filtroMesHistorial}
                    onChange={(e) => setFiltroMesHistorial(e.target.value)}
                    style={{
                      ...s.inputFecha,
                      width: '180px',
                      padding: '8px 14px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--accent-blue)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: '600',
                      outline: 'none',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  />
                  {filtroMesHistorial && (
                    <button onClick={() => setFiltroMesHistorial('')} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>Limpiar</button>
                  )}
                </div>
              </div>

              <div style={{ height: '350px', overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.1)' }}>
                {cargandoHistorial ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Consultando archivos del servidor...</div>
                ) : historialCompleto.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay registros históricos de asistencia.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                      <tr>
                        <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>FECHA EXACTA</th>
                        <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>REGISTRO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialCompleto.filter(h => !filtroMesHistorial || h.fecha.startsWith(filtroMesHistorial)).length === 0 ? (
                        <tr><td colSpan={2} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No hay clases registradas en este mes</td></tr>
                      ) : (
                        historialCompleto.filter(h => !filtroMesHistorial || h.fecha.startsWith(filtroMesHistorial)).map(h => (
                          <tr key={h.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>
                              {new Date(h.fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
                            </td>
                            <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                              {h.presente ? (
                                <span style={{ color: '#10b981', fontWeight: '800', fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 12px', borderRadius: '6px' }}>✓ ASISTIÓ</span>
                              ) : (
                                <span style={{ color: '#ef4444', fontWeight: '800', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '6px' }}>✗ FALTÓ</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const s = {
  statusActivoBg: 'var(--accent-green-bg)', statusActivoText: 'var(--accent-green)',
  statusInactivoBg: 'var(--accent-red-bg)', statusInactivoText: 'var(--accent-red)',
  container: { scrollbarGutter: 'stable', paddingBottom: '40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  titulo: { fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' },
  sub: { fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' },
  barraAcciones: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '16px' },
  search: { flex: 1, maxWidth: '395px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '80px', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.3s ease' },
  tabs: { display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)', flexShrink: 0 },
  tab: { padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', minWidth: '120px', textAlign: 'center', transition: 'all 0.2s', borderRadius: '8px' },
  tabHover: { padding: '8px 16px', background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', minWidth: '120px', textAlign: 'center', transition: 'all 0.2s', borderRadius: '8px' },
  tabActiveVerde: { padding: '8px 20px', background: 'var(--accent-green)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', minWidth: '120px', textAlign: 'center', boxShadow: 'var(--shadow-glow-green)', transition: 'all 0.2s' },
  tabActiveRojo: { padding: '8px 20px', background: 'var(--accent-red)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', minWidth: '120px', textAlign: 'center', boxShadow: 'var(--shadow-glow-red)', transition: 'all 0.2s' },
  tabActiveAzul: { padding: '8px 20px', background: 'var(--accent-blue)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', minWidth: '120px', textAlign: 'center', boxShadow: 'var(--shadow-glow-blue)', transition: 'all 0.2s' },
  filtrosSecundarios: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap', gap: '16px' },
  selectFiltro: { padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px', cursor: 'pointer', minWidth: '150px', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' },
  btnLimpiarWrapper: { display: 'inline-block', width: '90px' },
  btnLimpiar: { width: '100%', padding: '8px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)', },
  btnLimpiarHover: { background: 'var(--border)', borderColor: 'var(--border-hover)' },
  btnExportExcel: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', },

  btnExportPdf: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)', },

  btnExportBlue: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-glow-blue)', },
  tablaContenedor: { background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '600px', boxShadow: 'var(--shadow-md)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '800px' },
  th: { padding: '10px 16px', fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 16px', fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center' },
  tdCenter: { padding: '60px', textAlign: 'center', color: 'var(--text-muted)' },
  fotoTabla: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' },
  fotoVacia: { width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: 'var(--accent-blue)' },
  nombreNom: { fontWeight: '600', color: 'var(--text-primary)' },
  cinta: { padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-block', minWidth: '100px' },
  badge: { padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', },
  btnAsis: { padding: '8px 0', width: '110px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontWeight: '800', fontSize: '10px', transition: 'all 0.2s' },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(6px)' },
  modalCard: { backgroundColor: 'var(--bg-secondary)', borderRadius: '20px', width: '90%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' },
  cardHeader: { padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' },
  cardTitle: { margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' },
  btnCerrarWhite: { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', width: '32px', height: '32px' },
  btnDoc: { padding: '8px 16px', borderRadius: '12px', border: '1px solid', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' },
  btnPrimary: { background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-md)', transition: 'all 0.2s' },
}

const keyframes = `
      @keyframes pulseBlue {
        0 % { transform: scale(1); box- shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
      70% {transform: scale(1.02); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
      100% {transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }
      `
