import React, { useState } from 'react'
import { FiSearch, FiEye, FiChevronDown } from 'react-icons/fi'

const norm = (s) => (s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '')

function pctColor(pct) {
  if (pct >= 80) return 'var(--accent-green)'
  if (pct >= 60) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

function pctBg(pct) {
  if (pct >= 80) return 'var(--accent-green-bg)'
  if (pct >= 60) return 'var(--accent-yellow-bg)'
  return 'var(--accent-red-bg)'
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
      fontSize: size * 0.35, fontWeight: 700,
    }}>
      {iniciales}
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {[240, 120, 160, 100, 80].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: w, height: 16, borderRadius: 6, background: 'var(--bg-tertiary)', animation: 'shimmer 1.5s infinite' }} />
        </td>
      ))}
    </tr>
  )
}

export default function TabPorAlumno({ alumnos, cargando, onVerAlumno, mes }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroGrado, setFiltroGrado] = useState('')
  const [rowHover, setRowHover] = useState(null)

  const gradosUnicos = React.useMemo(() => {
    const map = new Map()
    alumnos.forEach(a => {
      if (a.cinta_config) map.set(a.cinta_config.id ?? a.cinta_config.nombre_nivel, a.cinta_config)
    })
    return [...map.values()]
  }, [alumnos])

  const filtrados = React.useMemo(() => {
    return alumnos.filter(a => {
      const nombre = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`
      const cumpleNombre = norm(nombre).includes(norm(busqueda))
      const cumpleGrado = !filtroGrado || String(a.cinta_config?.id) === filtroGrado || a.cinta_config?.nombre_nivel === filtroGrado
      return cumpleNombre && cumpleGrado
    })
  }, [alumnos, busqueda, filtroGrado])

  return (
    <div>
      {/* Buscador + Filtro Grado */}
      <div style={s.filtros}>
        <div style={s.searchWrapper}>
          <FiSearch size={15} style={s.searchIcon} />
          <input
            id="busqueda-alumno"
            style={s.search}
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <select
            id="filtro-grado"
            style={s.select}
            value={filtroGrado}
            onChange={e => setFiltroGrado(e.target.value)}
          >
            <option value="">Todos los grados</option>
            {gradosUnicos.map(c => (
              <option key={c.id ?? c.nombre_nivel} value={c.id ?? c.nombre_nivel}>
                {c.nombre_nivel}
              </option>
            ))}
          </select>
          <FiChevronDown size={14} style={s.selectIcon} />
        </div>

        <span style={s.conteo}>
          {cargando ? '…' : `${filtrados.length} alumnos`}
        </span>
      </div>

      {/* Tabla */}
      <div style={s.tabla}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
            <thead>
              <tr>
                <th style={s.th}>Alumno</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Grado</th>
                <th style={{ ...s.th, textAlign: 'center' }}>% Asistencia</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Clases</th>
                <th style={{ ...s.th, textAlign: 'center', width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {cargando
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : filtrados.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay alumnos que coincidan con los filtros
                      </td>
                    </tr>
                  )
                  : filtrados.map(a => (
                    <tr
                      key={a.alumno_id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: rowHover === a.alumno_id ? 'var(--bg-tertiary)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={() => setRowHover(a.alumno_id)}
                      onMouseLeave={() => setRowHover(null)}
                      onClick={() => onVerAlumno(a)}
                    >
                      {/* Alumno */}
                      <td style={{ ...s.td, textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar alumno={a} />
                          <div>
                            <div style={s.nombre}>
                              {a.nombre} {a.apellido_paterno} {a.apellido_materno || ''}
                            </div>
                            <div style={s.horario}>
                              {a.horario_config
                                ? `🕒 ${a.horario_config.nombre}`
                                : 'Sin horario'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Grado */}
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        {a.cinta_config ? (
                          <span style={{
                            ...s.badge,
                            background: a.cinta_config.color_hex || 'var(--bg-tertiary)',
                            color: a.cinta_config.color_texto || 'var(--text-primary)',
                          }}>
                            {a.cinta_config.nombre_nivel}
                          </span>
                        ) : (
                          <span style={{ ...s.badge, background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                            Sin cinta
                          </span>
                        )}
                      </td>

                      {/* % Asistencia */}
                      <td style={{ ...s.td, textAlign: 'center', minWidth: 150 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={s.barBg}>
                            <div style={{
                              ...s.barFill,
                              width: `${a.pct}%`,
                              background: pctColor(a.pct),
                            }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: pctColor(a.pct), minWidth: 38 }}>
                            {a.pct}%
                          </span>
                        </div>
                      </td>

                      {/* Clases */}
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {a.asistio}/{a.total}
                          <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 4 }}>días</span>
                        </span>
                      </td>

                      {/* Botón Ver */}
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <button
                          style={s.btnVer}
                          onClick={e => { e.stopPropagation(); onVerAlumno(a) }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--accent-blue)'
                            e.currentTarget.style.color = '#fff'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'var(--accent-blue-bg)'
                            e.currentTarget.style.color = 'var(--accent-blue)'
                          }}
                        >
                          <FiEye size={13} />
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const s = {
  filtros: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    flex: '1 1 260px',
    maxWidth: 380,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-dim)',
    pointerEvents: 'none',
  },
  search: {
    width: '100%',
    padding: '9px 14px 9px 36px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  select: {
    appearance: 'none',
    padding: '9px 32px 9px 14px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    minWidth: 160,
  },
  selectIcon: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-dim)',
    pointerEvents: 'none',
  },
  conteo: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  tabla: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
  },
  th: {
    padding: '13px 16px',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px',
    fontSize: 14,
    color: 'var(--text-secondary)',
    verticalAlign: 'middle',
  },
  nombre: {
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontSize: 14,
  },
  horario: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  barBg: {
    flex: 1,
    height: 6,
    background: 'var(--border)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
    transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
  },
  btnVer: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    background: 'var(--accent-blue-bg)',
    color: 'var(--accent-blue)',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
}
