import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import {
    IconSearch, IconEdit, IconTrash, IconClose,
    IconEmptySearch, IconLoading,
} from "../components/Icons";

const POR_PAGINA = 15;

const norm = (s = "") => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* ─── Modal de creación / edición ──────────────────────────────────── */
function FormModal({ open, onClose, onSave, editTarget }) {
    const [nombre, setNombre] = useState("");
    const [activo, setActivo] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (open) {
            setNombre(editTarget?.nombre ?? "");
            setActivo(editTarget ? !!editTarget.activo : true);
            setError("");
        }
    }, [open, editTarget]);

    if (!open) return null;

    const handleSave = async () => {
        if (!nombre.trim()) {
            setError("Requerido");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await onSave({ nombre: nombre.trim(), activo });
            onClose();
        } catch (err) {
            setError(
                err?.response?.data?.errors?.nombre?.[0] ??
                    err?.response?.data?.message ??
                    "No se pudo guardar el proyecto.",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>
                        {editTarget ? "Editar Proyecto" : "Nuevo Proyecto"}
                    </span>
                    <button style={S.closeBtnWhite} onClick={onClose}>
                        <IconClose size={14} />
                    </button>
                </div>
                <div style={S.modalBody}>
                    <div style={S.formGroup}>
                        <label style={S.label}>Nombre *</label>
                        <input
                            style={{
                                ...S.input,
                                ...(error ? { borderColor: "#e74c3c" } : {}),
                            }}
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej. TIGO EXPRESS, DIRECTV CO…"
                        />
                        {error && <span style={S.err}>{error}</span>}
                    </div>
                    <label style={S.checkboxRow}>
                        <input
                            type="checkbox"
                            checked={activo}
                            onChange={(e) => setActivo(e.target.checked)}
                        />
                        Activo
                    </label>
                </div>
                <div style={S.modalFooter}>
                    <button className="btn-secondary" onClick={onClose} disabled={saving}>
                        Cancelar
                    </button>
                    <button
                        className="btn-primary"
                        style={{ opacity: saving ? 0.6 : 1 }}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Guardando…" : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function ProyectosCrud() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debSearch = useDebounce(search, 280);
    const [pagina, setPagina] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3200);
    };

    const { data: proyectos = [], isLoading } = useQuery({
        queryKey: ["proyectos-admin"],
        queryFn: () => api.get("/proyectos").then((r) => r.data),
    });

    const filtered = useMemo(() => {
        const q = norm(debSearch);
        if (!q) return proyectos;
        return proyectos.filter((p) => norm(p.nombre ?? "").includes(q));
    }, [proyectos, debSearch]);

    const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
    const paginated = filtered.slice(
        (pagina - 1) * POR_PAGINA,
        pagina * POR_PAGINA,
    );

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ["proyectos-admin"] });
        qc.invalidateQueries({ queryKey: ["seleccion-catalogos"] });
    };

    const handleCreate = () => {
        setEditTarget(null);
        setModalOpen(true);
    };

    const handleEdit = (p) => {
        setEditTarget(p);
        setModalOpen(true);
    };

    const handleSave = async (payload) => {
        if (editTarget) {
            await api.put(`/proyectos/${editTarget.id}`, payload);
            invalidate();
            showToast("Proyecto actualizado.");
        } else {
            await api.post("/proyectos", payload);
            invalidate();
            showToast("Proyecto creado.");
        }
    };

    const handleDelete = async (p) => {
        if (!confirm(`¿Eliminar el proyecto "${p.nombre}"?`)) return;
        try {
            await api.delete(`/proyectos/${p.id}`);
            invalidate();
            showToast("Proyecto eliminado.");
        } catch (err) {
            showToast(
                err?.response?.data?.message ??
                    "No se pudo eliminar el proyecto.",
            );
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{proyectos.length}</div>
                    <div className="stat-label">Total proyectos</div>
                </div>
            </div>

            <div style={S.toolbar}>
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}>
                        <IconSearch size={15} />
                    </span>
                    <input
                        style={S.searchInput}
                        placeholder="Buscar por nombre…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPagina(1);
                        }}
                    />
                </div>
                <button className="btn-primary" onClick={handleCreate}>
                    + Nuevo Proyecto
                </button>
            </div>

            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}>
                        <IconLoading size={32} />
                        <p>Cargando…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p>No se encontraron proyectos.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th style={{ textAlign: "center" }}>Estado</th>
                                <th style={{ textAlign: "center" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((p) => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 700 }}>{p.nombre}</td>
                                    <td style={{ textAlign: "center" }}>
                                        <span style={S.badge(!!p.activo)}>
                                            {p.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={S.actions}>
                                            <button
                                                style={S.actionBtn(
                                                    "var(--primary-light)",
                                                    "var(--primary-dark)",
                                                )}
                                                title="Editar"
                                                onClick={() => handleEdit(p)}
                                            >
                                                <IconEdit size={14} />
                                            </button>
                                            <button
                                                style={S.actionBtn("#fce8e8", "#a33")}
                                                title="Eliminar"
                                                onClick={() => handleDelete(p)}
                                            >
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
                        Mostrando {(pagina - 1) * POR_PAGINA + 1}–
                        {Math.min(pagina * POR_PAGINA, filtered.length)} de{" "}
                        {filtered.length}
                    </span>
                    <div style={S.paginationBtns}>
                        <button
                            style={S.pageBtn(pagina === 1, false)}
                            disabled={pagina === 1}
                            onClick={() => setPagina((p) => p - 1)}
                        >
                            ‹
                        </button>
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                            .filter(
                                (p) =>
                                    p === 1 ||
                                    p === totalPaginas ||
                                    Math.abs(p - pagina) <= 1,
                            )
                            .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) =>
                                p === "…" ? (
                                    <span
                                        key={`e${i}`}
                                        style={{
                                            padding: "0 4px",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={p}
                                        style={S.pageBtn(false, p === pagina)}
                                        onClick={() => setPagina(p)}
                                    >
                                        {p}
                                    </button>
                                ),
                            )}
                        <button
                            style={S.pageBtn(pagina === totalPaginas, false)}
                            disabled={pagina === totalPaginas}
                            onClick={() => setPagina((p) => p + 1)}
                        >
                            ›
                        </button>
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
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 16px 60px rgba(26,155,140,0.22)", width: "100%", maxWidth: 440, display: "flex", flexDirection: "column" },
    modalHeaderGreen: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", background: "var(--primary)", borderTopLeftRadius: "var(--radius)", borderTopRightRadius: "var(--radius)", flexShrink: 0 },
    modalTitleWhite: { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#fff" },
    closeBtnWhite: { background: "none", border: "1.5px solid rgba(255,255,255,0.6)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" },
    modalBody: { padding: "22px 28px 28px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 12, padding: "16px 28px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },

    /* form */
    formGroup: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" },
    input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", color: "var(--text)", background: "var(--white)", outline: "none" },
    checkboxRow: { display: "flex", alignItems: "center", gap: 8, fontSize: "0.86rem", fontWeight: 600, color: "var(--text)", cursor: "pointer" },
    err: { color: "#e74c3c", fontSize: "0.75rem", marginTop: 2 },
};
