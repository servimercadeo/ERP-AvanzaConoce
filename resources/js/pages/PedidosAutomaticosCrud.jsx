import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import {
    IconSearch,
    IconEye,
    IconEdit,
    IconTrash,
    IconClose,
    IconEmptySearch,
    IconLoading,
    IconLayers,
    IconLock,
    IconCalendar,
    IconWarning,
} from "../components/Icons";

const POR_PAGINA = 8;
const ESTADOS = ["Pendiente", "Activo", "Completado", "Cancelado"];

function parseDateLocal(str) {
    return new Date(String(str).split("T")[0] + "T00:00:00");
}
function fmtDateCron(d) {
    return d.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
function computeCronDates(fechaEntrega, cicloMeses) {
    const n = Number(cicloMeses) || 4;
    const entrega = parseDateLocal(fechaEntrega);
    const inicio = new Date(entrega);
    inicio.setMonth(inicio.getMonth() - n);
    const corte = new Date(inicio);
    corte.setMonth(corte.getMonth() + Math.floor(n / 2));
    return { inicio, corte, entrega };
}
const ESTADO_LABEL = {
    Pendiente: "Pendiente",
    Activo: "En proceso",
    Completado: "Completado",
    Cancelado: "Cancelado",
};

const dateOnly = (v) => (v ? String(v).split("T")[0] : "");

const EMPTY_FORM = {
    empleado_id: "",
    contrato_id: "",
    estado: "Activo",
    fecha_pedido: new Date().toISOString().split("T")[0],
    notas: "",
    items: [],
};

// ── Selector de empleado con búsqueda ──────────────────────────────────────
function EmpleadoSearchSelect({ empleados, value, onChange, disabled, error }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    const selected = empleados.find((e) => String(e.id) === String(value));

    const filtered = useMemo(() => {
        const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (!words.length) return empleados.slice(0, 60);
        return empleados
            .filter((e) => {
                const txt =
                    `${e.nombres} ${e.apellidos} ${e.cedula}`.toLowerCase();
                return words.every((w) => txt.includes(w));
            })
            .slice(0, 60);
    }, [query, empleados]);

    useEffect(() => {
        const h = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    return (
        <div ref={wrapRef} style={{ position: "relative" }}>
            <input
                style={{
                    ...S.input,
                    ...(error ? S.inputErr : {}),
                    ...(disabled ? S.inputDisabled : {}),
                }}
                value={
                    open
                        ? query
                        : selected
                          ? `${selected.nombres} ${selected.apellidos} (${selected.cedula})`
                          : ""
                }
                placeholder="Buscar empleado…"
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                    if (!e.target.value) onChange("");
                }}
                onFocus={() => {
                    if (!disabled) setOpen(true);
                }}
                disabled={disabled}
            />
            {open && !disabled && (
                <div style={S.dropdown}>
                    {filtered.length === 0 ? (
                        <div style={S.dropdownEmpty}>Sin resultados</div>
                    ) : (
                        filtered.map((e) => (
                            <div
                                key={e.id}
                                style={{
                                    ...S.dropdownItem,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    background:
                                        String(e.id) === String(value)
                                            ? "#e8f8f5"
                                            : "var(--white)",
                                }}
                                onMouseDown={() => {
                                    onChange(e.id);
                                    setOpen(false);
                                    setQuery("");
                                }}
                                onMouseEnter={(ev) =>
                                    (ev.currentTarget.style.background =
                                        "#f0f9f7")
                                }
                                onMouseLeave={(ev) =>
                                    (ev.currentTarget.style.background =
                                        String(e.id) === String(value)
                                            ? "#e8f8f5"
                                            : "var(--white)")
                                }
                            >
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        background: "var(--primary)",
                                        color: "#fff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 800,
                                        fontSize: "0.85rem",
                                        flexShrink: 0,
                                        overflow: "hidden",
                                        position: "relative",
                                    }}
                                >
                                    {(e.nombres || "?").charAt(0).toUpperCase()}
                                    {e.fotografia && (
                                        <img
                                            src={`/storage/${e.fotografia}`}
                                            alt=""
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                borderRadius: "50%",
                                            }}
                                            onError={(ev) => {
                                                ev.currentTarget.style.display =
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
                                        }}
                                    >
                                        {e.nombres} {e.apellidos}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.78rem",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        C.C. {e.cedula}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
            {error && <span style={S.err}>{error}</span>}
        </div>
    );
}

// ── Selector de item de inventario ─────────────────────────────────────────
// Mapea categoría/subcategoría del ítem a la talla correspondiente del empleado
function tallaPorCategoria(categoria, subcategoria, tallasEmpleado) {
    if (!tallasEmpleado) return null;
    const txt = `${categoria} ${subcategoria}`.toLowerCase();
    if (/polo|camisa|camiseta|chaqueta|blusa|buzo|sudadera|chaleco/.test(txt))
        return tallasEmpleado.talla_camisa || null;
    if (/pantalon|jean|short|bermuda|licra/.test(txt))
        return tallasEmpleado.talla_pantalon || null;
    if (/zapato|tenis|bota|calzado|zapatilla/.test(txt))
        return tallasEmpleado.talla_zapatos || null;
    return null;
}

function InventarioItemSelect({
    inventarioFlat,
    value,
    onChange,
    disabled,
    generoEmpleado,
    tallasEmpleado,
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [rect, setRect] = useState(null);
    const wrapRef = useRef(null);
    const inputRef = useRef(null);

    const selected = inventarioFlat.find((i) => String(i.id) === String(value));

    const filtered = useMemo(() => {
        const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        let base = inventarioFlat.filter((i) => i.cantidad > 0);

        // Filtro talla: para cada ítem, buscar la talla que le corresponde según categoría
        if (tallasEmpleado) {
            base = base.filter((i) => {
                const tallaEsperada = tallaPorCategoria(
                    i.categoria,
                    i.subcategoria,
                    tallasEmpleado,
                );
                if (!tallaEsperada) return true; // sin mapeo conocido → mostrar siempre
                return i.talla?.toLowerCase() === tallaEsperada.toLowerCase();
            });
        }

        if (!words.length) return base.slice(0, 80);
        return base
            .filter((i) => {
                const txt =
                    `${i.categoria} ${i.subcategoria} ${i.genero} ${i.talla}`.toLowerCase();
                return words.every((w) => txt.includes(w));
            })
            .slice(0, 80);
    }, [query, inventarioFlat, generoEmpleado, tallasEmpleado]);

    useEffect(() => {
        const h = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const handleOpen = () => {
        if (disabled) return;
        if (inputRef.current) {
            setRect(inputRef.current.getBoundingClientRect());
        }
        setOpen(true);
    };

    const label = selected
        ? `${selected.categoria} · ${selected.subcategoria} · ${selected.genero} · T:${selected.talla} (${selected.cantidad} disp.)`
        : "";

    const dropdown =
        open &&
        !disabled &&
        rect &&
        createPortal(
            <div
                style={{
                    position: "fixed",
                    top: rect.bottom + 2,
                    left: rect.left,
                    width: rect.width,
                    background: "var(--white)",
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                    zIndex: 99999,
                    maxHeight: 280,
                    overflowY: "auto",
                }}
            >
                {filtered.length === 0 ? (
                    <div style={S.dropdownEmpty}>Sin stock disponible</div>
                ) : (
                    filtered.map((i) => (
                        <div
                            key={i.id}
                            style={{
                                ...S.dropdownItem,
                                background:
                                    String(i.id) === String(value)
                                        ? "#e8f8f5"
                                        : "var(--white)",
                            }}
                            onMouseDown={() => {
                                onChange(i);
                                setOpen(false);
                                setQuery("");
                            }}
                            onMouseEnter={(ev) =>
                                (ev.currentTarget.style.background = "#f0f9f7")
                            }
                            onMouseLeave={(ev) =>
                                (ev.currentTarget.style.background =
                                    String(i.id) === String(value)
                                        ? "#e8f8f5"
                                        : "var(--white)")
                            }
                        >
                            <span style={{ fontWeight: 700 }}>
                                {i.categoria} · {i.subcategoria}
                            </span>
                            <span
                                style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.8rem",
                                    marginLeft: 6,
                                }}
                            >
                                {i.genero} · T:{i.talla}
                            </span>
                            <span
                                style={{
                                    marginLeft: "auto",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    color:
                                        i.cantidad <= 3 ? "#c0392b" : "#0d6e5a",
                                    background:
                                        i.cantidad <= 3 ? "#fce8e8" : "#e0f7f4",
                                    borderRadius: 10,
                                    padding: "1px 7px",
                                }}
                            >
                                {i.cantidad} disp.
                            </span>
                        </div>
                    ))
                )}
            </div>,
            document.body,
        );

    return (
        <div
            ref={wrapRef}
            style={{ position: "relative", flex: 1, minWidth: 0 }}
        >
            <input
                ref={inputRef}
                style={{ ...S.input, ...(disabled ? S.inputDisabled : {}) }}
                value={open ? query : label}
                placeholder="Buscar prenda…"
                onChange={(e) => {
                    setQuery(e.target.value);
                    handleOpen();
                    if (!e.target.value) onChange(null);
                }}
                onFocus={handleOpen}
                disabled={disabled}
            />
            {dropdown}
        </div>
    );
}

// ── Modal crear / editar / ver ─────────────────────────────────────────────
function Modal({
    open,
    onClose,
    onSave,
    initial,
    title,
    empleados,
    contratos,
    inventarioFlat,
    cronogramas = [],
    readOnly,
    queryClient,
}) {
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState({});
    const [activeTab, setActive] = useState("info");
    const [saving, setSaving] = useState(false);
    const [pedidoPrevio, setPedidoPrevio] = useState(null);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [tallasEdit, setTallasEdit] = useState({
        talla_camisa: "",
        talla_pantalon: "",
        talla_zapatos: "",
    });
    const [tallasOrig, setTallasOrig] = useState({
        talla_camisa: "",
        talla_pantalon: "",
        talla_zapatos: "",
    });

    const isNuevo = !initial?.id;

    useEffect(() => {
        if (open) {
            setForm({
                ...initial,
                fecha_pedido: dateOnly(initial.fecha_pedido),
                items: initial.items || [],
            });
            setErrors({});
            setActive("info");
            setSaving(false);
            setPedidoPrevio(null);
            const emp = empleados.find(
                (e) => String(e.id) === String(initial.empleado_id),
            );
            const t = {
                talla_camisa: emp?.talla_camisa ?? "",
                talla_pantalon: emp?.talla_pantalon ?? "",
                talla_zapatos: emp?.talla_zapatos ?? "",
            };
            setTallasEdit(t);
            setTallasOrig(t);
        }
    }, [initial, open]);

    const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
    const setEv = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    // ── Items ──
    const addItem = () =>
        setForm((f) => ({
            ...f,
            items: [
                ...f.items,
                { inventario_dotacion_id: "", cantidad: 1, _inv: null },
            ],
        }));

    const removeItem = (idx) =>
        setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

    const updateItemInv = (idx, inv) =>
        setForm((f) => ({
            ...f,
            items: f.items.map((it, i) =>
                i === idx
                    ? {
                          ...it,
                          inventario_dotacion_id: inv ? inv.id : "",
                          _inv: inv,
                      }
                    : it,
            ),
        }));

    const updateItemCantidad = (idx, val) =>
        setForm((f) => ({
            ...f,
            items: f.items.map((it, i) =>
                i === idx ? { ...it, cantidad: Number(val) } : it,
            ),
        }));

    // Inventario disponible ajustado: para items de edición, sumamos de vuelta lo que ya tenía asignado
    // para mostrar el stock real disponible en el selector
    const inventarioAjustado = useMemo(() => {
        if (initial?.id && initial.estado === "Activo") {
            // sumamos lo que el pedido actual ya tenía asignado
            const mapa = {};
            (initial.items || []).forEach((it) => {
                const id = it.inventario_dotacion_id ?? it.inventario?.id;
                if (id) mapa[id] = (mapa[id] || 0) + it.cantidad;
            });
            return inventarioFlat.map((i) => ({
                ...i,
                cantidad: i.cantidad + (mapa[i.id] || 0),
            }));
        }
        return inventarioFlat;
    }, [inventarioFlat, initial]);

    const validate = () => {
        const e = {};
        if (!form.empleado_id) e.empleado_id = "Requerido";
        if (!form.fecha_pedido) e.fecha_pedido = "Requerido";
        if (form.estado === "Activo") {
            form.items.forEach((it, idx) => {
                if (!it.inventario_dotacion_id)
                    e[`item_${idx}_inv`] = "Selecciona una prenda";
                if (!it.cantidad || it.cantidad < 1)
                    e[`item_${idx}_cant`] = "Mín. 1";
                const inv = inventarioAjustado.find(
                    (i) => String(i.id) === String(it.inventario_dotacion_id),
                );
                if (inv && it.cantidad > inv.cantidad)
                    e[`item_${idx}_cant`] = `Máx. disponible: ${inv.cantidad}`;
            });
        }
        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length) {
            setErrors(e);
            return;
        }
        setSaving(true);
        try {
            // Siempre sincronizar tallas al guardar: así users y respuestas_ingresos quedan consistentes
            if (form.empleado_id) {
                await api.patch(
                    `/empleados/${form.empleado_id}/tallas`,
                    tallasEdit,
                );
                if (queryClient) {
                    queryClient.setQueryData(["empleados"], (prev = []) =>
                        prev.map((emp) =>
                            String(emp.id) === String(form.empleado_id)
                                ? { ...emp, ...tallasEdit }
                                : emp,
                        ),
                    );
                }
                setTallasOrig({ ...tallasEdit });
            }
            await onSave(form);
        } catch {
            /* el padre muestra el toast de error */
        } finally {
            setSaving(false);
        }
    };

    const contratosFiltrados = contratos.filter(
        (c) => String(c.empleado_id) === String(form.empleado_id),
    );

    const generoEmpleado = useMemo(() => {
        const emp = empleados.find(
            (e) => String(e.id) === String(form.empleado_id),
        );
        const g = emp?.genero ?? null;
        const validos = ["masculino", "femenino", "otro"];
        return g && validos.includes(g.toLowerCase()) ? g : null;
    }, [empleados, form.empleado_id]);

    const tallasEmpleado = useMemo(() => {
        if (!form.empleado_id) return null;
        const t = {
            talla_camisa: tallasEdit.talla_camisa,
            talla_pantalon: tallasEdit.talla_pantalon,
            talla_zapatos: tallasEdit.talla_zapatos,
        };
        return t.talla_camisa || t.talla_pantalon || t.talla_zapatos ? t : null;
    }, [form.empleado_id, tallasEdit]);

    const cronogramaInfo = useMemo(() => {
        if (!form.contrato_id) return null;
        const contrato = contratos.find(
            (c) => String(c.id) === String(form.contrato_id),
        );
        if (!contrato?.cliente_proyecto) return null;
        const cron = cronogramas.find(
            (c) => c.proyecto?.nombre === contrato.cliente_proyecto,
        );
        if (!cron?.fecha_entrega) return null;
        const { inicio, corte, entrega } = computeCronDates(
            cron.fecha_entrega,
            cron.ciclo_meses,
        );
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const locked = today >= corte;
        return {
            nombre: contrato.cliente_proyecto,
            inicio,
            corte,
            entrega,
            cicloMeses: cron.ciclo_meses,
            locked,
        };
    }, [form.contrato_id, contratos, cronogramas]);

    if (!open) return null;

    return (
        <div style={S.overlay} onClick={onClose}>
            <div
                style={{ ...S.modal, maxWidth: 860 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={S.modalHeader}>
                    <span style={S.modalTitle}>{title}</span>
                    <button style={S.closeBtn} onClick={onClose}>
                        <IconClose size={14} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={S.tabBar}>
                    {[
                        ["info", "Información"],
                        ["items", "Items de Dotación"],
                    ].map(([key, lbl]) => (
                        <button
                            key={key}
                            style={activeTab === key ? S.tabActive : S.tab}
                            onClick={() => setActive(key)}
                        >
                            {lbl}
                            {key === "items" && form.items.length > 0 && (
                                <span style={S.tabBadge}>
                                    {form.items.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div style={S.modalBody}>
                    {activeTab === "info" && (
                        <>
                            <div style={S.grid2}>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Empleado *</label>
                                    <EmpleadoSearchSelect
                                        empleados={empleados}
                                        value={form.empleado_id}
                                        onChange={async (v) => {
                                            const contrato = contratos.filter(
                                                (c) =>
                                                    String(c.empleado_id) ===
                                                    String(v),
                                            )[0];
                                            setForm((f) => ({
                                                ...f,
                                                empleado_id: v,
                                                contrato_id: contrato?.id ?? "",
                                                items: [],
                                            }));
                                            // Sincronizar tallas con el nuevo empleado
                                            const emp = empleados.find(
                                                (e) =>
                                                    String(e.id) === String(v),
                                            );
                                            const t = {
                                                talla_camisa:
                                                    emp?.talla_camisa ?? "",
                                                talla_pantalon:
                                                    emp?.talla_pantalon ?? "",
                                                talla_zapatos:
                                                    emp?.talla_zapatos ?? "",
                                            };
                                            setTallasEdit(t);
                                            setTallasOrig(t);
                                            setPedidoPrevio(null);
                                            if (v && isNuevo) {
                                                setLoadingHistorial(true);
                                                try {
                                                    const { data } =
                                                        await api.get(
                                                            `/pedidos-automaticos/ultimo-empleado/${v}`,
                                                        );
                                                    if (
                                                        data &&
                                                        data.items &&
                                                        data.items.length > 0
                                                    ) {
                                                        const itemsPreCargados =
                                                            data.items.map(
                                                                (it) => ({
                                                                    inventario_dotacion_id:
                                                                        it.inventario_dotacion_id,
                                                                    cantidad:
                                                                        it.cantidad,
                                                                    _inv:
                                                                        it.inventario ??
                                                                        null,
                                                                    inventario:
                                                                        it.inventario ??
                                                                        null,
                                                                }),
                                                            );
                                                        setForm((f) => ({
                                                            ...f,
                                                            items: itemsPreCargados,
                                                        }));
                                                        setPedidoPrevio(data);
                                                    }
                                                } catch {
                                                    // silencioso — si falla, el usuario agrega items manualmente
                                                } finally {
                                                    setLoadingHistorial(false);
                                                }
                                            }
                                        }}
                                        disabled={readOnly}
                                        error={errors.empleado_id}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>
                                        Contrato vinculado
                                    </label>
                                    <div
                                        style={{
                                            ...S.input,
                                            ...S.inputDisabled,
                                            minHeight: 38,
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                    >
                                        {contratosFiltrados[0]
                                            ? `C.C. ${contratosFiltrados[0].empleado?.cedula ?? "—"} · ${contratosFiltrados[0].tipo_contrato ?? "—"} · ${dateOnly(contratosFiltrados[0].fecha_ingreso)}`
                                            : "Sin contrato vinculado"}
                                    </div>
                                </div>
                            </div>
                            {cronogramaInfo && (
                                <div
                                    style={{
                                        marginTop: 14,
                                        padding: "12px 16px",
                                        background: cronogramaInfo.locked
                                            ? "#fff8e0"
                                            : "#f0f9f7",
                                        border: `1.5px solid ${cronogramaInfo.locked ? "#f9c74f" : "#a7f3d0"}`,
                                        borderRadius: 8,
                                        fontSize: "0.82rem",
                                        color: cronogramaInfo.locked
                                            ? "#7a5c00"
                                            : "#065f46",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 800,
                                            marginBottom: 8,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        {cronogramaInfo.locked ? (
                                            <IconWarning size={14} />
                                        ) : (
                                            <IconCalendar size={14} />
                                        )}{" "}
                                        Cronograma · {cronogramaInfo.nombre}
                                        {cronogramaInfo.locked && (
                                            <span
                                                style={{
                                                    fontWeight: 600,
                                                    fontSize: "0.76rem",
                                                    background: "#fef3c7",
                                                    borderRadius: 10,
                                                    padding: "1px 8px",
                                                    color: "#92400e",
                                                }}
                                            >
                                                Superó punto de corte — solo
                                                lectura
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "repeat(3, 1fr)",
                                            gap: 8,
                                        }}
                                    >
                                        {[
                                            {
                                                label: "Inicio",
                                                value: fmtDateCron(
                                                    cronogramaInfo.inicio,
                                                ),
                                            },
                                            {
                                                label: "Corte (pedido global)",
                                                value: fmtDateCron(
                                                    cronogramaInfo.corte,
                                                ),
                                                warn: cronogramaInfo.locked,
                                            },
                                            {
                                                label: "Entrega",
                                                value: fmtDateCron(
                                                    cronogramaInfo.entrega,
                                                ),
                                            },
                                        ].map(({ label, value, warn }) => (
                                            <div key={label}>
                                                <div
                                                    style={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 700,
                                                        textTransform:
                                                            "uppercase",
                                                        letterSpacing: "0.04em",
                                                        opacity: 0.7,
                                                    }}
                                                >
                                                    {label}
                                                </div>
                                                <div
                                                    style={{
                                                        fontWeight: 800,
                                                        fontSize: "0.88rem",
                                                        color: warn
                                                            ? "#b45309"
                                                            : "inherit",
                                                    }}
                                                >
                                                    {value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ ...S.grid2, marginTop: 16 }}>
                                <div style={S.formGroup}>
                                    <label style={S.label}>
                                        Fecha pedido *
                                    </label>
                                    <input
                                        type="date"
                                        style={{
                                            ...S.input,
                                            ...(errors.fecha_pedido
                                                ? S.inputErr
                                                : {}),
                                            ...(readOnly
                                                ? S.inputDisabled
                                                : {}),
                                        }}
                                        value={form.fecha_pedido}
                                        onChange={setEv("fecha_pedido")}
                                        disabled={readOnly}
                                    />
                                    {errors.fecha_pedido && (
                                        <span style={S.err}>
                                            {errors.fecha_pedido}
                                        </span>
                                    )}
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Estado</label>
                                    <select
                                        style={{
                                            ...S.input,
                                            ...(readOnly
                                                ? S.inputDisabled
                                                : {}),
                                        }}
                                        value={form.estado}
                                        onChange={setEv("estado")}
                                        disabled={readOnly}
                                    >
                                        {ESTADOS.map((s) => (
                                            <option key={s} value={s}>
                                                {ESTADO_LABEL[s] ?? s}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: 16 }}>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Notas</label>
                                    <textarea
                                        style={{
                                            ...S.input,
                                            minHeight: 72,
                                            resize: readOnly
                                                ? "none"
                                                : "vertical",
                                            ...(readOnly
                                                ? S.inputDisabled
                                                : {}),
                                        }}
                                        value={form.notas ?? ""}
                                        onChange={setEv("notas")}
                                        disabled={readOnly}
                                    />
                                </div>
                            </div>

                            {pedidoPrevio && isNuevo && !loadingHistorial && (
                                <div
                                    style={{
                                        marginTop: 16,
                                        padding: "12px 16px",
                                        background: "#e8f8f5",
                                        border: "1.5px solid #6fcfbd",
                                        borderRadius: "var(--radius-sm)",
                                        fontSize: "0.85rem",
                                        color: "#0d6e5a",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                    }}
                                >
                                    <svg
                                        style={{ flexShrink: 0 }}
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="1 4 1 10 7 10" />
                                        <polyline points="23 20 23 14 17 14" />
                                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                                    </svg>
                                    <span>
                                        Este empleado ya recibió dotación. Se
                                        pre-cargaron{" "}
                                        <strong>
                                            {pedidoPrevio.items.length} prenda
                                            {pedidoPrevio.items.length !== 1
                                                ? "s"
                                                : ""}
                                        </strong>{" "}
                                        desde el pedido{" "}
                                        <strong>#{pedidoPrevio.codigo}</strong>.
                                    </span>
                                </div>
                            )}

                            {/* Tallas del empleado — editables */}
                            {form.empleado_id && (
                                <div
                                    style={{
                                        marginTop: 20,
                                        padding: "14px 16px",
                                        background: "var(--bg)",
                                        border: "1.5px solid var(--border)",
                                        borderRadius: "var(--radius-sm)",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "0.78rem",
                                            fontWeight: 800,
                                            color: "var(--primary)",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                            marginBottom: 12,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                        }}
                                    >
                                        Tallas del empleado
                                        {!readOnly && (
                                            <span
                                                style={{
                                                    fontWeight: 400,
                                                    fontSize: "0.72rem",
                                                    color: "var(--text-muted)",
                                                    textTransform: "none",
                                                    letterSpacing: 0,
                                                }}
                                            >
                                                (se guardan con el pedido)
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "repeat(3, 1fr)",
                                            gap: 12,
                                        }}
                                    >
                                        {[
                                            {
                                                label: "Camisa / Chaqueta",
                                                key: "talla_camisa",
                                            },
                                            {
                                                label: "Pantalón / Jean",
                                                key: "talla_pantalon",
                                            },
                                            {
                                                label: "Zapatos / Tenis",
                                                key: "talla_zapatos",
                                            },
                                        ].map(({ label, key }) => (
                                            <div key={key} style={S.formGroup}>
                                                <label style={S.label}>
                                                    {label}
                                                </label>
                                                {readOnly ? (
                                                    <div
                                                        style={{
                                                            ...S.input,
                                                            ...S.inputDisabled,
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            fontWeight: 700,
                                                            color: tallasEdit[
                                                                key
                                                            ]
                                                                ? "var(--primary)"
                                                                : "var(--text-muted)",
                                                        }}
                                                    >
                                                        {tallasEdit[key] ||
                                                            "Sin registro"}
                                                    </div>
                                                ) : (
                                                    <input
                                                        style={{
                                                            ...S.input,
                                                            fontWeight: 700,
                                                            color: tallasEdit[
                                                                key
                                                            ]
                                                                ? "var(--primary)"
                                                                : "var(--text)",
                                                        }}
                                                        value={tallasEdit[key]}
                                                        placeholder="Sin registro"
                                                        onChange={(e) =>
                                                            setTallasEdit(
                                                                (t) => ({
                                                                    ...t,
                                                                    [key]: e
                                                                        .target
                                                                        .value,
                                                                }),
                                                            )
                                                        }
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === "items" && (
                        <>
                            {form.estado === "Cancelado" && (
                                <div style={S.alertaBanner}>
                                    El pedido está cancelado. Los items fueron
                                    devueltos al inventario.
                                </div>
                            )}
                            {form.estado === "Pendiente" && !readOnly && (
                                <div
                                    style={{
                                        ...S.alertaBanner,
                                        background: "#fff8e0",
                                        color: "#856404",
                                        border: "1px solid #ffd700",
                                    }}
                                >
                                    Estado <strong>Pendiente</strong>: los items
                                    NO descontarán inventario hasta que el
                                    pedido sea <strong>Activo</strong>.
                                </div>
                            )}
                            {loadingHistorial && (
                                <div
                                    style={{
                                        ...S.alertaBanner,
                                        background: "#e8f4ff",
                                        color: "#1a5fa8",
                                        border: "1px solid #b3d4f5",
                                    }}
                                >
                                    Buscando historial de dotación…
                                </div>
                            )}

                            <div style={{ marginTop: 12 }}>
                                {form.items.length === 0 && (
                                    <div
                                        style={{
                                            textAlign: "center",
                                            padding: "28px 16px",
                                            color: "var(--text-muted)",
                                            fontSize: "0.88rem",
                                        }}
                                    >
                                        Sin items asignados.
                                        {!readOnly &&
                                            " Haz clic en «+ Agregar prenda» para comenzar."}
                                    </div>
                                )}
                                {form.items.map((it, idx) => {
                                    const invRow = inventarioAjustado.find(
                                        (i) =>
                                            String(i.id) ===
                                            String(it.inventario_dotacion_id),
                                    );
                                    const maxDisp = invRow
                                        ? invRow.cantidad
                                        : Infinity;

                                    const displayInv =
                                        it._inv ||
                                        (it.inventario
                                            ? {
                                                  id: it.inventario.id,
                                                  categoria:
                                                      it.inventario.categoria,
                                                  subcategoria:
                                                      it.inventario
                                                          .subcategoria,
                                                  genero: it.inventario.genero,
                                                  talla: it.inventario.talla,
                                                  cantidad:
                                                      it.inventario.cantidad,
                                              }
                                            : null);

                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                display: "flex",
                                                gap: 10,
                                                alignItems: "flex-end",
                                                marginBottom: 10,
                                            }}
                                        >
                                            {readOnly ? (
                                                <div
                                                    style={{
                                                        ...S.input,
                                                        flex: 1,
                                                        minWidth: 0,
                                                        background: "var(--bg)",
                                                        color: "var(--text-muted)",
                                                        cursor: "default",
                                                        display: "flex",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    {displayInv
                                                        ? `${displayInv.categoria} · ${displayInv.subcategoria} · ${displayInv.genero} · T:${displayInv.talla}`
                                                        : `Item #${it.inventario_dotacion_id}`}
                                                </div>
                                            ) : (
                                                <InventarioItemSelect
                                                    inventarioFlat={
                                                        inventarioAjustado
                                                    }
                                                    value={
                                                        it.inventario_dotacion_id
                                                    }
                                                    onChange={(inv) =>
                                                        updateItemInv(idx, inv)
                                                    }
                                                    disabled={readOnly}
                                                    generoEmpleado={
                                                        generoEmpleado
                                                    }
                                                    tallasEmpleado={
                                                        tallasEmpleado
                                                    }
                                                />
                                            )}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 4,
                                                    minWidth: 90,
                                                }}
                                            >
                                                <label
                                                    style={{
                                                        ...S.label,
                                                        fontSize: "0.72rem",
                                                    }}
                                                >
                                                    Cantidad
                                                    {invRow && !readOnly
                                                        ? ` (máx ${maxDisp})`
                                                        : ""}
                                                </label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={maxDisp}
                                                    style={{
                                                        ...S.input,
                                                        width: 90,
                                                        ...(errors[
                                                            `item_${idx}_cant`
                                                        ]
                                                            ? S.inputErr
                                                            : {}),
                                                        ...(readOnly
                                                            ? S.inputDisabled
                                                            : {}),
                                                    }}
                                                    value={it.cantidad}
                                                    onChange={(e) =>
                                                        updateItemCantidad(
                                                            idx,
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={readOnly}
                                                />
                                                {errors[`item_${idx}_cant`] && (
                                                    <span style={S.err}>
                                                        {
                                                            errors[
                                                                `item_${idx}_cant`
                                                            ]
                                                        }
                                                    </span>
                                                )}
                                                {errors[`item_${idx}_inv`] && (
                                                    <span style={S.err}>
                                                        {
                                                            errors[
                                                                `item_${idx}_inv`
                                                            ]
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                            {!readOnly && (
                                                <button
                                                    style={{
                                                        ...S.actionBtn(
                                                            "#fce8e8",
                                                            "#a33",
                                                        ),
                                                        height: 38,
                                                        flexShrink: 0,
                                                    }}
                                                    onClick={() =>
                                                        removeItem(idx)
                                                    }
                                                >
                                                    <IconTrash size={14} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {!readOnly && form.estado !== "Cancelado" && (
                                    <button
                                        style={{
                                            ...S.btnSecondary,
                                            marginTop: 8,
                                            padding: "6px 14px",
                                            fontSize: "0.82rem",
                                        }}
                                        onClick={addItem}
                                    >
                                        + Agregar prenda
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
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

export default function PedidosAutomaticosCrud() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [filtroEstado, setFiltroEstado] = useState("Todos");
    const [filtroProyecto, setFiltroProyecto] = useState("Todos");
    const [pagina, setPagina] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewTarget, setViewTarget] = useState(null);
    const [toast, setToast] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [globalModal, setGlobalModal] = useState(false);
    const [globalSaving, setGlobalSaving] = useState(false);

    const { data: pedidos = [], isLoading } = useQuery({
        queryKey: ["pedidos-automaticos"],
        queryFn: () => api.get("/pedidos-automaticos").then((r) => r.data),
    });
    const { data: empleados = [] } = useQuery({
        queryKey: ["empleados"],
        queryFn: () => api.get("/empleados").then((r) => r.data),
    });
    const { data: contratos = [] } = useQuery({
        queryKey: ["contratos"],
        queryFn: () => api.get("/contratos").then((r) => r.data),
    });
    const { data: inventarioFlat = [] } = useQuery({
        queryKey: ["inventario-dotacion-flat"],
        queryFn: () =>
            api.get("/inventario-dotacion?flat=1").then((r) => r.data),
    });
    const { data: cronogramas = [] } = useQuery({
        queryKey: ["cronograma-dotacion"],
        queryFn: () => api.get("/cronograma-dotacion").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        setPagina(1);
    }, [debouncedSearch, filtroEstado, filtroProyecto]);

    useEffect(() => {
        const anyOpen = modalOpen || viewOpen || !!confirmDelete || globalModal;
        document.documentElement.style.overflowY = anyOpen ? "hidden" : "";
        document.body.style.overflowY = anyOpen ? "hidden" : "";
        return () => {
            document.documentElement.style.overflowY = "";
            document.body.style.overflowY = "";
        };
    }, [modalOpen, viewOpen, confirmDelete, globalModal]);

    const showToast = (msg, error = false) => {
        setToast({ msg, error });
        setTimeout(() => setToast(null), 3500);
    };

    const contratoProyectoMap = useMemo(() => {
        const m = {};
        contratos.forEach((c) => {
            m[String(c.id)] = c.cliente_proyecto ?? "";
        });
        return m;
    }, [contratos]);

    const proyectosUsados = useMemo(() => {
        const set = new Set();
        pedidos.forEach((p) => {
            const cp = p.contrato_id
                ? contratoProyectoMap[String(p.contrato_id)]
                : "";
            if (cp) set.add(cp);
        });
        return Array.from(set).sort();
    }, [pedidos, contratoProyectoMap]);

    const proyectosLocked = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const locked = new Set();
        cronogramas.forEach((c) => {
            if (!c.proyecto?.nombre || !c.fecha_entrega) return;
            const n = Number(c.ciclo_meses) || 4;
            const entrega = new Date(
                String(c.fecha_entrega).split("T")[0] + "T00:00:00",
            );
            const inicio = new Date(entrega);
            inicio.setMonth(inicio.getMonth() - n);
            const corte = new Date(inicio);
            corte.setMonth(corte.getMonth() + Math.floor(n / 2));
            if (today >= corte) locked.add(c.proyecto.nombre);
        });
        return locked;
    }, [cronogramas]);

    const filtered = useMemo(
        () =>
            pedidos.filter((p) => {
                const q = debouncedSearch.toLowerCase();
                const matchQ =
                    (p.codigo ?? "").toLowerCase().includes(q) ||
                    `${p.empleado?.nombres ?? ""} ${p.empleado?.apellidos ?? ""}`
                        .toLowerCase()
                        .includes(q) ||
                    (p.empleado?.cedula ?? "").includes(q);
                const matchE =
                    filtroEstado === "Todos" || p.estado === filtroEstado;
                const proyectoPedido = p.contrato_id
                    ? (contratoProyectoMap[String(p.contrato_id)] ?? "")
                    : "";
                const matchP =
                    filtroProyecto === "Todos" ||
                    proyectoPedido === filtroProyecto;
                return matchQ && matchE && matchP;
            }),
        [
            pedidos,
            debouncedSearch,
            filtroEstado,
            filtroProyecto,
            contratoProyectoMap,
        ],
    );

    const paginated = useMemo(
        () => filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
        [filtered, pagina],
    );
    const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);

    const empleadosConContrato = useMemo(() => {
        const ids = new Set(contratos.map((c) => String(c.empleado_id)));
        return empleados.filter((e) => ids.has(String(e.id)));
    }, [empleados, contratos]);

    const estadosUsados = useMemo(() => {
        const usados = new Set(pedidos.map((p) => p.estado).filter(Boolean));
        return ESTADOS.filter((e) => usados.has(e));
    }, [pedidos]);

    const stats = useMemo(
        () => ({
            total: pedidos.length,
            pendientes: pedidos.filter((p) => p.estado === "Pendiente").length,
            enProceso: pedidos.filter((p) => p.estado === "Activo").length,
            completados: pedidos.filter((p) => p.estado === "Completado")
                .length,
            cancelados: pedidos.filter((p) => p.estado === "Cancelado").length,
        }),
        [pedidos],
    );

    const pedidosParaGlobal = useMemo(
        () => pedidos.filter((p) => p.estado === "Activo"),
        [pedidos],
    );

    const handleCrearGlobal = async () => {
        setGlobalSaving(true);
        try {
            const { data } = await api.post("/pedidos-globales");
            queryClient.setQueryData(["pedidos-automaticos"], (prev = []) =>
                prev.map((p) =>
                    p.estado === "Activo" ? { ...p, estado: "Completado" } : p,
                ),
            );
            queryClient.invalidateQueries({ queryKey: ["pedidos-globales"] });
            showToast(
                `Pedido global #${data.global.codigo} creado con ${data.total} pedido${data.total !== 1 ? "s" : ""}.`,
            );
            setGlobalModal(false);
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                "Error al crear el pedido global.";
            showToast(msg, true);
        } finally {
            setGlobalSaving(false);
        }
    };

    const handleSave = async (form) => {
        try {
            const payload = {
                ...form,
                items: form.items.map(
                    ({ inventario_dotacion_id, cantidad }) => ({
                        inventario_dotacion_id,
                        cantidad: Number(cantidad),
                    }),
                ),
            };
            if (editTarget) {
                const { data } = await api.put(
                    `/pedidos-automaticos/${editTarget.id}`,
                    payload,
                );
                queryClient.setQueryData(["pedidos-automaticos"], (prev = []) =>
                    prev.map((p) => (p.id === editTarget.id ? data : p)),
                );
                queryClient.invalidateQueries({
                    queryKey: ["inventario-dotacion-flat"],
                });
                queryClient.invalidateQueries({
                    queryKey: ["inventario_dotacion"],
                });
                showToast("Pedido actualizado.");
            } else {
                const { data } = await api.post(
                    "/pedidos-automaticos",
                    payload,
                );
                queryClient.setQueryData(
                    ["pedidos-automaticos"],
                    (prev = []) => [data, ...prev],
                );
                queryClient.invalidateQueries({
                    queryKey: ["inventario-dotacion-flat"],
                });
                queryClient.invalidateQueries({
                    queryKey: ["inventario_dotacion"],
                });
                showToast("Pedido creado.");
            }
            setModalOpen(false);
        } catch (err) {
            const msg =
                err?.response?.data?.message || "Error al guardar el pedido.";
            showToast(msg, true);
            throw err;
        }
    };

    const handleDelete = async (pedido) => {
        try {
            await api.delete(`/pedidos-automaticos/${pedido.id}`);
            queryClient.setQueryData(["pedidos-automaticos"], (prev = []) =>
                prev.filter((p) => p.id !== pedido.id),
            );
            queryClient.invalidateQueries({
                queryKey: ["inventario-dotacion-flat"],
            });
            queryClient.invalidateQueries({
                queryKey: ["inventario_dotacion"],
            });
            showToast("Pedido eliminado. Inventario restaurado.");
        } catch {
            showToast("Error al eliminar el pedido.", true);
        } finally {
            setConfirmDelete(null);
        }
    };

    const estadoBadge = (estado) => {
        const map = {
            Pendiente: { bg: "#fff8e0", color: "#856404" },
            Activo: { bg: "#e0f2ff", color: "#1a5fa8" },
            Completado: { bg: "#e0f7f4", color: "#0d6e5a" },
            Cancelado: { bg: "#fce8e8", color: "#a33333" },
        };
        return map[estado] ?? { bg: "#f0f0f0", color: "#555" };
    };

    const buildEditForm = (pedido) => ({
        empleado_id: pedido.empleado_id ?? "",
        contrato_id: pedido.contrato_id ?? "",
        estado: pedido.estado ?? "Pendiente",
        fecha_pedido: dateOnly(pedido.fecha_pedido),
        notas: pedido.notas ?? "",
        items: (pedido.items ?? []).map((it) => ({
            inventario_dotacion_id:
                it.inventario_dotacion_id ?? it.inventario?.id ?? "",
            cantidad: it.cantidad,
            _inv: it.inventario ?? null,
            inventario: it.inventario ?? null,
        })),
    });

    return (
        <div style={{ width: "100%" }}>
            {toast && (
                <div
                    style={{
                        ...S.toast,
                        background: toast.error ? "#c0392b" : "var(--primary)",
                    }}
                >
                    {toast.msg}
                </div>
            )}

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Total pedidos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#856404" }}>
                        {stats.pendientes}
                    </div>
                    <div className="stat-label">Pendientes</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#1a5fa8" }}>
                        {stats.enProceso}
                    </div>
                    <div className="stat-label">En proceso</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#0d6e5a" }}>
                        {stats.completados}
                    </div>
                    <div className="stat-label">Completados</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#a33333" }}>
                        {stats.cancelados}
                    </div>
                    <div className="stat-label">Cancelados</div>
                </div>
            </div>

            {/* Toolbar */}
            <div style={S.toolbar}>
                <div style={S.filters}>
                    <div style={S.searchWrap}>
                        <span style={S.searchIcon}>
                            <IconSearch size={15} />
                        </span>
                        <input
                            style={S.searchInput}
                            placeholder="Buscar código, empleado, cédula…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        style={S.selectFilter}
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                        <option value="Todos">Todos los estados</option>
                        {estadosUsados.map((s) => (
                            <option key={s} value={s}>
                                {ESTADO_LABEL[s] ?? s}
                            </option>
                        ))}
                    </select>
                    {proyectosUsados.length > 0 && (
                        <select
                            style={S.selectFilter}
                            value={filtroProyecto}
                            onChange={(e) => setFiltroProyecto(e.target.value)}
                        >
                            <option value="Todos">Todos los proyectos</option>
                            {proyectosUsados.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        style={{
                            padding: "9px 18px",
                            background:
                                pedidosParaGlobal.length > 0
                                    ? "var(--primary)"
                                    : "var(--bg)",
                            color:
                                pedidosParaGlobal.length > 0
                                    ? "#fff"
                                    : "var(--text-muted)",
                            border:
                                pedidosParaGlobal.length > 0
                                    ? "none"
                                    : "1.5px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.88rem",
                            fontWeight: 700,
                            cursor:
                                pedidosParaGlobal.length > 0
                                    ? "pointer"
                                    : "not-allowed",
                            fontFamily: "Nunito,sans-serif",
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                        }}
                        onClick={() =>
                            pedidosParaGlobal.length > 0 && setGlobalModal(true)
                        }
                        title={
                            pedidosParaGlobal.length === 0
                                ? "No hay pedidos en proceso"
                                : ""
                        }
                    >
                        <IconLayers size={16} />
                        Pedido global
                        {pedidosParaGlobal.length > 0 && (
                            <span
                                style={{
                                    background: "rgba(255,255,255,0.25)",
                                    borderRadius: 20,
                                    padding: "1px 8px",
                                    fontSize: "0.78rem",
                                }}
                            >
                                {pedidosParaGlobal.length}
                            </span>
                        )}
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => {
                            setEditTarget(null);
                            setModalOpen(true);
                        }}
                    >
                        + Nuevo pedido
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}>
                        <IconLoading size={32} />
                        <p>Cargando pedidos…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p>No se encontraron pedidos.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Empleado</th>
                                <th>Fecha</th>
                                <th style={{ textAlign: "center" }}>Items</th>
                                <th>Estado</th>
                                <th style={{ textAlign: "center" }}>
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((p) => {
                                const badge = estadoBadge(p.estado);
                                const empData = empleados.find(
                                    (e) =>
                                        String(e.id) === String(p.empleado_id),
                                );
                                const proyectoPedido = p.contrato_id
                                    ? (contratoProyectoMap[
                                          String(p.contrato_id)
                                      ] ?? "")
                                    : "";
                                const isLocked =
                                    proyectosLocked.has(proyectoPedido);
                                return (
                                    <tr
                                        key={p.id}
                                        style={
                                            isLocked
                                                ? { opacity: 0.85 }
                                                : undefined
                                        }
                                    >
                                        <td>
                                            <span
                                                style={{
                                                    fontFamily: "monospace",
                                                    fontWeight: 800,
                                                    fontSize: "0.95rem",
                                                }}
                                            >
                                                #{p.codigo ?? "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={S.avatarCell}>
                                                <div style={S.avatar}>
                                                    {(
                                                        p.empleado?.nombres ||
                                                        "?"
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                    {empData?.fotografia && (
                                                        <img
                                                            src={`/storage/${empData.fotografia}`}
                                                            alt=""
                                                            style={{
                                                                position:
                                                                    "absolute",
                                                                inset: 0,
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit:
                                                                    "cover",
                                                                borderRadius:
                                                                    "50%",
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
                                                        }}
                                                    >
                                                        {p.empleado?.nombres}{" "}
                                                        {p.empleado?.apellidos}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: "0.76rem",
                                                            color: "var(--text-muted)",
                                                        }}
                                                    >
                                                        C.C.{" "}
                                                        {p.empleado?.cedula}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{dateOnly(p.fecha_pedido)}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <span
                                                style={S.badge(
                                                    "#e8f0ff",
                                                    "#1a4fa8",
                                                )}
                                            >
                                                {(p.items ?? []).length} prenda
                                                {(p.items ?? []).length !== 1
                                                    ? "s"
                                                    : ""}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                style={{
                                                    ...S.badge(
                                                        badge.bg,
                                                        badge.color,
                                                    ),
                                                }}
                                            >
                                                {ESTADO_LABEL[p.estado] ??
                                                    p.estado}
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
                                                        setViewTarget({
                                                            ...p,
                                                            ...buildEditForm(p),
                                                            id: p.id,
                                                            codigo: p.codigo,
                                                        });
                                                        setViewOpen(true);
                                                    }}
                                                >
                                                    <IconEye />
                                                </button>
                                                {isLocked ? (
                                                    <span
                                                        title={`Bloqueado: proyecto "${proyectoPedido}" superó el punto de corte`}
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                            width: 28,
                                                            height: 28,
                                                            background:
                                                                "#fef3c7",
                                                            borderRadius: 6,
                                                            color: "#92400e",
                                                        }}
                                                    >
                                                        <IconLock size={14} />
                                                    </span>
                                                ) : (
                                                    <>
                                                        <button
                                                            style={S.actionBtn(
                                                                "#e8f8f5",
                                                                "var(--primary-dark)",
                                                            )}
                                                            title="Editar"
                                                            onClick={() => {
                                                                setEditTarget(
                                                                    p,
                                                                );
                                                                setModalOpen(
                                                                    true,
                                                                );
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
                                                                setConfirmDelete(
                                                                    p,
                                                                )
                                                            }
                                                        >
                                                            <IconTrash
                                                                size={14}
                                                            />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {!isLoading && filtered.length > POR_PAGINA && (
                <div style={S.paginationBar}>
                    <span style={S.paginationInfo}>
                        Mostrando {(pagina - 1) * POR_PAGINA + 1}–
                        {Math.min(pagina * POR_PAGINA, filtered.length)} de{" "}
                        {filtered.length} pedidos
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

            {globalModal && (
                <div
                    style={S.overlay}
                    onClick={() => !globalSaving && setGlobalModal(false)}
                >
                    <div
                        style={{ ...S.modal, maxWidth: 480 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={S.modalHeader}>
                            <span style={S.modalTitle}>
                                Generar pedido global
                            </span>
                            <button
                                style={S.closeBtn}
                                onClick={() =>
                                    !globalSaving && setGlobalModal(false)
                                }
                            >
                                <IconClose size={14} />
                            </button>
                        </div>
                        <div
                            style={{
                                padding: "28px 28px 20px",
                                fontSize: "0.93rem",
                                color: "var(--text)",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14,
                                    marginBottom: 20,
                                }}
                            >
                                <div
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: "50%",
                                        background:
                                            "var(--primary-light, #e0f7f4)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        color: "var(--primary)",
                                    }}
                                >
                                    <IconLayers size={24} />
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            fontSize: "1rem",
                                        }}
                                    >
                                        Se agruparán{" "}
                                        <span style={{ color: "#1a5fa8" }}>
                                            {pedidosParaGlobal.length} pedido
                                            {pedidosParaGlobal.length !== 1
                                                ? "s"
                                                : ""}
                                        </span>{" "}
                                        en proceso
                                    </div>
                                    <div
                                        style={{
                                            color: "var(--text-muted)",
                                            fontSize: "0.85rem",
                                            marginTop: 3,
                                        }}
                                    >
                                        Se generará un código global secuencial
                                        y todos pasarán a estado{" "}
                                        <strong>Completado</strong>.
                                    </div>
                                </div>
                            </div>

                            <div
                                style={{
                                    background: "var(--bg)",
                                    border: "1.5px solid var(--border)",
                                    borderRadius: 8,
                                    padding: "12px 16px",
                                    maxHeight: 180,
                                    overflowY: "auto",
                                }}
                            >
                                {pedidosParaGlobal.map((p) => (
                                    <div
                                        key={p.id}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "5px 0",
                                            borderBottom:
                                                "1px solid var(--border)",
                                            fontSize: "0.84rem",
                                        }}
                                    >
                                        <span style={{ fontWeight: 700 }}>
                                            #{p.codigo}
                                        </span>
                                        <span
                                            style={{
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            {p.empleado?.nombres}{" "}
                                            {p.empleado?.apellidos}
                                        </span>
                                        <span
                                            style={{
                                                color: "#1a5fa8",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {(p.items ?? []).length} prenda
                                            {(p.items ?? []).length !== 1
                                                ? "s"
                                                : ""}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <p
                                style={{
                                    marginTop: 16,
                                    fontSize: "0.83rem",
                                    color: "#856404",
                                    background: "#fff8e0",
                                    padding: "9px 12px",
                                    borderRadius: 8,
                                }}
                            >
                                Esta acción no se puede deshacer directamente.
                                Los pedidos completados solo pueden cancelarse
                                individualmente.
                            </p>
                        </div>
                        <div style={S.modalFooter}>
                            <button
                                style={S.btnSecondary}
                                onClick={() => setGlobalModal(false)}
                                disabled={globalSaving}
                            >
                                Cancelar
                            </button>
                            <button
                                style={{
                                    ...S.btnPrimary,
                                    opacity: globalSaving ? 0.6 : 1,
                                }}
                                onClick={handleCrearGlobal}
                                disabled={globalSaving}
                            >
                                {globalSaving
                                    ? "Generando…"
                                    : "Confirmar pedido global"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDelete && (
                <div style={S.overlay} onClick={() => setConfirmDelete(null)}>
                    <div
                        style={{ ...S.modal, maxWidth: 440 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={S.modalHeader}>
                            <span style={S.modalTitle}>
                                Confirmar eliminación
                            </span>
                            <button
                                style={S.closeBtn}
                                onClick={() => setConfirmDelete(null)}
                            >
                                <IconClose size={14} />
                            </button>
                        </div>
                        <div
                            style={{
                                padding: "24px 28px",
                                fontSize: "0.92rem",
                                color: "var(--text)",
                            }}
                        >
                            ¿Eliminar el pedido{" "}
                            <strong>#{confirmDelete.codigo}</strong>?
                            {confirmDelete.estado === "Activo" && (
                                <p
                                    style={{
                                        marginTop: 10,
                                        color: "#856404",
                                        background: "#fff8e0",
                                        padding: "10px 12px",
                                        borderRadius: 8,
                                        fontSize: "0.85rem",
                                    }}
                                >
                                    Este pedido está <strong>Activo</strong>. Al
                                    eliminarlo, las prendas asignadas serán
                                    devueltas al inventario.
                                </p>
                            )}
                        </div>
                        <div style={{ ...S.modalFooter }}>
                            <button
                                style={S.btnSecondary}
                                onClick={() => setConfirmDelete(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                style={{
                                    ...S.btnPrimary,
                                    background: "#c0392b",
                                }}
                                onClick={() => handleDelete(confirmDelete)}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                initial={
                    editTarget
                        ? {
                              ...editTarget,
                              ...buildEditForm(editTarget),
                              id: editTarget.id,
                              codigo: editTarget.codigo,
                          }
                        : EMPTY_FORM
                }
                title={
                    editTarget
                        ? `Editar Pedido #${editTarget.codigo}`
                        : "Nuevo Pedido de Dotación"
                }
                empleados={empleadosConContrato}
                contratos={contratos}
                inventarioFlat={inventarioFlat}
                cronogramas={cronogramas}
                queryClient={queryClient}
            />

            <Modal
                open={viewOpen}
                onClose={() => setViewOpen(false)}
                initial={viewTarget || EMPTY_FORM}
                title={`Ver Pedido #${viewTarget?.codigo ?? ""}`}
                empleados={empleados}
                contratos={contratos}
                inventarioFlat={inventarioFlat}
                cronogramas={cronogramas}
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
    selectFilter: {
        padding: "9px 12px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.85rem",
        fontFamily: "Nunito,sans-serif",
        background: "var(--white)",
        color: "var(--text)",
        outline: "none",
        cursor: "pointer",
        minWidth: 160,
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
        width: 34,
        height: 34,
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
        position: "relative",
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
    modalHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "22px 28px",
        background: "var(--primary)",
        borderTopLeftRadius: "var(--radius)",
        borderTopRightRadius: "var(--radius)",
        flexShrink: 0,
    },
    modalTitle: {
        fontFamily: "'Poppins',sans-serif",
        fontWeight: 700,
        fontSize: "1.15rem",
        color: "#fff",
    },
    closeBtn: {
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
        padding: "0 28px",
        gap: 0,
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
        display: "flex",
        alignItems: "center",
        gap: 6,
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
        display: "flex",
        alignItems: "center",
        gap: 6,
    },
    tabBadge: {
        background: "var(--primary)",
        color: "#fff",
        borderRadius: 20,
        padding: "1px 7px",
        fontSize: "0.7rem",
        fontWeight: 800,
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
    grid2: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 16,
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
    inputDisabled: {
        background: "var(--bg)",
        cursor: "default",
        color: "var(--text-muted)",
    },
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
    alertaBanner: {
        background: "#fce8e8",
        color: "#a33",
        border: "1px solid #f5c6cb",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: "0.85rem",
        marginBottom: 12,
    },
    dropdown: {
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
    },
    dropdownItem: {
        padding: "8px 12px",
        cursor: "pointer",
        fontSize: "0.86rem",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 4,
    },
    dropdownEmpty: {
        padding: "10px 12px",
        fontSize: "0.85rem",
        color: "var(--text-muted)",
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
    paginationBtns: { display: "flex", alignItems: "center", gap: 4 },
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
        color: "#fff",
        borderRadius: "var(--radius-sm)",
        padding: "13px 22px",
        fontWeight: 700,
        fontSize: "0.92rem",
        zIndex: 9999,
        boxShadow: "0 8px 28px rgba(26,155,140,0.35)",
    },
};
