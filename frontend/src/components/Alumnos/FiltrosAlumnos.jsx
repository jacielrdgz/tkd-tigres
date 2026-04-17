import { s } from './AlumnosStyles'
import { CINTAS, capitalizar } from './AlumnosHelpers'

export default function FiltrosAlumnos({
  busqueda, setBusqueda,
  estatusFiltro, setEstatusFiltro,
  cintaFiltro, setCintaFiltro,
  edadFiltro, setEdadFiltro,
  horarioFiltro, setHorarioFiltro,
  orden, setOrden,
  alumnos, horariosUnicos, totales,
  abrirCrear
}) {
  return (
    <>
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Alumnos</h2>
          <p style={s.sub}>Gestión de estudiantes y grados</p>
        </div>
        <button
          style={s.btnNuevoAlumno}
          onClick={abrirCrear}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo Alumno
        </button>
      </div>

      <div style={s.barraAcciones}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, tutor o correo..."
          style={s.search}
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />

        <div style={s.tabs}>
          <button
            style={estatusFiltro === 'activo' ? s.tabActiveVerde : s.tab}
            onClick={() => setEstatusFiltro('activo')}
          >
            Activos ({totales.activo})
          </button>
          <button
            style={estatusFiltro === 'inactivo' ? s.tabActiveRojo : s.tab}
            onClick={() => setEstatusFiltro('inactivo')}
          >
            Inactivos ({totales.inactivo})
          </button>
          <button
            style={estatusFiltro === '' ? Object.assign({}, s.tab, { color: '#f1f5f9', fontWeight: '600' }) : s.tab}
            onClick={() => setEstatusFiltro('')}
          >
            Todos ({alumnos.length})
          </button>
        </div>
      </div>

      <div style={s.filtrosSecundarios}>
        <select style={s.selectFiltro} value={cintaFiltro} onChange={e => setCintaFiltro(e.target.value)}>
          <option value="">Todas las cintas</option>
          {CINTAS.map(c => <option key={c} value={c}>{capitalizar(c)}</option>)}
        </select>

        <select style={s.selectFiltro} value={edadFiltro} onChange={e => setEdadFiltro(e.target.value)}>
          <option value="">Todas las edades</option>
          <option value="infantil">Infantil (3-11)</option>
          <option value="cadete">Cadete (12-14)</option>
          <option value="juvenil">Juvenil (15-17)</option>
          <option value="adultos">Adultos (+18)</option>
        </select>

        <select style={s.selectFiltro} value={horarioFiltro} onChange={e => setHorarioFiltro(e.target.value)}>
          <option value="">Todos los horarios</option>
          {horariosUnicos.map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        <select style={s.selectFiltro} value={orden} onChange={e => setOrden(e.target.value)}>
          <option value="id">Ordenar por ID</option>
          <option value="cinta_desc">Cinta (Mayor a menor)</option>
          <option value="cinta_asc">Cinta (Menor a mayor)</option>
          <option value="edad_desc">Edad (Mayor a menor)</option>
          <option value="horario_asc">Horario (Temprano a tarde)</option>
        </select>

        {(cintaFiltro || edadFiltro || horarioFiltro || orden !== 'id') && (
          <button
            style={s.btnLimpiar}
            onClick={() => { setCintaFiltro(''); setEdadFiltro(''); setHorarioFiltro(''); setOrden('id') }}
          >
            ↻ Limpiar
          </button>
        )}
      </div>
    </>
  )
}
