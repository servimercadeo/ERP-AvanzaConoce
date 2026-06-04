import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { IconEye, IconTrash, IconClose, IconFolder } from '../components/Icons';

const DOCS_LIST = [
  { id: 'documento_identidad',      label: 'Documento de Identidad',        required: true },
  { id: 'diploma_bachiller',        label: 'Diploma de Bachiller',           required: true },
  { id: 'certificados_estudio',     label: 'Certificados de Estudio',        required: true },
  { id: 'certificados_laborales',   label: 'Certificados Laborales',         required: true },
  { id: 'certificacion_eps',        label: 'Certificación EPS',              required: true },
  { id: 'certificacion_pension',    label: 'Certificación Fondo Pensiones',  required: true },
  { id: 'hoja_vida',                label: 'Formato Hoja de Vida S&M',       required: true },
  { id: 'documentos_beneficiarios', label: 'Documentos Beneficiarios',       required: false },
];

const ESTADO_CIVIL_FILTERS = [
  { value: 'Todos', label: 'Todos los estados' },
  { value: 'SOLTERO', label: 'Soltero' },
  { value: 'CASADO', label: 'Casado' },
  { value: 'DIVORCIADO', label: 'Divorciado' },
  { value: 'VIUDO', label: 'Viudo' },
];

