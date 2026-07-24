import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useDebounce } from '../hooks/useDebounce';
import { IconEdit, IconTrash, IconClose, IconLoading, IconEmptySearch, IconFile } from '../components/Icons';
import { SearchableSelect } from '../components/SearchableSelect';

const POR_PAGINA = 50;

const GENEROS     = ['Masculino', 'Femenino', 'Unisex'];
const TALLAS_ROPA = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'XXL', 'XXXL'];
const TALLAS_JEAN = ['4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48'];
const TALLAS_TENIS = ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
const TALLAS_UNICA = ['N/A'];
const ALL_TALLAS_ORDER = [...TALLAS_UNICA, ...TALLAS_ROPA, ...TALLAS_JEAN, ...TALLAS_TENIS.filter(t => !TALLAS_JEAN.includes(t))];

const EMPTY_ITEM = { proyecto: 'SYM TIGO EXPRESS', sede_id: '', prenda: '', genero: 'Masculino', talla: 'M', precio: 0, cantidad: 0, stock_minimo: 0 };
const EMPTY_BULK_ROW = () => ({ ...EMPTY_ITEM });

const fetchSedesPorProyecto = async (proyectos) => {
    const entries = await Promise.all(proyectos.map(async (p) => {
        const { data } = await api.get('/inventario-dotacion/sedes', { params: { proyecto: p } });
        return [p, data];
    }));
    return Object.fromEntries(entries);
};

