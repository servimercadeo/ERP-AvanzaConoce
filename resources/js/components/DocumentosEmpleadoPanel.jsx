import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import BotonArchivo from "./BotonArchivo";
import { SearchableSelect } from "./SearchableSelect";
import { IconEdit, IconTrash, IconLoading } from "./Icons";

const DOC_EMPLEADO_VACIO = { nombre_documento: "", nombre_seguimiento: "", fecha_seguimiento: "", responsable: "" };

/**
 * Documentos del Empleado (otrosí, certificados, actas…), ligados al empleado y no a un
 * evento médico. Se usa en Seguimiento y en Ver y Crear Contratos.
 */
export default function DocumentosEmpleadoPanel({ empleadoId, readOnly, onPendienteChange }) {
    const qc = useQueryClient();
    const [docForm, setDocForm] = useState(DOC_EMPLEADO_VACIO);
    const [docArchivo, setDocArchivo] = useState(null);
    const [guardandoDoc, setGuardandoDoc] = useState(false);
    const [editandoDocId, setEditandoDocId] = useState(null);
    const [fileKey, setFileKey] = useState(0);

    const { data: usuarios = [] } = useQuery({
        queryKey: ["usuarios-catalogo"],
        queryFn: () => api.get("/usuarios-catalogo").then(r => r.data),
        staleTime: 5 * 60 * 1000,
    });
    const opcionesResponsable = usuarios.map(u => ({ value: u.name, label: u.cargo ? `${u.name} — ${u.cargo}` : u.name }));

    const { data: docsEmpleado = [], isLoading: cargandoDocs } = useQuery({
        queryKey: ["documentos-empleado", empleadoId],
        queryFn: () => api.get("/documentos-empleado", { params: { user_id: empleadoId } }).then(r => r.data),
        enabled: !!empleadoId,
    });

    useEffect(() => {
        setDocForm(DOC_EMPLEADO_VACIO);
        setDocArchivo(null);
        setEditandoDocId(null);
    }, [empleadoId]);

    // "Pendiente" = hay datos o archivo en el formulario que aún no se agregaron.
    const pendiente = !readOnly && (Object.values(docForm).some(v => String(v).trim() !== "") || !!docArchivo);
    useEffect(() => {
        onPendienteChange?.(pendiente);
    }, [pendiente]);
    useEffect(() => () => onPendienteChange?.(false), []);

    if (!empleadoId) {
        return (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                Sin empleado asociado. Elige primero el empleado del contrato.
            </div>
        );
    }

    const docFormValido = docForm.nombre_documento && docForm.nombre_seguimiento && docForm.fecha_seguimiento && docForm.responsable;

    const limpiar = () => {
        setDocForm(DOC_EMPLEADO_VACIO);
        setDocArchivo(null);
        setEditandoDocId(null);
        setFileKey(k => k + 1);
    };

    const handleAgregarDoc = async () => {
        if (!docFormValido || guardandoDoc) return;
        setGuardandoDoc(true);
        try {
            const fd = new FormData();
            fd.append("user_id", empleadoId);
            Object.entries(docForm).forEach(([k, v]) => fd.append(k, v));
            if (docArchivo) fd.append("archivo", docArchivo);
            if (editandoDocId) {
                fd.append("_method", "PUT");
                await api.post(`/documentos-empleado/${editandoDocId}`, fd);
            } else {
                await api.post("/documentos-empleado", fd);
            }
            qc.invalidateQueries({ queryKey: ["documentos-empleado"] });
            limpiar();
        } finally {
            setGuardandoDoc(false);
        }
    };

    const handleEditarDoc = (d) => {
        setDocForm({
            nombre_documento:   d.nombre_documento,
            nombre_seguimiento: d.nombre_seguimiento,
            fecha_seguimiento:  d.fecha_seguimiento,
            responsable:        d.responsable,
        });
        setDocArchivo(null);
        setEditandoDocId(d.id);
        setFileKey(k => k + 1);
    };

    const handleEliminarDoc = async (d) => {
        if (!confirm(`¿Eliminar el documento "${d.nombre_documento}"?`)) return;
        await api.delete(`/documentos-empleado/${d.id}`);
        qc.invalidateQueries({ queryKey: ["documentos-empleado"] });
    };

    const handleDescargarDoc = (d) => window.open(`/api/documentos-empleado/${d.id}/download`, "_blank");

    return (
        <div>
            <div style={S.sectionHeader}>DOCUMENTOS DEL EMPLEADO</div>

            {!readOnly && (
                <div style={{ marginTop: 14, padding: "14px 16px", background: "var(--bg)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div className="form-grid" style={S.grid3}>
                        <div style={S.formGroup}>
                            <label style={S.label}>Nombre del Documento</label>
                            <input style={S.input} value={docForm.nombre_documento} onChange={e => setDocForm(f => ({ ...f, nombre_documento: e.target.value }))} placeholder="Ej: Otrosí, Certificado…" />
                        </div>
                        <div style={S.formGroup}>
                            <label style={S.label}>Nombre del Seguimiento</label>
                            <input style={S.input} value={docForm.nombre_seguimiento} onChange={e => setDocForm(f => ({ ...f, nombre_seguimiento: e.target.value }))} placeholder="Ej: Cambio de cargo, Acta de descargos…" />
                        </div>
                        <div style={S.formGroup}>
                            <label style={S.label}>Fecha del Seguimiento</label>
                            <input type="date" style={S.input} value={docForm.fecha_seguimiento} onChange={e => setDocForm(f => ({ ...f, fecha_seguimiento: e.target.value }))} />
                        </div>
                    </div>
                    <div className="form-grid" style={{ ...S.grid2, marginTop: 12 }}>
                        <div style={S.formGroup}>
                            <label style={S.label}>Responsable</label>
                            <SearchableSelect
                                key={`resp-${editandoDocId ?? "nuevo"}-${fileKey}`}
                                value={docForm.responsable}
                                onChange={v => setDocForm(f => ({ ...f, responsable: v }))}
                                options={opcionesResponsable}
                                defaultValue=""
                            />
                        </div>
                        <div style={S.formGroup}>
                            <label style={S.label}>Archivo{editandoDocId ? " (opcional, remplaza el actual)" : ""}</label>
                            <BotonArchivo key={fileKey} archivo={docArchivo} onChange={setDocArchivo} />
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                        {(editandoDocId || pendiente) && (
                            <button className="btn-secondary" onClick={limpiar}>{editandoDocId ? "Cancelar edición" : "Limpiar"}</button>
                        )}
                        <button
                            className="btn-primary"
                            disabled={guardandoDoc || !docFormValido}
                            onClick={handleAgregarDoc}
                            style={{ opacity: (guardandoDoc || !docFormValido) ? 0.6 : 1 }}
                        >
                            {guardandoDoc ? "Guardando…" : editandoDocId ? "Guardar cambios" : "+ Agregar documento"}
                        </button>
                    </div>
                </div>
            )}

            <div style={{ marginTop: 16 }}>
                {cargandoDocs ? (
                    <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)" }}><IconLoading size={28} /></div>
                ) : docsEmpleado.length === 0 ? (
                    <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>Sin documentos registrados.</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {docsEmpleado.map(d => (
                            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg)", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", flexWrap: "wrap" }}>
                                <div style={{ flex: 1, minWidth: 180 }}>
                                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{d.nombre_documento}</div>
                                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                        {d.nombre_seguimiento} · {d.fecha_seguimiento} · {d.responsable}
                                    </div>
                                </div>
                                {d.nombre_original && (
                                    <button onClick={() => handleDescargarDoc(d)} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>
                                        ⬇ {d.nombre_original}
                                    </button>
                                )}
                                {!readOnly && (
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button title="Editar" onClick={() => handleEditarDoc(d)} style={{ background: "#e8f8f5", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "var(--primary-dark)" }}><IconEdit /></button>
                                        <button title="Eliminar" onClick={() => handleEliminarDoc(d)} style={{ background: "#fce8e8", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#a33" }}><IconTrash /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const S = {
    sectionHeader: { marginTop: 24, marginBottom: 4, padding: "9px 14px", background: "var(--primary)", color: "#fff", borderRadius: "var(--radius-sm)", fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.05em", textAlign: "center" },
    grid3: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 },
    grid2: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 },
    formGroup: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" },
    input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", color: "var(--text)", background: "var(--white)", outline: "none" },
};
