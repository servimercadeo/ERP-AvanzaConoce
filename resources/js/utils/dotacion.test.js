import test from "node:test";
import assert from "node:assert/strict";
import { filasExcelCompra, estadoEnPedidosAutomaticos, opcionesEstadoPedido, agruparPedidosImportados, contratoVigenteDe, filaExportInventario, inventariosPermitidos, leerFilaImportInventario, mismaTalla, proyectoInventarioDe, tallasEquivalentes } from "./dotacion.js";

// Un archivo .xlsx real con esas filas, leído igual que en las pantallas de importar.
async function porExcel(filas) {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), "Pedidos");
    const leido = XLSX.read(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
    return XLSX.utils.sheet_to_json(leido.Sheets.Pedidos, { defval: "" });
}

test("importar 500 pedidos: cada uno al contrato vigente de su empleado y a la sede de ese contrato", async () => {
    const SEDES_N = [10, 20, 30];
    const empleados = [];
    const contratos = [];
    const inventarioFlat = [];
    SEDES_N.forEach((sede) => {
        ["Polo", "Carnet"].forEach((prenda, p) => {
            ["Masculino", "Femenino"].forEach((genero, g) => {
                inventarioFlat.push({ id: sede * 100 + p * 10 + g, proyecto: "DIRECTV", prenda, genero, talla: g ? "10 (M)" : "M", sede_id: sede, cantidad: 5 });
            });
        });
    });
    const filas = [];
    for (let i = 1; i <= 500; i++) {
        const genero = i % 2 ? "Masculino" : "Femenino";
        const sede = SEDES_N[i % 3];
        empleados.push({ id: i, cedula: String(100000 + i), genero });
        // El primero que llega es un contrato viejo finalizado de otra sede; el vigente es otro.
        contratos.push({ id: i * 10, empleado_id: i, estado_contrato: "Finalizado", fecha_ingreso: "2027-01-01", sede_id: SEDES_N[(i + 1) % 3] });
        contratos.push({ id: i * 10 + 1, empleado_id: i, estado_contrato: "Vigente", fecha_ingreso: "2025-01-01", sede_id: sede });
        filas.push({ Cédula: 100000 + i, Proyecto: "DIRECTV", Prenda: "Polo", Talla: "M", Cantidad: 2 });
        filas.push({ Cédula: 100000 + i, Proyecto: "DIRECTV", Prenda: "Carnet", Talla: "M", Cantidad: 1 });
    }

    const inicio = Date.now();
    const grupos = agruparPedidosImportados(await porExcel(filas), { empleados, contratos, inventarioFlat });
    assert.ok(Date.now() - inicio < 5000, "Debe ser rápido con archivos grandes.");

    assert.equal(grupos.length, 500);
    grupos.forEach((g, n) => {
        const i = n + 1;
        assert.deepEqual(g.errores, [], g.cedula);
        assert.equal(g.empleado.id, i);
        assert.equal(g.contrato_id, i * 10 + 1, "El contrato vigente, no el primero que aparece.");
        assert.equal(g.items.length, 2);
        const sede = SEDES_N[i % 3];
        g.items.forEach((it) => assert.equal(Math.floor(it.inventario_dotacion_id / 100), sede, "De la sede de su contrato."));
    });
    assert.equal(grupos[0].items[0].cantidad, 2);
});

test("al importar, otra sede solo se usa si la del contrato no maneja la prenda", () => {
    const inv = (id, sede_id, cantidad) => ({ id, proyecto: "DIRECTV", prenda: "Polo", genero: "Masculino", talla: "M", sede_id, cantidad });
    const grupo = (inventarioFlat, sede_id, Cantidad = 2) => agruparPedidosImportados(
        [{ Cedula: "1", Proyecto: "DIRECTV", Prenda: "Polo", Talla: "M", Cantidad }],
        { empleados: [{ id: 1, cedula: "1", genero: "Masculino" }], contratos: [{ id: 9, empleado_id: 1, estado_contrato: "Vigente", sede_id }], inventarioFlat },
    )[0];

    assert.equal(grupo([inv(1, 10, 5), inv(2, 20, 5)], 20).items[0].inventario_dotacion_id, 2);
    assert.equal(grupo([inv(1, 10, 1), inv(2, 20, 5)], 30).items[0].inventario_dotacion_id, 2, "Otra sede, con stock suficiente.");
    assert.equal(grupo([inv(1, 10, 0), inv(2, 20, 0)], 20).items[0].inventario_dotacion_id, 2, "Sin stock responde el servidor, con su mensaje.");
});

