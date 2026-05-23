import React, { useState, useEffect } from 'react'
import { FiX, FiCalendar, FiCheck } from 'react-icons/fi'
import api from '../../api/axios'

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
      background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700,
    }}>
      {iniciales}
    </div>
  )
}

export default function ModalDia({ fecha, onCerrar }) {
  const [tab, setTab] = useState('todos')
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!fecha) return
    setCargando(true)
    setDatos(null)
    setTab('todos')
    api.get(`/asistencias/dia/${fecha}`)
      .then(r => setDatos(r.data))
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

  const alumnos = datos?.alumnos ?? []
  const stats = datos?.stats ?? { total: 0, asistieron: 0, faltaron: 0, pct: 0 }

  const asistieron = alumnos.filter(a => a.asistio)
  const faltaron = alumnos.filter(a => !a.asistio)
  const listaMostrada = tab === 'todos' ? alumnos : tab === 'asistieron' ? asistieron : faltaron

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.iconBox}>
            <FiCalendar size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={s.titulo}>{fechaFormateada}</h2>
          </div>
          <button style={s.btnCerrar} onClick={onCerrar}>
            <FiX size={18} />
          </button>
        </div>

        {/* 4 Mini Stats */}
        <div style={s.statsGrid}>
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
            <div key={label} style={s.statCard}>
              <span style={s.statLabel}>{label}</span>
              <span style={{ ...s.statValue, color }}>
                {cargando ? <span style={s.skeletonInline} /> : value}
              </span>
            </div>
          ))}
        </div>

        {/* Tabs filtro */}
        <div style={s.tabsWrap}>
          {[
            { key: 'todos', label: `Todos (${alumnos.length})` },
            { key: 'asistieron', label: `Asistieron (${asistieron.length})` },
            { key: 'faltaron', label: `Faltaron (${faltaron.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              style={{
                ...s.tabBtn,
                background: tab === key ? 'var(--accent-blue)' : 'transparent',
                color: tab === key ? '#fff' : 'var(--text-muted)',
                fontWeight: tab === key ? 700 : 500,
              }}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div style={s.lista}>
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
                  style={s.fila(a.asistio)}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  {/* Ícono status */}
                  <div style={{
                    ...s.statusBox,
                    background: a.asistio ? 'var(--accent-green)' : 'var(--accent-red)',
                    boxShadow: `0 4px 10px ${a.asistio ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}>
                    {a.asistio ? <FiCheck size={14} strokeWidth={3} /> : <FiX size={14} />}
                  </div>

                  {/* Avatar */}
                  <Avatar alumno={a} />

                  {/* Nombre */}
                  <span style={s.nombre}>
                    {a.nombre} {a.apellido_paterno} {a.apellido_materno || ''}
                  </span>

                  {/* Badge grado */}
                  {a.cinta_config && (
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
    width: 32, height: 32, borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
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
