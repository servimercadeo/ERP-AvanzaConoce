import React, { useState, useEffect, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { FilterDropdown } from '../components/SearchableSelect';
import { IconEye, IconEdit, IconClose } from '../components/Icons';

const TIPOS_VINCULACION = ['Directa', 'Indirecta'];
const ESTADOS = ['activa', 'en proceso', 'finalizada', 'cancelada'];

const TIPO_FILTERS = [
  { value: 'Todos', label: 'Todos los tipos' },
  { value: 'Directa', label: 'Directa' },
  { value: 'Indirecta', label: 'Indirecta' },
];

const ESTADO_FILTERS = [
  { value: 'Todos', label: 'Todos los estados' },
  { value: 'en proceso', label: 'En proceso' },
  { value: 'activa', label: 'Activa' },
  { value: 'finalizada', label: 'Finalizada' },
  { value: 'cancelada', label: 'Cancelada' },
];

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

const getTipoColors = (tipo) => {
  const t = (tipo ?? '').toLowerCase();
  if (t === 'directa')   return { bg: '#ede9fe', color: '#5b21b6' };
  if (t === 'indirecta') return { bg: '#fef3c7', color: '#92400e' };
  return { bg: 'var(--bg)', color: 'var(--text-muted)' };
};

const fmt = (val) => val ? String(val) : '—';
const fmtDate = (val) => {
  if (!val) return '—';
  const d = new Date(val + 'T00:00:00');
  return isNaN(d) ? val : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AvalesContratacionCrud() {
  const [data, setData]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const debouncedSearch                 = useDebounce(searchTerm, 300);
  const [tipoFilter, setTipoFilter]     = useState('Todos');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [modalMode, setModalMode]       = useState('view');
  const [form, setForm]                 = useState({});
  const [pagina, setPagina]             = useState(1);
  const [toast, setToast]               = useState(null);
  const POR_PAGINA = 10;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const qc = useQueryClient();
  const { data: _qData } = useQuery({
    queryKey: ['base-ingresos'],
    queryFn: () => api.get('/base-ingresos').then(r => r.data),
  });

  useEffect(() => {
    if (_qData) { setData(_qData); setLoading(false); }
  }, [_qData]);

  useEffect(() => { setPagina(1); }, [searchTerm, tipoFilter, estadoFilter]);

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

  const handleOpenModal = (mode, row) => {
    setModalMode(mode);
    setForm({ ...row });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        tipo_vinculacion:           form.tipo_vinculacion,
        fecha_aval:                 form.fecha_aval,
        fecha_programacion_ingreso: form.fecha_programacion_ingreso,
        fecha_correccion:           form.fecha_correccion,
        lugar_trabajo:              form.lugar_trabajo,
        lider_inmediato:            form.lider_inmediato,
        empleador:                  form.empleador,
        estado:                     form.estado,
      };
      const { data: updated } = await api.put(`/base-ingresos/${form.id}`, payload);
      setData(prev => prev.map(r => r.id === form.id ? { ...r, ...updated } : r));
      qc.invalidateQueries({ queryKey: ['base-ingresos'] });
      showToast('Aval actualizado exitosamente');
      setIsModalOpen(false);
    } catch (e) {
      alert('Error al guardar: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await api.post('/base-ingresos/sync');
      showToast(res.data.message);
      const ing = await api.get('/base-ingresos');
      setData(ing.data);
    } catch (e) {
      alert('Error al sincronizar: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleAlertToggle = (rowId) => {
    setData(prev => prev.map(r => r.id === rowId ? { ...r, alerta_enviada: !r.alerta_enviada } : r));
  };

  const filteredData = useMemo(() =>
    data.filter(row => {
      const matchSearch = [row.nombre_completo, row.documento_identificacion, row.cargo, row.empresa, row.proyecto]
        .some(v => String(v ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()));
      const matchTipo   = tipoFilter === 'Todos'   || String(row.tipo_vinculacion ?? '').toLowerCase() === tipoFilter.toLowerCase();
      const matchEstado = estadoFilter === 'Todos' || String(row.estado ?? '').toLowerCase() === estadoFilter.toLowerCase();
      return matchSearch && matchTipo && matchEstado;
    }),
    [data, debouncedSearch, tipoFilter, estadoFilter]
  );

  const totalPaginas  = Math.max(1, Math.ceil(filteredData.length / POR_PAGINA));
  const paginatedData = filteredData.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '10px 0' }}>

      {/* Toolbar */}
      <div style={S.toolbar}>
        <div style={S.filters}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre, documento, cargo…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={S.searchInput}
            />
          </div>
          <FilterDropdown label="Tipo vinculación" value={tipoFilter}   onChange={setTipoFilter}   options={TIPO_FILTERS}   />
          <FilterDropdown label="Estado"           value={estadoFilter} onChange={setEstadoFilter} options={ESTADO_FILTERS} />
        </div>
        <button style={S.btnSecondary} onClick={handleSync}>Actualizar</button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontFamily: 'Nunito,sans-serif', fontSize: '0.9rem' }}>
          Cargando avales…
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
                <th style={S.th}>Empresa / Proyecto</th>
                <th style={S.th}>Tipo vinculación</th>
                <th style={S.th}>F. tentativa ingreso</th>
                <th style={S.th}>F. corrección</th>
                <th style={S.th}>Estado</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Envío de alerta</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => {
                const ec = getEstadoColors(row.estado);
                const tc = getTipoColors(row.tipo_vinculacion);
                return (
                  <tr key={row.id} style={S.tr}>
                    <td style={S.td}>{(pagina - 1) * POR_PAGINA + index + 1}</td>
                    <td style={S.td}>{fmt(row.documento_identificacion)}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{fmt(row.nombre_completo)}</td>
                    <td style={S.td}>{fmt(row.cargo)}</td>
                    <td style={S.td}>
                      <span style={{ display: 'block' }}>{fmt(row.empresa)}</span>
                      {row.proyecto && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{row.proyecto}</span>}
                    </td>
                    <td style={S.td}>
                      {row.tipo_vinculacion
                        ? <span style={S.badge(tc.bg, tc.color)}>{row.tipo_vinculacion}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td style={S.td}>{fmtDate(row.fecha_programacion_ingreso)}</td>
                    <td style={S.td}>{fmtDate(row.fecha_correccion)}</td>
                    <td style={S.td}>
                      <span style={S.badge(ec.bg, ec.color)}>
                        {row.estado ? row.estado.charAt(0).toUpperCase() + row.estado.slice(1) : '—'}
                      </span>
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={row.alerta_enviada ?? false}
                        onChange={() => handleAlertToggle(row.id)}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <div style={S.actions}>
                        <button style={S.actionBtn('#e8f0ff', '#1a4fa8')} title="Ver" onClick={() => handleOpenModal('view', row)}><IconEye size={15} /></button>
                        <button style={S.actionBtn('#e8f8f5', 'var(--primary-dark)')} title="Editar" onClick={() => handleOpenModal('edit', row)}><IconEdit size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr><td colSpan="11" style={S.empty}>No hay avales de contratación registrados.</td></tr>
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
                {modalMode === 'edit' ? 'Editar aval de contratación' : 'Detalle del aval'}
              </span>
              <button style={S.closeBtn} onClick={() => setIsModalOpen(false)}><IconClose size={14} /></button>
            </div>

            <div style={S.modalBody}>

              <label style={S.sectionLabel}>Datos del candidato</label>
              <div style={{ ...S.grid3, marginBottom: 20 }}>
                <ReadField label="Documento"    value={form.documento_identificacion} />
                <ReadField label="Nombre"       value={form.nombre_completo} span={2} />
                <ReadField label="Cargo"        value={form.cargo} />
                <ReadField label="Empresa"      value={form.empresa} />
                <ReadField label="Proyecto"     value={form.proyecto} />
                <ReadField label="Teléfono"     value={form.telefono} />
                <ReadField label="Correo"       value={form.correo} span={2} />
              </div>

              <label style={S.sectionLabel}>Vinculación y fechas de ingreso</label>
              <div style={{ ...S.grid3, marginBottom: 20 }}>
                <Field label="Tipo de vinculación"        k="tipo_vinculacion"           opts={TIPOS_VINCULACION} form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Fecha de aval"              k="fecha_aval"                 type="date"             form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Fecha tentativa de ingreso" k="fecha_programacion_ingreso" type="date"             form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Fecha de corrección"        k="fecha_correccion"           type="date"             form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Sede / Lugar de trabajo"    k="lugar_trabajo"                                      form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Líder inmediato"            k="lider_inmediato"                                    form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Empleador"                  k="empleador"                                          form={form} onChange={set} disabled={modalMode === 'view'} />
                <Field label="Estado"                     k="estado"                     opts={ESTADOS} req      form={form} onChange={set} disabled={modalMode === 'view'} />
              </div>

              <label style={S.sectionLabel}>Remuneración</label>
              <div style={S.grid3}>
                <ReadField label="Tasa riesgo ARL"   value={form.tasa_riesgo_arl} />
                <ReadField label="Salario básico"    value={form.salario_basico    ? `$${Number(form.salario_basico).toLocaleString()}`    : '—'} />
                <ReadField label="Aux. transporte"   value={form.auxilio_transporte   ? `$${Number(form.auxilio_transporte).toLocaleString()}`   : '—'} />
                <ReadField label="Otrosí variable"   value={form.otrosi_variable      ? `$${Number(form.otrosi_variable).toLocaleString()}`      : '—'} />
                <ReadField label="Aux. rodamiento"   value={form.auxilio_rodamiento   ? `$${Number(form.auxilio_rodamiento).toLocaleString()}`   : '—'} />
                <ReadField label="Aux. comunicación" value={form.auxilio_comunicacion ? `$${Number(form.auxilio_comunicacion).toLocaleString()}` : '—'} />
                <ReadField label="Aux. alimentación" value={form.auxilio_alimentacion ? `$${Number(form.auxilio_alimentacion).toLocaleString()}` : '—'} />
              </div>

            </div>

            <div style={S.modalFooter}>
              {modalMode === 'view' ? (
                <>
                  <button style={S.btnSecondary} onClick={() => setIsModalOpen(false)}>Cerrar</button>
                  <button style={S.btnPrimary} onClick={() => setModalMode('edit')}>Editar</button>
                </>
              ) : (
                <>
                  <button style={S.btnSecondary} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                  <button style={S.btnPrimary} onClick={handleSave}>Guardar cambios</button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

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

function ReadField({ label, value, span }) {
  const wrap = { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, ...(span ? { gridColumn: `span ${span}` } : {}) };
  return (
    <div style={wrap}>
      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>{label}</label>
      <div style={{
        padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
        fontSize: '0.88rem', fontFamily: 'Nunito,sans-serif',
        color: 'var(--text-muted)', background: 'var(--bg)', minHeight: 36,
      }}>
        {value || '—'}
      </div>
    </div>
  );
}

const S = {
  toolbar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  filters:       { display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' },
  searchWrap:    { position: 'relative', flex: 1, minWidth: 220, maxWidth: 400 },
  searchIcon:    { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', pointerEvents: 'none' },
  searchInput:   { width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', fontFamily: 'Nunito,sans-serif', background: 'var(--white)', color: 'var(--text)', outline: 'none' },
  btnPrimary:    { padding: '10px 24px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif', whiteSpace: 'nowrap' },
  btnSecondary:  { padding: '10px 20px', background: 'var(--bg)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif', whiteSpace: 'nowrap' },
  tableWrap:     { background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflowX: 'auto' },
  table:         { width: '100%', borderCollapse: 'collapse', minWidth: 1100 },
  th:            { padding: '14px', background: 'var(--bg)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'Nunito,sans-serif', textAlign: 'left', borderBottom: '1.5px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' },
  tr:            { borderBottom: '1px solid var(--border)' },
  td:            { padding: '13px 14px', fontSize: '0.85rem', fontFamily: 'Nunito,sans-serif', color: 'var(--text)', verticalAlign: 'middle' },
  badge:         (bg, color) => ({ background: bg, color, borderRadius: 20, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Nunito,sans-serif' }),
  actions:       { display: 'flex', gap: 6, justifyContent: 'center' },
  actionBtn:     (bg, color) => ({ background: bg, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }),
  empty:         { padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'Nunito,sans-serif' },
  paginationWrap:{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  pageInfo:      { color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'Nunito,sans-serif' },
  pageControls:  { display: 'flex', alignItems: 'center', gap: 6 },
  pageBtn:       (disabled) => ({ minWidth: 32, height: 32, padding: '0 8px', border: '1.5px solid var(--border)', borderRadius: 6, background: 'var(--white)', color: disabled ? 'var(--text-muted)' : 'var(--text)', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'Nunito,sans-serif', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 }),
  pageBtnActive: { minWidth: 32, height: 32, padding: '0 8px', border: '1.5px solid var(--primary)', borderRadius: 6, background: 'var(--primary)', color: '#fff', fontSize: '0.88rem', fontWeight: 700, fontFamily: 'Nunito,sans-serif', cursor: 'default' },
  pageEllipsis:  { minWidth: 28, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' },
  overlay:       { position: 'fixed', inset: 0, background: 'rgba(26,58,53,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: 20 },
  modal:         { background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: '0 16px 60px rgba(26,155,140,0.22)', width: '100%', maxWidth: 1000, maxHeight: '92vh', display: 'flex', flexDirection: 'column' },
  modalHeader:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', background: 'var(--primary)', borderTopLeftRadius: 'var(--radius)', borderTopRightRadius: 'var(--radius)', flexShrink: 0 },
  modalTitle:    { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: '1.2rem', color: '#fff' },
  closeBtn:      { background: 'none', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' },
  modalBody:     { padding: '22px 28px 28px', overflowY: 'auto', overflowX: 'hidden', flex: 1 },
  modalFooter:   { display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 28px', borderTop: '1.5px solid var(--border)', flexShrink: 0 },
  grid3:         { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 },
  sectionLabel:  { display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)', fontFamily: "'Poppins',sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
};
