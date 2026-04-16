import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'

const CINTAS = [
  'blanca', 'blanca_avanzada', 'amarilla', 'amarilla_avanzada',
  'naranja', 'naranja_avanzada', 'verde', 'verde_avanzada',
  'azul', 'azul_avanzada', 'marrón', 'marrón_avanzada',
  'roja', 'roja_avanzada', 'negra'
]


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

const capitalizar = (str) =>
  str ? str.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : ''

const obtenerIniciales = (nombre, apellido) => {
  if (!nombre) return '?'
  const n = nombre.trim().charAt(0)
  const a = apellido ? apellido.trim().charAt(0) : ''
  return (n + a).toUpperCase()
}

const toastSuccess = (msg) => {
  toast.success(msg, {
    style: {
      borderLeft: '4px solid #22c55e'
    }
  })
}

const toastError = (msg) => {
  toast.error(msg, {
    style: {
      borderLeft: '4px solid #ef4444'
    }
  })
}
const limpiarUrl = (url) => {
  if (!url) return null
  return url.replace(/\\\//g, '/')
}

const VACIO = {
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  nombre_tutor: '',
  telefono_tutor: '',
  email: '',
  fecha_nacimiento: '',
  cinta: 'blanca',
  horario: '', // Nuevo campo
  estatus: 'activo',
}

export default function Alumnos() {
  const [alumnos, setAlumnos]         = useState([])
  const [busqueda, setBusqueda]       = useState('')
  const [modal, setModal]             = useState(false)
  const [modalVer, setModalVer]       = useState(false)
  const [alumnoVer, setAlumnoVer]     = useState(null)
  const [form, setForm]               = useState(VACIO)
  const [fotoFile, setFotoFile]       = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [eliminarFoto, setEliminarFoto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(false)
  const [alumnoEliminar, setAlumnoEliminar] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [editando, setEditando]       = useState(null)
  const [cargando, setCargando]       = useState(true)
  const [estatusFiltro, setEstatusFiltro] = useState('activo')
  const [totales, setTotales]         = useState({ activo: '--', inactivo: '--' })
  const fileRef                       = useRef()

  const cargar = () => {
    setCargando(true)
    api.get('/alumnos', { params: { search: busqueda, estatus: estatusFiltro } })
      .then(res => {
        setAlumnos(res.data)
        setTotales(prev => ({ ...prev, [estatusFiltro]: res.data.length }))
      })
      .finally(() => setCargando(false))
  }
  const alternarEstatus = async (alumno) => {
  try {
    await api.patch(`/alumnos/${alumno.id}/toggle-estatus`)
    toastSuccess("Estatus actualizado") 
    cargar()
  } catch (err) {
    toastError("No se pudo cambiar el estatus")
  }
};

  useEffect(() => { cargar() }, [busqueda, estatusFiltro])

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') cerrar()
    }
    if (modal || modalVer) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => { window.removeEventListener('keydown', handleEsc) }
  }, [modal, modalVer])

  const abrirCrear = () => {
    setForm(VACIO)
    setFotoFile(null)
    setFotoPreview(null)
    setEliminarFoto(false)
    setEditando(null)
    setModal(true)
  }

 const abrirEditar = (alumno) => {
  // 1. Verificamos en consola que el objeto alumno traiga la información
  console.log("Editando alumno:", alumno);

  // 2. Mapeamos los datos del alumno al estado del formulario
  // Usamos los nombres exactos que espera tu estado 'form' y tus inputs
  setForm({
    ...alumno, // Trae todos los datos base
    nombre: alumno.nombre || '',
    apellido_paterno: alumno.apellido_paterno || '',
    apellido_materno: alumno.apellido_materno || '',
    nombre_tutor: alumno.nombre_tutor || '',
    telefono_tutor: alumno.telefono_tutor || '',
    email: alumno.email || '',
    fecha_nacimiento: alumno.fecha_nacimiento || '',
    
    // IMPORTANTE: Asegúrate de usar 'cinta' (que es lo que usa tu array CINTAS)
    cinta: alumno.cinta || 'blanca', 
    horario: alumno.horario || '', 
    estatus: alumno.estatus || 'activo',
  });

  // 3. CORRECCIÓN DE FOTO:
  // Mostramos la foto actual en el círculo de previsualización del modal
  if (alumno.foto_url) {
    setFotoPreview(limpiarUrl(alumno.foto_url));
  } else {
    setFotoPreview(null);
  }

  // 4. Resetear estados de archivos nuevos para esta edición
  setFotoFile(null);
  setEliminarFoto(false);

  // 5. Establecemos el ID para el modo edición y abrimos el modal
  setEditando(alumno.id);
  setModal(true);
};

  const abrirVer = (a) => { setAlumnoVer(a); setModalVer(true) }

  const cerrar = () => {
    setModal(false)
    setModalVer(false)
    setAlumnoVer(null)
    setFotoFile(null)
    setFotoPreview(null)
    setEliminarFoto(false)
  }

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
    setEliminarFoto(false)
  }

  const guardar = async () => {
    try {
      const data = new FormData()
      
      // Solo agregamos campos de texto que tengan valor
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '' && k !== 'foto_url' && k !== 'foto' && k !== 'id' && k !== 'edad') {
          data.append(k, v)
        }
      })
      if (eliminarFoto) {
      data.append('eliminar_foto', '1')
      }
      // CRITICO: Solo enviar 'foto' si es un ARCHIVO nuevo (File)
      // Esto evita el error "The foto field must be an image" al enviar el string de la URL
      if (fotoFile && fotoFile instanceof File) {
        data.append('foto', fotoFile)
      }

      if (editando) {
        data.append('_method', 'PUT')
        await api.post(`/alumnos/${editando}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toastSuccess("Alumno actualizado")
      } else {
        await api.post('/alumnos', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toastSuccess("Alumno creado")
      }
      cerrar()
      cargar()
    } catch (err) {
  console.error('Detalles del error:', err.response?.data)

  if (err.response?.data?.errors) {
    const errores = err.response.data.errors
    const primerError = Object.values(errores)[0][0]
    toast.error(primerError)
  } else {
    toastError("Error al guardar.")
  }
}
     
    
  }

 const abrirEliminar = (alumno) => {
  setAlumnoEliminar(alumno)
  setModalEliminar(true)
}

const confirmarEliminar = async () => {
  if (!alumnoEliminar) return

  try {
    setEliminandoId(alumnoEliminar.id)

    // Espera para que se vea la animación
    setTimeout(async () => {
      await api.delete(`/alumnos/${alumnoEliminar.id}`)

      toastSuccess('Alumno eliminado correctamente 🗑️')

      setModalEliminar(false)
      setAlumnoEliminar(null)
      setEliminandoId(null)

      cargar()
    }, 300)
  } catch (err) {
    setEliminandoId(null)
    toastError('No se pudo eliminar el alumno')
  }
}

  const tieneFoto = (url) => url && typeof url === 'string' && url.length > 5

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Alumnos</h2>
          <p style={s.sub}>Gestión de estudiantes y grados</p>
        </div>
        <button style={s.btnPrimary} onClick={abrirCrear}>+ Nuevo alumno</button>
      </div>

      <div style={s.barraAcciones}>
        <input
          style={s.search}
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <div style={s.tabs}>
          <button
            style={estatusFiltro === 'activo' ? s.tabActiveVerde : s.tab}
            onClick={() => setEstatusFiltro('activo')}
          >
            Activos ({cargando ? '--' : (estatusFiltro === 'activo' ? alumnos.length : totales.activo)})
          </button>
          <button
            style={estatusFiltro === 'inactivo' ? s.tabActiveRojo : s.tab}
            onClick={() => setEstatusFiltro('inactivo')}
          >
            Inactivos ({cargando ? '--' : (estatusFiltro === 'inactivo' ? alumnos.length : totales.inactivo)})
          </button>
        </div>
      </div>

      <div style={s.tabla}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Foto', 'Nombre', 'Edad', 'Cinta', 'Tutor', 'Teléfono', 'Estatus', 'Acciones'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={8} style={s.tdCenter}>Cargando...</td></tr>
            ) : alumnos.length === 0 ? (
              <tr><td colSpan={8} style={s.tdCenter}>No hay alumnos registrados</td></tr>
            ) : alumnos.map(a => (
              <tr key={a.id} style={s.tr}>
                <td style={s.td}>
                  <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                    {tieneFoto(a.foto_url) ? (
                      <img
                        src={limpiarUrl(a.foto_url)}
                        alt="foto"
                        style={s.fotoTabla}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                      />
                    ) : null}
                    <div style={{
                      ...s.fotoVacia,
                      display: tieneFoto(a.foto_url) ? 'none' : 'flex'
                    }}>
                      {obtenerIniciales(a.nombre, a.apellido_paterno)}
                    </div>
                  </div>
                </td>
                <td style={s.td}>
                  <div style={s.nombreNom}>{a.nombre} {a.apellido_paterno} {a.apellido_materno}</div>
                  <div style={s.emailSub}>{a.email}</div>
                </td>
                <td style={s.td}>{a.edad} años</td>
                <td style={s.td}>
                  <span style={{
                    ...s.cinta,
                    background: COLOR_CINTA[a.cinta] || '#334155',
                    color: a.cinta && a.cinta.includes('blanca') ? '#0f172a' : '#fff'
                  }}>
                    {capitalizar(a.cinta)}
                  </span>
                </td>
                <td style={s.td}>{a.nombre_tutor}</td>
                <td style={s.td}>{a.telefono_tutor}</td>
                <td style={s.td}>
                  <span 
                  onClick={() => alternarEstatus(a)}
                  style={{
                    ...s.badge,
                    background: a.estatus === 'activo' ? s.statusActivoBg : s.statusInactivoBg,
                    color: a.estatus === 'activo' ? s.statusActivoText : s.statusInactivoText,
                    cursor: 'pointer', // Para que parezca un botón
                    userSelect: 'none'
                  }}
                  title="Clic para cambiar status"
                  >
                    {capitalizar(a.estatus)}
                  </span>
                </td>
                <td style={s.td}>
                  <div style={s.acciones}>
                    <button style={s.btnVer}  onClick={() => abrirVer(a)}>Ver</button>
                    <button style={s.btnEdit} onClick={() => abrirEditar(a)}>Editar</button>
                    <button style={s.btnDel}  onClick={() => abrirEliminar(a)}>Borrar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalVer && alumnoVer && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>
                {alumnoVer.nombre} {alumnoVer.apellido_paterno} {alumnoVer.apellido_materno}
              </h3>
              <button style={s.btnCerrarWhite} onClick={cerrar}>X</button>
            </div>
            <div style={s.cardBody}>
              <div style={s.avatarBox}>
                {tieneFoto(alumnoVer.foto_url) ? (
                  <img
                    src={limpiarUrl(alumnoVer.foto_url)}
                    alt="foto"
                    style={s.avatarImg}
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div style={{
                  ...s.avatarInicialesBox,
                  display: tieneFoto(alumnoVer.foto_url) ? 'none' : 'flex'
                }}>
                  <span style={s.avatarIniciales}>
                    {obtenerIniciales(alumnoVer.nombre, alumnoVer.apellido_paterno)}
                  </span>
                </div>
              </div>
              <div style={s.cardInfo}>
                <InfoItem label="ID"       value={alumnoVer.id.toString().padStart(6, '0')} />
                <InfoItem label="F. Nac."  value={alumnoVer.fecha_nacimiento} />
                <InfoItem label="Edad"     value={alumnoVer.edad + ' años'} />
                <InfoItem label="Cinta"    value={capitalizar(alumnoVer.cinta)} />
                <InfoItem label="Tutor"    value={alumnoVer.nombre_tutor} />
                <InfoItem label="Teléfono" value={alumnoVer.telefono_tutor} />
                <InfoItem label="Correo"   value={alumnoVer.email || 'N/A'} />
                <InfoItem label="Status"   value={capitalizar(alumnoVer.estatus)} />
              </div>
            </div>
            <div style={s.cardFooter}>
              <a 
                href={'https://wa.me/52' + alumnoVer.telefono_tutor.replace(/\s+/g, '')}
                target="_blank"
                rel="noreferrer"
                style={s.btnWhatsapp}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.517 2.011.808 3.146.809 3.181 0 5.767-2.584 5.768-5.764 0-3.18-2.586-5.763-5.768-5.763zm4.52 8.161c-.199.557-1.162 1.058-1.597 1.115-.41.054-.935.086-1.503-.099-.345-.113-.775-.262-1.328-.489-2.315-.953-3.82-3.308-3.936-3.461-.116-.155-.945-1.258-.945-2.399 0-1.141.594-1.701.806-1.933.211-.231.462-.29.616-.29.154 0 .308.001.442.008.14.007.33-.053.516.39.186.444.636 1.547.692 1.659.056.111.093.242.019.39-.074.148-.112.241-.223.37-.111.13-.233.29-.333.389-.111.111-.228.232-.098.455.13.223.577.95 1.24 1.54.853.759 1.567.994 1.79.1.223-.112.455-.228.678-.541.222-.314.185-.537.408-.65s.445-.074.743.074c.297.149 1.874.883 2.196 1.043.322.16.537.241.616.37.079.13.079.752-.12 1.309z"/>
                </svg>
                WHATSAPP
              </a>
              <button style={s.btnAceptar} onClick={cerrar}>CERRAR</button>
            </div>
          </div>
        </div>
      )}
     
      {modalEliminar && alumnoEliminar && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}
  >
    <div
      style={{
        width: '100%',
        maxWidth: '420px',
        background: '#13151f',
        border: '1px solid #1e2130',
        borderRadius: '18px',
        padding: '28px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
        animation: 'fadeIn .25s ease'
      }}
       >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '22px' }}>
        {alumnoEliminar.foto_url ? (
          <img
            src={alumnoEliminar.foto_url}
            alt="Alumno"
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #1e2130'
            }}
          />
        ) : (
          <div
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '50%',
              background: '#1e2130',
              color: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 700
            }}
          >
            {obtenerIniciales(
              alumnoEliminar.nombre,
              alumnoEliminar.apellido_paterno
            )}
          </div>
        )}
        <div>
          <div
            style={{
              color: '#fff',
              fontSize: '18px',
              fontWeight: 700,
              marginBottom: '4px'
            }}
          >
            ¿Eliminar alumno?
          </div>

          <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.5 }}>
            {alumnoEliminar.nombre} {alumnoEliminar.apellido_paterno}
            <br />
            Esta acción no se puede deshacer.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          onClick={() => {
            setModalEliminar(false)
            setAlumnoEliminar(null)
          }}
          style={{
            background: '#1e2130',
            color: '#cbd5e1',
            border: '1px solid #2a2f45',
            borderRadius: '10px',
            padding: '10px 18px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Cancelar
        </button>

        <button
          onClick={confirmarEliminar}
          style={{
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            cursor: 'pointer',
            fontWeight: 700,
            boxShadow: '0 10px 25px rgba(239,68,68,.25)'
          }}
        >
          Eliminar
        </button>
      </div>
    </div>
  </div>
)}

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitulo}>{editando ? 'Editar alumno' : 'Nuevo alumno'}</h3>
              <button style={s.btnCerrar} onClick={cerrar}>X</button>
            </div>

            <div style={s.fotoUploadArea}>
              <div style={s.fotoPreviewBox} onClick={() => fileRef.current.click()}>
                {fotoPreview ? (
                  <img src={fotoPreview} alt="preview" style={s.fotoPreviewImg} />
                ) : (
                  <div style={s.fotoPlaceholder}>
                    {/*/Icono SVG*/}
                    <svg
                    width="32" 
                     height="32" 
                     viewBox="0 0 24 24" 
                    fill="none" 
                      stroke="#3b82f6" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
              strokeLinejoin="round"
                    ></svg>
                    <span style={{ fontSize: '22px', color: '#3b82f6', fontWeight: '700' }}>
                      {form.nombre || form.apellido_paterno
                        ? obtenerIniciales(form.nombre, form.apellido_paterno)
                        : '+'
                      }
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                      {form.nombre ? 'Agregar foto' : 'Foto'}
                    </span>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFoto}
              />
              {fotoPreview && (
                <button
                  style={s.btnQuitarFoto}
                  onClick={() => { setFotoFile(null); setFotoPreview(null);setEliminarFoto(true) }}
                >
                  Quitar foto
                </button>
              )}
            </div>

            <div style={s.grid2}>
              <Campo label="Nombre(s)"          value={form.nombre}           onChange={v => setForm({ ...form, nombre: v })} />
              <Campo label="Apellido paterno"    value={form.apellido_paterno} onChange={v => setForm({ ...form, apellido_paterno: v })} />
              <Campo label="Apellido materno"    value={form.apellido_materno} onChange={v => setForm({ ...form, apellido_materno: v })} />
              <Campo label="Fecha de nacimiento" value={form.fecha_nacimiento} onChange={v => setForm({ ...form, fecha_nacimiento: v })} type="date" />
              <Campo label="Nombre del tutor"    value={form.nombre_tutor}     onChange={v => setForm({ ...form, nombre_tutor: v })} />
              <Campo label="Teléfono del tutor"  value={form.telefono_tutor}   onChange={v => setForm({ ...form, telefono_tutor: v })} />
              <Campo label="Correo electrónico"  value={form.email}            onChange={v => setForm({ ...form, email: v })} type="email" full />

              <div style={s.campoGroup}>
  <label style={s.label}>Horario Asignado</label>
  <select 
    style={s.select} 
    value={form.horario} 
    onChange={e => setForm({...form, horario: e.target.value})}
  >
    <option value="">Seleccionar horario...</option>
    <option value="Horario 1">Horario 1 (Ej. 4:00 PM - 5:00 PM)</option>
    <option value="Horario 2">Horario 2 (Ej. 5:00 PM - 6:00 PM)</option>
    <option value="Horario 3">Horario 3 (Ej. 6:00 PM - 7:00 PM)</option>
  </select>
</div>
              <div style={s.campoGroup}>
                <label style={s.label}>Cinta</label>
                <select style={s.select} value={form.cinta} onChange={e => setForm({ ...form, cinta: e.target.value })}>
                  {CINTAS.map(c => (
                    <option key={c} value={c}>{capitalizar(c)}</option>
                  ))}
                </select>
              </div>

              <div style={s.campoGroup}>
                <label style={s.label}>Estatus</label>
                <select style={s.select} value={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.value })}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={cerrar}>Cancelar</button>
              <button style={s.btnPrimary}   onClick={guardar}>
                {editando ? 'Guardar cambios' : 'Crear alumno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div style={s.infoItem}>
      <span style={s.infoLabel}>{label}:</span>
      <span style={s.infoValue}>{value}</span>
    </div>
  )
}

function Campo({ label, value, onChange, type = 'text', full }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : {}}>
      <label style={s.label}>{label}</label>
      <input style={s.input} type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

 const s = {
  statusActivoBg:    '#14532d',
  statusActivoText:  '#4ade80',
  statusInactivoBg:  '#450a0a',
  statusInactivoText:'#f87171',

  header:           { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  titulo:           { fontSize: '24px', fontWeight: '700', color: '#f1f5f9' },
  sub:              { fontSize: '15px', color: '#64748b', marginTop: '2px' },
  barraAcciones:    { display: 'flex', gap: '16px', marginBottom: '16px' },
  search:           { flex: 1, padding: '10px 16px', background: '#13151f', border: '1px solid #1e2130', borderRadius: '80px', color: '#e2e8f0', outline: 'none' },
  tabs:             { display: 'flex', background: '#13151f', padding: '4px', borderRadius: '10px', border: '1px solid #1e2130' },
  tab:              { padding: '8px 16px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px' },
  tabActiveVerde:   { padding: '8px 16px', background: '#14532d', border: 'none', color: '#4ade80', borderRadius: '8px', fontWeight: '600', fontSize: '13px' },
  tabActiveRojo:    { padding: '8px 16px', background: '#450a0a', border: 'none', color: '#f87171', borderRadius: '8px', fontWeight: '600', fontSize: '13px' },
  tabla:            { background: '#13151f', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e2130' },
  table:            { width: '100%', borderCollapse: 'collapse' },
  th:               { padding: '10px 16px', textAlign: 'left', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #1e2130', textTransform: 'uppercase' },
  tr:               { borderBottom: '1px solid #1e2130' },
  td:               { padding: '10px 16px', fontSize: '14px', color: '#cbd5e1', verticalAlign: 'middle' },
  tdCenter:         { padding: '32px', textAlign: 'center', color: '#475569' },
  fotoTabla:        { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #1e2130' },
  fotoVacia:        { width: '40px', height: '40px', borderRadius: '50%', background: '#1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#60a5fa' },
  nombreNom:        { fontWeight: '600', color: '#f1f5f9' },
  emailSub:         { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  cinta:            { padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
  badge:            { padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
  acciones:         { display: 'flex', gap: '5px' },
  btnVer:           { background: '#0f172a', border: '1px solid #1e2130', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', color: '#94a3b8', fontSize: '12px' },
  btnEdit:          { background: '#1e2d4a', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', color: '#60a5fa', fontSize: '12px' },
  btnDel:           { background: '#2d1515', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', color: '#f87171', fontSize: '12px' },
  btnPrimary:       { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary:     { background: '#1e2130', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer' },
  overlay:          { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard:        { background: '#fff', borderRadius: '11px', width: '650px', maxWidth: '95vw', overflow: 'hidden' },
  cardHeader:       { background: '#0d3b5c', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '10px', borderTopRightRadius: '10px' },
  cardTitle:        { fontSize: '18px', fontWeight: '600', textTransform: 'uppercase', color: '#fff' },
  btnCerrarWhite:   { background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' },
  cardBody:         { padding: '30px', display: 'flex', gap: '18px', alignItems: 'flex-start' },
  avatarBox:        { width: '180px', height: '220px', flexShrink: 0, border: '1px solid #e2e8f0', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarImg:        { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInicialesBox: { width: '100%', height: '100%', background: '#1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarIniciales:  { fontSize: '56px', fontWeight: '700', color: '#60a5fa' },
  cardInfo:         { flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' },
  infoItem:         { display: 'flex', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' },
  infoLabel:        { width: '100px', fontWeight: '700', color: '#64748b', fontSize: '15px', textAlign: 'right', marginRight: '20px' },
  infoValue:        { color: '#1e293b', fontSize: '14.5px', fontWeight: '500' },
  cardFooter:       { padding: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: '15px' },
  btnAceptar:       { background: '#fff', border: '1px solid #0d3b5c', color: '#0d3b5c', padding: '8px 30px', borderRadius: '5px', fontWeight: '600', cursor: 'pointer' },
  btnWhatsapp:      { border: '1px solid #25d366', color: '#25d366', padding: '8px 30px', borderRadius: '5px', fontWeight: '700', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center' },
  modal:            { background: '#13151f', border: '5px solid #1e2130', borderRadius: '16px', padding: '28px', width: '580px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader:      { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  modalTitulo:      { color: '#f1f5f9', fontSize: '18px', fontWeight: '700' },
  btnCerrar:        { background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' },
  fotoUploadArea:   { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', gap: '8px' },
  fotoPreviewBox:   { width: '100px', height: '100px', borderRadius: '50%', border: '2px dashed #334155', cursor: 'pointer', overflow: 'hidden', background: '#1e2d4a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fotoPreviewImg:   { width: '100%', height: '100%', objectFit: 'cover' },
  fotoPlaceholder:  { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  btnQuitarFoto:    { background: 'none', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer' },
  grid2:            { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  campoGroup:       { marginTop: '1px' },
  label:            { display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' },
  input:            { width: '100%', fontSize: '14px', padding: '9px 12px', background: '#0f1117', border: '1px solid #1e2130', borderRadius: '8px', color: '#e2e8f0', outline: 'none' },
  select:           { width: '100%', padding: '9px 12px', background: '#0f1117', border: '1px solid #1e2130', borderRadius: '8px', color: '#e2e8f0', outline: 'none' },
  modalFooter:      { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #1e2130', paddingTop: '20px' },
}