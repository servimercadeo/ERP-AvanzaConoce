import React, { useState, useEffect, useRef } from "react";

const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.88rem",
    fontFamily: "Nunito,sans-serif",
    color: "var(--text)",
    background: "var(--white)",
    outline: "none",
    transition: "border 0.15s",
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

export function SearchableSelect({ value, onChange, options, defaultValue, placeholder = "Elige", disabled = false }) {
    const selectedLabel =
        value === defaultValue || value === "" || value == null
            ? ""
            : options.find((o) => String(o.value) === String(value))?.label ?? String(value);

    const [query, setQuery] = useState(selectedLabel);
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(-1);
    const ref = useRef(null);

    // Sync query with selected label when closed or when value changes externally
    useEffect(() => {
        if (!open) setQuery(selectedLabel);
    }, [selectedLabel, open]);

    useEffect(() => {
        function onOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                // revert to selected label if user didn't pick anything new
                setQuery(selectedLabel);
            }
        }
        document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, [selectedLabel]);

    const q = query.toLowerCase();
    const filtered = q.length === 0
        ? options                                                        // sin texto: muestra todo
        : options.filter((o) => o.label.toLowerCase().startsWith(q));   // con texto: filtra por inicio

    const handleSelect = (optValue, optLabel) => {
        onChange(optValue);
        setQuery(optLabel);
        setOpen(false);
        setHovered(-1);
    };

    const handleClear = () => {
        onChange(defaultValue);
        setQuery("");
        setOpen(false);
    };

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <input
                style={{
                    ...inputStyle,
                    background: disabled ? "var(--bg)" : "var(--white)",
                    color: disabled ? "var(--text-muted)" : "var(--text)",
                    cursor: disabled ? "default" : "text",
                }}
                placeholder={placeholder}
                value={query}
                disabled={disabled}
                onFocus={() => { if (!disabled) { setOpen(true); setHovered(-1); } }}
                onChange={(e) => { if (!disabled) { setQuery(e.target.value); setOpen(true); setHovered(-1); } }}
            />
            {open && !disabled && (
                <div style={{
                    position: "absolute",
                    top: "calc(100% + 2px)",
                    left: 0,
                    right: 0,
                    background: "var(--white)",
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.13)",
                    zIndex: 1000,
                    maxHeight: 220,
                    overflowY: "auto",
                }}>
                    {/* Opción limpiar */}
                    <div
                        style={{ padding: "7px 10px", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-muted)", background: hovered === -2 ? "var(--bg,#f5f5f5)" : "transparent", borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={() => setHovered(-2)}
                        onMouseLeave={() => setHovered(-1)}
                        onClick={handleClear}
                    >
                        {placeholder}
                    </div>
                    {filtered.length === 0 ? (
                        <div style={{ padding: "7px 10px", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                            Sin resultados para "{query}"
                        </div>
                    ) : (
                        filtered.map((o, i) => (
                            <div
                                key={o.value}
                                style={{
                                    padding: "7px 10px",
                                    cursor: "pointer",
                                    fontSize: "0.88rem",
                                    background: hovered === i ? "var(--bg,#f5f5f5)" : "transparent",
                                    fontWeight: String(value) === String(o.value) ? 700 : 400,
                                    color: String(value) === String(o.value) ? "var(--primary)" : "var(--text)",
                                }}
                                onMouseEnter={() => setHovered(i)}
                                onMouseLeave={() => setHovered(-1)}
                                onClick={() => handleSelect(o.value, o.label)}
                            >
                                {o.label}
                            </div>
                        ))
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
