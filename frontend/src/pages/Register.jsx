import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { toast } from 'react-toastify'
import {
  FiShield,
  FiUser,
  FiHome,
  FiMail,
  FiPhone,
  FiLock,
  FiSend,
  FiCheckCircle,
  FiArrowRight,
  FiClock
} from 'react-icons/fi'

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    telefono: '',
    password: '',
    password_confirmation: '',
    escuela: '',
  })
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.escuela.trim()) {
      return toast.error('Completa todos los campos obligatorios')
    }
    if (form.telefono && form.telefono.trim().replace(/\D/g, '').length < 10) {
      return toast.error('El número de teléfono debe tener al menos 10 dígitos')
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
        <div style={s.bgGlow2} />

        <div style={{ ...s.card, textAlign: 'center', maxWidth: '500px' }}>
          {/* Ícono animado */}
          <div style={s.successRing}>
            <FiCheckCircle size={40} color="var(--accent-green)" />
          </div>

          <h1 style={{ ...s.title, fontSize: '26px', marginBottom: '10px' }}>
            ¡Solicitud enviada!
          </h1>
          <p style={{ ...s.successText, marginBottom: '28px' }}>
            Tu cuenta fue registrada exitosamente. El administrador revisará los datos de tu academia
            para activarla y te llegará una confirmación a tu correo.
          </p>

          {/* Pasos */}
          <div style={s.stepsBox}>
            <div style={s.step}>
              <div style={{ ...s.stepDot, background: 'var(--accent-green)' }}>
                <FiCheckCircle size={14} color="#fff" />
              </div>
              <div style={s.stepText}>
                <strong>Solicitud recibida</strong>
                <span>Tu información fue guardada en el sistema</span>
              </div>
            </div>
            <div style={s.stepLine} />
            <div style={s.step}>
              <div style={{ ...s.stepDot, background: 'var(--accent-blue)' }}>
                <FiClock size={14} color="#fff" />
              </div>
              <div style={s.stepText}>
                <strong>Revisión del administrador</strong>
                <span>Validación y alta de tu academia</span>
              </div>
            </div>
            <div style={s.stepLine} />
            <div style={s.step}>
              <div style={{ ...s.stepDot, background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                <FiShield size={14} />
              </div>
              <div style={s.stepText}>
                <strong>Cuenta activada</strong>
                <span>Acceso completo a tu panel de control</span>
              </div>
            </div>
          </div>

          <Link
            to="/login"
            style={{ ...s.btnPrimary, marginTop: '8px', display: 'flex', textDecoration: 'none' }}
            id="go-to-login-after-register"
          >
            <span>Ir al inicio de sesión</span>
            <FiArrowRight size={16} />
          </Link>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
            ¿Tienes dudas? Puedes contactar directamente a la administración.
          </p>
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
          <div style={s.logoCircle}>
            <FiShield size={28} color="#ffffff" />
          </div>
          <h1 style={s.title}>Registrarse</h1>
          <p style={s.subtitle}>
            Crea tu cuenta y solicita el alta de tu academia
          </p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div>
            <label style={s.label}>Tu nombre</label>
            <input
              id="register-name"
              style={s.input}
              placeholder=""
              value={form.name}
              onChange={e => update('name', e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label style={s.label}>Nombre de tu escuela / academia</label>
            <input
              id="register-escuela"
              style={s.input}
              placeholder=""
              value={form.escuela}
              onChange={e => update('escuela', e.target.value)}
            />
          </div>

          <div style={s.grid2}>
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
            <div>
              <label style={s.label}>Teléfono celular / WhatsApp</label>
              <input
                id="register-telefono"
                style={s.input}
                type="tel"
                placeholder="Mínimo 10 dígitos"
                value={form.telefono}
                onChange={e => update('telefono', e.target.value)}
              />
            </div>
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
            <FiSend size={15} />
            <span>{cargando ? 'Enviando solicitud…' : 'Enviar solicitud'}</span>
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
    padding: '24px 16px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
    top: '-200px',
    right: '-200px',
    pointerEvents: 'none',
  },
  bgGlow2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
    bottom: '-150px',
    left: '-150px',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '520px',
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
    marginBottom: '26px',
  },
  logoCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 14px',
    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: '0 0 4px',
    letterSpacing: '-0.4px',
  },
  subtitle: {
    fontSize: '13.5px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '14px',
  },
  label: {
    display: 'block',
    fontSize: '12.5px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '13.5px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.15s ease',
  },
  btnPrimary: {
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14.5px',
    fontWeight: '700',
    fontFamily: 'inherit',
    cursor: 'pointer',
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.25)',
    transition: 'all 0.2s ease',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '22px 0 16px',
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
    fontWeight: '600',
  },
  linkLogin: {
    display: 'block',
    width: '100%',
    padding: '11px',
    textAlign: 'center',
    color: 'var(--accent-blue)',
    background: 'var(--accent-blue-bg)',
    borderRadius: '10px',
    fontSize: '13.5px',
    fontWeight: '700',
    textDecoration: 'none',
    transition: 'background 0.2s',
    boxSizing: 'border-box',
  },
  successRing: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    background: 'var(--accent-green-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  successText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  stepsBox: {
    background: 'var(--bg-primary)',
    borderRadius: '14px',
    border: '1px solid var(--border)',
    padding: '18px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  stepDot: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    flexShrink: 0,
  },
  stepText: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '12.5px',
  },
  stepLine: {
    width: '2px',
    height: '14px',
    background: 'var(--border)',
    margin: '3px 0 3px 13px',
  },
}
