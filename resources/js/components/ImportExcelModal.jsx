import React, { useRef, useState } from "react";
import api from "../api/axios";
import { IconClose } from "./Icons";
import { descargarExcel, fechaArchivo } from "../utils/excelExport";

/* ─── Importar datos desde Excel (genérico, por cédula/documento/etc.) ──
   Nunca sobrescribe un campo que el registro ya tenga guardado: el backend
   (cada endpoint lo implementa igual) solo escribe sobre campos vacíos/NULL
   y reporta, por cada fila, qué se actualizó y qué se omitió por ya tener
   dato. Este componente solo arma el archivo, muestra la vista previa y
   el reporte — la regla de seguridad vive en el backend. */
export default function ImportExcelModal({
    open,
    onClose,
    onImported,
    titulo,
    descripcion,
    columnas,
    descargarPlantilla,
    parsearArchivo,
    endpoint,
}) {
    const [step, setStep] = useState("select"); // select | preview | result
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [parsed, setParsed] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [credencialesCopiadas, setCredencialesCopiadas] = useState(false);
    const fileInputRef = useRef(null);

    if (!open) return null;

    const columnaClave = columnas.find((c) => c.requerido);
    const tituloDeCampo = (campo) =>
        columnas.find((c) => c.campo === campo)?.titulo ?? campo;
    // Solo el import de Empleados puede completar altas pendientes (ver
    // EmpleadoController@importarDatosPersonales); otros endpoints no mandan este campo.
    const tieneAlta = result != null && result.dados_de_alta !== undefined;
    const filasConInvalidos = (result?.detalle ?? []).filter((d) => d.campos_invalidos?.length);
    const conCredenciales = (result?.detalle ?? []).filter((d) => d.credenciales);

    const copiarCredenciales = async () => {
        const lineas = conCredenciales.map(
            (d) => `${d.nombre} (${d[columnaClave.campo]}): ${d.credenciales.email} / ${d.credenciales.password}`,
        );
        try {
            await navigator.clipboard.writeText(lineas.join("\n"));
            setCredencialesCopiadas(true);
            setTimeout(() => setCredencialesCopiadas(false), 2500);
        } catch {
            // Clipboard no existe fuera de HTTPS y puede fallar por permisos del navegador;
            // queda "Descargar credenciales" y la tabla de detalle para copiarlas a mano.
        }
    };

    // Respaldo de "Copiar": la contraseña no se puede volver a consultar después.
    const descargarCredenciales = () =>
        descargarExcel(
            [
                {
                    nombre: "Credenciales",
                    columnas: [
                        { titulo: columnaClave.titulo, tipo: "texto", ancho: 14, valor: (d) => d[columnaClave.campo] },
                        { titulo: "Nombre", tipo: "texto", ancho: 32, valor: (d) => d.nombre },
                        { titulo: "Usuario (email)", tipo: "texto", ancho: 32, valor: (d) => d.credenciales.email },
                        { titulo: "Contraseña temporal", tipo: "texto", ancho: 20, valor: (d) => d.credenciales.password },
                    ],
                    filas: conCredenciales,
                },
            ],
            `Credenciales_Importacion_${fechaArchivo()}.xlsx`,
        );

    const reset = () => {
        setStep("select");
        setFileName("");
        setError("");
        setParsed(null);
        setResult(null);
        setCredencialesCopiadas(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (!file) return;
        setFileName(file.name);
        setError("");
        try {
            const data = await parsearArchivo(file);
            if (!data.filas.length) {
                setError(
                    `No se encontraron filas con ${columnaClave.titulo} diligenciada en el archivo.`,
                );
                return;
            }
            setParsed(data);
            setStep("preview");
        } catch (err) {
            setError(
                err.message ||
                    "No se pudo leer el archivo. Verifica que sea un .xlsx/.xls/.csv válido.",
            );
        }
    };

    const confirmar = async () => {
        if (!parsed) return;
        setSubmitting(true);
        setError("");
        try {
            const filas = parsed.filas.map(({ _camposConDato, ...resto }) => resto);
            const { data } = await api.post(endpoint, { filas });
            setResult(data);
            setStep("result");
            onImported?.();
        } catch (err) {
            setError(
                err.response?.data?.message ??
                    "No se pudo completar la importación. Intenta de nuevo.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>{titulo}</span>
                    <button style={S.closeBtnWhite} onClick={handleClose}>
                        <IconClose size={14} />
                    </button>
                </div>
                <div style={S.modalBody}>
                    {step === "select" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <p style={S.introText}>{descripcion}</p>
                            <div style={S.columnasBox}>
                                <p style={S.columnasTitle}>
                                    Columnas que reconoce (deben llamarse
                                    exactamente así en la primera fila):
                                </p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {columnas.map((c) => (
                                        <span
                                            key={c.campo}
                                            style={{
                                                background: c.requerido
                                                    ? "var(--primary)"
                                                    : "var(--white)",
                                                color: c.requerido ? "#fff" : "var(--text)",
                                                border: "1px solid var(--border)",
                                                borderRadius: 20,
                                                padding: "3px 10px",
                                                fontSize: "0.76rem",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {c.titulo}
                                            {c.requerido ? " *" : ""}
                                        </span>
                                    ))}
                                </div>
                                <p style={S.columnasFootnote}>
                                    * {columnaClave.titulo} es obligatoria (se
                                    usa para encontrar el registro). Las demás
                                    son opcionales — deja en blanco lo que no
                                    tengas, no hace falta llenar todas.
                                </p>
                            </div>
                            <button style={S.btnSecondary} onClick={descargarPlantilla}>
                                Descargar plantilla Excel
                            </button>
                            {error && <div style={S.errorBox}>{error}</div>}
                            <label style={S.fileLabel}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    style={{ display: "none" }}
                                    onChange={handleFile}
                                />
                                Seleccionar archivo…
                            </label>
                        </div>
                    )}

                    {step === "preview" && parsed && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <p style={{ margin: 0, fontSize: "0.9rem" }}>
                                Archivo: <strong>{fileName}</strong>
                            </p>
                            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-muted)" }}>
                                {parsed.filas.length} fila(s) con{" "}
                                {columnaClave.titulo.toLowerCase()} de{" "}
                                {parsed.totalFilasLeidas} leídas en el archivo.
                            </p>
                            {parsed.columnasReconocidas.length > 0 && (
                                <div>
                                    <p style={S.miniTitle}>Columnas reconocidas:</p>
                                    <p style={S.miniText}>
                                        {parsed.columnasReconocidas.join(", ")}
                                    </p>
                                </div>
                            )}
                            {parsed.columnasNoReconocidas.length > 0 && (
                                <div style={S.warnBox}>
                                    <p style={S.warnTitle}>
                                        ⚠ Estas columnas no coinciden con
                                        ninguna conocida y se van a ignorar:
                                    </p>
                                    <p style={S.warnText}>
                                        {parsed.columnasNoReconocidas.join(", ")}
                                    </p>
                                </div>
                            )}
                            <div style={{ overflowX: "auto" }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>{columnaClave.titulo}</th>
                                            <th>Campos con dato</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsed.filas.slice(0, 8).map((f, i) => (
                                            <tr key={i}>
                                                <td>{f[columnaClave.campo]}</td>
                                                <td>
                                                    {f._camposConDato
                                                        .map(tituloDeCampo)
                                                        .join(", ") || "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsed.filas.length > 8 && (
                                    <p style={S.miniFootnote}>
                                        … y {parsed.filas.length - 8} fila(s) más.
                                    </p>
                                )}
                            </div>
                            {error && <div style={S.errorBox}>{error}</div>}
                        </div>
                    )}

                    {step === "result" && result && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: `repeat(${tieneAlta ? 4 : 3}, minmax(0,1fr))`,
                                    gap: 12,
                                }}
                            >
                                <div className="stat-card">
                                    <div className="stat-num" style={{ color: "#27ae60" }}>
                                        {result.actualizados}
                                    </div>
                                    <div className="stat-label">Actualizados</div>
                                </div>
                                {tieneAlta && (
                                    <div className="stat-card">
                                        <div className="stat-num" style={{ color: "#27ae60" }}>
                                            {result.dados_de_alta}
                                        </div>
                                        <div className="stat-label">Dados de alta</div>
                                    </div>
                                )}
                                <div className="stat-card">
                                    <div className="stat-num">{result.sin_cambios}</div>
                                    <div className="stat-label">
                                        Ya tenían todo (sin cambios)
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-num" style={{ color: "#a33" }}>
                                        {result.no_encontrados.length}
                                    </div>
                                    <div className="stat-label">
                                        {columnaClave.titulo} no encontradas
                                    </div>
                                </div>
                            </div>
                            {tieneAlta && result.dados_de_alta > 0 && (
                                <div style={S.altaBox}>
                                    <p style={S.altaTitle}>
                                        {result.dados_de_alta} quedaron dados de alta, con
                                        usuario y contraseña nuevos. Cópialos ahora — la
                                        contraseña no se puede volver a mostrar después.
                                    </p>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <button style={S.btnSecondary} onClick={copiarCredenciales}>
                                            {credencialesCopiadas
                                                ? "✓ Copiado"
                                                : "Copiar credenciales"}
                                        </button>
                                        <button style={S.btnSecondary} onClick={descargarCredenciales}>
                                            Descargar credenciales
                                        </button>
                                    </div>
                                </div>
                            )}
                            {filasConInvalidos.length > 0 && (
                                <div style={S.warnBox}>
                                    <p style={S.warnTitle}>
                                        ⚠ {filasConInvalidos.length} fila(s) con valores
                                        inválidos que no se cargaron (fecha inexistente,
                                        sede que no está en el catálogo, correo mal escrito,
                                        etc.). Corrígelos en el archivo y vuelve a importarlo:
                                    </p>
                                    <p style={S.warnText}>
                                        {filasConInvalidos
                                            .slice(0, 10)
                                            .map(
                                                (d) =>
                                                    `${d[columnaClave.campo]}: ${d.campos_invalidos.map(tituloDeCampo).join(", ")}`,
                                            )
                                            .join(" · ")}
                                        {filasConInvalidos.length > 10 &&
                                            ` · … y ${filasConInvalidos.length - 10} más (ver detalle).`}
                                    </p>
                                </div>
                            )}
                            {result.sin_contrato?.length > 0 && (
                                <div style={S.notFoundBox}>
                                    <p style={S.notFoundTitle}>
                                        Sin contrato registrado (no se tocó nada; crea
                                        primero su contrato en Ver y Crear Contratos
                                        &gt; Importar Excel):
                                    </p>
                                    <p style={S.notFoundText}>
                                        {result.sin_contrato.join(", ")}
                                    </p>
                                </div>
                            )}
                            {result.no_encontrados.length > 0 && (
                                <div style={S.notFoundBox}>
                                    <p style={S.notFoundTitle}>
                                        No existen en el sistema (no se tocó nada):
                                    </p>
                                    <p style={S.notFoundText}>
                                        {result.no_encontrados.join(", ")}
                                    </p>
                                </div>
                            )}
                            <details>
                                <summary style={S.detailsSummary}>
                                    Ver detalle ({result.detalle.length})
                                </summary>
                                <div style={{ overflowX: "auto", marginTop: 10 }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>{columnaClave.titulo}</th>
                                                <th>Nombre</th>
                                                <th>Actualizados</th>
                                                <th>Omitidos (ya tenían dato)</th>
                                                <th>Inválidos (no se cargaron)</th>
                                                {tieneAlta && <th>Credenciales nuevas</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.detalle.map((d, i) => (
                                                <tr key={d[columnaClave.campo] ?? i}>
                                                    <td>{d[columnaClave.campo]}</td>
                                                    <td>{d.nombre}</td>
                                                    <td>
                                                        {d.campos_actualizados
                                                            .map(tituloDeCampo)
                                                            .join(", ") || "—"}
                                                    </td>
                                                    <td>
                                                        {d.campos_omitidos
                                                            .map(tituloDeCampo)
                                                            .join(", ") || "—"}
                                                    </td>
                                                    <td style={d.campos_invalidos?.length ? { color: "#a33", fontWeight: 600 } : undefined}>
                                                        {(d.campos_invalidos ?? [])
                                                            .map(tituloDeCampo)
                                                            .join(", ") || "—"}
                                                    </td>
                                                    {tieneAlta && (
                                                        <td>
                                                            {d.credenciales
                                                                ? `${d.credenciales.email} / ${d.credenciales.password}`
                                                                : "—"}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </details>
                        </div>
                    )}
                </div>
                <div style={{ ...S.modalFooter, justifyContent: "space-between" }}>
                    {step === "preview" ? (
                        <button
                            style={S.btnSecondary}
                            onClick={() => {
                                setStep("select");
                                setParsed(null);
                            }}
                            disabled={submitting}
                        >
                            ← Elegir otro archivo
                        </button>
                    ) : (
                        <span />
                    )}
                    <div style={{ display: "flex", gap: 12 }}>
                        {step !== "result" && (
                            <button
                                style={S.btnSecondary}
                                onClick={handleClose}
                                disabled={submitting}
                            >
                                Cancelar
                            </button>
                        )}
                        {step === "preview" && (
                            <button style={S.btnPrimary} onClick={confirmar} disabled={submitting}>
                                {submitting
                                    ? "Importando…"
                                    : `Confirmar importación (${parsed.filas.length})`}
                            </button>
                        )}
                        {step === "result" && (
                            <button style={S.btnPrimary} onClick={handleClose}>
                                Cerrar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const S = {
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
        maxWidth: 740,
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
    },
    modalHeaderGreen: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "22px 28px",
        background: "var(--primary)",
        borderRadius: "var(--radius) var(--radius) 0 0",
    },
    modalTitleWhite: { color: "#fff", fontWeight: 800, fontSize: "1.05rem" },
    closeBtnWhite: {
        background: "rgba(255,255,255,0.2)",
        border: "none",
        borderRadius: "50%",
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        cursor: "pointer",
    },
    modalBody: { padding: "24px 28px", overflowY: "auto", maxHeight: "68vh" },
    modalFooter: {
        display: "flex",
        padding: "18px 28px",
        borderTop: "1.5px solid var(--border)",
    },
    btnPrimary: {
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        padding: "10px 20px",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito, sans-serif",
    },
    btnSecondary: {
        background: "var(--bg)",
        color: "var(--text)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 20px",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito, sans-serif",
    },
    introText: { color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.7, margin: 0 },
    columnasBox: { background: "var(--bg)", borderRadius: "var(--radius-sm)", padding: 16 },
    columnasTitle: { fontWeight: 700, fontSize: "0.85rem", margin: "0 0 10px", color: "var(--text)" },
    columnasFootnote: { fontSize: "0.76rem", color: "var(--text-muted)", margin: "10px 0 0" },
    errorBox: {
        color: "#a33",
        fontSize: "0.85rem",
        fontWeight: 600,
        background: "#fce8e8",
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
    },
    fileLabel: {
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        padding: "10px 20px",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito, sans-serif",
        textAlign: "center",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
    },
    miniTitle: { fontWeight: 700, fontSize: "0.82rem", margin: "0 0 4px" },
    miniText: { fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 },
    miniFootnote: { fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 6 },
    warnBox: { background: "#fff3e0", border: "1px solid #f0c674", borderRadius: "var(--radius-sm)", padding: 12 },
    warnTitle: { fontWeight: 700, fontSize: "0.82rem", color: "#8a5a00", margin: "0 0 4px" },
    warnText: { fontSize: "0.82rem", color: "#8a5a00", margin: 0 },
    notFoundBox: { background: "#fce8e8", borderRadius: "var(--radius-sm)", padding: 12 },
    notFoundTitle: { fontWeight: 700, fontSize: "0.82rem", color: "#a33", margin: "0 0 4px" },
    altaBox: {
        background: "#e8f8f3",
        border: "1px solid #a8e6d4",
        borderRadius: "var(--radius-sm)",
        padding: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
    },
    altaTitle: { fontSize: "0.82rem", color: "#1a6b52", fontWeight: 600, margin: 0, flex: 1 },
    notFoundText: { fontSize: "0.8rem", color: "#a33", margin: 0, wordBreak: "break-word" },
    detailsSummary: { cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", color: "var(--primary)" },
};
