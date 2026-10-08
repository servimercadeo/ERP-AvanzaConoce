// Empresa que se muestra en los formularios públicos del proceso de selección: la de la
// requisición del candidato (la API la envía como `empresa`, ver EmpresaDelProceso.php).
// Mientras carga, o si no hay requisición, se muestra S&M.
export const EMPRESA_SYM = {
    clave: "sym",
    nombre: "S&M Servicios y Mercadeo S.A.S.",
    corto: "S&M",
    sigla: "S&M",
};

export const empresaDesdeApi = (empresa) =>
    empresa && empresa.nombre ? { ...EMPRESA_SYM, ...empresa } : EMPRESA_SYM;
