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

export function SearchableSelect({ value, onChange, options, defaultValue, placeholder = "Elige" }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(-1);
    const ref = useRef(null);

    useEffect(() => {
        function onOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                setQuery("");
            }
        }
        document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, []);

    const filtered = options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
    );

    const selectedLabel =
        value === defaultValue
            ? ""
            : options.find((o) => String(o.value) === String(value))?.label ?? value;

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <input
                style={inputStyle}
                placeholder={placeholder}
                value={open ? query : selectedLabel}
                onFocus={() => { setOpen(true); setQuery(""); setHovered(-1); }}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); setHovered(-1); }}
            />
            {open && (
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
                    maxHeight: 200,
                    overflowY: "auto",
                }}>
                    <div
                        style={{ padding: "7px 10px", cursor: "pointer", fontSize: "0.88rem", color: "var(--text-muted)", background: hovered === -2 ? "var(--bg,#f5f5f5)" : "transparent" }}
                        onMouseEnter={() => setHovered(-2)}
                        onMouseLeave={() => setHovered(-1)}
                        onClick={() => { onChange(defaultValue); setOpen(false); setQuery(""); }}
                    >
                        {placeholder}
                    </div>
                    {filtered.length === 0 ? (
                        <div style={{ padding: "7px 10px", fontSize: "0.88rem", color: "var(--text-muted)" }}>
                            Sin resultados
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
                                }}
                                onMouseEnter={() => setHovered(i)}
                                onMouseLeave={() => setHovered(-1)}
                                onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
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
