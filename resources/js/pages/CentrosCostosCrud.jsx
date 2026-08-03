import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import {
    IconSearch, IconEdit, IconTrash, IconClose,
    IconEmptySearch, IconLoading,
} from "../components/Icons";

const POR_PAGINA = 15;
const CAMPOS_VACIOS = { codigo: "", nombre: "", ciudad: "", proyecto: "", activo: true };

const norm = (s = "") => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* ─── Modal de creación / edición ──────────────────────────────────── */
function FormModal({ open, onClose, onSave, editTarget }) {
    const [form, setForm] = useState(CAMPOS_VACIOS);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (open) {
            setForm(editTarget ? {
                codigo: editTarget.codigo ?? "",
                nombre: editTarget.nombre ?? "",
                ciudad: editTarget.ciudad ?? "",
                proyecto: editTarget.proyecto ?? "",
                activo: !!editTarget.activo,
            } : CAMPOS_VACIOS);
            setErrors({});
        }
    }, [open, editTarget]);

    if (!open) return null;

    const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const validate = () => {
        const e = {};
        if (!form.codigo.trim()) e.codigo = "Requerido";
        if (!form.nombre.trim()) e.nombre = "Requerido";
        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setSaving(true);
        setErrors({});
        try {
            await onSave({
                codigo: form.codigo.trim(),
                nombre: form.nombre.trim(),
                ciudad: form.ciudad.trim() || null,
                proyecto: form.proyecto.trim() || null,
                activo: form.activo,
            });
            onClose();
        } catch (err) {
            const msg = err?.response?.data?.errors?.codigo?.[0]
                ?? err?.response?.data?.message
                ?? "No se pudo guardar el centro de costo.";
            setErrors({ codigo: msg });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>
                        {editTarget ? "Editar Centro de Costo" : "Nuevo Centro de Costo"}
                    </span>
                    <button style={S.closeBtnWhite} onClick={onClose}>
                        <IconClose size={14} />
                    </button>
                </div>
                <div style={S.modalBody}>
                    <div style={S.grid2}>
                        <div style={S.formGroup}>
                            <label style={S.label}>Código *</label>
                            <input
                                style={{ ...S.input, ...(errors.codigo ? { borderColor: "#e74c3c" } : {}) }}
                                value={form.codigo}
                                onChange={onChange("codigo")}
                            />
                            {errors.codigo && <span style={S.err}>{errors.codigo}</span>}
                        </div>
                        <div style={S.formGroup}>
                            <label style={S.label}>Ciudad</label>
                            <input style={S.input} value={form.ciudad} onChange={onChange("ciudad")} />
                        </div>
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.label}>Nombre *</label>
                        <input
                            style={{ ...S.input, ...(errors.nombre ? { borderColor: "#e74c3c" } : {}) }}
                            value={form.nombre}
                            onChange={onChange("nombre")}
                        />
                        {errors.nombre && <span style={S.err}>{errors.nombre}</span>}
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.label}>Proyecto</label>
                        <input style={S.input} value={form.proyecto} onChange={onChange("proyecto")} />
                    </div>
                    <label style={S.checkboxRow}>
                        <input
                            type="checkbox"
                            checked={form.activo}
                            onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                        />
                        Activo
                    </label>
                </div>
                <div style={S.modalFooter}>
                    <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
                    <button className="btn-primary" style={{ opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
                        {saving ? "Guardando…" : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function CentrosCostosCrud() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debSearch = useDebounce(search, 280);
    const [pagina, setPagina] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

    const { data: centros = [], isLoading } = useQuery({
        queryKey: ["centros-costo-catalogo-admin"],
        queryFn: () => api.get("/centros-costo-catalogo?all=1").then((r) => r.data),
    });

    const filtered = useMemo(() => {
        const q = norm(debSearch);
        if (!q) return centros;
        return centros.filter((c) =>
            [c.codigo, c.nombre, c.ciudad, c.proyecto].some((v) => norm(v ?? "").includes(q)),
        );
    }, [centros, debSearch]);

    const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
    const paginated = filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ["centros-costo-catalogo-admin"] });
        qc.invalidateQueries({ queryKey: ["centros-costo-catalogo"] });
    };

    const handleCreate = () => {
        setEditTarget(null);
        setModalOpen(true);
    };

    const handleEdit = (centro) => {
        setEditTarget(centro);
        setModalOpen(true);
    };

    const handleSave = async (payload) => {
        if (editTarget) {
            await api.put(`/centros-costo-catalogo/${editTarget.id}`, payload);
            invalidate();
            showToast("Centro de costo actualizado.");
        } else {
            await api.post("/centros-costo-catalogo", payload);
            invalidate();
            showToast("Centro de costo creado.");
        }
    };

    const handleDelete = async (centro) => {
        if (!confirm(`¿Eliminar el centro de costo "${centro.codigo} · ${centro.nombre}"?`)) return;
        try {
            await api.delete(`/centros-costo-catalogo/${centro.id}`);
            invalidate();
            showToast("Centro de costo eliminado.");
        } catch {
            showToast("No se pudo eliminar el centro de costo.");
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{centros.length}</div>
                    <div className="stat-label">Total centros de costo</div>
                </div>
            </div>

            <div style={S.toolbar}>
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}><IconSearch size={15} /></span>
                    <input
                        style={S.searchInput}
                        placeholder="Buscar por código, nombre, ciudad, proyecto…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPagina(1); }}
                    />
                </div>
                <button className="btn-primary" onClick={handleCreate}>
                    + Nuevo Centro de Costo
                </button>
            </div>

            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
                ) : filtered.length === 0 ? (
                    <div style={S.empty}><IconEmptySearch size={44} /><p>No se encontraron centros de costo.</p></div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>operaciones</th>
                                <th>Ciudad</th>
                                <th>Proyecto</th>
                                <th style={{ textAlign: "center" }}>Estado</th>
                                <th style={{ textAlign: "center" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.codigo}</td>
                                    <td>{c.nombre}</td>
                                    <td>{c.ciudad || "—"}</td>
                                    <td>{c.proyecto || "—"}</td>
                                    <td style={{ textAlign: "center" }}>
                                        <span style={S.badge(!!c.activo)}>
                                            {c.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={S.actions}>
                                            <button
                                                style={S.actionBtn("var(--primary-light)", "var(--primary-dark)")}
                                                title="Editar"
                                                onClick={() => handleEdit(c)}
                                            >
                                                <IconEdit size={14} />
                                            </button>
                                            <button style={S.actionBtn("#fce8e8", "#a33")} title="Eliminar" onClick={() => handleDelete(c)}>
                                                <IconTrash size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!isLoading && filtered.length > POR_PAGINA && (
                <div style={S.paginationBar}>
                    <span style={S.paginationInfo}>
                        Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filtered.length)} de {filtered.length}
                    </span>
                    <div style={S.paginationBtns}>
                        <button style={S.pageBtn(pagina === 1, false)} disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>‹</button>
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
                            .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) => (p === "…"
                                ? <span key={`e${i}`} style={{ padding: "0 4px", color: "var(--text-muted)" }}>…</span>
                                : <button key={p} style={S.pageBtn(false, p === pagina)} onClick={() => setPagina(p)}>{p}</button>
                            ))}
                        <button style={S.pageBtn(pagina === totalPaginas, false)} disabled={pagina === totalPaginas} onClick={() => setPagina((p) => p + 1)}>›</button>
                    </div>
                </div>
            )}

            <FormModal
                open={modalOpen}
                editTarget={editTarget}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    );
}

