import React, { useState, useEffect } from 'react';
import {
  IconEye,
  IconEdit,
  IconTrash,
  IconClose
} from '../components/Icons';

/* ─── Mock Data ──────────────────────────────────────────────────────── */
const INITIAL_DATA = [
  {
    id: 1,
    nro_identificacion_proceso: 'REQ65',
    nro_identificacion: '123456789',
    estado: 'Abierta',
    cargo: 'Analista de datos',
    fecha_solicitud: '16 mayo 2026',
    contratadas_requeridas: '2 / 1',
    proyecto: 'SM: DIRECTV',
    tipo_solicitud: 'RP: Reemplazo',
    responsable: 'JORGE EMILIO VARON - jorgevaron@servimercadeo.com',
    proceso: 'Administrativo',
    ciudad: 'Pereira'
  }
];

const MOCK_OPTS = {
  responsables: ['Jorge Emilio Varón', 'Ana Gómez', 'Luis Martínez'],
  procesos: ['Administrativo', 'Operativo', 'Comercial', 'Tecnología'],
  cargos: ['Analista de datos', 'Desarrollador', 'Gerente', 'Asistente'],
  tipos: ['RP: Reemplazo', 'CN: Cargo Nuevo'],
  numeros: ['1', '2', '3', '4', '5'],
  proyectos: ['SM: DIRECTV', 'SM: CLARO', 'Proyecto Interno'],
  paises: ['Colombia', 'Perú', 'Ecuador', 'México'],
  estados: ['Abierta', 'En proceso', 'Cerrada', 'Cancelada'],
  sino: ['Sí', 'No']
};

