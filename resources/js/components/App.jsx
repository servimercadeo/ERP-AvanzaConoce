import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import PrivateRoute from './PrivateRoute'
import Login     from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Module    from '../pages/Module'
import Submodule from '../pages/Submodule'

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

          <Route
            path="/module/:moduleId"
            element={
              <PrivateRoute>
                <Module />
              </PrivateRoute>
            }
          />

          <Route
            path="/module/:moduleId/submodule/:submoduleId"
            element={
              <PrivateRoute>
                <Submodule />
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