/* ── Estilos ─────────────────────────────────────────────────────── */
const S = {
    toast: {
        position: "fixed", bottom: 28, right: 28, background: "var(--primary)",
        color: "#fff", borderRadius: 10, padding: "12px 22px", fontWeight: 700,
        zIndex: 9999, boxShadow: "0 4px 18px rgba(0,0,0,0.18)", fontFamily: "Nunito,sans-serif",
    },
    toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" },
    searchWrap: { position: "relative", flex: 1, minWidth: 200, maxWidth: 420 },
    searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", color: "var(--text-muted)", pointerEvents: "none" },
    searchInput: { width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none" },
    tableWrap: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    actions: { display: "flex", gap: 6, justifyContent: "center" },
    actionBtn: (bg, color) => ({ background: bg, border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color, transition: "opacity 0.15s", display: "inline-flex", alignItems: "center" }),
    badge: (activo) => ({
        display: "inline-block", padding: "3px 10px", borderRadius: 999,
        fontSize: "0.74rem", fontWeight: 700,
        background: activo ? "#e3f6ee" : "#fce8e8",
        color: activo ? "#1a8f5e" : "#a33",
    }),
    empty: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    paginationBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", flexWrap: "wrap", gap: 10 },
    paginationInfo: { fontSize: "0.84rem", color: "var(--text-muted)", fontWeight: 600 },
    paginationBtns: { display: "flex", alignItems: "center", gap: 4 },
    pageBtn: (disabled, active) => ({
        minWidth: 32, height: 32, padding: "0 8px",
        border: active ? "none" : "1.5px solid var(--border)",
        borderRadius: 6,
        background: active ? "var(--primary)" : disabled ? "var(--bg)" : "var(--white)",
        color: active ? "#fff" : disabled ? "var(--text-muted)" : "var(--text)",
        fontWeight: 700, fontSize: "0.85rem", cursor: disabled ? "default" : "pointer",
    }),

    /* modal */
    overlay: { position: "fixed", inset: 0, background: "rgba(26,58,53,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 5000, padding: "32px 16px", overflowY: "auto" },
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 16px 60px rgba(26,155,140,0.22)", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column" },
    modalHeaderGreen: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", background: "var(--primary)", borderTopLeftRadius: "var(--radius)", borderTopRightRadius: "var(--radius)", flexShrink: 0 },
    modalTitleWhite: { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#fff" },
    closeBtnWhite: { background: "none", border: "1.5px solid rgba(255,255,255,0.6)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" },
    modalBody: { padding: "22px 28px 28px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 12, padding: "16px 28px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },

    /* form */
    grid2: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 },
    formGroup: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" },
    input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", color: "var(--text)", background: "var(--white)", outline: "none" },
    checkboxRow: { display: "flex", alignItems: "center", gap: 8, fontSize: "0.86rem", fontWeight: 600, color: "var(--text)", cursor: "pointer" },
    err: { color: "#e74c3c", fontSize: "0.75rem", marginTop: 2 },
};
