import { crearDescargaPlantilla, crearParser } from "./excelImport.js";

/*
 * Importación de datos de empleados desde Excel, por cédula.
 *
 * Los títulos de columna coinciden EXACTAMENTE con los de "Exportar Excel"
 * (empleadosExport.js): exportar, llenar las celdas vacías y volver a importar el mismo
 * archivo debe funcionar sin ajustes ni avisos de "columna no reconocida".
 *
 * Quedan fuera a propósito (y por eso el archivo de producción reimportado en local
 * siempre los marcará como "no reconocidos", es intencional, no un bug):
 *   - Cargo: tiene un efecto secundario oculto en el backend (User::booted() deriva
 *     `rol` del cargo al guardarlo) — demasiado riesgoso para una carga masiva sin
 *     supervisión caso por caso.
 *   - Estado Empleado, Email, Ingresos, Empresa: estado operativo / credenciales /
 *     dinero / una relación que requeriría resolver el nombre a un id — cada uno con
 *     su propio flujo dedicado, no un campo de ficha suelto.
 *   - Tipo de Contrato, Estado Contrato, Fecha de Ingreso, Fecha de Retiro, Cliente
 *     Proyecto: viven en Contrato, no en el empleado — eso lo cubre "Importar Excel"
 *     del módulo Contratos (contratosImport.js).
 *   - Cantidad de Contratos, Fecha de Registro: columnas calculadas, no hay nada que
 *     escribir.
 *   - Ciudad: la exporta EmpleadoController@index como repliegue para mostrarla
 *     (respuestas_ingresos / candidatos / base_ingresos), no es una columna real de
 *     `users`.
 */
export const COLUMNAS_IMPORTABLES = [
    { titulo: "Cédula", campo: "cedula", requerido: true },
    { titulo: "Fecha Expedición Documento", campo: "fecha_expedicion", tipo: "fecha" },
    { titulo: "Nombres", campo: "nombres" },
    { titulo: "Apellidos", campo: "apellidos" },
    { titulo: "Género", campo: "genero" },
    { titulo: "Fecha Nacimiento", campo: "fecha_nacimiento", tipo: "fecha" },
    { titulo: "Lugar Nacimiento", campo: "lugar_nacimiento" },
    { titulo: "Raza", campo: "raza" },
    { titulo: "Estado Civil", campo: "estado_civil" },
    { titulo: "Nivel Escolaridad", campo: "nivel_escolaridad" },
    { titulo: "Profesión", campo: "profesion" },
    { titulo: "Número de Hijos", campo: "numero_hijos", tipo: "entero" },
    { titulo: "RH", campo: "rh" },
    { titulo: "Móvil", campo: "movil" },
    { titulo: "Dirección Residencia", campo: "direccion_residencia" },
    { titulo: "Barrio", campo: "barrio" },
    { titulo: "Estrato", campo: "estrato" },
    { titulo: "Tipo Funcionario", campo: "tipo_funcionario" },
    { titulo: "Tipo Vinculación", campo: "tipo_vinculacion" },
    { titulo: "Sede", campo: "sede" },
    { titulo: "Empleador", campo: "empleador" },
    { titulo: "Jefe Inmediato", campo: "jefe_inmediato" },
    { titulo: "Correo del Jefe", campo: "jefe_inmediato_correo" },
    { titulo: "Código Directv", campo: "codigo_directv" },
    { titulo: "EPS", campo: "eps" },
    { titulo: "ARL", campo: "arl" },
    { titulo: "Fondo de Pensiones", campo: "fondo_pensiones" },
    { titulo: "Caja de Compensación", campo: "caja_compensacion" },
    { titulo: "Banco", campo: "banco" },
    { titulo: "Tipo de Cuenta", campo: "tipo_cuenta" },
    { titulo: "No. de Cuenta Bancaria", campo: "cuenta_bancaria" },
    { titulo: "Talla Camisa", campo: "talla_camisa" },
    { titulo: "Talla Pantalón", campo: "talla_pantalon" },
    { titulo: "Talla Zapatos", campo: "talla_zapatos" },
    { titulo: "No. Licencia Carro", campo: "licencia_carro" },
    { titulo: "Vence Licencia Carro", campo: "licencia_carro_vence", tipo: "fecha" },
    { titulo: "No. Licencia Moto", campo: "licencia_moto" },
    { titulo: "Vence Licencia Moto", campo: "licencia_moto_vence", tipo: "fecha" },
    { titulo: "Tiene Cert. Alturas", campo: "tiene_cert_alturas", tipo: "booleano" },
    { titulo: "Vence Cert. Alturas", campo: "cert_alturas_vence", tipo: "fecha" },
    { titulo: "Contacto Emergencia", campo: "contacto_emergencia_nombre" },
    { titulo: "Teléfono Emergencia", campo: "contacto_emergencia_telefono" },
    { titulo: "Parentesco Emergencia", campo: "contacto_emergencia_parentesco" },
    { titulo: "Observaciones Médicas", campo: "observaciones_medicas" },
    { titulo: "Alergias", campo: "alergias" },
    { titulo: "Comentarios", campo: "comentarios" },
];

export const descargarPlantillaImportacion = crearDescargaPlantilla(
    COLUMNAS_IMPORTABLES,
    "Plantilla_Importar_Empleados",
);

export const parsearArchivoImportacion = crearParser(COLUMNAS_IMPORTABLES);
