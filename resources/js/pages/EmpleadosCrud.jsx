import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import { SearchableSelect, PresetFiltersDropdown } from "../components/SearchableSelect";
import api from "../api/axios";
import {
    IconSearch,
    IconEye,
    IconEdit,

    IconClose,
    IconEmptySearch,
    IconLoading,
} from "../components/Icons";

/* ─── Catálogos ──────────────────────────────────────────────────────── */
const SEDES = [
    "Bogotá",
    "Medellín",
    "Cali",
    "Bucaramanga",
    "Barranquilla",
    "Pereira",
    "Manizales",
    "Otra",
];
const GENEROS = ["Masculino", "Femenino", "No binario", "Prefiero no decir"];
const EST_CIVIL = [
    "Soltero/a",
    "Casado/a",
    "Unión libre",
    "Divorciado/a",
    "Viudo/a",
    "Por definir",
];
const ESCOLARIDAD = [
    "Sin estudios",
    "Primaria",
    "Bachillerato",
    "Técnico",
    "Tecnólogo",
    "Universitario",
    "Especialización",
    "Maestría",
    "Doctorado",
];
const ESTRATOS = ["PD", "1", "2", "3", "4", "5", "6"];
const RH_LIST = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const EPS_LIST = [
    "SÁNITAS",
    "COMPENSAR",
    "FAMISANAR",
    "NUEVA EPS",
    "SALUD TOTAL",
    "COOMEVA",
    "MEDIMÁS",
    "COOSALUD",
    "ASMET SALUD",
    "OTRA",
];
const ARL_LIST = [
    "SURA",
    "COLMENA",
    "POSITIVA",
    "BOLÍVAR",
    "LIBERTY",
    "EQUIDAD",
    "AXA COLPATRIA",
    "OTRA",
];
const PENSIONES = [
    "PORVENIR",
    "PROTECCIÓN",
    "COLFONDOS",
    "OLD MUTUAL",
    "COLPENSIONES",
    "OTRO",
];
const CAJAS = [
    "COMPENSAR",
    "COLSUBSIDIO",
    "CAFAM",
    "COMFENALCO",
    "COMFAMILIAR",
    "OTRA",
];
const ESTADOS_EMP = [
    "Activo",
    "Inactivo",
    "Retirado",
    "Vacaciones",
    "Incapacitado",
    "Suspendido",
];
const CARGOS = [
    "COORDINADOR/A ADMINISTRATIVO/A",
    "AUXILIAR DE ALMACÉN",
    "CONTADOR/A",
    "CONDUCTOR/A",
    "ASISTENTE RRHH",
    "TÉCNICO DE MANTENIMIENTO",
    "GERENTE",
    "SECRETARIO/A",
    "ASESOR COMERCIAL",
    "VENDEDOR/A",
    "SUPERVISOR/A",
    "AUXILIAR DE SISTEMAS",
    "ANALISTA ADMINISTRATIVO",
    "OTRO",
];
const TIPOS_FUNC = [
    "ADMINISTRATIVO",
    "TÉCNICO",
    "VENDEDOR",
    "SUPERVISOR",
    "GERENTE",
    "APRENDIZ",
    "DIRECTO",
    "OTRO",
];
const TIPOS_VINC = [
    "Empleado directo",
    "Contratista",
    "Aprendiz SENA",
    "Prestación de servicios",
    "Temporal",
    "Otro",
];
const POR_PAGINA = 10;
const TIPOS_CUENTA = ["Ahorros", "Corriente"];
const BANCOS = [
    "Bancolombia",
    "Davivienda",
    "BBVA",
    "Banco de Bogotá",
    "Banco Popular",
    "Banco de Occidente",
    "Banco Agrario",
    "Citibank",
    "Banco Caja Social",
    "Finandina",
    "Bancamía",
    "Nequi",
    "Daviplata",
    "Otro",
];

/* ─── Conversión API ↔ formulario ────────────────────────────────────── */
// La API devuelve fechas como "1995-06-14T00:00:00.000000Z"; el <input type="date"> necesita "yyyy-MM-dd"
const dateOnly = (v) => (v ? String(v).split("T")[0] : "");

// Normaliza un valor para que coincida con las opciones del <select> (ignora mayúsculas, tildes y sufijo /a)
const matchOpt = (val, opts) => {
    if (!val || !opts?.length) return null;
    const norm = (s) =>
        String(s).toLowerCase()
            .normalize("NFD").replace(/[̀-ͯ]/g, "")
            .replace(/\/[a-z]$/, "").trim();
    const nVal = norm(val);
    return opts.find((o) => norm(o) === nVal) ?? null;
};

const toForm = (emp) => ({
    ...EMPTY_FORM,
    ...emp,
    tiene_cert_alturas: emp.tiene_cert_alturas ? "Sí" : "No",
    empresa_id: emp.empresa_id ?? "",
    fecha_nacimiento:     dateOnly(emp.fecha_nacimiento),
    fecha_expedicion:     dateOnly(emp.fecha_expedicion),
    licencia_carro_vence: dateOnly(emp.licencia_carro_vence),
    licencia_moto_vence:  dateOnly(emp.licencia_moto_vence),
    cert_alturas_vence:   dateOnly(emp.cert_alturas_vence),
    ingresos:      emp.ingresos ?? "",
    numero_hijos:  emp.numero_hijos != null ? String(emp.numero_hijos) : "",
    profesion:     emp.profesion ?? "",
    talla_camisa:  emp.talla_camisa ?? "",
    talla_pantalon:emp.talla_pantalon ?? "",
    talla_zapatos: emp.talla_zapatos ?? "",
    // Normalizar campos de select para que coincidan exactamente con las opciones
    genero:            matchOpt(emp.genero,           GENEROS)    ?? emp.genero ?? "",
    estado_civil:      matchOpt(emp.estado_civil,     EST_CIVIL)  ?? emp.estado_civil ?? "",
    nivel_escolaridad: matchOpt(emp.nivel_escolaridad, ESCOLARIDAD) ?? emp.nivel_escolaridad ?? "",
    estrato:           matchOpt(emp.estrato,          ESTRATOS)   ?? emp.estrato ?? "PD",
});

const toApi = (form) => ({
    ...form,
    tiene_cert_alturas: form.tiene_cert_alturas === "Sí",
    empresa_id: form.empresa_id !== "" ? Number(form.empresa_id) : null,
    numero_hijos: form.numero_hijos !== "" ? Number(form.numero_hijos) : null,
    ingresos: form.ingresos !== "" ? Number(form.ingresos) : null,
});

