import React, { useState, useEffect } from "react";
import { SearchableSelect } from "../components/SearchableSelect";

const EMPTY = {
    documento: "",
    nombres: "",
    apellidos: "",
    edad: "",
    fecha_expedicion: "",
    ciudad_id: "",
    celular: "",
    correo: "",
    negocio: "",
};

function Field({ label, hint, required, error, children }) {
    return (
        <div style={{ marginBottom: 28 }}>
            <div
                style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: "var(--text, #1a3a35)",
                    marginBottom: 4,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                }}
            >
                {label}
                {required && (
                    <span style={{ color: "#c0392b", marginLeft: 4 }}>*</span>
                )}
            </div>
            {hint && (
                <div
                    style={{
                        fontSize: "0.8rem",
                        color: "var(--primary, #1a9b8c)",
                        marginBottom: 8,
                        fontFamily: "Nunito, sans-serif",
                        fontStyle: "italic",
                    }}
                >
                    {hint}
                </div>
            )}
            {children}
            {error && (
                <div
                    style={{
                        fontSize: "0.78rem",
                        color: "#c0392b",
                        marginTop: 5,
                        fontFamily: "Nunito, sans-serif",
                    }}
                >
                    ⚠ {error}
                </div>
            )}
        </div>
    );
}

const inputBase = {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid var(--border, #c5e8e3)",
    borderRadius: "var(--radius-sm, 10px)",
    fontSize: "0.9rem",
    fontFamily: "Nunito, sans-serif",
    color: "var(--text, #1a3a35)",
    background: "var(--white, #ffffff)",
    outline: "none",
    transition: "border 0.15s, box-shadow 0.15s",
    boxSizing: "border-box",
};

const inputError = {
    ...inputBase,
    border: "1.5px solid #c0392b",
};

function useInputFocus() {
    return {
        onFocus: (e) => {
            e.target.style.borderColor = "var(--primary, #1a9b8c)";
            e.target.style.boxShadow = "0 0 0 3px rgba(26,155,140,0.13)";
        },
        onBlur: (e) => {
            if (!e.target.dataset.error || e.target.dataset.error === "false") {
                e.target.style.borderColor = "var(--border, #c5e8e3)";
            } else {
                e.target.style.borderColor = "#c0392b";
            }
            e.target.style.boxShadow = "none";
        },
    };
}

export default function RegistroCandidatosForm() {
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [ciudades, setCiudades] = useState([]);
    const [proyectos, setProyectos] = useState([]);
    const [catalogosLoading, setCatalogosLoading] = useState(true);
    const [registroEstado, setRegistroEstado] = useState(null);
    const focus = useInputFocus();
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

    const validate = () => {
        const e = {};
        if (!form.documento.trim()) {
            e.documento = "Campo obligatorio";
        } else if (!/^\d+$/.test(form.documento.trim())) {
            e.documento = "Solo números, sin espacios, puntos (.) ni comas (,)";
        }
        if (!form.nombres.trim()) e.nombres = "Campo obligatorio";
        if (!form.apellidos.trim()) e.apellidos = "Campo obligatorio";
        if (!form.edad) {
            e.edad = "Campo obligatorio";
        } else if (
            isNaN(Number(form.edad)) ||
            Number(form.edad) < 14 ||
            Number(form.edad) > 80
        ) {
            e.edad = "Ingresa una edad válida (entre 14 y 80 años)";
        }
        if (!form.fecha_expedicion) e.fecha_expedicion = "Campo obligatorio";
        if (!form.ciudad_id) e.ciudad_id = "Selecciona una ciudad";
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
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            const firstError = document.querySelector('[data-error="true"]');
            if (firstError)
                firstError.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            return;
        }
        setLoading(true);
        try {
            const csrfToken = document.querySelector(
                'meta[name="csrf-token"]',
            )?.content;
            const res = await fetch("/api/candidatos/registro", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrfToken ?? "",
                    Accept: "application/json",
                },
                body: JSON.stringify({ ...form, token: tokenParam }),
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

    if (catalogosLoading && tokenParam) {
        return (
            <div style={{ minHeight: "100vh", background: "var(--bg, #e8f8f5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Nunito, sans-serif", color: "var(--text-muted, #5a7a75)" }}>
                Cargando…
            </div>
        );
    }

    if (registroEstado === 'Cerrada') {
        return (
            <div style={{ minHeight: "100vh", background: "var(--bg, #e8f8f5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Nunito, sans-serif" }}>
                <div style={{ background: "var(--white, #fff)", borderRadius: "var(--radius, 16px)", boxShadow: "var(--shadow, 0 4px 20px rgba(26,155,140,0.12))", padding: "60px 48px", maxWidth: 520, width: "100%", textAlign: "center" }}>
                    <div style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--primary-light, #d0f0ec)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "2rem", color: "var(--primary, #1a9b8c)", fontWeight: 700 }}>
                        ✓
                    </div>
                    <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "var(--primary, #1a9b8c)", margin: "0 0 12px" }}>
                        Requisición completada
                    </h2>
                    <p style={{ color: "var(--text-muted, #5a7a75)", fontSize: "0.93rem", lineHeight: 1.7, margin: 0 }}>
                        El proceso de selección para esta vacante ha finalizado exitosamente. Ya no es posible recibir nuevas postulaciones.
                    </p>
                </div>
            </div>
        );
    }

    if (registroEstado === 'Cancelada') {
        return (
            <div style={{ minHeight: "100vh", background: "var(--bg, #e8f8f5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Nunito, sans-serif" }}>
                <div style={{ background: "var(--white, #fff)", borderRadius: "var(--radius, 16px)", boxShadow: "var(--shadow, 0 4px 20px rgba(26,155,140,0.12))", padding: "60px 48px", maxWidth: 520, width: "100%", textAlign: "center" }}>
                    <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#fde8e8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "2rem", color: "#c0392b", fontWeight: 700 }}>
                        ✕
                    </div>
                    <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "#c0392b", margin: "0 0 12px" }}>
                        Requisición cancelada
                    </h2>
                    <p style={{ color: "var(--text-muted, #5a7a75)", fontSize: "0.93rem", lineHeight: 1.7, margin: 0 }}>
                        Este proceso de selección ha sido cancelado y no se están aceptando nuevas postulaciones.
                    </p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    background: "var(--bg, #e8f8f5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 24,
                    fontFamily: "Nunito, sans-serif",
                }}
            >
                <div
                    style={{
                        background: "var(--white, #fff)",
                        borderRadius: "var(--radius, 16px)",
                        boxShadow:
                            "var(--shadow, 0 4px 20px rgba(26,155,140,0.12))",
                        padding: "60px 48px",
                        maxWidth: 520,
                        width: "100%",
                        textAlign: "center",
                    }}
                >
                    <div
                        style={{
                            width: 76,
                            height: 76,
                            borderRadius: "50%",
                            background: "var(--primary-light, #d0f0ec)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 24px",
                            fontSize: "2rem",
                            color: "var(--primary, #1a9b8c)",
                            fontWeight: 700,
                        }}
                    >
                        ✓
                    </div>
                    <h2
                        style={{
                            fontFamily: "'Poppins', sans-serif",
                            fontWeight: 700,
                            fontSize: "1.4rem",
                            color: "var(--primary, #1a9b8c)",
                            margin: "0 0 12px",
                        }}
                    >
                        ¡Registro exitoso!
                    </h2>
                    <p
                        style={{
                            color: "var(--text-muted, #5a7a75)",
                            fontSize: "0.93rem",
                            lineHeight: 1.7,
                            margin: 0,
                        }}
                    >
                        Tu información ha sido registrada correctamente. Nos
                        pondremos en contacto contigo próximamente para
                        confirmar los detalles del proceso de selección.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "var(--bg, #e8f8f5)",
                fontFamily: "Nunito, sans-serif",
            }}
        >
            {/* ── Banner ── */}
            <div style={{ background: "var(--primary, #1a9b8c)" }}>
                <div
                    style={{
                        maxWidth: 740,
                        margin: "0 auto",
                        padding: "36px 32px 44px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 18,
                            marginBottom: 20,
                        }}
                    >
                        <div
                            style={{
                                background: "rgba(255,255,255,0.18)",
                                borderRadius: 10,
                                padding: "10px 16px",
                                fontFamily: "'Poppins', sans-serif",
                                fontWeight: 800,
                                fontSize: "1.25rem",
                                color: "#fff",
                                letterSpacing: "0.04em",
                                flexShrink: 0,
                            }}
                        >
                            S&amp;M
                        </div>
                        <h1
                            style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontWeight: 700,
                                fontSize: "1.1rem",
                                color: "#fff",
                                margin: 0,
                                letterSpacing: "0.05em",
                                textTransform: "uppercase",
                                lineHeight: 1.35,
                            }}
                        >
                            Registro de Candidatos
                            <br />
                            <span
                                style={{
                                    fontWeight: 500,
                                    fontSize: "0.85rem",
                                    opacity: 0.85,
                                    textTransform: "none",
                                    letterSpacing: "0.02em",
                                }}
                            >
                                Proceso de Entrevista
                            </span>
                        </h1>
                    </div>
                    <p
                        style={{
                            color: "rgba(255,255,255,0.96)",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            margin: "0 0 8px",
                            lineHeight: 1.5,
                        }}
                    >
                        ¡Bienvenidos al proceso de selección de S&amp;M
                        Servicios y Mercadeo S.A.S.!
                    </p>
                    <p
                        style={{
                            color: "rgba(255,255,255,0.78)",
                            fontSize: "0.83rem",
                            margin: 0,
                            lineHeight: 1.7,
                        }}
                    >
                        Este formulario está diseñado para recopilar la
                        información de todos los participantes en nuestros
                        procesos de selección. Al registrar tus datos, podremos
                        confirmar tu asistencia, programar las pruebas
                        necesarias y coordinar los filtros adicionales que
                        forman parte de nuestra selección.
                    </p>
                </div>
            </div>

            {/* ── Tarjeta del formulario ── */}
            <div
                style={{
                    maxWidth: 740,
                    margin: "0 auto",
                    padding: "0 16px 56px",
                }}
            >
                <div
                    style={{
                        background: "var(--white, #fff)",
                        borderRadius:
                            "0 0 var(--radius, 16px) var(--radius, 16px)",
                        boxShadow:
                            "var(--shadow, 0 4px 20px rgba(26,155,140,0.12))",
                    }}
                >
                    {/* Nota de privacidad */}
                    <div
                        style={{
                            padding: "20px 32px",
                            borderBottom: "1.5px solid var(--border, #c5e8e3)",
                            background: "var(--bg2, #f0faf8)",
                            borderRadius: "0",
                        }}
                    >
                        <p
                            style={{
                                margin: "0 0 8px",
                                fontSize: "0.82rem",
                                color: "var(--text-muted, #5a7a75)",
                                lineHeight: 1.6,
                            }}
                        >
                            Cuando envíe este formulario, no recopilará
                            automáticamente sus detalles, como el nombre y la
                            dirección de correo electrónico, a menos que lo
                            proporcione usted mismo.
                        </p>
                        <p
                            style={{
                                margin: 0,
                                fontSize: "0.82rem",
                                color: "#c0392b",
                                fontWeight: 700,
                            }}
                        >
                            * Obligatorio
                        </p>
                    </div>

                    {/* Campos */}
                    <form
                        onSubmit={handleSubmit}
                        noValidate
                        style={{ padding: "32px 32px 36px" }}
                    >
                        <Field
                            label="1. Número de documento de identificación"
                            hint="Relaciona tu documento de identificación sin espacios, puntos (.) o comas (,)."
                            required
                            error={errors.documento}
                        >
                            <input
                                data-error={!!errors.documento}
                                type="text"
                                inputMode="numeric"
                                placeholder="Escriba su respuesta"
                                value={form.documento}
                                onChange={(e) =>
                                    set(
                                        "documento",
                                        e.target.value.replace(/[^\d]/g, ""),
                                    )
                                }
                                style={
                                    errors.documento ? inputError : inputBase
                                }
                                {...focus}
                            />
                        </Field>

                        <Field
                            label="2. Nombres completos"
                            hint="Relaciona tus nombres completos en MAYÚSCULA."
                            required
                            error={errors.nombres}
                        >
                            <input
                                data-error={!!errors.nombres}
                                type="text"
                                placeholder="Escriba su respuesta"
                                value={form.nombres}
                                onChange={(e) =>
                                    set("nombres", e.target.value.toUpperCase())
                                }
                                style={errors.nombres ? inputError : inputBase}
                                {...focus}
                            />
                        </Field>

                        <Field
                            label="3. Apellidos completos"
                            hint="Relaciona tus apellidos completos en MAYÚSCULA."
                            required
                            error={errors.apellidos}
                        >
                            <input
                                data-error={!!errors.apellidos}
                                type="text"
                                placeholder="Escriba su respuesta"
                                value={form.apellidos}
                                onChange={(e) =>
                                    set(
                                        "apellidos",
                                        e.target.value.toUpperCase(),
                                    )
                                }
                                style={
                                    errors.apellidos ? inputError : inputBase
                                }
                                {...focus}
                            />
                        </Field>

                        <Field
                            label="4. Edad"
                            hint="Cuéntanos cuántos años tienes"
                            required
                            error={errors.edad}
                        >
                            <input
                                data-error={!!errors.edad}
                                type="number"
                                min="14"
                                max="80"
                                placeholder="Escriba su respuesta"
                                value={form.edad}
                                onChange={(e) => set("edad", e.target.value)}
                                style={{
                                    ...(errors.edad ? inputError : inputBase),
                                    maxWidth: 200,
                                }}
                                {...focus}
                            />
                        </Field>

                        <Field
                            label="5. Fecha de expedición del documento de identificación"
                            hint="Selecciona la fecha de expedición del documento de identificación."
                            required
                            error={errors.fecha_expedicion}
                        >
                            <input
                                data-error={!!errors.fecha_expedicion}
                                type="date"
                                value={form.fecha_expedicion}
                                onChange={(e) =>
                                    set("fecha_expedicion", e.target.value)
                                }
                                style={{
                                    ...(errors.fecha_expedicion
                                        ? inputError
                                        : inputBase),
                                    maxWidth: 260,
                                }}
                                {...focus}
                            />
                        </Field>

                        <Field
                            label="6. Ciudad de residencia"
                            required
                            error={errors.ciudad_id}
                        >
                            <div
                                style={{
                                    maxWidth: 340,
                                    outline: errors.ciudad_id
                                        ? "1.5px solid #c0392b"
                                        : "none",
                                    borderRadius: "var(--radius-sm, 10px)",
                                }}
                            >
                                <SearchableSelect
                                    value={form.ciudad_id}
                                    defaultValue=""
                                    placeholder={
                                        catalogosLoading
                                            ? "Cargando ciudades..."
                                            : "Buscar ciudad..."
                                    }
                                    options={ciudades.map((c) => ({
                                        value: String(c.id),
                                        label: c.nombre,
                                    }))}
                                    onChange={(v) => set("ciudad_id", v)}
                                />
                            </div>
                        </Field>

                        <Field
                            label="7. Número celular"
                            required
                            error={errors.celular}
                        >
                            <input
                                data-error={!!errors.celular}
                                type="tel"
                                inputMode="numeric"
                                placeholder="Escriba su respuesta"
                                value={form.celular}
                                onChange={(e) =>
                                    set(
                                        "celular",
                                        e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 10),
                                    )
                                }
                                style={errors.celular ? inputError : inputBase}
                                {...focus}
                            />
                        </Field>

                        <Field
                            label="8. Correo electrónico"
                            required
                            error={errors.correo}
                        >
                            <input
                                data-error={!!errors.correo}
                                type="email"
                                placeholder="Escriba su respuesta"
                                value={form.correo}
                                onChange={(e) => set("correo", e.target.value)}
                                style={errors.correo ? inputError : inputBase}
                                {...focus}
                            />
                        </Field>

                        <Field
                            label="9. Negocio al que se postula"
                            required
                        >
                            <input
                                type="text"
                                value={form.negocio}
                                readOnly
                                disabled
                                style={{
                                    ...inputBase,
                                    maxWidth: 340,
                                    background: "var(--bg2, #f0faf8)",
                                    color: "var(--text-muted, #5a7a75)",
                                    cursor: "not-allowed",
                                    userSelect: "none",
                                }}
                            />
                        </Field>

                        {/* Botón enviar */}
                        <div
                            style={{
                                marginTop: 8,
                                display: "flex",
                                alignItems: "center",
                                gap: 20,
                                flexWrap: "wrap",
                            }}
                        >
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    padding: "11px 36px",
                                    background: loading
                                        ? "var(--text-muted, #94a3b8)"
                                        : "var(--primary, #1a9b8c)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "var(--radius-sm, 10px)",
                                    fontSize: "0.95rem",
                                    fontWeight: 700,
                                    cursor: loading ? "not-allowed" : "pointer",
                                    fontFamily: "'Poppins', sans-serif",
                                    letterSpacing: "0.03em",
                                    transition: "background 0.18s",
                                }}
                                onMouseOver={(e) => {
                                    if (!loading)
                                        e.target.style.background =
                                            "var(--primary-dark, #127a6d)";
                                }}
                                onMouseOut={(e) => {
                                    if (!loading)
                                        e.target.style.background =
                                            "var(--primary, #1a9b8c)";
                                }}
                            >
                                {loading ? "Enviando..." : "Enviar"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
