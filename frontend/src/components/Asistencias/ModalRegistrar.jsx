import React, { useState, useEffect, useCallback } from 'react'
import { FiX, FiCalendar, FiCheck } from 'react-icons/fi'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'

const formatHora = (hora) => {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hrs = parseInt(h)
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  const h12 = hrs % 12 || 12
  return `${h12}:${m} ${ampm}`
}

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
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('sv-SE'))
  const [alumnos, setAlumnos] = useState([])
  const [presencias, setPresencias] = useState({})
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

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

  const marcarTodos = () => {
    const todos = alumnos.every(a => presencias[a.alumno_id])
    const mapa = {}
    alumnos.forEach(a => { mapa[a.alumno_id] = !todos })
    setPresencias(mapa)
  }

  const guardar = async () => {
    if (alumnos.length === 0) return toast.warning('No hay alumnos cargados')
    setGuardando(true)
    try {
      const lista = alumnos.map(a => ({
        alumno_id: a.alumno_id,
        presente: presencias[a.alumno_id] || false,
      }))
      await api.post('/asistencias/registrar-dia', { fecha, asistencias: lista })
      const presentes = lista.filter(x => x.presente).length
      Swal.fire({
        icon: 'success',
        title: '¡Asistencia Guardada!',
        text: `${presentes} presentes registrados para ${fecha}`,
        timer: 2000,
        showConfirmButton: false,
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        iconColor: 'var(--accent-green)',
      })
      onGuardado?.()
      onCerrar()
    } catch {
      toast.error('Error al guardar asistencias')
    } finally {
      setGuardando(false)
    }
  }

  const presentes = alumnos.filter(a => presencias[a.alumno_id]).length
  const ausentes = alumnos.length - presentes

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
        <div style={s.controles}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={s.labelFecha}>Fecha:</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              style={s.inputFecha}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--accent-green)', fontWeight: 700 }}>✓ {presentes} presentes</span>
            <span style={{ fontSize: 13, color: 'var(--accent-red)', fontWeight: 700 }}>✗ {ausentes} ausentes</span>
            <button
              style={s.btnMarcarTodos}
              onClick={marcarTodos}
            >
              <FiCheck size={13} />
              {alumnos.every(a => presencias[a.alumno_id]) ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          </div>
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
            : alumnos.map(a => (
              <div
                key={a.alumno_id}
                style={s.fila(presencias[a.alumno_id])}
                onClick={() => toggle(a.alumno_id)}
              >
                <Avatar alumno={a} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.nombre}>{a.nombre} {a.apellido_paterno} {a.apellido_materno || ''}</div>
                  <div style={s.horario}>
                    {a.horario_config
                      ? `${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)})`
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
    padding: '12px 22px', borderBottom: '1px solid var(--border)',
    gap: 12, flexWrap: 'wrap', flexShrink: 0,
  },
  labelFecha: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' },
  inputFecha: {
    padding: '7px 12px', background: 'var(--bg-primary)',
    border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
  },
  btnMarcarTodos: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
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
    display: 'inline-flex', alignItems: 'center', flexShrink: 0,
    padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
  },
  checkBox: {
    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '14px 22px',
    borderTop: '1px solid var(--border)', flexShrink: 0,
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
