import React, { useState, useEffect } from 'react';
import {
  IconEye,
  IconEdit,
  IconClose,
} from '../components/Icons';

const getTodayStr = () => new Date().toISOString().slice(0, 10);

const CANDIDATES_MOCK = [
  {
    id: 1,
    requisicion_id: '1',
    nombres: 'Simon Gallego',
    identificacion: '1089383135',
    correo: 'simon.23051997@gmail.com',
    celular: '3217085550',
    ciudad: 'Pereira',
    tipo_documento: 'Cédula de Ciudadanía',
    fecha_expedicion: '2015-06-12',
    edad: '29',
    fecha_postulacion: getTodayStr(),
    fuente: 'Fase Inicial',
    fuente_especifica: 'Pendiente de Aval',
    estado: 'Contratación',
    pruebas: true,
    aval: true,
    observaciones: 'Excelente perfil técnico. Cumple con todos los requisitos del cargo.'
  },
  {
    id: 2,
    requisicion_id: '1',
    nombres: 'Juan Camilo',
    identificacion: '1089381135',
    correo: 'marin.jc2005@gmail.com',
    celular: '3217085555',
    ciudad: 'Pereira',
    tipo_documento: 'Cédula de Ciudadanía',
    fecha_expedicion: '2023-01-20',
    edad: '21',
    fecha_postulacion: getTodayStr(),
    fuente: 'Fase Inicial',
    fuente_especifica: 'Pendiente de Aval',
    estado: 'Contratación',
    pruebas: true,
    aval: true,
    observaciones: 'Candidato con gran motivación. Aprobó pruebas con puntaje sobresaliente.'
  },
];

const MOCK_OPTS = {
  tipos_documento: ['Cédula de Ciudadanía', 'Cédula de Extranjería', 'Pasaporte', 'Tarjeta de Identidad'],
  fuentes_reclutamiento: ['Fase Inicial', 'Vinculacion temporal', 'Vinculacion directa'],
  fuentes_especificas: ['Pendiente de Aval', 'Contratar por S&M'],
  estados_proceso: ['Entrevista', 'Contratación', 'Descartado', 'En espera'],
};

