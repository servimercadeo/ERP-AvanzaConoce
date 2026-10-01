import { descargarExcel, fechaArchivo } from "./excelExport.js";

/*
 * Importación de datos personales de empleados desde Excel, por cédula.
 *
 * Deliberadamente NO incluye campos operativos (cargo, sede, salario, EPS/ARL/caja,
 * email, rol) — esos se gestionan por Contratos o por el formulario de Empleados, con
 * sus propias reglas de negocio. Esto es solo para rellenar la ficha personal que a
 * menudo queda vacía en las altas masivas.
 *
 * Los títulos de columna coinciden exactamente con los de "Exportar Excel"
 * (empleadosExport.js) para los campos que se solapan: exportar, llenar las celdas
 * vacías y volver a importar el mismo archivo debe funcionar sin ajustes.
 */
export const COLUMNAS_IMPORTABLES = [
    { titulo: "Cédula", campo: "cedula", requerido: true },
    { titulo: "Fecha Expedición Documento", campo: "fecha_expedicion", tipo: "fecha" },
    { titulo: "Género", campo: "genero" },
    { titulo: "Fecha Nacimiento", campo: "fecha_nacimiento", tipo: "fecha" },
    { titulo: "Lugar Nacimiento", campo: "lugar_nacimiento" },
    { titulo: "Raza", campo: "raza" },
    { titulo: "Estado Civil", campo: "estado_civil" },
    { titulo: "Nivel Escolaridad", campo: "nivel_escolaridad" },
    { titulo: "Profesión", campo: "profesion" },
    { titulo: "Número de Hijos", campo: "numero_hijos", tipo: "entero" },
    { titulo: "RH", campo: "rh" },
    { titulo: "Móvil", campo: "movil" },
    { titulo: "Dirección Residencia", campo: "direccion_residencia" },
    { titulo: "Barrio", campo: "barrio" },
    { titulo: "Estrato", campo: "estrato" },
    { titulo: "Banco", campo: "banco" },
    { titulo: "Tipo de Cuenta", campo: "tipo_cuenta" },
    { titulo: "No. de Cuenta Bancaria", campo: "cuenta_bancaria" },
    { titulo: "Talla Camisa", campo: "talla_camisa" },
    { titulo: "Talla Pantalón", campo: "talla_pantalon" },
    { titulo: "Talla Zapatos", campo: "talla_zapatos" },
    { titulo: "Contacto Emergencia", campo: "contacto_emergencia_nombre" },
    { titulo: "Teléfono Emergencia", campo: "contacto_emergencia_telefono" },
    { titulo: "Parentesco Emergencia", campo: "contacto_emergencia_parentesco" },
];

function normalizarTitulo(s) {
    return String(s ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[.°º]/g, "")
        .trim()
        .replace(/\s+/g, " ");
}

// Mapa normalizado -> definición de columna, para reconocer encabezados aunque
// varíen en mayúsculas/tildes/espacios.
const MAPA_NORMALIZADO = new Map(
    COLUMNAS_IMPORTABLES.map((c) => [normalizarTitulo(c.titulo), c]),
);

/** Descarga una plantilla .xlsx vacía con exactamente las columnas reconocidas. */
export function descargarPlantillaImportacion() {
    const hoja = {
        nombre: "Plantilla",
        columnas: COLUMNAS_IMPORTABLES.map((c) => ({
            titulo: c.titulo,
            tipo: "texto",
            ancho: Math.max(14, c.titulo.length + 2),
            valor: () => null,
        })),
        filas: [],
    };
    return descargarExcel([hoja], `Plantilla_Importar_Empleados_${fechaArchivo()}.xlsx`);
}

// "Fecha Nacimiento" / "Fecha Expedición Documento": si la celda es una fecha real de
// Excel, `sheet_to_json` en modo texto la formatea según el formato numérico de ESA
// celda (que puede venir en d/m/aaaa, m/d/aaaa, etc. según cómo la haya guardado quien
// armó el archivo) — no se puede confiar en ese texto. Por eso el valor crudo (número
// de serie o texto) se decodifica aquí mismo con SSF, que da el mismo resultado sin
// importar el formato visual de la celda.
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

/**
 * Lee un archivo .xlsx/.xls/.csv y lo convierte en filas listas para enviar al backend.
 * Devuelve { filas, columnasReconocidas, columnasNoReconocidas, totalFilasLeidas }.
 * `filas` son objetos { cedula, campo1, campo2, ... } con solo los campos reconocidos
 * y no vacíos — el backend decide, campo por campo, si el valor actual ya existe y en
 * ese caso no lo toca.
 */
export async function parsearArchivoImportacion(file) {
    // La interoperabilidad CJS/ESM de este paquete es inconsistente entre bundlers: a
    // veces expone sus propiedades (como SSF) solo bajo `.default`. Normalizar aquí
    // evita que, según el entorno, `XLSX.SSF` termine siendo undefined en silencio.
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
    const columnaCedula = encabezados.find(
        (h) => normalizarTitulo(h) === "cedula",
    );
    if (!columnaCedula) {
        throw new Error('No se encontró la columna "Cédula" en el archivo.');
    }

    const columnasReconocidas = new Set();
    const columnasNoReconocidas = new Set();
    encabezados.forEach((h) => {
        const def = MAPA_NORMALIZADO.get(normalizarTitulo(h));
        if (def) columnasReconocidas.add(def.titulo);
        else columnasNoReconocidas.add(h);
    });

    const filas = [];
    filasCrudas.forEach((filaCruda) => {
        const cedula = String(filaCruda[columnaCedula] ?? "").trim();
        if (!cedula) return;

        const fila = { cedula };
        encabezados.forEach((h) => {
            const def = MAPA_NORMALIZADO.get(normalizarTitulo(h));
            if (!def || def.campo === "cedula") return;
            let valorCrudo = filaCruda[h];
            if (valorCrudo === null || valorCrudo === undefined || valorCrudo === "") return;

            let valor;
            if (def.tipo === "fecha") {
                valor = normalizarFecha(valorCrudo, XLSX);
            } else {
                valor = String(valorCrudo).trim();
            }
            if (!valor) return;
            fila[def.campo] = valor;
        });

        fila._camposConDato = Object.keys(fila).filter(
            (k) => k !== "cedula" && k !== "_camposConDato",
        );
        filas.push(fila);
    });

    return {
        filas,
        columnasReconocidas: Array.from(columnasReconocidas),
        columnasNoReconocidas: Array.from(columnasNoReconocidas),
        totalFilasLeidas: filasCrudas.length,
    };
}
