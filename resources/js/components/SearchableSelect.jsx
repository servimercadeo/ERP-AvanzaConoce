import React, { useState, useEffect, useRef, useMemo } from "react";

const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 44px 12px 10px",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.95rem",
    fontFamily: "Nunito,sans-serif",
    color: "var(--text)",
    background: "var(--white)",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    minHeight: 48,
    lineHeight: 1.2,
};

const chevronStyle = {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    color: "var(--text-muted)",
    transition: "transform 0.2s ease, color 0.2s ease",
};

const presetBtnStyle = {
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
    whiteSpace: "nowrap",
};

// Normaliza texto: quita acentos y pasa a minúsculas para comparar
function norm(str) {
    return (str ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

export function SearchableSelect({
    value,
    onChange,
    options,
    defaultValue,
    disabled = false,
    freeText = false,
    minSearch = 0,      // nº mínimo de caracteres para mostrar opciones
    maxResults = 100,   // límite de opciones mostradas
}) {
    const getLabel = (val) => {
        if (val === defaultValue || val === "" || val == null) return "";
        return options.find((o) => String(o.value) === String(val))?.label ?? String(val);
    };

    const [query, setQuery] = useState(() => getLabel(value));
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(-1);
    const ref = useRef(null);
    // Rastrea si el usuario está escribiendo activamente
    const isTyping = useRef(false);
    const prevValue = useRef(value);

    // Solo sincronizar query desde afuera si el value cambia externamente
    // (no cuando el usuario está escribiendo)
    useEffect(() => {
        if (!isTyping.current && value !== prevValue.current) {
            setQuery(getLabel(value));
        }
        prevValue.current = value;
    }, [value, options]);

    // Clic fuera cierra el dropdown
    useEffect(() => {
        function onOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                isTyping.current = false;
                setOpen(false);
                if (freeText) {
                    const trimmed = (query ?? "").trim();
                    const currentLabel = getLabel(value);
                    if (trimmed !== currentLabel) {
                        onChange(trimmed || (defaultValue ?? ""));
                    }
                } else {
                    // revertir al label del valor seleccionado
                    setQuery(getLabel(value));
                }
            }
        }
        document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, [value, options, freeText, query, onChange, defaultValue]);

    const q = norm(query);

    const filtered = useMemo(() => {
        if (q.length < minSearch) return [];
        if (q.length === 0) return options.slice(0, maxResults);
        const exact = [], prefix = [], contains = [];
        for (const o of options) {
            const l = norm(o.label);
            if (l === q) exact.push(o);
            else if (l.startsWith(q)) prefix.push(o);
            else if (l.includes(q)) contains.push(o);
        }
        return [...exact, ...prefix, ...contains].slice(0, maxResults);
    }, [q, options, minSearch, maxResults]);

    const exactMatch = freeText && q.length > 0
        && options.some((o) => norm(o.label) === q);

    const handleSelect = (optValue, optLabel) => {
        isTyping.current = false;
        onChange(optValue);
        setQuery(optLabel);
        setOpen(false);
        setHovered(-1);
    };

    const handleClear = () => {
        isTyping.current = false;
        onChange(defaultValue ?? "");
        setQuery("");
        setOpen(false);
    };

    const handleChange = (e) => {
        if (disabled) return;
        isTyping.current = true;
        setQuery(e.target.value);
        setOpen(true);
        setHovered(-1);
    };

    const handleFocus = () => {
        if (disabled) return;
        setOpen(true);
        setHovered(-1);
    };

    const showMinHint = open && q.length > 0 && q.length < minSearch;
    const showTypeHint = open && minSearch > 0 && q.length === 0;

    return (
        <div
            ref={ref}
            style={{ position: "relative", borderRadius: "var(--radius-sm)", display: "block" }}
        >
            <input
                style={{
                    ...inputStyle,
                    background: disabled ? "var(--bg)" : "var(--white)",
                    color: disabled ? "var(--text-muted)" : "var(--text)",
                    cursor: disabled ? "default" : "text",
                    boxShadow: open ? "0 0 0 4px rgba(26,155,140,0.14)" : "none",
                    borderColor: open ? "var(--primary)" : "var(--border)",
                }}
                value={query}
                disabled={disabled}
                placeholder={minSearch > 0 ? `Escribe para buscar...` : ""}
                onFocus={handleFocus}
                onBlur={() => { if (!disabled) setHovered(-1); }}
                onChange={handleChange}
            />
            <span style={{ ...chevronStyle, transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </span>

            {open && !disabled && (
                <div style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    background: "var(--white)",
                    border: "1.5px solid rgba(26,155,140,0.14)",
                    borderRadius: "14px",
                    boxShadow: "0 18px 36px rgba(26,155,140,0.16)",
                    zIndex: 2000,
                    maxHeight: 220,
                    overflowY: "auto",
                    padding: "8px",
                }}>
                    {/* Limpiar */}
                    <div
                        style={{
                            padding: "9px 12px",
                            cursor: "pointer",
                            fontSize: "0.83rem",
                            color: "var(--text-muted)",
                            background: hovered === -2 ? "rgba(26,155,140,0.08)" : "transparent",
                            borderRadius: "10px",
                            borderBottom: "1px solid rgba(197,232,227,0.9)",
                            marginBottom: 6,
                        }}
                        onMouseEnter={() => setHovered(-2)}
                        onMouseLeave={() => setHovered(-1)}
                        onClick={handleClear}
                    >
                        Limpiar selección
                    </div>

                    {/* Hint: escribe más */}
                    {showTypeHint && (
                        <div style={{ padding: "10px 12px", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                            Escribe para buscar...
                        </div>
                    )}
                    {showMinHint && (
                        <div style={{ padding: "10px 12px", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                            Escribe al menos {minSearch} caracteres...
                        </div>
                    )}

                    {/* Opciones */}
                    {!showTypeHint && !showMinHint && (
                        <>
                            {filtered.length === 0 ? (
                                freeText && query.trim() ? (
                                    <div
                                        style={{ padding: "10px 12px", cursor: "pointer", fontSize: "0.88rem", color: "var(--primary)", fontWeight: 700, borderRadius: "10px", background: hovered === -3 ? "rgba(26,155,140,0.08)" : "transparent" }}
                                        onMouseEnter={() => setHovered(-3)}
                                        onMouseLeave={() => setHovered(-1)}
                                        onClick={() => { onChange(query.trim()); setOpen(false); }}
                                    >
                                        Usar "{query}"
                                    </div>
                                ) : (
                                    <div style={{ padding: "10px 12px", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                        Sin resultados
                                    </div>
                                )
                            ) : (
                                <>
                                    {filtered.map((o, i) => (
                                        <div
                                            key={o.value}
                                            style={{
                                                padding: "10px 12px",
                                                cursor: "pointer",
                                                fontSize: "0.9rem",
                                                background: hovered === i ? "rgba(26,155,140,0.08)" : "transparent",
                                                borderRadius: "10px",
                                                marginBottom: 4,
                                                fontWeight: String(value) === String(o.value) ? 700 : 400,
                                                color: String(value) === String(o.value) ? "var(--primary)" : "var(--text)",
                                                transition: "background 0.15s ease",
                                            }}
                                            onMouseEnter={() => setHovered(i)}
                                            onMouseLeave={() => setHovered(-1)}
                                            onClick={() => handleSelect(o.value, o.label)}
                                        >
                                            {o.label}
                                        </div>
                                    ))}
                                    {freeText && query.trim() && !exactMatch && (
                                        <div
                                            style={{ padding: "10px 12px", cursor: "pointer", fontSize: "0.88rem", color: "var(--primary)", fontWeight: 700, borderRadius: "10px", borderTop: "1px solid rgba(197,232,227,0.9)", marginTop: 4, background: hovered === -3 ? "rgba(26,155,140,0.08)" : "transparent" }}
                                            onMouseEnter={() => setHovered(-3)}
                                            onMouseLeave={() => setHovered(-1)}
                                            onClick={() => { onChange(query.trim()); setOpen(false); }}
                                        >
                                            Usar "{query}"
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export function PresetFiltersDropdown({ presets }) {
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(-1);
    const ref = useRef(null);

    useEffect(() => {
        function onOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, []);

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button style={presetBtnStyle} onClick={() => setOpen((o) => !o)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                Predeterminados
            </button>
            {open && (
                <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    background: "var(--white)",
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.13)",
                    zIndex: 500,
                    minWidth: 210,
                    overflow: "hidden",
                }}>
                    {presets.map((p, i) => {
                        const isClear = p.clear === true;
                        const isHovered = hovered === i;
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: "10px 16px",
                                    cursor: "pointer",
                                    fontSize: "0.88rem",
                                    fontFamily: "Nunito,sans-serif",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    color: isClear ? "var(--text)" : "inherit",
                                    fontWeight: isClear ? 700 : 400,
                                    background: isClear
                                        ? (isHovered ? "var(--bg,#e8e8e8)" : "var(--bg,#f2f2f2)")
                                        : (isHovered ? "var(--bg,#f5f5f5)" : "transparent"),
                                    borderTop: isClear ? "1.5px solid var(--border)" : "none",
                                    borderBottom: i < presets.length - 1 && !isClear ? "1px solid var(--border)" : "none",
                                }}
                                onMouseEnter={() => setHovered(i)}
                                onMouseLeave={() => setHovered(-1)}
                                onClick={() => { p.apply(); setOpen(false); }}
                            >
                                {p.label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function FilterDropdown({ label, value, onChange, options }) {
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(-1);
    const ref = useRef(null);

    useEffect(() => {
        function onOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, []);

    const selectedLabel = options.find(o => (typeof o === 'string' ? o : o.value) === value);
    const displayLabel = typeof selectedLabel === 'object' ? selectedLabel.label : (selectedLabel || value);

    const handleSelect = (val) => {
        onChange(val);
        setOpen(false);
    };

    return (
        <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
            <div
                onClick={() => setOpen(!open)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    height: 40,
                    padding: "0 12px",
                    background: "var(--white)",
                    border: open ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    boxShadow: open ? "0 0 0 4px rgba(26,155,140,0.14)" : "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    userSelect: "none",
                }}
            >
                {label && (
                    <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", fontFamily: "Nunito,sans-serif", whiteSpace: "nowrap" }}>
                        {label}
                    </span>
                )}
                <span style={{ fontSize: "0.87rem", fontWeight: 700, color: "var(--text)", fontFamily: "Nunito,sans-serif" }}>
                    {displayLabel}
                </span>
                <span style={{ display: "flex", color: "var(--text-muted)", transform: `rotate(${open ? 180 : 0}deg)`, transition: "transform 0.2s ease" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </div>
            {open && (
                <div style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    background: "var(--white)",
                    border: "1.5px solid rgba(26,155,140,0.14)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 30px rgba(26,155,140,0.15)",
                    zIndex: 1000,
                    minWidth: 150,
                    padding: "6px",
                }}>
                    {options.map((o, i) => {
                        const val = typeof o === 'string' ? o : o.value;
                        const lbl = typeof o === 'string' ? o : o.label;
                        const active = val === value;
                        return (
                            <div
                                key={val}
                                onMouseEnter={() => setHovered(i)}
                                onMouseLeave={() => setHovered(-1)}
                                onClick={() => handleSelect(val)}
                                style={{
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                    fontSize: "0.87rem",
                                    fontFamily: "Nunito,sans-serif",
                                    borderRadius: "8px",
                                    fontWeight: active ? 700 : 400,
                                    color: active ? "var(--primary)" : "var(--text)",
                                    background: hovered === i ? "rgba(26,155,140,0.08)" : (active ? "rgba(26,155,140,0.04)" : "transparent"),
                                    transition: "all 0.15s ease",
                                }}
                            >
                                {lbl}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
