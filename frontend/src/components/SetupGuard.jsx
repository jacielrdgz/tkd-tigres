import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'

export default function SetupGuard({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(null)

  const fetchStatus = () => {
    api.get('/configuracion-escuela/status')
      .then(res => setStatus(res.data))
      .catch(() => setStatus({ configurado: true })) // Si falla, no bloquear
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // SuperAdmin no necesita configurar escuela
    if (user?.is_superadmin) {
      setLoading(false)
      setStatus({ configurado: true })
      return
    }

    fetchStatus()
  }, [user])

  const handleConfirmStep = async (stepId) => {
    setConfirming(stepId)
    try {
      await api.post('/configuracion-escuela/confirmar-paso', { paso: stepId })
      toast.success('Paso confirmado correctamente')
      fetchStatus()
    } catch (err) {
      toast.error('Error al confirmar el paso preestablecido')
    } finally {
      setConfirming(null)
    }
  }

  if (loading) {
    return (
      <div style={s.loadingContainer}>
        <div style={s.spinner} />
        <p style={s.loadingText}>Verificando configuración...</p>
      </div>
    )
  }

  if (status?.configurado) {
    return children
  }

  const pasos = status?.pasos || {}
  const steps = [
    {
      id: 'info_basica',
      label: 'Datos de la Escuela',
      desc: 'Configura el nombre, titular y datos básicos de tu academia.',
      icon: '🏫',
      done: pasos.info_basica,
      path: '/ajustes/configuracion/general'
    },
    {
      id: 'cintas',
      label: 'Grados y Cintas',
      desc: 'Verifica o personaliza los grados de cintas para tus alumnos.',
      icon: '🥋',
      done: pasos.cintas,
      path: '/ajustes/configuracion/cintas'
    },
    {
      id: 'horarios',
      label: 'Horarios de Clase',
      desc: 'Crea al menos un horario para organizar las clases.',
      icon: '⏰',
      done: pasos.horarios,
      path: '/ajustes/configuracion/horarios'
    }
  ]

  const completados = steps.filter(st => st.done).length

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.cardGlow} />
        
        <div style={s.header}>
          <div style={s.iconCircle}>⚙️</div>
          <h1 style={s.title}>Configura tu Escuela</h1>
          <p style={s.subtitle}>
            Antes de comenzar a usar el sistema, necesitas completar la configuración inicial de tu academia.
          </p>
        </div>

        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${(completados / steps.length) * 100}%` }} />
        </div>
        <p style={s.progressText}>{completados} de {steps.length} pasos completados</p>

        <div style={s.stepsContainer}>
          {steps.map((step, i) => (
            <div key={step.id} style={{ ...s.stepCard, ...(step.done ? s.stepDone : {}) }}>
              <div style={s.stepLeft}>
                <div style={{ ...s.stepCheck, ...(step.done ? s.stepCheckDone : {}) }}>
                  {step.done ? '✓' : (i + 1)}
                </div>
                <div style={s.stepInfo}>
                  <div style={s.stepHeader}>
                    <span style={s.stepIcon}>{step.icon}</span>
                    <h3 style={{ ...s.stepLabel, ...(step.done ? { color: 'var(--accent-green)' } : {}) }}>{step.label}</h3>
                  </div>
                  <p style={s.stepDesc}>{step.desc}</p>
                </div>
              </div>
              
              {step.done ? (
                <button style={s.btnDone} disabled>
                  ✓ Completado
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {(step.id === 'info_basica' || step.id === 'cintas') && (
                    <button
                      style={s.btnConfirm}
                      onClick={() => handleConfirmStep(step.id)}
                      disabled={confirming !== null}
                    >
                      {confirming === step.id ? '⌛...' : 'Confirmar'}
                    </button>
                  )}
                  <button
                    style={s.btnAction}
                    onClick={() => navigate(step.path)}
                    disabled={confirming !== null}
                  >
                    Configurar →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={s.footer}>
          <p style={s.footerText}>💡 Una vez completados los 3 pasos, podrás acceder a todas las funciones del sistema.</p>
        </div>
      </div>
    </div>
  )
}

const s = {
  container: {
    minHeight: 'calc(100vh - 120px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px',
  },
  card: {
    position: 'relative',
    background: 'var(--bg-secondary)',
    borderRadius: '24px',
    border: '1px solid var(--border)',
    padding: '30px 28px',
    maxWidth: '580px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
    position: 'relative',
    zIndex: 1,
  },
  iconCircle: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(168,85,247,0.15))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    margin: '0 auto 12px',
    border: '1px solid rgba(59,130,246,0.2)',
  },
  title: {
    fontSize: '22px',
    fontWeight: '900',
    color: 'var(--text-primary)',
    margin: '0 0 8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    maxWidth: '450px',
    margin: '0 auto',
  },
  progressBar: {
    height: '6px',
    background: 'var(--bg-primary)',
    borderRadius: '100px',
    marginBottom: '8px',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
    borderRadius: '100px',
    transition: 'width 0.5s ease',
  },
  progressText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginBottom: '16px',
    fontWeight: '700',
    position: 'relative',
    zIndex: 1,
  },
  stepsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    position: 'relative',
    zIndex: 1,
  },
  stepCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '12px 18px',
    background: 'var(--bg-primary)',
    borderRadius: '14px',
    border: '1px solid var(--border)',
    transition: 'all 0.3s ease',
  },
  stepDone: {
    borderColor: 'rgba(34,197,94,0.3)',
    background: 'rgba(34,197,94,0.04)',
  },
  stepLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  stepCheck: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--bg-secondary)',
    border: '2px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '800',
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  stepCheckDone: {
    background: 'rgba(34,197,94,0.15)',
    borderColor: '#22c55e',
    color: '#22c55e',
  },
  stepInfo: {
    flex: 1,
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '2px',
  },
  stepIcon: {
    fontSize: '14px',
  },
  stepLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  stepDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: '1.4',
  },
  btnAction: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, var(--accent-blue), #2563eb)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: '800',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  btnDone: {
    padding: '8px 14px',
    background: 'rgba(34,197,94,0.1)',
    color: '#22c55e',
    border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnConfirm: {
    padding: '8px 14px',
    background: 'rgba(34,197,94,0.15)',
    color: '#22c55e',
    border: '1px solid rgba(34,197,94,0.4)',
    borderRadius: '10px',
    fontWeight: '800',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  footer: {
    marginTop: '20px',
    padding: '12px 16px',
    background: 'rgba(59,130,246,0.06)',
    borderRadius: '12px',
    border: '1px solid rgba(59,130,246,0.12)',
    position: 'relative',
    zIndex: 1,
  },
  footerText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    margin: 0,
    textAlign: 'center',
    lineHeight: '1.4',
  },
  loadingContainer: {
    minHeight: 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--border)',
    borderTopColor: 'var(--accent-blue)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: 'var(--text-muted)',
    fontSize: '14px',
  }
}