const EMPTY_FORM = {
    cedula: "",
    fecha_expedicion: "",
    apellidos: "",
    nombres: "",
    sede: "",
    fecha_nacimiento: "",
    lugar_nacimiento: "",
    raza: "",
    genero: "",
    estado_civil: "",
    nivel_escolaridad: "",
    profesion: "",
    email: "",
    direccion_residencia: "",
    movil: "",
    estrato: "PD",
    barrio: "",
    numero_hijos: "",
    ingresos: "",
    observaciones_medicas: "",
    alergias: "",
    talla_camisa: "",
    talla_pantalon: "",
    talla_zapatos: "",
    rh: "",
    eps: "",
    arl: "",
    fondo_pensiones: "",
    caja_compensacion: "",
    licencia_carro: "",
    licencia_carro_vence: "",
    licencia_moto: "",
    licencia_moto_vence: "",
    tiene_cert_alturas: "No",
    cert_alturas_vence: "",
    estado_empleado: "Activo",
    codigo_directv: "",
    empresa_id: "",
    comentarios: "",
    contacto_emergencia_nombre: "",
    contacto_emergencia_telefono: "",
    contacto_emergencia_parentesco: "",
    cargo: "",
    tipo_funcionario: "",
    tipo_vinculacion: "",
    cuenta_bancaria: "",
    tipo_cuenta: "",
    banco: "",
};

/* ─── Campo reutilizable dentro del modal ────────────────────────────── */
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
    const handleChange = uppercase
        ? (key) => (e) =>
              onChange(key)({
                  ...e,
                  target: { ...e.target, value: e.target.value.toUpperCase() },
              })
        : onChange;
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

