import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  IconEye,
  IconEdit,
  IconClose,
  IconGestionar,
} from '../components/Icons';


const getTodayStr = () => new Date().toISOString().slice(0, 10);

const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

const interviewDateFrom = (dateStr) => {
  if (!dateStr) return { dia_entrevista: '', mes_entrevista: '', anio_entrevista: '' };
  const d = new Date(dateStr + 'T00:00:00');
  return { dia_entrevista: d.getDate(), mes_entrevista: MESES[d.getMonth()], anio_entrevista: d.getFullYear() };
};

const MOCK_OPTS = {
  tipos_documento: ['Cédula de Ciudadanía', 'Cédula de Extranjería', 'Pasaporte', 'Tarjeta de Identidad'],
  fuentes_reclutamiento: ['Fase Inicial', 'Vinculacion temporal', 'Vinculacion directa'],
  fuentes_especificas: ['Pendiente de Aval', 'Contratar por S&M'],
  estados_proceso: ['Entrevista', 'Contratación', 'Descartado', 'En espera'],
  meses: ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'],
};

export default function CandidatosCrud() {
  const [candidates, setCandidates] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
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
    ...interviewDateFrom(getTodayStr()),
    observaciones: ''
  });
  const [isProcModalOpen, setIsProcModalOpen] = useState(false);
  const [procModalCandidate, setProcModalCandidate] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [procActiveTab, setProcActiveTab] = useState('assesment');
  const [procForm, setProcForm] = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/candidatos'),
      api.get('/requisiciones'),
    ])
      .then(([c, r]) => { setCandidates(c.data); setRequisitions(r.data); })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, []);

  const reload = () => api.get('/candidatos').then(r => setCandidates(r.data)).catch(console.error);

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
        const extra = {};
        if (field === 'pruebas' || field === 'aval') {
          const newPruebas = field === 'pruebas' ? val : c.pruebas;
          const newAval = field === 'aval' ? val : c.aval;
          nextEstado = (newPruebas && newAval) ? 'Contratación' : 'Entrevista';
          if (field === 'aval') {
            extra.fecha_aval = val ? new Date().toISOString().slice(0, 10) : null;
          }
        }
        const updated = { ...c, [field]: val, estado: nextEstado, ...extra };
        api.put(`/candidatos/${candidateId}`, { [field]: val, estado: nextEstado, ...extra }).catch(console.error);
        return updated;
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
      estado: 'Entrevista', ...interviewDateFrom(getTodayStr()), observaciones: '', requisicion_id: ''
    });
    setIsCandModalOpen(true);
  };

  const handleEditCandidate = (c) => {
    setCandModalMode('edit');
    setCandForm({ ...c, ...interviewDateFrom(c.fecha_postulacion) });
    setIsCandModalOpen(true);
  };

  const handleOpenProcesos = (c) => {
    setProcModalCandidate(c);
    setProcActiveTab('assesment');
    // initialize form with existing candidate.processes or defaults
    setProcForm({
      assesment: {
        ejercicio_comercial:   c.asmt_ejercicio            ?? '',
        nombre_ejercicio:      c.asmt_nombre_ejercicio     ?? '',
        claridad_mensaje:      c.asmt_claridad_mensaje     ?? '',
        conviccion_energia:    c.asmt_conviccion_energia   ?? '',
        adaptabilidad_escucha: c.asmt_adaptabilidad_escucha ?? '',
        orientacion_accion:    c.asmt_orientacion_accion   ?? '',
        manejo_presion:        c.asmt_manejo_presion       ?? '',
        prom_calificacion:     c.asmt_prom                 ?? '',
      },
      entrevista: {
        trayectoria:          c.entv_trayectoria          ?? '',
        conexion_cliente:     c.entv_conexion_cliente     ?? '',
        aprendizaje_madurez:  c.entv_aprendizaje_madurez  ?? '',
        motivacion:           c.entv_motivacion           ?? '',
        disposicion_proyecto: c.entv_disposicion_proyecto ?? '',
        prom_calificacion:    c.entv_prom                 ?? '',
      },
      retroalimentacion: c.retroalimentacion ?? '',
      referencias: {
        ref_laboral_1: c.ref_laboral_1 ?? '',
        ref_laboral_2: c.ref_laboral_2 ?? '',
      },
      fraudes: {
        numero_seguimiento: c.fraude_nro_seguimiento ?? '',
        respuesta:          c.fraude_respuesta        ?? '',
        ciudad:             c.fraude_ciudad           ?? '',
        fecha_consulta:     c.fraude_fecha_consulta   ?? '',
        fuente_reclutamiento: c.fraude_fuente         ?? '',
      },
      seguridad: { estudio: c.seguridad_estudio ?? '' },
    });
    setIsProcModalOpen(true);
  };

  // helper: round to 1 decimal by default
  const round = (v, decimals = 1) => {
    if (v === '' || v === null || typeof v === 'undefined') return '';
    const m = Math.pow(10, decimals);
    return Math.round(Number(v) * m) / m;
  };

  const computeAverage = (obj, keys) => {
    if (!obj) return '';
    const vals = keys.map(k => parseFloat(obj[k])).filter(n => !isNaN(n));
    if (vals.length === 0) return '';
    const sum = vals.reduce((a, b) => a + b, 0);
    return round(sum / vals.length, 1);
  };

  const handleProcNumberChange = (section, key) => (e) => {
    const raw = e.target.value;
    const num = raw === '' ? '' : Number(raw);
    setProcForm(p => {
      const next = { ...p, [section]: { ...p[section], [key]: num } };
      // compute prom for the section
      const assesmentKeys = ['claridad_mensaje','conviccion_energia','adaptabilidad_escucha','orientacion_accion','manejo_presion'];
      const entrevistaKeys = ['trayectoria','conexion_cliente','aprendizaje_madurez','motivacion','disposicion_proyecto'];
      if (section === 'assesment') {
        next.assesment.prom_calificacion = computeAverage(next.assesment, assesmentKeys);
      } else if (section === 'entrevista') {
        next.entrevista.prom_calificacion = computeAverage(next.entrevista, entrevistaKeys);
      }
      return next;
    });
  };

  const handleViewCandidate = (c) => {
    setCandModalMode('view');
    setCandForm({ ...c, ...interviewDateFrom(c.fecha_postulacion) });
    setIsCandModalOpen(true);
  };

  const handleRemoveCandidate = async (candidateId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este candidato?')) return;
    try {
      await api.delete(`/candidatos/${candidateId}`);
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
    } catch (e) {
      alert('Error al eliminar: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleSaveCandidate = async () => {
    if (!candForm.nombres || !candForm.correo || !candForm.celular || !candForm.identificacion || !candForm.fuente || !candForm.fuente_especifica) {
      alert('Por favor, rellene todos los campos obligatorios (*).');
      return;
    }
    try {
      if (candModalMode === 'create') {
        const { data: created } = await api.post('/candidatos', { ...candForm, pruebas: false, aval: false });
        setCandidates(prev => [created, ...prev]);
      } else {
        const { data: updated } = await api.put(`/candidatos/${candForm.id}`, candForm);
        setCandidates(prev => prev.map(c => c.id === candForm.id ? updated : c));
      }
      setIsCandModalOpen(false);
      showToast(candModalMode === 'create' ? 'Candidato agregado exitosamente' : 'Candidato actualizado exitosamente');
    } catch (e) {
      alert('Error al guardar: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleSaveProcesos = async () => {
    if (!procModalCandidate) return setIsProcModalOpen(false);
    const f = procForm;
    const payload = {
      asmt_ejercicio:            f.assesment?.ejercicio_comercial   || null,
      asmt_nombre_ejercicio:     f.assesment?.nombre_ejercicio      || null,
      asmt_claridad_mensaje:     f.assesment?.claridad_mensaje      === '' ? null : f.assesment?.claridad_mensaje,
      asmt_conviccion_energia:   f.assesment?.conviccion_energia    === '' ? null : f.assesment?.conviccion_energia,
      asmt_adaptabilidad_escucha:f.assesment?.adaptabilidad_escucha === '' ? null : f.assesment?.adaptabilidad_escucha,
      asmt_orientacion_accion:   f.assesment?.orientacion_accion    === '' ? null : f.assesment?.orientacion_accion,
      asmt_manejo_presion:       f.assesment?.manejo_presion        === '' ? null : f.assesment?.manejo_presion,
      asmt_prom:                 f.assesment?.prom_calificacion     === '' ? null : f.assesment?.prom_calificacion,
      entv_trayectoria:          f.entrevista?.trayectoria          === '' ? null : f.entrevista?.trayectoria,
      entv_conexion_cliente:     f.entrevista?.conexion_cliente     === '' ? null : f.entrevista?.conexion_cliente,
      entv_aprendizaje_madurez:  f.entrevista?.aprendizaje_madurez  === '' ? null : f.entrevista?.aprendizaje_madurez,
      entv_motivacion:           f.entrevista?.motivacion           === '' ? null : f.entrevista?.motivacion,
      entv_disposicion_proyecto: f.entrevista?.disposicion_proyecto === '' ? null : f.entrevista?.disposicion_proyecto,
      entv_prom:                 f.entrevista?.prom_calificacion    === '' ? null : f.entrevista?.prom_calificacion,
      retroalimentacion:         f.retroalimentacion                || null,
      ref_laboral_1:             f.referencias?.ref_laboral_1       || null,
      ref_laboral_2:             f.referencias?.ref_laboral_2       || null,
      fraude_nro_seguimiento:    f.fraudes?.numero_seguimiento      || null,
      fraude_respuesta:          f.fraudes?.respuesta               || null,
      fraude_ciudad:             f.fraudes?.ciudad                  || null,
      fraude_fecha_consulta:     f.fraudes?.fecha_consulta          || null,
      fraude_fuente:             f.fraudes?.fuente_reclutamiento    || null,
      seguridad_estudio:         f.seguridad?.estudio               || null,
    };
    try {
      const { data: updated } = await api.put(`/candidatos/${procModalCandidate.id}`, payload);
      setCandidates(prev => prev.map(c => c.id === procModalCandidate.id ? updated : c));
      setIsProcModalOpen(false);
      setProcModalCandidate(null);
      showToast('Procesos guardados exitosamente');
    } catch (e) {
      alert('Error al guardar procesos: ' + (e.response?.data?.message || e.message));
    }
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btnSecondary} onClick={reload}>Actualizar</button>
          <button style={S.btnPrimary} onClick={handleAddCandidate}>+ Agregar candidato</button>
        </div>
      </div>

      {loadingData && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontFamily: 'Nunito,sans-serif', fontSize: '0.9rem' }}>
          Cargando candidatos…
        </div>
      )}

      {!loadingData && <div style={{ overflowX: 'auto', background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--border)' }}>
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
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)', fontWeight: 700 }}>
                  {c.nombres}
                </td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)', fontFamily: 'monospace' }}>{c.identificacion}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)' }}>{c.correo}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)' }}>{c.celular}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)' }}>{c.ciudad}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)' }}>{c.fuente}</td>
                <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text)' }}>{c.requisicion?.nro_identificacion_proceso || '–'}</td>
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
                    <button style={S.actionBtn('  #FFF8DA', '#000')} title="Procesos" onClick={() => handleOpenProcesos(c)}><IconGestionar size={15} /></button>
                    <button style={S.actionBtn('#e8f8f5', 'var(--primary-dark)')} title="Editar candidato" onClick={() => handleEditCandidate(c)}><IconEdit size={15} /></button>
                    <button style={S.actionBtn('#e8f0ff', '#1a4fa8')} title="Ver detalles" onClick={() => handleViewCandidate(c)}><IconEye size={15} /></button>
                    
                  </div>
                </td>
              </tr>
            ))}
            {filteredCandDetail.length === 0 && (
              <tr><td colSpan="12" style={S.empty}>No se encontraron candidatos.</td></tr>
            )}
          </tbody>
        </table>
      </div>}

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
                <Field label="Día entrevista" k="dia_entrevista" type="number" form={candForm} onChange={(k) => (e) => {}} disabled={true} />
                <Field label="Mes entrevista" k="mes_entrevista" form={candForm} onChange={(k) => (e) => {}} disabled={true} />
                <Field label="Año entrevista" k="anio_entrevista" type="number" form={candForm} onChange={(k) => (e) => {}} disabled={true} />
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

      {/* ─── Modal Procesos ─── */}
      {isProcModalOpen && (
        <div style={S.overlay} onClick={() => setIsProcModalOpen(false)}>
          <div style={{ ...S.modal, maxWidth: 960 }} onClick={e => e.stopPropagation()}>

            <div style={S.modalHeaderGreen}>
              <span style={S.modalTitleWhite}>
                Procesos {procModalCandidate ? `- ${procModalCandidate.nombres}` : ''}
              </span>
              <button style={S.closeBtnWhite} onClick={() => setIsProcModalOpen(false)}>
                <IconClose size={12} />
              </button>
            </div>

            <div style={S.modalBody}>
              <div style={S.tabSwitch}>
                <button type="button" onClick={() => setProcActiveTab('assesment')} style={procActiveTab === 'assesment' ? S.tabBtnActive : S.tabBtn}>ASSESMENT</button>
                <button type="button" onClick={() => setProcActiveTab('entrevista')} style={procActiveTab === 'entrevista' ? S.tabBtnActive : S.tabBtn}>ENTREVISTA</button>
                <button type="button" onClick={() => setProcActiveTab('retroalimentacion')} style={procActiveTab === 'retroalimentacion' ? S.tabBtnActive : S.tabBtn}>RETROALIMENTACIÓN</button>
                <button type="button" onClick={() => setProcActiveTab('referencias')} style={procActiveTab === 'referencias' ? S.tabBtnActive : S.tabBtn}>REF. LABORALES</button>
                <button type="button" onClick={() => setProcActiveTab('fraudes')} style={procActiveTab === 'fraudes' ? S.tabBtnActive : S.tabBtn}>FRAUDES</button>
                <button type="button" onClick={() => setProcActiveTab('seguridad')} style={procActiveTab === 'seguridad' ? S.tabBtnActive : S.tabBtn}>SEGURIDAD</button>
              </div>

              {procActiveTab === 'assesment' && (
                <div style={{ margin: '16px 0 10px 0' }}>
                  <div style={S.grid3}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>EJERCICIO COMERCIAL APLICADO</label>
                      <input value={procForm.assesment?.ejercicio_comercial || ''} onChange={e => setProcForm(p => ({ ...p, assesment: { ...p.assesment, ejercicio_comercial: e.target.value } }))} style={S.formInput} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>NOMBRE DEL EJERCICIO</label>
                      <input value={procForm.assesment?.nombre_ejercicio || ''} onChange={e => setProcForm(p => ({ ...p, assesment: { ...p.assesment, nombre_ejercicio: e.target.value } }))} style={S.formInput} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>CLARIDAD DEL MENSAJE</label>
                      <select value={procForm.assesment?.claridad_mensaje ?? ''} onChange={handleProcNumberChange('assesment','claridad_mensaje')} style={S.formInput}>
                        <option value="">--</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>CONVICCIÓN Y ENERGÍA</label>
                      <select value={procForm.assesment?.conviccion_energia ?? ''} onChange={handleProcNumberChange('assesment','conviccion_energia')} style={S.formInput}>
                        <option value="">--</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>ADAPTABILIDAD Y ESCUCHA</label>
                      <select value={procForm.assesment?.adaptabilidad_escucha ?? ''} onChange={handleProcNumberChange('assesment','adaptabilidad_escucha')} style={S.formInput}>
                        <option value="">--</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>ORIENTACIÓN A LA ACCIÓN</label>
                      <select value={procForm.assesment?.orientacion_accion ?? ''} onChange={handleProcNumberChange('assesment','orientacion_accion')} style={S.formInput}>
                        <option value="">--</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>MANEJO DE LA PRESIÓN</label>
                      <select value={procForm.assesment?.manejo_presion ?? ''} onChange={handleProcNumberChange('assesment','manejo_presion')} style={S.formInput}>
                        <option value="">--</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>POM CALIFICACION ASSESMENT</label>
                    <input readOnly value={procForm.assesment?.prom_calificacion ?? ''} style={{ ...S.formInput, width: 200, background: 'var(--bg)' }} />
                  </div>
                </div>
              )}

              {procActiveTab === 'entrevista' && (
                <div style={{ margin: '16px 0 10px 0' }}>
                  
                  <div style={S.grid3}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>TRAYECTORIA</label>
                      <select value={procForm.entrevista?.trayectoria ?? ''} onChange={handleProcNumberChange('entrevista','trayectoria')} style={S.formInput}>
                        <option value="">--</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>CONEXIÓN CON EL CLIENTE O EL RESULTADO</label>
                      <select value={procForm.entrevista?.conexion_cliente ?? ''} onChange={handleProcNumberChange('entrevista','conexion_cliente')} style={S.formInput}>
                        <option value="">--</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>APRENDIZAJE Y MADUREZ</label>
                      <select value={procForm.entrevista?.aprendizaje_madurez ?? ''} onChange={handleProcNumberChange('entrevista','aprendizaje_madurez')} style={S.formInput}>
                        <option value="">--</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>MOTIVACIÓN HACIA EL ROL</label>
                      <select value={procForm.entrevista?.motivacion ?? ''} onChange={handleProcNumberChange('entrevista','motivacion')} style={S.formInput}>
                        <option value="">--</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>DISPOSICIÓN Y PROYECTO DE VIDA</label>
                      <select value={procForm.entrevista?.disposicion_proyecto ?? ''} onChange={handleProcNumberChange('entrevista','disposicion_proyecto')} style={S.formInput}>
                        <option value="">--</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>PROM. CALIFICACION ENTREVISTA</label>
                    <input readOnly value={procForm.entrevista?.prom_calificacion ?? ''} style={{ ...S.formInput, width: 200, background: 'var(--bg)' }} />
                  </div>
                </div>
              )}

              {procActiveTab === 'retroalimentacion' && (
                <div>
                  <h4 style={{ margin: '16px 0 10px 0', fontSize: '0.9rem', fontWeight: 600 }}>RETROALIMENTACIÓN</h4>
                  <textarea value={procForm.retroalimentacion || ''} onChange={e => setProcForm(p => ({ ...p, retroalimentacion: e.target.value }))} style={{ ...S.formInput, minHeight: 140, resize: 'vertical' }} />
                </div>
              )}

              {procActiveTab === 'referencias' && (
                <div style={{ margin: '16px 0 10px 0' }}>
                  
                  <div style={S.grid3}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>REFERENCIA LABORAL 1</label>
                      <textarea value={procForm.referencias?.ref_laboral_1 || ''} onChange={e => setProcForm(p => ({ ...p, referencias: { ...p.referencias, ref_laboral_1: e.target.value } }))} style={{ ...S.formInput, minHeight: 80, resize: 'vertical' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>REFERENCIA LABORAL 2</label>
                      <textarea value={procForm.referencias?.ref_laboral_2 || ''} onChange={e => setProcForm(p => ({ ...p, referencias: { ...p.referencias, ref_laboral_2: e.target.value } }))} style={{ ...S.formInput, minHeight: 80, resize: 'vertical' }} />
                    </div>
                  </div>
                </div>
              )}

              {procActiveTab === 'fraudes' && (
                <div style={{ margin: '16px 0 10px 0' }}>
                  <div style={S.grid3}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>NÚMERO DE SEGUIMIENTO</label>
                      <input value={procForm.fraudes?.numero_seguimiento || ''} onChange={e => setProcForm(p => ({ ...p, fraudes: { ...p.fraudes, numero_seguimiento: e.target.value } }))} style={S.formInput} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>RESPUESTA</label>
                      <input value={procForm.fraudes?.respuesta || ''} onChange={e => setProcForm(p => ({ ...p, fraudes: { ...p.fraudes, respuesta: e.target.value } }))} style={S.formInput} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>CIUDAD</label>
                      <input value={procForm.fraudes?.ciudad || ''} onChange={e => setProcForm(p => ({ ...p, fraudes: { ...p.fraudes, ciudad: e.target.value } }))} style={S.formInput} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>FECHA CONSULTA</label>
                      <input type="date" value={procForm.fraudes?.fecha_consulta || ''} onChange={e => setProcForm(p => ({ ...p, fraudes: { ...p.fraudes, fecha_consulta: e.target.value } }))} style={S.formInput} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>FUENTE DE RECLUTAMIENTO</label>
                      <input value={procForm.fraudes?.fuente_reclutamiento || ''} onChange={e => setProcForm(p => ({ ...p, fraudes: { ...p.fraudes, fuente_reclutamiento: e.target.value } }))} style={S.formInput} />
                    </div>
                  </div>
                </div>
              )}

              {procActiveTab === 'seguridad' && (
                <div style={{ margin: '16px 0 10px 0' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: 6, fontWeight: 500 }}>ESTUDIO DE SEGURIDAD</label>
                    <textarea value={procForm.seguridad?.estudio || ''} onChange={e => setProcForm(p => ({ ...p, seguridad: { ...p.seguridad, estudio: e.target.value } }))} style={{ ...S.formInput, minHeight: 140, resize: 'vertical' }} />
                  </div>
                </div>
              )}

            </div>

            <div style={S.modalFooter}>
              <button style={S.btnSecondary} onClick={() => setIsProcModalOpen(false)}>Cancelar</button>
              <button style={S.btnPrimaryGreen} onClick={handleSaveProcesos}>Guardar procesos</button>
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
          animation: 'fadeInUp 0.25s ease',
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
  tabSwitch: { display: 'inline-flex', background: 'transparent', borderBottom: '1.5px solid var(--border)', gap: 8, paddingBottom: 8, alignItems: 'center' },
  tabBtn: { padding: '8px 14px', borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' },
  tabBtnActive: { padding: '8px 14px', borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 800, borderBottom: '3px solid var(--primary)', fontSize: '0.78rem' },
  processDot: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#34d399', marginRight: 8, verticalAlign: 'middle' },
  formInput: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--border)', boxSizing: 'border-box', fontSize: '0.88rem', height: 40, background: 'var(--white)' },
};
