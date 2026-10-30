import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import { useAcciones } from "../hooks/useAcciones";
import { useAuth } from "../context/AuthContext";
import { IconSearch, IconEmptySearch, IconLoading, IconClose, IconTrash, IconPlus, IconEye, IconEdit } from "../components/Icons";
import SelectBuscable from "../components/SelectBuscable";

/**
 * Work Orders (Inventarios > Work Orders): visor de las órdenes de trabajo técnicas que
 * llegan por el Excel de origen del proveedor (50+ columnas en ese archivo). Solo se
 * guardan y muestran las columnas más útiles para seguimiento operativo — WO, estado,
 * técnico/cuadrilla, ubicación, fechas clave y aging — el resto de columnas del archivo
 * original se descartan al importar.
 */
// Quita tildes, pasa a minúsculas y además reemplaza cualquier símbolo (°, º, /, -, etc.)
// por espacio: así "N° de item", "Nº de item" y "N de item" terminan en la misma clave, sin
// depender de adivinar cuál signo de grado/ordinal usa cada archivo.
const normalizeHeader = (s) =>
    (s ?? "")
        .toString()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

/**
 * Nombres EXACTOS de columnas del export real del proveedor (confirmados por el usuario
 * copiando la fila 1 de su Excel — nada de esto se adivinó). `normalizeHeader` ya quita
 * tildes/mayúsculas, así que aquí las claves van sin tildes.
 */
const IMPORT_HEADER_MAP = {
    // "Nº de cliente" en el archivo de origen viene mal nombrada: en realidad es donde
    // vive el número real de la orden de trabajo (confirmado por el usuario contra su
    // archivo real, columna AI). "Número de orden de trabajo" (columna AM) es otro campo
    // distinto, no el que se usa como llave.
    "n de cliente": "numero_wo",
    "numero de wo": "numero_wo", // alias por si otro export usa este nombre más corto
    "n de wo de ibs": "numero_wo_ibs",
    "n de item": "numero_item",
    "estado": "estado",
    "fecha de estado de orden de trabajo": "fecha_estado",
    "servicio": "servicio",
    "tipo de cliente": "tipo_orden",
    "prioridad": "prioridad",
    "proveedor": "proveedor",
    "cuadrilla tecnico responsable": "cuadrilla_tecnico",
    "cedula": "cedula_tecnico",
    "nombre th": "nombre_tecnico",
    "modalidad": "modalidad",
    "perimetro": "perimetro",
    "departamento": "departamento",
    "municipio": "municipio",
    "barrio": "barrio",
    "direccion": "direccion",
    "fecha de creacion": "fecha_creacion",
    "fecha de vencimiento": "fecha_vencimiento",
    "fecha de finalizacion": "fecha_finalizacion",
    "inicio agendado": "inicio_agendado",
    "fin agendado": "fin_agendado",
    "descripcion de ibs": "descripcion",
    "apellidos cliente": "apellido_cliente", // alias en plural del mismo campo que "apellido cliente" (Macaw)
    // En el archivo real del usuario esas columnas vienen con el encabezado a secas, sin
    // la palabra "cliente": "Nombre" (columna V) y "Apellido(s)" (columna S) — este último
    // en plural ("Apellidos") igual que el otro alias de arriba, por eso van los dos.
    "apellido": "apellido_cliente",
    "apellidos": "apellido_cliente",
    "nombre": "nombre_cliente",

    // Resto de columnas del "Excel de origen del proveedor" (confirmadas por el usuario
    // pegando la fila 1 de su archivo real): antes se descartaban al importar.
    "dias de atraso": "dias_atraso",
    "dias de atraso sp": "dias_atraso_sp",
    "estado de la descarga": "estado_descarga",
    "georreferencia": "georreferencia",
    "nombre cuadrilla tecnico": "nombre_cuadrilla_tecnico",
    "apellido cuadrilla tecnico": "apellido_cuadrilla_tecnico",
    "cambio de domicilio entre calles": "cambio_domicilio_entre_calles",
    "pais": "pais",
    "puntos de referencia": "puntos_referencia",
    "codigo postal": "codigo_postal",
    "agrupacion": "agrupacion",
    "estado de orden de trabajo": "estado_orden_trabajo",
    "n de telefono principal": "telefono_principal",
    "recursos": "recursos",
    "fecha ultima de reasignacion": "fecha_ultima_reasignacion",
    "reiteracion de servicio": "reiteracion_servicio",
    "estado de la visita": "estado_visita",
    "numero de visita": "numero_visita",
    "x": "coordenada_x",
    "y": "coordenada_y",
    "razones": "razones",
    // "Número de orden de trabajo" NO es numero_wo (ver nota arriba): es su propio campo.
    "numero de orden de trabajo": "numero_orden_trabajo",
    "codigo de sl": "codigo_sl",
    "clase de cliente": "clase_cliente",
    "agendamiento externo": "agendamiento_externo",
    "estado en fecha": "estado_en_fecha",
    "descarga materiales obligatoria": "descarga_materiales_obligatoria",
    "descarga materiales confirmada": "descarga_materiales_confirmada",
    "id del encabezado del pedido": "id_encabezado_pedido",
    "aging": "aging",
    "region de servicio": "region_servicio",

    // Encabezados del "Exporte Macaw" (hoja de Operaciones DTV): trae una fila por WO, sin
    // N° de ítem, y la cédula del técnico que la atendió (con ella se asocia a su aliado).
    "workorder": "numero_wo",
    "cedula tecnico": "cedula_tecnico",
    "tecnico atiende": "nombre_tecnico",
    "tipo servicio": "servicio",
    "nom tipo cliente": "tipo_orden",
    "perimetro de la zona": "perimetro",
    "ciudad": "municipio",
    "fecha atencion": "fecha_estado",
    "fecha creacion": "fecha_creacion",
    "fecha finalizacion": "fecha_finalizacion",

    // Resto de columnas del Exporte Macaw (confirmadas por el usuario pegando la fila 1 de
    // su Excel real): antes se descartaban todas al importar, ahora cada una tiene su propia
    // columna en `work_orders` y sale con dato real en el Exportar Excel. "ibs" SÍ es
    // numero_wo_ibs (mismo campo que "N° de WO de IBS" arriba, solo que acá el proveedor lo
    // llama distinto); "tipo vinculacion" es el mismo campo que "modalidad" arriba (mismo
    // dato, dos nombres según el formato del archivo). "subproducto" en minúscula también
    // normaliza a la clave "subproducto" (ver más abajo el comentario sobre "gana la
    // primera columna"): la fila trae ADEMÁS otra "subproducto" en minúscula con un código
    // numérico sin relación, que queda ignorada a propósito.
    "subproducto": "subproducto",
    "tipo producto": "tipo_producto",
    "se paga": "se_paga",
    "consignada": "consignada",
    "pago": "pago",
    "tecnico agendado": "tecnico_agendado",
    "cedula tecnico agendado": "cedula_tecnico_agendado",
    "tipo vinculacion": "modalidad",
    "ibs": "numero_wo_ibs",
    "categoria": "categoria",
    "problema": "problema",
    "nombre cliente": "nombre_cliente",
    "apellido cliente": "apellido_cliente",
    "no documento": "no_documento_cliente",
    "tel casa": "tel_casa",
    "perimetro de la venta": "perimetro_venta",
    "jornada": "jornada",
    "fecha programacion": "fecha_programacion",
    "fecha publicacion": "fecha_publicacion",
    "tecnologia": "tecnologia",
    "fecha cancelacion": "fecha_cancelacion",
    "razon cancelacion": "razon_cancelacion",
    "observaciones cancelacion": "observaciones_cancelacion",
    "estado comercial": "estado_comercial",
    "tipo": "tipo_wo",
    "tecnico atendio": "tecnico_atendio_flag",
    "wo aterior": "wo_anterior",
    "wo fisica ok": "wo_fisica_ok",
    "motivo": "motivo",
    "consumio material": "consumio_material",
    "paga por directv": "paga_por_directv",
    "comision pagada": "comision_pagada",
    "valor comision": "valor_comision",
    "fecha pago": "fecha_pago",
    "prueba de calidad": "prueba_calidad",
    "numero de ticket de aprobacion": "numero_ticket_aprobacion",
    "razon de prueba de calidad fallida": "razon_prueba_calidad_fallida",
    "contrato enviado": "contrato_enviado",
    "registrado por": "registrado_por",
    "fecha registro material": "fecha_registro_material",
    "fecha registro sin material": "fecha_registro_sin_material",
    "modo atencion": "modo_atencion",
    "auxiliar": "auxiliar",
    "torre": "torre",
    "conductor": "conductor",
    "tipo auxilio": "tipo_auxilio",
    "auxilio": "auxilio",
    "aplica auxilio": "aplica_auxilio",
};

