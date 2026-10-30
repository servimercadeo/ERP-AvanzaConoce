import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import SelectBuscable from "../components/SelectBuscable";
import { useAcciones } from "../hooks/useAcciones";
import { IconSearch, IconEmptySearch, IconLoading, IconClose, IconTrash, IconPlus, IconEye, IconEdit } from "../components/Icons";

/*
 * Operaciones > Aliados: aliados (subagentes) de Work Orders y sus técnicos indirectos.
 *
 * - Aliado empresa (ej. Tecnotelevisión S.A.S): uno o más técnicos; solo se crea el aliado y
 *   sus técnicos se agregan después desde su ficha.
 * - Aliado indirecto (ej. Pedro Pérez; tipo `tecnico` en la base): una sola persona que no es
 *   empleado; al crearlo se crea también su usuario técnico con los mismos datos.
 * No existen aliados "directos": quien es directo es empleado (Contratos → Empleados).
 *
 * Las Work Orders se asocian por la cédula del técnico que viene en el archivo importado.
 */

const TIPOS = {
    empresa: { label: "Empresa", nombre: "Aliado empresa", color: "#1a6fa8", bg: "#e6f1fa" },
    tecnico: { label: "Indirecto", nombre: "Aliado / técnico indirecto", color: "#1a8a5a", bg: "#e6f6ee" },
};

const TIPOS_DOCUMENTO = { CC: "Cédula de ciudadanía", CE: "Cédula de extranjería", NIT: "NIT" };

// Proyectos para los que trabaja el aliado (uno o varios): salen de Parámetros > Proyectos,
// todos los activos menos ADMINISTRATIVO. Se guardan por id, así que un cambio de nombre
// en Parámetros se ve aquí.
const useProyectosAliado = () => useQuery({
    queryKey: ["aliados-proyectos"],
    queryFn: () => api.get("/aliados/proyectos").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
}).data ?? [];
const nombresProyectos = (aliado) => (aliado.proyectos ?? []).map((p) => p.nombre).join(", ");

// Jefe inmediato: cualquier usuario activo del ERP menos los técnicos y los de rol general.
const useJefesAliado = () => useQuery({
    queryKey: ["aliados-jefes"],
    queryFn: () => api.get("/aliados/jefes").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
}).data ?? [];

// Modalidad del aliado empresa: catálogo de AvanzaConoce (modalidades_bt), por id de Bitrix.
const useModalidadesAliado = () => useQuery({
    queryKey: ["aliados-modalidades"],
    queryFn: () => api.get("/aliados/modalidades").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
}).data ?? [];

const ALIADO_VACIO = { tipo_documento: "NIT", documento: "", nombre: "", representante_legal_nombre: "", representante_legal_documento: "", codigo_pdv: "", modalidad_id_bt: "", proyectos: [],jefe_inmediato_id: "", telefono: "", correo: "", ciudad: "", direccion: "", observaciones: "" };
const TECNICO_VACIO = { tipo_documento: "CC", cedula: "", nombres: "", apellidos: "", movil: "", email: "", proyectos: [], jefe_inmediato_id: "", ciudad: "", direccion: "", observaciones: "" };

const mensajeError = (err, fallback) => {
    const errores = err?.response?.data?.errors;
    if (errores) return Object.values(errores).flat().join(" · ");
    return err?.response?.data?.message ?? fallback;
};

// Errores de validación del servidor por campo ("proyectos.0" cuenta como "proyectos").
const erroresPorCampo = (err) => {
    const porCampo = {};
    Object.entries(err?.response?.data?.errors ?? {}).forEach(([clave, mensajes]) => {
        const campo = clave.split(".")[0];
        if (!porCampo[campo]) porCampo[campo] = mensajes[0];
    });
    return porCampo;
};

// Muestra los errores junto a cada campo y lleva la vista al primero.
const manejarError = (err, setErrores, setError, fallback) => {
    const porCampo = erroresPorCampo(err);
    const n = Object.keys(porCampo).length;
    setErrores(porCampo);
    setError(n > 0
        ? (n === 1 ? "Revisa el campo marcado en rojo." : `Revisa los ${n} campos marcados en rojo.`)
        : mensajeError(err, fallback));
    if (n > 0) setTimeout(() => document.querySelector("[data-campo-error]")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
};

// span: columnas que ocupa; "full" = toda la fila.
// error: mensaje del servidor para este campo; lo marca en rojo.
function Campo({ label, children, span, ayuda, error }) {
    const columna = span === "full" ? "1 / -1" : `span ${span}`;
    return (
        <div style={{ ...S.formGroup, ...(span ? { gridColumn: columna } : {}) }} data-campo-error={error ? "1" : undefined}>
            <label style={{ ...S.label, ...(error ? { color: "#c0392b" } : {}) }}>{label}</label>
            <div style={error ? S.campoConError : undefined}>{children}</div>
            {error ? <span style={S.errorCampo}>{error}</span> : ayuda && <span style={S.ayuda}>{ayuda}</span>}
        </div>
    );
}

// Ancho por defecto amplio: los formularios se acomodan en 3 columnas y se leen mejor.
function Modal({ titulo, onClose, maxWidth = "min(980px, 94vw)", children, footer }) {
    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth }} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: "1rem" }}>{titulo}</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>{children}</div>
                {footer && <div style={S.modalFooter}>{footer}</div>}
            </div>
        </div>
    );
}

