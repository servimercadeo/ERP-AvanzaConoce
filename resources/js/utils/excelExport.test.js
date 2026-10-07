import test from "node:test";
import assert from "node:assert/strict";
import { aFecha, aNumero, aBooleano, limpiarTexto, serialExcel, valorCelda, filasPlanas, construirLibro } from "./excelExport.js";
import { construirHojasContratos } from "./contratosExport.js";
import { construirHojasEmpleados } from "./empleadosExport.js";
import { buildContratoPayloadFromExcelRows } from "./contratosImport.js";

test("valida fechas sin correrlas de día por la zona horaria", () => {
    assert.equal(aFecha("2019-01-01T00:00:00.000000Z"), "2019-01-01");
    assert.equal(aFecha("2024-02-29"), "2024-02-29");
    assert.equal(aFecha("2023-02-29"), null);
    assert.equal(aFecha("0000-00-00"), null);
    assert.equal(aFecha("N/A"), null);
    assert.equal(aFecha(null), null);
    assert.equal(serialExcel("1900-03-01"), 61);
    assert.equal(serialExcel("2019-01-01"), 43466);
});

test("valida números, booleanos y textos", () => {
    assert.equal(aNumero("3500000.00"), 3500000);
    assert.equal(aNumero(1300000), 1300000);
    assert.equal(aNumero("abc"), null);
    assert.equal(aNumero(""), null);
    assert.equal(aNumero(NaN), null);
    assert.equal(aBooleano(true), "Sí");
    assert.equal(aBooleano(0), "No");
    assert.equal(aBooleano(null), null);
    assert.equal(limpiarTexto("  ANA   MARÍA \u0000 "), "ANA MARÍA");
    assert.equal(limpiarTexto("   "), null);
    assert.equal(limpiarTexto({}), null);
    assert.equal(valorCelda("entero", "2.7"), 2);
});

const contrato = {
    id: 1,
    empleado: { cedula: "0012345678", nombres: "DANIELA", apellidos: "OSSA SALAZAR", email: "daniela@example.com" },
    cargo: "JEFE DE NEGOCIOS HUGHES",
    sede: "SYM PEREIRA",
    regional: { id: 3, nombre: "Eje Cafetero" },
    area_empresa: "Comercial",
    jefe_inmediato: "CARLOS PÉREZ",
    jefe_inmediato_correo: "carlos@example.com",
    tipo_contrato: "Término Indefinido",
    tipo_vinculacion: "Directa",
    estado_contrato: "Traslado",
    fecha_ingreso: "2019-01-01T00:00:00.000000Z",
    fecha_retiro: null,
    empresa: "Servimercadeo COL",
    empleador: "SERVIMERCADEO",
    cliente_proyecto: "HUGHES",
    salario: "3500000.00",
    auxilio_transporte_legal: "200000.00",
    arl: "SURA",
    fecha_vinculacion_arl: "2019-01-01T00:00:00.000000Z",
    lps_afiliado: "NUEVA EPS",
    fecha_vinculacion_lps: "2019-01-02T00:00:00.000000Z",
    caja_compensacion: "COMFAMILIAR",
    fecha_vinculacion_caja: "2019-01-03T00:00:00.000000Z",
    fondo_pensiones: "PORVENIR",
    fondo_cesantias: "PROTECCION",
    centros_costos: [{ codigo: "CC01", centro_costos: "Comercial", porcentaje: "100.00" }],
    anexos: [{ anexo_auxilio: "Rodamiento", valor: "150000.00", fecha_entrega_firma: "2019-01-05T00:00:00.000000Z" }],
    eventos_medicos: [{ tipo_evento: "Incapacidad", diagnostico: "Gripe", vigencia_desde: "2020-01-01T00:00:00.000000Z" }],
    created_at: "2026-05-06T15:00:00.000000Z",
};

