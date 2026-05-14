import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState("email"); // "email" | "password"
    const [email, setEmail] = useState("");
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const passwordRef = useRef(null);

    useEffect(() => {
        if (step === "password" && passwordRef.current) {
            passwordRef.current.focus();
        }
    }, [step]);

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await api.post("/check-email", { email });
            if (!res.data.exists) {
                setError("No encontramos una cuenta con ese correo.");
                return;
            }
            setUserName(res.data.name);
            setStep("password");
        } catch {
            setError("Error al verificar el correo. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(email, password);
            navigate("/dashboard");
        } catch (err) {
            setError(
                err.response?.data?.message ??
                    err.response?.data?.errors?.email?.[0] ??
                    "Contraseña incorrecta. Intenta de nuevo.",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep("email");
        setPassword("");
        setError(null);
        setUserName("");
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">
                {/* Marca */}
                <div className="login-brand">
                    <svg
                        width="52"
                        height="52"
                        viewBox="0 0 36 36"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <ellipse
                            cx="18"
                            cy="22"
                            rx="10"
                            ry="10"
                            fill="#1a9b8c"
                            opacity="0.18"
                        />
                        <path
                            d="M18 4 C18 4 10 14 10 22 A8 8 0 0 0 26 22 C26 14 18 4 18 4Z"
                            fill="#1a9b8c"
                        />
                        <path
                            d="M18 12 C18 12 13 19 13 23 A5 5 0 0 0 23 23 C23 19 18 12 18 12Z"
                            fill="#f5a623"
                        />
                        <circle cx="27" cy="10" r="4" fill="#e8c41a" />
                    </svg>
                    <div>
                        <div className="login-brand-name">
                            ERP <span>AvanzaConoce</span>
                        </div>
                        <div className="login-brand-sub">
                            Sistema de gestión empresarial
                        </div>
                    </div>
                </div>

                {/* Contenido del paso — key distinta para animar la transición */}
                {step === "email" ? (
                    <div key="email" className="login-step-body">
                        <div className="login-heading">
                            <h2>Bienvenido</h2>
                            <p>Ingresa tu correo electrónico para continuar</p>
                        </div>

                        <form
                            onSubmit={handleEmailSubmit}
                            className="login-form"
                        >
                            <div className="login-field">
                                <label htmlFor="login-email">
                                    Correo electrónico
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    placeholder="usuario@empresa.com"
                                />
                            </div>

                            {error && (
                                <div className="login-error">{error}</div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="login-btn"
                            >
                                {loading ? (
                                    <>
                                        <span className="login-spinner" />{" "}
                                        Verificando...
                                    </>
                                ) : (
                                    <>
                                        Continuar{" "}
                                        <span className="login-btn-arrow">
                                            →
                                        </span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div key="password" className="login-step-body">
                        <button onClick={handleBack} className="login-back">
                            ← Cambiar cuenta
                        </button>

                        <div className="login-user-chip">
                            <div className="login-user-avatar">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="login-user-name">
                                    {userName}
                                </div>
                                <div className="login-user-email">{email}</div>
                            </div>
                        </div>

                        <div className="login-heading">
                            <h2>Ingresa tu contraseña</h2>
                            <p>Verifica tu identidad para acceder al ERP</p>
                        </div>

                        <form onSubmit={handleLogin} className="login-form">
                            <div className="login-field">
                                <label htmlFor="login-password">
                                    Contraseña
                                </label>
                                <input
                                    id="login-password"
                                    ref={passwordRef}
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                    placeholder="••••••••"
                                />
                            </div>

                            {error && (
                                <div className="login-error">{error}</div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="login-btn"
                            >
                                {loading ? (
                                    <>
                                        <span className="login-spinner" />{" "}
                                        Iniciando sesión...
                                    </>
                                ) : (
                                    "Iniciar sesión"
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
