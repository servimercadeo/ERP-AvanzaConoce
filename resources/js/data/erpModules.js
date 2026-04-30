export const ERP_MODULES = [
  {
    id: 'sedes',
    label: 'Sedes',
    icon: '',
    color: '#1a9b8c',
    desc: 'Gestión de sedes.',
    submods: [],
    archivos: [
      { id: 'sedes_file', label: 'Sedes' },
      { id: 'relacion', label: 'Relación Almacenista - Secretaria Sedes' }
    ]
  },
  {
    id: 'administrativo',
    label: 'Administrativo',
    icon: '',
    color: '#f5a623',
    desc: 'Gestión administrativa.',
    submods: [],
    archivos: [
      { id: 'empleados', label: 'Empleados' },
      { id: 'vehiculos', label: 'Vehículos' }
    ]
  },
  {
    id: 'inventarios',
    label: 'Inventarios',
    icon: '',
    color: '#27ae60',
    desc: 'Control de inventario y stock.',
    submods: [
      {
        id: 'productos', label: 'Productos', icon: '', desc: 'Gestión de productos',
        archivos: [
          { id: 'productos_file', label: 'Productos' },
          { id: 'productos_serializados', label: 'Productos Serializados' },
          { id: 'tipo_producto', label: 'Tipo de Producto Serializado' }
        ]
      }
    ],
    archivos: []
  },
  {
    id: 'pedidos_compras',
    label: 'Pedidos y Compras',
    icon: '',
    color: '#e74c3c',
    desc: 'Gestión de proveedores y órdenes de compra.',
    submods: [
      {
        id: 'pedidos', label: 'Pedidos', icon: '', desc: 'Gestión de pedidos',
        archivos: [
          { id: 'ver_crear_pedidos', label: 'Ver y Crear Pedidos' }
        ]
      },
      {
        id: 'compras', label: 'Compras', icon: '', desc: 'Gestión de compras',
        archivos: [
          { id: 'ver_crear_orden', label: 'Ver y Crear Orden de Compra' }
        ]
      },
      {
        id: 'parametros', label: 'Parametros', icon: '', desc: 'Parámetros de pedidos y compras',
        archivos: [
          { id: 'clases_pedidos', label: 'Clases de Pedidos' },
          { id: 'conceptos_pedidos', label: 'Conceptos de Pedidos' },
          { id: 'responsables', label: 'Responsables de Aprobación General de Pedidos' }
        ]
      }
    ],
    archivos: []
  },
  {
    id: 'parametros',
    label: 'Parametros',
    icon: '',
    color: '#8e44ad',
    desc: 'Configuración y parámetros del sistema.',
    submods: [
      {
        id: 'comerciales_tecnicos', label: 'Comerciales y Técnicos', icon: '', desc: 'Parámetros comerciales y técnicos',
        archivos: [
          { id: 'tipo_productos', label: 'Tipo de Productos' }
        ]
      }
    ],
    archivos: []
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: '',
    color: '#2980b9',
    desc: 'Administración de usuarios y roles.',
    submods: [],
    archivos: [
      { id: 'usuarios_sistema', label: 'Usuarios del Sistema' },
      { id: 'grupos_usuarios', label: 'Grupos de Usuarios' },
      { id: 'cambiar_contrasena', label: 'Cambiar Contraseña' }
    ]
  }
];
