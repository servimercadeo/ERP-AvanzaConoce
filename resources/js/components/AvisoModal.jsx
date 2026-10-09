import React from "react";

/** Aviso con el estilo de la app (en vez del alert() del navegador). */
export default function AvisoModal({ open, titulo, mensaje, onClose }) {
    if (!open) return null;
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(26,58,53,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 6100, padding: 20 }}>
            <div style={{ background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 16px 60px rgba(26,155,140,0.28)", width: "100%", maxWidth: 420, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 24px", background: "var(--primary)" }}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.2)", color: "#fff", flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        </svg>
                    </span>
                    <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.02rem", color: "#fff" }}>{titulo}</span>
                </div>
                <div style={{ padding: "22px 24px" }}>
                    <p style={{ margin: 0, fontSize: "0.93rem", color: "var(--text)", fontFamily: "Nunito,sans-serif", lineHeight: 1.6 }}>{mensaje}</p>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 24px", borderTop: "1.5px solid var(--border)" }}>
                    <button className="btn-primary" onClick={onClose}>Entendido</button>
                </div>
            </div>
        </div>
    );
}