function SelectTipoDocumento({ value, onChange, disabled }) {
    return (
        <select style={S.input} value={value} onChange={onChange} disabled={disabled}>
            {Object.entries(TIPOS_DOCUMENTO).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
        </select>
    );
}

/* ─── Proyectos para los que trabaja: se marcan uno o varios ──────────── */
function CampoProyectos({ value, set, error }) {
    const opciones = useProyectosAliado();
    const marcados = value ?? [];
    const alternar = (id) => set("proyectos")({
        target: { value: marcados.includes(id) ? marcados.filter((x) => x !== id) : [...marcados, id] },
    });
    return (
        <Campo label="Proyecto(s) para los que trabaja *" span="full" error={error} ayuda="Marca todos los que apliquen (ej. HUGHES y DIRECTV). Salen de Parámetros > Proyectos.">
            <div style={S.checks}>
                {opciones.map((p) => (
                    <label key={p.id} style={S.check(marcados.includes(p.id))}>
                        <input type="checkbox" checked={marcados.includes(p.id)} onChange={() => alternar(p.id)} />
                        {p.nombre}
                    </label>
                ))}
            </div>
        </Campo>
    );
}

function CampoJefe({ value, set, error }) {
    const jefes = useJefesAliado();
    return (
        <Campo label="Jefe inmediato *" span={2} error={error}>
            <SelectBuscable style={S.input} value={value ?? ""} onChange={set("jefe_inmediato_id")}>
                <option value="">Seleccione…</option>
                {jefes.map((u) => <option key={u.id} value={u.id}>{u.name}{u.cargo ? ` (${u.cargo})` : ""}</option>)}
            </SelectBuscable>
        </Campo>
    );
}

function CampoModalidad({ value, set, error }) {
    const modalidades = useModalidadesAliado();
    return (
        <Campo label="Modalidad *" span={2} error={error}>
            <SelectBuscable style={S.input} value={value ?? ""} onChange={set("modalidad_id_bt")}>
                <option value="">Seleccione…</option>
                {modalidades.map((m) => <option key={m.id_bt} value={m.id_bt}>{m.nombre}</option>)}
            </SelectBuscable>
        </Campo>
    );
}

/* ─── Campos del aliado (empresa) ─────────────────────────────────────── */
// esPersona: es un aliado / técnico indirecto (al editarlo): su documento no se cambia aquí.
function CamposAliado({ form, set, errores = {}, esPersona }) {
    return (
        <div style={S.grid2}>
            <Campo label="Tipo de documento *" error={errores.tipo_documento}>
                <SelectTipoDocumento value={form.tipo_documento} onChange={set("tipo_documento")} disabled={esPersona} />
            </Campo>
            <Campo label="Número de documento *" error={errores.documento} ayuda={form.tipo_documento === "NIT" ? "Con o sin dígito de verificación, ej. 900123456-7" : null}>
                <input style={S.input} value={form.documento} onChange={set("documento")} disabled={esPersona} />
            </Campo>
            <Campo label="Razón social o nombre *" span={2} error={errores.nombre}>
                <input style={S.input} value={form.nombre} onChange={set("nombre")} placeholder="Ej. TECNOMARIN S.A.S" />
            </Campo>
            {!esPersona && (
                <>
                    <Campo label="Nombre del representante legal *" span={2} error={errores.representante_legal_nombre}>
                        <input style={S.input} value={form.representante_legal_nombre ?? ""} onChange={set("representante_legal_nombre")} placeholder="Ej. MARÍA PÉREZ GÓMEZ" />
                    </Campo>
                    <Campo label="Documento del representante legal *" error={errores.representante_legal_documento}>
                        <input style={S.input} value={form.representante_legal_documento ?? ""} onChange={set("representante_legal_documento")} inputMode="numeric" placeholder="Cédula, solo números" />
                    </Campo>
                    <Campo label="Código punto de venta (PDV) *" error={errores.codigo_pdv}>
                        <input style={S.input} value={form.codigo_pdv ?? ""} onChange={set("codigo_pdv")} inputMode="numeric" placeholder="Ej. 39582" />
                    </Campo>
                    <CampoModalidad value={form.modalidad_id_bt} set={set} error={errores.modalidad_id_bt} />
                </>
            )}
            <CampoProyectos value={form.proyectos} set={set} error={errores.proyectos} />
            <CampoJefe value={form.jefe_inmediato_id} set={set} error={errores.jefe_inmediato_id} />
            <Campo label="Teléfono *" error={errores.telefono}>
                <input style={S.input} value={form.telefono ?? ""} onChange={set("telefono")} inputMode="tel" />
            </Campo>
            <Campo label="Correo *" error={errores.correo}>
                <input style={S.input} type="email" value={form.correo ?? ""} onChange={set("correo")} />
            </Campo>
            <Campo label="Ciudad *" error={errores.ciudad}>
                <input style={S.input} value={form.ciudad ?? ""} onChange={set("ciudad")} />
            </Campo>
            <Campo label="Dirección *" span={2} error={errores.direccion}>
                <input style={S.input} value={form.direccion ?? ""} onChange={set("direccion")} />
            </Campo>
            <Campo label="Observaciones" span="full" error={errores.observaciones}>
                <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} value={form.observaciones ?? ""} onChange={set("observaciones")} />
            </Campo>
        </div>
    );
}

