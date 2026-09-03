import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import { FiShield, FiLogIn } from 'react-icons/fi'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const notice = sessionStorage.getItem('auth_expired_notice')
    if (notice) {
      sessionStorage.removeItem('auth_expired_notice')
      Swal.fire({
        title: 'Acceso Finalizado',
        text: notice,
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: 'var(--accent-blue)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
      })
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Completa todos los campos')

    setCargando(true)
    try {
      await login(email, password)
      toast.success('¡Bienvenido!')
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al iniciar sesión'
      if (err.response?.data?.subscription_expired || err.response?.data?.school_suspended) {
        Swal.fire({
          title: 'Suscripción Vencida',
          text: msg,
          icon: 'error',
          confirmButtonText: 'Entendido',
          confirmButtonColor: 'var(--accent-blue)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
        })
      } else {
        toast.error(msg)
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={s.container}>
      {/* Fondo con gradiente animado */}
      <div style={s.bgGlow} />

      <div style={s.card}>
        {/* Logo / Brand */}
        <div style={s.brand}>
          <div style={s.logoCircle}>
            <FiShield size={28} color="#ffffff" />
          </div>
          <h1 style={s.title}>GymCloud</h1>
          <p style={s.subtitle}>Panel de gestión para tu escuela</p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div>
            <label style={s.label}>Correo electrónico</label>
            <input
              id="login-email"
              style={s.input}
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div>
            <label style={s.label}>Contraseña</label>
            <input
              id="login-password"
              style={s.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            style={{
              ...s.btnPrimary,
              opacity: cargando ? 0.7 : 1,
              cursor: cargando ? 'wait' : 'pointer',
            }}
            disabled={cargando}
          >
            {cargando ? (
              <span style={s.spinner} />
            ) : (
              <>
                <FiLogIn size={15} />
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>
        </form>

        <div style={s.divider}>
          <span style={s.dividerLine} />
          <span style={s.dividerText}>¿No tienes cuenta?</span>
          <span style={s.dividerLine} />
        </div>

        <Link to="/register" style={s.linkRegister} id="go-to-register">
          Registrarse
        </Link>
      </div>

      <p style={s.footer}>
        GymCloud © {new Date().getFullYear()} — Gestión inteligente de artes marciales
      </p>
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
    background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
    top: '-200px',
    right: '-200px',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '40px 32px',
    boxShadow: 'var(--shadow-lg)',
    position: 'relative',
    zIndex: 1,
    boxSizing: 'border-box',
  },
  brand: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 8px 30px rgba(59, 130, 246, 0.3)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: '0 0 4px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
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
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  },
  btnPrimary: {
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
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 8px 30px rgba(59, 130, 246, 0.25)',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.6s linear infinite',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '28px 0 20px',
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
  linkRegister: {
    display: 'block',
    width: '100%',
    padding: '12px',
    textAlign: 'center',
    color: 'var(--accent-blue)',
    background: 'var(--accent-blue-bg)',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'background 0.2s',
    boxSizing: 'border-box',
  },
  footer: {
    marginTop: '24px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
  },
}
