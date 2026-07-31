import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import { SearchableSelect } from "../components/SearchableSelect";
import {
    IconSearch,
    IconEdit,
    IconTrash,
    IconClose,
    IconEmptySearch,
    IconLoading,
    IconEye,
    IconPlus,
} from "../components/Icons";

const POR_PAGINA = 15;

const norm = (s = "") => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function FormModal({ open, onClose, onSave, editTarget }) {
    const [nombre, setNombre] = useState("");
    const [nit, setNit] = useState("");
    const [tipo, setTipo] = useState("Indirecto");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (open) {
            setNombre(editTarget?.nombre ?? "");
            setNit(editTarget?.nit ?? "");
            setTipo(editTarget?.tipo ?? "Indirecto");
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
            await onSave({ nombre: nombre.trim(), nit: nit.trim(), tipo });
            onClose();
        } catch (err) {
            setError(
                err?.response?.data?.errors?.nombre?.[0] ??
                    err?.response?.data?.message ??
                    "No se pudo guardar el empleador.",
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
                        {editTarget ? "Editar Empleador" : "Nuevo Empleador"}
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
                            placeholder="Ej. SERVIMERCADEO, SU TEMPORAL, STAFFING…"
                        />
                        {error && <span style={S.err}>{error}</span>}
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.label}>NIT</label>
                        <input
                            style={S.input}
                            value={nit}
                            onChange={(e) => setNit(e.target.value)}
                            placeholder="Ej. 900.896.003-1"
                        />
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.label}>Tipo *</label>
                        <select
                            style={S.input}
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                        >
                            <option value="Directo">Directo</option>
                            <option value="Indirecto">Indirecto</option>
                        </select>
                    </div>
                </div>
                <div style={S.modalFooter}>
                    <button
                        className="btn-secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
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

function ContactoFormModal({
    open,
    onClose,
    onSave,
    editTarget,
    regionesDisponibles,
}) {
    const [nombre, setNombre] = useState("");
    const [correo, setCorreo] = useState("");
    const [regional, setRegional] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (open) {
            setNombre(editTarget?.nombre ?? "");
            setCorreo(editTarget?.correo ?? "");
            setRegional(
                editTarget?.regional_id
                    ? String(editTarget.regional_id)
                    : "",
            );
            setError("");
        }
    }, [open, editTarget]);

    if (!open) return null;

    const handleSave = async () => {
        const regionalTexto = String(regional ?? "").trim();
        if (!nombre.trim() || !correo.trim() || !regionalTexto) {
            setError("Todos los campos son requeridos.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            // Si "regional" coincide con el id de una opción del catálogo, se manda tal cual;
            // si es texto libre (una regional nueva que no existe todavía), se manda el nombre
            // para que el backend la cree en `regionales` y resuelva su id.
            const opcionExistente = regionesDisponibles.find(
                (r) => String(r.id) === regionalTexto,
            );
            await onSave({
                nombre: nombre.trim(),
                correo: correo.trim(),
                ...(opcionExistente
                    ? { regional_id: opcionExistente.id }
                    : { regional_nombre: regionalTexto }),
            });
            onClose();
        } catch (err) {
            setError(
                err?.response?.data?.errors?.correo?.[0] ??
                    err?.response?.data?.message ??
                    "No se pudo guardar el contacto.",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ ...S.overlay, zIndex: 5100 }} onClick={onClose}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>
                        {editTarget ? "Editar Contacto" : "Nuevo Contacto"}
                    </span>
                    <button style={S.closeBtnWhite} onClick={onClose}>
                        <IconClose size={14} />
                    </button>
                </div>
                <div style={{ ...S.modalBody, overflow: "visible" }}>
                    <div style={S.formGroup}>
                        <label style={S.label}>Nombre del contacto *</label>
                        <input
                            style={S.input}
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej. Katherine Bueno"
                        />
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.label}>Correo *</label>
                        <input
                            style={S.input}
                            type="email"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            placeholder="nombre@dominio.com"
                        />
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.label}>Regional *</label>
                        <SearchableSelect
                            value={regional}
                            onChange={setRegional}
                            defaultValue=""
                            freeText
                            options={regionesDisponibles.map((r) => ({
                                value: String(r.id),
                                label: r.nombre,
                            }))}
                        />
                    </div>
                    {error && <span style={S.err}>{error}</span>}
                </div>
                <div style={S.modalFooter}>
                    <button
                        className="btn-secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
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

