import React, { useState, useEffect, useRef } from "react";
import { SearchableSelect } from "../components/SearchableSelect";

const EMPTY = {
    documento: "",
    nombres: "",
    apellidos: "",
    edad: "",
    genero: "",
    fecha_expedicion: "",
    ciudad_id: "",
    celular: "",
    correo: "",
    negocio: "",
};

// ── CUSTOM INLINE SVG ICON COMPONENTS ──

const IconDoc = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="7" y1="16" x2="13" y2="16" />
    </svg>
);

const IconUser = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const IconAge = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
    </svg>
);

const IconCalendar = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const IconPhone = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
);

const IconMail = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

const IconMapPin = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const IconBriefcase = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
);

const IconShield = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "var(--primary, #1a9b8c)" }}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const IconInfo = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

// ── COMPONENTE FIELD DE FORMULARIO MEJORADO ──

function Field({ label, hint, required, error, children }) {
    return (
        <div style={{ marginBottom: 24 }} className={error ? "animate-shake" : ""}>
            <label
                style={{
                    display: "block",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "var(--text, #1a3a35)",
                    marginBottom: 6,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                }}
            >
                {label}
                {required && (
                    <span style={{ color: "#e74c3c", marginLeft: 4, fontWeight: "bold" }}>*</span>
                )}
            </label>
            {hint && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.78rem",
                        color: "var(--primary, #1a9b8c)",
                        marginBottom: 10,
                        fontFamily: "Nunito, sans-serif",
                        fontWeight: 600,
                    }}
                >
                    <span style={{ fontSize: "0.85rem", color: "var(--primary, #1a9b8c)", opacity: 0.8 }}>✦</span>
                    <span>{hint}</span>
                </div>
            )}
            {children}
            {error && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.8rem",
                        color: "#e74c3c",
                        marginTop: 8,
                        fontFamily: "Nunito, sans-serif",
                        fontWeight: 600,
                        animation: "fadeIn 0.3s ease",
                    }}
                >
                    <span style={{ fontSize: "1rem" }}>⚠</span>
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}

// ── HOJA DE ESTILOS CSS INYECTADA PARA ANIMACIONES Y CLASES PREMIUM ──

