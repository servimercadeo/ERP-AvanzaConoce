import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import { IconSearch, IconEmptySearch, IconLoading, IconClose } from "../components/Icons";

/**
 * Asignación de Inventario: custodia de una unidad (serial puntual) o de una cantidad
 * de un producto por un empleado — ej. "Juan tiene el router serial ABC123", o "María
 * tiene 5 cascos". Asignar descuenta stock real (y saca el serial de circulación si
 * aplica); "Marcar como devuelto" hace lo contrario. Así el inventario deja de ser solo
 * "cuánto hay en la sede" y empieza a responder también "quién lo tiene ahora mismo".
 */
function NuevaAsignacionModal({ usuarios, onClose, onSaved }) {
    const [busqueda, setBusqueda] = useState("");
    const debBusqueda = useDebounce(busqueda, 300);
    const [itemSeleccionado, setItemSeleccionado] = useState(null);
    const [serial, setSerial] = useState("");
    const [cantidad, setCantidad] = useState(1);
    const [userId, setUserId] = useState(usuarios[0]?.id ?? "");
    const [observacion, setObservacion] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Hay 90+ sedes: un mismo producto puede tener stock en muchas de ellas, así que el
    // límite tiene que ser generoso para no ocultar sedes (antes se cortaba en 30 y
    // desaparecían sedes con stock real). El backend ya devuelve todo ordenado por
    // producto y sede, así que aquí solo se pone un tope de seguridad.
    const { data: resultados = [], isFetching } = useQuery({
        queryKey: ["inventario-productos-buscar-asignar", debBusqueda],
        queryFn: () => api.get("/inventario-productos", { params: { search: debBusqueda } }).then((r) => r.data.slice(0, 300)),
        enabled: debBusqueda.trim().length >= 2,
    });

    const handleElegirItem = (item) => {
        setItemSeleccionado(item);
        setSerial("");
        setCantidad(1);
        setError("");
    };

    const handleGuardar = async () => {
        if (!itemSeleccionado) { setError("Elige primero un producto."); return; }
        if (!userId) { setError("Elige a quién se le asigna."); return; }
        setSaving(true);
        setError("");
        try {
            await api.post("/asignaciones-inventario", {
                inventario_producto_id: itemSeleccionado.id,
                user_id: Number(userId),
                serial: serial || undefined,
                cantidad: serial ? 1 : Number(cantidad),
                observacion: observacion.trim() || undefined,
            });
            onSaved();
        } catch (err) {
            setError(
                err?.response?.data?.errors
                    ? Object.values(err.response.data.errors)[0]?.[0]
                    : (err?.response?.data?.message ?? "No se pudo asignar.")
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={{ ...S.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>Nueva Asignación</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    {!itemSeleccionado ? (
                        <>
                            <label style={S.label}>Buscar producto o sede *</label>
                            <input
                                style={S.input}
                                placeholder="Ej. router, botas, Pereira…"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                autoFocus
                            />
                            <div style={S.resultadosBox}>
                                {debBusqueda.trim().length < 2 ? (
                                    <p style={S.hint}>Escribe al menos 2 letras para buscar.</p>
                                ) : isFetching ? (
                                    <div style={{ padding: 16, textAlign: "center" }}><IconLoading size={20} /></div>
                                ) : resultados.length === 0 ? (
                                    <p style={S.hint}>Sin resultados.</p>
                                ) : (
                                    resultados.map((item) => (
                                        <button key={item.id} style={S.resultadoItem} onClick={() => handleElegirItem(item)}>
                                            <div style={{ fontWeight: 700 }}>
                                                {item.producto}{item.talla ? ` — Talla ${item.talla}` : ""}
                                            </div>
                                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                                {item.categoria ? `${item.categoria} · ` : ""}{item.sede} · stock: {item.cantidad}
                                                {item.series?.length > 0 ? ` · ${item.series.length} serial(es) disponible(s)` : ""}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={S.itemElegido}>
                                <div>
                                    <div style={{ fontWeight: 800 }}>
                                        {itemSeleccionado.producto}{itemSeleccionado.talla ? ` — Talla ${itemSeleccionado.talla}` : ""}
                                    </div>
                                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                        {itemSeleccionado.sede} · stock disponible: {itemSeleccionado.cantidad}
                                    </div>
                                </div>
                                <button style={S.btnSecondary} onClick={() => setItemSeleccionado(null)}>Cambiar</button>
                            </div>

                            {itemSeleccionado.series?.length > 0 && (
                                <div style={S.formGroup}>
                                    <label style={S.label}>Serial (opcional — deja vacío para asignar por cantidad)</label>
                                    <select style={S.input} value={serial} onChange={(e) => setSerial(e.target.value)}>
                                        <option value="">— Asignar por cantidad —</option>
                                        {itemSeleccionado.series.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}

                            {!serial && (
                                <div style={S.formGroup}>
                                    <label style={S.label}>Cantidad *</label>
                                    <input
                                        type="number" min={1} max={itemSeleccionado.cantidad}
                                        style={S.input} value={cantidad}
                                        onChange={(e) => setCantidad(e.target.value)}
                                    />
                                </div>
                            )}

                            <div style={S.formGroup}>
                                <label style={S.label}>Asignar a *</label>
                                <select style={S.input} value={userId} onChange={(e) => setUserId(e.target.value)}>
                                    {usuarios.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name}{u.cargo ? ` (${u.cargo})` : ""}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={S.formGroup}>
                                <label style={S.label}>Observación</label>
                                <input style={S.input} value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Opcional" />
                            </div>
                        </>
                    )}
                    {error && <div style={S.errorMsg}>{error}</div>}
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cancelar</button>
                    <button style={S.btnPrimary} onClick={handleGuardar} disabled={saving || !itemSeleccionado}>
                        {saving ? "Guardando…" : "Asignar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AsignacionInventarioCrud() {
    const qc = useQueryClient();
    const [filtro, setFiltro] = useState("activas");
    const [modalOpen, setModalOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [devolviendoId, setDevolviendoId] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const { data: asignaciones = [], isLoading } = useQuery({
        queryKey: ["asignaciones-inventario", filtro],
        queryFn: () => api.get("/asignaciones-inventario", { params: { estado: filtro === "todas" ? undefined : filtro } }).then((r) => r.data),
    });

    const { data: usuarios = [] } = useQuery({
        queryKey: ["usuarios-catalogo"],
        queryFn: () => api.get("/usuarios-catalogo").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: ["asignaciones-inventario"] });

    const stats = useMemo(() => ({
        activas: asignaciones.filter((a) => a.activa).length,
        devueltas: asignaciones.filter((a) => !a.activa).length,
    }), [asignaciones]);

    const handleDevolver = async (a) => {
        if (!window.confirm(`¿Marcar como devuelto "${a.producto}${a.serial ? ` (serial ${a.serial})` : ""}" de ${a.asignado_a}?`)) return;
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

    // Mismo diseño de PDF y de correo que las actas de entrega de Dotación/Pedidos: se
    // envía al empleado que recibió el elemento (Asignación de Inventario ya tiene el
    // usuario real, no hay que adivinar por nombre).
    const [enviandoActaId, setEnviandoActaId] = useState(null);
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

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "var(--primary-dark)" }}>{stats.activas}</div>
                    <div className="stat-label">Asignaciones activas</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "var(--text-muted)" }}>{stats.devueltas}</div>
                    <div className="stat-label">Devueltas</div>
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={S.tabBar}>
                    {[
                        { id: "activas", label: "Activas" },
                        { id: "devueltas", label: "Devueltas" },
                        { id: "todas", label: "Todas" },
                    ].map((t) => (
                        <button key={t.id} style={{ ...S.tab, ...(filtro === t.id ? S.tabActive : {}) }} onClick={() => setFiltro(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <button style={S.btnPrimary} onClick={() => setModalOpen(true)} disabled={usuarios.length === 0}>
                    + Nueva Asignación
                </button>
            </div>

            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
                ) : asignaciones.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p>No hay asignaciones en este filtro.</p>
                    </div>
                ) : (
                    <table className="data-table" style={{ fontSize: "0.85rem" }}>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Sede</th>
                                <th>Serial / Cantidad</th>
                                <th>Asignado a</th>
                                <th>Fecha asignación</th>
                                <th>Estado</th>
                                <th style={{ textAlign: "center" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {asignaciones.map((a) => (
                                <tr key={a.id}>
                                    <td style={{ fontWeight: 700 }}>{a.producto}{a.talla ? ` — T:${a.talla}` : ""}</td>
                                    <td style={{ color: "var(--text-muted)" }}>{a.sede}</td>
                                    <td>{a.serial ? <span style={{ fontFamily: "monospace" }}>{a.serial}</span> : `Cantidad: ${a.cantidad}`}</td>
                                    <td style={{ fontWeight: 600 }}>{a.asignado_a}</td>
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

            {modalOpen && (
                <NuevaAsignacionModal
                    usuarios={usuarios}
                    onClose={() => setModalOpen(false)}
                    onSaved={() => {
                        invalidate();
                        setModalOpen(false);
                        showToast("Asignación registrada.");
                    }}
                />
            )}
        </div>
    );
}

const S = {
    tabBar: { display: "flex", gap: 0, borderBottom: "2px solid var(--border)", flexWrap: "wrap" },
    tab: { padding: "10px 20px", background: "none", border: "none", borderBottom: "2.5px solid transparent", marginBottom: "-2px", cursor: "pointer", fontSize: "0.88rem", fontWeight: 700, fontFamily: "Nunito, sans-serif", color: "var(--text-muted)" },
    tabActive: { color: "var(--primary-dark)", borderBottom: "2.5px solid var(--primary)" },
    tableWrap: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    empty: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", width: "100%", fontFamily: "Nunito,sans-serif", maxHeight: "88vh", display: "flex", flexDirection: "column" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1.5px solid var(--border)", flexShrink: 0 },
    modalBody: { padding: "18px 22px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 4 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px 18px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },
    formGroup: { display: "flex", flexDirection: "column", gap: 5, marginTop: 12 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "block" },
    input: { padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", width: "100%", boxSizing: "border-box" },
    btnPrimary: { padding: "9px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnSecondary: { padding: "7px 14px", background: "var(--white)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", borderRadius: 6 },
    errorMsg: { background: "#fce8e8", color: "#c0392b", borderRadius: 6, padding: "8px 12px", fontSize: "0.84rem", fontWeight: 600, marginTop: 10 },
    resultadosBox: { border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", marginTop: 8, maxHeight: 220, overflowY: "auto" },
    resultadoItem: { display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderBottom: "1px solid var(--border)", background: "var(--white)", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    hint: { padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: "0.84rem", margin: 0 },
    itemElegido: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px" },
    toast: { position: "fixed", bottom: 28, right: 28, background: "var(--primary)", color: "#fff", borderRadius: "var(--radius-sm)", padding: "13px 22px", fontWeight: 700, fontSize: "0.92rem", zIndex: 99999, boxShadow: "0 8px 28px rgba(26,155,140,0.35)" },
};