export default function CandidatosCrud() {
  const [candidates, setCandidates] = useState(CANDIDATES_MOCK);
  const [requisitions] = useState(() => { try { return JSON.parse(localStorage.getItem('seleccionData')) || []; } catch { return []; } });
  const [candDetailSearch, setCandDetailSearch] = useState('');
  const [isCandModalOpen, setIsCandModalOpen] = useState(false);
  const [candModalMode, setCandModalMode] = useState('create');
  const [candForm, setCandForm] = useState({
    nombres: '',
    correo: '',
    celular: '',
    ciudad: '',
    tipo_documento: 'Cédula de Ciudadanía',
    identificacion: '',
    fecha_expedicion: '',
    edad: '',
    fecha_postulacion: getTodayStr(),
    fuente: 'Fase Inicial',
    fuente_especifica: 'Pendiente de Aval',
    estado: 'Entrevista',
    observaciones: ''
  });

  useEffect(() => {
    if (isCandModalOpen) {
      document.documentElement.style.overflowY = 'hidden';
      document.body.style.overflowY = 'hidden';
    } else {
      document.documentElement.style.overflowY = '';
      document.body.style.overflowY = '';
    }
    return () => {
      document.documentElement.style.overflowY = '';
      document.body.style.overflowY = '';
    };
  }, [isCandModalOpen]);

  const toggleCandidateField = (candidateId, field) => {
    setCandidates(prev => prev.map(c => {
      if (c.id === candidateId) {
        const val = !c[field];
        let nextEstado = c.estado;
        if (field === 'pruebas' || field === 'aval') {
          const newPruebas = field === 'pruebas' ? val : c.pruebas;
          const newAval = field === 'aval' ? val : c.aval;
          nextEstado = (newPruebas && newAval) ? 'Contratación' : 'Entrevista';
        }
        return { ...c, [field]: val, estado: nextEstado };
      }
      return c;
    }));
  };

  const handleAddCandidate = () => {
    setCandModalMode('create');
    setCandForm({
      nombres: '', correo: '', celular: '', ciudad: '',
      tipo_documento: 'Cédula de Ciudadanía', identificacion: '',
      fecha_expedicion: '', edad: '', fecha_postulacion: getTodayStr(),
      fuente: 'Fase Inicial', fuente_especifica: 'Pendiente de Aval',
      estado: 'Entrevista', observaciones: '', requisicion_id: ''
    });
    setIsCandModalOpen(true);
  };

  const handleEditCandidate = (c) => {
    setCandModalMode('edit');
    setCandForm({ ...c });
    setIsCandModalOpen(true);
  };

  const handleViewCandidate = (c) => {
    setCandModalMode('view');
    setCandForm({ ...c });
    setIsCandModalOpen(true);
  };

  const handleRemoveCandidate = (candidateId) => {
    if (confirm('¿Estás seguro de que deseas eliminar este candidato?')) {
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
    }
  };

  const handleSaveCandidate = () => {
    if (!candForm.nombres || !candForm.correo || !candForm.celular || !candForm.identificacion || !candForm.fuente || !candForm.fuente_especifica) {
      alert('Por favor, rellene todos los campos obligatorios (*).');
      return;
    }
    if (candModalMode === 'create') {
      const newId = candidates.length > 0 ? Math.max(...candidates.map(c => c.id)) + 1 : 1;
      setCandidates([...candidates, { ...candForm, id: newId, pruebas: false, aval: false, selected: false }]);
    } else if (candModalMode === 'edit') {
      setCandidates(prev => prev.map(c => (c.id === candForm.id ? { ...c, ...candForm } : c)));
    }
    setIsCandModalOpen(false);
  };

  const filteredCandDetail = candidates.filter(c => {
    const term = candDetailSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      c.nombres.toLowerCase().includes(term) ||
      c.identificacion.includes(term) ||
      c.correo.toLowerCase().includes(term) ||
      c.celular.includes(term) ||
      c.fuente.toLowerCase().includes(term) ||
      c.estado.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 0' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar candidato..."
            value={candDetailSearch}
            onChange={e => setCandDetailSearch(e.target.value)}
            style={S.searchInput}
          />
        </div>
        <button style={S.btnPrimary} onClick={handleAddCandidate}>+ Agregar candidato</button>
      </div>

      <div style={{ overflowX: 'auto', background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--border)' }}>
              <th style={S.candTh('center')}>Selección<br/>entrevista</th>
              <th style={S.candTh('left')}>Nombres</th>
              <th style={S.candTh('left')}>Identificación</th>
              <th style={S.candTh('left')}>Correo electrónico</th>
              <th style={S.candTh('left')}>Celular</th>
              <th style={S.candTh('left')}>Ciudad</th>
              <th style={S.candTh('left')}>Fuente reclutamiento</th>
              <th style={S.candTh('left')}>Requisición</th>
              <th style={S.candTh('left')}>Estado proceso</th>
              <th style={S.candTh('center')}>Pruebas<br/>psicotécnicas</th>
              <th style={S.candTh('center')}>Aval<br/>contratación</th>
              <th style={S.candTh('center')}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCandDetail.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <input type="checkbox" checked={c.selected || false} onChange={() => toggleCandidateField(c.id, 'selected')} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                </td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)', fontWeight: 700 }}>{c.nombres}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)', fontFamily: 'monospace' }}>{c.identificacion}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)' }}>{c.correo}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)' }}>{c.celular}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)' }}>{c.ciudad}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)' }}>{c.fuente}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)' }}>{requisitions.find(r => String(r.id) === String(c.requisicion_id))?.nro_identificacion_proceso || '–'}</td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={S.badge(c.estado === 'Contratación' ? '#d1fae5' : '#e8f0ff', c.estado === 'Contratación' ? '#065f46' : '#1a4fa8')}>
                    {c.estado}
                  </span>
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <input type="checkbox" checked={c.pruebas || false} onChange={() => toggleCandidateField(c.id, 'pruebas')} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <input type="checkbox" checked={c.aval || false} onChange={() => toggleCandidateField(c.id, 'aval')} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <div style={S.actions}>
                    <button style={S.actionBtn('#e8f8f5', 'var(--primary-dark)')} title="Editar candidato" onClick={() => handleEditCandidate(c)}><IconEdit size={15} /></button>
                    <button style={S.actionBtn('#e8f0ff', '#1a4fa8')} title="Ver detalles" onClick={() => handleViewCandidate(c)}><IconEye size={15} /></button>
                    <button style={S.actionBtn('#fce8e8', '#a33')} title="Eliminar candidato" onClick={() => handleRemoveCandidate(c.id)}><IconClose size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCandDetail.length === 0 && (
              <tr><td colSpan="12" style={S.empty}>No se encontraron candidatos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Modal Candidato ─── */}
      {isCandModalOpen && (
        <div style={S.overlay} onClick={() => setIsCandModalOpen(false)}>
          <div style={{ ...S.modal, maxWidth: 960 }} onClick={e => e.stopPropagation()}>

            <div style={S.modalHeaderGreen}>
              <span style={S.modalTitleWhite}>
                {candModalMode === 'create' ? 'Agregar Candidato' : candModalMode === 'edit' ? 'Editar Candidato' : 'Detalles del Candidato'}
              </span>
              <button style={S.closeBtnWhite} onClick={() => setIsCandModalOpen(false)}>
                <IconClose size={12} />
              </button>
            </div>

            <div style={S.modalBody}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', fontFamily: "'Poppins',sans-serif" }}>
                Datos personales
              </h4>
              <div style={S.grid3}>
                <Field label="Nombres completos" k="nombres" req form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view'} />
                <Field label="Tipo de documento" k="tipo_documento" opts={MOCK_OPTS.tipos_documento} req form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view'} />
                <Field label="Número de identificación" k="identificacion" req form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view'} />
                <Field label="Fecha de expedición" k="fecha_expedicion" type="date" form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view'} />
                <Field label="Edad" k="edad" type="number" form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view'} />
                <Field label="Ciudad" k="ciudad" form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view'} />
                <Field label="Correo electrónico" k="correo" type="email" req form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view'} />
                <Field label="Celular" k="celular" req form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view'} />
                <Field label="Fecha de postulación" k="fecha_postulacion" type="date" form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view' || candModalMode === 'create'} />
              </div>

              <h4 style={{ margin: '24px 0 14px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', fontFamily: "'Poppins',sans-serif" }}>
                Proceso de selección
              </h4>
              <div style={S.grid3}>
                <Field label="Requisición asociada" k="requisicion_id" req span={3} opts={requisitions.map(r => ({ value: String(r.id), label: `${r.nro_identificacion_proceso} – ${r.cargo}` }))} form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view'} />
                <Field label="Fuente de reclutamiento" k="fuente" opts={MOCK_OPTS.fuentes_reclutamiento} req form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view'} />
                <Field label="Fuente específica" k="fuente_especifica" opts={MOCK_OPTS.fuentes_especificas} req form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view'} />
                <Field label="Estado del proceso" k="estado" opts={MOCK_OPTS.estados_proceso} form={candForm} onChange={(k) => (e) => setCandForm(p => ({ ...p, [k]: e.target.value }))} disabled={candModalMode === 'view'} />
              </div>

              <h4 style={{ margin: '24px 0 14px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', fontFamily: "'Poppins',sans-serif" }}>
                Observaciones del candidato
              </h4>
              <textarea
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.88rem',
                  fontFamily: 'Nunito,sans-serif',
                  color: candModalMode === 'view' ? 'var(--text-muted)' : 'var(--text)',
                  background: candModalMode === 'view' ? 'var(--bg)' : 'var(--white)',
                  outline: 'none',
                  minHeight: 80,
                  resize: 'vertical',
                }}
                value={candForm.observaciones || ''}
                onChange={(e) => setCandForm(p => ({ ...p, observaciones: e.target.value }))}
                disabled={candModalMode === 'view'}
                placeholder="Escriba aquí las observaciones sobre el candidato..."
              />
            </div>

            <div style={S.modalFooter}>
              {candModalMode === 'view' ? (
                <button style={S.btnSecondary} onClick={() => setIsCandModalOpen(false)}>Cerrar</button>
              ) : (
                <>
                  <button style={S.btnSecondary} onClick={() => setIsCandModalOpen(false)}>Cancelar</button>
                  <button style={S.btnPrimaryGreen} onClick={handleSaveCandidate}>Guardar candidato</button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function Field({ label, k, type = 'text', opts, req, span, form, onChange, disabled }) {
  const wrapStyle = {
    display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0,
    ...(span ? { gridColumn: `span ${span}` } : {})
  };
  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem', fontFamily: 'Nunito,sans-serif',
    color: disabled ? 'var(--text-muted)' : 'var(--text)',
    background: disabled ? 'var(--bg)' : 'var(--white)',
    outline: 'none', transition: 'border 0.15s',
  };
  return (
    <div style={wrapStyle}>
      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
        {label}{req && <span style={{ color: '#e74c3c', marginLeft: 3 }}>*</span>}
      </label>
      {opts ? (
        <select style={inputStyle} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled}>
          <option value="">-- Selecciona --</option>
          {opts.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
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
  searchWrap: { position: 'relative', flex: 1, minWidth: 200, maxWidth: 380 },
  searchIcon: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', fontFamily: 'Nunito,sans-serif', background: 'var(--white)', color: 'var(--text)', outline: 'none' },
  btnPrimary: { padding: '10px 24px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif', whiteSpace: 'nowrap' },
  btnPrimaryGreen: { padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' },
  btnSecondary: { padding: '10px 20px', background: 'var(--bg)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' },
  badge: (bg, color) => ({ background: bg, color, borderRadius: 20, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Nunito,sans-serif' }),
  actions: { display: 'flex', gap: 6, justifyContent: 'center' },
  actionBtn: (bg, color) => ({ background: bg, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: '0.85rem', color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }),
  empty: { padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'Nunito,sans-serif' },
  candTh: (align) => ({ padding: '12px 10px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: align, fontFamily: 'Nunito,sans-serif' }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(26,58,53,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: 20 },
  modal: { background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: '0 16px 60px rgba(26,155,140,0.22)', width: '100%', maxWidth: 900, maxHeight: '92vh', display: 'flex', flexDirection: 'column' },
  modalHeaderGreen: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', background: 'var(--primary)', borderTopLeftRadius: 'var(--radius)', borderTopRightRadius: 'var(--radius)', flexShrink: 0 },
  modalTitleWhite: { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: '1.2rem', color: '#fff' },
  closeBtnWhite: { background: 'none', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' },
  modalBody: { padding: '22px 28px 28px', overflowY: 'auto', overflowX: 'hidden', flex: 1 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 28px', borderTop: '1.5px solid var(--border)', flexShrink: 0 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 },
};
