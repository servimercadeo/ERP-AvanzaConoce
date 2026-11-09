import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import { useAcciones } from "../hooks/useAcciones";
import { IconSearch, IconEdit, IconTrash, IconClose, IconEmptySearch, IconLoading } from "../components/Icons";
import { SearchableSelect } from "../components/SearchableSelect";

/**
 * Parámetros > Operativos > Supervisores y Torres. A un empleado se le asignan técnicos
 * (supervisor) o sedes (torre) sin cambiar su rol ni su cargo: solo sale en las columnas
 * "Supervisor" y "Torre" del exporte de Work Orders (ver AsignacionOperativaController).
 */
const TIPOS = {
    supervisores: { titulo: "Supervisores", singular: "Supervisor", items: "Técnicos", item: "técnico" },
    torres: { titulo: "Torres", singular: "Torre", items: "Sedes", item: "sede" },
};

function FormModal({ tipo, editTarget, asignaciones, opciones, onClose, onSave }) {
    const t = TIPOS[tipo];
    const [userId, setUserId] = useState(editTarget ? String(editTarget.user_id) : "");
    const [items, setItems] = useState(editTarget?.items ?? []);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const empleados = useMemo(() => {
        const usados = new Set(asignaciones.map((a) => a.user_id));
        return opciones.empleados
            .filter((e) => !usados.has(e.id))
            // Vienen ordenados con los de DIRECTV primero (ver ProyectoDeEmpleado); el proyecto va en la etiqueta para no confundirlos.
            .map((e) => ({
                value: String(e.id),
                label: [e.nombre, e.cargo, e.proyecto].filter(Boolean).join(" — "),
            }));
    }, [asignaciones, opciones.empleados]);

    // Un técnico tiene un solo supervisor y una sede una sola torre: los de otro salen en gris.
    const opcionesItems = useMemo(() => {
        const duenoDe = new Map(asignaciones
            .filter((a) => a.id !== editTarget?.id)
            .flatMap((a) => a.items.map((i) => [i.id, a.nombre])));
        const elegidos = new Set(items.map((i) => i.id));
        const lista = opciones.items
            .filter((i) => !elegidos.has(i.id))
            .map((i) => duenoDe.has(i.id)
                ? { value: String(i.id), label: `${i.nombre} (ya está con ${duenoDe.get(i.id)})`, disabled: true }
                : { value: String(i.id), label: i.nombre });
        return [...lista.filter((o) => !o.disabled), ...lista.filter((o) => o.disabled)];
    }, [asignaciones, opciones.items, items, editTarget]);

    const guardar = async () => {
        if (!userId) { setError(`Elige el empleado que será ${t.singular.toLowerCase()}.`); return; }
        setSaving(true);
        setError("");
        try {
            await onSave({ user_id: Number(userId), item_ids: items.map((i) => i.id) });
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message ?? "No se pudo guardar.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>{editTarget ? `Editar ${t.singular.toLowerCase()} — ${editTarget.nombre}` : `Agregar ${t.singular.toLowerCase()}`}</span>
                    <button style={S.closeBtnWhite} onClick={onClose}><IconClose size={14} /></button>
                </div>
                <div style={S.modalBody}>
                    {!editTarget && (
                        <div style={S.formGroup}>
                            <label style={S.label}>Empleado *</label>
                            <SearchableSelect value={userId} defaultValue="" options={empleados} onChange={setUserId} />
                            <span style={S.hint}>Conserva su cargo y su rol: esto solo se usa en el exporte de Work Orders.</span>
                        </div>
                    )}
                    <div style={S.formGroup}>
                        <label style={S.label}>{t.items}</label>
                        <SearchableSelect
                            value=""
                            defaultValue=""
                            options={opcionesItems}
                            onChange={(id) => {
                                const elegido = opciones.items.find((i) => String(i.id) === String(id));
                                if (elegido) setItems((lista) => [...lista, elegido]);
                            }}
                        />
                        {items.length === 0 ? (
                            <span style={S.hint}>Sin {t.items.toLowerCase()} asignados.</span>
                        ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                                {items.map((i) => (
                                    <span key={i.id} style={S.chip}>
                                        {i.nombre}
                                        <button type="button" style={S.chipBtn} title="Quitar" onClick={() => setItems((lista) => lista.filter((x) => x.id !== i.id))}>
                                            <IconClose size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    {error && <span style={S.err}>{error}</span>}
                </div>
                <div style={S.modalFooter}>
                    <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
                    <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
                </div>
            </div>
        </div>
    );
}

export default function AsignacionesOperativasCrud({ tipo }) {
    const t = TIPOS[tipo];
    const puede = useAcciones();
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debSearch = useDebounce(search, 280);
    const [modal, setModal] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3200);
    };

    const { data: asignaciones = [], isLoading } = useQuery({
        queryKey: ["asignaciones-operativas", tipo],
        queryFn: () => api.get(`/${tipo}`).then((r) => r.data),
    });
    const { data: opciones = { empleados: [], items: [] } } = useQuery({
        queryKey: ["asignaciones-operativas", tipo, "opciones"],
        queryFn: () => api.get(`/${tipo}/opciones`).then((r) => r.data),
        staleTime: 0,
    });

    const filtradas = useMemo(() => {
        const q = debSearch.trim().toLowerCase();
        if (!q) return asignaciones;
        return asignaciones.filter((a) =>
            (a.nombre ?? "").toLowerCase().includes(q) || a.items.some((i) => i.nombre.toLowerCase().includes(q)));
    }, [asignaciones, debSearch]);

    const invalidate = () => qc.invalidateQueries({ queryKey: ["asignaciones-operativas", tipo] });

    const guardar = async (datos) => {
        if (modal?.editTarget) {
            await api.put(`/${tipo}/${modal.editTarget.id}`, { item_ids: datos.item_ids });
            showToast(`${t.singular} actualizado.`);
        } else {
            await api.post(`/${tipo}`, datos);
            showToast(`${t.singular} agregado.`);
        }
        invalidate();
    };

    const eliminar = async (a) => {
        if (!confirm(`¿Quitar a ${a.nombre} de ${t.titulo}? Su cargo no cambia.`)) return;
        try {
            await api.delete(`/${tipo}/${a.id}`);
            invalidate();
            showToast(`${t.singular} quitado.`);
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo quitar.");
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{asignaciones.length}</div>
                    <div className="stat-label">{t.titulo}</div>
                </div>
            </div>

            <div style={S.toolbar}>
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}><IconSearch size={15} /></span>
                    <input style={S.searchInput} placeholder={`Buscar por nombre o ${t.item}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {puede.crear && <button className="btn-primary" onClick={() => setModal({ editTarget: null })}>+ Agregar {t.singular.toLowerCase()}</button>}
            </div>

            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
                ) : filtradas.length === 0 ? (
                    <div style={S.empty}><IconEmptySearch size={44} /><p>No hay {t.titulo.toLowerCase()} asignados.</p></div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{t.singular}</th>
                                <th>Cargo</th>
                                <th>{t.items}</th>
                                <th style={{ textAlign: "center" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtradas.map((a) => (
                                <tr key={a.id}>
                                    <td style={{ fontWeight: 700 }}>{a.nombre}</td>
                                    <td>{a.cargo || "—"}</td>
                                    <td>{a.items.length ? a.items.map((i) => i.nombre).join(", ") : "—"}</td>
                                    <td>
                                        <div style={S.actions}>
                                            {puede.editar && (
                                                <button style={S.actionBtn("var(--primary-light)", "var(--primary-dark)")} title="Editar" onClick={() => setModal({ editTarget: a })}>
                                                    <IconEdit size={14} />
                                                </button>
                                            )}
                                            {puede.eliminar && (
                                                <button style={S.actionBtn("#fce8e8", "#a33")} title="Quitar" onClick={() => eliminar(a)}>
                                                    <IconTrash size={14} />
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

            {modal && (
                <FormModal
                    tipo={tipo}
                    editTarget={modal.editTarget}
                    asignaciones={asignaciones}
                    opciones={opciones}
                    onClose={() => setModal(null)}
                    onSave={guardar}
                />
            )}
        </div>
    );
}

export const SupervisoresCrud = () => <AsignacionesOperativasCrud tipo="supervisores" />;
export const TorresCrud = () => <AsignacionesOperativasCrud tipo="torres" />;

const S = {
    toast: { position: "fixed", bottom: 28, right: 28, background: "var(--primary)", color: "#fff", borderRadius: 10, padding: "12px 22px", fontWeight: 700, zIndex: 9999, boxShadow: "0 4px 18px rgba(0,0,0,0.18)", fontFamily: "Nunito,sans-serif" },
    toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" },
    searchWrap: { position: "relative", flex: 1, minWidth: 200, maxWidth: 420 },
    searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", color: "var(--text-muted)", pointerEvents: "none" },
    searchInput: { width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none" },
    tableWrap: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    actions: { display: "flex", gap: 6, justifyContent: "center" },
    actionBtn: (bg, color) => ({ background: bg, border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color, display: "inline-flex", alignItems: "center" }),
    empty: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    overlay: { position: "fixed", inset: 0, background: "rgba(26,58,53,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 5000, padding: "32px 16px", overflowY: "auto" },
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 16px 60px rgba(26,155,140,0.22)", width: "100%", maxWidth: 680, display: "flex", flexDirection: "column" },
    modalHeaderGreen: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", background: "var(--primary)", borderTopLeftRadius: "var(--radius)", borderTopRightRadius: "var(--radius)", flexShrink: 0 },
    modalTitleWhite: { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#fff" },
    closeBtnWhite: { background: "none", border: "1.5px solid rgba(255,255,255,0.6)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" },
    modalBody: { padding: "22px 28px 28px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 12, padding: "16px 28px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },
    formGroup: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" },
    hint: { fontSize: "0.76rem", color: "var(--text-muted)" },
    err: { color: "#e74c3c", fontSize: "0.8rem" },
    chip: { display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 6px 5px 12px", borderRadius: 20, background: "var(--primary-light)", color: "var(--primary-dark)", fontSize: "0.82rem", fontWeight: 700 },
    chipBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 2, borderRadius: "50%" },
};
