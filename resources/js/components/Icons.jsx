const props = (size = 16, extra = {}) => ({
  width: size, height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  ...extra,
});

/* ── Íconos de UI ─────────────────────────────────────────────────── */

export const IconSearch = ({ size = 16 }) => (
  <svg {...props(size)}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const IconPlus = ({ size = 16 }) => (
  <svg {...props(size)}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const IconEye = ({ size = 15 }) => (
  <svg {...props(size)}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconEdit = ({ size = 15 }) => (
  <svg {...props(size)}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const IconTrash = ({ size = 15 }) => (
  <svg {...props(size)}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export const IconClose = ({ size = 16 }) => (
  <svg {...props(size)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconFile = ({ size = 15 }) => (
  <svg {...props(size)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

export const IconEmptySearch = ({ size = 40 }) => (
  <svg {...props(size, { strokeWidth: '1.5', opacity: 0.35 })}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const IconGestionar = ({ size = 15 }) => (
  <svg {...props(size)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

export const IconLoading = ({ size = 20 }) => (
  <svg {...props(size)} className="animate-spin">
    <path d="M12 2v4" />
    <path d="M12 18v4" />
    <path d="M4.93 4.93l2.83 2.83" />
    <path d="M16.24 16.24l2.83 2.83" />
    <path d="M2 12h4" />
    <path d="M18 12h4" />
    <path d="M4.93 19.07l2.83-2.83" />
    <path d="M16.24 7.76l2.83-2.83" />
    <style>{`
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .animate-spin { animation: spin 1s linear infinite; transform-origin: center; }
    `}</style>
  </svg>
);

/* ── Ícono "en construcción" (reemplaza 🚧) ───────────────────────── */
export const IconUnderConstruction = ({ size = 56 }) => (
  <svg {...props(size, { strokeWidth: '1.5', opacity: 0.45 })}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IconLayers = ({ size = 24 }) => (
  <svg {...props(size)}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

/* ── Ícono carpeta (reemplaza 📂) ─────────────────────────────────── */
export const IconFolder = ({ size = 22 }) => (
  <svg {...props(size)}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

/* ── Íconos de módulos ────────────────────────────────────────────── */

/** Sedes — edificio/mapa */
export const IconSedes = ({ size = 22 }) => (
  <svg {...props(size)}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

/** Administrativo — maletín */
export const IconAdministrativo = ({ size = 22 }) => (
  <svg {...props(size)}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <line x1="12" y1="12" x2="12" y2="16" />
    <line x1="10" y1="14" x2="14" y2="14" />
  </svg>
);

/** Inventarios — caja/paquete */
export const IconInventarios = ({ size = 22 }) => (
  <svg {...props(size)}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

/** Pedidos y Compras — carrito */
export const IconPedidosCompras = ({ size = 22 }) => (
  <svg {...props(size)}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

/** Ventas — gráfico de tendencia */
export const IconVentas = ({ size = 22 }) => (
  <svg {...props(size)}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

/** CRM — usuarios/relaciones */
export const IconCrm = ({ size = 22 }) => (
  <svg {...props(size)}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

/** Parámetros — ajustes/engranaje */
export const IconParametros = ({ size = 22 }) => (
  <svg {...props(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/** Usuarios — persona + llave */
export const IconUsuarios = ({ size = 22 }) => (
  <svg {...props(size)}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/** Liquidación Comisiones — dólar/moneda */
export const IconLiquidacion = ({ size = 22 }) => (
  <svg {...props(size)}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

/* ── Submodule icons ──────────────────────────────────────────────── */

/** Subagentes */
export const IconSubagentes = ({ size = 18 }) => (
  <svg {...props(size)}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="23" y1="11" x2="17" y2="11" />
    <line x1="20" y1="8" x2="20" y2="14" />
  </svg>
);

/** Control de Caja */
export const IconControlCaja = ({ size = 18 }) => (
  <svg {...props(size)}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

/** Contratos */
export const IconContratos = ({ size = 18 }) => (
  <svg {...props(size)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

/** Requisición */
export const IconRequisicion = ({ size = 18 }) => (
  <svg {...props(size)}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);

/** Work Orders */
export const IconWorkOrders = ({ size = 18 }) => (
  <svg {...props(size)}>
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

/** Solicitud de Días */
export const IconSolicitudDias = ({ size = 18 }) => (
  <svg {...props(size)}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

/** Consignación */
export const IconConsignacion = ({ size = 18 }) => (
  <svg {...props(size)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

/** Liquidación de Pagos */
export const IconLiquidacionPagos = ({ size = 18 }) => (
  <svg {...props(size)}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

/** Productos */
export const IconProductos = ({ size = 18 }) => (
  <svg {...props(size)}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
);

/** Entradas */
export const IconEntradas = ({ size = 18 }) => (
  <svg {...props(size)}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

/** Traslados */
export const IconTraslados = ({ size = 18 }) => (
  <svg {...props(size)}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

/** Salidas */
export const IconSalidas = ({ size = 18 }) => (
  <svg {...props(size)}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/** Consultas */
export const IconConsultas = ({ size = 18 }) => (
  <svg {...props(size)}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="11" />
    <line x1="11" y1="14" x2="11.01" y2="14" />
  </svg>
);

/** Pedidos */
export const IconPedidos = ({ size = 18 }) => (
  <svg {...props(size)}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

/** Pedidos Internos */
export const IconPedidosInternos = ({ size = 18 }) => (
  <svg {...props(size)}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

/** Compras */
export const IconCompras = ({ size = 18 }) => (
  <svg {...props(size)}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="12" y1="10" x2="12" y2="16" />
    <line x1="9" y1="13" x2="15" y2="13" />
  </svg>
);

/** Importación de Archivos */
export const IconImportacion = ({ size = 18 }) => (
  <svg {...props(size)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

/** Administración de Ventas */
export const IconAdminVentas = ({ size = 18 }) => (
  <svg {...props(size)}>
    <path d="M20 12V22H4V12" />
    <path d="M22 7H2v5h20V7z" />
    <path d="M12 22V7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

/** Ventas Contado Kit Prepago */
export const IconKitPrepago = ({ size = 18 }) => (
  <svg {...props(size)}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

/** Cumplimiento Meta */
export const IconMeta = ({ size = 18 }) => (
  <svg {...props(size)}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

/** CRM Parámetros */
export const IconCrmParametros = ({ size = 18 }) => (
  <svg {...props(size)}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

/** CRM Estadísticas */
export const IconCrmEstadisticas = ({ size = 18 }) => (
  <svg {...props(size)}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

/** Comerciales y Técnicos */
export const IconComercialesTecnicos = ({ size = 18 }) => (
  <svg {...props(size)}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

/** Serviexpress */
export const IconServiexpress = ({ size = 18 }) => (
  <svg {...props(size)}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

/** Vehículos */
export const IconVehiculos = ({ size = 18 }) => (
  <svg {...props(size)}>
    <rect x="1" y="10" width="22" height="8" rx="2" />
    <path d="M7 10l2-6h6l2 6" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </svg>
);

/** Configuración / Generales */
export const IconConfig = ({ size = 18 }) => (
  <svg {...props(size)}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconChevronDown = ({ size = 16 }) => (
  <svg {...props(size)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const IconChevronRight = ({ size = 16 }) => (
  <svg {...props(size)}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const IconDownload = ({ size = 16 }) => (
  <svg {...props(size)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const IconInfo = ({ size = 16 }) => (
  <svg {...props(size)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const IconCheckCircle = ({ size = 16 }) => (
  <svg {...props(size)}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const IconXCircle = ({ size = 16 }) => (
  <svg {...props(size)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export const IconMinusCircle = ({ size = 16 }) => (
  <svg {...props(size)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

export const IconLock = ({ size = 16 }) => (
  <svg {...props(size)}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const IconCalendar = ({ size = 16 }) => (
  <svg {...props(size)}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const IconWarning = ({ size = 16 }) => (
  <svg {...props(size)}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IconExternalLink = ({ size = 16 }) => (
  <svg {...props(size)}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export const IconCheck = ({ size = 16 }) => (
  <svg {...props(size)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* ── Mapa de id → componente (usado en erpModules.js) ─────────────── */
export const MODULE_ICONS = {
  sedes:                   IconSedes,
  administrativo:          IconAdministrativo,
  inventarios:             IconInventarios,
  pedidos_compras:         IconPedidosCompras,
  ventas:                  IconVentas,
  crm:                     IconCrm,
  parametros:              IconParametros,
  usuarios:                IconUsuarios,
  liquidacion_comisiones:  IconLiquidacion,

  /* submodules */
  subagentes:              IconSubagentes,
  control_caja:            IconControlCaja,
  admin_contratos:         IconContratos,
  requisicion_personal:    IconRequisicion,
  work_orders:             IconWorkOrders,
  solicitud_dias:          IconSolicitudDias,
  consignacion_wo:         IconConsignacion,
  liquidacion_pagos:       IconLiquidacionPagos,
  productos:               IconProductos,
  entradas:                IconEntradas,
  traslados:               IconTraslados,
  salidas:                 IconSalidas,
  consultas:               IconConsultas,
  pedidos:                 IconPedidos,
  pedidos_internos:        IconPedidosInternos,
  pedidos_serviexpress:    IconServiexpress,
  compras:                 IconCompras,
  importacion_archivos:    IconImportacion,
  administracion_ventas:   IconAdminVentas,
  ventas_contado_kit_prepago: IconKitPrepago,
  consultar_cumplimiento_meta: IconMeta,
  crm_parametros:          IconCrmParametros,
  crm_estadisticas:        IconCrmEstadisticas,
  comerciales_tecnicos:    IconComercialesTecnicos,
  config:                  IconConfig,
  vehiculos:               IconVehiculos,
};
