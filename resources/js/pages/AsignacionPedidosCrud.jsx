import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import { IconSearch, IconEmptySearch, IconLoading } from "../components/Icons";

/**
 * Asignación de Pedidos: quién queda a cargo de GESTIONAR cada pedido (cotizar,
 * comprar, hacer seguimiento) — distinto de `responsable`, que es quién lo pidió. Sin
 * esto, un pedido nuevo cae en una bandeja compartida y nadie es responsable de
 * moverlo; asignándolo, queda con un dueño claro y se puede filtrar la carga de
 * trabajo por persona.
 */
export default function AsignacionPedidosCrud() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [filtro, setFiltro] = useState("sin_asignar");
    const [toast, setToast] = useState(null);
    const [asignandoId, setAsignandoId] = useState(null);

    const showToast = (msg, isError = false) => {
        setToast({ msg, isError });
        setTimeout(() => setToast(null), 4000);
    };

    const { data: pedidos = [], isLoading } = useQuery({
        queryKey: ["pedidos-compra"],
        queryFn: () => api.get("/pedidos-compra").then((r) => r.data),
    });

    const { data: usuarios = [] } = useQuery({
        queryKey: ["usuarios-catalogo"],
        queryFn: () => api.get("/usuarios-catalogo").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });

    const stats = useMemo(() => ({
        total: pedidos.length,
        sinAsignar: pedidos.filter((p) => !p.asignado_a_user_id).length,
        asignados: pedidos.filter((p) => p.asignado_a_user_id).length,
    }), [pedidos]);

    const filtrados = useMemo(() => {
        const q = debouncedSearch.toLowerCase().trim();
        return pedidos.filter((p) => {
            if (filtro === "sin_asignar" && p.asignado_a_user_id) return false;
            if (filtro === "asignados" && !p.asignado_a_user_id) return false;
            if (!q) return true;
            return [p.codigo, p.responsable, p.sede].some((v) => (v ?? "").toLowerCase().includes(q));
        });
    }, [pedidos, filtro, debouncedSearch]);

    /**
     * Al asignar (no al desasignar), el backend intenta mandar de una vez el Acta de
     * Entrega consolidada del pedido al `responsable` — el resultado viene en `acta` de
     * la respuesta y aquí solo se refleja en el toast, éxito o motivo del fallo.
     */
    const handleAsignar = async (pedido, userId) => {
        setAsignandoId(pedido.id);
        try {
            const { data } = await api.patch(`/pedidos-compra/${pedido.id}/asignar`, { asignado_a_user_id: userId || null });
            qc.invalidateQueries({ queryKey: ["pedidos-compra"] });

            if (!userId) {
                showToast(`Pedido ${pedido.codigo} desasignado.`);
            } else if (data.acta?.enviada) {
                showToast(`Pedido ${pedido.codigo} asignado. Acta de entrega enviada a ${data.acta.destinatario}.`);
            } else {
                showToast(`Pedido ${pedido.codigo} asignado, pero no se pudo enviar el acta: ${data.acta?.motivo ?? "motivo desconocido"}.`, true);
            }
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo actualizar la asignación.", true);
        } finally {
            setAsignandoId(null);
        }
    };

    const puedeAsignar = (p) =>
        (p.items ?? []).some((it) => it.estado_revision === "Aprobado por Stock" || it.estado_revision === "Traslado Aprobado");

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={{ ...S.toast, ...(toast.isError ? S.toastError : {}) }}>{toast.msg}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Total pedidos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#b7780c" }}>{stats.sinAsignar}</div>
                    <div className="stat-label">Sin asignar</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "var(--primary-dark)" }}>{stats.asignados}</div>
                    <div className="stat-label">Asignados</div>
                </div>
            </div>

            <div style={S.tabBar}>
                {[
                    { id: "sin_asignar", label: "Sin asignar" },
                    { id: "asignados", label: "Asignados" },
                    { id: "todos", label: "Todos" },
                ].map((t) => (
                    <button key={t.id} style={{ ...S.tab, ...(filtro === t.id ? S.tabActive : {}) }} onClick={() => setFiltro(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div style={S.searchWrap}>
                <span style={S.searchIcon}><IconSearch size={15} /></span>
                <input
                    style={S.searchInput}
                    placeholder="Buscar por código, responsable o sede…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
                ) : filtrados.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p>No hay pedidos que coincidan con este filtro.</p>
                    </div>
                ) : (
                    <table className="data-table" style={{ fontSize: "0.85rem" }}>
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Fecha</th>
                                <th>Responsable</th>
                                <th>Sede</th>
                                <th>Estado</th>
                                <th style={{ minWidth: 200 }}>Asignado a</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.map((p) => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 800, fontFamily: "monospace" }}>{p.codigo}</td>
                                    <td>{p.fecha_registro}</td>
                                    <td style={{ fontWeight: 600 }}>{p.responsable}</td>
                                    <td>{p.sede}</td>
                                    <td>
                                        <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#e8f0ff", color: "#1a4fa8", whiteSpace: "nowrap" }}>
                                            {p.estado}
                                        </span>
                                    </td>
                                    <td>
                                        <select
                                            style={S.selectInline}
                                            value={p.asignado_a_user_id ?? ""}
                                            disabled={asignandoId === p.id || (!puedeAsignar(p) && !p.asignado_a_user_id)}
                                            title={!puedeAsignar(p) && !p.asignado_a_user_id ? "Primero revisa el stock de este pedido: todavía no tiene productos listos para entregar." : undefined}
                                            onChange={(e) => handleAsignar(p, e.target.value ? Number(e.target.value) : null)}
                                        >
                                            <option value="">— Sin asignar —</option>
                                            {usuarios.map((u) => (
                                                <option key={u.id} value={u.id}>{u.name}{u.cargo ? ` (${u.cargo})` : ""}</option>
                                            ))}
                                        </select>
                                        {!puedeAsignar(p) && !p.asignado_a_user_id && (
                                            <div style={S.hint}>Revisa el stock antes de asignar</div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

const S = {
    tabBar: { display: "flex", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 16, flexWrap: "wrap" },
    tab: { padding: "10px 20px", background: "none", border: "none", borderBottom: "2.5px solid transparent", marginBottom: "-2px", cursor: "pointer", fontSize: "0.88rem", fontWeight: 700, fontFamily: "Nunito, sans-serif", color: "var(--text-muted)" },
    tabActive: { color: "var(--primary-dark)", borderBottom: "2.5px solid var(--primary)" },
    searchWrap: { position: "relative", maxWidth: 420, marginBottom: 16 },
    searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", display: "flex" },
    searchInput: { width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", boxSizing: "border-box" },
    tableWrap: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    selectInline: { width: "100%", padding: "6px 8px", border: "1.5px solid var(--border)", borderRadius: 6, fontSize: "0.82rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none" },
    empty: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    toast: { position: "fixed", bottom: 28, right: 28, background: "var(--primary)", color: "#fff", borderRadius: "var(--radius-sm)", padding: "13px 22px", fontWeight: 700, fontSize: "0.92rem", zIndex: 99999, boxShadow: "0 8px 28px rgba(26,155,140,0.35)", maxWidth: 380 },
    toastError: { background: "#c0392b", boxShadow: "0 8px 28px rgba(192,57,43,0.35)" },
    hint: { fontSize: "0.72rem", color: "#b7780c", marginTop: 4, fontWeight: 600 },
};
