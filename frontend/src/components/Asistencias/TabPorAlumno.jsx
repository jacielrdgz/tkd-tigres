import React, { useState } from 'react'
import { FiSearch, FiEye, FiChevronDown } from 'react-icons/fi'
import { toast } from 'react-toastify'
import CustomDropdown from '../Common/CustomDropdown'

const formatHora = (hora) => {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  const hrs = parseInt(h)
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  const h12 = hrs % 12 || 12
  return `${h12}:${m} ${ampm}`
}

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

export default function TabPorAlumno({ alumnos, cargando, onVerAlumno, mes, onCambiarMes, onFiltradosChange }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroGrado, setFiltroGrado] = useState('')
  const [filtroHorario, setFiltroHorario] = useState('')
  const [filtroRiesgo, setFiltroRiesgo] = useState(false)
  const [rowHover, setRowHover] = useState(null)

  const gradosUnicos = React.useMemo(() => {
    const map = new Map()
    alumnos.forEach(a => {
      if (a.cinta_config) map.set(a.cinta_config.id ?? a.cinta_config.nombre_nivel, a.cinta_config)
    })
    return [...map.values()].sort((a, b) => {
      const ordA = a.orden ?? 999;
      const ordB = b.orden ?? 999;
      return ordA - ordB;
    })
  }, [alumnos])

  const horariosUnicos = React.useMemo(() => {
    const map = new Map()
    alumnos.forEach(a => {
      if (a.horario_config) map.set(a.horario_config.id ?? a.horario_config.nombre, a.horario_config)
    })
    return [...map.values()].sort((a, b) => {
      if (a.hora_inicio && b.hora_inicio) return a.hora_inicio.localeCompare(b.hora_inicio)
      return (a.nombre || '').localeCompare(b.nombre || '')
    })
  }, [alumnos])

  const filtrados = React.useMemo(() => {
    return alumnos.filter(a => {
      const nombre = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`
      const cumpleNombre = norm(nombre).includes(norm(busqueda))
      const cumpleGrado = !filtroGrado || String(a.cinta_config?.id) === filtroGrado || a.cinta_config?.nombre_nivel === filtroGrado
      const cumpleHorario = !filtroHorario || String(a.horario_config?.id) === filtroHorario || a.horario_config?.nombre === filtroHorario
      const cumpleRiesgo = !filtroRiesgo || a.racha_faltas >= 3
      return cumpleNombre && cumpleGrado && cumpleHorario && cumpleRiesgo
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
      return fnB - fnA // Si fnB (2010) - fnA (2015) es negativo, a va primero
    })
  }, [alumnos, busqueda, filtroGrado, filtroHorario, filtroRiesgo])

  React.useEffect(() => {
    if (onFiltradosChange) {
      onFiltradosChange(filtrados)
    }
  }, [filtrados, onFiltradosChange])

  const abrirWhatsApp = (a, e) => {
    e.stopPropagation()
    if (!a.telefono_tutor || a.telefono_tutor.trim() === '') {
      return toast.warning('Este alumno no tiene teléfono registrado')
    }
    const tel = '52' + a.telefono_tutor.replace(/\D/g, '')
    const msg = encodeURIComponent(`Hola tutor de ${a.nombre}, notamos que ha faltado a sus últimas clases de Taekwondo. ¿Todo se encuentra bien? ¡Esperamos verlo pronto por el tatami!`)
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank')
  }

  return (
    <div>
      {/* Buscador + Filtro Grado + Filtro Horario + Mes */}
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

        <CustomDropdown
          label="Todas las cintas"
          options={[
            { value: '', label: 'Todas las cintas' },
            ...gradosUnicos.map(c => ({
              value: String(c.id ?? c.nombre_nivel),
              label: c.nombre_nivel
            }))
          ]}
          value={filtroGrado}
          onChange={val => setFiltroGrado(val)}
          minWidth="160px"
        />

        <CustomDropdown
          label="Todos los horarios"
          options={[
            { value: '', label: 'Todos los horarios' },
            ...horariosUnicos.map(h => ({
              value: String(h.id ?? h.nombre),
              label: `${h.nombre} (${formatHora(h.hora_inicio)} - ${formatHora(h.hora_fin)})`
            }))
          ]}
          value={filtroHorario}
          onChange={val => setFiltroHorario(val)}
          minWidth="175px"
        />

        <input
          type="month"
          style={{ ...s.select, paddingRight: 14 }}
          value={mes}
          onChange={e => onCambiarMes(e.target.value)}
        />

        <button
          onClick={() => setFiltroRiesgo(!filtroRiesgo)}
          style={{
            ...s.btnRiesgo,
            background: filtroRiesgo ? 'var(--accent-red)' : 'var(--bg-secondary)',
            color: filtroRiesgo ? '#fff' : 'var(--text-secondary)',
            borderColor: filtroRiesgo ? 'var(--accent-red)' : 'var(--border)'
          }}
        >
          ⚠️ En riesgo
        </button>

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
                <th style={{ ...s.th, textAlign: 'center' }}>Cinta</th>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                              <div style={s.horario}>
                                {a.horario_config
                                  ? `🕒 ${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)} - ${formatHora(a.horario_config.hora_fin)})`
                                  : 'Sin horario'}
                              </div>
                              {a.racha_faltas >= 3 && (
                                <button
                                  onClick={(e) => abrirWhatsApp(a, e)}
                                  title={`Contactar Tutor por WhatsApp (${a.racha_faltas} faltas seguidas)`}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: 0, filter: 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.6))', transform: 'scale(1.1)' }}
                                >
                                  ⚠️
                                </button>
                              )}
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
                            display: 'inline-block', minWidth: 100, textAlign: 'center', fontSize: 13
                          }}>
                            {a.cinta_config.nombre_nivel}
                          </span>
                        ) : (
                          <span style={{ ...s.badge, background: 'var(--bg-tertiary)', color: 'var(--text-muted)', display: 'inline-block', minWidth: 100, textAlign: 'center', fontSize: 13 }}>
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
    padding: '8px 30px 8px 12px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    minWidth: 150,
    maxWidth: 170,
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
    fontSize: 12,
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
  btnRiesgo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
}
