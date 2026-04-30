export const SUBMODULE_CONTENT = {
  // RRHH
  empleados: {
    stats: [
      { num: '142', label: 'Empleados activos' },
      { num: '8',   label: 'Contratos nuevos' },
      { num: '3',   label: 'En proceso vinculación' },
      { num: '97%', label: 'Cumplimiento documental' },
    ],
    desc: 'Administra el ciclo de vida completo de los empleados: vinculación, contratos, documentos y retiro.',
    features: ['Registro de empleados', 'Gestión de contratos', 'Documentos digitales', 'Historial laboral', 'Estructura organizacional', 'Exportar a Excel'],
    cols: ['ID', 'Nombre', 'Cargo', 'Contrato', 'Fecha ingreso', 'Estado'],
    rows: [
      ['001', 'Ana Gómez', 'Coordinadora', 'Indefinido', '01-03-2022', 'Activo'],
      ['002', 'Luis Martínez', 'Analista', 'Fijo 1 año', '15-08-2023', 'Activo'],
      ['003', 'María Torres', 'Asistente', 'Indefinido', '20-01-2021', 'Licencia'],
    ]
  },
  nomina: {
    stats: [
      { num: '$48M',  label: 'Nómina total mes' },
      { num: '142',   label: 'Empleados liquidados' },
      { num: '0',     label: 'Pendientes liquidar' },
      { num: '28',    label: 'Días procesados' },
    ],
    desc: 'Liquidación automática de nómina, deducciones, seguridad social y generación de comprobantes.',
    features: ['Liquidación automática', 'Deducciones y aportes', 'Comprobantes de pago', 'Integración bancaria', 'Reportes DIAN', 'Historial por empleado'],
    cols: ['Empleado', 'Salario base', 'Deducciones', 'Neto a pagar', 'Estado'],
    rows: [
      ['Ana Gómez', '$2.800.000', '$350.000', '$2.450.000', 'Pagado'],
      ['Luis Martínez', '$2.200.000', '$275.000', '$1.925.000', 'Pagado'],
      ['Carlos Ruiz', '$3.500.000', '$437.000', '$3.063.000', 'Pendiente'],
    ]
  },
  vacaciones: {
    stats: [
      { num: '12', label: 'Solicitudes activas' },
      { num: '5',  label: 'Pendientes aprobar' },
      { num: '7',  label: 'Aprobadas este mes' },
      { num: '0',  label: 'Rechazadas' },
    ],
    desc: 'Gestión de solicitudes de vacaciones, seguimiento de días disponibles y aprobaciones por jefatura.',
    features: ['Solicitud en línea', 'Aprobación por niveles', 'Calendario de ausencias', 'Saldo de días', 'Notificaciones automáticas', 'Historial de vacaciones'],
    cols: ['Empleado', 'Fecha inicio', 'Fecha fin', 'Días', 'Aprobador', 'Estado'],
    rows: [
      ['Ana Gómez', '01-05-2026', '10-05-2026', '10', 'Jefe RRHH', 'Aprobado'],
      ['Pedro Díaz', '15-05-2026', '22-05-2026', '8', 'Jefe RRHH', 'Pendiente'],
    ]
  },
  // FINANZAS
  contabilidad: {
    stats: [
      { num: '$120M', label: 'Ingresos del mes' },
      { num: '$85M',  label: 'Egresos del mes' },
      { num: '$35M',  label: 'Utilidad bruta' },
      { num: '98%',   label: 'Conciliaciones OK' },
    ],
    desc: 'Registro de movimientos contables, cuentas por pagar/cobrar y conciliaciones bancarias.',
    features: ['Plan de cuentas PUC', 'Asientos contables', 'Cuentas por pagar', 'Cuentas por cobrar', 'Conciliación bancaria', 'Estados financieros'],
    cols: ['Fecha', 'Concepto', 'Débito', 'Crédito', 'Cuenta', 'Responsable'],
    rows: [
      ['24-04-2026', 'Pago proveedor', '$5.000.000', '-', '2201', 'C. Ruiz'],
      ['24-04-2026', 'Factura cliente', '-', '$8.500.000', '1305', 'M. Torres'],
      ['23-04-2026', 'Nómina quincenal', '$24.000.000', '-', '5105', 'RRHH'],
    ]
  },
  presupuesto: {
    stats: [
      { num: '85%',   label: 'Ejecución presupuestal' },
      { num: '$200M', label: 'Presupuesto anual' },
      { num: '$170M', label: 'Ejecutado a la fecha' },
      { num: '$30M',  label: 'Disponible' },
    ],
    desc: 'Planificación, asignación y seguimiento del presupuesto por centros de costo y áreas.',
    features: ['Formulación presupuestal', 'Centros de costo', 'Modificaciones CDP', 'Alertas de límite', 'Comparativo plan vs real', 'Exportar reportes'],
    cols: ['Área', 'Presupuesto', 'Ejecutado', 'Disponible', '% Ejecución'],
    rows: [
      ['RRHH', '$60M', '$52M', '$8M', '87%'],
      ['TIC', '$30M', '$22M', '$8M', '73%'],
      ['Operaciones', '$80M', '$71M', '$9M', '89%'],
    ]
  },
  tesoreria: {
    stats: [
      { num: '$45M', label: 'Saldo disponible' },
      { num: '24',   label: 'Pagos este mes' },
      { num: '8',    label: 'Pendientes pago' },
      { num: '3',    label: 'Cuentas bancarias' },
    ],
    desc: 'Control de flujo de caja, programación de pagos, recaudos y gestión de cuentas bancarias.',
    features: ['Flujo de caja', 'Programación de pagos', 'Recaudo de cartera', 'Conciliación bancaria', 'Transferencias', 'Reportes de tesorería'],
    cols: ['Fecha', 'Beneficiario', 'Concepto', 'Monto', 'Banco', 'Estado'],
    rows: [
      ['24-04-2026', 'Proveedor ABC', 'Factura 001', '$5.200.000', 'Bancolombia', 'Pagado'],
      ['25-04-2026', 'Arriendo oficina', 'Abril 2026', '$3.800.000', 'Davivienda', 'Programado'],
    ]
  },
  // COMPRAS
  proveedores: {
    stats: [
      { num: '68',  label: 'Proveedores activos' },
      { num: '5',   label: 'En proceso registro' },
      { num: '12',  label: 'Evaluados este mes' },
      { num: '4.2', label: 'Calificación promedio' },
    ],
    desc: 'Registro, evaluación y gestión de proveedores estratégicos y recurrentes.',
    features: ['Registro de proveedores', 'Evaluación de desempeño', 'Documentos exigidos', 'Categorización', 'Histórico de compras', 'Alertas de vencimiento'],
    cols: ['NIT', 'Razón social', 'Categoría', 'Calificación', 'Última compra', 'Estado'],
    rows: [
      ['900.123.456', 'TechSupplies SAS', 'Tecnología', '4.8', '22-04-2026', 'Activo'],
      ['800.987.321', 'Muebles Express', 'Mobiliario', '4.1', '10-03-2026', 'Activo'],
      ['901.234.567', 'Papelería Sur', 'Papelería', '3.9', '05-04-2026', 'En revisión'],
    ]
  },
  ordenes: {
    stats: [
      { num: '18',  label: 'Órdenes activas' },
      { num: '5',   label: 'Pendientes aprobación' },
      { num: '42',  label: 'Cerradas este mes' },
      { num: '$95M',label: 'Valor total mes' },
    ],
    desc: 'Creación, seguimiento y aprobación de órdenes de compra con flujo multinivel.',
    features: ['Creación de OC', 'Aprobación multinivel', 'Seguimiento entregas', 'Recepción mercancía', 'Causación automática', 'Histórico de órdenes'],
    cols: ['No. OC', 'Proveedor', 'Valor', 'Fecha', 'Aprobador', 'Estado'],
    rows: [
      ['OC-2026-041', 'TechSupplies SAS', '$12.000.000', '20-04-2026', 'Gerencia', 'Aprobada'],
      ['OC-2026-042', 'Muebles Express', '$3.500.000', '22-04-2026', 'Compras', 'Pendiente'],
    ]
  },
  inventario: {
    stats: [
      { num: '1.240', label: 'Ítems en stock' },
      { num: '23',    label: 'Bajo stock mínimo' },
      { num: '8',     label: 'Solicitudes activas' },
      { num: '99%',   label: 'Precisión inventario' },
    ],
    desc: 'Control de existencias, movimientos de almacén y alertas de reabastecimiento.',
    features: ['Control de existencias', 'Entradas y salidas', 'Alertas de stock', 'Kardex digital', 'Código de barras', 'Auditorías de inventario'],
    cols: ['Código', 'Producto', 'Stock actual', 'Stock mínimo', 'Ubicación', 'Estado'],
    rows: [
      ['INV-001', 'Papel A4 Resma', '85', '50', 'Bodega A', 'OK'],
      ['INV-002', 'Cartuchos tinta', '3', '10', 'Bodega B', 'Bajo stock'],
      ['INV-003', 'Sillas ergonómicas', '12', '5', 'Almacén', 'OK'],
    ]
  },
  // SST
  novedades: {
    stats: [
      { num: '7',  label: 'Novedades activas' },
      { num: '3',  label: 'En investigación' },
      { num: '15', label: 'Cerradas este mes' },
      { num: '0',  label: 'Accidentes graves' },
    ],
    desc: 'Registro y seguimiento de novedades de seguridad y salud en el trabajo.',
    features: ['Registro de novedades', 'Clasificación por tipo', 'Asignación responsable', 'Plan de acción', 'Seguimiento cierre', 'Reportes FURAT'],
    cols: ['ID', 'Tipo', 'Empleado', 'Área', 'Fecha', 'Estado'],
    rows: [
      ['NOV-001', 'Condición insegura', 'Bodega', 'Operaciones', '20-04-2026', 'En proceso'],
      ['NOV-002', 'Casi accidente', 'Almacén', 'Logística', '22-04-2026', 'Abierta'],
    ]
  },
  incidencias: {
    stats: [
      { num: '2',   label: 'Incidentes mes' },
      { num: '0',   label: 'Accidentes graves' },
      { num: '14',  label: 'Días sin accidentes' },
      { num: '95%', label: 'Tasa de seguridad' },
    ],
    desc: 'Gestión de incidentes y accidentes de trabajo, investigación y planes de acción correctiva.',
    features: ['Reporte de incidente', 'Investigación de accidente', 'Árbol de causas', 'Plan correctivo', 'Notificación ARL', 'Lecciones aprendidas'],
    cols: ['ID', 'Descripción', 'Lesionado', 'Gravedad', 'Fecha', 'Estado'],
    rows: [
      ['INC-001', 'Caída en escalera', 'J. Pérez', 'Leve', '15-04-2026', 'Cerrado'],
      ['INC-002', 'Golpe en mano', 'M. López', 'Leve', '21-04-2026', 'En investigación'],
    ]
  },
  aprobaciones: {
    stats: [
      { num: '9',  label: 'Pendientes aprobar' },
      { num: '24', label: 'Aprobadas mes' },
      { num: '2',  label: 'Rechazadas' },
      { num: '1d', label: 'Tiempo prom. respuesta' },
    ],
    desc: 'Flujo de aprobaciones SST: EPPs, permisos de trabajo en alto riesgo y certificaciones.',
    features: ['Solicitud de EPP', 'Permisos de trabajo', 'Aprobación multinivel', 'Notificaciones', 'Trazabilidad', 'Reportes de cumplimiento'],
    cols: ['Solicitud', 'Solicitante', 'Tipo', 'Fecha', 'Aprobador', 'Estado'],
    rows: [
      ['APR-041', 'Carlos R.', 'Permiso altura', '22-04-2026', 'Coord. SST', 'Pendiente'],
      ['APR-040', 'Diana M.', 'Dotación EPP', '20-04-2026', 'Coord. SST', 'Aprobado'],
    ]
  },
  // TIC
  tickets: {
    stats: [
      { num: '28',  label: 'Tickets abiertos' },
      { num: '14',  label: 'En atención' },
      { num: '85',  label: 'Resueltos mes' },
      { num: '4.5h',label: 'Tiempo prom. solución' },
    ],
    desc: 'Mesa de ayuda tecnológica para soporte a usuarios, incidentes de TI y requerimientos.',
    features: ['Apertura de tickets', 'Asignación automática', 'SLAs configurables', 'Escalamiento', 'Base de conocimiento', 'Satisfacción del usuario'],
    cols: ['Ticket', 'Usuario', 'Asunto', 'Prioridad', 'Técnico', 'Estado'],
    rows: [
      ['TKT-201', 'Ana Gómez', 'PC no enciende', 'Alta', 'J. Ramírez', 'En atención'],
      ['TKT-202', 'Pedro D.', 'Email no funciona', 'Media', 'L. Castro', 'Resuelto'],
      ['TKT-203', 'Beatriz C.', 'Impresora atascada', 'Baja', 'J. Ramírez', 'Pendiente'],
    ]
  },
  activos: {
    stats: [
      { num: '354', label: 'Activos registrados' },
      { num: '12',  label: 'En mantenimiento' },
      { num: '8',   label: 'Dados de baja' },
      { num: '98%', label: 'Activos operativos' },
    ],
    desc: 'Inventario de equipos, licencias de software y asignación a usuarios por área.',
    features: ['Inventario de equipos', 'Licencias de software', 'Asignación a usuarios', 'Mantenimientos preventivos', 'Garantías y seguros', 'QR/código de barras'],
    cols: ['Placa', 'Tipo', 'Marca/Modelo', 'Asignado a', 'Área', 'Estado'],
    rows: [
      ['PC-001', 'Computador', 'Dell Latitude', 'Ana Gómez', 'RRHH', 'Activo'],
      ['IMP-005', 'Impresora', 'HP LaserJet', 'Área común', 'Administración', 'Mantenimiento'],
      ['MON-012', 'Monitor', 'Samsung 24"', 'Luis Martínez', 'TIC', 'Activo'],
    ]
  },
  induccion: {
    stats: [
      { num: '12', label: 'Módulos de inducción' },
      { num: '8',  label: 'Empleados en proceso' },
      { num: '95%',label: 'Tasa de completitud' },
      { num: '4.7',label: 'Calificación promedio' },
    ],
    desc: 'Material de formación, videos institucionales y proceso de onboarding para nuevos empleados.',
    features: ['Plan de inducción', 'Videos corporativos', 'Evaluaciones en línea', 'Seguimiento de avance', 'Certificados digitales', 'Biblioteca de contenidos'],
    cols: ['Empleado', 'Módulo', 'Avance', 'Fecha inicio', 'Calificación', 'Estado'],
    rows: [
      ['Carlos R.', 'Cultura organizacional', '100%', '15-04-2026', '4.9', 'Completado'],
      ['Diana M.', 'SST básico', '60%', '20-04-2026', '-', 'En proceso'],
    ]
  },
  // REPORTES
  dashboard: {
    stats: [
      { num: '6',    label: 'Módulos monitoreados' },
      { num: '18',   label: 'Indicadores activos' },
      { num: 'Live', label: 'Actualización' },
      { num: '100%', label: 'Cobertura ERP' },
    ],
    desc: 'Panel centralizado de indicadores clave de gestión (KPI) de todos los módulos del ERP.',
    features: ['KPIs en tiempo real', 'Gráficas interactivas', 'Filtros por período', 'Comparativo mensual', 'Alertas de gestión', 'Exportar a PDF'],
    cols: ['Indicador', 'Módulo', 'Meta', 'Actual', 'Tendencia', 'Estado'],
    rows: [
      ['Ejecución presupuestal', 'Finanzas', '90%', '85%', 'En crecimiento', 'En riesgo'],
      ['Tickets resueltos', 'TIC', '95%', '97%', 'En crecimiento', 'Cumplido'],
      ['Accidentes de trabajo', 'SST', '0', '0', 'Estable', 'Cumplido'],
    ]
  },
  informes: {
    stats: [
      { num: '24',  label: 'Informes generados mes' },
      { num: '8',   label: 'Plantillas disponibles' },
      { num: '3',   label: 'Programados' },
      { num: '100%',label: 'Entrega oportuna' },
    ],
    desc: 'Generación, programación y descarga de informes gerenciales y operativos.',
    features: ['Informes por módulo', 'Plantillas personalizadas', 'Programación automática', 'Exportar Excel/PDF', 'Envío por correo', 'Historial de informes'],
    cols: ['Informe', 'Módulo', 'Periodicidad', 'Último generado', 'Formato', 'Acciones'],
    rows: [
      ['Nómina mensual', 'RRHH', 'Mensual', '01-04-2026', 'Excel/PDF', 'Descargar'],
      ['Ejecución presupuestal', 'Finanzas', 'Quincenal', '15-04-2026', 'PDF', 'Descargar'],
      ['Tickets TIC', 'Soporte TIC', 'Semanal', '21-04-2026', 'Excel', 'Descargar'],
    ]
  },
  powerbi: {
    stats: [
      { num: '6',   label: 'Dashboards Power BI' },
      { num: '42',  label: 'Reportes publicados' },
      { num: '18',  label: 'Usuarios con acceso' },
      { num: 'Live',label: 'Sincronización' },
    ],
    desc: 'Análisis avanzado de datos empresariales mediante dashboards interactivos de Power BI.',
    features: ['Dashboards embebidos', 'Filtros dinámicos', 'Análisis predictivo', 'Datos en tiempo real', 'Compartir informes', 'Control de acceso'],
    cols: ['Dashboard', 'Área', 'Vistas mes', 'Última actualización', 'Estado'],
    rows: [
      ['Gestión RRHH', 'Recursos Humanos', '245', '26-04-2026', 'Activo'],
      ['Finanzas ejecutivo', 'Finanzas', '198', '26-04-2026', 'Activo'],
      ['SST indicadores', 'SST', '87', '25-04-2026', 'Activo'],
    ]
  },
};
