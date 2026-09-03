import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { 
  FiSettings, 
  FiHome, 
  FiAward, 
  FiClock, 
  FiInfo, 
  FiCheck, 
  FiArrowRight, 
  FiCheckCircle 
} from 'react-icons/fi'

export default function SetupGuard({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState(user?.is_superadmin ? { configurado: true } : null)
  const [loading, setLoading] = useState(user?.is_superadmin ? false : true)
  const [confirming, setConfirming] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchStatus = () => {
    if (user?.is_superadmin) {
      setStatus({ configurado: true })
      setLoading(false)
      return
    }

    api.get('/configuracion-escuela/status')
      .then(res => {
        setStatus(res.data)
      })
      .catch(() => {
        setStatus({ configurado: true })
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
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
      icon: (done) => <FiHome size={16} color={done ? '#22c55e' : 'var(--accent-blue)'} />,
      done: Boolean(pasos.info_basica),
      path: '/ajustes/configuracion/general'
    },
    {
      id: 'cintas',
      label: 'Grados y Cintas',
      desc: 'Verifica o personaliza los grados de cintas para tus alumnos.',
      icon: (done) => <FiAward size={16} color={done ? '#22c55e' : '#eab308'} />,
      done: Boolean(pasos.cintas),
      path: '/ajustes/configuracion/cintas'
    },
    {
      id: 'horarios',
      label: 'Horarios de Clase',
      desc: 'Crea al menos un horario para organizar las clases.',
      icon: (done) => <FiClock size={16} color={done ? '#22c55e' : 'var(--accent-purple)'} />,
      done: Boolean(pasos.horarios),
      path: '/ajustes/configuracion/horarios'
    }
  ]

  const completados = steps.filter(st => st.done).length

  return (
    <div style={s.container}>
      <div style={{ ...s.card, padding: isMobile ? '24px 16px' : '32px 28px' }}>
        <div style={s.cardGlow} />
        
        <div style={s.header}>
          <div style={s.iconCircle}>
            <FiSettings size={24} color="var(--accent-blue)" />
          </div>
          <h1 style={{ ...s.title, fontSize: isMobile ? '20px' : '23px' }}>Configura tu Escuela</h1>
          <p style={{ ...s.subtitle, fontSize: isMobile ? '12.5px' : '13.5px' }}>
            Antes de comenzar a usar el sistema, necesitas completar la configuración inicial de tu academia.
          </p>
        </div>

        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${(completados / steps.length) * 100}%` }} />
        </div>
        <p style={s.progressText}>{completados} de {steps.length} pasos completados</p>

        <div style={s.stepsContainer}>
          {steps.map((step, i) => (
            <div 
              key={step.id} 
              style={{ 
                ...s.stepCard, 
                ...(step.done ? s.stepDone : {}),
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: isMobile ? '12px' : '16px'
              }}
            >
              <div style={s.stepLeft}>
                <div style={{ ...s.stepCheck, ...(step.done ? s.stepCheckDone : {}) }}>
                  {step.done ? <FiCheck size={14} strokeWidth={3} /> : (i + 1)}
                </div>
                <div style={s.stepInfo}>
                  <div style={s.stepHeader}>
                    <span style={s.stepIcon}>{step.icon(step.done)}</span>
                    <h3 style={{ ...s.stepLabel, color: step.done ? '#22c55e' : 'var(--text-primary)' }}>{step.label}</h3>
                  </div>
                  <p style={s.stepDesc}>{step.desc}</p>
                </div>
              </div>
              
              {step.done ? (
                <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-end' : 'center' }}>
                  <button style={{ ...s.btnDone, width: isMobile ? '100%' : 'auto' }} disabled>
                    <FiCheck size={14} style={{ marginRight: '4px' }} />
                    <span>Completado</span>
                  </button>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  alignItems: 'center',
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: isMobile ? 'stretch' : 'flex-end'
                }}>
                  {(step.id === 'info_basica' || step.id === 'cintas') && (
                    <button
                      style={{ ...s.btnConfirm, flex: isMobile ? 1 : 'initial' }}
                      onClick={() => handleConfirmStep(step.id)}
                      disabled={confirming !== null}
                    >
                      {confirming === step.id ? 'Confirmando...' : 'Confirmar'}
                    </button>
                  )}
                  <button
                    style={{ ...s.btnAction, flex: isMobile ? 1 : 'initial' }}
                    onClick={() => navigate(step.path)}
                    disabled={confirming !== null}
                  >
                    <span>Configurar</span>
                    <FiArrowRight size={13} style={{ marginLeft: '4px' }} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={s.footer}>
          <FiInfo size={16} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
          <p style={s.footerText}>Una vez completados los 3 pasos, podrás acceder a todas las funciones del sistema.</p>
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
    padding: '16px 12px',
  },
  card: {
    position: 'relative',
    background: 'var(--bg-secondary)',
    borderRadius: '24px',
    border: '1px solid var(--border)',
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
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(168,85,247,0.15))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
    border: '1px solid rgba(59,130,246,0.25)',
  },
  title: {
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: '0 0 8px',
    letterSpacing: '-0.4px',
  },
  subtitle: {
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
    fontSize: '11.5px',
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
    justifyContent: 'space-between',
    padding: '14px 16px',
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
    minWidth: 0,
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
    minWidth: 0,
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '2px',
  },
  stepIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: '13.5px',
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
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDone: {
    padding: '8px 14px',
    background: 'rgba(34,197,94,0.1)',
    color: '#22c55e',
    border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'default',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnConfirm: {
    padding: '8px 14px',
    background: 'rgba(34,197,94,0.15)',
    color: '#22c55e',
    border: '1px solid rgba(34,197,94,0.4)',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: '20px',
    padding: '10px 14px',
    background: 'rgba(59,130,246,0.06)',
    borderRadius: '12px',
    border: '1px solid rgba(59,130,246,0.12)',
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  footerText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    margin: 0,
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
