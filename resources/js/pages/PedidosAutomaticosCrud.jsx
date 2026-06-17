import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import {
    SearchableSelect,
    PresetFiltersDropdown,
} from "../components/SearchableSelect";
import api from "../api/axios";
import {
    IconEye,
    IconEdit,
    IconClose,
    IconEmptySearch,
    IconLoading,
} from "../components/Icons";

const TALLAS_ROPA = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const TALLAS_JEAN = ["26", "28", "30", "32", "34", "36", "38", "40"];
const TALLAS_TENIS = [
    "34",
    "35",
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43",
    "44",
    "45",
];
const GENEROS = ["Masculino", "Femenino"];
const ESTADOS_ACTA = [
    "Firmada",
    "Pendiente firma",
    "No aplica",
    "Por gestionar",
];
const ESTADOS_CONT = [
    "Activo",
    "Inactivo",
    "Retirado",
    "En licencia",
    "Suspendido",
];
const POR_PAGINA = 10;

const dateOnly = (v) => (v ? String(v).split("T")[0] : "");

const EMPTY_FORM = {
    sede: "",
    cedula: "",
    nombres: "",
    apellidos: "",
    cargo: "",
    tipo_contrato: "",
    proceso: "",
    fecha_ingreso: "",
    estado_contrato: "",
    empleador: "",
    proyecto: "",
    genero: "",
    ciudad: "",
    polo_masculino_talla: "",
    polo_masculino_cantidad: "",
    polo_femenino_talla: "",
    polo_femenino_cantidad: "",
    jean_masculino_talla: "",
    jean_masculino_cantidad: "",
    jean_femenino_talla: "",
    jean_femenino_cantidad: "",
    chaqueta_masculino_talla: "",
    chaqueta_masculino_cantidad: "",
    chaqueta_femenino_talla: "",
    chaqueta_femenino_cantidad: "",
    tenis_masculino_talla: "",
    tenis_masculino_cantidad: "",
    tenis_femenino_talla: "",
    tenis_femenino_cantidad: "",
    estado_acta: "",
    actas_sept: "",
    fecha_primera_renovacion_2024: "",
    fecha_segunda_renovacion_2024: "",
    fecha_tercera_renovacion_2024: "",
    fecha_primera_renovacion_2025: "",
    fecha_segunda_renovacion_2025: "",
    pedido_inicial: "",
    fecha_inicial: "",
    pedido_renovacion_1: "",
    fecha_renovacion_1: "",
    pedido_renovacion_2: "",
    fecha_renovacion_2: "",
    pedido_renovacion_3: "",
    fecha_renovacion_3: "",
    pedido_renovacion_4: "",
    fecha_renovacion_4: "",
    pedido_renovacion_5: "",
    fecha_renovacion_5: "",
};

const toForm = (d) => ({
    ...EMPTY_FORM,
    ...d,
    fecha_ingreso: dateOnly(d.fecha_ingreso),
    fecha_primera_renovacion_2024: dateOnly(d.fecha_primera_renovacion_2024),
    fecha_segunda_renovacion_2024: dateOnly(d.fecha_segunda_renovacion_2024),
    fecha_tercera_renovacion_2024: dateOnly(d.fecha_tercera_renovacion_2024),
    fecha_primera_renovacion_2025: dateOnly(d.fecha_primera_renovacion_2025),
    fecha_segunda_renovacion_2025: dateOnly(d.fecha_segunda_renovacion_2025),
    fecha_inicial: dateOnly(d.fecha_inicial),
});

/* ─── Paginación ───────────────────────────────────────────── */
function getPaginasBotones(pagina, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const delta = 2,
        left = pagina - delta,
        right = pagina + delta;
    const pages = [1];
    if (left > 2) pages.push("...");
    for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i++)
        pages.push(i);
    if (right < total - 1) pages.push("...");
    pages.push(total);
    return pages;
}

/* ─── Campo reutilizable ───────────────────────────────────── */
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
}) {
    const style = {
        ...S.formGroup,
        ...(span ? { gridColumn: `span ${span}` } : {}),
    };
    const dis = disabled
        ? {
              background: "var(--bg)",
              cursor: "default",
              color: "var(--text-muted)",
          }
        : {};
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
                        ...dis,
                    }}
                    value={form[k] ?? ""}
                    onChange={onChange(k)}
                    disabled={disabled}
                >
                    <option value="">Elige</option>
                    {opts.map((o) => (
                        <option key={o} value={o}>
                            {o}
                        </option>
                    ))}
                </select>
            ) : type === "textarea" ? (
                <textarea
                    style={{
                        ...S.input,
                        minHeight: 64,
                        resize: disabled ? "none" : "vertical",
                        ...dis,
                    }}
                    value={form[k] ?? ""}
                    onChange={onChange(k)}
                    disabled={disabled}
                />
            ) : (
                <input
                    style={{
                        ...S.input,
                        ...(errors[k] ? S.inputErr : {}),
                        ...dis,
                    }}
                    type={type}
                    value={form[k] ?? ""}
                    onChange={onChange(k)}
                    disabled={disabled}
                />
            )}
            {errors[k] && <span style={S.err}>{errors[k]}</span>}
        </div>
    );
}

