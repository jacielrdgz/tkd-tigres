import { useEffect, useState, useRef } from 'react'
import api from '../api/axios'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { toast } from 'react-toastify'
import { FiUser, FiSun, FiMoon, FiShield, FiUsers, FiAward, FiSliders } from 'react-icons/fi'

export default function Ajustes() {
  const { user } = useAuth();

  return (
    <div style={s.container}>
      <header style={s.headerMain}>
        <h1 style={s.titleMain}>Ajustes de la Escuela</h1>
        <p style={s.subtitleMain}>Personaliza y gestiona las herramientas de tu academia.</p>
      </header>

      <div style={s.gridCards}>
        <CardMiPerfil />
        <CardAppearance />
        {((user?.role === 'owner' || user?.role === 'secretario') && !user?.is_superadmin) && <CardConfigurarEscuela />}
        {(user?.role === 'owner' && !user?.is_superadmin) && <CardUsuarios />}
      </div>
    </div>
  )
}

function CardAppearance() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ ...s.cardIcon, color: 'var(--accent-purple)', background: 'var(--accent-purple-bg)' }}><FiSun size={18} /></span>
          <h3 style={s.cardTitle}>Apariencia</h3>
        </div>
      </div>

      <div style={s.cardBody}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Elige el tema que mejor se adapte a tu vista.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => theme !== 'light' && toggleTheme()}
            style={{
              ...s.themeBtn,
              borderColor: theme === 'light' ? 'var(--accent-blue)' : 'var(--border)',
              background: theme === 'light' ? 'var(--accent-blue-bg)' : 'var(--bg-primary)',
              color: theme === 'light' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              if (theme === 'light') {
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.35)'
              } else {
                e.currentTarget.style.background = 'var(--bg-tertiary)'
                e.currentTarget.style.borderColor = 'var(--accent-blue)'
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.background = theme === 'light' ? 'var(--accent-blue-bg)' : 'var(--bg-primary)'
              e.currentTarget.style.borderColor = theme === 'light' ? 'var(--accent-blue)' : 'var(--border)'
              e.currentTarget.style.color = theme === 'light' ? 'var(--accent-blue)' : 'var(--text-secondary)'
            }}
          >
            <FiSun size={16} style={{ marginRight: '6px' }} /> Modo Claro
          </button>
          <button
            onClick={() => theme !== 'dark' && toggleTheme()}
            style={{
              ...s.themeBtn,
              borderColor: theme === 'dark' ? 'var(--accent-blue)' : 'var(--border)',
              background: theme === 'dark' ? 'var(--accent-blue-bg)' : 'var(--bg-primary)',
              color: theme === 'dark' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              if (theme === 'dark') {
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.35)'
              } else {
                e.currentTarget.style.background = 'var(--bg-tertiary)'
                e.currentTarget.style.borderColor = 'var(--accent-blue)'
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.background = theme === 'dark' ? 'var(--accent-blue-bg)' : 'var(--bg-primary)'
              e.currentTarget.style.borderColor = theme === 'dark' ? 'var(--accent-blue)' : 'var(--border)'
              e.currentTarget.style.color = theme === 'dark' ? 'var(--accent-blue)' : 'var(--text-secondary)'
            }}
          >
            <FiMoon size={16} style={{ marginRight: '6px' }} /> Modo Oscuro
          </button>
        </div>
      </div>

      <div style={s.cardFooter}>
        <span style={s.cardStats}>Tema actual: {theme === 'light' ? 'Claro' : 'Oscuro'}</span>
      </div>
    </div>
  )
}

