import test from "node:test";
import assert from "node:assert/strict";
import { construirLibro } from "./excelExport.js";
import { normalizarTitulo, normalizarClave } from "./excelImport.js";
import { construirHojasEmpleados } from "./empleadosExport.js";
import { construirHojasContratos } from "./contratosExport.js";
import * as empleadosImport from "./empleadosImport.js";
import { buildContratoPayloadFromExcelRow, buildContratoPayloadFromExcelRows, filaParaCompletarContrato } from "./contratosImport.js";

/** Escribe las hojas a un .xlsx real y lo devuelve como el `File` que recibe el parser. */
async function archivoDesde(hojas) {
    const XLSX = await import("xlsx");
    const buffer = XLSX.write(construirLibro(XLSX, hojas), { type: "array", bookType: "xlsx" });
    return { arrayBuffer: async () => buffer };
}

const titulosExport = (hoja) => new Set(hoja.columnas.map((c) => normalizarTitulo(c.titulo)));

test("cada columna importable de Empleados existe en su exportación", () => {
    const [hoja] = construirHojasEmpleados([]);
    const exportadas = titulosExport(hoja);
    const faltantes = empleadosImport.COLUMNAS_IMPORTABLES.filter((c) => !exportadas.has(normalizarTitulo(c.titulo)));
    assert.deepEqual(faltantes.map((c) => c.titulo), []);
});

test("Empleados: exportar y volver a importar conserva tipos y valores", async () => {
    const empleado = {
        cedula: "0012345678",
        nombres: "CAMILA ANDREA",
        apellidos: "RUIZ",
        fecha_nacimiento: "1995-07-20T00:00:00.000000Z",
        numero_hijos: 2,
        tiene_cert_alturas: false,
        movil: "3001234567",
        cuenta_bancaria: "000123456789",
        sede: "SYM PEREIRA",
        ingresos: "1423500.00",
        contratos: [],
    };
    const { filas, columnasNoReconocidas } = await empleadosImport.parsearArchivoImportacion(
        await archivoDesde(construirHojasEmpleados([empleado])),
    );

    assert.equal(filas.length, 1);
    const [f] = filas;
    assert.equal(f.cedula, "0012345678", "la cédula conserva el cero a la izquierda");
    assert.equal(f.nombres, "CAMILA ANDREA");
    assert.equal(f.fecha_nacimiento, "1995-07-20", "la fecha no se corre de día");
    assert.equal(f.numero_hijos, "2");
    assert.equal(f.tiene_cert_alturas, false, "un 'No' se conserva como false, no se descarta");
    assert.equal(f.cuenta_bancaria, "000123456789");
    assert.equal(f.sede, "SYM PEREIRA");
    // Columnas que se exportan pero que este import no escribe a propósito
    assert.ok(columnasNoReconocidas.includes("Ingresos"));
    assert.ok(!("ingresos" in f));
});

