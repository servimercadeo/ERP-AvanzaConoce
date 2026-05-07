import React, { useState, useMemo } from 'react';

/* ─── Datos semilla ─────────────────────────────────────────────────── */
const INIT_EMPLEADOS = [
  { id: 1, nombre: 'Ana María Torres', cedula: '1010234567', cargo: 'Coordinadora Administrativa', sede: 'Bogotá', contrato: 'Indefinido', estado: 'Activo', salario: 3800000, ingreso: '2021-03-15' },
  { id: 2, nombre: 'Carlos Rueda', cedula: '1020345678', cargo: 'Auxiliar de Almacén', sede: 'Medellín', contrato: 'Fijo', estado: 'Activo', salario: 1800000, ingreso: '2022-07-01' },
  { id: 3, nombre: 'Laura Sánchez', cedula: '1030456789', cargo: 'Contadora', sede: 'Cali', contrato: 'Indefinido', estado: 'Activo', salario: 4200000, ingreso: '2020-01-10' },
  { id: 4, nombre: 'Miguel Ángel Pérez', cedula: '1040567890', cargo: 'Conductor', sede: 'Bucaramanga', contrato: 'Prestación', estado: 'Inactivo', salario: 1600000, ingreso: '2019-09-20' },
  { id: 5, nombre: 'Sofía Martínez', cedula: '1050678901', cargo: 'Asistente RRHH', sede: 'Bogotá', contrato: 'Fijo', estado: 'Activo', salario: 2100000, ingreso: '2023-02-14' },
  { id: 6, nombre: 'Diego Hernández', cedula: '1060789012', cargo: 'Técnico de Mantenimiento', sede: 'Medellín', contrato: 'Prestación', estado: 'Activo', salario: 2400000, ingreso: '2022-11-03' },
];

const CARGOS = ['Coordinadora Administrativa', 'Auxiliar de Almacén', 'Contadora', 'Conductor', 'Asistente RRHH', 'Técnico de Mantenimiento', 'Gerente', 'Secretaria', 'Asesor Comercial', 'Otro'];
const SEDES = ['Bogotá', 'Medellín', 'Cali', 'Bucaramanga', 'Barranquilla', 'Otra'];
const CONTRATOS = ['Indefinido', 'Fijo', 'Prestación', 'Aprendizaje'];
const ESTADOS = ['Activo', 'Inactivo'];

const EMPTY_FORM = { nombre: '', cedula: '', cargo: '', sede: '', contrato: 'Indefinido', estado: 'Activo', salario: '', ingreso: '' };

function fmt(num) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num); }

/* ─── Modal ─────────────────────────────────────────────────────────── */
function Modal({ open, onClose, onSave, initial, title }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  React.useEffect(() => { setForm(initial); setErrors({}); }, [initial, open]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.cedula.trim()) e.cedula = 'Requerido';
    if (!form.cargo.trim()) e.cargo = 'Requerido';
    if (!form.sede.trim()) e.sede = 'Requerido';
    if (!form.salario || isNaN(form.salario)) e.salario = 'Salario inválido';
    if (!form.ingreso) e.ingreso = 'Requerido';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
  };

  if (!open) return null;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>{title}</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={S.modalBody}>
          <div style={S.formGrid}>
            {/* Nombre */}
            <div style={S.formGroup}>
              <label style={S.label}>Nombre completo *</label>
              <input style={{ ...S.input, ...(errors.nombre ? S.inputErr : {}) }} value={form.nombre} onChange={set('nombre')} placeholder="Ej. Ana Torres" />
              {errors.nombre && <span style={S.err}>{errors.nombre}</span>}
            </div>
            {/* Cédula */}
            <div style={S.formGroup}>
              <label style={S.label}>Cédula *</label>
              <input style={{ ...S.input, ...(errors.cedula ? S.inputErr : {}) }} value={form.cedula} onChange={set('cedula')} placeholder="Ej. 1012345678" />
              {errors.cedula && <span style={S.err}>{errors.cedula}</span>}
            </div>
            {/* Cargo */}
            <div style={S.formGroup}>
              <label style={S.label}>Cargo *</label>
              <select style={{ ...S.input, ...(errors.cargo ? S.inputErr : {}) }} value={form.cargo} onChange={set('cargo')}>
                <option value="">— Seleccionar —</option>
                {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.cargo && <span style={S.err}>{errors.cargo}</span>}
            </div>
            {/* Sede */}
            <div style={S.formGroup}>
              <label style={S.label}>Sede *</label>
              <select style={{ ...S.input, ...(errors.sede ? S.inputErr : {}) }} value={form.sede} onChange={set('sede')}>
                <option value="">— Seleccionar —</option>
                {SEDES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.sede && <span style={S.err}>{errors.sede}</span>}
            </div>
            {/* Tipo contrato */}
            <div style={S.formGroup}>
              <label style={S.label}>Tipo de contrato</label>
              <select style={S.input} value={form.contrato} onChange={set('contrato')}>
                {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Estado */}
            <div style={S.formGroup}>
              <label style={S.label}>Estado</label>
              <select style={S.input} value={form.estado} onChange={set('estado')}>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            {/* Salario */}
            <div style={S.formGroup}>
              <label style={S.label}>Salario (COP) *</label>
              <input style={{ ...S.input, ...(errors.salario ? S.inputErr : {}) }} type="number" value={form.salario} onChange={set('salario')} placeholder="Ej. 2500000" />
              {errors.salario && <span style={S.err}>{errors.salario}</span>}
            </div>
            {/* Fecha ingreso */}
            <div style={S.formGroup}>
              <label style={S.label}>Fecha de ingreso *</label>
              <input style={{ ...S.input, ...(errors.ingreso ? S.inputErr : {}) }} type="date" value={form.ingreso} onChange={set('ingreso')} />
              {errors.ingreso && <span style={S.err}>{errors.ingreso}</span>}
            </div>
          </div>
        </div>

        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
          <button style={S.btnPrimary} onClick={handleSave}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Confirmar eliminación ──────────────────────────────────────────── */
