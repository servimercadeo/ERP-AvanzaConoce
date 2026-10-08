import test from "node:test";
import assert from "node:assert/strict";
import { ERP_MODULES, canAccessArchivo, canAccessModule, canAccessSubmodule } from "../data/erpModules.js";
import { claveDeFila, construirCatalogo, normalizar } from "./permisosMatriz.js";

const catalogo = construirCatalogo(ERP_MODULES);
const set = (...filas) => new Set(filas.map((f) => claveDeFila({ archivo_id: "", ...f })));
const fila = (submodulo_id, archivo_id = "") => ({ rol: "th", modulo_id: "administrativo", submodulo_id, archivo_id });
const SELECCION = ["proceso_seleccion", "candidatos", "base_ingreso"];

test("el catálogo trae las pestañas de cada submódulo", () => {
    const admin = catalogo.find((m) => m.id === "administrativo");
    const seleccion = admin.objetivos.find((o) => o.id === "seleccion");
    assert.deepEqual(seleccion.archivos.map((a) => a.id), SELECCION);
});

test("ocultar algunas pestañas guarda una fila por pestaña", () => {
    const filas = normalizar(set(fila("seleccion", "base_ingreso")), catalogo);
    assert.deepEqual(filas, [fila("seleccion", "base_ingreso")]);
});

test("ocultar todas las pestañas se guarda como el submódulo completo", () => {
    const filas = normalizar(set(...SELECCION.map((a) => fila("seleccion", a))), catalogo);
    assert.deepEqual(filas, [fila("seleccion")]);
});

test("las filas de submódulo de antes se conservan y lo desconocido no se pierde", () => {
    const viejas = set(fila("seleccion"), { rol: "th", modulo_id: "otro", submodulo_id: "x" });
    const filas = normalizar(viejas, catalogo).map(claveDeFila).sort();
    assert.deepEqual(filas, [claveDeFila(fila("seleccion")), "th::otro::x::"].sort());
});

test("el menú oculta solo la pestaña denegada", () => {
    const user = { rol: "th", permisos_denegados: [fila("seleccion", "base_ingreso")] };
    assert.equal(canAccessSubmodule(user, "administrativo", "seleccion"), true);
    assert.equal(canAccessArchivo(user, "administrativo", "seleccion", "base_ingreso"), false);
    assert.equal(canAccessArchivo(user, "administrativo", "seleccion", "candidatos"), true);
});

test("sin ninguna pestaña visible el submódulo desaparece", () => {
    const user = { rol: "th", permisos_denegados: SELECCION.map((a) => fila("seleccion", a)) };
    assert.equal(canAccessSubmodule(user, "administrativo", "seleccion"), false);
    assert.equal(canAccessModule(user, "administrativo"), true);
});

test("negar el submódulo niega sus pestañas; admin siempre ve todo", () => {
    const user = { rol: "th", permisos_denegados: [{ ...fila("seleccion"), archivo_id: undefined }] };
    assert.equal(canAccessArchivo(user, "administrativo", "seleccion", "candidatos"), false);
    const admin = { rol: "admin", permisos_denegados: [fila("seleccion", "candidatos")] };
    assert.equal(canAccessArchivo(admin, "administrativo", "seleccion", "candidatos"), true);
});
