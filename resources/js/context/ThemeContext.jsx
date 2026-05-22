import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '../api/axios'
import { useAuth } from './AuthContext'

// ─── Constantes ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'erp_user_prefs'

export const DEFAULT_PREFS = {
  theme:      'teal',
  dark:       false,
  fontSize:   'normal',   // small | normal | large
  radius:     'default',  // sharp | default | pill
  fontFamily: 'nunito',   // nunito | inter | poppins
  glass:      false,      // Efectos de transparencia/desenfoque
  sidebar:    'standard', // standard | compact
  shadows:    'soft',     // soft | strong
  navbar:     'fixed',    // fixed | floating
}

const DARK_OVERRIDES = {
  '--bg':            '#0f172a',
  '--bg2':           '#1e293b',
  '--white':         '#1e293b',
  '--text':          '#f1f5f9',
  '--text-muted':    '#94a3b8',
  '--border':        '#2d3f55',
  '--primary-light': 'rgba(255,255,255,0.09)',
  '--shadow':        '0 4px 20px rgba(0,0,0,0.35)',
  '--shadow-hover':  '0 8px 32px rgba(0,0,0,0.45)',
}

// ─── 20 Temas de color (Extendido) ──────────────────────────────────────────
export const THEMES = {
  teal:    { label: 'Esmeralda', swatch: '#1a9b8c', vars: { '--primary':'#1a9b8c','--primary-light':'#d0f0ec','--primary-dark':'#127a6d','--accent':'#f5a623','--accent2':'#e8c41a','--bg':'#e8f8f5','--bg2':'#f0faf8','--text':'#1a3a35','--text-muted':'#5a7a75','--border':'#c5e8e3','--shadow':'0 4px 20px rgba(26,155,140,0.12)','--shadow-hover':'0 8px 32px rgba(26,155,140,0.22)' } },
  indigo:  { label: 'Índigo',    swatch: '#4f46e5', vars: { '--primary':'#4f46e5','--primary-light':'#e0e7ff','--primary-dark':'#3730a3','--accent':'#f59e0b','--accent2':'#fbbf24','--bg':'#eef2ff','--bg2':'#f5f7ff','--text':'#1e1b4b','--text-muted':'#6b6e8a','--border':'#c7d2fe','--shadow':'0 4px 20px rgba(79,70,229,0.12)','--shadow-hover':'0 8px 32px rgba(79,70,229,0.22)' } },
  emerald: { label: 'Verde',     swatch: '#059669', vars: { '--primary':'#059669','--primary-light':'#d1fae5','--primary-dark':'#047857','--accent':'#f59e0b','--accent2':'#fbbf24','--bg':'#ecfdf5','--bg2':'#f0fdf4','--text':'#064e3b','--text-muted':'#5a7a6a','--border':'#a7f3d0','--shadow':'0 4px 20px rgba(5,150,105,0.12)','--shadow-hover':'0 8px 32px rgba(5,150,105,0.22)' } },
  rose:    { label: 'Rosa',      swatch: '#e11d48', vars: { '--primary':'#e11d48','--primary-light':'#ffe4e6','--primary-dark':'#9f1239','--accent':'#f59e0b','--accent2':'#fbbf24','--bg':'#fff1f2','--bg2':'#fff5f6','--text':'#4c0519','--text-muted':'#9f6070','--border':'#fecdd3','--shadow':'0 4px 20px rgba(225,29,72,0.12)','--shadow-hover':'0 8px 32px rgba(225,29,72,0.22)' } },
  violet:  { label: 'Violeta',   swatch: '#7c3aed', vars: { '--primary':'#7c3aed','--primary-light':'#ede9fe','--primary-dark':'#5b21b6','--accent':'#f59e0b','--accent2':'#fbbf24','--bg':'#f5f3ff','--bg2':'#faf9ff','--text':'#2e1065','--text-muted':'#7c6a8a','--border':'#ddd6fe','--shadow':'0 4px 20px rgba(124,58,237,0.12)','--shadow-hover':'0 8px 32px rgba(124,58,237,0.22)' } },
  amber:   { label: 'Ámbar',     swatch: '#d97706', vars: { '--primary':'#d97706','--primary-light':'#fef3c7','--primary-dark':'#b45309','--accent':'#7c3aed','--accent2':'#8b5cf6','--bg':'#fffbeb','--bg2':'#fffdf0','--text':'#451a03','--text-muted':'#927050','--border':'#fde68a','--shadow':'0 4px 20px rgba(217,119,6,0.12)','--shadow-hover':'0 8px 32px rgba(217,119,6,0.22)' } },
  sky:     { label: 'Cielo',     swatch: '#0284c7', vars: { '--primary':'#0284c7','--primary-light':'#e0f2fe','--primary-dark':'#0369a1','--accent':'#f59e0b','--accent2':'#fbbf24','--bg':'#f0f9ff','--bg2':'#f5fbff','--text':'#082f49','--text-muted':'#6488a0','--border':'#bae6fd','--shadow':'0 4px 20px rgba(2,132,199,0.12)','--shadow-hover':'0 8px 32px rgba(2,132,199,0.22)' } },
  slate:   { label: 'Grafito',   swatch: '#475569', vars: { '--primary':'#475569','--primary-light':'#e2e8f0','--primary-dark':'#334155','--accent':'#f59e0b','--accent2':'#fbbf24','--bg':'#f1f5f9','--bg2':'#f8fafc','--text':'#1e293b','--text-muted':'#64748b','--border':'#cbd5e1','--shadow':'0 4px 20px rgba(71,85,105,0.12)','--shadow-hover':'0 8px 32px rgba(71,85,105,0.22)' } },
  coral:   { label: 'Coral',     swatch: '#f97316', vars: { '--primary':'#f97316','--primary-light':'#ffedd5','--primary-dark':'#ea580c','--accent':'#7c3aed','--accent2':'#8b5cf6','--bg':'#fff7ed','--bg2':'#fffbf5','--text':'#431407','--text-muted':'#9a5a30','--border':'#fed7aa','--shadow':'0 4px 20px rgba(249,115,22,0.12)','--shadow-hover':'0 8px 32px rgba(249,115,22,0.22)' } },
  cyan:    { label: 'Cyan',      swatch: '#06b6d4', vars: { '--primary':'#06b6d4','--primary-light':'#cffafe','--primary-dark':'#0e7490','--accent':'#f59e0b','--accent2':'#fbbf24','--bg':'#ecfeff','--bg2':'#f0feff','--text':'#083344','--text-muted':'#4a8a96','--border':'#a5f3fc','--shadow':'0 4px 20px rgba(6,182,212,0.12)','--shadow-hover':'0 8px 32px rgba(6,182,212,0.22)' } },
  navy:    { label: 'Marino',    swatch: '#1e40af', vars: { '--primary':'#1e40af','--primary-light':'#dbeafe','--primary-dark':'#1e3a8a','--accent':'#f59e0b','--accent2':'#fbbf24','--bg':'#eff6ff','--bg2':'#f5f9ff','--text':'#1e3a8a','--text-muted':'#4a6ab0','--border':'#bfdbfe','--shadow':'0 4px 20px rgba(30,64,175,0.12)','--shadow-hover':'0 8px 32px rgba(30,64,175,0.22)' } },
  crimson: { label: 'Carmesí',   swatch: '#dc2626', vars: { '--primary':'#dc2626','--primary-light':'#fee2e2','--primary-dark':'#991b1b','--accent':'#f59e0b','--accent2':'#fbbf24','--bg':'#fef2f2','--bg2':'#fff5f5','--text':'#450a0a','--text-muted':'#a06060','--border':'#fecaca','--shadow':'0 4px 20px rgba(220,38,38,0.12)','--shadow-hover':'0 8px 32px rgba(220,38,38,0.22)' } },
  forest:  { label: 'Bosque',    swatch: '#15803d', vars: { '--primary':'#15803d','--primary-light':'#dcfce7','--primary-dark':'#14532d','--accent':'#f59e0b','--accent2':'#fbbf24','--bg':'#f0fdf4','--bg2':'#f5fef8','--text':'#052e16','--text-muted':'#3a7055','--border':'#bbf7d0','--shadow':'0 4px 20px rgba(21,128,61,0.12)','--shadow-hover':'0 8px 32px rgba(21,128,61,0.22)' } },
  gold:    { label: 'Dorado',    swatch: '#ca8a04', vars: { '--primary':'#ca8a04','--primary-light':'#fef9c3','--primary-dark':'#a16207','--accent':'#7c3aed','--accent2':'#8b5cf6','--bg':'#fefce8','--bg2':'#fffef0','--text':'#422006','--text-muted':'#8a6840','--border':'#fde68a','--shadow':'0 4px 20px rgba(202,138,4,0.12)','--shadow-hover':'0 8px 32px rgba(202,138,4,0.22)' } },
  fuchsia: { label: 'Fucsia',    swatch: '#c026d3', vars: { '--primary':'#c026d3','--primary-light':'#fae8ff','--primary-dark':'#86198f','--accent':'#f59e0b','--accent2':'#fbbf24','--bg':'#fdf4ff','--bg2':'#fef9ff','--text':'#3b0764','--text-muted':'#854a92','--border':'#f5d0fe','--shadow':'0 4px 20px rgba(192,38,211,0.12)','--shadow-hover':'0 8px 32px rgba(192,38,211,0.22)' } },
  lavender:{ label: 'Lavanda',   swatch: '#8b5cf6', vars: { '--primary':'#8b5cf6','--primary-light':'#f3e8ff','--primary-dark':'#6d28d9','--accent':'#10b981','--accent2':'#34d399','--bg':'#faf5ff','--bg2':'#fdfaff','--text':'#4c1d95','--text-muted':'#7c6a95','--border':'#e9d5ff','--shadow':'0 4px 20px rgba(139,92,246,0.12)','--shadow-hover':'0 8px 32px rgba(139,92,246,0.22)' } },
  mint:    { label: 'Menta',     swatch: '#10b981', vars: { '--primary':'#10b981','--primary-light':'#d1fae5','--primary-dark':'#059669','--accent':'#6366f1','--accent2':'#818cf8','--bg':'#f0fdf4','--bg2':'#f7fee7','--text':'#064e3b','--text-muted':'#4a7a6a','--border':'#a7f3d0','--shadow':'0 4px 20px rgba(16,185,129,0.12)','--shadow-hover':'0 8px 32px rgba(16,185,129,0.22)' } },
  coffee:  { label: 'Café',      swatch: '#78350f', vars: { '--primary':'#78350f','--primary-light':'#fef3c7','--primary-dark':'#451a03','--accent':'#10b981','--accent2':'#34d399','--bg':'#fffbeb','--bg2':'#fffdfa','--text':'#451a03','--text-muted':'#8a6040','--border':'#fde68a','--shadow':'0 4px 20px rgba(120,53,15,0.12)','--shadow-hover':'0 8px 32px rgba(120,53,15,0.22)' } },
  neon:    { label: 'Neón',      swatch: '#84cc16', vars: { '--primary':'#84cc16','--primary-light':'#f0fdf4','--primary-dark':'#4d7c0f','--accent':'#f43f5e','--accent2':'#fb7185','--bg':'#f7fee7','--bg2':'#ffffff','--text':'#1a2e05','--text-muted':'#4d7a1a','--border':'#bef264','--shadow':'0 4px 20px rgba(132,204,22,0.12)','--shadow-hover':'0 8px 32px rgba(132,204,22,0.22)' } },
  royal:   { label: 'Royal',     swatch: '#1d4ed8', vars: { '--primary':'#1d4ed8','--primary-light':'#dbeafe','--primary-dark':'#1e3a8a','--accent':'#fbbf24','--accent2':'#f59e0b','--bg':'#eff6ff','--bg2':'#f8faff','--text':'#1e3a8a','--text-muted':'#4a6ab0','--border':'#bfdbfe','--shadow':'0 4px 20px rgba(29,78,216,0.12)','--shadow-hover':'0 8px 32px rgba(29,78,216,0.22)' } },
}

