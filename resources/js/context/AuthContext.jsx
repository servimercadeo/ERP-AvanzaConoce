import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Al cargar la app verificamos si ya hay sesión activa (ej: viene de SSO).
  // Primero obtenemos el CSRF cookie para que Sanctum reconozca la sesión.
  useEffect(() => {
    api.get('/sanctum/csrf-cookie', { baseURL: '/' })
      .finally(() => {
        api.get('/user')
          .then(res => setUser(res.data))
          .catch(() => setUser(null))
          .finally(() => setLoading(false))
      })
  }, [])

  const login = async (email, password) => {
    // Paso 1: obtener cookie CSRF de Sanctum
    await api.get('/sanctum/csrf-cookie', { baseURL: '/' })
    // Paso 2: autenticar
    const res = await api.post('/login', { email, password }, { baseURL: '/' })
    setUser(res.data.user)
    return res.data.user
  }

  const logout = async () => {
    await api.post('/logout', {}, { baseURL: '/' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