/* ─── Fila de artículo de dotación ─────────────────────────── */
function FilaDotacion({
    label,
    prefix,
    tallasOpts,
    form,
    errors,
    onChange,
    disabled,
}) {
    const gM = `${prefix}_masculino`;
    const gF = `${prefix}_femenino`;

    const isMaleDisabled = disabled || form.genero === "Femenino";
    const isFemaleDisabled = disabled || form.genero === "Masculino";

    return (
        <div style={{ marginBottom: 12 }}>
            <div style={S.sectionHeader}>{label}</div>
            <div style={{ ...S.grid4, marginTop: 10 }}>
                <Field
                    label="Talla Masc."
                    k={`${gM}_talla`}
                    opts={tallasOpts}
                    form={form}
                    errors={errors}
                    onChange={onChange}
                    disabled={isMaleDisabled}
                />
                <Field
                    label="Cant. Masc."
                    k={`${gM}_cantidad`}
                    type="number"
                    form={form}
                    errors={errors}
                    onChange={onChange}
                    disabled={isMaleDisabled}
                />
                <Field
                    label="Talla Fem."
                    k={`${gF}_talla`}
                    opts={tallasOpts}
                    form={form}
                    errors={errors}
                    onChange={onChange}
                    disabled={isFemaleDisabled}
                />
                <Field
                    label="Cant. Fem."
                    k={`${gF}_cantidad`}
                    type="number"
                    form={form}
                    errors={errors}
                    onChange={onChange}
                    disabled={isFemaleDisabled}
                />
            </div>
        </div>
    );
}

