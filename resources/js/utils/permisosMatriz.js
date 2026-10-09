// Lógica de la matriz del módulo Permisos (sin interfaz, para poder probarla aparte).
import { ACCIONES, SUBMODULO_RAIZ } from "../data/erpModules.js";

export const ROLES = [
    { value: "th", label: "Talento Humano" },
    { value: "tic", label: "TIC / Sistemas" },
    { value: "operaciones", label: "Operaciones" },
    { value: "financiera", label: "Financiera" },
    { value: "supervisores", label: "Supervisores" },
    { value: "general", label: "General" },
];

// Catálogo real de módulos, submódulos y pestañas (los mismos que arman el menú, incluidas
// las categorías de inventario creadas en Parametros), con un objetivo pseudo-submódulo
// (SUBMODULO_RAIZ) por cada módulo que tenga pestañas propias fuera de cualquier submódulo
// (ej. "Sedes" en Sedes).
export function construirCatalogo(modulos) {
    return modulos.map((mod) => {
        const objetivos = [
            ...(mod.submods ?? []).map((s) => ({ id: s.id, label: s.label, archivos: s.archivos ?? [] })),
            ...((mod.archivos?.length ?? 0) > 0
                ? [{ id: SUBMODULO_RAIZ, label: "Archivos generales del módulo", archivos: mod.archivos }]
                : []),
        ];
        return { id: mod.id, label: mod.label, icon: mod.icon, objetivos };
    }).filter((mod) => mod.objetivos.length > 0);
}

// "rol::modulo::submodulo::archivo" presente = denegado (oculto). Archivo vacío = todo el
// submódulo, que es como se guarda cuando se le quitan todas las pestañas. Con
// "::accion" al final, la pestaña se ve pero esa acción (crear, editar...) queda negada.
export const clave = (rol, moduloId, submoduloId, archivoId = "", accion = "") =>
    `${rol}::${moduloId}::${submoduloId}::${archivoId}` + (accion ? `::${accion}` : "");
export const claveDeFila = (f) => clave(f.rol, f.modulo_id, f.submodulo_id, f.archivo_id ?? "", f.accion ?? "");

// Pestañas que se controlan una por una: solo si el submódulo tiene más de una (con una
// sola, el check del submódulo ya es el de su única pestaña).
export const pestanasDe = (obj) => (obj.archivos.length > 1 ? obj.archivos : []);

// Dónde se marcan las acciones de un submódulo: en cada pestaña si se controlan una por
// una; si no, en el propio submódulo (archivoId "") con las acciones de su única pestaña.
export function destinosDeAccion(obj) {
    const pestanas = pestanasDe(obj);
    if (pestanas.length > 0) return pestanas.map((a) => ({ archivoId: a.id, acciones: a.acciones ?? [] }));
    return [{ archivoId: "", acciones: obj.archivos[0]?.acciones ?? [] }];
}

/**
 * Lo que se manda al servidor: si un submódulo quedó con todas sus pestañas ocultas se
 * guarda como una sola fila del submódulo (así lo cierra también en el servidor y en el
 * menú); si solo algunas, una fila por pestaña. Lo que no esté en el catálogo se conserva.
 */
export function normalizar(denegados, catalogo) {
    const filas = new Map();
    const agregar = (rol, modulo_id, submodulo_id, archivo_id = "", accion = "") =>
        filas.set(clave(rol, modulo_id, submodulo_id, archivo_id, accion), { rol, modulo_id, submodulo_id, archivo_id, accion });

    const conocidos = new Set();
    ROLES.forEach(({ value: rol }) => {
        catalogo.forEach((mod) => mod.objetivos.forEach((obj) => {
            const pestanas = pestanasDe(obj);
            const todo = denegados.has(clave(rol, mod.id, obj.id));
            conocidos.add(clave(rol, mod.id, obj.id));
            obj.archivos.forEach((a) => conocidos.add(clave(rol, mod.id, obj.id, a.id)));

            // Acciones negadas: solo las que la pestaña declara y mientras siga visible (una
            // pestaña oculta no necesita filas de acciones; una acción que la pestaña ya no
            // declara tampoco, porque la matriz no deja desmarcarla).
            destinosDeAccion(obj).forEach(({ archivoId, acciones }) => {
                const oculto = todo || (archivoId !== "" && denegados.has(clave(rol, mod.id, obj.id, archivoId)));
                ACCIONES.forEach(({ id: accion }) => {
                    const k = clave(rol, mod.id, obj.id, archivoId, accion);
                    conocidos.add(k);
                    if (!oculto && acciones.includes(accion) && denegados.has(k)) agregar(rol, mod.id, obj.id, archivoId, accion);
                });
            });

            if (pestanas.length === 0) {
                if (todo) agregar(rol, mod.id, obj.id);
                return;
            }
            const ocultas = pestanas.filter((a) => todo || denegados.has(clave(rol, mod.id, obj.id, a.id)));
            if (ocultas.length === pestanas.length) agregar(rol, mod.id, obj.id);
            else ocultas.forEach((a) => agregar(rol, mod.id, obj.id, a.id));
        }));
    });

    denegados.forEach((k) => {
        if (conocidos.has(k)) return;
        const [rol, modulo_id, submodulo_id, archivo_id = "", accion = ""] = k.split("::");
        agregar(rol, modulo_id, submodulo_id, archivo_id, accion);
    });
    return [...filas.values()];
}

export const firma = (filas) => filas.map(claveDeFila).sort().join("|");
