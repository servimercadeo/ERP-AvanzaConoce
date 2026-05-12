import React, { useState } from 'react';
import { IconFile, MODULE_ICONS, IconFolder } from './Icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import { ERP_MODULES } from '../data/erpModules';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  return (
    <header className="header">
      <div className="header-mobile-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <Link className="header-logo" to="/dashboard">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="18" cy="22" rx="10" ry="10" fill="#1a9b8c" opacity="0.18" />
          <path d="M18 4 C18 4 10 14 10 22 A8 8 0 0 0 26 22 C26 14 18 4 18 4Z" fill="#1a9b8c" />
          <path d="M18 12 C18 12 13 19 13 23 A5 5 0 0 0 23 23 C23 19 18 12 18 12Z" fill="#f5a623" />
          <circle cx="27" cy="10" r="4" fill="#e8c41a" />
        </svg>
        <span>ERP</span>
      </Link>

      <nav className={`nav ${isMenuOpen ? 'mobile-active' : ''}`}>
        {ERP_MODULES.map(mod => (
          <div key={mod.id} className="nav-item">
            <NavLink className="nav-link" to={`/module/${mod.id}`}>
              {mod.icon && <span className="nav-icon">{React.createElement(MODULE_ICONS[mod.icon] ?? IconFolder, { size: 16 })}</span>}
              <span>{mod.label}</span>
              {(mod.submods?.length > 0 || mod.archivos?.length > 0) && <span className="arrow">▾</span>}
            </NavLink>
            {(mod.submods?.length > 0 || mod.archivos?.length > 0) && (
              <div className="dropdown">
                {mod.submods?.length > 0 ? (
                  mod.submods.map(sub => (
                    <div key={sub.id} className="dropdown-nested">
                      <Link to={`/module/${mod.id}/submodule/${sub.id}`}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          {sub.icon && <span className="sub-icon">{React.createElement(MODULE_ICONS[sub.icon] ?? IconFolder, { size: 14 })}</span>}
                          <span>{sub.label}</span>
                          {sub.archivos?.length > 0 && <span className="arrow right" style={{ marginLeft: 'auto' }}>▸</span>}
                        </div>
                      </Link>
                      {sub.archivos?.length > 0 && (
                        <div className="sub-dropdown">
                          {sub.archivos.map(archivo => (
                            <Link key={archivo.id} to={`/module/${mod.id}/submodule/${sub.id}`}>
                              <span className="sub-icon"><IconFile size={14} /></span>
                              <span>{archivo.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  mod.archivos?.map(archivo => (
                    <Link key={archivo.id} to={`/module/${mod.id}`}>
                      <span className="sub-icon"><IconFile size={14} /></span>
                      <span>{archivo.label}</span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="header-right" style={{ position: 'relative' }}>
        <div 
          className="header-user-toggle"
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 12px', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s', background: isUserMenuOpen ? 'rgba(0,0,0,0.05)' : 'transparent' }}
        >
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <span className="header-user" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
            {user?.name?.toUpperCase()}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>▼</span>
        </div>

        {isUserMenuOpen && (
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, width: 260, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            <div style={{ borderBottom: '1.5px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
              <p style={{ margin: 0, fontWeight: 800, color: 'var(--text)', fontSize: '0.95rem' }}>{user?.name}</p>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>{user?.email}</p>
            </div>
            
            <button onClick={handleLogout} style={{
              width: '100%',
              background: '#fce8e8',
              border: 'none',
              color: '#a33',
              borderRadius: '6px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.2s'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
