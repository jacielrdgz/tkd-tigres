import React, { useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const DIAS_SEMANA = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

function pctColor(pct) {
  if (pct >= 80) return 'var(--accent-green)'
  if (pct >= 60) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

function pctBg(pct) {
  if (pct >= 80) return 'rgba(16,185,129,0.08)'
  if (pct >= 60) return 'rgba(245,158,11,0.08)'
  return 'rgba(239,68,68,0.08)'
}

export default function TabPorFecha({ mes, onCambiarMes, datosPorFecha, cargando, onDiaClick }) {
  const [hoveredCell, setHoveredCell] = useState(null)

  const [anio, mesNum] = mes.split('-').map(Number)

  const mesLabel = useMemo(() => {
    return new Date(anio, mesNum - 1, 2).toLocaleString('es-ES', { month: 'long', year: 'numeric' })
  }, [anio, mesNum])

  // Estadísticas del mes calculadas en el frontend desde datosPorFecha
  const statsDelMes = useMemo(() => {
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

  // Celdas del calendario
  const celdas = useMemo(() => {
    const primerDia = new Date(anio, mesNum - 1, 1).getDay()
    const diasEnMes = new Date(anio, mesNum, 0).getDate()
    const hoyStr = new Date().toLocaleDateString('sv-SE')

    const arr = []
    for (let i = 0; i < primerDia; i++) arr.push(null)
    for (let d = 1; d <= diasEnMes; d++) {
      const fechaStr = `${mes}-${String(d).padStart(2, '0')}`
      const dato = datosPorFecha[fechaStr]
      arr.push({
        d, fecha: fechaStr,
        asistieron: dato?.asistieron ?? null,
        total: dato?.total ?? null,
        pct: dato?.pct ?? null,
        tieneDatos: !!dato,
        esHoy: fechaStr === hoyStr,
      })
    }
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [anio, mesNum, mes, datosPorFecha])

  return (
    <div>
      {/* Calendario */}
      <div style={s.calContenedor}>
        {/* Header del calendario */}
        <div style={s.calHeader}>
          <span style={s.calTitulo}>{mesLabel}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={s.btnNav}
              onClick={() => {
                const nueva = new Date(anio, mesNum - 2, 1)
                onCambiarMes(`${nueva.getFullYear()}-${String(nueva.getMonth() + 1).padStart(2, '0')}`)
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-primary)'}
            >
              <FiChevronLeft size={18} />
            </button>
            <button
              style={s.btnNav}
              onClick={() => {
                const nueva = new Date(anio, mesNum, 1)
                onCambiarMes(`${nueva.getFullYear()}-${String(nueva.getMonth() + 1).padStart(2, '0')}`)
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-primary)'}
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Labels días semana */}
        <div style={s.grid}>
          {DIAS_SEMANA.map(d => (
            <div key={d} style={s.labelDia}>{d}</div>
          ))}

          {/* Celdas */}
          {cargando
            ? Array.from({ length: 35 }).map((_, i) => (
              <div key={i} style={{ ...s.celdaBase, background: 'var(--bg-tertiary)', animation: 'shimmer 1.5s infinite' }} />
            ))
            : celdas.map((c, i) => {
              if (!c) return <div key={i} style={s.celdaVacia} />

              if (!c.tieneDatos) {
                return (
                  <div key={i} style={{
                    ...s.celdaBase,
                    background: 'var(--bg-primary)',
                    border: c.esHoy ? '2px solid var(--accent-blue)' : '1.5px solid var(--border)',
                    boxShadow: c.esHoy ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
                    opacity: 0.45,
                  }}>
                    <span style={s.numDia}>{c.d}</span>
                  </div>
                )
              }

              const isHovered = hoveredCell === c.fecha
              return (
                <div
                  key={i}
                  style={{
                    ...s.celdaBase,
                    background: isHovered ? (c.pct >= 80 ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)') : pctBg(c.pct),
                    border: c.esHoy
                      ? '2px solid var(--accent-blue)'
                      : `1.5px solid ${c.pct >= 80 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    boxShadow: c.esHoy ? '0 0 0 3px rgba(59,130,246,0.12)' : (isHovered ? 'var(--shadow-md)' : 'none'),
                    cursor: 'pointer',
                    transform: isHovered ? 'translateY(-3px) scale(1.02)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                  }}
                  onClick={() => onDiaClick(c.fecha)}
                  onMouseEnter={() => setHoveredCell(c.fecha)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <span style={{ ...s.numDia, color: pctColor(c.pct) }}>{c.d}</span>
                  <div style={s.barBg}>
                    <div style={{ ...s.barFill, width: `${c.pct}%`, background: pctColor(c.pct) }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: pctColor(c.pct), lineHeight: 1 }}>
                    {c.asistieron}/{c.total} · {c.pct}%
                  </span>
                </div>
              )
            })
          }
        </div>
      </div>
    </div>
  )
}

const s = {
  calContenedor: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
  },
  calHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  calTitulo: {
    fontSize: 20, fontWeight: 800, color: 'var(--text-primary)',
    textTransform: 'capitalize', letterSpacing: '-0.01em',
  },
  btnNav: {
    width: 38, height: 38, borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--bg-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.15s',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8,
  },
  labelDia: {
    textAlign: 'center', fontSize: 10, fontWeight: 800,
    color: 'var(--text-dim)', paddingBottom: 10,
    textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  celdaBase: {
    aspectRatio: '1.2/1',
    borderRadius: 12, padding: '10px 8px',
    display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between', alignItems: 'flex-start',
    position: 'relative',
    minHeight: 72,
  },
  celdaVacia: {
    aspectRatio: '1.2/1', minHeight: 72,
  },
  numDia: {
    fontSize: 14, fontWeight: 800, color: 'var(--text-secondary)', lineHeight: 1,
  },
  barBg: {
    width: '100%', height: 4,
    background: 'var(--border)', borderRadius: 99, overflow: 'hidden',
  },
  barFill: {
    height: '100%', borderRadius: 99,
    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
  },
}
