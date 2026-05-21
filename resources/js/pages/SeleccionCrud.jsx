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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Top Controls ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', padding: '16px 20px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        
        {/* Left Side (Search & Filters) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>Búsqueda:</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder=""
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={S.input}
              />
              <span style={{ position: 'absolute', right: '-24px', color: 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer' }} title="Información de búsqueda">
                ⓘ
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '24px' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', maxWidth: '120px', lineHeight: '1.2' }}>Filtro de estado de solicitudes:</label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              style={S.input}
            >
              <option value="Abierta">Abierta</option>
              <option value="Cerrada">Cerrada</option>
              <option value="Todas">Todas</option>
            </select>
          </div>
          
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '10px' }}>
            Número de coincidencias: {filteredData.length}
          </div>
        </div>

        {/* Right Side (Buttons) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '10px' }}>
            Número de personas contratadas / requeridas para todos los cargos: <span style={{ fontWeight: 'bold' }}>0 / 1</span>
          </div>
          <button style={S.btnActualizar}>
            <span style={{ fontSize: '1.1rem' }}>↻</span> Actualizar
          </button>
          <button style={S.btnNuevo} onClick={() => handleOpenModal('create')}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> Crear nueva requisición
          </button>
        </div>

      </div>

      {/* ── Table ── */}
      <div style={S.tableContainer}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Nro<br/>Identificación<br/>Proceso / ID<br/>interno</th>
              <th style={S.th}>Estado</th>
              <th style={S.th}>Cargo<br/>requerido</th>
              <th style={S.th}>Fecha de<br/>solicitud</th>
              <th style={S.th}>Número de<br/>personas<br/>contratadas<br/>/ requeridas</th>
              <th style={S.th}>Proyecto</th>
              <th style={S.th}>Tipo de<br/>solicitud</th>
              <th style={S.th}>Responsable<br/>de solicitud</th>
              <th style={S.th}>Proceso</th>
              <th style={S.th}>Ciudad de<br/>operación</th>
              <th style={S.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={row.id} style={S.tr}>
                <td style={S.td}>{row.nro_identificacion_proceso}</td>
                <td style={{ ...S.td, fontWeight: 700, color: row.estado === 'Abierta' ? '#27ae60' : 'var(--text)' }}>
                  {row.estado}
                </td>
                <td style={S.td}>{row.cargo}</td>
                <td style={S.td}>{row.fecha_solicitud}</td>
                <td style={S.td}>{row.contratadas_requeridas}</td>
                <td style={S.td}>{row.proyecto}</td>
                <td style={S.td}>{row.tipo_solicitud}</td>
                <td style={{ ...S.td, fontSize: '0.8rem', maxWidth: '160px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.responsable}</td>
                <td style={S.td}>{row.proceso}</td>
                <td style={S.td}>{row.ciudad}</td>
                <td style={{ ...S.td, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button style={S.actionBtn} title="Agregar">
                      <span style={{ border: '1.5px solid currentColor', borderRadius: '3px', padding: '0 3px', fontSize: '10px', fontWeight: 'bold' }}>+</span>
                    </button>
                    <button style={S.actionBtn} title="Editar" onClick={() => handleOpenModal('edit', row)}>
                      <IconEdit size={16} />
                    </button>
                    <button style={S.actionBtn} title="Ver detalles" onClick={() => handleOpenModal('view', row)}>
                      <IconEye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No hay requisiciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal Crear/Editar/Ver Requisición ── */}
      {isModalOpen && (
        <div style={S.overlay} onClick={handleCloseModal}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>
                {modalMode === 'create' ? 'Crear nueva requisición' : modalMode === 'edit' ? 'Editar requisición' : 'Detalles de la requisición'}
              </span>
              <button style={S.closeBtn} onClick={handleCloseModal}><IconClose size={16} /></button>
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
    display: 'flex', flexDirection: 'column', gap: '8px',
    ...(span ? { gridColumn: `span ${span}` } : {})
  };
  const inputStyle = {
    padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border)',
    fontSize: '0.95rem', outline: 'none',
    background: disabled ? '#f8f9fa' : '#fff',
    color: disabled ? '#7f8c8d' : 'var(--text)',
    fontFamily: 'inherit'
  };

  return (
    <div style={style}>
      <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2c3e50' }}>
        {label}
        {req && <span style={{ color: '#e74c3c', marginLeft: '4px', fontWeight: 'bold' }}>*</span>}
      </label>
      {opts ? (
        <select style={inputStyle} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled}>
          <option value="">-- Selecciona --</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
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
  input: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    background: 'var(--white)',
    color: 'var(--text)',
    outline: 'none',
    fontSize: '0.9rem',
    minWidth: '200px'
  },
  btnActualizar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: '#bdc3c7',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
    transition: 'background 0.2s'
  },
  btnNuevo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: '#1d4a86', // Navy blue from screenshot
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.95rem',
    transition: 'background 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--white)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1000px',
  },
  th: {
    padding: '12px 10px',
    background: 'var(--bg)',
    color: '#2980b9', // Blue color for headers based on screenshot
    fontWeight: 600,
    fontSize: '0.78rem',
    textAlign: 'center',
    borderBottom: '2px solid var(--border)',
    whiteSpace: 'nowrap',
    verticalAlign: 'bottom'
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.2s',
  },
  td: {
    padding: '12px 8px',
    fontSize: '0.85rem',
    color: 'var(--text)',
    textAlign: 'center',
    verticalAlign: 'middle'
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: '#333',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    transition: 'color 0.2s',
  },
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    overscrollBehavior: 'none'
  },
  modal: {
    background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '1000px',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'hidden'
  },
  modalHeader: {
    padding: '16px 24px', background: 'var(--primary)', color: '#fff', // matching the blue header style
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  modalTitle: { fontSize: '1.1rem', fontWeight: 600 },
  closeBtn: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: 0 },
  modalBody: { padding: '32px 24px', overflowY: 'auto', flex: 1, maxHeight: 'calc(90vh - 130px)', overscrollBehavior: 'contain' },
  modalFooter: {
    padding: '16px 24px', borderTop: '1px solid var(--border)',
    display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--bg)'
  },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px 24px' },
  btnCancel: {
    padding: '8px 16px', background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: 'var(--text)'
  },
  btnSave: {
    padding: '8px 16px', background: '#27ae60', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#fff'
  }
};
