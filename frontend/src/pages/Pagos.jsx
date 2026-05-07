import { useEffect, useState, useMemo } from 'react'
import api from '../api/axios'
import Swal from 'sweetalert2'
import { toast } from 'react-toastify'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Calcula el período activo de un alumno basándose en su día de corte
function calcularPeriodo(diaPago = 1) {
  const hoy = new Date()
  const dia = diaPago

  // Día de corte en el mes actual
  const inicioEste = new Date(hoy.getFullYear(), hoy.getMonth(), dia)
  
  let fechaInicio, fechaFin
  if (hoy >= inicioEste) {
    // Estamos en o después del día de corte → período: este mes → siguiente
    fechaInicio = inicioEste
    fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia)
  } else {
    // Antes del día de corte → período: mes anterior → este mes
    fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, dia)
    fechaFin = inicioEste
  }

  const fmt = (d) => d.toLocaleDateString('sv-SE') // YYYY-MM-DD
  const label = (d) => `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)} ${d.getFullYear()}`

  return {
    fechaInicio: fmt(fechaInicio),
    fechaFin: fmt(fechaFin),
    label: `${label(fechaInicio)} → ${label(fechaFin)}`
  }
}

const hoy = new Date().toLocaleDateString('sv-SE')

export default function Pagos() {
  const [alumnos, setAlumnos] = useState([])
  const [pagosActivos, setPagosActivos] = useState([]) // pagos del período actual de cada alumno
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos') // todos | pagado | pendiente

  // Modal de pago rápido
  const [modalPago, setModalPago] = useState(null) // alumno al que se va a registrar pago
  const [formPago, setFormPago] = useState({ monto: '', metodo_pago: 'efectivo', fecha_pago: hoy })

  // Panel de historial
  const [historialAlumno, setHistorialAlumno] = useState(null) // alumno seleccionado
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const cargar = async () => {
    setCargando(true)
    try {
      const [resAlumnos, resPagos] = await Promise.all([
        api.get('/alumnos', { params: { estatus: 'activo' } }),
        api.get('/pagos')
      ])
      setAlumnos(resAlumnos.data)
      setPagosActivos(resPagos.data)
    } catch { toast.error('Error al cargar datos') }
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  // Para cada alumno, encontrar si ya pagó su período activo
  const alumnosConEstado = useMemo(() => {
    return alumnos.map(a => {
      const periodo = calcularPeriodo(a.dia_pago || 1)
      const pago = pagosActivos.find(p =>
        p.alumno_id === a.id && p.fecha_inicio === periodo.fechaInicio
      )
      return { ...a, periodo, pagoActivo: pago || null }
    })
  }, [alumnos, pagosActivos])

  const alumnosFiltrados = useMemo(() => {
    return alumnosConEstado.filter(a => {
      const nombre = `${a.nombre} ${a.apellido_paterno}`.toLowerCase()
      const matchBusqueda = nombre.includes(busqueda.toLowerCase())
      const matchFiltro = filtro === 'todos'
        ? true
        : filtro === 'pagado' ? !!a.pagoActivo : !a.pagoActivo
      return matchBusqueda && matchFiltro
    })
  }, [alumnosConEstado, busqueda, filtro])

  const abrirModalPago = (alumno, e) => {
    e.stopPropagation()
    setModalPago(alumno)
    setFormPago({ monto: '', metodo_pago: 'efectivo', fecha_pago: hoy })
  }

  const confirmarPago = async () => {
    if (!formPago.monto || isNaN(parseFloat(formPago.monto))) {
      return toast.error('Ingresa un monto válido')
    }
    const periodo = calcularPeriodo(modalPago.dia_pago || 1)
    try {
      await api.post('/pagos', {
        alumno_id:    modalPago.id,
        fecha_inicio: periodo.fechaInicio,
        fecha_fin:    periodo.fechaFin,
        monto:        parseFloat(formPago.monto),
        metodo_pago:  formPago.metodo_pago,
        estado:       'pagado',
        fecha_pago:   formPago.fecha_pago,
      })
      toast.success(`Pago de ${modalPago.nombre} registrado ✓`)
      setModalPago(null)
      cargar()
    } catch { toast.error('Error al registrar pago') }
  }

  const eliminarPago = async (pagoId, e) => {
    e.stopPropagation()
    const result = await Swal.fire({
      title: '¿Eliminar pago?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent-red)',
      cancelButtonColor: 'var(--border)',
      confirmButtonText: 'Sí, eliminar',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)'
    })
    if (result.isConfirmed) {
      await api.delete(`/pagos/${pagoId}`)
      toast.success('Pago eliminado')
      cargar()
    }
  }

  const abrirHistorial = async (alumno) => {
    setHistorialAlumno(alumno)
    setCargandoHistorial(true)
    try {
      const res = await api.get(`/pagos/alumno/${alumno.id}`)
      setHistorial(res.data)
    } catch { toast.error('Error al cargar historial') }
    setCargandoHistorial(false)
  }

  const cerrarHistorial = () => { setHistorialAlumno(null); setHistorial([]) }

  const totalPagados = alumnosConEstado.filter(a => !!a.pagoActivo).length
  const totalPendientes = alumnosConEstado.filter(a => !a.pagoActivo).length

  const fmtFecha = (f) => {
    if (!f) return '—'
    const d = new Date(f + 'T12:00:00')
    return `${d.getDate()} ${MESES[d.getMonth()].slice(0,3)} ${d.getFullYear()}`
  }

  return (
    <div style={s.page}>
      {/* HEADER */}
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Pagos</h2>
          <p style={s.sub}>Control de mensualidades</p>
        </div>
        <div style={s.resumen}>
          <div style={s.resumenCard}>
            <span style={{ ...s.resumenNum, color: 'var(--accent-green)' }}>{totalPagados}</span>
            <span style={s.resumenLabel}>Al corriente</span>
          </div>
          <div style={s.resumenCard}>
            <span style={{ ...s.resumenNum, color: 'var(--accent-red)' }}>{totalPendientes}</span>
            <span style={s.resumenLabel}>Pendientes</span>
          </div>
          <div style={s.resumenCard}>
            <span style={{ ...s.resumenNum, color: 'var(--accent-blue)' }}>{alumnos.length}</span>
            <span style={s.resumenLabel}>Total alumnos</span>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={s.barra}>
        <div style={s.filtros}>
          {[['todos','Todos'],['pagado','✅ Pagados'],['pendiente','🔴 Pendientes']].map(([val, lbl]) => (
            <button key={val} style={{ ...s.filtroBtn, ...(filtro === val ? s.filtroBtnActive : {}) }}
              onClick={() => setFiltro(val)}>{lbl}</button>
          ))}
        </div>
        <input style={s.search} placeholder="🔍 Buscar alumno..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)} />
      </div>

      {/* LISTA DE ALUMNOS */}
      {cargando ? (
        <div style={s.empty}>Cargando alumnos...</div>
      ) : alumnosFiltrados.length === 0 ? (
        <div style={s.empty}>No hay alumnos que mostrar</div>
      ) : (
        <div style={s.lista}>
          {alumnosFiltrados.map(a => {
            const pagado = !!a.pagoActivo
            return (
              <div key={a.id} style={{ ...s.card, borderLeft: `4px solid ${pagado ? 'var(--accent-green)' : 'var(--accent-red)'}` }}
                onClick={() => abrirHistorial(a)}>
                {/* Avatar */}
                <div style={s.avatar}>
                  {a.foto_url
                    ? <img src={a.foto_url} alt="" style={s.avatarImg} />
                    : <div style={s.avatarInicial}>{a.nombre[0]}{a.apellido_paterno[0]}</div>
                  }
                </div>

                {/* Info */}
                <div style={s.info}>
                  <div style={s.nombre}>{a.nombre} {a.apellido_paterno}</div>
                  <div style={s.periodo}>📅 {a.periodo.label}</div>
                </div>

                {/* Estado y acción */}
                <div style={s.derecha}>
                  {pagado ? (
                    <>
                      <span style={s.badgePagado}>✓ PAGADO</span>
                      <div style={s.montoInfo}>
                        ${parseFloat(a.pagoActivo.monto).toFixed(2)} · {a.pagoActivo.metodo_pago}
                      </div>
                      <button style={s.btnEliminar}
                        onClick={(e) => eliminarPago(a.pagoActivo.id, e)}>🗑️ Quitar</button>
                    </>
                  ) : (
                    <button style={s.btnPagar} onClick={(e) => abrirModalPago(a, e)}>
                      💳 Marcar pagado
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL RÁPIDO DE PAGO ── */}
      {modalPago && (
        <div style={s.overlay} onClick={() => setModalPago(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitulo}>Registrar Pago</h3>
                <p style={s.modalSub}>{modalPago.nombre} {modalPago.apellido_paterno}</p>
              </div>
              <button style={s.btnCerrar} onClick={() => setModalPago(null)}>✕</button>
            </div>

            <div style={s.periodoBadge}>
              📅 {modalPago.periodo?.label || calcularPeriodo(modalPago.dia_pago || 1).label}
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Monto ($)</label>
                <input style={s.input} type="number" placeholder="0.00" autoFocus
                  value={formPago.monto} onChange={e => setFormPago({ ...formPago, monto: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Método de pago</label>
                <select style={s.select} value={formPago.metodo_pago}
                  onChange={e => setFormPago({ ...formPago, metodo_pago: e.target.value })}>
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="transferencia">🏦 Transferencia</option>
                  <option value="tarjeta">💳 Tarjeta</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={s.label}>Fecha de pago</label>
                <input style={s.input} type="date" value={formPago.fecha_pago}
                  onChange={e => setFormPago({ ...formPago, fecha_pago: e.target.value })} />
              </div>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setModalPago(null)}>Cancelar</button>
              <button style={s.btnConfirmar} onClick={confirmarPago}>✓ Confirmar Pago</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL DE HISTORIAL ── */}
      {historialAlumno && (
        <div style={s.overlay} onClick={cerrarHistorial}>
          <div style={s.drawer} onClick={e => e.stopPropagation()}>
            <div style={s.drawerHeader}>
              <div style={s.drawerTituloRow}>
                <div style={s.avatarSm}>
                  {historialAlumno.foto_url
                    ? <img src={historialAlumno.foto_url} alt="" style={s.avatarImg} />
                    : <div style={s.avatarInicialSm}>{historialAlumno.nombre[0]}{historialAlumno.apellido_paterno[0]}</div>
                  }
                </div>
                <div>
                  <div style={s.drawerNombre}>{historialAlumno.nombre} {historialAlumno.apellido_paterno}</div>
                  <div style={s.drawerSub}>Día de corte: <strong>{historialAlumno.dia_pago || 1}</strong> de cada mes</div>
                </div>
              </div>
              <button style={s.btnCerrar} onClick={cerrarHistorial}>✕</button>
            </div>

            <div style={s.drawerContent}>
              {cargandoHistorial ? (
                <div style={s.empty}>Cargando historial...</div>
              ) : historial.length === 0 ? (
                <div style={s.empty}>Sin pagos registrados</div>
              ) : (
                <>
                  {/* Resumen */}
                  <div style={s.resumenHistorial}>
                    <div style={s.resumenHistItem}>
                      <span style={{ ...s.resumenNum, fontSize: '20px', color: 'var(--accent-green)' }}>
                        {historial.filter(p => p.estado === 'pagado').length}
                      </span>
                      <span style={s.resumenLabel}>Meses pagados</span>
                    </div>
                    <div style={s.resumenHistItem}>
                      <span style={{ ...s.resumenNum, fontSize: '20px', color: 'var(--accent-green)' }}>
                        ${historial.filter(p => p.estado === 'pagado')
                          .reduce((sum, p) => sum + parseFloat(p.monto), 0).toFixed(2)}
                      </span>
                      <span style={s.resumenLabel}>Total pagado</span>
                    </div>
                  </div>

                  {/* Lista de pagos */}
                  <div style={s.historialLista}>
                    {historial.map(p => (
                      <div key={p.id} style={s.historialItem}>
                        <div style={s.historialPeriodo}>
                          <div style={s.historialFechas}>
                            {p.fecha_inicio ? `${fmtFecha(p.fecha_inicio)} → ${fmtFecha(p.fecha_fin)}` : p.mes}
                          </div>
                          <div style={s.historialDetalle}>{p.metodo_pago} · {fmtFecha(p.fecha_pago)}</div>
                        </div>
                        <div style={s.historialDerecha}>
                          <div style={{ ...s.historialMonto, color: 'var(--accent-green)' }}>
                            ${parseFloat(p.monto).toFixed(2)}
                          </div>
                          <span style={{
                            ...s.badge,
                            background: p.estado === 'pagado' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                            color: p.estado === 'pagado' ? 'var(--accent-green)' : 'var(--accent-red)'
                          }}>{p.estado.toUpperCase()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  titulo: { fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 },
  sub: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' },
  resumen: { display: 'flex', gap: '12px' },
  resumenCard: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2px' },
  resumenNum: { fontSize: '28px', fontWeight: '900', lineHeight: 1 },
  resumenLabel: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' },
  barra: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' },
  filtros: { display: 'flex', gap: '8px' },
  filtroBtn: { padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' },
  filtroBtnActive: { background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' },
  search: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', padding: '8px 20px', color: 'var(--text-primary)', width: '240px', outline: 'none', fontSize: '14px' },
  empty: { textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '14px' },
  lista: { display: 'flex', flexDirection: 'column', gap: '8px' },
  card: { display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 18px', cursor: 'pointer', transition: 'all 0.2s' },
  avatar: { flexShrink: 0 },
  avatarImg: { width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' },
  avatarInicial: { width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px' },
  info: { flex: 1, minWidth: 0 },
  nombre: { fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' },
  periodo: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' },
  derecha: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 },
  badgePagado: { background: 'var(--accent-green-bg)', color: 'var(--accent-green)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' },
  montoInfo: { fontSize: '12px', color: 'var(--text-muted)' },
  btnPagar: { background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  btnEliminar: { background: 'var(--accent-red-bg)', color: 'var(--accent-red)', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', width: '460px', maxWidth: '95vw', boxShadow: 'var(--shadow-lg)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  modalTitulo: { margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' },
  modalSub: { margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' },
  periodoBadge: { background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', marginBottom: '20px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  label: { display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px', borderTop: '1px solid var(--border)', paddingTop: '18px' },
  btnCerrar: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 },
  btnSecondary: { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: '600' },
  btnConfirmar: { background: 'var(--accent-green)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  drawer: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '16px', width: '520px', maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 16px', borderBottom: '1px solid var(--border)' },
  drawerTituloRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatarSm: { flexShrink: 0 },
  avatarInicialSm: { width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px' },
  drawerNombre: { fontWeight: '800', color: 'var(--text-primary)', fontSize: '17px' },
  drawerSub: { fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' },
  drawerContent: { flex: 1, overflowY: 'auto', padding: '16px 24px 24px' },
  resumenHistorial: { display: 'flex', gap: '12px', marginBottom: '20px' },
  resumenHistItem: { flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' },
  historialLista: { display: 'flex', flexDirection: 'column', gap: '8px' },
  historialItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px' },
  historialPeriodo: { flex: 1 },
  historialFechas: { fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' },
  historialDetalle: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'capitalize' },
  historialDerecha: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' },
  historialMonto: { fontWeight: '800', fontSize: '15px' },
  badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800' },
}