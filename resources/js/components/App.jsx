import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import PrivateRoute from './PrivateRoute'

const Login                  = lazy(() => import('../pages/Login'))
const Dashboard              = lazy(() => import('../pages/Dashboard'))
const Module                 = lazy(() => import('../pages/Module'))
const Submodule              = lazy(() => import('../pages/Submodule'))
const RegistroCandidatosForm = lazy(() => import('../forms/RegistroCandidatosForm'))

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg, #f5f6fa)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '4px solid var(--primary, #0d9488)',
        borderTopColor: 'transparent',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}
