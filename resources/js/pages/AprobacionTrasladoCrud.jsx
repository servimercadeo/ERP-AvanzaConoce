import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import { IconSearch, IconEmptySearch, IconLoading, IconClose } from "../components/Icons";

/**
 * Si el producto de origen tiene seriales registrados, hay que elegir CUÁLES viajan
 * antes de poder aprobar (se mueven de identidad de una sede a otra, no solo de
 * cantidad) — mismo criterio que "Aprobado por Stock" en la revisión de Pedidos.
 */
function AprobarSerialesModal({ traslado, onClose, onConfirmar, procesando }) {
    const series = (traslado.origen?.series ?? []).map((s) => s.serial);
    const esperados = Math.min(traslado.cantidad, series.length);
    const [elegidos, setElegidos] = useState([]);

    const toggle = (serial) => {
        setElegidos((prev) => {
            if (prev.includes(serial)) return prev.filter((s) => s !== serial);
            if (prev.length >= esperados) return prev;
            return [...prev, serial];
        });
    };

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={{ ...S.modal, maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>Elegir seriales a trasladar</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 0 }}>
                        "{traslado.producto}" es serializado. Elige {esperados} serial(es) ({elegidos.length}/{esperados}) que se mueven de {traslado.origen?.sede?.nombre ?? "origen"} a {traslado.sede_destino?.nombre ?? "destino"}.
                    </p>
                    <div style={{ maxHeight: 240, overflowY: "auto", border: "1.5px solid var(--border)", borderRadius: 6, padding: 8 }}>
                        {series.map((serial) => (
                            <label key={serial} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.86rem", padding: "4px 0", cursor: "pointer", fontFamily: "monospace" }}>
                                <input type="checkbox" checked={elegidos.includes(serial)} onChange={() => toggle(serial)} />
                                {serial}
                            </label>
                        ))}
                    </div>
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={procesando}>Cancelar</button>
                    <button
                        style={{ ...S.btn, background: "var(--primary)", color: "#fff" }}
                        disabled={procesando || elegidos.length !== esperados}
                        onClick={() => onConfirmar(elegidos)}
                    >
                        {procesando ? "Aprobando…" : "Aprobar traslado"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Aprobación de Traslado: cuando en Pedidos revisan stock y piden traer un producto de
 * otra sede, la solicitud llega aquí "Pendiente Aprobación" — el movimiento real de
 * stock (descontar origen, sumar destino) y el envío del Acta de Traslado por correo
 * solo ocurren cuando se aprueba en esta pantalla, nunca antes. Rechazar deja el
 * producto sin revisar de nuevo en Pedidos, para que ahí elijan otra salida.
 */
export default function AprobacionTrasladoCrud() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [filtro, setFiltro] = useState("pendientes");
    const [toast, setToast] = useState(null);
    const [procesandoId, setProcesandoId] = useState(null);
    const [modalSeriales, setModalSeriales] = useState(null);

    const showToast = (msg, isError = false) => {
        setToast({ msg, isError });
        setTimeout(() => setToast(null), 4500);
    };

    const { data: traslados = [], isLoading } = useQuery({
        queryKey: ["traslados-producto"],
        queryFn: () => api.get("/traslados-producto").then((r) => r.data),
    });

    const invalidar = () => qc.invalidateQueries({ queryKey: ["traslados-producto"] });

    const stats = useMemo(() => ({
        total: traslados.length,
        pendientes: traslados.filter((t) => t.estado === "Pendiente Aprobación").length,
        aprobados: traslados.filter((t) => t.estado === "Completado").length,
        rechazados: traslados.filter((t) => t.estado === "Rechazado").length,
    }), [traslados]);

    const filtrados = useMemo(() => {
        const q = debouncedSearch.toLowerCase().trim();
        return traslados.filter((t) => {
            if (filtro === "pendientes" && t.estado !== "Pendiente Aprobación") return false;
            if (filtro === "aprobados" && t.estado !== "Completado") return false;
            if (filtro === "rechazados" && t.estado !== "Rechazado") return false;
            if (!q) return true;
            return [t.pedido?.codigo, t.producto, t.solicitado_por, t.origen?.sede?.nombre, t.sede_destino?.nombre]
                .some((v) => (v ?? "").toLowerCase().includes(q));
        });
    }, [traslados, filtro, debouncedSearch]);

    const enviarAprobacion = async (t, seriales) => {
        setProcesandoId(t.id);
        try {
            const { data } = await api.post(`/traslados-producto/${t.id}/aprobar`, seriales ? { seriales } : undefined);
            invalidar();
            setModalSeriales(null);
            if (data.acta?.enviada) {
                showToast(`Traslado aprobado. Acta enviada a ${data.acta.destinatario}.`);
            } else {
                showToast(`Traslado aprobado, pero no se pudo enviar el acta: ${data.acta?.motivo ?? "motivo desconocido"}.`, true);
            }
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo aprobar el traslado.", true);
        } finally {
            setProcesandoId(null);
        }
    };

    const handleAprobar = (t) => {
        if ((t.origen?.series ?? []).length > 0) {
            setModalSeriales(t);
            return;
        }
        if (!window.confirm(`¿Aprobar el traslado de ${t.cantidad} unidad(es) de "${t.producto}"? Esto descuenta el stock de origen, lo suma al destino y envía el Acta de Traslado por correo.`)) return;
        enviarAprobacion(t, null);
    };

    const handleRechazar = async (t) => {
        const motivo = window.prompt(`¿Por qué se rechaza el traslado de "${t.producto}"? (opcional, se deja como observación en Pedidos)`);
        if (motivo === null) return;
        setProcesandoId(t.id);
        try {
            await api.post(`/traslados-producto/${t.id}/rechazar`, { motivo: motivo.trim() || null });
            invalidar();
            showToast("Traslado rechazado. En Pedidos queda sin revisar de nuevo.");
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo rechazar el traslado.", true);
        } finally {
            setProcesandoId(null);
        }
    };

    const estadoBadge = (estado) => {
        if (estado === "Pendiente Aprobación") return { background: "#fef3c7", color: "#92400e" };
        if (estado === "Completado") return { background: "#dcfce7", color: "#15803d" };
        if (estado === "Rechazado") return { background: "#fde2e2", color: "#a33" };
        return { background: "#e8f0ff", color: "#1a4fa8" };
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={{ ...S.toast, ...(toast.isError ? S.toastError : {}) }}>{toast.msg}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Total traslados</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#b7780c" }}>{stats.pendientes}</div>
                    <div className="stat-label">Pendientes</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "var(--primary-dark)" }}>{stats.aprobados}</div>
                    <div className="stat-label">Aprobados</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#a33" }}>{stats.rechazados}</div>
                    <div className="stat-label">Rechazados</div>
                </div>
            </div>

            <div style={S.tabBar}>
                {[
                    { id: "pendientes", label: "Pendientes" },
                    { id: "aprobados", label: "Aprobados" },
                    { id: "rechazados", label: "Rechazados" },
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
                    placeholder="Buscar por pedido, producto, sede o solicitante…"
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
                        <p>No hay traslados que coincidan con este filtro.</p>
                    </div>
                ) : (
                    <table className="data-table" style={{ fontSize: "0.85rem" }}>
                        <thead>
                            <tr>
                                <th>Pedido</th>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Origen → Destino</th>
                                <th>Solicitado por</th>
                                <th>Estado</th>
                                <th style={{ minWidth: 220 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.map((t) => (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: 800, fontFamily: "monospace" }}>{t.pedido?.codigo ?? "—"}</td>
                                    <td style={{ fontWeight: 600 }}>{t.producto}</td>
                                    <td>
                                        {t.cantidad}
                                        {t.estado === "Pendiente Aprobación" && (t.origen?.series ?? []).length > 0 && (
                                            <div style={{ fontSize: "0.7rem", color: "#b7780c", fontWeight: 700 }}>serializado</div>
                                        )}
                                        {t.estado === "Completado" && t.seriales && (
                                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{t.seriales}</div>
                                        )}
                                    </td>
                                    <td style={{ fontSize: "0.82rem" }}>
                                        {t.origen?.sede?.nombre ?? "—"} <span style={{ color: "var(--text-muted)" }}>→</span> {t.sede_destino?.nombre ?? "—"}
                                    </td>
                                    <td>{t.solicitado_por ?? "—"}</td>
                                    <td>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 800, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", ...estadoBadge(t.estado) }}>
                                            {t.estado}
                                        </span>
                                        {t.estado !== "Pendiente Aprobación" && t.aprobado_por && (
                                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                                                por {t.aprobado_por}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        {t.estado === "Pendiente Aprobación" ? (
                                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                                <button
                                                    style={{ ...S.btn, background: "var(--primary)", color: "#fff" }}
                                                    disabled={procesandoId === t.id}
                                                    onClick={() => handleAprobar(t)}
                                                >
                                                    Aprobar
                                                </button>
                                                <button
                                                    style={{ ...S.btn, background: "#fde2e2", color: "#a33" }}
                                                    disabled={procesandoId === t.id}
                                                    onClick={() => handleRechazar(t)}
                                                >
                                                    Rechazar
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {modalSeriales && (
                <AprobarSerialesModal
                    traslado={modalSeriales}
                    onClose={() => setModalSeriales(null)}
                    onConfirmar={(seriales) => enviarAprobacion(modalSeriales, seriales)}
                    procesando={procesandoId === modalSeriales.id}
                />
            )}
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
    btn: { padding: "6px 12px", border: "none", borderRadius: 6, fontSize: "0.8rem", fontWeight: 700, fontFamily: "Nunito,sans-serif", cursor: "pointer" },
    empty: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    toast: { position: "fixed", bottom: 28, right: 28, background: "var(--primary)", color: "#fff", borderRadius: "var(--radius-sm)", padding: "13px 22px", fontWeight: 700, fontSize: "0.92rem", zIndex: 99999, boxShadow: "0 8px 28px rgba(26,155,140,0.35)", maxWidth: 380 },
    toastError: { background: "#c0392b", boxShadow: "0 8px 28px rgba(192,57,43,0.35)" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", width: "100%", fontFamily: "Nunito,sans-serif", maxHeight: "88vh", display: "flex", flexDirection: "column" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1.5px solid var(--border)", flexShrink: 0 },
    modalBody: { padding: "18px 22px", overflowY: "auto", flex: 1 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px 18px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },
    btnIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", borderRadius: 6 },
    btnSecondary: { padding: "7px 14px", background: "var(--white)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
};
