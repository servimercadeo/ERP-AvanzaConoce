export const ERP_MODULES = [
  {
    id: 'sedes',
    label: 'Sedes',
    icon: 'sedes',
    color: '#1a9b8c',
    desc: 'Gestión de sedes, regionales, subagentes y control de caja.',
    submods: [
      {
        id: 'subagentes',
        label: 'Subagentes',
        icon: 'subagentes',
        desc: 'Gestión de subagentes, facturas y clientes',
        archivos: [
          { id: 'subagentes_file',        label: 'Subagentes' },
          { id: 'facturas',               label: 'Facturas' },
          { id: 'clientes_subagentes',    label: 'Clientes Subagentes' },
          { id: 'productos_subagentes',   label: 'Productos Subagentes' },
          { id: 'linea_producto',         label: 'Línea de Producto' },
        ]
      },
      {
        id: 'control_caja',
        label: 'Control de Caja',
        icon: 'control_caja',
        desc: 'Ingresos, egresos y cuadre de caja',
        archivos: [
          { id: 'ingresos_caja',   label: 'Ingresos a Caja' },
          { id: 'egresos_caja',    label: 'Egresos a Caja' },
          { id: 'cuadre_caja',     label: 'Cuadre de Caja' },
          { id: 'conceptos_caja',  label: 'Conceptos de Caja' },
        ]
      }
    ],
    archivos: [
      { id: 'sedes_file',                      label: 'Sedes' },
      { id: 'relacion',                         label: 'Relación Almacenista - Secretaria Sedes' },
      { id: 'regionales',                       label: 'Regionales' },
      { id: 'consultar_contratos',              label: 'Consultar Contratos' },
      { id: 'importar_numeracion',              label: 'Importar Numeración de Contratos' },
      { id: 'admin_contratos_vendedores',       label: 'Administración Contratos de Vendedores' },
    ]
  },
  {
    id: 'administrativo',
    label: 'Administrativo',
    icon: 'administrativo',
    color: '#f5a623',
    desc: 'Gestión administrativa.',
    submods: [
      {
        id: 'seleccion',
        label: 'Selección',
        icon: 'usuarios',
        desc: 'Proceso de selección de personal',
        archivos: [
          { id: 'proceso_seleccion', label: 'Proceso de Selección' },
          { id: 'base_ingreso', label: 'Base de Ingreso' }
        ]
      },
      {
        id: 'admin_contratos',
        label: 'Administración de Contratos',
        icon: 'admin_contratos',
        desc: 'Gestión de contratos',
        archivos: [
          { id: 'ver_crear_contratos', label: 'Ver y Crear Contratos' },
          { id: 'auxilios_contratos', label: 'Auxilios Contratos' },
          { id: 'empleadores', label: 'Empleadores' },
          { id: 'consultar_vacaciones', label: 'Consultar Vacaciones por Tomar' },
          { id: 'importar_contratos_activos', label: 'Importar Contratos Laborales Activos' }
        ]
      },
      {
        id: 'requisicion_personal',
        label: 'Requisición de Personal',
        icon: 'requisicion_personal',
        desc: 'Gestión de requisiciones',
        archivos: [
          { id: 'ver_crear_requisiciones', label: 'Ver y Crear Requisiciones' },
          { id: 'atencion_requisiciones', label: 'Atención de Requisiciones' }
        ]
      },
      {
        id: 'work_orders',
        label: 'Work Orders',
        icon: 'work_orders',
        desc: 'Gestión de work orders',
        archivos: [
          { id: 'consultar_work_orders', label: 'Consultar Work Orders' },
          { id: 'modificar_perimetro_wo', label: 'Modificar Perímetro y Cobro de WO' },
          { id: 'consultar_garantia_ibs', label: 'Consultar Estado de Garantía de IBS' },
          { id: 'registro_material_instalado', label: 'Registro de Material Instalado' },
          { id: 'finalizar_wo_sin_material', label: 'Finalizar Work Order sin Material' },
          { id: 'importar_cierre_masivo', label: 'Importar Cierre y Descargue Masivo' },
          { id: 'importar_wo_programadas', label: 'Importar Work Order Programadas' },
          { id: 'importar_wo_atendidas', label: 'Importar Work Order Atendidas' },
          { id: 'importar_wo_finalizadas', label: 'Importar Work Order Finalizadas' },
          { id: 'importar_wo_canceladas', label: 'Importar Work Order Canceladas' },
          { id: 'importar_wo_pagas_directiv', label: 'Importar Work Order Pagas por Directiv' },
          { id: 'envio_contratos', label: 'Envió de Contratos' },
          { id: 'sol_modificacion_envio_contrato', label: 'Sol. de Modificación Envió Contrato por Aprobar' }
        ]
      },
      {
        id: 'solicitud_dias',
        label: 'Solicitud de Dias',
        icon: 'solicitud_dias',
        desc: 'Gestión de solicitudes',
        archivos: [
          { id: 'ver_crear_solicitudes', label: 'Ver y Crear Solicitudes' },
          { id: 'solicitudes_por_aprobar', label: 'Solicitudes por Aprobar' },
          { id: 'ver_calendario_ausentismos', label: 'Ver Calendario de Ausentismos' }
        ]
      },
      {
        id: 'consignacion_wo',
        label: 'Consignación de Work Orders',
        icon: 'consignacion_wo',
        desc: 'Consignaciones',
        archivos: [
          { id: 'consignacion_work_orders', label: 'Consignación de Work Orders' },
          { id: 'sol_modificacion_consignaciones', label: 'Sol. de Modificación Consignaciones por Aprobar' }
        ]
      },
      {
        id: 'liquidacion_pagos',
        label: 'Liquidación de Pagos',
        icon: 'liquidacion_pagos',
        desc: 'Gestión de pagos',
        archivos: [
          { id: 'servicios_liquidar_tecnicos', label: 'Servicios por Liquidar Técnicos' },
          { id: 'liquidaciones_registradas_tecnicos', label: 'Liquidaciones Registradas Técnicos' }
        ]
      }
    ],
    archivos: [
      { id: 'empleados', label: 'Empleados' },
      { id: 'importar_codigos_directv', label: 'Importar Códigos DirecTv a Empleados' },
      { id: 'importar_empleados', label: 'Importar Empleados' },
      { id: 'vehiculos', label: 'Vehículos' },
      { id: 'entrega_tecnicos', label: 'Entrega Técnicos' },
      { id: 'devolucion_material', label: 'Devolución de Material' },
      { id: 'capacitaciones', label: 'Capacitaciones' }
    ]
  },
  {
    id: 'inventarios',
    label: 'Inventarios',
    icon: 'inventarios',
    color: '#27ae60',
    desc: 'Control de inventario y stock.',
    submods: [
      {
        id: 'productos',
        label: 'Productos',
        icon: 'productos',
        desc: 'Gestión de productos',
        archivos: [
          { id: 'productos_file', label: 'Productos' },
          { id: 'productos_serializados', label: 'Productos Serializados' },
          { id: 'tipo_producto_serializado', label: 'Tipo de Producto Serializado' },
          { id: 'trasladar_serial', label: 'Trasladar Serial' },
          { id: 'importar_codigos_directv_productos', label: 'Importar Códigos DirecTv a Productos' }
        ]
      },
      {
        id: 'entradas',
        label: 'Entradas',
        icon: 'entradas',
        desc: 'Gestión de entradas',
        archivos: [
          { id: 'entradas_inventario', label: 'Entradas de Inventario' },
          { id: 'entradas_por_confirmar', label: 'Entradas por Confirmar' }
        ]
      },
      {
        id: 'traslados',
        label: 'Traslados',
        icon: 'traslados',
        desc: 'Gestión de traslados',
        archivos: [
          { id: 'traslados_inventario', label: 'Traslados de Inventario' },
          { id: 'traslados_insumos', label: 'Traslados de Insumos' },
          { id: 'traslados_por_confirmar', label: 'Traslados por Confirmar' },
          { id: 'traslados_por_aprobar', label: 'Traslados por Aprobar' },
          { id: 'traslados_anulados', label: 'Traslados Anulados' }
        ]
      },
      {
        id: 'salidas',
        label: 'Salidas',
        icon: 'salidas',
        desc: 'Gestión de salidas',
        archivos: [
          { id: 'salidas_inventario', label: 'Salidas de Inventario' }
        ]
      },
      {
        id: 'consultas',
        label: 'Consultas',
        icon: 'consultas',
        desc: 'Gestión de consultas y reportes',
        archivos: [
          { id: 'kardex_sede_producto', label: 'Kardex por Sede - Producto' },
          { id: 'kardex_sede_general', label: 'Kardex por Sede - General' },
          { id: 'kardex_tecnico_productos', label: 'Kardex por Técnico - Productos' },
          { id: 'kardex_tecnico_general', label: 'Kardex por Técnico - General' },
          { id: 'kardex_serializados', label: 'Kardex Serializados' },
          { id: 'inventario_no_serializado_sede', label: 'Inventario No Serializado por Sede' },
          { id: 'inventario_serializado_sede', label: 'Inventario Serializado por Sede' },
          { id: 'inventario_global_no_serializado', label: 'Inventario Global No Serializado' },
          { id: 'inventario_global_serializado', label: 'Inventario Global Serializado' },
          { id: 'disponibilidad_producto', label: 'Disponibilidad de Producto' },
          { id: 'saldos_inventario_general', label: 'Saldos de Inventario - General' }
        ]
      }
    ],
    archivos: []
  },
  {
    id: 'pedidos_compras',
    label: 'Pedidos y Compras',
    icon: 'pedidos_compras',
    color: '#e74c3c',
    desc: 'Gestión de proveedores y órdenes de compra.',
    submods: [
      {
        id: 'pedidos',
        label: 'Pedidos',
        icon: 'pedidos',
        desc: 'Gestión de pedidos',
        archivos: [
          { id: 'ver_crear_pedidos', label: 'Ver y Crear Pedidos' }
        ]
      },
      {
        id: 'pedidos_internos',
        label: 'Pedidos Internos',
        icon: 'pedidos_internos',
        desc: 'Gestión de pedidos internos',
        archivos: [
          { id: 'pedidos_aprobar_lider_proceso', label: 'Pedidos por Aprobar Líder de Proceso' },
          { id: 'pedidos_aprobar_lider_principal', label: 'Pedidos por Aprobar Líder Principal' },
          { id: 'traslado_pedidos', label: 'Traslado de Pedidos' },
          { id: 'entrega_pedidos_solicitantes', label: 'Entrega de Pedidos a Solicitantes' }
        ]
      },
      {
        id: 'pedidos_serviexpress',
        label: 'Pedidos Serviexpress',
        icon: 'pedidos_serviexpress',
        desc: 'Gestión de pedidos serviexpress',
        archivos: [
          { id: 'pedidos_aprobar_lider_serviexpress', label: 'Pedidos por Aprobar Líder' },
          { id: 'traslado_pedido_serviexpress', label: 'Traslado de Pedido' },
          { id: 'entrega_pedidos_solicitante_serviexpress', label: 'Entrega de Pedidos a Solicitante' }
        ]
      },
      {
        id: 'compras',
        label: 'Compras',
        icon: 'compras',
        desc: 'Gestión de compras',
        archivos: [
          { id: 'ver_crear_orden_compra', label: 'Ver y Crear Orden de Compra' },
          { id: 'recibir_orden_compra', label: 'Recibir Orden de Compra' },
          { id: 'cambiar_accion_item_pedido', label: 'Cambiar Acción del Ítem Pedido' }
        ]
      },
      {
        id: 'parametros',
        label: 'Parametros',
        icon: 'parametros',
        desc: 'Parámetros de pedidos y compras',
        archivos: [
          { id: 'clases_pedidos', label: 'Clases de Pedidos' },
          { id: 'conceptos_pedidos', label: 'Conceptos de Pedidos' },
          { id: 'responsables_aprobacion_general_pedidos', label: 'Responsables de Aprobación General de Pedidos' },
          { id: 'proveedores', label: 'Proveedores' },
          { id: 'formas_pago', label: 'Formas de Pago' }
        ]
      }
    ],
    archivos: []
  },
  {
    id: 'ventas',
    label: 'Ventas',
    icon: 'ventas',
    color: '#f39c12',
    desc: 'Gestión de ventas y facturación.',
    submods: [
      {
        id: 'importacion_archivos',
        label: 'Importación de Archivos',
        icon: 'importacion_archivos',
        desc: 'Importación masiva de archivos de ventas',
        archivos: [
          { id: 'importar_ventas',                      label: 'Importar Ventas' },
          { id: 'importar_ventas_masivas',               label: 'Importar Ventas Masivas' },
          { id: 'importar_posibles_ventas_churn',        label: 'Importar Posibles Ventas Churn' },
          { id: 'importar_descuentos_churn_100',         label: 'Importar Descuentos x Churn 100 días' },
          { id: 'importar_otros_descuentos_comercial',   label: 'Importar Otros Descuentos Comercial' },
          { id: 'relacion_pagos_direct_tv',              label: 'Relación Pagos Direct TV' },
          { id: 'contratos_devueltos',                   label: 'Contratos Devueltos' },
          { id: 'relacion_ventas_no_paga_direct_tv',     label: 'Relación Ventas que no Paga Direct TV' },
          { id: 'importar_ventas_anuladas',              label: 'Importar Ventas Anuladas' },
          { id: 'importar_ibs_pagadas_comercial',        label: 'Importar IBS Pagadas Comercial' },
        ]
      },
      {
        id: 'administracion_ventas',
        label: 'Administración de Ventas',
        icon: 'administracion_ventas',
        desc: 'Gestión y administración de ventas',
        archivos: [
          { id: 'admin_ventas',                          label: 'Administración de Ventas' },
          { id: 'consignacion_ventas',                   label: 'Consignación de Ventas' },
          { id: 'sol_mod_consignacion_por_aprobar',      label: 'Sol. de Modificación Consignación por Aprobar' },
          { id: 'envio_contratos_ventas',                label: 'Envió de Contratos' },
          { id: 'sol_mod_envio_contrato_por_aprobar',    label: 'Sol. de Modificación Envió Contrato por Aprobar' },
          { id: 'modificar_ventas',                      label: 'Modificar Ventas' },
          { id: 'sol_mod_por_aprobar',                   label: 'Sol. de Modificación por Aprobar' },
          { id: 'contratos_devueltos_consultas',         label: 'Contratos Devueltos Consultas' },
          { id: 'consulta_posibles_ventas_churn',        label: 'Consulta Posibles Ventas Churn' },
          { id: 'clientes_off',                          label: 'Clientes Off' },
          { id: 'descuentos_churn_100_dias',             label: 'Descuentos x Churn 100 Días' },
          { id: 'otros_descuentos',                      label: 'Otros Descuentos' },
        ]
      },
      {
        id: 'ventas_contado_kit_prepago',
        label: 'Ventas de Contado Kit Prepago',
        icon: 'ventas_contado_kit_prepago',
        desc: 'Ventas de contado y kit prepago',
        archivos: [
          { id: 'clientes_kit_prepago',                  label: 'Clientes' },
          { id: 'ofertas',                               label: 'Ofertas' },
          { id: 'consulta_registro_ventas',              label: 'Consulta y Registro de Ventas' },
          { id: 'anulacion_ventas',                      label: 'Anulación de Ventas' },
          { id: 'devolucion_ventas',                     label: 'Devolución de Ventas' },
          { id: 'reporte_ventas_diario',                 label: 'Reporte de Ventas Diario' },
          { id: 'bodegas_fortuner',                      label: 'Bodegas Fortuner' },
          { id: 'centros_costos_fortuner',               label: 'Centros de Costos Fortuner' },
          { id: 'bancos_consignacion',                   label: 'Bancos de Consignación' },
        ]
      },
      {
        id: 'consultar_cumplimiento_meta',
        label: 'Consultar Cumplimiento Meta',
        icon: 'consultar_cumplimiento_meta',
        desc: 'Consultas de cumplimiento por regional, sede, supervisor y asesor',
        archivos: [
          { id: 'cumplimiento_por_regional',             label: 'Por Regional' },
          { id: 'cumplimiento_por_sede',                 label: 'Por Sede' },
          { id: 'cumplimiento_por_supervisor',           label: 'Por Supervisor' },
          { id: 'cumplimiento_por_asesor',               label: 'Por Asesor' },
        ]
      }
    ],
    archivos: []
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'crm',
    color: '#16a085',
    desc: 'Gestión de relaciones con clientes, seguimiento comercial y estadísticas.',
    submods: [
      {
        id: 'crm_parametros',
        label: 'Parametros',
        icon: 'crm_parametros',
        desc: 'Configuración de parámetros del CRM',
        archivos: [
          { id: 'tipo_llegada',                       label: 'Tipo Llegada' },
          { id: 'productos_gestion',                  label: 'Productos Gestión' },
          { id: 'planes_productos',                   label: 'Planes Productos' },
          { id: 'importar_metas_empleados',           label: 'Importar Metas Empleados' },
          { id: 'tipo_gestion',                       label: 'Tipo Gestión' },
          { id: 'motivo_no_compra',                   label: 'Motivo no Compra' },
          { id: 'estado_cliente_cotizacion',          label: 'Estado Cliente Cotizacion' },
          { id: 'actividades_externas',               label: 'Actividades Externas' },
          { id: 'motivos_cancelacion',                label: 'Motivos de la Cancelacion' },
          { id: 'parametro_dias_sin_gestion',         label: 'Parámetro Días Sin Gestión a Clientes' },
        ]
      },
      {
        id: 'crm_estadisticas',
        label: 'Estadísticas',
        icon: 'crm_estadisticas',
        desc: 'Estadísticas y reportes de gestión CRM',
        archivos: [
          { id: 'nuevos_clientes_referidos',          label: 'Nuevos clientes (Referidos)' },
          { id: 'productos_cotizados',                label: 'Productos Cotizados' },
        ]
      }
    ],
    archivos: [
      { id: 'gestiones_crm',      label: 'Gestiones CRM' },
      { id: 'clientes_crm',       label: 'Clientes' },
      { id: 'gestionar_clientes', label: 'Gestionar Clientes' },
    ]
  },
  {
    id: 'parametros',
    label: 'Parametros',
    icon: 'parametros',
    color: '#8e44ad',
    desc: 'Configuración y parámetros generales, administrativos y técnicos del sistema.',
    submods: [
      {
        id: 'par_generales',
        label: 'Generales',
        icon: 'config',
        desc: 'Parámetros básicos del sistema',
        archivos: [
          { id: 'conceptos_entrada_salida', label: 'Conceptos de Entrada y Salida' },
          { id: 'unidades_medida',          label: 'Unidades de Medida' },
          { id: 'marcas',                   label: 'Marcas' },
          { id: 'bancos',                   label: 'Bancos' },
          { id: 'perimetros',               label: 'Perímetros' },
        ]
      },
      {
        id: 'par_administrativos',
        label: 'Administrativos',
        icon: 'administrativo',
        desc: 'Parámetros de gestión administrativa y RRHH',
        archivos: [
          { id: 'cargos',                   label: 'Cargos' },
          { id: 'tipos_tecnico',            label: 'Tipos de Técnico' },
          { id: 'tipo_vendedor',            label: 'Tipo de Vendedor' },
          { id: 'eps',                      label: 'EPS' },
          { id: 'arl',                      label: 'ARL' },
          { id: 'fondo_pensiones',          label: 'Fondo de Pensiones' },
          { id: 'caja_compensacion',        label: 'Caja de Compensación' },
          { id: 'temas_capacitacion',       label: 'Temas de Capacitación' },
          { id: 'fondo_cesantias',          label: 'Fondo Cesantias' },
          { id: 'tipos_solicitud_dias',     label: 'Tipos Solicitud Dias' },
          { id: 'centros_costos',           label: 'Centros de costos' },
          { id: 'origen_seguimiento',       label: 'Origen de Seguimiento' },
          { id: 'estados_origen_seg',       label: 'Estados Origen Seguimiento' },
        ]
      },
      {
        id: 'par_comerciales_tecnicos',
        label: 'Comerciales y Técnicos',
        icon: 'comerciales_tecnicos',
        desc: 'Parámetros técnicos, comerciales y de liquidación',
        archivos: [
          { id: 'tipo_productos',           label: 'Tipo de Productos' },
          { id: 'planes_venta',             label: 'Planes de Venta' },
          { id: 'liq_pagos_comercial',      label: 'Liquidación de Pagos Comercial' },
          { id: 'liq_pagos_tecnicos',       label: 'Liquidación de Pagos Técnicos' },
          { id: 'liq_pagos_compania',       label: 'Liquidación de Pagos Compañía' },
          { id: 'liq_pagos_subagentes',     label: 'Liquidación de Pagos Subagentes' },
          { id: 'params_dias_garantia',     label: 'Parámetros Días Garantía' },
          { id: 'param_fecha_cierre_log',   label: 'Parámetro Fecha de Cierre Logístico' },
          { id: 'precios_mantenimientos',   label: 'Precios Mantenimientos y Servicios' },
          { id: 'servicios_cobran_wo',      label: 'Servicios que se cobran en Work Order' },
          { id: 'motivos_anulacion_cont',   label: 'Motivos Anulación de Contratos' },
          { id: 'tipos_plan',               label: 'Tipos de Plan' },
          { id: 'subproductos',             label: 'Subproductos' },
          { id: 'importar_subproductos',    label: 'Importar Subproductos' },
          { id: 'importar_max_servicios',   label: 'Importar Productos Máximos por Tipo de Servicios' },
          { id: 'wo_excentas_control',      label: 'Work Orders Excentas de Control de Material' },
        ]
      },
      {
        id: 'par_auxilio_movilidad',
        label: 'Parámetros Auxilio de Movilidad',
        icon: 'vehiculos',
        desc: 'Configuración de auxilios de movilidad y tarifas',
        archivos: [
          { id: 'importar_tarifas_movilidad', label: 'Importar Tarifas Auxilio de Movilidad' },
          { id: 'tecnicos_excentos_pago',     label: 'Técnicos Excentos de Pagos Auxilio de Movilidad' },
          { id: 'importar_servicios_auxilio', label: 'Importar Servicios que Aplican al Auxilio de Movilidad' },
        ]
      }
    ],
    archivos: [
      { id: 'lineas_vehiculos', label: 'Líneas Vehículos' },
      { id: 'transportadoras',  label: 'Transportadoras' },
    ]
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: 'usuarios',
    color: '#2980b9',
    desc: 'Administración de usuarios, roles y auditoría.',
    submods: [],
    archivos: [
      { id: 'usuarios_sistema', label: 'Usuarios del Sistema' },
      { id: 'grupos_usuarios', label: 'Grupos de Usuarios' },
      { id: 'cambiar_contrasena', label: 'Cambiar Contraseña' },
      { id: 'auditoria_usuarios', label: 'Auditoria de Usuarios' },
    ]
  },
  {
    id: 'liquidacion_comisiones',
    label: 'Liquidación Comisiones',
    icon: 'liquidacion_comisiones',
    color: '#d35400',
    desc: 'Cálculo y gestión de comisiones de subagentes.',
    submods: [
      {
        id: 'liq_subagentes',
        label: 'Subagentes',
        icon: 'subagentes',
        desc: 'Liquidación de comisiones para subagentes',
        archivos: [
          { id: 'liq_params_generales',    label: 'Parametros Generales' },
          { id: 'liq_importar_valores',    label: 'Importar Valores Comisiones' },
          { id: 'liq_indicador_satisf',    label: 'Indicador Satisfacciones' },
          { id: 'liq_indicador_optimus',   label: 'Indicador Optimus' },
          { id: 'liq_importar_relacion',   label: 'Importar Relacion Pagos Directv' },
          { id: 'liq_params_perimetros',   label: 'Parametros perímetros IBS' },
          { id: 'liq_generar_liquidacion', label: 'Generar Liquidacion de Comisiones' },
          { id: 'liq_aprobadas',           label: 'Liquidaciones Aprobadas' },
        ]
      }
    ],
    archivos: []
  }
];
