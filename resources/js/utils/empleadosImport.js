import { crearDescargaPlantilla, crearParser } from "./excelImport.js";

/*
 * Importación de datos de empleados desde Excel, por cédula: solo rellena los campos que
 * el empleado tiene vacíos (EmpleadoController@importarDatosPersonales).
 *
 * Columnas y orden: los del archivo "COLUMNAS IMPORTE-EXPORTE CONTRATOS Y EMPLEADOS",
 * iguales al exporte (empleadosExport.js) menos Fecha de Registro, que es solo del
 * exporte. Así un Excel exportado se vuelve a importar sin avisos.
 *
 * Columnas informativas (van en la plantilla y se reconocen, pero no se cargan aquí):
 *   - Cargo, Empresa y los datos del contrato (fechas, proyecto, estado): son del contrato
 *     y se copian solos al empleado desde Contratos (EmpleadoSyncService).
 *   - Email: es el usuario de acceso; Estado Empleado (controla el acceso) y el rol: se
 *     cambian en el formulario del empleado, nunca en lote.
 *   - Ciudad y Cantidad de Contratos: se calculan.
 * Ya no van: Ingresos, Código Directv, Tipo de Contrato, EPS, ARL, Fondo de Pensiones, Caja
 * de Compensación, Observaciones Médicas, Alergias y Comentarios.
 */
const DE_CONTRATOS = "se cargan en Contratos y se copian solos al empleado";
const DEL_FORMULARIO = "se cambian en el formulario del empleado";
const CALCULADA = "se calcula sola";

export const COLUMNAS_IMPORTABLES = [
    { titulo: "Sede", campo: "sede" },
    { titulo: "Cédula", campo: "cedula", requerido: true },
    { titulo: "Fecha Expedición Documento", campo: "fecha_expedicion", tipo: "fecha" },
    { titulo: "Nombres", campo: "nombres" },
    { titulo: "Apellidos", campo: "apellidos" },
    { titulo: "Cargo", campo: "cargo", informativa: DE_CONTRATOS },
    { titulo: "Fecha de Ingreso", campo: "fecha_ingreso", informativa: DE_CONTRATOS },
    { titulo: "Fecha de Retiro", campo: "fecha_retiro", informativa: DE_CONTRATOS },
    { titulo: "Empresa", campo: "empresa", informativa: DE_CONTRATOS },
    { titulo: "Empleador", campo: "empleador" },
    { titulo: "Cliente Proyecto", campo: "cliente_proyecto", informativa: DE_CONTRATOS },
    { titulo: "Estado Contrato", campo: "estado_contrato", informativa: DE_CONTRATOS },
    { titulo: "Género", campo: "genero" },
    { titulo: "Fecha Nacimiento", campo: "fecha_nacimiento", tipo: "fecha" },
    { titulo: "Lugar Nacimiento", campo: "lugar_nacimiento" },
    { titulo: "Raza", campo: "raza" },
    { titulo: "Estado Civil", campo: "estado_civil" },
    { titulo: "Nivel Escolaridad", campo: "nivel_escolaridad" },
    { titulo: "Profesión", campo: "profesion" },
    { titulo: "Número de Hijos", campo: "numero_hijos", tipo: "entero" },
    { titulo: "RH", campo: "rh" },
    { titulo: "Email", campo: "email", informativa: DEL_FORMULARIO },
    { titulo: "Móvil", campo: "movil" },
    { titulo: "Ciudad", campo: "ciudad", informativa: CALCULADA },
    { titulo: "Dirección Residencia", campo: "direccion_residencia" },
    { titulo: "Barrio", campo: "barrio" },
    { titulo: "Estrato", campo: "estrato" },
    { titulo: "Estado Empleado", campo: "estado_empleado", informativa: DEL_FORMULARIO },
    { titulo: "Tipo de funcionario (rol)", campo: "rol", informativa: DEL_FORMULARIO },
    { titulo: "Tipo Vinculación", campo: "tipo_vinculacion" },
    { titulo: "Jefe Inmediato", campo: "jefe_inmediato" },
    { titulo: "Correo del Jefe", campo: "jefe_inmediato_correo" },
    { titulo: "Cantidad de Contratos", campo: "cantidad_contratos", informativa: CALCULADA },
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
    // Solo del exporte: se reconoce para que un Excel exportado se reimporte sin avisos,
    // pero no va en la plantilla.
    { titulo: "Fecha de Registro", campo: "created_at", informativa: "es solo del exporte", soloExporte: true },
];

export const descargarPlantillaImportacion = crearDescargaPlantilla(
    COLUMNAS_IMPORTABLES.filter((c) => !c.soloExporte),
    "Plantilla_Importar_Empleados",
);

export const parsearArchivoImportacion = crearParser(COLUMNAS_IMPORTABLES);
