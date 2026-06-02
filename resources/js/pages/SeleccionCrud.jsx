import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { SearchableSelect, FilterDropdown } from '../components/SearchableSelect';
import { IconEye, IconEdit, IconClose } from '../components/Icons';

/* ── Helpers ────────────────────────────────────────────────────────── */
const today = () => new Date().toISOString().slice(0, 10);

const fmtDate = d =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

const OPT = {
  procesos:    ['Administrativo', 'Operativo', 'Comercial', 'Tecnología'],
  tipos:       ['RP: Reemplazo', 'CN: Cargo Nuevo'],
  paises:      ['Colombia', 'Perú', 'Ecuador', 'México'],
  estados:     ['Abierta', 'En proceso', 'Completada', 'Cancelada'],
  sino:        ['Sí', 'No'],
  tipos_doc:   ['Cédula de Ciudadanía', 'Cédula de Extranjería', 'Pasaporte', 'Tarjeta de Identidad'],
  fuentes:     ['Fase Inicial', 'Vinculacion temporal', 'Vinculacion directa'],
  fuentes_esp: ['Pendiente de Aval', 'Contratar por S&M'],
};


function pages(p, t) {
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
  const [l, r] = [p - 2, p + 2], out = [1];
  if (l > 2) out.push('...');
  for (let i = Math.max(2, l); i <= Math.min(t - 1, r); i++) out.push(i);
  if (r < t - 1) out.push('...');
  out.push(t); return out;
}

const estadoColor = (e = '') => {
  const v = e.toLowerCase();
  if (v === 'abierta' || v === 'activa') return ['#dbeafe', '#1e40af'];
  if (v === 'completada') return ['#d1fae5', '#065f46'];
  if (v === 'cancelada') return ['#fee2e2', '#991b1b'];
  if (v === 'en proceso') return ['#fef3c7', '#92400e'];
  return ['var(--bg)', 'var(--text-muted)'];
};

