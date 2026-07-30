import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import {
    SearchableSelect as FilterSelect,
    PresetFiltersDropdown,
} from "../components/SearchableSelect";
import api from "../api/axios";
import {
    IconSearch,
    IconEye,
    IconEdit,
    IconTrash,
    IconClose,
    IconEmptySearch,
    IconLoading,
} from "../components/Icons";

const POR_PAGINA = 5;

const ESTADOS_CONTRATO = ["Activo", "Inactivo", "Cancelado", "Translado"];
const TIPOS_CONTRATO = [
    "Término Fijo",
    "Término Indefinido",
    "Obra o Labor",
    "Prestación de Servicios",
    "Aprendizaje",
    "Ocasional",
];

const dateOnly = (v) => (v ? String(v).split("T")[0] : "");
const TODAY = new Date().toISOString().split("T")[0];
const CUR_YEAR = new Date().getFullYear();
const YEAR_OPTS = Array.from(
    { length: CUR_YEAR - 2021 },
    (_, i) => String(2022 + i),
).concat([String(CUR_YEAR + 1)]);
const MONTH_KEYS_SET = new Set([
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
]);
const MESES = [
    ["ene", "Enero"], ["feb", "Febrero"], ["mar", "Marzo"],
    ["abr", "Abril"], ["may", "Mayo"], ["jun", "Junio"],
    ["jul", "Julio"], ["ago", "Agosto"], ["sep", "Septiembre"],
    ["oct", "Octubre"], ["nov", "Noviembre"], ["dic", "Diciembre"],
];

const DOCS_MEDICOS = [
    { id: "examen_ingreso",   label: "Examen de Ingreso",     tipo: "EXAMEN_DE_INGRESO" },
    { id: "concepto_medico",  label: "Concepto Médico",       tipo: "CONCEPTO_MEDICO" },
    { id: "examen_periodico", label: "Examen Periódico",      tipo: "EXAMEN_PERIODICO" },
    { id: "examen_retiro",    label: "Examen de Retiro",      tipo: "EXAMEN_DE_RETIRO" },
    { id: "incapacidad",      label: "Incapacidad",           tipo: "INCAPACIDAD" },
    { id: "otro_medico",      label: "Otro Documento Médico", tipo: "DOCUMENTO_MEDICO" },
];
const DOCS_MED_INIT = () => Object.fromEntries(DOCS_MEDICOS.map(d => [d.id, { file: null, status: "idle", name: null, error: null }]));

const EMPTY_FORM = {
    empleado_id: "",
    tipo_contrato: "",
    tipo_vinculacion: "",
    cargo: "",
    sede: "",
    area_empresa: "",
    jefe_inmediato: "",
    fecha_ingreso: "",
    fecha_retiro: "",
    salario: "",
    auxilio_transporte_legal: "",
    arl: "",
    fecha_vinculacion_arl: "",
    lps_afiliado: "",
    fecha_vinculacion_lps: "",
    caja_compensacion: "",
    fecha_vinculacion_caja: "",
    fondo_pensiones: "",
    fondo_cesantias: "",
    estado_contrato: "Activo",
    empleador: "",
    empresa: "",
    cliente_proyecto: "",
    regional_id: "",
    origen_seguimiento: "",
    centros_costos: [],
    anexos: [],
};

function Field({
    label,
    k,
    type = "text",
    opts,
    req,
    span,
    form,
    errors,
    onChange,
    disabled,
    uppercase,
}) {
    const style = {
        ...S.formGroup,
        ...(span ? { gridColumn: `span ${span}` } : {}),
    };
    const isObjOpts = opts && opts.length > 0 && typeof opts[0] === "object";
    const disabledStyle = disabled
        ? {
              background: "var(--bg)",
              cursor: "default",
              color: "var(--text-muted)",
          }
        : {};
    const uppercaseStyle = uppercase ? { textTransform: "uppercase" } : {};

    const handleChange = (key) => (e) => {
        if (uppercase) {
            onChange(key)({ target: { value: e.target.value.toUpperCase() } });
        } else {
            onChange(key)(e);
        }
    };

    return (
        <div style={style}>
            <label style={S.label}>
                {label}
                {req && !disabled ? " *" : ""}
            </label>
            {opts ? (
                <select
                    style={{
                        ...S.input,
                        ...(errors[k] ? S.inputErr : {}),
                        ...disabledStyle,
                    }}
                    value={form[k] ?? ""}
                    onChange={onChange(k)}
                    disabled={disabled}
                >
                    <option value="">Elige</option>
                    {isObjOpts
                        ? opts.map((o) => (
                              <option key={o.value} value={o.value}>
                                  {o.label}
                              </option>
                          ))
                        : opts.map((o) => (
                              <option key={o} value={o}>
                                  {o}
                              </option>
                          ))}
                </select>
            ) : type === "textarea" ? (
                <textarea
                    style={{
                        ...S.input,
                        minHeight: 68,
                        resize: disabled ? "none" : "vertical",
                        ...disabledStyle,
                        ...uppercaseStyle,
                    }}
                    value={form[k] ?? ""}
                    onChange={handleChange(k)}
                    disabled={disabled}
                />
            ) : (
                <input
                    style={{
                        ...S.input,
                        ...(errors[k] ? S.inputErr : {}),
                        ...disabledStyle,
                        ...uppercaseStyle,
                    }}
                    type={type}
                    value={form[k] ?? ""}
                    onChange={handleChange(k)}
                    disabled={disabled}
                />
            )}
            {errors[k] && <span style={S.err}>{errors[k]}</span>}
        </div>
    );
}

