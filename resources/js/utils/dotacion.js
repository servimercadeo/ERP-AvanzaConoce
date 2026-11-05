// Reglas de dotación compartidas por las pantallas (sin interfaz, para poder probarlas aparte).
// Son las mismas del servidor: PedidoAutomatico e InventarioDotacion.

// Proyecto del contrato (tabla `proyectos`) => proyecto del inventario de dotación. Lo que no
// está aquí usa la dotación administrativa. HUGHES y FT&H usan la dotación de técnico de DIRECTV.
const PROYECTO_A_INVENTARIO = {
    "TIGO EXPRESS": "SYM TIGO EXPRESS",
    "TIGO HOME": "SYM TIGO HOME",
    DIRECTV: "DIRECTV",
    "DIRECTV ECU": "DIRECTV",
    "HUGHES COL": "DIRECTV",
    "HUGHES ECU": "DIRECTV",
    "FT&H": "DIRECTV",
};

// Nombres anteriores de un proyecto (EmpresaProyectoRules::ALIAS_PROYECTO).
const ALIAS_PROYECTO = {
    ADMINISTRACION: "ADMINISTRATIVO",
    "DIRECTV CO": "DIRECTV",
    "DIRECTV COL": "DIRECTV",
};

// Otros inventarios cuyas prendas hacen parte del kit: el carnet y la gorra de Tigo salen de
// SYM ADMINISTRATIVO, y el supervisor comercial de Tigo Home usa los polos de Tigo Express.
const INVENTARIOS_DEL_KIT = {
    "SYM TIGO EXPRESS": ["SYM ADMINISTRATIVO"],
    "SYM TIGO HOME": ["SYM ADMINISTRATIVO"],
};

export const proyectoInventarioDe = (nombreProyecto) => {
    const nombre = String(nombreProyecto ?? "").trim().toUpperCase();
    if (!nombre) return null;
    return PROYECTO_A_INVENTARIO[ALIAS_PROYECTO[nombre] ?? nombre] ?? "SYM ADMINISTRATIVO";
};

// Inventarios de los que se le puede asignar dotación a ese proyecto de inventario.
export const inventariosPermitidos = (proyectoInventario) =>
    proyectoInventario ? [proyectoInventario, ...(INVENTARIOS_DEL_KIT[proyectoInventario] ?? [])] : [];

// La misma talla escrita de distintas formas: el formulario de ingreso usa XS...XXXL y el
// inventario 2XL/3XL, o "10 (M)" en las prendas femeninas de Tigo.
const TALLAS_EQUIVALENTES = [
    ["XS", "6 (XS)"],
    ["S", "8 (S)"],
    ["M", "10 (M)"],
    ["L", "12 (L)"],
    ["XL", "14 (XL)"],
    ["2XL", "XXL", "16 (2XL)"],
    ["3XL", "XXXL", "18 (3XL)"],
    ["4XL", "20 (4XL)"],
];

// La talla dada primero y luego sus equivalentes.
export const tallasEquivalentes = (talla) => {
    const t = String(talla ?? "").trim();
    const grupo = TALLAS_EQUIVALENTES.find((g) => g.includes(t.toUpperCase()));
    return grupo ? [...new Set([t, ...grupo])] : [t];
};

export const mismaTalla = (a, b) => {
    const objetivo = String(b ?? "").trim().toUpperCase();
    return tallasEquivalentes(a).some((t) => t.toUpperCase() === objetivo);
};

// En Pedidos automáticos no existe "Enviar a compras": eso se decide en Pedidos globales, y aquí
// ese pedido sigue viéndose Completado (su estado real no cambia, sigue en Compras).
export const estadoEnPedidosAutomaticos = (estado) => (estado === "Enviar a compras" ? "Completado" : estado);

// Opciones del estado en el formulario, cada una { value, label }. Un pedido que ya está en
// Compras conserva su valor real, para que guardarlo no lo saque de allá.
export const opcionesEstadoPedido = (estadoActual, estados, etiquetas) =>
    estados.map((s) => (s === "Completado" && estadoActual === "Enviar a compras"
        ? { value: estadoActual, label: etiquetas[s] ?? s }
        : { value: s, label: etiquetas[s] ?? s }));

// Contrato vigente del empleado: el activo más reciente (si no hay activo, el más reciente).
// De él salen el proyecto y la sede de la dotación que se le puede asignar.
export const contratoVigenteDe = (contratos, empleadoId) => {
    const suyos = contratos.filter((c) => String(c.empleado_id) === String(empleadoId));
    const reciente = (a, b) =>
        String(b.fecha_ingreso ?? "").localeCompare(String(a.fecha_ingreso ?? "")) || (b.id ?? 0) - (a.id ?? 0);
    return (
        // "Vigente" (antes "Activo").
        suyos.filter((c) => ["Vigente", "Activo"].includes(c.estado_contrato)).sort(reciente)[0] ??
        suyos.sort(reciente)[0] ??
        null
    );
};

