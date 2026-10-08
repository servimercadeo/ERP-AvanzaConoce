import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Al cargar la app verificamos si ya hay sesión activa (ej: viene de SSO).
    // Primero obtenemos el CSRF cookie para que Sanctum reconozca la sesión.
    useEffect(() => {
        api.get("/sanctum/csrf-cookie", { baseURL: "/" }).finally(() => {
            api.get("/user")
                .then((res) => setUser(res.data))
                .catch(() => setUser(null))
                .finally(() => setLoading(false));
        });
    }, []);

    // Los permisos (rol y `permisos_denegados`) viajan con el usuario: se vuelven a pedir
    // cada minuto y al volver a la pestaña, para que un check activado o desactivado en el
    // módulo Permisos se refleje sin cerrar sesión. Solo se actualiza si algo cambió.
    const haySesion = !!user;
    useEffect(() => {
        if (!haySesion) return;
        const refrescar = () => {
            api.get("/user")
                .then((res) =>
                    setUser((prev) =>
                        JSON.stringify(prev) === JSON.stringify(res.data)
                            ? prev
                            : res.data,
                    ),
                )
                .catch(() => {});
        };
        const intervalo = setInterval(refrescar, 60000);
        window.addEventListener("focus", refrescar);
        return () => {
            clearInterval(intervalo);
            window.removeEventListener("focus", refrescar);
        };
    }, [haySesion]);

    const login = async (email, password) => {
        // Paso 1: obtener cookie CSRF de Sanctum
        await api.get("/sanctum/csrf-cookie", { baseURL: "/" });
        // Paso 2: autenticar
        const res = await api.post(
            "/login",
            { email, password },
            { baseURL: "/" },
        );
        setUser(res.data.user);
        return res.data.user;
    };

    const logout = async () => {
        try {
            await api.post("/logout", {}, { baseURL: "/" });
        } catch {
            // Si la sesión ya expiró en el servidor igualmente limpiamos el estado local
        } finally {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