/* ─── Campos de la persona (técnico) ──────────────────────────────────── */
// conUbicacion: es el formulario del aliado / técnico indirecto (tipo de documento,
// proyectos, ciudad...); sin él, es solo un técnico más de un aliado empresa.
function CamposTecnico({ form, set, errores = {}, conUbicacion, cedulaBloqueada }) {
    const esNit = conUbicacion && form.tipo_documento === "NIT";
    return (
        <div style={S.grid2}>
            {conUbicacion && (
                <Campo label="Tipo de documento *" error={errores.tipo_documento}>
                    <SelectTipoDocumento value={form.tipo_documento} onChange={set("tipo_documento")} />
                </Campo>
            )}
            <Campo label={conUbicacion ? "Número de documento *" : "Cédula *"} error={errores.cedula}
                ayuda={esNit ? "NIT de persona natural: su cédula con el dígito de verificación, ej. 1020304050-3. Su usuario técnico queda con la cédula." : null}>
                <input style={S.input} value={form.cedula} onChange={set("cedula")} inputMode={esNit ? "text" : "numeric"} disabled={cedulaBloqueada} />
            </Campo>
            <Campo label="Celular *" error={errores.movil}>
                <input style={S.input} value={form.movil} onChange={set("movil")} inputMode="tel" />
            </Campo>
            <Campo label="Nombres *" error={errores.nombres}>
                <input style={S.input} value={form.nombres} onChange={set("nombres")} />
            </Campo>
            <Campo label="Apellidos *" error={errores.apellidos}>
                <input style={S.input} value={form.apellidos} onChange={set("apellidos")} />
            </Campo>
            <Campo label="Correo (con el que entra al ERP) *" span={2} error={errores.email}>
                <input style={S.input} type="email" value={form.email ?? ""} onChange={set("email")} />
            </Campo>
            {conUbicacion && (
                <>
                    <CampoProyectos value={form.proyectos} set={set} error={errores.proyectos} />
                    <CampoJefe value={form.jefe_inmediato_id} set={set} error={errores.jefe_inmediato_id} />
                    <Campo label="Ciudad *" error={errores.ciudad}>
                        <input style={S.input} value={form.ciudad} onChange={set("ciudad")} />
                    </Campo>
                    <Campo label="Dirección *" error={errores.direccion}>
                        <input style={S.input} value={form.direccion} onChange={set("direccion")} />
                    </Campo>
                    <Campo label="Observaciones" span="full" error={errores.observaciones}>
                        <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} value={form.observaciones} onChange={set("observaciones")} />
                    </Campo>
                </>
            )}
        </div>
    );
}

// Al corregir un campo se quita su marca de error.
const useFormulario = (inicial) => {
    const [form, setForm] = useState(inicial);
    const [errores, setErrores] = useState({});
    const set = (campo) => (e) => {
        setForm((f) => ({ ...f, [campo]: e.target.value }));
        setErrores((x) => (x[campo] ? { ...x, [campo]: undefined } : x));
    };
    return [form, set, errores, setErrores];
};

