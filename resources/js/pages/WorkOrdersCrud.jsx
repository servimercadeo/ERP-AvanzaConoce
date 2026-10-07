import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import { IconSearch, IconEmptySearch, IconLoading, IconClose, IconTrash, IconPlus, IconEye } from "../components/Icons";
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
    "aging": "aging",
    "region de servicio": "region_servicio",
};

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
                    if (key) { mapped[key] = typeof v === "string" ? v.trim() : v; clavesEncontradas.add(key); }
                });

                const numeroWo = String(mapped.numero_wo ?? "").trim();
                if (!numeroWo) { erroresLocal.push(`Fila ${numFila}: falta el número de WO.`); return; }
                const numeroItem = String(mapped.numero_item ?? "").trim();
                const llave = `${numeroWo}|${numeroItem}`;
                if (filasPorLlave.has(llave)) combinadas++;

                filasPorLlave.set(llave, { ...mapped, numero_wo: numeroWo, numero_item: numeroItem });
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
        <div style={S.overlay} onClick={onClose}>
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
        <div style={S.overlay} onClick={onClose}>
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

/* ─── Modal ver todos los campos guardados de una Work Order ──────────── */
const SECCIONES_DETALLE = [
    {
        titulo: "Identificación",
        campos: [
            ["numero_wo", "N° de orden de trabajo"],
            ["numero_item", "N° de ítem"],
            ["numero_wo_ibs", "N° de WO de IBS"],
            ["estado", "Estado"],
            ["fecha_estado", "Fecha de estado"],
        ],
    },
    {
        titulo: "Servicio",
        campos: [
            ["servicio", "Servicio"],
            ["tipo_orden", "Tipo de cliente"],
            ["prioridad", "Prioridad"],
            ["proveedor", "Proveedor"],
        ],
    },
    {
        titulo: "Técnico",
        campos: [
            ["nombre_tecnico", "Nombre técnico"],
            ["cedula_tecnico", "Cédula técnico"],
            ["modalidad", "Modalidad"],
            ["cuadrilla_tecnico", "Cuadrilla/Técnico (login)"],
        ],
    },
    {
        titulo: "Ubicación",
        campos: [
            ["departamento", "Departamento"],
            ["municipio", "Municipio"],
            ["barrio", "Barrio"],
            ["direccion", "Dirección"],
            ["perimetro", "Perímetro"],
            ["region_servicio", "Región de servicio"],
        ],
    },
    {
        titulo: "Fechas y seguimiento",
        campos: [
            ["fecha_creacion", "Fecha de creación"],
            ["fecha_vencimiento", "Fecha de vencimiento"],
            ["fecha_finalizacion", "Fecha de finalización"],
            ["inicio_agendado", "Inicio agendado"],
            ["fin_agendado", "Fin agendado"],
            ["aging", "Aging"],
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
        <div style={S.overlay} onClick={onClose}>
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
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debSearch = useDebounce(search, 300);
    const [estadoFiltro, setEstadoFiltro] = useState("");
    const [proveedorFiltro, setProveedorFiltro] = useState("");
    const [importOpen, setImportOpen] = useState(false);
    const [verTarget, setVerTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const { data: workOrders = [], isLoading } = useQuery({
        queryKey: ["work-orders", debSearch, estadoFiltro, proveedorFiltro],
        queryFn: () =>
            api
                .get("/work-orders", { params: { search: debSearch || undefined, estado: estadoFiltro || undefined, proveedor: proveedorFiltro || undefined } })
                .then((r) => r.data),
    });

    const { data: todasSinFiltro = [] } = useQuery({
        queryKey: ["work-orders", "catalogos"],
        queryFn: () => api.get("/work-orders").then((r) => r.data),
        staleTime: 60 * 1000,
    });

    const estados = useMemo(
        () => [...new Set(todasSinFiltro.map((w) => w.estado).filter(Boolean))].sort(),
        [todasSinFiltro],
    );
    const proveedores = useMemo(
        () => [...new Set(todasSinFiltro.map((w) => w.proveedor).filter(Boolean))].sort(),
        [todasSinFiltro],
    );

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ["work-orders"] });
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
                    <div className="stat-num">{todasSinFiltro.length}</div>
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
                <button className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setImportOpen(true)}>
                    <IconPlus size={14} /> Importar
                </button>
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
                                            <button style={S.actionBtn("#fce8e8", "#a33")} title="Eliminar" onClick={() => setDeleteTarget(w)}>
                                                <IconTrash size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

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
    fileDrop: {
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "22px 16px", border: "1.5px dashed var(--primary)", borderRadius: "var(--radius-sm)",
        background: "var(--bg)", color: "var(--primary)", cursor: "pointer", textAlign: "center",
    },
};
