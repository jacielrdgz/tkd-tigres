import React, { useState, useEffect, useMemo } from 'react'
import { FiX, FiCalendar, FiCheck } from 'react-icons/fi'
import api from '../../api/axios'
import BotonExportar from '../Common/BotonExportar'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'react-toastify'
import { obtenerInfoEscuelaParaPDF, dibujarEncabezadoMembrete, agregarPieDePagina, guardarODescargarPDF } from '../../utils/pdfHelper'
import { getCache, setCache } from '../../utils/cacheManager'

const formatHora = (hora) => {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hrs = parseInt(h)
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  const h12 = hrs % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function Avatar({ alumno, size = 36 }) {
  const [imgError, setImgError] = useState(false)
  const iniciales = ((alumno.nombre?.[0] || '') + (alumno.apellido_paterno?.[0] || '')).toUpperCase()
  const url = alumno.foto_url ? alumno.foto_url.replace(/\\\//g, '/') : null

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)',
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700,
      boxShadow: 'none',
    }}>
      {iniciales}
    </div>
  )
}

export default function ModalDia({ fecha, onCerrar, isMobile: propIsMobile }) {
  const [tab, setTab] = useState('todos')
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)

  const [localIsMobile, setLocalIsMobile] = useState(() => window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setLocalIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = typeof propIsMobile === 'boolean' ? propIsMobile : localIsMobile

  useEffect(() => {
    if (!fecha) return
    const key = `asistencias_dia_detalle_${fecha}`
    const cached = getCache(key)
    if (cached && cached.data) {
      setDatos(cached.data)
      setCargando(false)
    } else {
      setCargando(true)
      setDatos(null)
    }
    setTab('todos')

    api.get(`/asistencias/dia/${fecha}`)
      .then(r => {
        setDatos(r.data)
        setCache(key, r.data)
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [fecha])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCerrar])

  if (!fecha) return null

  const fechaFormateada = new Date(fecha + 'T12:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const alumnosOrdenados = useMemo(() => {
    const raw = datos?.alumnos ?? []

    const comparar = (a, b) => {
      // 1. Horario (hora_inicio ascendente)
      const horaA = a.horario_config?.hora_inicio || '23:59:59'
      const horaB = b.horario_config?.hora_inicio || '23:59:59'
      if (horaA !== horaB) return horaA.localeCompare(horaB)

      // 2. Cinta (orden ascendente)
      const ordA = a.cinta_config?.orden ?? 999
      const ordB = b.cinta_config?.orden ?? 999
      if (ordA !== ordB) return ordA - ordB

      // 3. Edad (menores primero = fecha de nacimiento más reciente/alta)
      const fnA = new Date(a.fecha_nacimiento || '1900-01-01').getTime()
      const fnB = new Date(b.fecha_nacimiento || '1900-01-01').getTime()
      if (fnA !== fnB) return fnB - fnA

      // 4. Nombre alfabético
      const nomA = `${a.nombre || ''} ${a.apellido_paterno || ''}`.trim()
      const nomB = `${b.nombre || ''} ${b.apellido_paterno || ''}`.trim()
      return nomA.localeCompare(nomB)
    }

    const presentes = raw.filter(a => a.asistio).sort(comparar)
    const ausentes = raw.filter(a => !a.asistio).sort(comparar)

    return [...presentes, ...ausentes]
  }, [datos])

  const alumnos = alumnosOrdenados
  const stats = datos?.stats ?? { total: 0, asistieron: 0, faltaron: 0, pct: 0 }

  const asistieron = useMemo(() => alumnos.filter(a => a.asistio), [alumnos])
  const faltaron = useMemo(() => alumnos.filter(a => !a.asistio), [alumnos])
  const listaMostrada = tab === 'todos' ? alumnos : tab === 'asistieron' ? asistieron : faltaron

  const exportarExcel = () => {
    if (!alumnos || alumnos.length === 0) return toast.info('No hay datos para exportar')

    const data = listaMostrada.map((a, i) => ({
      '#': i + 1,
      'Alumno': `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.trim(),
      'Cinta / Grado': a.cinta_config?.nombre_nivel || 'Sin cinta',
      'Horario': a.horario_config
        ? `${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)} - ${formatHora(a.horario_config.hora_fin)})`
        : 'Sin horario',
      'Estado': a.asistio ? 'ASISTIÓ' : 'FALTÓ',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia")
    XLSX.writeFile(wb, `Asistencia_${fecha}.xlsx`)
    toast.success('Excel descargado con éxito')
  }

  const exportarPDF = async () => {
    if (!alumnos || alumnos.length === 0) return toast.info('No hay datos para exportar')

    try {
      const doc = new jsPDF()
      const escuelaInfo = await obtenerInfoEscuelaParaPDF()

      const startY = dibujarEncabezadoMembrete(doc, {
        escuelaInfo,
        tipoReporte: 'REPORTE DE ASISTENCIA DIARIA',
        subtituloEtiqueta: 'Fecha:',
        subtituloValor: fechaFormateada.toUpperCase(),
      })

      // Estadísticas
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text(
        `Total: ${stats.total}   |   Asistieron: ${stats.asistieron}   |   Faltaron: ${stats.faltaron}   |   % Asistencia: ${stats.pct}%`,
        14,
        startY + 4
      )

      const rows = listaMostrada.map((a, i) => [
        i + 1,
        `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.trim(),
        a.cinta_config?.nombre_nivel || 'Sin cinta',
        a.horario_config
          ? `${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)} - ${formatHora(a.horario_config.hora_fin)})`
          : 'Sin horario',
        a.asistio ? 'ASISTIÓ' : 'FALTÓ',
      ])

      autoTable(doc, {
        startY: startY + 8,
        head: [['#', 'Alumno', 'Cinta / Grado', 'Horario', 'Estado']],
        body: rows,
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            const val = data.cell.raw
            if (val === 'ASISTIÓ') {
              data.cell.styles.textColor = [16, 185, 129]
              data.cell.styles.fontStyle = 'bold'
            } else {
              data.cell.styles.textColor = [239, 68, 68]
              data.cell.styles.fontStyle = 'bold'
            }
          }
        },
        margin: { top: 10, bottom: 20 },
      })

      agregarPieDePagina(doc)
      await guardarODescargarPDF(doc, `Asistencia_${fecha}.pdf`)
      toast.success('PDF descargado con éxito')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar PDF')
    }
  }

  return (
    <div style={{ ...s.overlay, padding: isMobile ? 8 : 16 }} onClick={onCerrar}>
      <div style={{
        ...s.modal,
        maxHeight: isMobile ? '92vh' : 'calc(100vh - 40px)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          ...s.header,
          padding: isMobile ? '16px 16px 14px' : '22px 22px 18px',
        }}>
          <div style={{
            ...s.iconBox,
            width: isMobile ? 40 : 48,
            height: isMobile ? 40 : 48,
            borderRadius: isMobile ? 12 : 14,
          }}>
            <FiCalendar size={isMobile ? 22 : 26} />
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 32 }}>
            <h2 style={{
              ...s.titulo,
              fontSize: isMobile ? 15 : 17,
            }}>
              {fechaFormateada}
            </h2>
          </div>
          <button type="button" className="btn-cerrar-circular" style={s.btnCerrar} onClick={onCerrar} aria-label="Cerrar">
            <FiX size={17} />
          </button>
        </div>

        {/* 4 Mini Stats */}
        <div style={{
          ...s.statsGrid,
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          padding: isMobile ? '12px 14px' : '14px 22px',
          gap: isMobile ? 8 : 10,
        }}>
          {[
            { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
            { label: 'Asistieron', value: stats.asistieron, color: 'var(--accent-green)' },
            { label: 'Faltaron', value: stats.faltaron, color: 'var(--accent-red)' },
            {
              label: '% Asistencia',
              value: cargando ? '…' : `${stats.pct}%`,
              color: stats.pct >= 80 ? 'var(--accent-green)' : stats.pct >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)',
            },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              ...s.statCard,
              padding: isMobile ? '8px 6px' : '10px 8px',
            }}>
              <span style={s.statLabel}>{label}</span>
              <span style={{ ...s.statValue, color, fontSize: isMobile ? 18 : 20 }}>
                {cargando ? <span style={s.skeletonInline} /> : value}
              </span>
            </div>
          ))}
        </div>

        {/* Tabs filtro y Botón Exportar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '0 14px 12px' : '0 22px 14px',
          gap: 10,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div style={{
            display: 'flex',
            gap: 4,
            width: isMobile ? '100%' : 'auto',
            background: isMobile ? 'var(--bg-primary)' : 'transparent',
            padding: isMobile ? 3 : 0,
            borderRadius: isMobile ? 10 : 0,
            border: isMobile ? '1px solid var(--border)' : 'none',
          }}>
            {[
              { key: 'todos', label: `Todos (${alumnos.length})` },
              { key: 'asistieron', label: `Asistieron (${asistieron.length})` },
              { key: 'faltaron', label: `Faltaron (${faltaron.length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                style={{
                  ...s.tabBtn,
                  flex: isMobile ? 1 : 'none',
                  textAlign: 'center',
                  padding: isMobile ? '8px 4px' : '7px 14px',
                  fontSize: isMobile ? 11.5 : 12,
                  background: tab === key ? 'var(--accent-blue)' : 'transparent',
                  color: tab === key ? '#fff' : 'var(--text-muted)',
                  fontWeight: tab === key ? 700 : 500,
                  boxShadow: tab === key && isMobile ? 'var(--shadow-sm)' : 'none',
                }}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ width: isMobile ? '100%' : 'auto' }}>
            <BotonExportar
              onExportarExcel={exportarExcel}
              onExportarPDF={exportarPDF}
              disabled={cargando || alumnos.length === 0}
              align={isMobile ? 'left' : 'right'}
              className=""
            />
          </div>
        </div>

        {/* Lista */}
        <div style={{
          ...s.lista,
          padding: isMobile ? '4px 14px 18px' : '4px 22px 22px',
          gap: isMobile ? 6 : 8,
        }}>
          {cargando
            ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ ...s.fila(true), animation: 'shimmer 1.5s infinite' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-tertiary)' }} />
                <div style={{ flex: 1, height: 14, background: 'var(--bg-tertiary)', borderRadius: 4 }} />
              </div>
            ))
            : listaMostrada.length === 0
              ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                  No hay alumnos en esta categoría
                </div>
              )
              : listaMostrada.map(a => (
                <div
                  key={a.id}
                  style={{
                    ...s.fila(a.asistio),
                    padding: isMobile ? '8px 10px' : '10px 14px',
                    gap: isMobile ? 8 : 10,
                  }}
                  onMouseEnter={e => !isMobile && (e.currentTarget.style.transform = 'translateX(4px)')}
                  onMouseLeave={e => !isMobile && (e.currentTarget.style.transform = 'none')}
                >
                  {/* Ícono status */}
                  <div style={{
                    ...s.statusBox,
                    width: isMobile ? 24 : 28,
                    height: isMobile ? 24 : 28,
                    borderRadius: isMobile ? 6 : 8,
                    background: a.asistio ? 'var(--accent-green)' : 'var(--accent-red)',
                    boxShadow: `0 3px 8px ${a.asistio ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}>
                    {a.asistio ? <FiCheck size={isMobile ? 12 : 14} strokeWidth={3} /> : <FiX size={isMobile ? 12 : 14} />}
                  </div>

                  {/* Avatar */}
                  <Avatar alumno={a} size={isMobile ? 34 : 36} />

                  {/* Nombre y grado */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      ...s.nombre,
                      fontSize: isMobile ? 13 : 14,
                      lineHeight: 1.25,
                      whiteSpace: isMobile ? 'normal' : 'nowrap',
                      wordBreak: 'break-word',
                    }}>
                      {a.nombre} {a.apellido_paterno} {a.apellido_materno || ''}
                    </div>

                    {isMobile && a.cinta_config && (
                      <div style={{ marginTop: 2 }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: 99,
                          fontSize: 9.5,
                          fontWeight: 700,
                          background: a.cinta_config.color_hex || 'var(--bg-tertiary)',
                          color: a.cinta_config.color_texto || 'var(--text-primary)',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                        }}>
                          {a.cinta_config.nombre_nivel}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Badge grado en desktop */}
                  {!isMobile && a.cinta_config && (
                    <span style={{
                      ...s.badge,
                      background: a.cinta_config.color_hex || 'var(--bg-tertiary)',
                      color: a.cinta_config.color_texto || 'var(--text-primary)',
                    }}>
                      {a.cinta_config.nombre_nivel}
                    </span>
                  )}
                </div>
              ))
          }
        </div>
      </div>

      <style>{`
        @keyframes modalEnterUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.72)',
    backdropFilter: 'blur(5px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, padding: 16,
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 20, width: '100%', maxWidth: 560,
    maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
    animation: 'modalEnterUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
    boxShadow: 'var(--shadow-lg)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '22px 22px 18px',
    borderBottom: '1px solid var(--border)',
    background: 'linear-gradient(to right, var(--bg-tertiary), transparent)',
    position: 'relative',
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
    background: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  titulo: {
    fontSize: 17, fontWeight: 800, color: 'var(--text-primary)',
    textTransform: 'capitalize', lineHeight: 1.3,
  },
  btnCerrar: {
    position: 'absolute', top: 14, right: 14,
    width: 34, height: 34, borderRadius: '50%',
    border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
    zIndex: 10,
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
    gap: 10, padding: '14px 22px',
  },
  statCard: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '10px 8px',
    display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'center',
  },
  statLabel: {
    fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  statValue: { fontSize: 20, fontWeight: 900 },
  skeletonInline: {
    display: 'inline-block', width: 36, height: 18,
    borderRadius: 4, background: 'var(--bg-tertiary)', animation: 'shimmer 1.5s infinite',
  },
  tabsWrap: {
    display: 'flex', gap: 4, padding: '0 22px 14px',
  },
  tabBtn: {
    padding: '7px 14px', borderRadius: 8, border: 'none',
    fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  lista: {
    padding: '4px 22px 22px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  fila: (asistio) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px',
    borderRadius: 14,
    background: asistio ? 'var(--bg-primary)' : 'rgba(239,68,68,0.05)',
    border: `1px solid ${asistio ? 'var(--border)' : 'rgba(239,68,68,0.18)'}`,
    transition: 'transform 0.15s',
  }),
  statusBox: {
    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff',
  },
  nombre: {
    flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', flexShrink: 0,
    padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
  },
}