/* ─── Nuevo aliado: primero el tipo, luego los datos ──────────────────── */
function NuevoAliadoModal({ onClose, onCreado }) {
    const [tipo, setTipo] = useState(null);
    const [empresa, setEmpresa, erroresEmpresa, setErroresEmpresa] = useFormulario(ALIADO_VACIO);
    const [tecnico, setTecnico, erroresTecnico, setErroresTecnico] = useFormulario(TECNICO_VACIO);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const guardar = async () => {
        setSaving(true);
        setError("");
        try {
            const datos = tipo === "empresa" ? empresa : tecnico;
            const { data } = await api.post("/aliados", { tipo, ...datos });
            onCreado(data);
        } catch (err) {
            manejarError(err, tipo === "empresa" ? setErroresEmpresa : setErroresTecnico, setError, "No se pudo crear el aliado.");
        } finally {
            setSaving(false);
        }
    };

    if (!tipo) {
        return (
            <Modal titulo="Nuevo aliado" onClose={onClose} maxWidth="min(820px, 94vw)">
                <p style={{ marginTop: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>¿Qué tipo de aliado vas a registrar?</p>
                <div style={S.tarjetas}>
                    <button style={S.tarjeta} onClick={() => setTipo("empresa")}>
                        <span style={{ ...S.badge(TIPOS.empresa), alignSelf: "flex-start" }}>{TIPOS.empresa.nombre}</span>
                        <strong style={{ fontSize: "1rem" }}>Empresa con uno o más técnicos</strong>
                        <span style={S.tarjetaTexto}>
                            Ej. "Tecnotelevisión S.A.S". Se crea solo el aliado; sus técnicos se agregan
                            después desde su ficha, cuando se sepa quiénes son.
                        </span>
                    </button>
                    <button style={S.tarjeta} onClick={() => setTipo("tecnico")}>
                        <span style={{ ...S.badge(TIPOS.tecnico), alignSelf: "flex-start" }}>{TIPOS.tecnico.nombre}</span>
                        <strong style={{ fontSize: "1rem" }}>Una sola persona</strong>
                        <span style={S.tarjetaTexto}>
                            Ej. "Pedro Pérez": no es empleado, trabaja como aliado él solo. Con los mismos datos
                            se crea el aliado y también su usuario técnico para entrar al ERP.
                        </span>
                    </button>
                </div>
                <p style={{ marginBottom: 0, color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    Los técnicos directos no son aliados: son empleados y se registran en Contratos → Empleados.
                </p>
            </Modal>
        );
    }

    return (
        <Modal
            titulo={`Nuevo ${TIPOS[tipo].nombre.toLowerCase()}`}
            onClose={onClose}
            footer={
                <>
                    <button style={{ ...S.btnSecondary, marginRight: "auto" }} onClick={() => { setTipo(null); setError(""); }} disabled={saving}>← Cambiar tipo</button>
                    <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cancelar</button>
                    <button style={S.btnPrimary} onClick={guardar} disabled={saving}>{saving ? "Guardando…" : "Crear aliado"}</button>
                </>
            }
        >
            {tipo === "tecnico" && (
                <div style={S.info}>Se crearán el aliado <strong>y</strong> su usuario técnico con estos mismos datos, en el ERP y en AvanzaConoce (como los técnicos directos: "Empleado" de Solo Ausentismos, con la misma contraseña). Al final verás sus credenciales de acceso.</div>
            )}
            {tipo === "empresa" && (
                <div style={S.info}>Se creará el aliado aquí <strong>y</strong> su usuario en AvanzaConoce con rol "Aliado" (razón social, PDV, modalidad y su líder como supervisor). Al final verás su acceso a AvanzaConoce. Sus técnicos se agregan después desde su ficha.</div>
            )}
            {tipo === "empresa"
                ? <CamposAliado form={empresa} set={setEmpresa} errores={erroresEmpresa} />
                : <CamposTecnico form={tecnico} set={setTecnico} errores={erroresTecnico} conUbicacion />}
            {error && <div style={S.errorMsg}>{error}</div>}
        </Modal>
    );
}

/* ─── Editar datos del aliado ─────────────────────────────────────────── */
function EditarAliadoModal({ aliado, onClose, onGuardado }) {
    const [form, set, errores, setErrores] = useFormulario({ ...ALIADO_VACIO, ...aliado, proyectos: (aliado.proyectos ?? []).map((p) => p.id), jefe_inmediato_id: aliado.jefe_inmediato_id ?? "", codigo_pdv: aliado.codigo_pdv ?? "", modalidad_id_bt: aliado.modalidad_id_bt ?? "",
        representante_legal_nombre: aliado.representante_legal_nombre ?? "", representante_legal_documento: aliado.representante_legal_documento ?? "" });
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const guardar = async () => {
        setSaving(true);
        setError("");
        try {
            await api.put(`/aliados/${aliado.id}`, form);
            onGuardado();
        } catch (err) {
            manejarError(err, setErrores, setError, "No se pudo guardar.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            titulo={`Editar aliado · ${aliado.nombre}`}
            onClose={onClose}
            footer={
                <>
                    <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cancelar</button>
                    <button style={S.btnPrimary} onClick={guardar} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
                </>
            }
        >
            {aliado.tipo === "tecnico" && (
                <div style={S.info}>El documento es la cédula de su usuario técnico: no se cambia aquí. Los datos de acceso del técnico se editan en la lista de técnicos de su ficha.</div>
            )}
            <CamposAliado form={form} set={set} errores={errores} esPersona={aliado.tipo === "tecnico"} />
            <Campo label="Estado">
                <select style={{ ...S.input, maxWidth: 220 }} value={form.activo ? "1" : "0"} onChange={(e) => set("activo")({ target: { value: e.target.value === "1" } })}>
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                </select>
            </Campo>
            {error && <div style={S.errorMsg}>{error}</div>}
        </Modal>
    );
}

/* ─── Agregar o editar un técnico del aliado ──────────────────────────── */
function TecnicoModal({ aliado, tecnico, onClose, onGuardado }) {
    const editando = !!tecnico;
    const [form, set, errores, setErrores] = useFormulario(editando
        ? { ...TECNICO_VACIO, ...tecnico, email: tecnico.email ?? "", activo: tecnico.activo }
        : TECNICO_VACIO);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const guardar = async () => {
        setSaving(true);
        setError("");
        try {
            if (editando) {
                await api.put(`/aliados/${aliado.id}/tecnicos/${tecnico.id}`, form);
                onGuardado(null);
            } else {
                const { data } = await api.post(`/aliados/${aliado.id}/tecnicos`, form);
                onGuardado(data.credenciales);
            }
        } catch (err) {
            manejarError(err, setErrores, setError, "No se pudo guardar el técnico.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            titulo={editando ? `Editar técnico · ${tecnico.name}` : `Agregar técnico a ${aliado.nombre}`}
            onClose={onClose}
            footer={
                <>
                    <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cancelar</button>
                    <button style={S.btnPrimary} onClick={guardar} disabled={saving}>{saving ? "Guardando…" : editando ? "Guardar" : "Agregar técnico"}</button>
                </>
            }
        >
            <CamposTecnico form={form} set={set} errores={errores} cedulaBloqueada={editando} />
            {editando && (
                <Campo label="Acceso al ERP">
                    <select style={{ ...S.input, maxWidth: 220 }} value={form.activo ? "1" : "0"} onChange={(e) => set("activo")({ target: { value: e.target.value === "1" } })}>
                        <option value="1">Activo</option>
                        <option value="0">Inactivo</option>
                    </select>
                </Campo>
            )}
            {error && <div style={S.errorMsg}>{error}</div>}
        </Modal>
    );
}

/* ─── Credenciales del técnico recién creado ──────────────────────────── */
function CredencialesModal({ credenciales, onClose }) {
    const [copiado, setCopiado] = useState(false);
    const deAvanza = !!credenciales.de_avanza;
    const texto = `Usuario: ${credenciales.email}\nContraseña: ${deAvanza ? "la misma que usa en AvanzaConoce" : credenciales.password}`;
    const copiar = () => navigator.clipboard.writeText(texto).then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
    });

    return (
        <Modal titulo={`Credenciales de ${credenciales.nombre}`} onClose={onClose} maxWidth={480}
            footer={
                <>
                    <button style={S.btnSecondary} onClick={copiar}>{copiado ? "¡Copiado!" : "Copiar"}</button>
                    <button style={S.btnPrimary} onClick={onClose}>Listo</button>
                </>
            }
        >
            <p style={{ marginTop: 0, color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                {credenciales.solo_avanza
                    // Aliado empresa: su usuario es solo de AvanzaConoce (no entra al ERP).
                    ? (deAvanza
                        ? "Este aliado ya tenía usuario en AvanzaConoce con este NIT: entra allá con su correo y la contraseña que ya usa."
                        : "Acceso del aliado a AvanzaConoce (no al ERP). Guarda estas credenciales y compártelas con el aliado: la contraseña no podrá recuperarse después de cerrar esta ventana.")
                    : deAvanza
                        ? "Este técnico ya tiene usuario en AvanzaConoce: entra al ERP con su correo y la misma contraseña que usa allá."
                        : "Guarda estas credenciales y compártelas con el técnico. La contraseña no podrá recuperarse después de cerrar esta ventana."}
            </p>
            <div style={S.credenciales}>
                <div><span style={S.label}>Usuario</span><div style={S.credValor}>{credenciales.email}</div></div>
                <div><span style={S.label}>Contraseña</span><div style={S.credValor}>{deAvanza ? "La misma de AvanzaConoce" : credenciales.password}</div></div>
            </div>
            {/* Resultado de crear su usuario en AvanzaConoce. */}
            {credenciales.avanza && (
                <div style={S.avanza(["ok", "existente"].includes(credenciales.avanza.estado))}>
                    <strong>AvanzaConoce:</strong> {credenciales.avanza.mensaje}
                </div>
            )}
        </Modal>
    );
}

/* ─── Ficha del aliado: datos, técnicos y Work Orders ─────────────────── */
const CONTADORES = [
    { id: "", campo: "asignadas", label: "Asignadas" },
    { id: "atendidas", campo: "atendidas", label: "Atendidas" },
    { id: "finalizadas", campo: "finalizadas", label: "Finalizadas" },
];

function FichaModal({ aliadoId, puede, onClose, onCambio }) {
    const qc = useQueryClient();
    const modalidades = useModalidadesAliado();
    const [filtroEstado, setFiltroEstado] = useState("");
    const [filtroTecnico, setFiltroTecnico] = useState("");
    const [tecnicoModal, setTecnicoModal] = useState(null); // null | "nuevo" | técnico
    const [editarOpen, setEditarOpen] = useState(false);
    const [credenciales, setCredenciales] = useState(null);

    const { data: aliado, isLoading } = useQuery({
        queryKey: ["aliado", aliadoId],
        queryFn: () => api.get(`/aliados/${aliadoId}`).then((r) => r.data),
    });

    const { data: workOrders = [], isLoading: cargandoWo } = useQuery({
        queryKey: ["aliado-work-orders", aliadoId, filtroEstado, filtroTecnico],
        queryFn: () => api.get(`/aliados/${aliadoId}/work-orders`, {
            params: { estado: filtroEstado || undefined, cedula_tecnico: filtroTecnico || undefined },
        }).then((r) => r.data),
    });

    const refrescar = () => {
        qc.invalidateQueries({ queryKey: ["aliado", aliadoId] });
        qc.invalidateQueries({ queryKey: ["aliado-work-orders", aliadoId] });
        onCambio();
    };

    if (isLoading || !aliado) {
        return <Modal titulo="Aliado" onClose={onClose}><div style={S.empty}><IconLoading size={32} /></div></Modal>;
    }

    const tecnicoFiltrado = aliado.tecnicos.find((t) => t.cedula === filtroTecnico);

    return (
        <>
            <Modal titulo={aliado.nombre} onClose={onClose} maxWidth="min(1100px, 94vw)"
                footer={<button style={S.btnSecondary} onClick={onClose}>Cerrar</button>}>

                <div style={S.fichaCabecera}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={S.badge(TIPOS[aliado.tipo])}>{TIPOS[aliado.tipo].nombre}</span>
                        {!aliado.activo && <span style={S.badge({ color: "#a33", bg: "#fce8e8" })}>Inactivo</span>}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>{TIPOS_DOCUMENTO[aliado.tipo_documento] ?? aliado.tipo_documento} {aliado.documento}</span>
                    </div>
                    {puede.editar && (
                        <button style={S.btnSecondary} onClick={() => setEditarOpen(true)}>
                            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><IconEdit size={14} /> Editar datos</span>
                        </button>
                    )}
                </div>

                <p className="section-title" style={{ margin: "16px 0 10px" }}>Datos básicos</p>
                <div style={S.datos}>
                    {[
                        ...(aliado.tipo === "empresa" ? [
                            ["Representante legal", aliado.representante_legal_nombre
                                ? `${aliado.representante_legal_nombre}${aliado.representante_legal_documento ? ` · CC ${aliado.representante_legal_documento}` : ""}`
                                : null],
                            ["Código PDV", aliado.codigo_pdv],
                            ["Modalidad", modalidades.find((m) => m.id_bt === aliado.modalidad_id_bt)?.nombre],
                        ] : []),
                        ["Proyecto(s)", nombresProyectos(aliado)],
                        ["Jefe inmediato", aliado.jefe_inmediato?.name],
                        ["Teléfono", aliado.telefono], ["Correo", aliado.correo],
                        ["Ciudad", aliado.ciudad], ["Dirección", aliado.direccion], ["Observaciones", aliado.observaciones],
                    ].map(([label, valor]) => (
                        <div key={label}><span style={S.label}>{label}</span><div style={{ fontSize: "0.88rem" }}>{valor || "—"}</div></div>
                    ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 0 10px" }}>
                    <p className="section-title" style={{ margin: 0 }}>Técnicos ({aliado.tecnicos.length})</p>
                    {aliado.tipo === "empresa" && puede.crear && (
                        <button className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setTecnicoModal("nuevo")}>
                            <IconPlus size={14} /> Agregar técnico
                        </button>
                    )}
                </div>
                {aliado.tecnicos.length === 0 ? (
                    <div style={S.info}>Este aliado todavía no tiene técnicos. Agrégalos con el botón "Agregar técnico" cuando se sepa quiénes son.</div>
                ) : (
                    <div style={S.tableWrap}>
                        <table className="data-table" style={{ fontSize: "0.85rem" }}>
                            <thead>
                                <tr>
                                    <th>Técnico</th><th>Cédula</th><th>Celular</th><th>Usuario (correo)</th><th>Acceso</th>
                                    <th style={{ textAlign: "center" }}>Asig. / Aten. / Final.</th><th style={{ textAlign: "center" }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aliado.tecnicos.map((t) => (
                                    <tr key={t.id}>
                                        <td style={{ fontWeight: 700 }}>{t.name}</td>
                                        <td>{t.cedula}</td>
                                        <td>{t.movil || "—"}</td>
                                        <td style={{ color: "var(--text-muted)" }}>{t.email}</td>
                                        <td>{t.activo ? <span style={S.badge(TIPOS.tecnico)}>Activo</span> : <span style={S.badge({ color: "#a33", bg: "#fce8e8" })}>Inactivo</span>}</td>
                                        <td style={{ textAlign: "center" }}>{t.work_orders.asignadas} / {t.work_orders.atendidas} / {t.work_orders.finalizadas}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                                <button style={S.actionBtn("var(--primary-light)", "var(--primary-dark)")} title="Ver sus Work Orders" onClick={() => setFiltroTecnico(t.cedula)}>
                                                    <IconEye size={14} />
                                                </button>
                                                {puede.editar && (
                                                    <button style={S.actionBtn("#eef2ff", "#3949ab")} title="Editar técnico" onClick={() => setTecnicoModal(t)}>
                                                        <IconEdit size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className="section-title" style={{ margin: "20px 0 10px" }}>Work Orders</p>
                <div style={S.contadores}>
                    {CONTADORES.map((c) => (
                        <button key={c.campo} style={S.contador(filtroEstado === c.id)} onClick={() => setFiltroEstado(c.id)}>
                            <span style={{ fontSize: "1.5rem", fontWeight: 800 }}>{aliado.work_orders[c.campo]}</span>
                            <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{c.label}</span>
                        </button>
                    ))}
                </div>
                {tecnicoFiltrado && (
                    <div style={{ ...S.info, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Mostrando solo las de <strong>{tecnicoFiltrado.name}</strong></span>
                        <button style={S.btnSecondary} onClick={() => setFiltroTecnico("")}>Ver todas</button>
                    </div>
                )}
                <div style={S.tableWrap}>
                    {cargandoWo ? (
                        <div style={S.empty}><IconLoading size={28} /></div>
                    ) : workOrders.length === 0 ? (
                        <div style={S.empty}><IconEmptySearch size={36} /><p style={{ margin: 0 }}>No hay Work Orders para mostrar.</p></div>
                    ) : (
                        <table className="data-table" style={{ fontSize: "0.84rem" }}>
                            <thead>
                                <tr><th>N° WO</th><th>Estado</th><th>Técnico</th><th>Servicio</th><th>Municipio</th><th>Fecha de atención</th><th>Fecha de finalización</th></tr>
                            </thead>
                            <tbody>
                                {workOrders.map((w) => (
                                    <tr key={w.id}>
                                        <td style={{ fontWeight: 700 }}>{w.numero_wo}{w.numero_item ? <span style={{ color: "var(--text-muted)" }}> · {w.numero_item}</span> : null}</td>
                                        <td>{w.estado || "—"}</td>
                                        <td>{w.nombre_tecnico || w.cedula_tecnico}</td>
                                        <td>{w.servicio || "—"}</td>
                                        <td>{w.municipio || "—"}</td>
                                        <td>{w.fecha_estado || "—"}</td>
                                        <td>{w.fecha_finalizacion || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Modal>

            {editarOpen && (
                <EditarAliadoModal aliado={aliado} onClose={() => setEditarOpen(false)} onGuardado={() => { setEditarOpen(false); refrescar(); }} />
            )}
            {tecnicoModal && (
                <TecnicoModal
                    aliado={aliado}
                    tecnico={tecnicoModal === "nuevo" ? null : tecnicoModal}
                    onClose={() => setTecnicoModal(null)}
                    onGuardado={(cred) => { setTecnicoModal(null); refrescar(); if (cred) setCredenciales(cred); }}
                />
            )}
            {credenciales && <CredencialesModal credenciales={credenciales} onClose={() => setCredenciales(null)} />}
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function AliadosCrud() {
    // Acciones que la matriz de Permisos le deja hacer a este rol aquí (el servidor las vuelve a validar).
    const puede = useAcciones();
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debSearch = useDebounce(search, 300);
    const [tipoFiltro, setTipoFiltro] = useState("");
    const [proyectoFiltro, setProyectoFiltro] = useState("");
    const proyectosOpciones = useProyectosAliado();
    const [nuevoOpen, setNuevoOpen] = useState(false);
    const [fichaId, setFichaId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [credenciales, setCredenciales] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    // Por páginas de 10; los filtros y el resumen de arriba se calculan en el servidor sobre todos.
    const [pagina, setPagina] = useState(1);
    useEffect(() => setPagina(1), [debSearch, tipoFiltro, proyectoFiltro]);

    const { data: resultado, isLoading } = useQuery({
        queryKey: ["aliados", debSearch, tipoFiltro, proyectoFiltro, pagina],
        queryFn: () => api.get("/aliados", { params: { search: debSearch || undefined, tipo: tipoFiltro || undefined, proyecto: proyectoFiltro || undefined, page: pagina } }).then((r) => r.data),
        placeholderData: (prev) => prev,
    });
    const aliados = resultado?.data ?? [];
    const resumen = resultado?.resumen ?? { aliados: 0, empresa: 0, tecnico: 0, tecnicos: 0 };
    const total = resultado?.total ?? 0;
    const porPagina = resultado?.per_page ?? 10;
    const ultimaPagina = resultado?.last_page ?? 1;
    // Si se eliminó la última fila de la última página, volver a la anterior.
    useEffect(() => {
        if (pagina > ultimaPagina) setPagina(ultimaPagina);
    }, [pagina, ultimaPagina]);

    const invalidate = () => qc.invalidateQueries({ queryKey: ["aliados"] });

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/aliados/${deleteTarget.id}`);
            invalidate();
            setDeleteTarget(null);
            showToast("Aliado eliminado.");
        } catch (err) {
            setDeleteTarget(null);
            showToast(mensajeError(err, "No se pudo eliminar."));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div style={{ width: "100%" }}>
            {toast && <div style={S.toast}>{toast}</div>}

            <div className="stats-row">
                <div className="stat-card"><div className="stat-num">{resumen.aliados}</div><div className="stat-label">Aliados</div></div>
                <div className="stat-card"><div className="stat-num">{resumen.empresa}</div><div className="stat-label">Aliados empresa</div></div>
                <div className="stat-card"><div className="stat-num">{resumen.tecnico}</div><div className="stat-label">Aliados indirectos</div></div>
                <div className="stat-card"><div className="stat-num">{resumen.tecnicos}</div><div className="stat-label">Técnicos</div></div>
            </div>

            <div style={S.toolbar}>
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}><IconSearch size={15} /></span>
                    <input style={S.searchInput} placeholder="Buscar por aliado, documento, técnico o cédula…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select style={S.filtroSelect} value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
                    <option value="">Todos los tipos</option>
                    <option value="empresa">Aliados empresa</option>
                    <option value="tecnico">Aliados indirectos</option>
                </select>
                <select style={S.filtroSelect} value={proyectoFiltro} onChange={(e) => setProyectoFiltro(e.target.value)}>
                    <option value="">Todos los proyectos</option>
                    {proyectosOpciones.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                {puede.crear && (
                    <button className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setNuevoOpen(true)}>
                        <IconPlus size={14} /> Nuevo aliado
                    </button>
                )}
            </div>

            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
                ) : aliados.length === 0 ? (
                    <div style={S.empty}><IconEmptySearch size={44} /><p>No hay aliados registrados con estos filtros.</p></div>
                ) : (
                    <table className="data-table" style={{ fontSize: "0.85rem" }}>
                        <thead>
                            <tr>
                                <th>Aliado</th><th>Documento</th><th>Tipo</th><th>Proyecto(s)</th><th>Ciudad</th><th style={{ textAlign: "center" }}>Técnicos</th>
                                <th style={{ textAlign: "center" }}>Asignadas</th><th style={{ textAlign: "center" }}>Atendidas</th><th style={{ textAlign: "center" }}>Finalizadas</th>
                                <th>Estado</th><th style={{ textAlign: "center" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aliados.map((a) => (
                                <tr key={a.id}>
                                    <td style={{ fontWeight: 700 }}>{a.nombre}</td>
                                    <td style={{ color: "var(--text-muted)" }}>{a.tipo_documento} {a.documento}</td>
                                    <td><span style={S.badge(TIPOS[a.tipo])}>{TIPOS[a.tipo].label}</span></td>
                                    <td>{nombresProyectos(a) || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                                    <td>{a.ciudad || "—"}</td>
                                    <td style={{ textAlign: "center" }}>{a.tecnicos_count}</td>
                                    <td style={{ textAlign: "center" }}>{a.work_orders.asignadas}</td>
                                    <td style={{ textAlign: "center" }}>{a.work_orders.atendidas}</td>
                                    <td style={{ textAlign: "center" }}>{a.work_orders.finalizadas}</td>
                                    <td>{a.activo ? "Activo" : <span style={{ color: "#a33" }}>Inactivo</span>}</td>
                                    <td style={{ textAlign: "center" }}>
                                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                            <button style={S.actionBtn("var(--primary-light)", "var(--primary-dark)")} title="Ver ficha" onClick={() => setFichaId(a.id)}>
                                                <IconEye size={14} />
                                            </button>
                                            {puede.eliminar && a.tecnicos_count === 0 && (
                                                <button style={S.actionBtn("#fce8e8", "#a33")} title="Eliminar" onClick={() => setDeleteTarget(a)}>
                                                    <IconTrash size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {total > 0 && (
                <div style={S.paginationBar}>
                    <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                        {(pagina - 1) * porPagina + 1}–{Math.min(pagina * porPagina, total)} de {total}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button style={S.pageBtn(pagina === 1)} disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>‹</button>
                        <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>Página {pagina} de {ultimaPagina}</span>
                        <button style={S.pageBtn(pagina === ultimaPagina)} disabled={pagina === ultimaPagina} onClick={() => setPagina((p) => p + 1)}>›</button>
                    </div>
                </div>
            )}

            {nuevoOpen && (
                <NuevoAliadoModal
                    onClose={() => setNuevoOpen(false)}
                    onCreado={(data) => {
                        setNuevoOpen(false);
                        invalidate();
                        showToast(`Aliado ${data.aliado.nombre} creado.`);
                        if (data.credenciales) setCredenciales(data.credenciales);
                        else setFichaId(data.aliado.id);
                    }}
                />
            )}

            {fichaId && <FichaModal aliadoId={fichaId} puede={puede} onClose={() => setFichaId(null)} onCambio={invalidate} />}

            {credenciales && <CredencialesModal credenciales={credenciales} onClose={() => setCredenciales(null)} />}

            {deleteTarget && (
                <Modal titulo="Eliminar aliado" onClose={() => setDeleteTarget(null)} maxWidth={420}
                    footer={
                        <>
                            <button style={S.btnSecondary} onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</button>
                            <button style={{ ...S.btnPrimary, background: "#c0392b" }} onClick={handleDelete} disabled={deleting}>{deleting ? "Eliminando…" : "Eliminar"}</button>
                        </>
                    }>
                    <p style={{ margin: 0 }}>¿Eliminar el aliado <strong>{deleteTarget.nombre}</strong>?</p>
                </Modal>
            )}
        </div>
    );
}

const S = {
    toolbar: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" },
    searchWrap: { position: "relative", flex: 1, minWidth: 240, maxWidth: 420 },
    searchIcon: { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", display: "flex" },
    searchInput: { width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", boxSizing: "border-box" },
    filtroSelect: { padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", fontFamily: "Nunito,sans-serif", background: "var(--white)", color: "var(--text)", outline: "none", minWidth: 180 },
    tableWrap: { background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflowX: "auto" },
    actionBtn: (bg, color) => ({ background: bg, border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color, display: "flex", alignItems: "center", justifyContent: "center" }),
    empty: { padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    modal: { background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", width: "100%", fontFamily: "Nunito,sans-serif", maxHeight: "92vh", display: "flex", flexDirection: "column" },
    modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1.5px solid var(--border)", flexShrink: 0 },
    modalBody: { padding: "18px 22px", overflowY: "auto", flex: 1 },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px 18px", borderTop: "1.5px solid var(--border)", flexShrink: 0 },
    grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))", gap: 14 },
    formGroup: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
    label: { fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" },
    ayuda: { fontSize: "0.74rem", color: "var(--text-muted)" },
    avanza: (ok) => ({
        marginTop: 12, borderRadius: 6, padding: "9px 12px", fontSize: "0.82rem", lineHeight: 1.5,
        background: ok ? "#e8f8f5" : "#fff4e0", color: ok ? "var(--primary-dark)" : "#8a5a00",
    }),
    errorCampo: { fontSize: "0.76rem", color: "#c0392b", fontWeight: 600, lineHeight: 1.4 },
    campoConError: { borderRadius: "var(--radius-sm)", boxShadow: "0 0 0 1.5px #e57373" },
    paginationBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", flexWrap: "wrap", gap: 10 },
    pageBtn: (disabled) => ({
        minWidth: 32, height: 32, padding: "0 8px", border: "1.5px solid var(--border)", borderRadius: 6,
        background: disabled ? "var(--bg)" : "var(--white)", color: disabled ? "var(--text-muted)" : "var(--text)",
        fontWeight: 700, fontSize: "0.85rem", cursor: disabled ? "default" : "pointer",
    }),
    input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "0.88rem", fontFamily: "Nunito,sans-serif", color: "var(--text)", background: "var(--white)", outline: "none" },
    btnPrimary: { padding: "9px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnSecondary: { padding: "9px 18px", background: "var(--white)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "Nunito,sans-serif" },
    btnIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", borderRadius: 6 },
    errorMsg: { background: "#fce8e8", color: "#c0392b", borderRadius: 6, padding: "8px 12px", fontSize: "0.84rem", fontWeight: 600, marginTop: 12 },
    info: { background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "0.85rem", color: "var(--text)", marginBottom: 14, lineHeight: 1.5 },
    toast: { position: "fixed", bottom: 28, right: 28, background: "var(--primary)", color: "#fff", borderRadius: "var(--radius-sm)", padding: "13px 22px", fontWeight: 700, fontSize: "0.92rem", zIndex: 99999, boxShadow: "0 8px 28px rgba(26,155,140,0.35)" },
    badge: ({ color, bg }) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 800, color, background: bg }),
    tarjetas: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 14 },
    tarjeta: { display: "flex", flexDirection: "column", gap: 8, textAlign: "left", padding: 18, border: "1.5px solid var(--border)", borderRadius: "var(--radius)", background: "var(--white)", cursor: "pointer", fontFamily: "Nunito,sans-serif", color: "var(--text)" },
    tarjetaTexto: { fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.5 },
    fichaCabecera: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
    datos: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))", gap: 12, background: "var(--bg)", borderRadius: "var(--radius-sm)", padding: 14 },
    contadores: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 },
    contador: (activo) => ({
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "12px 8px", cursor: "pointer", fontFamily: "Nunito,sans-serif",
        border: `1.5px solid ${activo ? "var(--primary)" : "var(--border)"}`, borderRadius: "var(--radius-sm)",
        background: activo ? "var(--primary-light)" : "var(--white)", color: activo ? "var(--primary-dark)" : "var(--text)",
    }),
    credenciales: { background: "var(--bg)", borderRadius: "var(--radius-sm)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 },
    credValor: { fontFamily: "monospace", fontSize: "0.95rem", fontWeight: 700, marginTop: 4, wordBreak: "break-all" },
    checks: { display: "flex", gap: 10, flexWrap: "wrap" },
    check: (marcado) => ({
        display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", cursor: "pointer", fontSize: "0.86rem", fontWeight: 700,
        border: `1.5px solid ${marcado ? "var(--primary)" : "var(--border)"}`, borderRadius: "var(--radius-sm)",
        background: marcado ? "var(--primary-light)" : "var(--white)", color: marcado ? "var(--primary-dark)" : "var(--text)",
    }),
};
