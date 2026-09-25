import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useErpModules } from '../hooks/useErpModules';
import { canAccessSubmodule } from '../data/erpModules';
import {
  MODULE_ICONS,
  IconFolder,
  IconLoading,
  IconPlus,
  IconClose,
  IconEdit,
  IconTrash,
  IconEmptySearch,
} from '../components/Icons';

const EmpleadoresCrud = lazy(() => import('./EmpleadoresCrud'));
const EmpresasCrud = lazy(() => import('./EmpresasCrud'));
const RegionalesCrud = lazy(() => import('./RegionalesCrud'));
const CentrosCostosCrud = lazy(() => import('./CentrosCostosCrud'));
const ProyectosCrud = lazy(() => import('./ProyectosCrud'));
const ClasesPedidoCrud = lazy(() => import('./ClasesPedidoCrud'));
const ConceptosPedidoCrud = lazy(() => import('./ConceptosPedidoCrud'));
const CategoriaProductoCrud = lazy(() => import('./CategoriaProductoCrud'));
const TiposProductoCrud = lazy(() => import('./TiposProductoCrud'));
const ProveedoresCrud = lazy(() => import('./ProveedoresCrud'));

const COMPONENTES = {
  empleadores: EmpleadoresCrud,
  empresas: EmpresasCrud,
  regionales: RegionalesCrud,
  centros_costos: CentrosCostosCrud,
  proyectos: ProyectosCrud,
  clases_pedido: ClasesPedidoCrud,
  conceptos_pedido: ConceptosPedidoCrud,
  categoria_producto: CategoriaProductoCrud,
  tipo_producto: TiposProductoCrud,
  proveedores: ProveedoresCrud,
};

/* ── Modal simple para crear un Tipo de Parámetro nuevo (solo nombre), igual
   de sencillo que Categoría del Producto. ── */
