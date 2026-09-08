import React, { useState, useEffect } from 'react';
import { FiCamera, FiX, FiShield, FiLoader } from 'react-icons/fi';

export default function ModalFotoPreview({
  isOpen,
  onClose,
  titulo,
  subtitulo,
  url,
  isAvatar = true,
  isLogo = false,
  iniciales = '?',
  onCambiarFotoClick,
  subiendo = false,
}) {
  const [btnHover, setBtnHover] = useState(null);
  const [imgError, setImgError] = useState(false);

  // Cerrar con la tecla Escape (ESC)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary, #13151f)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          borderRadius: '24px',
          padding: '28px 24px 24px',
          maxWidth: '380px',
          width: '100%',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón X Cerrar normalizado (estilo btnCerrarCircular del formulario) */}
        <button
          type="button"
          className="btn-cerrar-circular"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
          }}
          onClick={onClose}
          title="Cerrar (Esc)"
          aria-label="Cerrar modal"
        >
          <FiX size={17} />
        </button>

        {/* Título (Nombre completo) */}
        <h3
          style={{
            margin: subtitulo ? '0 0 4px 0' : '0 0 20px 0',
            fontSize: '18px',
            fontWeight: '800',
            color: 'var(--text-primary, #ffffff)',
            textAlign: 'center',
            paddingLeft: '32px',
            paddingRight: '32px',
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}
          title={titulo}
        >
          {titulo}
        </h3>

        {/* Subtítulo */}
        {subtitulo && (
          <p
            style={{
              margin: '0 0 20px 0',
              fontSize: '13px',
              color: 'var(--text-muted, #64748b)',
              textAlign: 'center',
              maxWidth: '300px',
              lineHeight: 1.4,
            }}
          >
            {subtitulo}
          </p>
        )}

        {/* Imagen ampliada (diseño administrador) */}
        <div
          style={{
            width: '220px',
            height: '220px',
            borderRadius: isAvatar ? '50%' : '20px',
            overflow: 'hidden',
            border: '4px solid var(--accent-blue, #3b82f6)',
            boxShadow: 'none',
            background: 'var(--bg-tertiary, #1e2130)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {url && !imgError ? (
            <img
              src={url}
              alt="Vista previa"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImgError(true)}
            />
          ) : isAvatar ? (
            <div
              style={{
                fontSize: '72px',
                fontWeight: '800',
                color: 'var(--accent-blue, #3b82f6)',
                userSelect: 'none',
              }}
            >
              {iniciales}
            </div>
          ) : (
            <div style={{ color: 'var(--accent-blue, #3b82f6)' }}>
              <FiShield size={72} />
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          {onCambiarFotoClick && (
            <button
              type="button"
              style={{
                flex: 1,
                padding: '11px 16px',
                background: 'var(--accent-blue, #3b82f6)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '0.2px',
                cursor: subiendo ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: 'none',
                opacity: subiendo ? 0.75 : 1,
                transition: 'all 0.2s ease',
              }}
              disabled={subiendo}
              onClick={onCambiarFotoClick}
              onMouseEnter={e => {
                if (!subiendo) e.currentTarget.style.filter = 'brightness(1.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.filter = 'none'
              }}
            >
              {subiendo ? (
                <>
                  <FiLoader className="spin" size={16} />
                  Subiendo...
                </>
              ) : (
                <>
                  <FiCamera size={16} />
                  Cambiar foto
                </>
              )}
            </button>
          )}

          <button
            type="button"
            style={{
              flex: 1,
              padding: '11px 16px',
              background: 'var(--bg-tertiary, #1e2130)',
              color: 'var(--text-primary, #f1f5f9)',
              border: '1px solid var(--border, #334155)',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600',
              letterSpacing: '0.2px',
              cursor: 'pointer',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onClick={onClose}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--bg-tertiary, #1e2130)'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
