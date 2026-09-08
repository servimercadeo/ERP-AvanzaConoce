import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import { IconEdit, IconTrash, IconClose, IconEmptySearch, IconSearch, IconLoading } from "../components/Icons";

const POR_PAGINA = 10;

function badgeStock(cantidad, minimo) {
    if (minimo === 0) return { bg: "#f1f5f9", color: "#475569", label: "Sin mín." };
    if (cantidad <= minimo * 0.5) return { bg: "#fce8e8", color: "#c0392b", label: "Crítico" };
    if (cantidad <= minimo) return { bg: "#fff7e0", color: "#b7780c", label: "Bajo" };
    return { bg: "#e0f7f4", color: "#0d6e5a", label: "OK" };
}

/* ─── Modal agregar / editar ──────────────────────────────────────────── */
function ItemModal({ item, tiposProducto, sedes, onClose, onSave, saving, errorMsg }) {
    const isEdit = !!item;
    const [form, setForm] = useState(item
        ? { tipo_producto_id: item.tipo_producto_id, sede_id: item.sede_id, precio: item.precio, cantidad: item.cantidad, stock_minimo: item.stock_minimo }
        : { tipo_producto_id: tiposProducto[0]?.id ?? "", sede_id: sedes[0]?.id ?? "", precio: 0, cantidad: 0, stock_minimo: 0 });

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={{ ...S.modal, maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>{isEdit ? "Editar item" : "Nuevo item"}</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <div style={S.grid2}>
                        <div style={{ ...S.formGroup, gridColumn: "span 2" }}>
                            <label style={S.label}>Producto *</label>
                            <select style={S.input} value={form.tipo_producto_id} onChange={set("tipo_producto_id")} disabled={isEdit}>
                                {tiposProducto.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </select>
                        </div>
                        <div style={{ ...S.formGroup, gridColumn: "span 2" }}>
                            <label style={S.label}>Sede *</label>
                            <select style={S.input} value={form.sede_id} onChange={set("sede_id")} disabled={isEdit}>
                                {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <div style={S.formGroup}>
                            <label style={S.label}>Precio</label>
                            <input type="number" min={0} style={S.input} value={form.precio} onChange={set("precio")} />
                        </div>
                        <div style={S.formGroup}>
                            <label style={S.label}>Cantidad</label>
                            <input type="number" min={0} style={S.input} value={form.cantidad} onChange={set("cantidad")} />
                        </div>
                        <div style={S.formGroup}>
                            <label style={S.label}>Stock mínimo</label>
                            <input type="number" min={0} style={S.input} value={form.stock_minimo} onChange={set("stock_minimo")} />
                        </div>
                    </div>
                    {errorMsg && <div style={S.errorMsg}>{errorMsg}</div>}
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cancelar</button>
                    <button style={S.btnPrimary} onClick={() => onSave(form, isEdit ? item.id : null)} disabled={saving}>
                        {saving ? "Guardando…" : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Modal confirmar eliminación ─────────────────────────────────────── */
function DeleteModal({ item, onClose, onConfirm, deleting }) {
    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={{ ...S.modal, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, color: "#c0392b" }}>Eliminar item</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <p>¿Eliminar <strong>{item.producto}</strong> de <strong>{item.sede}</strong>?</p>
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={deleting}>Cancelar</button>
                    <button style={{ ...S.btnPrimary, background: "#c0392b" }} onClick={onConfirm} disabled={deleting}>
                        {deleting ? "Eliminando…" : "Eliminar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   Componente genérico: inventario real (base de datos) "por sede" para
   una categoría de producto. Misma mecánica que Inventario de Dotación,
   pero sin proyecto/género/talla, que son propios de la ropa de dotación.
═══════════════════════════════════════════════════════════════════════ */
export default function InventarioCategoriaCrud({ categoria }) {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [sedeFiltro, setSedeFiltro] = useState("Todas");
    const [pagina, setPagina] = useState(1);
    const [addOpen, setAddOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);
    const [toast, setToast] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formError, setFormError] = useState("");

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const filtros = {
        categoria,
        sede_id: sedeFiltro !== "Todas" ? sedeFiltro : undefined,
        search: debouncedSearch || undefined,
    };

    const { data: items = [], isLoading, isFetching } = useQuery({
        queryKey: ["inventario-productos", filtros],
        queryFn: () => api.get("/inventario-productos", { params: filtros }).then((r) => r.data),
        placeholderData: (prev) => prev,
    });

    useEffect(() => { setPagina(1); }, [categoria, sedeFiltro, debouncedSearch]);

    const totalPaginas = Math.max(1, Math.ceil(items.length / POR_PAGINA));
    const itemsPagina = items.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

    const { data: stats = { total: 0, bajoStock: 0 } } = useQuery({
        queryKey: ["inventario-productos-resumen", categoria],
        queryFn: () => api.get("/inventario-productos/resumen", { params: { categoria } }).then((r) => r.data),
    });

    const { data: tiposProducto = [] } = useQuery({
        queryKey: ["tipos-producto", categoria],
        queryFn: () => api.get("/tipos-producto", { params: { categoria } }).then((r) => r.data),
    });

    const { data: sedes = [] } = useQuery({
        queryKey: ["inventario-productos-sedes"],
        queryFn: () => api.get("/inventario-productos/sedes").then((r) => r.data),
        staleTime: 10 * 60 * 1000,
    });

    const sedesConDatos = useMemo(
        () => [...new Map(items.map((i) => [i.sede_id, i.sede])).entries()]
            .map(([id, nombre]) => ({ id, nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        [items]
    );

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ["inventario-productos"] });
        qc.invalidateQueries({ queryKey: ["inventario-productos-resumen", categoria] });
    };

    const handleGuardar = async (form, editId) => {
        setSaving(true);
        setFormError("");
        try {
            const payload = {
                tipo_producto_id: Number(form.tipo_producto_id),
                sede_id: Number(form.sede_id),
                precio: Number(form.precio) || 0,
                cantidad: Number(form.cantidad) || 0,
                stock_minimo: Number(form.stock_minimo) || 0,
            };
            if (editId) {
                await api.put(`/inventario-productos/${editId}`, payload);
                showToast("Item actualizado.");
                setEditItem(null);
            } else {
                const { data } = await api.post("/inventario-productos", payload);
                showToast(data?.cantidad !== undefined ? "Item guardado." : "Item agregado.");
                setAddOpen(false);
            }
            invalidate();
        } catch (err) {
            setFormError(err?.response?.data?.message ?? "No se pudo guardar.");
        } finally {
            setSaving(false);
        }
    };

    const handleEliminar = async () => {
        setDeleting(true);
        try {
            await api.delete(`/inventario-productos/${deleteItem.id}`);
            invalidate();
            showToast("Item eliminado.");
            setDeleteItem(null);
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo eliminar.");
        } finally {
            setDeleting(false);
        }
    };

    const handleExport = async () => {
        const XLSX = await import("xlsx");
        const rows = items.map((i) => ({
            Producto: i.producto,
            Sede: i.sede,
            Precio: i.precio,
            Cantidad: i.cantidad,
            "Stock mínimo": i.stock_minimo,
            Estado: badgeStock(i.cantidad, i.stock_minimo).label,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        const fecha = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `Inventario_${categoria}_${fecha}.xlsx`.replace(/\s+/g, "_"));
        showToast(`Excel exportado (${rows.length} item${rows.length !== 1 ? "s" : ""}).`);
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Total items</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "var(--primary-dark)" }}>{sedesConDatos.length}</div>
                    <div className="stat-label">Sedes con stock</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#c0392b" }}>{stats.bajoStock}</div>
                    <div className="stat-label">Stock bajo / crítico</div>
                </div>
            </div>

            {/* Filtro por sede */}
            <div style={{ maxWidth: 320, marginBottom: 14 }}>
                <label style={{ ...S.label, display: "block", marginBottom: 4 }}>Sede</label>
                <select style={S.input} value={sedeFiltro} onChange={(e) => setSedeFiltro(e.target.value)}>
                    <option value="Todas">Todas las sedes</option>
                    {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}><IconSearch size={15} /></span>
                    <input
                        style={S.searchInput}
                        placeholder={`Buscar en ${categoria}…`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                    <button style={S.btnSecondary} onClick={handleExport} disabled={items.length === 0}>
                        Exportar Excel
                    </button>
                    <button style={S.btnPrimary} onClick={() => setAddOpen(true)} disabled={tiposProducto.length === 0 || sedes.length === 0}>
                        + Nuevo item
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div style={{ ...S.tableWrap, opacity: isFetching && !isLoading ? 0.6 : 1, transition: "opacity 0.15s" }}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando inventario…</p></div>
                ) : items.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p style={{ fontWeight: 700, marginBottom: 4 }}>Sin items en {categoria}</p>
                        <p style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>Usa "+ Nuevo item" para agregar productos.</p>
                    </div>
                ) : (
                    <table className="data-table" style={{ fontSize: "0.85rem" }}>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Sede</th>
                                <th style={{ textAlign: "right" }}>Precio</th>
                                <th style={{ textAlign: "center" }}>Cantidad</th>
                                <th style={{ textAlign: "center" }}>Stock mín.</th>
                                <th style={{ textAlign: "center" }}>Estado</th>
                                <th style={{ textAlign: "center" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsPagina.map((item) => {
                                const bs = badgeStock(item.cantidad, item.stock_minimo);
                                return (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: 700 }}>{item.producto}</td>
                                        <td style={{ color: "var(--text-muted)" }}>{item.sede}</td>
                                        <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                                            {Number(item.precio ?? 0).toLocaleString("es-CO")}
                                        </td>
                                        <td style={{ textAlign: "center", fontWeight: 800, fontSize: "0.96rem" }}>{item.cantidad}</td>
                                        <td style={{ textAlign: "center", color: "var(--text-muted)" }}>{item.stock_minimo}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: bs.bg, color: bs.color, whiteSpace: "nowrap" }}>
                                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: bs.color, display: "inline-block" }} />
                                                {bs.label}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                                <button style={S.actionBtn("#e8f8f5", "var(--primary-dark)")} title="Editar" onClick={() => setEditItem(item)}>
                                                    <IconEdit size={14} />
                                                </button>
                                                <button style={S.actionBtn("#fce8e8", "#c0392b")} title="Eliminar" onClick={() => setDeleteItem(item)}>
                                                    <IconTrash size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Paginación */}
            {items.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 10 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        Página {pagina} de {totalPaginas} · Mostrando {itemsPagina.length} de {items.length}
                    </span>
                    <div style={{ display: "flex", gap: 6 }}>
                        <button style={S.btnSecondary} onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1}>
                            ‹ Anterior
                        </button>
                        <button style={S.btnSecondary} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}>
                            Siguiente ›
                        </button>
                    </div>
                </div>
            )}

            {addOpen && (
                <ItemModal
                    tiposProducto={tiposProducto}
                    sedes={sedes}
                    onClose={() => { setAddOpen(false); setFormError(""); }}
                    onSave={handleGuardar}
                    saving={saving}
                    errorMsg={formError}
                />
            )}
            {editItem && (
                <ItemModal
                    item={editItem}
                    tiposProducto={tiposProducto}
                    sedes={sedes}
                    onClose={() => { setEditItem(null); setFormError(""); }}
                    onSave={handleGuardar}
                    saving={saving}
                    errorMsg={formError}
                />
            )}
            {deleteItem && (
                <DeleteModal
                    item={deleteItem}
                    onClose={() => setDeleteItem(null)}
                    onConfirm={handleEliminar}
                    deleting={deleting}
                />
            )}
        </div>
    );
}

/* ─── Estilos (mismo lenguaje visual que Inventario de Dotación) ───────── */
const S = {
    searchWrap: { position: "relative", flex: 1, minWidth: 220, maxWidth: 420 },
    searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", display: "flex" },
    searchInput: { width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", boxSizing: "border-box" },
    tableWrap: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    actionBtn: (bg, color) => ({ background: bg, border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color, display: "flex", alignItems: "center", justifyContent: "center" }),
    empty: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", width: "100%", fontFamily: "Nunito,sans-serif", maxHeight: "92vh", display: "flex", flexDirection: "column" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1.5px solid var(--border)", flexShrink: 0 },
    modalBody: { padding: "18px 22px", overflowY: "auto", flex: 1 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px 18px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
    formGroup: { display: "flex", flexDirection: "column", gap: 5 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" },
    input: { padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", width: "100%", boxSizing: "border-box" },
    btnPrimary: { padding: "9px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnSecondary: { padding: "9px 18px", background: "var(--white)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", borderRadius: 6 },
    errorMsg: { background: "#fce8e8", color: "#c0392b", borderRadius: 6, padding: "8px 12px", fontSize: "0.84rem", fontWeight: 600, marginTop: 10 },
    toast: { position: "fixed", bottom: 28, right: 28, background: "var(--primary)", color: "#fff", borderRadius: "var(--radius-sm)", padding: "13px 22px", fontWeight: 700, fontSize: "0.92rem", zIndex: 99999, boxShadow: "0 8px 28px rgba(26,155,140,0.35)" },
};
