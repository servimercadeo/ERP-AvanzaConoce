import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
    IconSearch,
    IconEmptySearch,
    IconLoading,
    IconEdit,
    IconTrash,
    IconClose,
    IconPlus,
    IconEye,
    IconFile
} from "../components/Icons";
import { SearchableSelect as FilterSelect, PresetFiltersDropdown } from "../components/SearchableSelect";

// --- Valores estáticos para los filtros ---
const ESTADOS_PEDIDO = ["Pendiente Aprobación", "Aprobado", "Enviado a compras", "Completado", "Rechazado"];
const ALIADOS_MOCK = ["Aliado Norte S.A.S.", "Aliado Sur Limitada", "Distribuciones Avanza", "Punto de Venta Centro", "Aliado Alianza Oriente"];

export default function PedidosCrud() {
    const qc = useQueryClient();

    // --- Cargar datos dinámicos del backend si existen ---
    const { data: catalogos = {} } = useQuery({
        queryKey: ["catalogos"],
        queryFn: () => api.get("/catalogos").then((r) => r.data),
    });

    const { data: selCatalogos = {} } = useQuery({
        queryKey: ["seleccion-catalogos"],
        queryFn: () => api.get("/seleccion/catalogos").then((r) => r.data),
    });

    // --- Clases y Conceptos de Pedido (catálogos reales, editables en Parametros) ---
    const { data: clasesPedidoData = [] } = useQuery({
        queryKey: ["clases-pedido"],
        queryFn: () => api.get("/clases-pedido").then((r) => r.data),
    });
    const { data: conceptosPedidoData = [] } = useQuery({
        queryKey: ["conceptos-pedido"],
        queryFn: () => api.get("/conceptos-pedido").then((r) => r.data),
    });
    const CLASES_PEDIDO = useMemo(() => clasesPedidoData.map(c => c.nombre), [clasesPedidoData]);
    const CONCEPTOS_PEDIDO = useMemo(() => conceptosPedidoData.map(c => c.nombre), [conceptosPedidoData]);

    // --- Tipos de Producto (catálogo real, editable en Parametros) ---
    const { data: tiposProductoData = [] } = useQuery({
        queryKey: ["tipos-producto"],
        queryFn: () => api.get("/tipos-producto").then((r) => r.data),
    });
    const CATEGORIAS_PRODUCTO = useMemo(
        () => [...new Set(tiposProductoData.map(t => t.categoria).filter(Boolean))],
        [tiposProductoData]
    );
    const productosPorCategoria = (categoria) => tiposProductoData
        .filter(t => t.categoria === categoria)
        .map(t => ({ id: t.id, nombre: t.nombre }));

    // --- Pedidos de Dotación enviados a Compras (datos reales del backend) ---
    const { data: pedidosDotacion = [] } = useQuery({
        queryKey: ["pedidos-automaticos"],
        queryFn: () => api.get("/pedidos-automaticos").then((r) => r.data),
    });

    const pedidosDotacionCompras = useMemo(
        () => pedidosDotacion.filter(p => p.estado === "Enviar a compras"),
        [pedidosDotacion]
    );

    const [dotacionDetalle, setDotacionDetalle] = useState(null);

    // --- Revisión manual de stock/traslado (pedidos "Enviar a compras", de Dotación o de oficina) ---
    // revisionPedido: { id, codigo, origen: "dotacion" | "local" }
    const [revisionPedido, setRevisionPedido] = useState(null);

    const endpointItemBase = (itemId) => revisionPedido.origen === "dotacion"
        ? `/pedido-automatico-items/${itemId}`
        : `/pedido-compra-items/${itemId}`;

    const normalizarItemRevision = (raw) => ({
        item_id: raw.item_id,
        titulo: raw.prenda ? `${raw.prenda} · ${raw.genero} · T:${raw.talla}` : raw.producto,
        cantidad: raw.cantidad,
        estado_revision: raw.estado_revision,
        observacion: raw.observacion,
        sede_pedido: raw.sede_pedido,
        opciones: (raw.sedes_cercanas ?? raw.sedes_disponibles ?? []).map(o => ({
            inventario_id: o.inventario_dotacion_id ?? o.inventario_producto_id,
            sede_id: o.sede_id,
            sede_nombre: o.sede_nombre,
            cantidad: o.cantidad,
        })),
    });

    const { data: revisionItems = [], isLoading: loadingRevision } = useQuery({
        queryKey: ["stock-revision", revisionPedido?.origen, revisionPedido?.id],
        queryFn: () => {
            const url = revisionPedido.origen === "dotacion"
                ? `/pedidos-automaticos/${revisionPedido.id}/stock-revision`
                : `/pedidos-compra/${revisionPedido.id}/stock-revision`;
            return api.get(url).then(r => r.data.map(normalizarItemRevision));
        },
        enabled: !!revisionPedido,
    });
    const invalidateRevision = () => {
        qc.invalidateQueries({ queryKey: ["stock-revision", revisionPedido?.origen, revisionPedido?.id] });
        qc.invalidateQueries({ queryKey: revisionPedido.origen === "dotacion" ? ["pedidos-automaticos"] : ["pedidos-compra"] });
    };
    const [accionandoItemId, setAccionandoItemId] = useState(null);

    const [observaciones, setObservaciones] = useState({});
    const [trasladoSede, setTrasladoSede] = useState({});

    const handleMarcarStockLocal = async (itemId) => {
        const observacion = (observaciones[itemId] || "").trim();
        if (!observacion) {
            showToast("Escribe una observación antes de aprobar por stock.", "error");
            return;
        }
        setAccionandoItemId(itemId);
        try {
            await api.post(`${endpointItemBase(itemId)}/stock-local`, { observacion });
            invalidateRevision();
            showToast("Producto aprobado por stock.");
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo actualizar.", "error");
        } finally {
            setAccionandoItemId(null);
        }
    };

    const handleSolicitarTraslado = async (itemId, inventarioOrigenId, cantidad) => {
        if (!window.confirm(`¿Solicitar el traslado de ${cantidad} unidad(es) hacia la sede pedida?`)) return;
        setAccionandoItemId(itemId);
        try {
            const campoOrigen = revisionPedido.origen === "dotacion"
                ? "inventario_dotacion_origen_id"
                : "inventario_producto_origen_id";
            await api.post(`${endpointItemBase(itemId)}/traslado`, {
                [campoOrigen]: inventarioOrigenId,
                cantidad,
            });
            invalidateRevision();
            showToast("Traslado solicitado y stock movido.");
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo solicitar el traslado.", "error");
        } finally {
            setAccionandoItemId(null);
        }
    };

    const handleEnviarComprasItem = async (itemId) => {
        if (!window.confirm("¿Confirmar que este producto no tiene stock en ningún lado y debe comprarse?")) return;
        setAccionandoItemId(itemId);
        try {
            await api.post(`${endpointItemBase(itemId)}/enviar-compras`);
            invalidateRevision();
            showToast("Producto confirmado para compra.");
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo actualizar.", "error");
        } finally {
            setAccionandoItemId(null);
        }
    };

    const handleDeshacerRevision = async (itemId) => {
        if (!window.confirm("¿Deshacer esta revisión? Si era un traslado, el stock vuelve a la sede de origen.")) return;
        setAccionandoItemId(itemId);
        try {
            await api.post(`${endpointItemBase(itemId)}/deshacer-revision`);
            invalidateRevision();
            showToast("Revisión deshecha, puedes volver a evaluar el producto.");
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo deshacer.", "error");
        } finally {
            setAccionandoItemId(null);
        }
    };

    // --- Adapta los pedidos reales de Dotación a la misma forma que usa la tabla ---
    const pedidosDotacionAdaptados = useMemo(
        () => pedidosDotacionCompras.map(p => ({
            id: `dot-${p.id}`,
            origen: "dotacion",
            codigo: p.codigo,
            fecha_registro: (p.fecha_pedido || "").slice(0, 10),
            tipo_responsable: "Empleado",
            responsable: p.empleado ? `${p.empleado.nombres} ${p.empleado.apellidos}` : "—",
            sede: p.contrato?.sede ?? "—",
            clase: "Pedido Interno",
            concepto: "REPOSICION",
            estado: "Enviado a compras",
            recibido_pedidos: !!p.recibido_pedidos,
            // El check solo se puede activar cuando la revisión de al menos una prenda
            // concluyó que NO hay stock en ninguna sede ("Enviado a Compras"). Si todo se
            // resolvió con stock propio o traslado, o aún falta revisar, se queda bloqueado
            // (el backend además lo valida server-side, así que esto es solo la UI).
            puede_enviar_compras: (p.items ?? []).some(it => it.estado_revision === "Enviado a Compras"),
            registra: "Módulo Dotación",
            items: (p.items ?? []).map(it => ({
                producto: `${it.inventario?.prenda ?? "Prenda"} · ${it.inventario?.genero ?? ""} · T:${it.inventario?.talla ?? ""}`,
                cantidad: it.cantidad
            })),
            _dotacionRaw: p
        })),
        [pedidosDotacionCompras]
    );

    // --- Listas de catálogos ---
    const sedesOptions = catalogos.sedes || [];

    const responsablesOptions = useMemo(() => {
        if (selCatalogos.responsables && selCatalogos.responsables.length > 0) {
            return selCatalogos.responsables.map(r => r.name);
        }
        return [
            "Juan Pérez",
            "María Gómez",
            "Carlos Rodríguez",
            "Laura Martínez",
            "Sofía Gallego",
            "Andrés Mendoza"
        ];
    }, [selCatalogos]);

    const todosResponsablesOptions = useMemo(
        () => [...new Set([...responsablesOptions, ...ALIADOS_MOCK])],
        [responsablesOptions]
    );

    // --- Pedidos de insumos de oficina (datos reales del backend) ---
    const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
        queryKey: ["pedidos-compra"],
        queryFn: () => api.get("/pedidos-compra").then((r) => r.data),
    });
    const invalidatePedidos = () => qc.invalidateQueries({ queryKey: ["pedidos-compra"] });

    const [selectedIds, setSelectedIds] = useState([]);

    // --- Listado combinado: pedidos locales + pedidos reales de Dotación enviados a compras ---
    const pedidosLocalAdaptados = useMemo(
        () => pedidos.map(p => ({
            ...p,
            // Mismo criterio que en Dotación: el check "Enviar a Compras" solo se
            // habilita cuando la revisión de al menos un producto concluyó que no
            // hay stock en ninguna sede (el backend también lo valida).
            puede_enviar_compras: (p.items ?? []).some(it => it.estado_revision === "Enviado a Compras"),
        })),
        [pedidos]
    );

    const pedidosCombinados = useMemo(
        () => [...pedidosDotacionAdaptados, ...pedidosLocalAdaptados],
        [pedidosDotacionAdaptados, pedidosLocalAdaptados]
    );
    
    // --- Búsqueda y filtros ---
    const [search, setSearch] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filtroEstado, setFiltroEstado] = useState("Todos");
    const [filtroSede, setFiltroSede] = useState("Todas");
    const [filtroClase, setFiltroClase] = useState("Todas");
    const [filtroConcepto, setFiltroConcepto] = useState("Todos");
    const [filtroResponsable, setFiltroResponsable] = useState("Todos");
    const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
    const [filtroFechaFin, setFiltroFechaFin] = useState("");

    // --- Paginación mockup ---
    const [limit, setLimit] = useState(10);
    
    // --- Estado de modal ---
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("new"); // "new" | "edit" | "view"
    const [modalData, setModalData] = useState({
        id: null,
        tipo_responsable: "Empleado",
        responsable: "",
        sede: "",
        clase: "",
        concepto: "",
        estado: "Pendiente Aprobación",
        items: []
    });

    // Formulario interno de items
    const [itemCategoria, setItemCategoria] = useState("");
    const [itemProduct, setItemProduct] = useState("");
    const [itemQuantity, setItemQuantity] = useState(1);
    const PRODUCTOS_CATALOGO = useMemo(
        () => productosPorCategoria(itemCategoria),
        [tiposProductoData, itemCategoria]
    );

    const handleCambiarItemCategoria = (categoria) => {
        setItemCategoria(categoria);
        const productos = productosPorCategoria(categoria);
        setItemProduct(productos[0]?.id ?? "");
    };

    // --- Notificaciones Toast ---
    const [toast, setToast] = useState(null);
    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // --- Trazabilidad Activa ---
    const [activeTrazabilidadId, setActiveTrazabilidadId] = useState(null);

    // --- Exportación a Excel simulación ---
    const [exporting, setExporting] = useState(false);

    // --- Resumen para las tarjetas de estadísticas ---
    const stats = useMemo(
        () => ({
            total: pedidosCombinados.length,
            pendientes: pedidosCombinados.filter(p => p.estado === "Pendiente Aprobación").length,
            aprobados: pedidosCombinados.filter(p => p.estado === "Aprobado").length,
            enviados: pedidosCombinados.filter(p => p.estado === "Enviado a compras").length,
            completados: pedidosCombinados.filter(p => p.estado === "Completado").length,
        }),
        [pedidosCombinados]
    );

    // --- Lógica de filtrado local (instantánea) ---
    const filteredPedidos = useMemo(() => {
        const q = search.trim().toLowerCase();
        return pedidosCombinados.filter(p => {
            if (q && !p.codigo.toLowerCase().includes(q) && !p.responsable.toLowerCase().includes(q)) return false;

            if (filtroEstado !== "Todos" && p.estado !== filtroEstado) return false;
            if (filtroSede !== "Todas" && p.sede !== filtroSede) return false;
            if (filtroClase !== "Todas" && p.clase !== filtroClase) return false;
            if (filtroConcepto !== "Todos" && p.concepto !== filtroConcepto) return false;
            if (filtroResponsable !== "Todos" && p.responsable !== filtroResponsable) return false;

            if (filtroFechaInicio && p.fecha_registro < filtroFechaInicio) return false;
            if (filtroFechaFin && p.fecha_registro > filtroFechaFin) return false;

            return true;
        });
    }, [pedidosCombinados, search, filtroEstado, filtroSede, filtroClase, filtroConcepto, filtroResponsable, filtroFechaInicio, filtroFechaFin]);

    // --- Limpiar Filtros ---
    const clearFilters = () => {
        setFiltroEstado("Todos");
        setFiltroSede("Todas");
        setFiltroClase("Todas");
        setFiltroConcepto("Todos");
        setFiltroResponsable("Todos");
        setFiltroFechaInicio("");
        setFiltroFechaFin("");
    };

    // --- Seleccionar / Deseleccionar Filas (los de Dotación son de solo lectura) ---
    const seleccionablesFiltered = useMemo(
        () => filteredPedidos.filter(p => p.origen !== "dotacion"),
        [filteredPedidos]
    );

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(seleccionablesFiltered.map(p => p.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const isAllSelected = seleccionablesFiltered.length > 0 && selectedIds.length === seleccionablesFiltered.length;

    // --- Eliminar Pedidos Seleccionados ---
    const handleEliminarPedidos = async () => {
        if (selectedIds.length === 0) {
            showToast("Selecciona al menos un pedido para eliminar.", "error");
            return;
        }

        if (!window.confirm(`¿Estás seguro de eliminar los ${selectedIds.length} pedidos seleccionados?`)) {
            return;
        }

        const ids = [...selectedIds];
        const resultados = await Promise.allSettled(
            ids.map(id => api.delete(`/pedidos-compra/${id}`))
        );
        const fallidos = resultados.filter(r => r.status === "rejected").length;

        invalidatePedidos();
        setSelectedIds([]);
        if (ids.includes(activeTrazabilidadId)) setActiveTrazabilidadId(null);

        if (fallidos > 0) {
            showToast(`${ids.length - fallidos} pedido(s) eliminados, ${fallidos} no se pudieron eliminar.`, "error");
        } else {
            showToast("Pedidos eliminados correctamente.");
        }
    };

    // --- Eliminar un solo Pedido desde la fila ---
    const handleEliminarUno = async (pedido) => {
        if (!window.confirm(`¿Estás seguro de eliminar el pedido ${pedido.codigo}?`)) {
            return;
        }
        try {
            await api.delete(`/pedidos-compra/${pedido.id}`);
            invalidatePedidos();
            setSelectedIds(prev => prev.filter(id => id !== pedido.id));
            if (activeTrazabilidadId === pedido.id) setActiveTrazabilidadId(null);
            showToast(`Pedido ${pedido.codigo} eliminado.`);
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo eliminar el pedido.", "error");
        }
    };

    // --- Marcar/Desmarcar "Enviar a Compras" desde la fila ---
    const [enviandoCompraId, setEnviandoCompraId] = useState(null);

    const handleEnviarCompras = async (pedido, marcar) => {
        if (marcar && !pedido.puede_enviar_compras) {
            showToast("Primero revisa el stock (botón ⇄): el check solo se activa si algún producto no tiene stock en ninguna sede.", "error");
            return;
        }
        setEnviandoCompraId(pedido.id);
        try {
            await api.put(`/pedidos-compra/${pedido.id}`, {
                estado: marcar ? "Enviado a compras" : "Pendiente Aprobación",
                estado_compra: marcar ? "Cotizando" : null,
            });
            invalidatePedidos();
            showToast(
                marcar
                    ? `Pedido ${pedido.codigo} enviado a Compras.`
                    : `Pedido ${pedido.codigo} regresado a Pedidos.`
            );
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo actualizar el pedido.", "error");
        } finally {
            setEnviandoCompraId(null);
        }
    };

    // --- Marcar/Desmarcar recepción manual de un pedido de Dotación en Pedidos ---
    const [recibiendoDotacionId, setRecibiendoDotacionId] = useState(null);

    const handleToggleRecibidoDotacion = async (pedidoDotacion, marcar) => {
        setRecibiendoDotacionId(pedidoDotacion.id);
        try {
            await api.put(`/pedidos-automaticos/${pedidoDotacion.id}/recibido-pedidos`, { recibido: marcar });
            qc.invalidateQueries({ queryKey: ["pedidos-automaticos"] });
            showToast(
                marcar
                    ? `Pedido ${pedidoDotacion.codigo} recibido en Pedidos.`
                    : `Pedido ${pedidoDotacion.codigo} marcado como no recibido.`
            );
        } catch (err) {
            showToast(err?.response?.data?.message ?? "No se pudo actualizar el pedido.", "error");
        } finally {
            setRecibiendoDotacionId(null);
        }
    };

    // --- Exportar a Excel (Simulación) ---
    const handleExportar = () => {
        setExporting(true);
        setTimeout(() => {
            setExporting(false);
            showToast(`Excel generado exitosamente con ${filteredPedidos.length} registros. Descargando...`);
        }, 1500);
    };

    // --- Trazabilidad de Pedidos ---
    const selectedPedidoForTrazabilidad = useMemo(() => {
        return pedidosCombinados.find(p => p.id === activeTrazabilidadId) || null;
    }, [pedidosCombinados, activeTrazabilidadId]);

    const handleTrazabilidad = () => {
        if (selectedIds.length === 0) {
            showToast("Selecciona un pedido de la lista para ver su trazabilidad.", "error");
            return;
        }
        setActiveTrazabilidadId(selectedIds[0]);
        showToast("Trazabilidad cargada en el panel inferior.", "info");
        
        // Scroll automático suave hacia el panel de trazabilidad
        setTimeout(() => {
            const el = document.getElementById("trazabilidad-panel");
            if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    // --- Abrir Modal Nuevo Pedido ---
    const handleAbrirNuevo = () => {
        setModalMode("new");
        setModalData({
            id: null,
            tipo_responsable: "Empleado",
            responsable: responsablesOptions[0] || "",
            sede: sedesOptions[0] || "",
            clase: CLASES_PEDIDO[0] || "",
            concepto: CONCEPTOS_PEDIDO[0] || "",
            estado: "Pendiente Aprobación",
            items: []
        });
        handleCambiarItemCategoria(CATEGORIAS_PRODUCTO[0] || "");
        setItemQuantity(1);
        setModalOpen(true);
    };

    // --- Abrir Modal Editar/Ver ---
    const handleAbrirEditar = (pedido, mode = "edit") => {
        setModalMode(mode);
        setModalData({
            ...pedido,
            items: [...pedido.items]
        });
        handleCambiarItemCategoria(CATEGORIAS_PRODUCTO[0] || "");
        setItemQuantity(1);
        setModalOpen(true);
    };

    // --- Cambiar Tipo de Responsable en Modal ---
    const handleTipoResponsableChange = (tipo) => {
        setModalData(prev => ({
            ...prev,
            tipo_responsable: tipo,
            responsable: tipo === "Empleado" ? (responsablesOptions[0] || "") : (ALIADOS_MOCK[0] || "")
        }));
    };

    // --- Agregar Item en Formulario de Modal ---
    const handleAddItem = () => {
        if (!itemProduct) {
            showToast("Selecciona un producto.", "error");
            return;
        }
        if (itemQuantity <= 0) {
            showToast("La cantidad debe ser mayor a 0.", "error");
            return;
        }

        const tipoProductoId = Number(itemProduct);
        const nombreProducto = tiposProductoData.find(t => t.id === tipoProductoId)?.nombre ?? "Producto";

        const existingIndex = modalData.items.findIndex(it => it.tipo_producto_id === tipoProductoId);
        if (existingIndex > -1) {
            // Actualizar cantidad
            const updatedItems = [...modalData.items];
            updatedItems[existingIndex].cantidad += Number(itemQuantity);
            setModalData(prev => ({ ...prev, items: updatedItems }));
        } else {
            // Agregar nuevo
            setModalData(prev => ({
                ...prev,
                items: [...prev.items, { tipo_producto_id: tipoProductoId, producto: nombreProducto, cantidad: Number(itemQuantity) }]
            }));
        }
        showToast("Producto agregado a la lista del pedido.", "info");
    };

    const handleRemoveItem = (index) => {
        const updatedItems = modalData.items.filter((_, i) => i !== index);
        setModalData(prev => ({ ...prev, items: updatedItems }));
        showToast("Producto removido de la lista.", "info");
    };

    // --- Guardar Formulario del Modal ---
    const [guardando, setGuardando] = useState(false);

    const handleGuardarPedido = async (e) => {
        e.preventDefault();

        if (!modalData.sede) {
            showToast("La Sede Destino es obligatoria.", "error");
            return;
        }
        if (!modalData.responsable) {
            showToast("El Responsable es obligatorio.", "error");
            return;
        }
        if (modalData.items.length === 0) {
            showToast("Debes agregar al menos un insumo al pedido.", "error");
            return;
        }

        const payload = {
            tipo_responsable: modalData.tipo_responsable,
            responsable: modalData.responsable,
            sede: modalData.sede,
            clase: modalData.clase,
            concepto: modalData.concepto,
            estado: modalData.estado,
            items: modalData.items.map(({ tipo_producto_id, cantidad }) => ({
                tipo_producto_id,
                cantidad: Number(cantidad),
            })),
        };

        setGuardando(true);
        try {
            if (modalMode === "new") {
                const { data } = await api.post("/pedidos-compra", payload);
                invalidatePedidos();
                showToast(`Pedido ${data.codigo} creado con éxito.`);
            } else {
                const { data } = await api.put(`/pedidos-compra/${modalData.id}`, payload);
                invalidatePedidos();
                showToast(`Pedido ${data.codigo} actualizado con éxito.`);
            }
            setModalOpen(false);
        } catch (err) {
            const mensaje =
                err?.response?.data?.message ??
                Object.values(err?.response?.data?.errors ?? {})[0]?.[0] ??
                "No se pudo guardar el pedido.";
            showToast(mensaje, "error");
        } finally {
            setGuardando(false);
        }
    };

    // --- Obtener colores de Badge según Estado ---
    const getEstadoStyle = (estado) => {
        switch (estado) {
            case "Completado":
                return { bg: "#dcfce7", text: "#15803d" };
            case "Aprobado":
                return { bg: "#dbeafe", text: "#1d4ed8" };
            case "Enviado a compras":
                return { bg: "#fef3c7", text: "#b45309" };
            case "Rechazado":
                return { bg: "#fee2e2", text: "#b91c1c" };
            case "Pendiente Aprobación":
            default:
                return { bg: "#f3f4f6", text: "#4b5563" };
        }
    };

    return (
        <div style={S.container}>
            {/* --- Notificación flotante (Toast) --- */}
            {toast && (
                <div style={{
                    ...S.toast,
                    background: toast.type === "error" ? "#c0392b" : (toast.type === "info" ? "#1a5fa8" : "var(--primary)"),
                }}>
                    {toast.message}
                </div>
            )}

            {/* --- Resumen --- */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Total pedidos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#856404" }}>{stats.pendientes}</div>
                    <div className="stat-label">Pendientes</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#1a5fa8" }}>{stats.aprobados}</div>
                    <div className="stat-label">Aprobados</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#b45309" }}>{stats.enviados}</div>
                    <div className="stat-label">Enviados a compras</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#0d6e5a" }}>{stats.completados}</div>
                    <div className="stat-label">Completados</div>
                </div>
            </div>

            {/* --- Toolbar de búsqueda y acciones --- */}
            <div style={S.toolbar}>
                <div style={S.filters}>
                    <div style={S.searchWrap}>
                        <span style={S.searchIcon}>
                            <IconSearch size={15} />
                        </span>
                        <input
                            style={S.searchInput}
                            placeholder="Buscar código, responsable…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button style={S.filterBtn} onClick={() => setFilterOpen(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        Filtros
                    </button>
                    <PresetFiltersDropdown
                        presets={[
                            { label: "Pendientes de aprobación", apply: () => { clearFilters(); setFiltroEstado("Pendiente Aprobación"); } },
                            { label: "Aprobados", apply: () => { clearFilters(); setFiltroEstado("Aprobado"); } },
                            { label: "Enviados a compras", apply: () => { clearFilters(); setFiltroEstado("Enviado a compras"); } },
                            { label: "Completados", apply: () => { clearFilters(); setFiltroEstado("Completado"); } },
                            { label: "Rechazados", apply: () => { clearFilters(); setFiltroEstado("Rechazado"); } },
                            { label: "Limpiar filtros", apply: () => clearFilters(), clear: true },
                        ]}
                    />
                </div>
                <div style={S.actionButtonGroup}>
                    <button style={S.btnSecondary} onClick={handleTrazabilidad}>
                        <IconFile size={15} style={{ marginRight: 6 }} />
                        Trazabilidad
                    </button>
                    <button style={S.btnSecondary} onClick={handleExportar} disabled={exporting}>
                        {exporting ? <IconLoading size={15} /> : <IconFile size={15} style={{ marginRight: 6 }} />}
                        {exporting ? "Exportando..." : "Exportar Excel"}
                    </button>
                    <button style={S.btnDanger} onClick={handleEliminarPedidos}>
                        <IconTrash size={15} style={{ marginRight: 6 }} />
                        Eliminar
                    </button>
                    <button className="btn-primary" onClick={handleAbrirNuevo}>
                        <IconPlus size={15} />
                        Nuevo pedido
                    </button>
                </div>
            </div>

            {/* --- Tabla de Resultados --- */}
            <div style={S.tableContainer}>
                {loadingPedidos ? (
                    <div style={S.emptyState}>
                        <IconLoading size={32} />
                        <p>Cargando pedidos…</p>
                    </div>
                ) : filteredPedidos.length === 0 ? (
                    <div style={S.emptyState}>
                        <IconEmptySearch size={48} />
                        <h3>No se encontraron pedidos</h3>
                        <p>Ajusta los filtros o crea un nuevo pedido para ver los resultados.</p>
                    </div>
                ) : (
                    <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={{ width: 40, textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        onChange={handleSelectAll} 
                                        checked={isAllSelected}
                                        style={S.checkbox}
                                    />
                                </th>
                                <th>Código</th>
                                <th>Fecha de registro</th>
                                <th>Tipo Responsable</th>
                                <th>Responsable</th>
                                <th>Sede</th>
                                <th>Clase</th>
                                <th>Concepto</th>
                                <th>Estado</th>
                                <th style={{ textAlign: 'center' }}>Enviar a Compras</th>
                                <th>Registra</th>
                                <th style={{ textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPedidos.slice(0, limit).map((p) => {
                                const st = getEstadoStyle(p.estado);
                                const isChecked = selectedIds.includes(p.id);
                                return (
                                    <tr key={p.id} style={{ 
                                        background: isChecked ? "rgba(26, 155, 140, 0.05)" : "none",
                                        borderBottom: "1.5px solid var(--border)",
                                        transition: "background 0.2s"
                                    }}>
                                        <td style={{ textAlign: 'center' }}>
                                            {p.origen !== "dotacion" && (
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleSelectRow(p.id)}
                                                    style={S.checkbox}
                                                />
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 800, fontFamily: "monospace" }}>
                                            {p.codigo}
                                            {p.origen === "dotacion" && (
                                                <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#6b21a8", letterSpacing: "0.04em", marginTop: 2 }}>
                                                    DOTACIÓN
                                                </div>
                                            )}
                                        </td>
                                        <td>{p.fecha_registro}</td>
                                        <td>
                                            <span style={{
                                                fontSize: "0.78rem",
                                                fontWeight: 700,
                                                padding: "3px 10px",
                                                borderRadius: 20,
                                                whiteSpace: "nowrap",
                                                background: p.tipo_responsable === "Empleado" ? "#e0f2fe" : "#f3e8ff",
                                                color: p.tipo_responsable === "Empleado" ? "#0369a1" : "#6b21a8"
                                            }}>
                                                {p.tipo_responsable}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{p.responsable}</td>
                                        <td>{p.sede}</td>
                                        <td>{p.clase}</td>
                                        <td>{p.concepto}</td>
                                        <td>
                                            <span style={{
                                                fontSize: "0.78rem",
                                                fontWeight: 700,
                                                padding: "3px 10px",
                                                borderRadius: 20,
                                                whiteSpace: "nowrap",
                                                background: st.bg,
                                                color: st.text,
                                                display: "inline-block"
                                            }}>
                                                {p.estado}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {p.origen === "dotacion" ? (
                                                <input
                                                    type="checkbox"
                                                    checked={p.recibido_pedidos}
                                                    disabled={!p.puede_enviar_compras || recibiendoDotacionId === p._dotacionRaw.id}
                                                    onChange={(e) => handleToggleRecibidoDotacion(p._dotacionRaw, e.target.checked)}
                                                    style={S.checkbox}
                                                    title={p.puede_enviar_compras ? "Marca para enviar este pedido a Compras" : "Primero revisa el stock (botón ⇄): el check solo se activa si alguna prenda no tiene stock en ninguna sede"}
                                                />
                                            ) : (
                                                <input
                                                    type="checkbox"
                                                    checked={p.estado === "Enviado a compras"}
                                                    disabled={p.estado === "Completado" || enviandoCompraId === p.id || (!p.puede_enviar_compras && p.estado !== "Enviado a compras")}
                                                    onChange={(e) => handleEnviarCompras(p, e.target.checked)}
                                                    style={S.checkbox}
                                                    title={p.puede_enviar_compras || p.estado === "Enviado a compras" ? "Enviar este pedido al módulo de Compras" : "Primero revisa el stock (botón ⇄): el check solo se activa si algún producto no tiene stock en ninguna sede"}
                                                />
                                            )}
                                        </td>
                                        <td>{p.registra}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                <button
                                                    style={S.actionIconBtn("#e8f0ff", "#1a4fa8")}
                                                    title="Ver Detalles"
                                                    onClick={() => p.origen === "dotacion" ? setDotacionDetalle(p._dotacionRaw) : handleAbrirEditar(p, "view")}
                                                >
                                                    <IconEye size={14} />
                                                </button>
                                                {(p.origen === "dotacion" || p.estado !== "Completado") && (
                                                    <button
                                                        style={{
                                                            ...S.actionIconBtn("#fef3c7", "#92400e"),
                                                            fontWeight: 800,
                                                            fontSize: "0.9rem",
                                                        }}
                                                        title="Revisar Stock / Traslado"
                                                        onClick={() => setRevisionPedido(
                                                            p.origen === "dotacion"
                                                                ? { id: p._dotacionRaw.id, codigo: p.codigo, origen: "dotacion" }
                                                                : { id: p.id, codigo: p.codigo, origen: "local" }
                                                        )}
                                                    >
                                                        ⇄
                                                    </button>
                                                )}
                                                {p.origen !== "dotacion" && (
                                                    <>
                                                        <button style={S.actionIconBtn("#e8f8f5", "var(--primary-dark)")} title="Editar" onClick={() => handleAbrirEditar(p, "edit")}>
                                                            <IconEdit size={14} />
                                                        </button>
                                                        <button style={S.actionIconBtn("#fce8e8", "#a33")} title="Eliminar" onClick={() => handleEliminarUno(p)}>
                                                            <IconTrash size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* --- Paginación mockup --- */}
            <div style={S.paginationRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Ver #</span>
                    <select style={S.selectCompact} value={limit} onChange={e => setLimit(Number(e.target.value))}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Resultados {filteredPedidos.length}
                </div>
            </div>

            {/* --- Panel de Trazabilidad Dinámico --- */}
            {selectedPedidoForTrazabilidad && (
                <div id="trazabilidad-panel" style={S.trazabilidadCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={S.trazabilidadTitle}>Trazabilidad de Pedido {selectedPedidoForTrazabilidad.codigo}</h3>
                        <button style={S.closeTrazabilidadBtn} onClick={() => setActiveTrazabilidadId(null)}>×</button>
                    </div>

                    <div style={S.trazabilidadGrid}>
                        <div>
                            <span style={S.trazabilidadMetaLabel}>Responsable</span>
                            <div style={S.trazabilidadMetaVal}>{selectedPedidoForTrazabilidad.responsable}</div>
                        </div>
                        <div>
                            <span style={S.trazabilidadMetaLabel}>Sede Destino</span>
                            <div style={S.trazabilidadMetaVal}>{selectedPedidoForTrazabilidad.sede}</div>
                        </div>
                        <div>
                            <span style={S.trazabilidadMetaLabel}>Clase / Concepto</span>
                            <div style={S.trazabilidadMetaVal}>{selectedPedidoForTrazabilidad.clase} · {selectedPedidoForTrazabilidad.concepto}</div>
                        </div>
                        <div>
                            <span style={S.trazabilidadMetaLabel}>Total Insumos</span>
                            <div style={S.trazabilidadMetaVal}>
                                {selectedPedidoForTrazabilidad.items.reduce((acc, it) => acc + it.cantidad, 0)} artículos
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div style={S.timelineContainer}>
                        {/* Paso 1: Generado */}
                        <div style={S.timelineStep}>
                            <div style={{ ...S.timelineCircle, background: "#166534", color: "#fff" }}>✓</div>
                            <span style={S.timelineStepLabel}>Pedido Generado</span>
                            <span style={S.timelineStepSub}>{selectedPedidoForTrazabilidad.fecha_registro}</span>
                        </div>
                        <div style={{ ...S.timelineLine, background: "#166534" }} />

                        {/* Paso 2: Aprobado */}
                        <div style={S.timelineStep}>
                            <div style={{ 
                                ...S.timelineCircle, 
                                background: selectedPedidoForTrazabilidad.estado !== "Pendiente Aprobación" && selectedPedidoForTrazabilidad.estado !== "Rechazado" ? "#166534" : (selectedPedidoForTrazabilidad.estado === "Rechazado" ? "#991b1b" : "#e5e7eb"),
                                color: selectedPedidoForTrazabilidad.estado !== "Pendiente Aprobación" ? "#fff" : "#9ca3af" 
                            }}>
                                {selectedPedidoForTrazabilidad.estado === "Rechazado" ? "✗" : (selectedPedidoForTrazabilidad.estado !== "Pendiente Aprobación" ? "✓" : "2")}
                            </div>
                            <span style={S.timelineStepLabel}>
                                {selectedPedidoForTrazabilidad.estado === "Rechazado" ? "Rechazado por Líder" : "Aprobado por Líder"}
                            </span>
                            <span style={S.timelineStepSub}>
                                {selectedPedidoForTrazabilidad.estado !== "Pendiente Aprobación" ? "Aprobado" : "Pendiente"}
                            </span>
                        </div>
                        <div style={{ 
                            ...S.timelineLine, 
                            background: selectedPedidoForTrazabilidad.estado === "Completado" || selectedPedidoForTrazabilidad.estado === "Enviado a compras" ? "#166534" : "#e5e7eb" 
                        }} />

                        {/* Paso 3: Enviado a Compras */}
                        <div style={S.timelineStep}>
                            <div style={{ 
                                ...S.timelineCircle, 
                                background: selectedPedidoForTrazabilidad.estado === "Completado" || selectedPedidoForTrazabilidad.estado === "Enviado a compras" ? "#166534" : "#e5e7eb",
                                color: selectedPedidoForTrazabilidad.estado === "Completado" || selectedPedidoForTrazabilidad.estado === "Enviado a compras" ? "#fff" : "#9ca3af" 
                            }}>
                                {selectedPedidoForTrazabilidad.estado === "Completado" || selectedPedidoForTrazabilidad.estado === "Enviado a compras" ? "✓" : "3"}
                            </div>
                            <span style={S.timelineStepLabel}>Procesado Compras</span>
                            <span style={S.timelineStepSub}>
                                {selectedPedidoForTrazabilidad.estado === "Completado" || selectedPedidoForTrazabilidad.estado === "Enviado a compras" ? "Enviado" : "Pendiente"}
                            </span>
                        </div>
                        <div style={{ 
                            ...S.timelineLine, 
                            background: selectedPedidoForTrazabilidad.estado === "Completado" ? "#166534" : "#e5e7eb" 
                        }} />

                        {/* Paso 4: Completado */}
                        <div style={S.timelineStep}>
                            <div style={{ 
                                ...S.timelineCircle, 
                                background: selectedPedidoForTrazabilidad.estado === "Completado" ? "#166534" : "#e5e7eb",
                                color: selectedPedidoForTrazabilidad.estado === "Completado" ? "#fff" : "#9ca3af" 
                            }}>
                                {selectedPedidoForTrazabilidad.estado === "Completado" ? "✓" : "4"}
                            </div>
                            <span style={S.timelineStepLabel}>Entregado</span>
                            <span style={S.timelineStepSub}>
                                {selectedPedidoForTrazabilidad.estado === "Completado" ? "Recibido" : "Pendiente"}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modal Detalle de Pedido de Dotación (solo lectura) --- */}
            {dotacionDetalle && (
                <div style={S.overlay} onClick={() => setDotacionDetalle(null)}>
                    <div style={S.modal} onClick={e => e.stopPropagation()}>
                        <div style={S.modalHeader}>
                            <span style={S.modalTitle}>
                                Pedido de Dotación {dotacionDetalle.codigo}
                            </span>
                            <button style={S.closeBtn} onClick={() => setDotacionDetalle(null)}>
                                <IconClose size={16} />
                            </button>
                        </div>
                        <div style={S.modalBody}>
                            <div style={S.grid2}>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Empleado</label>
                                    <div style={{ fontWeight: 700 }}>
                                        {dotacionDetalle.empleado
                                            ? `${dotacionDetalle.empleado.nombres} ${dotacionDetalle.empleado.apellidos}`
                                            : "—"}
                                    </div>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Cédula</label>
                                    <div style={{ fontWeight: 700 }}>{dotacionDetalle.empleado?.cedula ?? "—"}</div>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Sede</label>
                                    <div style={{ fontWeight: 700 }}>{dotacionDetalle.contrato?.sede ?? "—"}</div>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Proyecto</label>
                                    <div style={{ fontWeight: 700 }}>{dotacionDetalle.contrato?.cliente_proyecto ?? "—"}</div>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Fecha Pedido</label>
                                    <div style={{ fontWeight: 700 }}>{dotacionDetalle.fecha_pedido}</div>
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderBottom: '1.5px solid var(--border)', margin: '20px 0' }} />

                            <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '0.98rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 12 }}>
                                Prendas a comprar
                            </h3>
                            <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--border)' }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800 }}>Prenda</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>Talla</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>Género</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, width: 80 }}>Cantidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(dotacionDetalle.items ?? []).map((it, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.inventario?.prenda ?? "—"}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{it.inventario?.talla ?? "—"}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{it.inventario?.genero ?? "—"}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>{it.cantidad}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div style={S.modalFooter}>
                            <button style={S.btnSecondary} onClick={() => setDotacionDetalle(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modal Revisión de Stock / Traslado (pedidos de Dotación) --- */}
            {revisionPedido && (
                <div style={S.overlay} onClick={() => setRevisionPedido(null)}>
                    <div style={{ ...S.modal, maxWidth: 780 }} onClick={e => e.stopPropagation()}>
                        <div style={S.modalHeader}>
                            <span style={S.modalTitle}>
                                Revisar Stock — Pedido {revisionPedido.codigo}
                            </span>
                            <button style={S.closeBtn} onClick={() => setRevisionPedido(null)}>
                                <IconClose size={16} />
                            </button>
                        </div>
                        <div style={S.modalBody}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 0 }}>
                                Por cada prenda: confirma si hay stock en la sede pedida, pide un traslado desde una sede cercana con existencias, o —solo si no hay en ningún lado— envíala a Compras. Ninguna acción ocurre sola.
                            </p>
                            {loadingRevision ? (
                                <div style={{ padding: '30px 0', textAlign: 'center' }}>
                                    <IconLoading size={28} />
                                </div>
                            ) : (
                                revisionItems.map(it => {
                                    const resuelto = !!it.estado_revision;
                                    const disabledAccion = accionandoItemId === it.item_id;
                                    return (
                                        <div key={it.item_id} style={S.revisionCard}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                                <div>
                                                    <div style={{ fontWeight: 800 }}>{it.titulo}</div>
                                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                        Cantidad solicitada: {it.cantidad} — Sede pedida: <strong>{it.sede_pedido.nombre ?? "—"}</strong> (stock actual: {it.sede_pedido.cantidad ?? 0})
                                                    </div>
                                                </div>
                                                {resuelto && (
                                                    <span style={{
                                                        fontSize: "0.75rem", fontWeight: 800, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
                                                        background: it.estado_revision === "Enviado a Compras" ? "#fef3c7" : "#dcfce7",
                                                        color: it.estado_revision === "Enviado a Compras" ? "#92400e" : "#15803d",
                                                    }}>
                                                        {it.estado_revision}
                                                    </span>
                                                )}
                                            </div>

                                            {resuelto && (
                                                <>
                                                    {it.observacion && (
                                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10, fontStyle: 'italic' }}>
                                                            Observación: {it.observacion}
                                                        </div>
                                                    )}
                                                    <button
                                                        style={{ ...S.btnSecondary, fontSize: '0.8rem', padding: '5px 12px', opacity: disabledAccion ? 0.5 : 1 }}
                                                        disabled={disabledAccion}
                                                        onClick={() => handleDeshacerRevision(it.item_id)}
                                                    >
                                                        Deshacer revisión
                                                    </button>
                                                </>
                                            )}

                                            {!resuelto && (
                                                <>
                                                    <div style={S.grid2}>
                                                        {/* Opción 1: Aprobado por Stock (solo si de verdad alcanza en la sede pedida) */}
                                                        {(() => {
                                                            const hayStockPropio = (it.sede_pedido?.cantidad ?? 0) >= it.cantidad;
                                                            const bloqueado = !hayStockPropio || disabledAccion;
                                                            return (
                                                                <div style={{ ...S.opcionCard, opacity: hayStockPropio ? 1 : 0.55 }}>
                                                                    <div style={S.opcionTitulo}>Aprobado por Stock</div>
                                                                    {!hayStockPropio && (
                                                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a33', marginBottom: 8 }}>
                                                                            No hay stock suficiente en {it.sede_pedido?.nombre ?? "esta sede"} ({it.sede_pedido?.cantidad ?? 0} de {it.cantidad}). Usa un traslado o envía a Compras.
                                                                        </div>
                                                                    )}
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Observación (obligatoria)…"
                                                                        style={{ ...S.input, marginBottom: 8 }}
                                                                        value={observaciones[it.item_id] || ""}
                                                                        disabled={!hayStockPropio}
                                                                        onChange={e => setObservaciones(prev => ({ ...prev, [it.item_id]: e.target.value }))}
                                                                    />
                                                                    <button
                                                                        style={{ ...S.btnRevisionAccion("#dcfce7", "#15803d"), width: "100%", opacity: bloqueado ? 0.4 : 1, cursor: bloqueado ? "not-allowed" : "pointer" }}
                                                                        disabled={bloqueado}
                                                                        onClick={() => handleMarcarStockLocal(it.item_id)}
                                                                    >
                                                                        Confirmar Aprobado por Stock
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Opción 2: Aprobado por Traslado */}
                                                        <div style={S.opcionCard}>
                                                            <div style={S.opcionTitulo}>Aprobado por Traslado</div>
                                                            {it.opciones.length === 0 ? (
                                                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                                                                    No hay otras sedes registradas para este producto.
                                                                </p>
                                                            ) : (
                                                                <>
                                                                    <select
                                                                        style={{ ...S.select, marginBottom: 8 }}
                                                                        value={trasladoSede[it.item_id] || ""}
                                                                        onChange={e => setTrasladoSede(prev => ({ ...prev, [it.item_id]: e.target.value }))}
                                                                    >
                                                                        <option value="">Selecciona una sede…</option>
                                                                        {it.opciones.map(s => (
                                                                            <option
                                                                                key={s.sede_id}
                                                                                value={s.inventario_id ?? ""}
                                                                                disabled={!s.inventario_id || s.cantidad < it.cantidad}
                                                                            >
                                                                                {s.sede_nombre} — stock: {s.cantidad}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <button
                                                                        style={{ ...S.btnRevisionAccion("#e8f0ff", "#1a4fa8"), width: "100%", opacity: (!trasladoSede[it.item_id] || disabledAccion) ? 0.4 : 1 }}
                                                                        disabled={!trasladoSede[it.item_id] || disabledAccion}
                                                                        onClick={() => handleSolicitarTraslado(it.item_id, Number(trasladoSede[it.item_id]), it.cantidad)}
                                                                    >
                                                                        Confirmar Aprobado por Traslado
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{ textAlign: 'center', marginTop: 10 }}>
                                                        <button
                                                            style={{ ...S.btnRevisionAccion("#fce8e8", "#a33"), opacity: disabledAccion ? 0.5 : 1 }}
                                                            disabled={disabledAccion}
                                                            onClick={() => handleEnviarComprasItem(it.item_id)}
                                                        >
                                                            No hay stock en ninguna sede — Enviar a Compras
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div style={S.modalFooter}>
                            <button style={S.btnSecondary} onClick={() => setRevisionPedido(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modal Filtros de Búsqueda --- */}
            {filterOpen && (
                <div style={S.overlay} onClick={() => setFilterOpen(false)}>
                    <div
                        style={{ ...S.modal, maxWidth: 860, maxHeight: "none", overflow: "visible" }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={S.modalHeader}>
                            <span style={S.modalTitle}>Filtros de Búsqueda</span>
                            <button style={S.closeBtn} onClick={() => setFilterOpen(false)}>
                                <IconClose size={14} />
                            </button>
                        </div>
                        <div style={{ ...S.modalBody, overflowY: "visible", overflowX: "visible" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 24px" }}>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Estado</label>
                                    <FilterSelect
                                        value={filtroEstado}
                                        onChange={setFiltroEstado}
                                        defaultValue="Todos"
                                        options={ESTADOS_PEDIDO.map(s => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Sede Destino</label>
                                    <FilterSelect
                                        value={filtroSede}
                                        onChange={setFiltroSede}
                                        defaultValue="Todas"
                                        options={sedesOptions.map(s => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Clase de Pedido</label>
                                    <FilterSelect
                                        value={filtroClase}
                                        onChange={setFiltroClase}
                                        defaultValue="Todas"
                                        options={CLASES_PEDIDO.map(s => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Concepto Pedido</label>
                                    <FilterSelect
                                        value={filtroConcepto}
                                        onChange={setFiltroConcepto}
                                        defaultValue="Todos"
                                        options={CONCEPTOS_PEDIDO.map(s => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Responsable</label>
                                    <FilterSelect
                                        value={filtroResponsable}
                                        onChange={setFiltroResponsable}
                                        defaultValue="Todos"
                                        options={todosResponsablesOptions.map(s => ({ label: s, value: s }))}
                                    />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Fecha Inicio</label>
                                    <input type="date" style={S.input} value={filtroFechaInicio} onChange={e => setFiltroFechaInicio(e.target.value)} />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Fecha Fin</label>
                                    <input type="date" style={S.input} value={filtroFechaFin} onChange={e => setFiltroFechaFin(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div style={{ ...S.modalFooter, justifyContent: "space-between" }}>
                            <button style={S.btnSecondary} onClick={clearFilters}>Limpiar filtros</button>
                            <button style={S.btnPrimary} onClick={() => setFilterOpen(false)}>Buscar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modal Crear / Editar / Ver --- */}
            {modalOpen && (
                <div style={S.overlay}>
                    <div style={S.modal}>
                        {/* Header */}
                        <div style={S.modalHeader}>
                            <span style={S.modalTitle}>
                                {modalMode === "new" ? "Crear Nuevo Pedido de Insumos" : (modalMode === "edit" ? `Editar Pedido ${modalData.codigo}` : `Detalles de Pedido ${modalData.codigo}`)}
                            </span>
                            <button style={S.closeBtn} onClick={() => setModalOpen(false)}>
                                <IconClose size={16} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleGuardarPedido} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={S.modalBody}>
                                <div style={S.grid2}>
                                    <div style={S.formGroup}>
                                        <label style={S.label}>Sede Destino *</label>
                                        <select 
                                            style={S.select} 
                                            value={modalData.sede} 
                                            onChange={e => setModalData(prev => ({ ...prev, sede: e.target.value }))}
                                            disabled={modalMode === "view"}
                                            required
                                        >
                                            {sedesOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>

                                    <div style={S.formGroup}>
                                        <label style={S.label}>Clase de Pedido *</label>
                                        <select 
                                            style={S.select} 
                                            value={modalData.clase} 
                                            onChange={e => setModalData(prev => ({ ...prev, clase: e.target.value }))}
                                            disabled={modalMode === "view"}
                                            required
                                        >
                                            {CLASES_PEDIDO.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>

                                    <div style={S.formGroup}>
                                        <label style={S.label}>Concepto Pedido *</label>
                                        <select 
                                            style={S.select} 
                                            value={modalData.concepto} 
                                            onChange={e => setModalData(prev => ({ ...prev, concepto: e.target.value }))}
                                            disabled={modalMode === "view"}
                                            required
                                        >
                                            {CONCEPTOS_PEDIDO.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>

                                    {modalMode !== "new" && (
                                        <div style={S.formGroup}>
                                            <label style={S.label}>Estado de Pedido *</label>
                                            <select 
                                                style={S.select} 
                                                value={modalData.estado} 
                                                onChange={e => setModalData(prev => ({ ...prev, estado: e.target.value }))}
                                                disabled={modalMode === "view"}
                                                required
                                            >
                                                {ESTADOS_PEDIDO.map(e => <option key={e} value={e}>{e}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div style={S.formGroup}>
                                        <label style={S.label}>Tipo de Responsable *</label>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                                            <label style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <input 
                                                    type="radio" 
                                                    name="tipo_resp"
                                                    checked={modalData.tipo_responsable === "Empleado"}
                                                    onChange={() => handleTipoResponsableChange("Empleado")}
                                                    disabled={modalMode === "view"}
                                                />
                                                Empleado
                                            </label>
                                            <label style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <input 
                                                    type="radio" 
                                                    name="tipo_resp"
                                                    checked={modalData.tipo_responsable === "Aliado"}
                                                    onChange={() => handleTipoResponsableChange("Aliado")}
                                                    disabled={modalMode === "view"}
                                                />
                                                Aliado
                                            </label>
                                        </div>
                                    </div>

                                    <div style={S.formGroup}>
                                        <label style={S.label}>Responsable Asignado *</label>
                                        {modalData.tipo_responsable === "Empleado" ? (
                                            <select 
                                                style={S.select} 
                                                value={modalData.responsable} 
                                                onChange={e => setModalData(prev => ({ ...prev, responsable: e.target.value }))}
                                                disabled={modalMode === "view"}
                                                required
                                            >
                                                {responsablesOptions.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        ) : (
                                            <select 
                                                style={S.select} 
                                                value={modalData.responsable} 
                                                onChange={e => setModalData(prev => ({ ...prev, responsable: e.target.value }))}
                                                disabled={modalMode === "view"}
                                                required
                                            >
                                                {ALIADOS_MOCK.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <hr style={{ border: 'none', borderBottom: '1.5px solid var(--border)', margin: '20px 0' }} />

                                {/* Sección Items */}
                                <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '0.98rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 12 }}>
                                    Insumos Solicitados
                                </h3>

                                {modalMode !== "view" && (
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
                                        <div style={{ ...S.formGroup, flex: 2 }}>
                                            <label style={S.label}>Categoría</label>
                                            <select style={S.select} value={itemCategoria} onChange={e => handleCambiarItemCategoria(e.target.value)}>
                                                {CATEGORIAS_PRODUCTO.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ ...S.formGroup, flex: 3 }}>
                                            <label style={S.label}>Tipo de Producto</label>
                                            <select style={S.select} value={itemProduct} onChange={e => setItemProduct(e.target.value)}>
                                                {PRODUCTOS_CATALOGO.length === 0
                                                    ? <option value="">Sin productos en esta categoría</option>
                                                    : PRODUCTOS_CATALOGO.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ ...S.formGroup, flex: 1 }}>
                                            <label style={S.label}>Cantidad</label>
                                            <input 
                                                type="number" 
                                                min={1} 
                                                style={S.input} 
                                                value={itemQuantity} 
                                                onChange={e => setItemQuantity(Math.max(1, Number(e.target.value)))} 
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            style={{
                                                background: 'var(--primary)',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: '9px 18px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                fontFamily: 'Nunito, sans-serif'
                                            }}
                                            onClick={handleAddItem}
                                        >
                                            Agregar
                                        </button>
                                    </div>
                                )}

                                {/* Tabla de items cargados */}
                                <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg)', borderBottom: '1.5px solid var(--border)' }}>
                                                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800 }}>Producto</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, width: 80 }}>Cantidad</th>
                                                {modalMode !== "view" && <th style={{ padding: '8px 12px', textAlign: 'center', width: 60 }}>Quitar</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {modalData.items.length === 0 ? (
                                                <tr>
                                                    <td colSpan={modalMode === "view" ? 2 : 3} style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
                                                        No hay insumos agregados a este pedido todavía.
                                                    </td>
                                                </tr>
                                            ) : (
                                                modalData.items.map((it, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.producto}</td>
                                                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>{it.cantidad}</td>
                                                        {modalMode !== "view" && (
                                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                <button 
                                                                    type="button" 
                                                                    style={S.btnIconRemove} 
                                                                    onClick={() => handleRemoveItem(idx)}
                                                                >
                                                                    ×
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={S.modalFooter}>
                                <button type="button" style={S.btnSecondary} onClick={() => setModalOpen(false)} disabled={guardando}>
                                    {modalMode === "view" ? "Cerrar" : "Cancelar"}
                                </button>
                                {modalMode !== "view" && (
                                    <button type="submit" style={{ ...S.btnPrimary, opacity: guardando ? 0.6 : 1 }} disabled={guardando}>
                                        {guardando ? "Guardando…" : (modalMode === "new" ? "Crear Pedido" : "Guardar Cambios")}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Estilos CSS en JSX ---
const S = {
    container: {
        width: "100%",
        fontFamily: "Nunito, sans-serif"
    },
    toolbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
        flexWrap: "wrap"
    },
    actionButtonGroup: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap"
    },
    btnDanger: {
        background: "#fce8e8",
        color: "#a33",
        border: "none",
        borderRadius: "var(--radius-sm)",
        padding: "8px 16px",
        fontSize: "0.88rem",
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        transition: "opacity 0.2s"
    },
    btnPrimary: {
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        padding: "8px 18px",
        fontSize: "0.9rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito, sans-serif"
    },
    btnSecondary: {
        background: "var(--white)",
        color: "var(--text)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "8px 16px",
        fontSize: "0.88rem",
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        transition: "background 0.2s"
    },
    filters: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        flex: 1
    },
    searchWrap: { position: "relative", flex: 1, minWidth: 200, maxWidth: 380 },
    searchIcon: {
        position: "absolute",
        left: 11,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        color: "var(--text-muted)",
        pointerEvents: "none"
    },
    searchInput: {
        width: "100%",
        padding: "9px 12px 9px 34px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
        fontFamily: "Nunito, sans-serif",
        background: "var(--white)",
        color: "var(--text)",
        outline: "none"
    },
    filterBtn: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px",
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text)",
        fontSize: "0.9rem",
        fontWeight: 700,
        fontFamily: "Nunito, sans-serif",
        cursor: "pointer"
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: 4
    },
    label: {
        fontSize: "0.78rem",
        fontWeight: 700,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.04em"
    },
    select: {
        width: "100%",
        padding: "8px 10px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
        fontFamily: "Nunito, sans-serif",
        color: "var(--text)",
        background: "var(--white)",
        outline: "none"
    },
    selectCompact: {
        padding: "4px 8px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.82rem",
        fontFamily: "Nunito, sans-serif",
        color: "var(--text)",
        background: "var(--white)",
        outline: "none"
    },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 10px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
        fontFamily: "Nunito, sans-serif",
        color: "var(--text)",
        background: "var(--white)",
        outline: "none"
    },
    tableContainer: {
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        overflowX: "auto",
        marginBottom: 16
    },
    checkbox: {
        width: 16,
        height: 16,
        accentColor: "var(--primary)",
        cursor: "pointer"
    },
    actionIconBtn: (bg, color) => ({
        background: bg,
        border: "none",
        borderRadius: 6,
        padding: "5px 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color,
        transition: "opacity 0.15s"
    }),
    paginationRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 8px",
        marginBottom: 28
    },
    emptyState: {
        padding: "60px 20px",
        textAlign: "center",
        color: "var(--text-muted)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12
    },
    toast: {
        position: "fixed",
        bottom: 28,
        right: 28,
        color: "#fff",
        borderRadius: "var(--radius-sm)",
        padding: "13px 22px",
        fontWeight: 700,
        fontSize: "0.92rem",
        zIndex: 9999,
        boxShadow: "0 8px 28px rgba(26,155,140,0.35)"
    },
    trazabilidadCard: {
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        padding: 24,
        marginTop: 16,
        animation: "fadeIn 0.3s ease-out"
    },
    trazabilidadTitle: {
        fontFamily: "'Poppins', sans-serif",
        fontSize: "1.1rem",
        fontWeight: 800,
        color: "var(--primary)",
        margin: 0
    },
    closeTrazabilidadBtn: {
        background: "none",
        border: "none",
        fontSize: "1.5rem",
        color: "var(--text-muted)",
        cursor: "pointer",
        padding: 0
    },
    trazabilidadGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
        marginBottom: 24,
        background: "var(--bg)",
        padding: 16,
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)"
    },
    trazabilidadMetaLabel: {
        fontSize: "0.75rem",
        color: "var(--text-muted)",
        fontWeight: 700,
        textTransform: "uppercase",
        display: "block",
        marginBottom: 4
    },
    trazabilidadMetaVal: {
        fontSize: "0.88rem",
        fontWeight: 700,
        color: "var(--text)"
    },
    timelineContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px"
    },
    timelineStep: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
        textAlign: "center"
    },
    timelineCircle: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "0.85rem",
        marginBottom: 8,
        border: "2px solid transparent",
        transition: "all 0.3s"
    },
    timelineStepLabel: {
        fontSize: "0.85rem",
        fontWeight: 700,
        color: "var(--text)",
        display: "block"
    },
    timelineStepSub: {
        fontSize: "0.75rem",
        color: "var(--text-muted)"
    },
    timelineLine: {
        height: 3,
        flex: 1,
        margin: "0 10px",
        marginTop: -30,
        borderRadius: 2,
        transition: "background 0.3s"
    },
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5000,
        padding: 20
    },
    modal: {
        background: "var(--white)",
        borderRadius: "var(--radius)",
        boxShadow: "0 16px 60px rgba(26,155,140,0.22)",
        width: "100%",
        maxWidth: 720,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column"
    },
    modalHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 24px",
        background: "var(--primary)",
        borderTopLeftRadius: "var(--radius)",
        borderTopRightRadius: "var(--radius)",
        flexShrink: 0
    },
    modalTitle: {
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 700,
        fontSize: "1.1rem",
        color: "#fff"
    },
    closeBtn: {
        background: "none",
        border: "1.5px solid rgba(255, 255, 255, 0.6)",
        borderRadius: "50%",
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#fff"
    },
    modalBody: {
        padding: 24,
        overflowY: "auto",
        flex: 1
    },
    modalFooter: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
        padding: "16px 24px",
        borderTop: "1.5px solid var(--border)",
        background: "var(--bg)",
        borderBottomLeftRadius: "var(--radius)",
        borderBottomRightRadius: "var(--radius)",
        flexShrink: 0
    },
    grid2: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 16
    },
    btnIconRemove: {
        background: "#fce8e8",
        color: "#c0392b",
        border: "none",
        borderRadius: "50%",
        width: 24,
        height: 24,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: "1rem",
        cursor: "pointer"
    },
    revisionCard: {
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: 14,
        marginBottom: 12,
        background: "var(--bg)"
    },
    opcionCard: {
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: 12,
        background: "var(--white)",
        display: "flex",
        flexDirection: "column",
        minWidth: 0
    },
    opcionTitulo: {
        fontSize: "0.8rem",
        fontWeight: 800,
        color: "var(--primary)",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: "0.03em"
    },
    btnRevisionAccion: (bg, color) => ({
        background: bg,
        color,
        border: "none",
        borderRadius: "var(--radius-sm)",
        padding: "6px 12px",
        fontSize: "0.82rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito, sans-serif",
        whiteSpace: "nowrap"
    })
};