function NuevoTipoModal({ open, onClose, onSaved, editTarget }) {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(editTarget?.nombre ?? '');
      setError('');
    }
  }, [open, editTarget]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError('El nombre es requerido.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editTarget) {
        await api.put(`/tipos-parametro/${editTarget.id}`, { nombre: nombre.trim() });
      } else {
        await api.post('/tipos-parametro', { nombre: nombre.trim() });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.errors?.nombre?.[0] ??
          err?.response?.data?.message ??
          'No se pudo guardar el tipo de parámetro.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeaderGreen}>
          <span style={S.modalTitleWhite}>{editTarget ? 'Editar Tipo de Parámetro' : 'Nuevo Tipo de Parámetro'}</span>
          <button style={S.closeBtnWhite} onClick={onClose}>
            <IconClose size={14} />
          </button>
        </div>
        <div style={S.modalBody}>
          <div style={S.formGroup}>
            <label style={S.label}>Nombre *</label>
            <input
              style={{ ...S.input, ...(error ? { borderColor: '#e74c3c' } : {}) }}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Turnos, Niveles de Riesgo…"
            />
            {error && <span style={S.err}>{error}</span>}
          </div>
        </div>
        <div style={S.modalFooter}>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn-primary" style={{ opacity: saving ? 0.6 : 1 }} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── CRUD genérico de los valores dentro de un Tipo de Parámetro creado por
   el usuario (solo nombre/descripción, igual de simple que ese tipo). ── */
function ValoresParametroPanel({ tipo }) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const { data: valores = [], isLoading } = useQuery({
    queryKey: ['valores-parametro', tipo.id],
    queryFn: () => api.get('/valores-parametro', { params: { tipo_parametro_id: tipo.id } }).then((r) => r.data),
  });

  const abrirCrear = () => {
    setEditTarget(null);
    setNombre('');
    setDescripcion('');
    setError('');
    setModalOpen(true);
  };

  const abrirEditar = (v) => {
    setEditTarget(v);
    setNombre(v.nombre);
    setDescripcion(v.descripcion ?? '');
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError('El nombre es requerido.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editTarget) {
        await api.put(`/valores-parametro/${editTarget.id}`, { nombre: nombre.trim(), descripcion: descripcion.trim() || null });
        showToast('Valor actualizado.');
      } else {
        await api.post('/valores-parametro', { tipo_parametro_id: tipo.id, nombre: nombre.trim(), descripcion: descripcion.trim() || null });
        showToast('Valor creado.');
      }
      qc.invalidateQueries({ queryKey: ['valores-parametro', tipo.id] });
      qc.invalidateQueries({ queryKey: ['tipos-parametro'] });
      setModalOpen(false);
    } catch (err) {
      setError(
        err?.response?.data?.errors?.nombre?.[0] ??
          err?.response?.data?.message ??
          'No se pudo guardar el valor.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v) => {
    if (!confirm(`¿Eliminar "${v.nombre}"?`)) return;
    try {
      await api.delete(`/valores-parametro/${v.id}`);
      qc.invalidateQueries({ queryKey: ['valores-parametro', tipo.id] });
      qc.invalidateQueries({ queryKey: ['tipos-parametro'] });
      showToast('Valor eliminado.');
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'No se pudo eliminar el valor.');
    }
  };

  return (
    <div>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={abrirCrear}>
          <IconPlus size={14} /> Nuevo Valor
        </button>
      </div>

      <div style={S.tableWrap}>
        {isLoading ? (
          <div style={S.empty}><IconLoading size={32} /><p>Cargando…</p></div>
        ) : valores.length === 0 ? (
          <div style={S.empty}><IconEmptySearch size={44} /><p>Este tipo todavía no tiene valores.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {valores.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 700 }}>{v.nombre}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{v.descripcion || '—'}</td>
                  <td>
                    <div style={S.actions}>
                      <button style={S.actionBtn('var(--primary-light)', 'var(--primary-dark)')} title="Editar" onClick={() => abrirEditar(v)}>
                        <IconEdit size={14} />
                      </button>
                      <button style={S.actionBtn('#fce8e8', '#a33')} title="Eliminar" onClick={() => handleDelete(v)}>
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div style={S.overlay} onClick={() => setModalOpen(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeaderGreen}>
              <span style={S.modalTitleWhite}>{editTarget ? 'Editar Valor' : 'Nuevo Valor'}</span>
              <button style={S.closeBtnWhite} onClick={() => setModalOpen(false)}>
                <IconClose size={14} />
              </button>
            </div>
            <div style={S.modalBody}>
              <div style={S.formGroup}>
                <label style={S.label}>Nombre *</label>
                <input style={S.input} value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>Descripción</label>
                <input style={S.input} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
              </div>
              {error && <span style={S.err}>{error}</span>}
            </div>
            <div style={S.modalFooter}>
              <button className="btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
              <button className="btn-primary" style={{ opacity: saving ? 0.6 : 1 }} onClick={handleSubmit} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerYCrearParametrosCrud() {
  const { user } = useAuth();
  const erpModules = useErpModules();
  const qc = useQueryClient();
  const mod = erpModules.find((m) => m.id === 'parametros');
  const submods = (mod?.submods ?? []).filter((sub) => canAccessSubmodule(user, 'parametros', sub.id));

  const [seleccionado, setSeleccionado] = useState(null);
  const [modalTipoOpen, setModalTipoOpen] = useState(false);
  const [editTipoTarget, setEditTipoTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const { data: tiposParametro = [] } = useQuery({
    queryKey: ['tipos-parametro'],
    queryFn: () => api.get('/tipos-parametro').then((r) => r.data),
  });

  const subActual = submods.find((s) => s.id === seleccionado);
  const Componente = subActual ? COMPONENTES[subActual.id] : null;
  const tipoParamActual = seleccionado?.startsWith('dinamico_')
    ? tiposParametro.find((t) => `dinamico_${t.id}` === seleccionado)
    : null;

  const filasLista = [
    ...submods.map((sub) => ({ id: sub.id, label: sub.label, icon: sub.icon, dinamico: false })),
    ...tiposParametro.map((t) => ({ id: `dinamico_${t.id}`, label: t.nombre, icon: 'config', dinamico: true })),
  ];

  const handleEliminarTipo = async (e, tipoId) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este tipo de parámetro? Solo se puede si no tiene valores.')) return;
    try {
      await api.delete(`/tipos-parametro/${tipoId}`);
      qc.invalidateQueries({ queryKey: ['tipos-parametro'] });
      showToast('Tipo de parámetro eliminado.');
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'No se pudo eliminar.');
    }
  };

  const handleEditarTipo = (e, tipoId) => {
    e.stopPropagation();
    const tipo = tiposParametro.find((t) => t.id === tipoId);
    setEditTipoTarget(tipo);
    setModalTipoOpen(true);
  };

  return (
    <div>
      {toast && <div style={S.toast}>{toast}</div>}

      {subActual && Componente ? (
        <>
          <button style={S.volver} onClick={() => setSeleccionado(null)}>
            ← Volver a Parámetros
          </button>
          <div style={{ marginBottom: 20 }}>
            <h2 style={S.tituloSeccion}>{subActual.label}</h2>
            <p style={S.descSeccion}>{subActual.desc}</p>
          </div>
          <Suspense fallback={<div style={S.crudLoader}><IconLoading size={32} /></div>}>
            <Componente />
          </Suspense>
        </>
      ) : tipoParamActual ? (
        <>
          <button style={S.volver} onClick={() => setSeleccionado(null)}>
            ← Volver a Parámetros
          </button>
          <div style={{ marginBottom: 20 }}>
            <h2 style={S.tituloSeccion}>{tipoParamActual.nombre}</h2>
            <p style={S.descSeccion}>Valores de este tipo de parámetro.</p>
          </div>
          <ValoresParametroPanel tipo={tipoParamActual} />
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => {
                setEditTipoTarget(null);
                setModalTipoOpen(true);
              }}
            >
              <IconPlus size={14} /> Nuevo Tipo de Parámetro
            </button>
          </div>
          <div style={S.lista}>
            {filasLista.map((fila, i) => (
              <div
                key={fila.id}
                style={{ ...S.filaLista, ...(i === filasLista.length - 1 ? { borderBottom: 'none' } : {}) }}
                onClick={() => setSeleccionado(fila.id)}
              >
                <span style={S.filaIcono}>
                  {React.createElement(MODULE_ICONS[fila.icon] ?? IconFolder, { size: 18 })}
                </span>
                <span style={S.filaLabel}>{fila.label}</span>
                {fila.dinamico && (
                  <div style={{ display: 'flex', gap: 6, marginRight: 4 }}>
                    <button
                      style={S.actionBtn('var(--primary-light)', 'var(--primary-dark)')}
                      title="Editar tipo"
                      onClick={(e) => handleEditarTipo(e, Number(fila.id.replace('dinamico_', '')))}
                    >
                      <IconEdit size={13} />
                    </button>
                    <button
                      style={S.actionBtn('#fce8e8', '#a33')}
                      title="Eliminar tipo"
                      onClick={(e) => handleEliminarTipo(e, fila.id.replace('dinamico_', ''))}
                    >
                      <IconTrash size={13} />
                    </button>
                  </div>
                )}
                <span style={S.filaFlecha}>›</span>
              </div>
            ))}
          </div>
        </>
      )}

      <NuevoTipoModal
        open={modalTipoOpen}
        editTarget={editTipoTarget}
        onClose={() => setModalTipoOpen(false)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['tipos-parametro'] });
          showToast(editTipoTarget ? 'Tipo de parámetro actualizado.' : 'Tipo de parámetro creado.');
        }}
      />
    </div>
  );
}

