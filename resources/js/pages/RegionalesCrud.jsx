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
    const [descripcion, setDescripcion] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (open) {
            setNombre(editTarget?.nombre ?? "");
            setDescripcion(editTarget?.descripcion ?? "");
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
            await onSave({
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || null,
            });
            onClose();
        } catch (err) {
            setError(
                err?.response?.data?.errors?.nombre?.[0] ??
                    err?.response?.data?.message ??
                    "No se pudo guardar la regional.",
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
                        {editTarget ? "Editar Regional" : "Nueva Regional"}
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
                            placeholder="Ej. CENTRO, COSTA, ANDINA…"
                        />
                        {error && <span style={S.err}>{error}</span>}
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.label}>Descripción</label>
                        <input
                            style={S.input}
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Ej. Bogotá y Cundinamarca"
                        />
                    </div>
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
export default function RegionalesCrud() {
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

    const { data: regionales = [], isLoading } = useQuery({
        queryKey: ["regionales-admin"],
        queryFn: () => api.get("/regionales").then((r) => r.data),
    });

    const filtered = useMemo(() => {
        const q = norm(debSearch);
        if (!q) return regionales;
        return regionales.filter((r) => norm(r.nombre ?? "").includes(q));
    }, [regionales, debSearch]);

    const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
    const paginated = filtered.slice(
        (pagina - 1) * POR_PAGINA,
        pagina * POR_PAGINA,
    );

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ["regionales-admin"] });
        qc.invalidateQueries({ queryKey: ["catalogos"] });
        qc.invalidateQueries({ queryKey: ["seleccion-catalogos"] });
    };

    const handleCreate = () => {
        setEditTarget(null);
        setModalOpen(true);
    };

    const handleEdit = (r) => {
        setEditTarget(r);
        setModalOpen(true);
    };

    const handleSave = async (payload) => {
        if (editTarget) {
            await api.put(`/regionales/${editTarget.id}`, payload);
            invalidate();
            showToast("Regional actualizada.");
        } else {
            await api.post("/regionales", payload);
            invalidate();
            showToast("Regional creada.");
        }
    };

    const handleDelete = async (r) => {
        if (!confirm(`¿Eliminar la regional "${r.nombre}"?`)) return;
        try {
            await api.delete(`/regionales/${r.id}`);
            invalidate();
            showToast("Regional eliminada.");
        } catch (err) {
            showToast(
                err?.response?.data?.message ??
                    "No se pudo eliminar la regional.",
            );
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{regionales.length}</div>
                    <div className="stat-label">Total regionales</div>
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
                    + Nueva Regional
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
                        <p>No se encontraron regionales.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Descripción</th>
                                <th style={{ textAlign: "center" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((r) => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 700 }}>{r.nombre}</td>
                                    <td>{r.descripcion || "—"}</td>
                                    <td>
                                        <div style={S.actions}>
                                            <button
                                                style={S.actionBtn(
                                                    "var(--primary-light)",
                                                    "var(--primary-dark)",
                                                )}
                                                title="Editar"
                                                onClick={() => handleEdit(r)}
                                            >
                                                <IconEdit size={14} />
                                            </button>
                                            <button
                                                style={S.actionBtn("#fce8e8", "#a33")}
                                                title="Eliminar"
                                                onClick={() => handleDelete(r)}
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
    err: { color: "#e74c3c", fontSize: "0.75rem", marginTop: 2 },
};
