import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'

const DISCIPLINAS = [
  { value: 'taekwondo', label: '🥋 Taekwondo' },
  { value: 'karate', label: '🥋 Karate' },
  { value: 'judo', label: '🥋 Judo' },
  { value: 'bjj', label: '🤼 Jiu-Jitsu Brasileño' },
  { value: 'mma', label: '🥊 MMA' },
  { value: 'kung_fu', label: '🐉 Kung Fu' },
  { value: 'otro', label: '⚡ Otra disciplina' },
]

export default function Register() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    escuela: '',
    disciplina: 'taekwondo',
  })
  const [cargando, setCargando] = useState(false)
  const { setUserDirect } = useAuth()
  const navigate = useNavigate()

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const nextStep = () => {
    if (step === 1) {
      if (!form.name || !form.email || !form.password) {
        return toast.error('Completa todos los campos')
      }
      if (form.password.length < 6) {
        return toast.error('La contraseña debe tener al menos 6 caracteres')
      }
      if (form.password !== form.password_confirmation) {
        return toast.error('Las contraseñas no coinciden')
      }
    }
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.escuela) return toast.error('Escribe el nombre de tu escuela')

    setCargando(true)
    try {
      const res = await api.post('/register', form)
      localStorage.setItem('token', res.data.token)
      // Set token in axios headers
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
      if (setUserDirect) setUserDirect(res.data.user)
      toast.success('🎉 ¡Tu escuela está lista!')
      navigate('/')
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) {
        const firstError = Object.values(errors)[0][0]
        toast.error(firstError)
      } else {
        toast.error(err.response?.data?.message || 'Error al registrar')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={s.container}>
      <div style={s.bgGlow2} />

      <div style={s.card}>
        <div style={s.brand}>
          <div style={s.logoCircle}>🥋</div>
          <h1 style={s.title}>Crea tu cuenta</h1>
          <p style={s.subtitle}>
            {step === 1
              ? 'Tus datos personales'
              : 'Configura tu escuela'}
          </p>
        </div>

        {/* Progress bar */}
        <div style={s.progressContainer}>
          <div style={{ ...s.progressBar, width: step === 1 ? '50%' : '100%' }} />
        </div>
        <div style={s.stepLabels}>
          <span style={{ color: '#60a5fa', fontWeight: 700 }}>1. Tu cuenta</span>
          <span style={{ color: step === 2 ? '#60a5fa' : '#475569', fontWeight: step === 2 ? 700 : 400 }}>2. Tu escuela</span>
        </div>

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); nextStep() } : handleSubmit} style={s.form}>
          {step === 1 ? (
            <>
              <div>
                <label style={s.label}>Tu nombre completo</label>
                <input
                  id="register-name"
                  style={s.input}
                  placeholder="Ej. Juan Pérez"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label style={s.label}>Correo electrónico</label>
                <input
                  id="register-email"
                  style={s.input}
                  type="email"
                  placeholder="tu@correo.com"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                />
              </div>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>Contraseña</label>
                  <input
                    id="register-password"
                    style={s.input}
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                  />
                </div>
                <div>
                  <label style={s.label}>Confirmar</label>
                  <input
                    id="register-password-confirm"
                    style={s.input}
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={form.password_confirmation}
                    onChange={e => update('password_confirmation', e.target.value)}
                  />
                </div>
              </div>
              <button id="register-next" type="submit" style={s.btnPrimary}>
                Siguiente →
              </button>
            </>
          ) : (
            <>
              <div>
                <label style={s.label}>Nombre de tu escuela / dojo</label>
                <input
                  id="register-escuela"
                  style={s.input}
                  placeholder="Ej. Tigres Do, Dragon Gym, etc."
                  value={form.escuela}
                  onChange={e => update('escuela', e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label style={s.label}>Disciplina principal</label>
                <div style={s.disciplinaGrid}>
                  {DISCIPLINAS.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      style={{
                        ...s.disciplinaBtn,
                        ...(form.disciplina === d.value ? s.disciplinaBtnActive : {}),
                      }}
                      onClick={() => update('disciplina', d.value)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={s.btnRow}>
                <button type="button" onClick={() => setStep(1)} style={s.btnSecondary}>
                  ← Atrás
                </button>
                <button
                  id="register-submit"
                  type="submit"
                  style={{
                    ...s.btnPrimary,
                    flex: 1,
                    opacity: cargando ? 0.7 : 1,
                  }}
                  disabled={cargando}
                >
                  {cargando ? 'Creando...' : '🚀 Crear mi escuela'}
                </button>
              </div>
            </>
          )}
        </form>

        <div style={s.divider}>
          <span style={s.dividerLine} />
          <span style={s.dividerText}>¿Ya tienes cuenta?</span>
          <span style={s.dividerLine} />
        </div>

        <Link to="/login" style={s.linkLogin} id="go-to-login">
          Iniciar sesión
        </Link>
      </div>
    </div>
  )
}

const s = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0b10',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGlow2: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
    bottom: '-200px',
    left: '-200px',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    background: '#13151f',
    border: '1px solid #1e2130',
    borderRadius: '20px',
    padding: '36px 32px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    position: 'relative',
    zIndex: 1,
  },
  brand: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    margin: '0 auto 14px',
    boxShadow: '0 8px 30px rgba(139, 92, 246, 0.3)',
  },
  title: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  progressContainer: {
    width: '100%',
    height: '4px',
    background: '#1e2130',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
    borderRadius: '10px',
    transition: 'width 0.4s ease',
  },
  stepLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: '#0f1117',
    border: '1px solid #1e2130',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  disciplinaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  disciplinaBtn: {
    padding: '10px 8px',
    background: '#0f1117',
    border: '1px solid #1e2130',
    borderRadius: '10px',
    color: '#94a3b8',
    fontSize: '12px',
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  disciplinaBtnActive: {
    background: '#1e2d4a',
    borderColor: '#3b82f6',
    color: '#60a5fa',
    fontWeight: '700',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.15)',
  },
  btnPrimary: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '700',
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(59, 130, 246, 0.25)',
    transition: 'all 0.2s',
  },
  btnSecondary: {
    padding: '14px 20px',
    background: '#1e2130',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '24px 0 16px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#1e2130',
  },
  dividerText: {
    fontSize: '12px',
    color: '#475569',
    whiteSpace: 'nowrap',
  },
  linkLogin: {
    display: 'block',
    width: '100%',
    padding: '12px',
    textAlign: 'center',
    color: '#a78bfa',
    background: '#1a1040',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
  },
}
