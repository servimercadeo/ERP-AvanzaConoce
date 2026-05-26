import { useState } from "react";
import { useTheme, THEMES } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

// ─── Iconos inline ───────────────────────────────────────────────────────────
const IcoPalette = () => (
    <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
    >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z" />
        <circle cx="6.5" cy="11.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="9.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="17.5" cy="11.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
);
const IcoSun = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
    >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);
const IcoMoon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
    >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);
const IcoReset = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
    >
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
    </svg>
);
const IcoClose = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
    >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const IcoCheck = () => (
    <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
    >
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const IcoMagic = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
    >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function Section({ title, children }) {
    return (
        <div className="tpb-section">
            <p className="tpb-section-title">{title}</p>
            {children}
        </div>
    );
}

function ToggleGroup({ options, value, onChange }) {
    return (
        <div className="tpb-toggle-group">
            {options.map((o) => (
                <button
                    key={o.value}
                    className={`tpb-toggle-btn${value === o.value ? " tpb-toggle-btn--active" : ""}`}
                    onClick={() => onChange(o.value)}
                    title={o.label}
                >
                    {o.icon && (
                        <span className="tpb-toggle-icon">{o.icon}</span>
                    )}
                    <span>{o.label}</span>
                </button>
            ))}
        </div>
    );
}

function Switch({ label, active, onToggle }) {
    return (
        <div className="tpb-switch-row" onClick={onToggle}>
            <span className="tpb-switch-label">{label}</span>
            <div className={`tpb-switch ${active ? "tpb-switch--active" : ""}`}>
                <div className="tpb-switch-handle" />
            </div>
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ThemePickerButton() {
    const { prefs, setPreference, resetPreferences } = useTheme();
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [resetting, setRes] = useState(false);

    const set = (key, val) => setPreference(key, val);

    const handleReset = async () => {
        setRes(true);
        await resetPreferences();
        setRes(false);
    };

    return (
        <>
            {open && (
                <div
                    className="theme-picker-overlay"
                    onClick={() => setOpen(false)}
                />
            )}

            {open && (
                <div className="theme-picker-panel tpb-panel tpb-panel--extended">
                    {/* Encabezado */}
                    <div className="tpb-header">
                        <IcoPalette />
                        <div className="tpb-header-text">
                            <span>Personalizar ERP</span>
                            <p className="tpb-header-sub">
                                Configura tu espacio de trabajo
                            </p>
                        </div>
                        {!user && (
                            <span className="tpb-local-badge">local</span>
                        )}
                        <button
                            className="tpb-close-btn"
                            onClick={() => setOpen(false)}
                        >
                            <IcoClose />
                        </button>
                    </div>

                    <div className="tpb-scroll-area">
                        {/* ── COLORES ── */}
                        <Section title="Paleta de Colores">
                            <div className="tpb-colors-grid">
                                {Object.entries(THEMES).map(([key, def]) => (
                                    <button
                                        key={key}
                                        className={`tpb-color-dot${prefs.theme === key ? " tpb-color-dot--active" : ""}`}
                                        style={{ "--dot-color": def.swatch }}
                                        onClick={() => set("theme", key)}
                                        title={def.label}
                                    >
                                        {prefs.theme === key && <IcoCheck />}
                                    </button>
                                ))}
                            </div>
                            <p className="tpb-active-label">
                                {THEMES[prefs.theme]?.label}
                            </p>
                        </Section>

                        {/* ── MODO Y GLASS ── */}
                        <Section title="Efectos Visuales">
                            <div className="tpb-grid-2">
                                <div className="tpb-toggle-group">
                                    <button
                                        className={`tpb-toggle-btn${!prefs.dark ? " tpb-toggle-btn--active" : ""}`}
                                        onClick={() => set("dark", false)}
                                    >
                                        <IcoSun /> Clarito
                                    </button>
                                    <button
                                        className={`tpb-toggle-btn${prefs.dark ? " tpb-toggle-btn--active" : ""}`}
                                        onClick={() => set("dark", true)}
                                    >
                                        <IcoMoon /> Oscuro
                                    </button>
                                </div>
                            </div>
                            <div style={{ marginTop: "12px" }}>
                                <Switch
                                    label="Efecto Glass (Transparencias)"
                                    active={prefs.glass}
                                    onToggle={() => set("glass", !prefs.glass)}
                                />
                            </div>
                        </Section>

                        {/* ── TIPOGRAFÍA ── */}
                        <Section title="Textos y Tipografía">
                            <p className="tpb-sub-title">Familia de fuente</p>
                            <ToggleGroup
                                value={prefs.fontFamily}
                                onChange={(v) => set("fontFamily", v)}
                                options={[
                                    { value: "nunito", label: "Nunito" },
                                    { value: "inter", label: "Inter" },
                                    { value: "poppins", label: "Poppins" },
                                ]}
                            />
                            <p
                                className="tpb-sub-title"
                                style={{ marginTop: "10px" }}
                            >
                                Tamaño de interfaz
                            </p>
                            <ToggleGroup
                                value={prefs.fontSize}
                                onChange={(v) => set("fontSize", v)}
                                options={[
                                    { value: "small", label: "Compacto" },
                                    { value: "normal", label: "Estándar" },
                                    { value: "large", label: "Grande" },
                                ]}
                            />
                        </Section>

                        {/* ── DISEÑO ESTRUCTURAL ── */}
                        <Section title="Estructura y Sombras">
                            <p className="tpb-sub-title">
                                Bordes de componentes
                            </p>
                            <ToggleGroup
                                value={prefs.radius}
                                onChange={(v) => set("radius", v)}
                                options={[
                                    {
                                        value: "sharp",
                                        label: "Recto",
                                        icon: (
                                            <span className="tpb-radius-preview tpb-radius-sharp" />
                                        ),
                                    },
                                    {
                                        value: "default",
                                        label: "Suave",
                                        icon: (
                                            <span className="tpb-radius-preview tpb-radius-default" />
                                        ),
                                    },
                                    {
                                        value: "pill",
                                        label: "Cápsula",
                                        icon: (
                                            <span className="tpb-radius-preview tpb-radius-pill" />
                                        ),
                                    },
                                ]}
                            />
                            <p
                                className="tpb-sub-title"
                                style={{ marginTop: "10px" }}
                            >
                                Intensidad de sombras
                            </p>
                            <ToggleGroup
                                value={prefs.shadows}
                                onChange={(v) => set("shadows", v)}
                                options={[
                                    { value: "soft", label: "Sutiles" },
                                    { value: "strong", label: "Profundas" },
                                ]}
                            />
                        </Section>

                        {/* ── NAVEGACIÓN ── */}
                        <Section title="Navegación">
                            <p className="tpb-sub-title">Menú lateral</p>
                            <ToggleGroup
                                value={prefs.sidebar}
                                onChange={(v) => set("sidebar", v)}
                                options={[
                                    { value: "standard", label: "Expandido" },
                                    { value: "compact", label: "Iconos" },
                                ]}
                            />
                            <p
                                className="tpb-sub-title"
                                style={{ marginTop: "10px" }}
                            >
                                Barra superior (Header)
                            </p>
                            <ToggleGroup
                                value={prefs.navbar}
                                onChange={(v) => set("navbar", v)}
                                options={[
                                    { value: "fixed", label: "Fijo" },
                                    { value: "floating", label: "Flotante" },
                                ]}
                            />
                        </Section>
                    </div>

                    {/* Pie */}
                    <div className="tpb-footer tpb-footer--sticky">
                        <button
                            className="tpb-reset-btn"
                            onClick={handleReset}
                            disabled={resetting}
                        >
                            <IcoReset />
                            {resetting
                                ? "Restableciendo…"
                                : "Restablecer valores de fábrica"}
                        </button>
                    </div>
                </div>
            )}

            {/* FAB */}
            <button
                id="theme-picker-fab"
                className={`theme-fab theme-fab--main${open ? " theme-fab--open" : ""}`}
                onClick={() => setOpen((v) => !v)}
            >
                {open ? <IcoClose /> : <IcoPalette />}
            </button>
        </>
    );
}