const PageStyles = () => (
  <style>{`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .rf-animate { animation: fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    .rf-card {
      background: var(--white, #ffffff);
      border-radius: var(--radius, 16px);
      box-shadow: 0 20px 48px rgba(26,155,140,0.1);
      border: 1.5px solid var(--border, #c5e8e3);
      overflow: hidden;
    }
    .rf-header-banner {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      padding: 28px 36px;
      color: #ffffff;
    }
    .rf-header-banner h2 {
      font-family: 'Poppins', sans-serif;
      font-weight: 800;
      font-size: 1.35rem;
      margin: 0 0 6px 0;
      letter-spacing: 0.02em;
    }
    .rf-header-banner p {
      margin: 0;
      font-size: 0.88rem;
      opacity: 0.88;
      font-family: 'Nunito', sans-serif;
    }

    .rf-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      padding: 20px 28px;
      background: var(--bg2, #f0faf8);
      border-bottom: 1.5px solid var(--border, #c5e8e3);
    }
    .rf-filters { display: flex; align-items: center; gap: 12px; flex: 1; flex-wrap: wrap; }
    .rf-search-wrap { position: relative; flex: 1; min-width: 220px; max-width: 420px; }
    .rf-search-icon {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      display: flex; align-items: center; color: var(--text-muted, #5a7a75);
    }
    .rf-search-input {
      width: 100%;
      padding: 10px 12px 10px 34px;
      border: 1.5px solid var(--border, #c5e8e3);
      border-radius: var(--radius-sm, 10px);
      font-size: 0.88rem;
      font-family: 'Nunito', sans-serif;
      background: var(--white, #ffffff);
      color: var(--text, #1a3a35);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }
    .rf-search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 4px rgba(26,155,140,0.14);
    }
    .rf-filter-select {
      padding: 9px 12px;
      border: 1.5px solid var(--border, #c5e8e3);
      border-radius: var(--radius-sm, 10px);
      font-size: 0.88rem;
      font-family: 'Nunito', sans-serif;
      outline: none;
      background: var(--white, #ffffff);
      color: var(--text, #1a3a35);
      cursor: pointer;
    }
    .rf-filter-label {
      font-size: 0.78rem; font-weight: 700;
      color: var(--text-muted, #5a7a75);
      font-family: 'Poppins', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .rf-btn-primary {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: #ffffff;
      border: none;
      border-radius: var(--radius-sm, 10px);
      padding: 10px 22px;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      font-family: 'Poppins', sans-serif;
      letter-spacing: 0.03em;
      box-shadow: 0 4px 12px rgba(26,155,140,0.2);
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      white-space: nowrap;
    }
    .rf-btn-primary:hover { transform: translateY(-1px); filter: brightness(1.05); box-shadow: 0 6px 16px rgba(26,155,140,0.28); }

    .rf-btn-secondary {
      background: var(--white, #ffffff);
      color: var(--primary);
      border: 1.5px solid var(--primary);
      border-radius: var(--radius-sm, 10px);
      padding: 9px 20px;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      font-family: 'Poppins', sans-serif;
      letter-spacing: 0.03em;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      white-space: nowrap;
    }
    .rf-btn-secondary:hover { background: var(--primary-light); transform: translateY(-1px); }

    .rf-table-wrap {
      background: var(--white, #ffffff);
      border-top: none;
      overflow-x: auto;
    }
    .rf-table { width: 100%; border-collapse: collapse; min-width: 960px; }
    .rf-th {
      padding: 14px 16px;
      background: var(--bg2, #f0faf8);
      color: var(--primary);
      font-weight: 700;
      font-size: 0.72rem;
      font-family: 'Poppins', sans-serif;
      text-align: left;
      border-bottom: 1.5px solid var(--border, #c5e8e3);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }
    .rf-tr { border-bottom: 1px solid var(--border, #c5e8e3); transition: background 0.15s; }
    .rf-tr:hover { background: var(--bg2, #f0faf8); }
    .rf-td {
      padding: 13px 16px;
      font-size: 0.85rem;
      font-family: 'Nunito', sans-serif;
      color: var(--text, #1a3a35);
      vertical-align: middle;
    }
    .rf-badge {
      border-radius: 20px;
      padding: 3px 10px;
      font-size: 0.78rem;
      font-weight: 700;
      white-space: nowrap;
      font-family: 'Poppins', sans-serif;
      background: var(--primary-light);
      color: var(--primary-dark);
    }
    .rf-action-btn {
      border: none;
      border-radius: 7px;
      padding: 6px 9px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .rf-action-btn:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0,0,0,0.12); }
    .rf-empty {
      padding: 64px 20px;
      text-align: center;
      color: var(--text-muted, #5a7a75);
      font-size: 0.92rem;
      font-family: 'Nunito', sans-serif;
    }

    .rf-pagination {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 10px;
      padding: 18px 28px;
      border-top: 1.5px solid var(--border, #c5e8e3);
      background: var(--bg2, #f0faf8);
    }
    .rf-page-info { color: var(--text-muted, #5a7a75); font-size: 0.83rem; font-family: 'Nunito', sans-serif; }
    .rf-page-controls { display: flex; align-items: center; gap: 6px; }
    .rf-page-btn {
      min-width: 32px; height: 32px;
      border: 1.5px solid var(--border, #c5e8e3);
      border-radius: 7px;
      background: var(--white, #ffffff);
      color: var(--text, #1a3a35);
      font-size: 0.88rem; font-weight: 700;
      cursor: pointer;
      font-family: 'Poppins', sans-serif;
      transition: all 0.18s;
    }
    .rf-page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
    .rf-page-btn:disabled { opacity: 0.35; cursor: default; }
    .rf-page-btn-active {
      min-width: 32px; height: 32px;
      border: 1.5px solid var(--primary);
      border-radius: 7px;
      background: var(--primary);
      color: #fff;
      font-size: 0.88rem; font-weight: 700;
      cursor: default;
      font-family: 'Poppins', sans-serif;
    }

    /* Modal */
    .rf-overlay {
      position: fixed; inset: 0;
      background: rgba(26,58,53,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 5000; padding: 20px;
    }
    .rf-modal {
      background: var(--white, #ffffff);
      border-radius: var(--radius, 16px);
      box-shadow: 0 24px 64px rgba(26,155,140,0.22);
      width: 100%; max-width: 880px; max-height: 92vh;
      display: flex; flex-direction: column;
      animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .rf-modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 24px 30px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      border-radius: var(--radius, 16px) var(--radius, 16px) 0 0;
      flex-shrink: 0;
    }
    .rf-modal-title {
      font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 1.1rem; color: #fff;
    }
    .rf-close-btn {
      background: none; border: 1.5px solid rgba(255,255,255,0.55);
      border-radius: 50%; width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #fff; transition: background 0.18s;
    }
    .rf-close-btn:hover { background: rgba(255,255,255,0.15); }
    .rf-modal-body { padding: 24px 30px 28px; overflow-y: auto; overflow-x: hidden; flex: 1; }
    .rf-modal-footer {
      display: flex; justify-content: flex-end; gap: 12px;
      padding: 16px 30px; border-top: 1.5px solid var(--border, #c5e8e3); flex-shrink: 0;
    }
    .rf-section-header {
      margin: 22px 0 10px 0;
      font-size: 0.78rem; font-weight: 800;
      color: var(--primary);
      font-family: 'Poppins', sans-serif;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--primary-light);
    }
    .rf-detail-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .rf-detail-item {
      display: flex; flex-direction: column; gap: 3px;
      padding: 9px 12px;
      background: var(--bg2, #f0faf8);
      border-radius: 8px;
      border: 1px solid var(--border, #c5e8e3);
    }
    .rf-detail-label {
      font-size: 0.7rem; font-weight: 800; color: var(--primary);
      text-transform: uppercase; letter-spacing: 0.03em;
      font-family: 'Poppins', sans-serif;
    }
    .rf-detail-value {
      font-size: 0.88rem; font-weight: 600; color: var(--text, #1a3a35);
      font-family: 'Nunito', sans-serif;
    }

    /* Toast */
    .rf-toast {
      position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
      color: #fff; padding: 13px 26px; border-radius: 10px;
      font-weight: 700; z-index: 9999; font-size: 0.9rem;
      font-family: 'Nunito', sans-serif;
      box-shadow: 0 6px 20px rgba(0,0,0,0.18);
      display: flex; align-items: center; gap: 8px;
      animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Loading */
    .rf-loading {
      padding: 64px 0;
      text-align: center;
      color: var(--text-muted, #5a7a75);
      font-family: 'Nunito', sans-serif;
      font-size: 0.95rem;
    }

    @media (max-width: 640px) {
      .rf-detail-grid { grid-template-columns: 1fr 1fr !important; }
      .rf-toolbar { padding: 16px !important; }
      .rf-header-banner { padding: 22px 18px !important; }
    }

    /* ── Docs modal ── */
    .rf-docs-list { display: flex; flex-direction: column; gap: 8px; }
    .rf-doc-row {
      display: flex; align-items: center;
      gap: 12px; padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid var(--border, #c5e8e3);
      background: var(--bg2, #f0faf8);
    }
    .rf-doc-row.rf-doc-uploaded { border-color: #b2dfcc; background: #f0fdf4; }
    .rf-doc-row.rf-doc-missing  { border-color: #f5c6c6; background: #fdf5f5; opacity: 0.85; }
    .rf-doc-status-icon { font-size: 1rem; flex-shrink: 0; }
    .rf-doc-info { flex: 1; min-width: 0; }
    .rf-doc-name {
      font-family: 'Poppins', sans-serif; font-weight: 700;
      font-size: 0.82rem; color: var(--text, #1a3a35);
    }
    .rf-doc-meta {
      font-family: 'Nunito', sans-serif; font-size: 0.74rem;
      color: var(--text-muted, #5a7a75); margin-top: 1px;
    }
    .rf-doc-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .rf-doc-btn {
      border: none; border-radius: 7px;
      padding: 5px 9px; cursor: pointer;
      font-size: 0.74rem; font-weight: 700;
      font-family: 'Poppins', sans-serif;
      display: inline-flex; align-items: center; gap: 5px;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .rf-doc-btn:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0,0,0,0.1); }
    .rf-doc-btn-dl  { background: var(--primary-light); color: var(--primary-dark); }
    .rf-doc-btn-del { background: #fce8e8; color: #c0392b; }

    .rf-link-box {
      margin-top: 18px; padding: 14px 16px;
      background: var(--bg2, #f0faf8);
      border: 1.5px dashed var(--border, #c5e8e3);
      border-radius: 10px;
    }
    .rf-link-label {
      font-family: 'Poppins', sans-serif; font-weight: 800;
      font-size: 0.72rem; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--primary);
      margin-bottom: 8px;
    }
    .rf-link-row { display: flex; gap: 8px; align-items: center; }
    .rf-link-url {
      flex: 1; padding: 8px 12px;
      border: 1.5px solid var(--border, #c5e8e3);
      border-radius: 8px; font-size: 0.8rem;
      font-family: 'Nunito', sans-serif;
      background: #fff; color: var(--text, #1a3a35);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      user-select: all; cursor: text;
    }
    .rf-copy-btn {
      border: none; border-radius: 8px;
      padding: 8px 14px; cursor: pointer;
      font-size: 0.8rem; font-weight: 700;
      font-family: 'Poppins', sans-serif;
      background: var(--primary-light); color: var(--primary-dark);
      transition: all 0.18s; white-space: nowrap;
    }
    .rf-copy-btn:hover { background: var(--primary); color: #fff; }
  `}</style>
);

