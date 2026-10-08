import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { useErpModules } from "../hooks/useErpModules";
import { MODULE_ICONS, IconFolder, IconLoading, IconChevronDown, IconChevronRight } from "../components/Icons";
import { ROLES, clave, claveDeFila, construirCatalogo, firma, normalizar, pestanasDe } from "../utils/permisosMatriz.js";

export default function PermisosCrud() {
    const qc = useQueryClient();
    const erpModules = useErpModules();
    const catalogo = useMemo(() => construirCatalogo(erpModules), [erpModules]);
    const [rolActivo, setRolActivo] = useState(ROLES[0].value);
    const [toast, setToast] = useState(null);
    const [guardando, setGuardando] = useState(false);
    // Submódulos desplegados ("modulo::submodulo"); todo arranca plegado.
    const [abiertos, setAbiertos] = useState(() => new Set());

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const { data: filasDenegadas, isLoading } = useQuery({
        queryKey: ["permisos"],
        queryFn: () => api.get("/permisos").then((r) => r.data),
    });

    // Set editable en memoria (ver `clave`). Se inicializa desde el servidor una sola vez
    // que llegan los datos.
    const [denegados, setDenegados] = useState(null);
    const denegadosListos = denegados !== null;
    useEffect(() => {
        if (filasDenegadas && !denegadosListos) {
            setDenegados(new Set(filasDenegadas.map(claveDeFila)));
        }
    }, [filasDenegadas, denegadosListos]);

    const hayCambiosSinGuardar = useMemo(() => {
        if (!denegadosListos || !filasDenegadas) return false;
        const original = normalizar(new Set(filasDenegadas.map(claveDeFila)), catalogo);
        return firma(original) !== firma(normalizar(denegados, catalogo));
    }, [denegados, denegadosListos, filasDenegadas, catalogo]);

    const subOculto = (moduloId, obj) => denegados.has(clave(rolActivo, moduloId, obj.id));
    const pestanaVisible = (moduloId, obj, archivoId) =>
        !subOculto(moduloId, obj) && !denegados.has(clave(rolActivo, moduloId, obj.id, archivoId));

    // Pestañas visibles / total de un submódulo (uno sin pestañas desplegables cuenta como 1).
    const conteo = (moduloId, obj) => {
        const pestanas = pestanasDe(obj);
        if (pestanas.length === 0) return { visibles: subOculto(moduloId, obj) ? 0 : 1, total: 1 };
        return { visibles: pestanas.filter((a) => pestanaVisible(moduloId, obj, a.id)).length, total: pestanas.length };
    };

    // Marca o desmarca un submódulo completo (con todas sus pestañas).
    const fijarSubmodulo = (next, moduloId, obj, visible) => {
        obj.archivos.forEach((a) => next.delete(clave(rolActivo, moduloId, obj.id, a.id)));
        if (visible) next.delete(clave(rolActivo, moduloId, obj.id));
        else next.add(clave(rolActivo, moduloId, obj.id));
    };

    const toggleSubmodulo = (moduloId, obj, visible) => {
        setDenegados((prev) => {
            const next = new Set(prev);
            fijarSubmodulo(next, moduloId, obj, visible);
            return next;
        });
    };

    const togglePestana = (moduloId, obj, archivoId) => {
        setDenegados((prev) => {
            const next = new Set(prev);
            const kSub = clave(rolActivo, moduloId, obj.id);
            // Si estaba oculto todo el submódulo, se pasa a "todas las pestañas ocultas"
            // para poder mostrar solo la que se marcó.
            if (next.has(kSub)) {
                next.delete(kSub);
                pestanasDe(obj).forEach((a) => next.add(clave(rolActivo, moduloId, obj.id, a.id)));
            }
            const k = clave(rolActivo, moduloId, obj.id, archivoId);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    };

    const toggleModulo = (mod, marcarVisible) => {
        setDenegados((prev) => {
            const next = new Set(prev);
            mod.objetivos.forEach((obj) => fijarSubmodulo(next, mod.id, obj, marcarVisible));
            return next;
        });
    };

    const desplegables = useMemo(
        () => catalogo.flatMap((mod) => mod.objetivos.filter((o) => pestanasDe(o).length > 0).map((o) => `${mod.id}::${o.id}`)),
        [catalogo],
    );
    const todoAbierto = desplegables.length > 0 && desplegables.every((k) => abiertos.has(k));
    const toggleAbierto = (k) => {
        setAbiertos((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    };

    const handleGuardar = async () => {
        setGuardando(true);
        try {
            const { data } = await api.put("/permisos", { denegados: normalizar(denegados, catalogo) });
            qc.setQueryData(["permisos"], data);
            setDenegados(new Set(data.map(claveDeFila)));
            showToast("Permisos guardados.");
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo guardar.");
        } finally {
            setGuardando(false);
        }
    };

    if (isLoading || !denegadosListos) {
        return (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
                <IconLoading size={32} />
            </div>
        );
    }

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: 0, marginBottom: 20, maxWidth: 760 }}>
                Elige un rol y marca qué módulos, submódulos y pestañas puede ver. Usa la flecha ▸ de un submódulo para
                ver y marcar sus pestañas una por una. "Admin" no aparece aquí: siempre tiene acceso completo. Lo que no
                marques queda oculto para ese rol en todo el sistema.
            </p>

            {/* Tabs de rol */}
            <div style={S.tabBar}>
                {ROLES.map((r) => (
                    <button
                        key={r.value}
                        style={{ ...S.tab, ...(rolActivo === r.value ? S.tabActive : {}) }}
                        onClick={() => setRolActivo(r.value)}
                    >
                        {r.label}
                    </button>
                ))}
                <button
                    type="button"
                    style={S.btnExpandir}
                    onClick={() => setAbiertos(todoAbierto ? new Set() : new Set(desplegables))}
                >
                    {todoAbierto ? "Contraer todo" : "Expandir todo"}
                </button>
            </div>

            <div style={S.grid}>
                {catalogo.map((mod) => {
                    const conteos = mod.objetivos.map((o) => conteo(mod.id, o));
                    const visibles = conteos.reduce((t, c) => t + c.visibles, 0);
                    const total = conteos.reduce((t, c) => t + c.total, 0);
                    const todos = visibles === total;
                    const ninguno = visibles === 0;
                    return (
                        <div key={mod.id} style={S.card}>
                            <div style={S.cardHeader}>
                                <label style={S.checkboxRow}>
                                    <input
                                        type="checkbox"
                                        checked={todos}
                                        ref={(el) => { if (el) el.indeterminate = !todos && !ninguno; }}
                                        onChange={(e) => toggleModulo(mod, e.target.checked)}
                                    />
                                    <span style={S.moduleIcon}>
                                        {React.createElement(MODULE_ICONS[mod.icon] ?? IconFolder, { size: 16 })}
                                    </span>
                                    <span style={S.moduleLabel}>{mod.label}</span>
                                </label>
                                <span style={S.countBadge}>{visibles}/{total}</span>
                            </div>
                            <div style={S.subList}>
                                {mod.objetivos.map((obj, idx) => {
                                    const pestanas = pestanasDe(obj);
                                    const kAbierto = `${mod.id}::${obj.id}`;
                                    const abierto = abiertos.has(kAbierto);
                                    const { visibles: v, total: t } = conteos[idx];
                                    const subTodos = v === t;
                                    const subNinguno = v === 0;
                                    return (
                                        <div key={obj.id}>
                                            <div style={S.subRowWrap}>
                                                {pestanas.length > 0 ? (
                                                    <button
                                                        type="button"
                                                        style={S.chevron}
                                                        onClick={() => toggleAbierto(kAbierto)}
                                                        title={abierto ? "Ocultar pestañas" : "Ver pestañas"}
                                                        aria-expanded={abierto}
                                                    >
                                                        {abierto ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                                                    </button>
                                                ) : (
                                                    <span style={S.chevronVacio} />
                                                )}
                                                <label style={{ ...S.subRow, flex: 1, minWidth: 0 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={subTodos}
                                                        ref={(el) => { if (el) el.indeterminate = !subTodos && !subNinguno; }}
                                                        onChange={(e) => toggleSubmodulo(mod.id, obj, e.target.checked)}
                                                    />
                                                    <span>{obj.label}</span>
                                                </label>
                                                {pestanas.length > 0 && (
                                                    <span style={S.countBadge}>{v}/{t}</span>
                                                )}
                                            </div>
                                            {abierto && pestanas.length > 0 && (
                                                <div style={S.pestanaList}>
                                                    {pestanas.map((a) => (
                                                        <label key={a.id} style={S.pestanaRow}>
                                                            <input
                                                                type="checkbox"
                                                                checked={pestanaVisible(mod.id, obj, a.id)}
                                                                onChange={() => togglePestana(mod.id, obj, a.id)}
                                                            />
                                                            <span>{a.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={S.footerBar}>
                <span style={{ fontSize: "0.85rem", color: hayCambiosSinGuardar ? "#b7780c" : "var(--text-muted)", fontWeight: hayCambiosSinGuardar ? 700 : 400 }}>
                    {hayCambiosSinGuardar ? "Tienes cambios sin guardar." : "Sin cambios pendientes."}
                </span>
                <button style={S.btnPrimary} onClick={handleGuardar} disabled={guardando || !hayCambiosSinGuardar}>
                    {guardando ? "Guardando…" : "Guardar cambios"}
                </button>
            </div>
        </div>
    );
}

const S = {
    tabBar: {
        display: "flex",
        alignItems: "center",
        gap: 0,
        borderBottom: "2px solid var(--border)",
        marginBottom: 22,
        flexWrap: "wrap",
    },
    tab: {
        padding: "10px 20px",
        background: "none",
        border: "none",
        borderBottom: "2.5px solid transparent",
        marginBottom: "-2px",
        cursor: "pointer",
        fontSize: "0.88rem",
        fontWeight: 700,
        fontFamily: "Nunito, sans-serif",
        color: "var(--text-muted)",
    },
    tabActive: {
        color: "var(--primary-dark)",
        borderBottom: "2.5px solid var(--primary)",
    },
    btnExpandir: {
        marginLeft: "auto",
        marginBottom: 6,
        padding: "6px 14px",
        background: "var(--bg)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        fontSize: "0.8rem",
        fontWeight: 700,
        fontFamily: "Nunito, sans-serif",
        color: "var(--text)",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        alignItems: "start",
        gap: 16,
        marginBottom: 24,
    },
    card: {
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--white)",
        overflow: "hidden",
    },
    cardHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "12px 14px",
        background: "var(--bg)",
        borderBottom: "1.5px solid var(--border)",
    },
    checkboxRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        minWidth: 0,
    },
    moduleIcon: {
        display: "flex",
        color: "var(--primary)",
        flexShrink: 0,
    },
    moduleLabel: {
        fontWeight: 800,
        fontSize: "0.92rem",
        color: "var(--text)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    countBadge: {
        fontSize: "0.72rem",
        fontWeight: 700,
        color: "var(--text-muted)",
        whiteSpace: "nowrap",
        flexShrink: 0,
    },
    subList: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 14px",
    },
    subRowWrap: {
        display: "flex",
        alignItems: "center",
        gap: 4,
    },
    chevron: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        padding: 0,
        background: "none",
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
        color: "var(--primary)",
        flexShrink: 0,
    },
    chevronVacio: {
        width: 20,
        flexShrink: 0,
    },
    subRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: "0.85rem",
        color: "var(--text)",
        cursor: "pointer",
    },
    pestanaList: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        margin: "6px 0 2px 30px",
        paddingLeft: 12,
        borderLeft: "2px solid var(--border)",
    },
    pestanaRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: "0.8rem",
        color: "var(--text-muted)",
        cursor: "pointer",
    },
    footerBar: {
        position: "sticky",
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "14px 18px",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
    },
    btnPrimary: {
        padding: "10px 22px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontWeight: 700,
        fontSize: "0.9rem",
        cursor: "pointer",
        fontFamily: "Nunito, sans-serif",
    },
    toast: {
        position: "fixed",
        bottom: 28,
        right: 28,
        background: "var(--primary)",
        color: "#fff",
        borderRadius: "var(--radius-sm)",
        padding: "13px 22px",
        fontWeight: 700,
        fontSize: "0.92rem",
        zIndex: 99999,
        boxShadow: "0 8px 28px rgba(26,155,140,0.35)",
    },
};
