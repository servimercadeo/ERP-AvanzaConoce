import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { IconEdit, IconTrash, IconClose, IconLoading, IconEmptySearch } from '../components/Icons';

const PROYECTOS   = ['TIGO EXPRESS', 'DIRECTV CO', 'Administrativo'];
const CATEGORIAS  = ['Polo', 'Jean', 'Chaqueta', 'Tenis', 'Camisa', 'Zapatos', 'Gorra', 'Chaleco', 'Otro'];
const GENEROS     = ['Masculino', 'Femenino', 'Unisex'];
const TALLAS_ROPA = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const TALLAS_JEAN = ['26', '28', '30', '32', '34', '36', '38', '40'];
const TALLAS_TENIS = ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
const ALL_TALLAS_ORDER = [...TALLAS_ROPA, ...TALLAS_JEAN, ...TALLAS_TENIS.filter(t => !TALLAS_JEAN.includes(t))];

function tallasForCategoria(cat) {
    if (cat === 'Jean') return TALLAS_JEAN;
    if (cat === 'Tenis' || cat === 'Zapatos') return TALLAS_TENIS;
    return TALLAS_ROPA;
}

const EMPTY_ITEM = { proyecto: 'TIGO EXPRESS', categoria: 'Polo', subcategoria: '', genero: 'Masculino', talla: 'M', cantidad: 0, stock_minimo: 0 };
const EMPTY_BULK_ROW = () => ({ ...EMPTY_ITEM });