/* ─── Modal ────────────────────────────────────────────────── */
function Modal({
    open,
    onClose,
    onSave,
    initial,
    title,
    options,
    empleados = [],
    readOnly = false,
}) {
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState({});
    const [activeTab, setActive] = useState("personal");
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        setForm(initial);
        setErrors({});
        setActive("personal");
        setSaving(false);
    }, [initial, open]);

    const onChange = (k) => (e) => {
        const val = e.target.value;
        setForm((f) => {
            const next = { ...f, [k]: val };
            if (k === "genero") {
                if (val === "Masculino") {
                    next.polo_femenino_talla = "";
                    next.polo_femenino_cantidad = "";
                    next.jean_femenino_talla = "";
                    next.jean_femenino_cantidad = "";
                    next.chaqueta_femenino_talla = "";
                    next.chaqueta_femenino_cantidad = "";
                    next.tenis_femenino_talla = "";
                    next.tenis_femenino_cantidad = "";
                } else if (val === "Femenino") {
                    next.polo_masculino_talla = "";
                    next.polo_masculino_cantidad = "";
                    next.jean_masculino_talla = "";
                    next.jean_masculino_cantidad = "";
                    next.chaqueta_masculino_talla = "";
                    next.chaqueta_masculino_cantidad = "";
                    next.tenis_masculino_talla = "";
                    next.tenis_masculino_cantidad = "";
                }
            }
            return next;
        });
    };

    const handleEmployeeSelect = (emp) => {
        const latestContrato = emp.contratos?.[0] || {};
        setForm((f) => {
            const nextGender = emp.genero || f.genero;
            const clearedFields = {};
            if (nextGender === "Masculino") {
                clearedFields.polo_femenino_talla = "";
                clearedFields.polo_femenino_cantidad = "";
                clearedFields.jean_femenino_talla = "";
                clearedFields.jean_femenino_cantidad = "";
                clearedFields.chaqueta_femenino_talla = "";
                clearedFields.chaqueta_femenino_cantidad = "";
                clearedFields.tenis_femenino_talla = "";
                clearedFields.tenis_femenino_cantidad = "";
            } else if (nextGender === "Femenino") {
                clearedFields.polo_masculino_talla = "";
                clearedFields.polo_masculino_cantidad = "";
                clearedFields.jean_masculino_talla = "";
                clearedFields.jean_masculino_cantidad = "";
                clearedFields.chaqueta_masculino_talla = "";
                clearedFields.chaqueta_masculino_cantidad = "";
                clearedFields.tenis_masculino_talla = "";
                clearedFields.tenis_masculino_cantidad = "";
            }

            return {
                ...f,
                cedula: emp.cedula || f.cedula,
                nombres: emp.nombres || f.nombres,
                apellidos: emp.apellidos || f.apellidos,
                sede: latestContrato.sede || emp.sede || f.sede,
                cargo: latestContrato.cargo || emp.cargo || f.cargo,
                genero: nextGender,
                tipo_contrato:
                    latestContrato.tipo_contrato ||
                    latestContrato.tipo_vinculacion ||
                    emp.tipo_vinculacion ||
                    f.tipo_contrato,
                estado_contrato:
                    latestContrato.estado_contrato ||
                    emp.estado_empleado ||
                    f.estado_contrato,
                empleador:
                    latestContrato.empleador || emp.empleador || f.empleador,
                proyecto:
                    latestContrato.cliente_proyecto ||
                    emp.empresa?.nombre ||
                    f.proyecto,
                fecha_ingreso: latestContrato.fecha_ingreso
                    ? dateOnly(latestContrato.fecha_ingreso)
                    : f.fecha_ingreso,
                ciudad: emp.ciudad || f.ciudad,
                ...clearedFields,
            };
        });
    };

    const validate = () => {
        const e = {};
        if (!String(form.cedula || "").trim()) e.cedula = "Requerido";
        if (!String(form.nombres || "").trim()) e.nombres = "Requerido";
        if (!String(form.apellidos || "").trim()) e.apellidos = "Requerido";
        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length) {
            setErrors(e);
            setActive("personal");
            return;
        }

        // Normalize: convert empty strings to null for all fields before sending
        const cleanedForm = {};
        Object.keys(form).forEach((k) => {
            cleanedForm[k] = form[k] === "" ? null : form[k];
        });

        // Clear opposite-gender fields
        if (cleanedForm.genero === "Masculino") {
            cleanedForm.polo_femenino_talla = null;
            cleanedForm.polo_femenino_cantidad = null;
            cleanedForm.jean_femenino_talla = null;
            cleanedForm.jean_femenino_cantidad = null;
            cleanedForm.chaqueta_femenino_talla = null;
            cleanedForm.chaqueta_femenino_cantidad = null;
            cleanedForm.tenis_femenino_talla = null;
            cleanedForm.tenis_femenino_cantidad = null;
        } else if (cleanedForm.genero === "Femenino") {
            cleanedForm.polo_masculino_talla = null;
            cleanedForm.polo_masculino_cantidad = null;
            cleanedForm.jean_masculino_talla = null;
            cleanedForm.jean_masculino_cantidad = null;
            cleanedForm.chaqueta_masculino_talla = null;
            cleanedForm.chaqueta_masculino_cantidad = null;
            cleanedForm.tenis_masculino_talla = null;
            cleanedForm.tenis_masculino_cantidad = null;
        }

        setSaving(true);
        try {
            await onSave(cleanedForm);
        } catch (err) {
            // Error already handled and toasted by parent - just log for debug
            console.error("[Dotacion] save error:", err);
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    const fp = { form, errors, onChange, disabled: readOnly };
    const tabs = [
        ["personal", "Datos del Empleado"],
        ["dotacion", "Artículos"],
        ["actas", "Actas y Fechas"],
        ["pedidos", "Pedidos"],
    ];

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

                {/* Pestañas */}
                <div className="tab-bar" style={S.tabBar}>
                    {tabs.map(([key, lbl]) => (
                        <button
                            key={key}
                            style={activeTab === key ? S.tabActive : S.tab}
                            onClick={() => setActive(key)}
                        >
                            {lbl}
                        </button>
                    ))}
                </div>

                {/* Cuerpo */}
                <div style={S.modalBody}>
                    {/* ── PESTAÑA: DATOS DEL EMPLEADO ── */}
                    {activeTab === "personal" && (
                        <>
                            {!initial.id && (
                                <div
                                    style={{
                                        marginBottom: 20,
                                        padding: "16px",
                                        background: "var(--bg)",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1.5px dashed var(--primary)",
                                    }}
                                >
                                    <label
                                        style={{
                                            ...S.label,
                                            color: "var(--primary-dark)",
                                            fontSize: "0.82rem",
                                            display: "block",
                                            marginBottom: 8,
                                        }}
                                    >
                                        Seleccionar Empleado
                                    </label>
                                    <SearchableSelect
                                        value=""
                                        onChange={(empId) => {
                                            const emp = empleados.find(
                                                (e) =>
                                                    String(e.id) ===
                                                    String(empId),
                                            );
                                            if (emp) handleEmployeeSelect(emp);
                                        }}
                                        options={empleados.map((e) => ({
                                            value: e.id,
                                            label: `${e.nombres} ${e.apellidos} (${e.cedula})`,
                                        }))}
                                        minSearch={0}
                                        maxResults={100}
                                    />
                                </div>
                            )}
                            <div style={S.grid4}>
                                <Field label="Cédula" k="cedula" req {...fp} />
                                <Field
                                    label="Apellidos"
                                    k="apellidos"
                                    req
                                    {...fp}
                                />
                                <Field
                                    label="Nombres"
                                    k="nombres"
                                    req
                                    {...fp}
                                    span={2}
                                />
                            </div>
                            <div style={{ ...S.grid4, marginTop: 14 }}>
                                <Field
                                    label="Sede"
                                    k="sede"
                                    opts={options.sedes}
                                    {...fp}
                                />
                                <Field label="Ciudad" k="ciudad" {...fp} />
                                <Field
                                    label="Cargo"
                                    k="cargo"
                                    opts={options.cargos}
                                    {...fp}
                                />
                                <Field
                                    label="Género"
                                    k="genero"
                                    opts={GENEROS}
                                    {...fp}
                                />
                            </div>
                            <div style={{ ...S.grid3, marginTop: 14 }}>
                                <Field
                                    label="Tipo Contrato"
                                    k="tipo_contrato"
                                    {...fp}
                                />
                                <Field
                                    label="Fecha Ingreso"
                                    k="fecha_ingreso"
                                    type="date"
                                    {...fp}
                                />
                                <Field
                                    label="Estado Contrato"
                                    k="estado_contrato"
                                    opts={options.estados_contrato}
                                    {...fp}
                                />
                            </div>
                            <div style={{ ...S.grid4, marginTop: 14 }}>
                                <Field
                                    label="Empleador"
                                    k="empleador"
                                    {...fp}
                                    span={2}
                                />
                                <Field
                                    label="Proyecto"
                                    k="proyecto"
                                    {...fp}
                                    span={2}
                                />
                            </div>
                        </>
                    )}

                    {/* ── PESTAÑA: ARTÍCULOS ── */}
                    {activeTab === "dotacion" && (
                        <>
                            <FilaDotacion
                                label="Polo"
                                prefix="polo"
                                tallasOpts={TALLAS_ROPA}
                                {...fp}
                            />
                            <FilaDotacion
                                label="Jean"
                                prefix="jean"
                                tallasOpts={TALLAS_JEAN}
                                {...fp}
                            />
                            <FilaDotacion
                                label="Chaqueta"
                                prefix="chaqueta"
                                tallasOpts={TALLAS_ROPA}
                                {...fp}
                            />
                            <FilaDotacion
                                label="Tenis"
                                prefix="tenis"
                                tallasOpts={TALLAS_TENIS}
                                {...fp}
                            />
                        </>
                    )}

                    {/* ── PESTAÑA: ACTAS Y FECHAS ── */}
                    {activeTab === "actas" && (
                        <>
                            <div style={S.grid4}>
                                <Field
                                    label="Estado Acta"
                                    k="estado_acta"
                                    opts={options.estados_acta}
                                    {...fp}
                                />
                                <Field
                                    label="Actas Sept."
                                    k="actas_sept"
                                    {...fp}
                                />
                            </div>
                            <div style={S.sectionHeader2}>
                                Renovaciones 2024
                            </div>
                            <div style={{ ...S.grid3, marginTop: 10 }}>
                                <Field
                                    label="1ª Renovación 2024"
                                    k="fecha_primera_renovacion_2024"
                                    type="date"
                                    {...fp}
                                />
                                <Field
                                    label="2ª Renovación 2024"
                                    k="fecha_segunda_renovacion_2024"
                                    type="date"
                                    {...fp}
                                />
                                <Field
                                    label="3ª Renovación 2024"
                                    k="fecha_tercera_renovacion_2024"
                                    type="date"
                                    {...fp}
                                />
                            </div>
                            <div style={S.sectionHeader2}>
                                Renovaciones 2025
                            </div>
                            <div style={{ ...S.grid3, marginTop: 10 }}>
                                <Field
                                    label="1ª Renovación 2025"
                                    k="fecha_primera_renovacion_2025"
                                    type="date"
                                    {...fp}
                                />
                                <Field
                                    label="2ª Renovación 2025"
                                    k="fecha_segunda_renovacion_2025"
                                    type="date"
                                    {...fp}
                                />
                            </div>
                        </>
                    )}

                    {/* ── PESTAÑA: PEDIDOS ── */}
                    {activeTab === "pedidos" && (
                        <>
                            <div style={S.sectionHeader2}>Pedido Inicial</div>
                            <div style={{ ...S.grid2, marginTop: 10 }}>
                                <Field
                                    label="No. Pedido Inicial"
                                    k="pedido_inicial"
                                    {...fp}
                                />
                                <Field
                                    label="Fecha Inicial"
                                    k="fecha_inicial"
                                    type="date"
                                    {...fp}
                                />
                            </div>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <React.Fragment key={n}>
                                    <div style={S.sectionHeader2}>
                                        Renovación {n}
                                    </div>
                                    <div style={{ ...S.grid2, marginTop: 10 }}>
                                        <Field
                                            label={`No. Pedido Renov. ${n}`}
                                            k={`pedido_renovacion_${n}`}
                                            {...fp}
                                        />
                                        <Field
                                            label={`Fecha Renov. ${n}`}
                                            k={`fecha_renovacion_${n}`}
                                            {...fp}
                                        />
                                    </div>
                                </React.Fragment>
                            ))}
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

