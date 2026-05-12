import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { ERP_MODULES } from "../data/erpModules";
import { MODULE_ICONS, IconFolder, IconUnderConstruction } from "../components/Icons";

// ── Importa aquí los CRUD de cada módulo ─────────────────────────────────
import EmpleadosCrud from "./EmpleadosCrud";
// import VehiculosCrud           from './VehiculosCrud';          // Administrativo
import SedesCrud               from './SedesCrud';              // Sedes
// import RelacionCrud            from './RelacionCrud';           // Sedes
// import RegionalesCrud          from './RegionalesCrud';         // Sedes
// import ConsultarContratosCrud  from './ConsultarContratosCrud'; // Sedes
// import ImportarNumeracionCrud  from './ImportarNumeracionCrud'; // Sedes
// import AdminContratosCrud      from './AdminContratosCrud';     // Sedes
// import UsuariosSistemaCrud     from './UsuariosSistemaCrud';    // Usuarios
// import GruposUsuariosCrud      from './GruposUsuariosCrud';     // Usuarios
// import CambiarContrasenaCrud   from './CambiarContrasenaCrud';  // Usuarios

/**
 * resolveCrud(moduleId, archivoId)
 * Retorna el componente CRUD para archivos directos de un módulo, o null.
 */
function resolveCrud(moduleId, archivoId) {
    switch (moduleId) {
        /* ── ADMINISTRATIVO ─────────────────────────────────────── */
        case "administrativo":
            switch (archivoId) {
                case "empleados":
                    return EmpleadosCrud;
                // case 'vehiculos':  return VehiculosCrud;
                default:
                    return null;
            }

        /* ── SEDES ──────────────────────────────────────────────── */
        case "sedes":
            switch (archivoId) {
                case 'sedes_file':                return SedesCrud;
                // case 'relacion':                  return RelacionCrud;
                // case 'regionales':                return RegionalesCrud;
                // case 'consultar_contratos':       return ConsultarContratosCrud;
                // case 'importar_numeracion':       return ImportarNumeracionCrud;
                // case 'admin_contratos_vendedores': return AdminContratosCrud;
                default:
                    return null;
            }

        /* ── INVENTARIOS ────────────────────────────────────────── */
        case "inventarios":
            switch (archivoId) {
                // case 'productos_file':         return ProductosCrud;
                // case 'productos_serializados': return ProductosSerializadosCrud;
                // case 'tipo_producto':          return TipoProductoCrud;
                default:
                    return null;
            }

        /* ── PEDIDOS Y COMPRAS ──────────────────────────────────── */
        case "pedidos_compras":
            switch (archivoId) {
                // case 'ver_crear_pedidos': return PedidosCrud;
                // case 'ver_crear_orden':   return OrdenCompraCrud;
                default:
                    return null;
            }

        /* ── VENTAS ─────────────────────────────────────────────── */
        case "ventas":
            switch (archivoId) {
                // (Ventas no tiene archivos directos en el módulo raíz,
                //  todos están dentro de sus submódulos)
                default:
                    return null;
            }

        /* ── CRM ────────────────────────────────────────────────── */
        case "crm":
            switch (archivoId) {
                default:
                    return null;
            }

        /* ── LIQUIDACIÓN COMISIONES ─────────────────────────────── */
        case "liquidacion_comisiones":
            switch (archivoId) {
                default:
                    return null;
            }

        /* ── PARÁMETROS ─────────────────────────────────────────── */
        case "parametros":
            switch (archivoId) {
                // case 'tipo_productos': return TipoProductosCrud;
                default:
                    return null;
            }

        /* ── USUARIOS ───────────────────────────────────────────── */
        case "usuarios":
            switch (archivoId) {
                // case 'usuarios_sistema':   return UsuariosSistemaCrud;
                // case 'grupos_usuarios':    return GruposUsuariosCrud;
                // case 'cambiar_contrasena': return CambiarContrasenaCrud;
                default:
                    return null;
            }

        default:
            return null;
    }
}

/* ═══════════════════════════════════════════════════════════════════ */

