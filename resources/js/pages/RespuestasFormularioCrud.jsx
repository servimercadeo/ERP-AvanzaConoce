import React, { useState, useEffect, useMemo } from "react";
import api from "../api/axios";
import {
    IconEye,
    IconTrash,
    IconClose,
    IconFolder,
    IconCheckCircle,
    IconXCircle,
    IconMinusCircle,
    IconDownload,
    IconInfo,
} from "../components/Icons";

const DOCS_LIST = [
    {
        id: "documento_identidad",
        label: "Documento de Identidad",
        required: true,
    },
    { id: "diploma_bachiller", label: "Diploma de Bachiller", required: true },
    {
        id: "certificados_estudio",
        label: "Certificados de Estudio",
        required: true,
    },
    {
        id: "certificados_laborales",
        label: "Certificados Laborales",
        required: true,
    },
    { id: "certificacion_eps", label: "Certificación EPS", required: true },
    {
        id: "certificacion_pension",
        label: "Certificación Fondo Pensiones",
        required: true,
    },
    { id: "hoja_vida", label: "Formato Hoja de Vida S&M", required: true },
    {
        id: "documentos_beneficiarios",
        label: "Documentos Beneficiarios",
        required: false,
    },
];

const ESTADO_CIVIL_FILTERS = [
    { value: "Todos", label: "Todos los estados" },
    { value: "SOLTERO", label: "Soltero" },
    { value: "CASADO", label: "Casado" },
    { value: "DIVORCIADO", label: "Divorciado" },
    { value: "VIUDO", label: "Viudo" },
];

function getPaginasBotones(pagina, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const delta = 2,
        left = pagina - delta,
        right = pagina + delta;
    const pages = [1];
    if (left > 2) pages.push("...");
    for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i++)
        pages.push(i);
    if (right < total - 1) pages.push("...");
    pages.push(total);
    return pages;
}