export default function RespuestasFormularioCrud() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [civilFilter, setCivilFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [toast, setToast] = useState(null);
  const [docsModal, setDocsModal] = useState({ open: false, row: null, data: null, loading: false });
  const POR_PAGINA = 10;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchResponses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/respuestas-ingresos');
      setData(res.data ?? []);
    } catch (e) {
      console.error(e);
      showToast('Error al cargar las respuestas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResponses(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/respuestas-ingresos/${id}`);
      setData(prev => prev.filter(r => r.id !== id));
      showToast('Respuesta eliminada correctamente');
    } catch (e) {
      showToast('Error al eliminar: ' + (e.response?.data?.message || e.message), 'error');
    }
  };

  const handleOpenDocs = async (row) => {
    setDocsModal({ open: true, row, data: null, loading: true });
    try {
      const res = await api.get(`/documentos-contratacion/${row.documento}`);
      setDocsModal(prev => ({ ...prev, data: res.data, loading: false }));
    } catch {
      setDocsModal(prev => ({ ...prev, loading: false }));
      showToast('Error al cargar los documentos', 'error');
    }
  };

  const handleDownloadDoc = async (documento, tipo, nombreOriginal) => {
    try {
      const res = await api.get(
        `/documentos-contratacion/${documento}/${encodeURIComponent(tipo)}/download`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = nombreOriginal;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast('Error al descargar el documento', 'error');
    }
  };

  const handleDeleteDoc = async (documento, tipo) => {
    if (!confirm('¿Eliminar este documento? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/documentos-contratacion/${documento}/${encodeURIComponent(tipo)}`);
      setDocsModal(prev => ({
        ...prev,
        data: prev.data ? {
          ...prev.data,
          archivos: Object.fromEntries(
            Object.entries(prev.data.archivos ?? {}).filter(([k]) => k !== tipo)
          ),
        } : null,
      }));
      showToast('Documento eliminado');
    } catch {
      showToast('Error al eliminar el documento', 'error');
    }
  };

  const handleOpenView = (row) => {
    setSelectedResponse(row);
    setIsModalOpen(true);
  };

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchSearch = [row.nombres, row.apellidos, row.documento, row.correo, row.celular, row.profesion]
        .some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()));
      const matchCivil = civilFilter === 'Todos' || String(row.estado_civil ?? '').toUpperCase() === civilFilter.toUpperCase();
      return matchSearch && matchCivil;
    });
  }, [data, search, civilFilter]);

  const totalPaginas = Math.max(1, Math.ceil(filteredData.length / POR_PAGINA));
  const paginatedData = filteredData.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <PageStyles />

      <div className="rf-card rf-animate">
        {/* Header Banner */}

        {/* Toolbar */}
        <div className="rf-toolbar">
          <div className="rf-filters">
            <div className="rf-search-wrap">
              <span className="rf-search-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar por nombre, documento, correo, celular..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPagina(1); }}
                className="rf-search-input"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="rf-filter-label">Estado Civil:</label>
              <select
                value={civilFilter}
                onChange={e => { setCivilFilter(e.target.value); setPagina(1); }}
                className="rf-filter-select"
              >
                {ESTADO_CIVIL_FILTERS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="rf-btn-secondary" onClick={fetchResponses}>Actualizar listado</button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="rf-loading">Cargando respuestas del formulario...</div>
        ) : (
          <div className="rf-table-wrap">
            <table className="rf-table">
              <thead>
                <tr>
                  <th className="rf-th">#</th>
                  <th className="rf-th">F. Registro</th>
                  <th className="rf-th">Documento</th>
                  <th className="rf-th">Nombre completo</th>
                  <th className="rf-th">Correo electrónico</th>
                  <th className="rf-th">Celular</th>
                  <th className="rf-th">EPS / AFP</th>
                  <th className="rf-th">Tallas (C · P · Z)</th>
                  <th className="rf-th" style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, index) => (
                  <tr key={row.id} className="rf-tr">
                    <td className="rf-td" style={{ color: 'var(--text-muted, #5a7a75)', fontWeight: 600 }}>
                      {(pagina - 1) * POR_PAGINA + index + 1}
                    </td>
                    <td className="rf-td" style={{ whiteSpace: 'nowrap', color: 'var(--text-muted, #5a7a75)' }}>
                      {row.created_at ? row.created_at.substring(0, 16) : '—'}
                    </td>
                    <td className="rf-td" style={{ fontWeight: 700 }}>{row.documento}</td>
                    <td className="rf-td" style={{ fontWeight: 700 }}>{row.nombres} {row.apellidos}</td>
                    <td className="rf-td">{row.correo}</td>
                    <td className="rf-td">{row.celular}</td>
                    <td className="rf-td">
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{row.eps}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #5a7a75)', marginTop: 2 }}>{row.afp}</div>
                    </td>
                    <td className="rf-td">
                      <span className="rf-badge">{row.talla_camisa} · {row.talla_pantalon} · {row.talla_zapatos}</span>
                    </td>
                    <td className="rf-td" style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          className="rf-action-btn"
                          style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)' }}
                          title="Ver detalles"
                          onClick={() => handleOpenView(row)}
                        >
                          <IconEye size={15} />
                        </button>
                        <button
                          className="rf-action-btn"
                          style={{ background: '#e8f0fb', color: '#2563eb' }}
                          title="Ver documentos de contratación"
                          onClick={() => handleOpenDocs(row)}
                        >
                          <IconFolder size={15} />
                        </button>
                        <button
                          className="rf-action-btn"
                          style={{ background: '#fce8e8', color: '#c0392b' }}
                          title="Eliminar registro"
                          onClick={() => handleDelete(row.id)}
                        >
                          <IconTrash size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr><td colSpan="9" className="rf-empty">No se encontraron respuestas registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredData.length > POR_PAGINA && (
          <div className="rf-pagination">
            <span className="rf-page-info">
              Página {pagina} de {totalPaginas} · {filteredData.length} registros en total
            </span>
            <div className="rf-page-controls">
              <button
                className="rf-page-btn"
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
              >‹</button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPagina(n)}
                  className={n === pagina ? 'rf-page-btn-active' : 'rf-page-btn'}
                >{n}</button>
              ))}
              <button
                className="rf-page-btn"
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
              >›</button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {isModalOpen && selectedResponse && (
        <div className="rf-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="rf-modal" onClick={e => e.stopPropagation()}>
            <div className="rf-modal-header">
              <span className="rf-modal-title">
                Detalle del Formulario — {selectedResponse.nombres} {selectedResponse.apellidos}
              </span>
              <button className="rf-close-btn" onClick={() => setIsModalOpen(false)}>
                <IconClose size={14} />
              </button>
            </div>
            <div className="rf-modal-body">
              <div style={{ marginBottom: 20, padding: '12px 16px', borderLeft: '4px solid var(--primary)', background: 'var(--bg2, #f0faf8)', borderRadius: '0 8px 8px 0', fontSize: '0.85rem', color: 'var(--text-muted, #5a7a75)', fontFamily: 'Nunito,sans-serif' }}>
                ℹ Copia esta información y completa los campos correspondientes del Empleado o Contrato en el ERP según sea necesario.
              </div>

              <div className="rf-section-header">1. Información Personal</div>
              <div className="rf-detail-grid">
                <DetailItem label="Número de documento" value={selectedResponse.documento} />
                <DetailItem label="Nombres completos" value={selectedResponse.nombres} />
                <DetailItem label="Apellidos completos" value={selectedResponse.apellidos} />
                <DetailItem label="Fecha de nacimiento" value={selectedResponse.fecha_nacimiento} />
                <DetailItem label="Lugar de nacimiento" value={selectedResponse.lugar_nacimiento} />
                <DetailItem label="Estado civil" value={selectedResponse.estado_civil} />
                <DetailItem label="Número de hijos" value={selectedResponse.numero_hijos} />
                <DetailItem label="Tipo de sangre" value={selectedResponse.rh} />
                <DetailItem label="Nivel de escolaridad" value={selectedResponse.nivel_escolaridad} />
                <DetailItem label="Profesión / Ocupación" value={selectedResponse.profesion} />
              </div>

              <div className="rf-section-header">2. Información de Contacto y Residencia</div>
              <div className="rf-detail-grid">
                <DetailItem label="Ciudad de residencia" value={selectedResponse.ciudad} />
                <DetailItem label="Barrio" value={selectedResponse.barrio} />
                <DetailItem label="Dirección completa" value={selectedResponse.direccion} />
                <DetailItem label="Estrato socioeconómico" value={selectedResponse.estrato} />
                <DetailItem label="Correo electrónico" value={selectedResponse.correo} />
                <DetailItem label="Celular" value={selectedResponse.celular} />
              </div>

              <div className="rf-section-header">3. Contacto en Caso de Emergencia</div>
              <div className="rf-detail-grid">
                <DetailItem label="Nombre del contacto" value={selectedResponse.emergencia_nombre} />
                <DetailItem label="Teléfono de emergencia" value={selectedResponse.emergencia_telefono} />
                <DetailItem label="Parentesco" value={selectedResponse.emergencia_parentesco} />
              </div>

              <div className="rf-section-header">4. Afiliaciones a Seguridad Social</div>
              <div className="rf-detail-grid">
                <DetailItem label="E.P.S. (Salud)" value={selectedResponse.eps} />
                <DetailItem label="A.F.P. (Fondo de Pensiones)" value={selectedResponse.afp} />
              </div>

              <div className="rf-section-header">5. Tallas de Dotación (Uniformes)</div>
              <div className="rf-detail-grid">
                <DetailItem label="Talla de camisa" value={selectedResponse.talla_camisa} />
                <DetailItem label="Talla de pantalón" value={selectedResponse.talla_pantalon} />
                <DetailItem label="Talla de zapatos" value={selectedResponse.talla_zapatos} />
              </div>
            </div>
            <div className="rf-modal-footer">
              <button className="rf-btn-secondary" onClick={() => setIsModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Documentos Modal */}
      {docsModal.open && docsModal.row && (
        <DocsModal
          row={docsModal.row}
          data={docsModal.data}
          loading={docsModal.loading}
          onClose={() => setDocsModal({ open: false, row: null, data: null, loading: false })}
          onDownload={handleDownloadDoc}
          onDelete={handleDeleteDoc}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className="rf-toast"
          style={{ background: toast.type === 'success' ? '#1a9b8c' : '#c0392b' }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rf-detail-item">
      <span className="rf-detail-label">{label}</span>
      <span className="rf-detail-value">{value || '—'}</span>
    </div>
  );
}

function DocsModal({ row, data, loading, onClose, onDownload, onDelete }) {
  const [copied, setCopied] = React.useState(false);
  const uploadUrl = `${window.location.origin}/carga-documentos?doc=${row.documento}`;
  const archivos  = data?.archivos ?? {};

  const handleCopy = () => {
    navigator.clipboard.writeText(uploadUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rf-overlay" onClick={onClose}>
      <div className="rf-modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="rf-modal-header">
          <span className="rf-modal-title">
            Documentos de Contratación — {row.nombres} {row.apellidos}
          </span>
          <button className="rf-close-btn" onClick={onClose}>
            <IconClose size={14} />
          </button>
        </div>
        <div className="rf-modal-body">
          {loading ? (
            <div className="rf-loading">Cargando documentos...</div>
          ) : (
            <>
              <div className="rf-section-header" style={{ marginTop: 0 }}>
                Estado de documentos · {row.documento}
              </div>
              <div className="rf-docs-list">
                {DOCS_LIST.map(doc => {
                  const arch = archivos[doc.id];
                  return (
                    <div
                      key={doc.id}
                      className={`rf-doc-row ${arch ? 'rf-doc-uploaded' : 'rf-doc-missing'}`}
                    >
                      <span className="rf-doc-status-icon">{arch ? '✅' : (doc.required ? '❌' : '➖')}</span>
                      <div className="rf-doc-info">
                        <div className="rf-doc-name">{doc.label}</div>
                        {arch ? (
                          <div className="rf-doc-meta">
                            {arch.nombre_original} · {arch.uploaded_at?.substring(0, 16) ?? ''}
                          </div>
                        ) : (
                          <div className="rf-doc-meta">{doc.required ? 'No subido — obligatorio' : 'No subido — opcional'}</div>
                        )}
                      </div>
                      {arch && (
                        <div className="rf-doc-actions">
                          <button
                            className="rf-doc-btn rf-doc-btn-dl"
                            onClick={() => onDownload(row.documento, doc.id, arch.nombre_original)}
                          >
                            ⬇ Descargar
                          </button>
                          <button
                            className="rf-doc-btn rf-doc-btn-del"
                            onClick={() => onDelete(row.documento, doc.id)}
                          >
                            🗑
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rf-link-box">
                <div className="rf-link-label">Enlace para el candidato</div>
                <div className="rf-link-row">
                  <div className="rf-link-url">{uploadUrl}</div>
                  <button className="rf-copy-btn" onClick={handleCopy}>
                    {copied ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="rf-modal-footer">
          <button className="rf-btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
