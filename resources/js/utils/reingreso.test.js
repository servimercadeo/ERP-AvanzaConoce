import test from "node:test";
import assert from "node:assert/strict";
import { opcionesDeReingreso, datosDeReingreso } from "./reingreso.js";

const empleado = (id, cedula, nombres = "ANA", apellidos = "GIL") => ({ id, cedula, nombres, apellidos, email: `${cedula}@x.co` });
const contrato = (id, empleadoId, cedula, extra = {}) => ({
    id, empleado_id: empleadoId, empleado: empleado(empleadoId, cedula), cargo: "APRENDIZ SENA", sede: "SYM PEREIRA",
    estado_contrato: "Finalizado", fecha_ingreso: "2025-01-01", tipo_contrato: "Aprendizaje", salario: 1000000,
    centros_costos: [{ id: 9, centro_costo_catalogo_id: 3, codigo: "CC1", centro_costos: "ADMIN", porcentaje: "100.00" }], ...extra,
});

test("cada persona con contrato sale una vez, con su último contrato", () => {
    const opciones = opcionesDeReingreso([
        contrato(1, 10, "100", { fecha_ingreso: "2024-01-01", cargo: "VIEJO" }),
        contrato(2, 10, "100", { fecha_ingreso: "2025-06-01", cargo: "APRENDIZ SENA" }),
        contrato(3, 20, "200"),
    ]);

    assert.equal(opciones.length, 2);
    const ana = opciones.find((o) => o.documento === "100");
    assert.equal(ana.reingreso, true);
    assert.equal(ana.empleado_id, 10);
    assert.equal(ana.contratos, 2);
    assert.equal(ana.cargo, "APRENDIZ SENA", "Se precarga el último contrato.");
    assert.equal(ana.fecha_ingreso, "", "La fecha de ingreso es la del contrato nuevo.");
    assert.equal(ana.vigente, null);
});

test("quien sigue con un contrato vigente queda marcado", () => {
    const [o] = opcionesDeReingreso([contrato(1, 10, "100", { estado_contrato: "Vigente", cargo: "APRENDIZ" })]);
    assert.deepEqual(o.vigente, { cargo: "APRENDIZ", fecha_ingreso: "2025-01-01" });
});

test("quien está en Selección con aval nuevo no se repite como reingreso", () => {
    assert.deepEqual(opcionesDeReingreso([contrato(1, 10, "100")], [{ documento: "100" }]), []);
});

test("contratos sin empleado o sin cédula se ignoran", () => {
    assert.deepEqual(opcionesDeReingreso([{ id: 1, empleado_id: null }, contrato(2, 10, "")]), []);
});

test("los datos heredados no traen fechas, estado ni ids viejos", () => {
    const d = datosDeReingreso(contrato(1, 10, "100", { fecha_retiro: "2025-12-31", motivo_finalizacion: "Voluntario" }));
    assert.equal(d.fecha_ingreso, "");
    assert.equal(d.estado_contrato, undefined);
    assert.equal(d.fecha_retiro, undefined);
    assert.equal(d.motivo_finalizacion, undefined);
    assert.equal(d.empleado_id, undefined);
    assert.deepEqual(d.centros_costos, [{ centro_costo_catalogo_id: 3, codigo: "CC1", centro_costos: "ADMIN", porcentaje: 100 }]);
    assert.equal(d.tipo_contrato, "Aprendizaje");
});
