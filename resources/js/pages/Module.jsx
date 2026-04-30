import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { ERP_MODULES } from '../data/erpModules';

export default function Module() {
  const { moduleId } = useParams();
  const mod = ERP_MODULES.find(m => m.id === moduleId);

  if (!mod) {
    return (
      <Layout>
        <p style={{ padding: '40px', textAlign: 'center', color: '#e74c3c' }}>
          Módulo no encontrado.
        </p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
        <div className="breadcrumb" id="breadcrumb">
          <Link to="/dashboard">Inicio</Link>
          <span className="sep">›</span>
          <span>{mod.icon} {mod.label}</span>
        </div>

        <p className="page-title" id="mod-title">{mod.label}</p>

        <div className="info-section" id="mod-info" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span id="mod-big-icon" style={{ fontSize: '3rem' }}>{mod.icon}</span>
            <div>
              <h2 id="mod-info-title" style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>
                {mod.label}
              </h2>
              <p id="mod-info-desc" style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                {mod.desc}
              </p>
            </div>
          </div>
        </div>

        {mod.submods && mod.submods.length > 0 && (
          <>
            <p className="section-title">Selecciona un submódulo</p>
            <div className="mod-subgrid" id="submod-grid">
              {mod.submods.map(sub => (
                <Link key={sub.id} className="submod-card" to={`/module/${mod.id}/submodule/${sub.id}`}>
                  <span className="sc-icon">{sub.icon}</span>
                  <span className="sc-label">{sub.label}</span>
                  <span className="sc-desc">{sub.desc}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {mod.archivos && mod.archivos.length > 0 && (
          <>
            <p className="section-title" style={{ marginTop: mod.submods?.length > 0 ? '32px' : '0' }}>Archivos disponibles</p>
            <div className="mod-subgrid">
              {mod.archivos.map(archivo => (
                <Link key={archivo.id} className="submod-card" to={`/module/${mod.id}`}>
                  <span className="sc-icon">📄</span>
                  <span className="sc-label">{archivo.label}</span>
                  <span className="sc-desc">Gestión y configuración de {archivo.label.toLowerCase()}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