/**
 * Columnas del "Exporte Macaw" que el usuario pidió replicar en el botón Exportar, en el
 * mismo orden y con el mismo nombre exacto que trae ese archivo (confirmado por el usuario
 * pegando la fila 1 de su Excel). El segundo valor es el campo del que sale el dato real
 * cuando ya lo consumimos: la mayoría vienen de `work_orders` (mismo mapeo que
 * IMPORT_HEADER_MAP arriba), y los que terminan en "_tecnico" los agrega el backend desde
 * la ficha del técnico (ver WorkOrderController::conDatosDelTecnico) cuando esa WO trae
 * cédula y el técnico ya es empleado del ERP. Un arreglo de campos es una cadena de
 * respaldo (el primero que tenga dato gana); `null` es la única columna que de verdad no se
 * guarda en ningún lado ("subproducto" en minúscula, el código numérico duplicado — ver
 * nota en IMPORT_HEADER_MAP), así que esa sale "N/D" siempre.
 */
const COLUMNAS_EXPORTE_MACAW = [
    ["Sede", "sede_tecnico"],
    ["Subproducto", "subproducto"],
    ["Tipo Servicio", "servicio"],
    ["Tipo Producto", "tipo_producto"],
    ["Se Paga", "se_paga"],
    ["Consignada", "consignada"],
    ["Pago", "pago"],
    ["Técnico Agendado", ["tecnico_agendado", "nombre_tecnico"]],
    ["Cédula Técnico Agendado", ["cedula_tecnico_agendado", "cedula_tecnico"]],
    ["Técnico Atiende", "nombre_tecnico_atiende"],
    ["Cédula Técnico", "cedula_tecnico_atiende"],
    ["Tipo Vinculación", ["modalidad", "tipo_vinculacion_tecnico"]],
    ["Subagente/Aliado", "subagente_aliado_tecnico"],
    ["workorder", "numero_wo"],
    ["IBS", "numero_wo_ibs"],
    ["Categoría", "categoria"],
    ["Problema", "problema"],
    ["Nombre Cliente", "nombre_cliente"],
    ["Apellido Cliente", "apellido_cliente"],
    ["No Documento", "no_documento_cliente"],
    ["Dirección", "direccion"],
    ["Barrio", "barrio"],
    ["Ciudad", "municipio"],
    ["Departamento", "departamento"],
    ["Tel. Casa", "tel_casa"],
    ["Perímetro de la Zona", "perimetro"],
    ["Perímetro de la Venta", "perimetro_venta"],
    ["Nom Tipo Cliente", "tipo_orden"],
    ["Jornada", "jornada"],
    ["Fecha Programación", "fecha_programacion"],
    ["Fecha Atención", "fecha_estado"],
    ["Fecha Finalización", "fecha_finalizacion"],
    ["Fecha Publicación", "fecha_publicacion"],
    ["Fecha Creación", "fecha_creacion"],
    ["Proveedor", "proveedor"],
    ["Tecnología", "tecnologia"],
    ["Estado", "estado"],
    ["Fecha Cancelación", "fecha_cancelacion"],
    ["Razón Cancelación", "razon_cancelacion"],
    ["Observaciones Cancelación", "observaciones_cancelacion"],
    ["Estado Comercial", "estado_comercial"],
    ["tipo", "tipo_wo"],
    ["Tecnico atendio", "tecnico_atendio_flag"],
    ["WO Aterior", "wo_anterior"],
    ["WO Fisica OK", "wo_fisica_ok"],
    ["Motivo", "motivo"],
    // La columna "subproducto" en minúscula del archivo real: un código numérico sin
    // relación con "Subproducto" (texto), que ya ocupó ese dato arriba — ver la nota en
    // IMPORT_HEADER_MAP. No se guarda nada de esta, así que siempre sale "N/D".
    ["subproducto", null],
    ["Consumio Material", "consumio_material"],
    ["Paga por Directv", "paga_por_directv"],
    ["Comision pagada", "comision_pagada"],
    ["Valor comision", "valor_comision"],
    ["Fecha Pago", "fecha_pago"],
    ["Prueba de Calidad", "prueba_calidad"],
    ["Numero de ticket de aprobación", "numero_ticket_aprobacion"],
    ["Razón de Prueba de Calidad Fallida", "razon_prueba_calidad_fallida"],
    ["Contrato enviado", "contrato_enviado"],
    ["Registrado por", "registrado_por"],
    ["Fecha registro material", "fecha_registro_material"],
    ["Fecha Registro sin material", "fecha_registro_sin_material"],
    ["Modo Atención", "modo_atencion"],
    ["Auxiliar", "auxiliar"],
    ["Supervisor", "supervisor_tecnico"],
    ["Torre", "torre"],
    ["Placa vehiculo", "placa_vehiculo_tecnico"],
    ["Conductor", "conductor"],
    ["Tipo Auxilio", "tipo_auxilio"],
    ["Auxilio", "auxilio"],
    ["Aplica Auxilio", "aplica_auxilio"],
];

