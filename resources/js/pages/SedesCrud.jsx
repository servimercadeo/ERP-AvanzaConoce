import React, { useState, useMemo, useEffect } from "react";
import api from "../api/axios";
import {
    IconSearch,
    IconEye,
    IconEdit,
    IconTrash,
    IconClose,
    IconEmptySearch,
    IconLoading,
} from "../components/Icons";

const POR_PAGINA = 10;

const EMPTY_FORM = {
    nombre: "",
    direccion: "",
    codigo_distribuidor: "",
    sub_canal: "",
    estado: "Activa",
    codigo_instalador: "",
    telefono: "",
    departamento: "",
    id_ciudad: "",
    tipo_sede: "Principal",
    id_sede_padre: "",
    id_almacenista_mac: "",
    id_secretaria_mac: "",
    id_jefe_mac: "",
};

function Field({
    label,
    k,
    type = "text",
    opts,
    req,
    span,
    form,
    errors,
    onChange,
    disabled,
    uppercase,
}) {
    const style = {
        ...S.formGroup,
        ...(span ? { gridColumn: `span ${span}` } : {}),
    };
    const isObjOpts = opts && opts.length > 0 && typeof opts[0] === "object";
    const disabledStyle = disabled
        ? {
              background: "var(--bg)",
              cursor: "default",
              color: "var(--text-muted)",
          }
        : {};
    const uppercaseStyle = uppercase ? { textTransform: "uppercase" } : {};

    const handleChange = (key) => (e) => {
        let val = e.target.value;
        if (uppercase) val = val.toUpperCase();
        onChange(key)(e);
    };

    return (
        <div style={style}>
            <label style={S.label}>
                {label}
                {req && !disabled ? " *" : ""}
            </label>
            {opts ? (
                <select
                    style={{
                        ...S.input,
                        ...(errors[k] ? S.inputErr : {}),
                        ...disabledStyle,
                    }}
                    value={form[k] ?? ""}
                    onChange={onChange(k)}
                    disabled={disabled}
                >
                    <option value="">Elige</option>
                    {isObjOpts
                        ? opts.map((o) => (
                              <option key={o.value} value={o.value}>
                                  {o.label}
                              </option>
                          ))
                        : opts.map((o) => (
                              <option key={o} value={o}>
                                  {o}
                              </option>
                          ))}
                </select>
            ) : (
                <input
                    style={{
                        ...S.input,
                        ...(errors[k] ? S.inputErr : {}),
                        ...disabledStyle,
                        ...uppercaseStyle,
                    }}
                    type={type}
                    value={form[k] ?? ""}
                    onChange={handleChange(k)}
                    disabled={disabled}
                />
            )}
            {errors[k] && <span style={S.err}>{errors[k]}</span>}
        </div>
    );
}