const S = {
  toast: {
    position: 'fixed',
    bottom: 28,
    right: 28,
    background: 'var(--primary)',
    color: '#fff',
    borderRadius: 10,
    padding: '12px 22px',
    fontWeight: 700,
    zIndex: 9999,
    boxShadow: '0 4px 18px rgba(0,0,0,0.18)',
    fontFamily: 'Nunito,sans-serif',
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--white)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  },
  filaLista: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 20px',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    fontFamily: 'Nunito, sans-serif',
    transition: 'background 0.15s',
  },
  filaIcono: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--primary)',
    flexShrink: 0,
  },
  filaLabel: {
    flex: 1,
    fontSize: '0.92rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  filaFlecha: {
    color: 'var(--text-muted)',
    fontSize: '1.1rem',
  },
  volver: {
    background: 'var(--bg)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text)',
    fontFamily: 'Nunito, sans-serif',
    cursor: 'pointer',
    marginBottom: 20,
  },
  tituloSeccion: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: '1.2rem',
    fontWeight: 700,
    color: 'var(--primary)',
    marginBottom: 4,
  },
  descSeccion: {
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
  },
  crudLoader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: 'var(--primary)',
  },
  tableWrap: { background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflowX: 'auto' },
  actions: { display: 'flex', gap: 6, justifyContent: 'center' },
  actionBtn: (bg, color) => ({ background: bg, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color, display: 'inline-flex', alignItems: 'center' }),
  empty: { padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(26,58,53,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 5000, padding: '32px 16px', overflowY: 'auto' },
  modal: { background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: '0 16px 60px rgba(26,155,140,0.22)', width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column' },
  modalHeaderGreen: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', background: 'var(--primary)', borderTopLeftRadius: 'var(--radius)', borderTopRightRadius: 'var(--radius)', flexShrink: 0 },
  modalTitleWhite: { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#fff' },
  closeBtnWhite: { background: 'none', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' },
  modalBody: { padding: '22px 28px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 28px', borderTop: '1.5px solid var(--border)', flexShrink: 0 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 },
  label: { fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' },
  input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', fontFamily: 'Nunito,sans-serif', color: 'var(--text)', background: 'var(--white)', outline: 'none' },
  err: { color: '#e74c3c', fontSize: '0.75rem', marginTop: 2 },
};