/* ── Style tokens ───────────────────────────────────────────────────── */
const NUN = 'Nunito,sans-serif';
const POP = "'Poppins',sans-serif";
const BD = '1.5px solid var(--border)';
const RSM = 'var(--radius-sm)';
const _btn = { height: 40, borderRadius: RSM, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: NUN, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
const _inp = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: BD, borderRadius: RSM, fontSize: '0.87rem', fontFamily: NUN, outline: 'none' };
const _pgb = { minWidth: 32, height: 32, padding: '0 8px', border: BD, borderRadius: 6, fontSize: '0.87rem', fontWeight: 700, fontFamily: NUN, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

/* ── Component ──────────────────────────────────────────────────────── */
export default function SeleccionCrud() {
  const [data, setData] = useState([]);
  const [catalogs, setCatalogs] = useState({ cargos: [], proyectos: [], responsables: [], ciudades: [], empleadores: [] });
  const [empresas, setEmpresas] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [estadoF, setEstadoF] = useState('Abierta');
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState('create');
  const [form, setForm] = useState({});
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  const PER = 10;

  /* ── Load initial data ─────────────────────────────────────────── */
  useEffect(() => {
    Promise.all([
      api.get('/requisiciones'),
      api.get('/seleccion/catalogos'),
      api.get('/empresas'),
    ])
      .then(([r, c, e]) => { setData(r.data); setCatalogs(c.data); setEmpresas(e.data); })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    const open = modal;
    document.documentElement.style.overflowY = open ? 'hidden' : '';
    document.body.style.overflowY = open ? 'hidden' : '';
    return () => { document.documentElement.style.overflowY = ''; document.body.style.overflowY = ''; };
  }, [modal]);

  useEffect(() => { setPage(1); }, [search, estadoF]);

  const ch    = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const chVal = k => val => setForm(p => ({ ...p, [k]: val }));

  const reload = () => {
    api.get('/requisiciones').then(r => setData(r.data)).catch(console.error);
  };

  /* ── Derived data ──────────────────────────────────────────────── */
  const ciudadesOpts     = (catalogs.ciudades || []).map(c => ({ value: String(c.id), label: c.nombre }));
  const proyectosOpts    = (catalogs.proyectos || []).map(p => ({ value: String(p.value), label: p.label }));
  const responsablesOpts = (catalogs.responsables || []).map(u => ({ value: u.name, label: u.name }));
  const empresasOpts     = (empresas || []).map(e => ({ value: String(e.id), label: e.nombre }));
  const empleadoresOpts  = (catalogs.empleadores || []).map(e => ({ value: String(e.id), label: e.nombre }));
  const cargosOpts       = (catalogs.cargos || []).map(c => ({ value: String(c.id), label: c.nombre }));

  const handleSolicitanteChange = (name) => {
    const user = (catalogs.responsables || []).find(u => u.name === name);
    setForm(p => ({
      ...p,
      nombre_responsable:    name,
      numero_identificacion: user?.cedula ?? p.numero_identificacion ?? '',
      cargo_solicitante:     user?.cargo  ?? p.cargo_solicitante ?? '',
    }));
  };

  /* ── Modal requisicion ─────────────────────────────────────────── */
  const openModal = (m, row = null) => {
    setMode(m);
    if (m === 'create') {
      setForm({ fecha_solicitud: today(), estado: 'Abierta', solicitud_confidencial: 'No', pais: 'Colombia' });
    } else if (row) {
      setForm({
        id:                          row.id,
        nombre_responsable:          row.responsable || '',
        numero_identificacion:       row.nro_identificacion || '',
        cargo_solicitante:           row.cargo_solicitante || '',
        fecha_solicitud:             row.fecha_solicitud || today(),
        proceso:                     row.proceso || '',
        numero_identificacion_proceso: row.nro_identificacion_proceso,
        cargo_id:                    row.cargo_id != null ? String(row.cargo_id) : '',
        tipo_solicitud:              row.tipo_solicitud || '',
        proyecto_id:                 row.proyecto_id != null ? String(row.proyecto_id) : '',
        empresa_id:                  row.empresa_id  != null ? String(row.empresa_id)  : '',
        empleador_id:                row.empleador_id != null ? String(row.empleador_id) : '',
        fecha_ingreso:               row.fecha_ingreso || '',
        pais:                        row.pais || 'Colombia',
        fecha_cierre:                row.fecha_cierre || '',
        ciudad_id:                   row.ciudad_id != null ? String(row.ciudad_id) : '',
        observaciones:               row.observaciones || '',
        estado:                      row.estado || 'Abierta',
        solicitud_confidencial:      row.solicitud_confidencial ? 'Sí' : 'No',
      });
    }
    setModal(true);
  };

  const saveModal = async () => {
    try {
      setSaving(true);
      const payload = {
        nro_identificacion:     form.numero_identificacion,
        cargo_id:               form.cargo_id       || null,
        cargo_solicitante:      form.cargo_solicitante,
        fecha_solicitud:        form.fecha_solicitud,
        fecha_ingreso:          form.fecha_ingreso  || null,
        fecha_cierre:           form.fecha_cierre   || null,
        requeridas:             parseInt(form.numero_personas) || 1,
        proyecto_id:            form.proyecto_id    || null,
        empresa_id:             form.empresa_id     || null,
        empleador_id:           form.empleador_id   || null,
        tipo_solicitud:         form.tipo_solicitud,
        responsable:            form.nombre_responsable,
        proceso:                form.proceso,
        ciudad_id:              form.ciudad_id      || null,
        pais:                   form.pais || 'Colombia',
        estado:                 form.estado || 'Abierta',
        solicitud_confidencial: form.solicitud_confidencial === 'Sí',
        observaciones:          form.observaciones  || null,
      };
      if (mode === 'create') {
        const { data: nr } = await api.post('/requisiciones', payload);
        setData(prev => [nr, ...prev]);
      } else {
        const { data: upd } = await api.put(`/requisiciones/${form.id}`, payload);
        setData(prev => prev.map(r => r.id === form.id ? upd : r));
      }
      setModal(false);
    } catch (e) {
      alert('Error al guardar: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  /* ── Filters & pagination ─────────────────────────────────────── */
  const filtered = data.filter(r => {
    const ok = Object.values(r).some(v => String(v || '').toLowerCase().includes(search.toLowerCase()));
    return ok && (estadoF === 'Todas' || r.estado === estadoF);
  });
  const totalP   = Math.max(1, Math.ceil(filtered.length / PER));
  const paged    = filtered.slice((page - 1) * PER, page * PER);

  const copyFormLink = (row) => {
    const url = `${window.location.origin}/registro-candidatos?token=${row.registro_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const isRO = m => m === 'view';

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div style={S.page}>

      {/* Toolbar */}
      <div style={S.toolbar}>
        <div style={S.filters}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} style={S.searchInput} />
          </div>
          <FilterDropdown
            label="Estado"
            value={estadoF}
            onChange={setEstadoF}
            options={['Todas', 'Abierta', 'En proceso', 'Completada', 'Cancelada']}
          />
        </div>
        <div style={S.row}>
          <button style={S.btnOutline} onClick={reload}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            Actualizar
          </button>
          <button style={S.btnPrimary} onClick={() => openModal('create')}>+ Nueva requisición</button>
        </div>
      </div>

      {/* Loading */}
      {loadingData && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontFamily: NUN, fontSize: '0.9rem' }}>
          Cargando requisiciones…
        </div>
      )}

      {/* Tabla */}
      {!loadingData && (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              {['Item', 'Nro. ID proceso', 'Estado', 'Cargo requerido', 'Fecha solicitud', 'Proyecto', 'Tipo solicitud', 'Ciudad'].map(h => <th key={h} style={S.th}>{h}</th>)}
              <th style={{ ...S.th, textAlign: 'center' }}>Acciones</th>
            </tr></thead>
            <tbody>
              {paged.map((row, i) => {
                const [bg, color] = estadoColor(row.estado);
                return (
                  <tr key={row.id} style={S.tr}>
                    <td style={S.td}>{(page - 1) * PER + i + 1}</td>
                    <td style={S.td}>{row.nro_identificacion_proceso}</td>
                    <td style={S.td}><span style={S.badge(bg, color)}>{row.estado}</span></td>
                    <td style={S.td}>{row.cargo?.nombre || '-'}</td>
                    <td style={S.td}>{fmtDate(row.fecha_solicitud)}</td>
                    <td style={S.td}>{row.proyecto?.nombre || '-'}</td>
                    <td style={S.td}>{row.tipo_solicitud}</td>
                    <td style={S.td}>{row.ciudad?.nombre || '-'}</td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <div style={S.actions}>
                        <button style={S.aBtn('#e8f8f5', 'var(--primary-dark)')} title="Editar" onClick={() => openModal('edit', row)}><IconEdit size={14}/></button>
                        <button style={S.aBtn('#e8f0ff', '#1a4fa8')} title="Ver" onClick={() => openModal('view', row)}><IconEye size={14}/></button>
                        {row.estado === 'En proceso' && (
                          <button
                            style={S.aBtn(copiedId === row.id ? '#d1fae5' : '#fef3c7', copiedId === row.id ? '#065f46' : '#92400e')}
                            title={copiedId === row.id ? '¡Enlace copiado!' : `Copiar enlace del formulario (${row.nro_identificacion_proceso})`}
                            onClick={() => copyFormLink(row)}
                          >
                            {copiedId === row.id
                              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            }
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan="9" style={S.empty}>No hay requisiciones que coincidan con la búsqueda.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {!loadingData && filtered.length > 0 && (
        <div style={S.pgWrap}>
          <span style={S.pgInfo}>Página {page} · {Math.min(PER, filtered.length - (page - 1) * PER)} de {filtered.length} registros</span>
          <div style={S.row}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={S.pgBtn(page === 1)}>‹</button>
            {pages(page, totalP).map((n, i) => n === '...'
              ? <span key={`e${i}`} style={S.pgDot}>…</span>
              : <button key={n} onClick={() => setPage(n)} style={n === page ? S.pgActive : S.pgBtn(false)}>{n}</button>
            )}
            <button onClick={() => setPage(p => Math.min(totalP, p + 1))} disabled={page === totalP} style={S.pgBtn(page === totalP)}>›</button>
          </div>
        </div>
      )}

      {/* Modal Requisición */}
      {modal && (
        <div style={S.overlay} onClick={() => setModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.mHead}>
              <span style={S.mTitle}>{mode === 'create' ? 'Registrar nueva requisición' : mode === 'edit' ? 'Editar requisición' : 'Detalles de la requisición'}</span>
              <button style={S.mClose} onClick={() => setModal(false)}><IconClose size={13}/></button>
            </div>
            <div style={S.mBody}>
              <div style={S.g3}>
                {/* Responsable — selección con auto-relleno */}
                <SField l="Nombre responsable" req={!isRO(mode)}>
                  <SearchableSelect
                    key={`resp-${form.nombre_responsable ?? ''}`}
                    value={form.nombre_responsable ?? ''}
                    onChange={handleSolicitanteChange}
                    options={responsablesOpts}
                    disabled={isRO(mode)}
                  />
                </SField>
                <F l="N° identificación"     k="numero_identificacion" req={!isRO(mode)} form={form} ch={ch} dis={isRO(mode)} />
                <F l="Cargo del solicitante" k="cargo_solicitante"     req={!isRO(mode)} form={form} ch={ch} dis={isRO(mode)} />
                <F l="Fecha de solicitud"          k="fecha_solicitud"              req={!isRO(mode)} dis form={form} ch={ch} />
                <F l="Proceso"                     k="proceso"                      req={!isRO(mode)} opts={OPT.procesos} form={form} ch={ch} dis={isRO(mode)} />
                <F l="N° identificación del proceso" k="numero_identificacion_proceso" req={!isRO(mode)} dis form={form} ch={ch} />
                <F l="Cargo requerido"             k="cargo_id"                     req={!isRO(mode)} opts={cargosOpts} form={form} ch={ch} dis={isRO(mode)} />
                <F l="Tipo de solicitud"           k="tipo_solicitud"               req={!isRO(mode)} opts={OPT.tipos} form={form} ch={ch} dis={isRO(mode)} />
                {/* Proyecto – SearchableSelect */}
                <SField l="Proyecto" req={!isRO(mode)}>
                  <SearchableSelect
                    key={`proy-${form.proyecto_id ?? ''}`}
                    value={form.proyecto_id ?? ''}
                    onChange={chVal('proyecto_id')}
                    options={proyectosOpts}
                    defaultValue=""
                    disabled={isRO(mode)}
                  />
                </SField>

                {/* Empresa – SearchableSelect */}
                <SField l="Empresa" req={!isRO(mode)}>
                  <SearchableSelect
                    key={`emp-${form.empresa_id ?? ''}`}
                    value={form.empresa_id ?? ''}
                    onChange={chVal('empresa_id')}
                    options={empresasOpts}
                    defaultValue=""
                    disabled={isRO(mode)}
                  />
                </SField>

                {/* Empleador – SearchableSelect */}
                <SField l="Empleador">
                  <SearchableSelect
                    key={`empl-${form.empleador_id ?? ''}`}
                    value={form.empleador_id ?? ''}
                    onChange={chVal('empleador_id')}
                    options={empleadoresOpts}
                    defaultValue=""
                    disabled={isRO(mode)}
                  />
                </SField>

                <F l="Fecha estimada de ingreso" k="fecha_ingreso" req={!isRO(mode)} type="date" form={form} ch={ch} dis={isRO(mode)} />
                <F l="País"                      k="pais"          form={form} ch={ch} dis={true} />
                <F l="Fecha estimada de cierre"  k="fecha_cierre"  req={!isRO(mode)} type="date" form={form} ch={ch} dis={isRO(mode)} />

                {/* Ciudad – SearchableSelect */}
                <SField l="Ciudad de operación" req={!isRO(mode)}>
                  <SearchableSelect
                    key={`ciudad-${form.ciudad_id ?? ''}`}
                    value={form.ciudad_id ?? ''}
                    onChange={chVal('ciudad_id')}
                    options={ciudadesOpts}
                    defaultValue=""
                    disabled={isRO(mode)}
                  />
                </SField>

                <F l="Observaciones"            k="observaciones"         type="textarea" form={form} ch={ch} dis={isRO(mode)} />
                <F l="Estado"                   k="estado"                req={!isRO(mode)} opts={OPT.estados} form={form} ch={ch} dis={isRO(mode)} />
                <F l="¿Solicitud confidencial?" k="solicitud_confidencial" req={!isRO(mode)} opts={OPT.sino} form={form} ch={ch} dis={isRO(mode)} />
              </div>

            </div>
            <div style={S.mFoot}>
              {isRO(mode)
                ? <button style={S.btnOutline} onClick={() => setModal(false)}>Cerrar</button>
                : <>
                    <button style={S.btnOutline} onClick={() => setModal(false)}>Cancelar</button>
                    <button style={{ ...S.btnPrimary, opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={saveModal}>
                      {saving ? 'Guardando…' : 'Guardar requisición'}
                    </button>
                  </>
              }
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Field helpers ──────────────────────────────────────────────────── */
function F({ l, k, type = 'text', opts, req, span, form, ch, dis }) {
  const inp = { ..._inp, color: dis ? 'var(--text-muted)' : 'var(--text)', background: dis ? 'var(--bg)' : 'var(--white)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, ...(span ? { gridColumn: `span ${span}` } : {}) }}>
      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text)', fontFamily: NUN }}>
        {l}{req && <span style={{ color: '#e74c3c', marginLeft: 3 }}>*</span>}
      </label>
      {opts
        ? <SearchableSelect value={form[k] ?? ''} onChange={(val) => ch(k)({ target: { value: val } })} options={opts.map(o => typeof o === 'string' ? { value: o, label: o } : o)} defaultValue="" disabled={dis} />
        : type === 'textarea'
          ? <textarea style={{ ...inp, minHeight: 40, resize: 'vertical' }} value={form[k] ?? ''} onChange={ch(k)} disabled={dis} />
          : <input type={type} style={inp} value={form[k] ?? ''} onChange={ch(k)} disabled={dis} />
      }
    </div>
  );
}

function SField({ l, req, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text)', fontFamily: NUN }}>
        {l}{req && <span style={{ color: '#e74c3c', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */
const S = {
  page:        { display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' },
  toolbar:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  filters:     { display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  row:         { display: 'flex', alignItems: 'center', gap: 8 },
  searchWrap:  { position: 'relative', flex: 1, minWidth: 180, maxWidth: 360 },
  searchIcon:  { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--text-muted)', pointerEvents: 'none' },
  searchInput: { ..._inp, height: 40, padding: '0 12px 0 32px' },
  label:       { fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: NUN, whiteSpace: 'nowrap' },
  btnPrimary:  { ..._btn, padding: '0 18px', background: 'var(--primary)', color: '#fff', border: 'none' },
  btnOutline:  { ..._btn, padding: '0 14px', background: 'var(--white)', color: 'var(--text)', border: BD },
  card:        { background: 'var(--white)', border: BD, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflowX: 'auto' },
  table:       { width: '100%', borderCollapse: 'collapse', minWidth: 1000 },
  th:          { padding: '11px 14px', background: 'var(--bg)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.72rem', fontFamily: NUN, textAlign: 'left', borderBottom: BD, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' },
  tr:          { borderBottom: '1px solid var(--border)' },
  td:          { padding: '11px 14px', fontSize: '0.85rem', fontFamily: NUN, color: 'var(--text)', verticalAlign: 'middle' },
  badge:       (bg, c) => ({ background: bg, color: c, borderRadius: 20, padding: '3px 10px', fontSize: '0.74rem', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: NUN }),
  actions:     { display: 'flex', gap: 5, justifyContent: 'center' },
  aBtn:        (bg, c) => ({ background: bg, border: 'none', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }),
  empty:       { padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', fontFamily: NUN },
  pgWrap:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  pgInfo:      { color: 'var(--text-muted)', fontSize: '0.84rem', fontFamily: NUN },
  pgBtn:       d => ({ ..._pgb, background: 'var(--white)', color: d ? 'var(--text-muted)' : 'var(--text)', cursor: d ? 'default' : 'pointer', opacity: d ? 0.4 : 1 }),
  pgActive:    { ..._pgb, border: '1.5px solid var(--primary)', background: 'var(--primary)', color: '#fff', cursor: 'default' },
  pgDot:       { minWidth: 24, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', userSelect: 'none' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(26,58,53,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: 20 },
  modal:       { background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: '0 16px 60px rgba(26,155,140,0.22)', width: '100%', maxWidth: 900, maxHeight: '92vh', display: 'flex', flexDirection: 'column' },
  mHead:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'var(--primary)', borderTopLeftRadius: 'var(--radius)', borderTopRightRadius: 'var(--radius)', flexShrink: 0 },
  mTitle:      { fontFamily: POP, fontWeight: 700, fontSize: '1.05rem', color: '#fff' },
  mClose:      { background: 'none', border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 },
  mBody:       { padding: '20px 24px 24px', overflowY: 'auto', overflowX: 'hidden', flex: 1 },
  mFoot:       { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: BD, flexShrink: 0 },
  g3:          { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 },
  secTitle:    { margin: '22px 0 10px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', fontFamily: POP },
  ta:          d => ({ ..._inp, color: d ? 'var(--text-muted)' : 'var(--text)', background: d ? 'var(--bg)' : 'var(--white)', minHeight: 72, resize: 'vertical' }),
  fl:          { fontSize: '0.76rem', fontWeight: 700, color: 'var(--text)', fontFamily: NUN },
  req:         { color: '#e74c3c', marginLeft: 3 },
};
