import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPass] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(email, password);
            navigate("/dashboard");
        } catch (err) {
            setError(
                err.response?.data?.errors?.email?.[0] ??
                    "Error al iniciar sesión.",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.card}>
                <h1 style={styles.titulo}>ERP AvanzaConoce</h1>
                <p style={styles.subtitulo}>
                    Ingresa tus credenciales para continuar
                </p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <label style={styles.label}>Correo electrónico</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={styles.input}
                        placeholder="usuario@empresaa.com"
                    />

                    <label style={styles.label}>Contraseña</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPass(e.target.value)}
                        required
                        style={styles.input}
                        placeholder="••••••••"
                    />

                    {error && <p style={styles.error}>{error}</p>}

                    <button type="submit" disabled={loading} style={styles.btn}>
                        {loading ? "Ingresando..." : "Iniciar sesión"}
                    </button>
                </form>

                <p style={styles.hint}>
                    ¿Vienes desde AvanzaConoce? Usa el botón{" "}
                    <strong>"Ir al ERP"</strong> allá.
                </p>
            </div>
        </div>
    );
}

const styles = {
    wrapper: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f4f8",
    },
    card: {
        background: "#fff",
        borderRadius: "12px",
        padding: "2.5rem",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    },
    titulo: {
        margin: "0 0 0.25rem",
        fontSize: "1.6rem",
        color: "#1a3c5e",
        textAlign: "center",
    },
    subtitulo: {
        color: "#6b7280",
        textAlign: "center",
        marginBottom: "2rem",
        fontSize: "0.9rem",
    },
    form: { display: "flex", flexDirection: "column", gap: "0.5rem" },
    label: { fontSize: "0.85rem", fontWeight: 600, color: "#374151" },
    input: {
        padding: "0.65rem 0.9rem",
        borderRadius: "8px",
        border: "1px solid #d1d5db",
        fontSize: "0.95rem",
        marginBottom: "0.75rem",
        outline: "none",
        color: "#111827",
        background: "#ffffff",
    },
    btn: {
        marginTop: "0.5rem",
        padding: "0.75rem",
        background: "#2563eb",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        fontSize: "1rem",
        fontWeight: 600,
        cursor: "pointer",
    },
    error: {
        color: "#dc2626",
        fontSize: "0.85rem",
        margin: "0.25rem 0",
    },
    hint: {
        marginTop: "1.5rem",
        fontSize: "0.8rem",
        color: "#9ca3af",
        textAlign: "center",
    },
};