function CardMiPerfil() {
  const { user, refreshUser } = useAuth();
  const [preview, setPreview] = useState(null); // URL de previsualización local
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    setUploading(true);
    try {
      await api.post('/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser();
      setPreview(null);
      fileRef.current.value = '';
      toast.success('¡Foto de perfil actualizada!');
    } catch {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.delete('/me/avatar');
      await refreshUser();
      toast.success('Foto eliminada');
    } catch {
      toast.error('Error al eliminar la foto');
    } finally {
      setRemoving(false);
    }
  };

  const avatarSrc = preview || user?.avatar_url;

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ ...s.cardIcon, color: '#f59e0b', background: 'rgba(245,158,11,0.1)' }}><FiUser size={18} /></span>
          <h3 style={s.cardTitle}>Mi Perfil</h3>
        </div>
        {preview && (
          <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: '700' }}>Vista previa</span>
        )}
      </div>

      <div style={s.cardBody}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Avatar grande */}
          <div
            style={{
              width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
              background: avatarSrc ? 'transparent' : 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', fontWeight: '800', color: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              border: preview ? '2px dashed var(--accent-blue)' : '2px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || '?'
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>{user?.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {user?.is_superadmin 
                ? 'SuperAdmin' 
                : user?.role === 'owner' 
                  ? 'Administrador' 
                  : user?.role === 'instructor' 
                    ? 'Instructor' 
                    : user?.role === 'secretario' 
                      ? 'Secretario' 
                      : user?.role || 'Rol'}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {/* Botón seleccionar foto */}
              {!preview && (
                <>
                  <button
                    style={s.btnAvatarAction}
                    onClick={() => fileRef.current?.click()}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)'
                      e.currentTarget.style.borderColor = 'var(--accent-blue)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--bg-primary)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    Cambiar foto
                  </button>
                  {user?.avatar_url && (
                    <button
                      style={{ ...s.btnAvatarAction, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}
                      onClick={handleRemove}
                      disabled={removing}
                      onMouseEnter={e => {
                        if (!removing) {
                          e.currentTarget.style.background = '#ef4444'
                          e.currentTarget.style.borderColor = '#ef4444'
                          e.currentTarget.style.color = '#ffffff'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)'
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
                        e.currentTarget.style.color = '#ef4444'
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {removing ? 'Eliminando...' : 'Quitar foto'}
                    </button>
                  )}
                </>
              )}

              {/* Botones de confirmación cuando hay preview */}
              {preview && (
                <>
                  <button
                    style={{ ...s.btnAvatarAction, background: 'var(--accent-blue)', color: '#fff', borderColor: 'var(--accent-blue)' }}
                    onClick={handleUpload}
                    disabled={uploading}
                    onMouseEnter={e => {
                      if (!uploading) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)'
                        e.currentTarget.style.filter = 'brightness(1.1)'
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.filter = 'none'
                    }}
                  >
                    {uploading ? 'Guardando...' : '✓ Guardar foto'}
                  </button>
                  <button
                    style={{ ...s.btnAvatarAction, color: 'var(--text-muted)' }}
                    onClick={handleCancel}
                    disabled={uploading}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--bg-primary)'
                      e.currentTarget.style.color = 'var(--text-muted)'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          JPG, PNG o WebP · Máximo 2 MB
        </p>
      </div>

      <div style={s.cardFooter}>
        <span style={s.cardStats}>Foto de perfil visible en el sidebar</span>
      </div>
    </div>
  );
}

function CardConfigurarEscuela() {
  const [escuela, setEscuela] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/configuracion-escuela')
      .then(res => setEscuela(res.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ ...s.cardIcon, color: 'var(--accent-blue)', background: 'var(--accent-blue-bg)' }}><FiShield size={18} /></span>
          <h3 style={s.cardTitle}>Configurar mi escuela</h3>
        </div>
        <Link
          style={{ ...s.btnLink, transition: 'all 0.2s', display: 'inline-block' }}
          to="/ajustes/configuracion"
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateX(4px)'
            e.currentTarget.style.color = '#60a5fa'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.color = 'var(--accent-blue)'
          }}
        >
          Gestionar →
        </Link>
      </div>

      <div style={s.cardBody}>
        {loading ? <div style={s.cardEmpty}>Cargando...</div> : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
              {escuela?.logo_url ? (
                <img 
                  src={(escuela.logo_url.startsWith('data:') || escuela.logo_url.startsWith('http')) ? escuela.logo_url : `${import.meta.env.VITE_API_URL || ''}/storage/${escuela.logo_url}`} 
                  alt="Logo" 
                  style={{ width: '50px', height: '50px', borderRadius: '12px', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiAward size={22} color="var(--accent-blue)" />
                </div>
              )}
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)' }}>{escuela?.nombre || 'Mi Escuela'}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{escuela?.disciplina || 'Taekwondo'}</div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Personaliza los datos de tu dojang, gestiona tus instructores, configura tus horarios y define tus grados de cintas.
            </p>
          </>
        )}
      </div>

      <div style={s.cardFooter}>
        <span style={s.cardStats}>Identidad y Operatividad</span>
        <Link
          style={{ ...s.btnAddQuick, display: 'inline-flex' }}
          to="/ajustes/configuracion"
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)'
            e.currentTarget.style.filter = 'brightness(1.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.filter = 'none'
          }}
        >
          <FiSliders size={14} /> Personalizar
        </Link>
      </div>
    </div>
  )
}