function ConfirmDialog({ open, nombre, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={{ ...S.modal, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>Eliminar empleado</span>
          <button style={S.closeBtn} onClick={onCancel}>✕</button>
        </div>
        <div style={{ padding: '28px 28px 0' }}>
          <p style={{ color: 'var(--text)', lineHeight: 1.7 }}>
            ¿Estás seguro de que deseas eliminar a <strong>{nombre}</strong>?<br />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Esta acción no se puede deshacer.</span>
          </p>
        </div>
        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onCancel}>Cancelar</button>
          <button style={{ ...S.btnPrimary, background: '#e74c3c' }} onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Componente principal ───────────────────────────────────────────── */
export default function EmpleadosCrud() {
  const [empleados, setEmpleados] = useState(INIT_EMPLEADOS);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroSede, setFiltroSede] = useState('Todas');
  const [filtroCargo, setFiltroCargo] = useState('Todos');
  const [filtroContrato, setFiltroContrato] = useState('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  React.useEffect(() => {
    if (modalOpen || isFilterMenuOpen || deleteTarget) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [modalOpen, isFilterMenuOpen, deleteTarget]);

  /* Filtrado */
  const filtered = useMemo(() => empleados.filter(e => {
    const q = search.toLowerCase();
    const matchQ = e.nombre.toLowerCase().includes(q) || e.cedula.includes(q) || e.cargo.toLowerCase().includes(q);
    const matchE = filtroEstado === 'Todos' || e.estado === filtroEstado;
    const matchS = filtroSede === 'Todas' || e.sede === filtroSede;
    const matchC = filtroCargo === 'Todos' || e.cargo === filtroCargo;
    const matchV = filtroContrato === 'Todos' || e.contrato === filtroContrato;
    return matchQ && matchE && matchS && matchC && matchV;
  }), [empleados, search, filtroEstado, filtroSede, filtroCargo, filtroContrato]);

  /* Stats */
  const total = empleados.length;
  const activos = empleados.filter(e => e.estado === 'Activo').length;
  const masaSalarial = empleados.reduce((a, e) => a + Number(e.salario), 0);
  const sedes = [...new Set(empleados.map(e => e.sede))].length;

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const clearFilters = () => {
    setSearch('');
    setFiltroEstado('Todos');
    setFiltroSede('Todas');
    setFiltroCargo('Todos');
    setFiltroContrato('Todos');
  };

  /* CRUD handlers */
  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit = emp => { setEditTarget(emp); setModalOpen(true); };

  const handleSave = form => {
    if (editTarget) {
      setEmpleados(prev => prev.map(e => e.id === editTarget.id ? { ...form, id: editTarget.id, salario: Number(form.salario) } : e));
      showToast('Empleado actualizado correctamente.');
    } else {
      const newEmp = { ...form, id: Date.now(), salario: Number(form.salario) };
      setEmpleados(prev => [...prev, newEmp]);
      showToast('Empleado registrado correctamente.');
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    setEmpleados(prev => prev.filter(e => e.id !== deleteTarget.id));
    showToast(`${deleteTarget.nombre} eliminado.`);
    setDeleteTarget(null);
  };

  return (
    <div style={{ width: '100%' }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={S.toast}>{toast}</div>
      )}

      {/* ── Stats ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{total}</div>
          <div className="stat-label">Total empleados</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: '#27ae60' }}>{activos}</div>
          <div className="stat-label">Activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--accent)' }}>{sedes}</div>
          <div className="stat-label">Sedes con personal</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ fontSize: '1.15rem' }}>{fmt(masaSalarial)}</div>
          <div className="stat-label">Masa salarial</div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={S.toolbar}>
        <div style={S.filters}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>🔍</span>
            <input
              style={S.searchInput}
              placeholder="Buscar por nombre, cédula o cargo…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Botón de Filtros */}
          <button
            style={S.filterBtn}
            onClick={() => setIsFilterMenuOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filtros
          </button>
        </div>

        <button className="btn-primary" onClick={openCreate}>
          + Nuevo empleado
        </button>
      </div>

      {/* ── Tabla ── */}
      <div style={S.tableWrap}>
        {filtered.length === 0 ? (
          <div style={S.empty}>
            <span style={{ fontSize: '2.5rem' }}>🔎</span>
            <p>No se encontraron empleados con los filtros aplicados.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Cédula</th>
                <th>Cargo</th>
                <th>Sede</th>
                <th>Contrato</th>
                <th>Salario</th>
                <th>Ingreso</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <div style={S.avatarCell}>
                      <div style={S.avatar}>{emp.nombre.charAt(0)}</div>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{emp.nombre}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{emp.cedula}</td>
                  <td>{emp.cargo}</td>
                  <td>
                    <span style={S.badge('#e8f8f5', 'var(--primary-dark)')}>{emp.sede}</span>
                  </td>
                  <td>
                    <span style={S.badge(
                      emp.contrato === 'Indefinido' ? '#e8f8f5' : emp.contrato === 'Fijo' ? '#fff7e0' : '#fef2f2',
                      emp.contrato === 'Indefinido' ? 'var(--primary-dark)' : emp.contrato === 'Fijo' ? '#b7780c' : '#a33'
                    )}>{emp.contrato}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{fmt(emp.salario)}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{emp.ingreso}</td>
                  <td>
                    <span style={{
                      ...S.badge(emp.estado === 'Activo' ? '#e0f7f4' : '#fce8e8', emp.estado === 'Activo' ? '#0d6e5a' : '#a33'),
                      display: 'inline-flex', alignItems: 'center', gap: 5
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: emp.estado === 'Activo' ? '#27ae60' : '#e74c3c', display: 'inline-block' }} />
                      {emp.estado}
                    </span>
                  </td>
                  <td>
                    <div style={S.actions}>
                      <button style={S.actionBtn('#e8f8f5', 'var(--primary-dark)')} title="Editar" onClick={() => openEdit(emp)}>✏️</button>
                      <button style={S.actionBtn('#fce8e8', '#a33')} title="Eliminar" onClick={() => setDeleteTarget(emp)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Conteo */}
      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 12, textAlign: 'right' }}>
        Mostrando {filtered.length} de {total} empleados
      </p>

      {/* ── Modales ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editTarget ? { ...editTarget, salario: String(editTarget.salario) } : EMPTY_FORM}
        title={editTarget ? 'Editar empleado' : 'Registrar nuevo empleado'}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        nombre={deleteTarget?.nombre}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Modal de Filtros ── */}
      {isFilterMenuOpen && (
        <div style={S.overlay} onClick={() => setIsFilterMenuOpen(false)}>
          <div style={{ ...S.modal, maxWidth: 900 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeaderGreen}>
              <span style={S.modalTitleWhite}>Filtros de Búsqueda</span>
              <button style={S.closeBtnWhite} onClick={() => setIsFilterMenuOpen(false)}>✕</button>
            </div>
            
            <div style={S.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 24px' }}>
                {/* Row 1 */}
                <div style={S.formGroup}>
                  <label style={S.label}>Filtrar por Nombre</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Sede</label>
                  <select style={S.input} value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
                    <option value="Todas">Elige</option>
                    {SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Empresa</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>

                {/* Row 2 */}
                <div style={S.formGroup}>
                  <label style={S.label}>Cédula</label>
                  <input style={S.input} type="text" disabled placeholder="Cédula" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Tipo</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Tipo Vendedor</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>

                {/* Row 3 */}
                <div style={S.formGroup}>
                  <label style={S.label}>Tipo Técnico</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Supervisor</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Subagente</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>

                {/* Row 4 */}
                <div style={S.formGroup}>
                  <label style={S.label}>Tipo Vinculación</label>
                  <select style={S.input} value={filtroContrato} onChange={e => setFiltroContrato(e.target.value)}>
                    <option value="Todos">Elige</option>
                    {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Fecha Ingreso ini</label>
                  <input style={S.input} type="date" disabled />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Fecha ingreso fin</label>
                  <input style={S.input} type="date" disabled />
                </div>

                {/* Row 5 */}
                <div style={S.formGroup}>
                  <label style={S.label}>RH</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>EPS Afiliado</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>ARL</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>

                {/* Row 6 */}
                <div style={S.formGroup}>
                  <label style={S.label}>Fondo de Pensiones</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Caja Compensación</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Cargo</label>
                  <select style={S.input} value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)}>
                    <option value="Todos">Elige</option>
                    {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Row 7 */}
                <div style={S.formGroup}>
                  <label style={S.label}>Estado</label>
                  <select style={S.input} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                    <option value="Todos">Elige</option>
                    <option value="Activo">Activos</option>
                    <option value="Inactivo">Inactivos</option>
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Fecha vencimiento documentos ini</label>
                  <input style={S.input} type="date" disabled />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Fecha vencimiento documentos fin</label>
                  <input style={S.input} type="date" disabled />
                </div>

                {/* Row 8 */}
                <div style={S.formGroup}>
                  <label style={S.label}>Con usuario de acceso</label>
                  <select style={S.input} disabled><option>Elige</option></select>
                </div>
              </div>
            </div>

            <div style={{ ...S.modalFooter, justifyContent: 'space-between' }}>
              <button style={S.btnSecondary} onClick={clearFilters}>Limpiar filtros</button>
              <div style={{ display: 'flex', gap: 12 }}>
                <button style={S.btnSecondary} onClick={() => setIsFilterMenuOpen(false)}>Cancelar</button>
                <button style={S.btnPrimaryGreen} onClick={() => setIsFilterMenuOpen(false)}>Buscar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Estilos inline (complementan el CSS global) ───────────────────── */
const S = {
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' },
  filters: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 },
  searchWrap: { position: 'relative', flex: 1, minWidth: 200, maxWidth: 380 },
  searchIcon: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', pointerEvents: 'none' },
  searchInput: {
    width: '100%', padding: '9px 12px 9px 34px',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem', fontFamily: 'Nunito,sans-serif', background: 'var(--white)',
    color: 'var(--text)', outline: 'none',
  },
  filterBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '9px 16px', background: 'var(--white)',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text)', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'Nunito,sans-serif',
    cursor: 'pointer', outline: 'none', transition: 'all 0.15s',
  },
  modalHeaderGreen: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '22px 28px', background: 'var(--primary)', borderTopLeftRadius: 'var(--radius)', borderTopRightRadius: 'var(--radius)'
  },
  modalTitleWhite: { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: '1.2rem', color: '#fff' },
  closeBtnWhite: { background: 'none', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', cursor: 'pointer', color: '#fff', transition: 'background 0.2s' },
  btnPrimaryGreen: {
    padding: '10px 24px', background: 'var(--primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem',
    fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif',
    transition: 'background 0.18s',
  },
  tableWrap: {
    background: 'var(--white)', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflowX: 'auto',
  },
  avatarCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: '0.95rem', flexShrink: 0,
  },
  badge: (bg, color) => ({
    background: bg, color, borderRadius: 20, padding: '3px 10px',
    fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap',
  }),
  actions: { display: 'flex', gap: 6, justifyContent: 'center' },
  actionBtn: (bg, color) => ({
    background: bg, border: 'none', borderRadius: 6, padding: '5px 8px',
    cursor: 'pointer', fontSize: '0.85rem', color, transition: 'opacity 0.15s',
  }),
  empty: { padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  /* Modal */
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(26,58,53,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: 20,
  },
  modal: {
    background: 'var(--white)', borderRadius: 'var(--radius)',
    boxShadow: '0 16px 60px rgba(26,155,140,0.22)', width: '100%',
    maxWidth: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column',
    animation: 'fadeInUp 0.22s ease',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '22px 28px', borderBottom: '1.5px solid var(--border)',
  },
  modalTitle: { fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 },
  modalBody: { padding: '24px 28px', overflowY: 'auto', flex: 1 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '18px 28px', borderTop: '1.5px solid var(--border)' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' },
  input: {
    padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem', fontFamily: 'Nunito,sans-serif', color: 'var(--text)',
    background: 'var(--white)', outline: 'none', transition: 'border 0.15s',
  },
  inputErr: { borderColor: '#e74c3c' },
  err: { color: '#e74c3c', fontSize: '0.78rem', marginTop: 2 },
  btnPrimary: {
    padding: '10px 24px', background: 'var(--primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem',
    fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif',
    transition: 'background 0.18s',
  },
  btnSecondary: {
    padding: '10px 20px', background: 'var(--bg)', color: 'var(--text)',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito,sans-serif',
  },
  toast: {
    position: 'fixed', bottom: 28, right: 28, background: 'var(--primary)',
    color: '#fff', borderRadius: 'var(--radius-sm)', padding: '13px 22px',
    fontWeight: 700, fontSize: '0.92rem', zIndex: 9999,
    boxShadow: '0 8px 28px rgba(26,155,140,0.35)',
    animation: 'fadeInUp 0.22s ease',
  },
};
