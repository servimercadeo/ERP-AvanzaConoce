const NORMALIZERS = [
    (value) => (typeof value === "string" ? value.trim() : value),
    (value) => (typeof value === "string" ? value.replace(/\s+/g, " ") : value),
];

function normalizeKey(value) {
    if (typeof value !== "string") return "";
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function normalizeCompact(value) {
    return normalizeKey(value).replace(/\s+/g, "");
}

function resolveValue(row, aliases) {
    for (const alias of aliases) {
        const exact = row[alias];
        if (exact !== undefined && exact !== null && String(exact).trim() !== "") {
            return exact;
        }
    }

    const keys = Object.keys(row).map((key) => ({
        original: key,
        normalized: normalizeKey(key),
        compact: normalizeCompact(key),
    }));

    let columnaExiste = aliases.some((alias) => Object.prototype.hasOwnProperty.call(row, alias));
    for (const alias of aliases) {
        const aliasKey = normalizeKey(alias);
        const match = keys.find((item) => item.normalized === aliasKey);
        if (match) {
            columnaExiste = true;
            const value = row[match.original];
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                return value;
            }
        }
    }

    // La columna está en el archivo pero esta fila la trae vacía: el campo va vacío. Buscar
    // una columna "parecida" aquí tomaba datos de otra (p. ej. con "Correo del Jefe" vacío,
    // se llevaba el correo del empleado o el nombre del jefe).
    if (columnaExiste) return null;

    // Encabezados de Excel truncados por el ancho de columna (ej. "tipodecontrat"
    // en vez de "tipodecontrato"): coincide por substring en ambas direcciones,
    // prefiriendo el candidato de longitud más parecida (más específico) para
    // no confundir una columna genérica (ej. "auxilio") con una más precisa
    // (ej. "auxiliotransporte").
    for (const alias of aliases) {
        const aliasCompact = normalizeCompact(alias);
        if (aliasCompact.length < 5) continue;
        // Un encabezado truncado es un PREFIJO del alias ("tipodecontrat" → "tipodecontrato").
        // Con `includes` en esa dirección, una columna "Empresa" coincidía con el alias
        // "areaempresa" y, si faltaba "Área Empresa", el nombre de la empresa terminaba
        // guardado como área.
        const candidates = keys.filter(
            (item) =>
                item.compact.length >= 5 &&
                (item.compact.includes(aliasCompact) || aliasCompact.startsWith(item.compact)),
        );
        if (!candidates.length) continue;
        candidates.sort(
            (a, b) =>
                Math.abs(a.compact.length - aliasCompact.length) -
                Math.abs(b.compact.length - aliasCompact.length),
        );
        const value = row[candidates[0].original];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return value;
        }
    }

    return null;
}

function normalizeText(value) {
    if (value === null || value === undefined) return "";
    const text = String(value).trim();
    if (!text) return "";
    return text.toUpperCase();
}

function normalizeDate(value) {
    if (!value && value !== 0) return "";
    if (typeof value === "number") {
        const date = new Date(Math.round((value - 25569) * 86400 * 1000));
        if (Number.isNaN(date.getTime())) return "";
        return date.toISOString().split("T")[0];
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

        const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
        if (dmy) {
            const [, d, m, y] = dmy;
            const day = d.padStart(2, "0");
            const month = m.padStart(2, "0");
            return `${y}-${month}-${day}`;
        }

        const date = new Date(trimmed);
        if (!Number.isNaN(date.getTime())) return date.toISOString().split("T")[0];

        // Texto que no es una fecha (ej. "N/A", "Activo", "-"): se descarta
        // en vez de enviarlo, para no romper la validación de fecha del backend.
        return "";
    }
    return "";
}

function normalizeComparable(value) {
    if (typeof value !== "string") return "";
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}

function normalizeContratoType(value) {
    if (!value && value !== 0) return "";
    const clean = normalizeComparable(String(value));
    const map = {
        "termino fijo": "Término Fijo",
        "fijo": "Término Fijo",
        "termino indefinido": "Término Indefinido",
        "indefinido": "Término Indefinido",
        "obra o labor": "Obra o Labor",
        "obra": "Obra o Labor",
        "labor": "Obra o Labor",
        "prestacion de servicios": "Prestación de Servicios",
        "prestacion": "Prestación de Servicios",
        "servicios": "Prestación de Servicios",
        "aprendizaje": "Aprendizaje",
        "ocasional": "Ocasional",
    };
    return map[clean] || String(value).trim();
}

function normalizeEstado(value) {
    if (!value && value !== 0) return "Vigente";
    const clean = normalizeComparable(String(value));
    const map = {
        activo: "Vigente",
        vigente: "Vigente",
        inactivo: "Finalizado",
        "no vigente": "Finalizado",
        finalizado: "Finalizado",
        cancelado: "Finalizado",
        traslado: "Traslado",
        transladado: "Traslado",
        "finalizado traslado": "Finalizado traslado",
    };
    return map[clean] || String(value).trim();
}

