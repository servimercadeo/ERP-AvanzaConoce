import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import PrivateRoute from './PrivateRoute'
import Login     from '../pages/Login'
import Dashboard from '../pages/Dashboard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Raíz → redirige al dashboard (PrivateRoute decide si mandar a login) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Login público */}
          <Route path="/login" element={<Login />} />

          {/* Dashboard protegido */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* Cualquier ruta desconocida → dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
