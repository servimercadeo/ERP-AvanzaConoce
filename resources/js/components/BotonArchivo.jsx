import React from "react";

/** Selector de archivo con apariencia de botón (en vez del input nativo del navegador). */
export default function BotonArchivo({ archivo, onChange, disabled }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <label style={{
                cursor: disabled ? "default" : "pointer",
                background: "var(--primary)",
                color: "#fff",
                borderRadius: "var(--radius-sm)",
                padding: "8px 14px",
                fontSize: "0.82rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
                opacity: disabled ? 0.5 : 1,
                fontFamily: "Nunito,sans-serif",
            }}>
                {archivo ? "Cambiar archivo" : "Seleccionar archivo"}
                <input
                    type="file"
                    style={{ display: "none" }}
                    disabled={disabled}
                    onChange={e => {
                        onChange(e.target.files[0] ?? null);
                        e.target.value = "";
                    }}
                />
            </label>
            <span style={{ fontSize: "0.8rem", color: archivo ? "var(--text)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {archivo ? archivo.name : "Ningún archivo seleccionado"}
            </span>
        </div>
    );
}
