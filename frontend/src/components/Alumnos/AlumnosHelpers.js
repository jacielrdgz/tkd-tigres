

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
