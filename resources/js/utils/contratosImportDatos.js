import { crearDescargaPlantilla, crearParser } from "./excelImport.js";

/*
 * Rellenar datos faltantes de Contratos desde Excel, por Documento (cédula).
 *
 * Distinto del "Importar Excel" que ya existe en Contratos (contratosImport.js): ese
 * CREA contratos nuevos saltando las cédulas que ya tienen uno; este NUNCA crea nada,
 * solo completa campos vacíos en el contrato más reciente de un empleado que ya existe.
 *
 * Deliberadamente NO incluye salario, fechas de ingreso/retiro, estado del contrato,
 * tipo de contrato ni centros de costos — esos tienen reglas de negocio propias y se
 * gestionan desde el formulario de Contratos, no por carga masiva.
 *
 * Los títulos de columna coinciden con los de "Exportar Excel" (contratosExport.js).
 */
export const COLUMNAS_IMPORTABLES = [
    { titulo: "Documento", campo: "documento", requerido: true },
    { titulo: "Cargo", campo: "cargo" },
    { titulo: "Sede", campo: "sede" },
    { titulo: "Área Empresa", campo: "area_empresa" },
    { titulo: "Jefe Inmediato", campo: "jefe_inmediato" },
    { titulo: "Correo del Jefe", campo: "jefe_inmediato_correo" },
    { titulo: "Tipo de Vinculación", campo: "tipo_vinculacion" },
    { titulo: "ARL", campo: "arl" },
    { titulo: "Fecha Vinculación ARL", campo: "fecha_vinculacion_arl", tipo: "fecha" },
    { titulo: "EPS", campo: "lps_afiliado" },
    { titulo: "Fecha Vinculación EPS", campo: "fecha_vinculacion_lps", tipo: "fecha" },
    { titulo: "Caja de Compensación", campo: "caja_compensacion" },
    { titulo: "Fecha Vinculación Caja", campo: "fecha_vinculacion_caja", tipo: "fecha" },
    { titulo: "Fondo de Pensiones", campo: "fondo_pensiones" },
    { titulo: "Fondo de Cesantías", campo: "fondo_cesantias" },
    { titulo: "Empleador", campo: "empleador" },
    { titulo: "Cliente Proyecto", campo: "cliente_proyecto" },
];

export const descargarPlantillaImportacion = crearDescargaPlantilla(
    COLUMNAS_IMPORTABLES,
    "Plantilla_Completar_Contratos",
);

export const parsearArchivoImportacion = crearParser(COLUMNAS_IMPORTABLES);
