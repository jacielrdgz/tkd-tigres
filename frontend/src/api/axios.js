import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Mantenlo si usas cookies de sesión o Sanctum
})

// Interceptor: agregar token de auth automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor: manejar errores 401 (token expirado) y 403 (suscripción vencida o suspendida)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado — limpiar y redirigir
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    } else if (error.response?.status === 403 && (error.response?.data?.subscription_expired || error.response?.data?.school_suspended)) {
      // Suscripción vencida o escuela suspendida — sacar de la sesión inmediatamente
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']

      if (error.response?.data?.message) {
        sessionStorage.setItem('auth_expired_notice', error.response.data.message)
      }

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api