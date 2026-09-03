import React, { useEffect, useState, useCallback, useMemo } from 'react'
import api from '../api/axios'
import { toast } from 'react-toastify'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { FiUser, FiCalendar } from 'react-icons/fi'

import AsistenciasTopbar from '../components/Asistencias/AsistenciasTopbar'
import AsistenciasSummaryCards from '../components/Asistencias/AsistenciasSummaryCards'
import TabPorAlumno from '../components/Asistencias/TabPorAlumno'
import TabPorFecha from '../components/Asistencias/TabPorFecha'
import ModalAlumno from '../components/Asistencias/ModalAlumno'
import ModalDia from '../components/Asistencias/ModalDia'
import ModalRegistrar from '../components/Asistencias/ModalRegistrar'
import Swal from 'sweetalert2'
import { useAuth } from '../context/AuthContext'
import { obtenerInfoEscuelaParaPDF, dibujarEncabezadoMembrete, agregarPieDePagina, formatearPeriodoOMes, guardarODescargarPDF } from '../utils/pdfHelper'
import { getCache, setCache, invalidateCache } from '../utils/cacheManager'

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
  const { user } = useAuth()
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
  const cargarResumen = useCallback(async (force = false) => {
    const key = `asistencias_resumen_${mes}`
    if (!force) {
      const cached = getCache(key)
      if (cached && cached.data) {
        setResumen(cached.data)
        setCargandoResumen(false)
      } else {
        setCargandoResumen(true)
      }
    } else {
      setCargandoResumen(true)
    }

    try {
      const res = await api.get('/asistencias/resumen', { params: { mes } })
      setResumen(res.data)
      setCache(key, res.data)
    } catch {
      const cached = getCache(key)
      if (!cached || !cached.data) {
        toast.error('Error al cargar resumen')
      }
    } finally {
      setCargandoResumen(false)
    }
  }, [mes])

  // ── Cargar datos tab Por Alumno ───────────────────────────────────────────
  const cargarPorAlumno = useCallback(async (force = false) => {
    const key = `asistencias_alumno_${mes}`
    if (!force) {
      const cached = getCache(key)
      if (cached && cached.data) {
        setListaAlumnos(cached.data)
        setCargandoAlumnos(false)
      } else {
        setCargandoAlumnos(true)
      }
    } else {
      setCargandoAlumnos(true)
    }

    try {
      const res = await api.get('/asistencias/por-alumno', { params: { mes } })
      setListaAlumnos(res.data)
      setCache(key, res.data)
    } catch {
      const cached = getCache(key)
      if (!cached || !cached.data) {
        toast.error('Error al cargar asistencias por alumno')
      }
    } finally {
      setCargandoAlumnos(false)
    }
  }, [mes])

  // ── Cargar datos tab Por Fecha ────────────────────────────────────────────
  const cargarPorFecha = useCallback(async (force = false) => {
    const key = `asistencias_fecha_${mes}`
    if (!force) {
      const cached = getCache(key)
      if (cached && cached.data) {
        setDatosPorFecha(cached.data)
        setCargandoFecha(false)
      } else {
        setCargandoFecha(true)
      }
    } else {
      setCargandoFecha(true)
    }

    try {
      const res = await api.get('/asistencias/por-fecha', { params: { mes } })
      setDatosPorFecha(res.data)
      setCache(key, res.data)
    } catch {
      const cached = getCache(key)
      if (!cached || !cached.data) {
        toast.error('Error al cargar asistencias por fecha')
      }
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

  // ── Precarga silenciosa en segundo plano de meses adyacentes ─────────────
  useEffect(() => {
    if (!mes) return

    const [anio, mesNum] = mes.split('-').map(Number)
    const prevDate = new Date(anio, mesNum - 2, 1)
    const nextDate = new Date(anio, mesNum, 1)

    const mesPrev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    const mesNext = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`

    const timer = setTimeout(() => {
      // Precargar mes anterior
      if (!getCache(`asistencias_fecha_${mesPrev}`)) {
        api.get('/asistencias/por-fecha', { params: { mes: mesPrev } })
          .then(res => setCache(`asistencias_fecha_${mesPrev}`, res.data))
          .catch(() => {})
      }
      // Precargar mes siguiente
      if (!getCache(`asistencias_fecha_${mesNext}`)) {
        api.get('/asistencias/por-fecha', { params: { mes: mesNext } })
          .then(res => setCache(`asistencias_fecha_${mesNext}`, res.data))
          .catch(() => {})
      }
      // Precargar resumen anterior y siguiente
      if (!getCache(`asistencias_resumen_${mesPrev}`)) {
        api.get('/asistencias/resumen', { params: { mes: mesPrev } })
          .then(res => setCache(`asistencias_resumen_${mesPrev}`, res.data))
          .catch(() => {})
      }
      if (!getCache(`asistencias_resumen_${mesNext}`)) {
        api.get('/asistencias/resumen', { params: { mes: mesNext } })
          .then(res => setCache(`asistencias_resumen_${mesNext}`, res.data))
          .catch(() => {})
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [mes])

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
      const escuelaInfo = await obtenerInfoEscuelaParaPDF()
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' })

      // Dibujar membrete oficial superior
      const startY = dibujarEncabezadoMembrete(doc, {
        escuelaInfo,
        tipoReporte: 'REPORTE ASISTENCIA',
        subtituloEtiqueta: 'Período:',
        subtituloValor: formatearPeriodoOMes(mes)
      })

      // TABLA
      autoTable(doc, {
        startY: startY,
        head: [['#', 'Nombre Alumno', 'Cinta', 'Horario', 'Asistió', 'Faltó', 'Total', '%']],
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
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8, cellPadding: 2, halign: 'center' },
        styles: { fontSize: 7.8, cellPadding: 2.5, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 50, halign: 'left' },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 42, halign: 'center' },
          4: { cellWidth: 15, halign: 'center' },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 15, halign: 'center' },
          7: { cellWidth: 15, halign: 'center' }
        },
        margin: { left: 14, right: 14, bottom: 18 }
      })

      // FOOTER
      agregarPieDePagina(doc, user)

      await guardarODescargarPDF(doc, `Asistencias_${mes}.pdf`)
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
          icon={<FiUser size={14} />}
          label="Por Alumno"
        />
        <TabButton
          active={tab === 'fecha'}
          onClick={() => setTab('fecha')}
          icon={<FiCalendar size={14} />}
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
        fontSize: 13, fontWeight: active ? 700 : 600,
        cursor: 'pointer',
        boxShadow: active ? 'var(--shadow-glow-blue)' : 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
      }}
      onClick={onClick}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span>{label}</span>
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
