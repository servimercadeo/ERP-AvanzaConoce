export const ERP_MODULES = [
  {
    id: 'rrhh',
    label: 'Recursos Humanos',
    icon: '',
    color: '#1a9b8c',
    desc: 'Gestión completa del talento humano, nómina, contratos y bienestar laboral.',
    submods: [
      { id: 'empleados',   label: 'Empleados',      icon: '', desc: 'Gestión de empleados y contratos.' },
      { id: 'nomina',      label: 'Nómina',         icon: '', desc: 'Liquidación y pago de salarios.' },
      { id: 'vacaciones',  label: 'Vacaciones',     icon: '', desc: 'Solicitudes y aprobaciones de vacaciones.' },
    ]
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: '',
    color: '#f5a623',
    desc: 'Control financiero, contabilidad, presupuesto y reportes económicos.',
    submods: [
      { id: 'contabilidad', label: 'Contabilidad',  icon: '', desc: 'Registro de cuentas y movimientos.' },
      { id: 'presupuesto',  label: 'Presupuesto',   icon: '', desc: 'Planificación y control presupuestal.' },
      { id: 'tesoreria',    label: 'Tesorería',     icon: '', desc: 'Flujo de caja y pagos.' },
    ]
  },
  {
    id: 'compras',
    label: 'Compras',
    icon: '',
    color: '#27ae60',
    desc: 'Gestión de proveedores, órdenes de compra y control de inventario.',
    submods: [
      { id: 'proveedores',  label: 'Proveedores',   icon: '', desc: 'Registro y evaluación de proveedores.' },
      { id: 'ordenes',      label: 'Órdenes',       icon: '', desc: 'Órdenes de compra y aprobaciones.' },
      { id: 'inventario',   label: 'Inventario',    icon: '', desc: 'Control de stock y almacén.' },
    ]
  },
  {
    id: 'sst',
    label: 'SST',
    icon: '',
    color: '#e74c3c',
    desc: 'Seguridad y salud en el trabajo, novedades, incidentes y cumplimiento normativo.',
    submods: [
      { id: 'novedades',    label: 'Novedades SST', icon: '', desc: 'Registro de novedades y riesgos.' },
      { id: 'incidencias',  label: 'Incidencias',   icon: '', desc: 'Gestión de accidentes e incidentes.' },
      { id: 'aprobaciones', label: 'Aprobaciones',  icon: '', desc: 'Flujo de aprobación SST.' },
    ]
  },
  {
    id: 'tic',
    label: 'Soporte TIC',
    icon: '',
    color: '#8e44ad',
    desc: 'Mesa de ayuda tecnológica, gestión de activos y soporte a usuarios.',
    submods: [
      { id: 'tickets',    label: 'Tickets',         icon: '', desc: 'Solicitudes y soporte técnico.' },
      { id: 'activos',    label: 'Activos TIC',     icon: '', desc: 'Inventario de equipos y licencias.' },
      { id: 'induccion',  label: 'Inducción',       icon: '', desc: 'Material de formación y onboarding.' },
    ]
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: '',
    color: '#2980b9',
    desc: 'Dashboards, indicadores de gestión y exportación de informes ejecutivos.',
    submods: [
      { id: 'dashboard',  label: 'Dashboard',       icon: '', desc: 'Indicadores clave de gestión.' },
      { id: 'informes',   label: 'Informes',        icon: '', desc: 'Generación y descarga de informes.' },
      { id: 'powerbi',    label: 'Power BI',        icon: '', desc: 'Análisis avanzado con Power BI.' },
    ]
  },
];
