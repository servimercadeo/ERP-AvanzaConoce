// Reingreso: una persona que ya tuvo contrato vuelve a contratarse sin repetir Selección. El nuevo
// contrato queda a nombre del mismo empleado y se precarga con los datos de su último contrato.

/** Estados en los que el contrato sigue activo: mientras exista uno, no se crea otro. */
export const ESTADOS_VIGENTES = ["Vigente", "Activo", "Traslado"];

const reciente = (a, b) =>
    String(b.fecha_ingreso ?? "").localeCompare(String(a.fecha_ingreso ?? "")) || (b.id ?? 0) - (a.id ?? 0);

// Lo que se hereda del último contrato. Fechas, estado y motivo de retiro son del contrato nuevo.
const HEREDADOS = [
    "tipo_contrato", "tipo_vinculacion", "cargo", "sede", "area_empresa", "jefe_inmediato",
    "jefe_inmediato_correo", "salario", "auxilio_transporte_legal", "arl", "lps_afiliado",
    "caja_compensacion", "fondo_pensiones", "fondo_cesantias", "banco", "tipo_cuenta",
    "cuenta_bancaria", "empleador", "empresa", "cliente_proyecto", "regional_id",
];

/**
 * Una opción por persona que ya tiene contrato, con su último contrato. Quien además está en
 * la lista de candidatos con aval se deja allá: ese proceso nuevo manda.
 */
export function opcionesDeReingreso(contratos = [], candidatos = []) {
    const enSeleccion = new Set(candidatos.map((c) => String(c.documento ?? "").trim()));
    const porEmpleado = new Map();
    for (const c of contratos) {
        if (!c?.empleado_id || !c.empleado?.cedula) continue;
        const lista = porEmpleado.get(c.empleado_id) ?? [];
        lista.push(c);
        porEmpleado.set(c.empleado_id, lista);
    }

    const opciones = [];
    for (const [empleadoId, lista] of porEmpleado) {
        const empleado = lista[0].empleado;
        const documento = String(empleado.cedula).trim();
        if (enSeleccion.has(documento)) continue;

        const ultimo = [...lista].sort(reciente)[0];
        const vigente = lista.find((c) => ESTADOS_VIGENTES.includes(c.estado_contrato)) ?? null;
        opciones.push({
            reingreso: true,
            empleado_id: empleadoId,
            documento,
            nombres: empleado.nombres || empleado.name || "",
            apellidos: empleado.apellidos || "",
            correo: empleado.email ?? "",
            fotografia: empleado.fotografia ?? null,
            contratos: lista.length,
            ultimo: { cargo: ultimo.cargo, estado: ultimo.estado_contrato, fecha_ingreso: ultimo.fecha_ingreso },
            vigente: vigente ? { cargo: vigente.cargo, fecha_ingreso: vigente.fecha_ingreso } : null,
            ...datosDeReingreso(ultimo),
        });
    }

    return opciones.sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`));
}

/** Datos del último contrato que se copian al nuevo. La fecha de ingreso queda vacía. */
export function datosDeReingreso(contrato) {
    const datos = Object.fromEntries(HEREDADOS.map((k) => [k, contrato?.[k] ?? ""]));
    datos.centros_costos = (contrato?.centros_costos ?? []).map((cc) => ({
        centro_costo_catalogo_id: cc.centro_costo_catalogo_id ?? "",
        codigo: cc.codigo ?? "",
        centro_costos: cc.centro_costos ?? "",
        porcentaje: Number(cc.porcentaje) || 0,
    }));
    datos.fecha_ingreso = "";

    return datos;
}
