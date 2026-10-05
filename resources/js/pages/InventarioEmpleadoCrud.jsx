import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { SearchableSelect } from "../components/SearchableSelect";
import { IconSearch, IconEmptySearch, IconLoading } from "../components/Icons";

/**
 * Inventario de Empleado: la vista "al revés" de Asignación de Inventario — en vez de
 * partir del producto y ver a quién se le asignó, se parte del empleado y se ve qué
 * tiene asignado ahora mismo (y su historial de devueltos). No agrega datos nuevos, solo
 * filtra el mismo `asignaciones_inventario` por `user_id` (mismo endpoint que ya usa
 * Asignación de Inventario).
 */
export default function InventarioEmpleadoCrud() {
    const qc = useQueryClient();
    const [userId, setUserId] = useState("");
    const [filtro, setFiltro] = useState("activas");
    const [toast, setToast] = useState(null);
    const [devolviendoId, setDevolviendoId] = useState(null);
    const [enviandoActaId, setEnviandoActaId] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const { data: usuarios = [] } = useQuery({
        queryKey: ["usuarios-catalogo"],
        queryFn: () => api.get("/usuarios-catalogo").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });

    const opcionesUsuarios = useMemo(
        () => usuarios.map((u) => ({ value: String(u.id), label: u.cargo ? `${u.name} — ${u.cargo}` : u.name })),
        [usuarios],
    );

    const { data: asignaciones = [], isLoading } = useQuery({
        queryKey: ["asignaciones-inventario", "por-empleado", userId, filtro],
        queryFn: () =>
            api
                .get("/asignaciones-inventario", { params: { user_id: userId, estado: filtro === "todas" ? undefined : filtro } })
                .then((r) => r.data),
        enabled: !!userId,
    });

    const empleadoElegido = usuarios.find((u) => String(u.id) === String(userId));

    const stats = useMemo(
        () => ({
            activas: asignaciones.filter((a) => a.activa).length,
        }),
        [asignaciones],
    );

    const invalidate = () => qc.invalidateQueries({ queryKey: ["asignaciones-inventario"] });

    const handleDevolver = async (a) => {
        if (!window.confirm(`¿Marcar como devuelto "${a.producto}${a.serial ? ` (serial ${a.serial})` : ""}"?`)) return;
        setDevolviendoId(a.id);
        try {
            await api.post(`/asignaciones-inventario/${a.id}/devolver`);
            invalidate();
            showToast("Devolución registrada, el inventario ya quedó actualizado.");
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo registrar la devolución.");
        } finally {
            setDevolviendoId(null);
        }
    };

    const handleEnviarActa = async (a) => {
        setEnviandoActaId(a.id);
        try {
            const { data } = await api.post(`/asignaciones-inventario/${a.id}/acta-entrega`);
            if (data.enviada) {
                showToast(`Acta de entrega enviada a ${data.destinatario}.`);
            } else {
                showToast(`No se pudo enviar el acta por correo: ${data.motivo}`);
            }
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo enviar el acta.");
        } finally {
            setEnviandoActaId(null);
        }
    };

    const handleExport = async () => {
        const XLSX = await import("xlsx");
        const rows = asignaciones.map((a) => ({
            Empleado: empleadoElegido?.name ?? "—",
            Producto: a.producto,
            Categoría: a.categoria || "—",
            Talla: a.talla || "—",
            Sede: a.sede,
            Serial: a.serial || "—",
            Cantidad: a.cantidad,
            "Fecha asignación": a.fecha_asignacion,
            Estado: a.activa ? "Asignado" : "Devuelto",
            "Fecha devolución": a.fecha_devolucion || "—",
            Observación: a.observacion || "—",
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [{ wch: 26 }, { wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 30 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario Empleado");
        const fecha = new Date().toISOString().slice(0, 10);
        const nombreArchivo = `Inventario_${empleadoElegido?.name ?? "Empleado"}_${fecha}.xlsx`.replace(/\s+/g, "_");
        XLSX.writeFile(wb, nombreArchivo);
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div style={S.buscador}>
                <span style={S.buscadorIcono}>
                    <IconSearch size={16} />
                </span>
                <div style={{ flex: 1 }}>
                    <label style={S.label}>Empleado</label>
                    <SearchableSelect
                        value={userId}
                        onChange={(v) => setUserId(v)}
                        options={opcionesUsuarios}
                        defaultValue=""
                    />
                </div>
            </div>

            {!userId ? (
                <div style={S.empty}>
                    <IconEmptySearch size={44} />
                    <p>Elige un empleado para ver su inventario asignado.</p>
                </div>
            ) : (
                <>
                    <div className="stats-row" style={{ marginTop: 20 }}>
                        <div className="stat-card">
                            <div className="stat-num" style={{ color: "var(--primary-dark)" }}>{stats.activas}</div>
                            <div className="stat-label">Asignado actualmente</div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, margin: "16px 0", flexWrap: "wrap" }}>
                        <div style={S.tabBar}>
                            {[
                                { id: "activas", label: "Asignado actualmente" },
                                { id: "devueltas", label: "Devuelto" },
                                { id: "todas", label: "Todo" },
                            ].map((t) => (
                                <button key={t.id} style={{ ...S.tab, ...(filtro === t.id ? S.tabActive : {}) }} onClick={() => setFiltro(t.id)}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {empleadoElegido && <span style={S.empleadoNombre}>{empleadoElegido.name}</span>}
                            <button style={S.btnSecondary} onClick={handleExport} disabled={asignaciones.length === 0}>
                                Exportar
                            </button>
                        </div>
                    </div>

                    <div style={S.tableWrap}>
                        {isLoading ? (
                            <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
                        ) : asignaciones.length === 0 ? (
                            <div style={S.empty}>
                                <IconEmptySearch size={44} />
                                <p>Este empleado no tiene elementos en este filtro.</p>
                            </div>
                        ) : (
                            <table className="data-table" style={{ fontSize: "0.85rem" }}>
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Categoría</th>
                                        <th>Sede</th>
                                        <th>Serial / Cantidad</th>
                                        <th>Fecha asignación</th>
                                        <th>Estado</th>
                                        <th style={{ textAlign: "center" }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {asignaciones.map((a) => (
                                        <tr key={a.id}>
                                            <td style={{ fontWeight: 700 }}>{a.producto}{a.talla ? ` — T:${a.talla}` : ""}</td>
                                            <td style={{ color: "var(--text-muted)" }}>{a.categoria || "—"}</td>
                                            <td style={{ color: "var(--text-muted)" }}>{a.sede}</td>
                                            <td>{a.serial ? <span style={{ fontFamily: "monospace" }}>{a.serial}</span> : `Cantidad: ${a.cantidad}`}</td>
                                            <td>{a.fecha_asignacion}</td>
                                            <td>
                                                <span style={{
                                                    fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
                                                    background: a.activa ? "#fff7e0" : "#e0f7f4",
                                                    color: a.activa ? "#b7780c" : "#0d6e5a",
                                                }}>
                                                    {a.activa ? "Asignado" : `Devuelto ${a.fecha_devolucion}`}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                                                    <button
                                                        style={{ ...S.btnSecondary, opacity: enviandoActaId === a.id ? 0.5 : 1 }}
                                                        disabled={enviandoActaId === a.id}
                                                        title="Enviar Acta de Entrega por correo al empleado"
                                                        onClick={() => handleEnviarActa(a)}
                                                    >
                                                        ✉ Enviar acta
                                                    </button>
                                                    {a.activa && (
                                                        <button
                                                            style={S.btnSecondary}
                                                            disabled={devolviendoId === a.id}
                                                            onClick={() => handleDevolver(a)}
                                                        >
                                                            Marcar como devuelto
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

const S = {
    buscador: { display: "flex", alignItems: "flex-end", gap: 10, background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: "16px 20px" },
    buscadorIcono: { display: "flex", alignItems: "center", color: "var(--text-muted)", marginBottom: 12 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "block" },
    empleadoNombre: { fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" },
    tabBar: { display: "flex", gap: 0, borderBottom: "2px solid var(--border)", flexWrap: "wrap" },
    tab: { padding: "10px 20px", background: "none", border: "none", borderBottom: "2.5px solid transparent", marginBottom: "-2px", cursor: "pointer", fontSize: "0.88rem", fontWeight: 700, fontFamily: "Nunito, sans-serif", color: "var(--text-muted)" },
    tabActive: { color: "var(--primary-dark)", borderBottom: "2.5px solid var(--primary)" },
    tableWrap: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    empty: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    btnSecondary: { padding: "7px 14px", background: "var(--white)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    toast: { position: "fixed", bottom: 28, right: 28, background: "var(--primary)", color: "#fff", borderRadius: "var(--radius-sm)", padding: "13px 22px", fontWeight: 700, fontSize: "0.92rem", zIndex: 99999, boxShadow: "0 8px 28px rgba(26,155,140,0.35)" },
};
