import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import { useAcciones } from "../hooks/useAcciones";
import { IconSearch, IconEmptySearch, IconLoading, IconClose, IconTrash, IconPlus } from "../components/Icons";

/**
 * Auxilios (Operaciones > Auxilios): auxilio por productividad de técnicos directos. Cada
 * mes, si un técnico directo (sin aliado_id) finaliza Work Orders, se le paga CADA una de
 * ellas al valor del tramo que alcanzó según el total del mes (no progresivo: si hizo 110,
 * las 110 se pagan al valor del tramo 106–120, no solo las que pasan de 105).
 */
const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const mesActual = () => new Date().toISOString().slice(0, 7);

export default function AuxiliosCrud() {
    const puede = useAcciones();
    const qc = useQueryClient();
    const [mes, setMes] = useState(mesActual());
    const [search, setSearch] = useState("");
    const debSearch = useDebounce(search, 300);
    const [tramosOpen, setTramosOpen] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const { data: resultado, isLoading } = useQuery({
        queryKey: ["auxilios-reporte", mes, debSearch],
        queryFn: () =>
            api.get("/auxilios/reporte", { params: { mes, search: debSearch || undefined } }).then((r) => r.data),
        placeholderData: (prev) => prev,
    });
    const resultados = resultado?.resultados ?? [];

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{resultados.length}</div>
                    <div className="stat-label">Técnicos con auxilio este mes</div>
                </div>
            </div>

            <div style={S.toolbar}>
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}><IconSearch size={15} /></span>
                    <input
                        style={S.searchInput}
                        placeholder="Buscar por técnico o cédula…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <input
                    type="month"
                    style={{ ...S.filtroSelect, minWidth: 160 }}
                    value={mes}
                    onChange={(e) => setMes(e.target.value)}
                />
                {puede.editar && (
                    <button className="btn-secondary" onClick={() => setTramosOpen(true)}>
                        Configurar escalas
                    </button>
                )}
            </div>

            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
                ) : resultados.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p>Ningún técnico directo cumple un tramo de auxilio en este mes.</p>
                    </div>
                ) : (
                    <table className="data-table" style={{ fontSize: "0.85rem" }}>
                        <thead>
                            <tr>
                                <th>Cédula</th>
                                <th>Técnico</th>
                                <th>WO Finalizadas</th>
                                <th>Escala</th>
                                <th>Valor por Orden</th>
                                <th>Total Auxilio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resultados.map((r) => (
                                <tr key={r.cedula}>
                                    <td style={{ color: "var(--text-muted)" }}>{r.cedula}</td>
                                    <td style={{ fontWeight: 700 }}>{r.nombre}</td>
                                    <td>{r.total_wo}</td>
                                    <td>{r.tramo ? `${r.tramo.desde} – ${r.tramo.hasta ?? "en adelante"}` : "—"}</td>
                                    <td>{r.tramo ? pesos.format(r.tramo.valor_por_orden) : "—"}</td>
                                    <td style={{ fontWeight: 700 }}>{pesos.format(r.total_auxilio)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {tramosOpen && (
                <TramosModal
                    onClose={() => setTramosOpen(false)}
                    onChanged={() => qc.invalidateQueries({ queryKey: ["auxilios-reporte"] })}
                    showToast={showToast}
                />
            )}
        </div>
    );
}

/* ─── Modal para configurar las escalas (tramos) del auxilio ────────────── */
function TramosModal({ onClose, onChanged, showToast }) {
    const qc = useQueryClient();
    const { data: tramos = [], isLoading } = useQuery({
        queryKey: ["auxilios-tramos"],
        queryFn: () => api.get("/auxilios/tramos").then((r) => r.data),
    });

    const refrescar = () => {
        qc.invalidateQueries({ queryKey: ["auxilios-tramos"] });
        onChanged();
    };

    const agregarTramo = async () => {
        try {
            await api.post("/auxilios/tramos", { desde: 0, hasta: null, valor_por_orden: 0 });
            refrescar();
        } catch {
            showToast("No se pudo agregar la escala.");
        }
    };

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800 }}>Configurar escalas de auxilio</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 0 }}>
                        Según el total de Work Orders que un técnico directo finalice en el mes, se le paga
                        cada una al valor de la escala que alcanzó. Deja "Hasta" vacío para la última escala
                        (sin límite superior).
                    </p>
                    {isLoading ? (
                        <div style={S.empty}><IconLoading size={28} /></div>
                    ) : (
                        <table className="data-table" style={{ fontSize: "0.85rem", width: "100%" }}>
                            <thead>
                                <tr>
                                    <th>Desde</th>
                                    <th>Hasta</th>
                                    <th>Valor por Orden</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tramos.map((t) => (
                                    <TramoRow key={t.id} tramo={t} onSaved={refrescar} onDeleted={refrescar} showToast={showToast} />
                                ))}
                            </tbody>
                        </table>
                    )}
                    <button
                        className="btn-secondary"
                        style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                        onClick={agregarTramo}
                    >
                        <IconPlus size={14} /> Agregar escala
                    </button>
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnPrimary} onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
}

