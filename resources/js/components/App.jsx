import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import PrivateRoute from './PrivateRoute'
import Login     from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Module    from '../pages/Module'
import Submodule from '../pages/Submodule'
import RegistroCandidatosForm from '../forms/RegistroCandidatosForm'

export default function App() {
  return (
    // AuthProvider va AFUERA para que ThemeProvider pueda usar useAuth()
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro-candidatos" element={<RegistroCandidatosForm />} />
            <Route
              path="/dashboard"
              element={<PrivateRoute><Dashboard /></PrivateRoute>}
            />
            <Route
              path="/module/:moduleId"
              element={<PrivateRoute><Module /></PrivateRoute>}
            />
            <Route
              path="/module/:moduleId/submodule/:submoduleId/file/:archivoId"
              element={<PrivateRoute><Submodule /></PrivateRoute>}
            />
            <Route
              path="/module/:moduleId/submodule/:submoduleId"
              element={<PrivateRoute><Submodule /></PrivateRoute>}
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}
