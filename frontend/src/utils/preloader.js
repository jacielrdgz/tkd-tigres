import api from '../api/axios'
import { setCache } from './cacheManager'

let precargaIniciada = false

/**
 * Precarga en segundo plano todos los módulos clave de la escuela
 * tan pronto como el usuario entra al sistema para que cada módulo
 * abra de inmediato al hacer clic sin tiempos de espera.
 */
export function precargarTodosLosModulos(user) {
  if (precargaIniciada || !user || user.is_superadmin) return
  precargaIniciada = true

  const hoy = new Date()
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`

  // 1. Dashboard
  api.get('/dashboard')
    .then(res => {
      const rawEvs = res.data?.eventos_proximos
      const evsArray = Array.isArray(rawEvs)
        ? rawEvs
        : (rawEvs ? Object.values(rawEvs) : [])

      const data = {
        alumnos_activos: Number(res.data?.alumnos_activos) || 0,
        pagos_al_corriente: Number(res.data?.pagos_al_corriente) || 0,
        pagos_pendientes: Number(res.data?.pagos_pendientes) || 0,
        ingresos_mes: Number(res.data?.ingresos_mes) || 0,
        asistencias_hoy: Number(res.data?.asistencias_hoy) || 0,
        eventos_proximos: evsArray
      }
      setCache('dashboard_stats', data)
    })
    .catch(() => {})

  // 2. Alumnos (Lista completa)
  api.get('/alumnos')
    .then(res => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ? Object.values(res.data.data) : Object.values(res.data || {}))
      setCache('alumnos_search_all', list)
    })
    .catch(() => {})

  // 3. Pagos y Ajustes Maestros
  Promise.all([
    api.get('/alumnos', { params: { estatus: 'activo' } }),
    api.get('/pagos'),
    api.get('/configuraciones-cintas'),
    api.get('/horarios'),
    api.get('/configuracion-escuela')
  ])
    .then(([resAlumnos, resPagos, resCintas, resHorarios, resEscuela]) => {
      const listAlu = Array.isArray(resAlumnos.data) ? resAlumnos.data : (resAlumnos.data?.data || [])
      const listPag = Array.isArray(resPagos.data) ? resPagos.data : (resPagos.data?.data || [])
      const listCin = Array.isArray(resCintas.data) ? resCintas.data : (resCintas.data?.data || [])
      const listHor = Array.isArray(resHorarios.data) ? resHorarios.data : (resHorarios.data?.data || [])

      setCache('pagos_main_data', {
        alumnos: listAlu,
        pagos: listPag,
        cintas: listCin,
        horarios: listHor,
        escuela: resEscuela.data
      })
      setCache('cintas_config', listCin)
      setCache('horarios_lista', listHor)
      setCache('configuracion_escuela', resEscuela.data)
    })
    .catch(() => {})

  // 4. Asistencias (Mes actual)
  api.get('/asistencias/resumen', { params: { mes: mesActual } })
    .then(res => setCache(`asistencias_resumen_${mesActual}`, res.data))
    .catch(() => {})

  api.get('/asistencias/por-alumno', { params: { mes: mesActual } })
    .then(res => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ? Object.values(res.data.data) : Object.values(res.data || {}))
      setCache(`asistencias_alumno_${mesActual}`, list)
    })
    .catch(() => {})

  api.get('/asistencias/por-fecha', { params: { mes: mesActual } })
    .then(res => {
      const obj = typeof res.data === 'object' && res.data !== null ? res.data : {}
      setCache(`asistencias_fecha_${mesActual}`, obj)
    })
    .catch(() => {})

  // 5. Eventos y Exámenes
  api.get('/eventos?excluir=examen')
    .then(res => {
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.data ? Object.values(res.data.data) : Object.values(res.data || {}))
      const evs = [...rawList]
      evs.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      setCache('eventos_lista', evs)
    })
    .catch(() => {})

  api.get('/eventos?tipo=examen')
    .then(res => {
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.data ? Object.values(res.data.data) : Object.values(res.data || {}))
      const soloExamenes = [...rawList]
      soloExamenes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      setCache('examenes_lista', soloExamenes)
    })
    .catch(() => {})
}
