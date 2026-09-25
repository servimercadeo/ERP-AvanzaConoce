import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import { IconEdit, IconTrash, IconClose, IconEmptySearch, IconSearch, IconLoading } from "../components/Icons";
import { SearchableSelect } from "../components/SearchableSelect";

const POR_PAGINA = 10;

/* ─── Modal agregar / editar ──────────────────────────────────────────── */
function ItemModal({ item, tiposProducto, sedes, esGeneral, onClose, onSave, saving, errorMsg }) {
    const isEdit = !!item;
    const [form, setForm] = useState(item
        ? { tipo_producto_id: item.tipo_producto_id, sede_id: item.sede_id, talla: item.talla ?? "", cantidad: item.cantidad }
        : { tipo_producto_id: tiposProducto[0]?.id ?? "", sede_id: sedes[0]?.id ?? "", talla: "", cantidad: 0 });

    // "Serializado" es un check ad-hoc de esta carga (no una propiedad del producto):
    // al marcarlo, se piden tantos inputs de serial como indique "Cantidad". Al crear,
    // esos seriales son los de las unidades NUEVAS que se agregan; al editar, reemplazan
    // por completo el conjunto actual (así se agregan, editan o quitan seriales).
    const [serializado, setSerializado] = useState(isEdit && (item?.series?.length ?? 0) > 0);
    const [seriesForm, setSeriesForm] = useState(isEdit ? (item?.series ?? []) : []);
    const [validationError, setValidationError] = useState("");

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const resizeSeries = (n) => {
        setSeriesForm((prev) => {
            const next = prev.slice(0, Math.max(0, n));
            while (next.length < n) next.push("");
            return next;
        });
    };

    const handleCantidadChange = (e) => {
        const val = e.target.value;
        setForm((f) => ({ ...f, cantidad: val }));
        if (serializado) resizeSeries(Math.max(0, Number(val) || 0));
    };

    const handleToggleSerializado = (checked) => {
        setSerializado(checked);
        if (checked) resizeSeries(Math.max(0, Number(form.cantidad) || 0));
    };

    const handleSerialChange = (idx, value) => {
        setSeriesForm((prev) => prev.map((s, i) => (i === idx ? value : s)));
    };

    const handleGuardarClick = () => {
        setValidationError("");
        if (!serializado) {
            // Al editar sin el check, "series: []" borra cualquier serial que tuviera antes.
            // Al crear, se omite: no hay nada que reemplazar.
            onSave({ ...form, ...(isEdit ? { series: [] } : {}) }, isEdit ? item.id : null);
            return;
        }
        const limpios = seriesForm.map((s) => s.trim());
        if (limpios.length === 0 || limpios.some((s) => !s)) {
            setValidationError("Completa el serial de cada unidad (no puede quedar vacío).");
            return;
        }
        if (new Set(limpios).size !== limpios.length) {
            setValidationError("Hay seriales repetidos en la lista.");
            return;
        }
        onSave({ ...form, series: limpios }, isEdit ? item.id : null);
    };

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={{ ...S.modal, maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>{isEdit ? "Editar item" : "Nuevo item"}</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <div style={S.grid2}>
                        <div style={{ ...S.formGroup, gridColumn: "span 2" }}>
                            <label style={S.label}>Producto *</label>
                            <select style={S.input} value={form.tipo_producto_id} onChange={set("tipo_producto_id")} disabled={isEdit}>
                                {tiposProducto.map((t) => <option key={t.id} value={t.id}>{esGeneral ? `${t.nombre} (${t.categoria})` : t.nombre}</option>)}
                            </select>
                        </div>
                        <div style={{ ...S.formGroup, gridColumn: "span 2" }}>
                            <label style={S.label}>Sede *</label>
                            <SearchableSelect
                                value={form.sede_id}
                                onChange={(v) => setForm((f) => ({ ...f, sede_id: v }))}
                                options={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
                                defaultValue=""
                                disabled={isEdit}
                            />
                        </div>
                        <div style={{ ...S.formGroup, gridColumn: "span 2" }}>
                            <label style={S.label}>Talla (opcional)</label>
                            <input
                                type="text"
                                style={S.input}
                                value={form.talla}
                                onChange={set("talla")}
                                disabled={isEdit}
                                placeholder="Solo si el producto la necesita, ej. 40, M, L…"
                            />
                        </div>
                        <div style={{ ...S.formGroup, gridColumn: "span 2" }}>
                            <label style={S.label}>{isEdit ? "Cantidad" : "Cantidad a agregar"}</label>
                            <input type="number" min={0} style={S.input} value={form.cantidad} onChange={handleCantidadChange} />
                        </div>
                        <div style={{ ...S.formGroup, gridColumn: "span 2" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={serializado}
                                    onChange={(e) => handleToggleSerializado(e.target.checked)}
                                />
                                <span style={S.label}>Es serializado (pide un serial por unidad)</span>
                            </label>
                        </div>
                        {serializado && (
                            <div style={{ ...S.formGroup, gridColumn: "span 2" }}>
                                <label style={S.label}>
                                    {isEdit ? "Seriales de las unidades" : `Serial de cada unidad nueva (${seriesForm.length})`}
                                </label>
                                {seriesForm.length === 0 ? (
                                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
                                        Escribe una cantidad mayor a 0 para ingresar los seriales.
                                    </p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                                        {seriesForm.map((s, idx) => (
                                            <input
                                                key={idx}
                                                type="text"
                                                placeholder={`Serial unidad ${idx + 1}`}
                                                style={S.input}
                                                value={s}
                                                onChange={(e) => handleSerialChange(idx, e.target.value)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {(validationError || errorMsg) && <div style={S.errorMsg}>{validationError || errorMsg}</div>}
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cancelar</button>
                    <button style={S.btnPrimary} onClick={handleGuardarClick} disabled={saving}>
                        {saving ? "Guardando…" : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Modal importar desde Excel ───────────────────────────────────────
   Mismo patrón que ya usa ProductosDotacion.jsx / PedidosGlobalesCrud.jsx: se
   parsea el archivo en el navegador con `xlsx` y se manda el JSON ya armado al
   backend, que hace la validación autoritativa y la escritura real. A
   diferencia de esos, aquí CUALQUIER fila inválida bloquea el archivo entero
   (no se salta filas silenciosamente) — el pedido explícito fue "si hay algún
   nombre de producto que no exista, que salga una alerta y no deje subir".
─────────────────────────────────────────────────────────────────────── */
const normalizeHeader = (s) => (s ?? "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const IMPORT_HEADER_MAP = {
    categoria: "categoria",
    producto: "producto",
    talla: "talla",
    sede: "sede",
    cantidad: "cantidad",
    seriales: "series",
    serial: "series",
};

function ImportModal({ categoria, esGeneral, tiposProducto, sedes, onClose, onImported }) {
    const [fileName, setFileName] = useState("");
    const [filas, setFilas] = useState([]);
    const [errores, setErrores] = useState([]);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState("");

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(""); setFilas([]); setErrores([]); setFileName(file.name);

        try {
            const XLSX = await import("xlsx");
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

            if (raw.length === 0) { setError("El archivo no tiene filas de datos."); return; }

            const erroresLocal = [];
            const filasLocal = [];
            const serialesVistos = new Map();

            raw.forEach((row, idx) => {
                const numFila = idx + 2; // +2: la fila 1 es el encabezado
                const mapped = {};
                Object.entries(row).forEach(([k, v]) => {
                    const key = IMPORT_HEADER_MAP[normalizeHeader(k)];
                    if (key) mapped[key] = typeof v === "string" ? v.trim() : v;
                });

                const nombreProducto = String(mapped.producto ?? "").trim();
                const nombreCategoria = String(mapped.categoria ?? "").trim();
                const nombreSede = String(mapped.sede ?? "").trim();
                const cantidad = Number(mapped.cantidad);
                const seriesTexto = String(mapped.series ?? "").trim();
                const series = seriesTexto ? seriesTexto.split(",").map((s) => s.trim()).filter(Boolean) : [];

                if (!nombreProducto) { erroresLocal.push(`Fila ${numFila}: falta el nombre del producto.`); return; }
                if (esGeneral && !nombreCategoria) { erroresLocal.push(`Fila ${numFila}: falta la categoría.`); return; }
                if (!nombreSede) { erroresLocal.push(`Fila ${numFila}: falta la sede.`); return; }
                if (!Number.isFinite(cantidad) || cantidad <= 0) { erroresLocal.push(`Fila ${numFila}: la cantidad debe ser un número mayor a 0.`); return; }

                const tipo = tiposProducto.find((t) =>
                    t.nombre.trim().toLowerCase() === nombreProducto.toLowerCase() &&
                    (!esGeneral || (t.categoria ?? "").trim().toLowerCase() === nombreCategoria.toLowerCase())
                );
                if (!tipo) {
                    erroresLocal.push(`Fila ${numFila}: el producto "${nombreProducto}"${esGeneral ? ` en la categoría "${nombreCategoria}"` : ""} no existe en el catálogo. Corrige el nombre o créalo primero en Parametros > Tipo de Producto.`);
                    return;
                }

                const sede = sedes.find((s) => s.nombre.trim().toLowerCase() === nombreSede.toLowerCase());
                if (!sede) {
                    erroresLocal.push(`Fila ${numFila}: la sede "${nombreSede}" no existe.`);
                    return;
                }

                if (series.length > 0 && series.length !== cantidad) {
                    erroresLocal.push(`Fila ${numFila}: hay ${series.length} serial(es) pero la cantidad es ${cantidad}; deben coincidir.`);
                    return;
                }
                for (const serial of series) {
                    if (serialesVistos.has(serial)) {
                        erroresLocal.push(`Fila ${numFila}: el serial "${serial}" está repetido (ya aparece en la fila ${serialesVistos.get(serial)}).`);
                        return;
                    }
                    serialesVistos.set(serial, numFila);
                }

                filasLocal.push({
                    tipo_producto_id: tipo.id,
                    sede_id: sede.id,
                    talla: String(mapped.talla ?? "").trim(),
                    cantidad,
                    series,
                });
            });

            setErrores(erroresLocal);
            setFilas(erroresLocal.length === 0 ? filasLocal : []);
        } catch {
            setError("No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx).");
        }
    };

    const handleImport = async () => {
        if (filas.length === 0) return;
        setImporting(true);
        setError("");
        try {
            const { data } = await api.post("/inventario-productos/importar", {
                categoria: esGeneral ? null : categoria,
                items: filas,
            });
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
        const ejemploTipo = tiposProducto[0];
        const ejemploSede = sedes[0];
        const filaEjemplo = {
            ...(esGeneral ? { Categoría: ejemploTipo?.categoria ?? "" } : {}),
            Producto: ejemploTipo?.nombre ?? "",
            Talla: "",
            Sede: ejemploSede?.nombre ?? "",
            Cantidad: 1,
            Seriales: "",
        };
        const ws = XLSX.utils.json_to_sheet([filaEjemplo]);
        ws["!cols"] = esGeneral
            ? [{ wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 30 }]
            : [{ wch: 30 }, { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 30 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");

        // Hojas de referencia para copiar y pegar los nombres EXACTOS (sedes y
        // productos): van en hojas aparte porque el importador solo lee la primera
        // hoja del archivo, así que no interfieren para nada con la importación.
        const wsSedes = XLSX.utils.json_to_sheet(sedes.map((s) => ({ Sede: s.nombre })));
        wsSedes["!cols"] = [{ wch: 40 }];
        XLSX.utils.book_append_sheet(wb, wsSedes, "Sedes (copiar y pegar)");

        const wsProductos = XLSX.utils.json_to_sheet(
            tiposProducto.map((t) => esGeneral ? { Producto: t.nombre, Categoría: t.categoria } : { Producto: t.nombre })
        );
        wsProductos["!cols"] = esGeneral ? [{ wch: 40 }, { wch: 20 }] : [{ wch: 40 }];
        XLSX.utils.book_append_sheet(wb, wsProductos, "Productos (copiar y pegar)");

        XLSX.writeFile(wb, `Plantilla_Importar_${esGeneral ? "General" : categoria}.xlsx`.replace(/\s+/g, "_"));
    };

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={{ ...S.modal, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>Importar desde Excel</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginTop: 0 }}>
                        Columnas: {esGeneral
                            ? <strong>Categoría, Producto, Talla, Sede, Cantidad, Seriales</strong>
                            : <strong>Producto, Talla, Sede, Cantidad, Seriales</strong>}.
                        {" "}Talla y Seriales son opcionales (seriales separados por coma; deben ser tantos como la Cantidad de esa fila).
                        {" "}El producto debe existir ya en el catálogo — si algún nombre no coincide con ninguno, el archivo completo se rechaza.
                        {" "}Si ya hay stock de ese producto/talla en esa sede, la cantidad se suma; si no, se crea un item nuevo.
                        {" "}La plantilla trae dos hojas aparte con los nombres exactos de <strong>sedes</strong> y <strong>productos</strong> para copiar y pegar (no interfieren con la importación: solo se lee la primera hoja).
                    </p>
                    <button style={{ ...S.btnSecondary, marginBottom: 14 }} onClick={handleDescargarPlantilla}>
                        Descargar plantilla de ejemplo
                    </button>
                    <label htmlFor="import-inventario-file" style={S.fileDrop}>
                        <input id="import-inventario-file" type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
                        <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "0.88rem" }}>
                            {fileName ? "Cambiar archivo" : "Seleccionar archivo Excel"}
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{fileName || ".xlsx o .xls"}</span>
                    </label>
                    {filas.length > 0 && (
                        <div style={{ background: "#e0f7f4", color: "#0d6e5a", borderRadius: 6, padding: "8px 12px", fontSize: "0.84rem", fontWeight: 600, marginTop: 12 }}>
                            {filas.length} fila{filas.length !== 1 ? "s" : ""} lista{filas.length !== 1 ? "s" : ""} para importar.
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
                    <span style={{ fontWeight: 800, color: "#c0392b" }}>Eliminar item</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <p>¿Eliminar <strong>{item.producto}</strong> de <strong>{item.sede}</strong>?</p>
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

/* ═══════════════════════════════════════════════════════════════════════
   Componente genérico: inventario real (base de datos) "por sede" para
   una categoría de producto. Misma mecánica que Inventario de Dotación,
   pero sin proyecto/género/talla, que son propios de la ropa de dotación.
═══════════════════════════════════════════════════════════════════════ */
export default function InventarioCategoriaCrud({ categoria }) {
    // Sin `categoria` fija = "Inventario General": todo el inventario de todas las
    // categorías (incluidas las nuevas creadas en Parametros > Categoría del Producto,
    // salvo Dotación, que tiene su propio inventario aparte), con un filtro adicional
    // para acotar por categoría si se quiere.
    const esGeneral = !categoria;
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [sedeFiltro, setSedeFiltro] = useState("Todas");
    const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
    const [pagina, setPagina] = useState(1);
    const [addOpen, setAddOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);
    const [toast, setToast] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formError, setFormError] = useState("");

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const categoriaActiva = esGeneral
        ? (categoriaFiltro !== "Todas" ? categoriaFiltro : undefined)
        : categoria;

    const filtros = {
        categoria: categoriaActiva,
        sede_id: sedeFiltro !== "Todas" ? sedeFiltro : undefined,
        search: debouncedSearch || undefined,
    };

    const { data: items = [], isLoading, isFetching } = useQuery({
        queryKey: ["inventario-productos", filtros],
        queryFn: () => api.get("/inventario-productos", { params: filtros }).then((r) => r.data),
        placeholderData: (prev) => prev,
    });

    useEffect(() => { setPagina(1); }, [categoriaActiva, sedeFiltro, debouncedSearch]);

    const totalPaginas = Math.max(1, Math.ceil(items.length / POR_PAGINA));
    const itemsPagina = items.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

    const { data: stats = { total: 0 } } = useQuery({
        queryKey: ["inventario-productos-resumen", categoriaActiva],
        queryFn: () => api.get("/inventario-productos/resumen", { params: { categoria: categoriaActiva } }).then((r) => r.data),
    });

    const { data: tiposProductoRaw = [] } = useQuery({
        queryKey: ["tipos-producto", esGeneral ? "Todas" : categoria],
        queryFn: () => api.get("/tipos-producto", { params: { categoria } }).then((r) => r.data),
    });
    // Dotación tiene su propio inventario (inventario_dotacion): nunca debe ofrecerse
    // aquí, ni siquiera en el modo general que no fija una categoría.
    const tiposProducto = useMemo(
        () => tiposProductoRaw.filter((t) => t.categoria !== "Dotación"),
        [tiposProductoRaw]
    );

    const { data: sedes = [] } = useQuery({
        queryKey: ["inventario-productos-sedes"],
        queryFn: () => api.get("/inventario-productos/sedes").then((r) => r.data),
        staleTime: 10 * 60 * 1000,
    });

    // Para el filtro "Categoría" del modo general: todas las categorías del catálogo
    // (incluidas las nuevas creadas en Parametros), menos Dotación.
    const { data: categoriasProductoRaw = [] } = useQuery({
        queryKey: ["categorias-producto"],
        queryFn: () => api.get("/categorias-producto").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
        enabled: esGeneral,
    });
    const categoriasDisponibles = useMemo(
        () => categoriasProductoRaw.map((c) => c.nombre).filter((n) => n !== "Dotación"),
        [categoriasProductoRaw]
    );

    const sedesConDatos = useMemo(
        () => [...new Map(items.map((i) => [i.sede_id, i.sede])).entries()]
            .map(([id, nombre]) => ({ id, nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        [items]
    );

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ["inventario-productos"] });
        qc.invalidateQueries({ queryKey: ["inventario-productos-resumen", categoriaActiva] });
    };

    const handleGuardar = async (form, editId) => {
        setSaving(true);
        setFormError("");
        try {
            const payload = {
                tipo_producto_id: Number(form.tipo_producto_id),
                sede_id: Number(form.sede_id),
                talla: form.talla || "",
                cantidad: Number(form.cantidad) || 0,
                ...(form.series !== undefined ? { series: form.series } : {}),
            };
            if (editId) {
                await api.put(`/inventario-productos/${editId}`, payload);
                showToast("Item actualizado.");
                setEditItem(null);
            } else {
                const { data } = await api.post("/inventario-productos", payload);
                showToast(data?.cantidad !== undefined ? "Item guardado." : "Item agregado.");
                setAddOpen(false);
            }
            invalidate();
        } catch (err) {
            const mensaje =
                err?.response?.data?.errors
                    ? Object.values(err.response.data.errors)[0]?.[0]
                    : err?.response?.data?.message;
            setFormError(mensaje ?? "No se pudo guardar.");
        } finally {
            setSaving(false);
        }
    };

    const handleEliminar = async () => {
        setDeleting(true);
        try {
            await api.delete(`/inventario-productos/${deleteItem.id}`);
            invalidate();
            showToast("Item eliminado.");
            setDeleteItem(null);
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo eliminar.");
        } finally {
            setDeleting(false);
        }
    };

    const handleExport = async () => {
        const XLSX = await import("xlsx");
        // Un producto serializado son N unidades físicas distintas: se exportan como N
        // filas (una por serial), no como una sola fila con cantidad + todos los seriales
        // juntos en una celda, para que cada unidad se pueda rastrear por separado. Si la
        // cantidad es mayor a los seriales registrados (se agregó stock sin marcar el
        // check alguna vez), el resto se exporta como una fila aparte sin serial — nunca
        // se debe perder unidades del total solo porque no todas tienen serial.
        const rows = items.flatMap((i) => {
            const base = {
                ...(esGeneral ? { Categoría: i.categoria } : {}),
                Producto: i.producto,
                Talla: i.talla || "—",
                Sede: i.sede,
            };
            const series = i.series ?? [];
            if (series.length === 0) {
                return [{ ...base, Cantidad: i.cantidad, Serial: "—", ...(esGeneral ? { "Asignado a": "—" } : {}) }];
            }
            const filas = series.map((serial) => ({ ...base, Cantidad: 1, Serial: serial, ...(esGeneral ? { "Asignado a": "—" } : {}) }));
            const restante = i.cantidad - series.length;
            if (restante > 0) {
                filas.push({ ...base, Cantidad: restante, Serial: "Sin serial registrado", ...(esGeneral ? { "Asignado a": "—" } : {}) });
            }
            return filas;
        });

        // Lo que está asignado a un empleado ya NO cuenta como stock disponible (se
        // descontó al asignarlo, por eso no aparece en la pantalla ni en las filas de
        // arriba), pero tampoco desapareció de la empresa: se exporta aparte, respetando
        // los mismos filtros activos (sede/categoría/búsqueda), para que quede constancia
        // de quién lo tiene.
        if (esGeneral) {
            try {
                const { data: activas } = await api.get("/asignaciones-inventario", { params: { estado: "activas" } });
                const nombreSedeFiltro = sedeFiltro !== "Todas" ? sedes.find((s) => String(s.id) === String(sedeFiltro))?.nombre : null;
                const q = debouncedSearch.trim().toLowerCase();

                const filasAsignadas = activas
                    .filter((a) => {
                        if (categoriaActiva && a.categoria !== categoriaActiva) return false;
                        if (nombreSedeFiltro && a.sede !== nombreSedeFiltro) return false;
                        if (q && !`${a.producto} ${a.sede}`.toLowerCase().includes(q)) return false;
                        return true;
                    })
                    .map((a) => ({
                        Categoría: a.categoria,
                        Producto: a.producto,
                        Talla: a.talla || "—",
                        Sede: a.sede,
                        Cantidad: a.cantidad,
                        Serial: a.serial || "Asignado sin serial",
                        "Asignado a": a.asignado_a,
                    }));

                rows.push(...filasAsignadas);
            } catch {
                // Si esto falla no debe bloquear la exportación del resto del inventario.
            }
        }

        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = esGeneral
            ? [{ wch: 16 }, { wch: 30 }, { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 25 }]
            : [{ wch: 30 }, { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        const fecha = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `Inventario_${esGeneral ? "General" : categoria}_${fecha}.xlsx`.replace(/\s+/g, "_"));
        showToast(`Excel exportado (${rows.length} fila${rows.length !== 1 ? "s" : ""}).`);
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Total items</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "var(--primary-dark)" }}>{sedesConDatos.length}</div>
                    <div className="stat-label">Sedes con stock</div>
                </div>
            </div>

            {/* Filtros: sede (siempre) y categoría (solo en Inventario General) */}
            <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
                    <label style={{ ...S.label, display: "block", marginBottom: 4 }}>Sede</label>
                    <SearchableSelect
                        value={sedeFiltro}
                        onChange={setSedeFiltro}
                        defaultValue="Todas"
                        options={[{ value: "Todas", label: "Todas las sedes" }, ...sedes.map((s) => ({ value: s.id, label: s.nombre }))]}
                    />
                </div>
                {esGeneral && (
                    <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
                        <label style={{ ...S.label, display: "block", marginBottom: 4 }}>Categoría</label>
                        <select style={S.input} value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
                            <option value="Todas">Todas las categorías</option>
                            {categoriasDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}><IconSearch size={15} /></span>
                    <input
                        style={S.searchInput}
                        placeholder={`Buscar por producto o sede en ${esGeneral ? "Inventario General" : categoria}…`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                    <button style={S.btnSecondary} onClick={handleExport} disabled={items.length === 0}>
                        Exportar Excel
                    </button>
                    {esGeneral && (
                        <button style={S.btnSecondary} onClick={() => setImportOpen(true)} disabled={tiposProducto.length === 0 || sedes.length === 0}>
                            Importar Excel
                        </button>
                    )}
                    <button style={S.btnPrimary} onClick={() => setAddOpen(true)} disabled={tiposProducto.length === 0 || sedes.length === 0}>
                        + Nuevo item
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div style={{ ...S.tableWrap, opacity: isFetching && !isLoading ? 0.6 : 1, transition: "opacity 0.15s" }}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando inventario…</p></div>
                ) : items.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p style={{ fontWeight: 700, marginBottom: 4 }}>Sin items {esGeneral ? "registrados" : `en ${categoria}`}</p>
                        <p style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>Usa "+ Nuevo item" para agregar productos.</p>
                    </div>
                ) : (
                    <table className="data-table" style={{ fontSize: "0.85rem" }}>
                        <thead>
                            <tr>
                                {esGeneral && <th>Categoría</th>}
                                <th>Producto</th>
                                <th>Sede</th>
                                <th style={{ textAlign: "center" }}>Cantidad</th>
                                <th style={{ textAlign: "center" }}>Seriales</th>
                                <th style={{ textAlign: "center" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsPagina.map((item) => {
                                return (
                                    <tr key={item.id}>
                                        {esGeneral && <td style={{ color: "var(--text-muted)" }}>{item.categoria}</td>}
                                        <td style={{ fontWeight: 700 }}>{item.producto}</td>
                                        <td style={{ color: "var(--text-muted)" }}>{item.sede}</td>
                                        <td style={{ textAlign: "center", fontWeight: 800, fontSize: "0.96rem" }}>{item.cantidad}</td>
                                        <td style={{ textAlign: "center" }}>
                                            {item.series?.length > 0 ? (
                                                <span
                                                    title={
                                                        item.series.length < item.cantidad
                                                            ? `${item.series.join(", ")}\n(faltan ${item.cantidad - item.series.length} unidades sin serial)`
                                                            : item.series.join(", ")
                                                    }
                                                    style={{
                                                        fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", cursor: "help",
                                                        background: item.series.length < item.cantidad ? "#fff7e0" : "#eef2ff",
                                                        color: item.series.length < item.cantidad ? "#b7780c" : "#4338ca",
                                                    }}
                                                >
                                                    {item.series.length < item.cantidad
                                                        ? `${item.series.length}/${item.cantidad} seriales`
                                                        : `${item.series.length} serial${item.series.length !== 1 ? "es" : ""}`}
                                                </span>
                                            ) : (
                                                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                                <button style={S.actionBtn("#e8f8f5", "var(--primary-dark)")} title="Editar" onClick={() => setEditItem(item)}>
                                                    <IconEdit size={14} />
                                                </button>
                                                <button style={S.actionBtn("#fce8e8", "#c0392b")} title="Eliminar" onClick={() => setDeleteItem(item)}>
                                                    <IconTrash size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Paginación */}
            {items.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 10 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        Página {pagina} de {totalPaginas} · Mostrando {itemsPagina.length} de {items.length}
                    </span>
                    <div style={{ display: "flex", gap: 6 }}>
                        <button style={S.btnSecondary} onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1}>
                            ‹ Anterior
                        </button>
                        <button style={S.btnSecondary} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}>
                            Siguiente ›
                        </button>
                    </div>
                </div>
            )}

            {addOpen && (
                <ItemModal
                    tiposProducto={tiposProducto}
                    sedes={sedes}
                    esGeneral={esGeneral}
                    onClose={() => { setAddOpen(false); setFormError(""); }}
                    onSave={handleGuardar}
                    saving={saving}
                    errorMsg={formError}
                />
            )}
            {editItem && (
                <ItemModal
                    item={editItem}
                    tiposProducto={tiposProducto}
                    sedes={sedes}
                    esGeneral={esGeneral}
                    onClose={() => { setEditItem(null); setFormError(""); }}
                    onSave={handleGuardar}
                    saving={saving}
                    errorMsg={formError}
                />
            )}
            {deleteItem && (
                <DeleteModal
                    item={deleteItem}
                    onClose={() => setDeleteItem(null)}
                    onConfirm={handleEliminar}
                    deleting={deleting}
                />
            )}
            {importOpen && (
                <ImportModal
                    categoria={categoria}
                    esGeneral={esGeneral}
                    tiposProducto={tiposProducto}
                    sedes={sedes}
                    onClose={() => setImportOpen(false)}
                    onImported={(data) => {
                        invalidate();
                        setImportOpen(false);
                        showToast(`Importación completa: ${data.creados} item(s) nuevo(s), ${data.actualizados} actualizado(s).`);
                    }}
                />
            )}
        </div>
    );
}

/* ─── Estilos (mismo lenguaje visual que Inventario de Dotación) ───────── */
const S = {
    searchWrap: { position: "relative", flex: 1, minWidth: 220, maxWidth: 420 },
    searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", display: "flex" },
    searchInput: { width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", boxSizing: "border-box" },
    tableWrap: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    actionBtn: (bg, color) => ({ background: bg, border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color, display: "flex", alignItems: "center", justifyContent: "center" }),
    empty: { padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", width: "100%", fontFamily: "Nunito,sans-serif", maxHeight: "92vh", display: "flex", flexDirection: "column" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1.5px solid var(--border)", flexShrink: 0 },
    modalBody: { padding: "18px 22px", overflowY: "auto", flex: 1 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px 18px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
    formGroup: { display: "flex", flexDirection: "column", gap: 5 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" },
    input: { padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", width: "100%", boxSizing: "border-box" },
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