function CardUsuarios() {
  const { user } = useAuth();

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ ...s.cardIcon, color: 'var(--accent-purple)', background: 'var(--accent-purple-bg)' }}><FiUsers size={18} /></span>
          <h3 style={s.cardTitle}>Usuarios y Roles</h3>
        </div>
        <Link
          style={{ ...s.btnLink, transition: 'all 0.2s', display: 'inline-block' }}
          to="/ajustes/usuarios"
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateX(4px)'
            e.currentTarget.style.color = '#60a5fa'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.color = 'var(--accent-blue)'
          }}
        >
          Gestionar →
        </Link>
      </div>

      <div style={s.cardBody}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Controla quién puede acceder al sistema y asigna permisos específicos para instructores, administradores y secretarias.
        </p>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }}></div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Tu rol actual: <strong>
              {user?.is_superadmin 
                ? 'SuperAdmin' 
                : user?.role === 'owner' 
                  ? 'Administrador' 
                  : user?.role === 'instructor' 
                    ? 'Instructor' 
                    : user?.role === 'secretario' 
                      ? 'Secretario' 
                      : user?.role?.toUpperCase()}
            </strong>
          </span>
        </div>
      </div>

      <div style={s.cardFooter}>
        <span style={s.cardStats}>Seguridad y Accesos</span>
        <Link
          style={{ ...s.btnAddQuick, display: 'inline-flex' }}
          to="/ajustes/usuarios"
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)'
            e.currentTarget.style.filter = 'brightness(1.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.filter = 'none'
          }}
        >
          <FiUsers size={14} /> Ver Equipo
        </Link>
      </div>
    </div>
  )
}

const s = {
  container: { paddingBottom: '40px', width: '100%', boxSizing: 'border-box' },
  headerMain: { marginBottom: '28px' },
  titleMain: { fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 },
  subtitleMain: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' },
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' },

  card: { background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' },
  cardHeader: { padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardIcon: { fontSize: '18px', background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '10px' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 },
  btnLink: { background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontWeight: '700', cursor: 'pointer', fontSize: '13px' },
  cardBody: { padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' },
  resumenRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  dot: { width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 },
  resumenNombre: { fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', flex: 1 },
  resumenMeta: { fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' },
  cardEmpty: { padding: '20px', textAlign: 'center', color: 'var(--text-muted)' },
  cardFooter: { padding: '20px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardStats: { fontSize: '12px', color: 'var(--text-muted)' },
  btnAddQuick: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'var(--accent-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '9px 18px',
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.2px',
    textDecoration: 'none',
    boxShadow: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  themeBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  btnAvatarAction: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}
