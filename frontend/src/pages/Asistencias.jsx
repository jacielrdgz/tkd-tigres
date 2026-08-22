import React, { useEffect, useState, useCallback, useMemo } from 'react'
import api from '../api/axios'
import { toast } from 'react-toastify'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

import AsistenciasTopbar from '../components/Asistencias/AsistenciasTopbar'
import AsistenciasSummaryCards from '../components/Asistencias/AsistenciasSummaryCards'
import TabPorAlumno from '../components/Asistencias/TabPorAlumno'
import TabPorFecha from '../components/Asistencias/TabPorFecha'
import ModalAlumno from '../components/Asistencias/ModalAlumno'
import ModalDia from '../components/Asistencias/ModalDia'
import ModalRegistrar from '../components/Asistencias/ModalRegistrar'
import Swal from 'sweetalert2'

function mesActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

const formatHora = (hora) => {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hrs = parseInt(h)
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  const h12 = hrs % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export default function Asistencias() {
  const [tab, setTab] = useState('alumno')        // 'alumno' | 'fecha'
  const [mes, setMes] = useState(mesActual)

  // Datos
  const [resumen, setResumen] = useState(null)
  const [listaAlumnos, setListaAlumnos] = useState([])
  const [datosPorFecha, setDatosPorFecha] = useState({})
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false)
  const [listaFiltrada, setListaFiltrada] = useState([])
  const [cargandoFecha, setCargandoFecha] = useState(false)
  const [cargandoResumen, setCargandoResumen] = useState(false)

  // Modales
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null)
  const [modalRegistrar, setModalRegistrar] = useState(false)
  const [haGuardadoEnModal, setHaGuardadoEnModal] = useState(false)
  const [fechaRegistroGuardada, setFechaRegistroGuardada] = useState('')

  // ── Cargar resumen (común a ambos tabs) ──────────────────────────────────
  const cargarResumen = useCallback(async () => {
    setCargandoResumen(true)
    try {
      const res = await api.get('/asistencias/resumen', { params: { mes } })
      setResumen(res.data)
    } catch {
      toast.error('Error al cargar resumen')
    } finally {
      setCargandoResumen(false)
    }
  }, [mes])

  // ── Cargar datos tab Por Alumno ───────────────────────────────────────────
  const cargarPorAlumno = useCallback(async () => {
    setCargandoAlumnos(true)
    try {
      const res = await api.get('/asistencias/por-alumno', { params: { mes } })
      setListaAlumnos(res.data)
    } catch {
      toast.error('Error al cargar asistencias por alumno')
    } finally {
      setCargandoAlumnos(false)
    }
  }, [mes])

  // ── Cargar datos tab Por Fecha ────────────────────────────────────────────
  const cargarPorFecha = useCallback(async () => {
    setCargandoFecha(true)
    try {
      const res = await api.get('/asistencias/por-fecha', { params: { mes } })
      setDatosPorFecha(res.data)
    } catch {
      toast.error('Error al cargar asistencias por fecha')
    } finally {
      setCargandoFecha(false)
    }
  }, [mes])

  // ── Efectos ───────────────────────────────────────────────────────────────
  useEffect(() => {
    cargarResumen()
  }, [cargarResumen])

  useEffect(() => {
    if (tab === 'alumno') cargarPorAlumno()
  }, [tab, cargarPorAlumno])

  useEffect(() => {
    if (tab === 'fecha') cargarPorFecha()
  }, [tab, cargarPorFecha])

  // ── Stats para las cards del tab Por Fecha (calculadas del datosPorFecha) ─
  const resumenFecha = useMemo(() => {
    const entradas = Object.entries(datosPorFecha)
    const clases = entradas.length
    if (clases === 0) return { clases_en_mes: 0, promedio_diario: 0, dias_baja: 0 }
    const sumPct = entradas.reduce((acc, [, v]) => acc + (v.pct || 0), 0)
    const dias_baja = entradas.filter(([, v]) => v.pct < 80).length
    return {
      clases_en_mes: clases,
      promedio_diario: Math.round(sumPct / clases),
      dias_baja,
    }
  }, [datosPorFecha])

  // ── Exportar ──────────────────────────────────────────────────────────────
  const handleExportar = async (formato) => {
    const dataAExportar = tab === 'alumno' ? listaFiltrada : listaAlumnos;
    if (dataAExportar.length === 0) return toast.warning('No hay datos para exportar')

    const mesLabel = new Date(mes + '-02').toLocaleString('es-ES', { month: 'long', year: 'numeric' })

    if (formato === 'excel') {
      const data = dataAExportar.map((a, i) => ({
        '#': i + 1,
        'Nombre Completo': `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
        'Cinta': a.cinta_config?.nombre_nivel || 'Sin cinta',
        'Horario': a.horario_config
          ? `${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)} - ${formatHora(a.horario_config.hora_fin)})`
          : 'Sin horario',
        'Asistencias': a.asistio,
        'Faltas': a.falto,
        'Total Clases': a.total,
        '% Asistencia': `${a.pct}%`,
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencias')
      XLSX.writeFile(wb, `Asistencias_${mes}.xlsx`)
    } else {
      let escuelaInfo = null
      try {
        const res = await api.get('/configuracion-escuela')
        escuelaInfo = res.data
      } catch (e) {
        console.warn('No se pudo cargar escuelaInfo para el PDF')
      }

      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' })

      // FONDO Y CABECERA (Hoja Membretada)
      doc.setFillColor(245, 247, 250)
      doc.rect(0, 0, 216, 279, 'F')
      doc.setFillColor(59, 130, 246)
      doc.rect(0, 0, 5, 279, 'F')

      // CARGAR LOGO
      let logoFinal = escuelaInfo?.logo_base64
      if (!logoFinal) {
        try {
          const resp = await fetch('/tigreslogo.jpg')
          const blob = await resp.blob()
          logoFinal = await new Promise((res, rej) => {
            const reader = new FileReader()
            reader.onload = () => res(reader.result)
            reader.onerror = rej
            reader.readAsDataURL(blob)
          })
        } catch (err) {
          console.warn('Logo genérico no disponible')
        }
      }

      if (logoFinal) {
        const ext = logoFinal.includes('png') ? 'PNG' : 'JPEG'
        doc.addImage(logoFinal, ext, 15, 12, 32, 32)
      } else {
        doc.setFillColor(240, 242, 245)
        doc.circle(31, 28, 16, 'F')
        doc.setFontSize(20)
        doc.setTextColor(59, 130, 246)
        doc.text('TKD', 31, 31, { align: 'center' })
      }

      // TEXTO CABECERA ESCUELA
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      if (escuelaInfo?.nombre) doc.text(escuelaInfo.nombre.toUpperCase(), 52, 22)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(100)
      
      let addressStr = ""
      if (escuelaInfo?.direccion) {
        const d = escuelaInfo.direccion
        const parts = [
          d.calle && `#${d.numero_exterior || ''}`,
          d.colonia && `Col. ${d.colonia}`,
          d.ciudad,
          d.estado
        ].filter(Boolean)
        addressStr = (d.calle ? d.calle + " " : "") + parts.join(", ").replace(/,,/g, ',').trim()
      }
      
      let nextY = 28;
      if (addressStr) {
        const splitAddress = doc.splitTextToSize(addressStr, 85);
        doc.text(splitAddress, 52, nextY)
        nextY += (splitAddress.length * 4.5);
      }

      const contacts = [];
      if (escuelaInfo?.telefono_contacto) contacts.push(`Tel: ${escuelaInfo.telefono_contacto}`);
      if (escuelaInfo?.email_contacto) contacts.push(`Email: ${escuelaInfo.email_contacto}`);
      if (contacts.length > 0) doc.text(contacts.join(" | "), 52, nextY)

      // TITULO REPORTE (DERECHA)
      doc.setFillColor(59, 130, 246)
      doc.rect(145, 15, 55, 12, 'F')
      doc.setTextColor(255)
      doc.setFontSize(11)
      doc.text("REPORTE ASISTENCIA", 172.5, 23, { align: 'center' })

      doc.setTextColor(40)
      doc.setFontSize(10)
      doc.text(`Período:`, 145, 32)
      doc.setFont('helvetica', 'bold')
      doc.text(mesLabel.toUpperCase(), 145, 37)
      doc.setFont('helvetica', 'normal')

      // TABLA
      autoTable(doc, {
        startY: 55,
        head: [['#', 'Alumno', 'Cinta', 'Horario', 'Asistió', 'Faltó', 'Total', '%']],
        body: dataAExportar.map((a, i) => [
          i + 1,
          `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
          a.cinta_config?.nombre_nivel || '-',
          a.horario_config
            ? `${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)} - ${formatHora(a.horario_config.hora_fin)})`
            : '-',
          a.asistio,
          a.falto,
          a.total,
          `${a.pct}%`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      })

      // FOOTER
      const finalY = doc.lastAutoTable.finalY + 15
      doc.setFontSize(9)
      doc.setTextColor(150)
      doc.text(`Generado el ${new Date().toLocaleDateString('es-MX')} a las ${new Date().toLocaleTimeString('es-MX')}`, 108, 270, { align: 'center' })

      doc.save(`Asistencias_${mes}.pdf`)
    }
  }

  // ── Nombre del mes actual para el topbar ─────────────────────────────────
  const totalActivos = resumen?.total_alumnos ?? 0

  return (
    <div style={s.page}>
      {/* Topbar */}
      <AsistenciasTopbar
        mesActual={mes}
        totalActivos={totalActivos}
        onExportar={handleExportar}
        onRegistrar={() => setModalRegistrar(true)}
      />

      {/* Tabs de navegación */}
      <div style={s.tabsNav}>
        <TabButton
          active={tab === 'alumno'}
          onClick={() => setTab('alumno')}
          icon="👤"
          label="Por Alumno"
        />
        <TabButton
          active={tab === 'fecha'}
          onClick={() => setTab('fecha')}
          icon="📅"
          label="Por Fecha"
        />
      </div>

      {/* Summary Cards */}
      <AsistenciasSummaryCards
        tab={tab}
        resumen={tab === 'alumno' ? resumen : resumenFecha}
        cargando={tab === 'alumno' ? cargandoResumen : cargandoFecha}
      />

      {/* Contenido según tab */}
      <div style={{ animation: 'fadeIn 0.25s ease' }} key={tab}>
        {tab === 'alumno' ? (
          <TabPorAlumno
            alumnos={listaAlumnos}
            cargando={cargandoAlumnos}
            mes={mes}
            onCambiarMes={setMes}
            onVerAlumno={setAlumnoSeleccionado}
            onFiltradosChange={setListaFiltrada}
          />
        ) : (
          <TabPorFecha
            mes={mes}
            onCambiarMes={setMes}
            datosPorFecha={datosPorFecha}
            cargando={cargandoFecha}
            onDiaClick={setFechaSeleccionada}
          />
        )}
      </div>

      {/* Modales */}
      {alumnoSeleccionado && (
        <ModalAlumno
          alumno={alumnoSeleccionado}
          onCerrar={() => setAlumnoSeleccionado(null)}
        />
      )}

      {fechaSeleccionada && (
        <ModalDia
          fecha={fechaSeleccionada}
          onCerrar={() => setFechaSeleccionada(null)}
        />
      )}

      {modalRegistrar && (
        <ModalRegistrar
          onCerrar={() => {
            setModalRegistrar(false)
            if (haGuardadoEnModal) {
              const fechaFormateada = fechaRegistroGuardada
                ? new Date(fechaRegistroGuardada + 'T12:00:00')
                    .toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                : ''

              Swal.fire({
                icon: 'success',
                title: '¡Asistencia Guardada!',
                html: `Asistencias registradas correctamente para el día:<br/><br/><strong>${fechaFormateada}</strong>`,
                timer: 2000,
                showConfirmButton: false,
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                iconColor: 'var(--accent-green)',
              })
              setHaGuardadoEnModal(false)
            }
          }}
          onGuardado={(fechaReg) => {
            setHaGuardadoEnModal(true)
            setFechaRegistroGuardada(fechaReg)
            cargarResumen()
            if (tab === 'alumno') cargarPorAlumno()
            else cargarPorFecha()
          }}
        />
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '9px 20px',
        borderRadius: 10,
        border: 'none',
        background: active ? 'var(--accent-blue)' : 'transparent',
        color: active ? '#fff' : 'var(--text-muted)',
        fontSize: 13, fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        boxShadow: active ? 'var(--shadow-glow-blue)' : 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
      }}
      onClick={onClick}
    >
      <span>{icon}</span>
      {label}
    </button>
  )
}

const s = {
  page: {
    paddingBottom: 40,
  },
  tabsNav: {
    display: 'flex',
    gap: 4,
    padding: '4px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    width: 'fit-content',
    marginBottom: 24,
    boxShadow: 'var(--shadow-sm)',
  },
}
