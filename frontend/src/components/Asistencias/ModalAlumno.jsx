import React, { useState, useEffect, useMemo } from 'react'
import { FiX, FiChevronLeft, FiChevronRight, FiCheck, FiClock } from 'react-icons/fi'
import api from '../../api/axios'
import { getCache, setCache } from '../../utils/cacheManager'

const formatHora = (hora) => {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hrs = parseInt(h)
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  const h12 = hrs % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function pctColor(pct) {
  if (pct >= 80) return 'var(--accent-green)'
  if (pct >= 60) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

function Avatar({ alumno, size = 56 }) {
  const [imgError, setImgError] = useState(false)
  const iniciales = ((alumno.nombre?.[0] || '') + (alumno.apellido_paterno?.[0] || '')).toUpperCase()
  const url = alumno.foto_url ? alumno.foto_url.replace(/\\\//g, '/') : null

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border)' }}
        onError={() => setImgError(true)}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700,
    }}>
      {iniciales}
    </div>
  )
}

const DIAS_SEMANA = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

export default function ModalAlumno({ alumno, onCerrar, isMobile: propIsMobile }) {
  const [mes, setMes] = useState(() => {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  })
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
    if (!alumno) return
    const aId = alumno.alumno_id ?? alumno.id
    const key = `asistencias_alumno_detalle_${aId}_${mes}`
    const cached = getCache(key)
    if (cached && cached.data) {
      setDatos(cached.data)
      setCargando(false)
    } else {
      setCargando(true)
      setDatos(null)
    }

    api.get(`/asistencias/alumno/${aId}`, { params: { mes } })
      .then(r => {
        setDatos(r.data)
        setCache(key, r.data)
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [alumno, mes])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCerrar])

  const cambiarMes = (offset) => {
    const [anio, m] = mes.split('-').map(Number)
    const nueva = new Date(anio, m - 1 + offset, 1)
    setMes(`${nueva.getFullYear()}-${String(nueva.getMonth() + 1).padStart(2, '0')}`)
  }

  const mesLabel = useMemo(() => {
    const d = new Date(mes + '-02')
    return d.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
  }, [mes])

  // Construir celdas del calendario
  const celdas = useMemo(() => {
    const [anio, m] = mes.split('-').map(Number)
    const primerDia = new Date(anio, m - 1, 1).getDay()
    const diasEnMes = new Date(anio, m, 0).getDate()
    const diasObj = datos?.dias || {}
    const hoyStr = new Date().toLocaleDateString('sv-SE')

    const arr = []
    for (let i = 0; i < primerDia; i++) arr.push(null)
    for (let d = 1; d <= diasEnMes; d++) {
      const fechaStr = `${mes}-${String(d).padStart(2, '0')}`
      arr.push({ d, fecha: fechaStr, estado: diasObj[fechaStr] || 'sin_clase', esHoy: fechaStr === hoyStr })
    }
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [mes, datos])

  const stats = datos?.stats

  if (!alumno) return null

  // Datos del alumno (puede venir de la tabla o del endpoint)
  const aluData = datos?.alumno ?? alumno

  return (
    <div style={{ ...s.overlay, padding: isMobile ? 8 : 16 }} onClick={onCerrar}>
      <div style={{
        ...s.modal,
        maxHeight: isMobile ? '92vh' : 'calc(100vh - 40px)',
      }} onClick={e => e.stopPropagation()}>
        <button type="button" className="btn-cerrar-circular" style={s.btnCerrar} onClick={onCerrar} aria-label="Cerrar">
          <FiX size={17} />
        </button>

        {/* Header */}
        <div style={{
          ...s.header,
          padding: isMobile ? '16px 14px 14px' : '24px 24px 20px',
          gap: isMobile ? 12 : 16,
        }}>
          <Avatar alumno={aluData} size={isMobile ? 46 : 58} />
          <div style={{ flex: 1, minWidth: 0, paddingRight: 32 }}>
            <h2 style={{
              ...s.nombre,
              fontSize: isMobile ? 16 : 20,
            }}>
              {aluData.nombre} {aluData.apellido_paterno} {aluData.apellido_materno || ''}
            </h2>
            <div style={{
              ...s.subinfo,
              fontSize: isMobile ? 11 : 12,
            }}>
              {aluData.horario_config ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <FiClock size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span>
                    {`${aluData.horario_config.nombre} (${formatHora(aluData.horario_config.hora_inicio)} - ${formatHora(aluData.horario_config.hora_fin)})`}
                    {aluData.horario_config.dias ? ` · ${aluData.horario_config.dias}` : ''}
                  </span>
                </span>
              ) : (
                'Sin horario'
              )}
            </div>
            {aluData.cinta_config && (
              <span style={{
                ...s.badge,
                background: aluData.cinta_config.color_hex || 'var(--bg-tertiary)',
                color: aluData.cinta_config.color_texto || 'var(--text-primary)',
                marginTop: 6,
                fontSize: isMobile ? 10 : 11,
                padding: isMobile ? '2px 8px' : '3px 10px',
              }}>
                {aluData.cinta_config.nombre_nivel}
              </span>
            )}
          </div>
        </div>

        {/* 4 Mini Stats */}
        <div style={{
          ...s.statsGrid,
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? 8 : 10,
          padding: isMobile ? '12px 14px' : '16px 24px',
        }}>
          {[
            { label: 'Clases del Mes', value: stats?.total ?? '—', color: 'var(--text-primary)' },
            { label: 'Asistió', value: stats?.asistio ?? '—', color: 'var(--accent-green)' },
            { label: 'Faltó', value: stats?.falto ?? '—', color: 'var(--accent-red)' },
            { label: '% Asistencia', value: stats ? `${stats.pct}%` : '—', color: pctColor(stats?.pct) },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              ...s.statCard,
              padding: isMobile ? '10px 8px' : '12px 8px',
            }}>
              <span style={s.statLabel}>{label}</span>
              <span style={{ ...s.statValue, color, fontSize: isMobile ? 19 : 22 }}>
                {cargando ? <span style={s.skeletonInline} /> : value}
              </span>
            </div>
          ))}
        </div>

        {/* Calendario */}
        <div style={{
          ...s.calSec,
          padding: isMobile ? '12px 14px 18px' : '16px 24px 24px',
        }}>
          <div style={{
            ...s.calHeader,
            marginBottom: isMobile ? 10 : 14,
          }}>
            <span style={{
              ...s.calTitulo,
              fontSize: isMobile ? 15 : 16,
            }}>
              {mesLabel}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={s.btnNav} onClick={() => cambiarMes(-1)} aria-label="Mes anterior"><FiChevronLeft size={16} /></button>
              <button style={s.btnNav} onClick={() => cambiarMes(1)} aria-label="Mes siguiente"><FiChevronRight size={16} /></button>
            </div>
          </div>

          {/* Días semana */}
          <div style={{
            ...s.calGrid,
            gap: isMobile ? 4 : 5,
          }}>
            {DIAS_SEMANA.map(d => (
              <div key={d} style={{
                ...s.labelDia,
                fontSize: isMobile ? 9.5 : 10,
                paddingBottom: isMobile ? 5 : 8,
              }}>
                {d}
              </div>
            ))}
            {cargando
              ? Array.from({ length: 35 }).map((_, i) => (
                <div key={i} style={{ ...s.celda('sin_clase', false), animation: 'shimmer 1.5s infinite', background: 'var(--bg-tertiary)' }} />
              ))
              : celdas.map((c, i) => {
                if (!c) return <div key={i} />
                return (
                  <div
                    key={i}
                    style={{
                      ...s.celda(c.estado, c.esHoy),
                      borderRadius: isMobile ? 8 : 10,
                      fontSize: isMobile ? 12 : 13,
                    }}
                    title={c.fecha}
                  >
                    <span style={s.numDia}>{c.d}</span>
                    {c.estado === 'asistio' && <FiCheck size={isMobile ? 9 : 10} strokeWidth={3} />}
                    {c.estado === 'falto' && <FiX size={isMobile ? 9 : 10} strokeWidth={3} />}
                  </div>
                )
              })
            }
          </div>

          {/* Leyenda */}
          <div style={{
            ...s.leyenda,
            gap: isMobile ? 10 : 16,
            marginTop: isMobile ? 12 : 16,
            justifyContent: isMobile ? 'center' : 'flex-start',
          }}>
            {[
              { color: 'var(--accent-green)', bg: 'var(--accent-green-bg)', label: 'Asistió' },
              { color: 'var(--accent-red)', bg: 'var(--accent-red-bg)', label: 'Faltó' },
              { color: 'var(--border-hover)', bg: 'var(--bg-tertiary)', label: 'Sin clase' },
            ].map(({ color, bg, label }) => (
              <span key={label} style={{ ...s.leyendaItem, fontSize: isMobile ? 11 : 12 }}>
                <span style={{ ...s.leyendaDot, width: isMobile ? 12 : 14, height: isMobile ? 12 : 14, background: bg, border: `1.5px solid ${color}` }} />
                {label}
              </span>
            ))}
            <span style={{ ...s.leyendaItem, fontSize: isMobile ? 11 : 12 }}>
              <span style={{ ...s.leyendaDot, width: isMobile ? 12 : 14, height: isMobile ? 12 : 14, background: 'transparent', border: '2px solid var(--accent-blue)', boxShadow: '0 0 0 2px rgba(59,130,246,0.2)' }} />
              Hoy
            </span>
          </div>
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
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    width: '100%', maxWidth: 640,
    maxHeight: 'calc(100vh - 40px)',
    overflowY: 'auto',
    position: 'relative',
    animation: 'modalEnterUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
    boxShadow: 'var(--shadow-lg)',
  },
  btnCerrar: {
    position: 'absolute', top: 14, right: 14,
    width: 34, height: 34, borderRadius: '50%',
    border: '1px solid var(--border)',
    background: 'var(--bg-tertiary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-muted)',
    zIndex: 10,
  },
  header: {
    display: 'flex', alignItems: 'flex-start', gap: 16,
    padding: '24px 24px 20px',
    borderBottom: '1px solid var(--border)',
  },
  nombre: {
    fontSize: 20, fontWeight: 800, color: 'var(--text-primary)',
    letterSpacing: '-0.01em', lineHeight: 1.2,
  },
  subinfo: {
    fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500,
  },
  badge: {
    display: 'inline-flex', alignItems: 'center',
    padding: '3px 10px', borderRadius: 99,
    fontSize: 11, fontWeight: 700,
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
    gap: 10, padding: '16px 24px',
  },
  statCard: {
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '12px 8px',
    display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center',
  },
  statLabel: {
    fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  statValue: { fontSize: 22, fontWeight: 900 },
  skeletonInline: {
    display: 'inline-block', width: 40, height: 20,
    borderRadius: 4, background: 'var(--bg-tertiary)', animation: 'shimmer 1.5s infinite',
  },
  calSec: { padding: '16px 24px 24px' },
  calHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  calTitulo: {
    fontSize: 16, fontWeight: 800, color: 'var(--text-primary)',
    textTransform: 'capitalize',
  },
  btnNav: {
    width: 30, height: 30, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-muted)',
  },
  calGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5,
  },
  labelDia: {
    textAlign: 'center', fontSize: 10, fontWeight: 700,
    color: 'var(--text-dim)', paddingBottom: 8,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  celda: (estado, esHoy) => ({
    aspectRatio: '1/1', borderRadius: 10,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 2, fontSize: 13, fontWeight: 700,
    border: esHoy ? '2px solid var(--accent-blue)' : '1.5px solid transparent',
    boxShadow: esHoy ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
    background: estado === 'asistio'
      ? 'var(--accent-green-bg)'
      : estado === 'falto'
        ? 'var(--accent-red-bg)'
        : 'var(--bg-tertiary)',
    color: estado === 'asistio'
      ? 'var(--accent-green)'
      : estado === 'falto'
        ? 'var(--accent-red)'
        : 'var(--text-dim)',
    opacity: estado === 'sin_clase' ? 0.5 : 1,
    transition: 'transform 0.15s',
  }),
  numDia: { fontSize: 12, lineHeight: 1 },
  leyenda: {
    display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap',
  },
  leyendaItem: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: 'var(--text-muted)', fontWeight: 500,
  },
  leyendaDot: {
    width: 14, height: 14, borderRadius: 4, flexShrink: 0,
  },
}
