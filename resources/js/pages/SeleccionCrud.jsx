import React, { useState, useEffect } from 'react';
import { IconEye, IconEdit, IconClose } from '../components/Icons';

/* ── Data ───────────────────────────────────────────────────────────── */
const INITIAL_DATA = [{
  id: 1, nro_identificacion_proceso: 'REQ65', nro_identificacion: '123456789',
  estado: 'Abierta', cargo: 'Analista de datos', fecha_solicitud: '16 mayo 2026',
  contratadas_requeridas: '2 / 1', proyecto: 'SM: DIRECTV', tipo_solicitud: 'RP: Reemplazo',
  responsable: 'JORGE EMILIO VARON - jorgevaron@servimercadeo.com',
  proceso: 'Administrativo', ciudad: 'Pereira'
}];

const today = () => new Date().toISOString().slice(0, 10);

const CANDS_MOCK = [
  { id: 1, requisicion_id: '1', nombres: 'Simon Gallego', identificacion: '1089383135', correo: 'simon.23051997@gmail.com', celular: '3217085550', ciudad: 'Pereira', tipo_documento: 'Cédula de Ciudadanía', fecha_expedicion: '2015-06-12', edad: '29', fecha_postulacion: today(), fuente: 'Fase Inicial', fuente_especifica: 'Pendiente de Aval', estado: 'Contratación', pruebas: true, aval: true, observaciones: 'Excelente perfil técnico.' },
  { id: 2, requisicion_id: '1', nombres: 'Juan Camilo', identificacion: '1089381135', correo: 'marin.jc2005@gmail.com', celular: '3217085555', ciudad: 'Pereira', tipo_documento: 'Cédula de Ciudadanía', fecha_expedicion: '2023-01-20', edad: '21', fecha_postulacion: today(), fuente: 'Fase Inicial', fuente_especifica: 'Pendiente de Aval', estado: 'Contratación', pruebas: true, aval: true, observaciones: 'Gran motivación.' },
];

const OPT = {
  responsables: ['Jorge Emilio Varón', 'Ana Gómez', 'Luis Martínez'],
  procesos: ['Administrativo', 'Operativo', 'Comercial', 'Tecnología'],
  cargos: ['Analista de datos', 'Desarrollador', 'Gerente', 'Asistente'],
  tipos: ['RP: Reemplazo', 'CN: Cargo Nuevo'],
  numeros: ['1', '2', '3', '4', '5'],
  proyectos: ['SM: DIRECTV', 'SM: CLARO', 'Proyecto Interno'],
  paises: ['Colombia', 'Perú', 'Ecuador', 'México'],
  estados: ['Abierta', 'En proceso', 'Cerrada', 'Cancelada'],
  sino: ['Sí', 'No'],
  tipos_doc: ['Cédula de Ciudadanía', 'Cédula de Extranjería', 'Pasaporte', 'Tarjeta de Identidad'],
  fuentes: ['Fase Inicial', 'Vinculacion temporal', 'Vinculacion directa'],
  fuentes_esp: ['Pendiente de Aval', 'Contratar por S&M'],
};

