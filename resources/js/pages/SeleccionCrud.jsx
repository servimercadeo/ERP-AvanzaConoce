import React, { useState, useEffect } from 'react';
import {
  IconSearch,
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
    ciudad: 'pereira'
  }
];

const MOCK_OPTS = {
  responsables: ['JORGE EMILIO VARON', 'ANA GOMEZ', 'LUIS MARTINEZ'],
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
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [form, setForm] = useState({});
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  useEffect(() => {
    setPagina(1);
  }, [searchTerm, estadoFilter]);

  const handleOpenModal = (mode, row = null) => {
    setModalMode(mode);
    if (mode === 'create') {
      let nextReqNumber = 66; // Valor por defecto
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
      // Mapear datos de la fila (row) al formulario
      setForm({
        id: row.id, // Guardar ID para la edición
        nombre_responsable: row.responsable.split(' - ')[0], // Aproximación, depende de cómo se guarde
        numero_identificacion: row.nro_identificacion || '123456789', 
        cargo_solicitante: row.cargo || 'Coordinador', 
        fecha_solicitud: row.fecha_solicitud,
        proceso: row.proceso,
        numero_identificacion_proceso: row.nro_identificacion_proceso,
        cargo_requerido: row.cargo,
        tipo_solicitud: row.tipo_solicitud,
        numero_personas: row.contratadas_requeridas.split(' / ')[1] || '1',
        proyecto: row.proyecto,
        fecha_ingreso: '2026-05-25', // Mock
        pais: 'Colombia', // Mock
        fecha_cierre: '2026-06-15', // Mock
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
    // Cleanup en caso de que el componente se desmonte
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
    if (e === 'abierta' || e === 'activa') return { bg: '#d1fae5', text: '#065f46' };
    if (e === 'cerrada' || e === 'inactiva') return { bg: '#fee2e2', text: '#991b1b' };
    return { bg: '#f3f4f6', text: '#374151' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
      
      {/* ── Top Controls ── */}
      <div style={S.toolbar}>
        
        {/* Left Side (Search & Filters) */}
        <div style={S.filters}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar requisición..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={S.searchInput}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '20px', padding: '2px 14px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>ESTADO:</label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: '#111827', fontWeight: 500, padding: '6px 0', cursor: 'pointer' }}
            >
              <option value="Todas">Todas</option>
              <option value="Abierta">Abierta</option>
              <option value="Cerrada">Cerrada</option>
            </select>
          </div>
        </div>

        {/* Right Side (Buttons) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button style={{ ...S.btnFilter, background: '#f8fafc' }}>
            <span style={{ fontSize: '1.1rem' }}>↻</span> Actualizar
          </button>
          <button style={S.btnNuevo} onClick={() => handleOpenModal('create')}>
            + Crear nueva requisición
          </button>
        </div>

      </div>

      {/* ── Table ── */}
      <div style={S.tableContainer}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>ITEM</th>
              <th style={S.th}>NRO. ID PROCESO</th>
              <th style={S.th}>ESTADO</th>
              <th style={S.th}>CARGO REQUERIDO</th>
              <th style={S.th}>FECHA SOLICITUD</th>
              <th style={S.th}>PROYECTO</th>
              <th style={S.th}>TIPO SOLICITUD</th>
              <th style={S.th}>CIUDAD OPERACIÓN</th>
              <th style={{ ...S.th, textAlign: 'center' }}>ACCIONES</th>
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
                    <span style={S.badge(estColors.bg, estColors.text)}>
                      {row.estado}
                    </span>
                  </td>
                  <td style={S.td}>{row.cargo}</td>
                  <td style={S.td}>{row.fecha_solicitud}</td>
                  <td style={S.td}>{row.proyecto}</td>
                  <td style={S.td}>{row.tipo_solicitud}</td>
                  <td style={S.td}>{row.ciudad}</td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button style={S.actionBtn('#3b82f6', '#eff6ff')} title="Ver detalles" onClick={() => handleOpenModal('view', row)}>
                        <IconEye size={16} />
                      </button>
                      <button style={S.actionBtn('#10b981', '#ecfdf5')} title="Editar" onClick={() => handleOpenModal('edit', row)}>
                        <IconEdit size={16} />
                      </button>
                      <button style={S.actionBtn('#ef4444', '#fef2f2')} title="Eliminar">
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  No hay requisiciones que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredData.length > 0 && (
        <div style={S.paginationWrap}>
          <span style={S.pageInfo}>
            Página {pagina} · Mostrando {Math.min(POR_PAGINA, filteredData.length - (pagina - 1) * POR_PAGINA)} de {filteredData.length} registros
          </span>
          <div style={S.pageControls}>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={{ ...S.pageBtn(false), opacity: pagina === 1 ? 0.5 : 1 }}>‹</button>
            {getPaginasBotones(pagina, totalPaginas).map((n, i) =>
              n === "..." ? (
                <span key={`ellipsis-${i}`} style={S.pageEllipsis}>…</span>
              ) : (
                <button key={n} onClick={() => setPagina(n)} style={S.pageBtn(n === pagina)}>
                  {n}
                </button>
              )
            )}
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} style={{ ...S.pageBtn(false), opacity: pagina === totalPaginas ? 0.5 : 1 }}>›</button>
          </div>
        </div>
      )}

      {/* ── Modal Crear/Editar/Ver Requisición ── */}
      {isModalOpen && (
        <div style={S.overlay} onClick={handleCloseModal}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>
                {modalMode === 'create' ? 'Crear nueva requisición' : modalMode === 'edit' ? 'Editar requisición' : 'Detalles de la requisición'}
              </span>
              <button style={S.closeBtn} onClick={handleCloseModal}><IconClose size={18} /></button>
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
                <button style={S.btnCancel} onClick={handleCloseModal}>Cerrar</button>
              ) : (
                <>
                  <button style={S.btnCancel} onClick={handleCloseModal}>Cancelar</button>
                  <button style={S.btnSave} onClick={handleSave}>Guardar requisición</button>
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
  const style = {
    display: 'flex', flexDirection: 'column', gap: '6px',
    ...(span ? { gridColumn: `span ${span}` } : {})
  };
  const inputStyle = {
    padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
    fontSize: '0.95rem', outline: 'none',
    background: disabled ? '#f8fafc' : '#fff',
    color: disabled ? '#6b7280' : '#111827',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    width: '100%'
  };

  return (
    <div style={style}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
        {label}
        {req && <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold' }}>*</span>}
      </label>
      {opts ? (
        <select style={inputStyle} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled}>
          <option value="">-- Selecciona --</option>
          {opts.map(o => <option key={o} value={o}>{o.charAt ? o.charAt(0).toUpperCase() + o.slice(1) : o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea style={{ ...inputStyle, minHeight: '40px', resize: 'vertical' }} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled} />
      ) : (
        <input type={type} style={inputStyle} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled} />
      )}
    </div>
  );
}

const S = {
  // Toolbar
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '15px' },
  filters: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  searchInput: {
    padding: '10px 16px 10px 38px', borderRadius: '20px', border: '1px solid #e5e7eb',
    fontSize: '0.9rem', outline: 'none', minWidth: '280px', background: '#fff',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: '14px center', backgroundSize: '16px'
  },
  btnFilter: {
    padding: '10px 16px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fff',
    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#374151', fontWeight: 500
  },
  btnNuevo: {
    padding: '10px 20px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: '20px',
    cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px',
    boxShadow: '0 2px 4px rgba(13, 148, 136, 0.15)'
  },
  
  // Table
  tableContainer: {
    width: '100%', overflowX: 'auto', border: '1px solid #f0fdfa', borderRadius: '12px', background: '#fff',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
  },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '1000px' },
  th: {
    padding: '16px 14px', background: '#f0fdfa', color: '#115e59', fontWeight: 600, fontSize: '0.75rem',
    textAlign: 'left', borderBottom: '1px solid #ccfbf1', textTransform: 'uppercase', letterSpacing: '0.05em'
  },
  tr: { borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' },
  td: { padding: '14px', fontSize: '0.85rem', color: '#374151', textAlign: 'left', verticalAlign: 'middle' },
  
  // Badges
  badge: (bg, text) => ({
    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
    background: bg, color: text, display: 'inline-block', whiteSpace: 'nowrap'
  }),
  
  // Action Buttons
  actionBtn: (color, bg) => ({
    background: bg, border: 'none', color: color, cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px', transition: 'all 0.2s',
  }),
  
  // Pagination
  paginationWrap: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '0 8px', flexWrap: 'wrap', gap: '10px' },
  pageInfo: { color: '#6b7280', fontSize: '0.85rem' },
  pageControls: { display: 'flex', alignItems: 'center', gap: '6px' },
  pageBtn: (active) => ({
    padding: '6px 12px', background: active ? '#0d9488' : '#fff', color: active ? '#fff' : '#374151',
    border: `1px solid ${active ? '#0d9488' : '#e5e7eb'}`, borderRadius: '6px', cursor: 'pointer',
    fontSize: '0.85rem', fontWeight: active ? 600 : 500, transition: 'all 0.2s', minWidth: '32px'
  }),
  pageEllipsis: { padding: '6px', color: '#9ca3af' },

  // Modal
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overscrollBehavior: 'none', backdropFilter: 'blur(2px)' },
  modal: { background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', maxHeight: '90vh', overflow: 'hidden' },
  modalHeader: { padding: '20px 24px', background: '#0d9488', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.02em' },
  closeBtn: { background: 'none', border: 'none', color: '#ccfbf1', cursor: 'pointer', display: 'flex', padding: 4, transition: 'color 0.2s' },
  modalBody: { padding: '32px 24px', overflowY: 'auto', flex: 1, maxHeight: 'calc(90vh - 140px)', overscrollBehavior: 'contain', background: '#f8fafc' },
  modalFooter: { padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#fff' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' },
  btnCancel: { padding: '10px 18px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#4b5563', fontSize: '0.9rem', transition: 'all 0.2s' },
  btnSave: { padding: '10px 18px', background: '#0d9488', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#fff', fontSize: '0.9rem', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(13, 148, 136, 0.2)' }
};
