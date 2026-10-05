import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { IconClose, IconEmptySearch, IconLoading, IconTrash } from "../components/Icons";

const money = (n) => `$ ${Number(n ?? 0).toLocaleString("es-CO")}`;

/**
 * Picker de productos pendientes de una categoría ("Enviado a Compras" y todavía sin
 * ninguna Orden de Compra) — se abre al hacer clic en "Adicionar" en el panel de
 * pendientes. Los ya agregados a la orden actual (yaAgregados) no se pueden repetir.
 */
function PickerPendientesModal({ categoria, yaAgregados, onClose, onAgregar }) {
    const { data: pendientes = [], isLoading } = useQuery({
        queryKey: ["ordenes-compra-items-pendientes", categoria],
        queryFn: () => api.get("/ordenes-compra-items-pendientes", { params: { categoria } }).then((r) => r.data),
    });

    const disponibles = pendientes.filter((p) => !yaAgregados.includes(p.id));
    const [seleccionados, setSeleccionados] = useState([]);

    const toggle = (id) => {
        setSeleccionados((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={{ ...S.modal, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>Productos pendientes — {categoria}</span>
                    <button style={S.closeBtnWhite} onClick={onClose}><IconClose size={14} /></button>
                </div>
                <div style={S.modalBody}>
                    {isLoading ? (
                        <div style={{ padding: 30, textAlign: "center" }}><IconLoading size={28} /></div>
                    ) : disponibles.length === 0 ? (
                        <div style={S.empty}>
                            <IconEmptySearch size={40} />
                            <p>No hay más productos pendientes en esta categoría.</p>
                        </div>
                    ) : (
                        <div style={{ border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                            {disponibles.map((p) => (
                                <label key={p.id} style={S.pickerRow}>
                                    <input type="checkbox" checked={seleccionados.includes(p.id)} onChange={() => toggle(p.id)} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700 }}>{p.producto}</div>
                                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                            Pedido {p.pedido_codigo} · {p.sede} · cantidad: {p.cantidad}
                                            {p.empresa ? ` · ${p.empresa}` : ""}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <div style={S.modalFooter}>
                    <button className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button
                        className="btn-primary"
                        disabled={seleccionados.length === 0}
                        onClick={() => {
                            onAgregar(disponibles.filter((p) => seleccionados.includes(p.id)));
                            onClose();
                        }}
                    >
                        Agregar {seleccionados.length > 0 ? `(${seleccionados.length})` : ""}
                    </button>
                </div>
            </div>
        </div>
    );
}

function VerOrdenModal({ orden, onClose, onImprimir, imprimiendo }) {
    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={{ ...S.modal, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>Orden {orden.codigo}</span>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button style={S.btnImprimirModal} disabled={imprimiendo} onClick={() => onImprimir(orden)}>
                            {imprimiendo ? "Abriendo…" : "🖨 Imprimir"}
                        </button>
                        <button style={S.closeBtnWhite} onClick={onClose}><IconClose size={14} /></button>
                    </div>
                </div>
                <div style={S.modalBody}>
                    <p style={{ margin: "0 0 10px", fontSize: "0.86rem" }}>
                        <strong>Proveedor:</strong> {orden.proveedor?.nombre} ({orden.proveedor?.nit}) · <strong>Sede:</strong> {orden.sede?.nombre}
                    </p>
                    {orden.observaciones && (
                        <p style={{ margin: "0 0 10px", fontSize: "0.84rem", color: "var(--text-muted)" }}>
                            Observaciones: {orden.observaciones}
                        </p>
                    )}
                    <table className="data-table" style={{ fontSize: "0.84rem" }}>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Categoría</th>
                                <th>Empresa</th>
                                <th>Cant.</th>
                                <th>Precio Unit.</th>
                                <th>IVA %</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(orden.items ?? []).map((it) => (
                                <tr key={it.id}>
                                    <td>{it.producto}</td>
                                    <td>{it.categoria ?? "—"}</td>
                                    <td>{it.empresa?.nombre ?? "—"}</td>
                                    <td>{it.cantidad}</td>
                                    <td>{money(it.precio_unitario)}</td>
                                    <td>{it.iva_porcentaje}%</td>
                                    <td>{money(it.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ marginTop: 14, textAlign: "right", fontSize: "0.86rem", lineHeight: 1.9 }}>
                        <div>Subtotal: <strong>{money(orden.subtotal)}</strong></div>
                        <div>IVA total: <strong>{money(orden.iva_total)}</strong></div>
                        <div>Transporte: <strong>{money(orden.valor_transporte)}</strong></div>
                        <div style={{ fontSize: "1rem" }}>Valor total: <strong>{money(orden.valor_total)}</strong></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function OrdenCompraCrud() {
    const qc = useQueryClient();
    const [vista, setVista] = useState("crear");
    const [toast, setToast] = useState(null);
    const showToast = (msg, isError = false) => {
        setToast({ msg, isError });
        setTimeout(() => setToast(null), 4000);
    };

    /* ── Catálogos ── */
    const { data: sedes = [] } = useQuery({ queryKey: ["sedes-oc"], queryFn: () => api.get("/sedes").then((r) => r.data) });
    const { data: proveedores = [] } = useQuery({ queryKey: ["proveedores"], queryFn: () => api.get("/proveedores").then((r) => r.data) });
    const { data: empresas = [] } = useQuery({ queryKey: ["empresas"], queryFn: () => api.get("/empresas").then((r) => r.data) });
    const { data: formasPago = [] } = useQuery({ queryKey: ["formas-pago"], queryFn: () => api.get("/formas-pago").then((r) => r.data) });
    const { data: pendientes = [], isLoading: loadingPendientes } = useQuery({
        queryKey: ["ordenes-compra-pendientes-categoria"],
        queryFn: () => api.get("/ordenes-compra-pendientes-categoria").then((r) => r.data),
    });

    const invalidarPendientes = () => qc.invalidateQueries({ queryKey: ["ordenes-compra-pendientes-categoria"] });

    /* ── Formulario ── */
    const fechaRegistro = useMemo(() => new Date().toLocaleString("sv-SE").slice(0, 19).replace("T", " "), []);
    const [sedeId, setSedeId] = useState("");
    const [proveedorId, setProveedorId] = useState("");
    const [empresaId, setEmpresaId] = useState("");
    const [formaPagoId, setFormaPagoId] = useState("");
    const [fechaEntrega, setFechaEntrega] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [valorTransporte, setValorTransporte] = useState("");
    const [items, setItems] = useState([]);
    const [pickerCategoria, setPickerCategoria] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const proveedorSeleccionado = proveedores.find((p) => String(p.id) === String(proveedorId));

    const resetForm = () => {
        setSedeId(""); setProveedorId(""); setEmpresaId(""); setFormaPagoId("");
        setFechaEntrega(""); setObservaciones(""); setValorTransporte(""); setItems([]);
    };

    const agregarItems = (nuevos) => {
        setItems((prev) => [
            ...prev,
            ...nuevos.map((n) => ({ ...n, precio_unitario: "", iva_porcentaje: 19 })),
        ]);
    };

    const quitarItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

    const actualizarItem = (id, campo, valor) => {
        setItems((prev) => prev.map((it) => it.id === id ? { ...it, [campo]: valor } : it));
    };

    const totales = useMemo(() => {
        let subtotal = 0, ivaTotal = 0;
        items.forEach((it) => {
            const sub = (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0);
            const iva = Math.round(sub * (Number(it.iva_porcentaje) || 0) / 100);
            subtotal += sub;
            ivaTotal += iva;
        });
        const transporte = Number(valorTransporte) || 0;
        return { subtotal, ivaTotal, transporte, total: subtotal + ivaTotal + transporte };
    }, [items, valorTransporte]);

    const { data: ordenes = [], isLoading: loadingOrdenes } = useQuery({
        queryKey: ["ordenes-compra"],
        queryFn: () => api.get("/ordenes-compra").then((r) => r.data),
        enabled: vista === "historial",
    });

    const [verOrden, setVerOrden] = useState(null);
    const [imprimiendoId, setImprimiendoId] = useState(null);

    /**
     * La pestaña hay que abrirla YA, en el mismo instante del clic (antes de cualquier
     * await): si se abre después de esperar la respuesta del PDF, la mayoría de
     * navegadores la bloquea como popup sin avisar nada, y por eso "no aparecía nada".
     * Se abre en blanco primero y, cuando el PDF ya está listo, se le asigna esa misma
     * pestaña como destino.
     */
    const handleImprimir = async (orden) => {
        const ventana = window.open("", "_blank");
        setImprimiendoId(orden.id);
        try {
            const res = await api.get(`/ordenes-compra/${orden.id}/pdf`, { responseType: "blob" });
            const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
            if (ventana) {
                ventana.location.href = url;
            } else {
                showToast("Tu navegador bloqueó la ventana. Permite las ventanas emergentes para este sitio e intenta de nuevo.", true);
            }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err) {
            ventana?.close();
            let mensaje = "No se pudo generar el PDF de la orden.";
            if (err?.response?.data instanceof Blob) {
                try {
                    const texto = await err.response.data.text();
                    mensaje = JSON.parse(texto)?.message ?? mensaje;
                } catch { /* el cuerpo del error no era JSON, se deja el mensaje genérico */ }
            }
            showToast(mensaje, true);
        } finally {
            setImprimiendoId(null);
        }
    };

    const handleGuardar = async () => {
        if (!sedeId) { showToast("Elige la sede de la orden de compra.", true); return; }
        if (!proveedorId) { showToast("Elige el proveedor.", true); return; }
        if (items.length === 0) { showToast("Adiciona al menos un producto a la orden.", true); return; }
        if (items.some((it) => it.precio_unitario === "" || Number(it.precio_unitario) < 0)) {
            showToast("Todos los productos necesitan un precio unitario.", true);
            return;
        }

        setGuardando(true);
        try {
            const { data } = await api.post("/ordenes-compra", {
                sede_id: Number(sedeId),
                proveedor_id: Number(proveedorId),
                empresa_id: empresaId ? Number(empresaId) : null,
                forma_pago_id: formaPagoId ? Number(formaPagoId) : null,
                fecha_entrega: fechaEntrega || null,
                observaciones: observaciones.trim() || null,
                valor_transporte: Number(valorTransporte) || 0,
                items: items.map((it) => ({
                    pedido_compra_item_id: it.id,
                    precio_unitario: Number(it.precio_unitario) || 0,
                    iva_porcentaje: Number(it.iva_porcentaje) || 0,
                })),
            });
            resetForm();
            invalidarPendientes();
            qc.invalidateQueries({ queryKey: ["ordenes-compra"] });
            showToast(`Orden ${data.codigo} creada por ${money(data.valor_total)}.`);
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo crear la orden de compra.", true);
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminarOrden = async (orden) => {
        if (!confirm(`¿Eliminar la orden ${orden.codigo}? Sus productos vuelven a quedar pendientes.`)) return;
        try {
            await api.delete(`/ordenes-compra/${orden.id}`);
            qc.invalidateQueries({ queryKey: ["ordenes-compra"] });
            invalidarPendientes();
            showToast(`Orden ${orden.codigo} eliminada.`);
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo eliminar la orden.", true);
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={{ ...S.toast, ...(toast.isError ? S.toastError : {}) }}>{toast.msg}</div>}

            <div style={S.tabBar}>
                {[{ id: "crear", label: "Crear Orden de Compra" }, { id: "historial", label: "Historial de Órdenes" }].map((t) => (
                    <button key={t.id} style={{ ...S.tab, ...(vista === t.id ? S.tabActive : {}) }} onClick={() => setVista(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {vista === "crear" ? (
                <>
                    <div style={S.formCard}>
                        <div style={S.formGrid}>
                            <div style={S.formGroup}>
                                <label style={S.label}>Fecha de registro</label>
                                <input style={{ ...S.input, background: "var(--bg)" }} value={fechaRegistro} disabled />
                            </div>
                            <div style={S.formGroup}>
                                <label style={S.label}>Sede Orden de Compra *</label>
                                <select style={S.input} value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
                                    <option value="">Elige</option>
                                    {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                            <div style={S.formGroup}>
                                <label style={S.label}>Empresa</label>
                                <select style={S.input} value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
                                    <option value="">Elige</option>
                                    {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                                </select>
                            </div>

                            <div style={S.formGroup}>
                                <label style={S.label}>Proveedor *</label>
                                <select style={S.input} value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
                                    <option value="">Elige</option>
                                    {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {p.nit}</option>)}
                                </select>
                            </div>
                            <div style={S.formGroup}>
                                <label style={S.label}>Naturaleza</label>
                                <input style={{ ...S.input, background: "var(--bg)" }} value={proveedorSeleccionado?.naturaleza ?? ""} disabled />
                            </div>
                            <div style={S.formGroup}>
                                <label style={S.label}>Forma de Pago</label>
                                <select style={S.input} value={formaPagoId} onChange={(e) => setFormaPagoId(e.target.value)}>
                                    <option value="">Elige</option>
                                    {formasPago.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                                </select>
                            </div>

                            <div style={S.formGroup}>
                                <label style={S.label}>Fecha de Entrega</label>
                                <input type="date" style={S.input} value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
                            </div>
                            <div style={S.formGroup}>
                                <label style={S.label}>Valor Transporte</label>
                                <input type="number" min={0} style={S.input} value={valorTransporte} onChange={(e) => setValorTransporte(e.target.value)} placeholder="$ 0" />
                            </div>
                            <div style={{ ...S.formGroup, gridColumn: "span 1" }} />

                            <div style={{ ...S.formGroup, gridColumn: "1 / -1" }}>
                                <label style={S.label}>Observaciones</label>
                                <textarea style={{ ...S.input, minHeight: 70, resize: "vertical" }} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div style={S.sectionHeaderOrange}>TIPO DE ELEMENTOS PENDIENTES EN PEDIDOS</div>
                    <div style={S.pendientesCard}>
                        {loadingPendientes ? (
                            <div style={{ padding: 16, textAlign: "center" }}><IconLoading size={24} /></div>
                        ) : pendientes.length === 0 ? (
                            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.86rem" }}>No hay productos pendientes de compra en este momento.</p>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th style={S.pendTh}>Tipo de Elemento</th>
                                        <th style={{ ...S.pendTh, textAlign: "center", width: 120 }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendientes.map((p) => (
                                        <tr key={p.categoria}>
                                            <td style={S.pendTd}>{p.categoria} ({p.cantidad_items})</td>
                                            <td style={{ ...S.pendTd, textAlign: "center" }}>
                                                <button style={S.btnAdicionar} onClick={() => setPickerCategoria(p.categoria)}>
                                                    Adicionar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div style={S.sectionHeaderTeal}>DETALLE DE ORDEN</div>
                    <div style={S.pendientesCard}>
                        {items.length === 0 ? (
                            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.86rem" }}>
                                Todavía no has adicionado productos a esta orden.
                            </p>
                        ) : (
                            <table className="data-table" style={{ fontSize: "0.84rem" }}>
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Pedido</th>
                                        <th>Empresa</th>
                                        <th>Cant.</th>
                                        <th style={{ minWidth: 110 }}>Precio Unit.</th>
                                        <th style={{ minWidth: 80 }}>IVA %</th>
                                        <th>Subtotal</th>
                                        <th>Total</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it) => {
                                        const sub = (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0);
                                        const iva = Math.round(sub * (Number(it.iva_porcentaje) || 0) / 100);
                                        return (
                                            <tr key={it.id}>
                                                <td style={{ fontWeight: 600 }}>{it.producto}</td>
                                                <td style={{ color: "var(--text-muted)" }}>{it.pedido_codigo}</td>
                                                <td style={{ color: "var(--text-muted)" }}>{it.empresa ?? "—"}</td>
                                                <td>{it.cantidad}</td>
                                                <td>
                                                    <input
                                                        type="number" min={0} style={S.inputSmall}
                                                        value={it.precio_unitario}
                                                        onChange={(e) => actualizarItem(it.id, "precio_unitario", e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number" min={0} max={100} style={S.inputSmall}
                                                        value={it.iva_porcentaje}
                                                        onChange={(e) => actualizarItem(it.id, "iva_porcentaje", e.target.value)}
                                                    />
                                                </td>
                                                <td>{money(sub)}</td>
                                                <td style={{ fontWeight: 700 }}>{money(sub + iva)}</td>
                                                <td>
                                                    <button style={S.btnQuitar} title="Quitar" onClick={() => quitarItem(it.id)}>
                                                        <IconTrash size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                        <div style={S.totalesBox}>
                            <div><span>SUB TOTAL ORDEN</span><strong>{money(totales.subtotal)}</strong></div>
                            <div><span>IVA TOTAL</span><strong>{money(totales.ivaTotal)}</strong></div>
                            <div><span>TOTAL TRANSPORTE</span><strong>{money(totales.transporte)}</strong></div>
                            <div style={{ fontSize: "1.05rem", borderTop: "1.5px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                                <span>VALOR TOTAL ORDEN</span><strong>{money(totales.total)}</strong>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                            <button className="btn-primary" disabled={guardando} onClick={handleGuardar}>
                                {guardando ? "Guardando…" : "Guardar Orden de Compra"}
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div style={S.tableWrap}>
                    {loadingOrdenes ? (
                        <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
                    ) : ordenes.length === 0 ? (
                        <div style={S.empty}>
                            <IconEmptySearch size={44} />
                            <p>Todavía no se ha creado ninguna orden de compra.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Fecha</th>
                                    <th>Proveedor</th>
                                    <th>Sede</th>
                                    <th>Forma de Pago</th>
                                    <th>Valor Total</th>
                                    <th>Estado</th>
                                    <th style={{ textAlign: "center" }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ordenes.map((o) => (
                                    <tr key={o.id}>
                                        <td style={{ fontWeight: 800, fontFamily: "monospace" }}>{o.codigo}</td>
                                        <td>{(o.fecha_registro ?? "").slice(0, 10)}</td>
                                        <td>{o.proveedor?.nombre}</td>
                                        <td>{o.sede?.nombre}</td>
                                        <td>{o.forma_pago?.nombre ?? "—"}</td>
                                        <td style={{ fontWeight: 700 }}>{money(o.valor_total)}</td>
                                        <td>
                                            <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#e8f0ff", color: "#1a4fa8" }}>
                                                {o.estado}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                                                <button style={S.btnSecondary} onClick={() => setVerOrden(o)}>Ver</button>
                                                <button
                                                    style={S.btnSecondary}
                                                    disabled={imprimiendoId === o.id}
                                                    onClick={() => handleImprimir(o)}
                                                >
                                                    {imprimiendoId === o.id ? "Abriendo…" : "🖨 Imprimir"}
                                                </button>
                                                <button style={{ ...S.btnSecondary, color: "#a33" }} onClick={() => handleEliminarOrden(o)}>Eliminar</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {pickerCategoria && (
                <PickerPendientesModal
                    categoria={pickerCategoria}
                    yaAgregados={items.map((it) => it.id)}
                    onClose={() => setPickerCategoria(null)}
                    onAgregar={agregarItems}
                />
            )}

            {verOrden && (
                <VerOrdenModal
                    orden={verOrden}
                    onClose={() => setVerOrden(null)}
                    onImprimir={handleImprimir}
                    imprimiendo={imprimiendoId === verOrden.id}
                />
            )}
        </div>
    );
}

const S = {
    toast: { position: "fixed", bottom: 28, right: 28, background: "var(--primary)", color: "#fff", borderRadius: "var(--radius-sm)", padding: "13px 22px", fontWeight: 700, fontSize: "0.92rem", zIndex: 99999, boxShadow: "0 8px 28px rgba(26,155,140,0.35)", maxWidth: 380 },
    toastError: { background: "#c0392b", boxShadow: "0 8px 28px rgba(192,57,43,0.35)" },
    tabBar: { display: "flex", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 20, flexWrap: "wrap" },
    tab: { padding: "10px 20px", background: "none", border: "none", borderBottom: "2.5px solid transparent", marginBottom: "-2px", cursor: "pointer", fontSize: "0.88rem", fontWeight: 700, fontFamily: "Nunito, sans-serif", color: "var(--text-muted)" },
    tabActive: { color: "var(--primary-dark)", borderBottom: "2.5px solid var(--primary)" },

    formCard: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: 22, marginBottom: 20 },
    formGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 20px" },
    formGroup: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" },
    input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", color: "var(--text)", background: "var(--white)", outline: "none" },
    inputSmall: { width: 90, boxSizing: "border-box", padding: "5px 7px", border: "1.5px solid var(--border)", borderRadius: 6, fontSize: "0.84rem", fontFamily: "Nunito,sans-serif" },

    sectionHeaderOrange: { background: "#e8792c", color: "#fff", fontWeight: 800, fontSize: "0.82rem", letterSpacing: "0.03em", padding: "9px 16px", borderRadius: "6px 6px 0 0", marginTop: 4 },
    sectionHeaderTeal: { background: "#0d6e5a", color: "#fff", fontWeight: 800, fontSize: "0.82rem", letterSpacing: "0.03em", padding: "9px 16px", borderRadius: "6px 6px 0 0", marginTop: 24 },
    pendientesCard: { background: "var(--white)", border: "1.5px solid var(--border)", borderTop: "none", borderRadius: "0 0 var(--radius) var(--radius)", boxShadow: "var(--shadow)", padding: 18, marginBottom: 4 },
    pendTh: { textAlign: "left", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", padding: "6px 4px", borderBottom: "1.5px solid var(--border)" },
    pendTd: { padding: "9px 4px", borderBottom: "1px solid var(--border)", fontSize: "0.88rem" },
    btnAdicionar: { background: "#111", color: "#fff", border: "none", borderRadius: 4, padding: "5px 14px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" },

    totalesBox: { marginTop: 18, marginLeft: "auto", maxWidth: 320, display: "flex", flexDirection: "column", gap: 6, fontSize: "0.9rem" },

    tableWrap: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    empty: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    btnSecondary: { padding: "6px 12px", background: "var(--white)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 6, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnQuitar: { background: "#fce8e8", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#a33", display: "inline-flex" },

    overlay: { position: "fixed", inset: 0, background: "rgba(26,58,53,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 5000, padding: "32px 16px", overflowY: "auto" },
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 16px 60px rgba(26,155,140,0.22)", width: "100%", maxWidth: 440, display: "flex", flexDirection: "column" },
    modalHeaderGreen: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", background: "var(--primary)", borderTopLeftRadius: "var(--radius)", borderTopRightRadius: "var(--radius)", flexShrink: 0 },
    modalTitleWhite: { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#fff" },
    closeBtnWhite: { background: "none", border: "1.5px solid rgba(255,255,255,0.6)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" },
    btnImprimirModal: { background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.6)", borderRadius: 6, padding: "5px 12px", fontSize: "0.8rem", fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    modalBody: { padding: "22px 28px 28px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 6 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 12, padding: "16px 28px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },
    pickerRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer" },
};
