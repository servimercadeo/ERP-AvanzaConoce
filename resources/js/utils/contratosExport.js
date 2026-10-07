import { descargarExcel, fechaArchivo, nombreCompleto, aFecha, aFechaLocal } from "./excelExport.js";

/*
 * Exportación de Contratos a Excel.
 *
 * Los encabezados de la hoja "Contratos" coinciden con los alias que reconoce el
 * importador (utils/contratosImport.js), así el mismo archivo se puede volver a cargar
 * con "Importar Excel" (que solo lee la primera hoja). El detalle que no cabe en una
 * fila por contrato (centros de costo, anexos y eventos médicos) va en hojas aparte,
 * con la cédula y el nombre del empleado para cruzarlo.
 *
 * Salario, seguridad social, costos/anexos y datos médicos son sensibles (en pantalla
 * solo los ve Talento Humano y admin): con `incluirSensible = false` esas columnas y
 * hojas no se exportan.
 */

const doc = (c) => c.empleado?.cedula;
const empleadoNombre = (c) => nombreCompleto(c.empleado?.nombres, c.empleado?.apellidos) ?? c.empleado?.name;

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** "AUXILIO DE COMUNICACION ($ 15.000 · 01/10/2026); VARIABLE ($ 0)" */
const resumenAnexos = (c) => {
    const partes = (c.anexos ?? [])
        .filter((a) => a.anexo_auxilio || Number(a.valor))
        .map((a) => {
            const fecha = aFecha(a.fecha_entrega_firma);
            const detalle = [pesos.format(Number(a.valor) || 0), fecha && fecha.split("-").reverse().join("/")]
                .filter(Boolean)
                .join(" · ");
            return `${a.anexo_auxilio || "Sin nombre"} (${detalle})`;
        });
    return partes.length ? partes.join("; ") : null;
};

const totalAnexos = (c) =>
    (c.anexos ?? []).length ? (c.anexos ?? []).reduce((s, a) => s + (Number(a.valor) || 0), 0) : null;

const COLUMNAS_BASE = [
    { titulo: "Documento", tipo: "texto", ancho: 14, valor: doc },
    { titulo: "Nombres", tipo: "texto", ancho: 22, valor: (c) => c.empleado?.nombres },
    { titulo: "Apellidos", tipo: "texto", ancho: 22, valor: (c) => c.empleado?.apellidos },
    { titulo: "Correo", tipo: "texto", ancho: 30, valor: (c) => c.empleado?.email },
    { titulo: "Cargo", tipo: "texto", ancho: 30, valor: (c) => c.cargo },
    { titulo: "Sede", tipo: "texto", ancho: 30, valor: (c) => c.sede },
    { titulo: "Regional", tipo: "texto", ancho: 16, valor: (c) => c.regional?.nombre },
    { titulo: "Área Empresa", tipo: "texto", ancho: 20, valor: (c) => c.area_empresa },
    { titulo: "Jefe Inmediato", tipo: "texto", ancho: 28, valor: (c) => c.jefe_inmediato || c.jefe_inmediato_nombre },
    { titulo: "Correo del Jefe", tipo: "texto", ancho: 30, valor: (c) => c.jefe_inmediato_correo },
    { titulo: "Tipo de Contrato", tipo: "texto", ancho: 22, valor: (c) => c.tipo_contrato },
    { titulo: "Tipo de Vinculación", tipo: "texto", ancho: 20, valor: (c) => c.tipo_vinculacion },
    { titulo: "Estado Contrato", tipo: "texto", ancho: 15, valor: (c) => c.estado_contrato },
    { titulo: "Fecha de Ingreso", tipo: "fecha", ancho: 14, valor: (c) => c.fecha_ingreso },
    { titulo: "Fecha de Retiro", tipo: "fecha", ancho: 14, valor: (c) => c.fecha_retiro },
    { titulo: "Empresa", tipo: "texto", ancho: 26, valor: (c) => c.empresa },
    { titulo: "Empleador", tipo: "texto", ancho: 26, valor: (c) => c.empleador },
    { titulo: "Cliente Proyecto", tipo: "texto", ancho: 22, valor: (c) => c.cliente_proyecto },
];

