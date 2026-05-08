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
  return config
})

export default api
