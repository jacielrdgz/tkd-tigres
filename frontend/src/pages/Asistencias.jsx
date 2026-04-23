import React, { useEffect, useCallback, useState, useMemo } from 'react'
import api from '../api/axios'
import Swal from 'sweetalert2'
import { toast } from 'react-toastify'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const SkeletonCircle = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#1e2130', animation: 'skeletonPulse 1.5s infinite ease-in-out', margin: '0 auto' }} />
)
const SkeletonBlock = ({ w, h }) => (
  <div style={{ width: w, height: h, borderRadius: '4px', backgroundColor: '#1e2130', animation: 'skeletonPulse 1.5s infinite ease-in-out', margin: '0 auto' }} />
)

export default function Asistencias() {
  const [alumnos, setAlumnos] = useState([])
  const [cintasConfig, setCintasConfig] = useState([])
  const [asistencias, setAsistencias] = useState({})
  const [busqueda, setBusqueda] = useState('')
  const [busquedaInput, setBusquedaInput] = useState('')
  const [rowHover, setRowHover] = useState(null)
  const [filtroPrincipal, setFiltroPrincipal] = useState('todos')
  const [filtroCinta, setFiltroCinta] = useState('blanca')
  const [filtroHorario, setFiltroHorario] = useState('')
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('sv-SE'))
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [haCambiado, setHaCambiado] = useState(false)
  const [rowExpandida, setRowExpandida] = useState({})

  const limpiarUrl = (url) => url ? url.replace(/\\\//g, '/') : null
  const obtenerIniciales = (nombre, apellido) => {
    if (!nombre) return '?'
    return (nombre.trim().charAt(0) + (apellido ? apellido.trim().charAt(0) : '')).toUpperCase()
  }

  // Lógica para colores del semáforo de pagos
  const obtenerColorPago = (estatus) => {
    switch (estatus) {
      case 'pagado': return '#4ade80';   // Verde
      case 'vencido': return '#ef4444';   // Rojo
      case 'pendiente': return '#fbbf24'; // Amarillo
      default: return '#64748b';          // Gris
    }
  }

  const cargarInformacion = useCallback(async () => {
    setCargando(true)
    setHaCambiado(false)
    try {
      const [resAlumnos, resAsistencias, resCintas] = await Promise.all([
        api.get('/alumnos'),
        api.get('/asistencias', { params: { fecha } }),
        api.get('/configuraciones-cintas')
      ])
      const todos = resAlumnos.data
      const datosAsist = resAsistencias.data

      const mapa = {}
      todos.forEach(a => {
        const registro = datosAsist.find(r => r.alumno_id === a.id)
        mapa[a.id] = registro ? !!registro.presente : false
      })

      setAlumnos(todos.filter(a => a.estatus === 'activo' || (mapa[a.id])))
      setAsistencias(mapa)
      setCintasConfig(resCintas.data)
    } catch (err) {
      toast.error('Error al cargar datos')
    } finally { setCargando(false) }
  }, [fecha])

  useEffect(() => { cargarInformacion() }, [cargarInformacion])

  useEffect(() => {
    const timer = setTimeout(() => setBusqueda(busquedaInput), 300)
    return () => clearTimeout(timer)
  }, [busquedaInput])

  const horariosUnicos = useMemo(() => {
    return [...new Set(alumnos.map(a => a.horario).filter(Boolean))].sort()
  }, [alumnos])

  const alumnosFiltrados = useMemo(() => {
    const filtrados = alumnos.filter(a => {
      const nombreCompleto = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.toLowerCase()
      const cumpleNombre = nombreCompleto.includes(busqueda.toLowerCase())
      let cumpleFiltro = true
      
      if (filtroPrincipal === 'presentes') cumpleFiltro = asistencias[a.id] === true
      if (filtroPrincipal === 'ausentes') cumpleFiltro = asistencias[a.id] === false
      if (filtroPrincipal === 'cintas') cumpleFiltro = String(a.configuracion_cinta_id) === String(filtroCinta)
      
      if (filtroHorario) {
        cumpleFiltro = cumpleFiltro && a.horario === filtroHorario
      }
      
      return cumpleNombre && cumpleFiltro
    });
    
    // Agrupa automáticamente los alumnos por horario si hay diferentes en la vista
    return filtrados.sort((a, b) => {
      const hA = a.horario || 'Z'
      const hB = b.horario || 'Z'
      if (hA !== hB) return hA.localeCompare(hB)
      return a.nombre.localeCompare(b.nombre)
    })
  }, [alumnos, busqueda, filtroPrincipal, filtroCinta, filtroHorario, asistencias])

  const stats = useMemo(() => {
    const total = alumnos.length
    const presentes = alumnos.filter(a => asistencias[a.id]).length
    const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0
    return { presentes, ausentes: total - presentes, porcentaje, total }
  }, [alumnos, asistencias])

  const toggleAsistencia = (id) => {
    setAsistencias(prev => ({ ...prev, [id]: !prev[id] }))
    setHaCambiado(true)
  }

  const toggleTodos = () => {
    const todosPresentes = alumnosFiltrados.every(a => asistencias[a.id])
    const nuevoMapa = { ...asistencias }
    alumnosFiltrados.forEach(a => {
      nuevoMapa[a.id] = !todosPresentes
    })
    setAsistencias(nuevoMapa)
    setHaCambiado(true)
  }

  const guardar = async () => {
    if (alumnos.length === 0) return toast.warning('No hay datos para guardar')
    setGuardando(true)
    try {
      const lista = alumnos.map(a => ({
        alumno_id: a.id,
        presente: asistencias[a.id] || false
      }))
      await api.post('/asistencias/registrar-dia', { fecha, asistencias: lista })
      setHaCambiado(false)
      Swal.fire({
        icon: 'success',
        title: 'Asistencia Guardada',
        text: `Registrado con éxito (${stats.presentes} presentes)`,
        timer: 1800,
        showConfirmButton: false,
        background: '#13151f',
        color: '#f1f5f9',
        iconColor: '#4ade80'
      })
    } catch (err) {
      toast.error('Error al guardar')
    } finally { setGuardando(false) }
  }

  const abrirWhatsApp = (a, e) => {
    e.stopPropagation()
    if (!a.telefono_tutor || a.telefono_tutor.trim() === '') {
      return toast.warning('Este alumno no tiene teléfono registrado')
    }
    const tel = a.telefono_tutor.replace(/\D/g, '')
    const msg = encodeURIComponent(`Hola tutor de ${a.nombre}, notamos que ha faltado a sus últimas clases de Taekwondo. ¿Todo se encuentra bien? ¡Esperamos verlo pronto por el tatami!`)
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank')
  }

  const exportarPDF = () => {
    if (alumnosFiltrados.length === 0) return toast.warning('No hay datos para exportar')
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.setTextColor(20, 30, 40)
    doc.text("Reporte de Asistencias - TKD Tigres", 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Fecha del pase de lista: ${fecha}`, 14, 28)
    
    const tableColumn = ["Nombre Alumno", "Cinta", "Horario", "Estatus Auditoria", "Asistencia Actual"]
    const tableRows = alumnosFiltrados.map(a => [
      `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
      a.cinta_config?.nombre_nivel || 'Sin cinta',
      a.horario || '-',
      `${a.racha_faltas || 0} Faltas Seguidas | ${a.racha_asistencias || 0} Asistencias Seguidas`,
      asistencias[a.id] ? 'PRESENTE' : 'AUSENTE'
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'striped',
    })
    doc.save(`Asistencias_${fecha}.pdf`)
  }

  const exportarExcel = () => {
    if (alumnosFiltrados.length === 0) return toast.warning('No hay datos para exportar')
    const data = alumnosFiltrados.map(a => ({
      "Nombre Completo": `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`,
      "Cinta": a.cinta_config?.nombre_nivel || 'Sin cinta',
      "Categoria": a.edad <= 11 ? 'Infantil' : (a.edad <= 14 ? 'Cadete' : (a.edad <= 17 ? 'Juvenil' : 'Adulto')),
      "Horario": a.horario || '-',
      "Faltas Seguidas (Racha)": a.racha_faltas || 0,
      "Asistencias Seguidas (Racha)": a.racha_asistencias || 0,
      "Asistencia Hoy": asistencias[a.id] ? 'PRESENTE' : 'AUSENTE'
    }))
    
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencias")
    XLSX.writeFile(workbook, `Asistencias_${fecha}.xlsx`)
  }

  const toggleRow = (id) => setRowExpandida(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div style={{ padding: '0px' }}>
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Asistencias</h2>
          <p style={s.sub}>Gestión de Asistencias</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={s.tabs}>
              <div style={s.tabActiveVerde}>P: {stats.presentes}</div>
              <div style={s.tabActiveRojo}>A: {stats.ausentes}</div>
            </div>
            
            <button style={{ ...s.btnDoc, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: '#10b981' }} onClick={exportarExcel} title="Exportar a Excel">
              📊 Excel
            </button>
            <button style={{ ...s.btnDoc, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: '#ef4444' }} onClick={exportarPDF} title="Generar PDF">
              📄 PDF
            </button>

            <button
              style={{
                ...s.btnPrimary,
                backgroundColor: haCambiado ? '#3b82f6' : '#1e293b',
                boxShadow: haCambiado ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none'
              }}
              onClick={guardar}
              disabled={guardando}
            >
              {guardando ? '...' : haCambiado ? '💾 Guardar Cambios' : 'Guardado'}
            </button>
          </div>
          <div style={s.progressContainer}>
            <div style={{ ...s.progressBar, width: `${stats.porcentaje}%` }}></div>
            <span style={s.progressText}>{stats.porcentaje}% Asistencia</span>
          </div>
        </div>
      </div>

      <div style={s.barraAcciones}>
        <input
          style={s.search}
          placeholder="Buscar por nombre..."
          value={busquedaInput}
          onChange={e => setBusquedaInput(e.target.value)}
        />
        <input type="date" style={s.inputFecha} value={fecha} onChange={e => setFecha(e.target.value)} />

        <select style={s.selectCinta} value={filtroPrincipal} onChange={e => setFiltroPrincipal(e.target.value)}>
          <option value="todos">Mostrar: Todos</option>
          <option value="presentes">Mostrar: Presentes</option>
          <option value="ausentes">Mostrar: Ausentes</option>
          <option value="cintas">Filtrar por Cinta...</option>
        </select>

        {filtroPrincipal === 'cintas' && (
          <select style={{ ...s.selectCinta, borderColor: '#3b82f6', width: '160px' }} value={filtroCinta} onChange={e => setFiltroCinta(e.target.value)}>
            {cintasConfig.map(c => (
              <option key={c.id} value={c.id}>{c.nombre_nivel.toUpperCase()}</option>
            ))}
          </select>
        )}

        <select style={{ ...s.selectCinta, width: '150px' }} value={filtroHorario} onChange={e => setFiltroHorario(e.target.value)}>
          <option value="">Por Horarios</option>
          {horariosUnicos.map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        <button onClick={toggleTodos} style={s.btnToggleAll}>
          {alumnosFiltrados.every(a => asistencias[a.id]) ? '⏹ Desmarcar Visibles' : '✅ Marcar Visibles'}
        </button>


      </div>

      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      <div style={s.tablaContenedor}>
        <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
          <table style={s.table}>
            <colgroup>
              <col style={{ width: '55px' }} />
              <col style={{ width: '280px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '140px' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...s.th, textAlign: 'center' }}>Foto</th>
                <th style={{ ...s.th, textAlign: 'left' }}>Nombre Completo</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Cinta</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Estatus</th>
                <th style={{ ...s.th, textAlign: 'center' }}>Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ ...s.tr, height: '61px' }}>
                    <td style={s.td}><SkeletonCircle size={40} /></td>
                    <td style={{ ...s.td, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <SkeletonCircle size={10} />
                        <div style={{ width: '180px', height: '14px', borderRadius: '4px', backgroundColor: '#1e2130', animation: 'skeletonPulse 1.5s infinite ease-in-out' }} />
                      </div>
                    </td>
                    <td style={s.td}><SkeletonBlock w="100px" h={24} /></td>
                    <td style={s.td}><SkeletonBlock w="70px" h={24} /></td>
                    <td style={s.td}><SkeletonBlock w="100px" h={24} /></td>
                  </tr>
                ))
              ) : alumnosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...s.td, padding: '60px', color: '#64748b' }}>
                    No hay alumnos registrados que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                alumnosFiltrados.map(a => (
                  <React.Fragment key={a.id}>
                  <tr 
                    style={{ ...s.tr, background: rowHover === a.id ? '#1a1d2e' : 'transparent', transition: 'background 0.15s', cursor: 'pointer' }}
                    onMouseEnter={() => setRowHover(a.id)}
                    onMouseLeave={() => setRowHover(null)}
                    onClick={() => toggleRow(a.id)}
                  >
                    <td style={s.td} onClick={e => e.stopPropagation()}>
                    <div style={{ position: 'relative', width: '40px', height: '40px', margin: '0 auto' }}>
                      {a.foto_url ? (
                        <img src={limpiarUrl(a.foto_url)} alt="" style={s.fotoTabla}
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                      ) : null}
                      <div style={{ ...s.fotoVacia, display: a.foto_url ? 'none' : 'flex' }}>
                        {obtenerIniciales(a.nombre, a.apellido_paterno)}
                      </div>
                    </div>
                  </td>
                  <td style={{ ...s.td, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* SEMÁFORO DE PAGOS */}
                      <div
                        title={`Estatus de pago: ${a.estatus_pago || 'N/A'}`}
                        style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          backgroundColor: obtenerColorPago(a.estatus_pago),
                          boxShadow: `0 0 6px ${obtenerColorPago(a.estatus_pago)}`
                        }}
                      />

                      <div style={s.nombreNom}>
                        {`${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`}
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal', marginTop: '2px' }}>
                          {a.horario ? `🕒 ${a.horario}` : 'Sin horario'}
                          <span style={{ marginLeft: '6px', color: '#cbd5e1' }}>| ID: {a.id}</span>
                        </div>
                      </div>

                      {/* ALERTA DE GAMIFICACIÓN (3 o más asistencias seguidas) */}
                      {a.racha_asistencias >= 3 && (
                        <span title={`¡Constancia brillante! Tiene ${a.racha_asistencias} clases seguidas asistiendo`} style={{ cursor: 'help', fontSize: '18px', filter: 'drop-shadow(0 0 5px rgba(251, 191, 36, 0.8))' }}>🔥</span>
                      )}

                      {/* ALERTA DE DESERCIÓN Y WHATSAPP (3 o más faltas seguidas) */}
                      {a.racha_faltas >= 3 && (
                        <button 
                          onClick={(e) => abrirWhatsApp(a, e)}
                          title="Contactar Tutor por WhatsApp" 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: 0, filter: 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.6))', transform: 'scale(1.1)' }}
                        >
                          ⚠️
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={s.td} onClick={e => e.stopPropagation()}>
                    <span style={{
                      ...s.cinta,
                      background: a.cinta_config?.color_hex || '#334155',
                      color: a.cinta_config?.color_texto || '#fff',
                      display: 'inline-block', width: '140px'
                    }}>{a.cinta_config?.nombre_nivel || 'Sin cinta'}</span>
                  </td>
                  <td style={s.td} onClick={e => e.stopPropagation()}>
                    <span style={{
                      ...s.badge,
                      background: a.estatus === 'activo' ? s.statusActivoBg : s.statusInactivoBg,
                      color: a.estatus === 'activo' ? s.statusActivoText : s.statusInactivoText,
                    }}>{a.estatus}</span>
                  </td>
                  <td style={s.td} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAsistencia(a.id); }}
                      style={{
                        ...s.btnAsis,
                        backgroundColor: asistencias[a.id] ? s.statusActivoBg : s.statusInactivoBg,
                        color: asistencias[a.id] ? s.statusActivoText : s.statusInactivoText,
                        borderColor: asistencias[a.id] ? s.statusActivoText : s.statusInactivoText,
                      }}
                    >
                      {asistencias[a.id] ? 'PRESENTE' : 'AUSENTE'}
                    </button>
                  </td>
                </tr>

                {/* FILA EXPANDIDA DEL HISTORIAL */}
                {rowExpandida[a.id] && (
                  <tr style={{ background: '#0f111a', borderBottom: '1px solid #1e2130' }}>
                    <td colSpan={5} style={{ padding: '20px 24px', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📅 Historial de Clases Recientes</span>
                          {a.racha_faltas > 0 && <span style={{ padding: '2px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px', fontSize: '10px' }}>Inasistente actual</span>}
                          {a.racha_asistencias > 0 && <span style={{ padding: '2px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px', fontSize: '10px' }}>Asistente actual</span>}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {a.ultimas_asistencias && a.ultimas_asistencias.length > 0 ? (
                            a.ultimas_asistencias.map((ua, idx) => {
                              const colorHex = ua.presente ? '#10b981' : '#ef4444';
                              return (
                                <div key={idx} title={ua.presente ? 'Asistió' : 'Faltó'} style={{ 
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                  background: '#13151f', padding: '8px 16px', borderRadius: '8px', border: '1px solid #1e2130',
                                  minWidth: '60px'
                                }}>
                                  <span style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: '600' }}>
                                    {new Date(ua.fecha + 'T12:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }).toUpperCase()}
                                  </span>
                                  <div style={{ 
                                    width: '16px', height: '16px', borderRadius: '50%', 
                                    background: colorHex,
                                    boxShadow: `0 0 8px ${colorHex}80`,
                                    border: '2px solid #13151f'
                                  }}/>
                                </div>
                              )
                            })
                          ) : (
                            <div style={{ padding: '10px 16px', background: '#13151f', borderRadius: '8px', border: '1px solid #1e2130', fontSize: '12px' }}>
                              🗓️ No hay registros anteriores disponibles para este alumno.
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const s = {
  statusActivoBg: '#14532d', statusActivoText: '#4ade80',
  statusInactivoBg: '#450a0a', statusInactivoText: '#f87171',
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  titulo: { fontSize: '24px', fontWeight: '700', color: '#f1f5f9', },
  sub: { fontSize: '15px', color: '#64748b', marginTop: '2px' },
  barraAcciones: { display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' },
  search: { flex: 1, maxWidth: '395px', padding: '10px 16px', background: '#13151f', border: '1px solid #1e2130', borderRadius: '80px', color: '#e2e8f0', outline: 'none', transition: 'all 0.3s ease' },
  inputFecha: { padding: '10px 14px', background: '#13151f', border: '1px solid #1e2130', borderRadius: '12px', color: '#cbd5e1', outline: 'none', fontSize: '13px', cursor: 'pointer', minWidth: '150px', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
  selectCinta: { padding: '10px 14px', background: '#13151f', border: '1px solid #1e2130', borderRadius: '12px', color: '#cbd5e1', outline: 'none', fontSize: '13px', cursor: 'pointer', minWidth: '160px', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
  btnToggleAll: { background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '12px', padding: '0 15px', height: '42px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  progressContainer: { width: '300px', height: '14px', background: '#1e2130', borderRadius: '20px', overflow: 'hidden', position: 'relative', border: '1px solid #334155' },
  progressBar: { height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', transition: 'width 0.4s ease-out' },
  progressText: { position: 'absolute', width: '100%', textAlign: 'center', fontSize: '9px', fontWeight: '800', color: '#fff', top: '50%', transform: 'translateY(-50%)', textShadow: '0 1px 2px rgba(0,0,0,0.8)' },
  tabs: { display: 'flex', background: '#13151f', padding: '4px', borderRadius: '10px', border: '1px solid #1e2130', gap: '4px' },
  tabActiveVerde: { padding: '8px 12px', background: 'linear-gradient(135deg, #14532d, #059669)', color: '#fff', borderRadius: '7px', fontWeight: '700', fontSize: '12px', minWidth: '60px', textAlign: 'center', boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)' },
  tabActiveRojo: { padding: '8px 12px', background: 'linear-gradient(135deg, #450a0a, #ef4444)', color: '#fff', borderRadius: '7px', fontWeight: '700', fontSize: '12px', minWidth: '60px', textAlign: 'center', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' },
  tablaContenedor: { background: '#13151f', borderRadius: '16px', overflow: 'hidden', border: '1px solid #1e2130', minHeight: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '800px' },
  th: { padding: '10px 16px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #1e2130', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tr: { borderBottom: '1px solid #1e2130' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#cbd5e1', textAlign: 'center' },
  tdCenter: { padding: '60px', textAlign: 'center', color: '#475569' },
  fotoTabla: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' },
  fotoVacia: { width: '40px', height: '40px', borderRadius: '50%', background: '#1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#60a5fa' },
  nombreNom: { fontWeight: '600', color: '#f1f5f9' },
  cinta: { padding: '5px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  badge: { padding: '5px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  btnPrimary: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s' },
  btnDoc: { padding: '8px 16px', borderRadius: '12px', border: '1px solid', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' },
  btnAsis: { padding: '8px 0', width: '110px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontWeight: '800', fontSize: '10px', transition: 'all 0.2s' }
}