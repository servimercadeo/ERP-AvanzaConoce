import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
    IconClose,
    IconEdit,
    IconLoading,
    IconEmptySearch,
    IconCheckCircle,
    IconMinusCircle,
} from "../components/Icons";
function parseDateLocal(str) {
    return new Date(str + "T00:00:00");
}

function computeDates(fechaEntrega, cicloMeses) {
    const n = Number(cicloMeses) || 4;
    const entrega = parseDateLocal(fechaEntrega);
    const inicio = new Date(entrega);
    inicio.setMonth(inicio.getMonth() - n);
    const corte = new Date(inicio);
    corte.setMonth(corte.getMonth() + Math.floor(n / 2));
    return { inicio, corte, entrega };
}

function fmtDate(d) {
    return d.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function diffDays(a, b) {
    return Math.round((b - a) / 86400000);
}

function todayMidnight() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function addMonths(months) {
    const d = new Date();
    d.setMonth(d.getMonth() + Math.max(1, Number(months) || 4));
    return d.toISOString().split("T")[0];
}

// ── Modal crear / editar ───────────────────────────────────────────────────
function CronogramaModal({ entry, proyectos, cronogramas, onClose, onSaved }) {
    const isEdit = !!entry;
    const scheduledIds = new Set(
        cronogramas.filter((c) => c.activo).map((c) => String(c.proyecto_id)),
    );

    const [form, setForm] = useState({
        proyecto_id: isEdit ? String(entry.proyecto_id) : "",
        fecha_entrega: isEdit
            ? String(entry.fecha_entrega).split("T")[0]
            : addMonths(4),
        ciclo_meses: isEdit ? entry.ciclo_meses : 4,
    });
    const [autoDate, setAutoDate] = useState(!isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isEdit && autoDate) {
            setForm((p) => ({ ...p, fecha_entrega: addMonths(p.ciclo_meses) }));
        }
    }, [form.ciclo_meses, isEdit, autoDate]);

    const availableProyectos = proyectos.filter(
        (p) =>
            !scheduledIds.has(String(p.value)) ||
            (isEdit && String(p.value) === String(entry.proyecto_id)),
    );

    const ciclo = Number(form.ciclo_meses) || 4;
    const corteInfo = `${Math.floor(ciclo / 2)} mes${Math.floor(ciclo / 2) !== 1 ? "es" : ""} desde el inicio`;

    const handleSave = async () => {
        if (!form.proyecto_id) return setError("Selecciona un proyecto.");
        if (!form.fecha_entrega)
            return setError("Ingresa la fecha de entrega.");
        if (!form.ciclo_meses || ciclo < 1)
            return setError("El ciclo debe ser al menos 1 mes.");
        setSaving(true);
        setError("");
        try {
            let res;
            if (isEdit) {
                res = await api.put(`/cronograma-dotacion/${entry.id}`, {
                    fecha_entrega: form.fecha_entrega,
                    ciclo_meses: ciclo,
                });
            } else {
                res = await api.post("/cronograma-dotacion", {
                    proyecto_id: Number(form.proyecto_id),
                    fecha_entrega: form.fecha_entrega,
                    ciclo_meses: ciclo,
                });
            }
            onSaved(res.data, isEdit);
        } catch (e) {
            setError(e?.response?.data?.message ?? "Error al guardar.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={S.modal}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>
                        {isEdit
                            ? "Editar cronograma"
                            : "Nuevo cronograma de entrega"}
                    </span>
                    <button style={S.btnIcon} onClick={onClose}>
                        <IconClose size={16} />
                    </button>
                </div>
                <div style={S.modalBody}>
                    <label style={S.label}>Proyecto</label>
                    {isEdit ? (
                        <div
                            style={{
                                ...S.input,
                                background: "var(--bg)",
                                color: "var(--text-muted)",
                                cursor: "default",
                            }}
                        >
                            {entry.proyecto?.nombre ?? "—"}
                        </div>
                    ) : (
                        <select
                            style={S.input}
                            value={form.proyecto_id}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    proyecto_id: e.target.value,
                                }))
                            }
                        >
                            <option value="">Seleccionar proyecto…</option>
                            {availableProyectos.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    )}

                    <label style={{ ...S.label, marginTop: 16 }}>
                        Duración del ciclo (meses)
                    </label>
                    <input
                        type="number"
                        style={S.input}
                        min={1}
                        max={24}
                        value={form.ciclo_meses}
                        onChange={(e) =>
                            setForm((p) => ({
                                ...p,
                                ciclo_meses: e.target.value,
                            }))
                        }
                    />
                    <p
                        style={{
                            fontSize: "0.77rem",
                            color: "var(--text-muted)",
                            marginTop: 5,
                        }}
                    >
                        Punto de corte (crear pedido global): {corteInfo} ·
                        Entrega al finalizar el ciclo completo.
                    </p>

                    <label style={{ ...S.label, marginTop: 16 }}>
                        Fecha de entrega
                    </label>
                    <input
                        type="date"
                        style={S.input}
                        value={form.fecha_entrega}
                        onChange={(e) => {
                            setAutoDate(false);
                            setForm((p) => ({
                                ...p,
                                fecha_entrega: e.target.value,
                            }));
                        }}
                    />
                    {form.fecha_entrega &&
                        ciclo >= 1 &&
                        (() => {
                            const { inicio, corte } = computeDates(
                                form.fecha_entrega,
                                ciclo,
                            );
                            return (
                                <div
                                    style={{
                                        background: "#f0f9f7",
                                        border: "1.5px solid #a7f3d0",
                                        borderRadius: 8,
                                        padding: "10px 14px",
                                        marginTop: 10,
                                        fontSize: "0.82rem",
                                        color: "#065f46",
                                    }}
                                >
                                    <div>
                                        <strong>Inicio del ciclo:</strong>{" "}
                                        {fmtDate(inicio)}
                                    </div>
                                    <div style={{ marginTop: 4 }}>
                                        <strong>Corte (pedido global):</strong>{" "}
                                        {fmtDate(corte)}
                                    </div>
                                    <div style={{ marginTop: 4 }}>
                                        <strong>Entrega:</strong>{" "}
                                        {fmtDate(
                                            parseDateLocal(form.fecha_entrega),
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                    {error && (
                        <div style={{ ...S.errorMsg, marginTop: 12 }}>
                            {error}
                        </div>
                    )}
                </div>
                <div style={S.modalFooter}>
                    <button
                        style={S.btnSecondary}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        style={S.btnPrimary}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Guardando…" : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ToggleModal({ entry, onClose, onToggled }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const isActive = entry.activo;

    const handleToggle = async () => {
        setLoading(true);
        try {
            const res = await api.patch(
                `/cronograma-dotacion/${entry.id}/toggle`,
            );
            onToggled(res.data);
        } catch (e) {
            setError(e?.response?.data?.message ?? "Error al cambiar estado.");
            setLoading(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 420 }}>
                <div style={S.modalHeader}>
                    <span
                        style={{
                            fontWeight: 800,
                            fontSize: "1rem",
                            color: isActive ? "#b45309" : "#0d6e5a",
                        }}
                    >
                        {isActive
                            ? "Desactivar cronograma"
                            : "Activar cronograma"}
                    </span>
                    <button style={S.btnIcon} onClick={onClose}>
                        <IconClose size={16} />
                    </button>
                </div>
                <div style={S.modalBody}>
                    <p>
                        {isActive ? "¿Desactivar" : "¿Activar"} el cronograma
                        de <strong>{entry.proyecto?.nombre}</strong>?
                    </p>
                    <div
                        style={{
                            background: isActive ? "#fff8e1" : "#f0f9f7",
                            border: `1.5px solid ${isActive ? "#f9c74f" : "#a7f3d0"}`,
                            borderRadius: 8,
                            padding: "10px 14px",
                            fontSize: "0.84rem",
                            color: isActive ? "#7a5c00" : "#065f46",
                            marginTop: 10,
                        }}
                    >
                        {isActive
                            ? "El cronograma quedará inactivo y no afectará la validación de pedidos globales. Podrás reactivarlo en cualquier momento."
                            : "El cronograma volverá a estar activo y se usará para validar los pedidos globales de este proyecto."}
                    </div>
                    {error && (
                        <div style={{ ...S.errorMsg, marginTop: 10 }}>
                            {error}
                        </div>
                    )}
                </div>
                <div style={S.modalFooter}>
                    <button
                        style={S.btnSecondary}
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        style={{
                            ...S.btnPrimary,
                            background: isActive ? "#b45309" : "#0d6e5a",
                        }}
                        onClick={handleToggle}
                        disabled={loading}
                    >
                        {loading
                            ? "Guardando…"
                            : isActive
                              ? "Desactivar"
                              : "Activar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Tarjeta de cronograma por proyecto ────────────────────────────────────
function CronogramaCard({ entry, onEdit, onToggle }) {
    const today = todayMidnight();
    const { inicio, corte, entrega } = computeDates(
        entry.fecha_entrega,
        entry.ciclo_meses,
    );

    const totalDays = Math.max(1, diffDays(inicio, entrega));
    const cortePct = (diffDays(inicio, corte) / totalDays) * 100;
    const todayPct = Math.min(
        100,
        Math.max(0, (diffDays(inicio, today) / totalDays) * 100),
    );

    const beforeInicio = today < inicio;
    const beforeCorte = today < corte;
    const beforeEntrega = today < entrega;

    const status = !entry.activo
        ? { label: "Inactivo", color: "#64748b", bg: "#e2e8f0" }
        : beforeInicio
          ? { label: "No iniciado", color: "#475569", bg: "#f1f5f9" }
          : beforeCorte
            ? { label: "En preparación", color: "#0d6e5a", bg: "#dcfce7" }
            : beforeEntrega
              ? {
                    label: "⚠ Pedido global requerido",
                    color: "#92400e",
                    bg: "#fef3c7",
                }
              : { label: "Ciclo completado", color: "#475569", bg: "#f1f5f9" };

    const daysToCorte = diffDays(today, corte);
    const daysToEntrega = diffDays(today, entrega);

    let urgencyMsg = null;
    let urgencyColor = "var(--text-muted)";
    if (entry.activo) {
        if (!beforeInicio && beforeCorte) {
            urgencyMsg = `${daysToCorte} día${daysToCorte !== 1 ? "s" : ""} para crear el pedido global`;
            urgencyColor = daysToCorte <= 7 ? "#b45309" : "#0d6e5a";
        } else if (!beforeCorte && beforeEntrega) {
            urgencyMsg = `⚠ Pedido global requerido · ${daysToEntrega} día${daysToEntrega !== 1 ? "s" : ""} para la entrega`;
            urgencyColor = "#b45309";
        } else if (!beforeEntrega) {
            urgencyMsg = "Ciclo finalizado";
            urgencyColor = "#475569";
        }
    }

    const cardStyle = {
        ...S.card,
        opacity: entry.activo ? 1 : 0.65,
        borderColor: entry.activo ? "var(--border)" : "#cbd5e1",
        background: entry.activo ? "var(--white)" : "#f8fafc",
    };

    return (
        <div style={cardStyle}>
            {/* Encabezado */}
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 14,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                    }}
                >
                    <span style={S.proyectoBadge}>
                        {entry.proyecto?.nombre ?? "—"}
                    </span>
                    <span
                        style={{
                            ...S.statusBadge,
                            background: status.bg,
                            color: status.color,
                        }}
                    >
                        {status.label}
                    </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {entry.activo && (
                        <button
                            style={S.actionBtn}
                            onClick={() => onEdit(entry)}
                            title="Editar"
                        >
                            <IconEdit size={14} />
                        </button>
                    )}
                    <button
                        style={{
                            ...S.actionBtn,
                            color: entry.activo ? "#b45309" : "#0d6e5a",
                            borderColor: entry.activo ? "#fde68a" : "#a7f3d0",
                            background: entry.activo ? "#fffbeb" : "#f0fdf4",
                        }}
                        onClick={() => onToggle(entry)}
                        title={entry.activo ? "Desactivar" : "Activar"}
                    >
                        {entry.activo ? (
                            <IconMinusCircle size={14} />
                        ) : (
                            <IconCheckCircle size={14} />
                        )}
                    </button>
                </div>
            </div>

            {/* Metadatos */}
            <div
                style={{
                    display: "flex",
                    gap: 20,
                    marginBottom: 16,
                    flexWrap: "wrap",
                }}
            >
                {[
                    { label: "Ciclo", value: `${entry.ciclo_meses} meses` },
                    { label: "Inicio", value: fmtDate(inicio) },
                    {
                        label: "Corte (pedido global)",
                        value: fmtDate(corte),
                        warn: entry.activo && !beforeCorte,
                    },
                    { label: "Entrega", value: fmtDate(entrega) },
                ].map(({ label, value, warn }) => (
                    <div key={label}>
                        <div style={S.metaLabel}>{label}</div>
                        <div
                            style={{
                                ...S.metaValue,
                                color: warn ? "#b45309" : "var(--text)",
                                fontWeight: warn ? 800 : 600,
                            }}
                        >
                            {value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Barra de progreso */}
            <div style={{ position: "relative", paddingBottom: 44 }}>
                <div
                    style={{
                        position: "relative",
                        height: 10,
                        borderRadius: 5,
                        background: "#e2e8f0",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: `${cortePct}%`,
                            background:
                                !entry.activo || beforeInicio
                                    ? "#c7d9d6"
                                    : "#0d6e5a",
                            transition: "width 0.3s",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            left: `${cortePct}%`,
                            width: `${100 - cortePct}%`,
                            background:
                                !entry.activo || beforeInicio
                                    ? "#e2c8a0"
                                    : "#f59e0b",
                            transition: "left 0.3s",
                        }}
                    />
                </div>

                <div
                    style={{
                        position: "absolute",
                        left: `${cortePct}%`,
                        top: -2,
                        width: 3,
                        height: 14,
                        background: "#b45309",
                        transform: "translateX(-50%)",
                        borderRadius: 2,
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        left: `${cortePct}%`,
                        top: 14,
                        transform: "translateX(-50%)",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: "#b45309",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                    }}
                >
                    <div>Corte</div>
                    <div style={{ fontWeight: 500, marginTop: 2 }}>
                        {fmtDate(corte)}
                    </div>
                </div>

                {entry.activo &&
                    !beforeInicio &&
                    beforeEntrega &&
                    (() => {
                        const labelPos =
                            todayPct < 15
                                ? { left: 0, textAlign: "left" }
                                : todayPct > 85
                                  ? { right: 0, textAlign: "right" }
                                  : {
                                        left: `${todayPct}%`,
                                        transform: "translateX(-50%)",
                                        textAlign: "center",
                                    };
                        return (
                            <>
                                <div
                                    style={{
                                        position: "absolute",
                                        left: `${todayPct}%`,
                                        top: -3,
                                        width: 3,
                                        height: 16,
                                        background: "#2563eb",
                                        transform: "translateX(-50%)",
                                        borderRadius: 2,
                                    }}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        ...labelPos,
                                        top: 14,
                                        fontSize: "0.65rem",
                                        fontWeight: 700,
                                        color: "#2563eb",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    <div>Hoy</div>
                                    <div
                                        style={{
                                            fontWeight: 500,
                                            marginTop: 2,
                                        }}
                                    >
                                        {fmtDate(today)}
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                <div
                    style={{
                        position: "absolute",
                        right: 0,
                        top: 14,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: "#475569",
                        whiteSpace: "nowrap",
                        textAlign: "right",
                    }}
                >
                    <div>Entrega</div>
                    <div style={{ fontWeight: 500, marginTop: 2 }}>
                        {fmtDate(entrega)}
                    </div>
                </div>
            </div>

            {urgencyMsg && (
                <div
                    style={{
                        fontSize: "0.83rem",
                        fontWeight: 700,
                        color: urgencyColor,
                        marginTop: 4,
                    }}
                >
                    {urgencyMsg}
                </div>
            )}
        </div>
    );
}

const FILTROS = ["Todos", "Activo", "Inactivo"];

export default function CronogramaDotacion() {
    const qc = useQueryClient();
    const [modalEntry, setModalEntry] = useState(null);
    const [toggleEntry, setToggleEntry] = useState(null);
    const [filtro, setFiltro] = useState("Activo");

    const { data: cronogramas = [], isLoading } = useQuery({
        queryKey: ["cronograma-dotacion"],
        queryFn: () => api.get("/cronograma-dotacion").then((r) => r.data),
    });

    const { data: catalogos } = useQuery({
        queryKey: ["seleccion-catalogos"],
        queryFn: () => api.get("/seleccion/catalogos").then((r) => r.data),
        staleTime: 10 * 60 * 1000,
    });

    const { data: contratos = [] } = useQuery({
        queryKey: ["contratos"],
        queryFn: () => api.get("/contratos").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });

    const proyectos = useMemo(() => {
        const allProyectos = catalogos?.proyectos ?? [];
        const nombresConContrato = new Set(
            contratos.map((c) => c.cliente_proyecto).filter(Boolean),
        );
        return allProyectos.filter((p) => nombresConContrato.has(p.label));
    }, [catalogos, contratos]);

    const cronogramasFiltrados = useMemo(() => {
        if (filtro === "Activo") return cronogramas.filter((c) => c.activo);
        if (filtro === "Inactivo") return cronogramas.filter((c) => !c.activo);
        return cronogramas;
    }, [cronogramas, filtro]);

    const stats = useMemo(() => {
        const today = todayMidnight();
        let enPrep = 0,
            requiereGlobal = 0,
            inactivos = 0;
        cronogramas.forEach((c) => {
            if (!c.activo) { inactivos++; return; }
            const { inicio, corte, entrega } = computeDates(
                c.fecha_entrega,
                c.ciclo_meses,
            );
            if (today >= inicio && today < corte) enPrep++;
            else if (today >= corte && today < entrega) requiereGlobal++;
        });
        return {
            total: cronogramas.length,
            activos: cronogramas.filter((c) => c.activo).length,
            enPrep,
            requiereGlobal,
            inactivos,
        };
    }, [cronogramas]);

    const handleSaved = (data, isEdit) => {
        qc.setQueryData(["cronograma-dotacion"], (old = []) =>
            isEdit
                ? old.map((c) => (c.id === data.id ? data : c))
                : [...old, data],
        );
        setModalEntry(null);
    };

    const handleToggled = (updated) => {
        qc.setQueryData(["cronograma-dotacion"], (old = []) =>
            old.map((c) => (c.id === updated.id ? updated : c)),
        );
        setToggleEntry(null);
    };

    return (
        <div style={{ width: "100%" }}>
            {/* Stats */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.activos}</div>
                    <div className="stat-label">Proyectos activos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#0d6e5a" }}>
                        {stats.enPrep}
                    </div>
                    <div className="stat-label">En preparación</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#b45309" }}>
                        {stats.requiereGlobal}
                    </div>
                    <div className="stat-label">Requieren pedido global</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#64748b" }}>
                        {stats.inactivos}
                    </div>
                    <div className="stat-label">Inactivos</div>
                </div>
            </div>

            {/* Toolbar */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                    flexWrap: "wrap",
                    gap: 10,
                }}
            >
                {/* Filtro estado */}
                <div style={{ display: "flex", gap: 6 }}>
                    {FILTROS.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFiltro(f)}
                            style={{
                                padding: "7px 16px",
                                borderRadius: 20,
                                border: "1.5px solid",
                                fontSize: "0.83rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: "Nunito, sans-serif",
                                borderColor:
                                    filtro === f
                                        ? "var(--primary)"
                                        : "var(--border)",
                                background:
                                    filtro === f
                                        ? "var(--primary)"
                                        : "var(--white)",
                                color: filtro === f ? "#fff" : "var(--text)",
                            }}
                        >
                            {f}
                            {f === "Activo" && (
                                <span
                                    style={{
                                        marginLeft: 6,
                                        background:
                                            filtro === f
                                                ? "rgba(255,255,255,0.25)"
                                                : "#e2e8f0",
                                        borderRadius: 10,
                                        padding: "1px 7px",
                                        fontSize: "0.76rem",
                                    }}
                                >
                                    {stats.activos}
                                </span>
                            )}
                            {f === "Inactivo" && (
                                <span
                                    style={{
                                        marginLeft: 6,
                                        background:
                                            filtro === f
                                                ? "rgba(255,255,255,0.25)"
                                                : "#e2e8f0",
                                        borderRadius: 10,
                                        padding: "1px 7px",
                                        fontSize: "0.76rem",
                                    }}
                                >
                                    {stats.inactivos}
                                </span>
                            )}
                            {f === "Todos" && (
                                <span
                                    style={{
                                        marginLeft: 6,
                                        background:
                                            filtro === f
                                                ? "rgba(255,255,255,0.25)"
                                                : "#e2e8f0",
                                        borderRadius: 10,
                                        padding: "1px 7px",
                                        fontSize: "0.76rem",
                                    }}
                                >
                                    {stats.total}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <button
                    style={S.btnPrimary}
                    onClick={() => setModalEntry(false)}
                >
                    + Nuevo cronograma
                </button>
            </div>

            {/* Contenido */}
            {isLoading ? (
                <div style={S.empty}>
                    <IconLoading size={32} />
                    <p>Cargando cronograma…</p>
                </div>
            ) : cronogramasFiltrados.length === 0 ? (
                <div style={S.empty}>
                    <IconEmptySearch size={44} />
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>
                        {filtro === "Inactivo"
                            ? "No hay cronogramas inactivos"
                            : filtro === "Activo"
                              ? "Sin cronogramas activos"
                              : "Sin cronogramas configurados"}
                    </p>
                    <p
                        style={{
                            fontSize: "0.84rem",
                            color: "var(--text-muted)",
                        }}
                    >
                        {filtro === "Activo"
                            ? "Agrega uno para cada proyecto y define sus fechas de entrega y puntos de corte."
                            : filtro === "Inactivo"
                              ? "Los cronogramas desactivados aparecerán aquí."
                              : "Agrega uno para cada proyecto y define sus fechas de entrega y puntos de corte."}
                    </p>
                </div>
            ) : (
                <div style={S.grid}>
                    {cronogramasFiltrados.map((c) => (
                        <CronogramaCard
                            key={c.id}
                            entry={c}
                            onEdit={() => setModalEntry(c)}
                            onToggle={() => setToggleEntry(c)}
                        />
                    ))}
                </div>
            )}

            {/* Modales */}
            {modalEntry !== null && (
                <CronogramaModal
                    entry={modalEntry || null}
                    proyectos={proyectos}
                    cronogramas={cronogramas}
                    onClose={() => setModalEntry(null)}
                    onSaved={handleSaved}
                />
            )}
            {toggleEntry && (
                <ToggleModal
                    entry={toggleEntry}
                    onClose={() => setToggleEntry(null)}
                    onToggled={handleToggled}
                />
            )}
        </div>
    );
}

// ── Estilos ────────────────────────────────────────────────────────────────
const S = {
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(520px, 1fr))",
        gap: 20,
    },
    card: {
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "22px 24px",
        boxShadow: "var(--shadow)",
        transition: "opacity 0.2s, background 0.2s",
    },
    proyectoBadge: {
        background: "var(--primary)",
        color: "#fff",
        borderRadius: 20,
        padding: "4px 14px",
        fontSize: "0.82rem",
        fontWeight: 800,
        letterSpacing: "0.03em",
    },
    statusBadge: {
        borderRadius: 20,
        padding: "3px 12px",
        fontSize: "0.78rem",
        fontWeight: 700,
    },
    metaLabel: {
        fontSize: "0.7rem",
        fontWeight: 700,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: 2,
    },
    metaValue: {
        fontSize: "0.85rem",
        fontWeight: 600,
        color: "var(--text)",
    },
    actionBtn: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        border: "1.5px solid var(--border)",
        borderRadius: 6,
        background: "var(--white)",
        color: "var(--primary)",
        cursor: "pointer",
        padding: 0,
    },
    empty: {
        padding: "70px 20px",
        textAlign: "center",
        color: "var(--text-muted)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
    },
    // Modal
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    modal: {
        background: "var(--white)",
        borderRadius: "var(--radius)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        width: "100%",
        maxWidth: 500,
        fontFamily: "Nunito, sans-serif",
    },
    modalHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 22px 14px",
        borderBottom: "1.5px solid var(--border)",
    },
    modalBody: {
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
    },
    modalFooter: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        padding: "14px 22px 18px",
        borderTop: "1.5px solid var(--border)",
    },
    label: {
        fontSize: "0.82rem",
        fontWeight: 700,
        color: "var(--text-muted)",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
    },
    input: {
        padding: "9px 12px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontFamily: "Nunito, sans-serif",
        background: "var(--white)",
        color: "var(--text)",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
    },
    btnPrimary: {
        padding: "9px 20px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontWeight: 700,
        fontSize: "0.88rem",
        cursor: "pointer",
        fontFamily: "Nunito, sans-serif",
    },
    btnSecondary: {
        padding: "9px 20px",
        background: "var(--white)",
        color: "var(--text)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontWeight: 700,
        fontSize: "0.88rem",
        cursor: "pointer",
        fontFamily: "Nunito, sans-serif",
    },
    btnIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: "var(--text-muted)",
        borderRadius: 6,
    },
    errorMsg: {
        background: "#fce8e8",
        color: "#c0392b",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: "0.84rem",
        fontWeight: 600,
    },
};
