import { useEffect, useState, useMemo } from 'react'
import api from '../api/axios'
import Swal from 'sweetalert2'
import { toast } from 'react-toastify'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '../context/AuthContext'
import { obtenerInfoEscuelaParaPDF, dibujarEncabezadoMembrete, agregarPieDePagina, formatearPeriodoOMes, formatearFechaNaturalPDF } from '../utils/pdfHelper'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Calcula el período de un alumno basándose en su día de corte y un mes de referencia (opcional)
function calcularPeriodo(diaPago = 1, fechaReferencia) {
  const dia = diaPago
  const ahora = new Date()

  // Si no se pasa fechaReferencia, usamos el "ahora" para determinar el periodo activo
  const usarAhora = !fechaReferencia
  const ref = fechaReferencia ? new Date(fechaReferencia) : ahora

  // Día de corte en el mes de referencia
  const inicioRef = new Date(ref.getFullYear(), ref.getMonth(), dia)

  let fechaInicio, fechaFin

  if (usarAhora) {
    // Cálculo automático para la lista basado en el día de hoy
    if (ahora >= inicioRef) {
      fechaInicio = inicioRef
      fechaFin = new Date(ref.getFullYear(), ref.getMonth() + 1, dia)
    } else {
      fechaInicio = new Date(ref.getFullYear(), ref.getMonth() - 1, dia)
      fechaFin = inicioRef
    }
  } else {
    // Si se pasó una fecha/mes específico, el periodo INICIA en esa fecha
    fechaInicio = inicioRef
    fechaFin = new Date(ref.getFullYear(), ref.getMonth() + 1, dia)
  }

  const fmt = (d) => (d instanceof Date && !isNaN(d)) ? d.toLocaleDateString('sv-SE') : '—'
  const label = (d) => {
    if (!(d instanceof Date) || isNaN(d)) return '—'
    const mes = MESES[d.getMonth()]
    const dia = String(d.getDate()).padStart(2, '0')
    return `${dia} ${mes ? mes.slice(0, 3) : '???'} ${d.getFullYear()}`
  }

  return {
    fechaInicio: fmt(fechaInicio),
    fechaFin: fmt(fechaFin),
    label: `${label(fechaInicio)} - ${label(fechaFin)}`,
    mesValue: `${fechaInicio.getFullYear()}-${String(fechaInicio.getMonth() + 1).padStart(2, '0')}`
  }
}

const hoy = new Date().toLocaleDateString('sv-SE')

