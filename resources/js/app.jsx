import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../css/app.css'
import '../css/erp-styles.css'
import App from './components/App.jsx'

// Tras un despliegue, una pestaña abierta con la versión anterior pide pantallas (chunks)
// que el build nuevo ya borró: se recarga una vez para tomar la versión nueva. El sello en
// sessionStorage evita un bucle si el archivo realmente no carga (p. ej. sin internet).
window.addEventListener('vite:preloadError', (event) => {
  const CLAVE = 'erp-recarga-por-version'
  let ultima = 0
  try { ultima = Number(sessionStorage.getItem(CLAVE)) || 0 } catch { /* sin storage */ }
  if (Date.now() - ultima < 30_000) return
  try { sessionStorage.setItem(CLAVE, String(Date.now())) } catch { /* sin storage */ }
  event.preventDefault()
  window.location.reload()
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime:   10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
)
