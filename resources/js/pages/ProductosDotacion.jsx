import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import {
  IconSearch,
  IconEdit,
  IconEye,
} from '../components/Icons';

const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const TALLAS_JEAN = ['26', '28', '30', '32', '34', '36', '38', '40'];
const TALLAS_TENIS = ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
const ALL_TALLAS_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '26', '28', '30', '32', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

const CATEGORIAS = ['Polo', 'Jean', 'Chaqueta', 'Tenis'];
const GENEROS = ['Todos', 'Masculino', 'Femenino'];

export default function ProductosDotacion() {
  const [search, setSearch] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Polo');
  const [generoFiltro, setGeneroFiltro] = useState('Todos');

  const { data: inventario = [] } = useQuery({
    queryKey: ['inventario_dotacion'],
    queryFn: () => api.get('/inventario-dotacion').then((r) => r.data),
  });

  const filtrados = useMemo(() => {
    let items = [...inventario];
    if (categoriaFiltro !== 'Todas') items = items.filter(i => i.categoria === categoriaFiltro);
    if (generoFiltro !== 'Todos') items = items.filter(i => i.genero === generoFiltro);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.categoria.toLowerCase().includes(q) ||
        i.subcategoria.toLowerCase().includes(q) ||
        i.genero.toLowerCase().includes(q)
      );
    }
    return items;
  }, [inventario, search, categoriaFiltro, generoFiltro]);

  const totalItems = inventario.reduce((s, i) => s + i.stock_total, 0);
  const totalPolos = inventario.filter(i => i.categoria === 'Polo').reduce((s, i) => s + i.stock_total, 0);
  const totalJeans = inventario.filter(i => i.categoria === 'Jean').reduce((s, i) => s + i.stock_total, 0);
  const totalChaquetas = inventario.filter(i => i.categoria === 'Chaqueta').reduce((s, i) => s + i.stock_total, 0);
  const totalTenis = inventario.filter(i => i.categoria === 'Tenis').reduce((s, i) => s + i.stock_total, 0);
  const bajoStock = inventario.filter(i => i.stock_total <= i.stock_minimo).length;

  const badgeStock = (stock, minimo) => {
    if (stock <= minimo * 0.5) return { background: '#fce8e8', color: '#c0392b' };
    if (stock <= minimo) return { background: '#fff7e0', color: '#b7780c' };
    return { background: '#e0f7f4', color: '#0d6e5a' };
  };

  const tallasHeader = useMemo(() => {
    const set = new Set();
    filtrados.forEach(item => {
      Object.keys(item.tallas).forEach(t => set.add(t));
    });
    if (set.size === 0) return TALLAS;
    return ALL_TALLAS_ORDER.filter(t => set.has(t));
  }, [filtrados]);

  return (
    <div style={{ width: '100%' }}>
      {/* ── Indicadores ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{totalItems}</div>
          <div className="stat-label">Total prendas en inventario</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{inventario.length}</div>
          <div className="stat-label">Variedades registradas</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: '#e74c3c' }}>{bajoStock}</div>
          <div className="stat-label">Productos con stock bajo</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--primary)' }}>4</div>
          <div className="stat-label">Categorías de prendas</div>
        </div>
      </div>

      {/* ── Mini cards de categorías ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        {[
          { label: 'Polos', total: totalPolos, color: '#1a9b8c' },
          { label: 'Jeans', total: totalJeans, color: '#2980b9' },
          { label: 'Chaquetas', total: totalChaquetas, color: '#8e44ad' },
          { label: 'Tenis', total: totalTenis, color: '#e67e22' },
        ].map((cat) => (
          <div
            key={cat.label}
            style={{
              ...S.catCard,
              borderLeft: `4px solid ${cat.color}`,
            }}
            onClick={() => setCategoriaFiltro(cat.label === 'Polos' ? 'Polo' : cat.label === 'Jeans' ? 'Jean' : cat.label === 'Chaquetas' ? 'Chaqueta' : 'Tenis')}
          >
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: cat.color }}>
              {cat.total}
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {cat.label}
            </span>
          </div>
        ))}

      </div>

      {/* ── Toolbar ── */}
      <div style={S.toolbar}>
        <div style={S.filters}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              style={S.searchInput}
              placeholder="Buscar producto, categoría, género…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            style={S.selectFilter}
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            style={S.selectFilter}
            value={generoFiltro}
            onChange={(e) => setGeneroFiltro(e.target.value)}
          >
            {GENEROS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Tabla de inventario ── */}
      <div style={S.tableWrap}>
        {filtrados.length === 0 ? (
          <div style={S.empty}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.35">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>No se encontraron productos con los filtros aplicados.</p>
          </div>
        ) : (
          <table className="data-table" style={{ fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Subcategoría</th>
                <th>Género</th>
                <th style={{ textAlign: 'center' }}>Stock total</th>
                {tallasHeader.map(t => (
                  <th key={t} style={{ textAlign: 'center', fontSize: '0.75rem', padding: '8px 4px' }}>{t}</th>
                ))}
                <th style={{ textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700 }}>{item.categoria}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{item.subcategoria}</td>
                  <td>
                    <span style={{
                      ...S.badge(
                        item.genero === 'Masculino' ? '#e8f0ff' : '#fce8f5',
                        item.genero === 'Masculino' ? '#1a4fa8' : '#8b267a',
                      ),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}>
                      {item.genero === 'Masculino' ? '♂' : '♀'} {item.genero}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.95rem' }}>
                    {item.stock_total}
                  </td>
                  {tallasHeader.map(t => {
                    const cant = item.tallas[t];
                    const has = cant !== undefined && cant > 0;
                    return (
                      <td key={t} style={{ textAlign: 'center', fontSize: '0.78rem', padding: '8px 4px' }}>
                        <span style={{
                          display: 'inline-block',
                          minWidth: 24,
                          padding: '2px 4px',
                          borderRadius: 4,
                          fontWeight: has ? 700 : 400,
                          color: has ? 'var(--text)' : 'var(--text-muted)',
                          background: !has ? 'var(--bg)' : 'transparent',
                        }}>
                          {cant !== undefined && cant > 0 ? cant : (cant === 0 ? 0 : '—')}
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      ...badgeStock(item.stock_total, item.stock_minimo),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: item.stock_total <= item.stock_minimo * 0.5 ? '#c0392b' : item.stock_total <= item.stock_minimo ? '#b7780c' : '#27ae60',
                        display: 'inline-block',
                      }} />
                      {item.stock_total <= item.stock_minimo * 0.5 ? 'Crítico' : item.stock_total <= item.stock_minimo ? 'Bajo' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const S = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    flex: 1,
  },
  searchWrap: { position: 'relative', flex: 1, minWidth: 220, maxWidth: 420 },
  searchIcon: {
    position: 'absolute',
    left: 11,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '9px 12px 9px 34px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
    fontFamily: 'Nunito,sans-serif',
    background: 'var(--white)',
    color: 'var(--text)',
    outline: 'none',
  },
  selectFilter: {
    padding: '9px 12px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    fontFamily: 'Nunito,sans-serif',
    background: 'var(--white)',
    color: 'var(--text)',
    outline: 'none',
    cursor: 'pointer',
    minWidth: 140,
  },
  tableWrap: {
    background: 'var(--white)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    overflowX: 'auto',
  },
  badge: (bg, color) => ({
    background: bg,
    color,
    borderRadius: 20,
    padding: '3px 10px',
    fontSize: '0.78rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  }),
  empty: {
    padding: '60px 20px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  catCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '10px 18px',
    background: 'var(--white)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    boxShadow: 'var(--shadow)',
    minWidth: 100,
    cursor: 'pointer',
    transition: 'transform 0.12s, box-shadow 0.12s',
  },
  limpiarBtn: {
    padding: '8px 16px',
    background: 'var(--bg)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.78rem',
    fontWeight: 700,
    fontFamily: 'Nunito,sans-serif',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
};
