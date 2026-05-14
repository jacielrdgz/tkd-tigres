import { useEffect, useState, useMemo } from 'react'
import api from '../api/axios'
import Swal from 'sweetalert2'
import { toast } from 'react-toastify'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  const [alumnos, setAlumnos] = useState([])
  const [pagosActivos, setPagosActivos] = useState([]) // pagos del período actual de cada alumno
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos') // todos | pagado | pendiente
  const [submodulo, setSubmodulo] = useState('mensualidades') // mensualidades | inscripciones
  const [mostrarTodosInscripciones, setMostrarTodosInscripciones] = useState(false) // Toggle para mostrar históricos en inscripciones
  const [busquedaInput, setBusquedaInput] = useState('') // valor inmediato del input

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
  const [selectedIds, setSelectedIds] = useState([]) // Para acciones masivas

  const cargar = async () => {
    setCargando(true)
    try {
      const [resAlumnos, resPagos, resCintas, resHorarios] = await Promise.all([
        api.get('/alumnos', { params: { estatus: 'activo' } }),
        api.get('/pagos'),
        api.get('/configuraciones-cintas'),
        api.get('/horarios')
      ])
      setAlumnos(resAlumnos.data)
      setPagosActivos(resPagos.data)
      setCintas(resCintas.data)
      setHorarios(resHorarios.data)

      // Calcular ingresos del mes actual
      const ahora = new Date()
      const suma = resPagos.data
        .filter(p => {
          const d = new Date(p.fecha_pago + 'T12:00:00')
          return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear() && p.tipo === 'mensualidad'
        })
        .reduce((acc, p) => acc + parseFloat(p.monto), 0)

      const sumaInsc = resPagos.data
        .filter(p => {
          const d = new Date(p.fecha_pago + 'T12:00:00')
          return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear() && p.tipo === 'inscripcion'
        })
        .reduce((acc, p) => acc + parseFloat(p.monto), 0)

      setStats({ ingresos_mes: suma, ingresos_inscripciones: sumaInsc })
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
  const alumnosConEstado = useMemo(() => {
    return alumnos.map(a => {
      const pagosAlumno = pagosActivos.filter(p => p.alumno_id === a.id)

      if (submodulo === 'mensualidades') {
        const periodoActual = calcularPeriodo(a.dia_pago || 1)
        const pagoActivo = pagosAlumno.find(p =>
          p.tipo === 'mensualidad' && p.fecha_inicio === periodoActual.fechaInicio
        )

        // Detección de deuda anterior
        const fechaPrevia = new Date(periodoActual.fechaInicio + 'T12:00:00')
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
        // (Podríamos limitar por año si fuera necesario, pero el usuario pidió algo simple)
        const pagoInscripcion = pagosAlumno.find(p => p.tipo === 'inscripcion')
        return {
          ...a,
          pagoActivo: pagoInscripcion || null,
          periodo: { label: 'Inscripción General' }
        }
      }
    })
  }, [alumnos, pagosActivos, submodulo])

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

      return matchBusqueda && matchFiltro && matchCinta && matchHorario && matchFechaPago
    })
  }, [alumnosConEstado, busqueda, filtro, filtroCinta, filtroHorario, filtroFechaPago, submodulo])

  const exportarExcel = () => {
    if (alumnosFiltrados.length === 0) return toast.info('No hay datos para exportar')

    try {
      const data = alumnosFiltrados.map(a => {
        const horario = horarios.find(h => String(h.id) === String(a.horario_id))
        return {
          ID: a.id,
          Alumno: `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
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

  const exportarPDF = () => {
    if (alumnosFiltrados.length === 0) return toast.info('No hay datos para exportar')

    try {
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text("Reporte de Pagos - TKD Tigres", 14, 20)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28)
      if (filtroFechaPago) {
        doc.text(`Filtro de fecha: ${filtroFechaPago}`, 14, 34)
      }

      const rows = alumnosFiltrados.map(a => {
        const horario = horarios.find(h => String(h.id) === String(a.horario_id))
        return [
          a.id,
          `${a.nombre} ${a.apellido_paterno}`,
          horario ? horario.nombre : '-',
          a.pagoActivo ? 'PAGADO' : 'PENDIENTE',
          a.pagoActivo ? `$${a.pagoActivo.monto}` : '-',
          a.periodo.label
        ]
      })

      autoTable(doc, {
        head: [['ID', 'Alumno', 'Horario', 'Estado', 'Monto', 'Periodo']],
        body: rows,
        startY: filtroFechaPago ? 40 : 35,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      })

      doc.save(`Reporte_Pagos_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success("PDF generado ✓")
    } catch { toast.error("Error al generar PDF") }
  }

  const generarRecibo = (pago, alumno) => {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'letter'
      })

      // FONDO Y CABECERA (Hoja Membretada)
      doc.setFillColor(245, 247, 250) // Fondo muy claro
      doc.rect(0, 0, 216, 279, 'F')

      // Franja lateral decorativa
      doc.setFillColor(59, 130, 246)
      doc.rect(0, 0, 5, 279, 'F')

      // LOGO
      try {
        doc.addImage('/tigreslogo.jpg', 'JPEG', 15, 10, 35, 35)
      } catch (e) {
        console.warn("No se pudo cargar el logo:", e)
      }

      // TEXTO CABECERA
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.text("TAE KWON DO TIGRES", 55, 22)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text("Formación, Disciplina y Valores", 55, 28)
      doc.text("Av. Principal #123, Ciudad de México", 55, 33)
      doc.text("Tel: (55) 1234 5678 | WhatsApp: 55 8899 0011", 55, 38)

      // TITULO RECIBO
      doc.setFillColor(59, 130, 246)
      doc.rect(140, 15, 60, 12, 'F')
      doc.setTextColor(255)
      doc.setFontSize(14)
      doc.text("RECIBO DE PAGO", 170, 23, { align: 'center' })

      doc.setTextColor(40)
      doc.setFontSize(10)
      doc.text(`Folio: #${pago.id || '001'}`, 140, 32)
      doc.text(`Fecha: ${fmtFecha(pago.fecha_pago)}`, 140, 37)

      // SECCIÓN ALUMNO
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text("DATOS DEL ALUMNO", 15, 60)
      doc.line(15, 62, 200, 62)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.text(`Nombre: ${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno || ''}`, 15, 70)
      doc.text(`ID del Alumno: ${alumno.id}`, 15, 77)

      const horario = horarios.find(h => String(h.id) === String(alumno.horario_id))
      const txtHorario = horario ? `${formatHora(horario.hora_inicio)} - ${formatHora(horario.hora_fin)}` : '-'
      doc.text(`Clase / Horario: ${txtHorario}`, 15, 84)

      // SECCIÓN PAGO
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text("DETALLES DEL MOVIMIENTO", 15, 100)
      doc.line(15, 102, 200, 102)

      const fechaRef = (pago.fecha_inicio || hoy) + 'T12:00:00'
      const esMensualidad = pago.tipo === 'mensualidad'
      const periodoLabel = esMensualidad 
        ? calcularPeriodo(alumno.dia_pago || 1, fechaRef).label
        : 'INSCRIPCIÓN ÚNICA'

      autoTable(doc, {
        startY: 108,
        head: [['CONCEPTO', 'PERIODO', 'MÉTODO', 'TOTAL']],
        body: [[
          esMensualidad ? 'MENSUALIDAD TAEKWONDO' : 'INSCRIPCIÓN TAEKWONDO',
          periodoLabel,
          pago.metodo_pago.toUpperCase(),
          `$${parseFloat(pago.monto).toFixed(2)}`
        ]],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], fontSize: 10, halign: 'center' },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        styles: { fontSize: 10, cellPadding: 6 }
      })

      const finalY = doc.lastAutoTable.finalY + 15

      // CUADRO RESUMEN
      doc.setFillColor(255)
      doc.rect(130, finalY, 70, 20, 'F')
      doc.setDrawColor(59, 130, 246)
      doc.rect(130, finalY, 70, 20, 'S')

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(59, 130, 246)
      doc.text(`PAGADO: $${parseFloat(pago.monto).toFixed(2)}`, 165, finalY + 13, { align: 'center' })

      // FIRMA Y SELLO
      doc.setTextColor(100)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.line(15, 230, 80, 230)
      doc.text("Firma de Administración", 47, 236, { align: 'center' })

      doc.line(135, 230, 200, 230)
      doc.text("Sello de la Escuela", 167, 236, { align: 'center' })

      // FOOTER
      doc.setFontSize(9)
      doc.setTextColor(150)
      doc.text("Este documento es un comprobante fiscal simplificado generado por Tigres Payments.", 108, 265, { align: 'center' })
      doc.text("Tigres Do - Pasión por el Taekwondo", 108, 270, { align: 'center' })

      doc.save(`Recibo_Tigres_${alumno.nombre}_${pago.fecha_inicio}.pdf`)
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

  const toggleSeleccion = (id, e) => {
    e.stopPropagation()
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const pagarMasivo = async () => {
    if (selectedIds.length === 0) return

    const res = await Swal.fire({
      title: 'Pago Masivo',
      text: `¿Registrar pago para ${selectedIds.length} alumnos? Se usará el monto sugerido y método efectivo para el periodo actual.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cobrar a todos',
      confirmButtonColor: 'var(--accent-blue)',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)'
    })

    if (res.isConfirmed) {
      toast.info('Procesando pagos...')
      try {
        const promesas = selectedIds.map(id => {
          const alumno = alumnosConEstado.find(a => a.id === id)
          if (alumno.pagoActivo) return null // Saltamos si ya pagó

          const periodo = calcularPeriodo(alumno.dia_pago || 1)
          return api.post('/pagos', {
            alumno_id: id,
            fecha_inicio: periodo.fechaInicio,
            fecha_fin: periodo.fechaFin,
            monto: 1000, // Monto por defecto si no hay otro
            metodo_pago: 'efectivo',
            fecha_pago: hoy,
            estado: 'pagado',
            tipo: submodulo === 'mensualidades' ? 'mensualidad' : 'inscripcion'
          })
        }).filter(Boolean)

        await Promise.all(promesas)
        toast.success(`Se registraron ${promesas.length} pagos correctamente ✓`)
        setSelectedIds([])
        cargar()
      } catch { toast.error('Error al procesar algunos pagos') }
    }
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

    // Validar duplicados solo si es UN NUEVO PAGO
    if (!pagoAEditar) {
      const existePago = pagosActivos.some(p =>
        p.alumno_id === modalPago.id && p.fecha_inicio === periodo.fechaInicio && p.tipo === 'mensualidad'
      )

      if (esMensualidad && existePago) {
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
      <div style={{ ...s.card, opacity: 0.6 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-tertiary)', animation: 'pulse 1.5s infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '60%', height: 14, background: 'var(--bg-tertiary)', borderRadius: 4, marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
          <div style={{ width: '40%', height: 10, background: 'var(--bg-tertiary)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
        </div>
        <div style={{ width: 60, height: 28, background: 'var(--bg-tertiary)', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />
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
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={s.ingresosBadge}>
            <span style={s.ingresosLabel}>Mensualidades mes</span>
            <span style={s.ingresosValor}>${stats.ingresos_mes.toLocaleString()}</span>
          </div>
          <div style={{ ...s.ingresosBadge, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3)' }}>
            <span style={s.ingresosLabel}>Inscripciones mes</span>
            <span style={s.ingresosValor}>${(stats.ingresos_inscripciones || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* SUBMODULOS NAVIGATION */}
      <div style={s.subnav}>
        <button
          style={submodulo === 'mensualidades' ? s.subnavBtnActive : s.subnavBtn}
          onClick={() => setSubmodulo('mensualidades')}
        >
          Mensualidades
        </button>
        <button
          style={submodulo === 'inscripciones' ? s.subnavBtnActive : s.subnavBtn}
          onClick={() => setSubmodulo('inscripciones')}
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
            style={filtro === 'todos' ? s.tabActiveAzul : s.tab}
            onClick={() => setFiltro('todos')}
          >
            Todos ({alumnos.length})
          </button>
          <button
            style={filtro === 'pagado' ? s.tabActiveVerde : s.tab}
            onClick={() => setFiltro('pagado')}
          >
            Al corriente ({totalPagados})
          </button>
          <button
            style={filtro === 'pendiente' ? s.tabActiveRojo : s.tab}
            onClick={() => setFiltro('pendiente')}
          >
            Pendientes ({totalPendientes})
          </button>
        </div>
      </div>

      <div style={s.filtrosSecundarios}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select style={s.selectFiltro} value={filtroCinta} onChange={e => setFiltroCinta(e.target.value)}>
            <option value="">Todas las cintas</option>
            {cintas.map(c => <option key={c.id} value={c.id}>{c.nombre_nivel}</option>)}
          </select>

          <select style={s.selectFiltro} value={filtroHorario} onChange={e => setFiltroHorario(e.target.value)}>
            <option value="">Todos los horarios</option>
            {horarios.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
          </select>

          <div style={s.dateFilterContainer}>
            <input
              type="date"
              style={s.dateInput}
              value={filtroFechaPago}
              onChange={e => setFiltroFechaPago(e.target.value)}
            />
            {filtroFechaPago && (
              <button style={s.btnClearDate} onClick={() => setFiltroFechaPago('')}>✕</button>
            )}
          </div>

          {submodulo === 'inscripciones' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', marginLeft: '8px', padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
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

        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.btnExportExcel} onClick={exportarExcel} title="Exportar a Excel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Excel
          </button>
          <button style={s.btnExportPDF} onClick={exportarPDF} title="Exportar a PDF">
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
              <div key={a.id} style={{ ...s.card, borderLeft: `4px solid ${pagado ? 'var(--accent-green)' : 'var(--accent-red)'}`, position: 'relative' }}
                onClick={() => abrirHistorial(a)}>

                {/* Checkbox selección */}
                <div
                  onClick={(e) => toggleSeleccion(a.id, e)}
                  style={{
                    width: '20px', height: '20px', borderRadius: '4px', border: '2px solid var(--border)',
                    background: selectedIds.includes(a.id) ? 'var(--accent-blue)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: '0.2s', flexShrink: 0
                  }}
                >
                  {selectedIds.includes(a.id) && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                </div>

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
                    <div style={s.nombre}>{a.nombre} {a.apellido_paterno}</div>
                    {submodulo === 'mensualidades' && a.tieneDeudaAntigua && !pagado && (
                      <span style={s.badgeDeuda} title="Debe periodos anteriores">DEUDA CRÍTICA</span>
                    )}
                  </div>
                  <div style={s.periodo}>{submodulo === 'mensualidades' ? `📅 ${a.periodo.label}` : '🎟️ Inscripción Anual'}</div>
                </div>

                {/* Estado y acción */}
                <div style={s.derecha}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!pagado && submodulo === 'mensualidades' && (
                      <button style={s.btnWhatsApp} onClick={(e) => { e.stopPropagation(); enviarWhatsApp(a); }} title="Recordar por WhatsApp">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.554.92 3.14 1.407 4.793 1.408 5.432 0 9.854-4.422 9.856-9.856.002-5.433-4.419-9.853-9.853-9.853-5.435 0-9.856 4.422-9.858 9.854-.001 1.838.512 3.633 1.483 5.213l-1.103 4.025 4.128-1.082zm11.367-7.604c-.31-.155-1.836-.906-2.115-1.008-.28-.101-.483-.153-.686.154-.203.308-.787 1.008-.965 1.213-.177.205-.355.231-.665.077-.31-.155-1.307-.482-2.489-1.536-.919-.82-1.539-1.831-1.719-2.139-.18-.308-.02-.475.135-.629.14-.139.31-.36.465-.54.155-.181.206-.309.31-.515.103-.206.052-.386-.025-.54-.078-.155-.686-1.656-.941-2.261-.249-.59-.503-.51-.686-.519-.177-.008-.381-.01-.584-.01-.203 0-.533.077-.812.385-.279.308-1.066 1.044-1.066 2.545 0 1.501 1.091 2.951 1.243 3.156.153.205 2.146 3.276 5.198 4.59.726.313 1.293.499 1.734.639.73.232 1.393.199 1.918.121.585-.088 1.836-.751 2.09-1.474.254-.724.254-1.344.177-1.474-.076-.13-.279-.234-.589-.389z" />
                        </svg>
                      </button>
                    )}
                    {pagado && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={submodulo === 'mensualidades' ? s.badgePagado : s.badgeInscrito}>✓ {submodulo === 'mensualidades' ? 'PAGADO' : 'INSCRITO'}</span>
                        <button
                          style={s.btnIconTrash}
                          onClick={(e) => eliminarPago(a.pagoActivo.id, e)}
                          title="Quitar registro"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>

                        {/* Botones de recibo rápido */}
                        <button
                          style={s.btnIconBlueSmall}
                          onClick={(e) => { e.stopPropagation(); generarRecibo(a.pagoActivo, a); }}
                          title="Descargar Recibo"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                        </button>
                        <button
                          style={s.btnIconGreenSmall}
                          onClick={(e) => { e.stopPropagation(); enviarComprobanteWhatsApp(a.pagoActivo, a); }}
                          title="Enviar por WhatsApp"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.554.92 3.14 1.407 4.793 1.408 5.432 0 9.854-4.422 9.856-9.856.002-5.433-4.419-9.853-9.853-9.853-5.435 0-9.856 4.422-9.858 9.854-.001 1.838.512 3.633 1.483 5.213l-1.103 4.025 4.128-1.082zm11.367-7.604c-.31-.155-1.836-.906-2.115-1.008-.28-.101-.483-.153-.686.154-.203.308-.787 1.008-.965 1.213-.177.205-.355.231-.665.077-.31-.155-1.307-.482-2.489-1.536-.919-.82-1.539-1.831-1.719-2.139-.18-.308-.02-.475.135-.629.14-.139.31-.36.465-.54.155-.181.206-.309.31-.515.103-.206.052-.386-.025-.54-.078-.155-.686-1.656-.941-2.261-.249-.59-.503-.51-.686-.519-.177-.008-.381-.01-.584-.01-.203 0-.533.077-.812.385-.279.308-1.066 1.044-1.066 2.545 0 1.501 1.091 2.951 1.243 3.156.153.205 2.146 3.276 5.198 4.59.726.313 1.293.499 1.734.639.73.232 1.393.199 1.918.121.585-.088 1.836-.751 2.09-1.474.254-.724.254-1.344.177-1.474-.076-.13-.279-.234-.589-.389z"/>
                          </svg>
                        </button>
                      </div>
                    )}

                    <button style={s.btnPagarSmall} onClick={(e) => abrirModalPago(a, e)} title={pagado ? "Registrar otro pago" : "Registrar pago"}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </div>

                  {pagado && (
                    <div style={s.montoInfo}>
                      ${parseFloat(a.pagoActivo.monto).toFixed(2)} · {a.pagoActivo.metodo_pago}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* BARRA DE ACCIONES MASIVAS */}
      {selectedIds.length > 0 && (
        <div style={s.bulkBar}>
          <div style={s.bulkInfo}>
            <strong>{selectedIds.length}</strong> alumnos seleccionados
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={s.btnSecondary} onClick={() => setSelectedIds([])}>Cancelar</button>
            <button style={s.btnConfirmar} onClick={pagarMasivo}>💰 Registrar Pagos ($1000/u)</button>
          </div>
        </div>
      )}

      {/* ── MODAL RÁPIDO DE PAGO ── */}
      {modalPago && (
        <div style={s.overlayModal} onClick={() => { setModalPago(null); setPagoAEditar(null); }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitulo}>{pagoAEditar ? 'Editar Pago' : 'Registrar Pago'}</h3>
                <p style={s.modalSub}>{modalPago.nombre} {modalPago.apellido_paterno} {modalPago.apellido_materno}</p>
              </div>
              <button style={s.btnCerrar} onClick={() => setModalPago(null)}>✕</button>
            </div>

            <div style={s.grid2}>
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
                      🎟️ Concepto: Inscripción TKD Tigres
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
              <button style={s.btnSecondary} onClick={() => { setModalPago(null); setPagoAEditar(null); }}>Cancelar</button>
              <button style={s.btnConfirmar} onClick={confirmarPago}>
                {pagoAEditar ? '✓ Guardar Cambios' : '✓ Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL DE HISTORIAL ── */}
      {historialAlumno && (
        <div style={s.overlay} onClick={cerrarHistorial}>
          <div style={s.drawer} onClick={e => e.stopPropagation()}>
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
              <button style={s.btnCerrar} onClick={cerrarHistorial}>✕</button>
            </div>

            <div style={s.drawerContent}>
              {cargandoHistorial ? (
                <div style={s.empty}>Cargando historial...</div>
              ) : historial.length === 0 ? (
                <div style={s.empty}>Sin pagos registrados</div>
              ) : (
                <>
                  {/* Resumen */}
                  <div style={s.resumenHistorial}>
                    <div style={s.resumenHistItem}>
                      <span style={{ ...s.resumenNum, fontSize: '20px', color: 'var(--accent-green)' }}>
                        {new Set(historial.filter(p => p.estado === 'pagado').map(p => p.fecha_inicio)).size}
                      </span>
                      <span style={s.resumenLabel}>Meses pagados</span>
                    </div>
                    <div style={s.resumenHistItem}>
                      <span style={{ ...s.resumenNum, fontSize: '20px', color: 'var(--accent-green)' }}>
                        ${historial.filter(p => p.estado === 'pagado')
                          .reduce((sum, p) => sum + parseFloat(p.monto), 0).toFixed(2)}
                      </span>
                      <span style={s.resumenLabel}>Total pagado</span>
                    </div>
                  </div>

                  {/* Lista de pagos */}
                  <div style={s.historialLista}>
                    {historial.map(p => (
                      <div key={p.id} style={s.historialItem}>
                        <div style={s.historialPeriodo}>
                          <div style={s.historialFechas}>
                            {p.fecha_inicio ? `${fmtFecha(p.fecha_inicio)} → ${fmtFecha(p.fecha_fin)}` : p.mes}
                          </div>
                          <div style={s.historialDetalle}>{p.metodo_pago} · {fmtFecha(p.fecha_pago)}</div>
                        </div>
                        <div style={s.historialDerecha}>
                          <div style={{ ...s.historialMonto, color: 'var(--accent-green)' }}>
                            ${parseFloat(p.monto).toFixed(2)}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              style={s.btnIconEdit}
                              onClick={() => abrirModalEdicion(p)}
                              title="Editar este pago"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>

                            <button
                              style={s.btnIconBlueSmall}
                              onClick={() => generarRecibo(p, historialAlumno)}
                              title="Descargar Recibo"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                              </svg>
                            </button>
                            <button
                              style={s.btnIconGreenSmall}
                              onClick={() => enviarComprobanteWhatsApp(p, historialAlumno)}
                              title="Enviar por WhatsApp"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.554.92 3.14 1.407 4.793 1.408 5.432 0 9.854-4.422 9.856-9.856.002-5.433-4.419-9.853-9.853-9.853-5.435 0-9.856 4.422-9.858 9.854-.001 1.838.512 3.633 1.483 5.213l-1.103 4.025 4.128-1.082zm11.367-7.604c-.31-.155-1.836-.906-2.115-1.008-.28-.101-.483-.153-.686.154-.203.308-.787 1.008-.965 1.213-.177.205-.355.231-.665.077-.31-.155-1.307-.482-2.489-1.536-.919-.82-1.539-1.831-1.719-2.139-.18-.308-.02-.475.135-.629.14-.139.31-.36.465-.54.155-.181.206-.309.31-.515.103-.206.052-.386-.025-.54-.078-.155-.686-1.656-.941-2.261-.249-.59-.503-.51-.686-.519-.177-.008-.381-.01-.584-.01-.203 0-.533.077-.812.385-.279.308-1.066 1.044-1.066 2.545 0 1.501 1.091 2.951 1.243 3.156.153.205 2.146 3.276 5.198 4.59.726.313 1.293.499 1.734.639.73.232 1.393.199 1.918.121.585-.088 1.836-.751 2.09-1.474.254-.724.254-1.344.177-1.474-.076-.13-.279-.234-.589-.389z"/>
                              </svg>
                            </button>
                            <button
                              style={s.btnIconTrash}
                              onClick={(e) => eliminarPago(p.id, e)}
                              title="Eliminar este pago"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              </svg>
                            </button>
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
    </div>
  )
}

const s = {
  page: { padding: '' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  titulo: { fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 },
  sub: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' },
  barraAcciones: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '16px' },
  search: { flex: 1, maxWidth: '395px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '80px', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.3s ease' },
  tabs: { display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)', flexShrink: 0 },
  tab: { padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', minWidth: '120px', textAlign: 'center', transition: 'all 0.2s', borderRadius: '8px' },
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
  nombre: { fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' },
  periodo: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' },
  derecha: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 },
  badgePagado: { background: 'var(--accent-green-bg)', color: 'var(--accent-green)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' },
  badgeInscrito: { background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' },
  montoInfo: { fontSize: '12px', color: 'var(--text-muted)' },
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