function parseNumeric(value) {
    if (!value && value !== 0) return "";
    if (typeof value === "number") return Number.isFinite(value) ? value : "";
    let text = String(value).trim().replace(/[^0-9,.-]/g, "");
    if (!text) return "";
    // Formato colombiano: punto de miles y coma decimal ("3.500.000" o "1.423.500,50").
    // Antes "3.500.000" daba NaN y el salario se perdía en silencio.
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) {
        text = text.replace(/\./g, "").replace(",", ".");
    } else {
        text = text.replace(/,/g, "");
    }
    const num = Number(text);
    return Number.isFinite(num) ? num : "";
}

function normalizeDocumento(value) {
    if (value === null || value === undefined) return value;
    const text = String(value).trim();
    return /^\d{1,3}([.,\s]\d{3})+$/.test(text) ? text.replace(/[.,\s]/g, "") : text;
}

export function buildContratoPayloadFromExcelRow(row, catalogs = {}) {
    const payload = {
        documento: normalizeDocumento(resolveValue(row, ["documento", "cedula", "cedemp", "identificacion", "cc", "nit"])),
        nombres: normalizeText(resolveValue(row, ["nombres", "nombre", "nomemp", "primer nombre", "primer_nombre"])),
        apellidos: normalizeText(resolveValue(row, ["apellidos", "apellido", "apeemp", "apellidos y nombres", "primer apellido", "primer_apellido"])),
        correo: resolveValue(row, ["correo", "email", "emaemp", "correo electronico", "correo_electronico"]),
        cargo: resolveValue(row, ["cargo", "puesto", "cargo actual", "cargo_actual"]),
        sede: resolveValue(row, ["sede", "ciudad sede", "ciudad_sede"]),
        area_empresa: resolveValue(row, ["area_empresa", "area empresa", "areaempr", "area"]),
        jefe_inmediato: resolveValue(row, ["jefe_inmediato", "jefe inmediato", "jefeinme"]),
        jefe_inmediato_correo: resolveValue(row, ["jefe_inmediato_correo", "correo del jefe", "correo jefe", "correo jefe inmediato"]),
        fecha_ingreso: normalizeDate(resolveValue(row, ["fecha_ingreso", "fecha de ingreso", "fecha_de_ingreso", "fechaingreso", "fechaing"])),
        fecha_retiro: normalizeDate(resolveValue(row, ["fecha_retiro", "fecha de retiro", "fecharetiro", "fecharet"])),
        tipo_contrato: normalizeContratoType(resolveValue(row, ["tipo_contrato", "tipo de contrato", "tipocontrato", "tipodecor", "tipodecontrato"])),
        tipo_vinculacion: resolveValue(row, ["tipo_vinculacion", "tipo de vinculacion", "vinculacion", "tipovinc"]),
        estado_contrato: normalizeEstado(resolveValue(row, ["estado_contrato", "estado", "estado contrato", "estadocor", "estadocontrato"])),
        salario: parseNumeric(resolveValue(row, ["salario", "salario base", "salario_base", "sueldo"])),
        auxilio_transporte_legal: parseNumeric(resolveValue(row, ["auxilio_transporte_legal", "auxilio transporte", "auxiliot"])),
        arl: resolveValue(row, ["arl", "arl afiliado", "nomarl"]),
        fecha_vinculacion_arl: normalizeDate(resolveValue(row, ["fecha_vinculacion_arl", "fecha vinculacion arl", "fecarl"])),
        lps_afiliado: resolveValue(row, ["lps_afiliado", "eps", "eps afiliado", "lps", "nomeps"]),
        fecha_vinculacion_lps: normalizeDate(resolveValue(row, ["fecha_vinculacion_lps", "fecha vinculacion eps", "feceps"])),
        caja_compensacion: resolveValue(row, ["caja_compensacion", "caja de compensacion", "nomcajac"]),
        fecha_vinculacion_caja: normalizeDate(resolveValue(row, ["fecha_vinculacion_caja", "fecha vinculacion caja", "feccajac"])),
        fondo_pensiones: resolveValue(row, ["fondo_pensiones", "fondo de pensiones", "nomfondo"]),
        fondo_cesantias: resolveValue(row, ["fondo_cesantias", "fondo de cesantias", "fondoces"]),
        cliente_proyecto: resolveValue(row, ["cliente_proyecto", "cliente proyecto", "cliente / proyecto", "proyecto", "clienteproyecto"]),
        empresa: resolveValue(row, ["empresa", "empresa contratante"]),
        empleador: resolveValue(row, ["empleador", "empleador contratante"]),
        regional_id: resolveValue(row, ["regional_id", "regional", "regionalid"]),
    };

    // Un correo del jefe mal escrito no debe impedir crear el contrato (el backend lo
    // rechazaría con 422): se omite y se deja en `correo_jefe_invalido` para reportarlo.
    if (isFilled(payload.jefe_inmediato_correo)) {
        const correo = String(payload.jefe_inmediato_correo).trim().toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            payload.jefe_inmediato_correo = correo;
        } else {
            payload.correo_jefe_invalido = String(payload.jefe_inmediato_correo).trim();
            payload.jefe_inmediato_correo = "";
        }
    }

    if (payload.regional_id && catalogs?.regionales?.length) {
        const match = catalogs.regionales.find((item) =>
            String(item.nombre).toLowerCase() === String(payload.regional_id).toLowerCase()
        );
        if (match) {
            payload.regional_id = match.id;
        }
    }
    // Un nombre de regional que no está en el catálogo no se manda (el backend exige un id
    // y rechazaría el contrato completo): se deja en `regional_no_encontrada` para que la
    // pantalla lo reporte.
    if (payload.regional_id && !/^\d+$/.test(String(payload.regional_id))) {
        payload.regional_no_encontrada = String(payload.regional_id).trim();
        payload.regional_id = "";
    }

    const centroCostoCodigo = resolveValue(row, ["centro_costo", "centro de costos", "codigo centro costo", "centrode", "cco"]);
    if (centroCostoCodigo && catalogs?.centrosCostoCatalogo?.length) {
        const match = catalogs.centrosCostoCatalogo.find(
            (item) => normalizeComparable(String(item.codigo)) === normalizeComparable(String(centroCostoCodigo)),
        );
        if (match) {
            payload.centros_costos = [
                { centro_costo_catalogo_id: match.id, porcentaje: 100 },
            ];
        }
    }

    return payload;
}