// ─── Aplicar preferencias al DOM ─────────────────────────────────────────────
export function applyPreferences(prefs) {
  const root  = document.documentElement
  const theme = THEMES[prefs.theme] || THEMES.teal

  // 1. Limpiar overrides oscuros previos
  Object.keys(DARK_OVERRIDES).forEach(p => root.style.removeProperty(p))

  // 2. Colores base del tema
  Object.entries(theme.vars).forEach(([p, v]) => root.style.setProperty(p, v))

  // 3. Modo oscuro
  if (prefs.dark) {
    root.classList.add('dark')
    Object.entries(DARK_OVERRIDES).forEach(([p, v]) => root.style.setProperty(p, v))
  } else {
    root.classList.remove('dark')
  }

  // 3. Atributos de datos para CSS selectors
  root.setAttribute('data-font-size', prefs.fontSize || 'normal')
  root.setAttribute('data-radius', prefs.radius || 'default')
  root.setAttribute('data-font-family', prefs.fontFamily || 'nunito')
  root.setAttribute('data-sidebar', prefs.sidebar || 'standard')
  root.setAttribute('data-shadows', prefs.shadows || 'soft')
  root.setAttribute('data-navbar', prefs.navbar || 'fixed')

  // 4. Glassmorphism
  if (prefs.glass) {
    root.classList.add('use-glass')
  } else {
    root.classList.remove('use-glass')
  }
}

