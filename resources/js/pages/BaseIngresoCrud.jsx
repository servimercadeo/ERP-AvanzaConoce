import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { SearchableSelect } from '../components/SearchableSelect';
import { IconEye, IconEdit, IconTrash, IconClose } from '../components/Icons';

const EMPTY_FORM = {
  candidato_id: '',
  fecha_aval: '',
  documento_identificacion: '',
  nombre_completo: '',
  cargo: '',
  ciudad: '',
  empresa: '',
  proyecto: '',
  telefono: '',
  correo: '',
  tipo_ingreso: '',
  lugar_trabajo: '',
  lider_inmediato: '',
  empleador: '',
  fecha_programacion_ingreso: '',
  fecha_correccion: '',
  tasa_riesgo_arl: '',
  salario_basico: '',
  auxilio_transporte: '',
  otrosi_variable: '',
  auxilio_rodamiento: '',
  auxilio_comunicacion: '',
  auxilio_alimentacion: '',
  estado: '',
};

const ESTADOS = ['en proceso', 'activa', 'finalizada', 'cancelada'];
const TIPOS_INGRESO = ['Nuevo', 'Reemplazo'];

function getPaginasBotones(pagina, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 2, left = pagina - delta, right = pagina + delta;
  const pages = [1];
  if (left > 2) pages.push('...');
  for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i++) pages.push(i);
  if (right < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

const getEstadoColors = (estado) => {
  const e = (estado ?? '').toLowerCase();
  if (e === 'activa')     return { bg: '#d1fae5', color: '#065f46' };
  if (e === 'cancelada')  return { bg: '#fee2e2', color: '#991b1b' };
  if (e === 'en proceso') return { bg: '#dbeafe', color: '#1e40af' };
  if (e === 'finalizada') return { bg: '#ffedd5', color: '#9a3412' };
  return { bg: 'var(--bg)', color: 'var(--text-muted)' };
};

export default function BaseIngresoCrud() {
  const [data, setData]           = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [form, setForm]           = useState(EMPTY_FORM);
  const [pagina, setPagina]       = useState(1);
  const [toast, setToast]         = useState(null);
  const POR_PAGINA = 10;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    Promise.all([
      api.get('/base-ingresos'),
      api.get('/candidatos'),
    ])
      .then(([ing, cand]) => { setData(ing.data); setCandidates(cand.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setPagina(1); }, [searchTerm]);

  useEffect(() => {
    if (isModalOpen) {
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
  }, [isModalOpen]);

  const handleCandidatoSelect = (candidatoId) => {
    const c = candidates.find(x => String(x.id) === String(candidatoId));
    if (!c) {
      setForm(p => ({ ...p, candidato_id: candidatoId }));
      return;
    }
    const req = c.requisicion ?? {};
    setForm(p => ({
      ...p,
      candidato_id:             c.id,
      documento_identificacion: c.identificacion                        || p.documento_identificacion,
      nombre_completo:          c.nombres                               || p.nombre_completo,
      cargo:                    req.cargo?.nombre                       || p.cargo,
      ciudad:                   c.ciudad?.nombre  || req.ciudad?.nombre || p.ciudad,
      correo:                   c.correo                               || p.correo,
      telefono:                 c.celular                               || p.telefono,
      proyecto:                 c.negocio         || req.proyecto?.nombre || p.proyecto,
      empresa:                  req.empresa?.nombre                    || p.empresa,
      empleador:                req.empleador                          || p.empleador,
      lider_inmediato:          req.responsable                        || p.lider_inmediato,
      tipo_ingreso:             (req.tipo_solicitud?.includes('Reemplazo') ? 'Reemplazo' : req.tipo_solicitud?.includes('Nuevo') ? 'Nuevo' : null) || p.tipo_ingreso,
      fecha_aval:               c.fecha_aval                          || p.fecha_aval,
    }));
  };

  const handleOpenModal = (mode, row = null) => {
    setModalMode(mode);
    if (row) {
      setForm({ ...EMPTY_FORM, ...row, candidato_id: row.candidato_id ?? '' });
    } else {
      setForm({ ...EMPTY_FORM, fecha_programacion_ingreso: new Date().toISOString().slice(0, 10) });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.documento_identificacion || !form.nombre_completo) {
      alert('Documento y nombre completo son obligatorios.');
      return;
    }
    try {
      if (modalMode === 'create') {
        const { data: created } = await api.post('/base-ingresos', form);
        setData(prev => [created, ...prev]);
        showToast('Ingreso registrado exitosamente');
      } else {
        const { data: updated } = await api.put(`/base-ingresos/${form.id}`, form);
        setData(prev => prev.map(r => r.id === form.id ? updated : r));
        showToast('Ingreso actualizado exitosamente');
      }
      setIsModalOpen(false);
    } catch (e) {
      alert('Error al guardar: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro de ingreso?')) return;
    try {
      await api.delete(`/base-ingresos/${id}`);
      setData(prev => prev.filter(r => r.id !== id));
      showToast('Registro eliminado');
    } catch (e) {
      alert('Error al eliminar: ' + (e.response?.data?.message || e.message));
    }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const filteredData = data.filter(row =>
    [row.nombre_completo, row.documento_identificacion, row.cargo, row.empresa, row.estado]
      .some(v => String(v ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPaginas = Math.max(1, Math.ceil(filteredData.length / POR_PAGINA));
  const paginatedData = filteredData.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const candidatoOptions = candidates
    .filter(c => c.aval === true)
    .map(c => ({
      value: String(c.id),
      label: `${c.nombres} — ${c.identificacion}`,
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '10px 0' }}>

      {/* Toolbar */}
      <div style={S.toolbar}>
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={S.searchInput}
          />
        </div>
        <button style={S.btnPrimary} onClick={() => handleOpenModal('create')}>+ Nuevo ingreso</button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontFamily: 'Nunito,sans-serif', fontSize: '0.9rem' }}>
          Cargando registros…
        </div>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>#</th>
                <th style={S.th}>Documento</th>
                <th style={S.th}>Nombre completo</th>
                <th style={S.th}>Cargo</th>
                <th style={S.th}>Empresa</th>
                <th style={S.th}>Fecha ingreso</th>
                <th style={S.th}>Salario básico</th>
                <th style={S.th}>Estado</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => {
                const ec = getEstadoColors(row.estado);
                return (
                  <tr key={row.id} style={S.tr}>
                    <td style={S.td}>{(pagina - 1) * POR_PAGINA + index + 1}</td>
                    <td style={S.td}>{row.documento_identificacion}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{row.nombre_completo}</td>
                    <td style={S.td}>{row.cargo}</td>
                    <td style={S.td}>{row.empresa}</td>
                    <td style={S.td}>{row.fecha_programacion_ingreso}</td>
                    <td style={S.td}>{row.salario_basico ? `$${Number(row.salario_basico).toLocaleString()}` : '—'}</td>
                    <td style={S.td}>
                      <span style={S.badge(ec.bg, ec.color)}>
                        {row.estado ? row.estado.charAt(0).toUpperCase() + row.estado.slice(1) : '—'}
                      </span>
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <div style={S.actions}>
                        <button style={S.actionBtn('#e8f0ff', '#1a4fa8')} title="Ver" onClick={() => handleOpenModal('view', row)}><IconEye size={15} /></button>
                        <button style={S.actionBtn('#e8f8f5', 'var(--primary-dark)')} title="Editar" onClick={() => handleOpenModal('edit', row)}><IconEdit size={15} /></button>
                        <button style={S.actionBtn('#fce8e8', '#a33')} title="Eliminar" onClick={() => handleDelete(row.id)}><IconTrash size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr><td colSpan="9" style={S.empty}>No hay registros de ingreso.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {filteredData.length > POR_PAGINA && (
        <div style={S.paginationWrap}>
          <span style={S.pageInfo}>
            Página {pagina} · {Math.min(POR_PAGINA, filteredData.length - (pagina - 1) * POR_PAGINA)} de {filteredData.length} registros
          </span>
          <div style={S.pageControls}>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={S.pageBtn(pagina === 1)}>‹</button>
            {getPaginasBotones(pagina, totalPaginas).map((n, i) =>
              n === '...'
                ? <span key={`e${i}`} style={S.pageEllipsis}>…</span>
                : <button key={n} onClick={() => setPagina(n)} style={n === pagina ? S.pageBtnActive : S.pageBtn(false)}>{n}</button>
            )}
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} style={S.pageBtn(pagina === totalPaginas)}>›</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={S.overlay} onClick={() => setIsModalOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>

            <div style={S.modalHeader}>
              <span style={S.modalTitle}>
                {modalMode === 'create' ? 'Registrar nuevo ingreso' : modalMode === 'edit' ? 'Editar ingreso' : 'Detalles del ingreso'}
              </span>
              <button style={S.closeBtn} onClick={() => setIsModalOpen(false)}><IconClose size={14} /></button>
            </div>

            <div style={S.modalBody}>

              {/* Selección de candidato — solo en create */}
              {modalMode === 'create' && (
                <div style={{ marginBottom: 22 }}>
                  <label style={S.sectionLabel}>Seleccionar candidato</label>
                  <SearchableSelect
                    key="candidato-select"
                    value={String(form.candidato_id ?? '')}
                    defaultValue=""
                    options={candidatoOptions}
                    onChange={handleCandidatoSelect}
                  />
                </div>
              )}

              <label style={S.sectionLabel}>Datos de identificación</label>
              <div style={{ ...S.grid3, marginBottom: 18 }}>
                <Field label="Documento de identificación" k="documento_identificacion" req form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Nombre completo" k="nombre_completo" req span={2} form={form} onChange={set} disabled={modalMode === 'view'} />
              </div>

              <label style={S.sectionLabel}>Datos laborales</label>
              <div style={{ ...S.grid3, marginBottom: 18 }}>
                <Field label="Cargo" k="cargo" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Ciudad" k="ciudad" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Empresa" k="empresa" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Proyecto" k="proyecto" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Teléfono" k="telefono" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Correo electrónico" k="correo" type="email" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Tipo de ingreso" k="tipo_ingreso" opts={TIPOS_INGRESO} form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Lugar de trabajo" k="lugar_trabajo" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Líder inmediato" k="lider_inmediato" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Empleador" k="empleador" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Fecha de aval" k="fecha_aval" type="date" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Fecha programación ingreso" k="fecha_programacion_ingreso" type="date" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Fecha de corrección" k="fecha_correccion" type="date" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Estado" k="estado" opts={ESTADOS} req form={form} onChange={set} disabled={modalMode === 'view'} />
              </div>

              <label style={S.sectionLabel}>Remuneración</label>
              <div style={S.grid3}>
                <Field label="Tasa de riesgo ARL" k="tasa_riesgo_arl" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Salario básico" k="salario_basico" type="number" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Auxilio de transporte" k="auxilio_transporte" type="number" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Otrosí variable" k="otrosi_variable" type="number" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Aux. rodamiento / seguridad vial" k="auxilio_rodamiento" type="number" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Aux. de comunicación" k="auxilio_comunicacion" type="number" form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Aux. de alimentación" k="auxilio_alimentacion" type="number" form={form} onChange={set} disabled={modalMode === 'view'} />
              </div>

            </div>

            <div style={S.modalFooter}>
              {modalMode === 'view' ? (
                <button style={S.btnSecondary} onClick={() => setIsModalOpen(false)}>Cerrar</button>
              ) : (
                <>
                  <button style={S.btnSecondary} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                  <button style={S.btnPrimaryGreen} onClick={handleSave}>Guardar registro</button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? 'var(--primary)' : '#e74c3c',
          color: '#fff', padding: '14px 28px', borderRadius: 10,
          fontFamily: 'Nunito,sans-serif', fontWeight: 700, fontSize: '0.95rem',
          boxShadow: '0 8px 28px rgba(0,0,0,0.2)', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toast.msg}
        </div>
      )}

    </div>
  );
}

function Field({ label, k, type = 'text', opts, req, span, form, onChange, disabled }) {
  const wrap = { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, ...(span ? { gridColumn: `span ${span}` } : {}) };
  const inp  = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem', fontFamily: 'Nunito,sans-serif',
    color: disabled ? 'var(--text-muted)' : 'var(--text)',
    background: disabled ? 'var(--bg)' : 'var(--white)',
    outline: 'none',
  };
  return (
    <div style={wrap}>
      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
        {label}{req && <span style={{ color: '#e74c3c', marginLeft: 3 }}>*</span>}
      </label>
      {opts ? (
        <select style={inp} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled}>
          <option value="">-- Selecciona --</option>
          {opts.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </select>
      ) : (
        <input type={type} style={inp} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled} />
      )}
    </div>
  );
}

const S = {
  toolbar:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  searchWrap:   { position: 'relative', flex: 1, minWidth: 200, maxWidth: 380 },
  searchIcon:   { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', pointerEvents: 'none' },
  searchInput:  { width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', fontFamily: 'Nunito,sans-serif', background: 'var(--white)', color: 'var(--text)', outline: 'none' },
  btnPrimary:   { padding: '10px 24px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif', whiteSpace: 'nowrap' },
  btnPrimaryGreen: { padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' },
  btnSecondary: { padding: '10px 20px', background: 'var(--bg)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif' },
  tableWrap:    { background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflowX: 'auto' },
  table:        { width: '100%', borderCollapse: 'collapse', minWidth: 1000 },
  th:           { padding: '14px', background: 'var(--bg)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'Nunito,sans-serif', textAlign: 'left', borderBottom: '1.5px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' },
  tr:           { borderBottom: '1px solid var(--border)' },
  td:           { padding: '13px 14px', fontSize: '0.85rem', fontFamily: 'Nunito,sans-serif', color: 'var(--text)', verticalAlign: 'middle' },
  badge:        (bg, color) => ({ background: bg, color, borderRadius: 20, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Nunito,sans-serif' }),
  actions:      { display: 'flex', gap: 6, justifyContent: 'center' },
  actionBtn:    (bg, color) => ({ background: bg, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }),
  empty:        { padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'Nunito,sans-serif' },
  paginationWrap: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  pageInfo:     { color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'Nunito,sans-serif' },
  pageControls: { display: 'flex', alignItems: 'center', gap: 6 },
  pageBtn:      (disabled) => ({ minWidth: 32, height: 32, padding: '0 8px', border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--white)', color: disabled ? 'var(--text-muted)' : 'var(--text)', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'Nunito,sans-serif', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 }),
  pageBtnActive:{ minWidth: 32, height: 32, padding: '0 8px', border: '1.5px solid var(--primary)', borderRadius: 6, background: 'var(--primary)', color: '#fff', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'Nunito,sans-serif', cursor: 'default' },
  pageEllipsis: { minWidth: 28, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(26,58,53,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: 20 },
  modal:        { background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: '0 16px 60px rgba(26,155,140,0.22)', width: '100%', maxWidth: 1000, maxHeight: '92vh', display: 'flex', flexDirection: 'column' },
  modalHeader:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', background: 'var(--primary)', borderTopLeftRadius: 'var(--radius)', borderTopRightRadius: 'var(--radius)', flexShrink: 0 },
  modalTitle:   { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: '1.2rem', color: '#fff' },
  closeBtn:     { background: 'none', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' },
  modalBody:    { padding: '22px 28px 28px', overflowY: 'auto', overflowX: 'hidden', flex: 1 },
  modalFooter:  { display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 28px', borderTop: '1.5px solid var(--border)', flexShrink: 0 },
  grid3:        { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 },
  sectionLabel: { display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)', fontFamily: "'Poppins',sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
};