// ─── Importar pedidos de dotación por Excel ──────────────────────────────────
const SEDE_CENTRAL_ADMINISTRATIVA = "SYM PEREIRA"; // DotacionAutoPedidoService

const claveInventario = (proyecto, prenda, talla, genero) =>
    `${proyecto}|${prenda}|${String(talla).toLowerCase()}|${genero}`;

// Índice de inventarioFlat para no escanear las ~8-9 mil filas por cada fila del Excel: cada
// clave guarda la prenda en todas sus sedes.
export function buildInventarioIndex(inventarioFlat) {
    const idx = new Map();
    for (const i of inventarioFlat) {
        const key = claveInventario(i.proyecto, i.prenda, i.talla, i.genero);
        if (!idx.has(key)) idx.set(key, []);
        idx.get(key).push(i);
    }
    return idx;
}

/**
 * La fila de inventario de la que debe salir la prenda: la de la sede del contrato (la dotación
 * administrativa sale de la sede central) y, si ahí no hay, otra sede con stock suficiente.
 */
export function lookupInventario(idx, proyecto, prenda, talla, genero, sedeId = null, cantidad = 1) {
    const filas = tallasEquivalentes(talla).flatMap((t) => idx.get(claveInventario(proyecto, prenda, t, genero)) ?? []);
    if (filas.length === 0) return null;
    const central = proyecto === "SYM ADMINISTRATIVO" ? filas.find((f) => f.sede_nombre === SEDE_CENTRAL_ADMINISTRATIVA) : null;
    return (
        central ??
        filas.find((f) => String(f.sede_id) === String(sedeId)) ??
        filas.find((f) => f.cantidad >= cantidad) ??
        filas[0]
    );
}

const PEDIDO_HEADER_MAP = {
    cedula: "cedula",
    regional: "regional",
    proyecto: "proyecto",
    prenda: "prenda",
    talla: "talla",
    cantidad: "cantidad",
};

const normalizeHeaderPedido = (s) =>
    (s ?? "").toString().normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "").toLowerCase().trim();

/**
 * Filas del Excel => un pedido por empleado (o por empleado + proyecto + regional, con
 * `porProyectoYRegional`, porque cada combinación termina en su propio pedido global), ligado
 * al contrato vigente del empleado y con sus prendas de la sede de ese contrato.
 */
export function agruparPedidosImportados(raw, { empleados, contratos, inventarioFlat, porProyectoYRegional = false }) {
    const empleadoPorCedula = new Map(empleados.map((e) => [String(e.cedula), e]));
    const contratosPorEmpleado = new Map();
    for (const c of contratos) {
        const k = String(c.empleado_id);
        if (!contratosPorEmpleado.has(k)) contratosPorEmpleado.set(k, []);
        contratosPorEmpleado.get(k).push(c);
    }
    const invIndex = buildInventarioIndex(inventarioFlat);
    const grupos = new Map();

    raw.forEach((row, idx) => {
        const fila = {};
        Object.entries(row).forEach(([k, v]) => {
            const key = PEDIDO_HEADER_MAP[normalizeHeaderPedido(k)];
            if (key) fila[key] = typeof v === "string" ? v.trim() : v;
        });

        const cedula = String(fila.cedula ?? "").trim();
        if (!cedula) return;
        const proyecto = String(fila.proyecto ?? "").trim();
        const regionalTexto = String(fila.regional ?? "").trim();
        const key = porProyectoYRegional ? `${cedula}|${proyecto}|${normalizeHeaderPedido(regionalTexto)}` : cedula;

        if (!grupos.has(key)) {
            const empleado = empleadoPorCedula.get(cedula) ?? null;
            const contrato = empleado ? contratoVigenteDe(contratosPorEmpleado.get(String(empleado.id)) ?? [], empleado.id) : null;
            grupos.set(key, { cedula, proyecto, regionalTexto, empleado, contrato, contrato_id: contrato?.id ?? null, items: [], erroresItems: [] });
        }
        const grupo = grupos.get(key);
        if (!fila.prenda && !proyecto) return;

        const cantidad = Number(fila.cantidad) || 0;
        const inv = lookupInventario(invIndex, proyecto, fila.prenda, fila.talla ?? "", grupo.empleado?.genero ?? "", grupo.contrato?.sede_id, cantidad);
        if (!inv || cantidad <= 0) {
            grupo.erroresItems.push(
                `Fila ${idx + 2}: no se encontró "${fila.prenda ?? ""}" (${proyecto}, talla ${fila.talla ?? ""}) para el género del empleado, o la cantidad no es válida.`,
            );
            return;
        }
        grupo.items.push({
            inventario_dotacion_id: inv.id,
            cantidad,
            descripcion: `${inv.prenda} · ${inv.genero} · T:${inv.talla} x${cantidad}`,
        });
    });

    return [...grupos.values()].map((g) => {
        const errores = [...g.erroresItems];
        if (!g.empleado) errores.unshift(`No se encontró un empleado con cédula "${g.cedula}".`);
        else if (!g.contrato) errores.unshift(`El empleado ${g.cedula} no tiene contrato; no se le puede crear un pedido de dotación.`);
        else if (!g.empleado.genero) errores.unshift(`El empleado ${g.cedula} no tiene género registrado; no se le pueden asignar prendas.`);
        return { ...g, errores };
    });
}

