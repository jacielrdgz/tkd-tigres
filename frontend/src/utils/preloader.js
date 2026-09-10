import api from '../api/axios'
import { setCache } from './cacheManager'

let precargaIniciada = false

/**
 * Precarga escalonada e inteligente en segundo plano.
 * No satura la conexión celular del teléfono móvil al entrar;
 * prioriza la vista inicial y precarga los demás módulos suavemente.
 */
export function precargarTodosLosModulos(user) {
  if (precargaIniciada || !user || user.is_superadmin) return
  precargaIniciada = true

  const hoy = new Date()
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  const hoyStr = hoy.toLocaleDateString('sv-SE')

  // FASE 1 (Inmediata): Métricas ligeras del Dashboard para pintar la vista principal
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

  // FASE 2 (Tras 1.2s cuando el inicio ya pintó): Alumnos y Cintas clave
  setTimeout(() => {
    api.get('/alumnos')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ? Object.values(res.data.data) : Object.values(res.data || {}))
        setCache('alumnos_search_all', list)
      })
      .catch(() => {})

    api.get('/configuraciones-cintas')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        setCache('cintas_config', list)
      })
      .catch(() => {})
  }, 1200)

  // FASE 3 (Tras 2.4s): Eventos y Exámenes
  setTimeout(() => {
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
  }, 2400)

  // FASE 4 (Tras 3.8s): Pagos, Horarios y Asistencias
  setTimeout(() => {
    Promise.all([
      api.get('/alumnos', { params: { estatus: 'activo' } }),
      api.get('/pagos'),
      api.get('/horarios'),
      api.get('/configuracion-escuela')
    ])
      .then(([resAlumnos, resPagos, resHorarios, resEscuela]) => {
        const listAlu = Array.isArray(resAlumnos.data) ? resAlumnos.data : (resAlumnos.data?.data || [])
        const listPag = Array.isArray(resPagos.data) ? resPagos.data : (resPagos.data?.data || [])
        const listHor = Array.isArray(resHorarios.data) ? resHorarios.data : (resHorarios.data?.data || [])

        setCache('pagos_main_data', {
          alumnos: listAlu,
          pagos: listPag,
          cintas: [],
          horarios: listHor,
          escuela: resEscuela.data
        })
        setCache('horarios_lista', listHor)
        setCache('configuracion_escuela', resEscuela.data)
      })
      .catch(() => {})

    api.get('/asistencias', { params: { fecha: hoyStr } })
      .then(res => setCache(`asistencias_dia_${hoyStr}`, res.data, 15 * 60 * 1000))
      .catch(() => {})
  }, 3800)
}
