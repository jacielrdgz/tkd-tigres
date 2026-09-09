import React from 'react'
import { FiDollarSign, FiTrendingUp, FiAlertCircle, FiUserPlus, FiClock } from 'react-icons/fi'

/**
 * 3 tarjetas resumen de pagos con estilo y dimensiones idénticas a AsistenciasSummaryCards.
 * submodulo='mensualidades' → Ingresos del Mes / Alumnos al Corriente / Mensualidades Pendientes
 * submodulo='inscripciones' → Recaudación Inscripciones / Nuevos Alumnos Inscritos / Inscripciones Pendientes
 */
export default function PagosSummaryCards({
  submodulo = 'mensualidades',
  recaudacion = 0,
  mesLabel = '',
  cargando = false,
  // Métricas de mensualidades
  totalAlumnos = 0,
  alumnosPagados = 0,
  alumnosPendientes = 0,
  // Métricas de inscripciones
  totalInscritosMes = 0,
  inscripcionesPagadasMes = 0,
  inscripcionesPendientesMes = 0,
  isMobile: isMobileProp,
}) {
  const isMobile = isMobileProp !== undefined ? isMobileProp : (typeof window !== 'undefined' && window.innerWidth <= 768)

  if (submodulo === 'mensualidades') {
    const pctCobranza = totalAlumnos > 0 ? Math.round((alumnosPagados / totalAlumnos) * 100) : 0
    return (
      <div style={{
        ...s.grid,
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gap: isMobile ? '10px' : '16px',
        marginBottom: isMobile ? '18px' : '28px'
      }}>
        <Card
          cargando={cargando}
          icon={<FiDollarSign size={isMobile ? 18 : 22} />}
          iconColor="#10b981"
          label="Ingresos del Mes"
          sublabel={mesLabel}
          value={`$${recaudacion.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          valueColor="var(--text-primary)"
          isMobile={isMobile}
        />
        <Card
          cargando={cargando}
          icon={<FiTrendingUp size={isMobile ? 18 : 22} />}
          iconColor={pctColor(pctCobranza)}
          label="Alumnos al Corriente"
          sublabel={`${alumnosPagados} de ${totalAlumnos} alumnos`}
          value={`${pctCobranza}%`}
          valueColor={pctColor(pctCobranza)}
          bar={pctCobranza}
          isMobile={isMobile}
        />
        <Card
          cargando={cargando}
          icon={<FiAlertCircle size={isMobile ? 18 : 22} />}
          iconColor={alumnosPendientes > 0 ? '#ef4444' : '#10b981'}
          label="Mensualidades Pendientes"
          sublabel={alumnosPendientes > 0 ? 'En riesgo de mora' : 'Todo al corriente'}
          value={alumnosPendientes}
          valueColor={alumnosPendientes > 0 ? '#ef4444' : 'var(--accent-green)'}
          spanFull={true}
          isMobile={isMobile}
        />
      </div>
    )
  }

  // submodulo === 'inscripciones'
  const pctInscripciones = totalInscritosMes > 0 ? Math.round((inscripcionesPagadasMes / totalInscritosMes) * 100) : 100
  return (
    <div style={{
      ...s.grid,
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
      gap: isMobile ? '10px' : '16px',
      marginBottom: isMobile ? '18px' : '28px'
    }}>
      <Card
        cargando={cargando}
        icon={<FiDollarSign size={isMobile ? 18 : 22} />}
        iconColor="#10b981"
        label="Recaudación Inscripciones"
        sublabel={mesLabel}
        value={`$${recaudacion.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        valueColor="var(--text-primary)"
        isMobile={isMobile}
      />
      <Card
        cargando={cargando}
        icon={<FiUserPlus size={isMobile ? 18 : 22} />}
        iconColor="#3b82f6"
        label="Nuevos Alumnos Inscritos"
        sublabel={`${inscripcionesPagadasMes} de ${totalInscritosMes} liquidadas`}
        value={totalInscritosMes}
        valueColor="var(--text-primary)"
        bar={totalInscritosMes > 0 ? pctInscripciones : 0}
        isMobile={isMobile}
      />
      <Card
        cargando={cargando}
        icon={<FiClock size={isMobile ? 18 : 22} />}
        iconColor={inscripcionesPendientesMes > 0 ? '#f59e0b' : '#10b981'}
        label="Inscripciones Pendientes"
        sublabel={inscripcionesPendientesMes > 0 ? 'Pendiente de cobro inicial' : 'Sin pendientes este mes'}
        value={inscripcionesPendientesMes}
        valueColor={inscripcionesPendientesMes > 0 ? '#f59e0b' : 'var(--accent-green)'}
        spanFull={true}
        isMobile={isMobile}
      />
    </div>
  )
}

function Card({ icon, iconColor, label, sublabel, value, valueColor, bar, cargando, spanFull, isMobile }) {
  return (
    <div style={{
      ...s.card,
      gridColumn: (isMobile && spanFull) ? 'span 2' : 'auto',
      padding: isMobile ? '12px 12px' : '20px 22px',
      gap: isMobile ? '10px' : '16px',
      minHeight: isMobile ? (spanFull ? '94px' : '116px') : '122px',
      height: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{
        ...s.iconBox,
        background: `${iconColor}18`,
        color: iconColor,
        width: isMobile ? '36px' : '46px',
        height: isMobile ? '36px' : '46px',
        borderRadius: isMobile ? '10px' : '12px'
      }}>
        {icon}
      </div>
      <div style={{ ...s.info, height: '100%', justifyContent: 'space-between' }}>
        <div>
          <span style={{
            ...s.label,
            fontSize: isMobile ? '10px' : '12px',
            lineHeight: isMobile ? '13px' : '16px',
            minHeight: isMobile ? (spanFull ? 'auto' : '26px') : 'auto',
            display: 'flex',
            alignItems: 'center',
          }}>
            {label}
          </span>
          <span style={{
            ...s.sublabel,
            fontSize: isMobile ? '9.5px' : '11px',
            lineHeight: isMobile ? '14px' : '16px',
            minHeight: isMobile ? '14px' : '16px',
          }}>
            {sublabel || '\u00A0'}
          </span>
        </div>

        <div>
          {cargando ? (
            <div style={{ ...s.skeleton, height: isMobile ? '22px' : '28px', marginTop: '2px' }} />
          ) : (
            <span style={{
              ...s.value,
              color: valueColor,
              fontSize: isMobile ? (value && String(value).length > 6 ? '18px' : '21px') : '28px',
              minHeight: isMobile ? '24px' : '32px',
              lineHeight: 1.1,
              marginTop: '2px',
            }}>
              {value}
            </span>
          )}

          <div style={{ minHeight: isMobile ? '10px' : '12px' }}>
            {bar !== undefined && !cargando ? (
              <div style={s.barBg}>
                <div style={{ ...s.barFill, width: `${bar}%`, background: pctColor(bar) }} />
              </div>
            ) : (
              <div style={s.barPlaceholder} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function pctColor(pct) {
  if (pct >= 80) return 'var(--accent-green)'
  if (pct >= 50) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

const s = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '28px',
    alignItems: 'stretch',
  },
  card: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '20px 22px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'box-shadow 0.2s',
    minHeight: '122px',
    boxSizing: 'border-box',
  },
  iconBox: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    lineHeight: '16px',
  },
  sublabel: {
    fontSize: '11px',
    color: 'var(--text-dim)',
    fontWeight: '500',
    display: 'block',
    lineHeight: '16px',
  },
  value: {
    fontSize: '28px',
    fontWeight: '900',
    lineHeight: 1.1,
    marginTop: '4px',
    letterSpacing: '-0.02em',
    display: 'block',
    minHeight: '32px',
  },
  skeleton: {
    width: '80px',
    height: '28px',
    borderRadius: '6px',
    background: 'var(--bg-tertiary)',
    animation: 'shimmer 1.5s infinite',
    marginTop: '4px',
  },
  barContainer: {
    minHeight: '12px',
  },
  barPlaceholder: {
    height: '4px',
    marginTop: '8px',
  },
  barBg: {
    height: '4px',
    background: 'var(--border)',
    borderRadius: '99px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  barFill: {
    height: '100%',
    borderRadius: '99px',
    transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
  },
}