import React, { useState } from 'react';

const ICONOS = {
  polo: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-1.7 11.5a2 2 0 01-2 1.5H9.7a2 2 0 01-2-1.5L6 7m14 0H4"/></svg>,
  jean: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L4 22l8-2 8 2L18 2z"/><path d="M10 10h4"/><path d="M10 14h4"/></svg>,
  chaqueta: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-2-5H6L4 7v3l4 2v10h8V12l4-2V7z"/></svg>,
  tenis: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-4 10-6 12 2 12 2-4 4-10 6S2 12 2 12z"/><path d="M2 12v4"/><path d="M22 12v4"/></svg>,
};

const CATEGORIAS = [
  { key: 'polo', label: 'Polo', color: '#1a9b8c' },
  { key: 'jean', label: 'Jean', color: '#2980b9' },
  { key: 'chaqueta', label: 'Chaqueta', color: '#8e44ad' },
  { key: 'tenis', label: 'Tenis', color: '#e67e22' },
];

function readPedidos() {
  try {
    return JSON.parse(localStorage.getItem('pedidos_globales') || '[]');
  } catch {
    return [];
  }
}

function writePedidos(p) {
  localStorage.setItem('pedidos_globales', JSON.stringify(p));
}

export default function PedidosGlobalDotacion() {
  const [pedidos, setPedidos] = useState(readPedidos);
  const [expandido, setExpandido] = useState(null);

  const marcarRealizado = (id) => {
    const updated = pedidos.map((p) => {
      if (p.id !== id) return p;
      const newEstado = p.estado === 'Realizado' ? 'Pendiente' : 'Realizado';
      const result = { ...p, estado: newEstado };
      if (newEstado === 'Realizado') {
        const lastCounter = parseInt(localStorage.getItem('pedidos_globales_counter') || '0', 10);
        const newCounter = lastCounter + 1;
        const nuevoPedido = {
          id: Date.now() + 1,
          consecutivo: String(newCounter).padStart(5, '0'),
          fecha_creacion: new Date().toISOString().split('T')[0],
          estado: 'Pendiente',
          total_empleados: 0,
          items: [],
        };
        localStorage.setItem('pedidos_globales_counter', String(newCounter));
        const all = readPedidos();
        all.unshift(nuevoPedido);
        writePedidos(all);
        setPedidos(all);
        return result;
      }
      return result;
    });
    writePedidos(updated);
    setPedidos(updated);
  };

  const totalPedidos = pedidos.length;
  const pendientes = pedidos.filter((p) => p.estado === 'Pendiente').length;
  const realizados = pedidos.filter((p) => p.estado === 'Realizado').length;
  const totalEmpleados = pedidos.reduce((s, p) => s + (p.total_empleados || 0), 0);

  const badgeEstado = (estado) => {
    if (estado === 'Realizado') return { background: '#e0f7f4', color: '#0d6e5a' };
    return { background: '#fff7e0', color: '#b7780c' };
  };

  const badgeArt = (v) => {
    if (!v) return { background: '#f0f0f0', color: '#bbb' };
    return { background: '#e8f8f5', color: 'var(--primary-dark)' };
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ── Indicadores ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{totalPedidos}</div>
          <div className="stat-label">Total pedidos globales</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: '#b7780c' }}>{pendientes}</div>
          <div className="stat-label">Pendientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: '#27ae60' }}>{realizados}</div>
          <div className="stat-label">Realizados</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--primary)' }}>{totalEmpleados}</div>
          <div className="stat-label">Empleados involucrados</div>
        </div>
      </div>

      {/* ── Lista de pedidos ── */}
      {pedidos.length === 0 ? (
        <div style={S.empty}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.35">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <p>No hay pedidos globales aún. Cree uno desde "Pedidos Automáticos".</p>
        </div>
      ) : (
        pedidos.map((pedido) => {
          const abierto = expandido === pedido.id;
          return (
            <div key={pedido.id} style={S.card}>
              {/* Cabecera del pedido */}
              <div style={S.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                  <span style={{
                    background: 'var(--primary)',
                    color: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 14px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                  }}>
                    {pedido.consecutivo}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                      Pedido Global #{pedido.consecutivo}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {pedido.fecha_creacion} · {pedido.total_empleados || 0} empleado(s)
                    </div>
                  </div>
                </div>
                <span style={{
                  ...badgeEstado(pedido.estado),
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 14px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: pedido.estado === 'Realizado' ? '#27ae60' : '#e5a020',
                    display: 'inline-block',
                  }} />
                  {pedido.estado === 'Realizado' ? 'Realizado' : 'Pendiente'}
                </span>
                <button
                  style={S.expandBtn}
                  onClick={() => setExpandido(abierto ? null : pedido.id)}
                  title={abierto ? 'Contraer' : 'Expandir'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <button
                  style={{
                    ...S.actionBtn,
                    background: pedido.estado === 'Realizado' ? '#fff7e0' : '#e0f7f4',
                    color: pedido.estado === 'Realizado' ? '#b7780c' : '#0d6e5a',
                  }}
                  onClick={() => marcarRealizado(pedido.id)}
                  disabled={pedido.estado === 'Realizado'}
                >
                  {pedido.estado === 'Realizado' ? 'Reactivar' : 'Marcar Realizado'}
                </button>
              </div>

              {/* Detalle expandible */}
              {abierto && (
                <div style={S.cardBody}>
                  {pedido.items.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                      Este pedido no tiene empleados asignados aún.
                    </p>
                  ) : (
                    <table className="data-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 90 }}># Etiqueta</th>
                          <th>Empleado</th>
                          <th>Cédula</th>
                          <th>Cargo</th>
                          {CATEGORIAS.map((c) => (
                            <th key={c.key} style={{ textAlign: 'center', fontSize: '0.72rem' }}>{c.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pedido.items.map((emp) => {
                          const tieneArticulo = (genero, prenda) => {
                            const mTalla = emp[`${prenda}_masculino_talla`];
                            const mCant = emp[`${prenda}_masculino_cantidad`];
                            const fTalla = emp[`${prenda}_femenino_talla`];
                            const fCant = emp[`${prenda}_femenino_cantidad`];
                            if (genero === 'Masculino') return mTalla && mCant ? `${mTalla} x${mCant}` : '—';
                            if (genero === 'Femenino') return fTalla && fCant ? `${fTalla} x${fCant}` : '—';
                            return mTalla && mCant ? `${mTalla} x${mCant}` : fTalla && fCant ? `${fTalla} x${fCant}` : '—';
                          };
                          return (
                            <tr key={emp.cedula || emp.idx}>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {emp.etiqueta?.split(' - ')[0]}
                              </td>
                              <td style={{ fontWeight: 700 }}>{emp.nombres} {emp.apellidos}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{emp.cedula}</td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{emp.cargo || '—'}</td>
                              {CATEGORIAS.map((c) => {
                                const val = tieneArticulo(emp.genero, c.key);
                                return (
                                  <td key={c.key} style={{ textAlign: 'center' }}>
                                    <span style={{
                                      ...badgeArt(val !== '—'),
                                      padding: '2px 8px',
                                      borderRadius: 12,
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      whiteSpace: 'nowrap',
                                    }}>
                                      {val}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

const S = {
  empty: {
    padding: '60px 20px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    background: 'var(--white)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
  },
  card: {
    background: 'var(--white)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 20px',
    flexWrap: 'wrap',
  },
  cardBody: {
    borderTop: '1.5px solid var(--border)',
    padding: 16,
    overflowX: 'auto',
  },
  expandBtn: {
    background: 'var(--bg)',
    border: '1.5px solid var(--border)',
    borderRadius: 6,
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  actionBtn: {
    padding: '7px 16px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.78rem',
    fontWeight: 700,
    fontFamily: 'Nunito,sans-serif',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};