export default function Pagos() {
  const { user } = useAuth()
  const [alumnos, setAlumnos] = useState([])
  const [tabHover, setTabHover] = useState(null)

  const handleHover = (e, color) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = `0 6px 20px ${color}`;
  };

  const handleOut = (e, color) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = `0 4px 15px ${color}`;
  };
  const [pagosActivos, setPagosActivos] = useState([]) // pagos del período actual de cada alumno
  const [cargando, setCargando] = useState(true)
  const [escuelaInfo, setEscuelaInfo] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos') // todos | pagado | pendiente
  const [submodulo, setSubmodulo] = useState('mensualidades') // mensualidades | inscripciones
  const [mostrarTodosInscripciones, setMostrarTodosInscripciones] = useState(false) // Toggle para mostrar históricos en inscripciones
  const [busquedaInput, setBusquedaInput] = useState('') // valor inmediato del input

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

  // Modal de pago rápido
  const [modalPago, setModalPago] = useState(null) // alumno al que se va a registrar pago
  const [pagoAEditar, setPagoAEditar] = useState(null) // si estamos editando, guardamos el objeto pago aquí
  const [formPago, setFormPago] = useState({ monto: '', metodo_pago: 'efectivo', fecha_pago: hoy, mes_periodo: '', tipo: 'mensualidad' })

  // Panel de historial
  const [historialAlumno, setHistorialAlumno] = useState(null) // alumno seleccionado
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  // Opciones para filtros
  const [cintas, setCintas] = useState([])
  const [horarios, setHorarios] = useState([])

  // Filtros adicionales
  const [filtroCinta, setFiltroCinta] = useState('')
  const [filtroHorario, setFiltroHorario] = useState('')
  const [filtroFechaPago, setFiltroFechaPago] = useState('')
  const [stats, setStats] = useState({ ingresos_mes: 0 })
  const [filtroMes, setFiltroMes] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }) // Filtro por mes calendario (YYYY-MM)

  // Ingresos calculados dinámicamente según el filtroMes seleccionado
  const ingresosDelMes = useMemo(() => {
    const mesRef = filtroMes
    const mensualidades = pagosActivos
      .filter(p => p.tipo === 'mensualidad' && p.fecha_inicio && p.fecha_inicio.startsWith(mesRef))
      .reduce((acc, p) => acc + parseFloat(p.monto || 0), 0)
    const inscripciones = pagosActivos
      .filter(p => p.tipo === 'inscripcion' && p.fecha_pago && p.fecha_pago.startsWith(mesRef))
      .reduce((acc, p) => acc + parseFloat(p.monto || 0), 0)
    return { mensualidades, inscripciones }
  }, [pagosActivos, filtroMes])
  const [anioHistorial, setAnioHistorial] = useState(new Date().getFullYear()) // Año visible en el drawer

  const cargar = async () => {
    setCargando(true)
    try {
      const [resAlumnos, resPagos, resCintas, resHorarios, resEscuela] = await Promise.all([
        api.get('/alumnos', { params: { estatus: 'activo' } }),
        api.get('/pagos'),
        api.get('/configuraciones-cintas'),
        api.get('/horarios'),
        api.get('/configuracion-escuela')
      ])
      setAlumnos(resAlumnos.data)
      setPagosActivos(resPagos.data)
      setCintas(resCintas.data)
      setHorarios(resHorarios.data)
      setEscuelaInfo(resEscuela.data)
    } catch { toast.error('Error al cargar datos') }
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusqueda(busquedaInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [busquedaInput])

  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setModalPago(null)
        setPagoAEditar(null)
        setHistorialAlumno(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  // Para cada alumno, encontrar si ya pagó su período activo y anteriores (para mensualidades)
  // O si ya pagó su inscripción (para inscripciones)
  // Si hay filtroMes activo, el pagoActivo refleja ese mes específico en lugar del período actual.
  const alumnosConEstado = useMemo(() => {
    return alumnos.map(a => {
      const pagosAlumno = pagosActivos.filter(p => p.alumno_id === a.id)

      if (submodulo === 'mensualidades') {
        let pagoActivo
        let periodoActual

        if (filtroMes) {
          // Con filtro de mes: buscar si pagó el período correspondiente a ese mes
          const [y, m] = filtroMes.split('-').map(Number)
          periodoActual = calcularPeriodo(a.dia_pago || 1, new Date(y, m - 1, 1, 12, 0, 0))
          pagoActivo = pagosAlumno.find(p =>
            p.tipo === 'mensualidad' && p.fecha_inicio === periodoActual.fechaInicio
          )
        } else {
          periodoActual = calcularPeriodo(a.dia_pago || 1)
          pagoActivo = pagosAlumno.find(p =>
            p.tipo === 'mensualidad' && p.fecha_inicio === periodoActual.fechaInicio
          )
        }

        // Detección de deuda anterior (siempre sobre el período actual real)
        const periodoActualReal = calcularPeriodo(a.dia_pago || 1)
        const fechaPrevia = new Date(periodoActualReal.fechaInicio + 'T12:00:00')
        fechaPrevia.setMonth(fechaPrevia.getMonth() - 1)
        const periodoPrevio = calcularPeriodo(a.dia_pago || 1, fechaPrevia)

        const pagoPrevio = pagosAlumno.find(p =>
          p.tipo === 'mensualidad' && p.fecha_inicio === periodoPrevio.fechaInicio
        )

        const tieneDeudaAntigua = !pagoPrevio

        return {
          ...a,
          periodo: periodoActual,
          pagoActivo: pagoActivo || null,
          tieneDeudaAntigua
        }
      } else {
        // Inscripciones: Buscamos si tiene ALGUNA inscripción registrada
        const pagoInscripcion = pagosAlumno.find(p => p.tipo === 'inscripcion')
        return {
          ...a,
          pagoActivo: pagoInscripcion || null,
          periodo: { label: 'Inscripción General' }
        }
      }
    })
  }, [alumnos, pagosActivos, submodulo, filtroMes])

  const alumnosFiltrados = useMemo(() => {
    return alumnosConEstado.filter(a => {
      // Búsqueda por nombre (necesaria procesarla antes para usarla en el bypass)
      const nombre = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.toLowerCase()
      const matchBusqueda = nombre.includes(busqueda.toLowerCase())

      // Si estamos en inscripciones, por defecto solo mostramos alumnos recientes (creados a partir del 11 de Mayo de 2026)
      // Si el usuario busca por nombre o activa "Mostrar Todos", omitimos este filtro de fecha.
      if (submodulo === 'inscripciones' && !mostrarTodosInscripciones && !busqueda && a.created_at) {
        const fechaCreacion = new Date(a.created_at).getTime()
        const fechaCorte = new Date('2026-05-11T00:00:00Z').getTime() // "a partir de ahora"
        if (fechaCreacion < fechaCorte) {
          return false
        }
      }


      // Filtro de estado (Todos/Pagado/Pendiente)
      const matchFiltro = filtro === 'todos'
        ? true
        : filtro === 'pagado' ? !!a.pagoActivo : !a.pagoActivo

      // Filtro de Cinta
      const matchCinta = !filtroCinta || String(a.configuracion_cinta_id) === String(filtroCinta)

      // Filtro de Horario
      const matchHorario = !filtroHorario || String(a.horario_id) === String(filtroHorario)

      // Filtro de Fecha de Pago (específico)
      let matchFechaPago = true
      if (filtroFechaPago) {
        matchFechaPago = pagosActivos.some(p => p.alumno_id === a.id && p.fecha_pago === filtroFechaPago && p.tipo === (submodulo === 'mensualidades' ? 'mensualidad' : 'inscripcion'))
      }

      // Nota: El filtro de mes ya NO oculta alumnos. Solo cambia qué pagoActivo se calcula
      // en alumnosConEstado, de modo que el filtro todos/pagado/pendiente funciona sobre ese mes.

      return matchBusqueda && matchFiltro && matchCinta && matchHorario && matchFechaPago
    })
    // Ordenar: primero los que pagaron (por fecha_pago desc, el más reciente arriba),
    // luego los que no han pagado (sin orden especial)
    .sort((a, b) => {
      const fa = a.pagoActivo?.fecha_pago
      const fb = b.pagoActivo?.fecha_pago
      if (fa && fb) return fa.localeCompare(fb) // ambos pagados: más antiguo primero
      if (fa) return -1  // a pagado, b no → a primero
      if (fb) return 1   // b pagado, a no → b primero
      return 0           // ambos pendientes
    })
  }, [alumnosConEstado, busqueda, filtro, filtroCinta, filtroHorario, filtroFechaPago, submodulo, pagosActivos])

  const exportarExcel = () => {
    if (alumnosFiltrados.length === 0) return toast.info('No hay datos para exportar')

    try {
      const data = alumnosFiltrados.map((a, i) => {
        const horario = horarios.find(h => String(h.id) === String(a.horario_id))
        return {
          '#': i + 1,
          Alumno: `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
          Cinta: cintas.find(c => String(c.id) === String(a.configuracion_cinta_id))?.nombre_nivel || '-',
          Horario: horario ? horario.nombre : '-',
          Estado: a.pagoActivo ? 'PAGADO' : 'PENDIENTE',
          Monto: a.pagoActivo ? `$${a.pagoActivo.monto}` : '-',
          'Método Pago': a.pagoActivo ? a.pagoActivo.metodo_pago : '-',
          'Fecha Pago': a.pagoActivo ? a.pagoActivo.fecha_pago : '-',
          Periodo: a.periodo.label
        }
      })

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Pagos")
      XLSX.writeFile(wb, `Reporte_Pagos_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success("Excel generado ✓")
    } catch { toast.error("Error al generar Excel") }
  }

  const exportarPDF = async () => {
    if (alumnosFiltrados.length === 0) return toast.info('No hay datos para exportar')

    try {
      const escuelaInfo = await obtenerInfoEscuelaParaPDF(user)
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' })

      const startY = dibujarEncabezadoMembrete(doc, {
        escuelaInfo,
        tipoReporte: 'REPORTE DE PAGOS',
        subtituloEtiqueta: 'Filtro / Período:',
        subtituloValor: filtroMes ? formatearPeriodoOMes(filtroMes) : (filtroFechaPago ? formatearFechaNaturalPDF(filtroFechaPago) : 'GENERAL')
      })

      const rows = alumnosFiltrados.map((a, i) => {
        const horario = horarios.find(h => String(h.id) === String(a.horario_id))
        return [
          i + 1,
          `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
          cintas.find(c => String(c.id) === String(a.configuracion_cinta_id))?.nombre_nivel || '-',
          horario ? horario.nombre : '-',
          a.pagoActivo ? 'PAGADO' : 'PENDIENTE',
          a.pagoActivo ? `$${a.pagoActivo.monto}` : '-',
          a.periodo.label
        ]
      })

      autoTable(doc, {
        head: [['#', 'Nombre Alumno', 'Cinta', 'Horario', 'Estado', 'Monto', 'Periodo']],
        body: rows,
        startY: startY,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8.5, cellPadding: 2.8, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 50, fontStyle: 'bold', halign: 'left' },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 36, halign: 'center' },
          4: { cellWidth: 24, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 24, halign: 'center' }
        },
        margin: { left: 14, right: 14, bottom: 18 }
      })

      agregarPieDePagina(doc, user)

      doc.save(`Reporte_Pagos_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success("PDF generado ✓")
    } catch { toast.error("Error al generar PDF") }
  }

  const generarRecibo = async (pago, alumno) => {
    try {
      const escuelaInfo = await obtenerInfoEscuelaParaPDF(user)
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'letter'
      })

      const startY = dibujarEncabezadoMembrete(doc, {
        escuelaInfo,
        tipoReporte: 'COMPROBANTE PAGO',
        subtituloEtiqueta: 'Fecha de Pago:',
        subtituloValor: formatearFechaNaturalPDF(pago.fecha_pago || hoy)
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
      doc.text(`Nombre: ${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`, 15, startY + 14)
      doc.text(`ID del Alumno: #${parseInt(alumno.id)}`, 15, startY + 20)

      const horario = horarios.find(h => String(h.id) === String(alumno.horario_id))
      const txtHorario = horario ? `${formatHora(horario.hora_inicio)} - ${formatHora(horario.hora_fin)}` : '-'
      doc.text(`Clase / Horario: ${txtHorario}`, 15, startY + 26)

      // SECCIÓN PAGO
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text("DETALLES DEL MOVIMIENTO", 15, startY + 37)
      doc.line(15, startY + 39, 200, startY + 39)

      const fechaRef = (pago.fecha_inicio || hoy) + 'T12:00:00'
      const esMensualidad = pago.tipo === 'mensualidad'
      const periodoLabel = esMensualidad 
        ? calcularPeriodo(alumno.dia_pago || 1, fechaRef).label
        : 'INSCRIPCIÓN ÚNICA'

      autoTable(doc, {
        startY: startY + 45,
        head: [['CONCEPTO', 'PERIODO', 'MÉTODO', 'TOTAL']],
        body: [[
          esMensualidad ? 'MENSUALIDAD TAEKWONDO' : 'INSCRIPCIÓN TAEKWONDO',
          periodoLabel,
          pago.metodo_pago.toUpperCase(),
          `$${parseFloat(pago.monto).toFixed(2)}`
        ]],
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], fontSize: 9.5, halign: 'center', textColor: 255 },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        styles: { fontSize: 9, cellPadding: 5, halign: 'center' },
        margin: { left: 14, right: 14 }
      })

      const finalY = doc.lastAutoTable.finalY + 12

      // CUADRO RESUMEN
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(130, finalY, 70, 18, 2, 2, 'F')
      doc.setDrawColor(37, 99, 235)
      doc.roundedRect(130, finalY, 70, 18, 2, 2, 'S')

      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(37, 99, 235)
      doc.text(`PAGADO: $${parseFloat(pago.monto).toFixed(2)}`, 165, finalY + 11.5, { align: 'center' })

      // FIRMA Y SELLO
      doc.setTextColor(100)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.line(20, 225, 80, 225)
      doc.text("Firma de Administración", 50, 230, { align: 'center' })

      doc.line(135, 225, 195, 225)
      doc.text("Sello de la Escuela", 165, 230, { align: 'center' })

      // PIE DE PÁGINA
      agregarPieDePagina(doc, user)

      doc.save(`Recibo_${escuelaInfo?.nombre || 'Pago'}_${alumno.nombre}_${pago.fecha_pago}.pdf`)
      toast.success("Recibo generado ✓")
    } catch (e) {
      console.error(e)
      toast.error("Error al generar recibo")
    }
  }

  const enviarWhatsApp = (alumno) => {
    const tel = alumno.telefono_tutor || alumno.telefono_contacto
    if (!tel) return toast.info("No hay teléfono registrado para este alumno")

    const limpio = tel.replace(/\D/g, '')
    const prefijo = limpio.length === 10 ? '52' + limpio : limpio

    const msj = `Hola! Le recordamos que el pago de la mensualidad de *${alumno.nombre}* (${alumno.periodo.label}) se encuentra pendiente. Agradecemos su apoyo. 🥋`
    const url = `https://wa.me/${prefijo}?text=${encodeURIComponent(msj)}`
    window.open(url, '_blank')
  }

  const enviarComprobanteWhatsApp = (pago, alumno) => {
    const tel = alumno.telefono_tutor || alumno.telefono_contacto
    if (!tel) return toast.info("No hay teléfono registrado")

    const limpio = tel.replace(/\D/g, '')
    const prefijo = limpio.length === 10 ? '52' + limpio : limpio

    const esMensualidad = pago.tipo === 'mensualidad'
    const periodo = esMensualidad 
      ? calcularPeriodo(alumno.dia_pago || 1, pago.fecha_inicio + 'T12:00:00').label
      : 'Inscripción Anual'
    const msj = `✅ *COMPROBANTE DE PAGO*\n\nHola! Confirmamos el pago de ${esMensualidad ? 'la mensualidad' : 'la inscripción'} de *${alumno.nombre}*.\n\n*Detalles:*\n🔹 Concepto: ${esMensualidad ? 'Mensualidad' : 'Inscripción'}\n🔹 Periodo: ${periodo}\n🔹 Monto: $${parseFloat(pago.monto).toFixed(2)}\n🔹 Método: ${pago.metodo_pago}\n🔹 Fecha: ${fmtFecha(pago.fecha_pago)}\n\n¡Gracias! 🥋`

    const url = `https://wa.me/${prefijo}?text=${encodeURIComponent(msj)}`
    window.open(url, '_blank')
  }


  const abrirModalPago = (alumno, e) => {
    e.stopPropagation()

    // Buscar el primer periodo pendiente
    let fechaSugerida = new Date()
    let periodoSugerido = calcularPeriodo(alumno.dia_pago || 1, fechaSugerida)

    for (let i = 0; i < 12; i++) {
      const yaPagado = pagosActivos.some(p =>
        p.alumno_id === alumno.id && p.fecha_inicio === periodoSugerido.fechaInicio
      )
      if (!yaPagado) break;
      fechaSugerida.setMonth(fechaSugerida.getMonth() + 1)
      periodoSugerido = calcularPeriodo(alumno.dia_pago || 1, fechaSugerida)
    }

    setPagoAEditar(null) // No es edición
    setModalPago(alumno)
    setFormPago({
      monto: '',
      metodo_pago: 'efectivo',
      fecha_pago: hoy,
      mes_periodo: periodoSugerido.mesValue,
      tipo: submodulo === 'mensualidades' ? 'mensualidad' : 'inscripcion'
    })
  }

  const abrirModalEdicion = (pago) => {
    setPagoAEditar(pago)
    setModalPago(historialAlumno) // Usamos el alumno actual del historial
    setFormPago({
      monto: pago.monto,
      metodo_pago: pago.metodo_pago || 'efectivo',
      fecha_pago: pago.fecha_pago,
      mes_periodo: pago.fecha_inicio ? `${new Date(pago.fecha_inicio + 'T12:00:00').getFullYear()}-${String(new Date(pago.fecha_inicio + 'T12:00:00').getMonth() + 1).padStart(2, '0')}` : '',
      tipo: pago.tipo || 'mensualidad'
    })
  }

  const confirmarPago = async () => {
    if (!formPago.monto || isNaN(parseFloat(formPago.monto))) {
      return toast.error('Ingresa un monto válido')
    }

    const esMensualidad = formPago.tipo === 'mensualidad'
    let periodo = { fechaInicio: null, fechaFin: null, label: 'Inscripción' }

    if (esMensualidad) {
      const [y, m] = formPago.mes_periodo.split('-').map(Number)
      const fechaRef = new Date(y, m - 1, modalPago.dia_pago || 1)
      periodo = calcularPeriodo(modalPago.dia_pago || 1, fechaRef)
    }

    const data = {
      alumno_id: modalPago.id,
      tipo: formPago.tipo,
      fecha_inicio: periodo.fechaInicio,
      fecha_fin: periodo.fechaFin,
      monto: parseFloat(formPago.monto),
      metodo_pago: formPago.metodo_pago,
      fecha_pago: formPago.fecha_pago,
      estado: 'pagado'
    }

    if (esMensualidad && !pagoAEditar) {
      // --- Validación: no permitir adelantar pago si el mes anterior no está pagado ---
      const [yTarget, mTarget] = formPago.mes_periodo.split('-').map(Number)
      const fechaPrevRef = new Date(yTarget, mTarget - 2, modalPago.dia_pago || 1) // mes anterior

      if (fechaPrevRef.getFullYear() > 2020) {
        const periodoPrevio = calcularPeriodo(modalPago.dia_pago || 1, fechaPrevRef)
        const mesPrevPagado = pagosActivos.some(p =>
          p.alumno_id === modalPago.id &&
          p.tipo === 'mensualidad' &&
          p.fecha_inicio === periodoPrevio.fechaInicio
        )
        const hayPagosAnteriores = pagosActivos.some(p =>
          p.alumno_id === modalPago.id && p.tipo === 'mensualidad'
        )
        if (hayPagosAnteriores && !mesPrevPagado) {
          const nombreMesAnterior = `${MESES[fechaPrevRef.getMonth()]} ${fechaPrevRef.getFullYear()}`
          const nombreMesSel = `${MESES[mTarget - 1]} ${yTarget}`
          await Swal.fire({
            title: 'No se puede adelantar pago',
            html: `El mes de <b>${nombreMesAnterior}</b> aún no está pagado.<br>Debes registrar ese mes primero antes de pagar <b>${nombreMesSel}</b>.`,
            icon: 'warning',
            confirmButtonText: 'Entendido',
            confirmButtonColor: 'var(--accent-blue)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
          })
          return
        }
      }

      // --- Validación de duplicado ---
      const existePago = pagosActivos.some(p =>
        p.alumno_id === modalPago.id && p.fecha_inicio === periodo.fechaInicio && p.tipo === 'mensualidad'
      )
      if (existePago) {
        const res = await Swal.fire({
          title: '¡Periodo ya pagado!',
          text: `Ya existe un pago registrado para el periodo: ${periodo.label}. ¿Deseas registrar un pago duplicado?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, registrar duplicado',
          confirmButtonColor: 'var(--accent-blue)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)'
        })
        if (!res.isConfirmed) return
      }
    }

    try {
      let res
      if (pagoAEditar) {
        res = await api.put(`/pagos/${pagoAEditar.id}`, data)
        toast.success('Pago actualizado ✓')
      } else {
        res = await api.post('/pagos', data)
        toast.success('Pago registrado ✓')

        // Ofrecer recibo
        Swal.fire({
          title: '¿Qué desea hacer?',
          text: 'Se ha registrado el pago correctamente.',
          icon: 'success',
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: '📄 Descargar PDF',
          denyButtonText: '📱 Enviar por WhatsApp',
          cancelButtonText: 'Cerrar',
          confirmButtonColor: 'var(--accent-blue)',
          denyButtonColor: '#22c55e',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)'
        }).then((result) => {
          if (result.isConfirmed) {
            generarRecibo(res.data, modalPago)
          } else if (result.isDenied) {
            enviarComprobanteWhatsApp(res.data, modalPago)
          }
        })
      }
      cargar()
      setModalPago(null)
      setPagoAEditar(null)
      if (historialAlumno) abrirHistorial(historialAlumno)
    } catch (e) {
      console.error("Error al guardar pago:", e.response?.data || e.message)
      toast.error('Error al guardar pago')
    }
  }

  const eliminarPago = async (pagoId, e) => {
    e.stopPropagation()
    const result = await Swal.fire({
      title: '¿Eliminar pago?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent-red)',
      cancelButtonColor: 'var(--border)',
      confirmButtonText: 'Sí, eliminar',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)'
    })
    if (result.isConfirmed) {
      await api.delete(`/pagos/${pagoId}`)
      toast.success('Pago eliminado')
      cargar()
    }
  }

  const abrirHistorial = async (alumno) => {
    setHistorialAlumno(alumno)
    setCargandoHistorial(true)
    try {
      const res = await api.get(`/pagos/alumno/${alumno.id}`)
      setHistorial(res.data)
    } catch { toast.error('Error al cargar historial') }
    setCargandoHistorial(false)
  }

  const cerrarHistorial = () => { setHistorialAlumno(null); setHistorial([]) }

  const totalPagados = alumnosConEstado.filter(a => !!a.pagoActivo).length
  const totalPendientes = alumnosConEstado.filter(a => !a.pagoActivo).length
  const fmtFecha = (f) => {
    if (!f) return '—'
    const d = new Date(f + 'T12:00:00')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${dia} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
  }

  function InfoItem({ label, value }) {
    return (
      <div style={s.infoItem}>
        <span style={s.infoLabel}>{label}:</span>
        <span style={s.infoValue}>{value}</span>
      </div>
    )
  }

  function SkeletonPagos() {
    return (
      <div style={{ ...s.card, opacity: 0.6, height: '82px', padding: isMobile ? '10px 14px' : '14px 18px', gap: isMobile ? '10px' : '16px', boxSizing: 'border-box' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-tertiary)', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ width: '60%', height: 14, background: 'var(--bg-tertiary)', borderRadius: 4, marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
          <div style={{ width: '40%', height: 10, background: 'var(--bg-tertiary)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
        </div>
        <div style={{ width: isMobile ? '200px' : '260px', height: 28, background: 'var(--bg-tertiary)', borderRadius: 20, animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
      </div>
    )
  }

  return (
    <div style={s.page}>
      {/* HEADER */}
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Control de Pagos</h2>
          <p style={s.sub}>{submodulo === 'mensualidades' ? 'Administración de mensualidades y periodos activos' : 'Registro de inscripciones'}</p>
        </div>
        {user?.role === 'owner' && (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={s.ingresosBadge}>
              <span style={s.ingresosLabel}>Mensualidades · {filtroMes ? new Date(filtroMes + '-15').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) : 'Mes actual'}</span>
              <span style={s.ingresosValor}>${ingresosDelMes.mensualidades.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div style={{ ...s.ingresosBadge, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3)' }}>
              <span style={s.ingresosLabel}>Inscripciones · {filtroMes ? new Date(filtroMes + '-15').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) : 'Mes actual'}</span>
              <span style={s.ingresosValor}>${ingresosDelMes.inscripciones.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
      </div>

      {/* SUBMODULOS NAVIGATION */}
      <div style={s.subnav}>
        <button
          style={submodulo === 'mensualidades' ? s.subnavBtnActive : s.subnavBtn}
          onClick={() => setSubmodulo('mensualidades')}
          onMouseOver={e => {
            if (submodulo !== 'mensualidades') {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
            }
          }}
          onMouseOut={e => {
            if (submodulo !== 'mensualidades') {
              e.currentTarget.style.background = 'none';
            }
          }}
        >
          Mensualidades
        </button>
        <button
          style={submodulo === 'inscripciones' ? s.subnavBtnActive : s.subnavBtn}
          onClick={() => setSubmodulo('inscripciones')}
          onMouseOver={e => {
            if (submodulo !== 'inscripciones') {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
            }
          }}
          onMouseOut={e => {
            if (submodulo !== 'inscripciones') {
              e.currentTarget.style.background = 'none';
            }
          }}
        >
          Inscripciones
        </button>
      </div>

      <div style={s.barraAcciones}>
        <input
          style={s.search}
          placeholder="Buscar alumno..."
          value={busquedaInput}
          onChange={e => setBusquedaInput(e.target.value)}
        />

        <div style={s.tabs}>
          <button
            style={filtro === 'todos' ? s.tabActiveAzul : (tabHover === 'todos' ? s.tabHover : s.tab)}
            onClick={() => setFiltro('todos')}
            onMouseEnter={() => setTabHover('todos')}
            onMouseLeave={() => setTabHover(null)}
          >
            Todos ({alumnos.length})
          </button>
          <button
            style={filtro === 'pagado' ? s.tabActiveVerde : (tabHover === 'pagado' ? s.tabHover : s.tab)}
            onClick={() => setFiltro('pagado')}
            onMouseEnter={() => setTabHover('pagado')}
            onMouseLeave={() => setTabHover(null)}
          >
            Pagado ({totalPagados})
          </button>
          <button
            style={filtro === 'pendiente' ? s.tabActiveRojo : (tabHover === 'pendiente' ? s.tabHover : s.tab)}
            onClick={() => setFiltro('pendiente')}
            onMouseEnter={() => setTabHover('pendiente')}
            onMouseLeave={() => setTabHover(null)}
          >
            Pendientes ({totalPendientes})
          </button>
        </div>
      </div>

      <div style={s.filtrosSecundarios}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
          <select style={{ ...s.selectFiltro, width: isMobile ? '100%' : '150px' }} value={filtroCinta} onChange={e => setFiltroCinta(e.target.value)}>
            <option value="">Todas las cintas</option>
            {cintas.map(c => <option key={c.id} value={c.id}>{c.nombre_nivel}</option>)}
          </select>

          <select style={{ ...s.selectFiltro, width: isMobile ? '100%' : '150px' }} value={filtroHorario} onChange={e => setFiltroHorario(e.target.value)}>
            <option value="">Todos los horarios</option>
            {horarios.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
          </select>

          {/* Filtro por mes */}
          <input
            type="month"
            style={{ ...s.selectFiltro, paddingRight: 14, width: isMobile ? '100%' : '150px' }}
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
          />

          <input
            type="date"
            style={{ ...s.selectFiltro, paddingRight: 14, width: isMobile ? '100%' : '150px' }}
            value={filtroFechaPago}
            onChange={e => setFiltroFechaPago(e.target.value)}
          />

          {submodulo === 'inscripciones' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', width: isMobile ? '100%' : 'auto' }}>
              <input
                type="checkbox"
                checked={mostrarTodosInscripciones}
                onChange={e => setMostrarTodosInscripciones(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
              />
              <strong>Mostrar todo el histórico</strong>
            </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }} className="mobile-hide">
          <button style={s.btnExportExcel} onClick={exportarExcel} title="Exportar a Excel"
            onMouseOver={e => handleHover(e, 'rgba(16, 185, 129, 0.5)')}
            onMouseOut={e => handleOut(e, 'rgba(16, 185, 129, 0.3)')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Excel
          </button>
          <button style={s.btnExportPDF} onClick={exportarPDF} title="Exportar a PDF"
            onMouseOver={e => handleHover(e, 'rgba(239, 68, 68, 0.5)')}
            onMouseOut={e => handleOut(e, 'rgba(239, 68, 68, 0.3)')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M16 13H8"></path>
              <path d="M16 17H8"></path>
              <path d="M10 9H8"></path>
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* LISTA DE ALUMNOS */}
      {cargando ? (
        <div style={s.lista}>
          {[1, 2, 3, 4, 5].map(i => <SkeletonPagos key={i} />)}
        </div>
      ) : alumnosFiltrados.length === 0 ? (
        <div style={s.empty}>No hay alumnos que mostrar</div>
      ) : (
        <div style={s.lista}>
          {alumnosFiltrados.map(a => {
            const pagado = !!a.pagoActivo
            return (
              <div key={a.id} style={{ ...s.card, borderLeft: `4px solid ${pagado ? 'var(--accent-green)' : 'var(--accent-red)'}`, position: 'relative', height: '82px', padding: isMobile ? '10px 14px' : '14px 18px', gap: isMobile ? '10px' : '16px', boxSizing: 'border-box' }}
                onClick={() => abrirHistorial(a)}>


                {/* Avatar */}
                <div style={s.avatar}>
                  {a.foto_url
                    ? <img src={a.foto_url} alt="" style={s.avatarImg} />
                    : <div style={s.avatarInicial}>{a.nombre[0]}{a.apellido_paterno[0]}</div>
                  }
                </div>

                {/* Info */}
                <div style={s.info}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={s.nombre}>{a.nombre} {a.apellido_paterno} {a.apellido_materno || ''}</div>
                    {submodulo === 'mensualidades' && a.tieneDeudaAntigua && !pagado && (
                      <span style={s.badgeDeuda} title="Debe periodos anteriores">DEUDA CRÍTICA</span>
                    )}
                  </div>
                  <div style={s.periodo}>{submodulo === 'mensualidades' ? `📅 ${a.periodo.label}` : '🎟️ Inscripción Anual'}</div>
                </div>

                {/* Estado y acción */}
                <div style={{ ...s.derecha, width: isMobile ? '200px' : '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px' }}>
                    {!pagado && submodulo === 'mensualidades' && (
                      <button style={{ ...s.btnWhatsApp, transition: 'all 0.2s' }} onClick={(e) => { e.stopPropagation(); enviarWhatsApp(a); }} title="Recordar por WhatsApp"
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#22c55e';
                          e.currentTarget.style.color = '#fff';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 10px rgba(34, 197, 94, 0.3)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                          e.currentTarget.style.color = '#22c55e';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.554.92 3.14 1.407 4.793 1.408 5.432 0 9.854-4.422 9.856-9.856.002-5.433-4.419-9.853-9.853-9.853-5.435 0-9.856 4.422-9.858 9.854-.001 1.838.512 3.633 1.483 5.213l-1.103 4.025 4.128-1.082zm11.367-7.604c-.31-.155-1.836-.906-2.115-1.008-.28-.101-.483-.153-.686.154-.203.308-.787 1.008-.965 1.213-.177.205-.355.231-.665.077-.31-.155-1.307-.482-2.489-1.536-.919-.82-1.539-1.831-1.719-2.139-.18-.308-.02-.475.135-.629.14-.139.31-.36.465-.54.155-.181.206-.309.31-.515.103-.206.052-.386-.025-.54-.078-.155-.686-1.656-.941-2.261-.249-.59-.503-.51-.686-.519-.177-.008-.381-.01-.584-.01-.203 0-.533.077-.812.385-.279.308-1.066 1.044-1.066 2.545 0 1.501 1.091 2.951 1.243 3.156.153.205 2.146 3.276 5.198 4.59.726.313 1.293.499 1.734.639.73.232 1.393.199 1.918.121.585-.088 1.836-.751 2.09-1.474.254-.724.254-1.344.177-1.474-.076-.13-.279-.234-.589-.389z" />
                        </svg>
                      </button>
                    )}
                    {pagado && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={submodulo === 'mensualidades' ? s.badgePagado : s.badgeInscrito}>✓ {submodulo === 'mensualidades' ? 'PAGADO' : 'INSCRITO'}</span>
                        {user?.role === 'owner' && (
                          <button
                            style={{ ...s.btnIconTrash, transition: 'all 0.2s' }}
                            onClick={(e) => eliminarPago(a.pagoActivo.id, e)}
                            title="Quitar registro"
                            onMouseOver={e => {
                              e.currentTarget.style.background = '#ef4444';
                              e.currentTarget.style.color = '#fff';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 10px rgba(239, 68, 68, 0.3)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              e.currentTarget.style.color = 'var(--accent-red)';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          </button>
                        )}

                        {/* Botones de recibo rápido */}
                        <button
                          style={{ ...s.btnIconBlueSmall, transition: 'all 0.2s' }}
                          onClick={(e) => { e.stopPropagation(); generarRecibo(a.pagoActivo, a); }}
                          title="Descargar Recibo"
                          onMouseOver={e => {
                            e.currentTarget.style.background = 'var(--accent-blue)';
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(59, 130, 246, 0.3)';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                            e.currentTarget.style.color = 'var(--accent-blue)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                        </button>
                        <button
                          style={{ ...s.btnIconGreenSmall, transition: 'all 0.2s' }}
                          onClick={(e) => { e.stopPropagation(); enviarComprobanteWhatsApp(a.pagoActivo, a); }}
                          title="Enviar por WhatsApp"
                          onMouseOver={e => {
                            e.currentTarget.style.background = '#22c55e';
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(34, 197, 94, 0.3)';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                            e.currentTarget.style.color = '#22c55e';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.554.92 3.14 1.407 4.793 1.408 5.432 0 9.854-4.422 9.856-9.856.002-5.433-4.419-9.853-9.853-9.853-5.435 0-9.856 4.422-9.858 9.854-.001 1.838.512 3.633 1.483 5.213l-1.103 4.025 4.128-1.082zm11.367-7.604c-.31-.155-1.836-.906-2.115-1.008-.28-.101-.483-.153-.686.154-.203.308-.787 1.008-.965 1.213-.177.205-.355.231-.665.077-.31-.155-1.307-.482-2.489-1.536-.919-.82-1.539-1.831-1.719-2.139-.18-.308-.02-.475.135-.629.14-.139.31-.36.465-.54.155-.181.206-.309.31-.515.103-.206.052-.386-.025-.54-.078-.155-.686-1.656-.941-2.261-.249-.59-.503-.51-.686-.519-.177-.008-.381-.01-.584-.01-.203 0-.533.077-.812.385-.279.308-1.066 1.044-1.066 2.545 0 1.501 1.091 2.951 1.243 3.156.153.205 2.146 3.276 5.198 4.59.726.313 1.293.499 1.734.639.73.232 1.393.199 1.918.121.585-.088 1.836-.751 2.09-1.474.254-.724.254-1.344.177-1.474-.076-.13-.279-.234-.589-.389z"/>
                          </svg>
                        </button>
                      </div>
                    )}

                    <button style={{ ...s.btnPagarSmall, transition: 'all 0.2s' }} onClick={(e) => abrirModalPago(a, e)} title={pagado ? "Registrar otro pago" : "Registrar pago"}
                      onMouseOver={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 15px rgba(59, 130, 246, 0.6)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </div>

                  {pagado ? (
                    <div style={s.montoInfo}>
                      ${parseFloat(a.pagoActivo.monto).toFixed(2)} · {a.pagoActivo.metodo_pago}
                      {a.pagoActivo.fecha_pago && (
                        <span style={{ marginLeft: '6px', opacity: 0.75 }}>· {fmtFecha(a.pagoActivo.fecha_pago)}</span>
                      )}
                    </div>
                  ) : (
                    <div style={{ height: '18px' }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL RÁPIDO DE PAGO ── */}
      {modalPago && (
        <div style={s.overlayModal} className="mobile-fullscreen-overlay" onClick={() => { setModalPago(null); setPagoAEditar(null); }}>
          <div style={s.modal} className="mobile-fullscreen-modal" onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitulo}>{pagoAEditar ? 'Editar Pago' : 'Registrar Pago'}</h3>
                <p style={s.modalSub}>{modalPago.nombre} {modalPago.apellido_paterno} {modalPago.apellido_materno}</p>
              </div>
              <button style={{ ...s.btnCerrar, transition: 'all 0.2s' }} onClick={() => setModalPago(null)}
                onMouseOver={e => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'scale(1.2)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}>✕</button>
            </div>

            <div style={s.grid2} className="mobile-grid-1">
              {formPago.tipo === 'mensualidad' && (
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={s.label}>Mes del periodo (Inicio)</label>
                  <input
                    style={s.input}
                    type="month"
                    value={formPago.mes_periodo}
                    onChange={e => setFormPago({ ...formPago, mes_periodo: e.target.value })}
                  />
                  <div style={{ ...s.periodoBadge, marginTop: '8px', marginBottom: 0 }}>
                    📅 {calcularPeriodo(modalPago.dia_pago || 1, new Date(formPago.mes_periodo + '-01T12:00:00')).label}
                  </div>
                </div>
              )}
              
              {formPago.tipo === 'inscripcion' && (
                 <div style={{ gridColumn: '1/-1' }}>
                    <div style={{ ...s.periodoBadge, marginBottom: '12px', background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)' }}>
                      🎟️ Concepto: Inscripción {user?.tenant?.nombre || 'Escuela'}
                    </div>
                 </div>
              )}
              <div>
                <label style={s.label}>Monto ($)</label>
                <input style={s.input} type="number" placeholder="0.00" autoFocus
                  value={formPago.monto} onChange={e => setFormPago({ ...formPago, monto: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Método de pago</label>
                <select style={s.select} value={formPago.metodo_pago}
                  onChange={e => setFormPago({ ...formPago, metodo_pago: e.target.value })}>
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="transferencia">🏦 Transferencia</option>
                  <option value="tarjeta">💳 Tarjeta</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={s.label}>Fecha en que se recibe el pago</label>
                <input style={s.input} type="date" value={formPago.fecha_pago}
                  onChange={e => setFormPago({ ...formPago, fecha_pago: e.target.value })} />
              </div>
            </div>

            <div style={s.modalFooter}>
              <button style={{ ...s.btnSecondary, transition: 'all 0.2s' }} onClick={() => { setModalPago(null); setPagoAEditar(null); }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>Cancelar</button>
              <button style={{ ...s.btnConfirmar, transition: 'all 0.2s' }} onClick={confirmarPago}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 15px rgba(16, 185, 129, 0.4)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                {pagoAEditar ? '✓ Guardar Cambios' : '✓ Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL DE HISTORIAL (GRILLA DE MESES) ── */}
      {historialAlumno && (() => {
        // Separar mensualidades de inscripciones
        const mensualidades = historial.filter(p => p.tipo === 'mensualidad')
        const inscripciones = historial.filter(p => p.tipo === 'inscripcion')

        const pagosPorMes = {} // 'YYYY-MM' -> pago (solo mensualidades)
        mensualidades.forEach(p => {
          if (p.fecha_inicio) {
            const key = p.fecha_inicio.slice(0, 7)
            if (!pagosPorMes[key]) pagosPorMes[key] = p
          }
        })
        const totalPagadoAnio = mensualidades
          .filter(p => p.estado === 'pagado' && p.fecha_inicio && p.fecha_inicio.startsWith(String(anioHistorial)))
          .reduce((sum, p) => sum + parseFloat(p.monto), 0)
        const mesesPagados = new Set(mensualidades.filter(p => p.estado === 'pagado').map(p => p.fecha_inicio?.slice(0, 7))).size
        const totalGeneral = mensualidades.filter(p => p.estado === 'pagado').reduce((sum, p) => sum + parseFloat(p.monto), 0)

        return (
          <div style={s.overlay} className="mobile-fullscreen-overlay" onClick={cerrarHistorial}>
            <div style={{ ...s.drawer, width: 600, maxWidth: '96vw' }} className="mobile-fullscreen-modal" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={s.drawerHeader}>
                <div style={s.drawerTituloRow}>
                  <div style={s.avatarSm}>
                    {historialAlumno.foto_url
                      ? <img src={historialAlumno.foto_url} alt="" style={s.avatarImg} />
                      : <div style={s.avatarInicialSm}>{historialAlumno.nombre[0]}{historialAlumno.apellido_paterno[0]}</div>
                    }
                  </div>
                  <div>
                    <div style={s.drawerNombre}>{historialAlumno.nombre} {historialAlumno.apellido_paterno} {historialAlumno.apellido_materno}</div>
                    <div style={s.drawerSub}>Día de corte: <strong>{String(historialAlumno.dia_pago || 1).padStart(2, '0')}</strong> de cada mes</div>
                  </div>
                </div>
                <button style={{ ...s.btnCerrar, transition: 'all 0.2s' }} onClick={cerrarHistorial}
                  onMouseOver={e => {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.transform = 'scale(1.2)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}>✕</button>
              </div>

              <div style={s.drawerContent}>
                {cargandoHistorial ? (
                  <div style={s.empty}>Cargando historial...</div>
                ) : (
                  <>
                    {/* Resumen general */}
                    <div style={s.resumenHistorial}>
                      <div style={s.resumenHistItem}>
                        <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-green)' }}>{mesesPagados}</span>
                        <span style={s.resumenLabel}>Meses pagados</span>
                      </div>
                      <div style={s.resumenHistItem}>
                        <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-green)' }}>${totalGeneral.toFixed(2)}</span>
                        <span style={s.resumenLabel}>Total pagado</span>
                      </div>
                      <div style={s.resumenHistItem}>
                        <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-blue)' }}>${totalPagadoAnio.toFixed(2)}</span>
                        <span style={s.resumenLabel}>Pagado en {anioHistorial}</span>
                      </div>
                    </div>

                    {/* Selector de año */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Año {anioHistorial}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setAnioHistorial(y => y - 1)} style={{ ...s.btnNavAnio, transition: 'all 0.2s' }}
                          onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.background = 'var(--border)';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.background = 'var(--bg-tertiary)';
                          }}>‹ {anioHistorial - 1}</button>
                        <button onClick={() => setAnioHistorial(new Date().getFullYear())} style={{ ...s.btnNavAnio, background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', fontWeight: 700, transition: 'all 0.2s' }}
                          onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.background = 'var(--accent-blue)';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.background = 'var(--accent-blue-bg)';
                            e.currentTarget.style.color = 'var(--accent-blue)';
                          }}>Hoy</button>
                        <button onClick={() => setAnioHistorial(y => y + 1)} style={{ ...s.btnNavAnio, transition: 'all 0.2s' }}
                          onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.background = 'var(--border)';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.background = 'var(--bg-tertiary)';
                          }}>{anioHistorial + 1} ›</button>
                      </div>
                    </div>

                    {/* Grilla de 12 meses */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                      {MESES.map((mes, idx) => {
                        const mesKey = `${anioHistorial}-${String(idx + 1).padStart(2, '0')}`
                        const pago = pagosPorMes[mesKey]
                        const esPagado = !!pago
                        const esMesActual = new Date().getMonth() === idx && new Date().getFullYear() === anioHistorial
                        return (
                          <div
                            key={mesKey}
                            style={{
                              background: esPagado ? 'rgba(16,185,129,0.08)' : 'var(--bg-primary)',
                              border: `1px solid ${esPagado ? 'rgba(16,185,129,0.35)' : esMesActual ? 'var(--accent-blue)' : 'var(--border)'}`,
                              borderRadius: 12,
                              padding: '12px 14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                              position: 'relative',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: esPagado ? 'var(--accent-green)' : esMesActual ? 'var(--accent-blue)' : 'var(--text-muted)' }}>{mes}</span>
                              <span style={{ fontSize: 18, lineHeight: 1 }}>{esPagado ? '✅' : '❌'}</span>
                            </div>
                            {esPagado ? (
                              <>
                                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-green)' }}>${parseFloat(pago.monto).toFixed(2)}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{pago.metodo_pago} · {fmtFecha(pago.fecha_pago)}</div>
                                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                  <button
                                    style={{ ...s.btnIconEdit, transition: 'all 0.2s' }}
                                    onClick={() => abrirModalEdicion(pago)}
                                    title="Editar"
                                    onMouseOver={e => {
                                      e.currentTarget.style.background = 'var(--accent-blue)';
                                      e.currentTarget.style.color = '#fff';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseOut={e => {
                                      e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)';
                                      e.currentTarget.style.color = 'var(--accent-blue)';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                  </button>
                                  <button
                                    style={{ ...s.btnIconBlueSmall, transition: 'all 0.2s' }}
                                    onClick={() => generarRecibo(pago, historialAlumno)}
                                    title="Recibo PDF"
                                    onMouseOver={e => {
                                      e.currentTarget.style.background = 'var(--accent-blue)';
                                      e.currentTarget.style.color = '#fff';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseOut={e => {
                                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                      e.currentTarget.style.color = 'var(--accent-blue)';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                  </button>
                                  <button
                                    style={{ ...s.btnIconGreenSmall, transition: 'all 0.2s' }}
                                    onClick={() => enviarComprobanteWhatsApp(pago, historialAlumno)}
                                    title="WhatsApp"
                                    onMouseOver={e => {
                                      e.currentTarget.style.background = '#22c55e';
                                      e.currentTarget.style.color = '#fff';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseOut={e => {
                                      e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                                      e.currentTarget.style.color = '#22c55e';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.554.92 3.14 1.407 4.793 1.408 5.432 0 9.854-4.422 9.856-9.856.002-5.433-4.419-9.853-9.853-9.853-5.435 0-9.856 4.422-9.858 9.854-.001 1.838.512 3.633 1.483 5.213l-1.103 4.025 4.128-1.082zm11.367-7.604c-.31-.155-1.836-.906-2.115-1.008-.28-.101-.483-.153-.686.154-.203.308-.787 1.008-.965 1.213-.177.205-.355.231-.665.077-.31-.155-1.307-.482-2.489-1.536-.919-.82-1.539-1.831-1.719-2.139-.18-.308-.02-.475.135-.629.14-.139.31-.36.465-.54.155-.181.206-.309.31-.515.103-.206.052-.386-.025-.54-.078-.155-.686-1.656-.941-2.261-.249-.59-.503-.51-.686-.519-.177-.008-.381-.01-.584-.01-.203 0-.533.077-.812.385-.279.308-1.066 1.044-1.066 2.545 0 1.501 1.091 2.951 1.243 3.156.153.205 2.146 3.276 5.198 4.59.726.313 1.293.499 1.734.639.73.232 1.393.199 1.918.121.585-.088 1.836-.751 2.09-1.474.254-.724.254-1.344.177-1.474-.076-.13-.279-.234-.589-.389z"/></svg>
                                  </button>
                                  {user?.role === 'owner' && (
                                    <button
                                      style={{ ...s.btnIconTrash, transition: 'all 0.2s' }}
                                      onClick={(e) => eliminarPago(pago.id, e)}
                                      title="Eliminar"
                                      onMouseOver={e => {
                                        e.currentTarget.style.background = '#ef4444';
                                        e.currentTarget.style.color = '#fff';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                      }}
                                      onMouseOut={e => {
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                        e.currentTarget.style.color = 'var(--accent-red)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                      }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                    </button>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Sin pago registrado</div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Sección de Inscripciones */}
                    {inscripciones.length > 0 && (
                      <div style={{ marginBottom: 16, marginTop: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                          🎟️ Inscripciones ({inscripciones.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {inscripciones.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12, padding: '12px 14px' }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-blue)' }}>Inscripción</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>{p.metodo_pago} · {fmtFecha(p.fecha_pago)}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent-blue)' }}>${parseFloat(p.monto).toFixed(2)}</span>
                                <button style={{ ...s.btnIconEdit, transition: 'all 0.2s' }} onClick={() => abrirModalEdicion(p)} title="Editar"
                                  onMouseOver={e => {
                                    e.currentTarget.style.background = 'var(--accent-blue)';
                                    e.currentTarget.style.color = '#fff';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                  }}
                                  onMouseOut={e => {
                                    e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)';
                                    e.currentTarget.style.color = 'var(--accent-blue)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                  }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button style={{ ...s.btnIconBlueSmall, transition: 'all 0.2s' }} onClick={() => generarRecibo(p, historialAlumno)} title="Recibo PDF"
                                  onMouseOver={e => {
                                    e.currentTarget.style.background = 'var(--accent-blue)';
                                    e.currentTarget.style.color = '#fff';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                  }}
                                  onMouseOut={e => {
                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                    e.currentTarget.style.color = 'var(--accent-blue)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                  }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                </button>
                                {user?.role === 'owner' && (
                                  <button style={{ ...s.btnIconTrash, transition: 'all 0.2s' }} onClick={(e) => eliminarPago(p.id, e)} title="Eliminar"
                                    onMouseOver={e => {
                                      e.currentTarget.style.background = '#ef4444';
                                      e.currentTarget.style.color = '#fff';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseOut={e => {
                                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                      e.currentTarget.style.color = 'var(--accent-red)';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                    }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Registrar pago */}
                    <button
                      style={{ ...s.btnConfirmar, width: '100%', justifyContent: 'center', display: 'flex', gap: 8, transition: 'all 0.2s' }}
                      onClick={(e) => { cerrarHistorial(); setTimeout(() => abrirModalPago(historialAlumno, e), 100) }}
                      onMouseOver={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 15px rgba(16, 185, 129, 0.4)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      + Registrar nuevo pago
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

const s = {
  page: { padding: '', scrollbarGutter: 'stable' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  titulo: { fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 },
  sub: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' },
  barraAcciones: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '16px' },
  search: { flex: 1, maxWidth: '395px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '80px', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.3s ease' },
  tabs: { display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)', flexShrink: 0 },
  tab: { padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', minWidth: '120px', textAlign: 'center', transition: 'all 0.2s', borderRadius: '8px' },
  tabHover: { padding: '8px 16px', background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', minWidth: '120px', textAlign: 'center', transition: 'all 0.2s', borderRadius: '8px' },
  tabActiveVerde: { padding: '8px 20px', background: 'var(--accent-green)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', minWidth: '120px', textAlign: 'center', boxShadow: 'var(--shadow-glow-green)', transition: 'all 0.2s' },
  tabActiveRojo: { padding: '8px 20px', background: 'var(--accent-red)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', minWidth: '120px', textAlign: 'center', boxShadow: 'var(--shadow-glow-red)', transition: 'all 0.2s' },
  tabActiveAzul: { padding: '8px 20px', background: 'var(--accent-blue)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '700', fontSize: '13px', minWidth: '120px', textAlign: 'center', boxShadow: 'var(--shadow-glow-blue)', transition: 'all 0.2s' },
  subnav: { display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' },
  subnavBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '15px', fontWeight: '600', padding: '8px 16px', cursor: 'pointer', borderRadius: '8px', transition: '0.2s' },
  subnavBtnActive: { background: 'var(--bg-tertiary)', color: 'var(--accent-blue)', border: 'none', fontSize: '15px', fontWeight: '700', padding: '8px 16px', cursor: 'pointer', borderRadius: '8px', transition: '0.2s' },
  ingresosBadge: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '12px 24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)', color: '#fff' },
  ingresosLabel: { fontSize: '10px', color: 'rgba(255,255,255,0.85)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
  ingresosValor: { fontSize: '22px', fontWeight: '900', color: '#fff', lineHeight: 1.2 },
  filtrosSecundarios: { display: 'flex', justifyContent: 'flex-start', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap', gap: '16px' },
  selectFiltro: { padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px', cursor: 'pointer', minWidth: '150px', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' },
  dateFilterContainer: { display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  dateInput: { background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600', outline: 'none', cursor: 'pointer' },
  btnClearDate: { background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '14px', padding: '0 4px' },

  empty: { textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '14px' },
  lista: { display: 'flex', flexDirection: 'column', gap: '8px' },
  card: { display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 18px', cursor: 'pointer', transition: 'all 0.2s' },
  avatar: { flexShrink: 0 },
  avatarImg: { width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' },
  avatarInicial: { width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px' },
  info: { flex: 1, minWidth: 0 },
  nombre: { fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  periodo: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  derecha: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 },
  badgePagado: { background: 'var(--accent-green-bg)', color: 'var(--accent-green)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' },
  badgeInscrito: { background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' },
  montoInfo: { fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' },
  btnPagarSmall: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', boxShadow: 'var(--shadow-glow-blue)', padding: 0 },
  btnIconTrash: { background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', padding: 0 },
  btnIconEdit: { background: 'rgba(96, 165, 250, 0.1)', color: 'var(--accent-blue)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', padding: 0 },
  btnIconBlueSmall: { background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', border: 'none', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', padding: 0 },
  btnIconGreenSmall: { background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'none', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', padding: 0 },
  btnWhatsApp: { background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', padding: 0 },
  badgeDeuda: { background: 'var(--accent-red)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', animation: 'pulse 2s infinite' },
  btnEliminar: { background: 'var(--accent-red-bg)', color: 'var(--accent-red)', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' },
  btnExportExcel: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' },
  btnExportPDF: { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  overlayModal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '460px', maxWidth: '95vw', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  modalTitulo: { margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' },
  modalSub: { margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' },
  periodoBadge: { background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', marginBottom: '20px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  label: { display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px', borderTop: '1px solid var(--border)', paddingTop: '18px' },
  btnCerrar: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 },
  btnSecondary: { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: '600' },
  btnConfirmar: { background: 'var(--accent-green)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  drawer: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', width: '520px', maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 16px', borderBottom: '1px solid var(--border)' },
  drawerTituloRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatarSm: { flexShrink: 0 },
  avatarInicialSm: { width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px' },
  drawerNombre: { fontWeight: '800', color: 'var(--text-primary)', fontSize: '17px' },
  drawerSub: { fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' },
  drawerContent: { flex: 1, overflowY: 'auto', padding: '16px 24px 24px' },
  resumenHistorial: { display: 'flex', gap: '12px', marginBottom: '20px' },
  resumenHistItem: { flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' },
  historialLista: { display: 'flex', flexDirection: 'column', gap: '8px' },
  resumenLabel: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' },
  resumenNum: { fontWeight: '800' },
  btnNavAnio: { padding: '5px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' },
  historialItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px' },
  historialPeriodo: { flex: 1 },
  historialFechas: { fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' },
  historialDetalle: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'capitalize' },
  historialDerecha: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' },
  historialMonto: { fontWeight: '800', fontSize: '15px' },
  badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800' },

  bulkBar: { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-secondary)', border: '1px solid var(--accent-blue)', borderRadius: '16px', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', zIndex: 900, animation: 'slideUp 0.3s ease-out' },
  bulkInfo: { color: 'var(--text-primary)', fontSize: '15px' },

  '@keyframes pulse': {
    '0%': { opacity: 1 },
    '50%': { opacity: 0.5 },
    '100%': { opacity: 1 }
  },
  '@keyframes slideUp': {
    '0%': { transform: 'translateX(-50%) translateY(100%)' },
    '100%': { transform: 'translateX(-50%) translateY(0)' }
  }
}

// Inyectar animaciones
const styleSheet = document.createElement("style")
styleSheet.innerText = `
  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
  @keyframes slideUp { 0% { transform: translateX(-50%) translateY(100%); opacity: 0; } 100% { transform: translateX(-50%) translateY(0); opacity: 1; } }
`
document.head.appendChild(styleSheet)

const formatHora = (hora) => {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hrs = parseInt(h)
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  const h12 = hrs % 12 || 12
  return `${h12}:${m} ${ampm}`
}