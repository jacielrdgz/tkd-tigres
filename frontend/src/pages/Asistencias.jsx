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

function mesActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

export default function Asistencias() {
  const [tab, setTab] = useState('alumno')        // 'alumno' | 'fecha'
  const [mes, setMes] = useState(mesActual)

  // Datos
  const [resumen, setResumen] = useState(null)
  const [listaAlumnos, setListaAlumnos] = useState([])
  const [datosPorFecha, setDatosPorFecha] = useState({})
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false)
  const [cargandoFecha, setCargandoFecha] = useState(false)
  const [cargandoResumen, setCargandoResumen] = useState(false)

  // Modales
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null)
  const [modalRegistrar, setModalRegistrar] = useState(false)

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
  const handleExportar = (formato) => {
    if (listaAlumnos.length === 0) return toast.warning('No hay datos para exportar')

    const mesLabel = new Date(mes + '-02').toLocaleString('es-ES', { month: 'long', year: 'numeric' })

    if (formato === 'excel') {
      const data = listaAlumnos.map(a => ({
        'Nombre Completo': `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
        'Grado': a.cinta_config?.nombre_nivel || 'Sin cinta',
        'Horario': a.horario_config?.nombre || 'Sin horario',
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
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text('Reporte de Asistencias — TKD Tigres', 14, 18)
      doc.setFontSize(10)
      doc.setTextColor(120)
      doc.text(`Período: ${mesLabel}`, 14, 26)

      autoTable(doc, {
        startY: 32,
        head: [['Alumno', 'Grado', 'Horario', 'Asistió', 'Faltó', 'Total', '%']],
        body: listaAlumnos.map(a => [
          `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
          a.cinta_config?.nombre_nivel || '-',
          a.horario_config?.nombre || '-',
          a.asistio,
          a.falto,
          a.total,
          `${a.pct}%`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      })
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
            onVerAlumno={setAlumnoSeleccionado}
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
          onCerrar={() => setModalRegistrar(false)}
          onGuardado={() => {
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
