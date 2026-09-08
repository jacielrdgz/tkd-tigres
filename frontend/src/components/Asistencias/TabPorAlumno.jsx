import React, { useState } from 'react'
import { FiSearch, FiEye, FiChevronDown, FiAlertTriangle, FiClock } from 'react-icons/fi'
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

export default function TabPorAlumno({ alumnos, cargando, onVerAlumno, mes, onCambiarMes, onFiltradosChange, isMobile: isMobileProp }) {
  const isMobile = isMobileProp !== undefined ? isMobileProp : (typeof window !== 'undefined' && window.innerWidth <= 768)
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
      {/* Buscador + Filtro Grado + Filtro Horario + Mes */}
      <div style={{ ...s.filtros, gap: isMobile ? 8 : 12, marginBottom: isMobile ? 14 : 20 }}>
        <div style={{ ...s.searchWrapper, flex: isMobile ? '1 1 100%' : '1 1 260px', maxWidth: isMobile ? '100%' : 380 }}>
          <FiSearch size={15} style={s.searchIcon} />
          <input
            id="busqueda-alumno"
            style={s.search}
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {/* Fila de Dropdowns (50% y 50% en móvil) */}
        <div style={{
          display: 'flex',
          gap: 8,
          width: isMobile ? '100%' : 'auto',
          flex: isMobile ? '1 1 100%' : 'none'
        }}>
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
            minWidth={isMobile ? '0' : '160px'}
            isMobile={isMobile}
            customStyle={{ flex: 1, minWidth: 0 }}
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
            minWidth={isMobile ? '0' : '175px'}
            isMobile={isMobile}
            customStyle={{ flex: 1, minWidth: 0 }}
          />
        </div>

        {/* Fila de Mes y En Riesgo (50% y 50% en móvil) */}
        <div style={{
          display: 'flex',
          gap: 8,
          width: isMobile ? '100%' : 'auto',
          flex: isMobile ? '1 1 100%' : 'none'
        }}>
          <input
            type="month"
            style={{
              ...s.selectMonth,
              flex: isMobile ? 1 : 'initial',
              width: isMobile ? '100%' : 'auto',
              minWidth: 0
            }}
            value={mes}
            onChange={e => onCambiarMes(e.target.value)}
          />

          <button
            onClick={() => setFiltroRiesgo(!filtroRiesgo)}
            style={{
              ...s.btnRiesgo,
              flex: isMobile ? 1 : 'initial',
              justifyContent: 'center',
              minWidth: 0,
              background: filtroRiesgo ? 'var(--accent-red)' : 'var(--bg-secondary)',
              color: filtroRiesgo ? '#fff' : 'var(--text-secondary)',
              borderColor: filtroRiesgo ? 'var(--accent-red)' : 'var(--border)'
            }}
          >
            <FiAlertTriangle size={13} style={{ color: filtroRiesgo ? '#fff' : 'var(--accent-yellow)' }} />
            <span>En riesgo</span>
          </button>
        </div>
      </div>

      {/* Contenido: Cards en móvil o Tabla en desktop */}
      {isMobile ? (
        <div style={s.cardsGridMobile}>
          {cargando ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={s.cardItemLoader}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-tertiary)', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ width: '60%', height: 14, background: 'var(--bg-tertiary)', borderRadius: 4, marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '40%', height: 10, background: 'var(--bg-tertiary)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
                </div>
              </div>
            ))
          ) : filtrados.length === 0 ? (
            <div style={s.emptyCardMobile}>
              No hay alumnos que coincidan con los filtros
            </div>
          ) : (
            filtrados.map(a => (
              <div
                key={a.alumno_id}
                style={{
                  ...s.cardItemMobile,
                  borderLeft: `4px solid ${a.cinta_config?.color_hex || 'var(--border)'}`,
                  background: rowHover === a.alumno_id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                }}
                onMouseEnter={() => setRowHover(a.alumno_id)}
                onMouseLeave={() => setRowHover(null)}
                onClick={() => onVerAlumno(a)}
              >
                {/* Top Row: Avatar + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar alumno={a} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={s.cardNombreMobile}>
                        {a.nombre} {a.apellido_paterno} {a.apellido_materno || ''}
                      </span>
                      {a.racha_faltas >= 3 && (
                        <span style={s.badgeRiesgoMobile} title={`${a.racha_faltas} faltas seguidas`}>
                          <FiAlertTriangle size={11} color="#ef4444" />
                          <span>En riesgo</span>
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {a.cinta_config ? (
                        <span style={{
                          ...s.cintaBadgeMobile,
                          background: a.cinta_config.color_hex || 'var(--bg-tertiary)',
                          color: a.cinta_config.color_texto || 'var(--text-primary)',
                        }}>
                          {a.cinta_config.nombre_nivel}
                        </span>
                      ) : (
                        <span style={{ ...s.cintaBadgeMobile, background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                          Sin cinta
                        </span>
                      )}

                      {a.horario_config && (
                        <span style={s.horarioBadgeMobile}>
                          <FiClock size={10} style={{ color: 'var(--text-muted)' }} />
                          {a.horario_config.nombre}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Asistencia Bar + Stats + Buttons */}
                <div style={s.cardBottomMobile}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Asistencia</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: pctColor(a.pct) }}>
                        {a.pct}% ({a.asistio}/{a.total} días)
                      </span>
                    </div>
                    <div style={s.barBg}>
                      <div style={{ ...s.barFill, width: `${a.pct}%`, background: pctColor(a.pct) }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {a.racha_faltas >= 3 && a.telefono_tutor && (
                      <button
                        type="button"
                        style={s.btnCardWa}
                        onClick={(e) => abrirWhatsApp(a, e)}
                        title="Contactar tutor por WhatsApp"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.554.92 3.14 1.407 4.793 1.408 5.432 0 9.854-4.422 9.856-9.856.002-5.433-4.419-9.853-9.853-9.853-5.435 0-9.856 4.422-9.858 9.854-.001 1.838.512 3.633 1.483 5.213l-1.103 4.025 4.128-1.082zm11.367-7.604c-.31-.155-1.836-.906-2.115-1.008-.28-.101-.483-.153-.686.154-.203.308-.787 1.008-.965 1.213-.177.205-.355.231-.665.077-.31-.155-1.307-.482-2.489-1.536-.919-.82-1.539-1.831-1.719-2.139-.18-.308-.02-.475.135-.629.14-.139.31-.36.465-.54.155-.181.206-.309.31-.515.103-.206.052-.386-.025-.54-.078-.155-.686-1.656-.941-2.261-.249-.59-.503-.51-.686-.519-.177-.008-.381-.01-.584-.01-.203 0-.533.077-.812.385-.279.308-1.066 1.044-1.066 2.545 0 1.501 1.091 2.951 1.243 3.156.153.205 2.146 3.276 5.198 4.59.726.313 1.293.499 1.734.639.73.232 1.393.199 1.918.121.585-.088 1.836-.751 2.09-1.474.254-.724.254-1.344.177-1.474-.076-.13-.279-.234-.589-.389z"/></svg>
                      </button>
                    )}
                    <button
                      type="button"
                      style={s.btnVerMobile}
                      onClick={(e) => { e.stopPropagation(); onVerAlumno(a); }}
                    >
                      <FiEye size={12} />
                      <span>Ver</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={s.tabla}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '34%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...s.th, textAlign: 'left' }}>Alumno</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Cinta</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>% Asistencia</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Clases</th>
                  <th style={{ ...s.th, textAlign: 'center' }}></th>
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
                                  {a.horario_config ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <FiClock size={11} style={{ color: 'var(--text-muted)' }} />
                                      {`${a.horario_config.nombre} (${formatHora(a.horario_config.hora_inicio)} - ${formatHora(a.horario_config.hora_fin)})`}
                                    </span>
                                  ) : (
                                    'Sin horario'
                                  )}
                                </div>
                                {a.racha_faltas >= 3 && (
                                  <button
                                    onClick={(e) => abrirWhatsApp(a, e)}
                                    title={`Contactar Tutor por WhatsApp (${a.racha_faltas} faltas seguidas)`}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, filter: 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.6))', display: 'flex', alignItems: 'center' }}
                                  >
                                    <FiAlertTriangle size={15} color="#ef4444" />
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
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 96,
                              textAlign: 'center',
                              fontSize: 12.5
                            }}>
                              {a.cinta_config.nombre_nivel}
                            </span>
                          ) : (
                            <span style={{
                              ...s.badge,
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-muted)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 96,
                              textAlign: 'center',
                              fontSize: 12.5
                            }}>
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
      )}
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
  selectMonth: {
    height: 38,
    boxSizing: 'border-box',
    padding: '0 14px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    colorScheme: 'dark',
    transition: 'border-color 0.15s',
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
  cardsGridMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  cardItemMobile: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '12px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  cardItemLoader: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  emptyCardMobile: {
    padding: '40px 16px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    fontSize: 13,
  },
  cardNombreMobile: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badgeRiesgoMobile: {
    fontSize: 10,
    fontWeight: 700,
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    padding: '2px 6px',
    borderRadius: 6,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  cintaBadgeMobile: {
    fontSize: 10.5,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 6,
    display: 'inline-flex',
    alignItems: 'center',
  },
  horarioBadgeMobile: {
    fontSize: 10.5,
    color: 'var(--text-muted)',
    background: 'var(--bg-tertiary)',
    padding: '2px 8px',
    borderRadius: 6,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  cardBottomMobile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTop: '1px solid var(--border)',
  },
  btnCardWa: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    color: '#22c55e',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  btnVerMobile: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 12px',
    background: 'var(--accent-blue-bg)',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: 7,
    fontSize: 11.5,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
