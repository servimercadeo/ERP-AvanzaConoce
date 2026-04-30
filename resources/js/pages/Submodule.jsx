import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { ERP_MODULES } from '../data/erpModules';
import { SUBMODULE_CONTENT } from '../data/submoduleContent';

export default function Submodule() {
  const { moduleId, submoduleId } = useParams();
  
  const mod = ERP_MODULES.find(m => m.id === moduleId);
  const sub = mod ? mod.submods.find(s => s.id === submoduleId) : null;
  const data = SUBMODULE_CONTENT[submoduleId];

  if (!mod || !sub) {
    return (
      <Layout>
        <p style={{ padding: '40px', textAlign: 'center', color: '#e74c3c' }}>
          Submódulo no encontrado.
        </p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="breadcrumb" id="breadcrumb">
        <Link to="/dashboard">Inicio</Link>
        <span className="sep">›</span>
        <Link to={`/module/${mod.id}`}>{mod.icon} {mod.label}</Link>
        <span className="sep">›</span>
        <span>{sub.icon} {sub.label}</span>
      </div>

      <p className="page-title" id="page-title">{sub.label}</p>

      {/* STATS */}
      {data && data.stats && (
        <div className="stats-row" id="stats-row">
          {data.stats.map((s, idx) => (
            <div key={idx} className="stat-card">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* CONTENT */}
      <div className="submod-content">
        <h2 id="content-title">{sub.icon} {sub.label}</h2>
        <p className="desc" id="content-desc">{data ? data.desc : sub.desc}</p>
        
        {data && data.features && (
          <div className="submod-features" id="features-grid">
            {data.features.map((f, idx) => (
              <div key={idx} className="feat-item">{f}</div>
            ))}
          </div>
        )}
        
        <a className="btn-primary" href="#" onClick={(e) => e.preventDefault()}>
          Nuevo registro
        </a>
      </div>

      {/* TABLE */}
      {data && data.cols && (
        <div className="submod-content" style={{ marginTop: '24px' }}>
          <h2>Registros recientes</h2>
          <table className="data-table" id="data-table">
            <thead id="table-head">
              <tr>
                {data.cols.map((c, idx) => <th key={idx}>{c}</th>)}
              </tr>
            </thead>
            <tbody id="table-body">
              {data.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
