import React, { useState, useEffect } from 'react';

const FLOW_URL = 'https://251096727969e82c98eb7eaa0a0fc8.e6.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/4bb66ac2b8b24182ac8839ce4c0d2e71/triggers/manual/paths/invoke/?api-version=1&tenantId=tId&environmentName=25109672-7969-e82c-98eb-7eaa0a0fc8e6&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=i1FhI0V6l809I8aDprH8YGBMAPwRdWfDsp_NiuW8KXo';

const svgProps = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' };
const IcoIdCard      = () => <svg {...svgProps}><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 9h4M14 12h4M14 15h2"/></svg>;
const IcoDiploma     = () => <svg {...svgProps}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>;
const IcoCertEstudio = () => <svg {...svgProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const IcoCertLaboral = () => <svg {...svgProps}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>;
const IcoEps         = () => <svg {...svgProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
const IcoPension     = () => <svg {...svgProps}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IcoHojaVida    = () => <svg {...svgProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const IcoBenef       = () => <svg {...svgProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;

const DOCS_LIST = [
    { id: 'documento_identidad',      label: 'Documento de Identidad',         tipo: 'DOCUMENTO_DE_IDENTIDAD',     Icon: IcoIdCard,      required: true },
    { id: 'diploma_bachiller',        label: 'Diploma de Bachiller',            tipo: 'DIPLOMA_DE_BACHILLER',        Icon: IcoDiploma,     required: true },
    { id: 'certificados_estudio',     label: 'Certificados de Estudio',         tipo: 'CERTIFICADOS_DE_ESTUDIO',     Icon: IcoCertEstudio, required: true },
    { id: 'certificados_laborales',   label: 'Certificados Laborales',          tipo: 'CERTIFICADOS_LABORALES',      Icon: IcoCertLaboral, required: true },
    { id: 'certificacion_eps',        label: 'Certificación EPS',               tipo: 'CERTIFICADO_EPS',             Icon: IcoEps,         required: true },
    { id: 'certificacion_pension',    label: 'Certificación Fondo Pensiones',   tipo: 'CERTIFICADO_FONDO_PENSIONES', Icon: IcoPension,     required: true },
    { id: 'hoja_vida',                label: 'Formato Hoja de Vida S&M',        tipo: 'HOJA_DE_VIDA',                Icon: IcoHojaVida,    required: true },
    { id: 'documentos_beneficiarios', label: 'Documentos Beneficiarios',        tipo: 'DOCUMENTOS_BENEFICIARIOS',    Icon: IcoBenef,       required: false },
];

const REQUIRED_COUNT = DOCS_LIST.filter(d => d.required).length;

const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const FormStyles = () => (
    <style>{`
        @keyframes cdf-fadeUp {
            from { opacity: 0; transform: translateY(18px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cdf-spin   { to { transform: rotate(360deg); } }
        @keyframes cdf-pulse  { 0%,100% { opacity:1; } 50% { opacity:0.5; } }

        .cdf-page {
            min-height: 100vh;
            background: linear-gradient(160deg, #c8eeea 0%, #e8f7f5 60%, #d4ede9 100%);
            padding: 32px 16px 64px;
            font-family: 'Nunito', sans-serif;
            box-sizing: border-box;
        }
        .cdf-container {
            max-width: 840px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 22px;
            animation: cdf-fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }

        .cdf-header {
            background: linear-gradient(135deg, #186059 0%, #1a9b8c 60%, #22b8a7 100%);
            border-radius: 20px;
            padding: 32px 36px;
            color: #fff;
            box-shadow: 0 8px 32px rgba(24,96,89,0.28);
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 10px;
        }
        .cdf-logo-badge {
            width: 56px; height: 56px;
            border-radius: 14px;
            background: rgba(255,255,255,0.2);
            border: 2px solid rgba(255,255,255,0.5);
            display: flex; align-items: center; justify-content: center;
            font-family: 'Poppins', sans-serif;
            font-weight: 900; font-size: 1.1rem;
            color: #fff;
            letter-spacing: 0.02em;
        }
        .cdf-header h1 {
            font-family: 'Poppins', sans-serif;
            font-weight: 900; font-size: 1.5rem;
            letter-spacing: 0.05em; margin: 0;
        }
        .cdf-header-sub {
            font-size: 0.92rem; opacity: 0.9; margin: 0;
            display: flex; align-items: center; gap: 8px;
        }
        .cdf-dot {
            width: 8px; height: 8px;
            border-radius: 50%; background: #f9c623;
            display: inline-block;
            animation: cdf-pulse 1.8s ease-in-out infinite;
        }

        .cdf-info-box {
            background: rgba(255,255,255,0.92);
            border-radius: 14px;
            border: 1.5px solid #a8ddd7;
            padding: 16px 20px;
            display: flex; gap: 14px;
            align-items: flex-start;
            font-size: 0.88rem;
            color: #1a3a35;
            line-height: 1.65;
            box-shadow: 0 2px 12px rgba(26,155,140,0.06);
        }
        .cdf-info-icon {
            flex-shrink: 0;
            width: 32px; height: 32px;
            border-radius: 50%;
            background: #d0f0ec;
            display: flex; align-items: center; justify-content: center;
            font-size: 1rem; color: #127a6d; font-weight: 800;
        }

        .cdf-doc-field {
            background: #fff;
            border-radius: 14px;
            border: 1.5px solid #a8ddd7;
            padding: 22px 24px;
            box-shadow: 0 4px 16px rgba(26,155,140,0.08);
        }
        .cdf-doc-label {
            font-family: 'Poppins', sans-serif;
            font-weight: 800; font-size: 0.8rem;
            text-transform: uppercase; letter-spacing: 0.06em;
            color: #1a9b8c; margin-bottom: 8px;
            display: block;
        }
        .cdf-doc-input {
            width: 100%; padding: 12px 16px;
            border: 1.5px solid #a8ddd7;
            border-radius: 10px;
            font-size: 1.1rem;
            font-family: 'Nunito', sans-serif;
            font-weight: 700; color: #1a3a35;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
            box-sizing: border-box;
            letter-spacing: 0.06em;
        }
        .cdf-doc-input:focus {
            border-color: #1a9b8c;
            box-shadow: 0 0 0 4px rgba(26,155,140,0.14);
        }
        .cdf-doc-err {
            color: #c0392b; font-size: 0.8rem;
            margin-top: 6px; font-weight: 700;
            font-family: 'Nunito', sans-serif;
        }

        .cdf-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .cdf-doc-card {
            background: #fff;
            border-radius: 14px;
            border: 1.5px solid #a8ddd7;
            box-shadow: 0 4px 16px rgba(26,155,140,0.06);
            overflow: hidden;
            transition: transform 0.18s, box-shadow 0.18s;
        }
        .cdf-doc-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,155,140,0.14); }
        .cdf-doc-card.cdf-card-done     { border-color: #27ae60; }
        .cdf-doc-card.cdf-card-selected { border-color: #1a9b8c; }
        .cdf-doc-card.cdf-card-error    { border-color: #e74c3c; }

        .cdf-card-top {
            padding: 16px 18px 10px;
            display: flex; align-items: flex-start; gap: 12px;
        }
        .cdf-card-emoji { font-size: 1.6rem; line-height: 1; flex-shrink: 0; }
        .cdf-card-info  { flex: 1; }
        .cdf-card-label {
            font-family: 'Poppins', sans-serif;
            font-weight: 700; font-size: 0.88rem;
            color: #1a3a35; line-height: 1.3;
        }
        .cdf-card-badge {
            display: inline-block;
            font-size: 0.68rem; font-weight: 800;
            font-family: 'Poppins', sans-serif;
            letter-spacing: 0.04em;
            padding: 2px 8px; border-radius: 20px;
            margin-top: 5px;
        }
        .cdf-badge-req  { background: #fdf0d5; color: #d67e00; }
        .cdf-badge-opt  { background: #e8f7f5; color: #127a6d; }

        .cdf-upload-zone {
            margin: 0 14px 14px;
            border: 2px dashed #a8ddd7;
            border-radius: 10px;
            padding: 14px 12px;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            gap: 5px; cursor: pointer;
            transition: border-color 0.2s, background 0.2s;
            min-height: 76px; text-align: center;
            position: relative;
        }
        .cdf-upload-zone:hover           { border-color: #1a9b8c; background: #f0faf8; }
        .cdf-upload-zone.zone-done       { border-color: #27ae60; background: #f0fdf4; border-style: solid; }
        .cdf-upload-zone.zone-selected   { border-color: #1a9b8c; background: #eaf8f6; border-style: solid; }
        .cdf-upload-zone.zone-loading    { border-color: #1a9b8c; background: #f0faf8; cursor: default; }
        .cdf-upload-zone.zone-error      { border-color: #e74c3c; background: #fdf5f5; }

        .cdf-file-input {
            position: absolute; inset: 0;
            opacity: 0; cursor: pointer;
            width: 100%; height: 100%;
        }
        .cdf-file-input:disabled { cursor: default; }

        .cdf-up-text          { font-size: 0.78rem; font-family: 'Nunito', sans-serif; font-weight: 700; color: #5a7a75; }
        .cdf-up-text.done     { color: #27ae60; }
        .cdf-up-text.selected { color: #1a9b8c; }
        .cdf-up-text.error    { color: #e74c3c; }

        .cdf-spinner {
            width: 20px; height: 20px;
            border: 3px solid rgba(26,155,140,0.2);
            border-top-color: #1a9b8c;
            border-radius: 50%;
            animation: cdf-spin 0.7s linear infinite;
        }
        .cdf-filename {
            font-size: 0.72rem; font-family: 'Nunito', sans-serif;
            color: #27ae60; font-weight: 600;
            max-width: 160px; overflow: hidden;
            text-overflow: ellipsis; white-space: nowrap;
        }
        .cdf-filename.sel { color: #127a6d; }
        .cdf-filename.err { color: #e74c3c; }

        /* Submit button */
        .cdf-submit-wrap {
            background: #fff;
            border-radius: 14px;
            border: 1.5px solid #a8ddd7;
            padding: 24px 28px;
            box-shadow: 0 4px 16px rgba(26,155,140,0.06);
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .cdf-submit-note {
            font-size: 0.88rem;
            color: #127a6d;
            font-family: 'Nunito', sans-serif;
            font-weight: 700;
            text-align: center;
            margin: 0;
        }
        .cdf-submit-missing {
            font-size: 0.82rem;
            color: #8aaba6;
            font-family: 'Nunito', sans-serif;
            text-align: center;
            margin: 0;
        }
        .cdf-submit-btn {
            width: 100%;
            padding: 16px 24px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #186059, #1a9b8c);
            color: #fff;
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            font-size: 1rem;
            letter-spacing: 0.03em;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 4px 16px rgba(24,96,89,0.28);
            transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .cdf-submit-btn:hover:not(:disabled) {
            opacity: 0.92;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(24,96,89,0.36);
        }
        .cdf-submit-btn:disabled {
            background: #c8d8d6;
            box-shadow: none;
            cursor: not-allowed;
            color: #8aaba6;
        }
        .cdf-spinner-white {
            border-color: rgba(255,255,255,0.3);
            border-top-color: #fff;
        }

        .cdf-success-banner {
            background: linear-gradient(135deg, #27ae60, #1e8449);
            border-radius: 14px;
            padding: 24px 28px;
            color: #fff;
            display: flex; align-items: center; gap: 18px;
            box-shadow: 0 8px 24px rgba(39,174,96,0.25);
            animation: cdf-fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
        }
        .cdf-success-icon {
            width: 52px; height: 52px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.6rem; flex-shrink: 0;
        }
        .cdf-success-banner h3 {
            font-family: 'Poppins', sans-serif;
            font-weight: 800; font-size: 1.05rem;
            margin: 0 0 4px;
        }
        .cdf-success-banner p { font-size: 0.88rem; opacity: 0.92; margin: 0; }

        @media (max-width: 600px) {
            .cdf-grid          { grid-template-columns: 1fr !important; }
            .cdf-header        { padding: 24px 20px !important; }
            .cdf-header h1     { font-size: 1.15rem !important; }
            .cdf-doc-field     { padding: 18px 16px !important; }
            .cdf-submit-wrap   { padding: 18px 16px !important; }
        }
    `}</style>
);

const IcoUpload = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a7a75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
);
const IcoCheck = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);
const IcoFile = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a9b8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
    </svg>
);
const IcoX = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
);
const IcoSend = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
);

