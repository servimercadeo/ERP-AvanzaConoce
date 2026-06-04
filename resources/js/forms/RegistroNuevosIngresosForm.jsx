import React, { useState } from "react";

const ESTADO_CIVIL_OPTS = ["SOLTERO", "CASADO", "DIVORCIADO", "VIUDO"];
const HIJOS_OPTS = ["0", "1", "2", "3", "4", "5", "6"];
const TIPO_SANGRE_OPTS = ["A+", "O+", "B+", "AB+", "A-", "O-", "B-", "AB-"];
const ESCOLARIDAD_OPTS = ["PREESCOLAR", "PRIMARIA", "SECUNDARIA", "TECNICO", "TECNOLOGO", "PROFESIONAL", "POSGRADO"];
const CIUDAD_OPTS = [
    "ARMENIA","APARTADÓ","BARRANCABERMEJA","BARRANQUILLA","BOGOTÁ","BOSA","BUCARAMANGA",
    "CALDAS","CALI","CARTAGENA","CARTAGO","CUCÚTA","CUENCA","DOSQUEBRADAS","ENGATIVÁ",
    "FACATATIVA","FLORIDABLANCA","FUSAGASUGA","GIRARDOT","GUAYAQUIL","ITAGUI","JAMUNDI",
    "LA VIRGINIA","MANIZALES","MARINILLA","MEDELLIN","MONTERIA","PALMIRA","PASTO",
    "PENSILVANIA","PEREIRA","POPAYAN","QUITO","RIONEGRO","SINCELEJO","SOACHA","TUMACO","VALLEDUPAR"
];
const ESTRATO_OPTS = ["1", "2", "3", "4", "5", "6"];
const PARENTESCO_OPTS = ["PADRE O MADRE","HERMANO O HERMANA","ESPOSO O ESPOSA","TIO O TIA","SOBRINO O SOBRINA","HIJO O HIJA"];
const EPS_OPTS = [
    "ALIANSALUD EPS (ANTES COLMÉDICA)","CAFESALUD","COMFENALCO VALLE","COMPENSAR","COOMEVA",
    "CRUZ BLANCA","EMPRESAS PÚBLICAS DE MEDELLÍN DEPARTAMENTO MÉDICO","EPS SURA","FAMISANAR",
    "FONDO DE FERROCARRILES NACIONALES DE COLOMBIA (EPS)","FOSYGA","FOSYGA RÉGIMEN DE EXCEPCIÓN",
    "FOSYGA RESIDENTE EXTERIOR O RÉGIMEN SUBSIDIADO","NUEVA E.P.S.",
    "S.O.S. SERVICIO OCCIDENTAL DE SALUD S.A.","SALUD TOTAL","SALUDVIDA","SANITAS",
    "UNIVERSIDAD DE ANTIOQUIA","UNIVERSIDAD DE CÓRDOBA","UNIVERSIDAD DEL ATLÁNTICO",
    "UNIVERSIDAD DEL CAUCA","UNIVERSIDAD DEL VALLE","UNIVERSIDAD INDUSTRIAL DE SANTANDER",
    "UNIVERSIDAD NACIONAL DE COLOMBIA","UNIVERSIDAD PEDAGÓGICA - UPTC","A.I.C.","AMBUQ",
    "ANAS WAYUU","ASMET SALUD","CAFESALUD - MOVILIDAD","CAJACOPI ATLÁNTICO","CAPITAL SALUD",
    "CAPRESOCA","COMFABOY","COMFACHOCO","COMFACOR","COMFACUNDI","COMFAMILIAR HUILA",
    "COMFAMILIAR DE NARIÑO","COMFAMILIAR GUAJIRA","COMFASUCRE","COMPARTA","CONVIDA","COOSALUD",
    "DUSAKAWI","ECOOPSOS","EMDISALUD","EMSSANAR","MALLAMAS","MANEXKA","MUTUAL SER",
    "PIJAOSALUD","SAVIA SALUD","NINGUNA"
];
const AFP_OPTS = ["CAXDAC","COLFONDOS","COLPENSIONES","FONPRECON","OLD MUTUAL","OLD MUTUAL ALTERNATIVO","PENSIONES DE ANTIOQUIA","PORVENIR","PROTECCIÓN","NINGUNO"];
const TALLA_CAMISA_OPTS = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const TALLA_PANTALON_OPTS = ["4","6","8","10","12","14","16","18","28","30","32","34","36","38","40"];
const TALLA_ZAPATOS_OPTS = ["35","36","37","38","39","40","41","42","43","44"];

