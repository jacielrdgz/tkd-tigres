import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { FiShield, FiCamera, FiPhone, FiMapPin, FiSave, FiLoader, FiAward } from 'react-icons/fi'

export default function DojoInfo() {
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [escuela, setEscuela] = useState({
    nombre: '',
    titular: '',
    disciplina: 'taekwondo',
    eslogan: '',
    descripcion: '',
    telefono_contacto: '',
    email_contacto: '',
    redes_sociales: { facebook: '', instagram: '', whatsapp: '' },
    logo_url: '',
    direccion: {
      calle: '',
      numero_exterior: '',
      numero_interior: '',
      colonia: '',
      ciudad: '',
      estado: '',
      codigo_postal: '',
      referencias: ''
    }
  })
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoFile, setFotoFile] = useState(null)

  useEffect(() => {
    api.get('/configuracion-escuela')
      .then(res => {
        const data = res.data
        setEscuela({
          ...data,
          redes_sociales: data.redes_sociales || { facebook: '', instagram: '', whatsapp: '' },
          direccion: data.direccion || {
            calle: '', numero_exterior: '', numero_interior: '',
            colonia: '', ciudad: '', estado: '', codigo_postal: '', referencias: ''
          }
        })
        if (data.logo_url) {
          const url = data.logo_url.startsWith('data:') ? data.logo_url : `${import.meta.env.VITE_API_URL || ''}/storage/${data.logo_url}`
          setFotoPreview(url)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFotoFile(file)
      setFotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const formData = new FormData()
    
    // Datos básicos
    formData.append('nombre', escuela.nombre)
    formData.append('titular', escuela.titular || '')
    formData.append('disciplina', escuela.disciplina || '')
    formData.append('eslogan', escuela.eslogan || '')
    formData.append('descripcion', escuela.descripcion || '')
    formData.append('telefono_contacto', escuela.telefono_contacto || '')
    formData.append('email_contacto', escuela.email_contacto || '')
    
    // Redes sociales (como array/json)
    Object.keys(escuela.redes_sociales).forEach(key => {
      formData.append(`redes_sociales[${key}]`, escuela.redes_sociales[key] || '')
    })

    // Dirección
    Object.keys(escuela.direccion).forEach(key => {
      formData.append(key, escuela.direccion[key] || '')
    })

    if (fotoFile) formData.append('foto', fotoFile)

    try {
      const { data } = await api.post('/configuracion-escuela', formData)
      setEscuela({
        ...data,
        redes_sociales: data.redes_sociales || { facebook: '', instagram: '', whatsapp: '' },
        direccion: data.direccion || {
          calle: '', numero_exterior: '', numero_interior: '',
          colonia: '', ciudad: '', estado: '', codigo_postal: '', referencias: ''
        }
      })
      await refreshUser()
      toast.success('Información actualizada correctamente')
    } catch (err) {
      console.error('Error detallado al guardar:', err.response?.data || err)
      const errorMsg = err.response?.data?.message || err.message || 'Error al guardar los cambios'
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando datos...</div>

  return (
    <div style={s.card}>
      <div style={s.layout}>
        {/* LADO IZQUIERDO: LOGO Y RESUMEN */}
        <div style={s.photoSection}>
          <div style={s.photoFrame}>
            {fotoPreview ? (
              <img src={fotoPreview} alt="Logo" style={s.logoImg} />
            ) : (
              <div style={s.logoPlaceholder}>
                <FiAward size={48} color="var(--accent-blue)" />
              </div>
            )}
            <label style={s.btnUpload}>
              <FiCamera size={14} style={{ marginRight: '6px' }} /> Cambiar Logo
              <input type="file" hidden accept="image/*" onChange={handleFileChange} />
            </label>
          </div>
          <p style={s.photoHint}>Sube el logo oficial de tu escuela.</p>
          
          <div style={s.summaryCard}>
            <div style={s.summaryItem}>
              <strong>Titular:</strong> {escuela.titular || 'No asignado'}
            </div>
            <div style={s.summaryItem}>
              <strong>Disciplina:</strong> {escuela.disciplina}
            </div>
          </div>
        </div>

        {/* LADO DERECHO: FORMULARIO DETALLADO */}
        <div style={s.formSection}>
          
          {/* SECCIÓN 1: IDENTIDAD */}
          <section style={s.section}>
            <h3 style={s.sectionTitle}>
              <FiShield size={18} style={{ marginRight: '8px', color: 'var(--accent-blue)', verticalAlign: 'middle' }} />
              Identidad de la Academia
            </h3>
            <div style={s.grid2}>
              <div style={s.inputGroup}>
                <label style={s.label}>Nombre de la Escuela</label>
                <input 
                  style={s.input} 
                  value={escuela.nombre} 
                  onChange={e => setEscuela({...escuela, nombre: e.target.value})} 
                  placeholder="Ej. Taekwondo Tigres Do"
                />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Nombre del Titular / Director</label>
                <input 
                  style={s.input} 
                  value={escuela.titular} 
                  onChange={e => setEscuela({...escuela, titular: e.target.value})} 
                  placeholder="Ej. Mtro. Juan Pérez"
                />
              </div>
            </div>
            <div style={s.grid2}>
              <div style={s.inputGroup}>
                <label style={s.label}>Eslogan o Lema</label>
                <input 
                  style={s.input} 
                  value={escuela.eslogan} 
                  onChange={e => setEscuela({...escuela, eslogan: e.target.value})} 
                  placeholder="Ej. Disciplina y Honor"
                />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Disciplina Principal</label>
                <select 
                  style={s.input} 
                  value={escuela.disciplina} 
                  onChange={e => setEscuela({...escuela, disciplina: e.target.value})}
                >
                  <option value="taekwondo">Taekwondo</option>
                  <option value="karate">Karate</option>
                  <option value="judo">Judo</option>
                  <option value="bjj">BJJ (Jiu-Jitsu)</option>
                  <option value="muay_thai">Muay Thai</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div style={s.inputGroup}>
              <label style={s.label}>Descripción o Biografía</label>
              <textarea 
                style={{...s.input, minHeight: '80px', resize: 'vertical'}} 
                value={escuela.descripcion} 
                onChange={e => setEscuela({...escuela, descripcion: e.target.value})} 
                placeholder="Cuéntanos un poco sobre la academia..."
              />
            </div>
          </section>

          {/* SECCIÓN 2: CONTACTO Y REDES */}
          <section style={s.section}>
            <h3 style={s.sectionTitle}>
              <FiPhone size={18} style={{ marginRight: '8px', color: 'var(--accent-blue)', verticalAlign: 'middle' }} />
              Contacto y Redes Sociales
            </h3>
            <div style={s.grid2}>
              <div style={s.inputGroup}>
                <label style={s.label}>Teléfono</label>
                <input 
                  style={s.input} 
                  value={escuela.telefono_contacto} 
                  onChange={e => setEscuela({...escuela, telefono_contacto: e.target.value})} 
                  placeholder="Ej. 811 223 3445"
                />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Correo Electrónico</label>
                <input 
                  style={s.input} 
                  value={escuela.email_contacto} 
                  onChange={e => setEscuela({...escuela, email_contacto: e.target.value})} 
                  placeholder="ejemplo@academia.com"
                />
              </div>
            </div>
            <div style={s.grid3}>
              <div style={s.inputGroup}>
                <label style={s.label}>WhatsApp (ID o Link)</label>
                <input 
                  style={s.input} 
                  value={escuela.redes_sociales.whatsapp} 
                  onChange={e => setEscuela({...escuela, redes_sociales: {...escuela.redes_sociales, whatsapp: e.target.value}})} 
                />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Instagram (@usuario)</label>
                <input 
                  style={s.input} 
                  value={escuela.redes_sociales.instagram} 
                  onChange={e => setEscuela({...escuela, redes_sociales: {...escuela.redes_sociales, instagram: e.target.value}})} 
                />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Facebook (Página)</label>
                <input 
                  style={s.input} 
                  value={escuela.redes_sociales.facebook} 
                  onChange={e => setEscuela({...escuela, redes_sociales: {...escuela.redes_sociales, facebook: e.target.value}})} 
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: UBICACIÓN */}
          <section style={s.section}>
            <h3 style={s.sectionTitle}>
              <FiMapPin size={18} style={{ marginRight: '8px', color: 'var(--accent-blue)', verticalAlign: 'middle' }} />
              Ubicación Física
            </h3>
            <div style={s.grid2}>
              <div style={{...s.inputGroup, flex: 2}}>
                <label style={s.label}>Calle</label>
                <input 
                  style={s.input} 
                  value={escuela.direccion.calle} 
                  onChange={e => setEscuela({...escuela, direccion: {...escuela.direccion, calle: e.target.value}})} 
                />
              </div>
              <div style={{...s.inputGroup, flex: 1}}>
                <label style={s.label}>Num. Ext.</label>
                <input 
                  style={s.input} 
                  value={escuela.direccion.numero_exterior} 
                  onChange={e => setEscuela({...escuela, direccion: {...escuela.direccion, numero_exterior: e.target.value}})} 
                />
              </div>
            </div>
            <div style={s.grid3}>
              <div style={s.inputGroup}>
                <label style={s.label}>Colonia</label>
                <input 
                  style={s.input} 
                  value={escuela.direccion.colonia} 
                  onChange={e => setEscuela({...escuela, direccion: {...escuela.direccion, colonia: e.target.value}})} 
                />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Ciudad</label>
                <input 
                  style={s.input} 
                  value={escuela.direccion.ciudad} 
                  onChange={e => setEscuela({...escuela, direccion: {...escuela.direccion, ciudad: e.target.value}})} 
                />
              </div>
              <div style={s.inputGroup}>
                <label style={s.label}>Estado</label>
                <input 
                  style={s.input} 
                  value={escuela.direccion.estado} 
                  onChange={e => setEscuela({...escuela, direccion: {...escuela.direccion, estado: e.target.value}})} 
                />
              </div>
            </div>
            <div style={s.inputGroup}>
              <label style={s.label}>Referencias de llegada</label>
              <input 
                style={s.input} 
                value={escuela.direccion.referencias} 
                onChange={e => setEscuela({...escuela, direccion: {...escuela.direccion, referencias: e.target.value}})} 
                placeholder="Ej. Frente al parque central, local azul..."
              />
            </div>
          </section>

          <div style={s.actions}>
            <button 
              style={{ ...s.btnSave, opacity: saving ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} 
              onClick={handleSave} 
              disabled={saving}
              onMouseEnter={e => {
                if (!saving) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)'
                  e.currentTarget.style.filter = 'brightness(1.08)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.filter = 'none'
              }}
            >
              {saving ? (
                <>
                  <FiLoader className="spin" size={16} style={{ marginRight: '8px' }} />
                  Guardando cambios...
                </>
              ) : (
                <>
                  <FiSave size={16} style={{ marginRight: '8px' }} />
                  Guardar Todo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  card: { background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid var(--border)', padding: '32px', boxShadow: 'var(--shadow-sm)', animation: 'fadeIn 0.4s ease-out' },
  layout: { display: 'flex', gap: '48px', flexWrap: 'wrap' },
  photoSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', minWidth: '240px' },
  photoFrame: { width: '220px', height: '220px', borderRadius: '32px', background: 'var(--bg-primary)', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', transition: '0.3s', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)' },
  logoImg: { width: '100%', height: '100%', objectFit: 'contain', padding: '10px' },
  logoPlaceholder: { fontSize: '64px' },
  btnUpload: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '12px', fontSize: '12px', fontWeight: '800', textAlign: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)', transition: '0.2s' },
  photoHint: { fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '200px' },
  summaryCard: { width: '100%', background: 'var(--bg-primary)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' },
  summaryItem: { fontSize: '13px', color: 'var(--text-secondary)' },
  
  formSection: { flex: 1, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '32px' },
  section: { display: 'flex', flexDirection: 'column', gap: '20px' },
  sectionTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '12px', margin: 0 },
  grid2: { display: 'flex', gap: '16px' },
  grid3: { display: 'flex', gap: '12px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
  label: { fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: '0.2s focus', borderFocus: '1px solid var(--accent-blue)' },
  actions: { marginTop: '16px', display: 'flex', justifyContent: 'flex-end' },
  btnSave: { minWidth: '200px', background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '14px', padding: '16px 32px', fontWeight: '800', cursor: 'pointer', fontSize: '16px', boxShadow: 'none', transition: 'all 0.2s ease' }
}