export default function CargaDocumentosForm() {
    const [documento, setDocumento]         = useState('');
    const [docError, setDocError]           = useState('');
    const [candidatoInfo, setCandidatoInfo] = useState({ nombre: '', correo: '' });
    const [submitting, setSubmitting]       = useState(false);
    const [estados, setEstados] = useState(
        Object.fromEntries(DOCS_LIST.map(d => [d.id, { status: 'idle', name: null, fileObj: null, error: null }]))
    );

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const doc   = params.get('doc');

        if (token) {
            fetch(`/api/carga-documentos/resolve-token?token=${encodeURIComponent(token)}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (data?.documento) {
                        setDocumento(data.documento);
                        setCandidatoInfo({ nombre: data.nombre ?? '', correo: data.correo ?? '' });
                    }
                })
                .catch(() => {});
        } else if (doc) {
            setDocumento(doc);
        }
    }, []);

    const setEstado = (id, update) =>
        setEstados(prev => ({ ...prev, [id]: { ...prev[id], ...update } }));

    const handleFileChange = (docId, e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!documento.trim() || !/^\d+$/.test(documento.trim())) {
            setDocError('Por favor ingresa un número de documento válido (solo dígitos) antes de seleccionar archivos.');
            e.target.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setEstado(docId, { status: 'error', error: 'El archivo supera los 10 MB permitidos.', fileObj: null, name: null });
            e.target.value = '';
            return;
        }

        const docMeta  = DOCS_LIST.find(d => d.id === docId);
        const ext      = file.name.split('.').pop().toLowerCase();
        const filename = `${documento.trim()}_${docMeta.tipo}.${ext}`;

        setDocError('');
        setEstado(docId, { status: 'selected', name: filename, fileObj: file, error: null });
        e.target.value = '';
    };

    const handleSubmit = async () => {
        // Capturar archivos seleccionados antes de cualquier actualización de estado
        const toUpload = DOCS_LIST
            .filter(d => estados[d.id].status === 'selected')
            .map(doc => ({ doc, file: estados[doc.id].fileObj }));

        if (!toUpload.length || submitting) return;

        setSubmitting(true);

        // Marcar todos como "subiendo" de una vez
        setEstados(prev => {
            const next = { ...prev };
            toUpload.forEach(({ doc }) => {
                next[doc.id] = { ...next[doc.id], status: 'uploading' };
            });
            return next;
        });

        const csrf = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
        const successFiles = [];

        for (const { doc, file } of toUpload) {
            const ext      = file.name.split('.').pop().toLowerCase();
            const filename = `${documento.trim()}_${doc.tipo}.${ext}`;

            try {
                const fd = new FormData();
                fd.append('documento', documento.trim());
                fd.append('tipo', doc.id);
                fd.append('archivo', file);
                const res = await fetch('/api/documentos-contratacion/upload', {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrf },
                    body: fd,
                });
                if (!res.ok) {
                    const b = await res.json().catch(() => ({}));
                    throw new Error(b.message ?? `Error ${res.status}`);
                }
                setEstado(doc.id, { status: 'done', name: filename, fileObj: null });
                successFiles.push({ filename, file });
            } catch (err) {
                setEstado(doc.id, { status: 'error', error: err.message, fileObj: null });
            }
        }

        // Subir a SharePoint via Power Automate (todos juntos, fire-and-forget)
        if (successFiles.length > 0) {
            Promise.all(
                successFiles.map(({ filename, file }) =>
                    toBase64(file).then(fileContent => ({ filename, fileContent }))
                )
            ).then(archivos => fetch(FLOW_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: candidatoInfo.nombre,
                    cedula: documento.trim(),
                    correo: candidatoInfo.correo,
                    captchaToken: '',
                    archivos,
                }),
            })).catch(() => {});
        }

        setSubmitting(false);
    };

    const selectedCnt = DOCS_LIST.filter(d => estados[d.id].status === 'selected').length;
    const doneCnt     = DOCS_LIST.filter(d => d.required && estados[d.id].status === 'done').length;
    const allDone     = doneCnt === REQUIRED_COUNT;
    const missingReq  = DOCS_LIST.filter(d => d.required && !['selected', 'done'].includes(estados[d.id].status)).length;

    return (
        <div className="cdf-page">
            <FormStyles />
            <div className="cdf-container">

                {/* Header */}
                <div className="cdf-header">
                    <div className="cdf-logo-badge">S&amp;M</div>
                    <h1>CARGUE DE DOCUMENTOS</h1>
                    <p className="cdf-header-sub">
                        <span className="cdf-dot" />
                        Proceso de Contratación Activo
                    </p>
                </div>

                {/* Info box */}
                <div className="cdf-info-box">
                    <div className="cdf-info-icon">i</div>
                    <div>
                        Sube cada documento en formato <strong>PDF</strong> (también se aceptan imágenes).
                        Tamaño máximo <strong>10 MB</strong> por archivo.
                        Los <strong>7 documentos marcados como obligatorios</strong> son requeridos para completar el proceso de contratación.
                        Selecciona todos los archivos y luego presiona <strong>Enviar documentos</strong>.
                    </div>
                </div>

                {/* Número de documento */}
                <div className="cdf-doc-field">
                    <label className="cdf-doc-label" htmlFor="cdf-docnum">
                        Número de Cédula / Documento de Identidad
                    </label>
                    <input
                        id="cdf-docnum"
                        type="text"
                        inputMode="numeric"
                        placeholder="Ej: 1234567890"
                        value={documento}
                        onChange={e => { setDocumento(e.target.value); if (docError) setDocError(''); }}
                        className="cdf-doc-input"
                        disabled={submitting}
                    />
                    {docError && <div className="cdf-doc-err">{docError}</div>}
                </div>

                {/* Grid de documentos */}
                <div className="cdf-grid">
                    {DOCS_LIST.map(doc => {
                        const est = estados[doc.id];
                        const zoneClass = est.status === 'done'     ? ' zone-done'
                            : est.status === 'selected'             ? ' zone-selected'
                            : est.status === 'uploading'            ? ' zone-loading'
                            : est.status === 'error'                ? ' zone-error'
                            : '';
                        const cardClass = est.status === 'done'     ? ' cdf-card-done'
                            : est.status === 'selected'             ? ' cdf-card-selected'
                            : est.status === 'error'                ? ' cdf-card-error'
                            : '';
                        return (
                            <div key={doc.id} className={`cdf-doc-card${cardClass}`}>
                                <div className="cdf-card-top">
                                    <span className="cdf-card-emoji"><doc.Icon /></span>
                                    <div className="cdf-card-info">
                                        <div className="cdf-card-label">{doc.label}</div>
                                        <span className={`cdf-card-badge ${doc.required ? 'cdf-badge-req' : 'cdf-badge-opt'}`}>
                                            {doc.required ? 'OBLIGATORIO' : 'OPCIONAL'}
                                        </span>
                                    </div>
                                </div>
                                <label
                                    className={`cdf-upload-zone${zoneClass}`}
                                    htmlFor={`cdf-f-${doc.id}`}
                                >
                                    {est.status === 'idle' && (
                                        <>
                                            <IcoUpload />
                                            <span className="cdf-up-text">Seleccionar archivo</span>
                                        </>
                                    )}
                                    {est.status === 'selected' && (
                                        <>
                                            <IcoFile />
                                            <span className="cdf-filename sel">{est.name}</span>
                                            <span className="cdf-up-text selected">Listo · clic para cambiar</span>
                                        </>
                                    )}
                                    {est.status === 'uploading' && (
                                        <>
                                            <div className="cdf-spinner" />
                                            <span className="cdf-up-text">Enviando...</span>
                                        </>
                                    )}
                                    {est.status === 'done' && (
                                        <>
                                            <IcoCheck />
                                            <span className="cdf-filename">{est.name}</span>
                                            <span className="cdf-up-text done">Subido · clic para reemplazar</span>
                                        </>
                                    )}
                                    {est.status === 'error' && (
                                        <>
                                            <IcoX />
                                            <span className="cdf-filename err">{est.error}</span>
                                            <span className="cdf-up-text error">Clic para reintentar</span>
                                        </>
                                    )}
                                    <input
                                        id={`cdf-f-${doc.id}`}
                                        type="file"
                                        accept="application/pdf,image/*"
                                        className="cdf-file-input"
                                        onChange={e => handleFileChange(doc.id, e)}
                                        disabled={est.status === 'uploading' || submitting}
                                    />
                                </label>
                            </div>
                        );
                    })}
                </div>

                {/* Botón submit */}
                {!allDone && (
                    <div className="cdf-submit-wrap">
                        {selectedCnt > 0 && (
                            <p className="cdf-submit-note">
                                {selectedCnt} archivo{selectedCnt !== 1 ? 's' : ''} seleccionado{selectedCnt !== 1 ? 's' : ''} y listo{selectedCnt !== 1 ? 's' : ''} para enviar
                            </p>
                        )}
                        {missingReq > 0 && (
                            <p className="cdf-submit-missing">
                                Faltan {missingReq} documento{missingReq !== 1 ? 's' : ''} obligatorio{missingReq !== 1 ? 's' : ''} por seleccionar
                            </p>
                        )}
                        <button
                            className="cdf-submit-btn"
                            onClick={handleSubmit}
                            disabled={selectedCnt === 0 || submitting}
                        >
                            {submitting ? (
                                <>
                                    <div className="cdf-spinner cdf-spinner-white" />
                                    Enviando documentos...
                                </>
                            ) : (
                                <>
                                    <IcoSend />
                                    {selectedCnt > 0
                                        ? `Enviar ${selectedCnt} documento${selectedCnt !== 1 ? 's' : ''}`
                                        : 'Enviar documentos'}
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Banner de éxito */}
                {allDone && (
                    <div className="cdf-success-banner">
                        <div className="cdf-success-icon">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div>
                            <h3>¡Documentación completa!</h3>
                            <p>Todos los documentos obligatorios han sido recibidos. El equipo de contratación revisará tu información y se pondrá en contacto contigo.</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
