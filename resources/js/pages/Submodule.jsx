import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { ERP_MODULES } from '../data/erpModules';

// ── Importa aquí los CRUD de cada archivo ───────────────────────────────
import EmpleadosCrud from './EmpleadosCrud';
// import SubagentesCrud      from './SubagentesCrud';
// import FacturasCrud        from './FacturasCrud';
// import ClientesSubCrud     from './ClientesSubCrud';
// import ProductosSubCrud    from './ProductosSubCrud';
// import LineaProductoCrud   from './LineaProductoCrud';
// import IngresosCajaCrud    from './IngresosCajaCrud';
// import EgresosCajaCrud     from './EgresosCajaCrud';
// import CuadreCajaCrud      from './CuadreCajaCrud';
// import ConceptosCajaCrud   from './ConceptosCajaCrud';

/**
 * resolveSubCrud(moduleId, submoduleId, archivoId)
 * Retorna el componente CRUD o null.
 * Descomenta / agrega cases a medida que construyas cada CRUD.
 */
function resolveSubCrud(moduleId, submoduleId, archivoId) {
  switch (moduleId) {

    /* ── ADMINISTRATIVO ─────────────────────────────────── */
    case 'administrativo':
      switch (submoduleId) {
        default: return null;
      }

    /* ── SEDES ──────────────────────────────────────────── */
    case 'sedes':
      switch (submoduleId) {

        case 'subagentes':
          switch (archivoId) {
            // case 'subagentes_file':      return SubagentesCrud;
            // case 'facturas':             return FacturasCrud;
            // case 'clientes_subagentes':  return ClientesSubCrud;
            // case 'productos_subagentes': return ProductosSubCrud;
            // case 'linea_producto':       return LineaProductoCrud;
            default: return null;
          }

        case 'control_caja':
          switch (archivoId) {
            // case 'ingresos_caja':  return IngresosCajaCrud;
            // case 'egresos_caja':   return EgresosCajaCrud;
            // case 'cuadre_caja':    return CuadreCajaCrud;
            // case 'conceptos_caja': return ConceptosCajaCrud;
            default: return null;
          }

        default: return null;
      }

    /* ── INVENTARIOS ────────────────────────────────────── */
    case 'inventarios':
      switch (submoduleId) {
        case 'productos':
          switch (archivoId) {
            // case 'productos_file':         return ProductosCrud;
            // case 'productos_serializados': return ProductosSerializadosCrud;
            // case 'tipo_producto':          return TipoProductoCrud;
            default: return null;
          }
        default: return null;
      }

    /* ── PEDIDOS Y COMPRAS ──────────────────────────────── */
    case 'pedidos_compras':
      switch (submoduleId) {
        case 'pedidos':
          switch (archivoId) {
            // case 'ver_crear_pedidos': return PedidosCrud;
            default: return null;
          }
        case 'compras':
          switch (archivoId) {
            // case 'ver_crear_orden': return OrdenCompraCrud;
            default: return null;
          }
        case 'parametros':
          switch (archivoId) {
            // case 'clases_pedidos':    return ClasesPedidosCrud;
            // case 'conceptos_pedidos': return ConceptosPedidosCrud;
            // case 'responsables':      return ResponsablesCrud;
            default: return null;
          }
        default: return null;
      }

    /* ── VENTAS ─────────────────────────────────────────── */
    case 'ventas':
      switch (submoduleId) {
        case 'importacion_archivos':
          switch (archivoId) {
            // case 'importar_ventas':                    return ImportarVentasCrud;
            // case 'importar_ventas_masivas':            return ImportarVentasMasivasCrud;
            // case 'importar_posibles_ventas_churn':     return ImportarChurnCrud;
            // case 'importar_descuentos_churn_100':      return ImportarDescuentosChurnCrud;
            // case 'importar_otros_descuentos_comercial':return ImportarOtrosDescuentosCrud;
            // case 'relacion_pagos_direct_tv':           return RelacionPagosCrud;
            // case 'contratos_devueltos':                return ContratosDevueltosCrud;
            // case 'relacion_ventas_no_paga_direct_tv':  return RelacionVentasNoPagaCrud;
            // case 'importar_ventas_anuladas':           return ImportarVentasAnuladasCrud;
            // case 'importar_ibs_pagadas_comercial':     return ImportarIBSPagadasCrud;
            default: return null;
          }
        case 'administracion_ventas':
          switch (archivoId) {
            // case 'admin_ventas':                      return AdminVentasCrud;
            // case 'consignacion_ventas':               return ConsignacionVentasCrud;
            // case 'sol_mod_consignacion_por_aprobar':  return SolModConsignacionCrud;
            // case 'envio_contratos_ventas':            return EnvioContratosVentasCrud;
            // case 'sol_mod_envio_contrato_por_aprobar':return SolModEnvioContratoCrud;
            // case 'modificar_ventas':                  return ModificarVentasCrud;
            // case 'sol_mod_por_aprobar':               return SolModPorAprobarCrud;
            // case 'contratos_devueltos_consultas':     return ContratosDevueltosConsultasCrud;
            // case 'consulta_posibles_ventas_churn':    return ConsultaChurnCrud;
            // case 'clientes_off':                      return ClientesOffCrud;
            // case 'descuentos_churn_100_dias':         return DescuentosChurnCrud;
            // case 'otros_descuentos':                  return OtrosDescuentosCrud;
            default: return null;
          }
        case 'ventas_contado_kit_prepago':
          switch (archivoId) {
            // case 'clientes_kit_prepago':              return ClientesKitPrepagosCrud;
            // case 'ofertas':                           return OfertasCrud;
            // case 'consulta_registro_ventas':          return ConsultaRegistroVentasCrud;
            // case 'anulacion_ventas':                  return AnulacionVentasCrud;
            // case 'devolucion_ventas':                 return DevolucionVentasCrud;
            // case 'reporte_ventas_diario':             return ReporteVentasDiarioCrud;
            // case 'bodegas_fortuner':                  return BodegasFortunerCrud;
            // case 'centros_costos_fortuner':           return CentrosCostosFortunerCrud;
            // case 'bancos_consignacion':               return BancosConsignacionCrud;
            default: return null;
          }
        case 'consultar_cumplimiento_meta':
          switch (archivoId) {
            // case 'cumplimiento_por_regional':         return CumplimientoRegionalCrud;
            // case 'cumplimiento_por_sede':             return CumplimientoSedeCrud;
            // case 'cumplimiento_por_supervisor':       return CumplimientoSupervisorCrud;
            // case 'cumplimiento_por_asesor':           return CumplimientoAsesorCrud;
            default: return null;
          }
        default: return null;
      }

    /* ── CRM ─────────────────────────────────────────────── */
    case 'crm':
      switch (submoduleId) {
        case 'crm_parametros':
          switch (archivoId) {
            // case 'tipo_llegada':                return TipoLlegadaCrud;
            // case 'productos_gestion':           return ProductosGestionCrud;
            // case 'planes_productos':            return PlanesProductosCrud;
            // case 'importar_metas_empleados':    return ImportarMetasEmpleadosCrud;
            // case 'tipo_gestion':                return TipoGestionCrud;
            // case 'motivo_no_compra':            return MotivoNoCompraCrud;
            // case 'estado_cliente_cotizacion':   return EstadoClienteCotizacionCrud;
            // case 'actividades_externas':        return ActividadesExternasCrud;
            // case 'motivos_cancelacion':         return MotivosCancelacionCrud;
            // case 'parametro_dias_sin_gestion':  return ParametroDiasSinGestionCrud;
            default: return null;
          }
        case 'crm_estadisticas':
          switch (archivoId) {
            // case 'nuevos_clientes_referidos':   return NuevosClientesReferidosCrud;
            // case 'productos_cotizados':         return ProductosCotizadosCrud;
            default: return null;
          }
        default: return null;
      }

    /* ── PARÁMETROS ─────────────────────────────────────── */
    case 'parametros':
      switch (submoduleId) {
        case 'comerciales_tecnicos':
          switch (archivoId) {
            // case 'tipo_productos': return TipoProductosCrud;
            default: return null;
          }
        default: return null;
      }

    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════════ */

export default function Submodule() {
  const { moduleId, submoduleId } = useParams();
  const mod = ERP_MODULES.find(m => m.id === moduleId);
  const sub = mod ? mod.submods.find(s => s.id === submoduleId) : null;

  /* Pestaña activa: por defecto la primera */
  const [tabActiva, setTabActiva] = useState(sub?.archivos?.[0]?.id ?? null);

  if (!mod || !sub) {
    return (
      <Layout>
        <p style={{ padding: '40px', textAlign: 'center', color: '#e74c3c' }}>
          Submódulo no encontrado.
        </p>
      </Layout>
    );
  }

  const archivos       = sub.archivos ?? [];
  const archivoActual  = archivos.find(a => a.id === tabActiva);
  const CrudComponent  = tabActiva ? resolveSubCrud(moduleId, submoduleId, tabActiva) : null;

  return (
    <Layout>
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Breadcrumb ──────────────────────────────────── */}
        <div className="breadcrumb" id="breadcrumb">
          <Link to="/dashboard">Inicio</Link>
          <span className="sep">›</span>
          <Link to={`/module/${mod.id}`}>{mod.icon} {mod.label}</Link>
          <span className="sep">›</span>
          <span>{sub.icon} {sub.label}</span>
        </div>

        {/* ── Encabezado ──────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 0 }}>
          <div>
            <p className="page-title" style={{ textAlign: 'left', marginBottom: 4 }}>
              {sub.icon} {sub.label}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 0 }}>
              {mod.label} · {sub.desc}
            </p>
          </div>
          <Link
            to={`/module/${mod.id}`}
            style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'Nunito, sans-serif', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ← Volver al módulo
          </Link>
        </div>

        {/* ══════════════════════════════════════════════════
            BARRA DE PESTAÑAS
        ══════════════════════════════════════════════════ */}
        {archivos.length > 0 && (
          <div style={S.tabBar}>
            {archivos.map(archivo => {
              const activa   = archivo.id === tabActiva;
              const hasCrud  = !!resolveSubCrud(moduleId, submoduleId, archivo.id);
              return (
                <button
                  key={archivo.id}
                  style={{ ...S.tab, ...(activa ? S.tabActive : {}) }}
                  onClick={() => setTabActiva(archivo.id)}
                >
                  {archivo.label}
                  {hasCrud && (
                    <span style={{ ...S.tabBadge, background: activa ? 'var(--primary)' : '#cce8e4', color: activa ? '#fff' : 'var(--primary-dark)' }}>
                      CRUD
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            CONTENIDO DE LA PESTAÑA ACTIVA
        ══════════════════════════════════════════════════ */}
        <div style={S.tabContent}>
          {CrudComponent ? (
            /* ── CRUD registrado ── */
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
                  {archivoActual?.label}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  {mod.label} › {sub.label} · Gestión completa de {archivoActual?.label?.toLowerCase()}
                </p>
              </div>
              <CrudComponent />
            </>
          ) : (
            /* ── Sin CRUD aún: placeholder ── */
            <div style={S.placeholder}>
              <div style={S.placeholderIcon}>🚧</div>
              <h3 style={{ fontFamily: "'Poppins', sans-serif", color: 'var(--primary)', marginBottom: 8 }}>
                {archivoActual?.label}
              </h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: 420, lineHeight: 1.7, marginBottom: 20 }}>
                Esta sección está en construcción. Pronto podrás gestionar{' '}
                <strong>{archivoActual?.label?.toLowerCase()}</strong> desde aquí.
              </p>
              <span style={S.placeholderBadge}>Próximamente</span>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

/* ── Estilos ──────────────────────────────────────────────── */
const S = {
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    borderBottom: '2px solid var(--border)',
    marginTop: 28,
    flexWrap: 'nowrap',
    overflowX: 'auto',
    scrollbarWidth: 'thin',
    paddingBottom: '2px',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '11px 22px',
    background: 'none',
    border: 'none',
    borderBottom: '2.5px solid transparent',
    marginBottom: '-2px',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontWeight: 600,
    fontFamily: 'Nunito, sans-serif',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    transition: 'all 0.18s',
  },
  tabActive: {
    color: '#fff',
    background: 'var(--primary)',
    borderBottomColor: 'var(--primary)',
    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
    boxShadow: '0 -2px 10px rgba(26, 155, 140, 0.2)',
  },
  tabBadge: {
    borderRadius: 10,
    fontSize: '0.65rem',
    fontWeight: 800,
    padding: '2px 7px',
    letterSpacing: '0.04em',
    transition: 'all 0.18s',
  },
  tabContent: {
    background: 'var(--white)',
    border: '1.5px solid var(--border)',
    borderTop: 'none',
    borderRadius: '0 0 var(--radius) var(--radius)',
    padding: '36px 40px',
    boxShadow: 'var(--shadow)',
    minHeight: 300,
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  placeholderIcon: {
    fontSize: '3.5rem',
    marginBottom: 16,
  },
  placeholderBadge: {
    background: 'var(--primary-light)',
    color: 'var(--primary-dark)',
    borderRadius: 20,
    padding: '5px 18px',
    fontSize: '0.82rem',
    fontWeight: 800,
    letterSpacing: '0.04em',
  },
};
