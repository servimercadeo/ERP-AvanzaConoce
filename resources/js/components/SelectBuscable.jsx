import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

// Reemplazo directo de <select> con el estilo y el buscador de SearchableSelect: se usa
// igual que el nativo (value/defaultValue, onChange(e) con e.target.value, <option> como
// hijos), así que cambiar <select> por <SelectBuscable> no exige tocar los handlers.
//
// La opción con value="" (p. ej. "Seleccione", "Todas") hace de placeholder y de
// "limpiar selección"; si el <select> no la tenía, la selección no se puede vaciar,
// igual que con el nativo.

// Propiedades de `style` que ubican el control en su contenedor: van al envoltorio para
// que el ancho/flex/grid se comporten igual que con el <select>; el resto, al input.
const LAYOUT_KEYS = [
    "width", "minWidth", "maxWidth", "flex", "flexGrow", "flexShrink", "flexBasis",
    "margin", "marginTop", "marginBottom", "marginLeft", "marginRight",
    "gridColumn", "gridRow", "alignSelf", "justifySelf", "order",
];

const baseInput = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontFamily: "inherit",
    fontSize: "inherit",
    color: "var(--text)",
    background: "var(--white)",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

function norm(str) {
    return String(str ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

function textOf(node) {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(textOf).join("");
    if (React.isValidElement(node)) return textOf(node.props.children);
    return "";
}

// Recorre hijos, arrays y fragments y devuelve las <option> como {value, label, disabled}.
function collectOptions(children, out = []) {
    React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) return;
        if (child.type === "option") {
            const label = textOf(child.props.children);
            out.push({
                value: String(child.props.value ?? label),
                label,
                disabled: !!child.props.disabled,
            });
        } else if (child.props?.children) {
            collectOptions(child.props.children, out);
        }
    });
    return out;
}

