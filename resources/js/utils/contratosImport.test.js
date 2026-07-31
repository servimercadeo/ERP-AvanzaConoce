import test from "node:test";
import assert from "node:assert/strict";
import { buildContratoPayloadFromExcelRow } from "./contratosImport.js";

test("mapea columnas de Excel con nombres distintos al payload de contrato", () => {
    const row = {
        Cedula: "1001234567",
        Nombres: "Ana María",
        Apellidos: "García López",
        Correo: "ana@example.com",
        Puesto: "Analista",
        Sede: "Principal",
        "Fecha Ingreso": "2026-07-01",
        "Tipo Contrato": "Término fijo",
        Estado: "Activo",
        Salario: 3500000,
        EPS: "Sura",
        ARL: "Colpatria",
        "Cliente Proyecto": "TIGO",
    };

    const payload = buildContratoPayloadFromExcelRow(row, { regionales: [] });

    assert.equal(payload.documento, "1001234567");
    assert.equal(payload.nombres, "ANA MARÍA");
    assert.equal(payload.apellidos, "GARCÍA LÓPEZ");
    assert.equal(payload.correo, "ana@example.com");
    assert.equal(payload.cargo, "Analista");
    assert.equal(payload.sede, "Principal");
    assert.equal(payload.fecha_ingreso, "2026-07-01");
    assert.equal(payload.tipo_contrato, "Término Fijo");
    assert.equal(payload.estado_contrato, "Activo");
    assert.equal(payload.salario, 3500000);
    assert.equal(payload.lps_afiliado, "Sura");
    assert.equal(payload.arl, "Colpatria");
    assert.equal(payload.cliente_proyecto, "TIGO");
});