// ─── Modal agregar / editar un item ──────────────────────────────────────────
function ItemModal({ item, proyectos, sedesPorProyecto, onClose, onSaved }) {
    const isEdit = !!item?.id;
    const [form, setForm] = useState(isEdit
        ? { cantidad: item.cantidad, stock_minimo: item.stock_minimo, precio: item.precio ?? 0 }
        : { ...EMPTY_ITEM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value, ...(k === 'proyecto' ? { sede_id: '' } : {}) }));

    const sedesDisponibles = sedesPorProyecto?.[form.proyecto] ?? [];

    const handleSave = async () => {
        setSaving(true); setError('');
        try {
            if (isEdit) {
                const { data } = await api.put(`/inventario-dotacion/${item.id}`, {
                    cantidad: Number(form.cantidad),
                    stock_minimo: Number(form.stock_minimo),
                    precio: Number(form.precio),
                });
                onSaved(data, true);
            } else {
                if (!form.prenda.trim()) return setError('Ingresa el nombre de la prenda.') || setSaving(false);
                const { data } = await api.post('/inventario-dotacion', {
                    ...form,
                    sede_id: form.sede_id ? Number(form.sede_id) : null,
                    precio: Number(form.precio),
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
                                <span style={S.roLabel}>Sede</span><span style={S.roVal}>{item.sede_nombre ?? 'Sin sede'}</span>
                                <span style={S.roLabel}>Prenda</span><span style={S.roVal}>{item.prenda}</span>
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
                                <div style={S.formGroup}>
                                    <label style={S.label}>Precio</label>
                                    <input type="number" min={0} style={S.input} value={form.precio} onChange={set('precio')} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={S.grid2}>
                                <div style={{ ...S.formGroup, gridColumn: 'span 2' }}>
                                    <label style={S.label}>Proyecto *</label>
                                    <select style={S.input} value={form.proyecto} onChange={set('proyecto')}>
                                        {proyectos.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div style={{ ...S.formGroup, gridColumn: 'span 2' }}>
                                    <label style={S.label}>Sede</label>
                                    <SearchableSelect
                                        value={form.sede_id}
                                        onChange={(v) => setForm(f => ({ ...f, sede_id: v }))}
                                        defaultValue=""
                                        options={sedesDisponibles.map(s => ({ label: s.nombre, value: s.id }))}
                                    />
                                </div>
                                <div style={{ ...S.formGroup, gridColumn: 'span 2' }}>
                                    <label style={S.label}>Prenda *</label>
                                    <input type="text" style={S.input} placeholder="Ej: Polo Gris Manga Corta, Jean Azul…"
                                        value={form.prenda} onChange={set('prenda')} />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Género *</label>
                                    <select style={S.input} value={form.genero} onChange={set('genero')}>
                                        {GENEROS.map(g => <option key={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Talla *</label>
                                    <select style={S.input} value={form.talla} onChange={set('talla')}>
                                        {ALL_TALLAS_ORDER.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Cantidad</label>
                                    <input type="number" min={0} style={S.input} value={form.cantidad} onChange={set('cantidad')} />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Stock mínimo</label>
                                    <input type="number" min={0} style={S.input} value={form.stock_minimo} onChange={set('stock_minimo')} />
                                </div>
                                <div style={S.formGroup}>
                                    <label style={S.label}>Precio</label>
                                    <input type="number" min={0} style={S.input} value={form.precio} onChange={set('precio')} />
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
function BulkModal({ proyectos, sedesPorProyecto, onClose, onSaved }) {
    const [rows, setRows] = useState([EMPTY_BULK_ROW()]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const setRow = (idx, k, v) => setRows(rs => rs.map((r, i) => i === idx ? { ...r, [k]: v, ...(k === 'proyecto' ? { sede_id: '' } : {}) } : r));
    const addRow = () => setRows(rs => [...rs, EMPTY_BULK_ROW()]);
    const removeRow = (idx) => setRows(rs => rs.filter((_, i) => i !== idx));

    const handleSave = async () => {
        const incomplete = rows.some(r => !r.prenda.trim());
        if (incomplete) return setError('Todos los items necesitan el nombre de la prenda.');
        setSaving(true); setError('');
        try {
            const { data } = await api.post('/inventario-dotacion/bulk', {
                items: rows.map(r => ({ ...r, sede_id: r.sede_id ? Number(r.sede_id) : null, precio: Number(r.precio), cantidad: Number(r.cantidad), stock_minimo: Number(r.stock_minimo) }))
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
                                {['Proyecto', 'Sede', 'Prenda', 'Género', 'Talla', 'Precio', 'Cantidad', 'Stock mín.', ''].map(h => (
                                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', border: '1px solid var(--border)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => (
                                <tr key={idx}>
                                    <td style={S.tdCell}>
                                        <select style={S.cellInput} value={row.proyecto} onChange={e => setRow(idx, 'proyecto', e.target.value)}>
                                            {proyectos.map(p => <option key={p}>{p}</option>)}
                                        </select>
                                    </td>
                                    <td style={S.tdCell}>
                                        <select style={S.cellInput} value={row.sede_id} onChange={e => setRow(idx, 'sede_id', e.target.value)}>
                                            <option value="">Sin sede</option>
                                            {(sedesPorProyecto?.[row.proyecto] ?? []).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </td>
                                    <td style={S.tdCell}>
                                        <input style={S.cellInput} placeholder="Ej: Polo Gris Manga Corta" value={row.prenda} onChange={e => setRow(idx, 'prenda', e.target.value)} />
                                    </td>
                                    <td style={S.tdCell}>
                                        <select style={S.cellInput} value={row.genero} onChange={e => setRow(idx, 'genero', e.target.value)}>
                                            {GENEROS.map(g => <option key={g}>{g}</option>)}
                                        </select>
                                    </td>
                                    <td style={S.tdCell}>
                                        <select style={S.cellInput} value={row.talla} onChange={e => setRow(idx, 'talla', e.target.value)}>
                                            {ALL_TALLAS_ORDER.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </td>
                                    <td style={S.tdCell}>
                                        <input type="number" min={0} style={{ ...S.cellInput, width: 80 }} value={row.precio} onChange={e => setRow(idx, 'precio', e.target.value)} />
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

// ─── Modal importar Excel ─────────────────────────────────────────────────────
const STOCK_MINIMO_IMPORT_DEFAULT = 10;

const IMPORT_HEADER_MAP = {
    proyecto: 'proyecto',
    sede: 'sede',
    prenda: 'prenda',
    genero: 'genero',
    talla: 'talla',
    precio: 'precio',
    cantidad: 'cantidad',
};

const normalizeHeader = (s) => (s ?? '').toString().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').toLowerCase().trim();

function ImportModal({ proyectos, sedesPorProyecto, onClose, onImported }) {
    const [fileName, setFileName] = useState('');
    const [validRows, setValidRows] = useState([]);
    const [invalidRows, setInvalidRows] = useState([]);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(''); setValidRows([]); setInvalidRows([]); setFileName(file.name);

        try {
            const XLSX = await import('xlsx');
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

            if (raw.length === 0) { setError('El archivo no tiene filas de datos.'); return; }

            const valid = [];
            const invalid = [];

            raw.forEach((row, idx) => {
                const mapped = {};
                Object.entries(row).forEach(([k, v]) => {
                    const key = IMPORT_HEADER_MAP[normalizeHeader(k)];
                    if (key) mapped[key] = typeof v === 'string' ? v.trim() : v;
                });

                const motivos = [];
                if (!proyectos.includes(mapped.proyecto)) motivos.push('proyecto inválido');
                if (!mapped.prenda) motivos.push('prenda vacía');
                if (!GENEROS.includes(mapped.genero)) motivos.push('género inválido');
                if (!mapped.talla && mapped.talla !== 0) motivos.push('talla vacía');
                const cantidad = Number(mapped.cantidad);
                if (!Number.isFinite(cantidad) || cantidad < 0) motivos.push('cantidad inválida');

                let sedeId = null;
                const sedeTexto = (mapped.sede ?? '').toString().trim();
                if (sedeTexto && proyectos.includes(mapped.proyecto)) {
                    const sede = (sedesPorProyecto?.[mapped.proyecto] ?? [])
                        .find(s => s.nombre.toLowerCase() === sedeTexto.toLowerCase());
                    if (sede) sedeId = sede.id;
                    else motivos.push('sede inválida para el proyecto');
                }

                if (motivos.length) {
                    invalid.push({ fila: idx + 2, motivos: motivos.join(', ') });
                } else {
                    valid.push({
                        proyecto: mapped.proyecto,
                        sede_id: sedeId,
                        prenda: mapped.prenda,
                        genero: mapped.genero,
                        talla: String(mapped.talla),
                        precio: Number(mapped.precio) || 0,
                        cantidad,
                        stock_minimo: STOCK_MINIMO_IMPORT_DEFAULT,
                    });
                }
            });

            setValidRows(valid);
            setInvalidRows(invalid);
        } catch {
            setError('No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx).');
        }
    };

    const handleImport = async () => {
        if (validRows.length === 0) return;
        setImporting(true); setError('');
        try {
            const { data } = await api.post('/inventario-dotacion/import', { items: validRows });
            onImported(data);
        } catch (e) {
            setError(e?.response?.data?.message ?? 'Error al importar.');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 640 }}>
                <div style={S.modalHeader}>
                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>Importar Excel</span>
                    <button style={S.btnIcon} onClick={onClose}><IconClose size={16} /></button>
                </div>
                <div style={S.modalBody}>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 0 }}>
                        Columnas del archivo: <strong>Proyecto, Sede, Prenda, Género, Talla, Precio, Cantidad</strong>. La columna Sede es opcional. No es necesario poner Estado ni Stock mínimo:
                        el estado se calcula solo según cantidad vs. stock mínimo, y los items nuevos quedan con stock mínimo <strong>{STOCK_MINIMO_IMPORT_DEFAULT}</strong> por defecto.
                        Si una combinación proyecto + prenda + talla + género ya existe, la cantidad se <strong>suma</strong> al stock actual; si no existe, se crea un item nuevo.
                    </p>
                    <label htmlFor="import-excel-file" style={S.fileDrop}>
                        <input id="import-excel-file" type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
                        <IconFile size={22} />
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.88rem' }}>
                            {fileName ? 'Cambiar archivo' : 'Seleccionar archivo Excel'}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {fileName || '.xlsx o .xls'}
                        </span>
                    </label>
                    {validRows.length > 0 && (
                        <div style={{ background: '#e0f7f4', color: '#0d6e5a', borderRadius: 6, padding: '8px 12px', fontSize: '0.84rem', fontWeight: 600, marginBottom: 10 }}>
                            {validRows.length} fila{validRows.length !== 1 ? 's' : ''} lista{validRows.length !== 1 ? 's' : ''} para importar.
                        </div>
                    )}
                    {invalidRows.length > 0 && (
                        <div style={{ ...S.errorMsg, marginBottom: 10 }}>
                            <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
                                {invalidRows.length} fila{invalidRows.length !== 1 ? 's' : ''} omitida{invalidRows.length !== 1 ? 's' : ''} por datos inválidos:
                            </p>
                            <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 140, overflowY: 'auto' }}>
                                {invalidRows.map((r, i) => <li key={i}>Fila {r.fila}: {r.motivos}</li>)}
                            </ul>
                        </div>
                    )}
                    {error && <div style={S.errorMsg}>{error}</div>}
                </div>
                <div style={S.modalFooter}>
                    <button style={S.btnSecondary} onClick={onClose} disabled={importing}>Cancelar</button>
                    <button style={S.btnPrimary} onClick={handleImport} disabled={importing || validRows.length === 0}>
                        {importing ? 'Importando…' : `Importar ${validRows.length} item${validRows.length !== 1 ? 's' : ''}`}
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
                    <p>¿Eliminar <strong>{item.prenda}</strong> talla <strong>{item.talla}</strong> ({item.genero}) de <strong>{item.proyecto}</strong>?</p>
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
    'SYM TIGO EXPRESS':   { bg: '#e8f8f5', color: '#0d6e5a', border: '#0d6e5a' },
    'SYM TIGO HOME':      { bg: '#f3e8ff', color: '#6b21a8', border: '#7e22ce' },
    'SYM ADMINISTRATIVO': { bg: '#fef3c7', color: '#92400e', border: '#b45309' },
    'DIRECTV':            { bg: '#e8f0ff', color: '#1a4fa8', border: '#1a4fa8' },
};

export default function ProductosDotacion() {
    const qc = useQueryClient();
    const [proyectoTab, setProyectoTab]   = useState('SYM TIGO EXPRESS');
    const [prendaFiltro, setPrendaFiltro] = useState('Todos');
    const [generoFiltro, setGeneroFiltro] = useState('Todos');
    const [tallaFiltro, setTallaFiltro]   = useState('Todos');
    const [sedeFiltro, setSedeFiltro]     = useState('Todas');
    const [search, setSearch]             = useState('');
    const [page, setPage]                 = useState(1);
    const [editItem, setEditItem]         = useState(null);
    const [deleteItem, setDeleteItem]     = useState(null);
    const [addOpen, setAddOpen]           = useState(false);
    const [bulkOpen, setBulkOpen]         = useState(false);
    const [importOpen, setImportOpen]     = useState(false);
    const [toast, setToast]               = useState(null);
    const [exporting, setExporting]       = useState(false);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    const debouncedSearch = useDebounce(search, 300);

    // La página vuelve a 1 cada vez que cambia cualquier filtro.
    useEffect(() => { setPage(1); }, [proyectoTab, sedeFiltro, prendaFiltro, generoFiltro, tallaFiltro, debouncedSearch]);

    const filtrosActivos = {
        proyecto: proyectoTab,
        sede_id: sedeFiltro,
        prenda: prendaFiltro,
        genero: generoFiltro,
        talla: tallaFiltro,
        search: debouncedSearch || undefined,
    };

    const { data: pagina, isLoading, isFetching } = useQuery({
        queryKey: ['inventario-dotacion', filtrosActivos, page],
        queryFn: () => api.get('/inventario-dotacion', { params: { ...filtrosActivos, per_page: POR_PAGINA, page } }).then(r => r.data),
        placeholderData: (prev) => prev,
    });

    const filtrados = pagina?.data ?? [];

    const { data: proyectos = [] } = useQuery({
        queryKey: ['inventario-dotacion-proyectos'],
        queryFn: () => api.get('/inventario-dotacion/proyectos').then(r => r.data),
        staleTime: 10 * 60 * 1000,
    });

    const { data: sedesPorProyecto = {} } = useQuery({
        queryKey: ['sedes-por-proyecto-dotacion', proyectos],
        queryFn: () => fetchSedesPorProyecto(proyectos),
        enabled: proyectos.length > 0,
    });

    const sedesTab = sedesPorProyecto[proyectoTab] ?? [];

    const { data: stats = { total: 0, bajoStock: 0, porProyecto: {} } } = useQuery({
        queryKey: ['inventario-dotacion-resumen'],
        queryFn: () => api.get('/inventario-dotacion/resumen').then(r => r.data),
    });

    const { data: opcionesFiltro = { prendas: [], tallas: [] } } = useQuery({
        queryKey: ['inventario-dotacion-filtros', proyectoTab, sedeFiltro, prendaFiltro, generoFiltro],
        queryFn: () => api.get('/inventario-dotacion/filtros', { params: { proyecto: proyectoTab, sede_id: sedeFiltro, prenda: prendaFiltro, genero: generoFiltro } }).then(r => r.data),
    });

    const prendasDisponibles = ['Todos', ...opcionesFiltro.prendas];
    const tallasDisponibles = ['Todos', ...ALL_TALLAS_ORDER.filter(t => opcionesFiltro.tallas.includes(t))];

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['inventario-dotacion'] });
        qc.invalidateQueries({ queryKey: ['inventario-dotacion-resumen'] });
        qc.invalidateQueries({ queryKey: ['inventario-dotacion-filtros'] });
    };

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

    const handleImported = (result) => {
        invalidate();
        setImportOpen(false);
        showToast(`Importación completa: ${result.creados} creado${result.creados !== 1 ? 's' : ''}, ${result.actualizados} sumado${result.actualizados !== 1 ? 's' : ''} al stock existente.`);
    };

    const handleDeleted = (id) => {
        invalidate();
        setDeleteItem(null);
        showToast('Item eliminado.');
    };

    const badgeStock = (cantidad, minimo) => {
        if (minimo === 0) return { bg: '#f1f5f9', color: '#475569', label: 'Sin mín.' };
        if (cantidad <= minimo * 0.5) return { bg: '#fce8e8', color: '#c0392b', label: 'Crítico' };
        if (cantidad <= minimo) return { bg: '#fff7e0', color: '#b7780c', label: 'Bajo' };
        return { bg: '#e0f7f4', color: '#0d6e5a', label: 'OK' };
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const { data: todos } = await api.get('/inventario-dotacion', { params: filtrosActivos });
            const XLSX = await import('xlsx');
            const rows = todos.map(i => ({
                Proyecto: i.proyecto,
                Sede: i.sede_nombre ?? '',
                Prenda: i.prenda,
                Género: i.genero,
                Talla: i.talla,
                Precio: Number(i.precio ?? 0),
                Cantidad: i.cantidad,
                'Stock mínimo': i.stock_minimo,
                Estado: badgeStock(i.cantidad, i.stock_minimo).label,
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = [
                { wch: 20 }, { wch: 26 }, { wch: 32 }, { wch: 12 },
                { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

            const partes = [proyectoTab];
            if (prendaFiltro !== 'Todos') partes.push(prendaFiltro);
            if (generoFiltro !== 'Todos') partes.push(generoFiltro);
            if (tallaFiltro !== 'Todos') partes.push(`Talla-${tallaFiltro}`);
            const fecha = new Date().toISOString().slice(0, 10);
            const nombre = `Inventario_Dotacion_${partes.join('_')}_${fecha}.xlsx`.replace(/\s+/g, '_');

            XLSX.writeFile(wb, nombre);
            showToast(`Excel exportado (${rows.length} item${rows.length !== 1 ? 's' : ''}).`);
        } finally {
            setExporting(false);
        }
    };

    const pc = PROYECTO_COLORS[proyectoTab] ?? PROYECTO_COLORS['SYM TIGO EXPRESS'];

    return (
        <div style={{ width: '100%' }}>
            {toast && <div style={S.toast}>{toast}</div>}

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-label">Total prendas</div>
                </div>
                {proyectos.map(p => {
                    const c = PROYECTO_COLORS[p];
                    return (
                        <div key={p} className="stat-card" style={{ cursor: 'pointer', borderLeft: `4px solid ${c.border}` }} onClick={() => { setProyectoTab(p); setPrendaFiltro('Todos'); setGeneroFiltro('Todos'); setTallaFiltro('Todos'); setSedeFiltro('Todas'); }}>
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
                {proyectos.map(p => {
                    const active = proyectoTab === p;
                    const c = PROYECTO_COLORS[p];
                    return (
                        <button key={p} onClick={() => { setProyectoTab(p); setPrendaFiltro('Todos'); setGeneroFiltro('Todos'); setTallaFiltro('Todos'); setSedeFiltro('Todas'); }} style={{
                            padding: '10px 22px', border: 'none', borderBottom: active ? `2.5px solid ${c.border}` : '2.5px solid transparent',
                            marginBottom: -2, background: 'transparent', fontWeight: active ? 800 : 600,
                            fontSize: '0.9rem', fontFamily: 'Nunito,sans-serif', color: active ? c.color : 'var(--text-muted)',
                            cursor: 'pointer', transition: 'color 0.15s',
                        }}>
                            {p}
                            <span style={{ marginLeft: 7, fontSize: '0.75rem', background: active ? c.bg : 'var(--bg)', color: active ? c.color : 'var(--text-muted)', borderRadius: 20, padding: '1px 8px', fontWeight: 700 }}>
                                {stats.porProyecto[p] ?? 0}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filtros por prenda y género */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {prendasDisponibles.map(cat => {
                        const active = prendaFiltro === cat;
                        return (
                            <button key={cat} onClick={() => { setPrendaFiltro(cat); setTallaFiltro('Todos'); }} style={{
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

            {/* Filtro por sede */}
            {sedesTab.length > 0 && (
                <div style={{ maxWidth: 320, marginBottom: 14 }}>
                    <label style={{ ...S.label, display: 'block', marginBottom: 4 }}>Sede</label>
                    <SearchableSelect
                        value={sedeFiltro}
                        onChange={setSedeFiltro}
                        defaultValue="Todas"
                        options={[{ label: 'Todas las sedes', value: 'Todas' }, ...sedesTab.map(s => ({ label: s.nombre, value: s.id }))]}
                    />
                </div>
            )}

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
                    <button style={S.btnSecondary} onClick={handleExport} disabled={exporting || (pagina?.total ?? 0) === 0}>
                        {exporting ? 'Exportando…' : 'Exportar Excel'}
                    </button>
                    <button style={S.btnSecondary} onClick={() => setImportOpen(true)}>Importar Excel</button>
                    <button style={S.btnSecondary} onClick={() => setBulkOpen(true)}>Carga masiva</button>
                    <button style={S.btnPrimary} onClick={() => setAddOpen(true)}>+ Nuevo item</button>
                </div>
            </div>

            {/* Tabla */}
            <div style={{ ...S.tableWrap, opacity: isFetching && !isLoading ? 0.6 : 1, transition: 'opacity 0.15s' }}>
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
                                <th>Prenda</th>
                                <th>Sede</th>
                                <th>Género</th>
                                <th style={{ textAlign: 'center' }}>Talla</th>
                                <th style={{ textAlign: 'right' }}>Precio</th>
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
                                        <td style={{ fontWeight: 700 }}>{item.prenda}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{item.sede_nombre ?? '—'}</td>
                                        <td>
                                            <span style={{ ...S.badge(item.genero === 'Masculino' ? '#e8f0ff' : item.genero === 'Femenino' ? '#fce8f5' : '#f1f5f9', item.genero === 'Masculino' ? '#1a4fa8' : item.genero === 'Femenino' ? '#8b267a' : '#475569') }}>
                                                {item.genero}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.talla}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{Number(item.precio ?? 0).toLocaleString('es-CO')}</td>
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

            {/* Paginación */}
            {pagina && pagina.total > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        Página {pagina.current_page} de {pagina.last_page} · Mostrando {filtrados.length} de {pagina.total}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button style={S.btnSecondary} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                            ‹ Anterior
                        </button>
                        <button style={S.btnSecondary} onClick={() => setPage(p => Math.min(pagina.last_page, p + 1))} disabled={page >= pagina.last_page}>
                            Siguiente ›
                        </button>
                    </div>
                </div>
            )}

            {/* Modales */}
            {addOpen  && <ItemModal proyectos={proyectos} sedesPorProyecto={sedesPorProyecto} onClose={() => setAddOpen(false)} onSaved={handleSaved} />}
            {editItem && <ItemModal item={editItem} proyectos={proyectos} sedesPorProyecto={sedesPorProyecto} onClose={() => setEditItem(null)} onSaved={handleSaved} />}
            {bulkOpen && <BulkModal proyectos={proyectos} sedesPorProyecto={sedesPorProyecto} onClose={() => setBulkOpen(false)} onSaved={handleBulkSaved} />}
            {importOpen && <ImportModal proyectos={proyectos} sedesPorProyecto={sedesPorProyecto} onClose={() => setImportOpen(false)} onImported={handleImported} />}
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
    fileDrop: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '22px 16px', border: '1.5px dashed var(--primary)', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg)', color: 'var(--primary)', cursor: 'pointer', marginBottom: 10, textAlign: 'center',
    },
    tdCell: { padding: '6px 8px', border: '1px solid var(--border)', verticalAlign: 'middle' },
    cellInput: { padding: '6px 8px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'Nunito,sans-serif', background: 'var(--white)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' },
    toast: { position: 'fixed', bottom: 28, right: 28, background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-sm)', padding: '13px 22px', fontWeight: 700, fontSize: '0.92rem', zIndex: 99999, boxShadow: '0 8px 28px rgba(26,155,140,0.35)' },
};