test("la dotación administrativa importada sale de la sede central", () => {
    const inv = (id, sede_id, sede_nombre) => ({ id, proyecto: "SYM ADMINISTRATIVO", prenda: "Carnet", genero: "Masculino", talla: "N/A", sede_id, sede_nombre, cantidad: 5 });
    const [g] = agruparPedidosImportados(
        [{ Cedula: "1", Proyecto: "SYM ADMINISTRATIVO", Prenda: "Carnet", Talla: "N/A", Cantidad: 1 }],
        { empleados: [{ id: 1, cedula: "1", genero: "Masculino" }], contratos: [{ id: 9, empleado_id: 1, estado_contrato: "Vigente", sede_id: 2 }], inventarioFlat: [inv(1, 2, "SYM CALI"), inv(2, 3, "SYM PEREIRA")] },
    );
    assert.equal(g.items[0].inventario_dotacion_id, 2);
});

test("las filas con problemas del Excel de pedidos dicen por qué", () => {
    const opciones = {
        empleados: [{ id: 1, cedula: "1", genero: "Masculino" }, { id: 2, cedula: "2", genero: "" }, { id: 3, cedula: "3", genero: "Masculino" }],
        contratos: [{ id: 9, empleado_id: 1, estado_contrato: "Vigente", sede_id: 1 }, { id: 8, empleado_id: 2, estado_contrato: "Vigente", sede_id: 1 }],
        inventarioFlat: [{ id: 5, proyecto: "DIRECTV", prenda: "Polo", genero: "Masculino", talla: "M", sede_id: 1, cantidad: 5 }],
    };
    const errores = (fila) => agruparPedidosImportados([{ Proyecto: "DIRECTV", Prenda: "Polo", Talla: "M", Cantidad: 1, ...fila }], opciones)[0].errores.join(" ");

    assert.match(errores({ Cedula: "99" }), /No se encontró un empleado/);
    assert.match(errores({ Cedula: "3" }), /no tiene contrato/);
    assert.match(errores({ Cedula: "2" }), /no tiene género/);
    assert.match(errores({ Cedula: "1", Prenda: "Inventada" }), /Fila 2: no se encontró "Inventada"/);
    assert.match(errores({ Cedula: "1", Cantidad: 0 }), /la cantidad no es válida/);
    assert.equal(errores({ Cedula: "1" }), "");
    assert.equal(agruparPedidosImportados([{ Cedula: "", Prenda: "Polo" }], opciones).length, 0);
});

test("en el pedido global cada proyecto y regional del mismo empleado es un pedido aparte", () => {
    const opciones = {
        empleados: [{ id: 1, cedula: "1", genero: "Masculino" }],
        contratos: [{ id: 9, empleado_id: 1, estado_contrato: "Vigente", sede_id: 1 }],
        inventarioFlat: [{ id: 5, proyecto: "DIRECTV", prenda: "Polo", genero: "Masculino", talla: "M", sede_id: 1, cantidad: 5 }],
        porProyectoYRegional: true,
    };
    const fila = (Regional) => ({ Cedula: "1", Proyecto: "DIRECTV", Regional, Prenda: "Polo", Talla: "M", Cantidad: 1 });

    const grupos = agruparPedidosImportados([fila("EJE CAFETERO"), fila("eje cafetero"), fila("ANTIOQUIA")], opciones);
    assert.deepEqual(grupos.map((g) => [g.regionalTexto, g.items.length, g.contrato_id]), [["EJE CAFETERO", 2, 9], ["ANTIOQUIA", 1, 9]]);
});

test("el Excel de la compra se lee en el importador de inventario y va ligado a su pedido", async () => {
    const linea = (prenda, talla) => ({ pedido: "00013", proyecto: "DIRECTV", sede: "SEDE FUERA DEL PROYECTO", prenda, genero: "Femenino", talla, cantidad: 1 });
    const crudas = await porExcel(filasExcelCompra([linea("Polo", "10 (M)"), linea("Pantalon", 32)]));

    assert.deepEqual(crudas.map((r) => leerFilaImportInventario(r, ["DIRECTV"], { DIRECTV: [] }, 10)), [
        { item: { proyecto: "DIRECTV", sede_id: null, prenda: "Polo", genero: "Femenino", talla: "10 (M)", cantidad: 1, stock_minimo: 10, pedido_codigo: "00013", sede_nombre: "SEDE FUERA DEL PROYECTO" } },
        { item: { proyecto: "DIRECTV", sede_id: null, prenda: "Pantalon", genero: "Femenino", talla: "32", cantidad: 1, stock_minimo: 10, pedido_codigo: "00013", sede_nombre: "SEDE FUERA DEL PROYECTO" } },
    ]);
});

