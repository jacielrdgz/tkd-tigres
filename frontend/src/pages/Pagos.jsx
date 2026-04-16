import { useEffect, useState, useMemo } from 'react'
import api from '../api/axios'
import Swal from 'sweetalert2' 
import { toast } from 'react-toastify'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

const mesLabel = (mes) => {
  if (!mes) return ''
  const [anio, num] = mes.split('-')
  return `${MESES[parseInt(num) - 1]} ${anio}`
}

const getMesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const VACIO = {
  alumno_id:   '',
  alumno_nombre: '', 
  mes:         getMesActual(), 
  monto:       '',
  metodo_pago: 'efectivo',
  estado:      'pagado', 
  fecha_pago:  new Date().toLocaleDateString('sv-SE'), 
}

export default function Pagos() {
  const [pagos, setPagos] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [editando, setEditando] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busquedaTabla, setBusquedaTabla] = useState('')

  const cargar = () => {
    setCargando(true)
    const params = {}
    if (filtroEstado) params.estado = filtroEstado
    api.get('/pagos', { params })
      .then(res => setPagos(res.data))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    api.get('/alumnos', { params: { estatus: 'activo' } })
      .then(res => setAlumnos(res.data))
    cargar()
  }, [filtroEstado])

  // LÓGICA DE BÚSQUEDA EN TABLA
  const pagosFiltrados = useMemo(() => {
    return pagos.filter(p => {
      const nombre = `${p.alumno?.nombre} ${p.alumno?.apellido_paterno}`.toLowerCase()
      return nombre.includes(busquedaTabla.toLowerCase())
    })
  }, [pagos, busquedaTabla])

  const abrirCrear = () => {
    setForm(VACIO)
    setEditando(null)
    setModal(true)
  }

  const abrirEditar = (p) => {
    setForm({
      alumno_id:   p.alumno_id,
      alumno_nombre: `${p.alumno?.nombre} ${p.alumno?.apellido_paterno}`, 
      mes:         p.mes,
      monto:       p.monto,
      metodo_pago: p.metodo_pago,
      estado:      p.estado,
      fecha_pago:  p.fecha_pago || '',
    })
    setEditando(p.id)
    setModal(true)
  }

  const guardar = async () => {
    if (!form.alumno_id || !form.monto) {
       return toast.error("Selecciona un alumno válido de la lista y asigna un monto");
    }
    
    try {
      const datos = {
        alumno_id:   parseInt(form.alumno_id),
        mes:         form.mes,
        monto:       parseFloat(form.monto),
        metodo_pago: form.metodo_pago,
        estado:      form.estado,
        fecha_pago:  form.fecha_pago
      }

      if (editando) {
        await api.put(`/pagos/${editando}`, datos)
      } else {
        await api.post('/pagos', datos)
      }
      
      setModal(false)
      cargar()
      toast.success(editando ? 'Pago actualizado' : 'Pago registrado con éxito')
    } catch (err) {
      toast.error('Error al guardar el pago')
    }
  }

  const eliminar = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar pago?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#1e293b',
      confirmButtonText: 'Sí, eliminar',
      background: '#13151f',
      color: '#f1f5f9'
    })

    if (result.isConfirmed) {
      await api.delete(`/pagos/${id}`)
      cargar()
      toast.success('Pago eliminado')
    }
  }

  const colorEstado = (e) => ({
    pagado:    { bg: '#14532d', color: '#4ade80' },
    pendiente: { bg: '#1c1917', color: '#fbbf24' },
    vencido:   { bg: '#450a0a', color: '#f87171' },
  }[e])

  return (
    <div style={{ padding: '24px' }}>
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Pagos</h2>
          <p style={s.sub}>Tigres Do</p>
        </div>
        <button style={s.btnPrimary} onClick={abrirCrear}>+ Nuevo Pago</button>
      </div>

      <div style={s.barraAcciones}>
        <div style={s.filtros}>
          {['', 'pagado', 'pendiente', 'vencido'].map(e => (
            <button
              key={e}
              style={{ ...s.filtroBtn, ...(filtroEstado === e ? s.filtroBtnActive : {}) }}
              onClick={() => setFiltroEstado(e)}
            >
              {e === '' ? 'Todos' : e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
        
        <input 
          style={s.search}
          placeholder="Filtrar tabla..."
          value={busquedaTabla}
          onChange={(e) => setBusquedaTabla(e.target.value)}
        />
      </div>

      <div style={s.tabla}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Alumno</th>
              <th style={s.th}>Mes Correspondiente</th>
              <th style={s.th}>Monto</th>
              <th style={s.th}>Método</th>
              <th style={s.th}>Fecha de Pago</th>
              <th style={s.th}>Estado</th>
              <th style={{...s.th, textAlign: 'center'}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={7} style={s.tdCenter}>Cargando...</td></tr>
            ) : pagosFiltrados.length === 0 ? (
              <tr><td colSpan={7} style={s.tdCenter}>No se encontraron registros</td></tr>
            ) : pagosFiltrados.map(p => {
              const c = colorEstado(p.estado)
              return (
                <tr key={p.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.nombre}>{p.alumno?.nombre} {p.alumno?.apellido_paterno}</div>
                  </td>
                  <td style={s.td}>{mesLabel(p.mes)}</td>
                  <td style={s.td}><span style={s.monto}>${parseFloat(p.monto).toFixed(2)}</span></td>
                  <td style={s.td}>{p.metodo_pago}</td>
                  <td style={s.td}>{p.fecha_pago || '—'}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: c?.bg, color: c?.color }}>
                      {p.estado.toUpperCase()}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={{...s.acciones, justifyContent: 'center'}}>
                      <button style={s.btnEdit} onClick={() => abrirEditar(p)}>✏️</button>
                      <button style={s.btnDel}  onClick={() => eliminar(p.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitulo}>{editando ? 'Editar Registro' : 'Nuevo Pago'}</h3>
              <button style={s.btnCerrar} onClick={() => setModal(false)}>✕</button>
            </div>

            <div style={s.campoGroup}>
              <label style={s.label}>Alumno (Escribe para buscar)</label>
              <input
                list="lista-alumnos"
                style={s.input}
                placeholder="Escribe el nombre del alumno..."
                value={form.alumno_nombre}
                onChange={e => {
                  const val = e.target.value
                  const encontrado = alumnos.find(a => `${a.nombre} ${a.apellido_paterno}` === val)
                  setForm({...form, alumno_nombre: val, alumno_id: encontrado ? encontrado.id : '' })
                }}
              />
              <datalist id="lista-alumnos">
                {alumnos.map(a => (
                  <option key={a.id} value={`${a.nombre} ${a.apellido_paterno}`} />
                ))}
              </datalist>
              {form.alumno_id ? (
                <small style={{color: '#4ade80', display: 'block', marginTop: '4px'}}>✓ Alumno identificado</small>
              ) : (
                <small style={{color: '#64748b', display: 'block', marginTop: '4px'}}>Selecciona de la lista predictiva</small>
              )}
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>Mes a Pagar</label>
                <input style={s.input} type="month" value={form.mes} onChange={e => setForm({...form, mes: e.target.value})} />
              </div>
              <div>
                <label style={s.label}>Monto ($)</label>
                <input style={s.input} type="number" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} placeholder="0.00" />
              </div>
              <div>
                <label style={s.label}>Método</label>
                <select style={s.select} value={form.metodo_pago} onChange={e => setForm({...form, metodo_pago: e.target.value})}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Estatus</label>
                <select style={s.select} value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                  <option value="pagado">Pagado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="vencido">Vencido</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Fecha de Pago</label>
                <input style={s.input} type="date" value={form.fecha_pago} onChange={e => setForm({...form, fecha_pago: e.target.value})} />
              </div>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setModal(false)}>Cancelar</button>
              <button style={s.btnPrimary} onClick={guardar}>
                {editando ? 'Actualizar' : 'Registrar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  titulo: { fontSize: '24px', fontWeight: '700', color: '#f1f5f9', margin: 0 },
  sub: { fontSize: '14px', color: '#64748b', marginTop: '2px' },
  barraAcciones: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px', gap: '15px' },
  filtros: { display: 'flex', gap: '8px' },
  filtroBtn: { padding: '8px 16px', borderRadius: '20px', border: '1px solid #1e2130', background: '#13151f', color: '#64748b', fontSize: '12px', cursor: 'pointer', transition: '0.2s' },
  filtroBtnActive: { background: '#1e2d4a', color: '#60a5fa', borderColor: '#3b82f6' },
  search: { background: '#13151f', border: '1px solid #1e2130', borderRadius: '20px', padding: '8px 20px', color: '#fff', width: '250px', outline: 'none' },
  tabla: { background: '#13151f', border: '1px solid #1e2130', borderRadius: '12px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '14px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #1e2130' },
  tr: { borderBottom: '1px solid #1e2130', transition: '0.2s' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#cbd5e1' },
  tdCenter: { padding: '40px', textAlign: 'center', color: '#475569' },
  nombre: { fontWeight: '600', color: '#f1f5f9' },
  monto: { color: '#4ade80', fontWeight: '700' },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '700' },
  acciones: { display: 'flex', gap: '8px' },
  btnPrimary: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: '600' },
  btnSecondary: { background: '#1e2130', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer' },
  btnEdit: { background: '#1e2d4a', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' },
  btnDel: { background: '#2d1515', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#13151f', border: '1px solid #1e2130', borderRadius: '16px', padding: '30px', width: '500px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  modalTitulo: { margin: 0, color: '#fff' },
  btnCerrar: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px' },
  campoGroup: { marginBottom: '15px' },
  label: { display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '5px' },
  input: { width: '100%', padding: '10px', background: '#0f1117', border: '1px solid #1e2130', borderRadius: '8px', color: '#fff', outline: 'none' },
  select: { width: '100%', padding: '10px', background: '#0f1117', border: '1px solid #1e2130', borderRadius: '8px', color: '#fff', outline: 'none' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px' }
}