function TramoRow({ tramo, onSaved, onDeleted, showToast }) {
    const [desde, setDesde] = useState(tramo.desde);
    const [hasta, setHasta] = useState(tramo.hasta ?? "");
    const [valor, setValor] = useState(tramo.valor_por_orden);
    const [saving, setSaving] = useState(false);

    const guardar = async () => {
        setSaving(true);
        try {
            await api.put(`/auxilios/tramos/${tramo.id}`, {
                desde: Number(desde),
                hasta: hasta === "" ? null : Number(hasta),
                valor_por_orden: Number(valor),
            });
            showToast("Escala actualizada.");
            onSaved();
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo guardar la escala.");
        } finally {
            setSaving(false);
        }
    };

    const eliminar = async () => {
        if (!window.confirm("¿Eliminar esta escala?")) return;
        try {
            await api.delete(`/auxilios/tramos/${tramo.id}`);
            showToast("Escala eliminada.");
            onDeleted();
        } catch {
            showToast("No se pudo eliminar la escala.");
        }
    };

    return (
        <tr>
            <td><input type="number" style={{ ...S.input, width: 80 }} value={desde} onChange={(e) => setDesde(e.target.value)} /></td>
            <td><input type="number" style={{ ...S.input, width: 80 }} placeholder="Sin límite" value={hasta} onChange={(e) => setHasta(e.target.value)} /></td>
            <td><input type="number" style={{ ...S.input, width: 100 }} value={valor} onChange={(e) => setValor(e.target.value)} /></td>
            <td>
                <div style={{ display: "flex", gap: 6 }}>
                    <button style={S.btnSecondary} disabled={saving} onClick={guardar}>
                        {saving ? "…" : "Guardar"}
                    </button>
                    <button style={S.actionBtn("#fce8e8", "#a33")} title="Eliminar" onClick={eliminar}>
                        <IconTrash size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

const S = {
    toolbar: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" },
    searchWrap: { position: "relative", flex: 1, minWidth: 240, maxWidth: 420 },
    searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", display: "flex" },
    searchInput: { width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", boxSizing: "border-box" },
    filtroSelect: { padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", minWidth: 180 },
    tableWrap: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    actionBtn: (bg, color) => ({ background: bg, border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color, display: "flex", alignItems: "center", justifyContent: "center" }),
    empty: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", width: "100%", fontFamily: "Nunito,sans-serif", maxHeight: "92vh", display: "flex", flexDirection: "column" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1.5px solid var(--border)", flexShrink: 0 },
    modalBody: { padding: "18px 22px", overflowY: "auto", flex: 1 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px 18px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },
    input: { boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", color: "var(--text)", background: "var(--white)", outline: "none" },
    btnPrimary: { padding: "9px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnSecondary: { padding: "7px 14px", background: "var(--white)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", borderRadius: 6 },
    toast: { position: "fixed", bottom: 28, right: 28, background: "var(--primary)", color: "#fff", borderRadius: "var(--radius-sm)", padding: "13px 22px", fontWeight: 700, fontSize: "0.92rem", zIndex: 99999, boxShadow: "0 8px 28px rgba(26,155,140,0.35)" },
};
