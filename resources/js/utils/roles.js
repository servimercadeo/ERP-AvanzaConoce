// Roles del ERP (columna `users.rol`). En Empleados se muestran como "Tipo de funcionario".
export const ROLES_ERP = [
    { value: "admin", label: "Administrador" },
    { value: "th", label: "Talento Humano" },
    { value: "tic", label: "TIC / Sistemas" },
    { value: "operaciones", label: "Operaciones" },
    { value: "financiera", label: "Financiera" },
    { value: "supervisores", label: "Supervisores" },
    { value: "general", label: "General" },
];

export const etiquetaRol = (rol) =>
    ROLES_ERP.find((r) => r.value === rol)?.label ?? (rol || "General");
