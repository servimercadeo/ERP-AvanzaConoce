import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { ERP_MODULES, SUBMODULO_RAIZ } from "../data/erpModules";
import { MODULE_ICONS, IconFolder, IconLoading } from "../components/Icons";

const ROLES = [
    { value: "th", label: "Talento Humano" },
    { value: "tic", label: "TIC / Sistemas" },
];

// Catálogo real de módulos y submódulos (los mismos que arman el menú), con un
// objetivo pseudo-submódulo (SUBMODULO_RAIZ) por cada módulo que tenga archivos
// propios fuera de cualquier submódulo (ej. "Empleados" en Administrativo).
function construirCatalogo() {
    return ERP_MODULES.map((mod) => {
        const objetivos = [
            ...(mod.submods ?? []).map((s) => ({ id: s.id, label: s.label })),
            ...((mod.archivos?.length ?? 0) > 0
                ? [{ id: SUBMODULO_RAIZ, label: "Archivos generales del módulo" }]
                : []),
        ];
        return { id: mod.id, label: mod.label, icon: mod.icon, objetivos };
    }).filter((mod) => mod.objetivos.length > 0);
}

const clave = (rol, moduloId, submoduloId) => `${rol}::${moduloId}::${submoduloId}`;

export default function PermisosCrud() {
    const qc = useQueryClient();
    const catalogo = useMemo(construirCatalogo, []);
    const [rolActivo, setRolActivo] = useState(ROLES[0].value);
    const [toast, setToast] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const { data: filasDenegadas, isLoading } = useQuery({
        queryKey: ["permisos"],
        queryFn: () => api.get("/permisos").then((r) => r.data),
    });

    // Set editable en memoria: "rol::modulo::submodulo" presente = denegado (oculto).
    // Se inicializa desde el servidor una sola vez que llegan los datos.
    const [denegados, setDenegados] = useState(null);
    const denegadosListos = denegados !== null;
    useEffect(() => {
        if (filasDenegadas && !denegadosListos) {
            setDenegados(new Set(filasDenegadas.map((f) => clave(f.rol, f.modulo_id, f.submodulo_id))));
        }
    }, [filasDenegadas, denegadosListos]);

    const hayCambiosSinGuardar = useMemo(() => {
        if (!denegadosListos || !filasDenegadas) return false;
        const original = new Set(filasDenegadas.map((f) => clave(f.rol, f.modulo_id, f.submodulo_id)));
        if (original.size !== denegados.size) return true;
        for (const k of original) if (!denegados.has(k)) return true;
        return false;
    }, [denegados, denegadosListos, filasDenegadas]);

    const estaPermitido = (moduloId, submoduloId) => !denegados.has(clave(rolActivo, moduloId, submoduloId));

    const toggleUno = (moduloId, submoduloId) => {
        setDenegados((prev) => {
            const next = new Set(prev);
            const k = clave(rolActivo, moduloId, submoduloId);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    };

    const toggleModulo = (mod, marcarVisible) => {
        setDenegados((prev) => {
            const next = new Set(prev);
            mod.objetivos.forEach((obj) => {
                const k = clave(rolActivo, mod.id, obj.id);
                if (marcarVisible) next.delete(k);
                else next.add(k);
            });
            return next;
        });
    };

    const handleGuardar = async () => {
        setGuardando(true);
        try {
            const payload = [...denegados].map((k) => {
                const [rol, modulo_id, submodulo_id] = k.split("::");
                return { rol, modulo_id, submodulo_id };
            });
            await api.put("/permisos", { denegados: payload });
            qc.invalidateQueries({ queryKey: ["permisos"] });
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
                Elige un rol y marca qué módulos y submódulos puede ver. "Admin" no aparece aquí: siempre tiene acceso
                completo. Lo que no marques queda oculto para ese rol en todo el sistema.
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
            </div>

            <div style={S.grid}>
                {catalogo.map((mod) => {
                    const totalMarcados = mod.objetivos.filter((o) => estaPermitido(mod.id, o.id)).length;
                    const todos = totalMarcados === mod.objetivos.length;
                    const ninguno = totalMarcados === 0;
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
                                <span style={S.countBadge}>{totalMarcados}/{mod.objetivos.length}</span>
                            </div>
                            <div style={S.subList}>
                                {mod.objetivos.map((obj) => (
                                    <label key={obj.id} style={S.subRow}>
                                        <input
                                            type="checkbox"
                                            checked={estaPermitido(mod.id, obj.id)}
                                            onChange={() => toggleUno(mod.id, obj.id)}
                                        />
                                        <span>{obj.label}</span>
                                    </label>
                                ))}
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
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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
    subRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: "0.85rem",
        color: "var(--text)",
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
