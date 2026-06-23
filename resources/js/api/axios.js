import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

// Inyecta X-XSRF-TOKEN explícitamente en cada petición que muta datos.
// Si el cookie no existe aún lo refresca antes de continuar.
api.interceptors.request.use(async config => {
  const method = (config.method || '').toLowerCase()
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    let token = getCsrfToken()
    if (!token) {
      await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
      token = getCsrfToken()
    }
    if (token) config.headers['X-XSRF-TOKEN'] = token
  }
  // Cuando el body es FormData dejar que el browser establezca Content-Type con boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Maneja errores globales de autenticación
api.interceptors.response.use(
  response => response,
  async error => {
    const status = error?.response?.status
    // 419 = CSRF token mismatch → refrescar token y reintentar una vez
    if (status === 419 && !error.config._csrfRetried) {
      error.config._csrfRetried = true
      await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
      const token = getCsrfToken()
      if (token) error.config.headers['X-XSRF-TOKEN'] = token
      return axios(error.config)
    }
    // 401 = sesión expirada → redirigir al login
    // No redirigir si ya estamos en login o en páginas públicas (candidatos sin sesión)
    const publicPaths = ['/login', '/registro-candidatos', '/registro-nuevos-ingresos', '/carga-documentos']
    const isPublicPage = publicPaths.some(p => window.location.pathname.startsWith(p))
    if (status === 401 && !isPublicPage) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