export default function RespuestasFormularioCrud() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [civilFilter, setCivilFilter] = useState("Todos");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [toast, setToast] = useState(null);
    const [docsModal, setDocsModal] = useState({
        open: false,
        row: null,
        data: null,
        loading: false,
    });
    const [expFecha, setExpFecha] = useState(null);
    const POR_PAGINA = 10;

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchResponses = async () => {
        setLoading(true);
        try {
            const res = await api.get("/respuestas-ingresos");
            setData(res.data ?? []);
        } catch (e) {
            console.error(e);
            showToast("Error al cargar las respuestas", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResponses();
    }, []);

    useEffect(() => {
        if (!docsModal.open || !docsModal.row) return;
        const interval = setInterval(async () => {
            try {
                const res = await api.get(
                    `/documentos-contratacion/${docsModal.row.documento}`,
                );
                setDocsModal((prev) =>
                    prev.open ? { ...prev, data: res.data } : prev,
                );
            } catch {}
        }, 10000);
        return () => clearInterval(interval);
    }, [docsModal.open, docsModal.row?.documento]);

    const handleDelete = async (id) => {
        if (
            !confirm(
                "¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.",
            )
        )
            return;
        try {
            await api.delete(`/respuestas-ingresos/${id}`);
            setData((prev) => prev.filter((r) => r.id !== id));
            showToast("Respuesta eliminada correctamente");
        } catch (e) {
            showToast(
                "Error al eliminar: " +
                    (e.response?.data?.message || e.message),
                "error",
            );
        }
    };

    const handleOpenDocs = async (row) => {
        setDocsModal({ open: true, row, data: null, loading: true });
        try {
            const res = await api.get(
                `/documentos-contratacion/${row.documento}`,
            );
            setDocsModal((prev) => ({
                ...prev,
                data: res.data,
                loading: false,
            }));
        } catch {
            setDocsModal((prev) => ({ ...prev, loading: false }));
            showToast("Error al cargar los documentos", "error");
        }
    };

    const handleDownloadDoc = async (documento, tipo, nombreOriginal) => {
        try {
            const res = await api.get(
                `/documentos-contratacion/${documento}/${encodeURIComponent(tipo)}/download`,
                { responseType: "blob" },
            );
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = nombreOriginal;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            showToast("Error al descargar el documento", "error");
        }
    };

    const handleRefreshDocs = async () => {
        if (!docsModal.row) return;
        try {
            const res = await api.get(
                `/documentos-contratacion/${docsModal.row.documento}`,
            );
            setDocsModal((prev) => ({ ...prev, data: res.data }));
        } catch {
            showToast("Error al actualizar", "error");
        }
    };

    const handlePreviewDoc = async (documento, tipo) => {
        try {
            const res = await api.get(
                `/documentos-contratacion/${documento}/${encodeURIComponent(tipo)}/download?inline=1`,
                { responseType: "blob" },
            );
            const mime =
                res.headers["content-type"] || "application/octet-stream";
            const url = URL.createObjectURL(
                new Blob([res.data], { type: mime }),
            );
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch {
            showToast("Error al previsualizar el documento", "error");
        }
    };

    const handleDeleteDoc = async (documento, tipo) => {
        if (
            !confirm(
                "¿Eliminar este documento? Esta acción no se puede deshacer.",
            )
        )
            return;
        try {
            await api.delete(
                `/documentos-contratacion/${documento}/${encodeURIComponent(tipo)}`,
            );
            setDocsModal((prev) => ({
                ...prev,
                data: prev.data
                    ? {
                          ...prev.data,
                          archivos: Object.fromEntries(
                              Object.entries(prev.data.archivos ?? {}).filter(
                                  ([k]) => k !== tipo,
                              ),
                          ),
                      }
                    : null,
            }));
            showToast("Documento eliminado");
        } catch {
            showToast("Error al eliminar el documento", "error");
        }
    };

    const handleOpenView = async (row) => {
        setSelectedResponse(row);
        setExpFecha(null);
        setIsModalOpen(true);
        try {
            const res = await api.get(`/candidatos/by-doc/${row.documento}`);
            if (res.data) setExpFecha(res.data.fecha_expedicion ?? null);
        } catch {
            /* no bloquea el modal si no se encuentra */
        }
    };

    const filteredData = useMemo(() => {
        return data.filter((row) => {
            const matchSearch = [
                row.nombres,
                row.apellidos,
                row.documento,
                row.correo,
                row.celular,
                row.profesion,
            ].some((v) =>
                String(v ?? "")
                    .toLowerCase()
                    .includes(search.toLowerCase()),
            );
            const matchCivil =
                civilFilter === "Todos" ||
                String(row.estado_civil ?? "").toUpperCase() ===
                    civilFilter.toUpperCase();
            return matchSearch && matchCivil;
        });
    }, [data, search, civilFilter]);

    const totalPaginas = Math.max(
        1,
        Math.ceil(filteredData.length / POR_PAGINA),
    );
    const paginatedData = filteredData.slice(
        (pagina - 1) * POR_PAGINA,
        pagina * POR_PAGINA,
    );

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
                padding: "10px 0",
            }}
        >
            {/* Toolbar */}
            <div style={S.toolbar}>
                <div style={S.filters}>
                    <div style={S.searchWrap}>
                        <span style={S.searchIcon}>
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, documento, correo, celular..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPagina(1);
                            }}
                            style={S.searchInput}
                        />
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <label
                            style={{
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                color: "var(--text-muted)",
                                fontFamily: "Poppins,sans-serif",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                            }}
                        >
                            Estado Civil:
                        </label>
                        <select
                            value={civilFilter}
                            onChange={(e) => {
                                setCivilFilter(e.target.value);
                                setPagina(1);
                            }}
                            style={{
                                padding: "9px 12px",
                                border: "1.5px solid var(--border)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "0.88rem",
                                fontFamily: "Nunito,sans-serif",
                                outline: "none",
                                background: "var(--white)",
                                color: "var(--text)",
                                cursor: "pointer",
                            }}
                        >
                            {ESTADO_CIVIL_FILTERS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <button style={S.btnSecondary} onClick={fetchResponses}>
                    Actualizar
                </button>
            </div>

            {/* Tabla */}
            {loading ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "48px 0",
                        color: "var(--text-muted)",
                        fontFamily: "Nunito,sans-serif",
                        fontSize: "0.9rem",
                    }}
                >
                    Cargando respuestas del formulario...
                </div>
            ) : (
                <div style={S.tableWrap}>
                    <table style={S.table}>
                        <thead>
                            <tr>
                                <th style={S.th}>#</th>
                                <th style={S.th}>F. Registro</th>
                                <th style={S.th}>Documento</th>
                                <th style={S.th}>Nombre completo</th>
                                <th style={S.th}>Correo electrónico</th>
                                <th style={S.th}>Celular</th>
                                <th style={S.th}>EPS / AFP</th>
                                <th style={S.th}>Tallas (C · P · Z)</th>
                                <th style={{ ...S.th, textAlign: "center" }}>
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((row, index) => (
                                <tr key={row.id} style={S.tr}>
                                    <td
                                        style={{
                                            ...S.td,
                                            color: "var(--text-muted)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {(pagina - 1) * POR_PAGINA + index + 1}
                                    </td>
                                    <td
                                        style={{
                                            ...S.td,
                                            whiteSpace: "nowrap",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        {row.created_at
                                            ? new Date(row.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
                                            : "—"}
                                    </td>
                                    <td style={{ ...S.td, fontWeight: 700 }}>
                                        {row.documento}
                                    </td>
                                    <td style={{ ...S.td, fontWeight: 700 }}>
                                        {row.nombres} {row.apellidos}
                                    </td>
                                    <td style={S.td}>{row.correo}</td>
                                    <td style={S.td}>{row.celular}</td>
                                    <td style={S.td}>
                                        <span
                                            style={{
                                                display: "block",
                                                fontWeight: 700,
                                                fontSize: "0.85rem",
                                            }}
                                        >
                                            {row.eps}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: "0.78rem",
                                                color: "var(--text-muted)",
                                                marginTop: 2,
                                                display: "block",
                                            }}
                                        >
                                            {row.afp}
                                        </span>
                                    </td>
                                    <td style={S.td}>
                                        <span
                                            style={S.badge(
                                                "#ede9fe",
                                                "#5b21b6",
                                            )}
                                        >
                                            {row.talla_camisa} ·{" "}
                                            {row.talla_pantalon} ·{" "}
                                            {row.talla_zapatos}
                                        </span>
                                    </td>
                                    <td
                                        style={{ ...S.td, textAlign: "center" }}
                                    >
                                        <div style={S.actions}>
                                            <button
                                                style={S.actionBtn(
                                                    "var(--primary-light)",
                                                    "var(--primary-dark)",
                                                )}
                                                title="Ver detalles"
                                                onClick={() =>
                                                    handleOpenView(row)
                                                }
                                            >
                                                <IconEye size={15} />
                                            </button>
                                            <button
                                                style={S.actionBtn(
                                                    "#e8f0fb",
                                                    "#2563eb",
                                                )}
                                                title="Ver documentos de contratación"
                                                onClick={() =>
                                                    handleOpenDocs(row)
                                                }
                                            >
                                                <IconFolder size={15} />
                                            </button>
                                            <button
                                                style={S.actionBtn(
                                                    "#fce8e8",
                                                    "#c0392b",
                                                )}
                                                title="Eliminar registro"
                                                onClick={() =>
                                                    handleDelete(row.id)
                                                }
                                            >
                                                <IconTrash size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan="9" style={S.empty}>
                                        No se encontraron respuestas
                                        registradas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Paginación */}
            {!loading && filteredData.length > POR_PAGINA && (
                <div style={S.paginationWrap}>
                    <span style={S.pageInfo}>
                        Página {pagina} de {totalPaginas} ·{" "}
                        {filteredData.length} registros en total
                    </span>
                    <div style={S.pageControls}>
                        <button
                            onClick={() => setPagina((p) => Math.max(1, p - 1))}
                            disabled={pagina === 1}
                            style={S.pageBtn(pagina === 1)}
                        >
                            ‹
                        </button>
                        {getPaginasBotones(pagina, totalPaginas).map((n, i) =>
                            n === "..." ? (
                                <span key={`e${i}`} style={S.pageEllipsis}>
                                    …
                                </span>
                            ) : (
                                <button
                                    key={n}
                                    onClick={() => setPagina(n)}
                                    style={
                                        n === pagina
                                            ? S.pageBtnActive
                                            : S.pageBtn(false)
                                    }
                                >
                                    {n}
                                </button>
                            ),
                        )}
                        <button
                            onClick={() =>
                                setPagina((p) => Math.min(totalPaginas, p + 1))
                            }
                            disabled={pagina === totalPaginas}
                            style={S.pageBtn(pagina === totalPaginas)}
                        >
                            ›
                        </button>
                    </div>
                </div>
            )}

            {/* Modal detalle */}
            {isModalOpen && selectedResponse && (
                <div style={S.overlay} onClick={() => setIsModalOpen(false)}>
                    <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={S.modalHeader}>
                            <span style={S.modalTitle}>
                                Detalle del Formulario —{" "}
                                {selectedResponse.nombres}{" "}
                                {selectedResponse.apellidos}
                            </span>
                            <button
                                style={S.closeBtn}
                                onClick={() => setIsModalOpen(false)}
                            >
                                <IconClose size={14} />
                            </button>
                        </div>

                        <div style={S.modalBody}>
                            <div
                                style={{
                                    marginBottom: 20,
                                    padding: "12px 16px",
                                    borderLeft: "4px solid var(--primary)",
                                    background: "var(--bg)",
                                    borderRadius: "0 8px 8px 0",
                                    fontSize: "0.85rem",
                                    color: "var(--text-muted)",
                                    fontFamily: "Nunito,sans-serif",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <IconInfo size={14} style={{ flexShrink: 0 }} />{" "}
                                Copia esta información y completa los campos
                                correspondientes del Empleado o Contrato en el
                                ERP según sea necesario.
                            </div>

                            <label style={S.sectionLabel}>
                                1. Información Personal
                            </label>
                            <div style={{ ...S.grid3, marginBottom: 20 }}>
                                <DetailItem
                                    label="Número de documento"
                                    value={selectedResponse.documento}
                                />
                                <DetailItem
                                    label="Fecha de expedición doc."
                                    value={expFecha ? expFecha.substring(0, 10) : "—"}
                                />
                                <DetailItem
                                    label="Nombres completos"
                                    value={selectedResponse.nombres}
                                />
                                <DetailItem
                                    label="Apellidos completos"
                                    value={selectedResponse.apellidos}
                                />
                                <DetailItem
                                    label="Fecha de nacimiento"
                                    value={selectedResponse.fecha_nacimiento}
                                />
                                <DetailItem
                                    label="Lugar de nacimiento"
                                    value={selectedResponse.lugar_nacimiento}
                                />
                                <DetailItem
                                    label="Estado civil"
                                    value={selectedResponse.estado_civil}
                                />
                                <DetailItem
                                    label="Número de hijos"
                                    value={selectedResponse.numero_hijos}
                                />
                                <DetailItem
                                    label="Tipo de sangre"
                                    value={selectedResponse.rh}
                                />
                                <DetailItem
                                    label="Nivel de escolaridad"
                                    value={selectedResponse.nivel_escolaridad}
                                />
                                <DetailItem
                                    label="Profesión / Ocupación"
                                    value={selectedResponse.profesion}
                                />
                            </div>

                            <label style={S.sectionLabel}>
                                2. Información de Contacto y Residencia
                            </label>
                            <div style={{ ...S.grid3, marginBottom: 20 }}>
                                <DetailItem
                                    label="Ciudad de residencia"
                                    value={selectedResponse.ciudad}
                                />
                                <DetailItem
                                    label="Barrio"
                                    value={selectedResponse.barrio}
                                />
                                <DetailItem
                                    label="Dirección completa"
                                    value={selectedResponse.direccion}
                                />
                                <DetailItem
                                    label="Estrato socioeconómico"
                                    value={selectedResponse.estrato}
                                />
                                <DetailItem
                                    label="Correo electrónico"
                                    value={selectedResponse.correo}
                                />
                                <DetailItem
                                    label="Celular"
                                    value={selectedResponse.celular}
                                />
                            </div>

                            <label style={S.sectionLabel}>
                                3. Contacto en Caso de Emergencia
                            </label>
                            <div style={{ ...S.grid3, marginBottom: 20 }}>
                                <DetailItem
                                    label="Nombre del contacto"
                                    value={selectedResponse.emergencia_nombre}
                                />
                                <DetailItem
                                    label="Teléfono de emergencia"
                                    value={selectedResponse.emergencia_telefono}
                                />
                                <DetailItem
                                    label="Parentesco"
                                    value={
                                        selectedResponse.emergencia_parentesco
                                    }
                                />
                            </div>

                            <label style={S.sectionLabel}>
                                4. Afiliaciones a Seguridad Social
                            </label>
                            <div style={{ ...S.grid3, marginBottom: 20 }}>
                                <DetailItem
                                    label="E.P.S. (Salud)"
                                    value={selectedResponse.eps}
                                />
                                <DetailItem
                                    label="A.F.P. (Fondo Pensiones)"
                                    value={selectedResponse.afp}
                                />
                            </div>

                            <label style={S.sectionLabel}>
                                5. Tallas de Dotación (Uniformes)
                            </label>
                            <div style={S.grid3}>
                                <DetailItem
                                    label="Talla de camisa"
                                    value={selectedResponse.talla_camisa}
                                />
                                <DetailItem
                                    label="Talla de pantalón"
                                    value={selectedResponse.talla_pantalon}
                                />
                                <DetailItem
                                    label="Talla de zapatos"
                                    value={selectedResponse.talla_zapatos}
                                />
                            </div>
                        </div>

                        <div style={S.modalFooter}>
                            <button
                                style={S.btnSecondary}
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal documentos */}
            {docsModal.open && docsModal.row && (
                <DocsModal
                    row={docsModal.row}
                    data={docsModal.data}
                    loading={docsModal.loading}
                    onClose={() =>
                        setDocsModal({
                            open: false,
                            row: null,
                            data: null,
                            loading: false,
                        })
                    }
                    onDownload={handleDownloadDoc}
                    onPreview={handlePreviewDoc}
                    onDelete={handleDeleteDoc}
                    onRefresh={handleRefreshDocs}
                />
            )}

            {/* Toast */}
            {toast && (
                <div
                    style={{
                        position: "fixed",
                        bottom: 32,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background:
                            toast.type === "success"
                                ? "var(--primary)"
                                : "#e74c3c",
                        color: "#fff",
                        padding: "14px 28px",
                        borderRadius: 10,
                        fontFamily: "Nunito,sans-serif",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        boxShadow: "0 8px 28px rgba(0,0,0,0.2)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}

function DetailItem({ label, value, span }) {
    const wrap = {
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
        ...(span ? { gridColumn: `span ${span}` } : {}),
    };
    return (
        <div style={wrap}>
            <label
                style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "var(--text)",
                }}
            >
                {label}
            </label>
            <div
                style={{
                    padding: "8px 10px",
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.88rem",
                    fontFamily: "Nunito,sans-serif",
                    color: "var(--text-muted)",
                    background: "var(--bg)",
                    minHeight: 36,
                }}
            >
                {value || "—"}
            </div>
        </div>
    );
}

function DocsModal({
    row,
    data,
    loading,
    onClose,
    onDownload,
    onPreview,
    onDelete,
    onRefresh,
}) {
    const archivos = data?.archivos ?? {};

    return (
        <div style={S.overlay} onClick={onClose}>
            <div
                style={{ ...S.modal, maxWidth: 680 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={S.modalHeader}>
                    <span style={S.modalTitle}>
                        Documentos de Contratación — {row.nombres}{" "}
                        {row.apellidos}
                    </span>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <button
                            onClick={onRefresh}
                            title="Actualizar"
                            style={{
                                background: "rgba(255,255,255,0.15)",
                                border: "1px solid rgba(255,255,255,0.3)",
                                borderRadius: 6,
                                color: "#fff",
                                cursor: "pointer",
                                padding: "4px 10px",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                fontFamily: "Nunito,sans-serif",
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                            }}
                        >
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="23 4 23 10 17 10" />
                                <polyline points="1 20 1 14 7 14" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                            Actualizar
                        </button>
                        <button style={S.closeBtn} onClick={onClose}>
                            <IconClose size={14} />
                        </button>
                    </div>
                </div>

                <div style={S.modalBody}>
                    {loading ? (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "48px 0",
                                color: "var(--text-muted)",
                                fontFamily: "Nunito,sans-serif",
                                fontSize: "0.9rem",
                            }}
                        >
                            Cargando documentos...
                        </div>
                    ) : (
                        <>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 10,
                                }}
                            >
                                <label
                                    style={{
                                        ...S.sectionLabel,
                                        marginBottom: 0,
                                    }}
                                >
                                    Estado de documentos · {row.documento}
                                </label>
                                <span
                                    style={{
                                        fontSize: "0.78rem",
                                        fontWeight: 700,
                                        color: "var(--primary)",
                                        fontFamily: "Nunito,sans-serif",
                                    }}
                                >
                                    {Object.keys(archivos).length} /{" "}
                                    {DOCS_LIST.length} subidos
                                </span>
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                }}
                            >
                                {DOCS_LIST.map((doc) => {
                                    const arch = archivos[doc.id];
                                    return (
                                        <div
                                            key={doc.id}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 12,
                                                padding: "10px 14px",
                                                borderRadius: 10,
                                                border: arch
                                                    ? "1px solid #b2dfcc"
                                                    : doc.required
                                                      ? "1px solid #f5c6c6"
                                                      : "1px solid var(--border)",
                                                background: arch
                                                    ? "#f0fdf4"
                                                    : doc.required
                                                      ? "#fdf5f5"
                                                      : "var(--bg)",
                                                opacity:
                                                    !arch && !doc.required
                                                        ? 0.85
                                                        : 1,
                                            }}
                                        >
                                            <span style={{ flexShrink: 0 }}>
                                                {arch ? (
                                                    <IconCheckCircle
                                                        size={16}
                                                        style={{
                                                            color: "#10b981",
                                                        }}
                                                    />
                                                ) : doc.required ? (
                                                    <IconXCircle
                                                        size={16}
                                                        style={{
                                                            color: "#ef4444",
                                                        }}
                                                    />
                                                ) : (
                                                    <IconMinusCircle
                                                        size={16}
                                                        style={{
                                                            color: "#9ca3af",
                                                        }}
                                                    />
                                                )}
                                            </span>
                                            <div
                                                style={{ flex: 1, minWidth: 0 }}
                                            >
                                                <div
                                                    style={{
                                                        fontFamily:
                                                            "Poppins,sans-serif",
                                                        fontWeight: 700,
                                                        fontSize: "0.82rem",
                                                        color: "var(--text)",
                                                    }}
                                                >
                                                    {doc.label}
                                                </div>
                                                <div
                                                    style={{
                                                        fontFamily:
                                                            "Nunito,sans-serif",
                                                        fontSize: "0.74rem",
                                                        color: "var(--text-muted)",
                                                        marginTop: 1,
                                                    }}
                                                >
                                                    {arch
                                                        ? `${arch.nombre_original} · ${arch.uploaded_at?.substring(0, 16) ?? ""}`
                                                        : doc.required
                                                          ? "No subido — obligatorio"
                                                          : "No subido — opcional"}
                                                </div>
                                            </div>
                                            {arch && (
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 6,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <button
                                                        onClick={() =>
                                                            onPreview(
                                                                row.documento,
                                                                doc.id,
                                                            )
                                                        }
                                                        style={{
                                                            border: "none",
                                                            borderRadius: 7,
                                                            padding: "5px 9px",
                                                            cursor: "pointer",
                                                            fontSize: "0.74rem",
                                                            fontWeight: 700,
                                                            fontFamily:
                                                                "Poppins,sans-serif",
                                                            display:
                                                                "inline-flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 5,
                                                            background:
                                                                "var(--primary-light)",
                                                            color: "var(--primary-dark)",
                                                        }}
                                                    >
                                                        <IconEye size={13} />{" "}
                                                        Ver
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            onDownload(
                                                                row.documento,
                                                                doc.id,
                                                                arch.nombre_original,
                                                            )
                                                        }
                                                        style={{
                                                            border: "none",
                                                            borderRadius: 7,
                                                            padding: "5px 9px",
                                                            cursor: "pointer",
                                                            fontSize: "0.74rem",
                                                            fontWeight: 700,
                                                            fontFamily:
                                                                "Poppins,sans-serif",
                                                            display:
                                                                "inline-flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 5,
                                                            background:
                                                                "var(--primary-light)",
                                                            color: "var(--primary-dark)",
                                                        }}
                                                    >
                                                        <IconDownload
                                                            size={13}
                                                        />{" "}
                                                        Descargar
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            onDelete(
                                                                row.documento,
                                                                doc.id,
                                                            )
                                                        }
                                                        style={{
                                                            border: "none",
                                                            borderRadius: 7,
                                                            padding: "5px 9px",
                                                            cursor: "pointer",
                                                            display:
                                                                "inline-flex",
                                                            alignItems:
                                                                "center",
                                                            background:
                                                                "#fce8e8",
                                                            color: "#c0392b",
                                                        }}
                                                    >
                                                        <IconTrash size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

const S = {
    toolbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
    },
    filters: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flex: 1,
        flexWrap: "wrap",
    },
    searchWrap: { position: "relative", flex: 1, minWidth: 220, maxWidth: 400 },
    searchIcon: {
        position: "absolute",
        left: 11,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        color: "var(--text-muted)",
        pointerEvents: "none",
    },
    searchInput: {
        width: "100%",
        padding: "9px 12px 9px 34px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
        fontFamily: "Nunito,sans-serif",
        background: "var(--white)",
        color: "var(--text)",
        outline: "none",
    },
    btnPrimary: {
        padding: "10px 24px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
        whiteSpace: "nowrap",
    },
    btnSecondary: {
        padding: "10px 20px",
        background: "var(--bg)",
        color: "var(--text)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
        whiteSpace: "nowrap",
    },
    tableWrap: {
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        overflowX: "auto",
    },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 960 },
    th: {
        padding: "14px",
        background: "var(--bg)",
        color: "var(--primary)",
        fontWeight: 700,
        fontSize: "0.75rem",
        fontFamily: "Nunito,sans-serif",
        textAlign: "left",
        borderBottom: "1.5px solid var(--border)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
    },
    tr: { borderBottom: "1px solid var(--border)" },
    td: {
        padding: "13px 14px",
        fontSize: "0.85rem",
        fontFamily: "Nunito,sans-serif",
        color: "var(--text)",
        verticalAlign: "middle",
    },
    badge: (bg, color) => ({
        background: bg,
        color,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: "0.78rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        fontFamily: "Nunito,sans-serif",
    }),
    actions: { display: "flex", gap: 6, justifyContent: "center" },
    actionBtn: (bg, color) => ({
        background: bg,
        border: "none",
        borderRadius: 6,
        padding: "5px 8px",
        cursor: "pointer",
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
    }),
    empty: {
        padding: "60px 20px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.9rem",
        fontFamily: "Nunito,sans-serif",
    },
    paginationWrap: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
    },
    pageInfo: {
        color: "var(--text-muted)",
        fontSize: "0.85rem",
        fontFamily: "Nunito,sans-serif",
    },
    pageControls: { display: "flex", alignItems: "center", gap: 6 },
    pageBtn: (disabled) => ({
        minWidth: 32,
        height: 32,
        padding: "0 8px",
        border: "1.5px solid var(--border)",
        borderRadius: 6,
        background: "var(--white)",
        color: disabled ? "var(--text-muted)" : "var(--text)",
        fontSize: "0.88rem",
        fontWeight: 700,
        fontFamily: "Nunito,sans-serif",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
    }),
    pageBtnActive: {
        minWidth: 32,
        height: 32,
        padding: "0 8px",
        border: "1.5px solid var(--primary)",
        borderRadius: 6,
        background: "var(--primary)",
        color: "#fff",
        fontSize: "0.88rem",
        fontWeight: 700,
        fontFamily: "Nunito,sans-serif",
        cursor: "default",
    },
    pageEllipsis: {
        minWidth: 28,
        height: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: "0.88rem",
    },
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(26,58,53,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5000,
        padding: 20,
    },
    modal: {
        background: "var(--white)",
        borderRadius: "var(--radius)",
        boxShadow: "0 16px 60px rgba(26,155,140,0.22)",
        width: "100%",
        maxWidth: 880,
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
    },
    modalHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "22px 28px",
        background: "var(--primary)",
        borderTopLeftRadius: "var(--radius)",
        borderTopRightRadius: "var(--radius)",
        flexShrink: 0,
    },
    modalTitle: {
        fontFamily: "'Poppins',sans-serif",
        fontWeight: 700,
        fontSize: "1.2rem",
        color: "#fff",
    },
    closeBtn: {
        background: "none",
        border: "1.5px solid rgba(255,255,255,0.6)",
        borderRadius: "50%",
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#fff",
    },
    modalBody: {
        padding: "22px 28px 28px",
        overflowY: "auto",
        overflowX: "hidden",
        flex: 1,
    },
    modalFooter: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
        padding: "16px 28px",
        borderTop: "1.5px solid var(--border)",
        flexShrink: 0,
    },
    grid3: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 14,
    },
    sectionLabel: {
        display: "block",
        fontSize: "0.82rem",
        fontWeight: 800,
        color: "var(--primary)",
        fontFamily: "'Poppins',sans-serif",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 10,
    },
};