test("si Excel convierte el código del pedido en número, se recupera", () => {
    const fila = { Pedido: 13, Proyecto: "DIRECTV", Sede: "X", Prenda: "Polo", Género: "Masculino", Talla: "M", Cantidad: 1 };
    assert.equal(leerFilaImportInventario(fila, ["DIRECTV"], {}, 10).item.pedido_codigo, "00013");
    assert.equal(leerFilaImportInventario({ ...fila, Pedido: "" }, ["DIRECTV"], {}, 10).motivos[0], "sede inválida para el proyecto");
});

test("sin nada por comprar el Excel de la compra queda vacío", () => {
    assert.deepEqual(filasExcelCompra([]), []);
    assert.deepEqual(filasExcelCompra(undefined), []);
});

test("en Pedidos automáticos no aparece Enviar a compras: se ve Completado", () => {
    assert.equal(estadoEnPedidosAutomaticos("Enviar a compras"), "Completado");
    for (const estado of ["Pendiente", "Activo", "Completado", "Cancelado", "Devolución"]) {
        assert.equal(estadoEnPedidosAutomaticos(estado), estado);
    }
});

test("el formulario nunca ofrece Enviar a compras, y guardar no saca el pedido de Compras", () => {
    const ESTADOS = ["Pendiente", "Activo", "Completado", "Cancelado"];
    const LABEL = { Pendiente: "Pendiente", Activo: "En proceso", Completado: "Completado", Cancelado: "Cancelado" };

    const normal = opcionesEstadoPedido("Activo", ESTADOS, LABEL);
    assert.deepEqual(normal.map((o) => o.value), ESTADOS);

    const enCompras = opcionesEstadoPedido("Enviar a compras", ESTADOS, LABEL);
    assert.deepEqual(enCompras.map((o) => o.label), ["Pendiente", "En proceso", "Completado", "Cancelado"]);
    assert.ok(!enCompras.some((o) => o.label === "Enviar a compras"));
    assert.equal(enCompras.find((o) => o.label === "Completado").value, "Enviar a compras");
});

test("el contrato vigente es el activo más reciente, y si no hay activo el más reciente", () => {
    const c = (id, estado_contrato, fecha_ingreso) => ({ id, empleado_id: 1, estado_contrato, fecha_ingreso });
    assert.equal(contratoVigenteDe([c(1, "Finalizado", "2026-01-01"), c(2, "Vigente", "2020-01-01"), c(3, "Vigente", "2021-01-01")], 1).id, 3);
    assert.equal(contratoVigenteDe([c(1, "Finalizado", "2020-01-01"), c(2, "Finalizado", "2021-01-01")], 1).id, 2);
    assert.equal(contratoVigenteDe([c(1, "Vigente", "2020-01-01")], 2), null);
});

const PROYECTOS = ["DIRECTV", "SYM TIGO EXPRESS"];
const SEDES = { DIRECTV: [{ id: 7, nombre: "SERVIMERCADEO CALI" }], "SYM TIGO EXPRESS": [{ id: 9, nombre: "TIGO EXPRESS BELLO" }] };
const leer = (fila) => leerFilaImportInventario(fila, PROYECTOS, SEDES, 10);
const base = { Proyecto: "DIRECTV", Sede: "SERVIMERCADEO CALI", Prenda: "Polo Gris Administrativa", Género: "Masculino", Talla: "M", Cantidad: 5 };