const FormStyles = () => (
    <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }
        .animate-fade-in {
            animation: fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-shake {
            animation: shake 0.2s ease-in-out 0s 2;
        }
        .form-input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            transition: all 0.25s ease;
        }
        .form-input-icon {
            position: absolute;
            left: 14px;
            color: var(--text-muted, #5a7a75);
            transition: color 0.25s ease, transform 0.25s ease;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .form-input {
            width: 100%;
            padding: 12px 14px 12px 42px !important;
            border: 1.5px solid var(--border, #c5e8e3) !important;
            border-radius: var(--radius-sm, 10px) !important;
            font-size: 0.95rem !important;
            font-family: 'Nunito', sans-serif !important;
            color: var(--text, #1a3a35) !important;
            background: var(--white, #ffffff) !important;
            outline: none !important;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
            box-sizing: border-box !important;
        }
        .form-input:focus {
            border-color: var(--primary, #1a9b8c) !important;
            box-shadow: 0 0 0 4px rgba(26,155,140,0.16) !important;
            background: var(--white, #ffffff) !important;
        }
        .form-input:focus + .form-input-icon {
            color: var(--primary, #1a9b8c) !important;
            transform: scale(1.05);
        }
        .form-input-error {
            border-color: #e74c3c !important;
            box-shadow: 0 0 0 4px rgba(231,76,60,0.12) !important;
        }
        .form-input-error + .form-input-icon {
            color: #e74c3c !important;
        }
        
        /* Stepper CSS */
        .stepper-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            margin-bottom: 0;
            padding: 32px 40px 24px;
            background: var(--white, #ffffff);
            border-bottom: 1.5px solid var(--border, #c5e8e3);
        }
        .stepper-line-bg {
            position: absolute;
            top: 52px;
            left: 56px;
            right: 56px;
            height: 4px;
            background: var(--border, #c5e8e3);
            z-index: 1;
            border-radius: 2px;
        }
        .stepper-line-progress {
            position: absolute;
            top: 52px;
            left: 56px;
            height: 4px;
            background: linear-gradient(90deg, var(--primary, #1a9b8c), var(--primary-dark, #127a6d));
            z-index: 2;
            border-radius: 2px;
            transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .step-item {
            position: relative;
            z-index: 3;
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            min-width: 60px;
        }
        .step-circle {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--white, #ffffff);
            border: 2px solid var(--border, #c5e8e3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 0.9rem;
            color: var(--text-muted, #5a7a75);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 2px 6px rgba(0,0,0,0.02);
        }
        .step-item.active .step-circle {
            background: var(--primary, #1a9b8c);
            border-color: var(--primary, #1a9b8c);
            color: var(--white, #ffffff);
            box-shadow: 0 0 0 5px rgba(26,155,140,0.18), 0 4px 8px rgba(26,155,140,0.12);
        }
        .step-item.completed .step-circle {
            background: var(--primary-light, #d0f0ec);
            border-color: var(--primary, #1a9b8c);
            color: var(--primary, #1a9b8c);
        }
        .step-label {
            margin-top: 8px;
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            font-size: 0.78rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted, #5a7a75);
            transition: color 0.3s ease;
            text-align: center;
        }
        .step-item.active .step-label {
            color: var(--primary, #1a9b8c);
        }
        .step-item.completed .step-label {
            color: var(--primary-dark, #127a6d);
        }
        
        /* Modern Button Styles */
        .btn-modern-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: linear-gradient(135deg, var(--primary, #1a9b8c) 0%, var(--primary-dark, #127a6d) 100%);
            color: #fff;
            border: none;
            border-radius: var(--radius-sm, 10px);
            padding: 12px 30px;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Poppins', sans-serif;
            letter-spacing: 0.03em;
            box-shadow: 0 4px 12px rgba(26,155,140,0.2);
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-modern-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(26,155,140,0.3);
            filter: brightness(1.05);
        }
        .btn-modern-primary:active:not(:disabled) {
            transform: translateY(0);
        }
        .btn-modern-primary:disabled {
            background: var(--text-muted, #94a3b8);
            box-shadow: none;
            cursor: not-allowed;
            opacity: 0.7;
        }
        
        .btn-modern-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: var(--white, #ffffff);
            color: var(--primary, #1a9b8c);
            border: 1.5px solid var(--primary, #1a9b8c);
            border-radius: var(--radius-sm, 10px);
            padding: 11px 26px;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Poppins', sans-serif;
            letter-spacing: 0.03em;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-modern-secondary:hover {
            background: var(--primary-light, #d0f0ec);
            transform: translateY(-1px);
        }
        .btn-modern-secondary:active {
            transform: translateY(0);
        }
        
        /* Custom overrides for SearchableSelect inside wrapper */
        .searchable-select-custom input {
            padding: 12px 14px 12px 42px !important;
            border: 1.5px solid var(--border, #c5e8e3) !important;
            border-radius: var(--radius-sm, 10px) !important;
            font-size: 0.95rem !important;
            font-family: 'Nunito', sans-serif !important;
            color: var(--text, #1a3a35) !important;
            background: var(--white, #ffffff) !important;
            outline: none !important;
            height: 48px !important;
            box-sizing: border-box !important;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .searchable-select-custom input:focus {
            border-color: var(--primary, #1a9b8c) !important;
            box-shadow: 0 0 0 4px rgba(26,155,140,0.16) !important;
        }
        .searchable-select-custom-error input {
            border-color: #e74c3c !important;
            box-shadow: 0 0 0 4px rgba(231,76,60,0.12) !important;
        }

        /* State card layouts */
        .state-card {
            background: var(--white, #fff);
            border-radius: var(--radius, 16px);
            box-shadow: 0 15px 40px rgba(26,155,140,0.08), 0 1px 3px rgba(0,0,0,0.01);
            border: 1.5px solid var(--border, #c5e8e3);
            padding: 64px 40px;
            max-width: 540px;
            width: 100%;
            text-align: center;
            animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .state-icon-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 28px;
            font-size: 2.2rem;
            box-shadow: 0 4px 14px rgba(26,155,140,0.15);
            animation: pulseCircle 2.2s infinite;
        }
        @keyframes pulseCircle {
            0% { box-shadow: 0 0 0 0 rgba(26,155,140,0.25); }
            70% { box-shadow: 0 0 0 12px rgba(26,155,140,0); }
            100% { box-shadow: 0 0 0 0 rgba(26,155,140,0); }
        }
        
        .compact-privacy-footer {
            display: flex;
            gap: 12px;
            align-items: center;
            padding: 14px 18px;
            border-left: 3px solid var(--primary, #1a9b8c);
            background: var(--bg2, #f0faf8);
            border-radius: 0 var(--radius-sm, 10px) var(--radius-sm, 10px) 0;
            margin-top: 10px;
            margin-bottom: 24px;
            animation: fadeIn 0.4s ease;
        }

        /* Modal Alert CSS */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(8, 26, 24, 0.65);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
            animation: fadeInOverlay 0.4s ease forwards;
        }
        .modal-alert-card {
            background: var(--white, #ffffff);
            border-radius: var(--radius, 16px);
            box-shadow: 0 25px 60px rgba(8, 26, 24, 0.22);
            border: 1.5px solid var(--border, #c5e8e3);
            max-width: 580px;
            width: 100%;
            padding: 40px;
            animation: scaleUpModal 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            box-sizing: border-box;
        }
        .modal-header-brand {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: var(--primary-light, #d0f0ec);
            color: var(--primary, #1a9b8c);
            padding: 8px 16px;
            border-radius: 10px;
            font-family: 'Poppins', sans-serif;
            font-weight: 800;
            font-size: 1.15rem;
            margin-bottom: 20px;
            letter-spacing: 0.05em;
        }
        .policy-doc-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 24px 0;
        }
        .policy-doc-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 18px;
            background: var(--bg2, #f0faf8);
            border: 1px solid var(--border, #c5e8e3);
            border-radius: var(--radius-sm, 10px);
            transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
            text-decoration: none;
            color: var(--text, #1a3a35);
            font-weight: 700;
            font-size: 0.88rem;
        }
        .policy-doc-item:hover {
            border-color: var(--primary, #1a9b8c);
            background: var(--white, #ffffff);
            transform: translateY(-2px);
            box-shadow: 0 6px 14px rgba(26,155,140,0.08);
            color: var(--primary-dark, #127a6d);
        }
        .policy-checkbox-container {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            cursor: pointer;
            user-select: none;
            margin-bottom: 30px;
        }
        .policy-checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid var(--border, #c5e8e3);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--white, #ffffff);
            transition: all 0.2s ease;
            flex-shrink: 0;
            margin-top: 2px;
        }
        .policy-checkbox-active {
            background: var(--primary, #1a9b8c);
            border-color: var(--primary, #1a9b8c);
            color: var(--white, #ffffff);
        }

        @keyframes fadeInOverlay {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes scaleUpModal {
            from { opacity: 0; transform: scale(0.96) translateY(12px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Responsiveness and grid systems */
        @media (max-width: 600px) {
            .responsive-grid {
                grid-template-columns: 1fr !important;
            }
            .responsive-grid > div {
                grid-column: span 1 !important;
            }
            .stepper-container {
                padding: 24px 20px 20px !important;
            }
            .step-label {
                font-size: 0.7rem;
            }
            .stepper-line-bg, .stepper-line-progress {
                top: 40px !important;
                left: 36px !important;
                right: 36px !important;
            }
            .step-circle {
                width: 32px;
                height: 32px;
                font-size: 0.85rem;
            }
            .modal-alert-card {
                padding: 30px 20px;
            }
        }
    `}</style>
);

// ── CONTROLADOR PRINCIPAL DEL FORMULARIO REDISEÑADO ──

export default function RegistroCandidatosForm() {
    const [form, setForm] = useState(EMPTY);
    const [fotografiaFile, setFotografiaFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [step, setStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ciudades, setCiudades] = useState([]);
    const [proyectos, setProyectos] = useState([]);
    const [catalogosLoading, setCatalogosLoading] = useState(true);
    const [registroEstado, setRegistroEstado] = useState(null);
    
    // Estados para consentimiento de datos y privacidad
    const [consentAccepted, setConsentAccepted] = useState(false);
    const [consentDeclined, setConsentDeclined] = useState(false);
    const [consentChecked, setConsentChecked] = useState(false);

    const tokenParam =
        new URLSearchParams(window.location.search).get("token") ?? "";

    useEffect(() => {
        const url = tokenParam
            ? `/api/registro/catalogos?token=${encodeURIComponent(tokenParam)}`
            : "/api/registro/catalogos";
        fetch(url)
            .then((r) => r.json())
            .then((data) => {
                setCiudades(data.ciudades ?? []);
                setProyectos(data.proyectos ?? []);
                if (data.negocio) {
                    setForm((p) => ({ ...p, negocio: data.negocio }));
                }
                setRegistroEstado(data.estado ?? null);
            })
            .catch(() => {})
            .finally(() => setCatalogosLoading(false));
    }, []);

    const set = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
    };

    // ── VALIDACIÓN INDIVIDUAL DE CAMPOS POR CADA PASO ──
    
    const validateStep = (stepNum) => {
        const e = {};
        if (stepNum === 1) {
            if (!form.nombres.trim()) e.nombres = "Campo obligatorio";
            if (!form.apellidos.trim()) e.apellidos = "Campo obligatorio";
            if (!form.documento.trim()) {
                e.documento = "Campo obligatorio";
            } else if (!/^\d+$/.test(form.documento.trim())) {
                e.documento = "Solo números, sin espacios, puntos (.) ni comas (,)";
            }
            if (!form.fecha_expedicion) e.fecha_expedicion = "Campo obligatorio";
            if (!form.edad) {
                e.edad = "Campo obligatorio";
            } else if (
                isNaN(Number(form.edad)) ||
                Number(form.edad) < 14 ||
                Number(form.edad) > 80
            ) {
                e.edad = "Ingresa una edad válida (entre 14 y 80 años)";
            }
            if (!form.genero) e.genero = "Selecciona un género";
        } else if (stepNum === 2) {
            if (!form.celular.trim()) {
                e.celular = "Campo obligatorio";
            } else if (!/^\d{10}$/.test(form.celular.trim())) {
                e.celular = "Ingresa un número celular de 10 dígitos";
            }
            if (!form.correo.trim()) {
                e.correo = "Campo obligatorio";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
                e.correo = "Ingresa un correo electrónico válido";
            }
            if (!form.ciudad_id) e.ciudad_id = "Selecciona una ciudad";
        }
        return e;
    };

    const handleNextStep = () => {
        const stepErrors = validateStep(step);
        if (Object.keys(stepErrors).length > 0) {
            setErrors(stepErrors);
            setTimeout(() => {
                const firstError = document.querySelector('[data-error="true"]');
                if (firstError) {
                    firstError.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                }
            }, 50);
            return;
        }
        setErrors({});
        setStep(step + 1);
    };

    const handleDecline = () => {
        setConsentDeclined(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validar todos los pasos en el envío definitivo
        const errs1 = validateStep(1);
        const errs2 = validateStep(2);
        const errs = { ...errs1, ...errs2 };
        
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            // Salta al paso donde esté el primer error
            if (Object.keys(errs1).length > 0) {
                setStep(1);
            } else if (Object.keys(errs2).length > 0) {
                setStep(2);
            }
            
            setTimeout(() => {
                const firstError = document.querySelector('[data-error="true"]');
                if (firstError) {
                    firstError.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                }
            }, 100);
            return;
        }
        
        setLoading(true);
        try {
            const csrfToken = document.querySelector(
                'meta[name="csrf-token"]',
            )?.content;

            const fd = new FormData();
            Object.entries({ ...form, token: tokenParam }).forEach(([k, v]) => {
                if (v !== null && v !== undefined) fd.append(k, v);
            });
            if (fotografiaFile) fd.append("fotografia", fotografiaFile);

            const res = await fetch("/api/candidatos/registro", {
                method: "POST",
                headers: {
                    "X-CSRF-TOKEN": csrfToken ?? "",
                    Accept: "application/json",
                },
                body: fd,
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message ?? "Error del servidor");
            }
            setSubmitted(true);
        } catch (err) {
            alert("Error al enviar el formulario: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── PANTALLA: DECLINADO (RECHAZO DE TRATAMIENTO DE DATOS) ──

    if (consentDeclined) {
        return (
            <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 10% 20%, rgba(26, 155, 140, 0.05) 0%, rgba(240, 250, 248, 0.4) 90%), #e8f8f5", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Nunito, sans-serif" }}>
                <FormStyles />
                <div className="state-card" style={{ borderColor: "#fde8e8", maxWidth: 500 }}>
                    <div className="state-icon-circle" style={{ background: "#fde8e8", color: "#c0392b", animationName: "pulseCancelada" }}>
                        ✕
                    </div>
                    <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#c0392b", margin: "0 0 16px" }}>
                        Autorización Requerida
                    </h2>
                    <p style={{ color: "var(--text-muted, #5a7a75)", fontSize: "0.93rem", lineHeight: 1.7, margin: "0 0 20px" }}>
                        Lamentamos no poder continuar con el proceso de selección. De acuerdo con la Ley 1581 de 2012, es indispensable aceptar las políticas de tratamiento de datos y privacidad para poder registrar tu postulación en nuestra base de datos.
                    </p>
                    <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
                        <button
                            type="button"
                            className="btn-modern-secondary"
                            onClick={() => setConsentDeclined(false)}
                        >
                            Volver a autorizar tratamiento de datos
                        </button>
                    </div>
                </div>
                <style>{`
                    @keyframes pulseCancelada {
                        0% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.25); }
                        70% { box-shadow: 0 0 0 12px rgba(192, 57, 43, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0); }
                    }
                `}</style>
            </div>
        );
    }

    // ── PANTALLA: CARGANDO ──

    if (catalogosLoading && tokenParam) {
        return (
            <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 10% 20%, rgba(26, 155, 140, 0.05) 0%, rgba(240, 250, 248, 0.4) 90%), #e8f8f5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Nunito, sans-serif", color: "var(--text-muted, #5a7a75)" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 44, height: 44, border: "4px solid var(--border, #c5e8e3)", borderTopColor: "var(--primary, #1a9b8c)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    <span style={{ fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.03em" }}>Cargando catálogo...</span>
                </div>
                <style>{`
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    // ── PANTALLA: REQUISICIÓN COMPLETADA ──

    if (registroEstado === 'Completada') {
        return (
            <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 10% 20%, rgba(26, 155, 140, 0.05) 0%, rgba(240, 250, 248, 0.4) 90%), #e8f8f5", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Nunito, sans-serif" }}>
                <FormStyles />
                <div className="state-card">
                    <div className="state-icon-circle" style={{ background: "var(--primary-light, #d0f0ec)", color: "var(--primary, #1a9b8c)" }}>
                        ✓
                    </div>
                    <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "var(--primary, #1a9b8c)", margin: "0 0 16px", letterSpacing: "0.02em" }}>
                        Requisición completada
                    </h2>
                    <p style={{ color: "var(--text-muted, #5a7a75)", fontSize: "0.98rem", lineHeight: 1.8, margin: "0 0 24px" }}>
                        El proceso de selección para esta vacante ha finalizado exitosamente. Ya no es posible recibir nuevas postulaciones.
                    </p>
                    <div style={{ height: 1.5, background: "var(--border, #c5e8e3)", width: "60px", margin: "0 auto 24px" }} />
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted, #5a7a75)", margin: 0, fontStyle: "italic" }}>
                        S&amp;M Servicios y Mercadeo S.A.S.
                    </p>
                </div>
            </div>
        );
    }

    // ── PANTALLA: REQUISICIÓN CANCELADA ──

    if (registroEstado === 'Cancelada') {
        return (
            <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 10% 20%, rgba(26, 155, 140, 0.05) 0%, rgba(240, 250, 248, 0.4) 90%), #e8f8f5", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Nunito, sans-serif" }}>
                <FormStyles />
                <div className="state-card" style={{ borderColor: "#fde8e8" }}>
                    <div className="state-icon-circle" style={{ background: "#fde8e8", color: "#c0392b", animationName: "pulseCancelada" }}>
                        ✕
                    </div>
                    <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: "1.6rem", color: "#c0392b", margin: "0 0 16px", letterSpacing: "0.02em" }}>
                        Requisición cancelada
                    </h2>
                    <p style={{ color: "var(--text-muted, #5a7a75)", fontSize: "0.98rem", lineHeight: 1.8, margin: "0 0 24px" }}>
                        Este proceso de selección ha sido cancelado y no se están aceptando nuevas postulaciones.
                    </p>
                    <div style={{ height: 1.5, background: "#fde8e8", width: "60px", margin: "0 auto 24px" }} />
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted, #5a7a75)", margin: 0, fontStyle: "italic" }}>
                        S&amp;M Servicios y Mercadeo S.A.S.
                    </p>
                </div>
                <style>{`
                    @keyframes pulseCancelada {
                        0% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.25); }
                        70% { box-shadow: 0 0 0 12px rgba(192, 57, 43, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0); }
                    }
                `}</style>
            </div>
        );
    }

    // ── PANTALLA: REGISTRO EXITOSO ──

    if (submitted) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    background: "radial-gradient(circle at 10% 20%, rgba(26, 155, 140, 0.05) 0%, rgba(240, 250, 248, 0.4) 90%), #e8f8f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 24,
                    fontFamily: "Nunito, sans-serif",
                }}
            >
                <FormStyles />
                <div className="state-card">
                    <div className="state-icon-circle" style={{ background: "var(--primary-light, #d0f0ec)", color: "var(--primary, #1a9b8c)" }}>
                        ✓
                    </div>
                    <h2
                        style={{
                            fontFamily: "'Poppins', sans-serif",
                            fontWeight: 800,
                            fontSize: "1.6rem",
                            color: "var(--primary, #1a9b8c)",
                            margin: "0 0 16px",
                            letterSpacing: "0.02em",
                        }}
                    >
                        ¡Registro exitoso!
                    </h2>
                    <p
                        style={{
                            color: "var(--text-muted, #5a7a75)",
                            fontSize: "0.98rem",
                            lineHeight: 1.8,
                            margin: "0 0 24px",
                        }}
                    >
                        Tu información ha sido registrada correctamente. Nos pondremos en contacto contigo próximamente para coordinar las pruebas y confirmar los detalles del proceso de selección.
                    </p>
                    
                    <div 
                        style={{
                            background: "var(--bg2, #f0faf8)",
                            border: "1px solid var(--border, #c5e8e3)",
                            borderRadius: "var(--radius-sm, 10px)",
                            padding: "14px 20px",
                            fontSize: "0.88rem",
                            color: "var(--primary-dark, #127a6d)",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            animation: "fadeIn 0.6s ease"
                        }}
                    >
                        <span>✦</span> ¡Muchas gracias por tu postulación! <span>✦</span>
                    </div>
                </div>
            </div>
        );
    }

    // ── VISTA PRINCIPAL: FORMULARIO MULTI-STEP Y ALERTA MODAL ──

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "radial-gradient(circle at 10% 20%, rgba(26, 155, 140, 0.05) 0%, rgba(240, 250, 248, 0.4) 90%), #e8f8f5",
                fontFamily: "Nunito, sans-serif",
                paddingBottom: 64,
            }}
        >
            <FormStyles />

            {/* ── MODAL ALERT DE TRATAMIENTO DE DATOS (OBLIGATORIO AL INICIO) ── */}
            {!consentAccepted && (
                <div className="modal-overlay">
                    <div className="modal-alert-card">
                        <div className="modal-header-brand">
                            S&amp;M
                        </div>
                        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: "1.25rem", color: "var(--primary, #1a9b8c)", margin: "0 0 12px", lineHeight: 1.3 }}>
                            Autorización de Tratamiento de Datos
                        </h2>
                        <p style={{ color: "var(--text-muted, #5a7a75)", fontSize: "0.88rem", lineHeight: 1.6, margin: "0 0 20px" }}>
                            Para iniciar tu postulación en <strong>S&amp;M Servicios y Mercadeo S.A.S.</strong>, es obligatorio revisar y autorizar el tratamiento de tus datos personales, de acuerdo con la Ley 1581 de 2012 y nuestras políticas oficiales.
                        </p>

                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted, #5a7a75)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                            Documentos de Políticas Corporativas:
                        </div>

                        {/* Listado de políticas conectadas a servimercadeo.com */}
                        <div className="policy-doc-list">
                            <a 
                                href="https://servimercadeo.com/wp-content/uploads/2026/01/autorizacion-tratamiento-de-datos.pdf" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="policy-doc-item"
                            >
                                <span>1. Autorización Tratamiento de Datos</span>
                                <span style={{ fontSize: "1.1rem" }}>🡥</span>
                            </a>
                            <a 
                                href="https://servimercadeo.com/wp-content/uploads/2026/01/aviso-privacidad.pdf" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="policy-doc-item"
                            >
                                <span>2. Aviso de Privacidad</span>
                                <span style={{ fontSize: "1.1rem" }}>🡥</span>
                            </a>
                            <a 
                                href="https://servimercadeo.com/wp-content/uploads/2026/01/CX-POL-DP-01-POLITICA-DE-TRATAMIENTO-DE-DATOS-PERSONALES.pdf" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="policy-doc-item"
                            >
                                <span>3. Política de Tratamiento de Datos</span>
                                <span style={{ fontSize: "1.1rem" }}>🡥</span>
                            </a>
                        </div>

                        {/* Checkbox interactivo */}
                        <div 
                            className="policy-checkbox-container"
                            onClick={() => setConsentChecked(!consentChecked)}
                        >
                            <div className={`policy-checkbox ${consentChecked ? 'policy-checkbox-active' : ''}`}>
                                {consentChecked && "✓"}
                            </div>
                            <span style={{ fontSize: "0.82rem", color: "var(--text, #1a3a35)", lineHeight: 1.5, fontWeight: 600 }}>
                                He leído, comprendo y autorizo expresamente el tratamiento de mis datos personales según los términos y políticas detalladas arriba.
                            </span>
                        </div>

                        {/* Botones de acción */}
                        <div style={{ display: "flex", gap: 16, justifyContent: "flex-end" }}>
                            <button 
                                type="button" 
                                className="btn-modern-secondary" 
                                onClick={handleDecline}
                                style={{ padding: "10px 20px" }}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button" 
                                className="btn-modern-primary" 
                                disabled={!consentChecked}
                                onClick={() => setConsentAccepted(true)}
                                style={{ padding: "11px 24px" }}
                            >
                                Aceptar y Continuar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Banner Premium Compacto ── */}
            <div 
                style={{ 
                    background: "linear-gradient(135deg, var(--primary, #1a9b8c) 0%, var(--primary-dark, #127a6d) 100%)",
                    boxShadow: "0 4px 30px rgba(26, 155, 140, 0.15)",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* Luces decorativas */}
                <div 
                    style={{
                        position: "absolute",
                        top: "-50%",
                        right: "-10%",
                        width: "280px",
                        height: "280px",
                        background: "rgba(255, 255, 255, 0.06)",
                        filter: "blur(60px)",
                        borderRadius: "50%",
                        pointerEvents: "none",
                    }}
                />
                
                <div
                    style={{
                        maxWidth: 760,
                        margin: "0 auto",
                        padding: "36px 24px 54px",
                        position: "relative",
                        zIndex: 2,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            marginBottom: 12,
                        }}
                    >
                        <div
                            style={{
                                background: "rgba(255, 255, 255, 0.15)",
                                backdropFilter: "blur(8px)",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                borderRadius: 12,
                                padding: "10px 14px",
                                fontFamily: "'Poppins', sans-serif",
                                fontWeight: 800,
                                fontSize: "1.15rem",
                                color: "#fff",
                                letterSpacing: "0.06em",
                                flexShrink: 0,
                                boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
                            }}
                        >
                            S&amp;M
                        </div>
                        <div style={{ flexGrow: 1 }}>
                            <h1
                                style={{
                                    fontFamily: "'Poppins', sans-serif",
                                    fontWeight: 700,
                                    fontSize: "1.25rem",
                                    color: "#fff",
                                    margin: 0,
                                    letterSpacing: "0.03em",
                                    textTransform: "uppercase",
                                    lineHeight: 1.2,
                                }}
                            >
                                Registro de Candidatos
                            </h1>
                            <span
                                style={{
                                    fontWeight: 600,
                                    fontSize: "0.82rem",
                                    color: "rgba(255,255,255,0.9)",
                                    letterSpacing: "0.02em",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    marginTop: 3,
                                }}
                            >
                                <span style={{ display: "inline-block", width: 7, height: 7, background: "#f5a623", borderRadius: "50%" }}></span>
                                Proceso de Selección Activo
                            </span>
                        </div>
                    </div>
                    
                    <p
                        style={{
                            color: "rgba(255,255,255,0.8)",
                            fontSize: "0.85rem",
                            margin: 0,
                            lineHeight: 1.6,
                            fontWeight: 400,
                            maxWidth: "640px"
                        }}
                    >
                        ¡Te damos la bienvenida a S&amp;M Servicios y Mercadeo S.A.S.! Completa este formulario interactivo de selección para registrar tus datos, programar pruebas y continuar en el proceso.
                    </p>
                </div>
            </div>

            {/* ── Tarjeta del Formulario ── */}
            <div
                style={{
                    maxWidth: 760,
                    margin: "-28px auto 0",
                    padding: "0 16px 56px",
                    position: "relative",
                    zIndex: 10,
                }}
            >
                <div
                    style={{
                        background: "var(--white, #fff)",
                        borderRadius: "var(--radius, 16px)",
                        boxShadow: "0 15px 45px rgba(26, 155, 140, 0.08), 0 2px 8px rgba(26, 155, 140, 0.03)",
                        border: "1.5px solid var(--border, #c5e8e3)",
                        overflow: "hidden",
                    }}
                >
                    {/* Stepper Progress Bar - Cabecera superior de la tarjeta */}
                    <div className="stepper-container">
                        <div className="stepper-line-bg" />
                        <div 
                            className="stepper-line-progress" 
                            style={{ width: `${((step - 1) / 2) * 100}%` }} 
                        />
                        
                        <div className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`} onClick={() => step > 1 && setStep(1)}>
                            <div className="step-circle">
                                {step > 1 ? "✓" : "1"}
                            </div>
                            <div className="step-label">Datos</div>
                        </div>
                        
                        <div className={`step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`} onClick={() => step > 2 && setStep(2)}>
                            <div className="step-circle">
                                {step > 2 ? "✓" : "2"}
                            </div>
                            <div className="step-label">Contacto</div>
                        </div>
                        
                        <div className={`step-item ${step === 3 ? 'active' : ''}`} onClick={() => {
                            const errs1 = validateStep(1);
                            const errs2 = validateStep(2);
                            if (Object.keys(errs1).length === 0 && Object.keys(errs2).length === 0) {
                                setStep(3);
                            }
                        }}>
                            <div className="step-circle">3</div>
                            <div className="step-label">Puesto</div>
                        </div>
                    </div>

                    {/* Formulario */}
                    <form
                        onSubmit={handleSubmit}
                        noValidate
                        style={{ padding: "36px 36px 40px" }}
                    >
                        {/* ── PASO 1: DATOS PERSONALES (REORDENADOS) ── */}
                        {step === 1 && (
                            <div className="animate-fade-in">
                                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--primary, #1a9b8c)", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ background: "var(--primary-light, #d0f0ec)", color: "var(--primary, #1a9b8c)", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 800 }}>1</span>
                                    Datos Personales e Identificación
                                </h2>
                                
                                <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
                                    
                                    {/* Nombres completos */}
                                    <div>
                                        <Field
                                            label="1. Nombres completos"
                                            hint="Relaciona tus nombres completos en MAYÚSCULA."
                                            required
                                            error={errors.nombres}
                                        >
                                            <div className="form-input-wrapper">
                                                <input
                                                    data-error={!!errors.nombres}
                                                    className={`form-input ${errors.nombres ? 'form-input-error' : ''}`}
                                                    type="text"
                                                    value={form.nombres}
                                                    onChange={(e) =>
                                                        set("nombres", e.target.value.toUpperCase())
                                                    }
                                                />
                                                <span className="form-input-icon"><IconUser /></span>
                                            </div>
                                        </Field>
                                    </div>
                                    
                                    {/* Apellidos completos */}
                                    <div>
                                        <Field
                                            label="2. Apellidos completos"
                                            hint="Relaciona tus apellidos completos en MAYÚSCULA."
                                            required
                                            error={errors.apellidos}
                                        >
                                            <div className="form-input-wrapper">
                                                <input
                                                    data-error={!!errors.apellidos}
                                                    className={`form-input ${errors.apellidos ? 'form-input-error' : ''}`}
                                                    type="text"
                                                    value={form.apellidos}
                                                    onChange={(e) =>
                                                        set(
                                                            "apellidos",
                                                            e.target.value.toUpperCase(),
                                                        )
                                                    }
                                                />
                                                <span className="form-input-icon"><IconUser /></span>
                                            </div>
                                        </Field>
                                    </div>

                                    {/* Documento */}
                                    <div>
                                        <Field
                                            label="3. Número de documento"
                                            hint="Documento sin espacios, puntos (.) ni comas (,)."
                                            required
                                            error={errors.documento}
                                        >
                                            <div className="form-input-wrapper">
                                                <input
                                                    data-error={!!errors.documento}
                                                    className={`form-input ${errors.documento ? 'form-input-error' : ''}`}
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={form.documento}
                                                    onChange={(e) =>
                                                        set(
                                                            "documento",
                                                            e.target.value.replace(/[^\d]/g, ""),
                                                        )
                                                    }
                                                />
                                                <span className="form-input-icon"><IconDoc /></span>
                                            </div>
                                        </Field>
                                    </div>
                                    
                                    {/* Fecha expedicion */}
                                    <div>
                                        <Field
                                            label="4. Fecha de expedición del documento"
                                            hint="Selecciona la fecha de expedición."
                                            required
                                            error={errors.fecha_expedicion}
                                        >
                                            <div className="form-input-wrapper">
                                                <input
                                                    data-error={!!errors.fecha_expedicion}
                                                    className={`form-input ${errors.fecha_expedicion ? 'form-input-error' : ''}`}
                                                    type="date"
                                                    value={form.fecha_expedicion}
                                                    onChange={(e) =>
                                                        set("fecha_expedicion", e.target.value)
                                                    }
                                                />
                                                <span className="form-input-icon"><IconCalendar /></span>
                                            </div>
                                        </Field>
                                    </div>
                                    
                                    {/* Edad */}
                                    <div>
                                        <Field
                                            label="5. Edad"
                                            hint="Cuéntanos cuántos años tienes."
                                            required
                                            error={errors.edad}
                                        >
                                            <div className="form-input-wrapper" style={{ maxWidth: 220 }}>
                                                <input
                                                    data-error={!!errors.edad}
                                                    className={`form-input ${errors.edad ? 'form-input-error' : ''}`}
                                                    type="number"
                                                    min="14"
                                                    max="80"
                                                    value={form.edad}
                                                    onChange={(e) => set("edad", e.target.value)}
                                                />
                                                <span className="form-input-icon"><IconAge /></span>
                                            </div>
                                        </Field>
                                    </div>

                                    {/* Género */}
                                    <div>
                                        <Field
                                            label="6. Género"
                                            hint="Selecciona tu género."
                                            required
                                            error={errors.genero}
                                        >
                                            <div className="form-input-wrapper">
                                                <select
                                                    data-error={!!errors.genero}
                                                    className={`form-input ${errors.genero ? 'form-input-error' : ''}`}
                                                    value={form.genero}
                                                    onChange={(e) => set("genero", e.target.value)}
                                                    style={{ appearance: "auto" }}
                                                >
                                                    <option value="">Selecciona…</option>
                                                    <option value="Masculino">Masculino</option>
                                                    <option value="Femenino">Femenino</option>
                                                    <option value="Otro">Otro</option>
                                                </select>
                                                <span className="form-input-icon">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                                    </svg>
                                                </span>
                                            </div>
                                        </Field>
                                    </div>

                                    {/* Fotografía */}
                                    <div style={{ gridColumn: "span 2" }}>
                                        <Field
                                            label="7. Fotografía"
                                            hint="Sube una foto reciente tuya (JPG, PNG o WEBP, máx. 5 MB)."
                                        >
                                            <label
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 14,
                                                    padding: "10px 14px",
                                                    border: "1.5px dashed var(--border, #c5e8e3)",
                                                    borderRadius: "var(--radius-sm, 10px)",
                                                    cursor: "pointer",
                                                    background: fotografiaFile ? "var(--bg2, #f0faf8)" : "var(--white, #fff)",
                                                    transition: "all 0.2s ease",
                                                }}
                                            >
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary, #1a9b8c)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                                                </svg>
                                                <span style={{ fontSize: "0.88rem", fontFamily: "Nunito, sans-serif", color: fotografiaFile ? "var(--primary, #1a9b8c)" : "var(--text-muted, #5a7a75)", fontWeight: fotografiaFile ? 700 : 500 }}>
                                                    {fotografiaFile ? fotografiaFile.name : "Seleccionar imagen…"}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: "none" }}
                                                    onChange={(e) => setFotografiaFile(e.target.files[0] || null)}
                                                />
                                            </label>
                                        </Field>
                                    </div>
                                </div>

                                {/* Nota de privacidad integrada compacta */}
                                <div className="compact-privacy-footer">
                                    <IconShield />
                                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted, #5a7a75)", lineHeight: 1.4, fontWeight: 500 }}>
                                        Tus datos personales están protegidos de acuerdo con la ley de protección de datos personales.
                                    </span>
                                </div>
                                
                                {/* Navegación */}
                                <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                                    <button
                                        type="button"
                                        className="btn-modern-primary"
                                        onClick={handleNextStep}
                                    >
                                        Continuar
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                            <polyline points="12 5 19 12 12 19" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── PASO 2: INFORMACIÓN DE CONTACTO ── */}
                        {step === 2 && (
                            <div className="animate-fade-in">
                                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--primary, #1a9b8c)", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ background: "var(--primary-light, #d0f0ec)", color: "var(--primary, #1a9b8c)", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 800 }}>2</span>
                                    Información de Contacto y Residencia
                                </h2>
                                
                                <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
                                    {/* Celular */}
                                    <div>
                                        <Field
                                            label="6. Número celular"
                                            hint="Número celular de 10 dígitos para contactarte."
                                            required
                                            error={errors.celular}
                                        >
                                            <div className="form-input-wrapper">
                                                <input
                                                    data-error={!!errors.celular}
                                                    className={`form-input ${errors.celular ? 'form-input-error' : ''}`}
                                                    type="tel"
                                                    inputMode="numeric"
                                                    value={form.celular}
                                                    onChange={(e) =>
                                                        set(
                                                            "celular",
                                                            e.target.value
                                                                .replace(/\D/g, "")
                                                                .slice(0, 10),
                                                        )
                                                    }
                                                />
                                                <span className="form-input-icon"><IconPhone /></span>
                                            </div>
                                        </Field>
                                    </div>
                                    
                                    {/* Correo */}
                                    <div>
                                        <Field
                                            label="7. Correo electrónico"
                                            hint="Correo electrónico personal activo."
                                            required
                                            error={errors.correo}
                                        >
                                            <div className="form-input-wrapper">
                                                <input
                                                    data-error={!!errors.correo}
                                                    className={`form-input ${errors.correo ? 'form-input-error' : ''}`}
                                                    type="email"
                                                    value={form.correo}
                                                    onChange={(e) => set("correo", e.target.value)}
                                                />
                                                <span className="form-input-icon"><IconMail /></span>
                                            </div>
                                        </Field>
                                    </div>
                                    
                                    {/* Ciudad */}
                                    <div style={{ gridColumn: "span 2" }}>
                                        <Field
                                            label="8. Ciudad de residencia"
                                            hint="Selecciona la ciudad donde resides actualmente."
                                            required
                                            error={errors.ciudad_id}
                                        >
                                            <div 
                                                className={`form-input-wrapper searchable-select-custom ${errors.ciudad_id ? 'searchable-select-custom-error' : ''}`}
                                                style={{ display: "block" }}
                                            >
                                                <SearchableSelect
                                                    value={form.ciudad_id}
                                                    defaultValue=""
                                                    options={ciudades.map((c) => ({
                                                        value: String(c.id),
                                                        label: c.nombre,
                                                    }))}
                                                    onChange={(v) => set("ciudad_id", v)}
                                                />
                                                <span className="form-input-icon" style={{ zIndex: 10, top: "14px" }}><IconMapPin /></span>
                                            </div>
                                        </Field>
                                    </div>
                                </div>
                                
                                {/* Navegación */}
                                <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", gap: 16 }}>
                                    <button
                                        type="button"
                                        className="btn-modern-secondary"
                                        onClick={() => setStep(1)}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="19" y1="12" x2="5" y2="12" />
                                            <polyline points="12 19 5 12 12 5" />
                                        </svg>
                                        Atrás
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-modern-primary"
                                        onClick={handleNextStep}
                                    >
                                        Continuar
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                            <polyline points="12 5 19 12 12 19" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── PASO 3: CONFIRMACIÓN Y VACANTE ── */}
                        {step === 3 && (
                            <div className="animate-fade-in">
                                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--primary, #1a9b8c)", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ background: "var(--primary-light, #d0f0ec)", color: "var(--primary, #1a9b8c)", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 800 }}>3</span>
                                    Confirmación de Postulación
                                </h2>
                                
                                <div style={{ marginBottom: 24 }}>
                                    <Field
                                        label="9. Negocio al que se postula"
                                        hint="Esta es la vacante vinculada a tu link de registro. No es modificable."
                                        required
                                    >
                                        <div className="form-input-wrapper">
                                            <input
                                                type="text"
                                                value={form.negocio}
                                                readOnly
                                                disabled
                                                className="form-input"
                                                style={{
                                                    background: "var(--bg2, #f0faf8) !important",
                                                    color: "var(--text-muted, #5a7a75) !important",
                                                    cursor: "not-allowed",
                                                    userSelect: "none",
                                                }}
                                            />
                                            <span className="form-input-icon"><IconBriefcase /></span>
                                        </div>
                                    </Field>
                                </div>
                                
                                {/* Tarjeta Informativa Final */}
                                <div 
                                    style={{
                                        background: "rgba(26, 155, 140, 0.04)",
                                        border: "1.5px dashed var(--primary, #1a9b8c)",
                                        borderRadius: "var(--radius-sm, 10px)",
                                        padding: "16px 20px",
                                        marginBottom: 28,
                                        display: "flex",
                                        gap: 12,
                                        alignItems: "center"
                                    }}
                                >
                                    <span style={{ color: "var(--primary, #1a9b8c)" }}><IconInfo /></span>
                                    <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted, #5a7a75)", lineHeight: 1.5 }}>
                                        Por favor, verifica que todos tus datos sean correctos antes de enviar. Si necesitas corregir algo, puedes retroceder usando el botón "Atrás" o pulsando directamente sobre los pasos en la barra superior.
                                    </p>
                                </div>
                                
                                {/* Navegación */}
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                                    <button
                                        type="button"
                                        className="btn-modern-secondary"
                                        onClick={() => setStep(2)}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="19" y1="12" x2="5" y2="12" />
                                            <polyline points="12 19 5 12 12 5" />
                                        </svg>
                                        Atrás
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-modern-primary"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="animate-spin" style={{ display: "inline-block", width: 18, height: 18, border: "2.5px solid #fff", borderTopColor: "transparent", borderRadius: "50%" }} />
                                                Registrando...
                                            </>
                                        ) : (
                                            <>
                                                Enviar Postulación
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="22" y1="2" x2="11" y2="13" />
                                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                                </svg>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