// ─── Modal agregar / editar un item ──────────────────────────────────────────
function ItemModal({ item, onClose, onSaved }) {
    const isEdit = !!item?.id;
    const [form, setForm] = useState(isEdit
        ? { cantidad: item.cantidad, stock_minimo: item.stock_minimo }
        : { ...EMPTY_ITEM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const tallasOpts = isEdit ? [] : tallasForCategoria(form.categoria);

    const handleSave = async () => {
        setSaving(true); setError('');
        try {
            if (isEdit) {
                const { data } = await api.put(`/inventario-dotacion/${item.id}`, {
                    cantidad: Number(form.cantidad),
                    stock_minimo: Number(form.stock_minimo),
                });
                onSaved(data, true);
            } else {
                if (!form.subcategoria.trim()) return setError('Ingresa una descripción/subcategoría.') || setSaving(false);
                const { data } = await api.post('/inventario-dotacion', {
                    ...form,
                    cantidad: Number(form.cantidad),
                    stock_minimo: Number(form.stock_minimo),
                });
                onSaved(data, false);
            }
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Error al guardar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 500 }}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>{isEdit ? 'Editar item' : 'Nuevo item'}</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    {isEdit ? (
                        <>
                            <div style={S.readonlyGroup}>
                                <span style={S.roLabel}>Proyecto</span><span style={S.roVal}>{item.proyecto}</span>
                                <span style={S.roLabel}>Prenda</span><span style={S.roVal}>{item.categoria} · {item.subcategoria}</span>
                                <span style={S.roLabel}>Género / Talla</span><span style={S.roVal}>{item.genero} / {item.talla}</span>
                            </div>
                            <div style={S.grid2}>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Cantidad</label>
                                    <input type="number" min={0} style={S.input} value={form.cantidad} onChange={set('cantidad')} />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Stock mínimo</label>
                                    <input type="number" min={0} style={S.input} value={form.stock_minimo} onChange={set('stock_minimo')} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={S.grid2}>
                                <div style={{ ...S.formGroup, gridColumn: 'span 2' }}>
                                    <label style={S.label}>Proyecto *</label>
                                    <select style={S.input} value={form.proyecto} onChange={set('proyecto')}>
                                        {PROYECTOS.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Categoría (prenda) *</label>
                                    <select style={S.input} value={form.categoria}
                                        onChange={e => setForm(f => ({ ...f, categoria: e.target.value, talla: tallasForCategoria(e.target.value)[0] }))}>
                                        {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Género *</label>
                                    <select style={S.input} value={form.genero} onChange={set('genero')}>
                                        {GENEROS.map(g => <option key={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div style={{ ...S.formGroup, gridColumn: 'span 2' }}>
                                    <label style={S.label}>Descripción / Subcategoría *</label>
                                    <input type="text" style={S.input} placeholder="Ej: Polo manga corta, Jean slim fit…"
                                        value={form.subcategoria} onChange={set('subcategoria')} />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Talla *</label>
                                    <select style={S.input} value={form.talla} onChange={set('talla')}>
                                        {tallasOpts.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Cantidad</label>
                                    <input type="number" min={0} style={S.input} value={form.cantidad} onChange={set('cantidad')} />
                                </div>
                                <div style={{ ...S.formGroup, gridColumn: 'span 2' }}>
                                    <label style={S.label}>Stock mínimo</label>
                                    <input type="number" min={0} style={S.input} value={form.stock_minimo} onChange={set('stock_minimo')} />
                                </div>
                            </div>
                        </>
                    )}
                    {error && <div style={S.errorMsg}>{error}</div>}
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cancelar</button>
                    <button style={S.btnPrimary} onClick={handleSave} disabled={saving}>
                        {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Modal carga masiva ──────────────────────────────────────────────────────
function BulkModal({ onClose, onSaved }) {
    const [rows, setRows] = useState([EMPTY_BULK_ROW()]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const setRow = (idx, k, v) => setRows(rs => rs.map((r, i) => i === idx ? { ...r, [k]: v } : r));
    const addRow = () => setRows(rs => [...rs, EMPTY_BULK_ROW()]);
    const removeRow = (idx) => setRows(rs => rs.filter((_, i) => i !== idx));

    const handleSave = async () => {
        const incomplete = rows.some(r => !r.subcategoria.trim());
        if (incomplete) return setError('Todos los items necesitan descripción/subcategoría.');
        setSaving(true); setError('');
        try {
            const { data } = await api.post('/inventario-dotacion/bulk', {
                items: rows.map(r => ({ ...r, cantidad: Number(r.cantidad), stock_minimo: Number(r.stock_minimo) }))
            });
            onSaved(data.saved);
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Error al guardar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 980 }}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>Carga masiva de inventario</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={{ ...S.modalBody, overflowX: 'auto', padding: '18px 22px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg)' }}>
                                {['Proyecto', 'Categoría', 'Descripción', 'Género', 'Talla', 'Cantidad', 'Stock mín.', ''].map(h => (
                                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', border: '1px solid var(--border)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => (
                                <tr key={idx}>
                                    <td style={S.tdCell}>
                                        <select style={S.cellInput} value={row.proyecto} onChange={e => setRow(idx, 'proyecto', e.target.value)}>
                                            {PROYECTOS.map(p => <option key={p}>{p}</option>)}
                                        </select>
                                    </td>
                                    <td style={S.tdCell}>
                                        <select style={S.cellInput} value={row.categoria}
                                            onChange={e => { setRow(idx, 'categoria', e.target.value); setRow(idx, 'talla', tallasForCategoria(e.target.value)[0]); }}>
                                            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </td>
                                    <td style={S.tdCell}>
                                        <input style={S.cellInput} placeholder="Ej: Polo manga corta" value={row.subcategoria} onChange={e => setRow(idx, 'subcategoria', e.target.value)} />
                                    </td>
                                    <td style={S.tdCell}>
                                        <select style={S.cellInput} value={row.genero} onChange={e => setRow(idx, 'genero', e.target.value)}>
                                            {GENEROS.map(g => <option key={g}>{g}</option>)}
                                        </select>
                                    </td>
                                    <td style={S.tdCell}>
                                        <select style={S.cellInput} value={row.talla} onChange={e => setRow(idx, 'talla', e.target.value)}>
                                            {tallasForCategoria(row.categoria).map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </td>
                                    <td style={S.tdCell}>
                                        <input type="number" min={0} style={{ ...S.cellInput, width: 70 }} value={row.cantidad} onChange={e => setRow(idx, 'cantidad', e.target.value)} />
                                    </td>
                                    <td style={S.tdCell}>
                                        <input type="number" min={0} style={{ ...S.cellInput, width: 70 }} value={row.stock_minimo} onChange={e => setRow(idx, 'stock_minimo', e.target.value)} />
                                    </td>
                                    <td style={{ ...S.tdCell, textAlign: 'center' }}>
                                        {rows.length > 1 && (
                                            <button style={{ ...S.btnIcon, color: '#c0392b' }} onClick={() => removeRow(idx)}>
                                                <IconTrash size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button style={{ ...S.btnSecondary, marginTop: 12, fontSize: '0.82rem', padding: '6px 14px' }} onClick={addRow}>
                        + Agregar fila
                    </button>
                    {error && <div style={{ ...S.errorMsg, marginTop: 12 }}>{error}</div>}
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={saving}>Cancelar</button>
                    <button style={S.btnPrimary} onClick={handleSave} disabled={saving}>
                        {saving ? `Guardando ${rows.length} items…` : `Guardar ${rows.length} item${rows.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Modal confirmar eliminación ─────────────────────────────────────────────
function DeleteModal({ item, onClose, onDeleted }) {
    const [deleting, setDeleting] = useState(false);
    const handle = async () => {
        setDeleting(true);
        try {
            await api.delete(`/inventario-dotacion/${item.id}`);
            onDeleted(item.id);
        } catch { setDeleting(false); }
    };
    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 400 }}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, color: '#c0392b' }}>Eliminar item</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <p>¿Eliminar <strong>{item.categoria} {item.subcategoria}</strong> talla <strong>{item.talla}</strong> ({item.genero}) de <strong>{item.proyecto}</strong>?</p>
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={deleting}>Cancelar</button>
                    <button style={{ ...S.btnPrimary, background: '#c0392b' }} onClick={handle} disabled={deleting}>
                        {deleting ? 'Eliminando…' : 'Eliminar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Componente principal ────────────────────────────────────────────────────
const PROYECTO_COLORS = {
    'TIGO EXPRESS': { bg: '#e8f8f5', color: '#0d6e5a', border: '#0d6e5a' },
    'DIRECTV CO':   { bg: '#e8f0ff', color: '#1a4fa8', border: '#1a4fa8' },
    'Administrativo': { bg: '#fef3c7', color: '#92400e', border: '#b45309' },
};

export default function ProductosDotacion() {
    const qc = useQueryClient();
    const [proyectoTab, setProyectoTab]   = useState('TIGO EXPRESS');
    const [categoriaFiltro, setCategoriaFiltro] = useState('Todos');
    const [generoFiltro, setGeneroFiltro] = useState('Todos');
    const [tallaFiltro, setTallaFiltro]   = useState('Todos');
    const [search, setSearch]             = useState('');
    const [editItem, setEditItem]         = useState(null);
    const [deleteItem, setDeleteItem]     = useState(null);
    const [addOpen, setAddOpen]           = useState(false);
    const [bulkOpen, setBulkOpen]         = useState(false);
    const [toast, setToast]               = useState(null);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    const { data: inventario = [], isLoading } = useQuery({
        queryKey: ['inventario-dotacion-flat'],
        queryFn: () => api.get('/inventario-dotacion?flat=true').then(r => r.data),
    });

    // Stats globales
    const stats = useMemo(() => {
        const total = inventario.reduce((s, i) => s + i.cantidad, 0);
        const bajoStock = inventario.filter(i => i.cantidad <= i.stock_minimo && i.stock_minimo > 0).length;
        const porProyecto = {};
        PROYECTOS.forEach(p => {
            const items = inventario.filter(i => i.proyecto === p);
            porProyecto[p] = items.reduce((s, i) => s + i.cantidad, 0);
        });
        return { total, bajoStock, porProyecto };
    }, [inventario]);

    // Filtrado por tab, categoría, género, talla y búsqueda
    const filtrados = useMemo(() => {
        let items = inventario.filter(i => i.proyecto === proyectoTab);
        if (categoriaFiltro !== 'Todos') items = items.filter(i => i.categoria === categoriaFiltro);
        if (generoFiltro !== 'Todos') items = items.filter(i => i.genero === generoFiltro);
        if (tallaFiltro !== 'Todos') items = items.filter(i => i.talla === tallaFiltro);
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(i =>
                i.categoria.toLowerCase().includes(q) ||
                i.subcategoria.toLowerCase().includes(q) ||
                i.genero.toLowerCase().includes(q) ||
                i.talla.toLowerCase().includes(q)
            );
        }
        return items;
    }, [inventario, proyectoTab, categoriaFiltro, generoFiltro, tallaFiltro, search]);

    // Categorías disponibles en el tab actual
    const categoriasDisponibles = useMemo(() => {
        const enTab = inventario.filter(i => i.proyecto === proyectoTab);
        const presentes = new Set(enTab.map(i => i.categoria));
        return ['Todos', ...CATEGORIAS.filter(c => presentes.has(c))];
    }, [inventario, proyectoTab]);

    // Tallas disponibles según proyecto + categoría + género activos
    const tallasDisponibles = useMemo(() => {
        let items = inventario.filter(i => i.proyecto === proyectoTab);
        if (categoriaFiltro !== 'Todos') items = items.filter(i => i.categoria === categoriaFiltro);
        if (generoFiltro !== 'Todos') items = items.filter(i => i.genero === generoFiltro);
        const presentes = new Set(items.map(i => i.talla));
        return ['Todos', ...ALL_TALLAS_ORDER.filter(t => presentes.has(t))];
    }, [inventario, proyectoTab, categoriaFiltro, generoFiltro]);

    const invalidate = () => qc.invalidateQueries({ queryKey: ['inventario-dotacion-flat'] });

    const handleSaved = (item, isEdit) => {
        invalidate();
        setEditItem(null); setAddOpen(false);
        showToast(isEdit ? 'Item actualizado.' : 'Item agregado.');
    };

    const handleBulkSaved = (count) => {
        invalidate();
        setBulkOpen(false);
        showToast(`${count} item${count !== 1 ? 's' : ''} guardados.`);
    };

    const handleDeleted = (id) => {
        qc.setQueryData(['inventario-dotacion-flat'], prev => (prev ?? []).filter(i => i.id !== id));
        setDeleteItem(null);
        showToast('Item eliminado.');
    };

    const badgeStock = (cantidad, minimo) => {
        if (minimo === 0) return { bg: '#f1f5f9', color: '#475569', label: 'Sin mín.' };
        if (cantidad <= minimo * 0.5) return { bg: '#fce8e8', color: '#c0392b', label: 'Crítico' };
        if (cantidad <= minimo) return { bg: '#fff7e0', color: '#b7780c', label: 'Bajo' };
        return { bg: '#e0f7f4', color: '#0d6e5a', label: 'OK' };
    };

    const pc = PROYECTO_COLORS[proyectoTab] ?? PROYECTO_COLORS['TIGO EXPRESS'];

    return (
        <div style={{ width: '100%' }}>
            {toast && <div style={S.toast}>{toast}</div>}

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Total prendas</div>
                </div>
                {PROYECTOS.map(p => {
                    const c = PROYECTO_COLORS[p];
                    return (
                        <div key={p} className="stat-card" style={{ cursor: 'pointer', borderLeft: `4px solid ${c.border}` }} onClick={() => { setProyectoTab(p); setCategoriaFiltro('Todos'); setGeneroFiltro('Todos'); setTallaFiltro('Todos'); }}>
                            <div className="stat-num" style={{ color: c.color }}>{stats.porProyecto[p] ?? 0}</div>
                            <div className="stat-label">{p}</div>
                        </div>
                    );
                })}
                <div className="stat-card">
                    <div className="stat-num" style={{ color: '#c0392b' }}>{stats.bajoStock}</div>
                    <div className="stat-label">Stock bajo / crítico</div>
                </div>
            </div>

            {/* Tabs de proyecto */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
                {PROYECTOS.map(p => {
                    const active = proyectoTab === p;
                    const c = PROYECTO_COLORS[p];
                    return (
                        <button key={p} onClick={() => { setProyectoTab(p); setCategoriaFiltro('Todos'); setGeneroFiltro('Todos'); setTallaFiltro('Todos'); }} style={{
                            padding: '10px 22px', border: 'none', borderBottom: active ? `2.5px solid ${c.border}` : '2.5px solid transparent',
                            marginBottom: -2, background: 'transparent', fontWeight: active ? 800 : 600,
                            fontSize: '0.9rem', fontFamily: 'Nunito,sans-serif', color: active ? c.color : 'var(--text-muted)',
                            cursor: 'pointer', transition: 'color 0.15s',
                        }}>
                            {p}
                            <span style={{ marginLeft: 7, fontSize: '0.75rem', background: active ? c.bg : 'var(--bg)', color: active ? c.color : 'var(--text-muted)', borderRadius: 20, padding: '1px 8px', fontWeight: 700 }}>
                                {inventario.filter(i => i.proyecto === p).reduce((s, i) => s + i.cantidad, 0)}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filtros por categoría y género */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {categoriasDisponibles.map(cat => {
                        const active = categoriaFiltro === cat;
                        return (
                            <button key={cat} onClick={() => { setCategoriaFiltro(cat); setTallaFiltro('Todos'); }} style={{
                                padding: '5px 14px', border: `1.5px solid ${active ? pc.border : 'var(--border)'}`,
                                borderRadius: 20, background: active ? pc.bg : 'var(--white)',
                                color: active ? pc.color : 'var(--text-muted)', fontWeight: active ? 800 : 600,
                                fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', transition: 'all 0.12s',
                            }}>
                                {cat}
                            </button>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {['Todos', ...GENEROS].map(g => {
                        const active = generoFiltro === g;
                        const gColor = g === 'Masculino' ? { bg: '#e8f0ff', color: '#1a4fa8' }
                            : g === 'Femenino' ? { bg: '#fce8f5', color: '#8b267a' }
                            : g === 'Unisex' ? { bg: '#f1f5f9', color: '#475569' }
                            : { bg: 'var(--bg)', color: 'var(--text-muted)' };
                        return (
                            <button key={g} onClick={() => setGeneroFiltro(g)} style={{
                                padding: '5px 14px', border: `1.5px solid ${active ? gColor.color : 'var(--border)'}`,
                                borderRadius: 20, background: active ? gColor.bg : 'var(--white)',
                                color: active ? gColor.color : 'var(--text-muted)', fontWeight: active ? 800 : 600,
                                fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', transition: 'all 0.12s',
                            }}>
                                {g}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={S.searchWrap}>
                    <svg style={S.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input style={S.searchInput} placeholder={`Buscar en ${proyectoTab}…`} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {tallasDisponibles.length > 1 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {tallasDisponibles.map(t => {
                            const active = tallaFiltro === t;
                            return (
                                <button key={t} onClick={() => setTallaFiltro(t)} style={{
                                    padding: '5px 11px', border: `1.5px solid ${active ? pc.border : 'var(--border)'}`,
                                    borderRadius: 20, background: active ? pc.bg : 'var(--white)',
                                    color: active ? pc.color : 'var(--text-muted)', fontWeight: active ? 800 : 600,
                                    fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Nunito,sans-serif', transition: 'all 0.12s',
                                    minWidth: 36, textAlign: 'center',
                                }}>
                                    {t}
                                </button>
                            );
                        })}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                    <button style={S.btnSecondary} onClick={() => setBulkOpen(true)}>Carga masiva</button>
                    <button style={S.btnPrimary} onClick={() => setAddOpen(true)}>+ Nuevo item</button>
                </div>
            </div>

            {/* Tabla */}
            <div style={S.tableWrap}>
                {isLoading ? (
                    <div style={S.empty}><IconLoading size={32} /><p>Cargando inventario…</p></div>
                ) : filtrados.length === 0 ? (
                    <div style={S.empty}>
                        <IconEmptySearch size={44} />
                        <p style={{ fontWeight: 700, marginBottom: 4 }}>Sin items en {proyectoTab}</p>
                        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Usa "+ Nuevo item" o "Carga masiva" para agregar prendas.</p>
                    </div>
                ) : (
                    <table className="data-table" style={{ fontSize: '0.83rem' }}>
                        <thead>
                            <tr>
                                <th>Categoría</th>
                                <th>Descripción</th>
                                <th>Género</th>
                                <th style={{ textAlign: 'center' }}>Talla</th>
                                <th style={{ textAlign: 'center' }}>Cantidad</th>
                                <th style={{ textAlign: 'center' }}>Stock mín.</th>
                                <th style={{ textAlign: 'center' }}>Estado</th>
                                <th style={{ textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.map(item => {
                                const bs = badgeStock(item.cantidad, item.stock_minimo);
                                return (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: 700 }}>{item.categoria}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{item.subcategoria || '—'}</td>
                                        <td>
                                            <span style={{ ...S.badge(item.genero === 'Masculino' ? '#e8f0ff' : item.genero === 'Femenino' ? '#fce8f5' : '#f1f5f9', item.genero === 'Masculino' ? '#1a4fa8' : item.genero === 'Femenino' ? '#8b267a' : '#475569') }}>
                                                {item.genero}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.talla}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.96rem' }}>{item.cantidad}</td>
                                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{item.stock_minimo}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: bs.bg, color: bs.color, whiteSpace: 'nowrap' }}>
                                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: bs.color, display: 'inline-block' }} />
                                                {bs.label}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                <button style={S.actionBtn('#e8f8f5', 'var(--primary-dark)')} title="Editar" onClick={() => setEditItem(item)}>
                                                    <IconEdit size={14} />
                                                </button>
                                                <button style={S.actionBtn('#fce8e8', '#c0392b')} title="Eliminar" onClick={() => setDeleteItem(item)}>
                                                    <IconTrash size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modales */}
            {addOpen  && <ItemModal onClose={() => setAddOpen(false)} onSaved={handleSaved} />}
            {editItem && <ItemModal item={editItem} onClose={() => setEditItem(null)} onSaved={handleSaved} />}
            {bulkOpen && <BulkModal onClose={() => setBulkOpen(false)} onSaved={handleBulkSaved} />}
            {deleteItem && <DeleteModal item={deleteItem} onClose={() => setDeleteItem(null)} onDeleted={handleDeleted} />}
        </div>
    );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const S = {
    toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
    searchWrap: { position: 'relative', flex: 1, minWidth: 220, maxWidth: 420 },
    searchIcon: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' },
    searchInput: { width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', fontFamily: 'Nunito,sans-serif', background: 'var(--white)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' },
    tableWrap: { background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflowX: 'auto' },
    badge: (bg, color) => ({ background: bg, color, borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }),
    actionBtn: (bg, color) => ({ background: bg, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
    empty: { padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
    // Modal
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: '0 8px 40px rgba(0,0,0,0.22)', width: '100%', fontFamily: 'Nunito,sans-serif', maxHeight: '92vh', display: 'flex', flexDirection: 'column' },
    modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1.5px solid var(--border)', flexShrink: 0 },
    modalBody: { padding: '18px 22px', overflowY: 'auto', flex: 1 },
    modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px 18px', borderTop: '1.5px solid var(--border)', flexShrink: 0 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
    formGroup: { display: 'flex', flexDirection: 'column', gap: 5 },
    label: { fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
    input: { padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontFamily: 'Nunito,sans-serif', background: 'var(--white)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' },
    readonlyGroup: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', marginBottom: 18, padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: '0.85rem' },
    roLabel: { fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' },
    roVal: { color: 'var(--text)', fontWeight: 600 },
    btnPrimary: { padding: '9px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Nunito,sans-serif' },
    btnSecondary: { padding: '9px 18px', background: 'var(--white)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Nunito,sans-serif' },
    btnIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 6 },
    errorMsg: { background: '#fce8e8', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: '0.84rem', fontWeight: 600, marginTop: 10 },
    tdCell: { padding: '6px 8px', border: '1px solid var(--border)', verticalAlign: 'middle' },
    cellInput: { padding: '6px 8px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'Nunito,sans-serif', background: 'var(--white)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' },
    toast: { position: 'fixed', bottom: 28, right: 28, background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-sm)', padding: '13px 22px', fontWeight: 700, fontSize: '0.92rem', zIndex: 99999, boxShadow: '0 8px 28px rgba(26,155,140,0.35)' },
};
