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
}) {
  if (submodulo === 'mensualidades') {
    const pctCobranza = totalAlumnos > 0 ? Math.round((alumnosPagados / totalAlumnos) * 100) : 0
    return (
      <div style={s.grid}>
        <Card
          cargando={cargando}
          icon={<FiDollarSign size={22} />}
          iconColor="#10b981"
          label="Ingresos del Mes"
          sublabel={mesLabel}
          value={`$${recaudacion.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          valueColor="var(--text-primary)"
        />
        <Card
          cargando={cargando}
          icon={<FiTrendingUp size={22} />}
          iconColor={pctColor(pctCobranza)}
          label="Alumnos al Corriente"
          sublabel={`${alumnosPagados} de ${totalAlumnos} alumnos`}
          value={`${pctCobranza}%`}
          valueColor={pctColor(pctCobranza)}
          bar={pctCobranza}
        />
        <Card
          cargando={cargando}
          icon={<FiAlertCircle size={22} />}
          iconColor={alumnosPendientes > 0 ? '#ef4444' : '#10b981'}
          label="Mensualidades Pendientes"
          sublabel={alumnosPendientes > 0 ? 'En riesgo de mora' : 'Todo al corriente'}
          value={alumnosPendientes}
          valueColor={alumnosPendientes > 0 ? '#ef4444' : 'var(--accent-green)'}
        />
      </div>
    )
  }

  // submodulo === 'inscripciones'
  const pctInscripciones = totalInscritosMes > 0 ? Math.round((inscripcionesPagadasMes / totalInscritosMes) * 100) : 100
  return (
    <div style={s.grid}>
      <Card
        cargando={cargando}
        icon={<FiDollarSign size={22} />}
        iconColor="#10b981"
        label="Recaudación Inscripciones"
        sublabel={mesLabel}
        value={`$${recaudacion.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        valueColor="var(--text-primary)"
      />
      <Card
        cargando={cargando}
        icon={<FiUserPlus size={22} />}
        iconColor="#3b82f6"
        label="Nuevos Alumnos Inscritos"
        sublabel={`${inscripcionesPagadasMes} de ${totalInscritosMes} liquidadas`}
        value={totalInscritosMes}
        valueColor="var(--text-primary)"
        bar={totalInscritosMes > 0 ? pctInscripciones : 0}
      />
      <Card
        cargando={cargando}
        icon={<FiClock size={22} />}
        iconColor={inscripcionesPendientesMes > 0 ? '#f59e0b' : '#10b981'}
        label="Inscripciones Pendientes"
        sublabel={inscripcionesPendientesMes > 0 ? 'Pendiente de cobro inicial' : 'Sin pendientes este mes'}
        value={inscripcionesPendientesMes}
        valueColor={inscripcionesPendientesMes > 0 ? '#f59e0b' : 'var(--accent-green)'}
      />
    </div>
  )
}

function Card({ icon, iconColor, label, sublabel, value, valueColor, bar, cargando }) {
  return (
    <div style={s.card}>
      <div style={{ ...s.iconBox, background: `${iconColor}18`, color: iconColor }}>
        {icon}
      </div>
      <div style={s.info}>
        <span style={s.label}>{label}</span>
        <span style={s.sublabel}>{sublabel || '\u00A0'}</span>
        {cargando ? (
          <div style={s.skeleton} />
        ) : (
          <span style={{ ...s.value, color: valueColor }}>{value}</span>
        )}
        <div style={s.barContainer}>
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