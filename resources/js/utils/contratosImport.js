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

    for (const alias of aliases) {
        const aliasKey = normalizeKey(alias);
        const match = keys.find((item) => item.normalized === aliasKey);
        if (match) {
            const value = row[match.original];
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                return value;
            }
        }
    }

    // Encabezados de Excel truncados por el ancho de columna (ej. "tipodecontrat"
    // en vez de "tipodecontrato"): coincide por substring en ambas direcciones,
    // prefiriendo el candidato de longitud más parecida (más específico) para
    // no confundir una columna genérica (ej. "auxilio") con una más precisa
    // (ej. "auxiliotransporte").
    for (const alias of aliases) {
        const aliasCompact = normalizeCompact(alias);
        if (aliasCompact.length < 5) continue;
        const candidates = keys.filter(
            (item) =>
                item.compact.length >= 5 &&
                (item.compact.includes(aliasCompact) || aliasCompact.includes(item.compact)),
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
    if (!value && value !== 0) return "Activo";
    const clean = normalizeComparable(String(value));
    const map = {
        activo: "Activo",
        vigente: "Activo",
        inactivo: "Inactivo",
        "no vigente": "Inactivo",
        cancelado: "Cancelado",
        traslado: "Traslado",
        transladado: "Traslado",
    };
    return map[clean] || String(value).trim();
}

function parseNumeric(value) {
    if (!value && value !== 0) return "";
    if (typeof value === "number") return value;
    const text = String(value).trim().replace(/[^0-9,.-]/g, "");
    if (!text) return "";
    return Number(text.replace(/,/g, ""));
}

export function buildContratoPayloadFromExcelRow(row, catalogs = {}) {
    const payload = {
        documento: resolveValue(row, ["documento", "cedula", "cedemp", "identificacion", "cc", "nit"]),
        nombres: normalizeText(resolveValue(row, ["nombres", "nombre", "nomemp", "primer nombre", "primer_nombre"])),
        apellidos: normalizeText(resolveValue(row, ["apellidos", "apellido", "apeemp", "apellidos y nombres", "primer apellido", "primer_apellido"])),
        correo: resolveValue(row, ["correo", "email", "emaemp", "correo electronico", "correo_electronico"]),
        cargo: resolveValue(row, ["cargo", "puesto", "cargo actual", "cargo_actual"]),
        sede: resolveValue(row, ["sede", "ciudad sede", "ciudad_sede"]),
        area_empresa: resolveValue(row, ["area_empresa", "area empresa", "areaempr", "area"]),
        jefe_inmediato: resolveValue(row, ["jefe_inmediato", "jefe inmediato", "jefeinme"]),
        fecha_ingreso: normalizeDate(resolveValue(row, ["fecha_ingreso", "fecha de ingreso", "fecha_de_ingreso", "fechaingreso", "fechaing"])),
        fecha_retiro: "",
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

    if (payload.regional_id && catalogs?.regionales?.length) {
        const match = catalogs.regionales.find((item) =>
            String(item.nombre).toLowerCase() === String(payload.regional_id).toLowerCase()
        );
        if (match) {
            payload.regional_id = match.id;
        }
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
    const tipo = resolveValue(row, ["auxilio", "tipo_auxilio", "tipo de auxilio", "anexo_auxilio"]);
    const valor = parseNumeric(resolveValue(row, ["valor_auxilio", "valor de auxilio", "total_auxilio"]));
    const fecha = normalizeDate(resolveValue(row, ["fecha_auxilio", "fecha de auxilio", "fecha_entrega_firma"]));

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
