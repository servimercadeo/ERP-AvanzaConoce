import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ERP_MODULES } from '../data/erpModules';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <Link className="header-logo" to="/dashboard">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="18" cy="22" rx="10" ry="10" fill="#1a9b8c" opacity="0.18"/>
          <path d="M18 4 C18 4 10 14 10 22 A8 8 0 0 0 26 22 C26 14 18 4 18 4Z" fill="#1a9b8c"/>
          <path d="M18 12 C18 12 13 19 13 23 A5 5 0 0 0 23 23 C23 19 18 12 18 12Z" fill="#f5a623"/>
          <circle cx="27" cy="10" r="4" fill="#e8c41a"/>
        </svg>
        <span>ERP</span>
      </Link>

      <nav className="nav">
        {ERP_MODULES.map(mod => (
          <div key={mod.id} className="nav-item">
            <Link className="nav-link" to={`/module/${mod.id}`}>
              <span>{mod.icon}</span>
              <span>{mod.label}</span>
              <span className="arrow">▾</span>
            </Link>
            <div className="dropdown">
              {mod.submods.map(sub => (
                <Link key={sub.id} to={`/module/${mod.id}/submodule/${sub.id}`}>
                  <span className="sub-icon">{sub.icon}</span>
                  {sub.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="header-right">
        <span className="header-user" style={{ marginRight: '10px' }}>{user?.name?.toUpperCase()}</span>
        <button onClick={handleLogout} style={{
          background: 'var(--primary)',
          border: 'none',
          color: '#fff',
          borderRadius: '6px',
          padding: '6px 14px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 700
        }}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