const EMPTY_FORM = {
    documento: "", nombres: "", apellidos: "", fecha_expedicion_doc: "",
    fecha_nacimiento: "", lugar_nacimiento: "", estado_civil: "", numero_hijos: "",
    rh: "", nivel_escolaridad: "", profesion: "", ciudad: "", barrio: "",
    direccion: "", estrato: "", correo: "", celular: "", emergencia_nombre: "",
    emergencia_telefono: "", emergencia_parentesco: "", eps: "", afp: "",
    talla_camisa: "", talla_pantalon: "", talla_zapatos: ""
};

// ── ICONS ──
const IcoUser = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
);
const IcoDoc = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
);
const IcoCalendar = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
);
const IcoHash = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
    </svg>
);
const IcoMail = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2 4 12 13 22 4"/>
    </svg>
);
const IcoPhone = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.34 12.5 19.79 19.79 0 0 1 1.25 3.9 2 2 0 0 1 3.22 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
    </svg>
);
const IcoMapPin = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
);
const IcoCheck = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);

const FormStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Nunito:wght@400;600;700&display=swap');
        :root {
            --teal: #1a9b8c;
            --teal-dark: #157a6e;
            --teal-header: #186059;
            --teal-light: #d0f0ec;
            --teal-bg: #e8f7f5;
            --teal-muted: rgba(26,155,140,0.15);
            --border: #b8ddd9;
            --text: #1a3a35;
            --text-muted: #5a7a75;
            --white: #ffffff;
            --radius: 18px;
            --radius-sm: 10px;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(14px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
            0%,100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }
        .animate-fade-in { animation: fadeIn 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }

        .rni-page {
            min-height: 100vh;
            background: linear-gradient(160deg, #c8eeea 0%, #e8f7f5 60%, #d4ede9 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
        }
        .rni-card {
            background: var(--white);
            border-radius: var(--radius);
            box-shadow: 0 24px 56px rgba(26,155,140,0.14), 0 2px 8px rgba(26,155,140,0.08);
            border: 1.5px solid var(--border);
            width: 100%;
            max-width: 820px;
            overflow: hidden;
            animation: fadeIn 0.5s ease;
        }
        .rni-header {
            background: linear-gradient(135deg, var(--teal-header) 0%, #0f4a44 100%);
            padding: 32px 40px 36px;
            color: var(--white);
            position: relative;
            overflow: hidden;
        }
        .rni-header::before {
            content: '';
            position: absolute;
            top: -40px; right: -40px;
            width: 180px; height: 180px;
            background: rgba(255,255,255,0.05);
            border-radius: 50%;
        }
        .rni-header::after {
            content: '';
            position: absolute;
            bottom: -60px; left: -20px;
            width: 200px; height: 200px;
            background: rgba(255,255,255,0.04);
            border-radius: 50%;
        }
        .rni-logo-badge {
            width: 60px; height: 60px;
            border-radius: 14px;
            background: rgba(255,255,255,0.18);
            border: 2px solid rgba(255,255,255,0.35);
            display: flex; align-items: center; justify-content: center;
            font-family: 'Poppins', sans-serif;
            font-weight: 800; font-size: 1rem;
            color: var(--white);
            letter-spacing: 0.02em;
            flex-shrink: 0;
        }
        .rni-status-dot {
            width: 9px; height: 9px;
            border-radius: 50%;
            background: #f5c542;
            flex-shrink: 0;
            box-shadow: 0 0 6px rgba(245,197,66,0.7);
        }
        .rni-stepper {
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            padding: 22px 48px;
            background: var(--white);
            border-bottom: 1.5px solid var(--border);
        }
        .rni-step-line-bg {
            position: absolute;
            top: 38px; left: 68px; right: 68px;
            height: 3px;
            background: var(--border);
            z-index: 1; border-radius: 2px;
        }
        .rni-step-line-fill {
            position: absolute;
            top: 38px; left: 68px;
            height: 3px;
            background: var(--teal);
            z-index: 2; border-radius: 2px;
            transition: width 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .rni-step-item {
            position: relative; z-index: 3;
            display: flex; flex-direction: column;
            align-items: center; min-width: 56px;
        }
        .rni-step-circle {
            width: 34px; height: 34px;
            border-radius: 50%;
            background: var(--white);
            border: 2.5px solid var(--border);
            display: flex; align-items: center; justify-content: center;
            font-weight: 800; font-size: 0.85rem;
            color: var(--text-muted);
            transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .rni-step-item.active .rni-step-circle {
            background: var(--teal);
            border-color: var(--teal);
            color: var(--white);
            box-shadow: 0 0 0 5px rgba(26,155,140,0.2);
        }
        .rni-step-item.done .rni-step-circle {
            background: var(--teal-light);
            border-color: var(--teal);
            color: var(--teal);
        }
        .rni-step-label {
            margin-top: 7px;
            font-family: 'Poppins', sans-serif;
            font-weight: 700; font-size: 0.68rem;
            text-transform: uppercase; letter-spacing: 0.06em;
            color: var(--text-muted); text-align: center;
        }
        .rni-step-item.active .rni-step-label { color: var(--teal); }

        .rni-section-title {
            display: flex; align-items: center; gap: 12px;
            margin-bottom: 26px;
        }
        .rni-section-num {
            width: 30px; height: 30px;
            border-radius: 50%;
            background: var(--teal);
            color: var(--white);
            display: flex; align-items: center; justify-content: center;
            font-family: 'Poppins', sans-serif;
            font-weight: 800; font-size: 0.85rem;
            flex-shrink: 0;
        }

        .rni-input {
            width: 100%; padding: 11px 14px 11px 38px !important;
            border: 1.5px solid var(--border) !important;
            border-radius: var(--radius-sm) !important;
            font-size: 0.93rem !important;
            font-family: 'Nunito', sans-serif !important;
            color: var(--text) !important;
            background: var(--white) !important;
            outline: none !important;
            transition: all 0.22s cubic-bezier(0.16,1,0.3,1) !important;
            box-sizing: border-box !important;
        }
        .rni-input-noicon {
            padding-left: 14px !important;
        }
        .rni-input:focus {
            border-color: var(--teal) !important;
            box-shadow: 0 0 0 4px rgba(26,155,140,0.16) !important;
        }
        .rni-input-error {
            border-color: #e74c3c !important;
            box-shadow: 0 0 0 4px rgba(231,76,60,0.12) !important;
        }
        .rni-input-wrap {
            position: relative;
        }
        .rni-input-icon {
            position: absolute;
            left: 12px; top: 50%;
            transform: translateY(-50%);
            color: var(--teal);
            pointer-events: none;
            display: flex; align-items: center;
        }

        .rni-btn-primary {
            background: linear-gradient(135deg, var(--teal) 0%, var(--teal-dark) 100%);
            color: var(--white);
            border: none;
            border-radius: var(--radius-sm);
            padding: 12px 30px;
            font-size: 0.93rem; font-weight: 700;
            cursor: pointer;
            font-family: 'Poppins', sans-serif;
            letter-spacing: 0.03em;
            box-shadow: 0 4px 14px rgba(26,155,140,0.25);
            transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
        }
        .rni-btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 18px rgba(26,155,140,0.35);
            filter: brightness(1.06);
        }
        .rni-btn-primary:disabled {
            background: #b2c9c7;
            box-shadow: none; cursor: not-allowed; opacity: 0.7;
        }
        .rni-btn-secondary {
            background: var(--white);
            color: var(--teal);
            border: 1.5px solid var(--teal);
            border-radius: var(--radius-sm);
            padding: 11px 26px;
            font-size: 0.93rem; font-weight: 700;
            cursor: pointer;
            font-family: 'Poppins', sans-serif;
            transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
        }
        .rni-btn-secondary:hover {
            background: var(--teal-bg);
            transform: translateY(-1px);
        }

        .rni-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
        }
        .rni-consent-box {
            display: flex; gap: 12px; align-items: flex-start;
            padding: 16px 20px;
            border-left: 4px solid var(--teal);
            background: var(--teal-bg);
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
            margin-bottom: 26px;
        }
        .rni-checkbox {
            width: 22px; height: 22px;
            border: 2px solid var(--border);
            border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            background: var(--white);
            transition: all 0.2s ease;
            flex-shrink: 0; cursor: pointer;
        }
        .rni-checkbox.checked {
            background: var(--teal);
            border-color: var(--teal);
            color: var(--white);
        }
        @media (max-width: 600px) {
            .rni-grid { grid-template-columns: 1fr !important; }
            .rni-stepper { padding: 16px 20px !important; }
            .rni-step-label { display: none; }
            .rni-step-line-bg, .rni-step-line-fill { left: 38px !important; right: 38px !important; }
            .rni-header { padding: 24px 20px 28px !important; }
        }
    `}</style>
);

function Field({ label, hint, required, error, icon, children }) {
    return (
        <div style={{ marginBottom: 18 }} className={error ? "animate-shake" : ""}>
            <label style={{
                display: "block",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700, fontSize: "0.82rem",
                color: "var(--text)",
                marginBottom: 5,
                letterSpacing: "0.04em",
                textTransform: "uppercase"
            }}>
                {label}
                {required && <span style={{ color: "#e74c3c", marginLeft: 4 }}>*</span>}
            </label>
            {hint && (
                <div style={{ fontSize: "0.76rem", color: "var(--teal)", marginBottom: 7, fontWeight: 600 }}>
                    ✦ {hint}
                </div>
            )}
            {icon ? (
                <div className="rni-input-wrap">
                    <span className="rni-input-icon">{icon}</span>
                    {children}
                </div>
            ) : children}
            {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "#e74c3c", marginTop: 5, fontWeight: 600 }}>
                    <span>⚠</span><span>{error}</span>
                </div>
            )}
        </div>
    );
}

const STEPS = [
    { label: "DATOS" },
    { label: "CONTACTO" },
    { label: "EMERGENCIA" },
    { label: "SEG. SOCIAL" },
    { label: "DOTACIÓN" }
];

export default function RegistroNuevosIngresosForm() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [step, setStep] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [consentChecked, setConsentChecked] = useState(false);
    const [consentDeclined, setConsentDeclined] = useState(false);

    const set = (k, v) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: undefined }));
    };

    const validateStep = (s) => {
        const e = {};
        if (s === 1) {
            if (!form.documento.trim()) e.documento = "Campo obligatorio";
            else if (!/^\d+$/.test(form.documento.trim())) e.documento = "Sin espacios, puntos ni comas";
            if (!form.nombres.trim()) e.nombres = "Campo obligatorio";
            if (!form.apellidos.trim()) e.apellidos = "Campo obligatorio";
            if (!form.fecha_expedicion_doc) e.fecha_expedicion_doc = "Campo obligatorio";
            if (!form.fecha_nacimiento) e.fecha_nacimiento = "Campo obligatorio";
            if (!form.lugar_nacimiento.trim()) e.lugar_nacimiento = "Campo obligatorio";
            if (!form.estado_civil) e.estado_civil = "Campo obligatorio";
            if (!form.numero_hijos) e.numero_hijos = "Campo obligatorio";
            if (!form.rh) e.rh = "Campo obligatorio";
            if (!form.nivel_escolaridad) e.nivel_escolaridad = "Campo obligatorio";
            if (!form.profesion.trim()) e.profesion = "Campo obligatorio";
        } else if (s === 2) {
            if (!form.ciudad) e.ciudad = "Campo obligatorio";
            if (!form.barrio.trim()) e.barrio = "Campo obligatorio";
            if (!form.direccion.trim()) e.direccion = "Campo obligatorio";
            if (!form.estrato) e.estrato = "Campo obligatorio";
            if (!form.correo.trim()) e.correo = "Campo obligatorio";
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) e.correo = "Correo inválido";
            if (!form.celular.trim()) e.celular = "Campo obligatorio";
            else if (!/^\d{10}$/.test(form.celular.trim())) e.celular = "10 dígitos requeridos";
        } else if (s === 3) {
            if (!form.emergencia_nombre.trim()) e.emergencia_nombre = "Campo obligatorio";
            if (!form.emergencia_telefono.trim()) e.emergencia_telefono = "Campo obligatorio";
            else if (!/^\d+$/.test(form.emergencia_telefono.trim())) e.emergencia_telefono = "Solo números";
            if (!form.emergencia_parentesco) e.emergencia_parentesco = "Campo obligatorio";
        } else if (s === 4) {
            if (!form.eps) e.eps = "Campo obligatorio";
            if (!form.afp) e.afp = "Campo obligatorio";
        } else if (s === 5) {
            if (!form.talla_camisa) e.talla_camisa = "Campo obligatorio";
            if (!form.talla_pantalon) e.talla_pantalon = "Campo obligatorio";
            if (!form.talla_zapatos) e.talla_zapatos = "Campo obligatorio";
        }
        return e;
    };

    const handleNext = () => {
        const e = validateStep(step);
        if (Object.keys(e).length > 0) { setErrors(e); return; }
        setErrors({});
        setStep(step + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleBack = () => {
        setStep(step - 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        const e = validateStep(5);
        if (Object.keys(e).length > 0) { setErrors(e); return; }
        setLoading(true);
        try {
            const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
            const res = await fetch("/api/registro-nuevos-ingresos/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf ?? "", Accept: "application/json" },
                body: JSON.stringify(form)
            });
            if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message ?? "Error del servidor"); }
            setSubmitted(true);
        } catch (err) {
            alert("Error al enviar: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Declined ──
    if (consentDeclined) {
        return (
            <div className="rni-page">
                <FormStyles />
                <div className="rni-card animate-fade-in" style={{ maxWidth: 500, padding: "56px 36px", textAlign: "center", borderColor: "#fde8e8" }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fde8e8", color: "#c0392b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 24px" }}>✕</div>
                    <h2 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "#c0392b", margin: "0 0 14px" }}>Autorización Requerida</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.91rem", lineHeight: 1.7, margin: "0 0 24px" }}>
                        Para continuar con el proceso de registro es indispensable aceptar las políticas de tratamiento de datos personales de acuerdo con la Ley 1581 de 2012.
                    </p>
                    <button type="button" className="rni-btn-secondary" onClick={() => { setConsentDeclined(false); setConsentChecked(false); }}>
                        Volver a autorizar
                    </button>
                </div>
            </div>
        );
    }

    // ── Success ──
    if (submitted) {
        return (
            <div className="rni-page">
                <FormStyles />
                <div className="rni-card animate-fade-in" style={{ maxWidth: 520, padding: "60px 44px", textAlign: "center" }}>
                    <div style={{ width: 84, height: 84, borderRadius: "50%", background: "var(--teal-light)", color: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.4rem", margin: "0 auto 28px" }}>✓</div>
                    <h2 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: "1.5rem", color: "var(--teal)", margin: "0 0 14px" }}>¡Registro Completado!</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.93rem", lineHeight: 1.8, margin: "0 0 28px" }}>
                        Tus datos han sido registrados exitosamente. Nos pondremos en contacto contigo pronto para continuar con el proceso de contratación.
                    </p>
                    <div style={{ height: 1.5, background: "var(--border)", width: 60, margin: "0 auto 24px" }} />
                    <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>S&amp;M Servicios y Mercadeo S.A.S.</p>
                </div>
            </div>
        );
    }

    // ── Stepper progress ──
    const stepProgress = step > 1 ? `${((step - 1) / (STEPS.length - 1)) * 100}%` : "0%";

    return (
        <div className="rni-page">
            <FormStyles />
            <div className="rni-card">

                {/* ── Header ── */}
                <div className="rni-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18, position: "relative", zIndex: 1 }}>
                        <div className="rni-logo-badge">S&amp;M</div>
                        <div>
                            <h1 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: "1.35rem", margin: "0 0 6px", letterSpacing: "0.03em" }}>
                                REGISTRO DE CANDIDATOS
                            </h1>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div className="rni-status-dot" />
                                <span style={{ fontSize: "0.83rem", fontFamily: "'Nunito',sans-serif", fontWeight: 600, opacity: 0.9 }}>
                                    Proceso de Selección Activo
                                </span>
                            </div>
                        </div>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.88rem", opacity: 0.88, lineHeight: 1.65, fontFamily: "'Nunito',sans-serif", position: "relative", zIndex: 1 }}>
                        ¡Te damos la bienvenida a S&amp;M Servicios y Mercadeo S.A.S.! Completa este formulario para registrar tus datos y continuar en el proceso. Asegúrate de diligenciarlo <strong>sin errores</strong>.
                    </p>
                </div>

                {/* ── Stepper ── */}
                {step > 0 && (
                    <div className="rni-stepper">
                        <div className="rni-step-line-bg" />
                        <div className="rni-step-line-fill" style={{ width: stepProgress }} />
                        {STEPS.map((s, i) => {
                            const num = i + 1;
                            const isActive = step === num;
                            const isDone = step > num;
                            return (
                                <div key={num} className={`rni-step-item ${isActive ? "active" : isDone ? "done" : ""}`}>
                                    <div className="rni-step-circle">
                                        {isDone ? <IcoCheck /> : num}
                                    </div>
                                    <span className="rni-step-label">{s.label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Step Content ── */}
                <div style={{ padding: "36px 40px" }}>

                    {/* Step 0 – Habeas Data */}
                    {step === 0 && (
                        <div className="animate-fade-in">
                            <div className="rni-section-title">
                                <div className="rni-section-num">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                    </svg>
                                </div>
                                <h3 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--teal)", margin: 0 }}>
                                    Habeas Data &amp; Privacidad
                                </h3>
                            </div>
                            <p style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--text-muted)", marginBottom: 22 }}>
                                En cumplimiento de la Ley Estatutaria 1581 de 2012, S&amp;M Servicios y Mercadeo S.A.S. informa que los datos aportados en este formulario serán tratados de forma segura con fines exclusivos de selección y vinculación laboral. Sus datos no serán cedidos a terceros sin su previo consentimiento.
                            </p>
                            <div className="rni-consent-box">
                                <div className={`rni-checkbox ${consentChecked ? "checked" : ""}`} onClick={() => setConsentChecked(!consentChecked)}>
                                    {consentChecked && <IcoCheck />}
                                </div>
                                <div style={{ fontSize: "0.84rem", lineHeight: 1.65, color: "var(--text)", fontWeight: 600 }}>
                                    Autorizo de manera libre y expresa a S&amp;M Servicios y Mercadeo S.A.S. para el tratamiento de mis datos personales de acuerdo con las finalidades descritas.
                                </div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 14 }}>
                                <button type="button" className="rni-btn-secondary" onClick={() => setConsentDeclined(true)}>No autorizo y salir</button>
                                <button type="button" className="rni-btn-primary" disabled={!consentChecked} onClick={() => setStep(1)}>Comenzar Registro</button>
                            </div>
                        </div>
                    )}

                    {/* Step 1 – Datos Personales */}
                    {step === 1 && (
                        <div className="animate-fade-in">
                            <div className="rni-section-title">
                                <div className="rni-section-num">1</div>
                                <h3 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--teal)", margin: 0 }}>Datos Personales e Identificación</h3>
                            </div>
                            <div className="rni-grid">
                                <Field label="Nombres Completos" required error={errors.nombres} hint="Relaciona tus nombres completos en MAYÚSCULA" icon={<IcoUser />}>
                                    <input type="text" className={`rni-input ${errors.nombres ? "rni-input-error" : ""}`} value={form.nombres} onChange={e => set("nombres", e.target.value.toUpperCase())} />
                                </Field>
                                <Field label="Apellidos Completos" required error={errors.apellidos} hint="Relaciona tus apellidos completos en MAYÚSCULA" icon={<IcoUser />}>
                                    <input type="text" className={`rni-input ${errors.apellidos ? "rni-input-error" : ""}`} value={form.apellidos} onChange={e => set("apellidos", e.target.value.toUpperCase())} />
                                </Field>
                                <Field label="Número de Documento" required error={errors.documento} hint="Documento sin espacios, puntos (.) ni comas (,)" icon={<IcoDoc />}>
                                    <input type="text" className={`rni-input ${errors.documento ? "rni-input-error" : ""}`} value={form.documento} onChange={e => set("documento", e.target.value)} />
                                </Field>
                                <Field label="Fecha de Expedición del Documento" required error={errors.fecha_expedicion_doc} hint="Selecciona la fecha de expedición" icon={<IcoCalendar />}>
                                    <input type="date" className={`rni-input ${errors.fecha_expedicion_doc ? "rni-input-error" : ""}`} value={form.fecha_expedicion_doc} onChange={e => set("fecha_expedicion_doc", e.target.value)} />
                                </Field>
                                <Field label="Fecha de Nacimiento" required error={errors.fecha_nacimiento} hint="De acuerdo con tu documento de identidad" icon={<IcoCalendar />}>
                                    <input type="date" className={`rni-input ${errors.fecha_nacimiento ? "rni-input-error" : ""}`} value={form.fecha_nacimiento} onChange={e => set("fecha_nacimiento", e.target.value)} />
                                </Field>
                                <Field label="Lugar de Nacimiento" required error={errors.lugar_nacimiento} hint="Municipio y departamento donde naciste" icon={<IcoMapPin />}>
                                    <input type="text" className={`rni-input ${errors.lugar_nacimiento ? "rni-input-error" : ""}`} value={form.lugar_nacimiento} onChange={e => set("lugar_nacimiento", e.target.value)} />
                                </Field>
                                <Field label="Estado Civil" required error={errors.estado_civil}>
                                    <select className={`rni-input rni-input-noicon ${errors.estado_civil ? "rni-input-error" : ""}`} value={form.estado_civil} onChange={e => set("estado_civil", e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {ESTADO_CIVIL_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="Número de Hijos" required error={errors.numero_hijos}>
                                    <select className={`rni-input rni-input-noicon ${errors.numero_hijos ? "rni-input-error" : ""}`} value={form.numero_hijos} onChange={e => set("numero_hijos", e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {HIJOS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="Tipo de Sangre" required error={errors.rh}>
                                    <select className={`rni-input rni-input-noicon ${errors.rh ? "rni-input-error" : ""}`} value={form.rh} onChange={e => set("rh", e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {TIPO_SANGRE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="Nivel de Escolaridad" required error={errors.nivel_escolaridad}>
                                    <select className={`rni-input rni-input-noicon ${errors.nivel_escolaridad ? "rni-input-error" : ""}`} value={form.nivel_escolaridad} onChange={e => set("nivel_escolaridad", e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {ESCOLARIDAD_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="Profesión" required error={errors.profesion} hint="Título de la última formación alcanzada" icon={<IcoDoc />}>
                                    <input type="text" className={`rni-input ${errors.profesion ? "rni-input-error" : ""}`} value={form.profesion} onChange={e => set("profesion", e.target.value)} />
                                </Field>
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                                <button type="button" className="rni-btn-primary" onClick={handleNext}>Siguiente</button>
                            </div>
                        </div>
                    )}

                    {/* Step 2 – Contacto */}
                    {step === 2 && (
                        <div className="animate-fade-in">
                            <div className="rni-section-title">
                                <div className="rni-section-num">2</div>
                                <h3 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--teal)", margin: 0 }}>Información de Contacto y Residencia</h3>
                            </div>
                            <div className="rni-grid">
                                <Field label="Ciudad de Residencia" required error={errors.ciudad} hint="Ciudad donde vives actualmente">
                                    <select className={`rni-input rni-input-noicon ${errors.ciudad ? "rni-input-error" : ""}`} value={form.ciudad} onChange={e => set("ciudad", e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {CIUDAD_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="Barrio de Residencia" required error={errors.barrio} hint="Nombre del barrio donde vives" icon={<IcoMapPin />}>
                                    <input type="text" className={`rni-input ${errors.barrio ? "rni-input-error" : ""}`} value={form.barrio} onChange={e => set("barrio", e.target.value)} />
                                </Field>
                                <Field label="Dirección de Residencia" required error={errors.direccion} hint="Dirección lo más específica posible" icon={<IcoMapPin />}>
                                    <input type="text" className={`rni-input ${errors.direccion ? "rni-input-error" : ""}`} value={form.direccion} onChange={e => set("direccion", e.target.value)} />
                                </Field>
                                <Field label="Estrato Socioeconómico" required error={errors.estrato} hint="De acuerdo con tus recibos públicos">
                                    <select className={`rni-input rni-input-noicon ${errors.estrato ? "rni-input-error" : ""}`} value={form.estrato} onChange={e => set("estrato", e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {ESTRATO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="Correo Electrónico" required error={errors.correo} hint="Donde podamos enviarte información de tu contrato" icon={<IcoMail />}>
                                    <input type="email" className={`rni-input ${errors.correo ? "rni-input-error" : ""}`} value={form.correo} onChange={e => set("correo", e.target.value)} />
                                </Field>
                                <Field label="Celular" required error={errors.celular} hint="Número de contacto de 10 dígitos" icon={<IcoPhone />}>
                                    <input type="text" className={`rni-input ${errors.celular ? "rni-input-error" : ""}`} value={form.celular} onChange={e => set("celular", e.target.value)} />
                                </Field>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                                <button type="button" className="rni-btn-secondary" onClick={handleBack}>Atrás</button>
                                <button type="button" className="rni-btn-primary" onClick={handleNext}>Siguiente</button>
                            </div>
                        </div>
                    )}

                    {/* Step 3 – Emergencia */}
                    {step === 3 && (
                        <div className="animate-fade-in">
                            <div className="rni-section-title">
                                <div className="rni-section-num">3</div>
                                <h3 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--teal)", margin: 0 }}>Contacto de Emergencia</h3>
                            </div>
                            <div className="rni-grid">
                                <Field label="Nombre del Contacto" required error={errors.emergencia_nombre} hint="Nombres completos en MAYÚSCULA" icon={<IcoUser />}>
                                    <input type="text" className={`rni-input ${errors.emergencia_nombre ? "rni-input-error" : ""}`} value={form.emergencia_nombre} onChange={e => set("emergencia_nombre", e.target.value.toUpperCase())} />
                                </Field>
                                <Field label="Teléfono de Emergencia" required error={errors.emergencia_telefono} hint="Número de contacto de la persona relacionada" icon={<IcoPhone />}>
                                    <input type="text" className={`rni-input ${errors.emergencia_telefono ? "rni-input-error" : ""}`} value={form.emergencia_telefono} onChange={e => set("emergencia_telefono", e.target.value)} />
                                </Field>
                                <Field label="Parentesco" required error={errors.emergencia_parentesco}>
                                    <select className={`rni-input rni-input-noicon ${errors.emergencia_parentesco ? "rni-input-error" : ""}`} value={form.emergencia_parentesco} onChange={e => set("emergencia_parentesco", e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {PARENTESCO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                                <button type="button" className="rni-btn-secondary" onClick={handleBack}>Atrás</button>
                                <button type="button" className="rni-btn-primary" onClick={handleNext}>Siguiente</button>
                            </div>
                        </div>
                    )}

                    {/* Step 4 – Seguridad Social */}
                    {step === 4 && (
                        <div className="animate-fade-in">
                            <div className="rni-section-title">
                                <div className="rni-section-num">4</div>
                                <h3 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--teal)", margin: 0 }}>Seguridad Social</h3>
                            </div>
                            <div className="rni-grid">
                                <Field label="EPS" required error={errors.eps} hint="EPS a la cual te encuentras afiliado(a)">
                                    <select className={`rni-input rni-input-noicon ${errors.eps ? "rni-input-error" : ""}`} value={form.eps} onChange={e => set("eps", e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {EPS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="Fondo de Pensiones (AFP)" required error={errors.afp} hint="Fondo de pensiones al cual te encuentras afiliado(a)">
                                    <select className={`rni-input rni-input-noicon ${errors.afp ? "rni-input-error" : ""}`} value={form.afp} onChange={e => set("afp", e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {AFP_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                                <button type="button" className="rni-btn-secondary" onClick={handleBack}>Atrás</button>
                                <button type="button" className="rni-btn-primary" onClick={handleNext}>Siguiente</button>
                            </div>
                        </div>
                    )}

                    {/* Step 5 – Dotación */}
                    {step === 5 && (
                        <form onSubmit={handleSubmit} className="animate-fade-in">
                            <div className="rni-section-title">
                                <div className="rni-section-num">5</div>
                                <h3 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "var(--teal)", margin: 0 }}>Tallas de Dotación</h3>
                            </div>
                            <div className="rni-grid">
                                <Field label="Talla de Camisa" required error={errors.talla_camisa} hint="Selecciona tu talla de camisa">
                                    <select className={`rni-input rni-input-noicon ${errors.talla_camisa ? "rni-input-error" : ""}`} value={form.talla_camisa} onChange={e => set("talla_camisa", e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {TALLA_CAMISA_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="Talla de Pantalón" required error={errors.talla_pantalon} hint="Selecciona tu talla de pantalón">
                                    <select className={`rni-input rni-input-noicon ${errors.talla_pantalon ? "rni-input-error" : ""}`} value={form.talla_pantalon} onChange={e => set("talla_pantalon", e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {TALLA_PANTALON_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                                <Field label="Talla de Zapatos" required error={errors.talla_zapatos} hint="Selecciona tu talla de calzado">
                                    <select className={`rni-input rni-input-noicon ${errors.talla_zapatos ? "rni-input-error" : ""}`} value={form.talla_zapatos} onChange={e => set("talla_zapatos", e.target.value)}>
                                        <option value="">-- Selecciona --</option>
                                        {TALLA_ZAPATOS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                                <button type="button" className="rni-btn-secondary" onClick={handleBack}>Atrás</button>
                                <button type="submit" className="rni-btn-primary" disabled={loading}>
                                    {loading ? "Enviando..." : "Enviar Registro"}
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