function ContactosModal({
    open,
    onClose,
    empleador,
    onChanged,
    regionesDisponibles,
}) {
    const [contactoModalOpen, setContactoModalOpen] = useState(false);
    const [editContacto, setEditContacto] = useState(null);

    if (!open || !empleador) return null;

    const contactos = empleador.contactos ?? [];

    const handleSaveContacto = async (payload) => {
        if (editContacto) {
            await api.put(
                `/empleadores/${empleador.id}/contactos/${editContacto.id}`,
                payload,
            );
        } else {
            await api.post(`/empleadores/${empleador.id}/contactos`, payload);
        }
        onChanged();
    };

    const handleDeleteContacto = async (c) => {
        if (!confirm(`¿Eliminar el contacto "${c.nombre}"?`)) return;
        await api.delete(`/empleadores/${empleador.id}/contactos/${c.id}`);
        onChanged();
    };

    return (
        <div style={S.overlay} onClick={onClose}>
            <div
                style={{ ...S.modal, maxWidth: 860 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>
                        Contactos — {empleador.nombre}
                    </span>
                    <button style={S.closeBtnWhite} onClick={onClose}>
                        <IconClose size={14} />
                    </button>
                </div>
                <div style={{ ...S.modalBody, gap: 0 }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginBottom: 12,
                        }}
                    >
                        <button
                            className="btn-primary"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: "0.84rem",
                                padding: "7px 14px",
                            }}
                            onClick={() => {
                                setEditContacto(null);
                                setContactoModalOpen(true);
                            }}
                        >
                            <IconPlus size={13} /> Nuevo contacto
                        </button>
                    </div>

                    {contactos.length === 0 ? (
                        <div style={{ ...S.empty, padding: "30px 10px" }}>
                            <IconEmptySearch size={36} />
                            <p>Este empleador aún no tiene contactos.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Contacto</th>
                                    <th>Correo</th>
                                    <th>Regional</th>
                                    <th style={{ textAlign: "center" }}>
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {contactos.map((c) => (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: 700 }}>
                                            {c.nombre}
                                        </td>
                                        <td>{c.correo}</td>
                                        <td>{c.regional?.nombre ?? "—"}</td>
                                        <td>
                                            <div style={S.actions}>
                                                <button
                                                    style={S.actionBtn(
                                                        "var(--primary-light)",
                                                        "var(--primary-dark)",
                                                    )}
                                                    title="Editar"
                                                    onClick={() => {
                                                        setEditContacto(c);
                                                        setContactoModalOpen(
                                                            true,
                                                        );
                                                    }}
                                                >
                                                    <IconEdit size={14} />
                                                </button>
                                                <button
                                                    style={S.actionBtn(
                                                        "#fce8e8",
                                                        "#a33",
                                                    )}
                                                    title="Eliminar"
                                                    onClick={() =>
                                                        handleDeleteContacto(c)
                                                    }
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
                <div style={S.modalFooter}>
                    <button className="btn-secondary" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>

            <ContactoFormModal
                open={contactoModalOpen}
                editTarget={editContacto}
                onClose={() => setContactoModalOpen(false)}
                onSave={handleSaveContacto}
                regionesDisponibles={regionesDisponibles}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function EmpleadoresCrud() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debSearch = useDebounce(search, 280);
    const [pagina, setPagina] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [viewTargetId, setViewTargetId] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3200);
    };

    const { data: empleadores = [], isLoading } = useQuery({
        queryKey: ["empleadores"],
        queryFn: () => api.get("/empleadores").then((r) => r.data),
    });

    const filtered = useMemo(() => {
        const q = norm(debSearch);
        if (!q) return empleadores;
        return empleadores.filter((e) => norm(e.nombre ?? "").includes(q));
    }, [empleadores, debSearch]);

    const viewTarget = useMemo(
        () => empleadores.find((e) => e.id === viewTargetId) ?? null,
        [empleadores, viewTargetId],
    );

    // Mismo catálogo `regionales` que usan Contratos y Pedidos (tabla compartida). Al guardar
    // un contacto con una regional nueva, el backend la agrega sola ahí, así que basta con
    // invalidar esta query tras guardar/editar para que aparezca en el selector.
    const { data: regionesConocidas = [] } = useQuery({
        queryKey: ["catalogos-regionales"],
        queryFn: () =>
            api.get("/catalogos").then((r) => r.data.regionales ?? []),
    });

    const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);
    const paginated = filtered.slice(
        (pagina - 1) * POR_PAGINA,
        pagina * POR_PAGINA,
    );

    const handleCreate = () => {
        setEditTarget(null);
        setModalOpen(true);
    };

    const handleEdit = (e) => {
        setEditTarget(e);
        setModalOpen(true);
    };

    const handleSave = async (payload) => {
        if (editTarget) {
            await api.put(`/empleadores/${editTarget.id}`, payload);
            qc.invalidateQueries({ queryKey: ["empleadores"] });
            qc.invalidateQueries({ queryKey: ["seleccion-catalogos"] });
            showToast("Empleador actualizado.");
        } else {
            await api.post("/empleadores", payload);
            qc.invalidateQueries({ queryKey: ["empleadores"] });
            qc.invalidateQueries({ queryKey: ["seleccion-catalogos"] });
            showToast("Empleador creado.");
        }
    };

    const handleDelete = async (e) => {
        if (!confirm(`¿Eliminar el empleador "${e.nombre}"?`)) return;
        try {
            await api.delete(`/empleadores/${e.id}`);
            qc.invalidateQueries({ queryKey: ["empleadores"] });
            qc.invalidateQueries({ queryKey: ["seleccion-catalogos"] });
            showToast("Empleador eliminado.");
        } catch (err) {
            showToast(
                err?.response?.data?.message ??
                    "No se pudo eliminar el empleador.",
            );
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{empleadores.length}</div>
                    <div className="stat-label">Total empleadores</div>
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
                    + Nuevo Empleador
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
                        <p>No se encontraron empleadores.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>NIT</th>
                                <th style={{ textAlign: "center" }}>Tipo</th>
                                <th style={{ textAlign: "center" }}>
                                    Contactos
                                </th>
                                <th style={{ textAlign: "center" }}>
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((e) => (
                                <tr key={e.id}>
                                    <td style={{ fontWeight: 700 }}>
                                        {e.nombre}
                                    </td>
                                    <td style={{ color: "var(--text-muted)" }}>
                                        {e.nit || "—"}
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <span
                                            style={S.badge(
                                                e.tipo === "Directo",
                                            )}
                                        >
                                            {e.tipo === "Directo"
                                                ? "Directo"
                                                : "Indirecto"}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <button
                                            style={{
                                                ...S.actionBtn(
                                                    "var(--bg)",
                                                    "var(--text-muted)",
                                                ),
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 6,
                                                padding: "5px 10px",
                                            }}
                                            title="Ver contactos"
                                            onClick={() =>
                                                setViewTargetId(e.id)
                                            }
                                        >
                                            <IconEye size={14} />
                                            {(e.contactos ?? []).length}
                                        </button>
                                    </td>
                                    <td>
                                        <div style={S.actions}>
                                            <button
                                                style={S.actionBtn(
                                                    "var(--primary-light)",
                                                    "var(--primary-dark)",
                                                )}
                                                title="Editar"
                                                onClick={() => handleEdit(e)}
                                            >
                                                <IconEdit size={14} />
                                            </button>
                                            <button
                                                style={S.actionBtn(
                                                    "#fce8e8",
                                                    "#a33",
                                                )}
                                                title="Eliminar"
                                                onClick={() => handleDelete(e)}
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
                                if (idx > 0 && p - arr[idx - 1] > 1)
                                    acc.push("…");
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

            <ContactosModal
                open={!!viewTarget}
                empleador={viewTarget}
                onClose={() => setViewTargetId(null)}
                onChanged={() => {
                    qc.invalidateQueries({ queryKey: ["empleadores"] });
                    qc.invalidateQueries({
                        queryKey: ["catalogos-regionales"],
                    });
                }}
                regionesDisponibles={regionesConocidas}
            />
        </div>
    );
}

/* ── Estilos ─────────────────────────────────────────────────────── */
const S = {
    toast: {
        position: "fixed",
        bottom: 28,
        right: 28,
        background: "var(--primary)",
        color: "#fff",
        borderRadius: 10,
        padding: "12px 22px",
        fontWeight: 700,
        zIndex: 9999,
        boxShadow: "0 4px 18px rgba(0,0,0,0.18)",
        fontFamily: "Nunito,sans-serif",
    },
    toolbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
        flexWrap: "wrap",
    },
    searchWrap: { position: "relative", flex: 1, minWidth: 200, maxWidth: 420 },
    searchIcon: {
        position: "absolute",
        left: 11,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        color: "var(--text-muted)",
        pointerEvents: "none",
    },
    searchInput: {
        width: "100%",
        padding: "9px 12px 9px 34px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
        fontFamily: "Nunito,sans-serif",
        background: "var(--white)",
        color: "var(--text)",
        outline: "none",
    },
    tableWrap: {
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        overflowX: "auto",
    },
    actions: { display: "flex", gap: 6, justifyContent: "center" },
    actionBtn: (bg, color) => ({
        background: bg,
        border: "none",
        borderRadius: 6,
        padding: "5px 8px",
        cursor: "pointer",
        color,
        transition: "opacity 0.15s",
        display: "inline-flex",
        alignItems: "center",
    }),
    badge: (directo) => ({
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: "0.74rem",
        fontWeight: 700,
        background: directo ? "#e3f6ee" : "#eef1f5",
        color: directo ? "#1a8f5e" : "#5a6472",
    }),
    empty: {
        padding: "60px 20px",
        textAlign: "center",
        color: "var(--text-muted)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
    },
    paginationBar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 4px",
        flexWrap: "wrap",
        gap: 10,
    },
    paginationInfo: {
        fontSize: "0.84rem",
        color: "var(--text-muted)",
        fontWeight: 600,
    },
    paginationBtns: { display: "flex", alignItems: "center", gap: 4 },
    pageBtn: (disabled, active) => ({
        minWidth: 32,
        height: 32,
        padding: "0 8px",
        border: active ? "none" : "1.5px solid var(--border)",
        borderRadius: 6,
        background: active
            ? "var(--primary)"
            : disabled
              ? "var(--bg)"
              : "var(--white)",
        color: active ? "#fff" : disabled ? "var(--text-muted)" : "var(--text)",
        fontWeight: 700,
        fontSize: "0.85rem",
        cursor: disabled ? "default" : "pointer",
    }),

    /* modal */
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(26,58,53,0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 5000,
        padding: "32px 16px",
        overflowY: "auto",
    },
    modal: {
        background: "var(--white)",
        borderRadius: "var(--radius)",
        boxShadow: "0 16px 60px rgba(26,155,140,0.22)",
        width: "100%",
        maxWidth: 440,
        display: "flex",
        flexDirection: "column",
    },
    modalHeaderGreen: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 28px",
        background: "var(--primary)",
        borderTopLeftRadius: "var(--radius)",
        borderTopRightRadius: "var(--radius)",
        flexShrink: 0,
    },
    modalTitleWhite: {
        fontFamily: "'Poppins',sans-serif",
        fontWeight: 700,
        fontSize: "1.1rem",
        color: "#fff",
    },
    closeBtnWhite: {
        background: "none",
        border: "1.5px solid rgba(255,255,255,0.6)",
        borderRadius: "50%",
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#fff",
    },
    modalBody: {
        padding: "22px 28px 28px",
        overflowY: "auto",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 14,
    },
    modalFooter: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
        padding: "16px 28px",
        borderTop: "1.5px solid var(--border)",
        flexShrink: 0,
    },

    /* form */
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: 5,
        minWidth: 0,
    },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 10px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
        fontFamily: "Nunito,sans-serif",
        color: "var(--text)",
        background: "var(--white)",
        outline: "none",
    },
    err: { color: "#e74c3c", fontSize: "0.75rem", marginTop: 2 },
};
