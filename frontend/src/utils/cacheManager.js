/**
 * Cache Manager para GymCloud
 * 
 * Implementa una estrategia de caché en memoria de alta velocidad con
 * patrón Stale-While-Revalidate (SWR).
 * 
 * - Si existen datos en caché, se devuelven al instante (0ms).
 * - En segundo plano se consulta a la API para verificar si hay cambios recientes.
 * - Al crear, editar o eliminar registros, se invalida la clave o prefijo para garantizar datos frescos.
 */

const memoryCache = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos por defecto

/**
 * Obtener elemento de la caché si aún está vigente.
 */
export function getCache(key) {
  if (!memoryCache.has(key)) return null;

  const item = memoryCache.get(key);
  const now = Date.now();

  // Si expiró, se puede seguir usando como stale pero marcamos expiración
  if (now > item.expiresAt) {
    return { data: item.data, isStale: true };
  }

  return { data: item.data, isStale: false };
}

/**
 * Guardar datos en la caché en memoria.
 */
export function setCache(key, data, ttlMs = DEFAULT_TTL_MS) {
  memoryCache.set(key, {
    data,
    savedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Invalidar una clave específica o todas las claves que comiencen con un prefijo.
 * Ej: invalidateCache('alumnos') invalida 'alumnos_list', 'alumnos_cintas', etc.
 */
export function invalidateCache(pattern = '') {
  if (!pattern) {
    memoryCache.clear();
    return;
  }

  for (const key of memoryCache.keys()) {
    if (key === pattern || key.startsWith(pattern)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Wrapper de ejecución con caché y actualización en segundo plano.
 * 
 * @param {string} cacheKey Clave única para los datos
 * @param {Function} fetcherFn Función asíncrona que hace la llamada a la API (api.get)
 * @param {Object} options Opciones de configuración
 * @returns {Promise<any>}
 */
export async function fetchWithCache(cacheKey, fetcherFn, options = {}) {
  const { ttl = DEFAULT_TTL_MS, onBackgroundUpdate = null, forceRefresh = false } = options;

  if (!forceRefresh) {
    const cached = getCache(cacheKey);
    if (cached && cached.data) {
      // Si tenemos datos, lanzamos la actualización en background si están stale o de forma silenciosa
      setTimeout(async () => {
        try {
          const freshData = await fetcherFn();
          setCache(cacheKey, freshData, ttl);
          if (onBackgroundUpdate && typeof onBackgroundUpdate === 'function') {
            onBackgroundUpdate(freshData);
          }
        } catch (e) {
          // Error silencioso en background
        }
      }, 50);

      return cached.data;
    }
  }

  // Si no está en caché o se forza refresh, consultamos directamente
  const freshData = await fetcherFn();
  setCache(cacheKey, freshData, ttl);
  return freshData;
}
