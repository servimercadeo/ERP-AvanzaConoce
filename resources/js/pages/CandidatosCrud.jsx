import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";
import {
    IconEye,
    IconEdit,
    IconClose,
    IconGestionar,
} from "../components/Icons";
import { SearchableSelect } from "../components/SearchableSelect";

const getTodayStr = () => new Date().toISOString().slice(0, 10);

const FIXED_DOCS = ["Hoja de vida", "Pruebas psicotécnicas"];

const MESES = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
];

const interviewDateFrom = (dateStr) => {
    if (!dateStr)
        return { dia_entrevista: "", mes_entrevista: "", anio_entrevista: "" };
    const d = new Date(dateStr + "T00:00:00");
    return {
        dia_entrevista: d.getDate(),
        mes_entrevista: MESES[d.getMonth()],
        anio_entrevista: d.getFullYear(),
    };
};

const MOCK_OPTS = {
    tipos_documento: [
        "Cédula de Ciudadanía",
        "Cédula de Extranjería",
        "Pasaporte",
        "Tarjeta de Identidad",
    ],
    fuentes_reclutamiento: [
        "Fase Inicial",
        "Vinculacion temporal",
        "Vinculacion directa",
    ],
    fuentes_especificas: ["Pendiente de Aval", "Contratar por S&M"],
    estados_proceso: ["Entrevista", "Contratación", "Descartado", "En espera"],
    meses: [
        "ENERO",
        "FEBRERO",
        "MARZO",
        "ABRIL",
        "MAYO",
        "JUNIO",
        "JULIO",
        "AGOSTO",
        "SEPTIEMBRE",
        "OCTUBRE",
        "NOVIEMBRE",
        "DICIEMBRE",
    ],
};

