import { useEffect, useCallback, useState, useMemo } from 'react'
import api from '../api/axios'
import Swal from 'sweetalert2'
import { toast } from 'react-toastify'

const COLOR_CINTA = {
  blanca: '#e2e8f0', blanca_avanzada: '#cbd5e1',
  amarilla: '#fbbf24', amarilla_avanzada: '#f59e0b',
  naranja: '#fb923c', naranja_avanzada: '#f97316',
  verde: '#4ade80', verde_avanzada: '#22c55e',
  azul: '#60a5fa', azul_avanzada: '#3b82f6',
  marrón: '#8B4513', marrón_avanzada: '#78350f',
  roja: '#f87171', roja_avanzada: '#ef4444',
  negra: '#1e293b',
}

export default function Asistencias() {
  const [alumnos, setAlumnos] = useState([])
  const [asistencias, setAsistencias] = useState({})
  const [busqueda, setBusqueda] = useState('')
  const [filtroPrincipal, setFiltroPrincipal] = useState('todos')
  const [filtroCinta, setFiltroCinta] = useState('blanca')
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('sv-SE'))
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [haCambiado, setHaCambiado] = useState(false)

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
      const [resAlumnos, resAsistencias] = await Promise.all([
        api.get('/alumnos'), 
        api.get('/asistencias', { params: { fecha } })
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
    } catch (err) {
      toast.error('Error al cargar datos')
    } finally { setCargando(false) }
  }, [fecha])

  useEffect(() => { cargarInformacion() }, [cargarInformacion])

  const alumnosFiltrados = useMemo(() => {
    return alumnos.filter(a => {
      const nombreCompleto = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`.toLowerCase()
      const cumpleNombre = nombreCompleto.includes(busqueda.toLowerCase())
      let cumpleFiltro = true
      if (filtroPrincipal === 'presentes') cumpleFiltro = asistencias[a.id] === true
      if (filtroPrincipal === 'ausentes') cumpleFiltro = asistencias[a.id] === false
      if (filtroPrincipal === 'cintas') cumpleFiltro = a.cinta === filtroCinta
      return cumpleNombre && cumpleFiltro
    })
  }, [alumnos, busqueda, filtroPrincipal, filtroCinta, asistencias])

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

  return (
    <div style={{ padding: '24px' }}>
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Asistencias</h2>
          <p style={s.sub}>Centro de Talentos - Tigres Do</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={s.tabs}>
              <div style={s.tabActiveVerde}>P: {stats.presentes}</div>
              <div style={s.tabActiveRojo}>A: {stats.ausentes}</div>
            </div>
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
        <input type="date" style={s.inputFecha} value={fecha} onChange={e => setFecha(e.target.value)} />
        
        <select style={s.selectCinta} value={filtroPrincipal} onChange={e => setFiltroPrincipal(e.target.value)}>
          <option value="todos">Mostrar: Todos</option>
          <option value="presentes">Mostrar: Presentes</option>
          <option value="ausentes">Mostrar: Ausentes</option>
          <option value="cintas">Filtrar por Cinta...</option>
        </select>

        {filtroPrincipal === 'cintas' && (
          <select style={{ ...s.selectCinta, borderColor: '#3b82f6', width: '160px' }} value={filtroCinta} onChange={e => setFiltroCinta(e.target.value)}>
            {Object.keys(COLOR_CINTA).map(c => (
              <option key={c} value={c}>{c.replace('_', ' ').toUpperCase()}</option>
            ))}
          </select>
        )}

        <button onClick={toggleTodos} style={s.btnToggleAll}>
          {alumnosFiltrados.every(a => asistencias[a.id]) ? '⏹ Desmarcar Visibles' : '✅ Marcar Visibles'}
        </button>

        <input
          style={s.search}
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      <div style={s.tablaContenedor}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{...s.th, width: '80px'}}>Foto</th>
              <th style={{...s.th, textAlign: 'left'}}>Nombre Completo</th>
              <th style={{...s.th, width: '180px'}}>Cinta</th>
              <th style={{...s.th, width: '130px'}}>Estatus</th>
              <th style={{...s.th, width: '150px'}}>Asistencia</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="5" style={s.tdCenter}>Cargando lista...</td></tr>
            ) : alumnosFiltrados.length === 0 ? (
              <tr><td colSpan="5" style={s.tdCenter}>No hay alumnos que coincidan</td></tr>
            ) : (
              alumnosFiltrados.map(a => (
                <tr key={a.id} style={s.tr}>
                  <td style={s.td}>
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
                      
                      <div style={s.nombreNom}>{`${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`}</div>
                      
                      {/* ALERTA DE DESERCIÓN (3 o más faltas seguidas) */}
                      {a.racha_faltas >= 3 && (
                        <span title="Alerta: 3+ faltas seguidas" style={{ cursor: 'help' }}>⚠️</span>
                      )}
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{
                      ...s.cinta,
                      background: COLOR_CINTA[a.cinta] || '#334155',
                      color: a.cinta?.includes('blanca') ? '#0f172a' : '#fff',
                      display: 'inline-block', width: '140px'
                    }}>{a.cinta?.replace('_', ' ')}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{
                      ...s.badge,
                      background: a.estatus === 'activo' ? s.statusActivoBg : s.statusInactivoBg,
                      color: a.estatus === 'activo' ? s.statusActivoText : s.statusInactivoText,
                    }}>{a.estatus}</span>
                  </td>
                  <td style={s.td}>
                    <button
                      onClick={() => toggleAsistencia(a.id)}
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const s = {
  statusActivoBg: '#14532d', statusActivoText: '#4ade80',
  statusInactivoBg: '#450a0a', statusInactivoText: '#f87171',
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  titulo: { fontSize: '24px', fontWeight: '700', color: '#f1f5f9', margin: 0 },
  sub: { fontSize: '15px', color: '#64748b', marginTop: '2px' },
  barraAcciones: { display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' },
  search: { flex: 1, padding: '10px 20px', background: '#13151f', border: '1px solid #1e2130', borderRadius: '80px', color: '#e2e8f0', outline: 'none' },
  inputFecha: { width: '150px', padding: '10px', background: '#13151f', border: '1px solid #1e2130', borderRadius: '8px', color: '#e2e8f0', outline: 'none' },
  selectCinta: { width: '190px', padding: '10px', background: '#13151f', border: '1px solid #1e2130', borderRadius: '8px', color: '#e2e8f0', cursor: 'pointer' },
  btnToggleAll: { background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '8px', padding: '0 15px', height: '42px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  progressContainer: { width: '300px', height: '14px', background: '#1e2130', borderRadius: '20px', overflow: 'hidden', position: 'relative', border: '1px solid #334155' },
  progressBar: { height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', transition: 'width 0.4s ease-out' },
  progressText: { position: 'absolute', width: '100%', textAlign: 'center', fontSize: '9px', fontWeight: '800', color: '#fff', top: '50%', transform: 'translateY(-50%)', textShadow: '0 1px 2px rgba(0,0,0,0.8)' },
  tabs: { display: 'flex', background: '#13151f', padding: '4px', borderRadius: '10px', border: '1px solid #1e2130', gap: '4px' },
  tabActiveVerde: { padding: '8px 12px', background: '#14532d', color: '#4ade80', borderRadius: '7px', fontWeight: '700', fontSize: '12px', minWidth: '60px', textAlign: 'center' },
  tabActiveRojo: { padding: '8px 12px', background: '#450a0a', color: '#f87171', borderRadius: '7px', fontWeight: '700', fontSize: '12px', minWidth: '60px', textAlign: 'center' },
  tablaContenedor: { background: '#13151f', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e2130', minHeight: '550px' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { padding: '14px 16px', fontSize: '11px', color: '#64748b', borderBottom: '1px solid #1e2130', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #1e2130' },
  td: { padding: '12px 16px', fontSize: '14px', color: '#cbd5e1', textAlign: 'center' },
  tdCenter: { padding: '60px', textAlign: 'center', color: '#475569' },
  fotoTabla: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' },
  fotoVacia: { width: '40px', height: '40px', borderRadius: '50%', background: '#1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#60a5fa' },
  nombreNom: { fontWeight: '600', color: '#f1f5f9' },
  cinta: { padding: '5px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  badge: { padding: '5px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' },
  btnPrimary: { color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s' },
  btnAsis: { padding: '8px 0', width: '110px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontWeight: '800', fontSize: '10px' }
}