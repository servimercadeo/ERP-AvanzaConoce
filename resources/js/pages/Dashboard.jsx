import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={styles.wrapper}>
      {/* Barra superior */}
      <header style={styles.header}>
        <span style={styles.logo}>ERP AvanzaConoce</span>
        <div style={styles.userInfo}>
          <span style={styles.userName}>{user?.name}</span>
          <span style={styles.rol}>{user?.rol}</span>
          <button onClick={handleLogout} style={styles.btnLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main style={styles.main}>
        <h2 style={styles.bienvenida}>Bienvenido, {user?.name?.split(' ')[0]} 👋</h2>
        <p style={styles.sub}>Selecciona un módulo para comenzar</p>

        <div style={styles.grid}>
          {modulos.map(m => (
            <div key={m.nombre} style={styles.card}>
              <span style={styles.icono}>{m.icono}</span>
              <h3 style={styles.cardTitulo}>{m.nombre}</h3>
              <p style={styles.cardDesc}>{m.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

const modulos = [
  { icono: '📦', nombre: 'Inventario',     desc: 'Control de productos y stock' },
  { icono: '💰', nombre: 'Facturación',    desc: 'Facturas, cotizaciones y pagos' },
  { icono: '👥', nombre: 'Clientes',       desc: 'CRM y gestión de clientes' },
  { icono: '📊', nombre: 'Reportes',       desc: 'Indicadores y analíticas' },
  { icono: '🏭', nombre: 'Proveedores',    desc: 'Gestión de proveedores' },
  { icono: '⚙️', nombre: 'Configuración', desc: 'Usuarios, roles y sistema' },
]

const styles = {
  wrapper:  { minHeight: '100vh', background: '#f0f4f8', display: 'flex', flexDirection: 'column' },
  header:   {
    background: '#1a3c5e',
    color: '#fff',
    padding: '0 2rem',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo:     { fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.5px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userName: { fontSize: '0.9rem' },
  rol:      {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '20px',
    padding: '2px 10px',
    fontSize: '0.75rem',
    textTransform: 'capitalize',
  },
  btnLogout: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    borderRadius: '6px',
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  main:        { padding: '2rem', maxWidth: '1100px', margin: '0 auto', width: '100%' },
  bienvenida:  { fontSize: '1.6rem', color: '#1a3c5e', margin: '0 0 0.25rem' },
  sub:         { color: '#6b7280', marginBottom: '2rem' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' },
  card:        {
    background: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    transition: 'transform 0.15s',
  },
  icono:      { fontSize: '2rem' },
  cardTitulo: { margin: '0.75rem 0 0.25rem', color: '#1a3c5e', fontSize: '1rem' },
  cardDesc:   { margin: 0, color: '#6b7280', fontSize: '0.85rem' },
}