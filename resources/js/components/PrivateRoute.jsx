import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoadingScreen() {
    return (
        <div style={S.root}>
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>

            <div style={S.blob1} />
            <div style={S.blob2} />

            <div style={S.card}>
                <div style={S.logoWrap}>
                    <svg
                        width="56"
                        height="56"
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
                    <span style={S.logoText}>ERP</span>
                </div>

                <p style={S.company}>Servimercadeo S.A.S.</p>

                {/* Spinner */}
                <div style={S.spinnerWrap}>
                    <div style={S.spinnerTrack} />
                    <div style={S.spinnerArc} />
                </div>

                <p style={S.label}>Verificando sesión…</p>
            </div>
        </div>
    );
}

const PRIMARY = "#1a9b8c";

const S = {
    root: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
            "linear-gradient(135deg, #f0faf8 0%, #e6f4f1 60%, #dff0ed 100%)",
        fontFamily: "Nunito, sans-serif",
        position: "relative",
        overflow: "hidden",
    },

    blob1: {
        position: "absolute",
        width: 480,
        height: 480,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${PRIMARY}22 0%, transparent 70%)`,
        top: "-120px",
        left: "-120px",
        pointerEvents: "none",
    },
    blob2: {
        position: "absolute",
        width: 360,
        height: 360,
        borderRadius: "50%",
        background: "radial-gradient(circle, #f5a62318 0%, transparent 70%)",
        bottom: "-80px",
        right: "-80px",
        pointerEvents: "none",
    },

    card: {
        position: "relative",
        zIndex: 1,
        background: "#fff",
        borderRadius: 20,
        padding: "48px 56px",
        boxShadow:
            "0 20px 60px rgba(26,155,140,0.12), 0 4px 16px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        animation: "fadeUp 0.5s ease both",
        minWidth: 300,
    },

    logoWrap: {
        display: "flex",
        alignItems: "center",
        gap: 10,
    },
    logoText: {
        fontSize: "1.8rem",
        fontWeight: 900,
        color: PRIMARY,
        letterSpacing: "-0.5px",
    },

    company: {
        margin: 0,
        fontSize: "0.82rem",
        fontWeight: 600,
        color: "#9ca3af",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
    },

    spinnerWrap: {
        position: "relative",
        width: 48,
        height: 48,
        marginTop: 8,
    },
    spinnerTrack: {
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        border: "3.5px solid #e5e7eb",
    },
    spinnerArc: {
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        border: `3.5px solid transparent`,
        borderTopColor: PRIMARY,
        borderRightColor: PRIMARY,
        animation: "spin 0.9s linear infinite",
    },

    label: {
        margin: 0,
        fontSize: "0.9rem",
        fontWeight: 600,
        color: "#6b7280",
        animation: "pulse 2s ease-in-out infinite",
    },
};

export default function PrivateRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <LoadingScreen />;

    return user ? children : <Navigate to="/login" replace />;
}
