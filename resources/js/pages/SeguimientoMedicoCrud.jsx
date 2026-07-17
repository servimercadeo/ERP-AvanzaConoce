import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import {
    IconSearch, IconEye, IconEdit, IconClose,
    IconEmptySearch, IconLoading,
} from "../components/Icons";

/* ─── constantes ──────────────────────────────────────────────────── */
const POR_PAGINA = 10;

const MESES = [
    ["ene","Enero"],  ["feb","Febrero"], ["mar","Marzo"],
    ["abr","Abril"],  ["may","Mayo"],    ["jun","Junio"],
    ["jul","Julio"],  ["ago","Agosto"],  ["sep","Septiembre"],
    ["oct","Octubre"],["nov","Noviembre"],["dic","Diciembre"],
];

const EVENTO_VACIO = {
    fecha_ingreso_seguimiento: "", tipo_evento: "", origen_diagnostico: "",
    diagnostico: "", recomendaciones: "", vigencia_desde: "", vigencia_hasta: "",
    condicion: "", estado: "", fecha_cierre: "", observaciones: {},
};

const CUR_YEAR = new Date().getFullYear();
const YEAR_OPTS = Array.from({ length: CUR_YEAR - 2021 }, (_, i) => String(2022 + i)).concat([String(CUR_YEAR + 1)]);
const MONTH_KEYS_SET = new Set(["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]);

const FLOW_URL_MED = "https://251096727969e82c98eb7eaa0a0fc8.e6.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/19/workflows/45ba95de50b94b638a5d230cc6012d1b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=FcS4oaDM7z3PO6nTdfFh4SVXY9674xlKr2PyxUtYWkQ";
const toBase64Med = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
const DOCS_MEDICOS = [
    { id: "examen_ingreso",   label: "Examen de Ingreso",     tipo: "EXAMEN_DE_INGRESO" },
    { id: "concepto_medico",  label: "Concepto Médico",       tipo: "CONCEPTO_MEDICO" },
    { id: "examen_periodico", label: "Examen Periódico",      tipo: "EXAMEN_PERIODICO" },
    { id: "examen_retiro",    label: "Examen de Retiro",      tipo: "EXAMEN_DE_RETIRO" },
    { id: "incapacidad",      label: "Incapacidad",           tipo: "INCAPACIDAD" },
    { id: "otro_medico",      label: "Otro Documento Médico", tipo: "DOCUMENTO_MEDICO" },
];
const DOCS_MED_INIT = () => Object.fromEntries(DOCS_MEDICOS.map(d => [d.id, { file: null, status: "idle", name: null, error: null }]));

/* ─── helpers ──────────────────────────────────────────────────────── */
const dateOnly = (v) => (v ? String(v).split("T")[0] : "");
const norm     = (s = "") => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const TODAY    = new Date().toISOString().split("T")[0];

/* ─── Field ─────────────────────────────────────────────────────────── */
function Field({ label, k, type = "text", opts, req, form, errors = {}, onChange, disabled }) {
    const isObjOpts = opts?.length > 0 && typeof opts[0] === "object";
    const dis = disabled ? { background: "var(--bg)", color: "var(--text-muted)", cursor: "default" } : {};
    return (
        <div style={S.formGroup}>
            <label style={S.label}>{label}{req && !disabled ? " *" : ""}</label>
            {opts ? (
                <select style={{ ...S.input, ...dis }} value={form[k] ?? ""} onChange={onChange(k)} disabled={disabled}>
                    <option value="">Elige</option>
                    {isObjOpts
                        ? opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)
                        : opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            ) : type === "textarea" ? (
                <textarea
                    style={{ ...S.input, minHeight: 68, resize: disabled ? "none" : "vertical", ...dis }}
                    value={form[k] ?? ""} onChange={onChange(k)} disabled={disabled}
                />
            ) : (
                <input
                    style={{ ...S.input, ...(errors[k] ? { borderColor: "#e74c3c" } : {}), ...dis }}
                    type={type} value={form[k] ?? ""} onChange={onChange(k)} disabled={disabled}
                />
            )}
            {errors[k] && <span style={S.err}>{errors[k]}</span>}
        </div>
    );
}

/* ─── Modal de ver / editar ─────────────────────────────────────────── */
function SeguimientoModal({ open, onClose, contrato, readOnly, catalogs, proyectoOpts, empleados, onSave }) {
    const [form, setForm]                         = useState({});
    const [eventos, setEventos]                   = useState([]);
    const [eventosCollapsed, setEventosCollapsed] = useState([]);
    const [evObsYears, setEvObsYears]             = useState([]);
    const [evCierreCollapsed, setEvCierre]        = useState([]);
    const [saving, setSaving]                     = useState(false);
    const [activeTab, setActive]                  = useState("empleado");
    const [docsMed, setDocsMed]                   = useState(DOCS_MED_INIT);
    const [uploadingMed, setUploadingMed]         = useState(false);
    const [docsSubidos, setDocsSubidos]           = useState({});
    const [eventoDocIdx, setEventoDocIdx]         = useState(0);

    const eventoIdx = Math.max(0, Math.min(eventoDocIdx, eventos.length - 1));
    const eventoSel = eventos[eventoIdx] ?? null;
    const eventoFecha = eventoSel?.fecha_ingreso_seguimiento ?? "";

    useEffect(() => {
        if (open && contrato) {
            setForm({
                empleador:        contrato.empleador ?? "",
                cliente_proyecto: contrato.cliente_proyecto ?? "",
                fecha_ingreso:    dateOnly(contrato.fecha_ingreso),
                sede:             contrato.sede ?? "",
                cargo:            contrato.cargo ?? "",
                lps_afiliado:     contrato.lps_afiliado ?? "",
                arl:              contrato.arl ?? "",
            });
            const _evs = (contrato.eventos_medicos ?? []).map(ev => ({
                ...ev,
                fecha_ingreso_seguimiento: dateOnly(ev.fecha_ingreso_seguimiento),
                vigencia_desde:            dateOnly(ev.vigencia_desde),
                vigencia_hasta:            dateOnly(ev.vigencia_hasta),
                fecha_cierre:              dateOnly(ev.fecha_cierre),
                observaciones:             ev.observaciones ?? {},
            }));
            setEventos(_evs);
            setEventosCollapsed(_evs.map((_, __, arr) => arr.length > 1));
            setEvObsYears(_evs.map(() => String(CUR_YEAR)));
            setEvCierre(_evs.map(() => true));
            setSaving(false);
            setActive("empleado");
            setDocsMed(DOCS_MED_INIT());
            setUploadingMed(false);
            setDocsSubidos({});
            setEventoDocIdx(0);
        }
    }, [open, contrato]);

    useEffect(() => {
        if (!open || !contrato) return;
        const ced = contrato.empleado?.cedula ?? "";
        setDocsMed(DOCS_MED_INIT());
        if (!ced || !eventoFecha) { setDocsSubidos({}); return; }
        fetch(`/api/documentos-contratacion/docs-medicos?cedula=${encodeURIComponent(ced)}&evento=${encodeURIComponent(eventoFecha)}`)
            .then(r => r.ok ? r.json() : {})
            .then(data => setDocsSubidos(data ?? {}))
            .catch(() => {});
    }, [open, contrato, eventoFecha]);

    if (!open || !contrato) return null;

    const emp    = empleados.find(e => String(e.id) === String(contrato.empleado_id));
    const cedula = emp?.cedula ?? contrato.empleado?.cedula ?? "";
    const nombre = emp
        ? `${emp.nombres ?? ""} ${emp.apellidos ?? ""}`.trim()
        : `${contrato.empleado?.nombres ?? ""} ${contrato.empleado?.apellidos ?? ""}`.trim();

    const onChange = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
    const fp = { form, errors: {}, onChange, disabled: readOnly };

    const addEvento    = () => { setEventos(ev => [...ev, { ...EVENTO_VACIO }]); setEventosCollapsed(c => [...c, false]); setEvObsYears(c => [...c, String(CUR_YEAR)]); setEvCierre(c => [...c, true]); };
    const removeEvento = idx => { setEventos(ev => ev.filter((_, i) => i !== idx)); setEventosCollapsed(c => c.filter((_, i) => i !== idx)); setEvObsYears(c => c.filter((_, i) => i !== idx)); setEvCierre(c => c.filter((_, i) => i !== idx)); };
    const updateEvento = (idx, k, v) => setEventos(ev => ev.map((e, i) => i === idx ? { ...e, [k]: v } : e));
    const toggleEvento = idx => setEventosCollapsed(c => c.map((v, i) => i === idx ? !v : v));
    const toggleCierre = idx => setEvCierre(c => c.map((v, i) => i === idx ? !v : v));

    const handleUploadDocs = async () => {
        const toUpload = DOCS_MEDICOS.filter(d => docsMed[d.id]?.file);
        if (!toUpload.length || uploadingMed || !cedula || !eventoFecha) return;
        setUploadingMed(true);
        setDocsMed(prev => {
            const next = { ...prev };
            toUpload.forEach(d => { next[d.id] = { ...next[d.id], status: "uploading" }; });
            return next;
        });
        const csrf = document.querySelector("meta[name=\"csrf-token\"]")?.content ?? "";
        const successFiles = [];
        for (const doc of toUpload) {
            const file = docsMed[doc.id].file;
            const ext  = file.name.split(".").pop().toLowerCase();
            const filename = `${cedula}_${doc.tipo}.${ext}`;
            try {
                const fd = new FormData();
                fd.append("documento", cedula);
                fd.append("tipo", doc.id);
                fd.append("archivo", file);
                fd.append("evento", eventoFecha);
                const res = await fetch("/api/documentos-contratacion/upload", {
                    method: "POST", headers: { "X-CSRF-TOKEN": csrf }, body: fd,
                });
                if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message ?? `Error ${res.status}`); }
                setDocsMed(prev => ({ ...prev, [doc.id]: { file: null, status: "done", name: filename, error: null } }));
                successFiles.push(filename);
            } catch (err) {
                setDocsMed(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], status: "error", error: err.message } }));
            }
        }
        if (successFiles.length > 0) {
            fetch(FLOW_URL_MED, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    documento:        cedula,
                    nombres:          emp?.nombres   ?? "",
                    apellidos:        emp?.apellidos ?? "",
                    fechaSeguimiento: eventoFecha,
                    archivos:         successFiles,
                }),
            }).catch(() => {});
        }
        setUploadingMed(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(contrato.id, { ...form, eventos_medicos: eventos });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={{ ...S.modal, maxWidth: 980 }} onClick={e => e.stopPropagation()}>

                {/* Cabecera verde */}
                <div style={S.modalHeaderGreen}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={S.modalTitleWhite}>
                            {readOnly ? "Ver" : "Editar"} Seguimiento Médico
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.78)", fontSize: "0.85rem", fontFamily: "Nunito,sans-serif" }}>
                            {nombre}{cedula ? ` · CC ${cedula}` : ""}
                        </span>
                    </div>
                    <button style={S.closeBtnWhite} onClick={onClose}>
                        <IconClose size={14} />
                    </button>
                </div>

                {/* Pestañas */}
                <div className="tab-bar" style={S.tabBar}>
                    {[
                        ["empleado",   "Información del Empleado"],
                        ["eventos",    `Eventos Médicos${eventos.length ? ` (${eventos.length})` : ""}`],
                        ["documentos", "Documentos Médicos"],
                    ].map(([key, lbl]) => (
                        <button key={key} style={activeTab === key ? S.tabActive : S.tab} onClick={() => setActive(key)}>
                            {lbl}
                        </button>
                    ))}
                </div>

                {/* Cuerpo */}
                <div style={S.modalBody}>

                    {/* ── Tab 1: Información del Empleado ── */}
                    {activeTab === "empleado" && (
                        <>
                            <div style={S.sectionHeader}>DATOS GENERALES</div>
                            <div style={{ ...S.grid3, marginTop: 14 }}>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Cédula</label>
                                    <input style={{ ...S.input, background: "var(--bg)", color: "var(--text-muted)" }} value={cedula} disabled />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Nombre Completo</label>
                                    <input style={{ ...S.input, background: "var(--bg)", color: "var(--text-muted)" }} value={nombre} disabled />
                                </div>
                                <Field label="Empleador" k="empleador" {...fp} />
                            </div>
                            <div style={{ ...S.grid3, marginTop: 14 }}>
                                <Field label="Proyecto"         k="cliente_proyecto" opts={proyectoOpts.length ? proyectoOpts : undefined} {...fp} />
                                <Field label="Fecha de Ingreso" k="fecha_ingreso"    type="date" {...fp} />
                                <Field label="Ciudad / Sede"    k="sede"             opts={catalogs.sedes} {...fp} />
                            </div>
                            <div style={{ ...S.grid3, marginTop: 14 }}>
                                <Field label="Cargo" k="cargo"        opts={catalogs.cargos} {...fp} />
                                <Field label="EPS"   k="lps_afiliado" {...fp} />
                                <Field label="ARL"   k="arl"          opts={catalogs.arls}   {...fp} />
                            </div>
                        </>
                    )}

                    {/* ── Tab 2: Eventos Médicos ── */}
                    {activeTab === "eventos" && (
                        <>
                            {eventos.length === 0 && (
                                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                                        <path d="M9 12h6m-3-3v6M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z"/>
                                    </svg>
                                    <p style={{ margin: 0, fontSize: "0.9rem" }}>Sin eventos registrados.</p>
                                    {!readOnly && <p style={{ margin: 0, fontSize: "0.82rem" }}>Usa el boton de abajo para agregar el primer evento.</p>}
                                </div>
                            )}
                            {eventos.map((ev, i) => {
                                const collapsed = !!eventosCollapsed[i];
                                const evFp = {
                                    form: ev, errors: {},
                                    onChange: k => e => updateEvento(i, k, e.target.value),
                                    disabled: readOnly,
                                };
                                const vigBadge = (() => {
                                    const { vigencia_desde, vigencia_hasta } = ev;
                                    const cierre = ev.fecha_cierre;
                                    if (cierre && TODAY > cierre) return { label: "Vencida", bg: "#fce8e8", color: "#a33" };
                                    if (!vigencia_desde && !vigencia_hasta) return null;
                                    if (vigencia_hasta && TODAY > vigencia_hasta) return { label: "Vencida", bg: "#fce8e8", color: "#a33" };
                                    if (vigencia_desde && TODAY >= vigencia_desde) return { label: "Activa", bg: "#e0f7f4", color: "#0d6e5a" };
                                    return { label: "Pendiente", bg: "#fff3e0", color: "#e67e22" };
                                })();
                                return (
                                    <div key={i} style={{ border: `1.5px solid ${vigBadge?.label === "Activa" ? "rgba(13,110,90,0.35)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", padding: "12px 18px", marginTop: i === 0 ? 0 : 14, background: "var(--bg)" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: collapsed ? 0 : 12 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                                <button
                                                    onClick={() => toggleEvento(i)}
                                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: "0.85rem", padding: "2px 4px", display: "flex", alignItems: "center", flexShrink: 0 }}
                                                    title={collapsed ? "Expandir" : "Colapsar"}
                                                >
                                                    {collapsed ? "▶" : "▼"}
                                                </button>
                                                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--primary)", letterSpacing: "0.06em", fontFamily: "'Poppins',sans-serif", whiteSpace: "nowrap" }}>
                                                    EVENTO #{i + 1}
                                                </span>
                                                {(ev.tipo_evento || ev.fecha_ingreso_seguimiento) && (
                                                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {[ev.tipo_evento, ev.fecha_ingreso_seguimiento].filter(Boolean).join(" · ")}
                                                    </span>
                                                )}
                                                {vigBadge && (
                                                    <span style={{ background: vigBadge.bg, color: vigBadge.color, borderRadius: 20, padding: "2px 9px", fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}>
                                                        {vigBadge.label}
                                                    </span>
                                                )}
                                            </div>
                                            {!readOnly && (
                                                <button onClick={() => removeEvento(i)} style={{ background: "#fce8e8", border: "none", borderRadius: 4, color: "#a33", cursor: "pointer", padding: "4px 9px", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                                                    ✕ Eliminar
                                                </button>
                                            )}
                                        </div>
                                        {!collapsed && (
                                            <>
                                                <div style={S.grid3}>
                                                    <Field label="Fecha Ingreso a Seguimiento" k="fecha_ingreso_seguimiento" type="date" {...evFp} />
                                                    <Field label="Tipo de Evento"              k="tipo_evento"               {...evFp} />
                                                    <Field label="Origen del Diagnóstico"      k="origen_diagnostico"        {...evFp} />
                                                </div>
                                                <div style={{ ...S.grid2, marginTop: 12 }}>
                                                    <Field label="Diagnóstico" k="diagnostico" type="textarea" {...evFp} />
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                        <Field label="Recomendaciones / Restricciones Médico Laborales" k="recomendaciones" type="textarea" {...evFp} />
                                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                                            <Field label="Vigencia Desde" k="vigencia_desde" type="date" {...evFp} />
                                                            <Field label="Vigencia Hasta" k="vigencia_hasta" type="date" {...evFp} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ ...S.grid2, marginTop: 12 }}>
                                                    <Field label="Condición" k="condicion" {...evFp} />
                                                    <Field label="Estado"    k="estado"    {...evFp} />
                                                </div>

                                                {/* ── Cierre y Observaciones del evento ── */}
                                                <div style={{ marginTop: 16, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCierre(i)}
                                                        style={{ width: "100%", textAlign: "left", padding: "8px 14px", background: evCierreCollapsed[i] ? "var(--bg)" : "var(--primary)", color: evCierreCollapsed[i] ? "var(--text)" : "#fff", border: "none", cursor: "pointer", fontWeight: 800, fontSize: "0.78rem", letterSpacing: "0.05em", fontFamily: "'Poppins',sans-serif", display: "flex", alignItems: "center", gap: 8 }}
                                                    >
                                                        {evCierreCollapsed[i] ? "▶" : "▼"} CIERRE Y OBSERVACIONES DEL EVENTO
                                                    </button>
                                                    {!evCierreCollapsed[i] && (
                                                        <>
                                                            <div style={{ padding: "14px 14px 0", background: "var(--white)" }}>
                                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                                                                    <div style={S.formGroup}>
                                                                        <label style={S.label}>Fecha de Cierre</label>
                                                                        <input
                                                                            type="date"
                                                                            style={{ ...S.input, ...(readOnly ? { background: "var(--bg)", color: "var(--text-muted)" } : {}) }}
                                                                            value={ev.fecha_cierre ?? ""}
                                                                            onChange={e => updateEvento(i, "fecha_cierre", e.target.value)}
                                                                            disabled={readOnly}
                                                                        />
                                                                    </div>
                                                                    <div style={S.formGroup}>
                                                                        <label style={S.label}>Año</label>
                                                                        <select
                                                                            value={evObsYears[i] ?? String(CUR_YEAR)}
                                                                            onChange={e => setEvObsYears(y => y.map((v, j) => j === i ? e.target.value : v))}
                                                                            style={{ ...S.input, cursor: "pointer" }}
                                                                        >
                                                                            {[...new Set([...YEAR_OPTS, ...Object.keys(ev.observaciones ?? {}).filter(k => /^\d{4}$/.test(k))])].sort().map(y => (
                                                                                <option key={y} value={y}>{y}{Object.values(ev.observaciones?.[y] ?? {}).some(Boolean) ? " ✓" : ""}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, paddingBottom: 14 }}>
                                                                    {MESES.map(([key, label]) => (
                                                                        <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                                            <label style={{ ...S.label, color: "var(--primary)", fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.05em" }}>
                                                                                {label.toUpperCase()}
                                                                            </label>
                                                                            <textarea
                                                                                rows={2}
                                                                                disabled={readOnly}
                                                                                value={ev.observaciones?.[evObsYears[i] ?? String(CUR_YEAR)]?.[key] ?? ""}
                                                                                onChange={e => {
                                                                                    const yr = evObsYears[i] ?? String(CUR_YEAR);
                                                                                    updateEvento(i, "observaciones", {
                                                                                        ...(ev.observaciones ?? {}),
                                                                                        [yr]: { ...(ev.observaciones?.[yr] ?? {}), [key]: e.target.value }
                                                                                    });
                                                                                }}
                                                                                placeholder={`${label}…`}
                                                                                style={{ ...S.input, minHeight: 52, resize: readOnly ? "none" : "vertical", fontSize: "0.78rem", ...(readOnly ? { background: "var(--bg)", color: "var(--text-muted)" } : {}) }}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                            {!readOnly && (
                                <button className="btn-secondary" style={{ marginTop: 16, padding: "7px 16px", fontSize: "0.85rem" }} onClick={addEvento}>
                                    + Agregar evento
                                </button>
                            )}
                        </>
                    )}

                    {/* ── Tab 3: Documentos Médicos ── */}
                    {activeTab === "documentos" && (
                        <div>
                            {!cedula ? (
                                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                                    Sin empleado asociado. Guarda primero el registro con un empleado.
                                </div>
                            ) : eventos.length === 0 ? (
                                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                                    Registra primero un evento en la pestaña "Eventos Médicos". Los documentos se asocian a un evento.
                                </div>
                            ) : (
                                <>
                                    <div style={S.sectionHeader}>DOCUMENTOS MÉDICOS</div>
                                    <div style={{ ...S.formGroup, marginTop: 14, maxWidth: 360 }}>
                                        <label style={S.label}>Evento médico</label>
                                        <select
                                            style={{ ...S.input, cursor: "pointer" }}
                                            value={eventoIdx}
                                            onChange={e => setEventoDocIdx(Number(e.target.value))}
                                        >
                                            {eventos.map((ev, i) => (
                                                <option key={i} value={i}>
                                                    {(ev.fecha_ingreso_seguimiento || "Sin fecha") + (ev.tipo_evento ? ` · ${ev.tipo_evento}` : "")}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {!eventoFecha ? (
                                        <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                                            Este evento no tiene "Fecha Ingreso a Seguimiento". Complétala en la pestaña "Eventos Médicos" y guarda antes de subir documentos.
                                        </div>
                                    ) : (
                                    <>
                                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 14, marginBottom: 18 }}>
                                        Carpeta SharePoint del empleado <strong>CC {cedula}</strong>, evento <strong>{eventoFecha}</strong>. Máx. 10 MB por archivo.
                                    </p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {DOCS_MEDICOS.map(doc => {
                                            const st      = docsMed[doc.id] ?? { file: null, status: "idle", name: null, error: null };
                                            const subido  = docsSubidos[doc.id];
                                            const isUp    = st.status === "uploading";
                                            const isDone  = st.status === "done";
                                            const isErr   = st.status === "error";
                                            const isSel   = !!st.file;
                                            const yaSubido = !!subido && !isDone;
                                            const bg      = isDone || yaSubido ? "#f0fdf4" : isErr ? "#fdf5f5" : "var(--bg)";
                                            const border  = isDone || yaSubido ? "#27ae60" : isErr ? "#e74c3c" : "var(--border)";
                                            return (
                                                <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: bg, borderRadius: "var(--radius-sm)", border: `1.5px solid ${border}` }}>
                                                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", flex: 1 }}>{doc.label}</span>
                                                    {isDone  && <span style={{ color: "#27ae60", fontSize: "0.78rem", fontWeight: 700 }}>✓ {st.name}</span>}
                                                    {yaSubido && <span style={{ color: "#27ae60", fontSize: "0.78rem" }}>✓ Subido el {subido.uploaded_at?.split(" ")[0] ?? ""}</span>}
                                                    {isErr   && <span style={{ color: "#e74c3c", fontSize: "0.78rem" }}>{st.error}</span>}
                                                    {isUp    && <span style={{ color: "var(--primary)", fontSize: "0.78rem" }}>Subiendo…</span>}
                                                    {isSel && !isUp && !isDone && <span style={{ color: "var(--primary)", fontSize: "0.78rem", fontWeight: 600 }}>{st.file.name}</span>}
                                                    {!readOnly && (
                                                        <label style={{ cursor: uploadingMed ? "default" : "pointer", background: "var(--primary)", color: "#fff", borderRadius: 4, padding: "5px 12px", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap", opacity: uploadingMed ? 0.5 : 1 }}>
                                                            {isDone || yaSubido ? "Reemplazar" : "Seleccionar"}
                                                            <input type="file" style={{ display: "none" }} disabled={uploadingMed}
                                                                onChange={e => {
                                                                    const file = e.target.files[0];
                                                                    if (!file) return;
                                                                    setDocsMed(prev => ({ ...prev, [doc.id]: { file, status: "selected", name: file.name, error: null } }));
                                                                    e.target.value = "";
                                                                }}
                                                            />
                                                        </label>
                                                    )}
                                                    {(yaSubido || isDone) && !readOnly && (
                                                        <button onClick={async () => {
                                                            if (!confirm("¿Eliminar este documento?")) return;
                                                            const csrf = document.querySelector("meta[name=\"csrf-token\"]")?.content ?? "";
                                                            await fetch("/api/documentos-contratacion/docs-medicos", {
                                                                method: "DELETE",
                                                                headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf },
                                                                body: JSON.stringify({ cedula, tipo: doc.id, evento: eventoFecha }),
                                                            });
                                                            setDocsSubidos(prev => ({ ...prev, [doc.id]: null }));
                                                            setDocsMed(prev => ({ ...prev, [doc.id]: { file: null, status: "idle", name: null, error: null } }));
                                                        }} style={{ background: "#e74c3c", color: "#fff", border: "none", borderRadius: 4, padding: "5px 10px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                                                            Borrar
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {!readOnly && (
                                        <button
                                            onClick={handleUploadDocs}
                                            disabled={uploadingMed || !DOCS_MEDICOS.some(d => docsMed[d.id]?.file)}
                                            style={{ marginTop: 20, padding: "9px 24px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", opacity: (uploadingMed || !DOCS_MEDICOS.some(d => docsMed[d.id]?.file)) ? 0.5 : 1 }}
                                        >
                                            {uploadingMed ? "Subiendo a SharePoint…" : "Subir a SharePoint"}
                                        </button>
                                    )}
                                    </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Pie del modal */}
                <div style={S.modalFooter}>
                    {readOnly ? (
                        <button className="btn-secondary" onClick={onClose}>Cerrar</button>
                    ) : (
                        <>
                            <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
                            <button className="btn-primary" style={{ opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
                                {saving ? "Guardando…" : "Guardar"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  CRUD PRINCIPAL                                                      */
/* ═══════════════════════════════════════════════════════════════════ */
export default function SeguimientoMedicoCrud() {
    const qc = useQueryClient();

    const [search, setSearch]       = useState("");
    const debSearch                  = useDebounce(search, 280);
    const [pagina, setPagina]        = useState(1);
    const [viewTarget, setView]      = useState(null);
    const [editTarget, setEdit]      = useState(null);
    const [toast, setToast]          = useState(null);
    const [catalogs, setCatalogs]    = useState({ cargos: [], sedes: [], arls: [], cajas: [] });
    const [empleados, setEmpleados]  = useState([]);
    const [proyectoOpts, setProyectoOpts] = useState([]);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

    /* ── Queries ── */
    const { data: contratos = [], isLoading } = useQuery({
        queryKey: ["contratos-seguimiento"],
        queryFn:  () => api.get("/contratos", { params: { estado: "Activo" } }).then(r => r.data),
        staleTime: 30_000,
    });
    const { data: _qEmp } = useQuery({ queryKey: ["empleados"],           queryFn: () => api.get("/empleados").then(r => r.data) });
    const { data: _qCat } = useQuery({ queryKey: ["catalogos"],           queryFn: () => api.get("/catalogos").then(r => r.data) });
    const { data: _qSel } = useQuery({ queryKey: ["seleccion-catalogos"], queryFn: () => api.get("/seleccion/catalogos").then(r => r.data), staleTime: 10 * 60_000 });

    useEffect(() => { if (_qEmp) setEmpleados(_qEmp); }, [_qEmp]);
    useEffect(() => { if (_qCat) setCatalogs(_qCat);  }, [_qCat]);
    useEffect(() => { if (_qSel?.proyectos) setProyectoOpts(_qSel.proyectos.map(p => p.label)); }, [_qSel]);
    useEffect(() => { setPagina(1); }, [debSearch]);

    /* ── Filtrado ── */
    const filtered = useMemo(() => {
        const q = norm(debSearch);
        return contratos.filter(c => {
            if ((c.eventos_medicos ?? []).length === 0) return false;
            if (!q) return true;
            return [
                c.empleado?.cedula,
                c.empleado?.nombres, c.empleado?.apellidos,
                c.empleador, c.cliente_proyecto,
                c.cargo, c.lps_afiliado, c.arl, c.sede,
            ].some(v => norm(v ?? "").includes(q));
        });
    }, [contratos, debSearch]);

    const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
    const paginated    = filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

    /* ── Stats ── */
    const stats = useMemo(() => {
        const conEventos = contratos.filter(c => (c.eventos_medicos ?? []).length > 0);
        return {
            total:      conEventos.length,
            conEventos: conEventos.length,
            conCierre:  conEventos.filter(c => (c.eventos_medicos ?? []).some(ev => ev.fecha_cierre)).length,
        };
    }, [contratos]);

    /* ── Guardar ── */
    const handleSave = async (id, payload) => {
        const base = contratos.find(c => c.id === id);
        const { data: updated } = await api.put(`/contratos/${id}`, { ...base, ...payload });
        qc.setQueryData(["contratos-seguimiento"], (old = []) => old.map(c => c.id === id ? updated : c));
        qc.invalidateQueries({ queryKey: ["contratos"] });
        showToast("Seguimiento médico actualizado.");
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            {/* ── Stats ── */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Total empleados</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#27ae60" }}>{stats.conEventos}</div>
                    <div className="stat-label">Con eventos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#e67e22" }}>{stats.conCierre}</div>
                    <div className="stat-label">Con fecha cierre</div>
                </div>
            </div>

            {/* ── Toolbar ── */}
            <div style={S.toolbar}>
                <div style={S.filters}>
                    <div style={S.searchWrap}>
                        <span style={S.searchIcon}><IconSearch size={15} /></span>
                        <input
                            style={S.searchInput}
                            placeholder="Buscar por cédula, nombre, cargo, EPS…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Tabla ── */}
            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
                ) : filtered.length === 0 ? (
                    <div style={S.empty}><IconEmptySearch size={44} /><p>No se encontraron registros.</p></div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Cédula</th>
                                <th>Empleador</th>
                                <th>Proyecto</th>
                                <th>F. Ingreso</th>
                                <th>Ciudad</th>
                                <th>Cargo</th>
                                <th>EPS</th>
                                <th>ARL</th>
                                <th style={{ textAlign: "center" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map(c => {
                                const nombreCompleto = [c.empleado?.nombres, c.empleado?.apellidos]
                                    .filter(Boolean).join(" ") || c.empleado?.name || "—";
                                return (
                                    <tr key={c.id}>
                                        <td>
                                            <div style={S.avatarCell}>
                                                <div style={{ ...S.avatar, overflow: "hidden", position: "relative" }}>
                                                    {(c.empleado?.nombres || "?").charAt(0).toUpperCase()}
                                                    {c.empleado?.fotografia && (
                                                        <img
                                                            src={`/storage/${c.empleado.fotografia}`}
                                                            alt=""
                                                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                                                            onError={e => { e.currentTarget.style.display = "none"; }}
                                                        />
                                                    )}
                                                </div>
                                                <span style={{ fontWeight: 700 }}>{nombreCompleto}</span>
                                            </div>
                                        </td>
                                        <td>{c.empleado?.cedula || "—"}</td>
                                        <td>{c.empleador || "—"}</td>
                                        <td>{c.cliente_proyecto || "—"}</td>
                                        <td>{dateOnly(c.fecha_ingreso) || "—"}</td>
                                        <td>
                                            <span style={S.badge("#e8f8f5", "var(--primary-dark)")}>
                                                {c.sede || "—"}
                                            </span>
                                        </td>
                                        <td>{c.cargo || "—"}</td>
                                        <td>{c.lps_afiliado || "—"}</td>
                                        <td>{c.arl || "—"}</td>
                                        <td>
                                            <div style={S.actions}>
                                                <button style={S.actionBtn("#e8f0ff","#1a4fa8")} title="Ver"    onClick={() => setView(c)}><IconEye /></button>
                                                <button style={S.actionBtn("#e8f8f5","var(--primary-dark)")} title="Editar" onClick={() => setEdit(c)}><IconEdit /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Paginación ── */}
            {!isLoading && filtered.length > POR_PAGINA && (
                <div style={S.paginationBar}>
                    <span style={S.paginationInfo}>
                        Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filtered.length)} de {filtered.length}
                    </span>
                    <div style={S.paginationBtns}>
                        <button style={S.pageBtn(pagina === 1, false)} disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>‹</button>
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
                            .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) => p === "…"
                                ? <span key={`e${i}`} style={{ padding: "0 4px", color: "var(--text-muted)" }}>…</span>
                                : <button key={p} style={S.pageBtn(false, p === pagina)} onClick={() => setPagina(p)}>{p}</button>
                            )}
                        <button style={S.pageBtn(pagina === totalPaginas, false)} disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}>›</button>
                    </div>
                </div>
            )}

            {/* ── Modales ── */}
            <SeguimientoModal open={!!viewTarget} onClose={() => setView(null)} contrato={viewTarget} readOnly
                catalogs={catalogs} proyectoOpts={proyectoOpts} empleados={empleados} onSave={handleSave} />
            <SeguimientoModal open={!!editTarget} onClose={() => setEdit(null)} contrato={editTarget} readOnly={false}
                catalogs={catalogs} proyectoOpts={proyectoOpts} empleados={empleados} onSave={handleSave} />
        </div>
    );
}

/* ── Estilos ─────────────────────────────────────────────────────── */
const S = {
    toast: {
        position: "fixed", bottom: 28, right: 28, background: "var(--primary)",
        color: "#fff", borderRadius: 10, padding: "12px 22px", fontWeight: 700,
        zIndex: 9999, boxShadow: "0 4px 18px rgba(0,0,0,0.18)", fontFamily: "Nunito,sans-serif",
    },
    toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" },
    filters: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 },
    searchWrap:  { position: "relative", flex: 1, minWidth: 200, maxWidth: 380 },
    searchIcon:  { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", color: "var(--text-muted)", pointerEvents: "none" },
    searchInput: { width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none" },
    tableWrap:   { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    avatarCell:  { display: "flex", alignItems: "center", gap: 10 },
    avatar:      { width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.95rem", flexShrink: 0 },
    badge:       (bg, color) => ({ background: bg, color, borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }),
    actions:     { display: "flex", gap: 6, justifyContent: "center" },
    actionBtn:   (bg, color) => ({ background: bg, border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color, transition: "opacity 0.15s", display: "inline-flex", alignItems: "center" }),
    empty:       { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    paginationBar:  { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", flexWrap: "wrap", gap: 10 },
    paginationInfo: { fontSize: "0.84rem", color: "var(--text-muted)", fontWeight: 600 },
    paginationBtns: { display: "flex", alignItems: "center", gap: 4 },
    pageBtn: (disabled, active) => ({
        minWidth: 32, height: 32, padding: "0 8px",
        border: active ? "none" : "1.5px solid var(--border)",
        borderRadius: 6,
        background: active ? "var(--primary)" : disabled ? "var(--bg)" : "var(--white)",
        color: active ? "#fff" : disabled ? "var(--text-muted)" : "var(--text)",
        fontWeight: 700, fontSize: "0.85rem", cursor: disabled ? "default" : "pointer",
    }),

    /* modal */
    overlay:         { position: "fixed", inset: 0, background: "rgba(26,58,53,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 5000, padding: "32px 16px", overflowY: "auto" },
    modal:           { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 16px 60px rgba(26,155,140,0.22)", width: "100%", display: "flex", flexDirection: "column" },
    modalHeaderGreen:{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", background: "var(--primary)", borderTopLeftRadius: "var(--radius)", borderTopRightRadius: "var(--radius)", flexShrink: 0 },
    modalTitleWhite: { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#fff" },
    closeBtnWhite:   { background: "none", border: "1.5px solid rgba(255,255,255,0.6)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" },
    tabBar:          { display: "flex", borderBottom: "2px solid var(--border)", padding: "0 28px", gap: 0, overflowX: "auto", flexWrap: "nowrap", flexShrink: 0 },
    tab:             { padding: "11px 20px", background: "transparent", border: "none", borderBottom: "2px solid transparent", marginBottom: -2, fontSize: "0.88rem", fontWeight: 700, fontFamily: "Nunito,sans-serif", color: "var(--text-muted)", cursor: "pointer", whiteSpace: "nowrap" },
    tabActive:       { padding: "11px 20px", background: "transparent", border: "none", borderBottom: "2px solid var(--primary)", marginBottom: -2, fontSize: "0.88rem", fontWeight: 700, fontFamily: "Nunito,sans-serif", color: "var(--primary)", cursor: "pointer", whiteSpace: "nowrap" },
    modalBody:       { padding: "22px 28px 28px", overflowY: "auto", flex: 1, maxHeight: "68vh" },
    modalFooter:     { display: "flex", justifyContent: "flex-end", gap: 12, padding: "16px 28px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },
    sectionHeader:   { marginTop: 24, marginBottom: 4, padding: "9px 14px", background: "var(--primary)", color: "#fff", borderRadius: "var(--radius-sm)", fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.05em", textAlign: "center" },

    /* form */
    grid3:     { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 },
    grid2:     { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 },
    formGroup: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
    label:     { fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" },
    input:     { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", color: "var(--text)", background: "var(--white)", outline: "none" },
    err:       { color: "#e74c3c", fontSize: "0.75rem", marginTop: 2 },
};
