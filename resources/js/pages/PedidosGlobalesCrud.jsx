import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconSearch, IconEmptySearch, IconLoading, IconEdit, IconTrash, IconClose } from "../components/Icons";
import api from "../api/axios";

const POR_PAGINA = 8;
const dateOnly = (v) => (v ? String(v).split("T")[0] : "");

function parseDateLocal(str) {
    return new Date(String(str).split("T")[0] + "T00:00:00");
}
function fmtDateCron(d) {
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
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

// Para cada proyecto presente en los pedidos del global, busca su cronograma
// y evalúa si la fecha del pedido global se generó dentro del plazo (a más tardar en el corte).
// Generar antes del corte está bien; pasarse del corte es lo que no se permite.
function getCronogramaInfo(g, pedidos, cronogramas) {
    const proyectos = [...new Set(pedidos.map((p) => p.contrato?.cliente_proyecto).filter(Boolean))];
    if (proyectos.length === 0) return [];
    const fechaGlobal = g.fecha ? parseDateLocal(g.fecha) : null;
    return proyectos.map((nombre) => {
        const cron = cronogramas.find((c) => c.activo && c.proyecto?.nombre === nombre);
        if (!cron?.fecha_entrega) return { proyecto: nombre, cron: null };
        const { corte, entrega } = computeCronDates(cron.fecha_entrega, cron.ciclo_meses);
        const matches = fechaGlobal ? fechaGlobal <= corte : null;
        return { proyecto: nombre, cron, corte, entrega, matches };
    });
}

// ── Helpers de estado para pedido incluido ─────────────────────────────────
function estadoDisplay(pedido, globalConfirmado) {
    if (pedido.estado === "Devolución") return { label: "Devolución",  bg: "#fce8e8", color: "#c0392b" };
    if (globalConfirmado)               return { label: "Completado",  bg: "#dcfce7", color: "#0d6e5a" };
    return                                     { label: "En proceso",  bg: "#e8f0ff", color: "#1a4fa8" };
}

// ── Modal pedido incluido (ver / devolver) ─────────────────────────────────
function PedidoIncluidoModal({ pedido, global: g, onClose, onDevuelto }) {
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState("");
    const [confirm, setConfirm] = useState(false);

    const est = estadoDisplay(pedido, g.confirmado);
    const puedeDevolver = pedido.estado === "Completado";

    const handleDevolver = async () => {
        setSaving(true);
        setError("");
        try {
            const { data } = await api.post(`/pedidos-automaticos/${pedido.id}/devolver`);
            onDevuelto(data);
        } catch (e) {
            setError(e?.response?.data?.message ?? "Error al procesar la devolución.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 500 }}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>
                        Pedido <span style={{ fontFamily: "monospace" }}>#{pedido.codigo}</span>
                    </span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    {/* Empleado */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <div style={{ ...S.avatarSm, flexShrink: 0 }}>
                            {(pedido.empleado?.nombres || "?").charAt(0).toUpperCase()}
                            {pedido.empleado?.fotografia && (
                                <img src={`/storage/${pedido.empleado.fotografia}`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                            )}
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                                {pedido.empleado?.nombres} {pedido.empleado?.apellidos}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                C.C. {pedido.empleado?.cedula ?? "—"}
                            </div>
                        </div>
                        <span style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, fontWeight: 700, fontSize: "0.78rem", background: est.bg, color: est.color }}>
                            {est.label}
                        </span>
                    </div>

                    {/* Items */}
                    <div style={{ background: "var(--bg)", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", marginBottom: 8 }}>
                            Prendas asignadas
                        </div>
                        {(pedido.items ?? []).length === 0 ? (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>Sin items</span>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {(pedido.items ?? []).map((it, i) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                                        <span>{it.inventario?.categoria} {it.inventario?.subcategoria} T:{it.inventario?.talla}</span>
                                        <span style={{ fontWeight: 700, color: "var(--primary)" }}>×{it.cantidad}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {pedido.estado === "Devolución" && (
                        <div style={{ background: "#fce8e8", border: "1.5px solid #e57373", borderRadius: 8, padding: "10px 14px", fontSize: "0.84rem", color: "#c0392b" }}>
                            Este pedido ya fue marcado como devolución y el inventario fue restaurado.
                        </div>
                    )}

                    {puedeDevolver && !confirm && (
                        <div style={{ background: "#fff8e0", border: "1.5px solid #f9c74f", borderRadius: 8, padding: "10px 14px", fontSize: "0.84rem", color: "#7a5c00" }}>
                            Al marcar como <strong>Devolución</strong>, todas las prendas de este pedido volverán al inventario.
                        </div>
                    )}

                    {puedeDevolver && confirm && (
                        <div style={{ background: "#fce8e8", border: "1.5px solid #e57373", borderRadius: 8, padding: "10px 14px", fontSize: "0.84rem", color: "#c0392b" }}>
                            ¿Confirmar devolución? Esta acción restaurará el inventario y no se puede deshacer.
                        </div>
                    )}

                    {error && <div style={{ ...S.errorMsg, marginTop: 10 }}>{error}</div>}
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cerrar</button>
                    {puedeDevolver && !confirm && (
                        <button style={{ ...S.btnPrimary, background: "#c0392b" }} onClick={() => setConfirm(true)}>
                            Marcar devolución
                        </button>
                    )}
                    {puedeDevolver && confirm && (
                        <button style={{ ...S.btnPrimary, background: "#c0392b" }} onClick={handleDevolver} disabled={saving}>
                            {saving ? "Procesando…" : "Confirmar devolución"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Modal editar ───────────────────────────────────────────────────────────
function EditModal({ global: g, onClose, onSaved }) {
    const [form, setForm]     = useState({ fecha: dateOnly(g.fecha), notas: g.notas ?? "" });
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState("");

    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            const { data } = await api.put(`/pedidos-globales/${g.id}`, form);
            onSaved(data);
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
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>Editar Pedido Global <span style={{ fontFamily: "monospace" }}>#{g.codigo}</span></span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <label style={S.label}>Fecha</label>
                    <input
                        type="date"
                        style={S.input}
                        value={form.fecha}
                        onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
                    />
                    <label style={{ ...S.label, marginTop: 14 }}>Notas</label>
                    <textarea
                        style={{ ...S.input, minHeight: 80, resize: "vertical" }}
                        value={form.notas}
                        onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
                        placeholder="Notas opcionales…"
                    />
                    {error && <div style={S.errorMsg}>{error}</div>}
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cancelar</button>
                    <button style={S.btnPrimary} onClick={handleSave} disabled={saving}>
                        {saving ? "Guardando…" : "Guardar cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Modal confirmar pedido global ──────────────────────────────────────────
function ConfirmModal({ global: g, onClose, onConfirmed }) {
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState("");

    const handleConfirm = async () => {
        setSaving(true);
        setError("");
        try {
            const { data } = await api.put(`/pedidos-globales/${g.id}`, { confirmado: true });
            onConfirmed(data);
        } catch (e) {
            setError(e?.response?.data?.message ?? "Error al confirmar.");
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 420 }}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem", color: "#0d6e5a" }}>Confirmar Pedido Global</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <p style={{ marginBottom: 10 }}>
                        ¿Confirmar la entrega del pedido global <strong style={{ fontFamily: "monospace" }}>#{g.codigo}</strong>?
                    </p>
                    <div style={{ background: "#e0f7f4", border: "1.5px solid #0d6e5a", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem", color: "#0d6e5a" }}>
                        El pedido quedará marcado como <strong>Confirmado</strong> y no podrá revertirse.
                    </div>
                    {error && <div style={{ ...S.errorMsg, marginTop: 10 }}>{error}</div>}
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cancelar</button>
                    <button style={{ ...S.btnPrimary, background: "#0d6e5a" }} onClick={handleConfirm} disabled={saving}>
                        {saving ? "Confirmando…" : "Confirmar entrega"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Modal confirmar eliminar ────────────────────────────────────────────────
function DeleteModal({ global: g, onClose, onDeleted }) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError]       = useState("");

    const handleDelete = async () => {
        setDeleting(true);
        setError("");
        try {
            await api.delete(`/pedidos-globales/${g.id}`);
            onDeleted(g.id);
        } catch (e) {
            setError(e?.response?.data?.message ?? "Error al eliminar.");
            setDeleting(false);
        }
    };

    const pedidos = (g.pedidos_automaticos ?? []).filter((p) => p.codigo);

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 420 }}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem", color: "#c0392b" }}>Eliminar Pedido Global</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <p style={{ marginBottom: 10 }}>
                        ¿Estás seguro de eliminar el pedido global <strong style={{ fontFamily: "monospace" }}>#{g.codigo}</strong>?
                    </p>
                    {pedidos.length > 0 && (
                        <div style={{ background: "#fff8e1", border: "1.5px solid #f9c74f", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem", color: "#7a5c00" }}>
                            Los <strong>{pedidos.length} pedido(s)</strong> incluidos volverán a estado <strong>Activo</strong> (En proceso).
                        </div>
                    )}
                    {error && <div style={{ ...S.errorMsg, marginTop: 10 }}>{error}</div>}
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={deleting}>Cancelar</button>
                    <button style={{ ...S.btnPrimary, background: "#c0392b" }} onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Eliminando…" : "Eliminar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Vista principal ────────────────────────────────────────────────────────
export default function PedidosGlobalesCrud() {
    const qc = useQueryClient();
    const [search, setSearch]           = useState("");
    const [filtroEstado, setFiltroEstado] = useState("Todos");
    const [pagina, setPagina]           = useState(1);
    const [expanded, setExpanded]   = useState(null);
    const [subSearch, setSubSearch] = useState("");
    const [editTarget, setEditTarget]       = useState(null);
    const [deleteTarget, setDeleteTarget]   = useState(null);
    const [confirmTarget, setConfirmTarget] = useState(null);
    const [editPedido, setEditPedido]       = useState(null); // { pedido, global }

    const { data: globales = [], isLoading } = useQuery({
        queryKey: ["pedidos-globales"],
        queryFn: () => api.get("/pedidos-globales").then((r) => r.data),
    });

    const { data: cronogramas = [] } = useQuery({
        queryKey: ["cronograma-dotacion"],
        queryFn: () => api.get("/cronograma-dotacion").then((r) => r.data),
    });

    const stats = useMemo(() => ({
        total:        globales.length,
        totalPedidos: globales.reduce((s, g) =>
            s + (g.pedidos_automaticos ?? []).filter(p => p.codigo).length, 0),
        totalPrendas: globales.reduce((s, g) =>
            s + (g.pedidos_automaticos ?? []).filter(p => p.codigo).reduce((ss, p) =>
                ss + (p.items ?? []).reduce((sss, it) => sss + it.cantidad, 0), 0), 0),
    }), [globales]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return globales.filter((g) => {
            const matchQ = !q || g.codigo.toLowerCase().includes(q) || String(g.fecha ?? "").includes(q);
            const matchE =
                filtroEstado === "Todos" ||
                (filtroEstado === "Confirmado" && g.confirmado) ||
                (filtroEstado === "En proceso" && !g.confirmado);
            return matchQ && matchE;
        });
    }, [globales, search, filtroEstado]);

    const paginated    = useMemo(() => filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), [filtered, pagina]);
    const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);

    const toggle = (id) => {
        setExpanded((prev) => (prev === id ? null : id));
        setSubSearch("");
    };

    const handleSaved = (updated) => {
        qc.setQueryData(["pedidos-globales"], (old = []) =>
            old.map((g) => (g.id === updated.id ? updated : g))
        );
        setEditTarget(null);
    };

    const handleDeleted = (id) => {
        qc.setQueryData(["pedidos-globales"], (old = []) => old.filter((g) => g.id !== id));
        qc.invalidateQueries({ queryKey: ["pedidos-automaticos"] });
        setDeleteTarget(null);
        if (expanded === id) setExpanded(null);
    };

    const handleDevuelto = (updatedPedido) => {
        qc.setQueryData(["pedidos-globales"], (old = []) =>
            old.map((g) => ({
                ...g,
                pedidos_automaticos: (g.pedidos_automaticos ?? []).map((p) =>
                    p.id === updatedPedido.id ? updatedPedido : p
                ),
            }))
        );
        qc.invalidateQueries({ queryKey: ["inventario-dotacion-flat"] });
        qc.invalidateQueries({ queryKey: ["inventario_dotacion"] });
        qc.invalidateQueries({ queryKey: ["pedidos-automaticos"] });
        setEditPedido(null);
    };

    const handleConfirmed = (updated) => {
        qc.setQueryData(["pedidos-globales"], (old = []) =>
            old.map((g) => (g.id === updated.id ? updated : g))
        );
        setConfirmTarget(null);
    };

    return (
        <div style={{ width: "100%" }}>
            {/* Stats */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Pedidos globales</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#0d6e5a" }}>{stats.totalPedidos}</div>
                    <div className="stat-label">Pedidos completados</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#1a5fa8" }}>{stats.totalPrendas}</div>
                    <div className="stat-label">Prendas entregadas</div>
                </div>
            </div>

            {/* Toolbar */}
            <div style={S.toolbar}>
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}><IconSearch size={15} /></span>
                    <input
                        style={S.searchInput}
                        placeholder="Buscar código, fecha…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPagina(1); }}
                    />
                </div>
                <select
                    style={S.selectFilter}
                    value={filtroEstado}
                    onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
                >
                    <option value="Todos">Todos los estados</option>
                    <option value="En proceso">En proceso</option>
                    <option value="Confirmado">Confirmado</option>
                </select>
            </div>

            {/* Tabla */}
            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando pedidos globales…</p></div>
                ) : filtered.length === 0 ? (
                    <div style={S.empty}><IconEmptySearch size={44} /><p>No se encontraron pedidos globales.</p></div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 32 }}></th>
                                <th>Código</th>
                                <th>Fecha</th>
                                <th>Fecha de corte</th>
                                <th>Fecha de entrega</th>
                                <th style={{ textAlign: "center" }}>Pedidos</th>
                                <th style={{ textAlign: "center" }}>Prendas</th>
                                <th>Cronograma</th>
                                <th>Notas</th>
                                <th style={{ width: 80 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((g) => {
                                const isOpen  = expanded === g.id;
                                const pedidos = (g.pedidos_automaticos ?? []).filter(p => p.codigo);
                                const prendas = pedidos.reduce((s, p) =>
                                    s + (p.items ?? []).reduce((ss, it) => ss + it.cantidad, 0), 0);
                                const qSub = subSearch.trim().toLowerCase();
                                const pedidosVisibles = !qSub ? pedidos : pedidos.filter((p) => {
                                    const nombre = `${p.empleado?.nombres ?? ""} ${p.empleado?.apellidos ?? ""}`.toLowerCase();
                                    const cedula = String(p.empleado?.cedula ?? "").toLowerCase();
                                    const codigo = String(p.codigo ?? "").toLowerCase();
                                    return nombre.includes(qSub) || cedula.includes(qSub) || codigo.includes(qSub);
                                });
                                const cronInfo = getCronogramaInfo(g, pedidos, cronogramas);

                                return (
                                    <React.Fragment key={g.id}>
                                        <tr
                                            style={{ cursor: pedidos.length > 0 ? "pointer" : "default", background: isOpen ? "#f0f9f7" : undefined }}
                                            onClick={() => pedidos.length > 0 && toggle(g.id)}
                                        >
                                            <td style={{ textAlign: "center", color: "var(--primary)", fontWeight: 800, fontSize: "1rem" }}>
                                                {pedidos.length > 0 ? (isOpen ? "▾" : "▸") : ""}
                                            </td>
                                            <td>
                                                <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "0.95rem" }}>
                                                    #{g.codigo}
                                                </span>
                                            </td>
                                            <td>{g.fecha ? fmtDateCron(parseDateLocal(g.fecha)) : "—"}</td>
                                            <td style={{ fontSize: "0.84rem" }}>
                                                {cronInfo.length === 0 ? (
                                                    <span style={{ color: "var(--text-muted)" }}>—</span>
                                                ) : (
                                                    cronInfo.map(({ proyecto, cron, corte }) => (
                                                        <div key={proyecto} title={proyecto}>
                                                            {cron ? fmtDateCron(corte) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                                                        </div>
                                                    ))
                                                )}
                                            </td>
                                            <td style={{ fontSize: "0.84rem" }}>
                                                {cronInfo.length === 0 ? (
                                                    <span style={{ color: "var(--text-muted)" }}>—</span>
                                                ) : (
                                                    cronInfo.map(({ proyecto, cron, entrega }) => (
                                                        <div key={proyecto} title={proyecto}>
                                                            {cron ? fmtDateCron(entrega) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                                                        </div>
                                                    ))
                                                )}
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <span style={S.badge("#e0f7f4", "#0d6e5a")}>
                                                    {pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <span style={S.badge("#e8f0ff", "#1a4fa8")}>
                                                    {prendas} prenda{prendas !== 1 ? "s" : ""}
                                                </span>
                                            </td>
                                            <td>
                                                {(() => {
                                                    if (cronInfo.length === 0) {
                                                        return <span style={{ color: "var(--text-muted)" }}>—</span>;
                                                    }
                                                    return (
                                                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                            {cronInfo.map(({ proyecto, cron, corte, entrega, matches }) => (
                                                                <span
                                                                    key={proyecto}
                                                                    title={
                                                                        cron
                                                                            ? matches
                                                                                ? `Generado a tiempo · Corte: ${fmtDateCron(corte)}`
                                                                                : `Se generó después del corte (${fmtDateCron(corte)}) · Entrega: ${fmtDateCron(entrega)}`
                                                                            : "Sin cronograma configurado para este proyecto"
                                                                    }
                                                                    style={S.badge(
                                                                        !cron ? "#f1f5f9" : matches ? "#dcfce7" : "#fef3c7",
                                                                        !cron ? "#475569" : matches ? "#0d6e5a" : "#92400e"
                                                                    )}
                                                                >
                                                                    {proyecto} {!cron ? "· sin cronograma" : matches ? "✓" : "⚠ pasó el corte"}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>
                                                {g.notas ?? "—"}
                                            </td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                                                    <button
                                                        style={S.actionBtn}
                                                        title="Editar"
                                                        onClick={() => setEditTarget(g)}
                                                    >
                                                        <IconEdit size={14} />
                                                    </button>
                                                    {!g.confirmado && (
                                                        <button
                                                            style={{ ...S.actionBtn, color: "#0d6e5a" }}
                                                            title="Confirmar entrega"
                                                            onClick={() => setConfirmTarget(g)}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {g.confirmado && (
                                                        <span title="Entrega confirmada" style={{ display: "flex", alignItems: "center", color: "#0d6e5a", padding: "0 4px" }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                    <button
                                                        style={{ ...S.actionBtn, color: "#c0392b" }}
                                                        title="Eliminar"
                                                        onClick={() => setDeleteTarget(g)}
                                                    >
                                                        <IconTrash size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {isOpen && (
                                            <tr>
                                                <td colSpan={10} style={{ padding: 0, background: "#f8fffe", borderBottom: "2px solid var(--primary)" }}>
                                                    <div style={{ padding: "16px 28px 20px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                                                            <p style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.85rem", margin: 0 }}>
                                                                Pedidos incluidos en #{g.codigo}
                                                            </p>
                                                            {pedidos.length > 1 && (
                                                                <div style={{ position: "relative", width: 220 }} onClick={(e) => e.stopPropagation()}>
                                                                    <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                                                                        <IconSearch size={13} />
                                                                    </span>
                                                                    <input
                                                                        style={{ width: "100%", padding: "6px 10px 6px 28px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", fontFamily: "Nunito,sans-serif", outline: "none" }}
                                                                        placeholder="Buscar nombre, cédula, # pedido…"
                                                                        value={subSearch}
                                                                        onChange={(e) => setSubSearch(e.target.value)}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                                                            <thead>
                                                                <tr style={{ borderBottom: "1.5px solid var(--border)" }}>
                                                                    <th style={S.thInner}>Código</th>
                                                                    <th style={S.thInner}>Empleado</th>
                                                                    <th style={S.thInner}>Cédula</th>
                                                                    <th style={{ ...S.thInner, textAlign: "center" }}>Items</th>
                                                                    <th style={S.thInner}>Prendas asignadas</th>
                                                                    <th style={{ ...S.thInner, textAlign: "center" }}>Estado</th>
                                                                    <th style={{ width: 40 }}></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {pedidosVisibles.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={7} style={{ ...S.tdInner, textAlign: "center", color: "var(--text-muted)", padding: "14px 0" }}>
                                                                            Sin resultados para "{subSearch}"
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                                {pedidosVisibles.map((p) => {
                                                                    const est = estadoDisplay(p, g.confirmado);
                                                                    return (
                                                                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                                                        <td style={S.tdInner}>
                                                                            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>#{p.codigo}</span>
                                                                        </td>
                                                                        <td style={S.tdInner}>
                                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                                <div style={S.avatarSm}>
                                                                                    {(p.empleado?.nombres || "?").charAt(0).toUpperCase()}
                                                                                    {p.empleado?.fotografia && (
                                                                                        <img src={`/storage/${p.empleado.fotografia}`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                                                                    )}
                                                                                </div>
                                                                                {p.empleado?.nombres} {p.empleado?.apellidos}
                                                                            </div>
                                                                        </td>
                                                                        <td style={S.tdInner}>{p.empleado?.cedula ?? "—"}</td>
                                                                        <td style={{ ...S.tdInner, textAlign: "center" }}>
                                                                            {(p.items ?? []).length}
                                                                        </td>
                                                                        <td style={S.tdInner}>
                                                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                                                                {(p.items ?? []).map((it, idx) => (
                                                                                    <span key={idx} style={S.badge("#f0f0f0", "#444")}>
                                                                                        {it.inventario?.categoria} {it.inventario?.subcategoria} T:{it.inventario?.talla} ×{it.cantidad}
                                                                                    </span>
                                                                                ))}
                                                                                {(p.items ?? []).length === 0 && (
                                                                                    <span style={{ color: "var(--text-muted)" }}>Sin items</span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ ...S.tdInner, textAlign: "center" }}>
                                                                            <span style={{ padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.76rem", background: est.bg, color: est.color, whiteSpace: "nowrap" }}>
                                                                                {est.label}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ ...S.tdInner, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                                                            <button
                                                                                style={{ ...S.actionBtn, width: 26, height: 26 }}
                                                                                title="Ver / Devolver"
                                                                                onClick={() => setEditPedido({ pedido: p, global: g })}
                                                                            >
                                                                                <IconEdit size={13} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Paginación */}
            {!isLoading && filtered.length > POR_PAGINA && (
                <div style={S.paginationBar}>
                    <span style={S.paginationInfo}>
                        Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filtered.length)} de {filtered.length} globales
                    </span>
                    <div style={S.paginationBtns}>
                        <button style={S.pageBtn(pagina === 1, false)} disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>‹</button>
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
                            .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…"); acc.push(p); return acc; }, [])
                            .map((item, idx) =>
                                item === "…" ? (
                                    <span key={`e${idx}`} style={{ padding: "0 4px", color: "var(--text-muted)", fontWeight: 700 }}>…</span>
                                ) : (
                                    <button key={item} style={S.pageBtn(false, item === pagina)} onClick={() => setPagina(item)}>{item}</button>
                                )
                            )}
                        <button style={S.pageBtn(pagina === totalPaginas, false)} disabled={pagina === totalPaginas} onClick={() => setPagina((p) => p + 1)}>›</button>
                    </div>
                </div>
            )}

            {/* Modales */}
            {editTarget    && <EditModal    global={editTarget}    onClose={() => setEditTarget(null)}    onSaved={handleSaved}       />}
            {deleteTarget  && <DeleteModal  global={deleteTarget}  onClose={() => setDeleteTarget(null)}  onDeleted={handleDeleted}   />}
            {confirmTarget && <ConfirmModal global={confirmTarget} onClose={() => setConfirmTarget(null)} onConfirmed={handleConfirmed} />}
            {editPedido    && <PedidoIncluidoModal pedido={editPedido.pedido} global={editPedido.global} onClose={() => setEditPedido(null)} onDevuelto={handleDevuelto} />}
        </div>
    );
}

const S = {
    toolbar:        { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
    selectFilter:   { padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", cursor: "pointer", outline: "none" },
    searchWrap:     { position: "relative", flex: 1, maxWidth: 360 },
    searchIcon:     { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", color: "var(--text-muted)", pointerEvents: "none" },
    searchInput:    { width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none" },
    tableWrap:      { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    empty:          { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    badge:          (bg, color) => ({ background: bg, color, borderRadius: 20, padding: "3px 10px", fontSize: "0.76rem", fontWeight: 700, whiteSpace: "nowrap", display: "inline-block" }),
    thInner:        { padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" },
    tdInner:        { padding: "9px 12px", verticalAlign: "middle" },
    avatarSm:       { width: 26, height: 26, borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.78rem", flexShrink: 0, overflow: "hidden", position: "relative" },
    paginationBar:  { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", flexWrap: "wrap", gap: 10 },
    paginationInfo: { fontSize: "0.84rem", color: "var(--text-muted)", fontWeight: 600 },
    paginationBtns: { display: "flex", alignItems: "center", gap: 4 },
    pageBtn:        (disabled, active) => ({ minWidth: 32, height: 32, padding: "0 8px", border: active ? "none" : "1.5px solid var(--border)", borderRadius: 6, background: active ? "var(--primary)" : disabled ? "var(--bg)" : "var(--white)", color: active ? "#fff" : disabled ? "var(--text-muted)" : "var(--text)", fontWeight: 700, fontSize: "0.88rem", cursor: disabled ? "default" : "pointer", fontFamily: "Nunito,sans-serif", opacity: disabled ? 0.5 : 1 }),
    actionBtn:      { display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "1.5px solid var(--border)", borderRadius: 6, background: "var(--white)", color: "var(--primary)", cursor: "pointer", padding: 0 },
    // Modal
    overlay:        { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
    modal:          { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", width: "100%", maxWidth: 480, fontFamily: "Nunito,sans-serif" },
    modalHeader:    { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1.5px solid var(--border)" },
    modalBody:      { padding: "18px 22px", display: "flex", flexDirection: "column" },
    modalFooter:    { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px 18px", borderTop: "1.5px solid var(--border)" },
    label:          { fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" },
    input:          { padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", width: "100%", boxSizing: "border-box" },
    btnPrimary:     { padding: "9px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnSecondary:   { padding: "9px 20px", background: "var(--white)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnIcon:        { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", borderRadius: 6 },
    errorMsg:       { background: "#fce8e8", color: "#c0392b", borderRadius: 6, padding: "8px 12px", fontSize: "0.84rem", fontWeight: 600 },
};
