import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { toast } from 'react-toastify'

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    escuela: '',
  })
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password || !form.escuela) {
      return toast.error('Completa todos los campos')
    }
    if (form.password.length < 6) {
      return toast.error('La contraseña debe tener al menos 6 caracteres')
    }
    if (form.password !== form.password_confirmation) {
      return toast.error('Las contraseñas no coinciden')
    }

    setCargando(true)
    try {
      await api.post('/register', form)
      setEnviado(true)
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) {
        const firstError = Object.values(errors)[0][0]
        toast.error(firstError)
      } else {
        toast.error(err.response?.data?.message || 'Error al registrarse')
      }
    } finally {
      setCargando(false)
    }
  }

  // ─── Pantalla de éxito ─────────────────────────────────────────────────────
  if (enviado) {
    return (
      <div style={s.container}>
        <div style={s.bgGlow} />
        <div style={s.card}>
          <div style={s.successIcon}>✅</div>
          <h1 style={s.title}>¡Solicitud enviada!</h1>
          <p style={s.successText}>
            Tu cuenta ha sido registrada correctamente. El administrador revisará
            tu solicitud y te asignará tu escuela. Una vez activada podrás
            iniciar sesión normalmente.
          </p>
          <Link to="/login" style={s.btnPrimary} id="go-to-login-after-register">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  // ─── Formulario ────────────────────────────────────────────────────────────
  return (
    <div style={s.container}>
      <div style={s.bgGlow} />

      <div style={s.card}>
        <div style={s.brand}>
          <div style={s.logoCircle}>🥋</div>
          <h1 style={s.title}>Registrarse</h1>
          <p style={s.subtitle}>
            Crea tu cuenta y espera la activación del administrador
          </p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
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
            <label style={s.label}>Nombre de tu escuela / dojo</label>
            <input
              id="register-escuela"
              style={s.input}
              placeholder="Ej. Leones TKD, Dragon Gym…"
              value={form.escuela}
              onChange={e => update('escuela', e.target.value)}
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
              <label style={s.label}>Confirmar contraseña</label>
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

          <button
            id="register-submit"
            type="submit"
            style={{ ...s.btnPrimary, opacity: cargando ? 0.7 : 1 }}
            disabled={cargando}
          >
            {cargando ? 'Enviando solicitud…' : '📨 Enviar solicitud'}
          </button>
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
    background: 'var(--bg-primary)',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGlow: {
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
    maxWidth: '460px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '36px 32px',
    boxShadow: 'var(--shadow-lg)',
    position: 'relative',
    zIndex: 1,
  },
  brand: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logoCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
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
    color: 'var(--text-primary)',
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: 1.5,
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
    color: 'var(--text-muted)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  btnPrimary: {
    display: 'block',
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '700',
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(59, 130, 246, 0.25)',
    transition: 'all 0.2s',
    textAlign: 'center',
    textDecoration: 'none',
    marginTop: '4px',
  },
  successIcon: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  successText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.7,
    textAlign: 'center',
    marginBottom: '24px',
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
    background: 'var(--border)',
  },
  dividerText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  linkLogin: {
    display: 'block',
    width: '100%',
    padding: '12px',
    textAlign: 'center',
    color: 'var(--accent-purple)',
    background: 'var(--accent-purple-bg)',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
  },
}
