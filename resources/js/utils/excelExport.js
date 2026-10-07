/*
 * Utilidades genéricas para exportar listados a Excel (.xlsx).
 *
 * Cada hoja se describe como { nombre, columnas, filas }, donde cada columna es
 * { titulo, tipo, ancho, valor(fila) }. `valor` devuelve el dato crudo y aquí se
 * limpia y valida según el tipo, para que el archivo tenga tipos reales de Excel:
 *   - "texto":   celda de texto (cédulas, cuentas y teléfonos van como texto para no
 *                perder ceros a la izquierda ni salir en notación científica).
 *   - "fecha":   número de serie de Excel con formato aaaa-mm-dd (ordenable y filtrable).
 *   - "moneda":  número con separador de miles.
 *   - "numero":  número tal cual.
 *   - "entero":  número sin decimales.
 *   - "porcentaje": número (ej. 50 = 50%) con hasta 2 decimales.
 *   - "booleano": "Sí" / "No".
 * Un valor vacío o inválido deja la celda vacía en vez de escribir basura.
 */

const MAX_CELDA = 32767; // límite de caracteres por celda en Excel
// Caracteres de control que no son válidos en XML y corrompen el .xlsx (se conservan \t, \n, \r)
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function limpiarTexto(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "object") return null;
    const text = String(value)
        .replace(CONTROL_CHARS, "")
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t ]+/g, " ")
        .split("\n")
        .map((linea) => linea.trim())
        .join("\n")
        .trim();
    if (!text) return null;
    return text.length > MAX_CELDA ? text.slice(0, MAX_CELDA) : text;
}

export function aNumero(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "boolean") return null;
    const text = String(value).trim();
    // Solo números "limpios" como los devuelve la API (ej. "3500000.00"); un texto
    // arbitrario no se adivina para no exportar un monto equivocado.
    if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
    const num = Number(text);
    return Number.isFinite(num) ? num : null;
}

/**
 * Normaliza una fecha a "aaaa-mm-dd" o null si no es una fecha real.
 * Las columnas `date` de Laravel llegan como "2019-01-01T00:00:00.000000Z" (medianoche
 * UTC): se toma la parte de la fecha tal cual, sin convertir a hora local, porque en
 * Colombia (UTC-5) esa conversión correría la fecha al día anterior.
 */
export function aFecha(value) {
    if (value === null || value === undefined || value === "") return null;
    const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const [, y, m, d] = match.map(Number);
    if (y < 1900 || y > 2200) return null;
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Fecha local (aaaa-mm-dd) de un timestamp completo, como `created_at`. A diferencia de
 * aFecha, aquí sí importa la hora: un registro creado a las 9 p. m. en Colombia ya es el
 * día siguiente en UTC.
 */
export function aFechaLocal(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const pad = (n) => String(n).padStart(2, "0");
    return aFecha(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
}

/** Número de serie de Excel (días desde 1899-12-30) para una fecha "aaaa-mm-dd". */
export function serialExcel(fechaIso) {
    const [y, m, d] = fechaIso.split("-").map(Number);
    return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
}

export function aBooleano(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "boolean") return value ? "Sí" : "No";
    const text = String(value).trim().toLowerCase();
    if (["1", "true", "si", "sí"].includes(text)) return "Sí";
    if (["0", "false", "no"].includes(text)) return "No";
    return null;
}

/** Une nombres sin dejar espacios dobles ni "undefined" cuando falta una parte. */
export function nombreCompleto(...partes) {
    return limpiarTexto(partes.filter(Boolean).join(" "));
}

/** Valor ya limpio y validado según el tipo de columna (lo que irá en la celda). */
export function valorCelda(tipo, value) {
    switch (tipo) {
        case "fecha":
            return aFecha(value);
        case "moneda":
        case "numero":
        case "porcentaje":
            return aNumero(value);
        case "entero": {
            const num = aNumero(value);
            return num === null ? null : Math.trunc(num);
        }
        case "booleano":
            return aBooleano(value);
        default:
            return limpiarTexto(value);
    }
}

const FORMATOS = {
    fecha: "yyyy-mm-dd",
    moneda: "#,##0",
    numero: "General",
    entero: "0",
    porcentaje: "0.##",
};

function celda(tipo, value) {
    const limpio = valorCelda(tipo, value);
    if (limpio === null) return null;
    if (tipo === "fecha") return { t: "n", v: serialExcel(limpio), z: FORMATOS.fecha };
    if (FORMATOS[tipo]) return { t: "n", v: limpio, z: FORMATOS[tipo] };
    return { t: "s", v: limpio };
}

/** Filas como objetos { titulo: valorLimpio } (útil para pruebas y vistas previas). */
export function filasPlanas(hoja) {
    return hoja.filas.map((fila) =>
        Object.fromEntries(hoja.columnas.map((col) => [col.titulo, valorCelda(col.tipo, col.valor(fila))])),
    );
}

function nombreHojaValido(nombre, usados) {
    const base = String(nombre).replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Hoja";
    let candidato = base;
    for (let i = 2; usados.has(candidato.toLowerCase()); i += 1) {
        candidato = `${base.slice(0, 31 - String(i).length - 1)} ${i}`;
    }
    usados.add(candidato.toLowerCase());
    return candidato;
}

export function fechaArchivo() {
    return aFechaLocal(new Date().toISOString());
}

export function construirLibro(XLSX, hojas) {
    const wb = XLSX.utils.book_new();
    const usados = new Set();

    hojas.forEach((hoja) => {
        const ws = {};
        hoja.columnas.forEach((col, c) => {
            ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: "s", v: col.titulo };
        });
        hoja.filas.forEach((fila, i) => {
            hoja.columnas.forEach((col, c) => {
                const cell = celda(col.tipo, col.valor(fila));
                if (cell) ws[XLSX.utils.encode_cell({ r: i + 1, c })] = cell;
            });
        });

        const rango = {
            s: { r: 0, c: 0 },
            e: { r: hoja.filas.length, c: Math.max(hoja.columnas.length - 1, 0) },
        };
        ws["!ref"] = XLSX.utils.encode_range(rango);
        ws["!autofilter"] = { ref: ws["!ref"] };
        ws["!cols"] = hoja.columnas.map((col) => ({
            wch: col.ancho ?? Math.max(12, Math.min(40, col.titulo.length + 4)),
        }));

        XLSX.utils.book_append_sheet(wb, ws, nombreHojaValido(hoja.nombre, usados));
    });

    return wb;
}

/**
 * Genera y descarga el .xlsx. `xlsx` se importa dinámicamente para no cargar la
 * librería en el bundle inicial de la página.
 */
export async function descargarExcel(hojas, nombreArchivo) {
    const XLSX = await import("xlsx");
    const wb = construirLibro(XLSX, hojas);
    const archivo = String(nombreArchivo).replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_");
    XLSX.writeFile(wb, archivo.endsWith(".xlsx") ? archivo : `${archivo}.xlsx`, { compression: true });
}