// ─── Importar y exportar el inventario de dotación ───────────────────────────
const GENEROS = ["Masculino", "Femenino"];

// Filas del Excel de una Orden de Compra (las calcula el servidor), en el formato del importador
// de inventario, más la columna Pedido para asignársela al pedido que la pidió.
export const filasExcelCompra = (lineas) =>
    (lineas ?? []).map((l) => ({
        Pedido: l.pedido,
        Proyecto: l.proyecto,
        Sede: l.sede,
        Prenda: l.prenda,
        Género: l.genero,
        Talla: l.talla,
        Cantidad: l.cantidad,
    }));

const IMPORT_HEADER_MAP = {
    pedido: "pedido",
    proyecto: "proyecto",
    sede: "sede",
    prenda: "prenda",
    genero: "genero",
    talla: "talla",
    cantidad: "cantidad",
};

const normalizeHeader = (s) =>
    (s ?? "").toString().normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "").toLowerCase().trim();

// Una fila de inventario como columnas del Excel exportado.
export const filaExportInventario = (i, estadoStock) => ({
    Proyecto: i.proyecto,
    Sede: i.sede_nombre ?? "",
    Prenda: i.prenda,
    Género: i.genero,
    Talla: i.talla,
    Precio: Number(i.precio ?? 0),
    Cantidad: i.cantidad,
    "Stock mínimo": i.stock_minimo,
    Estado: estadoStock,
});

/**
 * Una fila del Excel importado: { item } para enviar al servidor, o { motivos } si no sirve.
 * La sede es obligatoria: una prenda sin sede no se puede asignar en ningún pedido.
 */
export function leerFilaImportInventario(row, proyectos, sedesPorProyecto, stockMinimo) {
    const mapped = {};
    Object.entries(row).forEach(([k, v]) => {
        const key = IMPORT_HEADER_MAP[normalizeHeader(k)];
        if (key) mapped[key] = typeof v === "string" ? v.trim() : v;
    });

    const motivos = [];
    if (!proyectos.includes(mapped.proyecto)) motivos.push("proyecto inválido");
    if (!mapped.prenda) motivos.push("prenda vacía");
    if (!GENEROS.includes(mapped.genero)) motivos.push("género inválido");
    if (!mapped.talla && mapped.talla !== 0) motivos.push("talla vacía");
    const cantidad = Number(mapped.cantidad);
    if (mapped.cantidad === "" || mapped.cantidad === undefined || !Number.isInteger(cantidad) || cantidad < 0) {
        motivos.push("cantidad inválida");
    }

    // Fila de una compra: Excel puede convertir "00013" en el número 13.
    const pedidoCodigo = String(mapped.pedido ?? "").trim() ? String(mapped.pedido).trim().padStart(5, "0") : null;

    let sedeId = null;
    const sedeTexto = (mapped.sede ?? "").toString().trim();
    if (!sedeTexto) {
        motivos.push("sede vacía");
    } else if (!pedidoCodigo && proyectos.includes(mapped.proyecto)) {
        // La sede de una compra la resuelve el servidor: puede no ser del proyecto (el pedido
        // creó esa fila porque el contrato está en esa sede).
        const sede = (sedesPorProyecto?.[mapped.proyecto] ?? []).find(
            (s) => s.nombre.toLowerCase() === sedeTexto.toLowerCase(),
        );
        if (sede) sedeId = sede.id;
        else motivos.push("sede inválida para el proyecto");
    }

    if (motivos.length) return { motivos };
    return {
        item: {
            proyecto: mapped.proyecto,
            sede_id: sedeId,
            prenda: mapped.prenda,
            genero: mapped.genero,
            talla: String(mapped.talla),
            cantidad,
            stock_minimo: stockMinimo,
            ...(pedidoCodigo ? { pedido_codigo: pedidoCodigo, sede_nombre: sedeTexto } : {}),
        },
    };
}
