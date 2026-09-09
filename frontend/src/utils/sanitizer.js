/**
 * Utilidades de sanitización y limpieza de inputs en el cliente.
 * Previene XSS, inyección de caracteres de control y normaliza campos antes del envío.
 */

const PASSWORD_FIELDS = [
  'password',
  'password_confirmation',
  'current_password',
  'new_password',
  'old_password',
]

/**
 * Sanitiza una cadena de texto individual.
 */
export function sanitizeString(value, key = '') {
  if (typeof value !== 'string') return value

  // Remover bytes nulos (\0) en cualquier caso
  let clean = value.replace(/\0/g, '')

  // Si es campo de contraseña, preservar caracteres especiales para no alterar contraseñas complejas
  if (PASSWORD_FIELDS.includes(key.toLowerCase())) {
    return clean
  }

  // Remover caracteres de control invisibles (permitiendo saltos de línea y tabulaciones)
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Remover tags HTML y scripts básicos
  clean = clean.replace(/<[^>]*>/g, '')

  // Recortar espacios en blanco
  clean = clean.trim()

  // Normalizar correos a minúsculas
  if (key.toLowerCase().includes('email')) {
    clean = clean.toLowerCase()
  }

  return clean
}

/**
 * Sanitiza recursivamente objetos y arrays antes de enviarlos como JSON al backend.
 * Respeta instancias de FormData, File y Blob.
 */
export function sanitizeObject(data) {
  if (!data || typeof data !== 'object') return data
  if (typeof window !== 'undefined') {
    if (data instanceof FormData || data instanceof Blob || data instanceof File) {
      return data
    }
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeObject(item))
  }

  const result = {}
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value, key)
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeObject(value)
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * Sanitiza parámetros de consulta (query params).
 */
export function sanitizeParams(params) {
  if (!params || typeof params !== 'object') return params

  const cleaned = {}
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      cleaned[key] = sanitizeString(value, key)
    } else if (value && typeof value === 'object') {
      cleaned[key] = sanitizeObject(value)
    } else {
      cleaned[key] = value
    }
  }
  return cleaned
}