/* ─── Selector de contratado (espejo de CandidatoSelector en Contratos) ── */
function ContratadoSelector({ onSelect }) {
    const [query, setQuery]       = useState("");
    const [open, setOpen]         = useState(false);
    const [selected, setSelected] = useState(null);
    const [results, setResults]   = useState([]);
    const [loading, setLoading]   = useState(false);
    const wrapRef                 = useRef(null);
    const hasFocused              = useRef(false);
    const debouncedQ              = useDebounce(query, 350);

    useEffect(() => {
        const h = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const loadInitial = () => {
        setLoading(true);
        api.get("/empleados/candidatos-listos")
            .then((r) => { setResults(r.data); setOpen(true); })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    const handleFocus = () => {
        setOpen(true);
        if (!hasFocused.current) {
            hasFocused.current = true;
            loadInitial();
        }
    };

    useEffect(() => {
        if (!hasFocused.current) return;
        if (!debouncedQ) { loadInitial(); return; }
        setLoading(true);
        api.get("/empleados/candidatos-listos", { params: { search: debouncedQ } })
            .then((r) => { setResults(r.data); setOpen(true); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [debouncedQ]);

    const handlePick = (c) => {
        setSelected(c);
        setQuery("");
        setOpen(false);
        setResults([]);
        hasFocused.current = false;
        onSelect(c);
    };

    return (
        <div ref={wrapRef} style={{ width: "100%" }}>
            {selected ? (
                <div style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: "#e8f8f5", border: "2px solid var(--primary)",
                    borderRadius: 10, padding: "14px 18px",
                }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: "50%",
                        background: "var(--primary)", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: "1.2rem", flexShrink: 0,
                        overflow: "hidden", position: "relative",
                    }}>
                        {(selected.nombres || "?").charAt(0).toUpperCase()}
                        {selected.fotografia && (
                            <img src={`/storage/${selected.fotografia}`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--primary-dark)", fontFamily: "'Poppins',sans-serif" }}>
                            {selected.nombres} {selected.apellidos}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "Nunito,sans-serif" }}>
                            CC: {selected.cedula}{selected.cargo ? ` · ${selected.cargo}` : ""}{selected.empresa_nombre ? ` · ${selected.empresa_nombre}` : ""}
                        </div>
                    </div>
                    <button
                        onClick={() => { setSelected(null); onSelect(null); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.1rem", padding: 4 }}
                        title="Cambiar selección"
                    >✕</button>
                </div>
            ) : (
                <div style={{ position: "relative" }}>
                    <input
                        style={{
                            ...S.input, fontSize: "1rem", padding: "12px 14px",
                            border: "2px solid var(--border)", borderRadius: 10,
                        }}
                        placeholder="Buscar por nombre o cédula…"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={handleFocus}
                        autoFocus
                    />
                    {loading && (
                        <div style={{ padding: "8px 14px", fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                            <IconLoading size={14} /> Buscando…
                        </div>
                    )}
                    {open && results.length > 0 && (
                        <div style={{
                            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                            background: "var(--white)", border: "1.5px solid var(--border)",
                            borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
                            zIndex: 3000, maxHeight: 280, overflowY: "auto",
                        }}>
                            {results.map((c) => (
                                <div
                                    key={c.user_id ?? c.cedula}
                                    onMouseDown={() => handlePick(c)}
                                    style={{
                                        padding: "10px 16px", cursor: "pointer",
                                        borderBottom: "1px solid var(--border)",
                                        display: "flex", alignItems: "center", gap: 12,
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "#f0f9f7"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "var(--white)"}
                                >
                                    <div style={{
                                        width: 34, height: 34, borderRadius: "50%",
                                        background: "var(--primary)", color: "#fff",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontWeight: 800, fontSize: "0.9rem", flexShrink: 0,
                                        overflow: "hidden", position: "relative",
                                    }}>
                                        {(c.nombres || "?").charAt(0).toUpperCase()}
                                        {c.fotografia && (
                                            <img src={`/storage/${c.fotografia}`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>
                                            {c.nombres} {c.apellidos}
                                        </div>
                                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                            CC {c.cedula}{c.cargo ? ` · ${c.cargo}` : ""}{c.empresa_nombre ? ` · ${c.empresa_nombre}` : ""}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {open && !loading && query && results.length === 0 && (
                        <div style={{
                            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                            background: "var(--white)", border: "1.5px solid var(--border)",
                            borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
                            zIndex: 3000, padding: "14px 16px",
                            color: "var(--text-muted)", fontSize: "0.88rem",
                        }}>
                            Sin resultados
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Modal ──────────────────────────────────────────────────────────── */
function Modal({
    open,
    onClose,
    onSave,
    initial,
    title,
    empresas,
    catalogs,
    readOnly = false,
    empleados = [],
    onSwitchToEdit,
}) {
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState({});
    const [activeTab, setActive] = useState("general");
    const [saving, setSaving] = useState(false);
    const [fotografiaFile, setFotografiaFile] = useState(null);
    const isCreate = !initial?.id && !readOnly;

    React.useEffect(() => {
        setForm(initial);
        setErrors({});
        setActive("general");
        setSaving(false);
        setFotografiaFile(null);
    }, [initial, open]);

    const handleSelectCand = (c) => {
        if (!c) return;
        // Si el usuario ya existe como empleado, cambiar a modo editar
        if (c.user_id && empleados.length > 0) {
            const existing = empleados.find((e) => e.id === c.user_id);
            if (existing && onSwitchToEdit) {
                onSwitchToEdit(existing);
                return;
            }
        }
        const v = (val, fallback) => (val != null && val !== "") ? val : fallback;
        setForm((f) => ({
            ...f,
            // Identificación
            cedula:           v(c.cedula,           f.cedula),
            nombres:          v(c.nombres,          f.nombres),
            apellidos:        v(c.apellidos,        f.apellidos),
            email:            v(c.email,            f.email),
            movil:            v(c.movil,            f.movil),
            fecha_expedicion: v(c.fecha_expedicion, f.fecha_expedicion),
            // Datos personales
            genero:                     v(matchOpt(c.genero, GENEROS),                            f.genero),
            fecha_nacimiento:           v(c.fecha_nacimiento,                                     f.fecha_nacimiento),
            lugar_nacimiento:           v(c.lugar_nacimiento,                                     f.lugar_nacimiento),
            estado_civil:               v(matchOpt(c.estado_civil, EST_CIVIL),                    f.estado_civil),
            nivel_escolaridad:          v(matchOpt(c.nivel_escolaridad, ESCOLARIDAD),             f.nivel_escolaridad),
            profesion:                  v(c.profesion,                                            f.profesion),
            direccion_residencia:       v(c.direccion_residencia,                                 f.direccion_residencia),
            estrato:                    v(matchOpt(c.estrato, ESTRATOS),                          f.estrato),
            barrio:                     v(c.barrio,                                               f.barrio),
            numero_hijos:               v(c.numero_hijos != null ? String(c.numero_hijos) : null, f.numero_hijos),
            rh:                         v(matchOpt(c.rh, catalogs.tipos_rh),                      f.rh),
            talla_camisa:               v(c.talla_camisa,                                         f.talla_camisa),
            talla_pantalon:             v(c.talla_pantalon,                                       f.talla_pantalon),
            talla_zapatos:              v(c.talla_zapatos,                                        f.talla_zapatos),
            // Seguridad social
            eps:               v(matchOpt(c.eps, catalogs.eps),                                   f.eps),
            arl:               v(matchOpt(c.arl, catalogs.arls),                                  f.arl),
            fondo_pensiones:   v(matchOpt(c.fondo_pensiones, catalogs.pensiones),                 f.fondo_pensiones),
            caja_compensacion: v(matchOpt(c.caja_compensacion, catalogs.cajas),                   f.caja_compensacion),
            // Datos laborales
            cargo:             v(matchOpt(c.cargo, catalogs.cargos),                              f.cargo),
            sede:              v(matchOpt(c.sede, catalogs.sedes),                                f.sede),
            tipo_vinculacion:  v(matchOpt(c.tipo_vinculacion, catalogs.tipos_vinculacion) ?? c.tipo_vinculacion, f.tipo_vinculacion),
            tipo_funcionario:  v(matchOpt(c.tipo_funcionario, catalogs.tipos_funcionario),        f.tipo_funcionario),
            empleador:         v(c.empleador,                                                     f.empleador),
            jefe_inmediato:    v(c.jefe_inmediato,                                                f.jefe_inmediato),
            empresa_id:        v(c.empresa_id,                                                    f.empresa_id),
            ingresos:          v(c.ingresos,                                                      f.ingresos),
            // Contacto de emergencia
            contacto_emergencia_nombre:      v(c.contacto_emergencia_nombre,      f.contacto_emergencia_nombre),
            contacto_emergencia_telefono:    v(c.contacto_emergencia_telefono,    f.contacto_emergencia_telefono),
            contacto_emergencia_parentesco:  v(c.contacto_emergencia_parentesco,  f.contacto_emergencia_parentesco),
        }));
    };

    const onChange = (k) => (e) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    const validate = () => {
        const e = {};
        if (!form.cedula?.trim()) e.cedula = "Requerido";
        if (!form.apellidos?.trim()) e.apellidos = "Requerido";
        if (!form.nombres?.trim()) e.nombres = "Requerido";
        if (!form.sede?.trim()) e.sede = "Requerido";
        if (!form.genero?.trim()) e.genero = "Requerido";
        if (!form.movil?.trim()) e.movil = "Requerido";
        if (!form.email?.trim()) e.email = "Requerido";
        if (!form.eps?.trim()) e.eps = "Requerido";
        if (!form.arl?.trim()) e.arl = "Requerido";
        if (!form.estado_empleado?.trim()) e.estado_empleado = "Requerido";
        if (!form.cargo?.trim()) e.cargo = "Requerido";
        if (!form.tipo_funcionario?.trim()) e.tipo_funcionario = "Requerido";
        if (!form.tipo_vinculacion?.trim()) e.tipo_vinculacion = "Requerido";
        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length) {
            setErrors(e);
            const enAdicional = [
                "cargo",
                "tipo_funcionario",
                "tipo_vinculacion",
            ];
            const hasGeneralErrors = Object.keys(e).some(
                (k) => !enAdicional.includes(k),
            );
            setActive(hasGeneralErrors ? "general" : "adicional");
            return;
        }
        setSaving(true);
        try {
            await onSave(form, fotografiaFile);
        } catch {
            // parent handles error toast; modal stays open
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
                {/* Cabecera */}
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>{title}</span>
                    <button style={S.closeBtnWhite} onClick={onClose}>
                        <IconClose size={14} />
                    </button>
                </div>

                {/* Selector de contratado prominente solo en modo crear */}
                {isCreate && (
                    <div style={{
                        padding: "20px 28px 0",
                        borderBottom: "2px solid var(--border)",
                        background: "var(--bg)",
                    }}>
                        <div style={{
                            fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.07em",
                            color: "var(--primary)", fontFamily: "'Poppins',sans-serif",
                            textTransform: "uppercase", marginBottom: 8,
                        }}>
                            Autocompletar desde usuario con contrato
                        </div>
                        <div style={{ paddingBottom: 20 }}>
                            <ContratadoSelector onSelect={handleSelectCand} />
                        </div>
                    </div>
                )}

                {/* Pestañas */}
                <div className="tab-bar" style={S.tabBar}>
                    {[
                        ["general", "Información General"],
                        ["adicional", "Información Adicional"],
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

                {/* Cuerpo con scroll */}
                <div style={S.modalBody}>
                    {/* ══ PESTAÑA: INFORMACIÓN GENERAL ══ */}
                    {activeTab === "general" && (
                        <>
                            {/* Fila 1 – Identificación + Foto */}
                            <div style={{ ...S.grid4, alignItems: "flex-end" }}>
                                <Field label="Cédula" k="cedula" req {...fp} />
                                <Field
                                    label="Apellidos"
                                    k="apellidos"
                                    req
                                    uppercase
                                    {...fp}
                                />
                                <Field
                                    label="Nombres"
                                    k="nombres"
                                    req
                                    uppercase
                                    {...fp}
                                />
                                {/* Campo foto */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", fontFamily: "Nunito,sans-serif" }}>
                                        Fotografía
                                    </label>
                                    <label style={{
                                        display: "flex", alignItems: "center", gap: 10,
                                        padding: "6px 10px",
                                        border: "1.5px dashed var(--border)",
                                        borderRadius: "var(--radius-sm, 8px)",
                                        cursor: readOnly ? "not-allowed" : "pointer",
                                        background: "var(--white)",
                                        overflow: "hidden",
                                    }}>
                                        {fotografiaFile ? (
                                            <img src={URL.createObjectURL(fotografiaFile)} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                                        ) : form.fotografia ? (
                                            <img src={`/storage/${form.fotografia}`} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                                        ) : (
                                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem", flexShrink: 0 }}>
                                                {(form.nombres || "?").charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "Nunito,sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {fotografiaFile ? fotografiaFile.name : (form.fotografia ? "Cambiar foto" : "Subir foto…")}
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            disabled={readOnly}
                                            style={{ display: "none" }}
                                            onChange={(e) => setFotografiaFile(e.target.files[0] || null)}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Fila 2 – Sede y fechas */}
                            <div style={{ ...S.grid4, marginTop: 16 }}>
                                <Field
                                    label="Sede a la que pertenece"
                                    k="sede"
                                    opts={catalogs.sedes}
                                    req
                                    {...fp}
                                />
                                <Field
                                    label="Fecha Nacimiento"
                                    k="fecha_nacimiento"
                                    type="date"
                                    {...fp}
                                />
                                <Field
                                    label="Fecha Expedición Documento"
                                    k="fecha_expedicion"
                                    type="date"
                                    {...fp}
                                />
                                <Field
                                    label="Lugar Nacimiento"
                                    k="lugar_nacimiento"
                                    {...fp}
                                />
                            </div>

                            {/* Fila 2b – Raza y género */}
                            <div style={{ ...S.grid4, marginTop: 16 }}>
                                <Field label="Raza" k="raza" {...fp} />
                                <Field
                                    label="Género"
                                    k="genero"
                                    opts={GENEROS}
                                    req
                                    {...fp}
                                />
                                <div /><div />
                            </div>

                            {/* Fila 3 – Estado civil, escolaridad, profesión */}
                            <div style={{ ...S.grid4, marginTop: 16 }}>
                                <Field
                                    label="Estado Civil"
                                    k="estado_civil"
                                    opts={EST_CIVIL}
                                    {...fp}
                                />
                                <Field
                                    label="Nivel Escolaridad"
                                    k="nivel_escolaridad"
                                    opts={ESCOLARIDAD}
                                    {...fp}
                                />
                                <Field
                                    label="Profesión"
                                    k="profesion"
                                    span={2}
                                    {...fp}
                                />
                            </div>

                            {/* Fila 3b – Email */}
                            <div style={{ ...S.grid4, marginTop: 16 }}>
                                <Field
                                    label="Email"
                                    k="email"
                                    type="email"
                                    req
                                    span={2}
                                    {...fp}
                                />
                                <div /><div />
                            </div>

                            <div style={{ ...S.grid4, marginTop: 16 }}>
                                <Field
                                    label="Dirección Residencia"
                                    k="direccion_residencia"
                                    span={4}
                                    {...fp}
                                />
                            </div>

                            {/* Fila 4 – Contacto */}
                            <div style={{ ...S.grid4, marginTop: 16 }}>
                                <Field label="Móvil" k="movil" req {...fp} />
                                <Field
                                    label="Estrato"
                                    k="estrato"
                                    opts={ESTRATOS}
                                    {...fp}
                                />
                                <Field label="Barrio" k="barrio" {...fp} />
                                <Field
                                    label="Número de Hijos"
                                    k="numero_hijos"
                                    type="number"
                                    {...fp}
                                />
                            </div>

                            <div style={{ ...S.grid4, marginTop: 16 }}>
                                <Field
                                    label="Ingresos $"
                                    k="ingresos"
                                    type="number"
                                    span={2}
                                    {...fp}
                                />
                            </div>

                            {/* Fila 5 – Observaciones */}
                            <div style={{ ...S.grid2, marginTop: 16 }}>
                                <Field
                                    label="Observaciones Médicas"
                                    k="observaciones_medicas"
                                    type="textarea"
                                    {...fp}
                                />
                                <Field
                                    label="Alergias"
                                    k="alergias"
                                    type="textarea"
                                    {...fp}
                                />
                            </div>

                            {/* Tallas / Dotación */}
                            <div style={S.sectionHeader}>
                                TALLAS / DOTACIÓN
                            </div>
                            <div style={{ ...S.grid4, marginTop: 12 }}>
                                <Field label="Talla Camisa" k="talla_camisa" {...fp} />
                                <Field label="Talla Pantalón" k="talla_pantalon" {...fp} />
                                <Field label="Talla Zapatos" k="talla_zapatos" {...fp} />
                                <div />
                            </div>

                            {/* Fila 6 – Seguridad Social */}
                            <div style={{ ...S.grid4, marginTop: 16 }}>
                                <Field
                                    label="RH"
                                    k="rh"
                                    opts={catalogs.tipos_rh}
                                    {...fp}
                                />
                                <Field
                                    label="EPS Afiliado"
                                    k="eps"
                                    opts={catalogs.eps}
                                    req
                                    {...fp}
                                />
                                <Field
                                    label="ARL"
                                    k="arl"
                                    opts={catalogs.arls}
                                    req
                                    {...fp}
                                />
                                <Field
                                    label="Fondo de Pensiones"
                                    k="fondo_pensiones"
                                    opts={catalogs.pensiones}
                                    req
                                    {...fp}
                                />
                            </div>

                            {/* Fila 7 – Licencias */}
                            <div style={{ ...S.grid4, marginTop: 16 }}>
                                <Field
                                    label="Caja Compensación"
                                    k="caja_compensacion"
                                    opts={catalogs.cajas}
                                    {...fp}
                                />
                                <Field
                                    label="No. Licencia Carro"
                                    k="licencia_carro"
                                    {...fp}
                                />
                                <Field
                                    label="Vence"
                                    k="licencia_carro_vence"
                                    type="date"
                                    {...fp}
                                />
                                <div /> {/* espaciador */}
                                <Field
                                    label="No. Licencia Moto"
                                    k="licencia_moto"
                                    {...fp}
                                />
                                <Field
                                    label="Vence"
                                    k="licencia_moto_vence"
                                    type="date"
                                    {...fp}
                                />
                                <Field
                                    label="Tiene Cert. Alturas?"
                                    k="tiene_cert_alturas"
                                    opts={["Sí", "No"]}
                                    {...fp}
                                />
                                <Field
                                    label="Vence"
                                    k="cert_alturas_vence"
                                    type="date"
                                    {...fp}
                                />
                            </div>

                            {/* Fila 8 – Estado laboral */}
                            <div style={{ ...S.grid4, marginTop: 16 }}>
                                <Field
                                    label="Estado Empleado"
                                    k="estado_empleado"
                                    opts={ESTADOS_EMP}
                                    req
                                    {...fp}
                                />
                                <Field
                                    label="Código Directv"
                                    k="codigo_directv"
                                    {...fp}
                                />
                                <div /> {/* espaciador */}
                                <Field
                                    label="Empresa"
                                    k="empresa_id"
                                    opts={empresas.map((e) => ({
                                        value: e.id,
                                        label: e.nombre,
                                    }))}
                                    {...fp}
                                />
                            </div>

                            <div style={{ ...S.grid4, marginTop: 16 }}>
                                <Field
                                    label="Comentarios"
                                    k="comentarios"
                                    type="textarea"
                                    span={4}
                                    {...fp}
                                />
                            </div>

                            {/* Contacto de emergencia */}
                            <div style={S.sectionHeader}>
                                CONTACTO EN CASO DE EMERGENCIA
                            </div>
                            <div style={{ ...S.grid4, marginTop: 12 }}>
                                <Field
                                    label="Nombre"
                                    k="contacto_emergencia_nombre"
                                    {...fp}
                                />
                                <Field
                                    label="Teléfono contacto"
                                    k="contacto_emergencia_telefono"
                                    {...fp}
                                />
                                <Field
                                    label="Parentesco"
                                    k="contacto_emergencia_parentesco"
                                    {...fp}
                                />
                                <div />
                            </div>
                        </>
                    )}

                    {/* ══ PESTAÑA: INFORMACIÓN ADICIONAL ══ */}
                    {activeTab === "adicional" && (
                        <>
                            <div style={S.grid3}>
                                <Field
                                    label="Cargo"
                                    k="cargo"
                                    opts={catalogs.cargos}
                                    req
                                    {...fp}
                                />
                                <Field
                                    label="Tipo Funcionario"
                                    k="tipo_funcionario"
                                    opts={catalogs.tipos_funcionario}
                                    req
                                    {...fp}
                                />
                                <Field
                                    label="Tipo Vinculación"
                                    k="tipo_vinculacion"
                                    opts={catalogs.tipos_vinculacion}
                                    req
                                    {...fp}
                                />
                            </div>

                            <div style={{ ...S.grid3, marginTop: 16 }}>
                                <Field
                                    label="No. de Cuenta Bancaria"
                                    k="cuenta_bancaria"
                                    {...fp}
                                />
                                <Field
                                    label="Tipo de Cuenta"
                                    k="tipo_cuenta"
                                    opts={TIPOS_CUENTA}
                                    {...fp}
                                />
                                <Field
                                    label="Banco de la cuenta"
                                    k="banco"
                                    opts={catalogs.bancos}
                                    {...fp}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Pie */}
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

/* ─── Modal de credenciales iniciales ───────────────────────────────── */
function CredencialesModal({ open, credenciales, onClose }) {
    const [copiado, setCopiado] = useState(false);
    if (!open || !credenciales) return null;

    const copiar = () => {
        navigator.clipboard
            .writeText(
                `Email: ${credenciales.email}\nContraseña: ${credenciales.password}`,
            )
            .then(() => {
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
            });
    };

    return (
        <div style={S.overlay} onClick={onClose}>
            <div
                style={{ ...S.modal, maxWidth: 480 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>
                        Credenciales de acceso
                    </span>
                    <button style={S.closeBtnWhite} onClick={onClose}>
                        <IconClose size={14} />
                    </button>
                </div>
                <div style={{ padding: "28px 28px 20px" }}>
                    <p
                        style={{
                            color: "var(--text-muted)",
                            fontSize: "0.88rem",
                            marginBottom: 20,
                            lineHeight: 1.6,
                        }}
                    >
                        Guarda estas credenciales y compártelas con el empleado.
                        La contraseña no podrá recuperarse después de cerrar
                        esta ventana.
                    </p>
                    <div
                        style={{
                            background: "var(--bg)",
                            borderRadius: "var(--radius-sm)",
                            padding: "16px 20px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                        }}
                    >
                        <div>
                            <span
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                }}
                            >
                                Correo
                            </span>
                            <div
                                style={{
                                    fontFamily: "monospace",
                                    fontSize: "1rem",
                                    color: "var(--text)",
                                    fontWeight: 600,
                                    marginTop: 4,
                                }}
                            >
                                {credenciales.email}
                            </div>
                        </div>
                        <div>
                            <span
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                }}
                            >
                                Contraseña temporal
                            </span>
                            <div
                                style={{
                                    fontFamily: "monospace",
                                    fontSize: "1.3rem",
                                    color: "var(--primary)",
                                    fontWeight: 800,
                                    letterSpacing: 3,
                                    marginTop: 4,
                                }}
                            >
                                {credenciales.password}
                            </div>
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
                        style={{
                            ...S.btnSecondary,
                            gap: 8,
                            display: "flex",
                            alignItems: "center",
                        }}
                        onClick={copiar}
                    >
                        {copiado ? "✓ Copiado" : "Copiar credenciales"}
                    </button>
                    <button style={S.btnPrimary} onClick={onClose}>
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Calcula qué botones mostrar (ellipsis para datasets grandes) ────── */
function getPaginasBotones(pagina, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const delta = 2;
    const left = pagina - delta;
    const right = pagina + delta;
    const pages = [1];
    if (left > 2) pages.push("...");
    for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i++)
        pages.push(i);
    if (right < total - 1) pages.push("...");
    pages.push(total);
    return pages;
}

/* ─── Componente principal ───────────────────────────────────────────── */
export default function EmpleadosCrud() {
    const [empleados, setEmpleados] = useState([]);
    // loading derived from React Query
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [filtroEstado, setFiltroEstado] = useState("Todos");
    const [filtroSede, setFiltroSede] = useState("Todas");
    const [filtroCargo, setFiltroCargo] = useState("Todos");
    const [filtroVinc, setFiltroVinc] = useState("Todos");
    const [filtroEmpresa, setFiltroEmpresa] = useState("Todas");
    const [empresas, setEmpresas] = useState([]);
    const [filtroTipoFunc, setFiltroTipoFunc] = useState("Todos");
    const [filtroEps, setFiltroEps] = useState("Todas");
    const [filtroArl, setFiltroArl] = useState("Todas");
    const [filtroPensiones, setFiltroPensiones] = useState("Todas");
    const [filtroRH, setFiltroRH] = useState("Todos");
    const [filtroCiudad, setFiltroCiudad] = useState("Todas");
    const [catalogs, setCatalogs] = useState({
        sedes: SEDES,
        cargos: CARGOS,
        eps: EPS_LIST,
        arls: ARL_LIST,
        cajas: CAJAS,
        pensiones: PENSIONES,
        bancos: BANCOS,
        tipos_rh: RH_LIST,
        ciudades: [],
        sedes_por_ciudad: {},
        tipos_funcionario: TIPOS_FUNC,
        tipos_vinculacion: TIPOS_VINC,
    });
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewTarget, setViewTarget] = useState(null);
    const [toast, setToast] = useState(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [credenciales, setCredenciales] = useState(null);
    const [credencialesOpen, setCredencialesOpen] = useState(false);
    const [pagina, setPagina] = useState(1);
    const [sedesActivas, setSedesActivas] = useState([]);

    const { data: _qEmpresas,  isLoading: _le } = useQuery({ queryKey: ['empresas'],  queryFn: () => api.get('/empresas').then(r => r.data) });
    const { data: _qCatalogos, isLoading: _lc } = useQuery({ queryKey: ['catalogos'], queryFn: () => api.get('/catalogos').then(r => r.data) });
    const { data: _qSedes,     isLoading: _ls } = useQuery({ queryKey: ['sedes'],     queryFn: () => api.get('/sedes').then(r => r.data) });
    const { data: _qEmpleados, isLoading: _lem }= useQuery({ queryKey: ['empleados'], queryFn: () => api.get('/empleados').then(r => r.data) });
    const loading = _lem;

    useEffect(() => { if (_qEmpresas)  setEmpresas(_qEmpresas); },  [_qEmpresas]);
    useEffect(() => { if (_qCatalogos) setCatalogs(_qCatalogos); }, [_qCatalogos]);
    useEffect(() => {
        if (_qSedes) setSedesActivas((Array.isArray(_qSedes) ? _qSedes : []).filter(s => s.estado === 'Activa'));
    }, [_qSedes]);
    useEffect(() => { if (_qEmpleados) setEmpleados(_qEmpleados); }, [_qEmpleados]);

    React.useEffect(() => {
        const anyOpen =
            modalOpen ||
            filterOpen ||
            viewOpen ||
            credencialesOpen;
        if (anyOpen) {
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
    }, [modalOpen, filterOpen, viewOpen, credencialesOpen]);

    /* Filtrado */
    const filtered = useMemo(
        () =>
            empleados.filter((e) => {
                const palabras = debouncedSearch
                    .toLowerCase()
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean);
                const haystack = [
                    e.nombres ?? "",
                    e.apellidos ?? "",
                    e.name ?? "",
                    e.cedula ?? "",
                    e.cargo ?? "",
                ]
                    .join(" ")
                    .toLowerCase();
                const matchQ =
                    palabras.length === 0 ||
                    palabras.every((p) => haystack.includes(p));
                const matchE =
                    filtroEstado === "Todos" ||
                    e.estado_empleado === filtroEstado;
                const matchS = filtroSede === "Todas" || e.sede === filtroSede;
                const matchC =
                    filtroCargo === "Todos" || e.cargo === filtroCargo;
                const matchV =
                    filtroVinc === "Todos" || e.tipo_vinculacion === filtroVinc;
                const matchEm =
                    filtroEmpresa === "Todas" ||
                    String(e.empresa_id) === String(filtroEmpresa);
                const matchTF =
                    filtroTipoFunc === "Todos" ||
                    e.tipo_funcionario === filtroTipoFunc;
                const matchEps = filtroEps === "Todas" || e.eps === filtroEps;
                const matchArl = filtroArl === "Todas" || e.arl === filtroArl;
                const matchPen =
                    filtroPensiones === "Todas" ||
                    e.fondo_pensiones === filtroPensiones;
                const matchRH = filtroRH === "Todos" || e.rh === filtroRH;
                const matchCiu =
                    filtroCiudad === "Todas" ||
                    (catalogs.sedes_por_ciudad?.[filtroCiudad]?.includes(
                        e.sede,
                    ) ??
                        false);
                return (
                    matchQ &&
                    matchE &&
                    matchS &&
                    matchC &&
                    matchV &&
                    matchEm &&
                    matchTF &&
                    matchEps &&
                    matchArl &&
                    matchPen &&
                    matchRH &&
                    matchCiu
                );
            }),
        [
            empleados,
            debouncedSearch,
            filtroEstado,
            filtroSede,
            filtroCargo,
            filtroVinc,
            filtroEmpresa,
            filtroTipoFunc,
            filtroEps,
            filtroArl,
            filtroPensiones,
            filtroRH,
            filtroCiudad,
            catalogs.sedes_por_ciudad,
        ],
    );

    // Resetear a página 1 cuando cambian los filtros
    useEffect(() => {
        setPagina(1);
    }, [
        search,
        filtroEstado,
        filtroSede,
        filtroCargo,
        filtroVinc,
        filtroEmpresa,
        filtroTipoFunc,
        filtroEps,
        filtroArl,
        filtroPensiones,
        filtroRH,
        filtroCiudad,
    ]);

    const totalPaginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));
    const paginated = useMemo(
        () => filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
        [filtered, pagina],
    );

    /* Stats */
    const total = empleados.length;
    const activos = empleados.filter(
        (e) => e.estado_empleado === "Activo",
    ).length;
    // Sedes activas que tienen al menos un empleado asignado
    const sedesConEmpleado = new Set(empleados.map((e) => e.sede).filter(Boolean));
    const numSedes = sedesActivas.length > 0
        ? sedesActivas.filter((s) => sedesConEmpleado.has(s.nombre)).length
        : sedesConEmpleado.size;
    const numEmp = [
        ...new Set(empleados.map((e) => e.empresa_id).filter(Boolean)),
    ].length;

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const clearFilters = () => {
        setSearch("");
        setFiltroEstado("Todos");
        setFiltroSede("Todas");
        setFiltroCargo("Todos");
        setFiltroVinc("Todos");
        setFiltroEmpresa("Todas");
        setFiltroTipoFunc("Todos");
        setFiltroEps("Todas");
        setFiltroArl("Todas");
        setFiltroPensiones("Todas");
        setFiltroRH("Todos");
        setFiltroCiudad("Todas");
    };

    /* CRUD */
    const openCreate = () => {
        setEditTarget(null);
        setModalOpen(true);
    };
    const openEdit = (emp) => {
        setEditTarget(emp);
        setModalOpen(true);
    };
    const openView = (emp) => {
        setViewTarget(emp);
        setViewOpen(true);
    };

    const handleSave = async (form, fotografiaFile) => {
        const plain = toApi(form);

        let payload;
        if (fotografiaFile) {
            const fd = new FormData();
            Object.entries(plain).forEach(([k, v]) => {
                if (v !== null && v !== undefined) fd.append(k, v);
            });
            fd.append("fotografia", fotografiaFile);
            if (editTarget) fd.append("_method", "PUT");
            payload = fd;
            // No fijar Content-Type; Axios lo establece con el boundary correcto al detectar FormData
        } else {
            payload = plain;
        }

        try {
            if (editTarget) {
                const { data } = fotografiaFile
                    ? await api.post(`/empleados/${editTarget.id}`, payload)
                    : await api.put(`/empleados/${editTarget.id}`, payload);
                setEmpleados((prev) =>
                    prev.map((e) => (e.id === editTarget.id ? data : e)),
                );
                showToast("Empleado actualizado correctamente.");
            } else {
                const { data } = await api.post("/empleados", payload);
                setEmpleados((prev) => [...prev, data.empleado]);
                // Mostrar credenciales generadas
                setCredenciales(data.credenciales);
                setCredencialesOpen(true);
                showToast("Empleado registrado correctamente.");
            }
            setModalOpen(false);
        } catch (err) {
            const msgs = err.response?.data?.errors;
            const msg = msgs
                ? Object.values(msgs)[0][0]
                : (err.response?.data?.message ??
                  "Error al guardar. Revisa los datos.");
            showToast(msg);
            throw err;
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{total}</div>
                    <div className="stat-label">Total empleados</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#27ae60" }}>
                        {activos}
                    </div>
                    <div className="stat-label">Activos</div>
                </div>
                <div className="stat-card">
                    <div
                        className="stat-num"
                        style={{ color: "var(--accent)" }}
                    >
                        {numSedes}
                    </div>
                    <div className="stat-label">Sedes con personal</div>
                </div>
                <div className="stat-card">
                    <div
                        className="stat-num"
                        style={{ color: "var(--primary)" }}
                    >
                        {numEmp}
                    </div>
                    <div className="stat-label">Empresas vinculadas</div>
                </div>
            </div>

            {/* Toolbar */}
            <div style={S.toolbar}>
                <div style={S.filters}>
                    <div style={S.searchWrap}>
                        <span style={S.searchIcon}>
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
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
                    <PresetFiltersDropdown presets={[
                        { label: "Empleados activos", apply: () => { clearFilters(); setFiltroEstado("Activo"); } },
                        { label: "En vacaciones", apply: () => { clearFilters(); setFiltroEstado("Vacaciones"); } },
                        { label: "Incapacitados", apply: () => { clearFilters(); setFiltroEstado("Incapacitado"); } },
                        { label: "Contratistas", apply: () => { clearFilters(); setFiltroVinc("Contratista"); } },
                        { label: "Aprendices SENA", apply: () => { clearFilters(); setFiltroVinc("Aprendiz SENA"); } },
                        { label: "Técnicos", apply: () => { clearFilters(); setFiltroTipoFunc("TÉCNICO"); } },
                        { label: "Vendedores", apply: () => { clearFilters(); setFiltroTipoFunc("VENDEDOR"); } },
                        { label: "Limpiar filtros", apply: () => clearFilters(), clear: true },
                    ]} />
                </div>
                <button className="btn-primary" onClick={openCreate}>
                    + Nuevo empleado
                </button>
            </div>

            {/* Tabla */}
            <div style={S.tableWrap}>
                {loading ? (
                    <div style={S.empty}>
                        <IconLoading size={32} />
                        <p>Cargando empleados…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p>
                            No se encontraron empleados con los filtros
                            aplicados.
                        </p>
                    </div>
                ) : null}
                {!loading && filtered.length > 0 && (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Cédula</th>
                                <th>Cargo</th>
                                <th>Sede</th>
                                <th>Empresa</th>
                                <th>Vinculación</th>
                                <th>Estado</th>
                                <th style={{ textAlign: "center" }}>
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((emp) => (
                                <tr key={emp.id}>
                                    <td>
                                        <div style={S.avatarCell}>
                                            <div style={{ ...S.avatar, position: "relative" }}>
                                                {((emp.nombres || emp.name) ?? "?").charAt(0).toUpperCase()}
                                                {emp.fotografia && (
                                                    <img
                                                        src={`/storage/${emp.fotografia}`}
                                                        alt=""
                                                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                                    />
                                                )}
                                            </div>
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color: "var(--text)",
                                                }}
                                            >
                                                {emp.apellidos && emp.nombres
                                                    ? `${emp.nombres} ${emp.apellidos}`
                                                    : emp.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td
                                        style={{
                                            fontFamily: "monospace",
                                            fontSize: "0.82rem",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        {emp.cedula}
                                    </td>
                                    <td>{emp.cargo ?? "—"}</td>
                                    <td>
                                        {emp.sede ? (
                                            <span
                                                style={S.badge(
                                                    "#e8f8f5",
                                                    "var(--primary-dark)",
                                                )}
                                            >
                                                {emp.sede}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td
                                        style={{
                                            fontSize: "0.85rem",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        {emp.empresa?.nombre ?? "—"}
                                    </td>
                                    <td>
                                        {emp.tipo_vinculacion ? (
                                            <span
                                                style={S.badge(
                                                    "#fff7e0",
                                                    "#b7780c",
                                                )}
                                            >
                                                {emp.tipo_vinculacion}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td>
                                        <span
                                            style={{
                                                ...S.badge(
                                                    emp.estado_empleado ===
                                                        "Activo"
                                                        ? "#e0f7f4"
                                                        : "#fce8e8",
                                                    emp.estado_empleado ===
                                                        "Activo"
                                                        ? "#0d6e5a"
                                                        : "#a33",
                                                ),
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 5,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: "50%",
                                                    background:
                                                        emp.estado_empleado ===
                                                        "Activo"
                                                            ? "#27ae60"
                                                            : "#e74c3c",
                                                    display: "inline-block",
                                                }}
                                            />
                                            {emp.estado_empleado}
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
                                                onClick={() => openView(emp)}
                                            >
                                                <IconEye />
                                            </button>
                                            <button
                                                style={S.actionBtn(
                                                    "#e8f8f5",
                                                    "var(--primary-dark)",
                                                )}
                                                title="Editar"
                                                onClick={() => openEdit(emp)}
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
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 14,
                        flexWrap: "wrap",
                        gap: 10,
                    }}
                >
                    <span
                        style={{
                            color: "var(--text-muted)",
                            fontSize: "0.82rem",
                        }}
                    >
                        Página {pagina} · Mostrando{" "}
                        {Math.min(
                            POR_PAGINA,
                            filtered.length - (pagina - 1) * POR_PAGINA,
                        )}{" "}
                        de {filtered.length}
                        {filtered.length !== empleados.length
                            ? ` (filtrados de ${empleados.length})`
                            : " empleados"}
                    </span>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                        }}
                    >
                        <button
                            onClick={() => setPagina((p) => Math.max(1, p - 1))}
                            disabled={pagina === 1}
                            style={S.pageBtn(pagina === 1)}
                        >
                            ‹
                        </button>
                        {getPaginasBotones(pagina, totalPaginas).map((n, i) =>
                            n === "..." ? (
                                <span
                                    key={`ellipsis-${i}`}
                                    style={S.pageEllipsis}
                                >
                                    …
                                </span>
                            ) : (
                                <button
                                    key={n}
                                    onClick={() => setPagina(n)}
                                    style={
                                        n === pagina
                                            ? S.pageBtnActive
                                            : S.pageBtn(false)
                                    }
                                >
                                    {n}
                                </button>
                            ),
                        )}
                        <button
                            onClick={() =>
                                setPagina((p) => Math.min(totalPaginas, p + 1))
                            }
                            disabled={pagina === totalPaginas}
                            style={S.pageBtn(pagina === totalPaginas)}
                        >
                            ›
                        </button>
                    </div>
                </div>
            )}

            {/* ── Modales ── */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                initial={editTarget ? toForm(editTarget) : EMPTY_FORM}
                title={
                    editTarget ? "Editar empleado" : "Registrar nuevo empleado"
                }
                empresas={empresas}
                catalogs={catalogs}
                empleados={empleados}
                onSwitchToEdit={(emp) => setEditTarget(emp)}
            />

            <Modal
                open={viewOpen}
                onClose={() => setViewOpen(false)}
                onSave={() => {}}
                initial={viewTarget ? toForm(viewTarget) : EMPTY_FORM}
                title="Ver empleado"
                empresas={empresas}
                catalogs={catalogs}
                readOnly
            />

            <CredencialesModal
                open={credencialesOpen}
                credenciales={credenciales}
                onClose={() => {
                    setCredencialesOpen(false);
                    setCredenciales(null);
                }}
            />

            {/* Modal de filtros */}
            {filterOpen && (
                <div style={S.overlay} onClick={() => setFilterOpen(false)}>
                    <div
                        style={{ ...S.modal, maxWidth: 900 }}
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
                        <div style={S.modalBody}>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: "16px 24px",
                                }}
                            >
                                <div style={S.formGroup}>
                                    <label style={S.label}>Ciudad</label>
                                    <SearchableSelect
                                        value={filtroCiudad}
                                        onChange={setFiltroCiudad}
                                        defaultValue="Todas"
                                        options={catalogs.ciudades.map((c) => ({ label: c, value: c }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Sede</label>
                                    <SearchableSelect
                                        value={filtroSede}
                                        onChange={setFiltroSede}
                                        defaultValue="Todas"
                                        options={catalogs.sedes.map((s) => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Empresa</label>
                                    <SearchableSelect
                                        value={filtroEmpresa}
                                        onChange={setFiltroEmpresa}
                                        defaultValue="Todas"
                                        options={empresas.map((e) => ({ label: e.nombre, value: e.id }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Tipo Vinculación</label>
                                    <SearchableSelect
                                        value={filtroVinc}
                                        onChange={setFiltroVinc}
                                        defaultValue="Todos"
                                        options={TIPOS_VINC.map((v) => ({ label: v, value: v }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Tipo Funcionario</label>
                                    <SearchableSelect
                                        value={filtroTipoFunc}
                                        onChange={setFiltroTipoFunc}
                                        defaultValue="Todos"
                                        options={catalogs.tipos_funcionario.map((v) => ({ label: v, value: v }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Cargo</label>
                                    <SearchableSelect
                                        value={filtroCargo}
                                        onChange={setFiltroCargo}
                                        defaultValue="Todos"
                                        options={catalogs.cargos.map((c) => ({ label: c, value: c }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>EPS Afiliado</label>
                                    <SearchableSelect
                                        value={filtroEps}
                                        onChange={setFiltroEps}
                                        defaultValue="Todas"
                                        options={catalogs.eps.map((v) => ({ label: v, value: v }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>ARL</label>
                                    <SearchableSelect
                                        value={filtroArl}
                                        onChange={setFiltroArl}
                                        defaultValue="Todas"
                                        options={catalogs.arls.map((v) => ({ label: v, value: v }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Fondo de Pensiones</label>
                                    <SearchableSelect
                                        value={filtroPensiones}
                                        onChange={setFiltroPensiones}
                                        defaultValue="Todas"
                                        options={PENSIONES.map((v) => ({ label: v, value: v }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>RH</label>
                                    <SearchableSelect
                                        value={filtroRH}
                                        onChange={setFiltroRH}
                                        defaultValue="Todos"
                                        options={catalogs.tipos_rh.map((v) => ({ label: v, value: v }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Estado</label>
                                    <SearchableSelect
                                        value={filtroEstado}
                                        onChange={setFiltroEstado}
                                        defaultValue="Todos"
                                        options={ESTADOS_EMP.map((s) => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>
                                        Fecha Ingreso ini
                                    </label>
                                    <input
                                        style={S.input}
                                        type="date"
                                        disabled
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>
                                        Fecha Ingreso fin
                                    </label>
                                    <input
                                        style={S.input}
                                        type="date"
                                        disabled
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>
                                        Venc. documentos ini
                                    </label>
                                    <input
                                        style={S.input}
                                        type="date"
                                        disabled
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>
                                        Venc. documentos fin
                                    </label>
                                    <input
                                        style={S.input}
                                        type="date"
                                        disabled
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
                                    style={S.btnPrimaryGreen}
                                    onClick={() => setFilterOpen(false)}
                                >
                                    Buscar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Estilos ────────────────────────────────────────────────────────── */
const S = {
    /* Toolbar */
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

    /* Tabla */
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
        overflow: "hidden",
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

    /* Overlay / Modal */
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
        animation: "fadeInUp 0.22s ease",
    },
    modalHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 28px",
        borderBottom: "1.5px solid var(--border)",
        flexShrink: 0,
    },
    modalTitle: {
        fontFamily: "'Poppins',sans-serif",
        fontWeight: 700,
        fontSize: "1.1rem",
        color: "var(--primary)",
    },
    closeBtn: {
        background: "none",
        border: "none",
        fontSize: "1.1rem",
        cursor: "pointer",
        color: "var(--text-muted)",
        padding: 4,
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

    /* Cabecera verde (filtros) */
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

    /* Pestañas */
    tabBar: {
        display: "flex",
        borderBottom: "2px solid var(--border)",
        padding: "0 28px",
        gap: 0,
        overflowX: "auto",
        flexWrap: "nowrap",
        flexShrink: 0,
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
        transition: "color 0.15s, border-color 0.15s",
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

    /* Grids */
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

    /* Sección */
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

    /* Campos */
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
        transition: "border 0.15s",
    },
    inputErr: { borderColor: "#e74c3c" },
    err: { color: "#e74c3c", fontSize: "0.75rem", marginTop: 2 },

    /* Paginación */
    pageBtn: (disabled) => ({
        minWidth: 32,
        height: 32,
        padding: "0 8px",
        border: "1.5px solid var(--border)",
        borderRadius: 6,
        background: "var(--white)",
        color: disabled ? "var(--text-muted)" : "var(--text)",
        fontSize: "0.88rem",
        fontWeight: 700,
        fontFamily: "Nunito,sans-serif",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
    }),
    pageBtnActive: {
        minWidth: 32,
        height: 32,
        padding: "0 8px",
        border: "1.5px solid var(--primary)",
        borderRadius: 6,
        background: "var(--primary)",
        color: "#fff",
        fontSize: "0.88rem",
        fontWeight: 700,
        fontFamily: "Nunito,sans-serif",
        cursor: "default",
    },
    pageEllipsis: {
        minWidth: 28,
        height: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: "0.88rem",
        userSelect: "none",
    },

    /* Botones */
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
        transition: "background 0.18s",
    },
    btnPrimaryGreen: {
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

    /* Toast */
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
        animation: "fadeInUp 0.22s ease",
    },
};
