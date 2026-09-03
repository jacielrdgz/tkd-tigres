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
      const data = {
        alumnos_activos: Number(res.data.alumnos_activos) || 0,
        pagos_al_corriente: Number(res.data.pagos_al_corriente) || 0,
        pagos_pendientes: Number(res.data.pagos_pendientes) || 0,
        ingresos_mes: Number(res.data.ingresos_mes) || 0,
        asistencias_hoy: Number(res.data.asistencias_hoy) || 0,
        eventos_proximos: res.data.eventos_proximos || []
      }
      setCache('dashboard_stats', data)
    })
    .catch(() => {})

  // 2. Alumnos (Lista completa)
  api.get('/alumnos')
    .then(res => {
      setCache('alumnos_search_all', res.data)
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
      setCache('pagos_main_data', {
        alumnos: resAlumnos.data,
        pagos: resPagos.data,
        cintas: resCintas.data,
        horarios: resHorarios.data,
        escuela: resEscuela.data
      })
      setCache('cintas_config', resCintas.data)
      setCache('horarios_lista', resHorarios.data)
      setCache('configuracion_escuela', resEscuela.data)
    })
    .catch(() => {})

  // 4. Asistencias (Mes actual)
  api.get('/asistencias/resumen', { params: { mes: mesActual } })
    .then(res => setCache(`asistencias_resumen_${mesActual}`, res.data))
    .catch(() => {})

  api.get('/asistencias/por-alumno', { params: { mes: mesActual } })
    .then(res => setCache(`asistencias_alumno_${mesActual}`, res.data))
    .catch(() => {})

  api.get('/asistencias/dias-clase', { params: { mes: mesActual } })
    .then(res => setCache(`asistencias_dias_${mesActual}`, res.data))
    .catch(() => {})

  // 5. Eventos y Exámenes
  api.get('/eventos')
    .then(res => setCache('eventos_lista', res.data))
    .catch(() => {})

  api.get('/examenes')
    .then(res => setCache('examenes_lista', res.data))
    .catch(() => {})
}
