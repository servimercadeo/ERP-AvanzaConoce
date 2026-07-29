import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    IconSearch,
    IconEmptySearch,
    IconLoading,
    IconEdit,
    IconTrash,
    IconClose,
} from "../components/Icons";
import api from "../api/axios";

const POR_PAGINA = 8;
const dateOnly = (v) => (v ? String(v).split("T")[0] : "");

// ─── Excel: mismo espíritu de simplificación que "Pedidos automáticos", con
// Regional como columna adicional porque cada combinación Proyecto+Regional
// del archivo termina siendo un pedido global independiente. ─────────────────
const PEDIDO_HEADER_MAP = {
    cedula: "cedula",
    regional: "regional",
    proyecto: "proyecto",
    prenda: "prenda",
    talla: "talla",
    cantidad: "cantidad",
};

const normalizeHeaderPA = (s) =>
    (s ?? "")
        .toString()
        .normalize("NFD")
        .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
        .toLowerCase()
        .trim();

const normalizeTextPA = normalizeHeaderPA;

// Índice O(1) de inventarioFlat para no escanear las ~8-9 mil filas por cada fila de un
// Excel importado. Clave = proyecto|prenda|talla(lower)|genero, primer ítem encontrado gana
// (mismo criterio que un .find() en el orden en que llega inventarioFlat, agrupado por
// proyecto/prenda/genero/talla desde el backend).
function buildInventarioIndex(inventarioFlat) {
    const idx = new Map();
    for (const i of inventarioFlat) {
        const key = `${i.proyecto}|${i.prenda}|${String(i.talla).toLowerCase()}|${i.genero}`;
        if (!idx.has(key)) idx.set(key, i);
    }
    return idx;
}

// Replica exactamente `inventarioFlat.find(i => i.proyecto===p && i.prenda===pr &&
// i.genero===genero && i.talla.toLowerCase()===talla.toLowerCase())` pero usando el índice.
function lookupInventario(idx, proyecto, prenda, talla, genero) {
    const tallaLower = String(talla ?? "").toLowerCase();
    return idx.get(`${proyecto}|${prenda}|${tallaLower}|${genero}`) ?? null;
}

