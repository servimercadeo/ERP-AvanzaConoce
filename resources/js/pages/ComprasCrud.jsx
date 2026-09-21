import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
    IconSearch,
    IconEmptySearch,
    IconLoading,
    IconEye,
    IconClose,
} from "../components/Icons";
import { SearchableSelect as FilterSelect, PresetFiltersDropdown } from "../components/SearchableSelect";

const ESTADOS_COMPRA = ["Cotizando", "Pendiente Aprobación"];

export default function ComprasCrud() {
    const qc = useQueryClient();

    // --- Pedidos de insumos de oficina (reales) ---
    const { data: pedidosCompra = [], isLoading: loadingPedidos } = useQuery({
        queryKey: ["pedidos-compra"],
        queryFn: () => api.get("/pedidos-compra").then((r) => r.data),
    });

    // --- Pedidos de Dotación: solo los que YA pasaron el check "Enviar a Compras" en
    // Pedidos (recibido_pedidos = true). Mientras ese check no esté marcado, no aparecen
    // aquí: siguen en revisión en Pedidos (ver PedidosCrud.jsx). ---
    const { data: pedidosDotacion = [] } = useQuery({
        queryKey: ["pedidos-automaticos"],
        queryFn: () => api.get("/pedidos-automaticos").then((r) => r.data),
    });

    // --- Catálogos para los filtros ---
    const { data: catalogos = {} } = useQuery({
        queryKey: ["catalogos"],
        queryFn: () => api.get("/catalogos").then((r) => r.data),
    });
    const { data: clasesPedidoData = [] } = useQuery({
        queryKey: ["clases-pedido"],
        queryFn: () => api.get("/clases-pedido").then((r) => r.data),
    });
    const { data: conceptosPedidoData = [] } = useQuery({
        queryKey: ["conceptos-pedido"],
        queryFn: () => api.get("/conceptos-pedido").then((r) => r.data),
    });
    const sedesOptions = catalogos.sedes || [];
    const CLASES_PEDIDO = useMemo(() => clasesPedidoData.map(c => c.nombre), [clasesPedidoData]);
    const CONCEPTOS_PEDIDO = useMemo(() => conceptosPedidoData.map(c => c.nombre), [conceptosPedidoData]);

    const invalidatePedidos = () => qc.invalidateQueries({ queryKey: ["pedidos-compra"] });
    const invalidateDotacion = () => qc.invalidateQueries({ queryKey: ["pedidos-automaticos"] });

    // --- Pedidos de oficina en Compras ---
    const comprasLocal = useMemo(
        () => pedidosCompra.filter(p => p.estado === "Enviado a compras"),
        [pedidosCompra]
    );

    // --- Pedidos de Dotación ya confirmados para Compras ---
    const comprasDotacion = useMemo(
        () => pedidosDotacion
            .filter(p => p.recibido_pedidos && p.estado === "Enviar a compras")
            .map(p => ({
                id: `dot-${p.id}`,
                origen: "dotacion",
                codigo: p.codigo,
                fecha_registro: (p.fecha_pedido || "").slice(0, 10),
                responsable: p.empleado ? `${p.empleado.nombres} ${p.empleado.apellidos}` : "—",
                sede: p.contrato?.sede ?? "—",
                clase: "Pedido Interno",
                concepto: "REPOSICION",
                estado_compra: p.estado_compra,
                items: (p.items ?? [])
                    .filter(it => it.estado_revision === "Enviado a Compras")
                    .map(it => ({
                        producto: `${it.inventario?.prenda ?? "Prenda"} · ${it.inventario?.genero ?? ""} · T:${it.inventario?.talla ?? ""}`,
                        cantidad: it.cantidad,
                    })),
                _dotacionRaw: p,
            })),
        [pedidosDotacion]
    );

    const combinados = useMemo(
        () => [...comprasLocal, ...comprasDotacion],
        [comprasLocal, comprasDotacion]
    );

    const responsablesPresentes = useMemo(
        () => [...new Set(combinados.map(p => p.responsable))],
        [combinados]
    );

    // --- Resumen ---
    const stats = useMemo(() => ({
        total: combinados.length,
        cotizando: combinados.filter(p => p.estado_compra === "Cotizando").length,
        pendientes: combinados.filter(p => p.estado_compra === "Pendiente Aprobación").length,
    }), [combinados]);

    // --- Búsqueda y filtros ---
    const [search, setSearch] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filtroEstadoCompra, setFiltroEstadoCompra] = useState("Todos");
    const [filtroSede, setFiltroSede] = useState("Todas");
    const [filtroClase, setFiltroClase] = useState("Todas");
    const [filtroConcepto, setFiltroConcepto] = useState("Todos");
    const [filtroResponsable, setFiltroResponsable] = useState("Todos");

    const clearFilters = () => {
        setFiltroEstadoCompra("Todos");
        setFiltroSede("Todas");
        setFiltroClase("Todas");
        setFiltroConcepto("Todos");
        setFiltroResponsable("Todos");
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return combinados.filter(p => {
            if (q && !p.codigo.toLowerCase().includes(q) && !p.responsable.toLowerCase().includes(q)) return false;
            if (filtroEstadoCompra !== "Todos" && p.estado_compra !== filtroEstadoCompra) return false;
            if (filtroSede !== "Todas" && p.sede !== filtroSede) return false;
            if (filtroClase !== "Todas" && p.clase !== filtroClase) return false;
            if (filtroConcepto !== "Todos" && p.concepto !== filtroConcepto) return false;
            if (filtroResponsable !== "Todos" && p.responsable !== filtroResponsable) return false;
            return true;
        });
    }, [combinados, search, filtroEstadoCompra, filtroSede, filtroClase, filtroConcepto, filtroResponsable]);

    // --- Toast ---
    const [toast, setToast] = useState(null);
    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // --- Cambiar estado de compra ---
    const [actualizandoId, setActualizandoId] = useState(null);
    const handleCambiarEstadoCompra = async (pedido, nuevoEstado) => {
        setActualizandoId(pedido.id);
        try {
            if (pedido.origen === "dotacion") {
                await api.put(`/pedidos-automaticos/${pedido._dotacionRaw.id}/estado-compra`, { estado_compra: nuevoEstado });
                invalidateDotacion();
            } else {
                await api.put(`/pedidos-compra/${pedido.id}`, { estado_compra: nuevoEstado });
                invalidatePedidos();
            }
            showToast(`Pedido ${pedido.codigo}: ${nuevoEstado}.`);
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo actualizar el estado de compra.", "error");
        } finally {
            setActualizandoId(null);
        }
    };

    const handleRegresarAPedidos = async (pedido) => {
        if (!window.confirm(`¿Regresar el pedido ${pedido.codigo} a Pedidos?`)) return;
        setActualizandoId(pedido.id);
        try {
            if (pedido.origen === "dotacion") {
                await api.put(`/pedidos-automaticos/${pedido._dotacionRaw.id}/recibido-pedidos`, { recibido: false });
                invalidateDotacion();
            } else {
                await api.put(`/pedidos-compra/${pedido.id}`, {
                    estado: "Pendiente Aprobación",
                    estado_compra: null,
                });
                invalidatePedidos();
            }
            showToast(`Pedido ${pedido.codigo} regresado a Pedidos.`);
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo regresar el pedido.", "error");
        } finally {
            setActualizandoId(null);
        }
    };

    // --- Ver detalle ---
    const [verTarget, setVerTarget] = useState(null);

    return (
        <div style={{ width: "100%" }}>
            {toast && (
                <div style={{
                    ...S.toast,
                    background: toast.type === "error" ? "#c0392b" : "var(--primary)",
                }}>
                    {toast.message}
                </div>
            )}

            {/* --- Resumen --- */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Total en Compras</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#b45309" }}>{stats.cotizando}</div>
                    <div className="stat-label">Cotizando</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#1a5fa8" }}>{stats.pendientes}</div>
                    <div className="stat-label">Pendiente Aprobación</div>
                </div>
            </div>

            {/* --- Toolbar --- */}
            <div style={S.toolbar}>
                <div style={S.filters}>
                    <div style={S.searchWrap}>
                        <span style={S.searchIcon}>
                            <IconSearch size={15} />
                        </span>
                        <input
                            style={S.searchInput}
                            placeholder="Buscar código, responsable…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button style={S.filterBtn} onClick={() => setFilterOpen(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        Filtros
                    </button>
                    <PresetFiltersDropdown
                        presets={[
                            { label: "Cotizando", apply: () => { clearFilters(); setFiltroEstadoCompra("Cotizando"); } },
                            { label: "Pendiente Aprobación", apply: () => { clearFilters(); setFiltroEstadoCompra("Pendiente Aprobación"); } },
                            { label: "Limpiar filtros", apply: () => clearFilters(), clear: true },
                        ]}
                    />
                </div>
            </div>

            {/* --- Tabla --- */}
            <div style={S.tableContainer}>
                {loadingPedidos ? (
                    <div style={S.emptyState}>
                        <IconLoading size={32} />
                        <p>Cargando pedidos…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={S.emptyState}>
                        <IconEmptySearch size={48} />
                        <h3>No hay pedidos en Compras</h3>
                        <p>Los pedidos aparecen aquí cuando se marca "Enviar a Compras" desde Pedidos (de oficina o confirmados desde Dotación).</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Fecha</th>
                                <th>Responsable</th>
                                <th>Sede</th>
                                <th>Clase</th>
                                <th>Concepto</th>
                                <th>Estado de Compra</th>
                                <th style={{ textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 800, fontFamily: "monospace" }}>
                                        {p.codigo}
                                        {p.origen === "dotacion" && (
                                            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#6b21a8", letterSpacing: "0.04em", marginTop: 2 }}>
                                                DOTACIÓN
                                            </div>
                                        )}
                                    </td>
                                    <td>{p.fecha_registro}</td>
                                    <td style={{ fontWeight: 600 }}>{p.responsable}</td>
                                    <td>{p.sede}</td>
                                    <td>{p.clase}</td>
                                    <td>{p.concepto}</td>
                                    <td>
                                        <select
                                            style={S.selectInline}
                                            value={p.estado_compra || "Cotizando"}
                                            disabled={actualizandoId === p.id}
                                            onChange={e => handleCambiarEstadoCompra(p, e.target.value)}
                                        >
                                            {ESTADOS_COMPRA.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                            <button
                                                style={S.actionIconBtn("#e8f0ff", "#1a4fa8")}
                                                title="Ver Detalles"
                                                onClick={() => setVerTarget(p)}
                                            >
                                                <IconEye size={14} />
                                            </button>
                                            <button
                                                style={{ ...S.actionIconBtn("#fce8e8", "#a33"), fontWeight: 800, fontSize: "0.9rem" }}
                                                title="Regresar a Pedidos"
                                                disabled={actualizandoId === p.id}
                                                onClick={() => handleRegresarAPedidos(p)}
                                            >
                                                ↩
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* --- Modal Filtros --- */}
            {filterOpen && (
                <div style={S.overlay} onClick={() => setFilterOpen(false)}>
                    <div style={{ ...S.modal, maxWidth: 760, maxHeight: "none", overflow: "visible" }} onClick={e => e.stopPropagation()}>
                        <div style={S.modalHeader}>
                            <span style={S.modalTitle}>Filtros de Búsqueda</span>
                            <button style={S.closeBtn} onClick={() => setFilterOpen(false)}>
                                <IconClose size={14} />
                            </button>
                        </div>
                        <div style={{ ...S.modalBody, overflowY: "visible", overflowX: "visible" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 24px" }}>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Estado de Compra</label>
                                    <FilterSelect
                                        value={filtroEstadoCompra}
                                        onChange={setFiltroEstadoCompra}
                                        defaultValue="Todos"
                                        options={ESTADOS_COMPRA.map(s => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Sede</label>
                                    <FilterSelect
                                        value={filtroSede}
                                        onChange={setFiltroSede}
                                        defaultValue="Todas"
                                        options={sedesOptions.map(s => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Clase de Pedido</label>
                                    <FilterSelect
                                        value={filtroClase}
                                        onChange={setFiltroClase}
                                        defaultValue="Todas"
                                        options={CLASES_PEDIDO.map(s => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Concepto</label>
                                    <FilterSelect
                                        value={filtroConcepto}
                                        onChange={setFiltroConcepto}
                                        defaultValue="Todos"
                                        options={CONCEPTOS_PEDIDO.map(s => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Responsable</label>
                                    <FilterSelect
                                        value={filtroResponsable}
                                        onChange={setFiltroResponsable}
                                        defaultValue="Todos"
                                        options={responsablesPresentes.map(s => ({ label: s, value: s }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ ...S.modalFooter, justifyContent: "space-between" }}>
                            <button style={S.btnSecondary} onClick={clearFilters}>Limpiar filtros</button>
                            <button style={S.btnPrimary} onClick={() => setFilterOpen(false)}>Buscar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modal Ver Detalle --- */}
            {verTarget && (
                <div style={S.overlay} onClick={() => setVerTarget(null)}>
                    <div style={S.modal} onClick={e => e.stopPropagation()}>
                        <div style={S.modalHeader}>
                            <span style={S.modalTitle}>Detalles de Pedido {verTarget.codigo}</span>
                            <button style={S.closeBtn} onClick={() => setVerTarget(null)}>
                                <IconClose size={16} />
                            </button>
                        </div>
                        <div style={S.modalBody}>
                            <div style={S.grid2}>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Responsable</label>
                                    <div style={{ fontWeight: 700 }}>{verTarget.responsable}</div>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Sede</label>
                                    <div style={{ fontWeight: 700 }}>{verTarget.sede}</div>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Clase / Concepto</label>
                                    <div style={{ fontWeight: 700 }}>{verTarget.clase} · {verTarget.concepto}</div>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Estado de Compra</label>
                                    <div style={{ fontWeight: 700 }}>{verTarget.estado_compra || "—"}</div>
                                </div>
                            </div>
                            <hr style={{ border: 'none', borderBottom: '1.5px solid var(--border)', margin: '20px 0' }} />
                            <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--border)' }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800 }}>Producto</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, width: 80 }}>Cantidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(verTarget.items ?? []).map((it, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.producto}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>{it.cantidad}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div style={S.modalFooter}>
                            <button style={S.btnSecondary} onClick={() => setVerTarget(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

const S = {
    toast: {
        position: "fixed", bottom: 28, right: 28, color: "#fff",
        borderRadius: "var(--radius-sm)", padding: "13px 22px", fontWeight: 700,
        fontSize: "0.92rem", zIndex: 9999, boxShadow: "0 8px 28px rgba(26,155,140,0.35)"
    },
    toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" },
    filters: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 },
    searchWrap: { position: "relative", flex: 1, minWidth: 200, maxWidth: 380 },
    searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", color: "var(--text-muted)", pointerEvents: "none" },
    searchInput: { width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none" },
    filterBtn: { display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)", fontSize: "0.9rem", fontWeight: 700, fontFamily: "Nunito,sans-serif", cursor: "pointer" },
    tableContainer: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto", marginBottom: 16 },
    selectInline: { padding: "6px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.84rem", fontFamily: "Nunito,sans-serif", color: "var(--text)", background: "var(--white)", outline: "none", cursor: "pointer" },
    actionIconBtn: (bg, color) => ({ background: bg, border: "none", borderRadius: 6, padding: "5px 8px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color, transition: "opacity 0.15s" }),
    emptyState: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5000, padding: 20 },
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 16px 60px rgba(26,155,140,0.22)", width: "100%", maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", background: "var(--primary)", borderTopLeftRadius: "var(--radius)", borderTopRightRadius: "var(--radius)", flexShrink: 0 },
    modalTitle: { fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#fff" },
    closeBtn: { background: "none", border: "1.5px solid rgba(255, 255, 255, 0.6)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" },
    modalBody: { padding: 24, overflowY: "auto", flex: 1 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 12, padding: "16px 24px", borderTop: "1.5px solid var(--border)", background: "var(--bg)", borderBottomLeftRadius: "var(--radius)", borderBottomRightRadius: "var(--radius)", flexShrink: 0 },
    grid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 },
    formGroup: { display: "flex", flexDirection: "column", gap: 4 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" },
    btnPrimary: { background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "8px 18px", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", fontFamily: "Nunito, sans-serif" },
    btnSecondary: { background: "var(--white)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 16px", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", transition: "background 0.2s" },
};
