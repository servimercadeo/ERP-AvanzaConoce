import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import { SearchableSelect as FilterSelect, PresetFiltersDropdown } from "../components/SearchableSelect";
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

const ESTADOS_CONTRATO = ["Activo", "Inactivo", "Vencido", "Anulado"];
const TIPOS_CONTRATO = [
    "Término Fijo",
    "Término Indefinido",
    "Obra o Labor",
    "Prestación de Servicios",
    "Aprendizaje",
    "Ocasional",
];

const dateOnly = (v) => (v ? String(v).split("T")[0] : "");

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
        let val = e.target.value;
        if (uppercase) val = val.toUpperCase();
        onChange(key)(e);
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

function Modal({
    open,
    onClose,
    onSave,
    initial,
    title,
    empleados,
    catalogs,
    readOnly = false,
}) {
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState({});
    const [activeTab, setActive] = useState("principal");
    const [saving, setSaving] = useState(false);

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
            });
            setErrors({});
            setActive("principal");
            setSaving(false);
        }
    }, [initial, open]);

    const onChange = (k) => (e) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleAutoFill = (opt) => {
        setForm((f) => ({
            ...f,
            cargo:             opt.cargo             || f.cargo,
            sede:              opt.sede              || f.sede,
            tipo_vinculacion:  opt.tipo_vinculacion  || f.tipo_vinculacion,
            arl:               opt.arl               || f.arl,
            lps_afiliado:      opt.eps               || f.lps_afiliado,
            caja_compensacion: opt.caja_compensacion || f.caja_compensacion,
            fondo_pensiones:   opt.fondo_pensiones   || f.fondo_pensiones,
            empresa:           opt.empresa_nombre    || f.empresa,
            empleador:         opt.empleador         || f.empleador,
            jefe_inmediato:    opt.jefe_inmediato    || f.jefe_inmediato,
        }));
    };

    const addCentroCosto = () =>
        setForm((f) => ({
            ...f,
            centros_costos: [
                ...f.centros_costos,
                { centro_costos: "", porcentaje: 0 },
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
            centros_costos: f.centros_costos.map((cc, i) =>
                i === idx ? { ...cc, [k]: v } : cc,
            ),
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

    const validate = () => {
        const e = {};
        if (!form.empleado_id) e.empleado_id = "Requerido";
        if (!form.tipo_contrato) e.tipo_contrato = "Requerido";
        if (!form.cargo) e.cargo = "Requerido";
        if (!form.sede) e.sede = "Requerido";
        if (!form.fecha_ingreso) e.fecha_ingreso = "Requerido";
        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length) {
            setErrors(e);
            setActive("principal");
            return;
        }
        setSaving(true);
        try {
            await onSave(form);
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

                <div className="tab-bar" style={S.tabBar}>
                    {[
                        ["principal", "Información Principal"],
                        ["seguridad", "Seguridad Social"],
                        ["costos", "Costos y Anexos"],
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
                                <SearchableSelect
                                    label="Empleado"
                                    k="empleado_id"
                                    opts={empleados.map((e) => ({
                                        value: e.id,
                                        label: `${e.nombres} ${e.apellidos} (${e.cedula})`,
                                        cargo:             e.cargo,
                                        sede:              e.sede,
                                        tipo_vinculacion:  e.tipo_vinculacion,
                                        arl:               e.arl,
                                        eps:               e.eps,
                                        caja_compensacion: e.caja_compensacion,
                                        fondo_pensiones:   e.fondo_pensiones,
                                        empresa_nombre:    e.empresa?.nombre ?? '',
                                        empleador:         e.empleador,
                                        jefe_inmediato:    e.jefe_inmediato,
                                    }))}
                                    req
                                    form={form}
                                    errors={errors}
                                    onChange={onChange}
                                    onSelect={readOnly ? undefined : handleAutoFill}
                                    disabled={readOnly}
                                />
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
                                    {...fp}
                                />
                                <Field label="Empresa" k="empresa" {...fp} />
                                <Field
                                    label="Cliente / Proyecto"
                                    k="cliente_proyecto"
                                    {...fp}
                                />
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
                                    opts={catalogs.eps}
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
                                    opts={catalogs.bancos}
                                    {...fp}
                                />
                                <Field
                                    label="Fondo Cesantías"
                                    k="fondo_cesantias"
                                    opts={catalogs.bancos}
                                    {...fp}
                                />
                                <div />
                            </div>
                        </>
                    )}

                    {activeTab === "costos" && (
                        <>
                            <div style={S.sectionHeader}>CENTROS DE COSTO</div>
                            <div style={{ marginTop: 12 }}>
                                {form.centros_costos.map((cc, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            ...S.grid2,
                                            marginBottom: 10,
                                            alignItems: "end",
                                        }}
                                    >
                                        <Field
                                            label="Centro de Costos"
                                            k={`cc_${i}_name`}
                                            form={{
                                                [`cc_${i}_name`]:
                                                    cc.centro_costos,
                                            }}
                                            onChange={() => (e) =>
                                                updateCentroCosto(
                                                    i,
                                                    "centro_costos",
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
                                ))}
                                {!readOnly && (
                                    <button
                                        style={{
                                            ...S.btnSecondary,
                                            marginTop: 8,
                                            padding: "6px 12px",
                                            fontSize: "0.8rem",
                                        }}
                                        onClick={addCentroCosto}
                                    >
                                        + Agregar Centro de Costo
                                    </button>
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
        tipos_vinculacion: [],
    });
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewTarget, setViewTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toast, setToast] = useState(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [pagina, setPagina] = useState(1);

    const { data: _qContratos } = useQuery({ queryKey: ['contratos'], queryFn: () => api.get('/contratos').then(r => r.data) });
    const { data: _qEmpleados } = useQuery({ queryKey: ['empleados'], queryFn: () => api.get('/empleados').then(r => r.data) });
    const { data: _qCatalogos } = useQuery({ queryKey: ['catalogos'], queryFn: () => api.get('/catalogos').then(r => r.data) });

    useEffect(() => {
        if (_qContratos) { setContratos(_qContratos); setLoading(false); }
    }, [_qContratos]);
    useEffect(() => { if (_qEmpleados) setEmpleados(_qEmpleados); }, [_qEmpleados]);
    useEffect(() => { if (_qCatalogos) setCatalogs(_qCatalogos); }, [_qCatalogos]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resC, resE, resCat] = await Promise.all([
                api.get("/contratos"),
                api.get("/empleados"),
                api.get("/catalogos"),
            ]);
            setContratos(resC.data);
            setEmpleados(resE.data);
            setCatalogs(resCat.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPagina(1);
    }, [search, filtroEstado, filtroSede, filtroTipoContrato, filtroVinc, filtroCargo, filtroArl, filtroCaja, filtroEmpresa, filtroFondoPensiones]);

    useEffect(() => {
        const anyOpen = modalOpen || viewOpen || !!deleteTarget || filterOpen;
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
    }, [modalOpen, viewOpen, deleteTarget, filterOpen]);

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
                const matchE = filtroEstado === "Todos" || c.estado_contrato === filtroEstado;
                const matchS = filtroSede === "Todas" || c.sede === filtroSede;
                const matchTC = filtroTipoContrato === "Todos" || c.tipo_contrato === filtroTipoContrato;
                const matchV = filtroVinc === "Todos" || c.tipo_vinculacion === filtroVinc;
                const matchC = filtroCargo === "Todos" || c.cargo === filtroCargo;
                const matchArl = filtroArl === "Todas" || c.arl === filtroArl;
                const matchCaja = filtroCaja === "Todas" || c.caja_compensacion === filtroCaja;
                const matchEmp = filtroEmpresa === "Todas" || c.empresa === filtroEmpresa;
                const matchFP = filtroFondoPensiones === "Todos" || c.fondo_pensiones === filtroFondoPensiones;
                return matchQ && matchE && matchS && matchTC && matchV && matchC && matchArl && matchCaja && matchEmp && matchFP;
            }),
        [contratos, debouncedSearch, filtroEstado, filtroSede, filtroTipoContrato, filtroVinc, filtroCargo, filtroArl, filtroCaja, filtroEmpresa, filtroFondoPensiones],
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
            vencidos: contratos.filter((c) => c.estado_contrato === "Vencido")
                .length,
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
                showToast("Contrato actualizado.");
            } else {
                const { data } = await api.post("/contratos", form);
                setContratos((prev) => [data, ...prev]);
                showToast("Contrato creado.");
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

    const handleDelete = async () => {
        try {
            await api.delete(`/contratos/${deleteTarget.id}`);
            setContratos((prev) =>
                prev.filter((c) => c.id !== deleteTarget.id),
            );
            showToast("Contrato eliminado.");
        } catch {
            showToast("Error al eliminar.");
        }
        setDeleteTarget(null);
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
                    <div className="stat-num" style={{ color: "#e74c3c" }}>
                        {stats.vencidos}
                    </div>
                    <div className="stat-label">Vencidos</div>
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
                    <PresetFiltersDropdown presets={[
                        { label: "Contratos activos", apply: () => { clearFilters(); setFiltroEstado("Activo"); } },
                        { label: "Contratos vencidos", apply: () => { clearFilters(); setFiltroEstado("Vencido"); } },
                        { label: "Contratos inactivos", apply: () => { clearFilters(); setFiltroEstado("Inactivo"); } },
                        { label: "Contratos anulados", apply: () => { clearFilters(); setFiltroEstado("Anulado"); } },
                        { label: "Término fijo", apply: () => { clearFilters(); setFiltroTipoContrato("Término Fijo"); } },
                        { label: "Prestación de servicios", apply: () => { clearFilters(); setFiltroTipoContrato("Prestación de Servicios"); } },
                        { label: "Limpiar filtros", apply: () => clearFilters(), clear: true },
                    ]} />
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
                                            <div style={S.avatar}>
                                                {(c.empleado?.nombres || "?")
                                                    .charAt(0)
                                                    .toUpperCase()}
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
                                                    : "#fce8e8",
                                                c.estado_contrato === "Activo"
                                                    ? "#0d6e5a"
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
                                            <button
                                                style={S.actionBtn(
                                                    "#fce8e8",
                                                    "#a33",
                                                )}
                                                title="Eliminar"
                                                onClick={() =>
                                                    setDeleteTarget(c)
                                                }
                                            >
                                                <IconTrash />
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
                        Mostrando{" "}
                        {(pagina - 1) * POR_PAGINA + 1}–
                        {Math.min(pagina * POR_PAGINA, filtered.length)}{" "}
                        de {filtered.length} contratos
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
                                        style={S.pageBtn(false, item === pagina)}
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
                        style={{ ...S.modal, maxWidth: 860, maxHeight: "none", overflow: "visible" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={S.modalHeaderGreen}>
                            <span style={S.modalTitleWhite}>Filtros de Búsqueda</span>
                            <button style={S.closeBtnWhite} onClick={() => setFilterOpen(false)}>
                                <IconClose size={14} />
                            </button>
                        </div>
                        <div style={{ ...S.modalBody, overflowY: "visible", overflowX: "visible" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 24px" }}>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Estado</label>
                                    <FilterSelect
                                        value={filtroEstado}
                                        onChange={setFiltroEstado}
                                        defaultValue="Todos"
                                        options={ESTADOS_CONTRATO.map((s) => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Tipo de Contrato</label>
                                    <FilterSelect
                                        value={filtroTipoContrato}
                                        onChange={setFiltroTipoContrato}
                                        defaultValue="Todos"
                                        options={TIPOS_CONTRATO.map((s) => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Tipo de Vinculación</label>
                                    <FilterSelect
                                        value={filtroVinc}
                                        onChange={setFiltroVinc}
                                        defaultValue="Todos"
                                        options={catalogs.tipos_vinculacion.map((s) => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Sede</label>
                                    <FilterSelect
                                        value={filtroSede}
                                        onChange={setFiltroSede}
                                        defaultValue="Todas"
                                        options={catalogs.sedes.map((s) => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Cargo</label>
                                    <FilterSelect
                                        value={filtroCargo}
                                        onChange={setFiltroCargo}
                                        defaultValue="Todos"
                                        options={catalogs.cargos.map((s) => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>ARL</label>
                                    <FilterSelect
                                        value={filtroArl}
                                        onChange={setFiltroArl}
                                        defaultValue="Todas"
                                        options={catalogs.arls.map((s) => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Caja de Compensación</label>
                                    <FilterSelect
                                        value={filtroCaja}
                                        onChange={setFiltroCaja}
                                        defaultValue="Todas"
                                        options={catalogs.cajas.map((s) => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Empresa</label>
                                    <FilterSelect
                                        value={filtroEmpresa}
                                        onChange={setFiltroEmpresa}
                                        defaultValue="Todas"
                                        options={[...new Set(contratos.map((c) => c.empresa).filter(Boolean))].map((s) => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Fondo de Pensiones</label>
                                    <FilterSelect
                                        value={filtroFondoPensiones}
                                        onChange={setFiltroFondoPensiones}
                                        defaultValue="Todos"
                                        options={[...new Set(contratos.map((c) => c.fondo_pensiones).filter(Boolean))].map((s) => ({ label: s, value: s }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ ...S.modalFooter, justifyContent: "space-between" }}>
                            <button style={S.btnSecondary} onClick={clearFilters}>
                                Limpiar filtros
                            </button>
                            <div style={{ display: "flex", gap: 12 }}>
                                <button style={S.btnSecondary} onClick={() => setFilterOpen(false)}>
                                    Cancelar
                                </button>
                                <button style={S.btnPrimary} onClick={() => setFilterOpen(false)}>
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
            />

            <Modal
                open={viewOpen}
                onClose={() => setViewOpen(false)}
                initial={viewTarget || EMPTY_FORM}
                title="Ver Contrato"
                empleados={empleados}
                catalogs={catalogs}
                readOnly
            />

            {deleteTarget && (
                <div style={S.overlay} onClick={() => setDeleteTarget(null)}>
                    <div
                        style={{ ...S.modal, maxWidth: 400 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={S.modalHeaderGreen}>
                            <span style={S.modalTitleWhite}>Eliminar</span>
                            <button
                                style={S.closeBtnWhite}
                                onClick={() => setDeleteTarget(null)}
                            >
                                <IconClose size={14} />
                            </button>
                        </div>
                        <div style={{ padding: 28 }}>
                            <p>
                                ¿Seguro de eliminar el contrato de{" "}
                                <b>{deleteTarget.empleado?.apellidos}</b>?
                            </p>
                        </div>
                        <div style={S.modalFooter}>
                            <button
                                style={S.btnSecondary}
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                style={{
                                    ...S.btnPrimary,
                                    background: "#e74c3c",
                                }}
                                onClick={handleDelete}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