function buildAnexoFromExcelRow(row) {
    // El auxilio de transporte legal es un campo del contrato, no un anexo: sin excluirlo,
    // la coincidencia por substring de "auxilio" tomaría esa columna (p. ej. "auxiliot" o
    // "Auxilio Transporte Legal") como tipo de auxilio cuando la columna de anexo está vacía.
    const anexoRow = Object.fromEntries(
        Object.entries(row).filter(([key]) => !/^auxilio(de)?t/.test(normalizeCompact(key))),
    );
    const tipo = resolveValue(anexoRow, ["auxilio", "tipo_auxilio", "tipo de auxilio", "anexo_auxilio"]);
    const valor = parseNumeric(resolveValue(anexoRow, ["valor_auxilio", "valor de auxilio", "total_auxilio"]));
    const fecha = normalizeDate(resolveValue(anexoRow, ["fecha_auxilio", "fecha de auxilio", "fecha_entrega_firma"]));

    if (!tipo && !valor) return null;

    return {
        anexo_auxilio: tipo ? String(tipo).trim() : "",
        valor: valor || 0,
        fecha_entrega_firma: fecha,
    };
}

function isFilled(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === "number") return !Number.isNaN(value);
    if (Array.isArray(value)) return value.length > 0;
    return String(value).trim() !== "";
}

// Campos que se pueden rellenar en un contrato que YA existe (ContratoController@
// importarDatosFaltantes). Salario, fechas de ingreso/retiro, estado, tipo de contrato,
// centros de costo y anexos quedan fuera a propósito: tienen reglas de negocio propias
// (dotación, pedidos, porcentajes) y se cambian desde el formulario del contrato.
const CAMPOS_COMPLETAR_CONTRATO = [
    "cargo", "sede", "area_empresa", "jefe_inmediato", "jefe_inmediato_correo", "tipo_vinculacion",
    "arl", "fecha_vinculacion_arl", "lps_afiliado", "fecha_vinculacion_lps", "caja_compensacion",
    "fecha_vinculacion_caja", "fondo_pensiones", "fondo_cesantias", "empleador", "cliente_proyecto",
];

/** Fila { documento, campo: valor, ... } con solo los campos rellenables que traen dato. */
export function filaParaCompletarContrato(payload) {
    const fila = { documento: String(payload.documento ?? "").trim() };
    CAMPOS_COMPLETAR_CONTRATO.forEach((campo) => {
        if (isFilled(payload[campo])) fila[campo] = String(payload[campo]).trim();
    });
    return fila;
}

/**
 * El export de la otra app repite una fila por persona por cada auxilio que
 * tiene asignado (misma cédula, mismos datos de contrato, solo cambia la
 * columna de auxilio). Aquí se agrupan esas filas por documento para generar
 * un solo contrato por persona, con todos sus auxilios como anexos.
 */
export function buildContratoPayloadFromExcelRows(rows, catalogs = {}) {
    const groups = new Map();
    let ungroupedIndex = 0;

    rows.forEach((row) => {
        const payload = buildContratoPayloadFromExcelRow(row, catalogs);
        const anexo = buildAnexoFromExcelRow(row);
        const key = payload.documento
            ? `doc:${normalizeComparable(String(payload.documento))}`
            : `row:${ungroupedIndex++}`;

        if (!groups.has(key)) {
            groups.set(key, { payload, anexos: [] });
        } else {
            const group = groups.get(key);
            Object.keys(payload).forEach((field) => {
                if (!isFilled(group.payload[field]) && isFilled(payload[field])) {
                    group.payload[field] = payload[field];
                }
            });
        }

        if (anexo) {
            groups.get(key).anexos.push(anexo);
        }
    });

    return Array.from(groups.values()).map(({ payload, anexos }) => ({
        ...payload,
        ...(anexos.length ? { anexos } : {}),
    }));
}
