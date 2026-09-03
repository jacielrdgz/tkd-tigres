import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Swal from 'sweetalert2'
import { toast } from 'react-toastify'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '../context/AuthContext'
import { obtenerInfoEscuelaParaPDF, dibujarEncabezadoMembrete, agregarPieDePagina, formatearFechaNaturalPDF, guardarODescargarPDF, guardarODescargarExcel } from '../utils/pdfHelper'
import BotonExportar from '../components/Common/BotonExportar'

const tieneFoto = (foto) => {
  if (!foto || foto === 'null' || foto === 'NULL' || foto === '') return false
  return true
}

const limpiarUrl = (url) => {
  if (!url) return null
  return url.replace(/\\\//g, '/')
}

const obtenerIniciales = (nombre, apellido) => {
  if (!nombre) return '?'
  const n = nombre.charAt(0)
  const a = apellido ? apellido.charAt(0) : ''
  return (n + a).toUpperCase()
}

const formatCosto = (val) => {
  if (!val) return '-'
  const num = parseFloat(val)
  if (isNaN(num)) return '-'
  return num % 1 === 0 ? num.toString() : num.toFixed(2)
}

const formatFechaNatural = (fecha) => {
  if (!fecha) return '-'
  const d = new Date(fecha + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const fmtFecha = (f) => {
  if (!f) return '—'
  const d = new Date(f + 'T12:00:00')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${dia} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

const formatHora = (hora) => {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hrs = parseInt(h)
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  const h12 = hrs % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export default function EventoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [evento, setEvento]       = useState(null)
  const [inscritos, setInscritos] = useState([])
  const [alumnos, setAlumnos]     = useState([])
  const [cintas, setCintas]       = useState([])
  const [escuelaInfo, setEscuelaInfo] = useState(null)
  const [horarios, setHorarios]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [rowHover, setRowHover]   = useState(null)

  // Modal editar evento base
  const [modalEvento, setModalEvento] = useState(false)
  const [formEvento, setFormEvento]   = useState({ nombre: '', tipo: '', fecha: '', lugar: '', costo: '' })

  // Modal inscripción
  const [modalInscripcion, setModalInscripcion] = useState(false)
  const [busquedaAlumno, setBusquedaAlumno]     = useState('')
  const [guardando, setGuardando]               = useState(false)
  const [editandoInscrito, setEditandoInscrito] = useState(null)
  const [form, setForm] = useState({
    alumno_id: '', nombre_alumno: '', pagado: false,
    grado_actual_id: '', grado_siguiente_id: '', costo_examen: '',
    es_historico: false
  })

  // Búsqueda en tabla
  const [busquedaTabla, setBusquedaTabla] = useState('')
  const [actualizando, setActualizando]   = useState({})

  const obtenerColorResultado = (resultado, esExamen) => {
    if (esExamen) {
      if (resultado === 'aprobado') return '#22c55e'
      if (resultado === 'reprobado') return '#ef4444'
    } else {
      if (resultado === 'oro') return '#eab308'
      if (resultado === 'plata') return '#94a3b8'
      if (resultado === 'bronce') return '#cd7f32'
      if (resultado === 'eliminado') return '#ef4444'
    }
    return 'var(--text-primary)'
  }

  useEffect(() => { cargar() }, [id])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setModalInscripcion(false)
        setModalEvento(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const cargar = async () => {
    setCargando(true)
    try {
      const [resEv, resIns, resA, resC, resEsc, resHor] = await Promise.all([
        api.get(`/eventos/${id}`),
        api.get(`/eventos/${id}/inscritos`),
        api.get('/alumnos'),
        api.get('/configuraciones-cintas'),
        api.get('/configuracion-escuela'),
        api.get('/horarios')
      ])
      setEvento(resEv.data)
      setInscritos(resIns.data)
      setAlumnos(resA.data.filter(a => a.estatus === 'activo'))
      setCintas(resC.data)
      setEscuelaInfo(resEsc.data)
      setHorarios(resHor.data)
      setFormEvento({ 
        nombre: resEv.data.nombre, 
        tipo: resEv.data.tipo, 
        fecha: resEv.data.fecha, 
        lugar: resEv.data.lugar || '', 
        costo: resEv.data.costo || '' 
      })
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  const recargarInscritos = async () => {
    try {
      const res = await api.get(`/eventos/${id}/inscritos`)
      setInscritos(res.data)
    } catch (e) {
      console.error(e)
      toast.error('Error al recargar la lista de inscritos')
    }
  }

  const guardarEvento = async () => {
    try {
      await api.put(`/eventos/${id}`, formEvento)
      setModalEvento(false)
      cargar()
      toast.success('Evento actualizado con éxito')
    } catch (e) { 
      toast.error('Error al actualizar el evento')
    }
  }

  const abrirInscripcion = () => {
    setForm({ 
      alumno_id: '', 
      nombre_alumno: '', 
      pagado: false, 
      grado_actual_id: '', 
      grado_siguiente_id: '', 
      costo: evento?.costo || '',
      es_historico: false
    })
    setBusquedaAlumno('')
    setEditandoInscrito(null)
    setModalInscripcion(true)
  }

  const abrirEditarInscrito = (inscrito) => {
    setForm({
      alumno_id: inscrito.id,
      nombre_alumno: `${inscrito.nombre} ${inscrito.apellido_paterno} ${inscrito.apellido_materno || ''}`.trim(),
      pagado: inscrito.pagado,
      grado_actual_id: inscrito.examen_detalle?.grado_actual_id || '',
      grado_siguiente_id: inscrito.examen_detalle?.grado_siguiente_id || inscrito.torneo_detalle?.grado_siguiente_id || '',
      costo: esExamen ? (inscrito.examen_detalle?.costo_examen) : (inscrito.torneo_detalle?.costo_torneo || evento?.costo || ''),
      es_historico: inscrito.examen_detalle?.es_historico || false
    })
    setEditandoInscrito(inscrito.id)
    setModalInscripcion(true)
  }

  const seleccionarAlumno = async (alumno) => {
    try {
      const res = await api.get(`/alumnos/${alumno.id}/predecir-grado`)
      setForm(prev => ({
        ...prev,
        alumno_id: alumno.id,
        nombre_alumno: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.trim(),
        grado_actual_id: res.data.grado_actual?.id || '',
        grado_siguiente_id: res.data.grado_siguiente?.id || '',
        costo: prev.costo || evento?.costo || '',
        es_historico: false
      }))
    } catch (e) {
      setForm(prev => ({
        ...prev,
        alumno_id: alumno.id,
        nombre_alumno: `${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`.trim(),
        costo: prev.costo || evento?.costo || ''
      }))
    } finally {
      setBusquedaAlumno('')
    }
  }

  const guardarInscripcion = async () => {
    if (!form.alumno_id) return
    setGuardando(true)
    try {
      const payload = {
        alumno_id: form.alumno_id,
        pagado: form.pagado,
        grado_actual_id: form.grado_actual_id,
        grado_siguiente_id: form.grado_siguiente_id,
        es_historico: form.es_historico
      }
      
      if (esExamen) {
        payload.costo_examen = form.costo === '' ? null : form.costo
      } else {
        payload.costo_torneo = form.costo === '' ? null : form.costo
      }

      if (editandoInscrito) {
        await api.put(`/eventos/${id}/alumnos/${editandoInscrito}`, payload)
        toast.success('Inscripción actualizada correctamente')
      } else {
        await api.post(`/eventos/${id}/inscribir`, payload)
        toast.success('Alumno inscrito correctamente')
      }
      
      setModalInscripcion(false)
      recargarInscritos()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar inscripción.')
    } finally {
      setGuardando(false)
    }
  }

  const actualizarAtributo = async (alumnoId, data) => {
    setActualizando(prev => ({ ...prev, [alumnoId]: true }))
    try {
      await api.put(`/eventos/${id}/alumnos/${alumnoId}`, data)
      toast.success('Información actualizada')
      await recargarInscritos()
    } catch (e) { 
      console.error(e)
      toast.error('Error al actualizar la información')
    } finally {
      setActualizando(prev => ({ ...prev, [alumnoId]: false }))
    }
  }

  const eliminarInscrito = async (alumnoId) => {
    Swal.fire({
      title: '¿Confirmar borrado?',
      text: 'El alumno será desinscrito del evento.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desinscribir',
      confirmButtonColor: 'var(--accent-red)',
      background: 'var(--bg-secondary)', color: 'var(--text-primary)'
    }).then(async r => {
      if (r.isConfirmed) {
        try {
          await api.delete(`/eventos/${id}/alumnos/${alumnoId}`)
          toast.success('Inscripción eliminada')
          recargarInscritos()
        } catch (err) {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar la inscripción.',
            icon: 'error',
            confirmButtonColor: 'var(--accent-blue)',
            background: 'var(--bg-secondary)', color: 'var(--text-primary)'
          })
        }
      }
    })
  }

  const alumnosFiltrados = useMemo(() => {
    if (!busquedaAlumno || busquedaAlumno.length < 1) return []
    return alumnos.filter(a =>
      `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno}`.toLowerCase().includes(busquedaAlumno.toLowerCase())
    ).slice(0, 6)
  }, [alumnos, busquedaAlumno])

  const inscritosFiltrados = useMemo(() => {
    let list = [...inscritos]
    if (busquedaTabla) {
      list = list.filter(a =>
        `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.toLowerCase().includes(busquedaTabla.toLowerCase())
      )
    }
    // Ordenar por fecha de inscripción (más antiguo a más reciente)
    return list.sort((a, b) => {
      const dateA = new Date(a.pivot_created_at || 0).getTime()
      const dateB = new Date(b.pivot_created_at || 0).getTime()
      return dateA - dateB
    })
  }, [inscritos, busquedaTabla])

  const COLOR_TIPO = {
    examen:       { bg: 'var(--accent-blue-bg)',   color: 'var(--accent-blue)' },
    torneo:       { bg: 'var(--accent-green-bg)',  color: 'var(--accent-green)' },
    demostracion: { bg: 'var(--accent-orange-bg)', color: 'var(--accent-orange)' },
    seminario:    { bg: 'var(--accent-purple-bg)', color: 'var(--accent-purple)' },
  }

  if (cargando) return (
    <div style={{ padding: '40px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>Cargando...</div>
  )
  if (!evento) return (
    <div style={{ padding: '40px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>Evento no encontrado.</div>
  )

  const c = COLOR_TIPO[evento.tipo] || { bg: 'var(--bg-tertiary)', color: 'var(--text-muted)' }
  const esExamen = evento.tipo === 'examen'

  const recaudado = inscritosFiltrados.reduce((acc, a) => {
    if (a.pagado) {
      const costo = esExamen ? (a.examen_detalle?.costo_examen) : (a.torneo_detalle?.costo_torneo || evento?.costo)
      return acc + (parseFloat(costo) || 0)
    }
    return acc
  }, 0)

  const handleHover = (e, color) => {
    e.currentTarget.style.transform = 'translateY(-2px)'
    e.currentTarget.style.boxShadow = `0 6px 20px ${color}`
  }
  const handleOut = (e, color) => {
    e.currentTarget.style.transform = 'translateY(0)'
    e.currentTarget.style.boxShadow = `0 4px 15px ${color}`
  }

  const exportarExcel = async () => {
    if (inscritosFiltrados.length === 0) return toast.info('No hay datos para exportar')
    try {
      const data = inscritosFiltrados.map((a, i) => {
        const fila = {
          '#': i + 1,
          'Alumno': `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.trim(),
        }
        if (esExamen) {
          fila['Grado Actual'] = a.examen_detalle?.grado_actual?.nombre_nivel || '-'
          fila['Grado Siguiente'] = a.examen_detalle?.grado_siguiente?.nombre_nivel || '-'
        }
        fila['Costo'] = esExamen 
          ? (a.examen_detalle?.costo_examen ? `$${a.examen_detalle.costo_examen}` : '-')
          : (a.torneo_detalle?.costo_torneo || evento?.costo ? `$${a.torneo_detalle?.costo_torneo || evento?.costo}` : '-')
        fila['Estado Pago'] = a.pagado ? 'PAGADO' : 'PENDIENTE'
        fila['Resultado'] = esExamen 
          ? (a.examen_detalle?.resultado || 'pendiente')
          : (a.torneo_detalle?.resultado || 'pendiente')
        return fila
      })
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Inscritos")
      await guardarODescargarExcel(wb, `Reporte_${evento.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success("Excel generado ✓")
    } catch { toast.error("Error al generar Excel") }
  }

  const exportarPDF = async () => {
    if (inscritosFiltrados.length === 0) return toast.info('No hay datos para exportar')
    try {
      const escuelaInfo = await obtenerInfoEscuelaParaPDF(user)
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' })

      const startY = dibujarEncabezadoMembrete(doc, {
        escuelaInfo,
        tipoReporte: esExamen ? 'REPORTE DE EXAMEN' : 'REPORTE DE EVENTO',
        subtituloEtiqueta: 'Evento / Fecha:',
        subtituloValor: `${evento.nombre} • ${formatearFechaNaturalPDF(evento.fecha)}`
      })
      
      const head = esExamen 
        ? [['#', 'Nombre Alumno', 'Grado Actual', 'Siguiente', 'Costo', 'Pago', 'Resultado']]
        : [['#', 'Nombre Alumno', 'Costo', 'Pago', 'Resultado']]

      const rows = inscritosFiltrados.map((a, i) => {
        const nombre = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.trim()
        const costo = esExamen ? (a.examen_detalle?.costo_examen) : (a.torneo_detalle?.costo_torneo || evento?.costo)
        const txtCosto = costo ? `$${parseFloat(costo).toFixed(2)}` : '-'
        const resu = esExamen ? a.examen_detalle?.resultado : a.torneo_detalle?.resultado
        if (esExamen) {
          return [
            i + 1, nombre, 
            a.examen_detalle?.grado_actual?.nombre_nivel || '-',
            a.examen_detalle?.grado_siguiente?.nombre_nivel || '-',
            txtCosto, a.pagado ? 'PAGADO' : 'PEND.', resu || 'pend.'
          ]
        }
        return [i + 1, nombre, txtCosto, a.pagado ? 'PAGADO' : 'PEND.', resu || 'pend.']
      })

      autoTable(doc, {
        head: head,
        body: rows,
        startY: startY,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8.5, cellPadding: 2, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 48, halign: 'left' }
        },
        margin: { left: 14, right: 14, bottom: 18 }
      })

      agregarPieDePagina(doc, user)

      await guardarODescargarPDF(doc, `Reporte_${evento.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success("PDF generado ✓")
    } catch { toast.error("Error al generar PDF") }
  }

  const generarRecibo = async (inscrito) => {
    try {
      const escuelaInfo = await obtenerInfoEscuelaParaPDF(user)
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' })

      const startY = dibujarEncabezadoMembrete(doc, {
        escuelaInfo,
        tipoReporte: 'COMPROBANTE PAGO',
        subtituloEtiqueta: 'Evento / Fecha:',
        subtituloValor: `${evento.nombre} • ${formatearFechaNaturalPDF(inscrito.fecha_pago || new Date().toISOString().split('T')[0])}`
      })

      // SECCIÓN ALUMNO
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text("DATOS DEL ALUMNO", 15, startY + 5)
      doc.setDrawColor(226, 232, 240)
      doc.line(15, startY + 7, 200, startY + 7)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      const nom = `${inscrito.nombre} ${inscrito.apellido_paterno} ${inscrito.apellido_materno || ''}`.trim()
      doc.text(`Nombre: ${nom}`, 15, startY + 14)
      doc.text(`ID del Alumno: #${parseInt(inscrito.id)}`, 15, startY + 20)
      
      const horario = horarios.find(h => String(h.id) === String(inscrito.horario_id))
      const txtHorario = horario ? `${formatHora(horario.hora_inicio)} - ${formatHora(horario.hora_fin)}` : '-'
      doc.text(`Clase / Horario: ${txtHorario}`, 15, startY + 26)

      const cintaTxt = esExamen 
        ? (inscrito.examen_detalle?.grado_actual?.nombre_nivel || inscrito.cinta_config?.nombre_nivel || '-')
        : (inscrito.cinta_config?.nombre_nivel || '-')
      doc.text(`Grado / Cinta: ${cintaTxt}`, 15, startY + 32)

      // SECCIÓN PAGO
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text("DETALLES DEL MOVIMIENTO", 15, startY + 43)
      doc.line(15, startY + 45, 200, startY + 45)

      const costoNum = parseFloat(esExamen ? (inscrito.examen_detalle?.costo_examen) : (inscrito.torneo_detalle?.costo_torneo || evento?.costo)) || 0

      let concepto = 'INSCRIPCIÓN EVENTO'
      let detalle = evento.nombre.toUpperCase()
      if (esExamen) {
        concepto = 'EXAMEN TAEKWONDO'
        const act = inscrito.examen_detalle?.grado_actual?.nombre_nivel || inscrito.cinta_config?.nombre_nivel || '-'
        const sig = inscrito.examen_detalle?.grado_siguiente?.nombre_nivel || '-'
        detalle = `${act.toUpperCase()} A ${sig.toUpperCase()}`
      } else if (evento.tipo === 'torneo') {
        concepto = 'INSCRIPCIÓN TORNEO'
        const mods = inscrito.torneo_detalle?.modalidades?.map(m => m.nombre.toUpperCase()).join(', ')
        detalle = mods ? `MODALIDADES: ${mods}` : evento.nombre.toUpperCase()
      }

      const fechaPagoStr = inscrito.fecha_pago 
        ? fmtFecha(inscrito.fecha_pago.split(' ')[0]) 
        : fmtFecha(new Date().toISOString().split('T')[0])

      autoTable(doc, {
        startY: startY + 51,
        head: [['CONCEPTO', 'DETALLE', 'FECHA PAGO', 'TOTAL']],
        body: [[
          concepto,
          detalle,
          fechaPagoStr,
          `$${costoNum.toFixed(2)}`
        ]],
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontSize: 9.5, halign: 'center', textColor: 255 },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        styles: { fontSize: 9, cellPadding: 5, halign: 'center' },
        margin: { left: 14, right: 14 }
      })

      const finalY = doc.lastAutoTable.finalY + 12
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(130, finalY, 70, 18, 2, 2, 'F')
      doc.setDrawColor(37, 99, 235)
      doc.roundedRect(130, finalY, 70, 18, 2, 2, 'S')

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(37, 99, 235)
      doc.text(`PAGADO: $${costoNum.toFixed(2)}`, 165, finalY + 11.5, { align: 'center' })

      doc.setTextColor(100)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.line(20, 225, 80, 225)
      doc.text("Firma de Administración", 50, 230, { align: 'center' })
      doc.line(135, 225, 195, 225)
      doc.text("Sello de la Escuela", 165, 230, { align: 'center' })

      agregarPieDePagina(doc, user)

      await guardarODescargarPDF(doc, `Recibo_${escuelaInfo?.nombre || 'Evento'}_${nom}_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success("Recibo generado ✓")
    } catch (e) {
      console.error(e)
      toast.error("Error al generar recibo")
    }
  }

  const headers = [
    '#', 'Alumno',
    ...(esExamen ? ['Grado Actual', 'Grado Siguiente'] : []),
    'Costo', 'Pagado', 'Resultado', 'Acciones'
  ]

  return (
    <div style={s.container}>

      {/* ── HEADER ── */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button 
            style={s.btnBack} 
            onClick={() => navigate('/eventos')}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'var(--bg-secondary)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >← Volver</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={s.titulo}>{evento.nombre}</h2>
              <span style={{ ...s.badge, background: c.bg, color: c.color }}>{evento.tipo.toUpperCase()}</span>
              <button 
                style={{ 
                  ...s.btnEditMini, 
                  marginLeft: '8px',
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  color: '#3b82f6',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }} 
                onClick={() => setModalEvento(true)}
                onMouseOver={e => {
                  e.currentTarget.style.background = '#3b82f6';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'rgba(59,130,246,0.1)';
                  e.currentTarget.style.color = '#3b82f6';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Editar evento"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
            <p style={s.sub}>📅 {formatFechaNatural(evento.fecha)}{evento.lugar ? ` · 📍 ${evento.lugar}` : ''}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={s.statBadge}>
            <span style={s.statLabel}>Total Inscritos</span>
            <span style={s.statValor}>{inscritosFiltrados.length}</span>
          </div>
          <div style={{ ...s.statBadge, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3)' }}>
            <span style={s.statLabel}>Total Recaudado</span>
            <span style={s.statValor}>${recaudado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <button 
            style={s.btnNuevo} 
            onClick={abrirInscripcion}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
          >+ Inscribir Alumno</button>
        </div>
      </div>

      {/* ── BARRA BÚSQUEDA Y EXPORTACIONES ── */}
      <div style={s.filtrosSecundarios}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <input
            style={s.search}
            placeholder="🔍  Buscar por nombre de alumno..."
            value={busquedaTabla}
            onChange={e => setBusquedaTabla(e.target.value)}
          />
        </div>
        
        <BotonExportar onExportarExcel={exportarExcel} onExportarPDF={exportarPDF} />
      </div>

      {/* ── TABLA ── */}
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
              <col style={{ width: '45px' }} />
              <col style={{ width: '220px' }} />
              {esExamen && <col style={{ width: '140px' }} />}
              {esExamen && <col style={{ width: '140px' }} />}
              <col style={{ width: '90px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead>
              <tr>
                {headers.map(h => (
                  <th key={h} style={{ ...s.th, textAlign: h === 'Alumno' ? 'left' : 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inscritosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} style={s.tdCenter}>
                    {busquedaTabla ? 'No se encontraron resultados.' : 'Aún no hay alumnos inscritos.'}
                  </td>
                </tr>
              ) : (
                inscritosFiltrados.map((a, idx) => (
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
                    {/* # */}
                    <td style={{ ...s.td, color: 'var(--text-muted)', fontWeight: '500' }}>{idx + 1}</td>

                    {/* Alumno */}
                    <td style={{ ...s.td, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={s.fotoBox}>
                          {tieneFoto(a.foto_url) ? (
                            <img 
                              src={limpiarUrl(a.foto_url)} 
                              alt="foto" 
                              style={s.fotoImg} 
                              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
                            />
                          ) : null}
                          <div style={{ ...s.fotoVacia, display: tieneFoto(a.foto_url) ? 'none' : 'flex' }}>
                            {obtenerIniciales(a.nombre, a.apellido_paterno)}
                          </div>
                        </div>
                        <div>
                          <div 
                            title={`${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`}
                            style={{ ...s.nombreNom, maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {a.nombre} {a.apellido_paterno} {a.apellido_materno || ''}
                          </div>
                          <div style={s.emailSub}>
                            {`ID: ${parseInt(a.id)}`}
                            {a.examen_detalle?.es_historico && (
                              <span style={{ marginLeft: '6px', color: 'var(--accent-orange)', fontSize: '9px', fontWeight: '800', background: 'rgba(249, 115, 22, 0.1)', padding: '2px 4px', borderRadius: '4px' }}>
                                HIST
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Grado Actual */}
                    {esExamen && (
                      <td style={s.td}>
                        <span style={{ 
                          ...s.cinta, 
                          background: a.examen_detalle?.grado_actual?.color_hex || 'var(--bg-tertiary)', 
                          color: a.examen_detalle?.grado_actual?.color_texto || 'var(--text-primary)' 
                        }}>
                          {a.examen_detalle?.grado_actual?.nombre_nivel || '-'}
                        </span>
                      </td>
                    )}

                    {/* Grado Siguiente */}
                    {esExamen && (
                      <td style={s.td}>
                        <span style={{ 
                          ...s.cinta, 
                          background: a.examen_detalle?.grado_siguiente?.color_hex || 'var(--accent-blue-bg)', 
                          color: a.examen_detalle?.grado_siguiente?.color_texto || 'var(--accent-blue)' 
                        }}>
                          {a.examen_detalle?.grado_siguiente?.nombre_nivel || '-'}
                        </span>
                      </td>
                    )}

                    {/* Costo */}
                    <td style={s.td}>
                      <div style={s.costoBadge}>
                        {esExamen
                          ? (a.examen_detalle?.costo_examen ? `$${formatCosto(a.examen_detalle.costo_examen)}` : '-')
                          : (a.torneo_detalle?.costo_torneo ? `$${formatCosto(a.torneo_detalle.costo_torneo)}` : '-')}
                      </div>
                    </td>

                    {/* Pagado */}
                    <td style={s.td}>
                      <button
                        onClick={() => actualizarAtributo(a.id, { pagado: !a.pagado })}
                        disabled={actualizando[a.id]}
                        onMouseOver={e => {
                          if (actualizando[a.id]) return;
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.filter = 'brightness(1.1)';
                        }}
                        onMouseOut={e => {
                          if (actualizando[a.id]) return;
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.filter = 'brightness(1)';
                        }}
                        style={{
                          ...s.paymentBadge,
                          background: a.pagado ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: a.pagado ? '#22c55e' : '#ef4444',
                          borderColor: a.pagado ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                          opacity: actualizando[a.id] ? 0.6 : 1,
                          pointerEvents: actualizando[a.id] ? 'none' : 'auto'
                        }}
                      >
                        <span style={{ fontSize: '10px' }}>{actualizando[a.id] ? '○' : (a.pagado ? '●' : '○')}</span>
                        {actualizando[a.id] ? 'ACTUALIZANDO...' : (a.pagado ? 'PAGADO' : 'PENDIENTE')}
                      </button>
                    </td>

                    {/* Resultado */}
                    <td style={s.td}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <select
                          disabled={actualizando[a.id]}
                          style={{
                            ...s.selectCompact,
                            color: obtenerColorResultado(esExamen ? (a.examen_detalle?.resultado) : (a.torneo_detalle?.resultado), esExamen),
                            opacity: actualizando[a.id] ? 0.6 : 1
                          }}
                          value={esExamen ? (a.examen_detalle?.resultado || 'pendiente') : (a.torneo_detalle?.resultado || 'pendiente')}
                          onChange={e => actualizarAtributo(a.id, esExamen ? { resultado_examen: e.target.value } : { resultado_torneo: e.target.value })}
                        >
                        <option value="pendiente">Pendiente</option>
                        {esExamen ? (
                          <>
                            <option value="aprobado">Aprobado</option>
                            <option value="reprobado">Reprobado</option>
                          </>
                        ) : (
                          <>
                            <option value="oro">Oro</option>
                            <option value="plata">Plata</option>
                            <option value="bronce">Bronce</option>
                            <option value="eliminado">Eliminado</option>
                          </>
                        )}
                        </select>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td style={s.td}>
                      <div style={s.acciones}>
                        {a.pagado && (
                          <button
                            style={{ ...s.btnIcon, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
                            onClick={() => generarRecibo(a)}
                            onMouseOver={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(59, 130, 246, 0.3)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                            title="Descargar Recibo"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                          </button>
                        )}
                        <button
                          style={{ ...s.btnIcon, ...s.btnEditRow }}
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button
                          style={{ ...s.btnIcon, ...s.btnDelRow }}
                          onClick={() => eliminarInscrito(a.id)}
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
                          title="Eliminar"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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

      {/* ── MODAL INSCRIBIR ── */}
      {modalInscripcion && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, overflow: 'visible' }}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitulo}>{editandoInscrito ? 'Editar Inscripción' : 'Inscribir Alumno'}</h3>
                <p style={s.modalSub}>Selecciona al alumno y asigna los detalles</p>
              </div>
              <button 
                style={s.btnCerrar} 
                onClick={() => setModalInscripcion(false)}
                onMouseOver={e => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'scale(1.15)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >✕</button>
            </div>

            <div style={s.grid2}>
              {/* Buscador (solo si no es edición) */}
              <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                <label style={s.label}>Alumno</label>
                <input
                  style={{ ...s.input, background: editandoInscrito ? 'var(--bg-tertiary)' : 'var(--bg-primary)' }}
                  placeholder="Escribe el nombre..."
                  value={form.nombre_alumno || busquedaAlumno}
                  readOnly={!!editandoInscrito}
                  autoFocus={!editandoInscrito}
                  onChange={e => {
                    if (editandoInscrito) return
                    setBusquedaAlumno(e.target.value)
                    if (form.alumno_id) setForm({ ...form, alumno_id: '', nombre_alumno: '' })
                  }}
                />
                {!editandoInscrito && alumnosFiltrados.length > 0 && (
                  <div style={s.dropdown}>
                    {alumnosFiltrados.map(a => {
                      const cintaActual = cintas.find(c => c.id === a.configuracion_cinta_id);
                      return (
                        <div 
                          key={a.id} 
                          style={{ ...s.dropItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} 
                          onMouseDown={() => seleccionarAlumno(a)}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{a.nombre} {a.apellido_paterno} {a.apellido_materno || ''}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {Number(a.id)}</div>
                          </div>
                          {cintaActual && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '4px 10px',
                              borderRadius: '12px',
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

              {/* Grados (solo examen) */}
              {esExamen && (
                <>
                  <div style={{ gridColumn: '1 / -1', marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: 'var(--accent-orange)' }}>
                      <input 
                        type="checkbox" 
                        checked={form.es_historico} 
                        onChange={e => setForm({ ...form, es_historico: e.target.checked })} 
                      />
                      REGISTRO HISTÓRICO (No actualiza cinta actual del alumno)
                    </label>
                  </div>
                  <div>
                    <label style={s.label}>Grado Actual</label>
                    <select 
                      disabled={!form.es_historico} 
                      style={{ ...s.select, opacity: form.es_historico ? 1 : 0.6, background: form.es_historico ? 'var(--bg-primary)' : 'var(--bg-tertiary)' }} 
                      value={form.grado_actual_id}
                      onChange={e => setForm({ ...form, grado_actual_id: e.target.value })}
                    >
                      <option value="">-</option>
                      {cintas.map(c => <option key={c.id} value={c.id}>{c.nombre_nivel}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Grado Siguiente</label>
                    <select style={s.select} value={form.grado_siguiente_id} onChange={e => setForm({ ...form, grado_siguiente_id: e.target.value })}>
                      <option value="">-</option>
                      {cintas.map(c => <option key={c.id} value={c.id}>{c.nombre_nivel}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label style={s.label}>{esExamen ? 'Costo Examen' : 'Costo Torneo'} ($)</label>
                <input style={s.input} type="number" value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.pagado} onChange={e => setForm({ ...form, pagado: e.target.checked })} />
                  ¿Pago realizado?
                </label>
              </div>
            </div>

            <div style={s.modalFooter}>
              <button 
                style={s.btnSecondary} 
                onClick={() => setModalInscripcion(false)}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >Cancelar</button>
              <button 
                style={s.btnPrimaryModal} 
                onClick={guardarInscripcion} 
                disabled={!form.alumno_id || guardando}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.5)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.4)';
                }}
              >
                {guardando ? 'Guardando...' : (editandoInscrito ? 'Guardar Cambios' : 'Inscribir Ahora')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR EVENTO BASE ── */}
      {modalEvento && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitulo}>Editar Detalles del Evento</h3>
                <p style={s.modalSub}>Completa los detalles para tu actividad</p>
              </div>
              <button 
                style={s.btnCerrar} 
                onClick={() => setModalEvento(false)}
                onMouseOver={e => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'scale(1.15)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >✕</button>
            </div>
            <div style={s.campoGroup}>
              <label style={s.label}>Nombre del Evento</label>
              <input 
                style={s.input} 
                value={formEvento.nombre} 
                onChange={e => setFormEvento({...formEvento, nombre: e.target.value})} 
              />
            </div>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>Tipo</label>
                <select 
                  style={s.select} 
                  value={formEvento.tipo} 
                  onChange={e => setFormEvento({...formEvento, tipo: e.target.value})}
                >
                  <option value="examen">Examen</option>
                  <option value="torneo">Torneo</option>
                  <option value="seminario">Seminario</option>
                  <option value="demostracion">Demostración</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Fecha</label>
                <input 
                  style={s.input} 
                  type="date" 
                  value={formEvento.fecha} 
                  onChange={e => setFormEvento({...formEvento, fecha: e.target.value})} 
                />
              </div>
            </div>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>Lugar</label>
                <input 
                  style={s.input} 
                  value={formEvento.lugar} 
                  onChange={e => setFormEvento({...formEvento, lugar: e.target.value})} 
                />
              </div>
              <div>
                <label style={s.label}>Costo General ($)</label>
                <input 
                  style={s.input} 
                  type="number"
                  value={formEvento.costo} 
                  onChange={e => setFormEvento({...formEvento, costo: e.target.value})} 
                />
              </div>
            </div>
            <div style={s.modalFooter}>
              <button 
                style={s.btnSecondary} 
                onClick={() => setModalEvento(false)}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >Cancelar</button>
              <button 
                style={s.btnPrimaryModal} 
                onClick={guardarEvento}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.5)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.4)';
                }}
              >Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


const s = {
  container:   { scrollbarGutter: 'stable', paddingBottom: '40px', fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  titulo:      { fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 },
  sub:         { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' },
  badge:       { padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid rgba(0,0,0,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '100px' },
  btnBack:     { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 16px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px', transition: 'all 0.2s' },
  btnNuevo:    { background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-md)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' },
  barraAcciones: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '16px' },
  search:      { flex: 1, maxWidth: '395px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '80px', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.3s ease', fontSize: '14px' },
  tabla:       { background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-md)', width: '100%', boxSizing: 'border-box' },
  tablaScroll: { width: '100%', overflowX: 'auto', overflowY: 'hidden' },
  table:       { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '1000px' },
  th:          { padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'var(--bg-tertiary)' },
  tr:          { borderBottom: '1px solid var(--border)' },
  td:          { padding: '14px 16px', fontSize: '14px', color: 'var(--text-secondary)', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden' },
  tdCenter:    { padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' },
  filtrosSecundarios: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap', gap: '16px' },
  btnExportExcel: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' },
  btnExportPdf: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' },
  statBadge: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '12px 24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)', color: '#fff', minWidth: '140px' },
  statLabel: { fontSize: '10px', color: 'rgba(255,255,255,0.85)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValor: { fontSize: '22px', fontWeight: '900', color: '#fff', lineHeight: 1.2 },
  fotoBox:     { width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border)', flexShrink: 0, background: 'var(--bg-tertiary)', position: 'relative' },
  fotoImg:     { width: '100%', height: '100%', objectFit: 'cover' },
  fotoVacia:   { width: '100%', height: '100%', background: 'var(--accent-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: 'var(--accent-blue)', position: 'absolute', top: 0, left: 0 },
  nombreNom:   { fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' },
  emailSub:    { fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' },
  cinta:       { padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-block', textAlign: 'center', minWidth: '110px', verticalAlign: 'middle' },
  btnEditMini: { background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' },
  paymentBadge: { 
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '12px', 
    fontSize: '11px', fontWeight: '800', cursor: 'pointer', border: '1px solid transparent', 
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', outline: 'none'
  },
  costoBadge: { 
    display: 'inline-block', padding: '4px 10px', borderRadius: '8px', 
    background: 'var(--bg-tertiary)', color: 'var(--text-primary)', 
    fontWeight: '700', fontSize: '13px', border: '1px solid var(--border)' 
  },
  btnIcon:     { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease' },
  btnEditRow:  { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
  btnDelRow:   { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
  selectCompact: { 
    padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--border)', 
    fontSize: '12px', fontWeight: '700', background: 'var(--bg-tertiary)', 
    color: 'var(--text-primary)', cursor: 'pointer', minWidth: '110px', 
    outline: 'none', transition: 'all 0.2s', appearance: 'none',
    textAlign: 'center', boxShadow: 'var(--shadow-sm)'
  },
  acciones:    { display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' },
  overlay:         { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:           { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' },
  modalHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  modalTitulo:     { fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 },
  modalSub:        { fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' },
  btnCerrar:       { background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', transition: 'all 0.2s' },
  
  campoGroup:      { marginBottom: '16px' },
  label:           { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' },
  input:           { width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' },
  select:          { width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none', fontSize: '14px' },
  grid2:           { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  
  modalFooter:     { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border)' },
  btnPrimaryModal: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)', transition: 'all 0.2s' },
  btnSecondary:    { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  dropdown:    { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 100, maxHeight: '220px', overflowY: 'auto' },
  dropItem:    { padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' },
}