test("sin permiso sensible no exporta salario, seguridad social ni hojas de detalle", () => {
    const hojas = construirHojasContratos([contrato], { incluirSensible: false });
    assert.equal(hojas.length, 1);
    const titulos = hojas[0].columnas.map((c) => c.titulo);
    for (const t of ["Salario", "EPS", "ARL", "Centro de Costos"]) assert.ok(!titulos.includes(t), t);
});

test("con permiso sensible exporta todas las hojas con sus filas", () => {
    const hojas = construirHojasContratos([contrato], { incluirSensible: true });
    assert.deepEqual(hojas.map((h) => h.nombre), ["Contratos", "Centros de Costos", "Anexos", "Seguimiento Médico"]);
    const [cc] = filasPlanas(hojas[1]);
    assert.equal(cc["Porcentaje (%)"], 100);
    const [anexo] = filasPlanas(hojas[2]);
    assert.equal(anexo.Valor, 150000);
    assert.equal(anexo["Fecha Entrega / Firma"], "2019-01-05");
    assert.equal(anexo.Documento, "0012345678");
});

test("la hoja Contratos resume los anexos y auxilios de cada contrato", () => {
    const conVarios = {
        ...contrato,
        anexos: [
            ...contrato.anexos,
            { anexo_auxilio: "AUXILIO DE COMUNICACION", valor: "15000.00", fecha_entrega_firma: null },
        ],
    };
    const [fila, sinAnexos] = filasPlanas(
        construirHojasContratos([conVarios, { ...contrato, anexos: [] }], { incluirSensible: true })[0],
    );
    assert.match(fila["Anexos y Auxilios"], /^Rodamiento \(\$\s?150\.000 · 05\/01\/2019\); AUXILIO DE COMUNICACION \(\$\s?15\.000\)$/);
    assert.equal(fila["Total Anexos y Auxilios"], 165000);
    assert.equal(sinAnexos["Anexos y Auxilios"], null);
    assert.equal(sinAnexos["Total Anexos y Auxilios"], null);

    const sinPermiso = construirHojasContratos([conVarios], { incluirSensible: false })[0].columnas.map((c) => c.titulo);
    assert.ok(!sinPermiso.includes("Anexos y Auxilios"));
});

test("el Excel de contratos se puede volver a importar con los mismos datos", () => {
    const [hoja] = construirHojasContratos([contrato], { incluirSensible: true });
    // En el archivo real las fechas son números de serie de Excel; el importador los soporta.
    const filas = filasPlanas(hoja).map((fila) =>
        Object.fromEntries(
            hoja.columnas.map((col) => [
                col.titulo,
                col.tipo === "fecha" && fila[col.titulo] ? serialExcel(fila[col.titulo]) : fila[col.titulo] ?? "",
            ]),
        ),
    );

    const [payload] = buildContratoPayloadFromExcelRows(filas, {
        regionales: [{ id: 3, nombre: "Eje Cafetero" }],
        centrosCostoCatalogo: [{ id: 9, codigo: "CC01" }],
    });

    assert.equal(payload.documento, "0012345678");
    assert.equal(payload.nombres, "DANIELA");
    assert.equal(payload.apellidos, "OSSA SALAZAR");
    assert.equal(payload.correo, "daniela@example.com");
    assert.equal(payload.cargo, "JEFE DE NEGOCIOS HUGHES");
    assert.equal(payload.sede, "SYM PEREIRA");
    assert.equal(payload.regional_id, 3);
    assert.equal(payload.area_empresa, "Comercial");
    assert.equal(payload.jefe_inmediato, "CARLOS PÉREZ");
    assert.equal(payload.tipo_contrato, "Término Indefinido");
    assert.equal(payload.tipo_vinculacion, "Directa");
    assert.equal(payload.estado_contrato, "Traslado");
    assert.equal(payload.fecha_ingreso, "2019-01-01");
    assert.equal(payload.empresa, "Servimercadeo COL");
    assert.equal(payload.empleador, "SERVIMERCADEO");
    assert.equal(payload.cliente_proyecto, "HUGHES");
    assert.equal(payload.salario, 3500000);
    assert.equal(payload.auxilio_transporte_legal, 200000);
    assert.equal(payload.arl, "SURA");
    assert.equal(payload.fecha_vinculacion_arl, "2019-01-01");
    assert.equal(payload.lps_afiliado, "NUEVA EPS");
    assert.equal(payload.fecha_vinculacion_lps, "2019-01-02");
    assert.equal(payload.caja_compensacion, "COMFAMILIAR");
    assert.equal(payload.fecha_vinculacion_caja, "2019-01-03");
    assert.equal(payload.fondo_pensiones, "PORVENIR");
    assert.equal(payload.fondo_cesantias, "PROTECCION");
    assert.deepEqual(payload.centros_costos, [{ centro_costo_catalogo_id: 9, porcentaje: 100 }]);
    // El auxilio de transporte no debe confundirse con un anexo
    assert.equal(payload.anexos, undefined);
});