export default function SelectBuscable({
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    children,
    disabled = false,
    style,
    className,
    name,
    id,
    required,
    title,
    autoFocus,
}) {
    const controlled = value !== undefined;
    const [inner, setInner] = useState(defaultValue ?? "");
    const current = String((controlled ? value : inner) ?? "");

    const options = useMemo(() => collectOptions(children), [children]);
    const emptyOpt = options.find((o) => o.value === "");
    const choices = useMemo(() => options.filter((o) => o.value !== ""), [options]);
    const selected = options.find((o) => o.value === current);
    // Un valor que no está entre las opciones se muestra tal cual (como datos antiguos).
    const selectedLabel = current === "" ? "" : (selected?.label ?? current);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [hovered, setHovered] = useState(-1);
    const [coords, setCoords] = useState(null);
    const wrapRef = useRef(null);
    const inputRef = useRef(null);
    const panelRef = useRef(null);
    const listRef = useRef(null);

    const filtered = useMemo(() => {
        const q = norm(query.trim());
        if (!q) return choices;
        const prefix = [], contains = [];
        for (const o of choices) {
            const l = norm(o.label);
            if (l.startsWith(q)) prefix.push(o);
            else if (l.includes(q)) contains.push(o);
        }
        return [...prefix, ...contains];
    }, [query, choices]);

    const close = () => {
        setOpen(false);
        setQuery("");
        setHovered(-1);
    };

    const emit = (v) => {
        if (!controlled) setInner(v);
        if (v === current) return;
        const target = { value: v, name, id };
        onChange?.({
            target,
            currentTarget: target,
            preventDefault() {},
            stopPropagation() {},
        });
    };

    const pick = (opt) => {
        if (opt.disabled) return;
        emit(opt.value);
        close();
    };

    const openPanel = () => {
        if (disabled || open) return;
        setOpen(true);
        setQuery("");
        const idx = choices.findIndex((o) => o.value === current);
        setHovered(idx);
    };

    // Clic fuera: cierra y descarta lo escrito (el valor solo cambia al elegir).
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (wrapRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
            close();
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    // El panel va en un portal (fixed) para no quedar recortado por modales o tablas con
    // overflow; se abre hacia arriba si abajo no hay espacio.
    useLayoutEffect(() => {
        if (!open) return;
        const update = () => {
            const r = wrapRef.current?.getBoundingClientRect();
            if (!r) return;
            const below = window.innerHeight - r.bottom;
            const up = below < 240 && r.top > below;
            setCoords({
                left: r.left,
                width: Math.max(r.width, 160),
                top: up ? undefined : r.bottom + 6,
                bottom: up ? window.innerHeight - r.top + 6 : undefined,
                maxHeight: Math.min(280, (up ? r.top : below) - 16),
            });
        };
        update();
        window.addEventListener("scroll", update, true);
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("resize", update);
        };
    }, [open]);

    // Mantiene visible la opción resaltada al moverse con el teclado.
    useEffect(() => {
        if (!open || hovered < 0) return;
        listRef.current?.querySelector(`[data-idx="${hovered}"]`)?.scrollIntoView({ block: "nearest" });
    }, [hovered, open]);

    const onKeyDown = (e) => {
        if (disabled) return;
        if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")) {
            e.preventDefault();
            openPanel();
            return;
        }
        if (!open) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHovered((h) => Math.min(filtered.length - 1, h + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHovered((h) => Math.max(0, h - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const opt = filtered[hovered] ?? (filtered.length === 1 ? filtered[0] : null);
            if (opt) pick(opt);
        } else if (e.key === "Escape") {
            e.preventDefault();
            close();
        } else if (e.key === "Tab") {
            close();
        }
    };

    const layout = {};
    const inputOwn = {};
    Object.entries(style ?? {}).forEach(([k, v]) => {
        (LAYOUT_KEYS.includes(k) ? layout : inputOwn)[k] = v;
    });
    delete inputOwn.backgroundImage;
    delete inputOwn.appearance;
    delete inputOwn.WebkitAppearance;
    delete inputOwn.MozAppearance;

    const inputStyle = {
        // Con className, el borde/padding/fondo los pone la clase CSS (p. ej. .form-input
        // del formulario público, que deja espacio para un ícono); en línea los taparía.
        ...(className ? {} : baseInput),
        ...inputOwn,
        width: "100%",
        paddingRight: 34,
        cursor: disabled ? "not-allowed" : open ? "text" : "pointer",
        textOverflow: "ellipsis",
        ...(open
            ? { borderColor: "var(--primary)", boxShadow: "0 0 0 3px rgba(26,155,140,0.15)" }
            : {}),
        ...(disabled
            ? { background: "var(--bg)", color: "var(--text-muted)", opacity: 0.85 }
            : {}),
    };

    const row = (active) => ({
        padding: "9px 12px",
        cursor: "pointer",
        fontSize: "0.88rem",
        borderRadius: 10,
        background: active ? "rgba(26,155,140,0.08)" : "transparent",
        transition: "background 0.12s ease",
    });

    return (
        <div ref={wrapRef} style={{ position: "relative", display: "block", ...layout }}>
            <input
                ref={inputRef}
                id={id}
                name={name}
                title={title}
                autoFocus={autoFocus}
                required={required}
                className={className}
                style={inputStyle}
                disabled={disabled}
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                // Abierto: lo escrito filtra y la selección actual queda como placeholder.
                value={open ? query : selectedLabel}
                placeholder={open ? (selectedLabel || emptyOpt?.label || "Buscar…") : (emptyOpt?.label ?? "")}
                onMouseDown={() => {
                    if (!open) openPanel();
                }}
                onFocus={(e) => {
                    openPanel();
                    onFocus?.(e);
                }}
                onBlur={onBlur}
                onChange={(e) => {
                    if (!open) openPanel();
                    setQuery(e.target.value);
                    setHovered(e.target.value ? 0 : -1);
                }}
                onKeyDown={onKeyDown}
            />
            <span
                style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
                    transition: "transform 0.2s ease",
                    pointerEvents: "none",
                    color: "var(--text-muted)",
                    display: "flex",
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </span>

            {open && coords && createPortal(
                <div
                    ref={panelRef}
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                        position: "fixed",
                        top: coords.top,
                        bottom: coords.bottom,
                        left: coords.left,
                        width: coords.width,
                        maxHeight: Math.max(coords.maxHeight, 120),
                        overflowY: "auto",
                        background: "var(--white)",
                        border: "1.5px solid rgba(26,155,140,0.14)",
                        borderRadius: 14,
                        boxShadow: "0 18px 36px rgba(26,155,140,0.16)",
                        zIndex: 10000,
                        padding: 8,
                        fontFamily: "Nunito, sans-serif",
                    }}
                >
                    {emptyOpt && !query && (
                        <div
                            style={{
                                ...row(hovered === -2),
                                fontSize: "0.83rem",
                                color: "var(--text-muted)",
                                borderBottom: "1px solid rgba(197,232,227,0.9)",
                                marginBottom: 6,
                                fontWeight: current === "" ? 700 : 400,
                            }}
                            onMouseEnter={() => setHovered(-2)}
                            onClick={() => pick(emptyOpt)}
                        >
                            {emptyOpt.label || "Limpiar selección"}
                        </div>
                    )}
                    <div ref={listRef}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: "10px 12px", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                {choices.length === 0 ? "Sin opciones" : "Sin resultados"}
                            </div>
                        ) : (
                            filtered.map((o, i) => {
                                const isSel = o.value === current;
                                return (
                                    <div
                                        key={`${o.value}__${i}`}
                                        data-idx={i}
                                        style={{
                                            ...row(hovered === i),
                                            marginBottom: 2,
                                            fontWeight: isSel ? 700 : 400,
                                            color: o.disabled
                                                ? "var(--text-muted)"
                                                : isSel ? "var(--primary)" : "var(--text)",
                                            cursor: o.disabled ? "not-allowed" : "pointer",
                                            opacity: o.disabled ? 0.6 : 1,
                                        }}
                                        onMouseEnter={() => setHovered(i)}
                                        onClick={() => pick(o)}
                                    >
                                        {o.label}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}
