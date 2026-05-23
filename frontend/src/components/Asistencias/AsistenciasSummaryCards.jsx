import React from 'react'
import { FiUsers, FiTrendingUp, FiAlertTriangle } from 'react-icons/fi'

/**
 * 3 tarjetas resumen de asistencias.
 * tab='alumno' → Total activos / % promedio / Baja asistencia
 * tab='fecha'  → Clases en el mes / Promedio diario / Días baja asistencia
 */
export default function AsistenciasSummaryCards({ tab, resumen, cargando }) {
  if (tab === 'alumno') {
    return (
      <div style={s.grid}>
        <Card
          cargando={cargando}
          icon={<FiUsers size={22} />}
          iconColor="#3b82f6"
          label="Total Alumnos Activos"
          value={resumen?.total_alumnos ?? '—'}
          valueColor="var(--text-primary)"
        />
        <Card
          cargando={cargando}
          icon={<FiTrendingUp size={22} />}
          iconColor={pctColor(resumen?.pct_promedio)}
          label="Asistencia Promedio del Mes"
          value={resumen?.pct_promedio !== undefined ? `${resumen.pct_promedio}%` : '—'}
          valueColor={pctColor(resumen?.pct_promedio)}
          bar={resumen?.pct_promedio}
        />
        <Card
          cargando={cargando}
          icon={<FiAlertTriangle size={22} />}
          iconColor="#ef4444"
          label="Alumnos con Asistencia Baja"
          sublabel="< 60% de asistencia"
          value={resumen?.baja_asistencia ?? '—'}
          valueColor={resumen?.baja_asistencia > 0 ? '#ef4444' : 'var(--accent-green)'}
        />
      </div>
    )
  }

  // tab === 'fecha'
  return (
    <div style={s.grid}>
      <Card
        cargando={cargando}
        icon={<span style={{ fontSize: '22px' }}>📅</span>}
        iconColor="#3b82f6"
        label="Clases en el Mes"
        value={resumen?.clases_en_mes ?? '—'}
        valueColor="var(--text-primary)"
      />
      <Card
        cargando={cargando}
        icon={<FiTrendingUp size={22} />}
        iconColor={pctColor(resumen?.promedio_diario)}
        label="Promedio Asistencia Diaria"
        value={resumen?.promedio_diario !== undefined ? `${resumen.promedio_diario}%` : '—'}
        valueColor={pctColor(resumen?.promedio_diario)}
        bar={resumen?.promedio_diario}
      />
      <Card
        cargando={cargando}
        icon={<FiAlertTriangle size={22} />}
        iconColor="#ef4444"
        label="Días con Baja Asistencia"
        sublabel="< 80% de asistencia"
        value={resumen?.dias_baja ?? '—'}
        valueColor={resumen?.dias_baja > 0 ? '#ef4444' : 'var(--accent-green)'}
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
        {sublabel && <span style={s.sublabel}>{sublabel}</span>}
        {cargando ? (
          <div style={s.skeleton} />
        ) : (
          <span style={{ ...s.value, color: valueColor }}>{value}</span>
        )}
        {bar !== undefined && !cargando && (
          <div style={s.barBg}>
            <div style={{ ...s.barFill, width: `${bar}%`, background: pctColor(bar) }} />
          </div>
        )}
      </div>
    </div>
  )
}

function pctColor(pct) {
  if (pct === undefined || pct === null) return 'var(--text-primary)'
  if (pct >= 80) return 'var(--accent-green)'
  if (pct >= 60) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

const s = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '28px',
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
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  sublabel: {
    fontSize: '11px',
    color: 'var(--text-dim)',
    fontWeight: '500',
  },
  value: {
    fontSize: '28px',
    fontWeight: '900',
    lineHeight: 1.1,
    marginTop: '4px',
    letterSpacing: '-0.02em',
  },
  skeleton: {
    width: '80px',
    height: '28px',
    borderRadius: '6px',
    background: 'var(--bg-tertiary)',
    animation: 'shimmer 1.5s infinite',
    marginTop: '4px',
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
