import { descargarExcel, fechaArchivo, aFechaLocal } from "./excelExport.js";
import { etiquetaRol } from "./roles.js";

/*
 * Exportación de Empleados a Excel: una fila por empleado con toda su ficha (los mismos
 * campos del formulario, ya enriquecidos por EmpleadoController@index con respuestas de
 * ingreso / candidatos) y un resumen de su contrato más reciente.
 */

// `contratos` llega ordenado por fecha_ingreso desc desde la API.
const contratoReciente = (e) => (e.contratos ?? [])[0];

// "0000000000" es el móvil de relleno que se pone al crear un usuario sin teléfono.
const movilReal = (movil) => (movil && !/^0+$/.test(String(movil).trim()) ? movil : null);

// Orden acordado con Talento Humano (archivo "COLUMNAS IMPORTE-EXPORTE CONTRATOS Y
// EMPLEADOS"); la plantilla de importación usa el mismo (empleadosImport.js). Ya no van:
// Ingresos, Código Directv, Tipo de Contrato, EPS, ARL, Fondo de Pensiones, Caja de
// Compensación, Observaciones Médicas, Alergias y Comentarios. Fecha de Registro es solo
// del exporte.
export const COLUMNAS_EMPLEADOS = [
    { titulo: "Sede", tipo: "texto", ancho: 30, valor: (e) => e.sede },
    { titulo: "Cédula", tipo: "texto", ancho: 14, valor: (e) => e.cedula },
    { titulo: "Fecha Expedición Documento", tipo: "fecha", ancho: 16, valor: (e) => e.fecha_expedicion },
    { titulo: "Nombres", tipo: "texto", ancho: 22, valor: (e) => e.nombres },
    { titulo: "Apellidos", tipo: "texto", ancho: 22, valor: (e) => e.apellidos },
    { titulo: "Cargo", tipo: "texto", ancho: 30, valor: (e) => e.cargo },
    // Contrato más reciente
    { titulo: "Fecha de Ingreso", tipo: "fecha", ancho: 14, valor: (e) => contratoReciente(e)?.fecha_ingreso },
    { titulo: "Fecha de Retiro", tipo: "fecha", ancho: 14, valor: (e) => contratoReciente(e)?.fecha_retiro },
    { titulo: "Empresa", tipo: "texto", ancho: 26, valor: (e) => e.empresa?.nombre },
    { titulo: "Empleador", tipo: "texto", ancho: 26, valor: (e) => e.empleador },
    { titulo: "Cliente Proyecto", tipo: "texto", ancho: 22, valor: (e) => contratoReciente(e)?.cliente_proyecto },
    { titulo: "Estado Contrato", tipo: "texto", ancho: 15, valor: (e) => contratoReciente(e)?.estado_contrato },
    // Datos personales
    { titulo: "Género", tipo: "texto", ancho: 12, valor: (e) => e.genero },
    { titulo: "Fecha Nacimiento", tipo: "fecha", ancho: 14, valor: (e) => e.fecha_nacimiento },
    { titulo: "Lugar Nacimiento", tipo: "texto", ancho: 18, valor: (e) => e.lugar_nacimiento },
    { titulo: "Raza", tipo: "texto", ancho: 12, valor: (e) => e.raza },
    { titulo: "Estado Civil", tipo: "texto", ancho: 14, valor: (e) => e.estado_civil },
    { titulo: "Nivel Escolaridad", tipo: "texto", ancho: 16, valor: (e) => e.nivel_escolaridad },
    { titulo: "Profesión", tipo: "texto", ancho: 22, valor: (e) => e.profesion },
    { titulo: "Número de Hijos", tipo: "entero", ancho: 10, valor: (e) => e.numero_hijos },
    { titulo: "RH", tipo: "texto", ancho: 6, valor: (e) => e.rh },
    // Contacto
    { titulo: "Email", tipo: "texto", ancho: 30, valor: (e) => e.email },
    { titulo: "Móvil", tipo: "texto", ancho: 14, valor: (e) => movilReal(e.movil) },
    { titulo: "Ciudad", tipo: "texto", ancho: 16, valor: (e) => e.ciudad },
    { titulo: "Dirección Residencia", tipo: "texto", ancho: 30, valor: (e) => e.direccion_residencia },
    { titulo: "Barrio", tipo: "texto", ancho: 18, valor: (e) => e.barrio },
    { titulo: "Estrato", tipo: "texto", ancho: 8, valor: (e) => e.estrato },
    // Estado y vinculación (Estado Empleado controla el acceso al ERP y a AvanzaConoce)
    { titulo: "Estado Empleado", tipo: "texto", ancho: 14, valor: (e) => e.estado_empleado },
    { titulo: "Tipo de funcionario (rol)", tipo: "texto", ancho: 18, valor: (e) => etiquetaRol(e.rol) },
    { titulo: "Tipo Vinculación", tipo: "texto", ancho: 16, valor: (e) => e.tipo_vinculacion },
    { titulo: "Jefe Inmediato", tipo: "texto", ancho: 28, valor: (e) => e.jefe_inmediato || e.jefe_inmediato_nombre },
    { titulo: "Correo del Jefe", tipo: "texto", ancho: 30, valor: (e) => e.jefe_inmediato_correo },
    { titulo: "Cantidad de Contratos", tipo: "entero", ancho: 10, valor: (e) => (e.contratos ?? []).length },
    // Información bancaria
    { titulo: "Banco", tipo: "texto", ancho: 20, valor: (e) => e.banco },
    { titulo: "Tipo de Cuenta", tipo: "texto", ancho: 14, valor: (e) => e.tipo_cuenta },
    { titulo: "No. de Cuenta Bancaria", tipo: "texto", ancho: 20, valor: (e) => e.cuenta_bancaria },
    // Tallas
    { titulo: "Talla Camisa", tipo: "texto", ancho: 10, valor: (e) => e.talla_camisa },
    { titulo: "Talla Pantalón", tipo: "texto", ancho: 10, valor: (e) => e.talla_pantalon },
    { titulo: "Talla Zapatos", tipo: "texto", ancho: 10, valor: (e) => e.talla_zapatos },
    // Licencias y certificaciones
    { titulo: "No. Licencia Carro", tipo: "texto", ancho: 16, valor: (e) => e.licencia_carro },
    { titulo: "Vence Licencia Carro", tipo: "fecha", ancho: 14, valor: (e) => e.licencia_carro_vence },
    { titulo: "No. Licencia Moto", tipo: "texto", ancho: 16, valor: (e) => e.licencia_moto },
    { titulo: "Vence Licencia Moto", tipo: "fecha", ancho: 14, valor: (e) => e.licencia_moto_vence },
    { titulo: "Tiene Cert. Alturas", tipo: "booleano", ancho: 10, valor: (e) => e.tiene_cert_alturas },
    { titulo: "Vence Cert. Alturas", tipo: "fecha", ancho: 14, valor: (e) => e.cert_alturas_vence },
    // Contacto de emergencia
    { titulo: "Contacto Emergencia", tipo: "texto", ancho: 26, valor: (e) => e.contacto_emergencia_nombre },
    { titulo: "Teléfono Emergencia", tipo: "texto", ancho: 14, valor: (e) => e.contacto_emergencia_telefono },
    { titulo: "Parentesco Emergencia", tipo: "texto", ancho: 14, valor: (e) => e.contacto_emergencia_parentesco },
    { titulo: "Fecha de Registro", tipo: "fecha", ancho: 14, valor: (e) => aFechaLocal(e.created_at) },
];

export function construirHojasEmpleados(empleados) {
    return [{ nombre: "Empleados", columnas: COLUMNAS_EMPLEADOS, filas: empleados }];
}

export function exportarEmpleadosExcel(empleados) {
    return descargarExcel(construirHojasEmpleados(empleados), `Empleados_${fechaArchivo()}.xlsx`);
}