const CAMPOS_PLANTILLA = [
    "Nº de cliente", "N° de item", "N° de WO de IBS", "Estado", "Fecha de Estado de Orden de Trabajo", "Servicio", "Tipo de cliente", "Prioridad",
    "Proveedor", "Cuadrilla/Técnico Responsable", "CEDULA", "NOMBRE TH", "MODALIDAD", "perimetro",
    "Departamento", "Municipio", "Barrio", "Dirección",
    "Fecha de creación", "Fecha de vencimiento", "Fecha de finalización", "Inicio agendado",
    "Fin agendado", "Descripción de IBS", "Aging", "Región de servicio",
];

/* ─── Modal importar desde Excel ─────────────────────────────────────── */
function ImportModal({ onClose, onImported }) {
    const [fileName, setFileName] = useState("");
    const [filas, setFilas] = useState([]);
    const [errores, setErrores] = useState([]);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState("");
    const [duplicadasInfo, setDuplicadasInfo] = useState(0);
    const [diagnostico, setDiagnostico] = useState(null);

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(""); setFilas([]); setErrores([]); setDuplicadasInfo(0); setDiagnostico(null); setFileName(file.name);

        try {
            const XLSX = await import("xlsx");
            const buf = await file.arrayBuffer();
            // cellDates: true — las columnas de fecha del archivo de origen vienen con hora
            // (ej. "9/25/2026 12:03"), no solo fecha; sin esto xlsx las entrega como el
            // número de serie interno de Excel en vez de una fecha real.
            const wb = XLSX.read(buf, { type: "array", cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

            if (raw.length === 0) { setError("El archivo no tiene filas de datos."); return; }

            const erroresLocal = [];
            // Un mismo WO trae varias filas en el archivo, una por cada ítem/material de esa
            // orden — no son datos repetidos, cada una tiene su propio "N° de item". Por eso
            // se guardan TODAS: la llave para detectar si dos filas del archivo son
            // realmente la misma es WO + N° de item, no el WO solo.
            const filasPorLlave = new Map();
            let combinadas = 0;
            const clavesEncontradas = new Set();

            raw.forEach((row, idx) => {
                const numFila = idx + 2;
                const mapped = {};
                Object.entries(row).forEach(([k, v]) => {
                    const key = IMPORT_HEADER_MAP[normalizeHeader(k)];
                    // Gana la PRIMERA columna que matchee esa clave, no la última: el Exporte
                    // Macaw trae "Subproducto" (texto) y, mucho más adelante, otra columna
                    // "subproducto" en minúscula (un código numérico sin relación) que
                    // normaliza al mismo nombre — sin esto, la segunda pisaba silenciosamente
                    // el texto bueno con el número.
                    if (key && !(key in mapped)) { mapped[key] = typeof v === "string" ? v.trim() : v; clavesEncontradas.add(key); }
                });

                const numeroWo = String(mapped.numero_wo ?? "").trim();
                if (!numeroWo) { erroresLocal.push(`Fila ${numFila}: falta el número de WO.`); return; }
                const numeroItem = String(mapped.numero_item ?? "").trim();
                const llave = `${numeroWo}|${numeroItem}`;
                if (filasPorLlave.has(llave)) combinadas++;

                // Sin columna de ítem en el archivo no se manda numero_item: el backend
                // actualiza entonces todas las filas de ese WO. Mandarlo vacío crearía una
                // fila nueva con ítem "" en vez de actualizar las existentes.
                const fila = { ...mapped, numero_wo: numeroWo };
                if ("numero_item" in mapped) fila.numero_item = numeroItem;
                filasPorLlave.set(llave, fila);
            });

            // Diagnóstico: se muestra SIEMPRE (no solo cuando casi nada coincide), porque ya
            // hubo un caso donde el número de match pasaba el umbral pero igual casi todos
            // los demás campos quedaban vacíos. Mostrar los encabezados crudos que leyó el
            // archivo y cuáles de las 147 filas trajeron cada campo con dato real, para ver
            // la causa exacta de una vez en vez de seguir adivinando nombres a ciegas.
            const totalCamposEsperados = new Set(Object.values(IMPORT_HEADER_MAP)).size;
            const conteoPorCampo = {};
            [...filasPorLlave.values()].forEach((fila) => {
                Object.keys(fila).forEach((campo) => {
                    if (fila[campo] !== "" && fila[campo] != null) {
                        conteoPorCampo[campo] = (conteoPorCampo[campo] ?? 0) + 1;
                    }
                });
            });
            setDiagnostico({
                hojas: wb.SheetNames,
                hojaUsada: wb.SheetNames[0],
                encabezadosCrudos: Object.keys(raw[0]),
                camposEsperados: totalCamposEsperados,
                camposDetectados: clavesEncontradas.size,
                conteoPorCampo,
            });

            setErrores(erroresLocal);
            setDuplicadasInfo(combinadas);
            setFilas(erroresLocal.length === 0 ? [...filasPorLlave.values()] : []);
        } catch {
            setError("No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx).");
        }
    };

    const handleImport = async () => {
        if (filas.length === 0) return;
        setImporting(true);
        setError("");
        try {
            const { data } = await api.post("/work-orders/importar", { items: filas });
            onImported(data);
        } catch (err) {
            const listaErrores = err?.response?.data?.errores;
            setError(
                Array.isArray(listaErrores) ? listaErrores.join(" · ") : (err?.response?.data?.message ?? "No se pudo importar.")
            );
        } finally {
            setImporting(false);
        }
    };

    const handleDescargarPlantilla = async () => {
        const XLSX = await import("xlsx");
        const filaEjemplo = Object.fromEntries(CAMPOS_PLANTILLA.map((c) => [c, ""]));
        const ws = XLSX.utils.json_to_sheet([filaEjemplo]);
        ws["!cols"] = CAMPOS_PLANTILLA.map(() => ({ wch: 24 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "Plantilla_Importar_Work_Orders.xlsx");
    };

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: "min(1100px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>Importar Work Orders desde Excel</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginTop: 0 }}>
                        Se leen las columnas más relevantes del archivo de origen (el resto se ignora): <strong>Nº de cliente</strong> (obligatorio — es donde
                        realmente está el número de WO en este archivo, aunque el título de la columna diga "cliente"),
                        <strong> N° de item</strong> (identifica cada material/línea del mismo WO), <strong>N° de WO de IBS</strong> (otro número de referencia, se guarda aparte),
                        Estado, Fechas, Servicio, Proveedor, Cuadrilla/Técnico Responsable, CEDULA, NOMBRE TH, MODALIDAD, perímetro, ubicación, Aging y Descripción de IBS.
                        {" "}Un mismo WO puede traer varias filas (una por ítem) — todas se guardan. Si una fila con el mismo WO + ítem ya existe, se actualiza; si no, se crea.
                    </p>
                    <button style={{ ...S.btnSecondary, marginBottom: 14 }} onClick={handleDescargarPlantilla}>
                        Descargar plantilla de ejemplo
                    </button>
                    <label htmlFor="import-workorders-file" style={S.fileDrop}>
                        <input id="import-workorders-file" type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
                        <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "0.88rem" }}>
                            {fileName ? "Cambiar archivo" : "Seleccionar archivo Excel"}
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{fileName || ".xlsx o .xls"}</span>
                    </label>
                    {diagnostico && (
                        <div style={{ background: "#fff7e0", color: "#7a5b00", borderRadius: 6, padding: "10px 12px", fontSize: "0.82rem", marginTop: 12 }}>
                            <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
                                Diagnóstico: {diagnostico.camposDetectados} de {diagnostico.camposEsperados} campos esperados coincidieron con algún encabezado del archivo.
                            </p>
                            {diagnostico.hojas.length > 1 && (
                                <p style={{ margin: "0 0 6px" }}>
                                    El archivo tiene {diagnostico.hojas.length} hojas ({diagnostico.hojas.join(", ")}) y se leyó la primera ("{diagnostico.hojaUsada}"). Si los datos reales están en otra hoja, dime cuál.
                                </p>
                            )}
                            <p style={{ margin: "0 0 4px", fontWeight: 700 }}>Cuántas filas trajeron dato real en cada campo (de {filas.length}):</p>
                            <ul style={{ margin: "0 0 8px", paddingLeft: 18, maxHeight: 120, overflowY: "auto" }}>
                                {Object.entries(IMPORT_HEADER_MAP).map(([, campo]) => campo).filter((v, i, a) => a.indexOf(v) === i).map((campo) => (
                                    <li key={campo}>{campo}: {diagnostico.conteoPorCampo[campo] ?? 0}</li>
                                ))}
                            </ul>
                            <p style={{ margin: "0 0 4px", fontWeight: 700 }}>Encabezados EXACTOS que leyó de la fila 1 del archivo:</p>
                            <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 160, overflowY: "auto" }}>
                                {diagnostico.encabezadosCrudos.map((h, i) => <li key={i}>"{h}"</li>)}
                            </ul>
                        </div>
                    )}
                    {filas.length > 0 && (
                        <div style={{ background: "#e0f7f4", color: "#0d6e5a", borderRadius: 6, padding: "8px 12px", fontSize: "0.84rem", fontWeight: 600, marginTop: 12 }}>
                            {filas.length} fila{filas.length !== 1 ? "s" : ""} (WO + ítem) lista{filas.length !== 1 ? "s" : ""} para importar.
                            {duplicadasInfo > 0 && ` (${duplicadasInfo} fila${duplicadasInfo !== 1 ? "s" : ""} con el mismo WO + ítem se combinaron, quedó la más reciente).`}
                        </div>
                    )}
                    {errores.length > 0 && (
                        <div style={{ ...S.errorMsg, marginTop: 12 }}>
                            <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
                                No se puede importar este archivo hasta corregir {errores.length} problema{errores.length !== 1 ? "s" : ""}:
                            </p>
                            <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 160, overflowY: "auto" }}>
                                {errores.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}
                    {error && <div style={{ ...S.errorMsg, marginTop: 12 }}>{error}</div>}
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={importing}>Cancelar</button>
                    <button style={S.btnPrimary} onClick={handleImport} disabled={importing || filas.length === 0}>
                        {importing ? "Importando…" : `Importar ${filas.length} fila${filas.length !== 1 ? "s" : ""}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Modal confirmar eliminación ─────────────────────────────────────── */
function DeleteModal({ item, onClose, onConfirm, deleting }) {
    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, color: "#c0392b" }}>Eliminar Work Order</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <p>¿Eliminar la Work Order <strong>{item.numero_wo}</strong>?</p>
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={deleting}>Cancelar</button>
                    <button style={{ ...S.btnPrimary, background: "#c0392b" }} onClick={onConfirm} disabled={deleting}>
                        {deleting ? "Eliminando…" : "Eliminar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Modal para cambiar el estado de una Work Order ───────────────────── */
function EstadoModal({ item, estados, onClose, onConfirm, saving, error }) {
    const [estado, setEstado] = useState(item.estado || "");
    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800 }}>Cambiar estado — {item.numero_wo}</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <div style={S.formGroup}>
                        <label style={S.label}>Estado</label>
                        <SelectBuscable style={S.input} value={estado} onChange={(e) => setEstado(e.target.value)}>
                            <option value="">Seleccione…</option>
                            {estados.map((e) => <option key={e} value={e}>{e}</option>)}
                        </SelectBuscable>
                    </div>
                    {error && <p style={S.errorMsg}>{error}</p>}
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cancelar</button>
                    <button style={S.btnPrimary} onClick={() => onConfirm(estado)} disabled={saving || !estado}>
                        {saving ? "Guardando…" : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Modal ver todos los campos guardados de una Work Order ──────────── */
const SECCIONES_DETALLE = [
    {
        titulo: "Identificación",
        campos: [
            ["numero_wo", "N° de orden de trabajo"],
            ["numero_orden_trabajo", "Número de orden de trabajo (otro campo)"],
            ["id_encabezado_pedido", "ID del encabezado del pedido"],
            ["numero_item", "N° de ítem"],
            ["numero_wo_ibs", "N° de WO de IBS"],
            ["codigo_sl", "Código de SL"],
            ["estado", "Estado"],
            ["fecha_estado", "Fecha de estado"],
        ],
    },
    {
        titulo: "Servicio",
        campos: [
            ["servicio", "Servicio"],
            ["subproducto", "Subproducto"],
            ["tipo_producto", "Tipo Producto"],
            ["tipo_orden", "Tipo de cliente"],
            ["clase_cliente", "Clase de cliente"],
            ["recursos", "Recursos"],
            ["tecnologia", "Tecnología"],
            ["prioridad", "Prioridad"],
            ["proveedor", "Proveedor"],
        ],
    },
    {
        titulo: "Cliente",
        campos: [
            ["nombre_cliente", "Nombre cliente"],
            ["apellido_cliente", "Apellido(s) cliente"],
            ["no_documento_cliente", "No. Documento"],
            ["telefono_principal", "Teléfono principal"],
            ["tel_casa", "Tel. Casa"],
        ],
    },
    {
        titulo: "Técnico",
        campos: [
            ["nombre_tecnico", "Nombre técnico (importado)"],
            ["cedula_tecnico", "Cédula técnico (importado, define qué ve el técnico)"],
            ["tecnico_agendado", "Técnico agendado"],
            ["cedula_tecnico_agendado", "Cédula técnico agendado"],
            ["nombre_tecnico_cierre", "Quién cerró la WO en el ERP"],
            ["cedula_tecnico_cierre", "Cédula de quién la cerró"],
            ["modalidad", "Modalidad / Tipo Vinculación"],
            ["cuadrilla_tecnico", "Cuadrilla/Técnico (login)"],
            ["nombre_cuadrilla_tecnico", "Nombre cuadrilla/técnico"],
            ["apellido_cuadrilla_tecnico", "Apellido cuadrilla/técnico"],
            ["tecnico_atendio_flag", "Técnico atendió"],
            ["modo_atencion", "Modo de atención"],
        ],
    },
    {
        titulo: "Ubicación",
        campos: [
            ["departamento", "Departamento"],
            ["municipio", "Municipio"],
            ["barrio", "Barrio"],
            ["direccion", "Dirección"],
            ["cambio_domicilio_entre_calles", "Cambio de domicilio (entre calles)"],
            ["puntos_referencia", "Puntos de referencia"],
            ["perimetro", "Perímetro de la zona"],
            ["perimetro_venta", "Perímetro de la venta"],
            ["pais", "País"],
            ["codigo_postal", "Código Postal"],
            ["region_servicio", "Región de servicio"],
            ["georreferencia", "Georreferencia"],
            ["coordenada_x", "Coordenada X"],
            ["coordenada_y", "Coordenada Y"],
        ],
    },
    {
        titulo: "Estado y visita",
        campos: [
            ["estado_orden_trabajo", "Estado de orden de trabajo"],
            ["estado_descarga", "Estado de la descarga"],
            ["estado_visita", "Estado de la visita"],
            ["numero_visita", "Número de visita"],
            ["estado_en_fecha", "Estado en fecha"],
            ["estado_comercial", "Estado Comercial"],
            ["categoria", "Categoría"],
            ["tipo_wo", "Tipo"],
            ["jornada", "Jornada"],
            ["agendamiento_externo", "Agendamiento externo"],
            ["dias_atraso", "Días de atraso"],
            ["dias_atraso_sp", "Días de atraso SP"],
            ["reiteracion_servicio", "Reiteración de servicio"],
            ["wo_anterior", "WO Anterior"],
            ["wo_fisica_ok", "WO Física OK"],
            ["motivo", "Motivo"],
            ["razones", "Razones"],
        ],
    },
    {
        titulo: "Fechas y seguimiento",
        campos: [
            ["fecha_creacion", "Fecha de creación"],
            ["fecha_vencimiento", "Fecha de vencimiento"],
            ["fecha_finalizacion", "Fecha de finalización"],
            ["fecha_programacion", "Fecha Programación"],
            ["fecha_publicacion", "Fecha Publicación"],
            ["fecha_ultima_reasignacion", "Fecha última de reasignación"],
            ["inicio_agendado", "Inicio agendado"],
            ["fin_agendado", "Fin agendado"],
            ["aging", "Aging"],
        ],
    },
    {
        titulo: "Cancelación",
        campos: [
            ["fecha_cancelacion", "Fecha Cancelación"],
            ["razon_cancelacion", "Razón Cancelación"],
            ["observaciones_cancelacion", "Observaciones Cancelación"],
        ],
    },
    {
        titulo: "Materiales y pago",
        campos: [
            ["descarga_materiales_obligatoria", "Descarga Materiales Obligatoria"],
            ["descarga_materiales_confirmada", "Descarga Materiales Confirmada"],
            ["consumio_material", "Consumió Material"],
            ["se_paga", "Se Paga"],
            ["consignada", "Consignada"],
            ["pago", "Pago"],
            ["paga_por_directv", "Paga por Directv"],
            ["comision_pagada", "Comisión pagada"],
            ["valor_comision", "Valor comisión"],
            ["fecha_pago", "Fecha Pago"],
            ["prueba_calidad", "Prueba de Calidad"],
            ["numero_ticket_aprobacion", "Número de ticket de aprobación"],
            ["razon_prueba_calidad_fallida", "Razón de Prueba de Calidad Fallida"],
            ["contrato_enviado", "Contrato enviado"],
            ["registrado_por", "Registrado por"],
            ["fecha_registro_material", "Fecha registro material"],
            ["fecha_registro_sin_material", "Fecha Registro sin material"],
        ],
    },
    {
        titulo: "Auxilio de transporte",
        campos: [
            ["auxiliar", "Auxiliar"],
            ["torre", "Torre"],
            ["conductor", "Conductor"],
            ["tipo_auxilio", "Tipo Auxilio"],
            ["auxilio", "Auxilio"],
            ["aplica_auxilio", "Aplica Auxilio"],
        ],
    },
];

function CampoSoloLectura({ label, valor, span }) {
    return (
        <div style={{ ...S.formGroup, ...(span ? { gridColumn: `span ${span}` } : {}) }}>
            <label style={S.label}>{label}</label>
            <input style={{ ...S.input, background: "var(--bg)", color: "var(--text-muted)", cursor: "default" }} value={valor || ""} placeholder="—" readOnly />
        </div>
    );
}

function VerModal({ item, onClose }) {
    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: "min(1100px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>Work Order {item.numero_wo}</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    {SECCIONES_DETALLE.map((seccion) => (
                        <div key={seccion.titulo} style={{ marginBottom: 18 }}>
                            <p className="section-title" style={{ marginBottom: 10 }}>{seccion.titulo}</p>
                            <div className="form-grid" style={S.grid4}>
                                {seccion.campos.map(([campo, label]) => (
                                    <CampoSoloLectura key={campo} label={label} valor={item[campo]} />
                                ))}
                            </div>
                        </div>
                    ))}
                    <p className="section-title" style={{ marginBottom: 10 }}>Descripción</p>
                    <div className="form-grid" style={S.grid4}>
                        <CampoSoloLectura label="Descripción de IBS" valor={item.descripcion} span={4} />
                    </div>
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function WorkOrdersCrud() {
    // Acciones que la matriz de Permisos le deja hacer a este rol aquí (el servidor las vuelve a validar).
    const puede = useAcciones();
    const { user } = useAuth();
    // Un técnico indirecto (aliado, tiene aliado_id) no puede cambiar el estado de su propia
    // WO — solo verla; el servidor vuelve a validar esto en WorkOrderController::update().
    const esTecnicoIndirecto = user?.rol === "tecnico" && !!user?.aliado_id;
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debSearch = useDebounce(search, 300);
    const [estadoFiltro, setEstadoFiltro] = useState("");
    const [proveedorFiltro, setProveedorFiltro] = useState("");
    const [importOpen, setImportOpen] = useState(false);
    const [verTarget, setVerTarget] = useState(null);
    const [estadoTarget, setEstadoTarget] = useState(null);
    const [guardandoEstado, setGuardandoEstado] = useState(false);
    const [errorEstado, setErrorEstado] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [exportando, setExportando] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    // Por páginas: con miles de WOs, traerlas todas pesaba megas y la tabla tardaba en
    // pintarse. La búsqueda y los filtros se siguen aplicando sobre todas en el servidor.
    const [pagina, setPagina] = useState(1);
    const [porPagina, setPorPagina] = useState(50);
    useEffect(() => setPagina(1), [debSearch, estadoFiltro, proveedorFiltro]);

    const { data: resultado, isLoading } = useQuery({
        queryKey: ["work-orders", debSearch, estadoFiltro, proveedorFiltro, porPagina, pagina],
        queryFn: () =>
            api
                .get("/work-orders", { params: { search: debSearch || undefined, estado: estadoFiltro || undefined, proveedor: proveedorFiltro || undefined, page: pagina, per_page: porPagina } })
                .then((r) => r.data),
        placeholderData: (prev) => prev,
    });
    const workOrders = resultado?.data ?? [];
    const totalFiltradas = resultado?.total ?? 0;
    const ultimaPagina = resultado?.last_page ?? 1;
    // Si se eliminó la última fila de la última página, volver a la anterior.
    useEffect(() => {
        if (pagina > ultimaPagina) setPagina(ultimaPagina);
    }, [pagina, ultimaPagina]);

    // Total y opciones de los filtros, sin descargar todas las WOs.
    const { data: resumen } = useQuery({
        queryKey: ["work-orders", "resumen"],
        queryFn: () => api.get("/work-orders/resumen").then((r) => r.data),
        staleTime: 60 * 1000,
    });
    const estados = resumen?.estados ?? [];
    const proveedores = resumen?.proveedores ?? [];

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ["work-orders"] });
    };

    /**
     * Exporta TODAS las WOs que cumplen los filtros actuales (no solo la página visible),
     * con las columnas del "Exporte Macaw" tal como las pidió el usuario: dato real donde ya
     * lo guardamos, "N/D" donde esa columna no existe en nuestro sistema.
     */
    const handleExportar = async () => {
        setExportando(true);
        try {
            const { data: todas } = await api.get("/work-orders", {
                params: { search: debSearch || undefined, estado: estadoFiltro || undefined, proveedor: proveedorFiltro || undefined },
            });
            const XLSX = await import("xlsx");
            const rows = todas.map((w) => Object.fromEntries(
                COLUMNAS_EXPORTE_MACAW.map(([label, campo]) => {
                    if (!campo) return [label, "N/D"];
                    // Cadena de respaldo: el primer campo de la lista que tenga dato gana
                    // (ej. "Tipo Vinculación" sale de la WO si la trajo importada, si no de
                    // la ficha del técnico).
                    const candidatos = Array.isArray(campo) ? campo : [campo];
                    const valor = candidatos.map((c) => w[c]).find((v) => v !== null && v !== undefined && v !== "");
                    return [label, valor ?? ""];
                }),
            ));
            const ws = XLSX.utils.json_to_sheet(rows);
            ws["!cols"] = COLUMNAS_EXPORTE_MACAW.map(() => ({ wch: 22 }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Work Orders");
            const fecha = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `Work_Orders_${fecha}.xlsx`);
            showToast(`Excel exportado (${rows.length} fila${rows.length !== 1 ? "s" : ""}).`);
        } catch {
            showToast("No se pudo exportar.");
        } finally {
            setExportando(false);
        }
    };

    const handleCambiarEstado = async (estado) => {
        if (!estadoTarget) return;
        setGuardandoEstado(true);
        setErrorEstado(null);
        try {
            await api.put(`/work-orders/${estadoTarget.id}`, { estado });
            invalidate();
            setEstadoTarget(null);
            showToast("Estado actualizado.");
        } catch (err) {
            setErrorEstado(err?.response?.data?.message ?? "No se pudo cambiar el estado.");
        } finally {
            setGuardandoEstado(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/work-orders/${deleteTarget.id}`);
            invalidate();
            setDeleteTarget(null);
            showToast("Work Order eliminada.");
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo eliminar.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{resumen?.total ?? 0}</div>
                    <div className="stat-label">Total Work Orders</div>
                </div>
            </div>

            <div style={S.toolbar}>
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}><IconSearch size={15} /></span>
                    <input
                        style={S.searchInput}
                        placeholder="Buscar por WO, WO IBS, técnico, municipio o descripción…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <SelectBuscable style={S.filtroSelect} value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                    <option value="">Todos los estados</option>
                    {estados.map((e) => <option key={e} value={e}>{e}</option>)}
                </SelectBuscable>
                <SelectBuscable style={S.filtroSelect} value={proveedorFiltro} onChange={(e) => setProveedorFiltro(e.target.value)}>
                    <option value="">Todos los proveedores</option>
                    {proveedores.map((p) => <option key={p} value={p}>{p}</option>)}
                </SelectBuscable>
                {puede.exportar && <button className="btn-secondary" onClick={handleExportar} disabled={exportando}>
                    {exportando ? "Exportando…" : "Exportar Excel"}
                </button>}
                {puede.importar && <button className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setImportOpen(true)}>
                    <IconPlus size={14} /> Importar
                </button>}
            </div>

            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
                ) : workOrders.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p>No hay Work Orders con estos filtros.</p>
                    </div>
                ) : (
                    <table className="data-table" style={{ fontSize: "0.85rem" }}>
                        <thead>
                            <tr>
                                <th>N° WO</th>
                                <th>Ítem</th>
                                <th>N° WO IBS</th>
                                <th>Estado</th>
                                <th>Servicio</th>
                                <th>Proveedor</th>
                                <th>Técnico</th>
                                <th>Perímetro</th>
                                <th>Municipio</th>
                                <th>Departamento</th>
                                <th>Fecha de atención</th>
                                <th>Fecha de finalización</th>
                                <th>Aging</th>
                                <th style={{ textAlign: "center" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workOrders.map((w) => (
                                <tr key={w.id}>
                                    <td style={{ fontWeight: 700 }}>{w.numero_wo}</td>
                                    <td style={{ color: "var(--text-muted)" }}>{w.numero_item || "—"}</td>
                                    <td style={{ color: "var(--text-muted)" }}>{w.numero_wo_ibs || "—"}</td>
                                    <td>{w.estado || "—"}</td>
                                    <td>{w.servicio || "—"}</td>
                                    <td style={{ color: "var(--text-muted)" }}>{w.proveedor || "—"}</td>
                                    <td title={w.cuadrilla_tecnico || ""}>{w.nombre_tecnico || w.cuadrilla_tecnico || "—"}</td>
                                    <td>{w.perimetro || "—"}</td>
                                    <td>{w.municipio || "—"}</td>
                                    <td style={{ color: "var(--text-muted)" }}>{w.departamento || "—"}</td>
                                    <td>{w.fecha_estado || "—"}</td>
                                    <td>{w.fecha_finalizacion || "—"}</td>
                                    <td style={{ textAlign: "center" }}>{w.aging ?? "—"}</td>
                                    <td style={{ textAlign: "center" }}>
                                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                            <button style={S.actionBtn("var(--primary-light)", "var(--primary-dark)")} title="Ver todos los datos" onClick={() => setVerTarget(w)}>
                                                <IconEye size={14} />
                                            </button>
                                            {puede.editar && !esTecnicoIndirecto && (
                                                <button style={S.actionBtn("#eaf3ff", "#2566af")} title="Cambiar estado" onClick={() => setEstadoTarget(w)}>
                                                    <IconEdit size={14} />
                                                </button>
                                            )}
                                            {puede.eliminar && <button style={S.actionBtn("#fce8e8", "#a33")} title="Eliminar" onClick={() => setDeleteTarget(w)}>
                                                <IconTrash size={14} />
                                            </button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {totalFiltradas > 0 && (
                <div style={S.paginationBar}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={S.label}>Ver #</label>
                        <select
                            style={{ ...S.input, width: 80 }}
                            value={porPagina}
                            onChange={(e) => {
                                setPorPagina(Number(e.target.value));
                                setPagina(1);
                            }}
                        >
                            {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                            {(pagina - 1) * porPagina + 1}–{Math.min(pagina * porPagina, totalFiltradas)} de {totalFiltradas}
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button style={S.pageBtn(pagina === 1)} disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>‹</button>
                        <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>Página {pagina} de {ultimaPagina}</span>
                        <button style={S.pageBtn(pagina === ultimaPagina)} disabled={pagina === ultimaPagina} onClick={() => setPagina((p) => p + 1)}>›</button>
                    </div>
                </div>
            )}

            {importOpen && (
                <ImportModal
                    onClose={() => setImportOpen(false)}
                    onImported={(data) => {
                        invalidate();
                        setImportOpen(false);
                        showToast(`Importación lista: ${data.creadas} creada(s), ${data.actualizadas} actualizada(s).`);
                    }}
                />
            )}

            {verTarget && (
                <VerModal item={verTarget} onClose={() => setVerTarget(null)} />
            )}

            {estadoTarget && (
                <EstadoModal
                    item={estadoTarget}
                    estados={estados}
                    onClose={() => { setEstadoTarget(null); setErrorEstado(null); }}
                    onConfirm={handleCambiarEstado}
                    saving={guardandoEstado}
                    error={errorEstado}
                />
            )}

            {deleteTarget && (
                <DeleteModal
                    item={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleDelete}
                    deleting={deleting}
                />
            )}
        </div>
    );
}

const S = {
    toolbar: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" },
    searchWrap: { position: "relative", flex: 1, minWidth: 240, maxWidth: 420 },
    searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", display: "flex" },
    searchInput: { width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", boxSizing: "border-box" },
    filtroSelect: { padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", minWidth: 180 },
    tableWrap: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    actionBtn: (bg, color) => ({ background: bg, border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color, display: "flex", alignItems: "center", justifyContent: "center" }),
    empty: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", width: "100%", fontFamily: "Nunito,sans-serif", maxHeight: "92vh", display: "flex", flexDirection: "column" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1.5px solid var(--border)", flexShrink: 0 },
    modalBody: { padding: "18px 22px", overflowY: "auto", flex: 1 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px 18px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },
    grid4: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(230px, 100%), 1fr))", gap: 14 },
    formGroup: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" },
    input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", color: "var(--text)", background: "var(--white)", outline: "none" },
    btnPrimary: { padding: "9px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnSecondary: { padding: "9px 18px", background: "var(--white)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", borderRadius: 6 },
    errorMsg: { background: "#fce8e8", color: "#c0392b", borderRadius: 6, padding: "8px 12px", fontSize: "0.84rem", fontWeight: 600, marginTop: 10 },
    toast: { position: "fixed", bottom: 28, right: 28, background: "var(--primary)", color: "#fff", borderRadius: "var(--radius-sm)", padding: "13px 22px", fontWeight: 700, fontSize: "0.92rem", zIndex: 99999, boxShadow: "0 8px 28px rgba(26,155,140,0.35)" },
    paginationBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", flexWrap: "wrap", gap: 10 },
    pageBtn: (disabled) => ({
        minWidth: 32, height: 32, padding: "0 8px", border: "1.5px solid var(--border)", borderRadius: 6,
        background: disabled ? "var(--bg)" : "var(--white)", color: disabled ? "var(--text-muted)" : "var(--text)",
        fontWeight: 700, fontSize: "0.85rem", cursor: disabled ? "default" : "pointer",
    }),
    fileDrop: {
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "22px 16px", border: "1.5px dashed var(--primary)", borderRadius: "var(--radius-sm)",
        background: "var(--bg)", color: "var(--primary)", cursor: "pointer", textAlign: "center",
    },
};