test("Contratos: un solo Excel crea el contrato o completa el existente", async () => {
    const XLSX = await import("xlsx");
    const contrato = {
        empleado: { cedula: "1088252881", nombres: "DIANA", apellidos: "LORENA", email: "diana@example.com" },
        cargo: "ANALISTA",
        area_empresa: "Comercial",
        jefe_inmediato: "CARLOS",
        jefe_inmediato_correo: "carlos@example.com",
        tipo_contrato: "Término Indefinido",
        fecha_ingreso: "2021-07-02T00:00:00.000000Z",
        arl: "SURA",
        fecha_vinculacion_arl: "2021-07-02T00:00:00.000000Z",
        lps_afiliado: "NUEVA EPS",
        fecha_vinculacion_caja: "2021-07-03T00:00:00.000000Z",
        fondo_cesantias: "PROTECCION",
        cliente_proyecto: "DIRECTV CO",
        salario: "2000000.00",
    };
    // Mismo camino que ContratosCrud: archivo exportado → sheet_to_json → payloads
    const archivo = await archivoDesde(construirHojasContratos([contrato], { incluirSensible: true }));
    const wb = XLSX.read(await archivo.arrayBuffer(), { type: "array" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const [payload] = buildContratoPayloadFromExcelRows(rows, { regionales: [] });

    // Sin contrato: se crea con todo, incluido el correo del jefe
    assert.equal(payload.jefe_inmediato_correo, "carlos@example.com");
    assert.equal(payload.area_empresa, "Comercial");
    assert.equal(payload.fondo_cesantias, "PROTECCION");
    assert.equal(payload.fecha_vinculacion_caja, "2021-07-03");
    assert.equal(payload.salario, 2000000);

    // Con contrato: solo los campos que se pueden completar, sin salario/fechas de ingreso/estado
    const fila = filaParaCompletarContrato(payload);
    assert.equal(fila.documento, "1088252881");
    assert.equal(fila.jefe_inmediato_correo, "carlos@example.com");
    assert.equal(fila.area_empresa, "Comercial");
    assert.equal(fila.arl, "SURA");
    assert.equal(fila.fecha_vinculacion_arl, "2021-07-02");
    assert.equal(fila.lps_afiliado, "NUEVA EPS");
    assert.equal(fila.cliente_proyecto, "DIRECTV CO");
    for (const campo of ["salario", "fecha_ingreso", "estado_contrato", "tipo_contrato", "centros_costos", "anexos", "nombres"]) {
        assert.ok(!(campo in fila), campo + " no debe completarse por carga masiva");
    }
    // Campos vacíos no se mandan (el backend los ignoraría igual)
    assert.ok(!("fondo_pensiones" in fila));
});

test("la cédula se limpia de separadores de miles", () => {
    assert.equal(normalizarClave("1.007.845.261"), "1007845261");
    assert.equal(normalizarClave(" 52 478 603 "), "52478603");
    assert.equal(normalizarClave(1007845261), "1007845261");
    assert.equal(normalizarClave("0012345678"), "0012345678");
    assert.equal(normalizarClave("AB-123"), "AB-123");
});

test("Importar contratos: salario en formato colombiano, fecha de retiro y regional inexistente", () => {
    const payload = buildContratoPayloadFromExcelRow(
        {
            Documento: "1.088.252.881",
            Salario: "3.500.000",
            "Auxilio Transporte Legal": "200.000,50",
            "Fecha de Retiro": "15/03/2024",
            Regional: "Regional Fantasma",
        },
        { regionales: [{ id: 1, nombre: "Eje Cafetero" }] },
    );
    assert.equal(payload.documento, "1088252881");
    assert.equal(payload.salario, 3500000);
    assert.equal(payload.auxilio_transporte_legal, 200000.5);
    assert.equal(payload.fecha_retiro, "2024-03-15");
    assert.equal(payload.regional_id, "");
    assert.equal(payload.regional_no_encontrada, "Regional Fantasma");

    // Sin columna "Área Empresa", la columna "Empresa" no debe tomarse como área
    const sinArea = buildContratoPayloadFromExcelRow({ Documento: "1", Empresa: "Servicios y Mercadeo COL" });
    assert.equal(sinArea.area_empresa, null);
    assert.equal(sinArea.empresa, "Servicios y Mercadeo COL");
    // Columna presente pero vacía: el campo queda vacío, no toma el dato de otra columna
    const jefeVacio = buildContratoPayloadFromExcelRow({
        Documento: "1", Correo: "empleado@x.co", "Jefe Inmediato": "RICHARD TORRES", "Correo del Jefe": "",
    });
    assert.equal(jefeVacio.jefe_inmediato_correo, null);
    assert.equal(jefeVacio.correo, "empleado@x.co");
    // Correo del jefe mal escrito: se omite y se reporta, sin bloquear el contrato
    const jefeMalo = buildContratoPayloadFromExcelRow({ Documento: "1", "Correo del Jefe": "RICHARD TORRES" });
    assert.equal(jefeMalo.jefe_inmediato_correo, "");
    assert.equal(jefeMalo.correo_jefe_invalido, "RICHARD TORRES");
    // Encabezado truncado por el ancho de columna sigue reconociéndose
    assert.equal(buildContratoPayloadFromExcelRow({ tipodecontrat: "Término fijo" }).tipo_contrato, "Término Fijo");

    assert.equal(buildContratoPayloadFromExcelRow({ Salario: "abc" }).salario, "");
    assert.equal(buildContratoPayloadFromExcelRow({ Salario: "3,500,000" }).salario, 3500000);
});
