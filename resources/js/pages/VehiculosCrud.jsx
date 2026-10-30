import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import { useAcciones } from "../hooks/useAcciones";
import {
    IconSearch, IconEdit, IconTrash, IconClose,
    IconEmptySearch, IconLoading, IconFile, IconTruck,
} from "../components/Icons";
import SelectBuscable from "../components/SelectBuscable";
import BotonArchivo from "../components/BotonArchivo";

const TIPOS = ["Carro", "Moto"];

const fmtFecha = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
};

/** Rojo si ya venció, naranja si vence en menos de 30 días, verde si está bien. */
function estadoVencimiento(iso) {
    if (!iso) return { color: "var(--text-muted)", bg: "transparent" };
    const dias = (new Date(iso) - new Date(new Date().toDateString())) / 86400000;
    if (dias < 0) return { color: "#a33", bg: "#fce8e8" };
    if (dias <= 30) return { color: "#92400e", bg: "#fef3c7" };
    return { color: "#2e7d32", bg: "#e8f5e9" };
}

function FechaBadge({ iso }) {
    const e = estadoVencimiento(iso);
    return (
        <span style={{ fontSize: "0.8rem", fontWeight: 700, padding: "3px 9px", borderRadius: 20, color: e.color, background: e.bg, whiteSpace: "nowrap" }}>
            {fmtFecha(iso)}
        </span>
    );
}

