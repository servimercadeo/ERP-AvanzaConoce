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
        <svg width="36" height="36" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="100" cy="125" rx="46" ry="39" fill="#A9E1DF" />
          <path fill="#0FA3A2" d="M100 20 C88 38 67 67 58 92 C52 109 55 131 66 147 C75 160 87 168 100 170 C113 168 125 160 134 147 C145 131 148 109 142 92 C133 67 112 38 100 20 Z" />
          <path fill="#F9A825" d="M100 52 C92 65 80 85 75 104 C72 118 76 132 85 142 C90 148 95 151 100 152 C105 151 110 148 115 142 C124 132 128 118 125 104 C120 85 108 65 100 52 Z" />
          <circle cx="142" cy="58" r="16" fill="#F2C300" />
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
                            <Link key={archivo.id} to={`/module/${mod.id}/submodule/${sub.id}/file/${archivo.id}`}>
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

      <div className="header-right">
        <div 
          className="header-user-toggle"
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        >
          <span className="header-user-name">
            {(() => {
              if (!user?.name) return '';
              const parts = user.name.split(' ').filter(Boolean);
              return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : user.name;
            })()}
          </span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>▼</span>
        </div>

        {isUserMenuOpen && (
          <div className="user-dropdown">
            <div style={{ borderBottom: '1.5px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
              <p style={{ margin: 0, fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>{user?.name}</p>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>{user?.email}</p>
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
