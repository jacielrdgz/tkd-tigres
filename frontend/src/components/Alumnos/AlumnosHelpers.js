export const CINTAS = [
  'blanca', 'blanca_avanzada', 'amarilla', 'amarilla_avanzada',
  'naranja', 'naranja_avanzada', 'verde', 'verde_avanzada',
  'azul', 'azul_avanzada', 'marrón', 'marrón_avanzada',
  'roja', 'roja_avanzada', 'negra'
]

export const VACIO = {
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  nombre_tutor: '',
  telefono_tutor: '',
  email: '',
  fecha_nacimiento: '',
  foto_url: '',
  cinta: 'blanca',
  estatus: 'activo',
  horario: ''
}

export const capitalizar = (str) => {
  if (!str) return ''
  return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export const obtenerIniciales = (nombre, apellido) => {
  const n = nombre ? nombre.charAt(0).toUpperCase() : ''
  const a = apellido ? apellido.charAt(0).toUpperCase() : ''
  return n + a || '?'
}

export const limpiarUrl = (url) => {
  if (!url) return null
  return url.replace('http://localhost:8000/storage/', 'http://localhost:8000/storage//')
}
