import { useState, useEffect } from 'react'
import api from '../api/axios'

function App() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/health')
      .then(res => setStatus(res.data))
      .catch(() => setError('No se pudo conectar con la API.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>ERP AvanzaConoce</h1>
      <h2>Estado del Backend (Laravel)</h2>
      {loading && <p>Conectando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {status && (
        <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px' }}>
          <p><strong>Estado:</strong> {status.status}</p>
          <p><strong>App:</strong> {status.app}</p>
          <p style={{ color: 'green' }}>Conexion React ↔ Laravel exitosa</p>
        </div>
      )}
    </div>
  )
}

export default App