function Modal({
    open,
    onClose,
    onSave,
    initial,
    title,
    options,
    readOnly = false,
}) {
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setForm({
                ...initial,
                departamento: initial.id_ciudad
                    ? options.ciudades.find((c) => c.id == initial.id_ciudad)
                          ?.id_departamento || ""
                    : "",
            });
            setErrors({});
            setSaving(false);
        }
    }, [initial, open, options.ciudades]);

    const onChange = (k) => (e) => {
        setForm((f) => {
            const updated = { ...f, [k]: e.target.value };
            if (k === "departamento") updated.id_ciudad = "";
            return updated;
        });
    };

    const validate = () => {
        const e = {};
        if (!form.nombre?.trim()) e.nombre = "Requerido";
        if (!form.id_ciudad) e.id_ciudad = "Requerido";
        if (!form.tipo_sede) e.tipo_sede = "Requerido";
        if (!form.estado) e.estado = "Requerido";
        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length) {
            setErrors(e);
            return;
        }
        setSaving(true);
        try {
            await onSave({
                ...form,
                id_ciudad: form.id_ciudad || null,
                id_sede_padre: form.id_sede_padre || 0,
                id_almacenista_mac: form.id_almacenista_mac || 0,
                id_secretaria_mac: form.id_secretaria_mac || 0,
                id_jefe_mac: form.id_jefe_mac || 0,
            });
        } catch {
            // handled in parent
        } finally {
            setSaving(false);
        }
    };

    const departamentos = useMemo(() => {
        const deps = new Set(
            options.ciudades.map((c) => c.id_departamento).filter(Boolean),
        );
        return Array.from(deps).map((d) => ({
            value: d,
            label: `Departamento ${d}`,
        }));
    }, [options.ciudades]);

    if (!open) return null;

    const fp = { form, errors, onChange, disabled: readOnly };

    const ciudadesFiltradas = form.departamento
        ? options.ciudades.filter((c) => c.id_departamento == form.departamento)
        : options.ciudades;

    return (
        <div style={S.overlay} onClick={onClose}>
            <div
                style={{ ...S.modal, maxWidth: 960 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={S.modalHeaderGreen}>
                    <span style={S.modalTitleWhite}>{title}</span>
                    <button style={S.closeBtnWhite} onClick={onClose}>
                        <IconClose size={14} />
                    </button>
                </div>

                <div style={S.modalBody}>
                    <div style={S.grid3}>
                        {/* Left Column */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 16,
                            }}
                        >
                            <Field
                                label="Nombre"
                                k="nombre"
                                req
                                uppercase
                                {...fp}
                            />
                            <Field
                                label="Codigo Distribuidor"
                                k="codigo_distribuidor"
                                uppercase
                                {...fp}
                            />
                            <Field label="Teléfonos" k="telefono" {...fp} />
                            <Field
                                label="Departamento"
                                k="departamento"
                                opts={
                                    departamentos.length > 0
                                        ? departamentos
                                        : [
                                              {
                                                  value: "1",
                                                  label: "Sin Departamentos",
                                              },
                                          ]
                                }
                                {...fp}
                            />
                            <Field
                                label="Usuario Almacenista"
                                k="id_almacenista_mac"
                                opts={options.users}
                                {...fp}
                            />
                        </div>

                        {/* Middle Column */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 16,
                            }}
                        >
                            <div style={{ visibility: "hidden" }}>
                                <Field label="Spacer" k="spacer" {...fp} />
                            </div>
                            <Field
                                label="Subcanal"
                                k="sub_canal"
                                opts={options.subcanales}
                                {...fp}
                            />
                            <Field
                                label="Estado"
                                k="estado"
                                opts={options.estados}
                                req
                                {...fp}
                            />
                            <Field
                                label="Ciudad"
                                k="id_ciudad"
                                opts={ciudadesFiltradas.map((c) => ({
                                    value: c.id,
                                    label: c.nombre,
                                }))}
                                req
                                {...fp}
                            />
                            <Field
                                label="Usuario Secretaria"
                                k="id_secretaria_mac"
                                opts={options.users}
                                {...fp}
                            />
                        </div>

                        {/* Right Column */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 16,
                            }}
                        >
                            <Field
                                label="Dirección"
                                k="direccion"
                                uppercase
                                {...fp}
                            />
                            <Field
                                label="Código C.I"
                                k="codigo_instalador"
                                uppercase
                                {...fp}
                            />
                            <Field
                                label="Tipo sede"
                                k="tipo_sede"
                                opts={options.tipos_sede}
                                req
                                {...fp}
                            />
                            <Field
                                label="Sede padre"
                                k="id_sede_padre"
                                opts={options.sedes.map((s) => ({
                                    value: s.id,
                                    label: s.nombre,
                                }))}
                                {...fp}
                            />
                            <Field
                                label="Usuario Jefe Oficina"
                                k="id_jefe_mac"
                                opts={options.users}
                                {...fp}
                            />
                        </div>
                    </div>
                </div>

                <div style={S.modalFooter}>
                    {readOnly ? (
                        <button style={S.btnSecondary} onClick={onClose}>
                            Cerrar
                        </button>
                    ) : (
                        <>
                            <button
                                style={S.btnSecondary}
                                onClick={onClose}
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button
                                style={{
                                    ...S.btnPrimaryGreen,
                                    opacity: saving ? 0.6 : 1,
                                }}
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? "Guardando…" : "Guardar"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function getPaginasBotones(pagina, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const delta = 2;
    const left = pagina - delta;
    const right = pagina + delta;
    const pages = [1];
    if (left > 2) pages.push("...");
    for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i++)
        pages.push(i);
    if (right < total - 1) pages.push("...");
    pages.push(total);
    return pages;
}

export default function SedesCrud() {
    const [sedes, setSedes] = useState([]);
    const [options, setOptions] = useState({
        users: [],
        ciudades: [],
        sedes: [],
        tipos_sede: [],
        estados: [],
        subcanales: [],
    });
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState("");
    const [filtroSede, setFiltroSede] = useState("Todas");
    const [filtroDepto, setFiltroDepto] = useState("Todos");
    const [filtroTipo, setFiltroTipo] = useState("Todos");
    const [filtroEstado, setFiltroEstado] = useState("Todas");
    const [filtroCiudad, setFiltroCiudad] = useState("Todas");

    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewTarget, setViewTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [pagina, setPagina] = useState(1);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resSedes, resOpts] = await Promise.all([
                api.get("/sedes"),
                api.get("/sedes/options"),
            ]);
            setSedes(resSedes.data);
            setOptions(resOpts.data);
        } catch (err) {
            console.error(err);
            showToast("Error cargando datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const filtered = useMemo(
        () =>
            sedes.filter((s) => {
                const q = search.toLowerCase();
                const matchQ =
                    (s.nombre || "").toLowerCase().includes(q) ||
                    (s.codigo_distribuidor || "").toLowerCase().includes(q);
                const matchSede =
                    filtroSede === "Todas" || String(s.id) === filtroSede;
                const matchDepto =
                    filtroDepto === "Todos" ||
                    String(s.id_departamento) === filtroDepto;
                const matchTipo =
                    filtroTipo === "Todos" || s.tipo_sede === filtroTipo;
                const matchEstado =
                    filtroEstado === "Todas" || s.estado === filtroEstado;
                const matchCiudad =
                    filtroCiudad === "Todas" ||
                    String(s.id_ciudad) === filtroCiudad;
                return (
                    matchQ &&
                    matchSede &&
                    matchDepto &&
                    matchTipo &&
                    matchEstado &&
                    matchCiudad
                );
            }),
        [
            sedes,
            search,
            filtroSede,
            filtroDepto,
            filtroTipo,
            filtroEstado,
            filtroCiudad,
        ],
    );

    useEffect(() => {
        setPagina(1);
    }, [
        search,
        filtroSede,
        filtroDepto,
        filtroTipo,
        filtroEstado,
        filtroCiudad,
    ]);

    const paginated = useMemo(
        () => filtered.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
        [filtered, pagina],
    );
    const totalPaginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));

    const stats = useMemo(
        () => ({
            total: sedes.length,
            principales: sedes.filter((s) => s.tipo_sede === "Principal")
                .length,
            activas: sedes.filter((s) => s.estado === "Activa").length,
        }),
        [sedes],
    );

    const handleSave = async (form) => {
        try {
            if (editTarget) {
                const { data } = await api.put(`/sedes/${editTarget.id}`, form);
                setSedes((prev) =>
                    prev.map((s) => (s.id === editTarget.id ? data : s)),
                );
                showToast("Sede actualizada.");
            } else {
                const { data } = await api.post("/sedes", form);
                setSedes((prev) => [data, ...prev]);
                showToast("Sede creada.");
            }
            setModalOpen(false);
        } catch (err) {
            showToast("Error al guardar la sede.");
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/sedes/${deleteTarget.id}`);
            setSedes((prev) => prev.filter((s) => s.id !== deleteTarget.id));
            showToast("Sede eliminada.");
        } catch {
            showToast("Error al eliminar.");
        }
        setDeleteTarget(null);
    };

    const clearFilters = () => {
        setFiltroSede("Todas");
        setFiltroDepto("Todos");
        setFiltroTipo("Todos");
        setFiltroEstado("Todas");
        setFiltroCiudad("Todas");
    };

    const departamentos = useMemo(() => {
        const deps = new Set(
            options.ciudades.map((c) => c.id_departamento).filter(Boolean),
        );
        return Array.from(deps).map((d) => ({
            value: String(d),
            label: `Departamento ${d}`,
        }));
    }, [options.ciudades]);

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Total Sedes</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#1a9b8c" }}>
                        {stats.principales}
                    </div>
                    <div className="stat-label">Sedes Principales</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num" style={{ color: "#27ae60" }}>
                        {stats.activas}
                    </div>
                    <div className="stat-label">Activas</div>
                </div>
            </div>

            <div style={S.toolbar}>
                <div style={S.filters}>
                    <div style={S.searchWrap}>
                        <span style={S.searchIcon}>
                            <IconSearch size={15} />
                        </span>
                        <input
                            style={S.searchInput}
                            placeholder="Buscar sede o código…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        style={S.filterBtn}
                        onClick={() => setFilterOpen(true)}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        Filtros
                    </button>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setEditTarget(null);
                        setModalOpen(true);
                    }}
                >
                    + Nueva sede
                </button>
            </div>

            <div style={S.tableWrap}>
                {loading ? (
                    <div style={S.empty}>
                        <IconLoading size={32} />
                        <p>Cargando sedes…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p>No se encontraron sedes.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 40, textAlign: "center" }}>
                                    item
                                </th>
                                <th>Ciudad</th>
                                <th>Nombre Sede</th>
                                <th>Dirección Sede</th>
                                <th>Teléfono</th>
                                <th>Tipo sede</th>
                                <th>Sede padre</th>
                                <th>Estado</th>
                                <th>Almacenista</th>
                                <th style={{ textAlign: "center" }}>
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((s, i) => (
                                <tr key={s.id}>
                                    <td
                                        style={{
                                            textAlign: "center",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        {(pagina - 1) * POR_PAGINA + i + 1}
                                    </td>
                                    <td>{s.ciudad_nombre || "—"}</td>
                                    <td
                                        style={{
                                            fontWeight: 700,
                                            color: "var(--primary-dark)",
                                        }}
                                    >
                                        {s.nombre}
                                    </td>
                                    <td style={{ fontSize: "0.85rem" }}>
                                        {s.direccion || "—"}
                                    </td>
                                    <td
                                        style={{
                                            fontFamily: "monospace",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        {s.telefono || "—"}
                                    </td>
                                    <td>
                                        <span
                                            style={S.badge(
                                                s.tipo_sede === "Principal"
                                                    ? "#e8f0ff"
                                                    : "#f5f5f5",
                                                s.tipo_sede === "Principal"
                                                    ? "#1a4fa8"
                                                    : "#555",
                                            )}
                                        >
                                            {s.tipo_sede}
                                        </span>
                                    </td>
                                    <td>{s.padre?.nombre || "—"}</td>
                                    <td>
                                        <span
                                            style={S.badge(
                                                s.estado === "Activa"
                                                    ? "#e0f7f4"
                                                    : "#fce8e8",
                                                s.estado === "Activa"
                                                    ? "#0d6e5a"
                                                    : "#a33",
                                            )}
                                        >
                                            {s.estado}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: "0.85rem" }}>
                                        {s.almacenista
                                            ? `${s.almacenista.nombres || ""} ${s.almacenista.apellidos || s.almacenista.name}`
                                            : "—"}
                                    </td>
                                    <td>
                                        <div style={S.actions}>
                                            <button
                                                style={S.actionBtn(
                                                    "#e8f0ff",
                                                    "#1a4fa8",
                                                )}
                                                onClick={() => {
                                                    setViewTarget(s);
                                                    setViewOpen(true);
                                                }}
                                            >
                                                <IconEye />
                                            </button>
                                            <button
                                                style={S.actionBtn(
                                                    "#e8f8f5",
                                                    "var(--primary-dark)",
                                                )}
                                                onClick={() => {
                                                    setEditTarget(s);
                                                    setModalOpen(true);
                                                }}
                                            >
                                                <IconEdit />
                                            </button>
                                            <button
                                                style={S.actionBtn(
                                                    "#fce8e8",
                                                    "#a33",
                                                )}
                                                onClick={() =>
                                                    setDeleteTarget(s)
                                                }
                                            >
                                                <IconTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && filtered.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 14,
                        flexWrap: "wrap",
                        gap: 10,
                    }}
                >
                    <span
                        style={{
                            color: "var(--text-muted)",
                            fontSize: "0.82rem",
                        }}
                    >
                        Página {pagina} · Mostrando{" "}
                        {Math.min(
                            POR_PAGINA,
                            filtered.length - (pagina - 1) * POR_PAGINA,
                        )}{" "}
                        de {filtered.length}
                        {filtered.length !== sedes.length
                            ? ` (filtrados de ${sedes.length})`
                            : " sedes"}
                    </span>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                        }}
                    >
                        <button
                            onClick={() => setPagina((p) => Math.max(1, p - 1))}
                            disabled={pagina === 1}
                            style={S.pageBtn(pagina === 1)}
                        >
                            ‹
                        </button>
                        {getPaginasBotones(pagina, totalPaginas).map((n, i) =>
                            n === "..." ? (
                                <span
                                    key={`ellipsis-${i}`}
                                    style={S.pageEllipsis}
                                >
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

            {/* Modal de Filtros Avanzados */}
            {filterOpen && (
                <div style={S.overlay} onClick={() => setFilterOpen(false)}>
                    <div
                        style={{ ...S.modal, maxWidth: 500 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={S.modalHeaderGreen}>
                            <span style={S.modalTitleWhite}>Filtros</span>
                            <button
                                style={S.closeBtnWhite}
                                onClick={() => setFilterOpen(false)}
                            >
                                <IconClose size={14} />
                            </button>
                        </div>
                        <div style={S.modalBody}>
                            <div style={S.formGroup}>
                                <label style={S.label}>Sede</label>
                                <select
                                    style={S.input}
                                    value={filtroSede}
                                    onChange={(e) =>
                                        setFiltroSede(e.target.value)
                                    }
                                >
                                    <option value="Todas">Todas</option>
                                    {options.sedes.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ ...S.formGroup, marginTop: 16 }}>
                                <label style={S.label}>Departamento</label>
                                <select
                                    style={S.input}
                                    value={filtroDepto}
                                    onChange={(e) =>
                                        setFiltroDepto(e.target.value)
                                    }
                                >
                                    <option value="Todos">Todos</option>
                                    {departamentos.map((d) => (
                                        <option key={d.value} value={d.value}>
                                            {d.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ ...S.formGroup, marginTop: 16 }}>
                                <label style={S.label}>Ciudad</label>
                                <select
                                    style={S.input}
                                    value={filtroCiudad}
                                    onChange={(e) =>
                                        setFiltroCiudad(e.target.value)
                                    }
                                >
                                    <option value="Todas">Todas</option>
                                    {options.ciudades.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ ...S.formGroup, marginTop: 16 }}>
                                <label style={S.label}>Tipo de Sede</label>
                                <select
                                    style={S.input}
                                    value={filtroTipo}
                                    onChange={(e) =>
                                        setFiltroTipo(e.target.value)
                                    }
                                >
                                    <option value="Todos">Todos</option>
                                    {options.tipos_sede.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ ...S.formGroup, marginTop: 16 }}>
                                <label style={S.label}>Estado</label>
                                <select
                                    style={S.input}
                                    value={filtroEstado}
                                    onChange={(e) =>
                                        setFiltroEstado(e.target.value)
                                    }
                                >
                                    <option value="Todas">Todas</option>
                                    {options.estados.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={S.modalFooter}>
                            <button
                                style={S.btnSecondary}
                                onClick={clearFilters}
                            >
                                Limpiar
                            </button>
                            <button
                                style={S.btnPrimaryGreen}
                                onClick={() => setFilterOpen(false)}
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                initial={editTarget || EMPTY_FORM}
                title={editTarget ? "Sedes [ Edita ]" : "Sedes [ Crea ]"}
                options={options}
            />
            <Modal
                open={viewOpen}
                onClose={() => setViewOpen(false)}
                initial={viewTarget || EMPTY_FORM}
                title="Sedes [ Ver ]"
                options={options}
                readOnly
            />

            {deleteTarget && (
                <div style={S.overlay} onClick={() => setDeleteTarget(null)}>
                    <div
                        style={{ ...S.modal, maxWidth: 400 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                ...S.modalHeaderGreen,
                                background: "#e74c3c",
                            }}
                        >
                            <span style={S.modalTitleWhite}>Eliminar</span>
                            <button
                                style={S.closeBtnWhite}
                                onClick={() => setDeleteTarget(null)}
                            >
                                <IconClose size={14} />
                            </button>
                        </div>
                        <div style={{ padding: 28 }}>
                            <p>
                                ¿Seguro de eliminar la sede{" "}
                                <b>{deleteTarget.nombre}</b>?
                            </p>
                        </div>
                        <div style={S.modalFooter}>
                            <button
                                style={S.btnSecondary}
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                style={{
                                    ...S.btnPrimary,
                                    background: "#e74c3c",
                                }}
                                onClick={handleDelete}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const S = {
    toolbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
        flexWrap: "wrap",
    },
    filters: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        flex: 1,
    },
    searchWrap: { position: "relative", flex: 1, minWidth: 200, maxWidth: 380 },
    searchIcon: {
        position: "absolute",
        left: 11,
        top: "50%",
        transform: "translateY(-50%)",
        fontSize: "0.9rem",
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
        fontFamily: "Nunito,sans-serif",
        cursor: "pointer",
    },
    tableWrap: {
        background: "var(--white)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        overflowX: "auto",
    },
    badge: (bg, color) => ({
        background: bg,
        color,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: "0.78rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
    }),
    actions: { display: "flex", gap: 6, justifyContent: "center" },
    actionBtn: (bg, color) => ({
        background: bg,
        border: "none",
        borderRadius: 6,
        padding: "5px 8px",
        cursor: "pointer",
        fontSize: "0.85rem",
        color,
        transition: "opacity 0.15s",
    }),
    empty: {
        padding: "60px 20px",
        textAlign: "center",
        color: "var(--text-muted)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
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
        maxWidth: 720,
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
    },
    modalHeaderGreen: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        background: "var(--primary)",
    },
    modalTitleWhite: {
        fontFamily: "'Poppins',sans-serif",
        fontWeight: 600,
        fontSize: "1.2rem",
        color: "#fff",
    },
    closeBtnWhite: {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.6)",
        borderRadius: "50%",
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.9rem",
        cursor: "pointer",
        color: "#fff",
    },
    modalBody: {
        padding: "24px",
        overflowY: "auto",
        overflowX: "hidden",
        flex: 1,
    },
    modalFooter: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
        padding: "16px 24px",
        borderTop: "1.5px solid var(--border)",
        flexShrink: 0,
    },
    grid3: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 24,
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
    },
    label: { fontSize: "0.75rem", fontWeight: 700, color: "var(--text-dark)" },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "6px 8px",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        fontSize: "0.85rem",
        fontFamily: "Nunito,sans-serif",
        color: "var(--text)",
        background: "var(--white)",
        outline: "none",
    },
    inputErr: { borderColor: "#e74c3c" },
    err: { color: "#e74c3c", fontSize: "0.7rem", marginTop: 2 },
    btnPrimary: {
        padding: "8px 16px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        fontSize: "0.85rem",
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
    },
    btnPrimaryGreen: {
        padding: "8px 16px",
        background: "#5cb85c",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        fontSize: "0.85rem",
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
    },
    btnSecondary: {
        padding: "8px 16px",
        background: "#d9534f",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        fontSize: "0.85rem",
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
    },
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
        transition: "all 0.15s",
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
        userSelect: "none",
    },
    toast: {
        position: "fixed",
        bottom: 28,
        right: 28,
        background: "var(--primary)",
        color: "#fff",
        borderRadius: "var(--radius-sm)",
        padding: "13px 22px",
        fontWeight: 700,
        fontSize: "0.92rem",
        zIndex: 9999,
        boxShadow: "0 8px 28px rgba(26,155,140,0.35)",
    },
};
