import { createContext, useContext } from "react";
import { useAuth } from "../context/AuthContext";
import { ACCIONES, canDo } from "../data/erpModules";

// Pestaña que se está mostrando ({ moduleId, submoduleId, archivoId }). La ponen Module y
// Submodule alrededor de cada CRUD para que la página no tenga que recibirla por props.
export const PestanaContext = createContext(null);

/**
 * Qué acciones puede hacer el usuario en la pestaña actual, según la matriz del módulo
 * Permisos: { crear, editar, eliminar, importar, exportar } (booleanos). Fuera de una
 * pestaña (sin PestanaContext) todo es true: el servidor sigue siendo quien decide.
 */
export function useAcciones() {
    const { user } = useAuth();
    const pestana = useContext(PestanaContext);
    return Object.fromEntries(
        ACCIONES.map(({ id }) => [
            id,
            !pestana || canDo(user, pestana.moduleId, pestana.submoduleId, pestana.archivoId, id),
        ]),
    );
}