function getPaginasBotones(pagina, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 2;
  const left = pagina - delta;
  const right = pagina + delta;
  const pages = [1];
  if (left > 2) pages.push("...");
  for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i++) pages.push(i);
  if (right < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export default function SeleccionCrud() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('seleccionData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_DATA;
  });

  useEffect(() => {
    localStorage.setItem('seleccionData', JSON.stringify(data));
  }, [data]);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Abierta');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [form, setForm] = useState({});
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  useEffect(() => {
    setPagina(1);
  }, [searchTerm, estadoFilter]);

  const handleOpenModal = (mode, row = null) => {
    setModalMode(mode);
    if (mode === 'create') {
      let nextReqNumber = 66;
      if (data.length > 0) {
        const reqNumbers = data
          .map(d => parseInt(String(d.nro_identificacion_proceso).replace(/[^0-9]/g, ''), 10))
          .filter(n => !isNaN(n));
        if (reqNumbers.length > 0) {
          nextReqNumber = Math.max(...reqNumbers) + 1;
        }
      }
      setForm({
        fecha_solicitud: '21 mayo 2026',
        numero_identificacion_proceso: `REQ${nextReqNumber}`,
        estado: 'Abierta',
        solicitud_confidencial: 'No'
      });
    } else if (row) {
      setForm({
        id: row.id,
        nombre_responsable: row.responsable.split(' - ')[0],
        numero_identificacion: row.nro_identificacion || '123456789',
        cargo_solicitante: row.cargo || 'Coordinador',
        fecha_solicitud: row.fecha_solicitud,
        proceso: row.proceso,
        numero_identificacion_proceso: row.nro_identificacion_proceso,
        cargo_requerido: row.cargo,
        tipo_solicitud: row.tipo_solicitud,
        numero_personas: row.contratadas_requeridas.split(' / ')[1] || '1',
        proyecto: row.proyecto,
        fecha_ingreso: '2026-05-25',
        pais: 'Colombia',
        fecha_cierre: '2026-06-15',
        ciudad: row.ciudad,
        observaciones: '',
        estado: row.estado,
        solicitud_confidencial: 'No'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSave = () => {
    if (modalMode === 'create') {
      const newId = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;
      const newRow = {
        id: newId,
        nro_identificacion: form.numero_identificacion || '-',
        nro_identificacion_proceso: form.numero_identificacion_proceso || `REQ${newId + 100}`,
        estado: form.estado || 'Abierta',
        cargo: form.cargo_requerido || form.cargo_solicitante || 'Sin definir',
        fecha_solicitud: form.fecha_solicitud || '21 mayo 2026',
        contratadas_requeridas: `0 / ${form.numero_personas || '1'}`,
        proyecto: form.proyecto || 'Sin definir',
        tipo_solicitud: form.tipo_solicitud || 'RP: Reemplazo',
        responsable: form.nombre_responsable ? `${form.nombre_responsable} - solicitante@servimercadeo.com` : 'No asignado',
        proceso: form.proceso || 'Sin definir',
        ciudad: form.ciudad || 'Sin definir'
      };
      setData([newRow, ...data]);
    } else if (modalMode === 'edit') {
      setData(data.map(row => {
        if (row.id === form.id) {
          return {
            ...row,
            estado: form.estado || row.estado,
            nro_identificacion: form.numero_identificacion || row.nro_identificacion,
            nro_identificacion_proceso: form.numero_identificacion_proceso || row.nro_identificacion_proceso,
            cargo: form.cargo_requerido || row.cargo,
            proyecto: form.proyecto || row.proyecto,
            tipo_solicitud: form.tipo_solicitud || row.tipo_solicitud,
            proceso: form.proceso || row.proceso,
            ciudad: form.ciudad || row.ciudad,
            contratadas_requeridas: `0 / ${form.numero_personas || '1'}`,
          };
        }
        return row;
      }));
    }
    setIsModalOpen(false);
  };

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isModalOpen]);

  const handleChange = (k) => (e) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
  };

  const filteredData = data.filter(row => {
    const matchesSearch = Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesEstado = estadoFilter === 'Todas' ? true : row.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  const totalPaginas = Math.max(1, Math.ceil(filteredData.length / POR_PAGINA));
  const paginatedData = filteredData.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const getEstadoColors = (estado) => {
    const e = estado ? estado.toLowerCase() : '';
    if (e === 'abierta' || e === 'activa') return { bg: '#d1fae5', color: '#065f46' };
    if (e === 'cerrada' || e === 'inactiva') return { bg: '#fee2e2', color: '#991b1b' };
    if (e === 'en proceso') return { bg: '#fef3c7', color: '#92400e' };
    return { bg: 'var(--bg)', color: 'var(--text-muted)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>

      {/* ── Toolbar ── */}
      <div style={S.toolbar}>

        {/* Left: Search + Estado */}
        <div style={S.filters}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar requisición, cargo o proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={S.searchInput}
            />
          </div>

          <div style={S.estadoWrap}>
            <label style={S.estadoLabel}>Estado:</label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              style={S.estadoSelect}
            >
              <option value="Todas">Todas</option>
              <option value="Abierta">Abierta</option>
              <option value="En proceso">En proceso</option>
              <option value="Cerrada">Cerrada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Right: Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={S.filterBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            Actualizar
          </button>
          <button style={S.btnPrimary} onClick={() => handleOpenModal('create')}>
            + Nueva requisición
          </button>
        </div>

      </div>

      {/* ── Tabla ── */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Item</th>
              <th style={S.th}>Nro. ID proceso</th>
              <th style={S.th}>Estado</th>
              <th style={S.th}>Cargo requerido</th>
              <th style={S.th}>Fecha solicitud</th>
              <th style={S.th}>Proyecto</th>
              <th style={S.th}>Tipo solicitud</th>
              <th style={S.th}>Ciudad operación</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => {
              const itemIndex = (pagina - 1) * POR_PAGINA + index + 1;
              const estColors = getEstadoColors(row.estado);
              return (
                <tr key={row.id} style={S.tr}>
                  <td style={S.td}>{itemIndex}</td>
                  <td style={S.td}>{row.nro_identificacion_proceso}</td>
                  <td style={S.td}>
                    <span style={S.badge(estColors.bg, estColors.color)}>
                      {row.estado}
                    </span>
                  </td>
                  <td style={S.td}>{row.cargo}</td>
                  <td style={S.td}>{row.fecha_solicitud}</td>
                  <td style={S.td}>{row.proyecto}</td>
                  <td style={S.td}>{row.tipo_solicitud}</td>
                  <td style={S.td}>{row.ciudad}</td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <div style={S.actions}>
                      <button style={S.actionBtn('#e8f0ff', '#1a4fa8')} title="Ver detalles" onClick={() => handleOpenModal('view', row)}>
                        <IconEye size={15} />
                      </button>
                      <button style={S.actionBtn('#e8f8f5', 'var(--primary-dark)')} title="Editar" onClick={() => handleOpenModal('edit', row)}>
                        <IconEdit size={15} />
                      </button>
                      <button style={S.actionBtn('#fce8e8', '#a33')} title="Eliminar">
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="9" style={S.empty}>
                  No hay requisiciones que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Paginación ── */}
      {filteredData.length > 0 && (
        <div style={S.paginationWrap}>
          <span style={S.pageInfo}>
            Página {pagina} · Mostrando {Math.min(POR_PAGINA, filteredData.length - (pagina - 1) * POR_PAGINA)} de {filteredData.length} registros
          </span>
          <div style={S.pageControls}>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={S.pageBtn(pagina === 1)}>‹</button>
            {getPaginasBotones(pagina, totalPaginas).map((n, i) =>
              n === "..." ? (
                <span key={`ellipsis-${i}`} style={S.pageEllipsis}>…</span>
              ) : (
                <button key={n} onClick={() => setPagina(n)} style={n === pagina ? S.pageBtnActive : S.pageBtn(false)}>
                  {n}
                </button>
              )
            )}
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} style={S.pageBtn(pagina === totalPaginas)}>›</button>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {isModalOpen && (
        <div style={S.overlay} onClick={handleCloseModal}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>

            <div style={S.modalHeaderGreen}>
              <span style={S.modalTitleWhite}>
                {modalMode === 'create' ? 'Registrar nueva requisición' : modalMode === 'edit' ? 'Editar requisición' : 'Detalles de la requisición'}
              </span>
              <button style={S.closeBtnWhite} onClick={handleCloseModal}>
                <IconClose size={14} />
              </button>
            </div>

            <div style={S.modalBody}>
              <div style={S.grid3}>
                <Field label="Nombre responsable solicitud" k="nombre_responsable" req={modalMode !== 'view'} opts={MOCK_OPTS.responsables} form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Número de identificación" k="numero_identificacion" req={modalMode !== 'view'} form={form} onChange={handleChange} disabled={modalMode === 'view' || modalMode === 'edit'} />
                <Field label="Cargo del solicitante" k="cargo_solicitante" req={modalMode !== 'view'} form={form} onChange={handleChange} disabled={modalMode === 'view' || modalMode === 'edit'} />

                <Field label="Fecha de solicitud" k="fecha_solicitud" req={modalMode !== 'view'} disabled form={form} onChange={handleChange} />
                <Field label="Proceso" k="proceso" req={modalMode !== 'view'} opts={MOCK_OPTS.procesos} form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Número de identificación del proceso" k="numero_identificacion_proceso" req={modalMode !== 'view'} disabled form={form} onChange={handleChange} />

                <Field label="Cargo requerido" k="cargo_requerido" req={modalMode !== 'view'} opts={MOCK_OPTS.cargos} form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Tipo de solicitud" k="tipo_solicitud" req={modalMode !== 'view'} opts={MOCK_OPTS.tipos} form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Número de personas requeridas" k="numero_personas" req={modalMode !== 'view'} opts={MOCK_OPTS.numeros} form={form} onChange={handleChange} disabled={modalMode === 'view'} />

                <Field label="Proyecto" k="proyecto" req={modalMode !== 'view'} opts={MOCK_OPTS.proyectos} form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Fecha estimada de ingreso" k="fecha_ingreso" req={modalMode !== 'view'} type="date" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="País" k="pais" req={modalMode !== 'view'} opts={MOCK_OPTS.paises} form={form} onChange={handleChange} disabled={modalMode === 'view'} />

                <Field label="Fecha estimada de cierre" k="fecha_cierre" req={modalMode !== 'view'} type="date" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Ciudad de operación" k="ciudad" req={modalMode !== 'view'} form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Observaciones de la solicitud" k="observaciones" type="textarea" form={form} onChange={handleChange} disabled={modalMode === 'view'} />

                <Field label="Estado" k="estado" req={modalMode !== 'view'} opts={MOCK_OPTS.estados} form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="¿Es una solicitud confidencial?" k="solicitud_confidencial" req={modalMode !== 'view'} opts={MOCK_OPTS.sino} form={form} onChange={handleChange} disabled={modalMode === 'view'} />
              </div>
            </div>

            <div style={S.modalFooter}>
              {modalMode === 'view' ? (
                <button style={S.btnSecondary} onClick={handleCloseModal}>Cerrar</button>
              ) : (
                <>
                  <button style={S.btnSecondary} onClick={handleCloseModal}>Cancelar</button>
                  <button style={S.btnPrimaryGreen} onClick={handleSave}>Guardar requisición</button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function Field({ label, k, type = "text", opts, req, span, form, onChange, disabled }) {
  const wrapStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    minWidth: 0,
    ...(span ? { gridColumn: `span ${span}` } : {})
  };
  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
    fontFamily: 'Nunito,sans-serif',
    color: disabled ? 'var(--text-muted)' : 'var(--text)',
    background: disabled ? 'var(--bg)' : 'var(--white)',
    outline: 'none',
    transition: 'border 0.15s',
  };

  return (
    <div style={wrapStyle}>
      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
        {label}
        {req && <span style={{ color: '#e74c3c', marginLeft: 3 }}>*</span>}
      </label>
      {opts ? (
        <select style={inputStyle} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled}>
          <option value="">-- Selecciona --</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea style={{ ...inputStyle, minHeight: 40, resize: 'vertical' }} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled} />
      ) : (
        <input type={type} style={inputStyle} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled} />
      )}
    </div>
  );
}

const S = {
    /* Toolbar */
    toolbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
        flexWrap: "wrap",
    },
    filters: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        flex: 1,
    },
    searchWrap: { position: "relative", flex: 1, minWidth: 200, maxWidth: 380 },
    searchIcon: {
        position: "absolute",
        left: 11,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        color: "var(--text-muted)",
        pointerEvents: "none",
    },
    searchInput: {
        width: "100%",
        padding: "9px 12px 9px 34px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
        fontFamily: "Nunito,sans-serif",
        background: "var(--white)",
        color: "var(--text)",
        outline: "none",
    },
    estadoWrap: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 14px",
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        height: 38,
    },
    estadoLabel: {
        fontSize: "0.78rem",
        fontWeight: 700,
        color: "var(--text-muted)",
        fontFamily: "Nunito,sans-serif",
        whiteSpace: "nowrap",
    },
    estadoSelect: {
        border: "none",
        background: "transparent",
        outline: "none",
        fontSize: "0.88rem",
        fontFamily: "Nunito,sans-serif",
        color: "var(--text)",
        fontWeight: 700,
        cursor: "pointer",
        padding: "0",
    },
    filterBtn: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px",
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text)",
        fontSize: "0.9rem",
        fontWeight: 700,
        fontFamily: "Nunito,sans-serif",
        cursor: "pointer",
        whiteSpace: "nowrap",
    },

    /* Botones */
    btnPrimary: {
        padding: "10px 24px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
        transition: "background 0.18s",
        whiteSpace: "nowrap",
    },
    btnPrimaryGreen: {
        padding: "10px 20px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
    },
    btnSecondary: {
        padding: "10px 20px",
        background: "var(--bg)",
        color: "var(--text)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
    },

    /* Tabla */
    tableWrap: {
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        overflowX: "auto",
    },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 1000 },
    th: {
        padding: "14px 14px",
        background: "var(--bg)",
        color: "var(--primary)",
        fontWeight: 700,
        fontSize: "0.75rem",
        fontFamily: "Nunito,sans-serif",
        textAlign: "left",
        borderBottom: "1.5px solid var(--border)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
    },
    tr: { borderBottom: "1px solid var(--border)", transition: "background 0.15s" },
    td: {
        padding: "13px 14px",
        fontSize: "0.85rem",
        fontFamily: "Nunito,sans-serif",
        color: "var(--text)",
        textAlign: "left",
        verticalAlign: "middle",
    },
    badge: (bg, color) => ({
        background: bg,
        color,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: "0.78rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        fontFamily: "Nunito,sans-serif",
    }),
    actions: { display: "flex", gap: 6, justifyContent: "center" },
    actionBtn: (bg, color) => ({
        background: bg,
        border: "none",
        borderRadius: 6,
        padding: "5px 8px",
        cursor: "pointer",
        fontSize: "0.85rem",
        color,
        transition: "opacity 0.15s",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
    }),
    empty: {
        padding: "60px 20px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.9rem",
        fontFamily: "Nunito,sans-serif",
    },

    /* Paginación */
    paginationWrap: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 4,
        flexWrap: "wrap",
        gap: 10,
    },
    pageInfo: {
        color: "var(--text-muted)",
        fontSize: "0.85rem",
        fontFamily: "Nunito,sans-serif",
    },
    pageControls: { display: "flex", alignItems: "center", gap: 6 },
    pageBtn: (disabled) => ({
        minWidth: 32,
        height: 32,
        padding: "0 8px",
        border: "1.5px solid var(--border)",
        borderRadius: 6,
        background: "var(--white)",
        color: disabled ? "var(--text-muted)" : "var(--text)",
        fontSize: "0.88rem",
        fontWeight: 700,
        fontFamily: "Nunito,sans-serif",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
    }),
    pageBtnActive: {
        minWidth: 32,
        height: 32,
        padding: "0 8px",
        border: "1.5px solid var(--primary)",
        borderRadius: 6,
        background: "var(--primary)",
        color: "#fff",
        fontSize: "0.88rem",
        fontWeight: 700,
        fontFamily: "Nunito,sans-serif",
        cursor: "default",
    },
    pageEllipsis: {
        minWidth: 28,
        height: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: "0.88rem",
        userSelect: "none",
    },

    /* Modal */
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(26,58,53,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5000,
        padding: 20,
    },
    modal: {
        background: "var(--white)",
        borderRadius: "var(--radius)",
        boxShadow: "0 16px 60px rgba(26,155,140,0.22)",
        width: "100%",
        maxWidth: 900,
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
    },
    modalHeaderGreen: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "22px 28px",
        background: "var(--primary)",
        borderTopLeftRadius: "var(--radius)",
        borderTopRightRadius: "var(--radius)",
        flexShrink: 0,
    },
    modalTitleWhite: {
        fontFamily: "'Poppins',sans-serif",
        fontWeight: 700,
        fontSize: "1.2rem",
        color: "#fff",
    },
    closeBtnWhite: {
        background: "none",
        border: "1.5px solid rgba(255,255,255,0.6)",
        borderRadius: "50%",
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#fff",
    },
    modalBody: {
        padding: "22px 28px 28px",
        overflowY: "auto",
        overflowX: "hidden",
        flex: 1,
    },
    modalFooter: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
        padding: "16px 28px",
        borderTop: "1.5px solid var(--border)",
        flexShrink: 0,
    },
    grid3: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 14,
    },
};
