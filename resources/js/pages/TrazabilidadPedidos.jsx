import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { SearchableSelect } from '../components/SearchableSelect';
import { IconEmptySearch, IconLoading, IconPedidos, IconCheckCircle, IconTruck } from '../components/Icons';

const PASO_ICONOS = [IconPedidos, IconCheckCircle, IconTruck];

const fmtDate = (str) => {
    if (!str) return null;
    const d = new Date(String(str).split(' ')[0].split('T')[0] + 'T00:00:00');
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (str) => {
    if (!str) return null;
    return new Date(str).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

function construirPasos(global) {
    return [
        {
            label: 'Pedido generado',
            completado: true,
            fecha: fmtDate(global.fecha),
        },
        {
            label: 'Pedido confirmado',
            completado: !!global.confirmado,
            fecha: global.confirmado_at ? fmtDateTime(global.confirmado_at) : (global.confirmado ? 'Fecha no registrada' : null),
        },
        {
            label: 'Entrega completada',
            completado: !!global.entrega_confirmada,
            fecha: global.entrega_confirmada_at ? fmtDateTime(global.entrega_confirmada_at) : (global.entrega_confirmada ? 'Fecha no registrada' : null),
        },
    ];
}

function Timeline({ global }) {
    const pasos = construirPasos(global);
    const activoIdx = pasos.findIndex(p => !p.completado);
    const pasoActivo = activoIdx === -1 ? pasos.length - 1 : activoIdx;
    const progresoPct = (pasoActivo / (pasos.length - 1)) * 100;

    return (
        <div style={{ padding: '30px 20px 10px', overflowX: 'auto' }}>
            <div style={{ position: 'relative', display: 'flex', minWidth: 420 }}>
                <div style={{ position: 'absolute', top: 18, left: `${100 / pasos.length / 2}%`, right: `${100 / pasos.length / 2}%`, height: 3, background: 'var(--border)', borderRadius: 2 }} />
                <div style={{ position: 'absolute', top: 18, left: `${100 / pasos.length / 2}%`, width: `calc(${progresoPct}% * ${(pasos.length - 1) / pasos.length})`, height: 3, background: 'var(--primary)', borderRadius: 2, transition: 'width 0.3s' }} />
                {pasos.map((paso, i) => {
                    const esActivo = i === pasoActivo;
                    const Icono = PASO_ICONOS[i];
                    return (
                        <div key={paso.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: paso.completado ? 'var(--primary)' : (esActivo ? 'var(--white)' : 'var(--bg)'),
                                border: `2.5px solid ${paso.completado || esActivo ? 'var(--primary)' : 'var(--border)'}`,
                                color: paso.completado ? '#fff' : (esActivo ? 'var(--primary)' : 'var(--text-muted)'),
                            }}>
                                <Icono size={18} />
                            </div>
                            <div style={{ marginTop: 8, fontWeight: 700, fontSize: '0.82rem', textAlign: 'center', color: paso.completado || esActivo ? 'var(--text)' : 'var(--text-muted)' }}>
                                {paso.label}
                            </div>
                            <div style={{ marginTop: 2, fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                {paso.fecha ?? '—'}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function TrazabilidadPedidos() {
    const [seleccionadoId, setSeleccionadoId] = useState('');

    const { data: globales = [], isLoading } = useQuery({
        queryKey: ['pedidos-globales'],
        queryFn: () => api.get('/pedidos-globales').then(r => r.data),
    });

    const opciones = useMemo(() => globales.map(g => ({
        label: `Pedido #${g.codigo}` + (g.cliente_proyecto ? ` · ${g.cliente_proyecto}` : ''),
        value: g.id,
    })), [globales]);

    const global = useMemo(
        () => globales.find(g => String(g.id) === String(seleccionadoId)) ?? null,
        [globales, seleccionadoId]
    );

    const prendas = useMemo(() => {
        if (!global) return [];
        return (global.pedidos_automaticos ?? []).flatMap(p =>
            (p.items ?? []).map(it => ({
                id: `${p.id}-${it.id}`,
                empleado: p.empleado ? `${p.empleado.nombres ?? ''} ${p.empleado.apellidos ?? ''}`.trim() : '—',
                prenda: it.inventario?.prenda ?? '—',
                genero: it.inventario?.genero ?? '—',
                talla: it.inventario?.talla ?? '—',
                cantidad: it.cantidad,
            }))
        );
    }, [global]);

    const totalPrendas = prendas.reduce((s, p) => s + p.cantidad, 0);

    return (
        <div style={{ width: '100%' }}>
            <div style={{ maxWidth: 480, marginBottom: 24 }}>
                <label style={S.label}>Buscar pedido por código</label>
                <SearchableSelect
                    value={seleccionadoId}
                    onChange={setSeleccionadoId}
                    defaultValue=""
                    options={opciones}
                    minSearch={0}
                />
            </div>

            {isLoading ? (
                <div style={S.empty}><IconLoading size={32} /><p>Cargando pedidos…</p></div>
            ) : !global ? (
                <div style={S.empty}>
                    <IconEmptySearch size={44} />
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>Selecciona un pedido</p>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Busca por código para ver su trazabilidad.</p>
                </div>
            ) : (
                <>
                    <div style={S.card}>
                        <div style={S.headerRow}>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ID del pedido</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace' }}>#{global.codigo}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Proyecto</div>
                                <div style={{ fontWeight: 700 }}>{global.cliente_proyecto ?? '—'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Regional</div>
                                <div style={{ fontWeight: 700 }}>{global.regional?.nombre ?? '—'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fecha del pedido</div>
                                <div style={{ fontWeight: 700 }}>{fmtDate(global.fecha) ?? '—'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pedidos / Prendas</div>
                                <div style={{ fontWeight: 700 }}>{global.total_pedidos ?? (global.pedidos_automaticos ?? []).length} / {totalPrendas}</div>
                            </div>
                        </div>

                        <Timeline global={global} />
                    </div>

                    <div style={{ ...S.card, marginTop: 16 }}>
                        <div style={{ fontWeight: 800, marginBottom: 12 }}>Prendas incluidas</div>
                        {prendas.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>Este pedido no tiene prendas registradas.</p>
                        ) : (
                            <table className="data-table" style={{ fontSize: '0.83rem' }}>
                                <thead>
                                    <tr>
                                        <th>Empleado</th>
                                        <th>Prenda</th>
                                        <th>Género</th>
                                        <th style={{ textAlign: 'center' }}>Talla</th>
                                        <th style={{ textAlign: 'center' }}>Cantidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prendas.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.empleado}</td>
                                            <td style={{ fontWeight: 700 }}>{p.prenda}</td>
                                            <td>{p.genero}</td>
                                            <td style={{ textAlign: 'center' }}>{p.talla}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{p.cantidad}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

const S = {
    label: { fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 },
    card: { background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '18px 22px' },
    headerRow: { display: 'flex', flexWrap: 'wrap', gap: 24 },
    empty: { padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
};
