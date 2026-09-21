import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import { ERP_MODULES } from "../data/erpModules";

// Categorías que ya tienen su módulo de inventario hecho a mano (Activos, Materiales,
// Equipos, EPP, Herramientas) o su propio sistema aparte (Dotación): crear, renombrar o
// borrar estas en Parametros > Categoría del Producto NO genera ni quita un submódulo
// automático de Inventarios.
export const CATEGORIAS_CON_MODULO_PROPIO = ["Activos", "Materiales", "Equipos", "Dotación", "EPP", "Herramientas"];

// Id de submódulo estable a partir del nombre de la categoría (minúsculas, sin tildes,
// solo [a-z0-9_]), con el mismo prefijo "inv_" que ya usan los módulos de inventario.
export function slugCategoria(nombre) {
    const base = nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    return `inv_${base || "categoria"}`;
}

/**
 * Igual que ERP_MODULES, pero con un submódulo de Inventarios agregado por cada
 * categoría nueva creada en Parametros > Categoría del Producto (que no sea una de las
 * 6 ya construidas a mano). Cada uno se comporta exactamente como Activos/Materiales/
 * etc.: un inventario real por sede, usando el mismo componente genérico
 * (InventarioCategoriaCrud), solo que la categoría a la que apunta viaja en
 * `sub.categoriaDinamica` en vez de estar hardcodeada en un archivo .jsx propio.
 */
export function useErpModules() {
    const { data: categorias = [] } = useQuery({
        queryKey: ["categorias-producto"],
        queryFn: () => api.get("/categorias-producto").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });

    return useMemo(() => {
        const nuevas = categorias.filter((c) => !CATEGORIAS_CON_MODULO_PROPIO.includes(c.nombre));
        if (nuevas.length === 0) return ERP_MODULES;

        return ERP_MODULES.map((mod) => {
            if (mod.id !== "inventarios") return mod;

            const submodsGenerados = nuevas.map((c) => {
                const id = slugCategoria(c.nombre);
                return {
                    id,
                    label: c.nombre,
                    icon: "productos",
                    desc: `Inventario de ${c.nombre.toLowerCase()} por sede`,
                    categoriaDinamica: c.nombre,
                    archivos: [{ id: `${id}_file`, label: `Inventario de ${c.nombre}` }],
                };
            });

            // Se insertan antes de "Inventario General" para que ese quede siempre al final.
            const idxGeneral = mod.submods.findIndex((s) => s.id === "inv_general");
            const submods = [...mod.submods];
            submods.splice(idxGeneral === -1 ? submods.length : idxGeneral, 0, ...submodsGenerados);

            return { ...mod, submods };
        });
    }, [categorias]);
}