export default function Module() {
    const { moduleId } = useParams();
    const mod = ERP_MODULES.find((m) => m.id === moduleId);

    /* ── Estado: pestaña activa (null = vista de submódulos) ── */
    const tieneArchivos = (mod?.archivos?.length ?? 0) > 0;
    const [tabActiva, setTabActiva] = useState(() =>
        tieneArchivos ? (mod?.archivos?.[0]?.id ?? null) : null,
    );

    /* ── Auto-selección: cuando cambia de módulo, abrir el 1er archivo ── */
    useEffect(() => {
        const currentMod = ERP_MODULES.find((m) => m.id === moduleId);
        const primerArchivo = currentMod?.archivos?.[0]?.id ?? null;
        setTabActiva(primerArchivo);
    }, [moduleId]);


    if (!mod) {
        return (
            <Layout>
                <p
                    style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#e74c3c",
                    }}
                >
                    Módulo no encontrado.
                </p>
            </Layout>
        );
    }

    const archivosDirectos = mod.archivos ?? [];
    const archivoActual = archivosDirectos.find((a) => a.id === tabActiva);
    const CrudComponent = tabActiva ? resolveCrud(moduleId, tabActiva) : null;

    return (
        <Layout>
            <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>
                {/* ── Breadcrumb ─────────────────────────────────────── */}
                <div className="breadcrumb" id="breadcrumb">
                    <Link to="/dashboard">Inicio</Link>
                    <span className="sep">›</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {React.createElement(MODULE_ICONS[mod.icon] ?? IconFolder, { size: 14 })}
                        {mod.label}
                    </span>
                    {tabActiva && archivoActual && (
                        <>
                            <span className="sep">›</span>
                            <span>{archivoActual.label}</span>
                        </>
                    )}
                </div>

                {/* ── Encabezado ─────────────────────────────────────── */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                        marginBottom: 0,
                    }}
                >
                    <div>
                        <p
                            className="page-title"
                            style={{ textAlign: "left", marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}
                        >
                            <span style={{ color: 'var(--primary)' }}>{React.createElement(MODULE_ICONS[mod.icon] ?? IconFolder, { size: 22 })}</span>
                            {mod.label}
                        </p>
                        <p
                            style={{
                                color: "var(--text-muted)",
                                fontSize: "0.9rem",
                                marginBottom: 0,
                            }}
                        >
                            {mod.desc}
                        </p>
                    </div>
                    <Link
                        to="/dashboard"
                        style={{
                            background: "var(--bg)",
                            border: "1.5px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            padding: "8px 16px",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: "var(--text)",
                            fontFamily: "Nunito, sans-serif",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        ← Volver atras
                    </Link>
                </div>

                {/* ══════════════════════════════════════════════════════
            SECCIÓN 1 — Archivos directos con BARRA DE PESTAÑAS
        ══════════════════════════════════════════════════════ */}
                {archivosDirectos.length > 0 && (
                    <div style={{ marginTop: 28 }}>
                        {mod.submods?.length > 0 && (
                            <p className="section-title">Archivos del módulo</p>
                        )}

                        {/* ── Tab bar ── */}
                        <div className="tab-bar" style={S.tabBar}>
                            {archivosDirectos.map((archivo) => {
                                const activa = archivo.id === tabActiva;
                                const hasCrud = !!resolveCrud(
                                    moduleId,
                                    archivo.id,
                                );
                                return (
                                    <button
                                        key={archivo.id}
                                        style={{
                                            ...S.tab,
                                            ...(activa ? S.tabActive : {}),
                                        }}
                                        onClick={() => setTabActiva(archivo.id)}
                                    >
                                        {archivo.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* ── Contenido de la pestaña activa ── */}
                        <div style={S.tabContent}>
                            {CrudComponent ? (
                                <>
                                    <div style={{ marginBottom: 24 }}>
                                        <h2
                                            style={{
                                                fontFamily:
                                                    "'Poppins', sans-serif",
                                                fontSize: "1.2rem",
                                                fontWeight: 700,
                                                color: "var(--primary)",
                                                marginBottom: 4,
                                            }}
                                        >
                                            {archivoActual?.label}
                                        </h2>
                                        <p
                                            style={{
                                                color: "var(--text-muted)",
                                                fontSize: "0.88rem",
                                            }}
                                        >
                                            {mod.label} · Gestión completa de{" "}
                                            {archivoActual?.label?.toLowerCase()}
                                        </p>
                                    </div>
                                    <CrudComponent />
                                </>
                            ) : (
                                <div style={S.placeholder}>
                                    <div style={S.placeholderIcon}><IconUnderConstruction size={56} /></div>
                                    <h3
                                        style={{
                                            fontFamily: "'Poppins', sans-serif",
                                            color: "var(--primary)",
                                            marginBottom: 8,
                                        }}
                                    >
                                        {archivoActual?.label}
                                    </h3>
                                    <p
                                        style={{
                                            color: "var(--text-muted)",
                                            maxWidth: 420,
                                            lineHeight: 1.7,
                                            marginBottom: 20,
                                        }}
                                    >
                                        Esta sección está en construcción.
                                        Pronto podrás gestionar{" "}
                                        <strong>
                                            {archivoActual?.label?.toLowerCase()}
                                        </strong>{" "}
                                        desde aquí.
                                    </p>
                                    <span style={S.placeholderBadge}>
                                        Próximamente
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════
            SECCIÓN 2 — Submódulos como tarjetas (si los hay y NO hay archivos directos)
        ══════════════════════════════════════════════════════ */}
                {mod.submods && mod.submods.length > 0 && !tieneArchivos && (
                    <div style={{ marginTop: 36 }}>
                        <p className="section-title">Submódulos</p>
                        <div className="mod-subgrid" id="submod-grid">
                            {mod.submods.map((sub) => (
                                <Link
                                    key={sub.id}
                                    className="submod-card"
                                    to={`/module/${mod.id}/submodule/${sub.id}`}
                                >
                                    <span className="sc-icon">
                                        {React.createElement(MODULE_ICONS[sub.icon] ?? IconFolder, { size: 22 })}
                                    </span>
                                    <span className="sc-label">
                                        {sub.label}
                                    </span>
                                    <span className="sc-desc">{sub.desc}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

/* ── Estilos compartidos ─────────────────────────────────────────── */
const S = {
    tabBar: {
        display: "flex",
        alignItems: "center",
        gap: 0,
        borderBottom: "2px solid var(--border)",
        flexWrap: "nowrap",
        overflowX: "auto",
        paddingBottom: "2px",
    },
    tab: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "11px 22px",
        background: "none",
        border: "none",
        borderBottom: "2.5px solid transparent",
        marginBottom: "-2px",
        cursor: "pointer",
        fontSize: "0.88rem",
        fontWeight: 600,
        fontFamily: "Nunito, sans-serif",
        color: "var(--text-muted)",
        whiteSpace: "nowrap",
        transition: "all 0.18s",
    },
    tabActive: {
        color: "#fff",
        background: "var(--primary)",
        borderBottomColor: "var(--primary)",
        borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
        boxShadow: "0 -2px 10px rgba(26, 155, 140, 0.2)",
    },
    tabBadge: {
        borderRadius: 10,
        fontSize: "0.65rem",
        fontWeight: 800,
        padding: "2px 7px",
        letterSpacing: "0.04em",
        transition: "all 0.18s",
    },
    tabContent: {
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderTop: "none",
        borderRadius: "0 0 var(--radius) var(--radius)",
        padding: "36px 40px",
        boxShadow: "var(--shadow)",
        minHeight: 300,
    },
    placeholder: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        textAlign: "center",
    },
    placeholderIcon: {
        fontSize: "3.5rem",
        marginBottom: 16,
    },
    placeholderBadge: {
        background: "var(--primary-light)",
        color: "var(--primary-dark)",
        borderRadius: 20,
        padding: "5px 18px",
        fontSize: "0.82rem",
        fontWeight: 800,
        letterSpacing: "0.04em",
    },
};
