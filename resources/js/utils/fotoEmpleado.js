// La foto del empleado se muestra desde varias consultas cacheadas por React Query
// (staleTime de 5 min en app.jsx): Empleados, Contratos, Seguimiento Médico, Pedidos,
// Cronograma. Sin esto, tras cambiarla seguía apareciendo la anterior al cambiar de
// pantalla hasta que la caché vencía o se recargaba la página.
export function propagarFotoEmpleado(qc, empleadoId, fotografia) {
    const mismo = (id) => id != null && String(id) === String(empleadoId);
    const enLista = (fn) => (data) => (Array.isArray(data) ? data.map(fn) : data);

    // Actualización inmediata en caché: se ve al volver a la pantalla sin esperar al servidor.
    qc.setQueriesData(
        { queryKey: ["empleados"] },
        enLista((e) => (mismo(e?.id) ? { ...e, fotografia } : e)),
    );
    qc.setQueriesData(
        { queryKey: ["contratos"] },
        enLista((c) =>
            c?.empleado && mismo(c.empleado.id)
                ? { ...c, empleado: { ...c.empleado, fotografia } }
                : c,
        ),
    );

    // El resto anida al empleado de formas distintas: se recargan al volver a abrirse.
    ["pedidos-automaticos", "pedidos-globales", "cronograma-dotacion"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k], refetchType: "none" }),
    );
}