/* ─── Modal de creación / edición ──────────────────────────────────── */
function FormModal({ open, onClose, onSave, editTarget, tecnicos }) {
    const [tipo, setTipo] = useState("Carro");
    const [placa, setPlaca] = useState("");
    const [ccPropietario, setCcPropietario] = useState("");
    const [tecnicoAsignadoId, setTecnicoAsignadoId] = useState("");
    const [fechaMatricula, setFechaMatricula] = useState("");
    const [fechaVenceSoat, setFechaVenceSoat] = useState("");
    const [fechaVenceTecnomecanica, setFechaVenceTecnomecanica] = useState("");
    const [tarjetaFrontal, setTarjetaFrontal] = useState(null);
    const [tarjetaTrasera, setTarjetaTrasera] = useState(null);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [verError, setVerError] = useState("");

    React.useEffect(() => {
        if (open) {
            setTipo(editTarget?.tipo ?? "Carro");
            setPlaca(editTarget?.placa ?? "");
            setCcPropietario(editTarget?.cc_propietario ?? "");
            setTecnicoAsignadoId(editTarget?.tecnico_asignado_id ? String(editTarget.tecnico_asignado_id) : "");
            setFechaMatricula(editTarget?.fecha_matricula ?? "");
            setFechaVenceSoat(editTarget?.fecha_vence_soat ?? "");
            setFechaVenceTecnomecanica(editTarget?.fecha_vence_tecnomecanica ?? "");
            setTarjetaFrontal(null);
            setTarjetaTrasera(null);
            setError("");
            setVerError("");
        }
    }, [open, editTarget]);

    if (!open) return null;

    const venceMatricula = fechaMatricula
        ? (() => {
              const d = new Date(fechaMatricula);
              d.setFullYear(d.getFullYear() + 2);
              return d.toISOString().slice(0, 10);
          })()
        : null;

    const verArchivo = async (cara) => {
        setVerError("");
        try {
            const res = await api.get(`/vehiculos/${editTarget.id}/archivo/${cara}`, { responseType: "blob" });
            const url = URL.createObjectURL(new Blob([res.data], { type: res.headers["content-type"] || "image/jpeg" }));
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch {
            setVerError("No se pudo abrir el archivo.");
        }
    };

    const handleSave = async () => {
        if (!placa.trim() || !tipo) {
            setError("Tipo y placa son obligatorios.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const fd = new FormData();
            fd.append("tipo", tipo);
            fd.append("placa", placa.trim());
            if (ccPropietario.trim()) fd.append("cc_propietario", ccPropietario.trim());
            if (tecnicoAsignadoId) fd.append("tecnico_asignado_id", tecnicoAsignadoId);
            if (fechaMatricula) fd.append("fecha_matricula", fechaMatricula);
            if (fechaVenceSoat) fd.append("fecha_vence_soat", fechaVenceSoat);
            if (fechaVenceTecnomecanica) fd.append("fecha_vence_tecnomecanica", fechaVenceTecnomecanica);
            if (tarjetaFrontal) fd.append("tarjeta_propiedad_frontal", tarjetaFrontal);
            if (tarjetaTrasera) fd.append("tarjeta_propiedad_trasera", tarjetaTrasera);
            await onSave(fd);
            onClose();
        } catch (err) {
            setError(
                Object.values(err?.response?.data?.errors ?? {})[0]?.[0] ??
                    err?.response?.data?.message ??
                    "No se pudo guardar el vehículo.",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>{editTarget ? "Editar Vehículo" : "Nuevo Vehículo"}</span>
                    <button style={S.closeBtnWhite} onClick={onClose}>
                        <IconClose size={14} />
                    </button>
                </div>
                <div style={S.modalBody}>
                    <div style={S.row2}>
                        <div style={S.formGroup}>
                            <label style={S.label}>Tipo *</label>
                            <SelectBuscable style={S.input} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                            </SelectBuscable>
                        </div>
                        <div style={S.formGroup}>
                            <label style={S.label}>Placa *</label>
                            <input style={S.input} value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="Ej. ABC123" />
                        </div>
                    </div>

                    <div style={S.formGroup}>
                        <label style={S.label}>CC Propietario (en la tarjeta de propiedad)</label>
                        <input style={S.input} value={ccPropietario} onChange={(e) => setCcPropietario(e.target.value)} placeholder="Número de cédula" />
                    </div>

                    <div style={S.formGroup}>
                        <label style={S.label}>Técnico asignado</label>
                        <SelectBuscable style={S.input} value={tecnicoAsignadoId} onChange={(e) => setTecnicoAsignadoId(e.target.value)}>
                            <option value="">— Sin asignar —</option>
                            {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.name}{t.cedula ? ` (${t.cedula})` : ""}</option>)}
                        </SelectBuscable>
                    </div>

                    <div style={S.formGroup}>
                        <label style={S.label}>Tarjeta de propiedad (foto, 2 caras)</label>
                        <div style={S.row2}>
                            <div>
                                <span style={{ ...S.hint, display: "block", marginBottom: 5 }}>Cara frontal</span>
                                <BotonArchivo archivo={tarjetaFrontal} onChange={setTarjetaFrontal} />
                                {editTarget?.tarjeta_propiedad_frontal && !tarjetaFrontal && (
                                    <button type="button" style={S.linkBtn} onClick={() => verArchivo("frontal")}>
                                        <IconFile size={13} /> Ver cara frontal guardada
                                    </button>
                                )}
                            </div>
                            <div>
                                <span style={{ ...S.hint, display: "block", marginBottom: 5 }}>Cara trasera</span>
                                <BotonArchivo archivo={tarjetaTrasera} onChange={setTarjetaTrasera} />
                                {editTarget?.tarjeta_propiedad_trasera && !tarjetaTrasera && (
                                    <button type="button" style={S.linkBtn} onClick={() => verArchivo("trasera")}>
                                        <IconFile size={13} /> Ver cara trasera guardada
                                    </button>
                                )}
                            </div>
                        </div>
                        {verError && <span style={S.err}>{verError}</span>}
                    </div>

                    <div style={S.formGroup}>
                        <label style={S.label}>Fecha de matrícula</label>
                        <input type="date" style={S.input} value={fechaMatricula} onChange={(e) => setFechaMatricula(e.target.value)} />
                        {venceMatricula && (
                            <span style={S.hint}>La tarjeta de propiedad vence el {fmtFecha(venceMatricula)} (matrícula + 2 años).</span>
                        )}
                    </div>

                    <div style={S.row2}>
                        <div style={S.formGroup}>
                            <label style={S.label}>Fecha vence SOAT</label>
                            <input type="date" style={S.input} value={fechaVenceSoat} onChange={(e) => setFechaVenceSoat(e.target.value)} />
                        </div>
                        <div style={S.formGroup}>
                            <label style={S.label}>Fecha vence Técnico mecánico</label>
                            <input type="date" style={S.input} value={fechaVenceTecnomecanica} onChange={(e) => setFechaVenceTecnomecanica(e.target.value)} />
                        </div>
                    </div>

                    {error && <span style={S.err}>{error}</span>}
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
export default function VehiculosCrud() {
    const puede = useAcciones();
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debSearch = useDebounce(search, 280);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3200);
    };

    const { data: vehiculos = [], isLoading } = useQuery({
        queryKey: ["vehiculos"],
        queryFn: () => api.get("/vehiculos").then((r) => r.data),
    });
    const { data: tecnicos = [] } = useQuery({
        queryKey: ["vehiculos-tecnicos"],
        queryFn: () => api.get("/vehiculos/tecnicos").then((r) => r.data),
    });

    const filtered = useMemo(() => {
        const q = debSearch.trim().toLowerCase();
        if (!q) return vehiculos;
        return vehiculos.filter((v) =>
            (v.placa ?? "").toLowerCase().includes(q) ||
            (v.cc_propietario ?? "").toLowerCase().includes(q) ||
            (v.tecnico_asignado?.name ?? "").toLowerCase().includes(q));
    }, [vehiculos, debSearch]);

    const invalidate = () => qc.invalidateQueries({ queryKey: ["vehiculos"] });

    const handleCreate = () => { setEditTarget(null); setModalOpen(true); };
    const handleEdit = (v) => { setEditTarget(v); setModalOpen(true); };

    const handleSave = async (fd) => {
        if (editTarget) {
            fd.append("_method", "PUT");
            await api.post(`/vehiculos/${editTarget.id}`, fd);
            invalidate();
            showToast("Vehículo actualizado.");
        } else {
            await api.post("/vehiculos", fd);
            invalidate();
            showToast("Vehículo creado.");
        }
    };

    const handleDelete = async (v) => {
        if (!confirm(`¿Eliminar el vehículo con placa "${v.placa}"?`)) return;
        try {
            await api.delete(`/vehiculos/${v.id}`);
            invalidate();
            showToast("Vehículo eliminado.");
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo eliminar el vehículo.");
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{vehiculos.length}</div>
                    <div className="stat-label">Total vehículos</div>
                </div>
            </div>

            <div style={S.toolbar}>
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}><IconSearch size={15} /></span>
                    <input style={S.searchInput} placeholder="Buscar por placa, CC propietario o técnico…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {puede.crear && <button className="btn-primary" onClick={handleCreate}>+ Nuevo Vehículo</button>}
            </div>

            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
                ) : filtered.length === 0 ? (
                    <div style={S.empty}><IconEmptySearch size={44} /><p>No se encontraron vehículos.</p></div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Placa</th>
                                <th>CC Propietario</th>
                                <th>Vence SOAT</th>
                                <th>Vence Técnico mecánico</th>
                                <th>Técnico asignado</th>
                                <th style={{ textAlign: "center" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((v) => (
                                <tr key={v.id}>
                                    <td><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconTruck size={14} />{v.tipo}</span></td>
                                    <td style={{ fontWeight: 700, fontFamily: "monospace" }}>{v.placa}</td>
                                    <td>{v.cc_propietario || "—"}</td>
                                    <td><FechaBadge iso={v.fecha_vence_soat} /></td>
                                    <td><FechaBadge iso={v.fecha_vence_tecnomecanica} /></td>
                                    <td>{v.tecnico_asignado ? `${v.tecnico_asignado.name}${v.tecnico_asignado.cedula ? ` (${v.tecnico_asignado.cedula})` : ""}` : "—"}</td>
                                    <td>
                                        <div style={S.actions}>
                                            {puede.editar && (
                                                <button style={S.actionBtn("var(--primary-light)", "var(--primary-dark)")} title="Editar" onClick={() => handleEdit(v)}>
                                                    <IconEdit size={14} />
                                                </button>
                                            )}
                                            {puede.eliminar && (
                                                <button style={S.actionBtn("#fce8e8", "#a33")} title="Eliminar" onClick={() => handleDelete(v)}>
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

            <FormModal open={modalOpen} editTarget={editTarget} tecnicos={tecnicos} onClose={() => setModalOpen(false)} onSave={handleSave} />
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

    /* modal */
    overlay: { position: "fixed", inset: 0, background: "rgba(26,58,53,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 5000, padding: "32px 16px", overflowY: "auto" },
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 16px 60px rgba(26,155,140,0.22)", width: "100%", maxWidth: 680, display: "flex", flexDirection: "column" },
    modalHeaderGreen: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", background: "var(--primary)", borderTopLeftRadius: "var(--radius)", borderTopRightRadius: "var(--radius)", flexShrink: 0 },
    modalTitleWhite: { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#fff" },
    closeBtnWhite: { background: "none", border: "1.5px solid rgba(255,255,255,0.6)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" },
    modalBody: { padding: "22px 28px 28px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 12, padding: "16px 28px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },

    /* form */
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
    formGroup: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" },
    input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", color: "var(--text)", background: "var(--white)", outline: "none" },
    linkBtn: { display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, background: "none", border: "none", color: "var(--primary)", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", padding: 0 },
    hint: { fontSize: "0.76rem", color: "var(--text-muted)" },
    err: { color: "#e74c3c", fontSize: "0.75rem", marginTop: 2 },
};