function SearchableSelect({
    label,
    k,
    opts = [],
    req,
    form,
    errors,
    onChange,
    onSelect,
    disabled,
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    const selected = opts.find((o) => String(o.value) === String(form[k]));

    const filtered = useMemo(() => {
        const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (!words.length) return opts.slice(0, 60);
        return opts
            .filter((o) => {
                const label = o.label.toLowerCase();
                return words.every((w) => label.includes(w));
            })
            .slice(0, 60);
    }, [query, opts]);

    useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleFocus = () => {
        if (!disabled) {
            setOpen(true);
            setQuery("");
        }
    };

    const handleChange = (e) => {
        setQuery(e.target.value);
        setOpen(true);
        if (!e.target.value) onChange(k)({ target: { value: "" } });
    };

    const handleSelect = (opt) => {
        onChange(k)({ target: { value: opt.value } });
        onSelect?.(opt);
        setQuery("");
        setOpen(false);
    };

    const disabledStyle = disabled
        ? {
              background: "var(--bg)",
              cursor: "default",
              color: "var(--text-muted)",
          }
        : {};

    return (
        <div style={S.formGroup} ref={wrapRef}>
            <label style={S.label}>
                {label}
                {req && !disabled ? " *" : ""}
            </label>
            <div style={{ position: "relative" }}>
                <input
                    style={{
                        ...S.input,
                        ...(errors[k] ? S.inputErr : {}),
                        ...disabledStyle,
                    }}
                    value={open ? query : selected ? selected.label : ""}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    disabled={disabled}
                />
                {open && (
                    <div
                        style={{
                            position: "absolute",
                            top: "calc(100% + 2px)",
                            left: 0,
                            right: 0,
                            background: "var(--white)",
                            border: "1.5px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            boxShadow: "0 6px 20px rgba(0,0,0,0.13)",
                            zIndex: 2000,
                            maxHeight: 220,
                            overflowY: "auto",
                        }}
                    >
                        {filtered.length === 0 ? (
                            <div
                                style={{
                                    padding: "10px 12px",
                                    fontSize: "0.85rem",
                                    color: "var(--text-muted)",
                                }}
                            >
                                Sin resultados
                            </div>
                        ) : (
                            filtered.map((opt) => (
                                <div
                                    key={opt.value}
                                    onMouseDown={() => handleSelect(opt)}
                                    style={{
                                        padding: "8px 12px",
                                        cursor: "pointer",
                                        fontSize: "0.86rem",
                                        borderBottom: "1px solid var(--border)",
                                        background:
                                            String(opt.value) ===
                                            String(form[k])
                                                ? "#e8f8f5"
                                                : "var(--white)",
                                        transition: "background 0.1s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background =
                                            "#f0f9f7";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background =
                                            String(opt.value) ===
                                            String(form[k])
                                                ? "#e8f8f5"
                                                : "var(--white)";
                                    }}
                                >
                                    {opt.label}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
            {errors[k] && <span style={S.err}>{errors[k]}</span>}
        </div>
    );
}

function CandidatoSelector({ candidatos, empleados, onSelect }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const wrapRef = useRef(null);
    const debouncedQ = useDebounce(query, 200);

    const filtered = useMemo(() => {
        const words = debouncedQ
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);
        if (!words.length) return candidatos.slice(0, 80);
        return candidatos
            .filter((c) => {
                const text =
                    `${c.nombres} ${c.apellidos} ${c.documento}`.toLowerCase();
                return words.every((w) => text.includes(w));
            })
            .slice(0, 80);
    }, [debouncedQ, candidatos]);

    useEffect(() => {
        const h = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const handlePick = (c) => {
        setSelected(c);
        setQuery("");
        setOpen(false);
        // Buscar empleado_id por documento/cedula
        const emp = empleados.find(
            (e) => String(e.cedula) === String(c.documento),
        );
        onSelect({
            ...c,
            empleado_id: emp?.id ?? "",
            documento: c.documento,
            nombres: c.nombres,
            apellidos: c.apellidos,
            correo: c.correo,
        });
    };

    return (
        <div ref={wrapRef} style={{ width: "100%" }}>
            {selected ? (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        background: "#e8f8f5",
                        border: "2px solid var(--primary)",
                        borderRadius: 10,
                        padding: "14px 18px",
                    }}
                >
                    <div
                        style={{
                            width: 46,
                            height: 46,
                            borderRadius: "50%",
                            background: "var(--primary)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "1.2rem",
                            flexShrink: 0,
                            overflow: "hidden",
                            position: "relative",
                        }}
                    >
                        {selected.nombres.charAt(0).toUpperCase()}
                        {selected.fotografia && (
                            <img
                                src={`/storage/${selected.fotografia}`}
                                alt=""
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: "50%",
                                }}
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div
                            style={{
                                fontWeight: 800,
                                fontSize: "1rem",
                                color: "var(--primary-dark)",
                                fontFamily: "'Poppins',sans-serif",
                            }}
                        >
                            {selected.nombres} {selected.apellidos}
                        </div>
                        <div
                            style={{
                                fontSize: "0.82rem",
                                color: "var(--text-muted)",
                                fontFamily: "Nunito,sans-serif",
                            }}
                        >
                            Doc: {selected.documento}
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setSelected(null);
                            onSelect(null);
                        }}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            fontSize: "1.1rem",
                            padding: 4,
                        }}
                        title="Cambiar candidato"
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <div style={{ position: "relative" }}>
                    <input
                        style={{
                            ...S.input,
                            fontSize: "1rem",
                            padding: "12px 14px",
                            border: "2px solid var(--border)",
                            borderRadius: 10,
                        }}
                        placeholder="Buscar por nombre o documento…"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        autoFocus
                    />
                    {open && (
                        <div
                            style={{
                                position: "absolute",
                                top: "calc(100% + 4px)",
                                left: 0,
                                right: 0,
                                background: "var(--white)",
                                border: "1.5px solid var(--border)",
                                borderRadius: 10,
                                boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
                                zIndex: 3000,
                                maxHeight: 280,
                                overflowY: "auto",
                            }}
                        >
                            {filtered.length === 0 ? (
                                <div
                                    style={{
                                        padding: "14px 16px",
                                        color: "var(--text-muted)",
                                        fontSize: "0.88rem",
                                    }}
                                >
                                    Sin resultados
                                </div>
                            ) : (
                                filtered.map((c) => (
                                    <div
                                        key={c.documento}
                                        onMouseDown={() => handlePick(c)}
                                        style={{
                                            padding: "10px 16px",
                                            cursor: "pointer",
                                            borderBottom:
                                                "1px solid var(--border)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.background =
                                                "#f0f9f7")
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.background =
                                                "var(--white)")
                                        }
                                    >
                                        <div
                                            style={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: "50%",
                                                background: "var(--primary)",
                                                color: "#fff",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontWeight: 800,
                                                fontSize: "0.9rem",
                                                flexShrink: 0,
                                                overflow: "hidden",
                                                position: "relative",
                                            }}
                                        >
                                            {c.nombres.charAt(0).toUpperCase()}
                                            {c.fotografia && (
                                                <img
                                                    src={`/storage/${c.fotografia}`}
                                                    alt=""
                                                    style={{
                                                        position: "absolute",
                                                        inset: 0,
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                        borderRadius: "50%",
                                                    }}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display =
                                                            "none";
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: "0.9rem",
                                                    color: "var(--text)",
                                                }}
                                            >
                                                {c.nombres} {c.apellidos}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "0.78rem",
                                                    color: "var(--text-muted)",
                                                }}
                                            >
                                                {c.documento}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Modal({
    open,
    onClose,
    onSave,
    initial,
    title,
    empleados,
    catalogs,
    candidatosContrato = [],
    proyectoOpts = [],
    empleadorOpts = [],
    empresasOpts = [],
    centrosCostoCatalogo = [],
    readOnly = false,
}) {
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState({});
    const [activeTab, setActive] = useState("principal");
    const [eventosMedicos, setEventosMedicos] = useState([]);
    const [eventosCollapsed, setEventosCollapsed] = useState([]);
    const [evObsYears, setEvObsYears]             = useState([]);
    const [evCierreCollapsed, setEvCierre]        = useState([]);
    const [saving, setSaving]                     = useState(false);
    const [docsMed, setDocsMed]                   = useState(DOCS_MED_INIT);
    const [uploadingMed, setUploadingMed]         = useState(false);
    const [docsSubidos, setDocsSubidos]           = useState({});
    const [eventoDocIdx, setEventoDocIdx]         = useState(0);
    const isCreate = !initial?.id && !readOnly;
    const eventoIdx = Math.max(0, Math.min(eventoDocIdx, eventosMedicos.length - 1));
    const eventoSel = eventosMedicos[eventoIdx] ?? null;
    const eventoFecha = eventoSel?.fecha_ingreso_seguimiento ?? "";
    const regionalOpts = (catalogs.regionales || []).map((r) => ({
        value: r.id,
        label: r.nombre,
    }));
    const totalPorcentajeCC = (form.centros_costos || []).reduce(
        (s, cc) => s + (parseFloat(cc.porcentaje) || 0),
        0,
    );

    useEffect(() => {
        if (open) {
            setForm({
                ...initial,
                fecha_ingreso: dateOnly(initial.fecha_ingreso),
                fecha_retiro: dateOnly(initial.fecha_retiro),
                fecha_vinculacion_arl: dateOnly(initial.fecha_vinculacion_arl),
                fecha_vinculacion_lps: dateOnly(initial.fecha_vinculacion_lps),
                fecha_vinculacion_caja: dateOnly(
                    initial.fecha_vinculacion_caja,
                ),
                centros_costos: initial.centros_costos || [],
                anexos: initial.anexos || [],
                seguimiento_fecha_cierre: dateOnly(
                    initial.seguimiento_fecha_cierre,
                ),
                seguimiento_observaciones: (() => {
                    const raw = initial.seguimiento_observaciones || {};
                    return Object.keys(raw).some((k) =>
                        MONTH_KEYS_SET.has(k),
                    )
                        ? { [String(CUR_YEAR)]: raw }
                        : raw;
                })(),
            });
            setErrors({});
            setActive("principal");
            setSaving(false);
            const _evs = (initial.eventos_medicos || []).map((ev) => ({
                ...ev,
                fecha_ingreso_seguimiento: dateOnly(ev.fecha_ingreso_seguimiento),
                vigencia_desde: dateOnly(ev.vigencia_desde),
                vigencia_hasta: dateOnly(ev.vigencia_hasta),
                fecha_cierre:   dateOnly(ev.fecha_cierre),
                observaciones:  ev.observaciones ?? {},
            }));
            setEventosMedicos(_evs);
            setEventosCollapsed(_evs.map((_, __, arr) => arr.length > 1));
            setEvObsYears(_evs.map(() => String(CUR_YEAR)));
            setEvCierre(_evs.map(() => true));
            setDocsMed(DOCS_MED_INIT());
            setUploadingMed(false);
            setDocsSubidos({});
            setEventoDocIdx(0);
        }
    }, [initial, open]);

    useEffect(() => {
        if (!open) return;
        const _emp = empleados.find(e => String(e.id) === String(initial?.empleado_id));
        const ced = _emp?.cedula ?? initial?.documento ?? "";
        setDocsMed(DOCS_MED_INIT());
        if (!ced || !eventoFecha) { setDocsSubidos({}); return; }
        api.get("/documentos-contratacion/docs-medicos", { params: { cedula: ced, evento: eventoFecha } })
            .then(r => setDocsSubidos(r.data ?? {}))
            .catch(() => {});
    }, [open, initial, eventoFecha]);

    const onChange = (k) => (e) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleCandidatoSelect = (c) => {
        if (!c) return;
        setForm((f) => ({
            ...f,
            empleado_id: c.empleado_id || f.empleado_id,
            documento: c.documento || f.documento,
            nombres: c.nombres || f.nombres,
            apellidos: c.apellidos || f.apellidos,
            correo: c.correo || f.correo,
            cargo: c.cargo || f.cargo,
            sede: c.sede || f.sede,
            tipo_vinculacion: c.tipo_vinculacion || f.tipo_vinculacion,
            empresa: c.empresa || f.empresa,
            empleador: c.empleador || f.empleador,
            jefe_inmediato: c.jefe_inmediato || f.jefe_inmediato,
            cliente_proyecto: c.cliente_proyecto || f.cliente_proyecto,
            fecha_ingreso: c.fecha_ingreso || f.fecha_ingreso,
            salario: c.salario || f.salario,
            auxilio_transporte_legal:
                c.auxilio_transporte_legal || f.auxilio_transporte_legal,
            lps_afiliado: c.lps_afiliado || f.lps_afiliado,
            fondo_pensiones: c.fondo_pensiones || f.fondo_pensiones,
            fondo_cesantias: c.fondo_cesantias || f.fondo_cesantias,
            arl: c.arl || f.arl,
            caja_compensacion: c.caja_compensacion || f.caja_compensacion,
        }));
        setErrors({});
    };

    const handleAutoFill = (opt) => {
        setForm((f) => ({
            ...f,
            cargo: opt.cargo || f.cargo,
            sede: opt.sede || f.sede,
            tipo_vinculacion: opt.tipo_vinculacion || f.tipo_vinculacion,
            arl: opt.arl || f.arl,
            lps_afiliado: opt.eps || f.lps_afiliado,
            caja_compensacion: opt.caja_compensacion || f.caja_compensacion,
            fondo_pensiones: opt.fondo_pensiones || f.fondo_pensiones,
            empresa: opt.empresa_nombre || f.empresa,
            empleador: opt.empleador || f.empleador,
            jefe_inmediato: opt.jefe_inmediato || f.jefe_inmediato,
        }));
    };

    const addCentroCosto = () =>
        setForm((f) => ({
            ...f,
            centros_costos: [
                ...f.centros_costos,
                { centro_costo_catalogo_id: "", codigo: "", centro_costos: "", porcentaje: 0 },
            ],
        }));
    const removeCentroCosto = (idx) =>
        setForm((f) => ({
            ...f,
            centros_costos: f.centros_costos.filter((_, i) => i !== idx),
        }));
    const updateCentroCosto = (idx, k, v) =>
        setForm((f) => ({
            ...f,
            centros_costos: f.centros_costos.map((cc, i) => {
                if (i !== idx) return cc;
                if (k === "centro_costo_catalogo_id") {
                    const found = centrosCostoCatalogo.find(
                        (c) => String(c.id) === String(v),
                    );
                    return {
                        ...cc,
                        centro_costo_catalogo_id: v,
                        codigo: found?.codigo ?? "",
                        centro_costos: found?.nombre ?? "",
                    };
                }
                return { ...cc, [k]: v };
            }),
        }));

    const addAnexo = () =>
        setForm((f) => ({
            ...f,
            anexos: [
                ...f.anexos,
                { anexo_auxilio: "", valor: 0, fecha_entrega_firma: "" },
            ],
        }));
    const removeAnexo = (idx) =>
        setForm((f) => ({
            ...f,
            anexos: f.anexos.filter((_, i) => i !== idx),
        }));
    const updateAnexo = (idx, k, v) =>
        setForm((f) => ({
            ...f,
            anexos: f.anexos.map((a, i) => (i === idx ? { ...a, [k]: v } : a)),
        }));

    const EVENTO_VACIO = {
        fecha_ingreso_seguimiento: "",
        tipo_evento: "",
        origen_diagnostico: "",
        diagnostico: "",
        recomendaciones: "",
        vigencia_desde: "",
        vigencia_hasta: "",
        condicion: "",
        estado: "",
    };
    const addEvento = () => {
        setEventosMedicos((ev) => [...ev, { ...EVENTO_VACIO, fecha_cierre: "", observaciones: {} }]);
        setEventosCollapsed((c) => [...c, false]);
        setEvObsYears((c) => [...c, String(CUR_YEAR)]);
        setEvCierre((c) => [...c, true]);
    };
    const removeEvento = (idx) => {
        setEventosMedicos((ev) => ev.filter((_, i) => i !== idx));
        setEventosCollapsed((c) => c.filter((_, i) => i !== idx));
        setEvObsYears((c) => c.filter((_, i) => i !== idx));
        setEvCierre((c) => c.filter((_, i) => i !== idx));
    };
    const updateEvento = (idx, k, v) =>
        setEventosMedicos((ev) =>
            ev.map((e, i) => (i === idx ? { ...e, [k]: v } : e)),
        );
    const toggleEvento = (idx) =>
        setEventosCollapsed((c) => c.map((v, i) => (i === idx ? !v : v)));
    const toggleCierre = (idx) =>
        setEvCierre((c) => c.map((v, i) => (i === idx ? !v : v)));

    const empForMed  = empleados.find(e => String(e.id) === String(form?.empleado_id));
    const cedulaMed  = empForMed?.cedula ?? form?.documento ?? "";

    const handleUploadDocs = async () => {
        const toUpload = DOCS_MEDICOS.filter(d => docsMed[d.id]?.file);
        if (!toUpload.length || uploadingMed || !cedulaMed || !eventoFecha) return;
        setUploadingMed(true);
        setDocsMed(prev => {
            const next = { ...prev };
            toUpload.forEach(d => { next[d.id] = { ...next[d.id], status: "uploading" }; });
            return next;
        });
        const successTipos = [];
        for (const doc of toUpload) {
            const file = docsMed[doc.id].file;
            const ext  = file.name.split(".").pop().toLowerCase();
            const filename = `${cedulaMed}_${doc.tipo}.${ext}`;
            try {
                const fd = new FormData();
                fd.append("documento", cedulaMed);
                fd.append("tipo", doc.id);
                fd.append("archivo", file);
                fd.append("evento", eventoFecha);
                await api.post("/documentos-contratacion/upload", fd);
                setDocsMed(prev => ({ ...prev, [doc.id]: { file: null, status: "done", name: filename, error: null } }));
                successTipos.push(doc.id);
            } catch (err) {
                const msg = err?.response?.data?.message ?? err.message;
                setDocsMed(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], status: "error", error: msg } }));
            }
        }
        if (successTipos.length > 0) {
            api.post("/documentos-contratacion/notificar-seguimiento-medico", {
                documento:        cedulaMed,
                nombres:          empForMed?.nombres   ?? "",
                apellidos:        empForMed?.apellidos ?? "",
                fechaSeguimiento: eventoFecha,
                evento:           eventoFecha,
                tipos:            successTipos,
            }).catch(() => {});
        }
        setUploadingMed(false);
    };

    const validate = () => {
        const e = {};
        if (!form.empleado_id && !form.documento) e.empleado_id = "Requerido";
        if (!form.tipo_contrato) e.tipo_contrato = "Requerido";
        if (!form.cargo) e.cargo = "Requerido";
        if (!form.sede) e.sede = "Requerido";
        if (!form.fecha_ingreso) e.fecha_ingreso = "Requerido";

        const ccList = form.centros_costos || [];
        const filaIncompleta = ccList.some(
            (cc) => (cc.centro_costo_catalogo_id || cc.porcentaje) && (!cc.centro_costo_catalogo_id || !(parseFloat(cc.porcentaje) > 0)),
        );
        if (filaIncompleta) {
            e.centros_costos = "Cada centro de costo necesita empresa, código y un porcentaje mayor a 0%.";
        } else if (Math.round(totalPorcentajeCC * 100) / 100 > 100) {
            e.centros_costos = `La suma de porcentajes es ${totalPorcentajeCC}% y no puede superar 100%.`;
        }

        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length) {
            setErrors(e);
            setActive(e.centros_costos && !e.empleado_id && !e.tipo_contrato && !e.cargo && !e.sede && !e.fecha_ingreso ? "costos" : "principal");
            return;
        }
        setSaving(true);
        try {
            await onSave({ ...form, eventos_medicos: eventosMedicos });
        } catch {
            // parent handles error toast
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    const fp = { form, errors, onChange, disabled: readOnly };

    return (
        <div style={S.overlay} onClick={onClose}>
            <div
                style={{ ...S.modal, maxWidth: 960 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>{title}</span>
                    <button style={S.closeBtnWhite} onClick={onClose}>
                        <IconClose size={14} />
                    </button>
                </div>

                {/* Selector de candidato prominente solo en modo crear */}
                {isCreate && (
                    <div
                        style={{
                            padding: "20px 28px 0",
                            borderBottom: "2px solid var(--border)",
                            background: "var(--bg)",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "0.72rem",
                                fontWeight: 800,
                                letterSpacing: "0.07em",
                                color: "var(--primary)",
                                fontFamily: "'Poppins',sans-serif",
                                textTransform: "uppercase",
                                marginBottom: 8,
                            }}
                        >
                            Seleccionar candidato para el contrato
                        </div>
                        <div style={{ paddingBottom: 20 }}>
                            <CandidatoSelector
                                candidatos={candidatosContrato}
                                empleados={empleados}
                                onSelect={handleCandidatoSelect}
                            />
                            {errors.empleado_id && (
                                <div style={{ ...S.err, marginTop: 8 }}>
                                    {errors.empleado_id === "Requerido"
                                        ? "Debe seleccionar un candidato válido."
                                        : errors.empleado_id}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="tab-bar" style={S.tabBar}>
                    {[
                        ["principal",         "Información Principal"],
                        ["seguridad",         "Seguridad Social"],
                        ["costos",            "Costos y Anexos"],
                        ["Seguimiento_medico","Seguimiento Médico"],
                        ["doc_medicos",       "Documentos Médicos"],
                    ].map(([key, lbl]) => (
                        <button
                            key={key}
                            style={activeTab === key ? S.tabActive : S.tab}
                            onClick={() => setActive(key)}
                        >
                            {lbl}
                        </button>
                    ))}
                </div>

                <div style={S.modalBody}>
                    {activeTab === "principal" && (
                        <>
                            <div style={S.grid3}>
                                {!isCreate && (
                                    <SearchableSelect
                                        label="Empleado"
                                        k="empleado_id"
                                        opts={empleados.map((e) => ({
                                            value: e.id,
                                            label: `${e.nombres} ${e.apellidos} (${e.cedula})`,
                                            cargo: e.cargo,
                                            sede: e.sede,
                                            tipo_vinculacion:
                                                e.tipo_vinculacion,
                                            arl: e.arl,
                                            eps: e.eps,
                                            caja_compensacion:
                                                e.caja_compensacion,
                                            fondo_pensiones: e.fondo_pensiones,
                                            empresa_nombre:
                                                e.empresa?.nombre ?? "",
                                            empleador: e.empleador,
                                            jefe_inmediato: e.jefe_inmediato,
                                        }))}
                                        req
                                        form={form}
                                        errors={errors}
                                        onChange={onChange}
                                        onSelect={
                                            readOnly
                                                ? undefined
                                                : handleAutoFill
                                        }
                                        disabled={readOnly}
                                    />
                                )}
                                <Field
                                    label="Tipo de Contrato"
                                    k="tipo_contrato"
                                    opts={TIPOS_CONTRATO}
                                    req
                                    {...fp}
                                />
                                <Field
                                    label="Estado Contrato"
                                    k="estado_contrato"
                                    opts={ESTADOS_CONTRATO}
                                    req
                                    {...fp}
                                />
                            </div>
                            <div style={{ ...S.grid3, marginTop: 16 }}>
                                <Field
                                    label="Cargo"
                                    k="cargo"
                                    opts={catalogs.cargos}
                                    req
                                    {...fp}
                                />
                                <Field
                                    label="Sede"
                                    k="sede"
                                    opts={catalogs.sedes}
                                    req
                                    {...fp}
                                />
                                <Field
                                    label="Área Empresa"
                                    k="area_empresa"
                                    {...fp}
                                />
                            </div>
                            <div style={{ ...S.grid3, marginTop: 16 }}>
                                <Field
                                    label="Tipo Vinculación"
                                    k="tipo_vinculacion"
                                    opts={catalogs.tipos_vinculacion}
                                    {...fp}
                                />
                                <Field
                                    label="Jefe Inmediato"
                                    k="jefe_inmediato"
                                    {...fp}
                                />
                                <Field
                                    label="Origen Seguimiento"
                                    k="origen_seguimiento"
                                    {...fp}
                                />
                            </div>
                            <div style={{ ...S.grid3, marginTop: 16 }}>
                                <Field
                                    label="Fecha Ingreso"
                                    k="fecha_ingreso"
                                    type="date"
                                    req
                                    {...fp}
                                />
                                <Field
                                    label="Fecha Retiro"
                                    k="fecha_retiro"
                                    type="date"
                                    {...fp}
                                />
                                <div />
                            </div>
                            <div style={{ ...S.grid3, marginTop: 16 }}>
                                <Field
                                    label="Salario"
                                    k="salario"
                                    type="number"
                                    {...fp}
                                />
                                <Field
                                    label="Auxilio Transp. Legal"
                                    k="auxilio_transporte_legal"
                                    type="number"
                                    {...fp}
                                />
                                <div />
                            </div>
                            <div style={{ ...S.grid3, marginTop: 16 }}>
                                <Field
                                    label="Empleador"
                                    k="empleador"
                                    opts={empleadorOpts}
                                    {...fp}
                                />
                                <Field
                                    label="Empresa"
                                    k="empresa"
                                    opts={
                                        empresasOpts.length
                                            ? empresasOpts
                                            : undefined
                                    }
                                    {...fp}
                                />
                                <Field
                                    label="Cliente / Proyecto"
                                    k="cliente_proyecto"
                                    opts={
                                        proyectoOpts.length
                                            ? proyectoOpts
                                            : undefined
                                    }
                                    {...fp}
                                />
                            </div>
                            <div style={{ ...S.grid3, marginTop: 16 }}>
                                <Field
                                    label="Regional"
                                    k="regional_id"
                                    opts={regionalOpts}
                                    {...fp}
                                />
                                <div />
                                <div />
                            </div>
                        </>
                    )}

                    {activeTab === "seguridad" && (
                        <>
                            <div style={S.grid3}>
                                <Field
                                    label="ARL"
                                    k="arl"
                                    opts={catalogs.arls}
                                    {...fp}
                                />
                                <Field
                                    label="Fecha Vinculación ARL"
                                    k="fecha_vinculacion_arl"
                                    type="date"
                                    {...fp}
                                />
                                <div />
                            </div>
                            <div style={{ ...S.grid3, marginTop: 16 }}>
                                <Field
                                    label="EPS (LPS Afiliado)"
                                    k="lps_afiliado"
                                    {...fp}
                                />
                                <Field
                                    label="Fecha Vinculación EPS"
                                    k="fecha_vinculacion_lps"
                                    type="date"
                                    {...fp}
                                />
                                <div />
                            </div>
                            <div style={{ ...S.grid3, marginTop: 16 }}>
                                <Field
                                    label="Caja Compensación"
                                    k="caja_compensacion"
                                    opts={catalogs.cajas}
                                    {...fp}
                                />
                                <Field
                                    label="Fecha Vinculación Caja"
                                    k="fecha_vinculacion_caja"
                                    type="date"
                                    {...fp}
                                />
                                <div />
                            </div>
                            <div style={{ ...S.grid3, marginTop: 16 }}>
                                <Field
                                    label="Fondo Pensiones"
                                    k="fondo_pensiones"
                                    {...fp}
                                />
                                <Field
                                    label="Fondo Cesantías"
                                    k="fondo_cesantias"
                                    {...fp}
                                />
                                <div />
                            </div>
                        </>
                    )}

                    {activeTab === "Seguimiento_medico" &&
                        (() => {
                            const emp = empleados.find(
                                (e) =>
                                    String(e.id) === String(form.empleado_id),
                            );
                            const cedula = emp?.cedula ?? form.documento ?? "";
                            const nombre = emp
                                ? `${emp.nombres ?? ""} ${emp.apellidos ?? ""}`.trim()
                                : "";
                            return (
                                <>
                                    <div style={S.sectionHeader}>
                                        INFORMACIÓN DEL EMPLEADO
                                    </div>
                                    <div style={{ ...S.grid3, marginTop: 16 }}>
                                        <Field
                                            label="Cédula"
                                            k="_cedula_display"
                                            form={{ _cedula_display: cedula }}
                                            errors={{}}
                                            onChange={() => () => {}}
                                            disabled
                                        />
                                        <Field
                                            label="Nombre Completo"
                                            k="_nombre_display"
                                            form={{ _nombre_display: nombre }}
                                            errors={{}}
                                            onChange={() => () => {}}
                                            disabled
                                        />
                                        <Field
                                            label="Empleador"
                                            k="empleador"
                                            opts={empleadorOpts}
                                            {...fp}
                                        />
                                    </div>
                                    <div style={{ ...S.grid3, marginTop: 16 }}>
                                        <Field
                                            label="Proyecto"
                                            k="cliente_proyecto"
                                            opts={
                                                proyectoOpts.length
                                                    ? proyectoOpts
                                                    : undefined
                                            }
                                            {...fp}
                                        />
                                        <Field
                                            label="Fecha de Ingreso"
                                            k="fecha_ingreso"
                                            type="date"
                                            req
                                            {...fp}
                                        />
                                        <Field
                                            label="Ciudad / Sede"
                                            k="sede"
                                            opts={catalogs.sedes}
                                            req
                                            {...fp}
                                        />
                                    </div>
                                    <div style={{ ...S.grid3, marginTop: 16 }}>
                                        <Field
                                            label="Cargo"
                                            k="cargo"
                                            opts={catalogs.cargos}
                                            req
                                            {...fp}
                                        />
                                        <Field
                                            label="EPS"
                                            k="lps_afiliado"
                                            {...fp}
                                        />
                                        <Field
                                            label="ARL"
                                            k="arl"
                                            opts={catalogs.arls}
                                            {...fp}
                                        />
                                    </div>

                                    {/* ── División 2: Eventos de seguimiento médico ── */}
                                    <div
                                        style={{
                                            ...S.sectionHeader,
                                            marginTop: 32,
                                        }}
                                    >
                                        EVENTOS DE SEGUIMIENTO MÉDICO
                                    </div>
                                    {eventosMedicos.length === 0 && (
                                        <p
                                            style={{
                                                color: "var(--text-muted)",
                                                fontSize: "0.85rem",
                                                fontStyle: "italic",
                                                marginTop: 12,
                                            }}
                                        >
                                            Sin eventos registrados. Haz clic en
                                            "+ Agregar evento" para añadir uno.
                                        </p>
                                    )}

                                    {eventosMedicos.map((ev, i) => {
                                        const collapsed = !!eventosCollapsed[i];
                                        const evFp = {
                                            form: ev,
                                            errors: {},
                                            onChange: (k) => (e) =>
                                                updateEvento(
                                                    i,
                                                    k,
                                                    e.target.value,
                                                ),
                                            disabled: readOnly,
                                        };
                                        const vigBadge = (() => {
                                            const {
                                                vigencia_desde,
                                                vigencia_hasta,
                                            } = ev;
                                            const cierre =
                                                ev.fecha_cierre;
                                            if (cierre && TODAY > cierre)
                                                return {
                                                    label: "Vencida",
                                                    bg: "#fce8e8",
                                                    color: "#a33",
                                                };
                                            if (
                                                !vigencia_desde &&
                                                !vigencia_hasta
                                            )
                                                return null;
                                            if (
                                                vigencia_hasta &&
                                                TODAY > vigencia_hasta
                                            )
                                                return {
                                                    label: "Vencida",
                                                    bg: "#fce8e8",
                                                    color: "#a33",
                                                };
                                            if (
                                                vigencia_desde &&
                                                TODAY >= vigencia_desde
                                            )
                                                return {
                                                    label: "Activa",
                                                    bg: "#e0f7f4",
                                                    color: "#0d6e5a",
                                                };
                                            return {
                                                label: "Pendiente",
                                                bg: "#fff3e0",
                                                color: "#e67e22",
                                            };
                                        })();
                                        return (
                                            <div
                                                key={i}
                                                style={{
                                                    border: `1.5px solid ${vigBadge?.label === "Activa" ? "rgba(13,110,90,0.35)" : "var(--border)"}`,
                                                    borderRadius:
                                                        "var(--radius-sm)",
                                                    padding: "12px 18px",
                                                    marginTop: 16,
                                                    background: "var(--bg)",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent:
                                                            "space-between",
                                                        marginBottom: collapsed
                                                            ? 0
                                                            : 14,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 8,
                                                            flex: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() =>
                                                                toggleEvento(i)
                                                            }
                                                            style={{
                                                                background:
                                                                    "none",
                                                                border: "none",
                                                                cursor: "pointer",
                                                                color: "var(--primary)",
                                                                fontSize:
                                                                    "0.85rem",
                                                                padding:
                                                                    "2px 4px",
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                flexShrink: 0,
                                                            }}
                                                            title={
                                                                collapsed
                                                                    ? "Expandir"
                                                                    : "Colapsar"
                                                            }
                                                        >
                                                            {collapsed
                                                                ? "▶"
                                                                : "▼"}
                                                        </button>
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    "0.72rem",
                                                                fontWeight: 800,
                                                                color: "var(--primary)",
                                                                letterSpacing:
                                                                    "0.06em",
                                                                fontFamily:
                                                                    "'Poppins',sans-serif",
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            EVENTO #{i + 1}
                                                        </span>
                                                        {(ev.tipo_evento ||
                                                            ev.fecha_ingreso_seguimiento) && (
                                                            <span
                                                                style={{
                                                                    fontSize:
                                                                        "0.82rem",
                                                                    color: "var(--text-muted)",
                                                                    overflow:
                                                                        "hidden",
                                                                    textOverflow:
                                                                        "ellipsis",
                                                                    whiteSpace:
                                                                        "nowrap",
                                                                }}
                                                            >
                                                                {[
                                                                    ev.tipo_evento,
                                                                    ev.fecha_ingreso_seguimiento,
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        " · ",
                                                                    )}
                                                            </span>
                                                        )}
                                                        {vigBadge && (
                                                            <span
                                                                style={{
                                                                    background:
                                                                        vigBadge.bg,
                                                                    color: vigBadge.color,
                                                                    borderRadius: 20,
                                                                    padding:
                                                                        "2px 9px",
                                                                    fontSize:
                                                                        "0.72rem",
                                                                    fontWeight: 800,
                                                                    whiteSpace:
                                                                        "nowrap",
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                {vigBadge.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {!readOnly && (
                                                        <button
                                                            onClick={() =>
                                                                removeEvento(i)
                                                            }
                                                            style={{
                                                                background:
                                                                    "#fce8e8",
                                                                border: "none",
                                                                borderRadius: 4,
                                                                color: "#a33",
                                                                cursor: "pointer",
                                                                padding:
                                                                    "4px 9px",
                                                                fontSize:
                                                                    "0.78rem",
                                                                fontWeight: 700,
                                                                flexShrink: 0,
                                                                marginLeft: 8,
                                                            }}
                                                        >
                                                            ✕ Eliminar
                                                        </button>
                                                    )}
                                                </div>
                                                {!collapsed && (
                                                    <>
                                                        <div style={S.grid3}>
                                                            <Field
                                                                label="Fecha de Ingreso a Seguimiento"
                                                                k="fecha_ingreso_seguimiento"
                                                                type="date"
                                                                {...evFp}
                                                            />
                                                            <Field
                                                                label="Tipo de Evento"
                                                                k="tipo_evento"
                                                                {...evFp}
                                                            />
                                                            <Field
                                                                label="Origen del Diagnóstico"
                                                                k="origen_diagnostico"
                                                                {...evFp}
                                                            />
                                                        </div>
                                                        <div
                                                            style={{
                                                                ...S.grid2,
                                                                marginTop: 14,
                                                            }}
                                                        >
                                                            <Field
                                                                label="Diagnóstico"
                                                                k="diagnostico"
                                                                type="textarea"
                                                                {...evFp}
                                                            />
                                                            <div
                                                                style={{
                                                                    display:
                                                                        "flex",
                                                                    flexDirection:
                                                                        "column",
                                                                    gap: 10,
                                                                }}
                                                            >
                                                                <Field
                                                                    label="Recomendaciones y/o Restricciones Médico Laborales"
                                                                    k="recomendaciones"
                                                                    type="textarea"
                                                                    {...evFp}
                                                                />
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "grid",
                                                                        gridTemplateColumns:
                                                                            "1fr 1fr",
                                                                        gap: 14,
                                                                    }}
                                                                >
                                                                    <Field
                                                                        label="Vigencia Desde"
                                                                        k="vigencia_desde"
                                                                        type="date"
                                                                        {...evFp}
                                                                    />
                                                                    <Field
                                                                        label="Vigencia Hasta"
                                                                        k="vigencia_hasta"
                                                                        type="date"
                                                                        {...evFp}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div
                                                            style={{
                                                                ...S.grid2,
                                                                marginTop: 14,
                                                            }}
                                                        >
                                                            <Field
                                                                label="Condición"
                                                                k="condicion"
                                                                {...evFp}
                                                            />
                                                            <Field
                                                                label="Estado"
                                                                k="estado"
                                                                {...evFp}
                                                            />
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
                                        <button
                                            style={{
                                                ...S.btnSecondary,
                                                marginTop: 14,
                                                padding: "7px 16px",
                                                fontSize: "0.82rem",
                                            }}
                                            onClick={addEvento}
                                        >
                                            + Agregar evento
                                        </button>
                                    )}

                                </>
                            );
                        })()}

                    {/* ── Tab Documentos Médicos ── */}
                    {activeTab === "doc_medicos" && (
                        <div>
                            {!cedulaMed ? (
                                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                                    Sin empleado asociado. Selecciona un empleado en la pestaña Principal.
                                </div>
                            ) : eventosMedicos.length === 0 ? (
                                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                                    Registra primero un evento en la pestaña "Seguimiento Médico". Los documentos se asocian a un evento.
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
                                            {eventosMedicos.map((ev, i) => (
                                                <option key={i} value={i}>
                                                    {(ev.fecha_ingreso_seguimiento || "Sin fecha") + (ev.tipo_evento ? ` · ${ev.tipo_evento}` : "")}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {!eventoFecha ? (
                                        <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                                            Este evento no tiene "Fecha Ingreso a Seguimiento". Complétala en la pestaña "Seguimiento Médico" y guarda antes de subir documentos.
                                        </div>
                                    ) : (
                                    <>
                                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 14, marginBottom: 18 }}>
                                        Carpeta SharePoint del empleado <strong>CC {cedulaMed}</strong>, evento <strong>{eventoFecha}</strong>. Máx. 10 MB por archivo.
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
                                                            await api.delete("/documentos-contratacion/docs-medicos", {
                                                                data: { cedula: cedulaMed, tipo: doc.id, evento: eventoFecha },
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

                    {activeTab === "costos" && (
                        <>
                            <div style={S.sectionHeader}>CENTROS DE COSTO</div>
                            <div style={{ marginTop: 12 }}>
                                {form.centros_costos.map((cc, i) => {
                                    const codigoOpts = centrosCostoCatalogo.map((c) => ({
                                        value: c.id,
                                        label: `${c.codigo} · ${c.nombre}${c.ciudad ? ` (${c.ciudad})` : ""}${c.proyecto ? ` — ${c.proyecto}` : ""}`,
                                    }));
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                ...S.grid2,
                                                marginBottom: 10,
                                                alignItems: "end",
                                            }}
                                        >
                                            <div style={S.formGroup}>
                                                <label style={S.label}>
                                                    Centro de Costos
                                                </label>
                                                <FilterSelect
                                                    value={cc.centro_costo_catalogo_id}
                                                    onChange={(v) =>
                                                        updateCentroCosto(i, "centro_costo_catalogo_id", v)
                                                    }
                                                    options={codigoOpts}
                                                    minSearch={0}
                                                    maxResults={200}
                                                    disabled={readOnly}
                                                />
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 10,
                                                    alignItems: "end",
                                                }}
                                            >
                                                <Field
                                                    label="Porcentaje %"
                                                    k={`cc_${i}_pct`}
                                                    type="number"
                                                    form={{
                                                        [`cc_${i}_pct`]:
                                                            cc.porcentaje,
                                                    }}
                                                    onChange={() => (e) =>
                                                        updateCentroCosto(
                                                            i,
                                                            "porcentaje",
                                                            e.target.value,
                                                        )
                                                    }
                                                    errors={{}}
                                                    disabled={readOnly}
                                                />
                                                {!readOnly && (
                                                    <button
                                                        style={{
                                                            ...S.actionBtn(
                                                                "#fce8e8",
                                                                "#a33",
                                                            ),
                                                            height: 38,
                                                        }}
                                                        onClick={() =>
                                                            removeCentroCosto(i)
                                                        }
                                                    >
                                                        <IconTrash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {!readOnly && (
                                    <button
                                        style={{
                                            ...S.btnSecondary,
                                            marginTop: 8,
                                            padding: "6px 12px",
                                            fontSize: "0.8rem",
                                        }}
                                        onClick={addCentroCosto}
                                        disabled={totalPorcentajeCC >= 100}
                                    >
                                        + Agregar Centro de Costo
                                    </button>
                                )}
                                {form.centros_costos.length > 0 && (
                                    <div
                                        style={{
                                            marginTop: 10,
                                            fontSize: "0.85rem",
                                            fontWeight: 700,
                                            color: totalPorcentajeCC > 100 ? "#a33" : "var(--text-muted)",
                                        }}
                                    >
                                        Total asignado: {totalPorcentajeCC}%
                                    </div>
                                )}
                                {errors.centros_costos && (
                                    <div style={{ ...S.err, marginTop: 6 }}>
                                        {errors.centros_costos}
                                    </div>
                                )}
                            </div>

                            <div style={{ ...S.sectionHeader, marginTop: 32 }}>
                                ANEXOS Y AUXILIOS
                            </div>
                            <div style={{ marginTop: 12 }}>
                                {form.anexos.map((anexo, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            ...S.grid3,
                                            marginBottom: 10,
                                            alignItems: "end",
                                        }}
                                    >
                                        <Field
                                            label="Anexo / Auxilio"
                                            k={`a_${i}_name`}
                                            form={{
                                                [`a_${i}_name`]:
                                                    anexo.anexo_auxilio,
                                            }}
                                            onChange={() => (e) =>
                                                updateAnexo(
                                                    i,
                                                    "anexo_auxilio",
                                                    e.target.value,
                                                )
                                            }
                                            errors={{}}
                                            disabled={readOnly}
                                        />
                                        <Field
                                            label="Valor $"
                                            k={`a_${i}_val`}
                                            type="number"
                                            form={{
                                                [`a_${i}_val`]: anexo.valor,
                                            }}
                                            onChange={() => (e) =>
                                                updateAnexo(
                                                    i,
                                                    "valor",
                                                    e.target.value,
                                                )
                                            }
                                            errors={{}}
                                            disabled={readOnly}
                                        />
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: 10,
                                                alignItems: "end",
                                            }}
                                        >
                                            <Field
                                                label="Fecha Entrega/Firma"
                                                k={`a_${i}_date`}
                                                type="date"
                                                form={{
                                                    [`a_${i}_date`]: dateOnly(
                                                        anexo.fecha_entrega_firma,
                                                    ),
                                                }}
                                                onChange={() => (e) =>
                                                    updateAnexo(
                                                        i,
                                                        "fecha_entrega_firma",
                                                        e.target.value,
                                                    )
                                                }
                                                errors={{}}
                                                disabled={readOnly}
                                            />
                                            {!readOnly && (
                                                <button
                                                    style={{
                                                        ...S.actionBtn(
                                                            "#fce8e8",
                                                            "#a33",
                                                        ),
                                                        height: 38,
                                                    }}
                                                    onClick={() =>
                                                        removeAnexo(i)
                                                    }
                                                >
                                                    <IconTrash size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {!readOnly && (
                                    <button
                                        style={{
                                            ...S.btnSecondary,
                                            marginTop: 8,
                                            padding: "6px 12px",
                                            fontSize: "0.8rem",
                                        }}
                                        onClick={addAnexo}
                                    >
                                        + Agregar Anexo/Auxilio
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div style={S.modalFooter}>
                    {readOnly ? (
                        <button style={S.btnSecondary} onClick={onClose}>
                            Cerrar
                        </button>
                    ) : (
                        <>
                            <button
                                style={S.btnSecondary}
                                onClick={onClose}
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button
                                style={{
                                    ...S.btnPrimary,
                                    opacity: saving ? 0.6 : 1,
                                }}
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? "Guardando…" : "Guardar"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ContratosCrud() {
    const qc = useQueryClient();
    const [contratos, setContratos] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [filtroEstado, setFiltroEstado] = useState("Todos");
    const [filtroSede, setFiltroSede] = useState("Todas");
    const [filtroTipoContrato, setFiltroTipoContrato] = useState("Todos");
    const [filtroVinc, setFiltroVinc] = useState("Todos");
    const [filtroCargo, setFiltroCargo] = useState("Todos");
    const [filtroArl, setFiltroArl] = useState("Todas");
    const [filtroCaja, setFiltroCaja] = useState("Todas");
    const [filtroEmpresa, setFiltroEmpresa] = useState("Todas");
    const [filtroFondoPensiones, setFiltroFondoPensiones] = useState("Todos");
    const [catalogs, setCatalogs] = useState({
        cargos: [],
        sedes: [],
        eps: [],
        arls: [],
        cajas: [],
        bancos: [],
        pensiones: [],
        tipos_vinculacion: [],
        regionales: [],
    });
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewTarget, setViewTarget] = useState(null);
    const [toast, setToast] = useState(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [pagina, setPagina] = useState(1);

    const { data: _qContratos } = useQuery({
        queryKey: ["contratos"],
        queryFn: () => api.get("/contratos").then((r) => r.data),
    });
    const { data: _qEmpleados } = useQuery({
        queryKey: ["empleados"],
        queryFn: () => api.get("/empleados").then((r) => r.data),
    });
    const { data: _qCatalogos } = useQuery({
        queryKey: ["catalogos"],
        queryFn: () => api.get("/catalogos").then((r) => r.data),
    });
    const { data: _qCandidatosContrato } = useQuery({
        queryKey: ["candidatos-contrato"],
        queryFn: () =>
            api.get("/respuestas-ingresos/datos-contrato").then((r) => r.data),
    });
    const { data: _qSeleccionCatalogos } = useQuery({
        queryKey: ["seleccion-catalogos"],
        queryFn: () => api.get("/seleccion/catalogos").then((r) => r.data),
        staleTime: 10 * 60 * 1000,
    });
    const { data: _qCentrosCosto } = useQuery({
        queryKey: ["centros-costo-catalogo"],
        queryFn: () => api.get("/centros-costo-catalogo").then((r) => r.data),
        staleTime: 10 * 60 * 1000,
    });
    const { data: _qEmpresas } = useQuery({
        queryKey: ["empresas"],
        queryFn: () => api.get("/empresas").then((r) => r.data),
        staleTime: 10 * 60 * 1000,
    });

    const [candidatosContrato, setCandidatosContrato] = useState([]);
    const [proyectoOpts, setProyectoOpts] = useState([]);
    const [empleadorOpts, setEmpleadorOpts] = useState([]);
    const [empresasOpts, setEmpresasOpts] = useState([]);
    const [centrosCostoCatalogo, setCentrosCostoCatalogo] = useState([]);

    useEffect(() => {
        if (_qContratos) {
            setContratos(_qContratos);
            setLoading(false);
        }
    }, [_qContratos]);
    useEffect(() => {
        if (_qEmpleados) setEmpleados(_qEmpleados);
    }, [_qEmpleados]);
    useEffect(() => {
        if (_qCatalogos) setCatalogs(_qCatalogos);
    }, [_qCatalogos]);
    useEffect(() => {
        if (_qCandidatosContrato) setCandidatosContrato(_qCandidatosContrato);
    }, [_qCandidatosContrato]);
    useEffect(() => {
        if (_qSeleccionCatalogos?.proyectos)
            setProyectoOpts(_qSeleccionCatalogos.proyectos.map((p) => p.label));
        if (_qSeleccionCatalogos?.empleadores)
            setEmpleadorOpts(_qSeleccionCatalogos.empleadores.map((e) => e.nombre));
    }, [_qSeleccionCatalogos]);
    useEffect(() => {
        if (_qCentrosCosto) setCentrosCostoCatalogo(_qCentrosCosto);
    }, [_qCentrosCosto]);
    useEffect(() => {
        if (_qEmpresas) setEmpresasOpts(_qEmpresas.map((e) => e.nombre));
    }, [_qEmpresas]);

    useEffect(() => {
        setPagina(1);
    }, [
        search,
        filtroEstado,
        filtroSede,
        filtroTipoContrato,
        filtroVinc,
        filtroCargo,
        filtroArl,
        filtroCaja,
        filtroEmpresa,
        filtroFondoPensiones,
    ]);

    useEffect(() => {
        const anyOpen = modalOpen || viewOpen || filterOpen;
        if (anyOpen) {
            document.documentElement.style.overflowY = "hidden";
            document.body.style.overflowY = "hidden";
        } else {
            document.documentElement.style.overflowY = "";
            document.body.style.overflowY = "";
        }
        return () => {
            document.documentElement.style.overflowY = "";
            document.body.style.overflowY = "";
        };
    }, [modalOpen, viewOpen, filterOpen]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const filtered = useMemo(
        () =>
            contratos.filter((c) => {
                const q = debouncedSearch.toLowerCase();
                const empName =
                    `${c.empleado?.apellidos ?? ""} ${c.empleado?.nombres ?? ""}`.toLowerCase();
                const matchQ =
                    empName.includes(q) ||
                    (c.empleado?.cedula ?? "").includes(q) ||
                    (c.cargo ?? "").toLowerCase().includes(q);
                const matchE =
                    filtroEstado === "Todos" ||
                    c.estado_contrato === filtroEstado;
                const matchS = filtroSede === "Todas" || c.sede === filtroSede;
                const matchTC =
            
                    filtroTipoContrato === "Todos" ||
                    c.tipo_contrato === filtroTipoContrato;
                const matchV =
                    filtroVinc === "Todos" || c.tipo_vinculacion === filtroVinc;
                const matchC =
                    filtroCargo === "Todos" || c.cargo === filtroCargo;
                const matchArl = filtroArl === "Todas" || c.arl === filtroArl;
                const matchCaja =
                    filtroCaja === "Todas" ||
                    c.caja_compensacion === filtroCaja;
                const matchEmp =
                    filtroEmpresa === "Todas" || c.empresa === filtroEmpresa;
                const matchFP =
                    filtroFondoPensiones === "Todos" ||
                    c.fondo_pensiones === filtroFondoPensiones;
                return (
                    matchQ &&
                    matchE &&
                    matchS &&
                    matchTC &&
                    matchV &&
                    matchC &&
                    matchCaja &&
                    matchArl &&
                    matchEmp &&
                    matchFP
                );
            }),
        [
            contratos,
            debouncedSearch,
            filtroEstado,
            filtroSede,
            filtroTipoContrato,
            filtroVinc,
            filtroCargo,
            filtroArl,
            filtroCaja,
            filtroEmpresa,
            filtroFondoPensiones,
        ],
    );

    const paginated = useMemo(
        () => filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
        [filtered, pagina],
    );
    const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);

    const stats = useMemo(
        () => ({
            total: contratos.length,
            activos: contratos.filter((c) => c.estado_contrato === "Activo")
                .length,
            inactivos: contratos.filter((c) => c.estado_contrato === "Inactivo")
                .length,
            cancelados: contratos.filter(
                (c) => c.estado_contrato === "Cancelado",
            ).length,
            translados: contratos.filter(
                (c) => c.estado_contrato === "Translado",
            ).length,
        }),
        [contratos],
    );

    const handleSave = async (form) => {
        try {
            if (editTarget) {
                const { data } = await api.put(
                    `/contratos/${editTarget.id}`,
                    form,
                );
                setContratos((prev) =>
                    prev.map((c) => (c.id === editTarget.id ? data : c)),
                );
                qc.invalidateQueries({ queryKey: ["contratos"] });
                qc.invalidateQueries({ queryKey: ["pedidos-automaticos"] });
                showToast("Contrato actualizado.");
            } else {
                const { data } = await api.post("/contratos", form);
                setContratos((prev) => [data, ...prev]);
                qc.invalidateQueries({ queryKey: ["contratos"] });
                qc.invalidateQueries({ queryKey: ["pedidos-automaticos"] });
                showToast(
                    data.pedido_automatico
                        ? `Contrato creado. Pedido automático ${data.pedido_automatico.codigo} generado (${data.pedido_automatico.estado}).`
                        : "Contrato creado. No se generó pedido automático (proyecto/cargo sin regla de dotación).",
                );
            }
            setModalOpen(false);
        } catch (err) {
            showToast("Error al guardar el contrato.");
        }
    };

    const clearFilters = () => {
        setSearch("");
        setFiltroEstado("Todos");
        setFiltroSede("Todas");
        setFiltroTipoContrato("Todos");
        setFiltroVinc("Todos");
        setFiltroCargo("Todos");
        setFiltroArl("Todas");
        setFiltroCaja("Todas");
        setFiltroEmpresa("Todas");
        setFiltroFondoPensiones("Todos");
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Total Contratos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#27ae60" }}>
                        {stats.activos}
                    </div>
                    <div className="stat-label">Activos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#f39c12" }}>
                        {stats.inactivos}
                    </div>
                    <div className="stat-label">Inactivos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#e74c3c" }}>
                        {stats.cancelados}
                    </div>
                    <div className="stat-label">Cancelados</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#3498db" }}>
                        {stats.translados}
                    </div>
                    <div className="stat-label">Translados</div>
                </div>
            </div>

            <div style={S.toolbar}>
                <div style={S.filters}>
                    <div style={S.searchWrap}>
                        <span style={S.searchIcon}>
                            <IconSearch size={15} />
                        </span>
                        <input
                            style={S.searchInput}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        style={S.filterBtn}
                        onClick={() => setFilterOpen(true)}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        Filtros
                    </button>
                    <PresetFiltersDropdown
                        presets={[
                            {
                                label: "Contratos activos",
                                apply: () => {
                                    clearFilters();
                                    setFiltroEstado("Activo");
                                },
                            },
                            {
                                label: "Contratos inactivos",
                                apply: () => {
                                    clearFilters();
                                    setFiltroEstado("Inactivo");
                                },
                            },
                            {
                                label: "Contratos cancelados",
                                apply: () => {
                                    clearFilters();
                                    setFiltroEstado("Cancelado");
                                },
                            },
                            {
                                label: "Contratos en translado",
                                apply: () => {
                                    clearFilters();
                                    setFiltroEstado("Translado");
                                },
                            },
                            {
                                label: "Término fijo",
                                apply: () => {
                                    clearFilters();
                                    setFiltroTipoContrato("Término Fijo");
                                },
                            },
                            {
                                label: "Prestación de servicios",
                                apply: () => {
                                    clearFilters();
                                    setFiltroTipoContrato(
                                        "Prestación de Servicios",
                                    );
                                },
                            },
                            {
                                label: "Limpiar filtros",
                                apply: () => clearFilters(),
                                clear: true,
                            },
                        ]}
                    />
                </div>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setEditTarget(null);
                        setModalOpen(true);
                    }}
                >
                    + Nuevo contrato
                </button>
            </div>

            <div style={S.tableWrap}>
                {loading ? (
                    <div style={S.empty}>
                        <IconLoading size={32} />
                        <p>Cargando contratos…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p>No se encontraron contratos.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Cargo</th>
                                <th>Sede</th>
                                <th>Tipo</th>
                                <th>Ingreso</th>
                                <th>Salario</th>
                                <th>Estado</th>
                                <th style={{ textAlign: "center" }}>
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((c) => (
                                <tr key={c.id}>
                                    <td>
                                        <div style={S.avatarCell}>
                                            <div
                                                style={{
                                                    ...S.avatar,
                                                    overflow: "hidden",
                                                    position: "relative",
                                                }}
                                            >
                                                {(c.empleado?.nombres || "?")
                                                    .charAt(0)
                                                    .toUpperCase()}
                                                {c.empleado?.fotografia && (
                                                    <img
                                                        src={`/storage/${c.empleado.fotografia}`}
                                                        alt=""
                                                        style={{
                                                            position:
                                                                "absolute",
                                                            inset: 0,
                                                            width: "100%",
                                                            height: "100%",
                                                            objectFit: "cover",
                                                            borderRadius: "50%",
                                                        }}
                                                        onError={(e) => {
                                                            e.currentTarget.style.display =
                                                                "none";
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <span style={{ fontWeight: 700 }}>
                                                {c.empleado?.nombres}{" "}
                                                {c.empleado?.apellidos}
                                            </span>
                                        </div>
                                    </td>
                                    <td>{c.cargo}</td>
                                    <td>
                                        <span
                                            style={S.badge(
                                                "#e8f8f5",
                                                "var(--primary-dark)",
                                            )}
                                        >
                                            {c.sede}
                                        </span>
                                    </td>
                                    <td>{c.tipo_contrato}</td>
                                    <td>{dateOnly(c.fecha_ingreso)}</td>
                                    <td>
                                        ${Number(c.salario).toLocaleString()}
                                    </td>
                                    <td>
                                        <span
                                            style={S.badge(
                                                c.estado_contrato === "Activo"
                                                    ? "#e0f7f4"
                                                    : c.estado_contrato ===
                                                        "Translado"
                                                      ? "#e8f0ff"
                                                      : c.estado_contrato ===
                                                          "Inactivo"
                                                        ? "#fff3e0"
                                                        : "#fce8e8",
                                                c.estado_contrato === "Activo"
                                                    ? "#0d6e5a"
                                                    : c.estado_contrato ===
                                                        "Translado"
                                                      ? "#1a4fa8"
                                                      : c.estado_contrato ===
                                                          "Inactivo"
                                                        ? "#e67e22"
                                                        : "#a33",
                                            )}
                                        >
                                            {c.estado_contrato}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={S.actions}>
                                            <button
                                                style={S.actionBtn(
                                                    "#e8f0ff",
                                                    "#1a4fa8",
                                                )}
                                                title="Ver"
                                                onClick={() => {
                                                    setViewTarget(c);
                                                    setViewOpen(true);
                                                }}
                                            >
                                                <IconEye />
                                            </button>
                                            <button
                                                style={S.actionBtn(
                                                    "#e8f8f5",
                                                    "var(--primary-dark)",
                                                )}
                                                title="Editar"
                                                onClick={() => {
                                                    setEditTarget(c);
                                                    setModalOpen(true);
                                                }}
                                            >
                                                <IconEdit />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && filtered.length > 0 && (
                <div style={S.paginationBar}>
                    <span style={S.paginationInfo}>
                        Mostrando {(pagina - 1) * POR_PAGINA + 1}–
                        {Math.min(pagina * POR_PAGINA, filtered.length)} de{" "}
                        {filtered.length} contratos
                    </span>
                    <div style={S.paginationBtns}>
                        <button
                            style={S.pageBtn(pagina === 1, false)}
                            disabled={pagina === 1}
                            onClick={() => setPagina((p) => p - 1)}
                        >
                            ‹
                        </button>
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                            .filter(
                                (p) =>
                                    p === 1 ||
                                    p === totalPaginas ||
                                    Math.abs(p - pagina) <= 1,
                            )
                            .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1)
                                    acc.push("…");
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((item, idx) =>
                                item === "…" ? (
                                    <span
                                        key={`e${idx}`}
                                        style={{
                                            padding: "0 4px",
                                            color: "var(--text-muted)",
                                            fontWeight: 700,
                                        }}
                                    >
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={item}
                                        style={S.pageBtn(
                                            false,
                                            item === pagina,
                                        )}
                                        onClick={() => setPagina(item)}
                                    >
                                        {item}
                                    </button>
                                ),
                            )}
                        <button
                            style={S.pageBtn(pagina === totalPaginas, false)}
                            disabled={pagina === totalPaginas}
                            onClick={() => setPagina((p) => p + 1)}
                        >
                            ›
                        </button>
                    </div>
                </div>
            )}

            {filterOpen && (
                <div style={S.overlay} onClick={() => setFilterOpen(false)}>
                    <div
                        style={{
                            ...S.modal,
                            maxWidth: 860,
                            maxHeight: "none",
                            overflow: "visible",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={S.modalHeaderGreen}>
                            <span style={S.modalTitleWhite}>
                                Filtros de Búsqueda
                            </span>
                            <button
                                style={S.closeBtnWhite}
                                onClick={() => setFilterOpen(false)}
                            >
                                <IconClose size={14} />
                            </button>
                        </div>
                        <div
                            style={{
                                ...S.modalBody,
                                overflowY: "visible",
                                overflowX: "visible",
                            }}
                        >
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: "16px 24px",
                                }}
                            >
                                <div style={S.formGroup}>
                                    <label style={S.label}>Estado</label>
                                    <FilterSelect
                                        value={filtroEstado}
                                        onChange={setFiltroEstado}
                                        defaultValue="Todos"
                                        options={ESTADOS_CONTRATO.map((s) => ({
                                            label: s,
                                            value: s,
                                        }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>
                                        Tipo de Contrato
                                    </label>
                                    <FilterSelect
                                        value={filtroTipoContrato}
                                        onChange={setFiltroTipoContrato}
                                        defaultValue="Todos"
                                        options={TIPOS_CONTRATO.map((s) => ({
                                            label: s,
                                            value: s,
                                        }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>
                                        Tipo de Vinculación
                                    </label>
                                    <FilterSelect
                                        value={filtroVinc}
                                        onChange={setFiltroVinc}
                                        defaultValue="Todos"
                                        options={catalogs.tipos_vinculacion.map(
                                            (s) => ({ label: s, value: s }),
                                        )}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Sede</label>
                                    <FilterSelect
                                        value={filtroSede}
                                        onChange={setFiltroSede}
                                        defaultValue="Todas"
                                        options={catalogs.sedes.map((s) => ({
                                            label: s,
                                            value: s,
                                        }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Cargo</label>
                                    <FilterSelect
                                        value={filtroCargo}
                                        onChange={setFiltroCargo}
                                        defaultValue="Todos"
                                        options={catalogs.cargos.map((s) => ({
                                            label: s,
                                            value: s,
                                        }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>ARL</label>
                                    <FilterSelect
                                        value={filtroArl}
                                        onChange={setFiltroArl}
                                        defaultValue="Todas"
                                        options={catalogs.arls.map((s) => ({
                                            label: s,
                                            value: s,
                                        }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>
                                        Caja de Compensación
                                    </label>
                                    <FilterSelect
                                        value={filtroCaja}
                                        onChange={setFiltroCaja}
                                        defaultValue="Todas"
                                        options={catalogs.cajas.map((s) => ({
                                            label: s,
                                            value: s,
                                        }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Empresa</label>
                                    <FilterSelect
                                        value={filtroEmpresa}
                                        onChange={setFiltroEmpresa}
                                        defaultValue="Todas"
                                        options={empresasOpts.map((s) => ({
                                            label: s,
                                            value: s,
                                        }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>
                                        Fondo de Pensiones
                                    </label>
                                    <FilterSelect
                                        value={filtroFondoPensiones}
                                        onChange={setFiltroFondoPensiones}
                                        defaultValue="Todos"
                                        options={catalogs.pensiones.map((s) => ({
                                            label: s,
                                            value: s,
                                        }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div
                            style={{
                                ...S.modalFooter,
                                justifyContent: "space-between",
                            }}
                        >
                            <button
                                style={S.btnSecondary}
                                onClick={clearFilters}
                            >
                                Limpiar filtros
                            </button>
                            <div style={{ display: "flex", gap: 12 }}>
                                <button
                                    style={S.btnSecondary}
                                    onClick={() => setFilterOpen(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    style={S.btnPrimary}
                                    onClick={() => setFilterOpen(false)}
                                >
                                    Buscar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                initial={editTarget || EMPTY_FORM}
                title={editTarget ? "Editar Contrato" : "Nuevo Contrato"}
                empleados={empleados}
                catalogs={catalogs}
                candidatosContrato={candidatosContrato}
                proyectoOpts={proyectoOpts}
                empleadorOpts={empleadorOpts}
                empresasOpts={empresasOpts}
                centrosCostoCatalogo={centrosCostoCatalogo}
            />

            <Modal
                open={viewOpen}
                onClose={() => setViewOpen(false)}
                initial={viewTarget || EMPTY_FORM}
                title="Ver Contrato"
                empleados={empleados}
                catalogs={catalogs}
                proyectoOpts={proyectoOpts}
                empleadorOpts={empleadorOpts}
                empresasOpts={empresasOpts}
                centrosCostoCatalogo={centrosCostoCatalogo}
                readOnly
            />
        </div>
    );
}

const S = {
    toolbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
        flexWrap: "wrap",
    },
    filters: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        flex: 1,
    },
    searchWrap: { position: "relative", flex: 1, minWidth: 200, maxWidth: 380 },
    searchIcon: {
        position: "absolute",
        left: 11,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        color: "var(--text-muted)",
        pointerEvents: "none",
    },
    searchInput: {
        width: "100%",
        padding: "9px 12px 9px 34px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
        fontFamily: "Nunito,sans-serif",
        background: "var(--white)",
        color: "var(--text)",
        outline: "none",
    },
    filterBtn: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px",
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text)",
        fontSize: "0.9rem",
        fontWeight: 700,
        fontFamily: "Nunito,sans-serif",
        cursor: "pointer",
    },
    tableWrap: {
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        overflowX: "auto",
    },
    avatarCell: { display: "flex", alignItems: "center", gap: 10 },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "var(--primary)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: "0.95rem",
        flexShrink: 0,
    },
    badge: (bg, color) => ({
        background: bg,
        color,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: "0.78rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
    }),
    actions: { display: "flex", gap: 6, justifyContent: "center" },
    actionBtn: (bg, color) => ({
        background: bg,
        border: "none",
        borderRadius: 6,
        padding: "5px 8px",
        cursor: "pointer",
        fontSize: "0.85rem",
        color,
        transition: "opacity 0.15s",
    }),
    empty: {
        padding: "60px 20px",
        textAlign: "center",
        color: "var(--text-muted)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
    },
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(26,58,53,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5000,
        padding: 20,
    },
    modal: {
        background: "var(--white)",
        borderRadius: "var(--radius)",
        boxShadow: "0 16px 60px rgba(26,155,140,0.22)",
        width: "100%",
        maxWidth: 720,
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
    },
    modalHeaderGreen: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "22px 28px",
        background: "var(--primary)",
        borderTopLeftRadius: "var(--radius)",
        borderTopRightRadius: "var(--radius)",
        flexShrink: 0,
    },
    modalTitleWhite: {
        fontFamily: "'Poppins',sans-serif",
        fontWeight: 700,
        fontSize: "1.2rem",
        color: "#fff",
    },
    closeBtnWhite: {
        background: "none",
        border: "1.5px solid rgba(255,255,255,0.6)",
        borderRadius: "50%",
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.9rem",
        cursor: "pointer",
        color: "#fff",
    },
    modalBody: {
        padding: "22px 28px 28px",
        overflowY: "auto",
        overflowX: "hidden",
        flex: 1,
    },
    modalFooter: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
        padding: "16px 28px",
        borderTop: "1.5px solid var(--border)",
        flexShrink: 0,
    },
    tabBar: {
        display: "flex",
        padding: "0 28px",
        gap: 0,
        overflowX: "auto",
        flexWrap: "nowrap",
        flexShrink: 0,
        borderBottom: "2px solid var(--border)",
    },
    tab: {
        padding: "11px 20px",
        background: "transparent",
        border: "none",
        borderBottom: "2px solid transparent",
        marginBottom: -2,
        fontSize: "0.88rem",
        fontWeight: 700,
        fontFamily: "Nunito,sans-serif",
        color: "var(--text-muted)",
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    tabActive: {
        padding: "11px 20px",
        background: "transparent",
        border: "none",
        borderBottom: "2px solid var(--primary)",
        marginBottom: -2,
        fontSize: "0.88rem",
        fontWeight: 700,
        fontFamily: "Nunito,sans-serif",
        color: "var(--primary)",
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    grid4: {
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 14,
    },
    grid3: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 14,
    },
    grid2: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 14,
    },
    sectionHeader: {
        marginTop: 24,
        marginBottom: 4,
        padding: "9px 14px",
        background: "var(--primary)",
        color: "#fff",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.82rem",
        fontWeight: 800,
        letterSpacing: "0.05em",
        textAlign: "center",
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: 5,
        minWidth: 0,
    },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 10px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
        fontFamily: "Nunito,sans-serif",
        color: "var(--text)",
        background: "var(--white)",
        outline: "none",
    },
    inputErr: { borderColor: "#e74c3c" },
    err: { color: "#e74c3c", fontSize: "0.75rem", marginTop: 2 },
    btnPrimary: {
        padding: "10px 24px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
    },
    btnSecondary: {
        padding: "10px 20px",
        background: "var(--bg)",
        color: "var(--text)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
    },
    paginationBar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 4px",
        flexWrap: "wrap",
        gap: 10,
    },
    paginationInfo: {
        fontSize: "0.84rem",
        color: "var(--text-muted)",
        fontWeight: 600,
    },
    paginationBtns: {
        display: "flex",
        alignItems: "center",
        gap: 4,
    },
    pageBtn: (disabled, active) => ({
        minWidth: 32,
        height: 32,
        padding: "0 8px",
        border: active ? "none" : "1.5px solid var(--border)",
        borderRadius: 6,
        background: active
            ? "var(--primary)"
            : disabled
              ? "var(--bg)"
              : "var(--white)",
        color: active ? "#fff" : disabled ? "var(--text-muted)" : "var(--text)",
        fontWeight: 700,
        fontSize: "0.88rem",
        cursor: disabled ? "default" : "pointer",
        fontFamily: "Nunito,sans-serif",
        opacity: disabled ? 0.5 : 1,
    }),
    toast: {
        position: "fixed",
        bottom: 28,
        right: 28,
        background: "var(--primary)",
        color: "#fff",
        borderRadius: "var(--radius-sm)",
        padding: "13px 22px",
        fontWeight: 700,
        fontSize: "0.92rem",
        zIndex: 9999,
        boxShadow: "0 8px 28px rgba(26,155,140,0.35)",
    },
};
