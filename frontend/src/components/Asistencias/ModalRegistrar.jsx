import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { FiX, FiCalendar, FiCheck, FiSearch } from 'react-icons/fi'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { useAuth } from '../../context/AuthContext'
import { obtenerInfoEscuelaParaPDF, dibujarEncabezadoMembrete, agregarPieDePagina, formatearFechaNaturalPDF } from '../../utils/pdfHelper'
import BotonExportar from '../Common/BotonExportar'

const formatHora = (hora) => {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hrs = parseInt(h)
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  const h12 = hrs % 12 || 12
  return `${h12}:${m} ${ampm}`
}

const norm = (s) => (s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '')

function Avatar({ alumno, size = 38 }) {
  const [imgError, setImgError] = useState(false)
  const iniciales = ((alumno.nombre?.[0] || '') + (alumno.apellido_paterno?.[0] || '')).toUpperCase()
  const url = alumno.foto_url ? alumno.foto_url.replace(/\\\//g, '/') : null
  if (url && !imgError) {
    return (
      <img
        src={url}
        alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }}
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 700,
    }}>
      {iniciales}
    </div>
  )
}

export default function ModalRegistrar({ onCerrar, onGuardado }) {
  const { user } = useAuth()
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('sv-SE'))
  const [alumnos, setAlumnos] = useState([])
  const [presencias, setPresencias] = useState({})
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [filtroHorario, setFiltroHorario] = useState('')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCerrar])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await api.get('/asistencias', { params: { fecha } })
      const lista = res.data
      setAlumnos(lista)
      const mapa = {}
      lista.forEach(a => { mapa[a.alumno_id] = a.presente })
      setPresencias(mapa)
    } catch {
      toast.error('Error al cargar alumnos')
    } finally {
      setCargando(false)
    }
  }, [fecha])

  useEffect(() => { cargar() }, [cargar])

  const toggle = (id) => setPresencias(prev => ({ ...prev, [id]: !prev[id] }))

  const horariosUnicos = useMemo(() => {
    const map = new Map()
    alumnos.forEach(a => {
      if (a.horario_config) map.set(a.horario_config.id ?? a.horario_config.nombre, a.horario_config)
    })
    return [...map.values()].sort((a, b) => {
      if (a.hora_inicio && b.hora_inicio) return a.hora_inicio.localeCompare(b.hora_inicio)
      return (a.nombre || '').localeCompare(b.nombre || '')
    })
  }, [alumnos])

  const filtrados = useMemo(() => {
    return alumnos.filter(a => {
      const nombre = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`
      const cumpleNombre = norm(nombre).includes(norm(busqueda))
      const cumpleHorario = !filtroHorario || String(a.horario_config?.id) === filtroHorario || a.horario_config?.nombre === filtroHorario
      return cumpleNombre && cumpleHorario
    }).sort((a, b) => {
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
      return fnB - fnA
    })
  }, [alumnos, busqueda, filtroHorario])

  const marcarTodos = () => {
    const todos = filtrados.every(a => presencias[a.alumno_id])
    const mapa = { ...presencias }
    filtrados.forEach(a => { mapa[a.alumno_id] = !todos })
    setPresencias(mapa)
  }

  const exportarPDF = async () => {
    if (filtrados.length === 0) return toast.warning('No hay datos para exportar')

    const escuelaInfo = await obtenerInfoEscuelaParaPDF()
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' })

    const startY = dibujarEncabezadoMembrete(doc, {
      escuelaInfo,
      tipoReporte: 'PASE DE LISTA',
      subtituloEtiqueta: 'Fecha de Lista:',
      subtituloValor: formatearFechaNaturalPDF(fecha)
    })

    const tableColumn = ["#", "Nombre Alumno", "Cinta", "Horario", "Asistencia"]
    const tableRows = filtrados.map((a, index) => [
      index + 1,
      `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
      a.cinta_config?.nombre_nivel || 'Sin cinta',
      a.horario_config
        ? `${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)} - ${formatHora(a.horario_config.hora_fin)})`
        : 'Sin horario',
      presencias[a.alumno_id] ? 'PRESENTE' : 'AUSENTE'
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8.5, cellPadding: 2, halign: 'center' },
      styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 60, halign: 'left' },
        2: { cellWidth: 32, halign: 'center' },
        3: { cellWidth: 50, halign: 'center' },
        4: { cellWidth: 34, halign: 'center' }
      },
      margin: { left: 15, right: 15, bottom: 18 },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'PRESENTE') {
            data.cell.styles.textColor = [16, 185, 129] // verde
            data.cell.styles.fontStyle = 'bold'
          } else {
            data.cell.styles.textColor = [239, 68, 68] // rojo
            data.cell.styles.fontStyle = 'bold'
          }
        }
      }
    })

    agregarPieDePagina(doc, user)

    doc.save(`Asistencias_${fecha}.pdf`)
  }

  const exportarExcel = () => {
    if (filtrados.length === 0) return toast.warning('No hay datos para exportar')
    const data = filtrados.map((a, index) => ({
      "#": index + 1,
      "Nombre Completo": `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
      "Cinta": a.cinta_config?.nombre_nivel || 'Sin cinta',
      "Horario": a.horario_config
        ? `${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)} - ${formatHora(a.horario_config.hora_fin)})`
        : 'Sin horario',
      "Asistencia": presencias[a.alumno_id] ? 'PRESENTE' : 'AUSENTE'
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencias")
    XLSX.writeFile(workbook, `Asistencias_${fecha}.xlsx`)
  }

  const guardar = async () => {
    if (alumnos.length === 0) return toast.warning('No hay alumnos cargados')
    setGuardando(true)
    try {
      // Si hay un filtro de horario activo, solo enviamos/guardamos los alumnos de ese horario
      const listaParaGuardar = filtroHorario
        ? alumnos.filter(a => String(a.horario_config?.id) === filtroHorario || a.horario_config?.nombre === filtroHorario)
        : alumnos;

      const lista = listaParaGuardar.map(a => ({
        alumno_id: a.alumno_id,
        presente: presencias[a.alumno_id] || false,
      }))
      await api.post('/asistencias/registrar-dia', { fecha, asistencias: lista })
      const presentesCount = lista.filter(x => x.presente).length
      toast.success(`Guardado: ${presentesCount} presentes para este horario.`, {
        position: "top-right",
        autoClose: 2000,
      })
      onGuardado?.(fecha)
      cargar()
    } catch {
      toast.error('Error al guardar asistencias')
    } finally {
      setGuardando(false)
    }
  }

  const presentes = filtrados.filter(a => presencias[a.alumno_id]).length
  const ausentes = filtrados.length - presentes

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.iconBox}>
            <FiCalendar size={24} />
          </div>
          <div>
            <h2 style={s.titulo}>Registrar Asistencia</h2>
            <p style={s.subtitulo}>Pase de lista diario</p>
          </div>
          <button style={s.btnCerrar} onClick={onCerrar}><FiX size={18} /></button>
        </div>

        {/* Selector de fecha + stats */}
        <div className="modal-controles" style={s.controles}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={s.labelFecha}>Fecha:</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              style={{ ...s.inputFecha, width: 135 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 12.5, color: 'var(--accent-green)', fontWeight: 700, whiteSpace: 'nowrap' }}>✓ {presentes} presentes</span>
            <span style={{ fontSize: 12.5, color: 'var(--accent-red)', fontWeight: 700, whiteSpace: 'nowrap' }}>✗ {ausentes} ausentes</span>
            <button
              style={s.btnMarcarTodos}
              onClick={marcarTodos}
            >
              <FiCheck size={13} />
              {filtrados.length > 0 && filtrados.every(a => presencias[a.alumno_id]) ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          </div>
        </div>

        {/* Filtros: Buscador y Horario */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 22px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              style={{ ...s.inputFecha, width: '100%', paddingLeft: 34 }}
              placeholder="Buscar alumno..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <select
            style={{ ...s.inputFecha, minWidth: 160 }}
            value={filtroHorario}
            onChange={e => setFiltroHorario(e.target.value)}
          >
            <option value="">Todos los horarios</option>
            {horariosUnicos.map(h => (
              <option key={h.id ?? h.nombre} value={h.id ?? h.nombre}>
                {h.nombre} ({formatHora(h.hora_inicio)} - {formatHora(h.hora_fin)})
              </option>
            ))}
          </select>
        </div>

        {/* Lista */}
        <div style={s.lista}>
          {cargando
            ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ ...s.fila(true), gap: 10, animation: 'shimmer 1.5s infinite' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg-tertiary)' }} />
                <div style={{ flex: 1, height: 14, background: 'var(--bg-tertiary)', borderRadius: 4 }} />
              </div>
            ))
            : filtrados.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay alumnos que coincidan con la búsqueda.
              </div>
            ) : filtrados.map((a, idx) => (
              <div
                key={a.alumno_id}
                style={s.fila(presencias[a.alumno_id])}
                onClick={() => toggle(a.alumno_id)}
              >
                <div style={{ color: 'var(--text-dim)', fontSize: 11, width: 16, textAlign: 'right' }}>
                  {idx + 1}
                </div>
                <Avatar alumno={a} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.nombre}>{a.nombre} {a.apellido_paterno} {a.apellido_materno || ''}</div>
                  <div style={s.horario}>
                    {a.horario_config
                      ? `${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)} - ${formatHora(a.horario_config.hora_fin)})`
                      : 'Sin horario'}
                  </div>
                </div>
                {a.cinta_config && (
                  <span style={{
                    ...s.badge,
                    background: a.cinta_config.color_hex || 'var(--bg-tertiary)',
                    color: a.cinta_config.color_texto || 'var(--text-primary)',
                  }}>
                    {a.cinta_config.nombre_nivel}
                  </span>
                )}
                <div style={{
                  ...s.checkBox,
                  background: presencias[a.alumno_id] ? 'var(--accent-green)' : 'var(--accent-red)',
                  boxShadow: presencias[a.alumno_id]
                    ? '0 4px 10px rgba(16,185,129,0.35)'
                    : '0 4px 10px rgba(239,68,68,0.25)',
                }}>
                  {presencias[a.alumno_id]
                    ? <FiCheck size={14} strokeWidth={3} color="#fff" />
                    : <FiX size={14} strokeWidth={3} color="#fff" />}
                </div>
              </div>
            ))
          }
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <BotonExportar onExportarExcel={exportarExcel} onExportarPDF={exportarPDF} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={s.btnCancelar} onClick={onCerrar}>Cancelar</button>
            <button
              style={{ ...s.btnGuardar, opacity: guardando ? 0.7 : 1 }}
              onClick={guardar}
              disabled={guardando}
            >
              {guardando ? 'Guardando…' : '💾 Guardar Asistencias'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalEnterUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: none; }
        }
        @media (max-width: 520px) {
          .modal-controles {
            flex-wrap: wrap !important;
            justify-content: center !important;
            gap: 12px !important;
          }
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
    borderRadius: 20, width: '100%', maxWidth: 580,
    maxHeight: 'calc(100vh - 40px)',
    display: 'flex', flexDirection: 'column',
    animation: 'modalEnterUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
    boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '20px 22px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'linear-gradient(to right, var(--bg-tertiary), transparent)',
    position: 'relative', flexShrink: 0,
  },
  iconBox: {
    width: 46, height: 46, borderRadius: 12, flexShrink: 0,
    background: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  subtitulo: { fontSize: 12, color: 'var(--text-muted)', margin: 0 },
  btnCerrar: {
    position: 'absolute', top: 14, right: 14,
    width: 32, height: 32, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-muted)',
  },
  controles: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: '1px solid var(--border)',
    gap: 8, flexWrap: 'nowrap', flexShrink: 0,
  },
  labelFecha: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' },
  inputFecha: {
    padding: '8px 12px', background: 'var(--bg-primary)',
    border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
  },
  btnMarcarTodos: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    padding: '6px 10px', background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text-secondary)', fontSize: 11.5, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    width: 138, flexShrink: 0,
  },
  lista: {
    flex: 1, overflowY: 'auto',
    padding: '10px 22px', display: 'flex', flexDirection: 'column', gap: 7,
  },
  fila: (presente) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', borderRadius: 14,
    background: presente ? 'var(--bg-primary)' : 'rgba(239,68,68,0.04)',
    border: `1px solid ${presente ? 'var(--border)' : 'rgba(239,68,68,0.2)'}`,
    cursor: 'pointer', transition: 'all 0.15s',
  }),
  nombre: { fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' },
  horario: { fontSize: 11, color: 'var(--text-muted)', marginTop: 1 },
  badge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    padding: '4px 12px', borderRadius: 99, fontSize: 13, fontWeight: 700, minWidth: 100,
  },
  checkBox: {
    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
  },
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    padding: '14px 22px',
    borderTop: '1px solid var(--border)', flexShrink: 0,
  },
  btnExportExcel: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#fff', border: 'none', borderRadius: '10px',
    padding: '10px 14px', fontSize: '12px', fontWeight: '700',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
  },
  btnExportPdf: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: '#fff', border: 'none', borderRadius: '10px',
    padding: '10px 14px', fontSize: '12px', fontWeight: '700',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    gap: '6px', transition: 'all 0.2s', whiteSpace: 'nowrap',
    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
  },
  btnCancelar: {
    padding: '10px 20px', background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)', borderRadius: 10,
    color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnGuardar: {
    padding: '10px 24px', background: 'var(--accent-blue)',
    border: 'none', borderRadius: 10,
    color: '#fff', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: 'var(--shadow-glow-blue)',
  },
}