test("el Excel exportado se puede volver a importar con los mismos datos", async () => {
    const XLSX = await import("xlsx");
    const filas = [
        { proyecto: "DIRECTV", sede_nombre: "SERVIMERCADEO CALI", prenda: "Pantalon Comercial", genero: "Femenino", talla: "32", precio: 1000, cantidad: 4, stock_minimo: 1 },
        { proyecto: "SYM TIGO EXPRESS", sede_nombre: "TIGO EXPRESS BELLO", prenda: "Polo Mc Azul Tigo Express", genero: "Femenino", talla: "16 (2XL)", precio: 0, cantidad: 0, stock_minimo: 0 },
    ];
    const ws = XLSX.utils.json_to_sheet(filas.map((f) => filaExportInventario(f, "OK")));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    const leido = XLSX.read(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
    const crudas = XLSX.utils.sheet_to_json(leido.Sheets.Inventario, { defval: "" });

    assert.deepEqual(crudas.map((r) => leer(r).item), [
        { proyecto: "DIRECTV", sede_id: 7, prenda: "Pantalon Comercial", genero: "Femenino", talla: "32", cantidad: 4, stock_minimo: 10 },
        { proyecto: "SYM TIGO EXPRESS", sede_id: 9, prenda: "Polo Mc Azul Tigo Express", genero: "Femenino", talla: "16 (2XL)", cantidad: 0, stock_minimo: 10 },
    ]);
});

test("una talla numérica del Excel se importa como texto", () => {
    assert.equal(leer({ ...base, Talla: 32 }).item.talla, "32");
    assert.equal(leer({ ...base, Talla: 0 }).item.talla, "0");
});

test("los encabezados no dependen de tildes ni mayúsculas, y lo extra se ignora", () => {
    const { item } = leer({ PROYECTO: "DIRECTV", " sede ": "servimercadeo cali", prenda: " Polo ", genero: "Femenino", TALLA: "M", cantidad: "3", Precio: 999, Estado: "OK" });
    assert.deepEqual(item, { proyecto: "DIRECTV", sede_id: 7, prenda: "Polo", genero: "Femenino", talla: "M", cantidad: 3, stock_minimo: 10 });
});

test("una fila inválida del Excel dice por qué", () => {
    assert.deepEqual(leer({ ...base, Proyecto: "TIGO" }).motivos, ["proyecto inválido"]);
    assert.deepEqual(leer({ ...base, Prenda: "" }).motivos, ["prenda vacía"]);
    assert.deepEqual(leer({ ...base, Género: "Otro" }).motivos, ["género inválido"]);
    assert.deepEqual(leer({ ...base, Talla: "" }).motivos, ["talla vacía"]);
    assert.deepEqual(leer({ ...base, Sede: "" }).motivos, ["sede vacía"]);
    assert.deepEqual(leer({ ...base, Sede: "TIGO EXPRESS BELLO" }).motivos, ["sede inválida para el proyecto"]);
    for (const cantidad of [-1, 1.5, "abc", ""]) {
        assert.deepEqual(leer({ ...base, Cantidad: cantidad }).motivos, ["cantidad inválida"], String(cantidad));
    }
    assert.equal(leer({ ...base, Proyecto: "X", Prenda: "", Género: "", Talla: "", Cantidad: "", Sede: "" }).motivos.length, 6);
});

test("cada proyecto del contrato usa su inventario de dotación", () => {
    assert.equal(proyectoInventarioDe("TIGO EXPRESS"), "SYM TIGO EXPRESS");
    assert.equal(proyectoInventarioDe("TIGO HOME"), "SYM TIGO HOME");
    assert.equal(proyectoInventarioDe("DIRECTV"), "DIRECTV");
    assert.equal(proyectoInventarioDe("directv "), "DIRECTV");
    assert.equal(proyectoInventarioDe("HUGHES COL"), "DIRECTV");
    assert.equal(proyectoInventarioDe("FT&H"), "DIRECTV");
    assert.equal(proyectoInventarioDe("ADMINISTRATIVO"), "SYM ADMINISTRATIVO");
    assert.equal(proyectoInventarioDe("S&M ASESORES"), "SYM ADMINISTRATIVO");
    assert.equal(proyectoInventarioDe(""), null);
    assert.equal(proyectoInventarioDe(null), null);
});

test("los nombres viejos de un proyecto siguen funcionando", () => {
    assert.equal(proyectoInventarioDe("DIRECTV CO"), "DIRECTV");
    assert.equal(proyectoInventarioDe("DIRECTV COL"), "DIRECTV");
    assert.equal(proyectoInventarioDe("ADMINISTRACION"), "SYM ADMINISTRATIVO");
});

test("el kit de Tigo incluye prendas de otros inventarios y el de DIRECTV no", () => {
    assert.deepEqual(inventariosPermitidos("SYM TIGO EXPRESS"), ["SYM TIGO EXPRESS", "SYM ADMINISTRATIVO"]);
    assert.deepEqual(inventariosPermitidos("SYM TIGO HOME"), ["SYM TIGO HOME", "SYM ADMINISTRATIVO"]);
    assert.deepEqual(inventariosPermitidos("DIRECTV"), ["DIRECTV"]);
    assert.deepEqual(inventariosPermitidos("SYM ADMINISTRATIVO"), ["SYM ADMINISTRATIVO"]);
    assert.deepEqual(inventariosPermitidos(null), []);
});

test("las tallas del formulario coinciden con las del inventario", () => {
    assert.ok(mismaTalla("M", "10 (M)"));
    assert.ok(mismaTalla("10 (M)", "M"));
    assert.ok(mismaTalla("XXL", "2XL"));
    assert.ok(mismaTalla("xxl", "16 (2XL)"));
    assert.ok(mismaTalla("XXXL", "3XL"));
    assert.ok(mismaTalla("XS", "6 (XS)"));
    assert.ok(mismaTalla("32", "32"));
    assert.ok(!mismaTalla("M", "L"));
    assert.ok(!mismaTalla("XL", "2XL"));
    assert.ok(!mismaTalla("10", "10 (M)"), "El 10 de pantalón no es la talla M de polo.");
    assert.deepEqual(tallasEquivalentes("XXL"), ["XXL", "2XL", "16 (2XL)"]);
    assert.deepEqual(tallasEquivalentes("32"), ["32"]);
});
