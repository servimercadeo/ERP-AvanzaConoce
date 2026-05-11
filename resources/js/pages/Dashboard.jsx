import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { ERP_MODULES } from "../data/erpModules";

export default function Dashboard() {
    return (
        <Layout>
            <div className="home-hero">
                <h1>
                    Bienvenido al <span>ERP</span>
                </h1>
                <p>
                    Plataforma integrada de gestión empresarial que centraliza
                    los procesos de Recursos Humanos, Finanzas, Compras,
                    Seguridad, Tecnología y Reportes en un solo lugar,
                    optimizando la operación y la toma de decisiones.
                </p>
                <p style={{ marginTop: "10px" }}>
                    Navega por los módulos desde el menú superior o selecciona
                    uno de los accesos directos a continuación.
                </p>
                <span className="badge">Sistema ERP v1.0 · 2026</span>
            </div>

            <div className="info-section">
                <h2>¿Para qué sirve este ERP?</h2>
                <div className="info-cards">
                    <div className="info-card">
                        <div className="ic-icon"></div>
                        <div>
                            <h3>Integración total</h3>
                            <p>
                                Todos los departamentos comparten información en
                                tiempo real, eliminando silos y duplicaciones.
                            </p>
                        </div>
                    </div>
                    <div className="info-card">
                        <div className="ic-icon"></div>
                        <div>
                            <h3>Automatización</h3>
                            <p>
                                Flujos de aprobación, alertas y reportes
                                automáticos que reducen tareas manuales.
                            </p>
                        </div>
                    </div>
                    <div className="info-card">
                        <div className="ic-icon"></div>
                        <div>
                            <h3>Toma de decisiones</h3>
                            <p>
                                Dashboards e indicadores en tiempo real para
                                líderes y directivos.
                            </p>
                        </div>
                    </div>
                    <div className="info-card">
                        <div className="ic-icon"></div>
                        <div>
                            <h3>Control de acceso</h3>
                            <p>
                                Perfiles y roles diferenciados garantizan que
                                cada usuario vea solo lo que necesita.
                            </p>
                        </div>
                    </div>
                    <div className="info-card">
                        <div className="ic-icon"></div>
                        <div>
                            <h3>Trazabilidad</h3>
                            <p>
                                Registro completo de auditoría en todas las
                                operaciones y cambios del sistema.
                            </p>
                        </div>
                    </div>
                    <div className="info-card">
                        <div className="ic-icon"></div>
                        <div>
                            <h3>Acceso en la nube</h3>
                            <p>
                                Disponible desde cualquier dispositivo, en
                                cualquier momento y lugar.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <p
                className="home-modules-title"
                style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    color: "var(--primary)",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                }}
            >
                Módulos disponibles
                <span
                    style={{
                        flex: 1,
                        height: "1.5px",
                        background: "var(--border)",
                        borderRadius: "2px",
                        marginLeft: "8px",
                    }}
                ></span>
            </p>

            <div className="card-grid cols-6" id="mod-grid">
                {ERP_MODULES.map((mod) => (
                    <Link
                        key={mod.id}
                        className="mod-card"
                        to={`/module/${mod.id}`}
                    >
                        <span className="card-icon-emoji">{mod.icon}</span>
                        <span className="card-label">{mod.label}</span>
                    </Link>
                ))}
            </div>
        </Layout>
    );
}