function parseDateLocal(str) {
    return new Date(String(str).split("T")[0] + "T00:00:00");
}
function fmtDateCron(d) {
    return d.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
function computeCronDates(fechaEntrega, cicloMeses) {
    const n = Number(cicloMeses) || 4;
    const entrega = parseDateLocal(fechaEntrega);
    const inicio = new Date(entrega);
    inicio.setMonth(inicio.getMonth() - n);
    const corte = new Date(inicio);
    corte.setMonth(corte.getMonth() + Math.floor(n / 2));
    return { inicio, corte, entrega };
}

function getCronogramaInfo(g, pedidos, cronogramas) {
    const proyectos = [
        ...new Set(
            pedidos.map((p) => p.contrato?.cliente_proyecto).filter(Boolean),
        ),
    ];
    if (proyectos.length === 0) return [];
    const fechaGlobal = g.fecha ? parseDateLocal(g.fecha) : null;
    return proyectos.map((nombre) => {
        const cron = cronogramas.find(
            (c) => c.activo && c.proyecto?.nombre === nombre,
        );
        if (!cron?.fecha_entrega) return { proyecto: nombre, cron: null };
        const { corte, entrega } = computeCronDates(
            cron.fecha_entrega,
            cron.ciclo_meses,
        );
        const matches = fechaGlobal ? fechaGlobal <= corte : null;
        return { proyecto: nombre, cron, corte, entrega, matches };
    });
}

function todayMidnight() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function proximoCorte(cronInfo) {
    const pendientes = cronInfo.filter(
        ({ cron, corte }) => cron && todayMidnight() < corte,
    );
    if (pendientes.length === 0) return null;
    return pendientes.reduce(
        (min, c) => (c.corte < min ? c.corte : min),
        pendientes[0].corte,
    );
}

function estadoDisplay(pedido, g) {
    if (pedido.estado === "Devolución")
        return { label: "Devolución", bg: "#fce8e8", color: "#c0392b" };
    if (pedido.estado === "Devolución usada")
        return {
            label: "Devolución usada",
            bg: "#e5e7eb",
            color: "#4b5563",
        };
    if (pedido.estado === "Enviar a compras")
        return { label: "Enviar a compras", bg: "#fef3c7", color: "#92400e" };
    if (g.entrega_confirmada)
        return { label: "Completado", bg: "#dcfce7", color: "#0d6e5a" };
    if (g.confirmado)
        return { label: "Pedido confirmado", bg: "#e8f0ff", color: "#1a4fa8" };
    return { label: "En proceso", bg: "#f1f5f9", color: "#475569" };
}

function PedidoIncluidoModal({ pedido, global: g, onClose, onDevuelto }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [confirm, setConfirm] = useState(false);

    const est = estadoDisplay(pedido, g);
    const puedeDevolver =
        pedido.estado === "Completado" && g.confirmado && !g.entrega_confirmada;

    const handleDevolver = async () => {
        setSaving(true);
        setError("");
        try {
            const { data } = await api.post(
                `/pedidos-automaticos/${pedido.id}/devolver`,
            );
            onDevuelto(data);
        } catch (e) {
            setError(
                e?.response?.data?.message ??
                    "Error al procesar la devolución.",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 500 }}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>
                        Pedido{" "}
                        <span style={{ fontFamily: "monospace" }}>
                            #{pedido.codigo}
                        </span>
                    </span>
                    <button style={S.btnIcon} onClick={onClose}>
                        <IconClose size={16} />
                    </button>
                </div>
                <div style={S.modalBody}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 16,
                        }}
                    >
                        <div style={{ ...S.avatarSm, flexShrink: 0 }}>
                            {(pedido.empleado?.nombres || "?")
                                .charAt(0)
                                .toUpperCase()}
                            {pedido.empleado?.fotografia && (
                                <img
                                    src={`/storage/${pedido.empleado.fotografia}`}
                                    alt=""
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        borderRadius: "50%",
                                    }}
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                    }}
                                />
                            )}
                        </div>
                        <div>
                            <div
                                style={{ fontWeight: 800, fontSize: "0.95rem" }}
                            >
                                {pedido.empleado?.nombres}
                                {pedido.empleado?.apellidos}
                            </div>
                            <div
                                style={{
                                    fontSize: "0.78rem",
                                    color: "var(--text-muted)",
                                }}
                            >
                                C.C. {pedido.empleado?.cedula ?? "—"}
                            </div>
                        </div>
                        <span
                            style={{
                                marginLeft: "auto",
                                padding: "4px 12px",
                                borderRadius: 20,
                                fontWeight: 700,
                                fontSize: "0.78rem",
                                background: est.bg,
                                color: est.color,
                            }}
                        >
                            {est.label}
                        </span>
                    </div>

                    <div
                        style={{
                            background: "var(--bg)",
                            borderRadius: 8,
                            padding: "12px 14px",
                            marginBottom: 16,
                        }}
                    >
                        <div
                            style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                color: "var(--text-muted)",
                                marginBottom: 8,
                            }}
                        >
                            Prendas asignadas
                        </div>
                        {(pedido.items ?? []).length === 0 ? (
                            <span
                                style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.84rem",
                                }}
                            >
                                Sin items
                            </span>
                        ) : (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                }}
                            >
                                {(pedido.items ?? []).map((it, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            fontSize: "0.85rem",
                                        }}
                                    >
                                        <span>
                                            {it.inventario?.prenda} T:
                                            {it.inventario?.talla}
                                        </span>
                                        <span
                                            style={{
                                                fontWeight: 700,
                                                color: "var(--primary)",
                                            }}
                                        >
                                            ×{it.cantidad}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {pedido.estado === "Devolución" && (
                        <div
                            style={{
                                background: "#fce8e8",
                                border: "1.5px solid #e57373",
                                borderRadius: 8,
                                padding: "10px 14px",
                                fontSize: "0.84rem",
                                color: "#c0392b",
                            }}
                        >
                            Este pedido ya fue marcado como devolución y el
                            inventario fue restaurado.
                        </div>
                    )}

                    {pedido.estado === "Completado" && !g.confirmado && (
                        <div
                            style={{
                                background: "#f1f5f9",
                                border: "1.5px solid #cbd5e1",
                                borderRadius: 8,
                                padding: "10px 14px",
                                fontSize: "0.84rem",
                                color: "#475569",
                            }}
                        >
                            La devolución se podrá marcar una vez se confirme el
                            pedido global.
                        </div>
                    )}

                    {pedido.estado === "Completado" &&
                        g.confirmado &&
                        g.entrega_confirmada && (
                            <div
                                style={{
                                    background: "#f1f5f9",
                                    border: "1.5px solid #cbd5e1",
                                    borderRadius: 8,
                                    padding: "10px 14px",
                                    fontSize: "0.84rem",
                                    color: "#475569",
                                }}
                            >
                                La entrega de este pedido global ya fue
                                confirmada, no es posible marcar devoluciones.
                            </div>
                        )}

                    {puedeDevolver && !confirm && (
                        <div
                            style={{
                                background: "#fff8e0",
                                border: "1.5px solid #f9c74f",
                                borderRadius: 8,
                                padding: "10px 14px",
                                fontSize: "0.84rem",
                                color: "#7a5c00",
                            }}
                        >
                            Al marcar como <strong>Devolución</strong>, todas
                            las prendas de este pedido volverán al inventario.
                        </div>
                    )}

                    {puedeDevolver && confirm && (
                        <div
                            style={{
                                background: "#fce8e8",
                                border: "1.5px solid #e57373",
                                borderRadius: 8,
                                padding: "10px 14px",
                                fontSize: "0.84rem",
                                color: "#c0392b",
                            }}
                        >
                            ¿Confirmar devolución? Esta acción restaurará el
                            inventario y no se puede deshacer.
                        </div>
                    )}

                    {error && (
                        <div style={{ ...S.errorMsg, marginTop: 10 }}>
                            {error}
                        </div>
                    )}
                </div>
                <div style={S.modalFooter}>
                    <button
                        style={S.btnSecondary}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cerrar
                    </button>
                    {puedeDevolver && !confirm && (
                        <button
                            style={{ ...S.btnPrimary, background: "#c0392b" }}
                            onClick={() => setConfirm(true)}
                        >
                            Marcar devolución
                        </button>
                    )}
                    {puedeDevolver && confirm && (
                        <button
                            style={{ ...S.btnPrimary, background: "#c0392b" }}
                            onClick={handleDevolver}
                            disabled={saving}
                        >
                            {saving ? "Procesando…" : "Confirmar devolución"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function EditModal({ global: g, onClose, onSaved }) {
    const [form, setForm] = useState({
        fecha: dateOnly(g.fecha),
        notas: g.notas ?? "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            const { data } = await api.put(`/pedidos-globales/${g.id}`, form);
            onSaved(data);
        } catch (e) {
            setError(e?.response?.data?.message ?? "Error al guardar.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={S.modal}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>
                        Editar Pedido Global{" "}
                        <span style={{ fontFamily: "monospace" }}>
                            #{g.codigo}
                        </span>
                    </span>
                    <button style={S.btnIcon} onClick={onClose}>
                        <IconClose size={16} />
                    </button>
                </div>
                <div style={S.modalBody}>
                    <label style={S.label}>Fecha</label>
                    <input
                        type="date"
                        style={S.input}
                        value={form.fecha}
                        onChange={(e) =>
                            setForm((p) => ({ ...p, fecha: e.target.value }))
                        }
                    />
                    <label style={{ ...S.label, marginTop: 14 }}>Notas</label>
                    <textarea
                        style={{
                            ...S.input,
                            minHeight: 80,
                            resize: "vertical",
                        }}
                        value={form.notas}
                        onChange={(e) =>
                            setForm((p) => ({ ...p, notas: e.target.value }))
                        }
                        placeholder="Notas opcionales…"
                    />
                    {error && <div style={S.errorMsg}>{error}</div>}
                </div>
                <div style={S.modalFooter}>
                    <button
                        style={S.btnSecondary}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        style={S.btnPrimary}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Guardando…" : "Guardar cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ConfirmModal({ global: g, cronogramas, onClose, onConfirmed }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const pedidos = (g.pedidos_automaticos ?? []).filter((p) => p.codigo);
    const cronInfo = getCronogramaInfo(g, pedidos, cronogramas);
    const vencidos = cronInfo.filter((c) => c.cron && c.matches === false);

    const handleConfirm = async () => {
        setSaving(true);
        setError("");
        try {
            const { data } = await api.put(`/pedidos-globales/${g.id}`, {
                confirmado: true,
            });
            onConfirmed(data);
        } catch (e) {
            setError(e?.response?.data?.message ?? "Error al confirmar.");
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 420 }}>
                <div style={S.modalHeader}>
                    <span
                        style={{
                            fontWeight: 800,
                            fontSize: "1rem",
                            color: "#0d6e5a",
                        }}
                    >
                        Confirmar Pedido Global
                    </span>
                    <button style={S.btnIcon} onClick={onClose}>
                        <IconClose size={16} />
                    </button>
                </div>
                <div style={S.modalBody}>
                    <p style={{ marginBottom: 10 }}>
                        ¿Confirmar el pedido global{" "}
                        <strong style={{ fontFamily: "monospace" }}>
                            #{g.codigo}
                        </strong>
                        ?
                    </p>
                    <div
                        style={{
                            background: "#e0f7f4",
                            border: "1.5px solid #0d6e5a",
                            borderRadius: 8,
                            padding: "10px 14px",
                            fontSize: "0.85rem",
                            color: "#0d6e5a",
                        }}
                    >
                        Al confirmarlo se habilitará el paso para{" "}
                        <strong>confirmar la entrega</strong> una vez el
                        empleado la reciba (o registrar la devolución si no la
                        recibió).
                    </div>
                    {vencidos.length > 0 && (
                        <div
                            style={{
                                background: "#fef3c7",
                                border: "1.5px solid #f9c74f",
                                borderRadius: 8,
                                padding: "10px 14px",
                                fontSize: "0.85rem",
                                color: "#92400e",
                                marginTop: 10,
                            }}
                        >
                            ⚠ Ya pasó la fecha de corte para:{" "}
                            {vencidos.map((v) => v.proyecto).join(", ")}. El
                            pedido debía confirmarse antes o el mismo día del
                            corte.
                        </div>
                    )}
                    {error && (
                        <div style={{ ...S.errorMsg, marginTop: 10 }}>
                            {error}
                        </div>
                    )}
                </div>
                <div style={S.modalFooter}>
                    <button
                        style={S.btnSecondary}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        style={{ ...S.btnPrimary, background: "#0d6e5a" }}
                        onClick={handleConfirm}
                        disabled={saving}
                    >
                        {saving ? "Confirmando…" : "Confirmar pedido"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function EntregaModal({ global: g, cronogramas, onClose, onConfirmed }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [resultado, setResultado] = useState(null);
    const [confirmedData, setConfirmedData] = useState(null);

    const pedidos = (g.pedidos_automaticos ?? []).filter((p) => p.codigo);
    const cronInfo = getCronogramaInfo(g, pedidos, cronogramas);
    const corte = proximoCorte(cronInfo);

    const handleConfirm = async () => {
        setSaving(true);
        setError("");
        try {
            const { data } = await api.put(`/pedidos-globales/${g.id}`, {
                entrega_confirmada: true,
            });
            const actas = data.actas_entrega;
            const huboProblemas =
                actas &&
                (actas.omitidas?.length > 0 || actas.fallidas?.length > 0);
            if (huboProblemas) {
                setConfirmedData(data);
                setResultado(actas);
                setSaving(false);
            } else {
                onConfirmed(data);
            }
        } catch (e) {
            setError(
                e?.response?.data?.message ?? "Error al confirmar la entrega.",
            );
            setSaving(false);
        }
    };

    // La entrega ya quedó confirmada en el backend; esta pantalla solo informa qué actas
    // de dotación no se pudieron enviar por correo, para que no pase inadvertido.
    if (resultado) {
        return (
            <div style={S.overlay}>
                <div style={{ ...S.modal, maxWidth: 460 }}>
                    <div style={S.modalHeader}>
                        <span
                            style={{
                                fontWeight: 800,
                                fontSize: "1rem",
                                color: "#1a4fa8",
                            }}
                        >
                            Entrega confirmada
                        </span>
                        <button
                            style={S.btnIcon}
                            onClick={() => onConfirmed(confirmedData)}
                        >
                            <IconClose size={16} />
                        </button>
                    </div>
                    <div style={S.modalBody}>
                        {resultado.enviadas?.length > 0 && (
                            <p style={{ marginBottom: 10 }}>
                                Acta enviada a{" "}
                                <strong>{resultado.enviadas.length}</strong>{" "}
                                empleado{resultado.enviadas.length !== 1 ? "s" : ""}.
                            </p>
                        )}
                        {resultado.omitidas?.length > 0 && (
                            <div style={{ ...S.errorMsg, marginBottom: 10 }}>
                                <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
                                    Sin enviar (falta correo real registrado):
                                </p>
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {resultado.omitidas.map((o) => (
                                        <li key={o.codigo}>
                                            {o.empleado} — pedido #{o.codigo}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {resultado.fallidas?.length > 0 && (
                            <div style={S.errorMsg}>
                                <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
                                    Error al enviar:
                                </p>
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {resultado.fallidas.map((f) => (
                                        <li key={f.codigo}>
                                            {f.empleado} — pedido #{f.codigo}:{" "}
                                            {f.motivo}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div style={S.modalFooter}>
                        <button
                            style={{ ...S.btnPrimary, background: "#1a4fa8" }}
                            onClick={() => onConfirmed(confirmedData)}
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 420 }}>
                <div style={S.modalHeader}>
                    <span
                        style={{
                            fontWeight: 800,
                            fontSize: "1rem",
                            color: "#1a4fa8",
                        }}
                    >
                        Confirmar Entrega
                    </span>
                    <button style={S.btnIcon} onClick={onClose}>
                        <IconClose size={16} />
                    </button>
                </div>
                <div style={S.modalBody}>
                    <p style={{ marginBottom: 10 }}>
                        ¿Confirmar la entrega del pedido global{" "}
                        <strong style={{ fontFamily: "monospace" }}>
                            #{g.codigo}
                        </strong>
                        ?
                    </p>
                    <div
                        style={{
                            background: "#e8f0ff",
                            border: "1.5px solid #1a4fa8",
                            borderRadius: 8,
                            padding: "10px 14px",
                            fontSize: "0.85rem",
                            color: "#1a4fa8",
                        }}
                    >
                        Si algún empleado no recibió su dotación, márcalo
                        primero como <strong>Devolución</strong> antes de
                        confirmar. Esta acción quedará como{" "}
                        <strong>Completado</strong> y no podrá revertirse.
                        {corte && (
                            <>
                                {" "}
                                Fecha de corte de referencia:{" "}
                                {fmtDateCron(corte)}.
                            </>
                        )}
                    </div>
                    {error && (
                        <div style={{ ...S.errorMsg, marginTop: 10 }}>
                            {error}
                        </div>
                    )}
                </div>
                <div style={S.modalFooter}>
                    <button
                        style={S.btnSecondary}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        style={{ ...S.btnPrimary, background: "#1a4fa8" }}
                        onClick={handleConfirm}
                        disabled={saving}
                    >
                        {saving ? "Confirmando…" : "Confirmar entrega"}
                    </button>
                </div>
            </div>
        </div>
    );
}
function DeleteModal({ global: g, onClose, onDeleted }) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    const handleDelete = async () => {
        setDeleting(true);
        setError("");
        try {
            await api.delete(`/pedidos-globales/${g.id}`);
            onDeleted(g.id);
        } catch (e) {
            setError(e?.response?.data?.message ?? "Error al eliminar.");
            setDeleting(false);
        }
    };

    const pedidos = (g.pedidos_automaticos ?? []).filter((p) => p.codigo);

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 420 }}>
                <div style={S.modalHeader}>
                    <span
                        style={{
                            fontWeight: 800,
                            fontSize: "1rem",
                            color: "#c0392b",
                        }}
                    >
                        Eliminar Pedido Global
                    </span>
                    <button style={S.btnIcon} onClick={onClose}>
                        <IconClose size={16} />
                    </button>
                </div>
                <div style={S.modalBody}>
                    <p style={{ marginBottom: 10 }}>
                        ¿Estás seguro de eliminar el pedido global{" "}
                        <strong style={{ fontFamily: "monospace" }}>
                            #{g.codigo}
                        </strong>
                        ?
                    </p>
                    {pedidos.length > 0 && (
                        <div
                            style={{
                                background: "#fff8e1",
                                border: "1.5px solid #f9c74f",
                                borderRadius: 8,
                                padding: "10px 14px",
                                fontSize: "0.85rem",
                                color: "#7a5c00",
                            }}
                        >
                            Los <strong>{pedidos.length} pedido(s)</strong>{" "}
                            incluidos volverán a estado <strong>Activo</strong>{" "}
                            (En proceso).
                        </div>
                    )}
                    {error && (
                        <div style={{ ...S.errorMsg, marginTop: 10 }}>
                            {error}
                        </div>
                    )}
                </div>
                <div style={S.modalFooter}>
                    <button
                        style={S.btnSecondary}
                        onClick={onClose}
                        disabled={deleting}
                    >
                        Cancelar
                    </button>
                    <button
                        style={{ ...S.btnPrimary, background: "#c0392b" }}
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? "Eliminando…" : "Eliminar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ImportPedidosGlobalesModal({
    onClose,
    onImported,
    empleados,
    contratos,
    inventarioFlat,
    regionales,
}) {
    const [fileName, setFileName] = useState("");
    const [grupos, setGrupos] = useState([]);
    const [error, setError] = useState("");
    const [importing, setImporting] = useState(false);
    const [resultado, setResultado] = useState(null);

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError("");
        setGrupos([]);
        setResultado(null);
        setFileName(file.name);

        try {
            const XLSX = await import("xlsx");
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
            if (raw.length === 0) {
                setError("El archivo no tiene filas de datos.");
                return;
            }

            const filas = raw.map((row) => {
                const mapped = {};
                Object.entries(row).forEach(([k, v]) => {
                    const key = PEDIDO_HEADER_MAP[normalizeHeaderPA(k)];
                    if (key) mapped[key] = typeof v === "string" ? v.trim() : v;
                });
                return mapped;
            });

            // Un pedido nuevo por cada combinación cédula + proyecto + regional:
            // todas sus filas (prendas) se agrupan en ese único pedido. Cada
            // combinación proyecto + regional distinta que aparezca en el
            // archivo termina en su propio pedido global.
            const hoy = new Date().toISOString().split("T")[0];
            const gruposMap = new Map();
            const orden = [];
            const invIndex = buildInventarioIndex(inventarioFlat);
            filas.forEach((fila, idx) => {
                const cedula = String(fila.cedula ?? "").trim();
                const proyecto = String(fila.proyecto ?? "").trim();
                const regionalTexto = String(fila.regional ?? "").trim();
                if (!cedula) return;
                const key = `${cedula}|${proyecto}|${normalizeTextPA(regionalTexto)}`;

                if (!gruposMap.has(key)) {
                    gruposMap.set(key, {
                        cedula,
                        proyecto,
                        regionalTexto,
                        empleado:
                            empleados.find((e) => e.cedula === cedula) ?? null,
                        fecha_pedido: hoy,
                        notas: "",
                        items: [],
                        erroresItems: [],
                    });
                    orden.push(key);
                }
                const grupo = gruposMap.get(key);
                if (!fila.prenda) return;

                const generoEmpleado = grupo.empleado?.genero ?? "";
                const cantidad = Number(fila.cantidad) || 0;
                const inv = lookupInventario(
                    invIndex,
                    proyecto,
                    fila.prenda,
                    fila.talla,
                    generoEmpleado,
                );

                if (!inv || cantidad <= 0) {
                    grupo.erroresItems.push(
                        `Fila ${idx + 2}: no se encontró "${fila.prenda ?? ""}" (${proyecto}, talla ${fila.talla ?? ""}) para el género del empleado, o la cantidad no es válida.`,
                    );
                    return;
                }
                grupo.items.push({
                    inventario_dotacion_id: inv.id,
                    cantidad,
                    descripcion: `${inv.prenda} · ${inv.genero} · T:${inv.talla} x${cantidad}`,
                });
            });

            const gruposFinal = orden.map((key) => {
                const g = gruposMap.get(key);
                const contrato = g.empleado
                    ? contratos.find((c) => c.empleado_id === g.empleado.id)
                    : null;
                const regional = regionales.find(
                    (r) =>
                        normalizeTextPA(r.nombre) ===
                        normalizeTextPA(g.regionalTexto),
                );
                const errores = [...g.erroresItems];
                if (!g.empleado)
                    errores.unshift(
                        `No se encontró un empleado con cédula "${g.cedula}".`,
                    );
                else if (!g.empleado.genero)
                    errores.unshift(
                        `El empleado ${g.cedula} no tiene género registrado; no se le pueden asignar prendas.`,
                    );
                if (!g.proyecto)
                    errores.unshift(
                        `Falta el proyecto para la cédula ${g.cedula}.`,
                    );
                if (!regional)
                    errores.unshift(
                        `Regional "${g.regionalTexto}" no reconocida para la cédula ${g.cedula}.`,
                    );
                return {
                    ...g,
                    contrato_id: contrato?.id ?? null,
                    regional_id: regional?.id ?? null,
                    regionalNombre: regional?.nombre ?? g.regionalTexto,
                    errores,
                };
            });

            setGrupos(gruposFinal);
        } catch {
            setError(
                "No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx).",
            );
        }
    };

    const gruposValidos = grupos.filter(
        (g) => g.errores.length === 0 && g.items.length > 0,
    );

    const combosValidos = [];
    const combosIndex = new Map();
    gruposValidos.forEach((g) => {
        const comboKey = `${g.proyecto}|${g.regional_id}`;
        if (!combosIndex.has(comboKey)) {
            const combo = {
                proyecto: g.proyecto,
                regional_id: g.regional_id,
                regionalNombre: g.regionalNombre,
                pedidos: [],
            };
            combosIndex.set(comboKey, combo);
            combosValidos.push(combo);
        }
        combosIndex.get(comboKey).pedidos.push(g);
    });

    const handleDescargarPlantilla = async () => {
        const XLSX = await import("xlsx");
        const rows = [
            {
                Cédula: "1234567890",
                Regional: "EJE CAFETERO",
                Proyecto: "SYM TIGO EXPRESS",
                Prenda: "Polo Gris Manga Corta",
                Talla: "M",
                Cantidad: 1,
            },
            {
                Cédula: "1234567890",
                Regional: "EJE CAFETERO",
                Proyecto: "SYM TIGO EXPRESS",
                Prenda: "Pantalon Administrativo",
                Talla: "34",
                Cantidad: 1,
            },
        ];
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [
            { wch: 14 },
            { wch: 14 },
            { wch: 18 },
            { wch: 26 },
            { wch: 8 },
            { wch: 10 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
        XLSX.writeFile(wb, "Plantilla_Pedidos_Globales.xlsx");
    };

    const handleImport = async () => {
        if (combosValidos.length === 0) return;
        setImporting(true);
        setError("");
        const creados = [];
        const fallidos = [];
        for (const combo of combosValidos) {
            try {
                const { data } = await api.post("/pedidos-globales/import", {
                    proyecto: combo.proyecto,
                    regional_id: combo.regional_id,
                    pedidos: combo.pedidos.map((g) => ({
                        codigo: null,
                        empleado_id: g.empleado.id,
                        contrato_id: g.contrato_id,
                        fecha_pedido: g.fecha_pedido,
                        notas: g.notas,
                        items: g.items.map(
                            ({ inventario_dotacion_id, cantidad }) => ({
                                inventario_dotacion_id,
                                cantidad,
                            }),
                        ),
                    })),
                });
                creados.push({
                    global: data,
                    total: combo.pedidos.length,
                    proyecto: combo.proyecto,
                    regionalNombre: combo.regionalNombre,
                });
            } catch (e) {
                fallidos.push({
                    proyecto: combo.proyecto,
                    regionalNombre: combo.regionalNombre,
                    motivo:
                        e?.response?.data?.message ??
                        "Error al crear el pedido global.",
                });
            }
        }
        setImporting(false);
        setResultado({ creados, fallidos });
        if (creados.length > 0) onImported();
    };

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 720 }}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>
                        Importar Pedido Global desde Excel
                    </span>
                    <button style={S.btnIcon} onClick={onClose}>
                        <IconClose size={16} />
                    </button>
                </div>
                <div style={S.modalBody}>
                    <p
                        style={{
                            fontSize: "0.84rem",
                            color: "var(--text-muted)",
                            marginTop: 0,
                        }}
                    >
                        Columnas del archivo:{" "}
                        <strong>
                            Cédula, Regional, Proyecto, Prenda, Talla, Cantidad
                        </strong>
                        . El código y el estado se generan automáticamente, el
                        género se toma del empleado, la fecha es la de hoy y las
                        notas se agregan luego desde la interfaz. Las filas con
                        la misma cédula, proyecto y regional se agrupan en un
                        solo pedido; cada combinación distinta de{" "}
                        <strong>Proyecto + Regional</strong> del archivo crea su
                        propio pedido global.
                    </p>
                    <button
                        type="button"
                        onClick={handleDescargarPlantilla}
                        style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            marginBottom: 10,
                            color: "var(--primary)",
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            textDecoration: "underline",
                        }}
                    >
                        Descargar plantilla de ejemplo
                    </button>
                    <label
                        htmlFor="import-pedidos-globales-file"
                        style={S.fileDrop}
                    >
                        <input
                            id="import-pedidos-globales-file"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFile}
                            style={{ display: "none" }}
                        />
                        <span
                            style={{
                                fontWeight: 800,
                                color: "var(--primary)",
                                fontSize: "0.88rem",
                            }}
                        >
                            {fileName
                                ? "Cambiar archivo"
                                : "Seleccionar archivo Excel"}
                        </span>
                        <span
                            style={{
                                fontSize: "0.78rem",
                                color: "var(--text-muted)",
                            }}
                        >
                            {fileName || ".xlsx o .xls"}
                        </span>
                    </label>

                    {combosValidos.length > 0 && !resultado && (
                        <div
                            style={{
                                ...S.errorMsg,
                                background: "#e0f7f4",
                                color: "#0d6e5a",
                                marginTop: 10,
                            }}
                        >
                            Se crearán {combosValidos.length} pedido
                            {combosValidos.length !== 1 ? "s" : ""} global
                            {combosValidos.length !== 1 ? "es" : ""}:{" "}
                            {combosValidos
                                .map(
                                    (c) =>
                                        `${c.proyecto} · ${c.regionalNombre} (${c.pedidos.length})`,
                                )
                                .join(" — ")}
                        </div>
                    )}

                    {grupos.length > 0 && (
                        <div
                            style={{
                                marginTop: 10,
                                maxHeight: 260,
                                overflowY: "auto",
                                border: "1.5px solid var(--border)",
                                borderRadius: 8,
                            }}
                        >
                            {grupos.map((g, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: "10px 14px",
                                        borderBottom:
                                            i < grupos.length - 1
                                                ? "1px solid var(--border)"
                                                : "none",
                                        background:
                                            g.errores.length === 0 &&
                                            g.items.length > 0
                                                ? "transparent"
                                                : "#fce8e8",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            fontSize: "0.85rem",
                                        }}
                                    >
                                        {g.cedula}{" "}
                                        {g.empleado
                                            ? `· ${g.empleado.nombres} ${g.empleado.apellidos}`
                                            : ""}
                                        {" · "}
                                        {g.proyecto || "—"}
                                        {" · "}
                                        {g.regionalNombre || "—"}
                                        {" · "}
                                        {g.items.length} prenda
                                        {g.items.length !== 1 ? "s" : ""}
                                    </div>
                                    {g.items.map((it, j) => (
                                        <div
                                            key={j}
                                            style={{
                                                fontSize: "0.78rem",
                                                color: "var(--text-muted)",
                                                paddingLeft: 8,
                                            }}
                                        >
                                            {it.descripcion}
                                        </div>
                                    ))}
                                    {g.errores.map((e, j) => (
                                        <div
                                            key={j}
                                            style={{
                                                fontSize: "0.78rem",
                                                color: "#c0392b",
                                                paddingLeft: 8,
                                            }}
                                        >
                                            {e}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}

                    {resultado && (
                        <div style={{ marginTop: 10 }}>
                            {resultado.creados.map((r, i) => (
                                <div
                                    key={i}
                                    style={{
                                        ...S.errorMsg,
                                        background: "#e0f7f4",
                                        color: "#0d6e5a",
                                        marginBottom: 6,
                                    }}
                                >
                                    Pedido global{" "}
                                    <strong>#{r.global.codigo}</strong> (
                                    {r.proyecto} · {r.regionalNombre}) creado
                                    con {r.total} pedido
                                    {r.total !== 1 ? "s" : ""}.
                                </div>
                            ))}
                            {resultado.fallidos.map((f, i) => (
                                <div
                                    key={i}
                                    style={{ ...S.errorMsg, marginBottom: 6 }}
                                >
                                    {f.proyecto} · {f.regionalNombre}:{" "}
                                    {f.motivo}
                                </div>
                            ))}
                        </div>
                    )}
                    {error && (
                        <div style={{ ...S.errorMsg, marginTop: 10 }}>
                            {error}
                        </div>
                    )}
                </div>
                <div style={S.modalFooter}>
                    <button
                        style={S.btnSecondary}
                        onClick={onClose}
                        disabled={importing}
                    >
                        {resultado ? "Cerrar" : "Cancelar"}
                    </button>
                    {!resultado && (
                        <button
                            style={{
                                ...S.btnPrimary,
                                opacity:
                                    importing || combosValidos.length === 0
                                        ? 0.6
                                        : 1,
                            }}
                            onClick={handleImport}
                            disabled={importing || combosValidos.length === 0}
                        >
                            {importing
                                ? "Creando…"
                                : `Crear ${combosValidos.length} pedido${combosValidos.length !== 1 ? "s" : ""} global${combosValidos.length !== 1 ? "es" : ""}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function PedidosGlobalesCrud() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("Todos");
    const [pagina, setPagina] = useState(1);
    const [expanded, setExpanded] = useState(null);
    const [subSearch, setSubSearch] = useState("");
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [confirmTarget, setConfirmTarget] = useState(null);
    const [entregaTarget, setEntregaTarget] = useState(null);
    const [editPedido, setEditPedido] = useState(null); // { pedido, global }
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkEstado, setBulkEstado] = useState("Activo");
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkError, setBulkError] = useState("");
    const [importOpen, setImportOpen] = useState(false);

    const { data: globales = [], isLoading } = useQuery({
        queryKey: ["pedidos-globales"],
        queryFn: () => api.get("/pedidos-globales").then((r) => r.data),
    });

    const { data: cronogramas = [] } = useQuery({
        queryKey: ["cronograma-dotacion"],
        queryFn: () => api.get("/cronograma-dotacion").then((r) => r.data),
    });

    const { data: empleados = [] } = useQuery({
        queryKey: ["empleados"],
        queryFn: () => api.get("/empleados").then((r) => r.data),
    });
    const { data: contratos = [] } = useQuery({
        queryKey: ["contratos"],
        queryFn: () => api.get("/contratos").then((r) => r.data),
    });
    const { data: inventarioFlat = [] } = useQuery({
        queryKey: ["inventario-dotacion-flat"],
        queryFn: () =>
            api.get("/inventario-dotacion?flat=1").then((r) => r.data),
    });
    const { data: catalogos } = useQuery({
        queryKey: ["catalogos"],
        queryFn: () => api.get("/catalogos").then((r) => r.data),
    });
    const regionales = catalogos?.regionales ?? [];

    const stats = useMemo(
        () => ({
            total: globales.length,
            totalPedidos: globales.reduce(
                (s, g) =>
                    s +
                    (g.pedidos_automaticos ?? []).filter((p) => p.codigo)
                        .length,
                0,
            ),
            totalPrendas: globales.reduce(
                (s, g) =>
                    s +
                    (g.pedidos_automaticos ?? [])
                        .filter((p) => p.codigo)
                        .reduce(
                            (ss, p) =>
                                ss +
                                (p.items ?? []).reduce(
                                    (sss, it) => sss + it.cantidad,
                                    0,
                                ),
                            0,
                        ),
                0,
            ),
        }),
        [globales],
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return globales.filter((g) => {
            const matchQ =
                !q ||
                g.codigo.toLowerCase().includes(q) ||
                String(g.fecha ?? "").includes(q);
            const matchE =
                filtroEstado === "Todos" ||
                (filtroEstado === "Completado" && g.entrega_confirmada) ||
                (filtroEstado === "Pedido confirmado" &&
                    g.confirmado &&
                    !g.entrega_confirmada) ||
                (filtroEstado === "En proceso" && !g.confirmado);
            return matchQ && matchE;
        });
    }, [globales, search, filtroEstado]);

    const paginated = useMemo(
        () => filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
        [filtered, pagina],
    );
    const totalPaginas = Math.ceil(filtered.length / POR_PAGINA);

    const handleExport = async () => {
        const XLSX = await import("xlsx");
        const rows = [];
        filtered.forEach((g) => {
            const pedidos = (g.pedidos_automaticos ?? []).filter(
                (p) => p.codigo,
            );
            pedidos.forEach((p) => {
                const base = {
                    Código: p.codigo ?? "",
                    Cédula: p.empleado?.cedula ?? "",
                    Empleado:
                        `${p.empleado?.nombres ?? ""} ${p.empleado?.apellidos ?? ""}`.trim(),
                    Estado: p.estado ?? "",
                    "Fecha Pedido": dateOnly(p.fecha_pedido),
                };
                const itemRow = (inv, cantidad) => ({
                    ...base,
                    Proyecto: inv?.proyecto ?? g.cliente_proyecto ?? "",
                    Prenda: inv?.prenda ?? "",
                    Género: inv?.genero ?? "",
                    Talla: inv?.talla ?? "",
                    Cantidad: cantidad ?? "",
                    Notas: p.notas ?? "",
                });
                if (!p.items || p.items.length === 0) {
                    rows.push(itemRow(null, ""));
                } else {
                    p.items.forEach((it) =>
                        rows.push(itemRow(it.inventario, it.cantidad)),
                    );
                }
            });
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [
            { wch: 10 },
            { wch: 14 },
            { wch: 26 },
            { wch: 12 },
            { wch: 12 },
            { wch: 18 },
            { wch: 28 },
            { wch: 12 },
            { wch: 8 },
            { wch: 10 },
            { wch: 30 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pedidos");

        const fecha = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `Pedidos_Globales_${fecha}.xlsx`);
    };

    const toggle = (id) => {
        setExpanded((prev) => (prev === id ? null : id));
        setSubSearch("");
    };

    const handleSaved = (updated) => {
        qc.setQueryData(["pedidos-globales"], (old = []) =>
            old.map((g) => (g.id === updated.id ? updated : g)),
        );
        setEditTarget(null);
    };

    const handleDeleted = (id) => {
        qc.setQueryData(["pedidos-globales"], (old = []) =>
            old.filter((g) => g.id !== id),
        );
        qc.invalidateQueries({ queryKey: ["pedidos-automaticos"] });
        setDeleteTarget(null);
        if (expanded === id) setExpanded(null);
    };

    const handleDevuelto = (updatedPedido) => {
        qc.setQueryData(["pedidos-globales"], (old = []) =>
            old.map((g) => ({
                ...g,
                pedidos_automaticos: (g.pedidos_automaticos ?? []).map((p) =>
                    p.id === updatedPedido.id ? updatedPedido : p,
                ),
            })),
        );
        qc.invalidateQueries({ queryKey: ["inventario-dotacion-flat"] });
        qc.invalidateQueries({ queryKey: ["inventario_dotacion"] });
        qc.invalidateQueries({ queryKey: ["pedidos-automaticos"] });
        setEditPedido(null);
    };

    const handleConfirmed = (updated) => {
        qc.setQueryData(["pedidos-globales"], (old = []) =>
            old.map((g) => (g.id === updated.id ? updated : g)),
        );
        setConfirmTarget(null);
    };

    const handleEntregaConfirmed = (updated) => {
        qc.setQueryData(["pedidos-globales"], (old = []) =>
            old.map((g) => (g.id === updated.id ? updated : g)),
        );
        setEntregaTarget(null);
    };

    const togglePedido = (id, checked) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const toggleGlobal = (pedidoIds, checked) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            pedidoIds.forEach((id) =>
                checked ? next.add(id) : next.delete(id),
            );
            return next;
        });
    };

    const handleBulkApply = async () => {
        if (selectedIds.size === 0) return;
        setBulkSaving(true);
        setBulkError("");
        try {
            const { data } = await api.put("/pedidos-automaticos/bulk-estado", {
                ids: Array.from(selectedIds),
                estado: bulkEstado,
            });
            qc.setQueryData(["pedidos-globales"], (old = []) =>
                old.map((g) => ({
                    ...g,
                    pedidos_automaticos: (g.pedidos_automaticos ?? []).map(
                        (p) => data.find((d) => d.id === p.id) ?? p,
                    ),
                })),
            );
            qc.invalidateQueries({ queryKey: ["pedidos-automaticos"] });
            if (bulkEstado === "Devolución") {
                qc.invalidateQueries({
                    queryKey: ["inventario-dotacion-flat"],
                });
                qc.invalidateQueries({ queryKey: ["inventario_dotacion"] });
            }
            setSelectedIds(new Set());
        } catch (e) {
            setBulkError(
                e?.response?.data?.message ?? "Error al actualizar el estado.",
            );
        } finally {
            setBulkSaving(false);
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {/* Stats */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Pedidos globales</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#0d6e5a" }}>
                        {stats.totalPedidos}
                    </div>
                    <div className="stat-label">Pedidos completados</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#1a5fa8" }}>
                        {stats.totalPrendas}
                    </div>
                    <div className="stat-label">Prendas entregadas</div>
                </div>
            </div>

            {/* Toolbar */}
            <div style={S.toolbar}>
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}>
                        <IconSearch size={15} />
                    </span>
                    <input
                        style={S.searchInput}
                        placeholder="Buscar código, fecha…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPagina(1);
                        }}
                    />
                </div>
                <select
                    style={S.selectFilter}
                    value={filtroEstado}
                    onChange={(e) => {
                        setFiltroEstado(e.target.value);
                        setPagina(1);
                    }}
                >
                    <option value="Todos">Todos los estados</option>
                    <option value="En proceso">En proceso</option>
                    <option value="Pedido confirmado">Pedido confirmado</option>
                    <option value="Completado">Completado</option>
                </select>
                <button
                    style={S.btnSecondary}
                    onClick={handleExport}
                    disabled={filtered.length === 0}
                >
                    Exportar Excel
                </button>
                <button
                    style={S.btnSecondary}
                    onClick={() => setImportOpen(true)}
                >
                    Importar Excel
                </button>
            </div>

            {selectedIds.size > 0 && (
                <div style={S.bulkBar}>
                    <span style={{ fontWeight: 700, fontSize: "0.86rem" }}>
                        {selectedIds.size} pedido
                        {selectedIds.size !== 1 ? "s" : ""} seleccionado
                        {selectedIds.size !== 1 ? "s" : ""}
                    </span>
                    <select
                        style={S.selectFilter}
                        value={bulkEstado}
                        onChange={(e) => setBulkEstado(e.target.value)}
                        disabled={bulkSaving}
                    >
                        <option value="Activo">En proceso</option>
                        <option value="Enviar a compras">Enviar a compras</option>
                        <option value="Devolución">Devolución</option>
                        <option value="Devolución usada">
                            Devolución usada
                        </option>
                    </select>
                    <button
                        style={{
                            ...S.btnPrimary,
                            opacity: bulkSaving ? 0.6 : 1,
                        }}
                        onClick={handleBulkApply}
                        disabled={bulkSaving}
                    >
                        {bulkSaving ? "Aplicando…" : "Aplicar"}
                    </button>
                    <button
                        style={S.btnSecondary}
                        onClick={() => setSelectedIds(new Set())}
                        disabled={bulkSaving}
                    >
                        Cancelar selección
                    </button>
                    {bulkError && (
                        <span
                            style={{
                                color: "#c0392b",
                                fontWeight: 600,
                                fontSize: "0.82rem",
                            }}
                        >
                            {bulkError}
                        </span>
                    )}
                </div>
            )}

            {/* Tabla */}
            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}>
                        <IconLoading size={32} />
                        <p>Cargando pedidos globales…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p>No se encontraron pedidos globales.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 32 }}></th>
                                <th style={{ width: 32 }}></th>
                                <th>Código</th>
                                <th>Regional</th>
                                <th>Fecha</th>
                                <th>Fecha de corte</th>
                                <th>Fecha de entrega</th>
                                <th style={{ textAlign: "center" }}>Pedidos</th>
                                <th style={{ textAlign: "center" }}>Prendas</th>
                                <th>Cronograma</th>
                                <th>Notas</th>
                                <th style={{ width: 80 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((g) => {
                                const isOpen = expanded === g.id;
                                const pedidos = (
                                    g.pedidos_automaticos ?? []
                                ).filter((p) => p.codigo);
                                const prendas = pedidos.reduce(
                                    (s, p) =>
                                        s +
                                        (p.items ?? []).reduce(
                                            (ss, it) => ss + it.cantidad,
                                            0,
                                        ),
                                    0,
                                );
                                const qSub = subSearch.trim().toLowerCase();
                                const pedidosVisibles = !qSub
                                    ? pedidos
                                    : pedidos.filter((p) => {
                                          const nombre =
                                              `${p.empleado?.nombres ?? ""} ${p.empleado?.apellidos ?? ""}`.toLowerCase();
                                          const cedula = String(
                                              p.empleado?.cedula ?? "",
                                          ).toLowerCase();
                                          const codigo = String(
                                              p.codigo ?? "",
                                          ).toLowerCase();
                                          return (
                                              nombre.includes(qSub) ||
                                              cedula.includes(qSub) ||
                                              codigo.includes(qSub)
                                          );
                                      });
                                const cronInfo = getCronogramaInfo(
                                    g,
                                    pedidos,
                                    cronogramas,
                                );
                                const pedidoIds = pedidos.map((p) => p.id);
                                const allSelected =
                                    pedidoIds.length > 0 &&
                                    pedidoIds.every((id) =>
                                        selectedIds.has(id),
                                    );
                                const someSelected =
                                    !allSelected &&
                                    pedidoIds.some((id) => selectedIds.has(id));

                                return (
                                    <React.Fragment key={g.id}>
                                        <tr
                                            style={{
                                                cursor:
                                                    pedidos.length > 0
                                                        ? "pointer"
                                                        : "default",
                                                background: isOpen
                                                    ? "#f0f9f7"
                                                    : undefined,
                                            }}
                                            onClick={() =>
                                                pedidos.length > 0 &&
                                                toggle(g.id)
                                            }
                                        >
                                            <td
                                                style={{ textAlign: "center" }}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                {pedidoIds.length > 0 && (
                                                    <input
                                                        type="checkbox"
                                                        checked={allSelected}
                                                        ref={(el) => {
                                                            if (el)
                                                                el.indeterminate =
                                                                    someSelected;
                                                        }}
                                                        onChange={(e) =>
                                                            toggleGlobal(
                                                                pedidoIds,
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                    />
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    textAlign: "center",
                                                    color: "var(--primary)",
                                                    fontWeight: 800,
                                                    fontSize: "1rem",
                                                }}
                                            >
                                                {pedidos.length > 0
                                                    ? isOpen
                                                        ? "▾"
                                                        : "▸"
                                                    : ""}
                                            </td>
                                            <td>
                                                <span
                                                    style={{
                                                        fontFamily: "monospace",
                                                        fontWeight: 800,
                                                        fontSize: "0.95rem",
                                                    }}
                                                >
                                                    #{g.codigo}
                                                </span>
                                            </td>
                                            <td>{g.regional?.nombre ?? "—"}</td>
                                            <td>
                                                {g.fecha
                                                    ? fmtDateCron(
                                                          parseDateLocal(
                                                              g.fecha,
                                                          ),
                                                      )
                                                    : "—"}
                                            </td>
                                            <td style={{ fontSize: "0.84rem" }}>
                                                {cronInfo.length === 0 ? (
                                                    <span
                                                        style={{
                                                            color: "var(--text-muted)",
                                                        }}
                                                    >
                                                        —
                                                    </span>
                                                ) : (
                                                    cronInfo.map(
                                                        ({
                                                            proyecto,
                                                            cron,
                                                            corte,
                                                        }) => (
                                                            <div
                                                                key={proyecto}
                                                                title={proyecto}
                                                            >
                                                                {cron ? (
                                                                    fmtDateCron(
                                                                        corte,
                                                                    )
                                                                ) : (
                                                                    <span
                                                                        style={{
                                                                            color: "var(--text-muted)",
                                                                        }}
                                                                    >
                                                                        —
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ),
                                                    )
                                                )}
                                            </td>
                                            <td style={{ fontSize: "0.84rem" }}>
                                                {cronInfo.length === 0 ? (
                                                    <span
                                                        style={{
                                                            color: "var(--text-muted)",
                                                        }}
                                                    >
                                                        —
                                                    </span>
                                                ) : (
                                                    cronInfo.map(
                                                        ({
                                                            proyecto,
                                                            cron,
                                                            entrega,
                                                        }) => (
                                                            <div
                                                                key={proyecto}
                                                                title={proyecto}
                                                            >
                                                                {cron ? (
                                                                    fmtDateCron(
                                                                        entrega,
                                                                    )
                                                                ) : (
                                                                    <span
                                                                        style={{
                                                                            color: "var(--text-muted)",
                                                                        }}
                                                                    >
                                                                        —
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ),
                                                    )
                                                )}
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <span
                                                    style={S.badge(
                                                        "#e0f7f4",
                                                        "#0d6e5a",
                                                    )}
                                                >
                                                    {pedidos.length} pedido
                                                    {pedidos.length !== 1
                                                        ? "s"
                                                        : ""}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <span
                                                    style={S.badge(
                                                        "#e8f0ff",
                                                        "#1a4fa8",
                                                    )}
                                                >
                                                    {prendas} prenda
                                                    {prendas !== 1 ? "s" : ""}
                                                </span>
                                            </td>
                                            <td>
                                                {(() => {
                                                    if (cronInfo.length === 0) {
                                                        return (
                                                            <span
                                                                style={{
                                                                    color: "var(--text-muted)",
                                                                }}
                                                            >
                                                                —
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                flexDirection:
                                                                    "column",
                                                                gap: 3,
                                                            }}
                                                        >
                                                            {cronInfo.map(
                                                                ({
                                                                    proyecto,
                                                                    cron,
                                                                    corte,
                                                                    entrega,
                                                                    matches,
                                                                }) => (
                                                                    <span
                                                                        key={
                                                                            proyecto
                                                                        }
                                                                        title={
                                                                            cron
                                                                                ? matches
                                                                                    ? `Generado a tiempo · Corte: ${fmtDateCron(corte)}`
                                                                                    : `Se generó después del corte (${fmtDateCron(corte)}) · Entrega: ${fmtDateCron(entrega)}`
                                                                                : "Sin cronograma configurado para este proyecto"
                                                                        }
                                                                        style={S.badge(
                                                                            !cron
                                                                                ? "#f1f5f9"
                                                                                : matches
                                                                                  ? "#dcfce7"
                                                                                  : "#fef3c7",
                                                                            !cron
                                                                                ? "#475569"
                                                                                : matches
                                                                                  ? "#0d6e5a"
                                                                                  : "#92400e",
                                                                        )}
                                                                    >
                                                                        {
                                                                            proyecto
                                                                        }{" "}
                                                                        {!cron
                                                                            ? "· sin cronograma"
                                                                            : matches
                                                                              ? "✓"
                                                                              : "⚠ pasó el corte"}
                                                                    </span>
                                                                ),
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td
                                                style={{
                                                    color: "var(--text-muted)",
                                                    fontSize: "0.84rem",
                                                }}
                                            >
                                                {g.notas ?? "—"}
                                            </td>
                                            <td
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 4,
                                                        justifyContent:
                                                            "center",
                                                    }}
                                                >
                                                    <button
                                                        style={S.actionBtn}
                                                        title="Editar"
                                                        onClick={() =>
                                                            setEditTarget(g)
                                                        }
                                                    >
                                                        <IconEdit size={14} />
                                                    </button>
                                                    {!g.confirmado && (
                                                        <button
                                                            style={{
                                                                ...S.actionBtn,
                                                                color: "#0d6e5a",
                                                            }}
                                                            title="Confirmar pedido"
                                                            onClick={() =>
                                                                setConfirmTarget(
                                                                    g,
                                                                )
                                                            }
                                                        >
                                                            <svg
                                                                width="14"
                                                                height="14"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {g.confirmado &&
                                                        !g.entrega_confirmada && (
                                                            <button
                                                                style={{
                                                                    ...S.actionBtn,
                                                                    color: "#1a4fa8",
                                                                }}
                                                                title="Confirmar entrega"
                                                                onClick={() =>
                                                                    setEntregaTarget(
                                                                        g,
                                                                    )
                                                                }
                                                            >
                                                                <svg
                                                                    width="14"
                                                                    height="14"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2.5"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                >
                                                                    <rect
                                                                        x="2.5"
                                                                        y="8"
                                                                        width="12"
                                                                        height="8"
                                                                        rx="1"
                                                                    />
                                                                    <path d="M14.5 11h3l3 3v2h-6" />
                                                                    <circle
                                                                        cx="6.5"
                                                                        cy="18.5"
                                                                        r="1.4"
                                                                    />
                                                                    <circle
                                                                        cx="17"
                                                                        cy="18.5"
                                                                        r="1.4"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    {g.entrega_confirmada && (
                                                        <span
                                                            title="Entrega confirmada"
                                                            style={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                color: "#0d6e5a",
                                                                padding:
                                                                    "0 4px",
                                                            }}
                                                        >
                                                            <svg
                                                                width="14"
                                                                height="14"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                    <button
                                                        style={{
                                                            ...S.actionBtn,
                                                            color: "#c0392b",
                                                        }}
                                                        title="Eliminar"
                                                        onClick={() =>
                                                            setDeleteTarget(g)
                                                        }
                                                    >
                                                        <IconTrash size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {isOpen && (
                                            <tr>
                                                <td
                                                    colSpan={12}
                                                    style={{
                                                        padding: 0,
                                                        background: "#f8fffe",
                                                        borderBottom:
                                                            "2px solid var(--primary)",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            padding:
                                                                "16px 28px 20px",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                justifyContent:
                                                                    "space-between",
                                                                gap: 12,
                                                                marginBottom: 12,
                                                                flexWrap:
                                                                    "wrap",
                                                            }}
                                                        >
                                                            <p
                                                                style={{
                                                                    fontWeight: 700,
                                                                    color: "var(--primary)",
                                                                    fontSize:
                                                                        "0.85rem",
                                                                    margin: 0,
                                                                }}
                                                            >
                                                                Pedidos
                                                                incluidos en #
                                                                {g.codigo}
                                                            </p>
                                                            {pedidos.length >
                                                                1 && (
                                                                <div
                                                                    style={{
                                                                        position:
                                                                            "relative",
                                                                        width: 220,
                                                                    }}
                                                                    onClick={(
                                                                        e,
                                                                    ) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                >
                                                                    <span
                                                                        style={{
                                                                            position:
                                                                                "absolute",
                                                                            left: 9,
                                                                            top: "50%",
                                                                            transform:
                                                                                "translateY(-50%)",
                                                                            color: "var(--text-muted)",
                                                                        }}
                                                                    >
                                                                        <IconSearch
                                                                            size={
                                                                                13
                                                                            }
                                                                        />
                                                                    </span>
                                                                    <input
                                                                        style={{
                                                                            width: "100%",
                                                                            padding:
                                                                                "6px 10px 6px 28px",
                                                                            border: "1.5px solid var(--border)",
                                                                            borderRadius:
                                                                                "var(--radius-sm)",
                                                                            fontSize:
                                                                                "0.8rem",
                                                                            fontFamily:
                                                                                "Nunito,sans-serif",
                                                                            outline:
                                                                                "none",
                                                                        }}
                                                                        placeholder="Buscar nombre, cédula, # pedido…"
                                                                        value={
                                                                            subSearch
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setSubSearch(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <table
                                                            style={{
                                                                width: "100%",
                                                                borderCollapse:
                                                                    "collapse",
                                                                fontSize:
                                                                    "0.84rem",
                                                            }}
                                                        >
                                                            <thead>
                                                                <tr
                                                                    style={{
                                                                        borderBottom:
                                                                            "1.5px solid var(--border)",
                                                                    }}
                                                                >
                                                                    <th
                                                                        style={{
                                                                            ...S.thInner,
                                                                            width: 30,
                                                                        }}
                                                                    ></th>
                                                                    <th
                                                                        style={
                                                                            S.thInner
                                                                        }
                                                                    >
                                                                        Código
                                                                    </th>
                                                                    <th
                                                                        style={
                                                                            S.thInner
                                                                        }
                                                                    >
                                                                        Empleado
                                                                    </th>
                                                                    <th
                                                                        style={
                                                                            S.thInner
                                                                        }
                                                                    >
                                                                        Cédula
                                                                    </th>
                                                                    <th
                                                                        style={{
                                                                            ...S.thInner,
                                                                            textAlign:
                                                                                "center",
                                                                        }}
                                                                    >
                                                                        Items
                                                                    </th>
                                                                    <th
                                                                        style={
                                                                            S.thInner
                                                                        }
                                                                    >
                                                                        Prendas
                                                                        asignadas
                                                                    </th>
                                                                    <th
                                                                        style={{
                                                                            ...S.thInner,
                                                                            textAlign:
                                                                                "center",
                                                                        }}
                                                                    >
                                                                        Estado
                                                                    </th>
                                                                    <th
                                                                        style={{
                                                                            width: 40,
                                                                        }}
                                                                    ></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {pedidosVisibles.length ===
                                                                    0 && (
                                                                    <tr>
                                                                        <td
                                                                            colSpan={
                                                                                8
                                                                            }
                                                                            style={{
                                                                                ...S.tdInner,
                                                                                textAlign:
                                                                                    "center",
                                                                                color: "var(--text-muted)",
                                                                                padding:
                                                                                    "14px 0",
                                                                            }}
                                                                        >
                                                                            Sin
                                                                            resultados
                                                                            para
                                                                            "
                                                                            {
                                                                                subSearch
                                                                            }
                                                                            "
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                                {pedidosVisibles.map(
                                                                    (p) => {
                                                                        const est =
                                                                            estadoDisplay(
                                                                                p,
                                                                                g,
                                                                            );
                                                                        return (
                                                                            <tr
                                                                                key={
                                                                                    p.id
                                                                                }
                                                                                style={{
                                                                                    borderBottom:
                                                                                        "1px solid var(--border)",
                                                                                }}
                                                                            >
                                                                                <td
                                                                                    style={
                                                                                        S.tdInner
                                                                                    }
                                                                                >
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={selectedIds.has(
                                                                                            p.id,
                                                                                        )}
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            togglePedido(
                                                                                                p.id,
                                                                                                e
                                                                                                    .target
                                                                                                    .checked,
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                </td>
                                                                                <td
                                                                                    style={
                                                                                        S.tdInner
                                                                                    }
                                                                                >
                                                                                    <span
                                                                                        style={{
                                                                                            fontFamily:
                                                                                                "monospace",
                                                                                            fontWeight: 700,
                                                                                        }}
                                                                                    >
                                                                                        #
                                                                                        {
                                                                                            p.codigo
                                                                                        }
                                                                                    </span>
                                                                                </td>
                                                                                <td
                                                                                    style={
                                                                                        S.tdInner
                                                                                    }
                                                                                >
                                                                                    <div
                                                                                        style={{
                                                                                            display:
                                                                                                "flex",
                                                                                            alignItems:
                                                                                                "center",
                                                                                            gap: 8,
                                                                                        }}
                                                                                    >
                                                                                        <div
                                                                                            style={
                                                                                                S.avatarSm
                                                                                            }
                                                                                        >
                                                                                            {(
                                                                                                p
                                                                                                    .empleado
                                                                                                    ?.nombres ||
                                                                                                "?"
                                                                                            )
                                                                                                .charAt(
                                                                                                    0,
                                                                                                )
                                                                                                .toUpperCase()}
                                                                                            {p
                                                                                                .empleado
                                                                                                ?.fotografia && (
                                                                                                <img
                                                                                                    src={`/storage/${p.empleado.fotografia}`}
                                                                                                    alt=""
                                                                                                    style={{
                                                                                                        position:
                                                                                                            "absolute",
                                                                                                        inset: 0,
                                                                                                        width: "100%",
                                                                                                        height: "100%",
                                                                                                        objectFit:
                                                                                                            "cover",
                                                                                                        borderRadius:
                                                                                                            "50%",
                                                                                                    }}
                                                                                                    onError={(
                                                                                                        e,
                                                                                                    ) => {
                                                                                                        e.currentTarget.style.display =
                                                                                                            "none";
                                                                                                    }}
                                                                                                />
                                                                                            )}
                                                                                        </div>
                                                                                        {
                                                                                            p
                                                                                                .empleado
                                                                                                ?.nombres
                                                                                        }{" "}
                                                                                        {
                                                                                            p
                                                                                                .empleado
                                                                                                ?.apellidos
                                                                                        }
                                                                                    </div>
                                                                                </td>
                                                                                <td
                                                                                    style={
                                                                                        S.tdInner
                                                                                    }
                                                                                >
                                                                                    {p
                                                                                        .empleado
                                                                                        ?.cedula ??
                                                                                        "—"}
                                                                                </td>
                                                                                <td
                                                                                    style={{
                                                                                        ...S.tdInner,
                                                                                        textAlign:
                                                                                            "center",
                                                                                    }}
                                                                                >
                                                                                    {
                                                                                        (
                                                                                            p.items ??
                                                                                            []
                                                                                        )
                                                                                            .length
                                                                                    }
                                                                                </td>
                                                                                <td
                                                                                    style={
                                                                                        S.tdInner
                                                                                    }
                                                                                >
                                                                                    <div
                                                                                        style={{
                                                                                            display:
                                                                                                "flex",
                                                                                            flexWrap:
                                                                                                "wrap",
                                                                                            gap: 4,
                                                                                        }}
                                                                                    >
                                                                                        {(
                                                                                            p.items ??
                                                                                            []
                                                                                        ).map(
                                                                                            (
                                                                                                it,
                                                                                                idx,
                                                                                            ) => (
                                                                                                <span
                                                                                                    key={
                                                                                                        idx
                                                                                                    }
                                                                                                    style={S.badge(
                                                                                                        "#f0f0f0",
                                                                                                        "#444",
                                                                                                    )}
                                                                                                >
                                                                                                    {
                                                                                                        it
                                                                                                            .inventario
                                                                                                            ?.prenda
                                                                                                    }{" "}
                                                                                                    T:
                                                                                                    {
                                                                                                        it
                                                                                                            .inventario
                                                                                                            ?.talla
                                                                                                    }{" "}
                                                                                                    ×
                                                                                                    {
                                                                                                        it.cantidad
                                                                                                    }
                                                                                                </span>
                                                                                            ),
                                                                                        )}
                                                                                        {(
                                                                                            p.items ??
                                                                                            []
                                                                                        )
                                                                                            .length ===
                                                                                            0 && (
                                                                                            <span
                                                                                                style={{
                                                                                                    color: "var(--text-muted)",
                                                                                                }}
                                                                                            >
                                                                                                Sin
                                                                                                items
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td
                                                                                    style={{
                                                                                        ...S.tdInner,
                                                                                        textAlign:
                                                                                            "center",
                                                                                    }}
                                                                                >
                                                                                    <span
                                                                                        style={{
                                                                                            padding:
                                                                                                "3px 10px",
                                                                                            borderRadius: 20,
                                                                                            fontWeight: 700,
                                                                                            fontSize:
                                                                                                "0.76rem",
                                                                                            background:
                                                                                                est.bg,
                                                                                            color: est.color,
                                                                                            whiteSpace:
                                                                                                "nowrap",
                                                                                        }}
                                                                                    >
                                                                                        {
                                                                                            est.label
                                                                                        }
                                                                                    </span>
                                                                                </td>
                                                                                <td
                                                                                    style={{
                                                                                        ...S.tdInner,
                                                                                        textAlign:
                                                                                            "center",
                                                                                    }}
                                                                                    onClick={(
                                                                                        e,
                                                                                    ) =>
                                                                                        e.stopPropagation()
                                                                                    }
                                                                                >
                                                                                    <button
                                                                                        style={{
                                                                                            ...S.actionBtn,
                                                                                            width: 26,
                                                                                            height: 26,
                                                                                        }}
                                                                                        title="Ver / Devolver"
                                                                                        onClick={() =>
                                                                                            setEditPedido(
                                                                                                {
                                                                                                    pedido: p,
                                                                                                    global: g,
                                                                                                },
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <IconEdit
                                                                                            size={
                                                                                                13
                                                                                            }
                                                                                        />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    },
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
            {!isLoading && filtered.length > POR_PAGINA && (
                <div style={S.paginationBar}>
                    <span style={S.paginationInfo}>
                        Mostrando {(pagina - 1) * POR_PAGINA + 1}–
                        {Math.min(pagina * POR_PAGINA, filtered.length)} de{" "}
                        {filtered.length} globales
                    </span>
                    <div style={S.paginationBtns}>
                        <button
                            style={S.pageBtn(pagina === 1, false)}
                            disabled={pagina === 1}
                            onClick={() => setPagina((p) => p - 1)}
                        >
                            ‹
                        </button>
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                            .filter(
                                (p) =>
                                    p === 1 ||
                                    p === totalPaginas ||
                                    Math.abs(p - pagina) <= 1,
                            )
                            .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1)
                                    acc.push("…");
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((item, idx) =>
                                item === "…" ? (
                                    <span
                                        key={`e${idx}`}
                                        style={{
                                            padding: "0 4px",
                                            color: "var(--text-muted)",
                                            fontWeight: 700,
                                        }}
                                    >
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={item}
                                        style={S.pageBtn(
                                            false,
                                            item === pagina,
                                        )}
                                        onClick={() => setPagina(item)}
                                    >
                                        {item}
                                    </button>
                                ),
                            )}
                        <button
                            style={S.pageBtn(pagina === totalPaginas, false)}
                            disabled={pagina === totalPaginas}
                            onClick={() => setPagina((p) => p + 1)}
                        >
                            ›
                        </button>
                    </div>
                </div>
            )}

            {/* Modales */}
            {editTarget && (
                <EditModal
                    global={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={handleSaved}
                />
            )}
            {deleteTarget && (
                <DeleteModal
                    global={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={handleDeleted}
                />
            )}
            {confirmTarget && (
                <ConfirmModal
                    global={confirmTarget}
                    cronogramas={cronogramas}
                    onClose={() => setConfirmTarget(null)}
                    onConfirmed={handleConfirmed}
                />
            )}
            {entregaTarget && (
                <EntregaModal
                    global={entregaTarget}
                    cronogramas={cronogramas}
                    onClose={() => setEntregaTarget(null)}
                    onConfirmed={handleEntregaConfirmed}
                />
            )}
            {editPedido && (
                <PedidoIncluidoModal
                    pedido={editPedido.pedido}
                    global={editPedido.global}
                    onClose={() => setEditPedido(null)}
                    onDevuelto={handleDevuelto}
                />
            )}
            {importOpen && (
                <ImportPedidosGlobalesModal
                    onClose={() => setImportOpen(false)}
                    onImported={() => {
                        qc.invalidateQueries({
                            queryKey: ["pedidos-globales"],
                        });
                        qc.invalidateQueries({
                            queryKey: ["pedidos-automaticos"],
                        });
                        qc.invalidateQueries({
                            queryKey: ["inventario-dotacion-flat"],
                        });
                        qc.invalidateQueries({
                            queryKey: ["inventario_dotacion"],
                        });
                    }}
                    empleados={empleados}
                    contratos={contratos}
                    inventarioFlat={inventarioFlat}
                    regionales={regionales}
                />
            )}
        </div>
    );
}

const S = {
    toolbar: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 20,
    },
    selectFilter: {
        padding: "8px 12px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
        fontFamily: "Nunito,sans-serif",
        background: "var(--white)",
        color: "var(--text)",
        cursor: "pointer",
        outline: "none",
    },
    bulkBar: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        marginBottom: 16,
        background: "#f0f9f7",
        border: "1.5px solid var(--primary)",
        borderRadius: "var(--radius-sm)",
        flexWrap: "wrap",
    },
    searchWrap: { position: "relative", flex: 1, maxWidth: 360 },
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
    tableWrap: {
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        overflowX: "auto",
    },
    empty: {
        padding: "60px 20px",
        textAlign: "center",
        color: "var(--text-muted)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
    },
    badge: (bg, color) => ({
        background: bg,
        color,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: "0.76rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        display: "inline-block",
    }),
    thInner: {
        padding: "8px 12px",
        textAlign: "left",
        fontWeight: 700,
        fontSize: "0.78rem",
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
    },
    tdInner: { padding: "9px 12px", verticalAlign: "middle" },
    avatarSm: {
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: "var(--primary)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: "0.78rem",
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
    },
    paginationBar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 4px",
        flexWrap: "wrap",
        gap: 10,
    },
    paginationInfo: {
        fontSize: "0.84rem",
        color: "var(--text-muted)",
        fontWeight: 600,
    },
    paginationBtns: { display: "flex", alignItems: "center", gap: 4 },
    pageBtn: (disabled, active) => ({
        minWidth: 32,
        height: 32,
        padding: "0 8px",
        border: active ? "none" : "1.5px solid var(--border)",
        borderRadius: 6,
        background: active
            ? "var(--primary)"
            : disabled
              ? "var(--bg)"
              : "var(--white)",
        color: active ? "#fff" : disabled ? "var(--text-muted)" : "var(--text)",
        fontWeight: 700,
        fontSize: "0.88rem",
        cursor: disabled ? "default" : "pointer",
        fontFamily: "Nunito,sans-serif",
        opacity: disabled ? 0.5 : 1,
    }),
    actionBtn: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        border: "1.5px solid var(--border)",
        borderRadius: 6,
        background: "var(--white)",
        color: "var(--primary)",
        cursor: "pointer",
        padding: 0,
    },
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    modal: {
        background: "var(--white)",
        borderRadius: "var(--radius)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        width: "100%",
        maxWidth: 480,
        fontFamily: "Nunito,sans-serif",
    },
    modalHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 22px 14px",
        borderBottom: "1.5px solid var(--border)",
    },
    modalBody: {
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
    },
    modalFooter: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        padding: "14px 22px 18px",
        borderTop: "1.5px solid var(--border)",
    },
    label: {
        fontSize: "0.82rem",
        fontWeight: 700,
        color: "var(--text-muted)",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
    },
    input: {
        padding: "9px 12px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontFamily: "Nunito,sans-serif",
        background: "var(--white)",
        color: "var(--text)",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
    },
    btnPrimary: {
        padding: "9px 20px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontWeight: 700,
        fontSize: "0.88rem",
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
    },
    btnSecondary: {
        padding: "9px 20px",
        background: "var(--white)",
        color: "var(--text)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontWeight: 700,
        fontSize: "0.88rem",
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
    },
    btnIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: "var(--text-muted)",
        borderRadius: 6,
    },
    errorMsg: {
        background: "#fce8e8",
        color: "#c0392b",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: "0.84rem",
        fontWeight: 600,
    },
    fileDrop: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "22px 16px",
        border: "1.5px dashed var(--primary)",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg)",
        color: "var(--primary)",
        cursor: "pointer",
        marginTop: 4,
        textAlign: "center",
    },
};