test("el .xlsx generado tiene tipos reales y se re-importa como lo hace la pantalla", async () => {
    const XLSX = await import("xlsx");
    const wb = construirLibro(XLSX, construirHojasContratos([contrato], { incluirSensible: true }));
    const leido = XLSX.read(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });

    assert.deepEqual(leido.SheetNames, ["Contratos", "Centros de Costos", "Anexos", "Seguimiento Médico"]);
    const ws = leido.Sheets.Contratos;
    const celdaDe = (titulo) => {
        const c = construirHojasContratos([contrato], { incluirSensible: true })[0].columnas.findIndex((col) => col.titulo === titulo);
        return ws[XLSX.utils.encode_cell({ r: 1, c })];
    };
    assert.equal(celdaDe("Documento").t, "s");
    assert.equal(celdaDe("Documento").v, "0012345678");
    assert.equal(celdaDe("Salario").t, "n");
    assert.equal(celdaDe("Fecha de Ingreso").t, "n");
    assert.equal(celdaDe("Fecha de Ingreso").v, 43466);
    assert.equal(celdaDe("Fecha de Retiro"), undefined);

    // Igual que handleImportExcel en ContratosCrud
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const [payload] = buildContratoPayloadFromExcelRows(rows, { regionales: [], centrosCostoCatalogo: [] });
    assert.equal(payload.documento, "0012345678");
    assert.equal(payload.fecha_ingreso, "2019-01-01");
    assert.equal(payload.salario, 3500000);
});

test("empleados: limpia el móvil de relleno y resume el contrato más reciente", () => {
    const [hoja] = construirHojasEmpleados([
        {
            cedula: "1007845261",
            nombres: "CAMILA ANDREA",
            movil: "0000000000",
            ingresos: "1423500.00",
            tiene_cert_alturas: false,
            numero_hijos: 2,
            empresa: { nombre: "Servicios y Mercadeo COL" },
            contratos: [
                { tipo_contrato: "Término Fijo", estado_contrato: "Activo", fecha_ingreso: "2024-03-01T00:00:00.000000Z" },
                { tipo_contrato: "Obra o Labor", estado_contrato: "Inactivo", fecha_ingreso: "2022-01-01T00:00:00.000000Z" },
            ],
        },
    ]);
    const [fila] = filasPlanas(hoja);
    assert.equal(fila["Cédula"], "1007845261");
    assert.equal(fila["Móvil"], null);
    assert.equal(fila.Ingresos, 1423500);
    assert.equal(fila["Tiene Cert. Alturas"], "No");
    assert.equal(fila.Empresa, "Servicios y Mercadeo COL");
    assert.equal(fila["Tipo de Contrato"], "Término Fijo");
    assert.equal(fila["Fecha de Ingreso"], "2024-03-01");
    assert.equal(fila["Cantidad de Contratos"], 2);
    const titulos = hoja.columnas.map((c) => c.titulo);
    assert.equal(new Set(titulos).size, titulos.length, "encabezados duplicados");
});