const COLUMNAS_SENSIBLES = [
    { titulo: "Salario", tipo: "moneda", ancho: 14, valor: (c) => c.salario },
    { titulo: "Auxilio Transporte Legal", tipo: "moneda", ancho: 14, valor: (c) => c.auxilio_transporte_legal },
    { titulo: "ARL", tipo: "texto", ancho: 22, valor: (c) => c.arl },
    { titulo: "Fecha Vinculación ARL", tipo: "fecha", ancho: 14, valor: (c) => c.fecha_vinculacion_arl },
    { titulo: "EPS", tipo: "texto", ancho: 22, valor: (c) => c.lps_afiliado },
    { titulo: "Fecha Vinculación EPS", tipo: "fecha", ancho: 14, valor: (c) => c.fecha_vinculacion_lps },
    { titulo: "Caja de Compensación", tipo: "texto", ancho: 22, valor: (c) => c.caja_compensacion },
    { titulo: "Fecha Vinculación Caja", tipo: "fecha", ancho: 14, valor: (c) => c.fecha_vinculacion_caja },
    { titulo: "Fondo de Pensiones", tipo: "texto", ancho: 22, valor: (c) => c.fondo_pensiones },
    { titulo: "Fondo de Cesantías", tipo: "texto", ancho: 22, valor: (c) => c.fondo_cesantias },
    // Solo el código: con un único centro el importador lo vuelve a asignar al 100%.
    // El detalle con nombres y porcentajes está en la hoja "Centros de Costos".
    {
        titulo: "Centro de Costos",
        tipo: "texto",
        ancho: 16,
        valor: (c) => (c.centros_costos ?? []).map((cc) => cc.codigo).filter(Boolean).join(", "),
    },
    { titulo: "Fecha Cierre Seguimiento", tipo: "fecha", ancho: 14, valor: (c) => c.seguimiento_fecha_cierre },
    // Resumen en la hoja principal; el detalle fila por fila sigue en la hoja "Anexos".
    // El importador ignora estas dos columnas (contratosImport.js): contienen "auxilio" y
    // si no, al reimportar se tomarían como tipo de auxilio.
    { titulo: "Anexos y Auxilios", tipo: "texto", ancho: 45, valor: resumenAnexos },
    { titulo: "Total Anexos y Auxilios", tipo: "moneda", ancho: 16, valor: totalAnexos },
];

const COLUMNAS_FINALES = [
    { titulo: "ID Macaw", tipo: "texto", ancho: 12, valor: (c) => c.id_macaw },
    { titulo: "Fecha de Registro", tipo: "fecha", ancho: 14, valor: (c) => aFechaLocal(c.created_at) },
];

const COLUMNAS_EMPLEADO = [
    { titulo: "Documento", tipo: "texto", ancho: 14, valor: (r) => doc(r.contrato) },
    { titulo: "Empleado", tipo: "texto", ancho: 32, valor: (r) => empleadoNombre(r.contrato) },
    { titulo: "Cargo", tipo: "texto", ancho: 28, valor: (r) => r.contrato.cargo },
    { titulo: "Estado Contrato", tipo: "texto", ancho: 15, valor: (r) => r.contrato.estado_contrato },
];

/** Aplana un detalle (centros de costo, anexos, eventos) a una fila por elemento. */
const detalle = (contratos, campo) =>
    contratos.flatMap((contrato) => (contrato[campo] ?? []).map((item) => ({ contrato, item })));

export function construirHojasContratos(contratos, { incluirSensible = false } = {}) {
    const hojas = [
        {
            nombre: "Contratos",
            columnas: [...COLUMNAS_BASE, ...(incluirSensible ? COLUMNAS_SENSIBLES : []), ...COLUMNAS_FINALES],
            filas: contratos,
        },
    ];

    if (!incluirSensible) return hojas;

    hojas.push(
        {
            nombre: "Centros de Costos",
            columnas: [
                ...COLUMNAS_EMPLEADO,
                { titulo: "Código", tipo: "texto", ancho: 12, valor: (r) => r.item.codigo },
                { titulo: "Centro de Costos", tipo: "texto", ancho: 32, valor: (r) => r.item.centro_costos },
                { titulo: "Porcentaje (%)", tipo: "porcentaje", ancho: 14, valor: (r) => r.item.porcentaje },
            ],
            filas: detalle(contratos, "centros_costos"),
        },
        {
            nombre: "Anexos",
            columnas: [
                ...COLUMNAS_EMPLEADO,
                { titulo: "Anexo / Auxilio", tipo: "texto", ancho: 30, valor: (r) => r.item.anexo_auxilio },
                { titulo: "Valor", tipo: "moneda", ancho: 14, valor: (r) => r.item.valor },
                { titulo: "Fecha Entrega / Firma", tipo: "fecha", ancho: 16, valor: (r) => r.item.fecha_entrega_firma },
            ],
            filas: detalle(contratos, "anexos"),
        },
        {
            nombre: "Seguimiento Médico",
            columnas: [
                ...COLUMNAS_EMPLEADO,
                { titulo: "Fecha Ingreso Seguimiento", tipo: "fecha", ancho: 16, valor: (r) => r.item.fecha_ingreso_seguimiento },
                { titulo: "Tipo de Evento", tipo: "texto", ancho: 22, valor: (r) => r.item.tipo_evento },
                { titulo: "Origen Diagnóstico", tipo: "texto", ancho: 20, valor: (r) => r.item.origen_diagnostico },
                { titulo: "Diagnóstico", tipo: "texto", ancho: 36, valor: (r) => r.item.diagnostico },
                { titulo: "Recomendaciones", tipo: "texto", ancho: 40, valor: (r) => r.item.recomendaciones },
                { titulo: "Vigencia Desde", tipo: "fecha", ancho: 14, valor: (r) => r.item.vigencia_desde },
                { titulo: "Vigencia Hasta", tipo: "fecha", ancho: 14, valor: (r) => r.item.vigencia_hasta },
                { titulo: "Condición", tipo: "texto", ancho: 18, valor: (r) => r.item.condicion },
                { titulo: "Estado", tipo: "texto", ancho: 14, valor: (r) => r.item.estado },
            ],
            filas: detalle(contratos, "eventos_medicos"),
        },
    );

    return hojas;
}

export function exportarContratosExcel(contratos, opciones) {
    return descargarExcel(construirHojasContratos(contratos, opciones), `Contratos_${fechaArchivo()}.xlsx`);
}
