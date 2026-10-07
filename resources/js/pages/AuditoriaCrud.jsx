import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import { IconEmptySearch, IconLoading } from "../components/Icons";
import SelectBuscable from "../components/SelectBuscable";

/**
 * Auditoría del Sistema (Permisos > Auditoría, solo admin): rastro de creaciones,
 * ediciones y eliminaciones en todo el ERP. Las filas las escribe sola la aplicación
 * (trait RegistraAuditoria en los modelos clave) — esta pantalla es de solo lectura.
 */
const ACCIONES = [
    { value: "creado", label: "Creó" },
    { value: "actualizado", label: "Actualizó" },
    { value: "eliminado", label: "Eliminó" },
];

export default function AuditoriaCrud() {
    const [userId, setUserId] = useState("");
    const [accion, setAccion] = useState("");
    const [proceso, setProceso] = useState("");
    const [consecutivo, setConsecutivo] = useState("");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [porPagina, setPorPagina] = useState(10);
    const [pagina, setPagina] = useState(1);
    const [filtrosAplicados, setFiltrosAplicados] = useState({});
    const [exportando, setExportando] = useState(false);

    const { data: usuarios = [] } = useQuery({
        queryKey: ["usuarios-catalogo"],
        queryFn: () => api.get("/usuarios-catalogo").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });

    const { data: procesos = [] } = useQuery({
        queryKey: ["auditoria-procesos"],
        queryFn: () => api.get("/auditoria/procesos").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });

    const { data: resultado, isLoading } = useQuery({
        queryKey: ["auditoria", filtrosAplicados, porPagina, pagina],
        queryFn: () =>
            api
                .get("/auditoria", { params: { ...filtrosAplicados, por_pagina: porPagina, page: pagina } })
                .then((r) => r.data),
        placeholderData: (prev) => prev,
    });

    const filas = resultado?.data ?? [];
    const total = resultado?.total ?? 0;
    const ultimaPagina = resultado?.last_page ?? 1;

    const aplicarFiltros = () => {
        setFiltrosAplicados({
            user_id: userId || undefined,
            accion: accion || undefined,
            proceso: proceso || undefined,
            consecutivo: consecutivo || undefined,
            fecha_inicio: fechaInicio || undefined,
            fecha_fin: fechaFin || undefined,
        });
        setPagina(1);
    };

    const handleExport = async () => {
        setExportando(true);
        try {
            const XLSX = await import("xlsx");
            const { data } = await api.get("/auditoria", { params: { ...filtrosAplicados, export: 1 } });
            const rows = (data.data ?? []).map((a) => ({
                Empleado: a.usuario,
                Rol: a.rol,
                Fecha: a.created_at,
                Proceso: a.proceso,
                Consecutivo: a.id,
                Acción: ACCIONES.find((x) => x.value === a.accion)?.label ?? a.accion,
                Descripción: a.descripcion,
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            ws["!cols"] = [{ wch: 26 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 50 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Auditoría");
            const fecha = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `Auditoria_Sistema_${fecha}.xlsx`);
        } finally {
            setExportando(false);
        }
    };

    return (
        <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <button className="btn-secondary" onClick={handleExport} disabled={exportando || total === 0}>
                    {exportando ? "Exportando…" : "Exportar"}
                </button>
            </div>

            <div style={S.filtrosCard}>
                <div className="form-grid" style={S.grid4}>
                    <div style={S.formGroup}>
                        <label style={S.label}>Usuario</label>
                        <SelectBuscable style={S.input} value={userId} onChange={(e) => setUserId(e.target.value)}>
                            <option value="">Elige</option>
                            {usuarios.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </SelectBuscable>
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.label}>Acción realizada</label>
                        <SelectBuscable style={S.input} value={accion} onChange={(e) => setAccion(e.target.value)}>
                            <option value="">Elige</option>
                            {ACCIONES.map((a) => (
                                <option key={a.value} value={a.value}>{a.label}</option>
                            ))}
                        </SelectBuscable>
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.label}>Consecutivo</label>
                        <input style={S.input} value={consecutivo} onChange={(e) => setConsecutivo(e.target.value)} placeholder="N° de registro" />
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.label}>Proceso</label>
                        <SelectBuscable style={S.input} value={proceso} onChange={(e) => setProceso(e.target.value)}>
                            <option value="">Elige</option>
                            {procesos.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </SelectBuscable>
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.label}>Fecha de inicio</label>
                        <input style={S.input} type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                    </div>
                    <div style={S.formGroup}>
                        <label style={S.label}>Fecha fin</label>
                        <input style={S.input} type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                    </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <button className="btn-primary" onClick={aplicarFiltros}>Filtrar</button>
                </div>
            </div>

            <div className="stats-row" style={{ marginTop: 20 }}>
                <div className="stat-card">
                    <div className="stat-num">{total}</div>
                    <div className="stat-label">Resultados</div>
                </div>
            </div>

            <div style={{ ...S.tableWrap, marginTop: 16 }}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
                ) : filas.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p>No hay registros de auditoría con estos filtros.</p>
                    </div>
                ) : (
                    <table className="data-table" style={{ fontSize: "0.85rem" }}>
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Fecha</th>
                                <th>Proceso involucrado</th>
                                <th>Consecutivo</th>
                                <th>Acción</th>
                                <th>Descripción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map((a) => (
                                <tr key={a.id}>
                                    <td style={{ fontWeight: 700 }}>{a.usuario}</td>
                                    <td>{a.created_at}</td>
                                    <td>{a.proceso}</td>
                                    <td style={{ color: "var(--text-muted)" }}>{a.id}</td>
                                    <td>
                                        <span style={S.badge(a.accion)}>
                                            {ACCIONES.find((x) => x.value === a.accion)?.label ?? a.accion}
                                        </span>
                                    </td>
                                    <td style={{ color: "var(--text-muted)" }}>{a.descripcion}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {total > 0 && (
                <div style={S.paginationBar}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={S.label}>Ver #</label>
                        <SelectBuscable
                            style={{ ...S.input, width: 80 }}
                            value={porPagina}
                            onChange={(e) => {
                                setPorPagina(Number(e.target.value));
                                setPagina(1);
                            }}
                        >
                            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                        </SelectBuscable>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button style={S.pageBtn(pagina === 1)} disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>‹</button>
                        <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>Página {pagina} de {ultimaPagina}</span>
                        <button style={S.pageBtn(pagina === ultimaPagina)} disabled={pagina === ultimaPagina} onClick={() => setPagina((p) => p + 1)}>›</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const S = {
    filtrosCard: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: "20px 22px" },
    grid4: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(230px, 100%), 1fr))", gap: 14 },
    formGroup: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" },
    input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", color: "var(--text)", background: "var(--white)", outline: "none" },
    tableWrap: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    empty: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    badge: (accion) => ({
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: "0.74rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        background: accion === "creado" ? "#e3f6ee" : accion === "eliminado" ? "#fce8e8" : "#fff7e0",
        color: accion === "creado" ? "#1a8f5e" : accion === "eliminado" ? "#a33" : "#b7780c",
    }),
    paginationBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", flexWrap: "wrap", gap: 10 },
    pageBtn: (disabled) => ({
        minWidth: 32,
        height: 32,
        padding: "0 8px",
        border: "1.5px solid var(--border)",
        borderRadius: 6,
        background: disabled ? "var(--bg)" : "var(--white)",
        color: disabled ? "var(--text-muted)" : "var(--text)",
        fontWeight: 700,
        fontSize: "0.85rem",
        cursor: disabled ? "default" : "pointer",
    }),
};