// ─── Cargar desde localStorage ───────────────────────────────────────────────
function loadLocal() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? { ...DEFAULT_PREFS, ...JSON.parse(s) } : DEFAULT_PREFS
  } catch { return DEFAULT_PREFS }
}

function saveLocal(prefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)) } catch {}
}

// ─── Contexto ────────────────────────────────────────────────────────────────
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState(loadLocal)

  useEffect(() => { applyPreferences(prefs) }, [])

  useEffect(() => {
    if (!user) return
    api.get('/user/preferences')
      .then(res => {
        const serverPrefs = { ...DEFAULT_PREFS, ...res.data.preferences }
        setPrefs(serverPrefs)
        applyPreferences(serverPrefs)
        saveLocal(serverPrefs)
      })
      .catch(() => {})
  }, [user?.id])

  const setPreference = useCallback(async (key, value) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    applyPreferences(next)
    saveLocal(next)
    if (user) {
      try { await api.post('/user/preferences', { preferences: { [key]: value } }) }
      catch (e) { console.error('Error guardando preferencia:', e) }
    }
  }, [prefs, user])

  const resetPreferences = useCallback(async () => {
    setPrefs(DEFAULT_PREFS)
    applyPreferences(DEFAULT_PREFS)
    saveLocal(DEFAULT_PREFS)
    if (user) {
      try { await api.post('/user/preferences', { preferences: DEFAULT_PREFS }) }
      catch (e) { console.error('Error restableciendo preferencias:', e) }
    }
  }, [user])

  return (
    <ThemeContext.Provider value={{ prefs, setPreference, resetPreferences }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
