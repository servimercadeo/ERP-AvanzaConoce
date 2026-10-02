import { descargarExcel, fechaArchivo } from "./excelExport.js";

/*
 * Motor genérico para "rellenar datos faltantes desde Excel" (Empleados, Contratos, …).
 * Cada módulo define su propia lista de columnas importables (título visible + nombre
 * de campo del backend) y usa `crearParser`/`crearDescargaPlantilla` para obtener las
 * funciones concretas — ver empleadosImport.js y contratosImportDatos.js.
 *
 * El contrato de cada columna es: { titulo, campo, requerido?, tipo? }.
 * `tipo: "fecha"` activa la decodificación segura de fechas de Excel (ver más abajo).
 * Debe existir exactamente una columna con `requerido: true`: es la clave con la que el
 * backend busca el registro a actualizar (cédula, documento, etc.).
 */

export function normalizarTitulo(s) {
    return String(s ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[.°º]/g, "")
        .trim()
        .replace(/\s+/g, " ");
}

// "Fecha Nacimiento" / "Fecha Vinculación ARL" / etc.: si la celda es una fecha real de
// Excel, `sheet_to_json` en modo texto la formatea según el formato numérico de ESA
// celda (que puede venir en d/m/aaaa, m/d/aaaa, etc. según cómo la haya guardado quien
// armó el archivo) — no se puede confiar en ese texto. Por eso el valor crudo (número
// de serie o texto) se decodifica aquí mismo con SSF, que da el mismo resultado sin
// importar el formato visual de la celda.
// El export escribe "Sí"/"No" (ver excelExport.js:aBooleano) — se acepta ese texto de
// vuelta, además de variantes sueltas (1/0, true/false) por si el archivo viene de otra
// fuente. Cualquier otro valor se descarta (no se adivina) en vez de escribir basura.
function normalizarBooleano(valorCrudo) {
    if (typeof valorCrudo === "boolean") return valorCrudo;
    const texto = String(valorCrudo ?? "").trim().toLowerCase();
    if (["1", "true", "si", "sí"].includes(texto)) return true;
    if (["0", "false", "no"].includes(texto)) return false;
    return null;
}

function normalizarFecha(valorCrudo, XLSX) {
    if (valorCrudo === null || valorCrudo === undefined || valorCrudo === "") return null;
    if (typeof valorCrudo === "number") {
        try {
            return XLSX.SSF.format("yyyy-mm-dd", valorCrudo);
        } catch {
            return null;
        }
    }
    const texto = String(valorCrudo).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
    // d/m/aaaa o dd/mm/aaaa (convención colombiana) — también acepta '-' como separador.
    const m = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) {
        const [, d, mo, y] = m;
        return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return texto || null;
}

/** Descarga una plantilla .xlsx vacía con exactamente las columnas dadas. */
export function crearDescargaPlantilla(columnas, nombreBase) {
    return () => {
        const hoja = {
            nombre: "Plantilla",
            columnas: columnas.map((c) => ({
                titulo: c.titulo,
                tipo: "texto",
                ancho: Math.max(14, c.titulo.length + 2),
                valor: () => null,
            })),
            filas: [],
        };
        return descargarExcel([hoja], `${nombreBase}_${fechaArchivo()}.xlsx`);
    };
}

/**
 * Crea la función de parseo para un set de columnas dado. El resultado lee un archivo
 * .xlsx/.xls/.csv y devuelve { filas, columnasReconocidas, columnasNoReconocidas,
 * totalFilasLeidas }. `filas` son objetos { [campoClave]: valor, campo1, campo2, ... }
 * con solo los campos reconocidos y no vacíos, más `_camposConDato` (para la vista
 * previa) — el backend decide, campo por campo, si el valor actual ya existe y en ese
 * caso no lo toca.
 */
export function crearParser(columnas) {
    const columnaClave = columnas.find((c) => c.requerido);
    if (!columnaClave) {
        throw new Error("crearParser: debe haber exactamente una columna requerida (la clave de búsqueda).");
    }
    const mapaNormalizado = new Map(columnas.map((c) => [normalizarTitulo(c.titulo), c]));

    return async function parsearArchivoImportacion(file) {
        // La interoperabilidad CJS/ESM de este paquete es inconsistente entre bundlers:
        // a veces expone sus propiedades (como SSF) solo bajo `.default`. Normalizar
        // aquí evita que, según el entorno, `XLSX.SSF` termine siendo undefined en silencio.
        const mod = await import("xlsx");
        const XLSX = mod.default ?? mod;
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const primeraHoja = wb.SheetNames[0];
        if (!primeraHoja) {
            throw new Error("El archivo no tiene hojas con datos.");
        }
        const ws = wb.Sheets[primeraHoja];
        // raw:true → los valores llegan tal cual los guarda la celda (texto, número, o
        // número de serie para fechas), sin pasar por el formato visual de esa celda.
        const filasCrudas = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });

        if (!filasCrudas.length) {
            throw new Error("La hoja no tiene filas de datos (solo encabezado o está vacía).");
        }

        const encabezados = Object.keys(filasCrudas[0]);
        const columnaClaveEncabezado = encabezados.find(
            (h) => normalizarTitulo(h) === normalizarTitulo(columnaClave.titulo),
        );
        if (!columnaClaveEncabezado) {
            throw new Error(`No se encontró la columna "${columnaClave.titulo}" en el archivo.`);
        }

        const columnasReconocidas = new Set();
        const columnasNoReconocidas = new Set();
        encabezados.forEach((h) => {
            const def = mapaNormalizado.get(normalizarTitulo(h));
            if (def) columnasReconocidas.add(def.titulo);
            else columnasNoReconocidas.add(h);
        });

        const filas = [];
        filasCrudas.forEach((filaCruda) => {
            const clave = String(filaCruda[columnaClaveEncabezado] ?? "").trim();
            if (!clave) return;

            const fila = { [columnaClave.campo]: clave };
            encabezados.forEach((h) => {
                const def = mapaNormalizado.get(normalizarTitulo(h));
                if (!def || def.campo === columnaClave.campo) return;
                let valorCrudo = filaCruda[h];
                if (valorCrudo === null || valorCrudo === undefined || valorCrudo === "") return;

                let valor;
                if (def.tipo === "fecha") {
                    valor = normalizarFecha(valorCrudo, XLSX);
                } else if (def.tipo === "booleano") {
                    valor = normalizarBooleano(valorCrudo);
                } else {
                    valor = String(valorCrudo).trim();
                }
                // `false` es un valor real (no vacío) y debe conservarse; solo
                // null/undefined/"" se descartan.
                if (valor === null || valor === undefined || valor === "") return;
                fila[def.campo] = valor;
            });

            fila._camposConDato = Object.keys(fila).filter(
                (k) => k !== columnaClave.campo && k !== "_camposConDato",
            );
            filas.push(fila);
        });

        return {
            filas,
            columnasReconocidas: Array.from(columnasReconocidas),
            columnasNoReconocidas: Array.from(columnasNoReconocidas),
            totalFilasLeidas: filasCrudas.length,
        };
    };
}