const EMPTY_CAND = (reqId = '') => ({ requisicion_id: String(reqId), nombres: '', correo: '', celular: '', ciudad: '', tipo_documento: 'Cédula de Ciudadanía', identificacion: '', fecha_expedicion: '', edad: '', fecha_postulacion: today(), fuente: 'Fase Inicial', fuente_especifica: 'Pendiente de Aval', estado: 'Entrevista', observaciones: '' });

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
  if (v === 'abierta' || v === 'activa') return ['#d1fae5', '#065f46'];
  if (v === 'cerrada' || v === 'inactiva') return ['#fee2e2', '#991b1b'];
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
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('seleccionData')) || INITIAL_DATA; } catch { return INITIAL_DATA; }
  });
  useEffect(() => { localStorage.setItem('seleccionData', JSON.stringify(data)); }, [data]);

  const [search, setSearch] = useState('');
  const [estadoF, setEstadoF] = useState('Abierta');
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState('create');
  const [form, setForm] = useState({});
  const [page, setPage] = useState(1);
  const [cands, setCands] = useState(CANDS_MOCK);
  const [candSearch, setCandSearch] = useState('');
  const [candModal, setCandModal] = useState(false);
  const [candMode, setCandMode] = useState('create');
  const [candForm, setCandForm] = useState(EMPTY_CAND());
  const PER = 10;

  useEffect(() => {
    const open = modal || candModal;
    document.documentElement.style.overflowY = open ? 'hidden' : '';
    document.body.style.overflowY = open ? 'hidden' : '';
    return () => { document.documentElement.style.overflowY = ''; document.body.style.overflowY = ''; };
  }, [modal, candModal]);

  useEffect(() => { setPage(1); }, [search, estadoF]);

  const ch = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openModal = (m, row = null) => {
    setMode(m);
    if (m === 'create') {
      const nums = data.map(d => parseInt(String(d.nro_identificacion_proceso).replace(/\D/g, ''), 10)).filter(Boolean);
      setForm({ fecha_solicitud: '21 mayo 2026', numero_identificacion_proceso: `REQ${nums.length ? Math.max(...nums) + 1 : 66}`, estado: 'Abierta', solicitud_confidencial: 'No' });
    } else if (row) {
      setForm({ id: row.id, nombre_responsable: row.responsable.split(' - ')[0], numero_identificacion: row.nro_identificacion || '123456789', cargo_solicitante: row.cargo || 'Coordinador', fecha_solicitud: row.fecha_solicitud, proceso: row.proceso, numero_identificacion_proceso: row.nro_identificacion_proceso, cargo_requerido: row.cargo, tipo_solicitud: row.tipo_solicitud, numero_personas: row.contratadas_requeridas.split(' / ')[1] || '1', proyecto: row.proyecto, fecha_ingreso: '2026-05-25', pais: 'Colombia', fecha_cierre: '2026-06-15', ciudad: row.ciudad, observaciones: '', estado: row.estado, solicitud_confidencial: 'No' });
    }
    setModal(true);
  };

  const saveModal = () => {
    if (mode === 'create') {
      const newId = data.length ? Math.max(...data.map(d => d.id)) + 1 : 1;
      setData([{ id: newId, nro_identificacion: form.numero_identificacion || '-', nro_identificacion_proceso: form.numero_identificacion_proceso || `REQ${newId + 100}`, estado: form.estado || 'Abierta', cargo: form.cargo_requerido || form.cargo_solicitante || 'Sin definir', fecha_solicitud: form.fecha_solicitud || '21 mayo 2026', contratadas_requeridas: `0 / ${form.numero_personas || '1'}`, proyecto: form.proyecto || 'Sin definir', tipo_solicitud: form.tipo_solicitud || 'RP: Reemplazo', responsable: form.nombre_responsable ? `${form.nombre_responsable} - solicitante@servimercadeo.com` : 'No asignado', proceso: form.proceso || 'Sin definir', ciudad: form.ciudad || 'Sin definir' }, ...data]);
    } else if (mode === 'edit') {
      setData(data.map(r => r.id !== form.id ? r : { ...r, estado: form.estado || r.estado, nro_identificacion: form.numero_identificacion || r.nro_identificacion, nro_identificacion_proceso: form.numero_identificacion_proceso || r.nro_identificacion_proceso, cargo: form.cargo_requerido || r.cargo, proyecto: form.proyecto || r.proyecto, tipo_solicitud: form.tipo_solicitud || r.tipo_solicitud, proceso: form.proceso || r.proceso, ciudad: form.ciudad || r.ciudad, contratadas_requeridas: `0 / ${form.numero_personas || '1'}` }));
    }
    setModal(false);
  };

  const addCand = () => { setCandMode('create'); setCandForm(EMPTY_CAND(form.id || '')); setCandModal(true); };
  const editCand = c => { setCandMode('edit'); setCandForm({ ...c }); setCandModal(true); };
  const viewCand = c => { setCandMode('view'); setCandForm({ ...c }); setCandModal(true); };
  const removeCand = id => { if (confirm('¿Eliminar este candidato?')) setCands(p => p.filter(c => c.id !== id)); };

  const saveCand = () => {
    if (!candForm.nombres || !candForm.correo || !candForm.celular || !candForm.identificacion || !candForm.fuente || !candForm.fuente_especifica) { alert('Complete los campos obligatorios (*).'); return; }
    if (candMode === 'create') setCands(p => [...p, { ...candForm, id: p.length ? Math.max(...p.map(c => c.id)) + 1 : 1, pruebas: false, aval: false }]);
    else setCands(p => p.map(c => c.id === candForm.id ? { ...c, ...candForm } : c));
    setCandModal(false);
  };

  const filtered = data.filter(r => {
    const ok = Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
    return ok && (estadoF === 'Todas' || r.estado === estadoF);
  });
  const totalP = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice((page - 1) * PER, page * PER);
  const filtCands = cands.filter(c => {
    if (mode === 'manage' && form.id && String(c.requisicion_id) !== String(form.id)) return false;
    const t = candSearch.toLowerCase();
    return !t || [c.nombres, c.identificacion, c.correo, c.celular, c.fuente, c.estado].some(v => String(v).toLowerCase().includes(t));
  });

  const isRO = m => m === 'view' || m === 'manage';

  return (
    <div style={S.page}>

      {/* Toolbar */}
      <div style={S.toolbar}>
        <div style={S.filters}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input type="text" placeholder="Buscar requisición, cargo o proyecto..." value={search} onChange={e => setSearch(e.target.value)} style={S.searchInput} />
          </div>
          <div style={S.estadoWrap}>
            <span style={S.label}>Estado</span>
            <select value={estadoF} onChange={e => setEstadoF(e.target.value)} style={S.estadoSelect}>
              {['Todas','Abierta','En proceso','Cerrada','Cancelada'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={S.row}>
          <button style={S.btnOutline}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            Actualizar
          </button>
          <button style={S.btnPrimary} onClick={() => openModal('create')}>+ Nueva requisición</button>
        </div>
      </div>

      {/* Tabla */}
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>
            {['Item','Nro. ID proceso','Estado','Cargo requerido','Fecha solicitud','Proyecto','Tipo solicitud','Ciudad'].map(h => <th key={h} style={S.th}>{h}</th>)}
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
                  <td style={S.td}>{row.cargo}</td>
                  <td style={S.td}>{row.fecha_solicitud}</td>
                  <td style={S.td}>{row.proyecto}</td>
                  <td style={S.td}>{row.tipo_solicitud}</td>
                  <td style={S.td}>{row.ciudad}</td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <div style={S.actions}>
                      <button style={S.aBtn('#e8f8f5','var(--primary-dark)')} title="Editar" onClick={() => openModal('edit', row)}><IconEdit size={14}/></button>
                      <button style={S.aBtn('#e8f0ff','#1a4fa8')} title="Ver" onClick={() => openModal('view', row)}><IconEye size={14}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan="9" style={S.empty}>No hay requisiciones que coincidan con la búsqueda.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {filtered.length > 0 && (
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
              <span style={S.mTitle}>{mode === 'create' ? 'Registrar nueva requisición' : mode === 'edit' ? 'Editar requisición' : mode === 'manage' ? 'Gestión de candidatos' : 'Detalles de la requisición'}</span>
              <button style={S.mClose} onClick={() => setModal(false)}><IconClose size={13}/></button>
            </div>
            <div style={S.mBody}>
              <div style={S.g3}>
                <F l="Nombre responsable" k="nombre_responsable" req={!isRO(mode)} opts={OPT.responsables} form={form} ch={ch} dis={isRO(mode)} />
                <F l="N° identificación" k="numero_identificacion" req={!isRO(mode)} form={form} ch={ch} dis={isRO(mode) || mode === 'edit'} />
                <F l="Cargo del solicitante" k="cargo_solicitante" req={!isRO(mode)} form={form} ch={ch} dis={isRO(mode) || mode === 'edit'} />
                <F l="Fecha de solicitud" k="fecha_solicitud" req={!isRO(mode)} dis form={form} ch={ch} />
                <F l="Proceso" k="proceso" req={!isRO(mode)} opts={OPT.procesos} form={form} ch={ch} dis={isRO(mode)} />
                <F l="N° identificación del proceso" k="numero_identificacion_proceso" req={!isRO(mode)} dis form={form} ch={ch} />
                <F l="Cargo requerido" k="cargo_requerido" req={!isRO(mode)} opts={OPT.cargos} form={form} ch={ch} dis={isRO(mode)} />
                <F l="Tipo de solicitud" k="tipo_solicitud" req={!isRO(mode)} opts={OPT.tipos} form={form} ch={ch} dis={isRO(mode)} />
                <F l="Personas requeridas" k="numero_personas" req={!isRO(mode)} opts={OPT.numeros} form={form} ch={ch} dis={isRO(mode)} />
                <F l="Proyecto" k="proyecto" req={!isRO(mode)} opts={OPT.proyectos} form={form} ch={ch} dis={isRO(mode)} />
                <F l="Fecha estimada de ingreso" k="fecha_ingreso" req={!isRO(mode)} type="date" form={form} ch={ch} dis={isRO(mode)} />
                <F l="País" k="pais" req={!isRO(mode)} opts={OPT.paises} form={form} ch={ch} dis={isRO(mode)} />
                <F l="Fecha estimada de cierre" k="fecha_cierre" req={!isRO(mode)} type="date" form={form} ch={ch} dis={isRO(mode)} />
                <F l="Ciudad de operación" k="ciudad" req={!isRO(mode)} form={form} ch={ch} dis={isRO(mode)} />
                <F l="Observaciones" k="observaciones" type="textarea" form={form} ch={ch} dis={isRO(mode)} />
                <F l="Estado" k="estado" req={!isRO(mode)} opts={OPT.estados} form={form} ch={ch} dis={isRO(mode)} />
                <F l="¿Solicitud confidencial?" k="solicitud_confidencial" req={!isRO(mode)} opts={OPT.sino} form={form} ch={ch} dis={isRO(mode)} />
              </div>

              {mode === 'manage' && (
                <div style={S.candSec}>
                  <div style={S.row}>
                    {[['Requeridos', form.numero_personas || 1], ['Agregados', cands.length], ['Contratados', cands.filter(c => c.estado === 'Contratación').length]].map(([l, v]) => (
                      <span key={l} style={S.chip}>{l}: <strong>{v}</strong></span>
                    ))}
                  </div>
                  <div style={S.candCtrl}>
                    <div style={{ ...S.searchWrap, maxWidth: 260 }}>
                      <span style={S.searchIcon}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                      <input type="text" placeholder="Buscar candidato..." value={candSearch} onChange={e => setCandSearch(e.target.value)} style={S.searchInput} />
                    </div>
                    <div style={S.row}>
                      <button style={S.btnOutline} onClick={() => setCandSearch('')}>Actualizar</button>
                      <button style={{ ...S.btnOutline, opacity: cands.some(c => c.selected) ? 1 : 0.4, cursor: cands.some(c => c.selected) ? 'pointer' : 'not-allowed' }} onClick={() => { if (cands.some(c => c.selected)) alert(`Entrevista agendada para: ${cands.filter(c => c.selected).map(c => c.nombres).join(', ')}`); }}>Agendar entrevista</button>
                      <button style={S.btnPrimary} onClick={addCand}>Agregar candidato</button>
                    </div>
                  </div>
                  <div style={S.card}>
                    <table style={{ ...S.table, minWidth: 480 }}>
                      <thead><tr>
                        {['Nombres','Identificación','Correo','Estado'].map(h => <th key={h} style={S.th}>{h}</th>)}
                        <th style={{ ...S.th, textAlign: 'center' }}>Acciones</th>
                      </tr></thead>
                      <tbody>
                        {filtCands.map(c => (
                          <tr key={c.id} style={S.tr}>
                            <td style={{ ...S.td, fontWeight: 700 }}>{c.nombres}</td>
                            <td style={{ ...S.td, fontFamily: 'monospace' }}>{c.identificacion}</td>
                            <td style={S.td}>{c.correo}</td>
                            <td style={S.td}><span style={S.badge(c.estado === 'Contratación' ? '#d1fae5' : '#e8f0ff', c.estado === 'Contratación' ? '#065f46' : '#1a4fa8')}>{c.estado}</span></td>
                            <td style={{ ...S.td, textAlign: 'center' }}>
                              <div style={S.actions}>
                                <button style={S.aBtn('#e8f8f5','var(--primary-dark)')} onClick={() => editCand(c)}><IconEdit size={13}/></button>
                                <button style={S.aBtn('#e8f0ff','#1a4fa8')} onClick={() => viewCand(c)}><IconEye size={13}/></button>
                                <button style={S.aBtn('#fce8e8','#a33')} onClick={() => removeCand(c.id)}><IconClose size={13}/></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!filtCands.length && <tr><td colSpan="5" style={S.empty}>Sin candidatos.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div style={S.mFoot}>
              {isRO(mode) ? <button style={S.btnOutline} onClick={() => setModal(false)}>Cerrar</button> : <><button style={S.btnOutline} onClick={() => setModal(false)}>Cancelar</button><button style={S.btnPrimary} onClick={saveModal}>Guardar requisición</button></>}
            </div>
          </div>
        </div>
      )}

      {/* Modal Candidato */}
      {candModal && (
        <div style={S.overlay} onClick={() => setCandModal(false)}>
          <div style={{ ...S.modal, maxWidth: 960 }} onClick={e => e.stopPropagation()}>
            <div style={S.mHead}>
              <span style={S.mTitle}>{candMode === 'create' ? 'Agregar Candidato' : candMode === 'edit' ? 'Editar Candidato' : 'Detalles del Candidato'}</span>
              <button style={S.mClose} onClick={() => setCandModal(false)}><IconClose size={13}/></button>
            </div>
            <div style={S.mBody}>
              <h4 style={{ ...S.secTitle, marginTop: 0 }}>Datos personales</h4>
              <div style={S.g3}>
                <F l="Nombres completos" k="nombres" req form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view'} />
                <F l="Tipo de documento" k="tipo_documento" opts={OPT.tipos_doc} req form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view'} />
                <F l="N° de identificación" k="identificacion" req form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view'} />
                <F l="Fecha de expedición" k="fecha_expedicion" type="date" form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view'} />
                <F l="Edad" k="edad" type="number" form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view'} />
                <F l="Ciudad" k="ciudad" form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view'} />
                <F l="Correo electrónico" k="correo" type="email" req form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view'} />
                <F l="Celular" k="celular" req form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view'} />
                <F l="Fecha de postulación" k="fecha_postulacion" type="date" form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view' || candMode === 'create'} />
              </div>
              <h4 style={S.secTitle}>Proceso de selección</h4>
              <div style={S.g3}>
                <F l="Requisición asociada" k="requisicion_id" req span={3} opts={data.map(r => ({ value: String(r.id), label: `${r.nro_identificacion_proceso} – ${r.cargo}` }))} form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view'} />
                <F l="Fuente de reclutamiento" k="fuente" opts={OPT.fuentes} req form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view'} />
                <F l="Fuente específica" k="fuente_especifica" opts={OPT.fuentes_esp} req form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view'} />
                <F l="Estado del proceso" k="estado" opts={['Entrevista','Contratación','Descartado','En espera']} form={candForm} ch={k => e => setCandForm(p => ({ ...p, [k]: e.target.value }))} dis={candMode === 'view'} />
              </div>
              <h4 style={S.secTitle}>Observaciones</h4>
              <textarea style={S.ta(candMode === 'view')} value={candForm.observaciones || ''} onChange={e => setCandForm(p => ({ ...p, observaciones: e.target.value }))} disabled={candMode === 'view'} placeholder="Observaciones sobre el candidato..." />
            </div>
            <div style={S.mFoot}>
              {candMode === 'view' ? <button style={S.btnOutline} onClick={() => setCandModal(false)}>Cerrar</button> : <><button style={S.btnOutline} onClick={() => setCandModal(false)}>Cancelar</button><button style={S.btnPrimary} onClick={saveCand}>Guardar candidato</button></>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Field ──────────────────────────────────────────────────────────── */
function F({ l, k, type = 'text', opts, req, span, form, ch, dis }) {
  const inp = { ..._inp, color: dis ? 'var(--text-muted)' : 'var(--text)', background: dis ? 'var(--bg)' : 'var(--white)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, ...(span ? { gridColumn: `span ${span}` } : {}) }}>
      <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text)', fontFamily: NUN }}>
        {l}{req && <span style={{ color: '#e74c3c', marginLeft: 3 }}>*</span>}
      </label>
      {opts
        ? <select style={inp} value={form[k] ?? ''} onChange={ch(k)} disabled={dis}><option value="">-- Selecciona --</option>{opts.map(o => typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        : type === 'textarea'
          ? <textarea style={{ ...inp, minHeight: 40, resize: 'vertical' }} value={form[k] ?? ''} onChange={ch(k)} disabled={dis} />
          : <input type={type} style={inp} value={form[k] ?? ''} onChange={ch(k)} disabled={dis} />
      }
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */
const S = {
  page:       { display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' },
  toolbar:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  filters:    { display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  row:        { display: 'flex', alignItems: 'center', gap: 8 },
  searchWrap: { position: 'relative', flex: 1, minWidth: 180, maxWidth: 360 },
  searchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--text-muted)', pointerEvents: 'none' },
  searchInput:{ ..._inp, height: 40, padding: '0 12px 0 32px' },
  estadoWrap: { display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px', background: 'var(--white)', border: BD, borderRadius: RSM },
  label:      { fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: NUN, whiteSpace: 'nowrap' },
  estadoSelect:{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.87rem', fontFamily: NUN, color: 'var(--text)', fontWeight: 700, cursor: 'pointer' },
  btnPrimary: { ..._btn, padding: '0 18px', background: 'var(--primary)', color: '#fff', border: 'none' },
  btnOutline: { ..._btn, padding: '0 14px', background: 'var(--white)', color: 'var(--text)', border: BD },
  card:       { background: 'var(--white)', border: BD, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflowX: 'auto' },
  table:      { width: '100%', borderCollapse: 'collapse', minWidth: 1000 },
  th:         { padding: '11px 14px', background: 'var(--bg)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.72rem', fontFamily: NUN, textAlign: 'left', borderBottom: BD, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' },
  tr:         { borderBottom: '1px solid var(--border)' },
  td:         { padding: '11px 14px', fontSize: '0.85rem', fontFamily: NUN, color: 'var(--text)', verticalAlign: 'middle' },
  badge:      (bg, c) => ({ background: bg, color: c, borderRadius: 20, padding: '3px 10px', fontSize: '0.74rem', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: NUN }),
  actions:    { display: 'flex', gap: 5, justifyContent: 'center' },
  aBtn:       (bg, c) => ({ background: bg, border: 'none', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }),
  empty:      { padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', fontFamily: NUN },
  pgWrap:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  pgInfo:     { color: 'var(--text-muted)', fontSize: '0.84rem', fontFamily: NUN },
  pgBtn:      d => ({ ..._pgb, background: 'var(--white)', color: d ? 'var(--text-muted)' : 'var(--text)', cursor: d ? 'default' : 'pointer', opacity: d ? 0.4 : 1 }),
  pgActive:   { ..._pgb, border: '1.5px solid var(--primary)', background: 'var(--primary)', color: '#fff', cursor: 'default' },
  pgDot:      { minWidth: 24, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', userSelect: 'none' },
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(26,58,53,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: 20 },
  modal:      { background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: '0 16px 60px rgba(26,155,140,0.22)', width: '100%', maxWidth: 900, maxHeight: '92vh', display: 'flex', flexDirection: 'column' },
  mHead:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'var(--primary)', borderTopLeftRadius: 'var(--radius)', borderTopRightRadius: 'var(--radius)', flexShrink: 0 },
  mTitle:     { fontFamily: POP, fontWeight: 700, fontSize: '1.05rem', color: '#fff' },
  mClose:     { background: 'none', border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 },
  mBody:      { padding: '20px 24px 24px', overflowY: 'auto', overflowX: 'hidden', flex: 1 },
  mFoot:      { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: BD, flexShrink: 0 },
  g3:         { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 },
  secTitle:   { margin: '22px 0 10px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', fontFamily: POP },
  ta:         d => ({ ..._inp, color: d ? 'var(--text-muted)' : 'var(--text)', background: d ? 'var(--bg)' : 'var(--white)', minHeight: 72, resize: 'vertical' }),
  candSec:    { marginTop: 22, paddingTop: 18, borderTop: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: 14 },
  chip:       { padding: '4px 12px', background: 'var(--bg)', border: BD, borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', fontFamily: NUN },
  candCtrl:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
};
