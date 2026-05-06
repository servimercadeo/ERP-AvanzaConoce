import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { ERP_MODULES } from '../data/erpModules';
import EmpleadosCrud from './EmpleadosCrud';

/* Mapa: moduleId → archivoId → componente CRUD */
const CRUD_MAP = {
  administrativo: {
    empleados: EmpleadosCrud,
  },
};

export default function Module() {
  const { moduleId } = useParams();
  const mod = ERP_MODULES.find(m => m.id === moduleId);
  const [archivoActivo, setArchivoActivo] = useState(null);

  if (!mod) {
    return (
      <Layout>
        <p style={{ padding: '40px', textAlign: 'center', color: '#e74c3c' }}>
          Módulo no encontrado.
        </p>
      </Layout>
    );
  }

  /* ¿Hay un componente CRUD para el archivo activo? */
  const CrudComponent = archivoActivo ? CRUD_MAP[moduleId]?.[archivoActivo] : null;
  const archivoLabel  = archivoActivo ? mod.archivos?.find(a => a.id === archivoActivo)?.label : null;

  return (
    <Layout>
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Breadcrumb ── */}
        <div className="breadcrumb" id="breadcrumb">
          <Link to="/dashboard">Inicio</Link>
          <span className="sep">›</span>
          {archivoActivo ? (
            <>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', padding: 0, fontFamily: 'Nunito, sans-serif' }}
                onClick={() => setArchivoActivo(null)}
              >
                {mod.icon} {mod.label}
              </button>
              <span className="sep">›</span>
              <span>{archivoLabel}</span>
            </>
          ) : (
            <span>{mod.icon} {mod.label}</span>
          )}
        </div>

        {/* ── Vista CRUD (archivo activo con CRUD registrado) ── */}
        {CrudComponent ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p className="page-title" style={{ marginBottom: 4, textAlign: 'left' }}>{archivoLabel}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Módulo {mod.label} · Gestión y administración de {archivoLabel?.toLowerCase()}
                </p>
              </div>
              <button
                style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setArchivoActivo(null)}
              >
                ← Volver al módulo
              </button>
            </div>
            <CrudComponent />
          </>
        ) : (
          <>
            {/* ── Vista normal del módulo ── */}
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

            {/* Submódulos */}
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

            {/* Archivos */}
            {mod.archivos && mod.archivos.length > 0 && (
              <>
                <p className="section-title" style={{ marginTop: mod.submods?.length > 0 ? '32px' : '0' }}>
                  Archivos disponibles
                </p>
                <div className="mod-subgrid">
                  {mod.archivos.map(archivo => {
                    const hasCrud = !!CRUD_MAP[moduleId]?.[archivo.id];
                    return hasCrud ? (
                      /* Archivo con CRUD → botón que abre el CRUD inline */
                      <button
                        key={archivo.id}
                        className="submod-card"
                        style={{ border: 'none', textAlign: 'center', width: '100%', cursor: 'pointer', position: 'relative' }}
                        onClick={() => setArchivoActivo(archivo.id)}
                      >
                        <span className="sc-icon">📋</span>
                        <span className="sc-label">{archivo.label}</span>
                        <span className="sc-desc">Gestión y administración de {archivo.label.toLowerCase()}</span>
                        <span style={{ position: 'absolute', top: 12, right: 12, background: 'var(--primary)', color: '#fff', borderRadius: 6, fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', letterSpacing: '0.05em' }}>
                          CRUD
                        </span>
                      </button>
                    ) : (
                      /* Archivo sin CRUD → link estándar */
                      <Link key={archivo.id} className="submod-card" to={`/module/${mod.id}`}>
                        <span className="sc-icon">📄</span>
                        <span className="sc-label">{archivo.label}</span>
                        <span className="sc-desc">Gestión y configuración de {archivo.label.toLowerCase()}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