export default function CandidatosCrud() {
    const [candidates, setCandidates] = useState([]);
    const [requisitions, setRequisitions] = useState([]);
    const [ciudadesOpts, setCiudadesOpts] = useState([]);
    const [sedesOpts, setSedesOpts] = useState([]);
    const [arlsOpts, setArlsOpts] = useState([]);
    const [cajasOpts, setCajasOpts] = useState([]);
    // loadingData is derived from React Query (see queries below)
    const [candDetailSearch, setCandDetailSearch] = useState("");
    const debouncedSearch = useDebounce(candDetailSearch, 300);
    const [isCandModalOpen, setIsCandModalOpen] = useState(false);
    const [candModalMode, setCandModalMode] = useState("create");
    const [candForm, setCandForm] = useState({
        nombres: "",
        correo: "",
        celular: "",
        ciudad_id: "",
        tipo_documento: "Cédula de Ciudadanía",
        identificacion: "",
        fecha_expedicion: "",
        edad: "",
        fecha_postulacion: getTodayStr(),
        fuente: "Fase Inicial",
        fuente_especifica: "Pendiente de Aval",
        estado: "Entrevista",
        ...interviewDateFrom(getTodayStr()),
        observaciones: "",
        tasa_riesgo_arl: "",
        salario_basico: "",
        auxilio_transporte: "",
        otrosi_variable: "",
        auxilio_rodamiento: "",
        auxilio_comunicacion: "",
        auxilio_alimentacion: "",
        lugar_trabajo: "",
        fecha_programacion_ingreso: "",
        fecha_correccion: "",
    });
    const [docs, setDocs] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(null);
    const [newDocFile, setNewDocFile] = useState(null);

    const [isProcModalOpen, setIsProcModalOpen] = useState(false);
    const [procModalCandidate, setProcModalCandidate] = useState(null);
    const [vinculacionModal, setVinculacionModal] = useState({
        open: false,
        candidateId: null,
        tipo: "Directa",
    });
    const [toast, setToast] = useState(null);
    const [confirmDlg, setConfirmDlg] = useState({
        open: false,
        title: "",
        msg: "",
        onConfirm: null,
    });
    const [alertDlg, setAlertDlg] = useState({
        open: false,
        title: "",
        msg: "",
    });
    const showAlert = (title, msg) => setAlertDlg({ open: true, title, msg });

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const showConfirm = (title, msg, onConfirm) =>
        setConfirmDlg({ open: true, title, msg, onConfirm });
    const handleConfirmOk = () => {
        const fn = confirmDlg.onConfirm;
        setConfirmDlg({ open: false, title: "", msg: "", onConfirm: null });
        fn?.();
    };
    const handleConfirmCancel = () =>
        setConfirmDlg({ open: false, title: "", msg: "", onConfirm: null });
    const [procActiveTab, setProcActiveTab] = useState("assesment");
    const [procForm, setProcForm] = useState({});

    const { data: _qCandidates, isLoading: _lc } = useQuery({
        queryKey: ["candidatos"],
        queryFn: () => api.get("/candidatos").then((r) => r.data),
    });
    const { data: _qRequisitions, isLoading: _lr } = useQuery({
        queryKey: ["requisiciones"],
        queryFn: () => api.get("/requisiciones").then((r) => r.data),
    });
    const { data: _qCatalogos, isLoading: _lk } = useQuery({
        queryKey: ["seleccion-catalogos"],
        queryFn: () => api.get("/seleccion/catalogos").then((r) => r.data),
    });
    const { data: _qSedes } = useQuery({
        queryKey: ["sedes"],
        queryFn: () => api.get("/sedes").then((r) => r.data),
    });
    const loadingData = _lc || _lr || _lk;

    useEffect(() => {
        if (_qCandidates) setCandidates(_qCandidates);
    }, [_qCandidates]);
    useEffect(() => {
        if (_qRequisitions) setRequisitions(_qRequisitions);
    }, [_qRequisitions]);
    useEffect(() => {
        if (_qCatalogos) {
            setCiudadesOpts(
                (_qCatalogos.ciudades || []).map((ci) => ({
                    value: String(ci.id),
                    label: ci.nombre,
                })),
            );
            setArlsOpts((_qCatalogos.arls || []).map((n) => ({ value: n, label: n })));
            setCajasOpts((_qCatalogos.cajas || []).map((n) => ({ value: n, label: n })));
        }
    }, [_qCatalogos]);
    useEffect(() => {
        if (_qSedes)
            setSedesOpts(
                (_qSedes?.data ?? _qSedes ?? []).map((s) => ({
                    value: s.nombre,
                    label: s.nombre,
                })),
            );
    }, [_qSedes]);

    const reload = () =>
        api
            .get("/candidatos")
            .then((r) => setCandidates(r.data))
            .catch(console.error);

    useEffect(() => {
        if (isCandModalOpen) {
            document.documentElement.style.overflowY = "hidden";
            document.body.style.overflowY = "hidden";
        } else {
            document.documentElement.style.overflowY = "";
            document.body.style.overflowY = "";
        }
        return () => {
            document.documentElement.style.overflowY = "";
            document.body.style.overflowY = "";
        };
    }, [isCandModalOpen]);

    const doToggleField = (candidateId, field, extraData = {}) => {
        const candidate = candidates.find((x) => x.id === candidateId);
        if (!candidate) return;

        const val = !candidate[field];
        let nextEstado = candidate.estado;
        const extra = { ...extraData };
        if (field === "pruebas" || field === "aval") {
            const newPruebas = field === "pruebas" ? val : candidate.pruebas;
            const newAval = field === "aval" ? val : candidate.aval;
            nextEstado = newPruebas && newAval ? "Contratación" : "Entrevista";
            if (field === "aval") {
                extra.fecha_aval = val
                    ? new Date().toISOString().slice(0, 10)
                    : null;
                if (!val) extra.tipo_vinculacion = null;
            }
        }

        setCandidates((prev) =>
            prev.map((c) =>
                c.id === candidateId
                    ? { ...c, [field]: val, estado: nextEstado, ...extra }
                    : c,
            ),
        );

        api.put(`/candidatos/${candidateId}`, {
            [field]: val,
            estado: nextEstado,
            ...extra,
        }).catch((err) => {
            setCandidates((prev) =>
                prev.map((c) => (c.id === candidateId ? candidate : c)),
            );
            showAlert(
                "Error",
                err.response?.data?.message || "Error al guardar el cambio.",
            );
        });
    };

    const toggleCandidateField = (candidateId, field) => {
        const candidate = candidates.find((x) => x.id === candidateId);
        if (!candidate) return;
        const currentVal = !!candidate[field];
        if (currentVal) {
            const label =
                field === "pruebas"
                    ? "Pruebas psicotécnicas"
                    : "Aval de contratación";
            showConfirm(
                `¿Desactivar "${label}"?`,
                "Esta acción puede afectar el proceso del candidato.",
                () => doToggleField(candidateId, field),
            );
            return;
        }
        if (field === "aval") {
            if (!candidate.tasa_riesgo_arl || !candidate.salario_basico) {
                showAlert(
                    "Remuneración incompleta",
                    "Completa los campos de remuneración del candidato (Tasa de riesgo ARL y Salario básico) antes de activar el Aval de contratación.",
                );
                return;
            }
            setVinculacionModal({ open: true, candidateId, tipo: "Directa" });
            return;
        }
        doToggleField(candidateId, field);
    };

    const handleConfirmVinculacion = () => {
        doToggleField(vinculacionModal.candidateId, "aval", {
            tipo_vinculacion: vinculacionModal.tipo,
        });
        setVinculacionModal({
            open: false,
            candidateId: null,
            tipo: "Directa",
        });
    };

    const handleAddCandidate = () => {
        setCandModalMode("create");
        setCandForm({
            nombres: "",
            correo: "",
            celular: "",
            ciudad_id: "",
            tipo_documento: "Cédula de Ciudadanía",
            identificacion: "",
            fecha_expedicion: "",
            edad: "",
            fecha_postulacion: getTodayStr(),
            fuente: "Fase Inicial",
            fuente_especifica: "Pendiente de Aval",
            estado: "Entrevista",
            ...interviewDateFrom(getTodayStr()),
            observaciones: "",
            requisicion_id: "",
        });
        setIsCandModalOpen(true);
    };

    const handleEditCandidate = (c) => {
        setCandModalMode("edit");
        setCandForm({ ...c, ...interviewDateFrom(c.fecha_postulacion) });
        setNewDocFile(null);
        setDocsLoading(true);
        setDocs([]);
        setIsCandModalOpen(true);
        api.get(`/candidatos/${c.id}/documentos`)
            .then((r) => setDocs(r.data))
            .catch(console.error)
            .finally(() => setDocsLoading(false));
    };

    const REQUIRED_DOCS = ["Hoja de vida", "Pruebas psicotécnicas"];

    const handleUploadDoc = async (nombre, file) => {
        setUploadingDoc(nombre);
        const fd = new FormData();
        fd.append("nombre", nombre);
        fd.append("archivo", file);
        try {
            const { data } = await api.post(
                `/candidatos/${candForm.id}/documentos`,
                fd,
                {
                    headers: { "Content-Type": undefined },
                },
            );
            setDocs((prev) => {
                const filtered = prev.filter((d) => d.nombre !== nombre);
                return [...filtered, data].sort((a, b) =>
                    a.nombre.localeCompare(b.nombre),
                );
            });
            if (REQUIRED_DOCS.includes(nombre)) {
                reload();
            }
        } catch (e) {
            showAlert("Error al subir", e.response?.data?.message || e.message);
        } finally {
            setUploadingDoc(null);
        }
    };

    const doDeleteDoc = async (doc) => {
        try {
            await api.delete(`/candidatos/${candForm.id}/documentos/${doc.id}`);
            setDocs((prev) => prev.filter((d) => d.id !== doc.id));
            if (REQUIRED_DOCS.includes(doc.nombre)) {
                setCandidates((prev) =>
                    prev.map((c) => {
                        if (c.id !== candForm.id) return c;
                        const updatedDocs = (c.documentos || []).filter(
                            (d) => d.nombre !== doc.nombre,
                        );
                        const stillOk =
                            updatedDocs.filter((d) =>
                                REQUIRED_DOCS.includes(d.nombre),
                            ).length >= 2;
                        if (!stillOk && (c.pruebas || c.aval)) {
                            api.put(`/candidatos/${candForm.id}`, {
                                pruebas: false,
                                aval: false,
                                fecha_aval: null,
                                estado: "Entrevista",
                            }).catch(console.error);
                            return {
                                ...c,
                                documentos: updatedDocs,
                                pruebas: false,
                                aval: false,
                                fecha_aval: null,
                                estado: "Entrevista",
                            };
                        }
                        return { ...c, documentos: updatedDocs };
                    }),
                );
            }
        } catch (e) {
            showAlert(
                "Error al eliminar",
                e.response?.data?.message || e.message,
            );
        }
    };

    const handleDeleteDoc = (doc) => {
        showConfirm(
            "¿Eliminar documento?",
            `"${doc.nombre}" será eliminado permanentemente.`,
            () => doDeleteDoc(doc),
        );
    };

    const handleDownloadDoc = async (candidatoId, docId, nombreOriginal) => {
        try {
            const res = await api.get(
                `/candidatos/${candidatoId}/documentos/${docId}/download`,
                { responseType: "blob" },
            );
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = nombreOriginal;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            showAlert("Error", "Error al descargar el documento.");
        }
    };

    const handleAddCustomDoc = async () => {
        if (!newDocFile) {
            showAlert(
                "Archivo requerido",
                "Selecciona un archivo antes de agregar.",
            );
            return;
        }
        const nombre = newDocFile.name.replace(/\.[^/.]+$/, "");
        await handleUploadDoc(nombre, newDocFile);
        setNewDocFile(null);
    };

    const handleOpenProcesos = (c) => {
        setProcModalCandidate(c);
        setProcActiveTab("assesment");
        setProcForm({
            assesment: {
                ejercicio_comercial: c.asmt_ejercicio ?? "",
                nombre_ejercicio: c.asmt_nombre_ejercicio ?? "",
                claridad_mensaje: c.asmt_claridad_mensaje ?? "",
                conviccion_energia: c.asmt_conviccion_energia ?? "",
                adaptabilidad_escucha: c.asmt_adaptabilidad_escucha ?? "",
                orientacion_accion: c.asmt_orientacion_accion ?? "",
                manejo_presion: c.asmt_manejo_presion ?? "",
                prom_calificacion: c.asmt_prom ?? "",
            },
            entrevista: {
                trayectoria: c.entv_trayectoria ?? "",
                conexion_cliente: c.entv_conexion_cliente ?? "",
                aprendizaje_madurez: c.entv_aprendizaje_madurez ?? "",
                motivacion: c.entv_motivacion ?? "",
                disposicion_proyecto: c.entv_disposicion_proyecto ?? "",
                prom_calificacion: c.entv_prom ?? "",
            },
            retroalimentacion: c.retroalimentacion ?? "",
            referencias: {
                ref_laboral_1: c.ref_laboral_1 ?? "",
                ref_laboral_2: c.ref_laboral_2 ?? "",
            },
            fraudes: {
                numero_seguimiento: c.fraude_nro_seguimiento ?? "",
                respuesta: c.fraude_respuesta ?? "",
                ciudad: c.fraude_ciudad ?? "",
                fecha_consulta: c.fraude_fecha_consulta ?? "",
                fuente_reclutamiento: c.fraude_fuente ?? "",
            },
            seguridad: { estudio: c.seguridad_estudio ?? "" },
        });
        setIsProcModalOpen(true);
    };

    const round = (v, decimals = 1) => {
        if (v === "" || v === null || typeof v === "undefined") return "";
        const m = Math.pow(10, decimals);
        return Math.round(Number(v) * m) / m;
    };

    const computeAverage = (obj, keys) => {
        if (!obj) return "";
        const vals = keys
            .map((k) => parseFloat(obj[k]))
            .filter((n) => !isNaN(n));
        if (vals.length === 0) return "";
        const sum = vals.reduce((a, b) => a + b, 0);
        return round(sum / vals.length, 1);
    };

    const handleProcNumberChange = (section, key) => (e) => {
        const raw = e.target.value;
        const num = raw === "" ? "" : Number(raw);
        setProcForm((p) => {
            const next = { ...p, [section]: { ...p[section], [key]: num } };
            const assesmentKeys = [
                "claridad_mensaje",
                "conviccion_energia",
                "adaptabilidad_escucha",
                "orientacion_accion",
                "manejo_presion",
            ];
            const entrevistaKeys = [
                "trayectoria",
                "conexion_cliente",
                "aprendizaje_madurez",
                "motivacion",
                "disposicion_proyecto",
            ];
            if (section === "assesment") {
                next.assesment.prom_calificacion = computeAverage(
                    next.assesment,
                    assesmentKeys,
                );
            } else if (section === "entrevista") {
                next.entrevista.prom_calificacion = computeAverage(
                    next.entrevista,
                    entrevistaKeys,
                );
            }
            return next;
        });
    };

    const handleViewCandidate = (c) => {
        setCandModalMode("view");
        setCandForm({ ...c, ...interviewDateFrom(c.fecha_postulacion) });
        setIsCandModalOpen(true);
    };

    const doRemoveCandidate = async (candidateId) => {
        try {
            await api.delete(`/candidatos/${candidateId}`);
            setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
        } catch (e) {
            showAlert(
                "Error al eliminar",
                e.response?.data?.message || e.message,
            );
        }
    };

    const handleRemoveCandidate = (candidateId) => {
        showConfirm(
            "¿Eliminar candidato?",
            "Esta acción eliminará al candidato y todos sus datos. No se puede deshacer.",
            () => doRemoveCandidate(candidateId),
        );
    };

    const handleSaveCandidate = async () => {
        if (
            !candForm.nombres ||
            !candForm.correo ||
            !candForm.celular ||
            !candForm.identificacion
        ) {
            showAlert(
                "Campos obligatorios",
                "Por favor, rellene todos los campos obligatorios (*) antes de guardar.",
            );
            return;
        }
        try {
            if (candModalMode === "create") {
                const { data: created } = await api.post("/candidatos", {
                    ...candForm,
                    pruebas: false,
                    aval: false,
                });
                setCandidates((prev) => [created, ...prev]);
            } else {
                // eslint-disable-next-line no-unused-vars
                const { pruebas: _p, aval: _a, ...editPayload } = candForm;
                const { data: updated } = await api.put(
                    `/candidatos/${candForm.id}`,
                    editPayload,
                );
                setCandidates((prev) =>
                    prev.map((c) => (c.id === candForm.id ? updated : c)),
                );
            }
            setIsCandModalOpen(false);
            showToast(
                candModalMode === "create"
                    ? "Candidato agregado exitosamente"
                    : "Candidato actualizado exitosamente",
            );
        } catch (e) {
            showAlert(
                "Error al guardar",
                e.response?.data?.message || e.message,
            );
        }
    };

    const handleSaveProcesos = async () => {
        if (!procModalCandidate) return setIsProcModalOpen(false);
        const f = procForm;
        const payload = {
            asmt_ejercicio: f.assesment?.ejercicio_comercial || null,
            asmt_nombre_ejercicio: f.assesment?.nombre_ejercicio || null,
            asmt_claridad_mensaje:
                f.assesment?.claridad_mensaje === ""
                    ? null
                    : f.assesment?.claridad_mensaje,
            asmt_conviccion_energia:
                f.assesment?.conviccion_energia === ""
                    ? null
                    : f.assesment?.conviccion_energia,
            asmt_adaptabilidad_escucha:
                f.assesment?.adaptabilidad_escucha === ""
                    ? null
                    : f.assesment?.adaptabilidad_escucha,
            asmt_orientacion_accion:
                f.assesment?.orientacion_accion === ""
                    ? null
                    : f.assesment?.orientacion_accion,
            asmt_manejo_presion:
                f.assesment?.manejo_presion === ""
                    ? null
                    : f.assesment?.manejo_presion,
            asmt_prom:
                f.assesment?.prom_calificacion === ""
                    ? null
                    : f.assesment?.prom_calificacion,
            entv_trayectoria:
                f.entrevista?.trayectoria === ""
                    ? null
                    : f.entrevista?.trayectoria,
            entv_conexion_cliente:
                f.entrevista?.conexion_cliente === ""
                    ? null
                    : f.entrevista?.conexion_cliente,
            entv_aprendizaje_madurez:
                f.entrevista?.aprendizaje_madurez === ""
                    ? null
                    : f.entrevista?.aprendizaje_madurez,
            entv_motivacion:
                f.entrevista?.motivacion === ""
                    ? null
                    : f.entrevista?.motivacion,
            entv_disposicion_proyecto:
                f.entrevista?.disposicion_proyecto === ""
                    ? null
                    : f.entrevista?.disposicion_proyecto,
            entv_prom:
                f.entrevista?.prom_calificacion === ""
                    ? null
                    : f.entrevista?.prom_calificacion,
            retroalimentacion: f.retroalimentacion || null,
            ref_laboral_1: f.referencias?.ref_laboral_1 || null,
            ref_laboral_2: f.referencias?.ref_laboral_2 || null,
            fraude_nro_seguimiento: f.fraudes?.numero_seguimiento || null,
            fraude_respuesta: f.fraudes?.respuesta || null,
            fraude_ciudad: f.fraudes?.ciudad || null,
            fraude_fecha_consulta: f.fraudes?.fecha_consulta || null,
            fraude_fuente: f.fraudes?.fuente_reclutamiento || null,
            seguridad_estudio: f.seguridad?.estudio || null,
        };
        try {
            const { data: updated } = await api.put(
                `/candidatos/${procModalCandidate.id}`,
                payload,
            );
            setCandidates((prev) =>
                prev.map((c) => (c.id === procModalCandidate.id ? updated : c)),
            );
            setIsProcModalOpen(false);
            setProcModalCandidate(null);
            showToast("Procesos guardados exitosamente");
        } catch (e) {
            showAlert(
                "Error al guardar procesos",
                e.response?.data?.message || e.message,
            );
        }
    };

    const filteredCandDetail = useMemo(() => {
        const term = debouncedSearch.toLowerCase().trim();
        if (!term) return candidates;
        return candidates.filter(
            (c) =>
                c.nombres.toLowerCase().includes(term) ||
                c.identificacion.includes(term) ||
                c.correo.toLowerCase().includes(term) ||
                (c.celular || "").includes(term) ||
                c.estado.toLowerCase().includes(term),
        );
    }, [candidates, debouncedSearch]);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: "10px 0",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                }}
            >
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}>
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        value={candDetailSearch}
                        onChange={(e) => setCandDetailSearch(e.target.value)}
                        style={S.searchInput}
                    />
                </div>
                <button style={S.btnSecondary} onClick={reload}>
                    Actualizar
                </button>
            </div>

            {loadingData && (
                <div
                    style={{
                        textAlign: "center",
                        padding: "48px 0",
                        color: "var(--text-muted)",
                        fontFamily: "Nunito,sans-serif",
                        fontSize: "0.9rem",
                    }}
                >
                    Cargando candidatos…
                </div>
            )}

            {!loadingData && (
                <div
                    style={{
                        overflowX: "auto",
                        background: "var(--white)",
                        border: "1.5px solid var(--border)",
                        borderRadius: "var(--radius)",
                        boxShadow: "var(--shadow)",
                    }}
                >
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            minWidth: 960,
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    background: "var(--bg)",
                                    borderBottom: "1.5px solid var(--border)",
                                }}
                            >
                                <th style={S.candTh("left")}>Nombres</th>
                                <th style={S.candTh("left")}>Identificación</th>
                                <th style={S.candTh("left")}>
                                    Correo electrónico
                                </th>
                                <th style={S.candTh("left")}>Celular</th>
                                <th style={S.candTh("left")}>Proyecto</th>
                                <th style={S.candTh("left")}>Requisición</th>
                                <th style={S.candTh("left")}>Estado proceso</th>
                                <th style={S.candTh("center")}>
                                    Pruebas
                                    <br />
                                    psicotécnicas
                                </th>
                                <th style={S.candTh("center")}>
                                    Aval
                                    <br />
                                    contratación
                                </th>
                                <th style={S.candTh("center")}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCandDetail.map((c) => {
                                const docsCount = (c.documentos || []).filter(
                                    (d) =>
                                        [
                                            "Hoja de vida",
                                            "Pruebas psicotécnicas",
                                        ].includes(d.nombre),
                                ).length;
                                const docsOk = docsCount >= 2;
                                const asmtOk = c.asmt_prom != null;
                                const entvOk = c.entv_prom != null;
                                const isTigo = /tigo/i.test(
                                    c.requisicion?.proyecto?.nombre || "",
                                );
                                const pruebasDisabled =
                                    (!docsOk || (isTigo && !asmtOk)) &&
                                    !c.pruebas;
                                const avalDisabled =
                                    (!c.pruebas ||
                                        !docsOk ||
                                        (isTigo && !entvOk)) &&
                                    !c.aval;
                                const pruebasTip = !docsOk
                                    ? 'Sube "Hoja de vida" y "Pruebas psicotécnicas" primero'
                                    : isTigo && !asmtOk
                                      ? "Completa el Assessment en Procesos para habilitar"
                                      : "";
                                const avalTip = !c.pruebas
                                    ? "Activa primero Pruebas psicotécnicas"
                                    : !docsOk
                                      ? 'Sube "Hoja de vida" y "Pruebas psicotécnicas" primero'
                                      : isTigo && !entvOk
                                        ? "Completa la Entrevista en Procesos para habilitar"
                                        : "";
                                return (
                                    <tr
                                        key={c.id}
                                        style={{
                                            borderBottom:
                                                "1px solid var(--border)",
                                            background: "var(--white)",
                                        }}
                                    >
                                        <td
                                            style={{
                                                padding: "12px 8px",
                                                fontSize: "0.85rem",
                                                color: "var(--text)",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {c.nombres}
                                        </td>
                                        <td
                                            style={{
                                                padding: "12px 8px",
                                                fontSize: "0.85rem",
                                                color: "var(--text)",
                                                fontFamily: "monospace",
                                            }}
                                        >
                                            {c.identificacion}
                                        </td>
                                        <td
                                            style={{
                                                padding: "12px 8px",
                                                fontSize: "0.85rem",
                                                color: "var(--text)",
                                            }}
                                        >
                                            {c.correo}
                                        </td>
                                        <td
                                            style={{
                                                padding: "12px 8px",
                                                fontSize: "0.85rem",
                                                color: "var(--text)",
                                            }}
                                        >
                                            {c.celular}
                                        </td>
                                        <td
                                            style={{
                                                padding: "12px 8px",
                                                fontSize: "0.85rem",
                                                color: "var(--text)",
                                            }}
                                        >
                                            {c.requisicion?.proyecto?.nombre ||
                                                "-"}
                                        </td>
                                        <td
                                            style={{
                                                padding: "12px 8px",
                                                fontSize: "0.85rem",
                                                color: "var(--text)",
                                            }}
                                        >
                                            {c.requisicion
                                                ?.nro_identificacion_proceso ||
                                                "–"}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <span
                                                style={S.badge(
                                                    c.estado === "Contratación"
                                                        ? "#d1fae5"
                                                        : "#e8f0ff",
                                                    c.estado === "Contratación"
                                                        ? "#065f46"
                                                        : "#1a4fa8",
                                                )}
                                            >
                                                {c.estado}
                                            </span>
                                        </td>
                                        <td
                                            style={{
                                                padding: "12px 8px",
                                                textAlign: "center",
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={c.pruebas || false}
                                                onChange={() =>
                                                    toggleCandidateField(
                                                        c.id,
                                                        "pruebas",
                                                    )
                                                }
                                                disabled={pruebasDisabled}
                                                title={pruebasTip}
                                                style={{
                                                    width: 16,
                                                    height: 16,
                                                    cursor: pruebasDisabled
                                                        ? "not-allowed"
                                                        : "pointer",
                                                    opacity: pruebasDisabled
                                                        ? 0.35
                                                        : 1,
                                                }}
                                            />
                                        </td>
                                        <td
                                            style={{
                                                padding: "12px 8px",
                                                textAlign: "center",
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={c.aval || false}
                                                onChange={() =>
                                                    toggleCandidateField(
                                                        c.id,
                                                        "aval",
                                                    )
                                                }
                                                disabled={avalDisabled}
                                                title={avalTip}
                                                style={{
                                                    width: 16,
                                                    height: 16,
                                                    cursor: avalDisabled
                                                        ? "not-allowed"
                                                        : "pointer",
                                                    opacity: avalDisabled
                                                        ? 0.35
                                                        : 1,
                                                }}
                                            />
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <div style={S.actions}>
                                                {isTigo && (
                                                    <button
                                                        style={S.actionBtn(
                                                            "  #FFF8DA",
                                                            "#000",
                                                        )}
                                                        title="Procesos"
                                                        onClick={() =>
                                                            handleOpenProcesos(
                                                                c,
                                                            )
                                                        }
                                                    >
                                                        <IconGestionar
                                                            size={15}
                                                        />
                                                    </button>
                                                )}
                                                <button
                                                    style={S.actionBtn(
                                                        "#e8f8f5",
                                                        "var(--primary-dark)",
                                                    )}
                                                    title="Editar candidato"
                                                    onClick={() =>
                                                        handleEditCandidate(c)
                                                    }
                                                >
                                                    <IconEdit size={15} />
                                                </button>
                                                <button
                                                    style={S.actionBtn(
                                                        "#e8f0ff",
                                                        "#1a4fa8",
                                                    )}
                                                    title="Ver detalles"
                                                    onClick={() =>
                                                        handleViewCandidate(c)
                                                    }
                                                >
                                                    <IconEye size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredCandDetail.length === 0 && (
                                <tr>
                                    <td colSpan="12" style={S.empty}>
                                        No se encontraron candidatos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ─── Modal Candidato ─── */}
            {isCandModalOpen && (
                <div
                    style={S.overlay}
                    onClick={() => setIsCandModalOpen(false)}
                >
                    <div
                        style={{ ...S.modal, maxWidth: 960 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={S.modalHeaderGreen}>
                            <span style={S.modalTitleWhite}>
                                {candModalMode === "create"
                                    ? "Agregar Candidato"
                                    : candModalMode === "edit"
                                      ? "Editar Candidato"
                                      : "Detalles del Candidato"}
                            </span>
                            <button
                                style={S.closeBtnWhite}
                                onClick={() => setIsCandModalOpen(false)}
                            >
                                <IconClose size={12} />
                            </button>
                        </div>

                        <div style={S.modalBody}>
                            <h4
                                style={{
                                    margin: "0 0 14px 0",
                                    fontSize: "0.95rem",
                                    fontWeight: 700,
                                    color: "var(--primary)",
                                    fontFamily: "'Poppins',sans-serif",
                                }}
                            >
                                Datos personales
                            </h4>
                            <div style={S.grid3}>
                                <Field
                                    label="Nombres completos"
                                    k="nombres"
                                    req
                                    form={candForm}
                                    onChange={(k) => (e) =>
                                        setCandForm((p) => ({
                                            ...p,
                                            [k]: e.target.value,
                                        }))
                                    }
                                    disabled={candModalMode === "view"}
                                />
                                <Field
                                    label="Tipo de documento"
                                    k="tipo_documento"
                                    opts={MOCK_OPTS.tipos_documento}
                                    req
                                    form={candForm}
                                    onChange={(k) => (e) =>
                                        setCandForm((p) => ({
                                            ...p,
                                            [k]: e.target.value,
                                        }))
                                    }
                                    disabled={candModalMode === "view"}
                                />
                                <Field
                                    label="Número de identificación"
                                    k="identificacion"
                                    req
                                    form={candForm}
                                    onChange={(k) => (e) =>
                                        setCandForm((p) => ({
                                            ...p,
                                            [k]: e.target.value,
                                        }))
                                    }
                                    disabled={candModalMode === "view"}
                                />
                                <Field
                                    label="Fecha de expedición"
                                    k="fecha_expedicion"
                                    type="date"
                                    form={candForm}
                                    onChange={(k) => (e) =>
                                        setCandForm((p) => ({
                                            ...p,
                                            [k]: e.target.value,
                                        }))
                                    }
                                    disabled={candModalMode === "view"}
                                />
                                <Field
                                    label="Edad"
                                    k="edad"
                                    type="number"
                                    form={candForm}
                                    onChange={(k) => (e) =>
                                        setCandForm((p) => ({
                                            ...p,
                                            [k]: e.target.value,
                                        }))
                                    }
                                    disabled={candModalMode === "view"}
                                />
                                <Field
                                    label="Ciudad"
                                    k="ciudad_id"
                                    opts={ciudadesOpts}
                                    form={candForm}
                                    onChange={(k) => (e) =>
                                        setCandForm((p) => ({
                                            ...p,
                                            [k]: e.target.value,
                                        }))
                                    }
                                    disabled={candModalMode === "view"}
                                />
                                <Field
                                    label="Correo electrónico"
                                    k="correo"
                                    type="email"
                                    req
                                    form={candForm}
                                    onChange={(k) => (e) =>
                                        setCandForm((p) => ({
                                            ...p,
                                            [k]: e.target.value,
                                        }))
                                    }
                                    disabled={candModalMode === "view"}
                                />
                                <Field
                                    label="Celular"
                                    k="celular"
                                    req
                                    form={candForm}
                                    onChange={(k) => (e) =>
                                        setCandForm((p) => ({
                                            ...p,
                                            [k]: e.target.value,
                                        }))
                                    }
                                    disabled={candModalMode === "view"}
                                />
                                <Field
                                    label="Fecha de postulación"
                                    k="fecha_postulacion"
                                    type="date"
                                    form={candForm}
                                    onChange={(k) => (e) =>
                                        setCandForm((p) => ({
                                            ...p,
                                            [k]: e.target.value,
                                        }))
                                    }
                                    disabled={
                                        candModalMode === "view" ||
                                        candModalMode === "create"
                                    }
                                />
                            </div>

                            <h4
                                style={{
                                    margin: "24px 0 14px 0",
                                    fontSize: "0.95rem",
                                    fontWeight: 700,
                                    color: "var(--primary)",
                                    fontFamily: "'Poppins',sans-serif",
                                }}
                            >
                                Proceso de selección
                            </h4>
                            <div style={S.grid3}>
                                <Field
                                    label="Requisición asociada"
                                    k="requisicion_id"
                                    req
                                    span={3}
                                    opts={requisitions.map((r) => ({
                                        value: String(r.id),
                                        label: `${r.nro_identificacion_proceso} – ${r.cargo?.nombre || "(sin cargo)"}`,
                                    }))}
                                    form={candForm}
                                    onChange={(k) => (e) =>
                                        setCandForm((p) => ({
                                            ...p,
                                            [k]: e.target.value,
                                        }))
                                    }
                                    disabled={candModalMode === "view"}
                                />
                                <Field
                                    label="Fuente específica"
                                    k="fuente_especifica"
                                    opts={MOCK_OPTS.fuentes_especificas}
                                    req
                                    form={candForm}
                                    onChange={(k) => (e) =>
                                        setCandForm((p) => ({
                                            ...p,
                                            [k]: e.target.value,
                                        }))
                                    }
                                    disabled={candModalMode === "view"}
                                />
                                <Field
                                    label="Estado del proceso"
                                    k="estado"
                                    opts={MOCK_OPTS.estados_proceso}
                                    form={candForm}
                                    onChange={(k) => (e) =>
                                        setCandForm((p) => ({
                                            ...p,
                                            [k]: e.target.value,
                                        }))
                                    }
                                    disabled={candModalMode === "view"}
                                />
                                <Field
                                    label="Día entrevista"
                                    k="dia_entrevista"
                                    type="number"
                                    form={candForm}
                                    onChange={(k) => (e) => {}}
                                    disabled={true}
                                />
                                <Field
                                    label="Mes entrevista"
                                    k="mes_entrevista"
                                    form={candForm}
                                    onChange={(k) => (e) => {}}
                                    disabled={true}
                                />
                                <Field
                                    label="Año entrevista"
                                    k="anio_entrevista"
                                    type="number"
                                    form={candForm}
                                    onChange={(k) => (e) => {}}
                                    disabled={true}
                                />
                            </div>

                            {/* ── Datos de contratación (edición y vista) ── */}
                            {candModalMode !== "create" && (
                                <>
                                    <h4
                                        style={{
                                            margin: "24px 0 14px 0",
                                            fontSize: "0.95rem",
                                            fontWeight: 700,
                                            color: "var(--primary)",
                                            fontFamily: "'Poppins',sans-serif",
                                        }}
                                    >
                                        Datos de contratación
                                    </h4>
                                    <div style={S.grid3}>
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 5,
                                                minWidth: 0,
                                            }}
                                        >
                                            <label
                                                style={{
                                                    fontSize: "0.78rem",
                                                    fontWeight: 700,
                                                    color: "var(--text)",
                                                    fontFamily:
                                                        "Nunito,sans-serif",
                                                }}
                                            >
                                                Lugar de trabajo (sede)
                                            </label>
                                            <SearchableSelect
                                                key={`lugart-${candForm.lugar_trabajo ?? ""}`}
                                                value={
                                                    candForm.lugar_trabajo ?? ""
                                                }
                                                defaultValue=""
                                                options={sedesOpts}
                                                freeText={true}
                                                onChange={(val) =>
                                                    setCandForm((p) => ({
                                                        ...p,
                                                        lugar_trabajo: val,
                                                    }))
                                                }
                                                disabled={
                                                    candModalMode === "view"
                                                }
                                            />
                                        </div>
                                        <Field
                                            label="Fecha programación ingreso"
                                            k="fecha_programacion_ingreso"
                                            type="date"
                                            form={candForm}
                                            onChange={(k) => (e) =>
                                                setCandForm((p) => ({
                                                    ...p,
                                                    [k]: e.target.value,
                                                }))
                                            }
                                            disabled={candModalMode === "view"}
                                        />
                                        <Field
                                            label="Fecha de corrección"
                                            k="fecha_correccion"
                                            type="date"
                                            form={candForm}
                                            onChange={(k) => (e) =>
                                                setCandForm((p) => ({
                                                    ...p,
                                                    [k]: e.target.value,
                                                }))
                                            }
                                            disabled={candModalMode === "view"}
                                        />
                                    </div>
                                </>
                            )}

                            {/* ── Remuneración (edición y vista) ── */}
                            {candModalMode !== "create" && (
                                <>
                                    <h4
                                        style={{
                                            margin: "24px 0 14px 0",
                                            fontSize: "0.95rem",
                                            fontWeight: 700,
                                            color: "var(--primary)",
                                            fontFamily: "'Poppins',sans-serif",
                                        }}
                                    >
                                        Remuneración
                                    </h4>
                                    <div style={S.grid3}>
                                        <Field
                                            label="Tasa de riesgo ARL"
                                            k="tasa_riesgo_arl"
                                            form={candForm}
                                            onChange={(k) => (e) =>
                                                setCandForm((p) => ({
                                                    ...p,
                                                    [k]: e.target.value,
                                                }))
                                            }
                                            disabled={candModalMode === "view"}
                                        />
                                        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                                            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)", fontFamily: "Nunito,sans-serif" }}>
                                                ARL
                                            </label>
                                            <SearchableSelect
                                                key={`arl-${candForm.arl ?? ""}`}
                                                value={candForm.arl ?? ""}
                                                defaultValue=""
                                                options={arlsOpts}
                                                freeText={true}
                                                onChange={(val) => setCandForm((p) => ({ ...p, arl: val }))}
                                                disabled={candModalMode === "view"}
                                            />
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                                            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)", fontFamily: "Nunito,sans-serif" }}>
                                                Caja de Compensación
                                            </label>
                                            <SearchableSelect
                                                key={`caja-${candForm.caja_compensacion ?? ""}`}
                                                value={candForm.caja_compensacion ?? ""}
                                                defaultValue=""
                                                options={cajasOpts}
                                                freeText={true}
                                                onChange={(val) => setCandForm((p) => ({ ...p, caja_compensacion: val }))}
                                                disabled={candModalMode === "view"}
                                            />
                                        </div>
                                        <Field
                                            label="Salario básico"
                                            k="salario_basico"
                                            type="number"
                                            form={candForm}
                                            onChange={(k) => (e) =>
                                                setCandForm((p) => ({
                                                    ...p,
                                                    [k]: e.target.value,
                                                }))
                                            }
                                            disabled={candModalMode === "view"}
                                        />
                                        <Field
                                            label="Auxilio de transporte"
                                            k="auxilio_transporte"
                                            type="number"
                                            form={candForm}
                                            onChange={(k) => (e) =>
                                                setCandForm((p) => ({
                                                    ...p,
                                                    [k]: e.target.value,
                                                }))
                                            }
                                            disabled={candModalMode === "view"}
                                        />
                                        <Field
                                            label="Otrosí variable"
                                            k="otrosi_variable"
                                            type="number"
                                            form={candForm}
                                            onChange={(k) => (e) =>
                                                setCandForm((p) => ({
                                                    ...p,
                                                    [k]: e.target.value,
                                                }))
                                            }
                                            disabled={candModalMode === "view"}
                                        />
                                        <Field
                                            label="Aux. rodamiento / seguridad vial"
                                            k="auxilio_rodamiento"
                                            type="number"
                                            form={candForm}
                                            onChange={(k) => (e) =>
                                                setCandForm((p) => ({
                                                    ...p,
                                                    [k]: e.target.value,
                                                }))
                                            }
                                            disabled={candModalMode === "view"}
                                        />
                                        <Field
                                            label="Aux. de comunicación"
                                            k="auxilio_comunicacion"
                                            type="number"
                                            form={candForm}
                                            onChange={(k) => (e) =>
                                                setCandForm((p) => ({
                                                    ...p,
                                                    [k]: e.target.value,
                                                }))
                                            }
                                            disabled={candModalMode === "view"}
                                        />
                                        <Field
                                            label="Aux. de alimentación"
                                            k="auxilio_alimentacion"
                                            type="number"
                                            form={candForm}
                                            onChange={(k) => (e) =>
                                                setCandForm((p) => ({
                                                    ...p,
                                                    [k]: e.target.value,
                                                }))
                                            }
                                            disabled={candModalMode === "view"}
                                        />
                                    </div>
                                </>
                            )}

                            {/* ── Documentos (solo en edición) ── */}
                            {candModalMode === "edit" && (
                                <>
                                    <h4
                                        style={{
                                            margin: "28px 0 14px 0",
                                            fontSize: "0.95rem",
                                            fontWeight: 700,
                                            color: "var(--primary)",
                                            fontFamily: "'Poppins',sans-serif",
                                        }}
                                    >
                                        Documentos
                                    </h4>

                                    {docsLoading ? (
                                        <p
                                            style={{
                                                fontSize: "0.85rem",
                                                color: "var(--text-muted)",
                                                fontFamily: "Nunito,sans-serif",
                                            }}
                                        >
                                            Cargando documentos…
                                        </p>
                                    ) : (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 10,
                                            }}
                                        >
                                            {/* Fijos */}
                                            {FIXED_DOCS.map((nombre) => {
                                                const existing = docs.find(
                                                    (d) => d.nombre === nombre,
                                                );
                                                const uploading =
                                                    uploadingDoc === nombre;
                                                return (
                                                    <div
                                                        key={nombre}
                                                        style={SD.docRow}
                                                    >
                                                        <span
                                                            style={SD.docLabel}
                                                        >
                                                            {nombre}
                                                        </span>
                                                        {existing ? (
                                                            <>
                                                                <span
                                                                    style={
                                                                        SD.docFile
                                                                    }
                                                                >
                                                                    {
                                                                        existing.nombre_original
                                                                    }
                                                                </span>
                                                                <button
                                                                    style={
                                                                        SD.btnDownload
                                                                    }
                                                                    onClick={() =>
                                                                        handleDownloadDoc(
                                                                            candForm.id,
                                                                            existing.id,
                                                                            existing.nombre_original,
                                                                        )
                                                                    }
                                                                >
                                                                    Descargar
                                                                </button>
                                                                <label
                                                                    style={{
                                                                        ...SD.btnReplace,
                                                                        opacity:
                                                                            uploading
                                                                                ? 0.6
                                                                                : 1,
                                                                        cursor: uploading
                                                                            ? "default"
                                                                            : "pointer",
                                                                    }}
                                                                >
                                                                    {uploading
                                                                        ? "Subiendo…"
                                                                        : "Reemplazar"}
                                                                    <input
                                                                        type="file"
                                                                        style={{
                                                                            display:
                                                                                "none",
                                                                        }}
                                                                        disabled={
                                                                            uploading
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) => {
                                                                            if (
                                                                                e
                                                                                    .target
                                                                                    .files[0]
                                                                            )
                                                                                handleUploadDoc(
                                                                                    nombre,
                                                                                    e
                                                                                        .target
                                                                                        .files[0],
                                                                                );
                                                                            e.target.value =
                                                                                "";
                                                                        }}
                                                                    />
                                                                </label>
                                                                <button
                                                                    style={
                                                                        SD.btnDel
                                                                    }
                                                                    onClick={() =>
                                                                        handleDeleteDoc(
                                                                            existing,
                                                                        )
                                                                    }
                                                                >
                                                                    ✕
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <label
                                                                style={{
                                                                    ...SD.btnReplace,
                                                                    opacity:
                                                                        uploading
                                                                            ? 0.6
                                                                            : 1,
                                                                    cursor: uploading
                                                                        ? "default"
                                                                        : "pointer",
                                                                }}
                                                            >
                                                                {uploading
                                                                    ? "Subiendo…"
                                                                    : "Subir archivo"}
                                                                <input
                                                                    type="file"
                                                                    style={{
                                                                        display:
                                                                            "none",
                                                                    }}
                                                                    disabled={
                                                                        uploading
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        if (
                                                                            e
                                                                                .target
                                                                                .files[0]
                                                                        )
                                                                            handleUploadDoc(
                                                                                nombre,
                                                                                e
                                                                                    .target
                                                                                    .files[0],
                                                                            );
                                                                        e.target.value =
                                                                            "";
                                                                    }}
                                                                />
                                                            </label>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {docs
                                                .filter(
                                                    (d) =>
                                                        !FIXED_DOCS.includes(
                                                            d.nombre,
                                                        ),
                                                )
                                                .map((d) => (
                                                    <div
                                                        key={d.id}
                                                        style={SD.docRow}
                                                    >
                                                        <span
                                                            style={SD.docLabel}
                                                        >
                                                            {d.nombre}
                                                        </span>
                                                        <span
                                                            style={SD.docFile}
                                                        >
                                                            {d.nombre_original}
                                                        </span>
                                                        <button
                                                            style={
                                                                SD.btnDownload
                                                            }
                                                            onClick={() =>
                                                                handleDownloadDoc(
                                                                    candForm.id,
                                                                    d.id,
                                                                    d.nombre_original,
                                                                )
                                                            }
                                                        >
                                                            Descargar
                                                        </button>
                                                        <button
                                                            style={SD.btnDel}
                                                            onClick={() =>
                                                                handleDeleteDoc(
                                                                    d,
                                                                )
                                                            }
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}

                                            {/* Agregar nuevo documento */}
                                            <div
                                                style={{
                                                    ...SD.docRow,
                                                    marginTop: 6,
                                                    background: "var(--bg)",
                                                    borderRadius: 8,
                                                    padding: "10px 12px",
                                                    gap: 10,
                                                }}
                                            >
                                                <label
                                                    style={{
                                                        ...SD.btnFileSelect,
                                                        flex: "1 1 auto",
                                                    }}
                                                >
                                                    {newDocFile
                                                        ? newDocFile.name
                                                        : "Seleccionar archivo"}
                                                    <input
                                                        type="file"
                                                        style={{
                                                            display: "none",
                                                        }}
                                                        onChange={(e) =>
                                                            setNewDocFile(
                                                                e.target
                                                                    .files[0] ||
                                                                    null,
                                                            )
                                                        }
                                                    />
                                                </label>
                                                <button
                                                    style={{
                                                        ...SD.btnAdd,
                                                        opacity: uploadingDoc
                                                            ? 0.6
                                                            : 1,
                                                    }}
                                                    disabled={!!uploadingDoc}
                                                    onClick={handleAddCustomDoc}
                                                >
                                                    + Agregar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div style={S.modalFooter}>
                            {candModalMode === "view" ? (
                                <button
                                    style={S.btnSecondary}
                                    onClick={() => setIsCandModalOpen(false)}
                                >
                                    Cerrar
                                </button>
                            ) : (
                                <>
                                    <button
                                        style={S.btnSecondary}
                                        onClick={() =>
                                            setIsCandModalOpen(false)
                                        }
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        style={S.btnPrimaryGreen}
                                        onClick={handleSaveCandidate}
                                    >
                                        Guardar candidato
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Modal Procesos ─── */}
            {isProcModalOpen && (
                <div
                    style={S.overlay}
                    onClick={() => setIsProcModalOpen(false)}
                >
                    <div
                        style={{ ...S.modal, maxWidth: 960 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={S.modalHeaderGreen}>
                            <span style={S.modalTitleWhite}>
                                Procesos{" "}
                                {procModalCandidate
                                    ? `- ${procModalCandidate.nombres}`
                                    : ""}
                            </span>
                            <button
                                style={S.closeBtnWhite}
                                onClick={() => setIsProcModalOpen(false)}
                            >
                                <IconClose size={12} />
                            </button>
                        </div>

                        <div style={S.modalBody}>
                            <div style={S.tabSwitch}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setProcActiveTab("assesment")
                                    }
                                    style={
                                        procActiveTab === "assesment"
                                            ? S.tabBtnActive
                                            : S.tabBtn
                                    }
                                >
                                    ASSESMENT
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setProcActiveTab("entrevista")
                                    }
                                    style={
                                        procActiveTab === "entrevista"
                                            ? S.tabBtnActive
                                            : S.tabBtn
                                    }
                                >
                                    ENTREVISTA
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setProcActiveTab("retroalimentacion")
                                    }
                                    style={
                                        procActiveTab === "retroalimentacion"
                                            ? S.tabBtnActive
                                            : S.tabBtn
                                    }
                                >
                                    RETROALIMENTACIÓN
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setProcActiveTab("referencias")
                                    }
                                    style={
                                        procActiveTab === "referencias"
                                            ? S.tabBtnActive
                                            : S.tabBtn
                                    }
                                >
                                    REF. LABORALES
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProcActiveTab("fraudes")}
                                    style={
                                        procActiveTab === "fraudes"
                                            ? S.tabBtnActive
                                            : S.tabBtn
                                    }
                                >
                                    FRAUDES
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setProcActiveTab("seguridad")
                                    }
                                    style={
                                        procActiveTab === "seguridad"
                                            ? S.tabBtnActive
                                            : S.tabBtn
                                    }
                                >
                                    SEGURIDAD
                                </button>
                            </div>

                            {procActiveTab === "assesment" && (
                                <div style={{ margin: "16px 0 10px 0" }}>
                                    <div style={S.grid3}>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                EJERCICIO COMERCIAL APLICADO
                                            </label>
                                            <input
                                                value={
                                                    procForm.assesment
                                                        ?.ejercicio_comercial ||
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    setProcForm((p) => ({
                                                        ...p,
                                                        assesment: {
                                                            ...p.assesment,
                                                            ejercicio_comercial:
                                                                e.target.value,
                                                        },
                                                    }))
                                                }
                                                style={S.formInput}
                                            />
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                NOMBRE DEL EJERCICIO
                                            </label>
                                            <input
                                                value={
                                                    procForm.assesment
                                                        ?.nombre_ejercicio || ""
                                                }
                                                onChange={(e) =>
                                                    setProcForm((p) => ({
                                                        ...p,
                                                        assesment: {
                                                            ...p.assesment,
                                                            nombre_ejercicio:
                                                                e.target.value,
                                                        },
                                                    }))
                                                }
                                                style={S.formInput}
                                            />
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                CLARIDAD DEL MENSAJE
                                            </label>
                                            <select
                                                value={
                                                    procForm.assesment
                                                        ?.claridad_mensaje ?? ""
                                                }
                                                onChange={handleProcNumberChange(
                                                    "assesment",
                                                    "claridad_mensaje",
                                                )}
                                                style={S.formInput}
                                            >
                                                <option value="">--</option>
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                CONVICCIÓN Y ENERGÍA
                                            </label>
                                            <select
                                                value={
                                                    procForm.assesment
                                                        ?.conviccion_energia ??
                                                    ""
                                                }
                                                onChange={handleProcNumberChange(
                                                    "assesment",
                                                    "conviccion_energia",
                                                )}
                                                style={S.formInput}
                                            >
                                                <option value="">--</option>
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                ADAPTABILIDAD Y ESCUCHA
                                            </label>
                                            <select
                                                value={
                                                    procForm.assesment
                                                        ?.adaptabilidad_escucha ??
                                                    ""
                                                }
                                                onChange={handleProcNumberChange(
                                                    "assesment",
                                                    "adaptabilidad_escucha",
                                                )}
                                                style={S.formInput}
                                            >
                                                <option value="">--</option>
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                ORIENTACIÓN A LA ACCIÓN
                                            </label>
                                            <select
                                                value={
                                                    procForm.assesment
                                                        ?.orientacion_accion ??
                                                    ""
                                                }
                                                onChange={handleProcNumberChange(
                                                    "assesment",
                                                    "orientacion_accion",
                                                )}
                                                style={S.formInput}
                                            >
                                                <option value="">--</option>
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                MANEJO DE LA PRESIÓN
                                            </label>
                                            <select
                                                value={
                                                    procForm.assesment
                                                        ?.manejo_presion ?? ""
                                                }
                                                onChange={handleProcNumberChange(
                                                    "assesment",
                                                    "manejo_presion",
                                                )}
                                                style={S.formInput}
                                            >
                                                <option value="">--</option>
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 12 }}>
                                        <label
                                            style={{
                                                display: "block",
                                                fontSize: "0.78rem",
                                                marginBottom: 6,
                                                fontWeight: 500,
                                            }}
                                        >
                                            POM CALIFICACION ASSESMENT
                                        </label>
                                        <input
                                            readOnly
                                            value={
                                                procForm.assesment
                                                    ?.prom_calificacion ?? ""
                                            }
                                            style={{
                                                ...S.formInput,
                                                width: 200,
                                                background: "var(--bg)",
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {procActiveTab === "entrevista" && (
                                <div style={{ margin: "16px 0 10px 0" }}>
                                    <div style={S.grid3}>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                TRAYECTORIA
                                            </label>
                                            <select
                                                value={
                                                    procForm.entrevista
                                                        ?.trayectoria ?? ""
                                                }
                                                onChange={handleProcNumberChange(
                                                    "entrevista",
                                                    "trayectoria",
                                                )}
                                                style={S.formInput}
                                            >
                                                <option value="">--</option>
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                CONEXIÓN CON EL CLIENTE O EL
                                                RESULTADO
                                            </label>
                                            <select
                                                value={
                                                    procForm.entrevista
                                                        ?.conexion_cliente ?? ""
                                                }
                                                onChange={handleProcNumberChange(
                                                    "entrevista",
                                                    "conexion_cliente",
                                                )}
                                                style={S.formInput}
                                            >
                                                <option value="">--</option>
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                APRENDIZAJE Y MADUREZ
                                            </label>
                                            <select
                                                value={
                                                    procForm.entrevista
                                                        ?.aprendizaje_madurez ??
                                                    ""
                                                }
                                                onChange={handleProcNumberChange(
                                                    "entrevista",
                                                    "aprendizaje_madurez",
                                                )}
                                                style={S.formInput}
                                            >
                                                <option value="">--</option>
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                MOTIVACIÓN HACIA EL ROL
                                            </label>
                                            <select
                                                value={
                                                    procForm.entrevista
                                                        ?.motivacion ?? ""
                                                }
                                                onChange={handleProcNumberChange(
                                                    "entrevista",
                                                    "motivacion",
                                                )}
                                                style={S.formInput}
                                            >
                                                <option value="">--</option>
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                DISPOSICIÓN Y PROYECTO DE VIDA
                                            </label>
                                            <select
                                                value={
                                                    procForm.entrevista
                                                        ?.disposicion_proyecto ??
                                                    ""
                                                }
                                                onChange={handleProcNumberChange(
                                                    "entrevista",
                                                    "disposicion_proyecto",
                                                )}
                                                style={S.formInput}
                                            >
                                                <option value="">--</option>
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                                <option value={4}>4</option>
                                                <option value={5}>5</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 12 }}>
                                        <label
                                            style={{
                                                display: "block",
                                                fontSize: "0.78rem",
                                                marginBottom: 6,
                                                fontWeight: 500,
                                            }}
                                        >
                                            PROM. CALIFICACION ENTREVISTA
                                        </label>
                                        <input
                                            readOnly
                                            value={
                                                procForm.entrevista
                                                    ?.prom_calificacion ?? ""
                                            }
                                            style={{
                                                ...S.formInput,
                                                width: 200,
                                                background: "var(--bg)",
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {procActiveTab === "retroalimentacion" && (
                                <div>
                                    <h4
                                        style={{
                                            margin: "16px 0 10px 0",
                                            fontSize: "0.9rem",
                                            fontWeight: 600,
                                        }}
                                    >
                                        RETROALIMENTACIÓN
                                    </h4>
                                    <textarea
                                        value={procForm.retroalimentacion || ""}
                                        onChange={(e) =>
                                            setProcForm((p) => ({
                                                ...p,
                                                retroalimentacion:
                                                    e.target.value,
                                            }))
                                        }
                                        style={{
                                            ...S.formInput,
                                            minHeight: 140,
                                            resize: "vertical",
                                        }}
                                    />
                                </div>
                            )}

                            {procActiveTab === "referencias" && (
                                <div style={{ margin: "16px 0 10px 0" }}>
                                    <div style={S.grid3}>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                REFERENCIA LABORAL 1
                                            </label>
                                            <textarea
                                                value={
                                                    procForm.referencias
                                                        ?.ref_laboral_1 || ""
                                                }
                                                onChange={(e) =>
                                                    setProcForm((p) => ({
                                                        ...p,
                                                        referencias: {
                                                            ...p.referencias,
                                                            ref_laboral_1:
                                                                e.target.value,
                                                        },
                                                    }))
                                                }
                                                style={{
                                                    ...S.formInput,
                                                    minHeight: 80,
                                                    resize: "vertical",
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                REFERENCIA LABORAL 2
                                            </label>
                                            <textarea
                                                value={
                                                    procForm.referencias
                                                        ?.ref_laboral_2 || ""
                                                }
                                                onChange={(e) =>
                                                    setProcForm((p) => ({
                                                        ...p,
                                                        referencias: {
                                                            ...p.referencias,
                                                            ref_laboral_2:
                                                                e.target.value,
                                                        },
                                                    }))
                                                }
                                                style={{
                                                    ...S.formInput,
                                                    minHeight: 80,
                                                    resize: "vertical",
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {procActiveTab === "fraudes" && (
                                <div style={{ margin: "16px 0 10px 0" }}>
                                    <div style={S.grid3}>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                NÚMERO DE SEGUIMIENTO
                                            </label>
                                            <input
                                                value={
                                                    procForm.fraudes
                                                        ?.numero_seguimiento ||
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    setProcForm((p) => ({
                                                        ...p,
                                                        fraudes: {
                                                            ...p.fraudes,
                                                            numero_seguimiento:
                                                                e.target.value,
                                                        },
                                                    }))
                                                }
                                                style={S.formInput}
                                            />
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                RESPUESTA
                                            </label>
                                            <input
                                                value={
                                                    procForm.fraudes
                                                        ?.respuesta || ""
                                                }
                                                onChange={(e) =>
                                                    setProcForm((p) => ({
                                                        ...p,
                                                        fraudes: {
                                                            ...p.fraudes,
                                                            respuesta:
                                                                e.target.value,
                                                        },
                                                    }))
                                                }
                                                style={S.formInput}
                                            />
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                CIUDAD
                                            </label>
                                            <input
                                                value={
                                                    procForm.fraudes?.ciudad ||
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    setProcForm((p) => ({
                                                        ...p,
                                                        fraudes: {
                                                            ...p.fraudes,
                                                            ciudad: e.target
                                                                .value,
                                                        },
                                                    }))
                                                }
                                                style={S.formInput}
                                            />
                                        </div>
                                        <div>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                FECHA CONSULTA
                                            </label>
                                            <input
                                                type="date"
                                                value={
                                                    procForm.fraudes
                                                        ?.fecha_consulta || ""
                                                }
                                                onChange={(e) =>
                                                    setProcForm((p) => ({
                                                        ...p,
                                                        fraudes: {
                                                            ...p.fraudes,
                                                            fecha_consulta:
                                                                e.target.value,
                                                        },
                                                    }))
                                                }
                                                style={S.formInput}
                                            />
                                        </div>
                                        <div style={{ gridColumn: "span 2" }}>
                                            <label
                                                style={{
                                                    display: "block",
                                                    fontSize: "0.78rem",
                                                    marginBottom: 6,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                FUENTE DE RECLUTAMIENTO
                                            </label>
                                            <input
                                                value={
                                                    procForm.fraudes
                                                        ?.fuente_reclutamiento ||
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    setProcForm((p) => ({
                                                        ...p,
                                                        fraudes: {
                                                            ...p.fraudes,
                                                            fuente_reclutamiento:
                                                                e.target.value,
                                                        },
                                                    }))
                                                }
                                                style={S.formInput}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {procActiveTab === "seguridad" && (
                                <div style={{ margin: "16px 0 10px 0" }}>
                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                fontSize: "0.78rem",
                                                marginBottom: 6,
                                                fontWeight: 500,
                                            }}
                                        >
                                            ESTUDIO DE SEGURIDAD
                                        </label>
                                        <select
                                            value={
                                                procForm.seguridad?.estudio ||
                                                ""
                                            }
                                            onChange={(e) =>
                                                setProcForm((p) => ({
                                                    ...p,
                                                    seguridad: {
                                                        ...p.seguridad,
                                                        estudio: e.target.value,
                                                    },
                                                }))
                                            }
                                            style={S.formInput}
                                        >
                                            <option value="">
                                                -- Seleccionar --
                                            </option>
                                            <option value="Aprobado">
                                                Aprobado
                                            </option>
                                            <option value="No Aprobado">
                                                No Aprobado
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={S.modalFooter}>
                            <button
                                style={S.btnSecondary}
                                onClick={() => setIsProcModalOpen(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                style={S.btnPrimaryGreen}
                                onClick={handleSaveProcesos}
                            >
                                Guardar procesos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {vinculacionModal.open && (
                <div
                    style={{ ...S.overlay, zIndex: 6100 }}
                    onClick={() =>
                        setVinculacionModal({
                            open: false,
                            candidateId: null,
                            tipo: "Directa",
                        })
                    }
                >
                    <div
                        style={{
                            background: "var(--white)",
                            borderRadius: "var(--radius)",
                            boxShadow: "0 16px 60px rgba(26,155,140,0.28)",
                            width: "100%",
                            maxWidth: 420,
                            overflow: "hidden",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={S.modalHeaderGreen}>
                            <span
                                style={{
                                    ...S.modalTitleWhite,
                                    fontSize: "1rem",
                                }}
                            >
                                Tipo de vinculación
                            </span>
                        </div>
                        <div style={{ padding: "24px 28px" }}>
                            <p
                                style={{
                                    margin: "0 0 18px",
                                    fontSize: "0.93rem",
                                    color: "var(--text)",
                                    fontFamily: "Nunito,sans-serif",
                                    lineHeight: 1.6,
                                }}
                            >
                                ¿Cómo será la vinculación del empleado?
                            </p>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 12,
                                }}
                            >
                                {["Directa", "Indirecta"].map((op) => (
                                    <label
                                        key={op}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            padding: "12px 16px",
                                            border: `2px solid ${vinculacionModal.tipo === op ? "var(--primary)" : "var(--border)"}`,
                                            borderRadius: "var(--radius-sm)",
                                            cursor: "pointer",
                                            background:
                                                vinculacionModal.tipo === op
                                                    ? "var(--primary-light, #e8f7f5)"
                                                    : "var(--white)",
                                            fontFamily: "Nunito,sans-serif",
                                            fontWeight: 700,
                                            fontSize: "0.92rem",
                                            color: "var(--text)",
                                            userSelect: "none",
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="tipo_vinculacion"
                                            value={op}
                                            checked={
                                                vinculacionModal.tipo === op
                                            }
                                            onChange={() =>
                                                setVinculacionModal((p) => ({
                                                    ...p,
                                                    tipo: op,
                                                }))
                                            }
                                            style={{
                                                accentColor: "var(--primary)",
                                                width: 16,
                                                height: 16,
                                            }}
                                        />
                                        Vinculación {op}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 12,
                                padding: "14px 28px",
                                borderTop: "1.5px solid var(--border)",
                            }}
                        >
                            <button
                                style={S.btnSecondary}
                                onClick={() =>
                                    setVinculacionModal({
                                        open: false,
                                        candidateId: null,
                                        tipo: "Directa",
                                    })
                                }
                            >
                                Cancelar
                            </button>
                            <button
                                style={S.btnPrimaryGreen}
                                onClick={handleConfirmVinculacion}
                            >
                                Confirmar aval
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {alertDlg.open && (
                <div
                    style={{ ...S.overlay, zIndex: 6100 }}
                    onClick={() =>
                        setAlertDlg({ open: false, title: "", msg: "" })
                    }
                >
                    <div
                        style={{
                            background: "var(--white)",
                            borderRadius: "var(--radius)",
                            boxShadow: "0 16px 60px rgba(26,155,140,0.28)",
                            width: "100%",
                            maxWidth: 400,
                            overflow: "hidden",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={S.modalHeaderGreen}>
                            <span
                                style={{
                                    ...S.modalTitleWhite,
                                    fontSize: "1rem",
                                }}
                            >
                                {alertDlg.title}
                            </span>
                        </div>
                        <div style={{ padding: "22px 28px" }}>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: "0.93rem",
                                    color: "var(--text)",
                                    fontFamily: "Nunito,sans-serif",
                                    lineHeight: 1.6,
                                }}
                            >
                                {alertDlg.msg}
                            </p>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                padding: "14px 28px",
                                borderTop: "1.5px solid var(--border)",
                            }}
                        >
                            <button
                                style={S.btnPrimaryGreen}
                                onClick={() =>
                                    setAlertDlg({
                                        open: false,
                                        title: "",
                                        msg: "",
                                    })
                                }
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDlg.open && (
                <div
                    style={{ ...S.overlay, zIndex: 6000 }}
                    onClick={handleConfirmCancel}
                >
                    <div
                        style={{
                            background: "var(--white)",
                            borderRadius: "var(--radius)",
                            boxShadow: "0 16px 60px rgba(26,155,140,0.28)",
                            width: "100%",
                            maxWidth: 400,
                            overflow: "hidden",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={S.modalHeaderGreen}>
                            <span
                                style={{
                                    ...S.modalTitleWhite,
                                    fontSize: "1rem",
                                }}
                            >
                                {confirmDlg.title}
                            </span>
                        </div>
                        <div style={{ padding: "22px 28px" }}>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: "0.93rem",
                                    color: "var(--text)",
                                    fontFamily: "Nunito,sans-serif",
                                    lineHeight: 1.6,
                                }}
                            >
                                {confirmDlg.msg}
                            </p>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 12,
                                padding: "14px 28px",
                                borderTop: "1.5px solid var(--border)",
                            }}
                        >
                            <button
                                style={S.btnSecondary}
                                onClick={handleConfirmCancel}
                            >
                                Cancelar
                            </button>
                            <button
                                style={S.btnPrimaryGreen}
                                onClick={handleConfirmOk}
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div
                    style={{
                        position: "fixed",
                        bottom: 32,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background:
                            toast.type === "success"
                                ? "var(--primary)"
                                : "#e74c3c",
                        color: "#fff",
                        padding: "14px 28px",
                        borderRadius: 10,
                        fontFamily: "Nunito,sans-serif",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        boxShadow: "0 8px 28px rgba(0,0,0,0.2)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        animation: "fadeInUp 0.25s ease",
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}

function Field({
    label,
    k,
    type = "text",
    opts,
    req,
    span,
    form,
    onChange,
    disabled,
}) {
    const wrapStyle = {
        display: "flex",
        flexDirection: "column",
        gap: 5,
        minWidth: 0,
        ...(span ? { gridColumn: `span ${span}` } : {}),
    };
    const inputStyle = {
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 10px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
        fontFamily: "Nunito,sans-serif",
        color: disabled ? "var(--text-muted)" : "var(--text)",
        background: disabled ? "var(--bg)" : "var(--white)",
        outline: "none",
        transition: "border 0.15s",
    };
    return (
        <div style={wrapStyle}>
            <label
                style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "var(--text)",
                }}
            >
                {label}
                {req && (
                    <span style={{ color: "#e74c3c", marginLeft: 3 }}>*</span>
                )}
            </label>
            {opts ? (
                <select
                    style={inputStyle}
                    value={form[k] ?? ""}
                    onChange={onChange(k)}
                    disabled={disabled}
                >
                    <option value="">-- Selecciona --</option>
                    {opts.map((o) =>
                        typeof o === "string" ? (
                            <option key={o} value={o}>
                                {o}
                            </option>
                        ) : (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ),
                    )}
                </select>
            ) : type === "textarea" ? (
                <textarea
                    style={{ ...inputStyle, minHeight: 40, resize: "vertical" }}
                    value={form[k] ?? ""}
                    onChange={onChange(k)}
                    disabled={disabled}
                />
            ) : (
                <input
                    type={type}
                    style={inputStyle}
                    value={form[k] ?? ""}
                    onChange={onChange(k)}
                    disabled={disabled}
                />
            )}
        </div>
    );
}

const SD = {
    docRow: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid var(--border)",
    },
    docLabel: {
        minWidth: 200,
        fontSize: "0.87rem",
        fontWeight: 700,
        color: "var(--text)",
        fontFamily: "Nunito,sans-serif",
        flexShrink: 0,
    },
    docFile: {
        flex: 1,
        fontSize: "0.83rem",
        color: "var(--text-muted)",
        fontFamily: "Nunito,sans-serif",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    btnDownload: {
        padding: "6px 14px",
        background: "var(--bg)",
        color: "var(--text)",
        border: "1.5px solid var(--border)",
        borderRadius: 6,
        fontSize: "0.82rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
        textDecoration: "none",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
    },
    btnReplace: {
        padding: "6px 14px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: "0.82rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
    },
    btnFileSelect: {
        padding: "6px 14px",
        background: "var(--white)",
        color: "var(--text)",
        border: "1.5px solid var(--border)",
        borderRadius: 6,
        fontSize: "0.82rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
    },
    btnDel: {
        padding: "5px 8px",
        background: "#fce8e8",
        color: "#a33",
        border: "none",
        borderRadius: 6,
        fontSize: "0.82rem",
        fontWeight: 700,
        cursor: "pointer",
        lineHeight: 1,
    },
    btnAdd: {
        padding: "7px 16px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: "0.85rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
        whiteSpace: "nowrap",
    },
    nameInput: {
        padding: "7px 10px",
        border: "1.5px solid var(--border)",
        borderRadius: 6,
        fontSize: "0.87rem",
        fontFamily: "Nunito,sans-serif",
        outline: "none",
        background: "var(--white)",
        color: "var(--text)",
    },
};

const S = {
    searchWrap: { position: "relative", flex: 1, minWidth: 200, maxWidth: 380 },
    searchIcon: {
        position: "absolute",
        left: 11,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        color: "var(--text-muted)",
        pointerEvents: "none",
    },
    searchInput: {
        width: "100%",
        padding: "9px 12px 9px 34px",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.88rem",
        fontFamily: "Nunito,sans-serif",
        background: "var(--white)",
        color: "var(--text)",
        outline: "none",
    },
    btnPrimary: {
        padding: "10px 24px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
        whiteSpace: "nowrap",
    },
    btnPrimaryGreen: {
        padding: "10px 20px",
        background: "var(--primary)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
    },
    btnSecondary: {
        padding: "10px 20px",
        background: "var(--bg)",
        color: "var(--text)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Nunito,sans-serif",
    },
    badge: (bg, color) => ({
        background: bg,
        color,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: "0.78rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        fontFamily: "Nunito,sans-serif",
    }),
    actions: { display: "flex", gap: 6, justifyContent: "center" },
    actionBtn: (bg, color) => ({
        background: bg,
        border: "none",
        borderRadius: 6,
        padding: "5px 8px",
        cursor: "pointer",
        fontSize: "0.85rem",
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
    }),
    empty: {
        padding: "60px 20px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.9rem",
        fontFamily: "Nunito,sans-serif",
    },
    candTh: (align) => ({
        padding: "12px 10px",
        fontSize: "0.75rem",
        color: "var(--primary)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
        textAlign: align,
        fontFamily: "Nunito,sans-serif",
    }),
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(26,58,53,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5000,
        padding: 20,
    },
    modal: {
        background: "var(--white)",
        borderRadius: "var(--radius)",
        boxShadow: "0 16px 60px rgba(26,155,140,0.22)",
        width: "100%",
        maxWidth: 900,
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
    },
    modalHeaderGreen: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "22px 28px",
        background: "var(--primary)",
        borderTopLeftRadius: "var(--radius)",
        borderTopRightRadius: "var(--radius)",
        flexShrink: 0,
    },
    modalTitleWhite: {
        fontFamily: "'Poppins',sans-serif",
        fontWeight: 700,
        fontSize: "1.2rem",
        color: "#fff",
    },
    closeBtnWhite: {
        background: "none",
        border: "1.5px solid rgba(255,255,255,0.6)",
        borderRadius: "50%",
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#fff",
    },
    modalBody: {
        padding: "22px 28px 28px",
        overflowY: "auto",
        overflowX: "hidden",
        flex: 1,
    },
    modalFooter: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
        padding: "16px 28px",
        borderTop: "1.5px solid var(--border)",
        flexShrink: 0,
    },
    grid3: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 14,
    },
    tabSwitch: {
        display: "inline-flex",
        background: "transparent",
        borderBottom: "1.5px solid var(--border)",
        gap: 8,
        paddingBottom: 8,
        alignItems: "center",
    },
    tabBtn: {
        padding: "8px 14px",
        borderRadius: 8,
        background: "transparent",
        border: "none",
        color: "var(--text-muted)",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: "0.78rem",
    },
    tabBtnActive: {
        padding: "8px 14px",
        borderRadius: 8,
        background: "transparent",
        border: "none",
        color: "var(--primary)",
        cursor: "pointer",
        fontWeight: 800,
        borderBottom: "3px solid var(--primary)",
        fontSize: "0.78rem",
    },
    processDot: {
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: "#34d399",
        marginRight: 8,
        verticalAlign: "middle",
    },
    formInput: {
        width: "100%",
        padding: "8px 10px",
        borderRadius: 6,
        border: "1.5px solid var(--border)",
        boxSizing: "border-box",
        fontSize: "0.88rem",
        height: 40,
        background: "var(--white)",
    },
};