/* ─── Modal de confirmación de eliminación ─────────────────── */
function DeleteModal({ open, onClose, onConfirm, nombre }) {
    if (!open) return null;
    return (
        <div style={S.overlay} onClick={onClose}>
            <div
                style={{ ...S.modal, maxWidth: 420 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>Eliminar registro</span>
                    <button style={S.closeBtnWhite} onClick={onClose}>
                        <IconClose size={14} />
                    </button>
                </div>
                <div style={{ padding: "28px 28px 20px" }}>
                    <p style={{ color: "var(--text)", lineHeight: 1.6 }}>
                        ¿Eliminar la dotación de <strong>{nombre}</strong>? Esta
                        acción no se puede deshacer.
                    </p>
                </div>
                <div
                    style={{
                        ...S.modalFooter,
                        justifyContent: "space-between",
                    }}
                >
                    <button style={S.btnSecondary} onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        style={{ ...S.btnPrimary, background: "#e74c3c" }}
                        onClick={onConfirm}
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Componente principal ─────────────────────────────────── */
export default function PedidosAutomaticosCrud() {
    const [registros, setRegistros] = useState([]);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);

    const [filtroSede, setFiltroSede] = useState("Todas");
    const [filtroEstadoActa, setFiltroEstadoActa] = useState("Todos");
    const [filtroGenero, setFiltroGenero] = useState("Todos");
    const [filtroCargo, setFiltroCargo] = useState("Todos");
    const [filtroEstadoCont, setFiltroEstadoCont] = useState("Todos");
    const [filterOpen, setFilterOpen] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewTarget, setViewTarget] = useState(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const queryClient = useQueryClient();
    const [toast, setToast] = useState(null);
    const [pagina, setPagina] = useState(1);

    const { data: _qRegistros, isLoading: loading } = useQuery({
        queryKey: ["pedidos_automaticos"],
        queryFn: () => api.get("/pedidos-automaticos").then((r) => r.data),
    });
    const { data: _qOptions } = useQuery({
        queryKey: ["pedidos_automaticos_options"],
        queryFn: () => api.get("/pedidos-automaticos/options").then((r) => r.data),
    });
    const { data: _qEmpleados } = useQuery({
        queryKey: ["empleados"],
        queryFn: () => api.get("/empleados").then((r) => r.data),
    });

    useEffect(() => {
        if (_qRegistros) setRegistros(_qRegistros);
    }, [_qRegistros]);

    const options = useMemo(
        () => ({
            sedes: _qOptions?.sedes ?? [],
            cargos: _qOptions?.cargos ?? [],
            estados_acta: _qOptions?.estados_acta ?? ESTADOS_ACTA,
            estados_contrato: _qOptions?.estados_contrato ?? ESTADOS_CONT,
            generos: _qOptions?.generos ?? GENEROS,
        }),
        [_qOptions],
    );

    /* Bloquear scroll cuando algún overlay está abierto */
    React.useEffect(() => {
        const open = modalOpen || viewOpen || filterOpen || deleteOpen;
        document.documentElement.style.overflowY = open ? "hidden" : "";
        document.body.style.overflowY = open ? "hidden" : "";
        return () => {
            document.documentElement.style.overflowY = "";
            document.body.style.overflowY = "";
        };
    }, [modalOpen, viewOpen, filterOpen, deleteOpen]);

    /* Filtrado local */
    const filtered = useMemo(() => {
        const palabras = debouncedSearch
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        return registros.filter((r) => {
            const hay = [
                r.cedula,
                r.nombres,
                r.apellidos,
                r.cargo,
                r.sede,
                r.proyecto,
                r.pedido_inicial,
            ]
                .join(" ")
                .toLowerCase();
            const matchQ =
                palabras.length === 0 || palabras.every((p) => hay.includes(p));
            const matchS = filtroSede === "Todas" || r.sede === filtroSede;
            const matchA =
                filtroEstadoActa === "Todos" ||
                r.estado_acta === filtroEstadoActa;
            const matchG =
                filtroGenero === "Todos" || r.genero === filtroGenero;
            const matchC = filtroCargo === "Todos" || r.cargo === filtroCargo;
            const matchEC =
                filtroEstadoCont === "Todos" ||
                r.estado_contrato === filtroEstadoCont;
            return matchQ && matchS && matchA && matchG && matchC && matchEC;
        });
    }, [
        registros,
        debouncedSearch,
        filtroSede,
        filtroEstadoActa,
        filtroGenero,
        filtroCargo,
        filtroEstadoCont,
    ]);

    useEffect(
        () => setPagina(1),
        [
            debouncedSearch,
            filtroSede,
            filtroEstadoActa,
            filtroGenero,
            filtroCargo,
            filtroEstadoCont,
        ],
    );

    const totalPaginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));
    const paginated = useMemo(
        () => filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
        [filtered, pagina],
    );

    /* Indicadores */
    const total = registros.length;
    const firmadas = registros.filter(
        (r) => r.estado_acta === "Firmada",
    ).length;
    const proyectos = new Set(registros.map((r) => r.proyecto).filter(Boolean))
        .size;
    const sedesActivas = new Set(registros.map((r) => r.sede).filter(Boolean))
        .size;

    const handlePedidoGlobal = () => {
        const conItems = registros.filter((r) => {
            const has = [
                r.polo_masculino_talla, r.polo_masculino_cantidad,
                r.polo_femenino_talla, r.polo_femenino_cantidad,
                r.jean_masculino_talla, r.jean_masculino_cantidad,
                r.jean_femenino_talla, r.jean_femenino_cantidad,
                r.chaqueta_masculino_talla, r.chaqueta_masculino_cantidad,
                r.chaqueta_femenino_talla, r.chaqueta_femenino_cantidad,
                r.tenis_masculino_talla, r.tenis_masculino_cantidad,
                r.tenis_femenino_talla, r.tenis_femenino_cantidad,
            ];
            return has.some((v) => v !== null && v !== undefined && v !== "");
        });
        if (conItems.length === 0) {
            showToast("No hay registros con dotación asignada para crear un pedido global.");
            return;
        }
        const lastCounter = parseInt(localStorage.getItem("pedidos_globales_counter") || "0", 10);
        const newCounter = lastCounter + 1;
        const consecutivo = String(newCounter).padStart(5, "0");
        const items = conItems.map((r, idx) => {
            const empLabel = `${r.nombres ?? ""} ${r.apellidos ?? ""}`.trim();
            return {
                idx: idx + 1,
                etiqueta: `${String(idx + 1).padStart(5, "0")} - ${r.cedula} ${empLabel}`,
                cedula: r.cedula,
                nombres: r.nombres,
                apellidos: r.apellidos,
                sede: r.sede,
                cargo: r.cargo,
                genero: r.genero,
                polo_masculino_talla: r.polo_masculino_talla,
                polo_masculino_cantidad: r.polo_masculino_cantidad,
                polo_femenino_talla: r.polo_femenino_talla,
                polo_femenino_cantidad: r.polo_femenino_cantidad,
                jean_masculino_talla: r.jean_masculino_talla,
                jean_masculino_cantidad: r.jean_masculino_cantidad,
                jean_femenino_talla: r.jean_femenino_talla,
                jean_femenino_cantidad: r.jean_femenino_cantidad,
                chaqueta_masculino_talla: r.chaqueta_masculino_talla,
                chaqueta_masculino_cantidad: r.chaqueta_masculino_cantidad,
                chaqueta_femenino_talla: r.chaqueta_femenino_talla,
                chaqueta_femenino_cantidad: r.chaqueta_femenino_cantidad,
                tenis_masculino_talla: r.tenis_masculino_talla,
                tenis_masculino_cantidad: r.tenis_masculino_cantidad,
                tenis_femenino_talla: r.tenis_femenino_talla,
                tenis_femenino_cantidad: r.tenis_femenino_cantidad,
            };
        });
        const pedido = {
            id: Date.now(),
            consecutivo,
            fecha_creacion: new Date().toISOString().split("T")[0],
            estado: "Pendiente",
            total_empleados: items.length,
            items,
        };
        const existing = JSON.parse(localStorage.getItem("pedidos_globales") || "[]");
        existing.unshift(pedido);
        localStorage.setItem("pedidos_globales", JSON.stringify(existing));
        localStorage.setItem("pedidos_globales_counter", String(newCounter));
        showToast(`Pedido global ${consecutivo} creado con ${items.length} empleado(s). Revise la pestaña "Pedidos Global".`);
    };

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const clearFilters = () => {
        setSearch("");
        setFiltroSede("Todas");
        setFiltroEstadoActa("Todos");
        setFiltroGenero("Todos");
        setFiltroCargo("Todos");
        setFiltroEstadoCont("Todos");
    };

    /* CRUD */
    const openCreate = () => {
        setEditTarget(null);
        setModalOpen(true);
    };
    const openEdit = async (r) => {
        try {
            const { data: enriched } = await api.get(`/pedidos-automaticos/${r.id}/enriquecer`);
            setEditTarget(enriched);
        } catch {
            setEditTarget(r);
        }
        setModalOpen(true);
    };
    const openView = async (r) => {
        try {
            const { data: enriched } = await api.get(`/pedidos-automaticos/${r.id}/enriquecer`);
            setViewTarget(enriched);
        } catch {
            setViewTarget(r);
        }
        setViewOpen(true);
    };
    const openDelete = (r) => {
        setDeleteTarget(r);
        setDeleteOpen(true);
    };

    const handleSave = async (form) => {
        try {
            if (editTarget) {
                await api.put(`/pedidos-automaticos/${editTarget.id}`, form);
                const { data: fresh } = await api.get(
                    `/pedidos-automaticos/${editTarget.id}`,
                );
                setRegistros((prev) =>
                    prev.map((r) => (r.id === editTarget.id ? fresh : r)),
                );
                queryClient.invalidateQueries({ queryKey: ["pedidos_automaticos"] });
                showToast("Pedido automático actualizado correctamente.");
            } else {
                const { data: created } = await api.post("/pedidos-automaticos", form);
                setRegistros((prev) => [created, ...prev]);
                queryClient.invalidateQueries({ queryKey: ["pedidos_automaticos"] });
                showToast("Pedido automático registrado correctamente.");
            }
            setModalOpen(false);
        } catch (err) {
            console.error(
                "[Dotacion] API error:",
                err?.response?.status,
                err?.response?.data,
            );
            const msgs = err?.response?.data?.errors;
            const msg = msgs
                ? Object.values(msgs)[0][0]
                : (err?.response?.data?.message ??
                  `Error ${err?.response?.status ?? ""}: No se pudo guardar.`);
            showToast(msg);
            throw err;
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const targetId = deleteTarget.id;
        console.log("[Delete] targetId:", targetId, typeof targetId, "deleteTarget:", deleteTarget);
        try {
            await api.delete(`/pedidos-automaticos/${targetId}`);
            setRegistros((prev) => prev.filter((r) => r.id !== targetId));
            queryClient.invalidateQueries({ queryKey: ["pedidos_automaticos"] });
            showToast("Registro eliminado.");
        } catch (err) {
            console.error("[Delete] error:", err?.response?.status, err?.response?.data);
            showToast("No se pudo eliminar el registro.");
        } finally {
            setDeleteOpen(false);
            setDeleteTarget(null);
        }
    };

    const badgeActa = (estado) => {
        if (!estado) return S.badge("#f0f0f0", "#888");
        if (estado === "Firmada") return S.badge("#e0f7f4", "#0d6e5a");
        if (estado.includes("Pendiente")) return S.badge("#fff7e0", "#b7780c");
        return S.badge("#fce8e8", "#a33");
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            {/* ── Indicadores ── */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{total}</div>
                    <div className="stat-label">Total registros</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#27ae60" }}>
                        {firmadas}
                    </div>
                    <div className="stat-label">Actas firmadas</div>
                </div>
                <div className="stat-card">
                    <div
                        className="stat-num"
                        style={{ color: "var(--accent)" }}
                    >
                        {sedesActivas}
                    </div>
                    <div className="stat-label">Sedes con dotación</div>
                </div>
                <div className="stat-card">
                    <div
                        className="stat-num"
                        style={{ color: "var(--primary)" }}
                    >
                        {proyectos}
                    </div>
                    <div className="stat-label">Proyectos</div>
                </div>
            </div>

            {/* ── Toolbar ── */}
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
                            placeholder="Buscar por nombre, cédula, sede, proyecto…"
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
                                label: "Actas firmadas",
                                apply: () => {
                                    clearFilters();
                                    setFiltroEstadoActa("Firmada");
                                },
                            },
                            {
                                label: "Pendiente firma",
                                apply: () => {
                                    clearFilters();
                                    setFiltroEstadoActa("Pendiente firma");
                                },
                            },
                            {
                                label: "Género masculino",
                                apply: () => {
                                    clearFilters();
                                    setFiltroGenero("Masculino");
                                },
                            },
                            {
                                label: "Género femenino",
                                apply: () => {
                                    clearFilters();
                                    setFiltroGenero("Femenino");
                                },
                            },
                            {
                                label: "Contratos activos",
                                apply: () => {
                                    clearFilters();
                                    setFiltroEstadoCont("Activo");
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
    <button className="btn-primary" onClick={openCreate}>
        + Nueva dotación
    </button>
    <button
        style={{
            ...S.btnPrimary,
            background: '#8e44ad',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
        }}
        onClick={handlePedidoGlobal}
    >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
        </svg>
        Pedido Global
    </button>
</div>

            {/* ── Tabla ── */}
            <div style={S.tableWrap}>
                {loading ? (
                    <div style={S.empty}>
                        <IconLoading size={32} />
                        <p>Cargando registros…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p>
                            No se encontraron registros con los filtros
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
                                <th>Proyecto</th>
                                <th>Género</th>
                                <th>Estado Acta</th>
                                <th>Pedido Inicial</th>
                                <th style={{ textAlign: "center" }}>
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        <div style={S.avatarCell}>
                                            <div style={S.avatar}>
                                                {(r.nombres ?? "?")
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color: "var(--text)",
                                                }}
                                            >
                                                {r.nombres && r.apellidos
                                                    ? `${r.nombres} ${r.apellidos}`
                                                    : (r.nombres ?? "—")}
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
                                        {r.cedula ?? "—"}
                                    </td>
                                    <td style={{ fontSize: "0.84rem" }}>
                                        {r.cargo ?? "—"}
                                    </td>
                                    <td>
                                        {r.sede ? (
                                            <span
                                                style={S.badge(
                                                    "#e8f8f5",
                                                    "var(--primary-dark)",
                                                )}
                                            >
                                                {r.sede}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td
                                        style={{
                                            fontSize: "0.84rem",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        {r.proyecto ?? "—"}
                                    </td>
                                    <td>
                                        {r.genero ? (
                                            <span
                                                style={S.badge(
                                                    r.genero === "Masculino"
                                                        ? "#e8f0ff"
                                                        : "#fce8f5",
                                                    r.genero === "Masculino"
                                                        ? "#1a4fa8"
                                                        : "#8b267a",
                                                )}
                                            >
                                                {r.genero}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td>
                                        <span
                                            style={{
                                                ...badgeActa(r.estado_acta),
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
                                                        r.estado_acta ===
                                                        "Firmada"
                                                            ? "#27ae60"
                                                            : "#e5a020",
                                                    display: "inline-block",
                                                }}
                                            />
                                            {r.estado_acta ?? "—"}
                                        </span>
                                    </td>
                                    <td
                                        style={{
                                            fontFamily: "monospace",
                                            fontSize: "0.82rem",
                                        }}
                                    >
                                        {r.pedido_inicial ?? "—"}
                                    </td>
                                    <td>
                                        <div style={S.actions}>
                                            <button
                                                style={S.actionBtn(
                                                    "#e8f0ff",
                                                    "#1a4fa8",
                                                )}
                                                title="Ver"
                                                onClick={() => openView(r)}
                                            >
                                                <IconEye />
                                            </button>
                                            <button
                                                style={S.actionBtn(
                                                    "#e8f8f5",
                                                    "var(--primary-dark)",
                                                )}
                                                title="Editar"
                                                onClick={() => openEdit(r)}
                                            >
                                                <IconEdit />
                                            </button>
                                            <button
                                                style={S.actionBtn(
                                                    "#fce8e8",
                                                    "#c0392b",
                                                )}
                                                title="Eliminar"
                                                onClick={() => openDelete(r)}
                                            >
                                                <svg
                                                    width="13"
                                                    height="13"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6l-1 14H6L5 6" />
                                                    <path d="M10 11v6" />
                                                    <path d="M14 11v6" />
                                                    <path d="M9 6V4h6v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Paginación ── */}
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
                        {filtered.length !== registros.length
                            ? ` (filtrados de ${registros.length})`
                            : " registros"}
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
                                <span key={`e-${i}`} style={S.pageEllipsis}>
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
                initial={editTarget ? toForm(editTarget) : { ...EMPTY_FORM }}
                title={editTarget ? "Editar dotación" : "Registrar dotación"}
                options={options}
                empleados={_qEmpleados || []}
            />
            <Modal
                open={viewOpen}
                onClose={() => setViewOpen(false)}
                onSave={() => {}}
                initial={viewTarget ? toForm(viewTarget) : { ...EMPTY_FORM }}
                title="Ver dotación"
                options={options}
                empleados={_qEmpleados || []}
                readOnly
            />
            <DeleteModal
                open={deleteOpen}
                onClose={() => {
                    setDeleteOpen(false);
                    setDeleteTarget(null);
                }}
                onConfirm={handleDelete}
                nombre={
                    deleteTarget
                        ? `${deleteTarget.nombres ?? ""} ${deleteTarget.apellidos ?? ""}`.trim()
                        : ""
                }
            />

            {/* ── Modal de filtros ── */}
            {filterOpen && (
                <div style={S.overlay} onClick={() => setFilterOpen(false)}>
                    <div
                        style={{ ...S.modal, maxWidth: 700 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={S.modalHeaderGreen}>
                            <span style={S.modalTitleWhite}>
                                Filtros de búsqueda
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
                                    gridTemplateColumns: "repeat(2, 1fr)",
                                    gap: "16px 24px",
                                }}
                            >
                                <div style={S.formGroup}>
                                    <label style={S.label}>Sede</label>
                                    <SearchableSelect
                                        value={filtroSede}
                                        onChange={setFiltroSede}
                                        defaultValue="Todas"
                                        options={options.sedes.map((s) => ({
                                            label: s,
                                            value: s,
                                        }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Estado Acta</label>
                                    <SearchableSelect
                                        value={filtroEstadoActa}
                                        onChange={setFiltroEstadoActa}
                                        defaultValue="Todos"
                                        options={options.estados_acta.map(
                                            (s) => ({ label: s, value: s }),
                                        )}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Género</label>
                                    <SearchableSelect
                                        value={filtroGenero}
                                        onChange={setFiltroGenero}
                                        defaultValue="Todos"
                                        options={GENEROS.map((g) => ({
                                            label: g,
                                            value: g,
                                        }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Cargo</label>
                                    <SearchableSelect
                                        value={filtroCargo}
                                        onChange={setFiltroCargo}
                                        defaultValue="Todos"
                                        options={options.cargos.map((c) => ({
                                            label: c,
                                            value: c,
                                        }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>
                                        Estado Contrato
                                    </label>
                                    <SearchableSelect
                                        value={filtroEstadoCont}
                                        onChange={setFiltroEstadoCont}
                                        defaultValue="Todos"
                                        options={options.estados_contrato.map(
                                            (s) => ({ label: s, value: s }),
                                        )}
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

/* ─── Estilos ──────────────────────────────────────────────── */
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
    searchWrap: { position: "relative", flex: 1, minWidth: 220, maxWidth: 420 },
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
        animation: "fadeInUp 0.22s ease",
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
        cursor: "pointer",
        color: "#fff",
    },
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
    sectionHeader: {
        marginTop: 20,
        marginBottom: 4,
        padding: "8px 14px",
        background: "var(--primary)",
        color: "#fff",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.82rem",
        fontWeight: 800,
        letterSpacing: "0.05em",
        textAlign: "center",
    },
    sectionHeader2: {
        marginTop: 20,
        marginBottom: 0,
        padding: "7px 12px",
        background: "#e8f8f5",
        color: "var(--primary-dark)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.8rem",
        fontWeight: 800,
        letterSpacing: "0.04em",
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
        transition: "border 0.15s",
    },
    inputErr: { borderColor: "#e74c3c" },
    err: { color: "#e74c3c", fontSize: "0.75rem", marginTop: 2 },
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
