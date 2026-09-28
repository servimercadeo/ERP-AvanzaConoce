// En móvil, `.data-table` se transforma en una lista de tarjetas por CSS (ver
// erp-styles.css). Esa transformación necesita que cada <td> sepa a qué columna
// pertenece (`data-label="Nombre de la columna"`) para poder mostrar el rótulo.
// Como las ~25 páginas que usan `.data-table` arman sus tablas a mano en JSX sin
// ese atributo, en vez de tocar cada archivo lo inferimos en runtime a partir del
// propio <thead> de cada tabla: así cualquier tabla existente (o futura) que use la
// clase `data-table` queda lista para móvil sin cambios en su código.
function enhanceDataTables(root = document) {
    root.querySelectorAll("table.data-table").forEach((table) => {
        const headers = Array.from(
            table.querySelectorAll("thead th"),
        ).map((th) => th.textContent.trim());
        if (!headers.length) return;

        table.querySelectorAll("tbody tr").forEach((row) => {
            Array.from(row.children).forEach((cell, i) => {
                if (
                    cell.tagName === "TD" &&
                    headers[i] &&
                    !cell.hasAttribute("data-label")
                ) {
                    cell.setAttribute("data-label", headers[i]);
                }
            });
        });
    });
}

/**
 * Observa el DOM y vuelve a etiquetar las `.data-table` cada vez que aparecen filas
 * nuevas (carga de datos, paginación, filtros). Se debe llamar una vez por página
 * (ver Layout.jsx) y desconectar al desmontar.
 */
export function observeDataTables() {
    let raf = null;
    const run = () => enhanceDataTables();

    const observer = new MutationObserver(() => {
        if (raf) window.cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(run);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    run();

    return {
        disconnect: () => {
            if (raf) window.cancelAnimationFrame(raf);
            observer.disconnect();
        },
    };
}
