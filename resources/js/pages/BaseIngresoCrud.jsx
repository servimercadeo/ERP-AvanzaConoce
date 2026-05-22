import React, { useState, useEffect } from 'react';
import {
  IconSearch,
  IconEye,
  IconEdit,
  IconTrash,
  IconClose
} from '../components/Icons';

/* ─── Mock Data ──────────────────────────────────────────────────────── */
const INITIAL_DATA = [
  { id: 1, fecha_aval: '2026-05-20', documento_identificacion: '1020304050', nombre_completo: 'Juan Perez', cargo: 'Desarrollador', ciudad: 'Bogotá', empresa: 'Servimercadeo', proyecto: 'Proyecto Interno', telefono: '3001234567', correo: 'juan.perez@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Oficina Central', lider_inmediato: 'Ana Gomez', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-06-01', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '3500000', auxilio_transporte: '162000', otrosi_variable: '0', auxilio_rodamiento: '0', auxilio_comunicacion: '50000', auxilio_alimentacion: '100000', estado: 'en proceso' },
  { id: 2, fecha_aval: '2026-05-18', documento_identificacion: '1030405060', nombre_completo: 'Maria Lopez', cargo: 'Analista de datos', ciudad: 'Medellín', empresa: 'Servimercadeo', proyecto: 'SM: DIRECTV', telefono: '3109876543', correo: 'maria.lopez@example.com', tipo_ingreso: 'Reemplazo', lugar_trabajo: 'Sede Norte', lider_inmediato: 'Carlos Ruiz', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-25', fecha_correccion: '', tasa_riesgo_arl: '2', salario_basico: '2800000', auxilio_transporte: '162000', otrosi_variable: '200000', auxilio_rodamiento: '0', auxilio_comunicacion: '0', auxilio_alimentacion: '150000', estado: 'activa' },
  { id: 3, fecha_aval: '2026-05-19', documento_identificacion: '1040506070', nombre_completo: 'Pedro Torres', cargo: 'Coordinador', ciudad: 'Cali', empresa: 'Servimercadeo', proyecto: 'SM: CLARO', telefono: '3151239876', correo: 'pedro.torres@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Oficina Sur', lider_inmediato: 'Laura Diaz', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-22', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '4200000', auxilio_transporte: '0', otrosi_variable: '500000', auxilio_rodamiento: '200000', auxilio_comunicacion: '60000', auxilio_alimentacion: '0', estado: 'activa' },
  { id: 4, fecha_aval: '2026-05-15', documento_identificacion: '1050607080', nombre_completo: 'Luisa Martinez', cargo: 'Asistente', ciudad: 'Bogotá', empresa: 'Servimercadeo', proyecto: 'Proyecto Interno', telefono: '3205554433', correo: 'luisa.martinez@example.com', tipo_ingreso: 'Reemplazo', lugar_trabajo: 'Oficina Central', lider_inmediato: 'Ana Gomez', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-20', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '1500000', auxilio_transporte: '162000', otrosi_variable: '0', auxilio_rodamiento: '0', auxilio_comunicacion: '0', auxilio_alimentacion: '50000', estado: 'finalizada' },
  { id: 5, fecha_aval: '2026-05-21', documento_identificacion: '1060708090', nombre_completo: 'Andres Ramirez', cargo: 'Gerente', ciudad: 'Barranquilla', empresa: 'Servimercadeo', proyecto: 'SM: DIRECTV', telefono: '3008889977', correo: 'andres.ramirez@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Sede Costa', lider_inmediato: 'Junta Directiva', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-06-10', fecha_correccion: '', tasa_riesgo_arl: '3', salario_basico: '8500000', auxilio_transporte: '0', otrosi_variable: '1000000', auxilio_rodamiento: '500000', auxilio_comunicacion: '100000', auxilio_alimentacion: '0', estado: 'en proceso' },
  { id: 6, fecha_aval: '2026-05-10', documento_identificacion: '1070809001', nombre_completo: 'Camila Rojas', cargo: 'Diseñadora', ciudad: 'Medellín', empresa: 'Servimercadeo', proyecto: 'Proyecto Interno', telefono: '3112223344', correo: 'camila.rojas@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Remoto', lider_inmediato: 'Juan Perez', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-15', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '3200000', auxilio_transporte: '0', otrosi_variable: '0', auxilio_rodamiento: '0', auxilio_comunicacion: '50000', auxilio_alimentacion: '0', estado: 'activa' },
  { id: 7, fecha_aval: '2026-05-12', documento_identificacion: '1080900112', nombre_completo: 'Daniel Osorio', cargo: 'Soporte TI', ciudad: 'Bogotá', empresa: 'Servimercadeo', proyecto: 'SM: CLARO', telefono: '3123334455', correo: 'daniel.osorio@example.com', tipo_ingreso: 'Reemplazo', lugar_trabajo: 'Oficina Central', lider_inmediato: 'Ana Gomez', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-18', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '2100000', auxilio_transporte: '162000', otrosi_variable: '100000', auxilio_rodamiento: '0', auxilio_comunicacion: '0', auxilio_alimentacion: '50000', estado: 'cancelada' },
  { id: 8, fecha_aval: '2026-05-05', documento_identificacion: '1090011223', nombre_completo: 'Sofia Vargas', cargo: 'Contadora', ciudad: 'Cali', empresa: 'Servimercadeo', proyecto: 'Proyecto Interno', telefono: '3134445566', correo: 'sofia.vargas@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Oficina Sur', lider_inmediato: 'Laura Diaz', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-10', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '4000000', auxilio_transporte: '0', otrosi_variable: '0', auxilio_rodamiento: '0', auxilio_comunicacion: '0', auxilio_alimentacion: '100000', estado: 'activa' },
  { id: 9, fecha_aval: '2026-05-20', documento_identificacion: '1100122334', nombre_completo: 'Javier Gomez', cargo: 'Vendedor', ciudad: 'Barranquilla', empresa: 'Servimercadeo', proyecto: 'SM: DIRECTV', telefono: '3145556677', correo: 'javier.gomez@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Terreno', lider_inmediato: 'Andres Ramirez', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-06-01', fecha_correccion: '', tasa_riesgo_arl: '4', salario_basico: '1300000', auxilio_transporte: '162000', otrosi_variable: '1500000', auxilio_rodamiento: '300000', auxilio_comunicacion: '50000', auxilio_alimentacion: '0', estado: 'en proceso' },
  { id: 10, fecha_aval: '2026-05-14', documento_identificacion: '1110233445', nombre_completo: 'Valentina Castro', cargo: 'Recepcionista', ciudad: 'Bogotá', empresa: 'Servimercadeo', proyecto: 'Proyecto Interno', telefono: '3156667788', correo: 'valentina.castro@example.com', tipo_ingreso: 'Reemplazo', lugar_trabajo: 'Oficina Central', lider_inmediato: 'Ana Gomez', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-20', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '1300000', auxilio_transporte: '162000', otrosi_variable: '0', auxilio_rodamiento: '0', auxilio_comunicacion: '0', auxilio_alimentacion: '50000', estado: 'activa' },
  { id: 11, fecha_aval: '2026-05-16', documento_identificacion: '1120344556', nombre_completo: 'Mateo Herrera', cargo: 'Desarrollador', ciudad: 'Medellín', empresa: 'Servimercadeo', proyecto: 'Proyecto Interno', telefono: '3167778899', correo: 'mateo.herrera@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Remoto', lider_inmediato: 'Juan Perez', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-06-01', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '3800000', auxilio_transporte: '0', otrosi_variable: '200000', auxilio_rodamiento: '0', auxilio_comunicacion: '60000', auxilio_alimentacion: '0', estado: 'en proceso' },
  { id: 12, fecha_aval: '2026-05-17', documento_identificacion: '1130455667', nombre_completo: 'Isabella Rios', cargo: 'Analista QA', ciudad: 'Cali', empresa: 'Servimercadeo', proyecto: 'SM: CLARO', telefono: '3178889900', correo: 'isabella.rios@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Oficina Sur', lider_inmediato: 'Laura Diaz', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-25', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '2900000', auxilio_transporte: '162000', otrosi_variable: '100000', auxilio_rodamiento: '0', auxilio_comunicacion: '0', auxilio_alimentacion: '100000', estado: 'activa' },
  { id: 13, fecha_aval: '2026-05-19', documento_identificacion: '1140566778', nombre_completo: 'Sebastian Vega', cargo: 'Operario', ciudad: 'Bogotá', empresa: 'Servimercadeo', proyecto: 'SM: DIRECTV', telefono: '3189990011', correo: 'sebastian.vega@example.com', tipo_ingreso: 'Reemplazo', lugar_trabajo: 'Planta', lider_inmediato: 'Carlos Ruiz', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-22', fecha_correccion: '', tasa_riesgo_arl: '5', salario_basico: '1500000', auxilio_transporte: '162000', otrosi_variable: '300000', auxilio_rodamiento: '0', auxilio_comunicacion: '0', auxilio_alimentacion: '80000', estado: 'activa' },
  { id: 14, fecha_aval: '2026-05-20', documento_identificacion: '1150677889', nombre_completo: 'Valeria Mendoza', cargo: 'Recursos Humanos', ciudad: 'Barranquilla', empresa: 'Servimercadeo', proyecto: 'Proyecto Interno', telefono: '3190001122', correo: 'valeria.mendoza@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Sede Costa', lider_inmediato: 'Andres Ramirez', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-06-05', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '3100000', auxilio_transporte: '0', otrosi_variable: '0', auxilio_rodamiento: '0', auxilio_comunicacion: '40000', auxilio_alimentacion: '120000', estado: 'en proceso' },
  { id: 15, fecha_aval: '2026-05-02', documento_identificacion: '1160788990', nombre_completo: 'Felipe Navarro', cargo: 'Vendedor', ciudad: 'Medellín', empresa: 'Servimercadeo', proyecto: 'SM: CLARO', telefono: '3201112233', correo: 'felipe.navarro@example.com', tipo_ingreso: 'Reemplazo', lugar_trabajo: 'Terreno', lider_inmediato: 'Carlos Ruiz', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-08', fecha_correccion: '', tasa_riesgo_arl: '4', salario_basico: '1300000', auxilio_transporte: '162000', otrosi_variable: '1200000', auxilio_rodamiento: '250000', auxilio_comunicacion: '50000', auxilio_alimentacion: '0', estado: 'finalizada' },
  { id: 16, fecha_aval: '2026-05-18', documento_identificacion: '1170899001', nombre_completo: 'Mariana Ortiz', cargo: 'Asistente', ciudad: 'Bogotá', empresa: 'Servimercadeo', proyecto: 'Proyecto Interno', telefono: '3212223344', correo: 'mariana.ortiz@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Oficina Central', lider_inmediato: 'Ana Gomez', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-24', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '1600000', auxilio_transporte: '162000', otrosi_variable: '0', auxilio_rodamiento: '0', auxilio_comunicacion: '0', auxilio_alimentacion: '60000', estado: 'activa' },
  { id: 17, fecha_aval: '2026-05-15', documento_identificacion: '1180900112', nombre_completo: 'Lucas Silva', cargo: 'Coordinador', ciudad: 'Cali', empresa: 'Servimercadeo', proyecto: 'SM: DIRECTV', telefono: '3223334455', correo: 'lucas.silva@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Oficina Sur', lider_inmediato: 'Laura Diaz', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-30', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '4500000', auxilio_transporte: '0', otrosi_variable: '400000', auxilio_rodamiento: '200000', auxilio_comunicacion: '80000', auxilio_alimentacion: '0', estado: 'en proceso' },
  { id: 18, fecha_aval: '2026-05-11', documento_identificacion: '1190011223', nombre_completo: 'Emma Morales', cargo: 'Diseñadora', ciudad: 'Bogotá', empresa: 'Servimercadeo', proyecto: 'Proyecto Interno', telefono: '3234445566', correo: 'emma.morales@example.com', tipo_ingreso: 'Reemplazo', lugar_trabajo: 'Remoto', lider_inmediato: 'Juan Perez', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-16', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '3300000', auxilio_transporte: '0', otrosi_variable: '0', auxilio_rodamiento: '0', auxilio_comunicacion: '50000', auxilio_alimentacion: '0', estado: 'cancelada' },
  { id: 19, fecha_aval: '2026-05-21', documento_identificacion: '1200122334', nombre_completo: 'Samuel Jimenez', cargo: 'Desarrollador', ciudad: 'Medellín', empresa: 'Servimercadeo', proyecto: 'Proyecto Interno', telefono: '3245556677', correo: 'samuel.jimenez@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Oficina Central', lider_inmediato: 'Ana Gomez', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-06-08', fecha_correccion: '', tasa_riesgo_arl: '1', salario_basico: '4000000', auxilio_transporte: '0', otrosi_variable: '250000', auxilio_rodamiento: '0', auxilio_comunicacion: '60000', auxilio_alimentacion: '0', estado: 'en proceso' },
  { id: 20, fecha_aval: '2026-05-13', documento_identificacion: '1210233445', nombre_completo: 'Mia Delgado', cargo: 'Analista de datos', ciudad: 'Barranquilla', empresa: 'Servimercadeo', proyecto: 'SM: CLARO', telefono: '3256667788', correo: 'mia.delgado@example.com', tipo_ingreso: 'Nuevo', lugar_trabajo: 'Sede Costa', lider_inmediato: 'Andres Ramirez', empleador: 'Servimercadeo SAS', fecha_programacion_ingreso: '2026-05-18', fecha_correccion: '', tasa_riesgo_arl: '2', salario_basico: '2700000', auxilio_transporte: '162000', otrosi_variable: '150000', auxilio_rodamiento: '0', auxilio_comunicacion: '0', auxilio_alimentacion: '120000', estado: 'activa' }
];

const MOCK_OPTS = {
  estados: ['activa', 'en proceso', 'cancelada', 'finalizada']
};

function getPaginasBotones(pagina, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 2;
  const left = pagina - delta;
  const right = pagina + delta;
  const pages = [1];
  if (left > 2) pages.push("...");
  for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i++) pages.push(i);
  if (right < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export default function BaseIngresoCrud() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('baseIngresoData_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_DATA;
  });

  useEffect(() => {
    localStorage.setItem('baseIngresoData_v2', JSON.stringify(data));
  }, [data]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [form, setForm] = useState({});
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  useEffect(() => {
    setPagina(1);
  }, [searchTerm]);

  const handleOpenModal = (mode, row = null) => {
    setModalMode(mode);
    if (mode === 'create') {
      setForm({});
    } else if (row) {
      setForm({ ...row });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSave = () => {
    if (modalMode === 'create') {
      const newId = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;
      const newRow = { id: newId, ...form };
      setData([newRow, ...data]);
    } else if (modalMode === 'edit') {
      setData(data.map(row => (row.id === form.id ? { ...row, ...form } : row)));
    }
    setIsModalOpen(false);
  };

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isModalOpen]);

  const handleChange = (k) => (e) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
  };

  const filteredData = data.filter(row => {
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPaginas = Math.max(1, Math.ceil(filteredData.length / POR_PAGINA));
  const paginatedData = filteredData.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const getEstadoColors = (estado) => {
    const e = estado ? estado.toLowerCase() : '';
    if (e === 'activa' || e === 'abierta') return { bg: '#d1fae5', text: '#065f46' };
    if (e === 'inactiva' || e === 'cancelada') return { bg: '#fee2e2', text: '#991b1b' };
    if (e === 'en proceso') return { bg: '#dbeafe', text: '#1e40af' };
    if (e === 'finalizada') return { bg: '#ffedd5', text: '#9a3412' };
    return { bg: '#f3f4f6', text: '#374151' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
      
      {/* ── Top Controls ── */}
      <div style={S.toolbar}>
        <div style={S.filters}>
          <input
            type="text"
            placeholder="Buscar documento, nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={S.searchInput}
          />
          <button style={S.btnFilter}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
            Filtros
          </button>
        </div>

        <button style={S.btnNuevo} onClick={() => handleOpenModal('create')}>
          + Nuevo ingreso
        </button>
      </div>

      {/* ── Table ── */}
      <div style={S.tableContainer}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Item</th>
              <th style={S.th}>Documento</th>
              <th style={S.th}>Nombre completo</th>
              <th style={S.th}>Cargo</th>
              <th style={S.th}>Empresa</th>
              <th style={S.th}>Fecha ingreso</th>
              <th style={S.th}>Salario básico</th>
              <th style={S.th}>Estado</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => {
              const itemIndex = (pagina - 1) * POR_PAGINA + index + 1;
              const estColors = getEstadoColors(row.estado);
              return (
                <tr key={row.id} style={S.tr}>
                  <td style={S.td}>{itemIndex}</td>
                  <td style={S.td}>{row.documento_identificacion}</td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{row.nombre_completo}</td>
                  <td style={S.td}>{row.cargo}</td>
                  <td style={S.td}>{row.empresa}</td>
                  <td style={S.td}>{row.fecha_programacion_ingreso}</td>
                  <td style={S.td}>${Number(row.salario_basico || 0).toLocaleString()}</td>
                  <td style={S.td}>
                    <span style={S.badge(estColors.bg, estColors.text)}>
                      {row.estado ? row.estado.charAt(0).toUpperCase() + row.estado.slice(1) : '---'}
                    </span>
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button style={S.actionBtn('#3b82f6', '#eff6ff')} title="Ver detalles" onClick={() => handleOpenModal('view', row)}>
                        <IconEye size={16} />
                      </button>
                      <button style={S.actionBtn('#10b981', '#ecfdf5')} title="Editar" onClick={() => handleOpenModal('edit', row)}>
                        <IconEdit size={16} />
                      </button>
                      <button style={S.actionBtn('#ef4444', '#fef2f2')} title="Eliminar">
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  No hay registros de ingreso.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredData.length > 0 && (
        <div style={S.paginationWrap}>
          <span style={S.pageInfo}>
            Página {pagina} · Mostrando {Math.min(POR_PAGINA, filteredData.length - (pagina - 1) * POR_PAGINA)} de {filteredData.length} registros
          </span>
          <div style={S.pageControls}>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={{ ...S.pageBtn(false), opacity: pagina === 1 ? 0.5 : 1 }}>‹</button>
            {getPaginasBotones(pagina, totalPaginas).map((n, i) =>
              n === "..." ? (
                <span key={`ellipsis-${i}`} style={S.pageEllipsis}>…</span>
              ) : (
                <button key={n} onClick={() => setPagina(n)} style={S.pageBtn(n === pagina)}>
                  {n}
                </button>
              )
            )}
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} style={{ ...S.pageBtn(false), opacity: pagina === totalPaginas ? 0.5 : 1 }}>›</button>
          </div>
        </div>
      )}

      {/* ── Modal Crear/Editar/Ver Ingreso ── */}
      {isModalOpen && (
        <div style={S.overlay} onClick={handleCloseModal}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>
                {modalMode === 'create' ? 'Registrar nuevo ingreso' : modalMode === 'edit' ? 'Editar ingreso' : 'Detalles de ingreso'}
              </span>
              <button style={S.closeBtn} onClick={handleCloseModal}><IconClose size={18} /></button>
            </div>
            
            <div style={S.modalBody}>
              <div style={S.grid3}>
                <Field label="Fecha de aval" k="fecha_aval" type="date" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Número de documento de identificación" k="documento_identificacion" req form={form} onChange={handleChange} disabled={modalMode === 'view' || modalMode === 'edit'} />
                <Field label="Nombre completo" k="nombre_completo" req form={form} onChange={handleChange} disabled={modalMode === 'view'} />

                <Field label="Cargo" k="cargo" req form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Ciudad" k="ciudad" req form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Empresa" k="empresa" req form={form} onChange={handleChange} disabled={modalMode === 'view'} />

                <Field label="Proyecto" k="proyecto" req form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Teléfono de contacto" k="telefono" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Correo electrónico" k="correo" type="email" form={form} onChange={handleChange} disabled={modalMode === 'view'} />

                <Field label="Tipo de ingreso" k="tipo_ingreso" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Lugar de trabajo" k="lugar_trabajo" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Líder inmediato" k="lider_inmediato" form={form} onChange={handleChange} disabled={modalMode === 'view'} />

                <Field label="Empleador" k="empleador" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Fecha programación ingreso" k="fecha_programacion_ingreso" req type="date" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Fecha de corrección" k="fecha_correccion" type="date" form={form} onChange={handleChange} disabled={modalMode === 'view'} />

                <Field label="Tasa de riesgo ARL" k="tasa_riesgo_arl" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Salario básico" k="salario_basico" type="number" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Auxilio de transporte" k="auxilio_transporte" type="number" form={form} onChange={handleChange} disabled={modalMode === 'view'} />

                <Field label="Otrosí variable" k="otrosi_variable" type="number" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Aux. ext. de rodamiento seguridad vial" k="auxilio_rodamiento" type="number" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Auxilio ext. de comunicación" k="auxilio_comunicacion" type="number" form={form} onChange={handleChange} disabled={modalMode === 'view'} />

                <Field label="Auxilio ext. de alimentación" k="auxilio_alimentacion" type="number" form={form} onChange={handleChange} disabled={modalMode === 'view'} />
                <Field label="Estado" k="estado" req opts={MOCK_OPTS.estados} form={form} onChange={handleChange} disabled={modalMode === 'view'} />
              </div>
            </div>

            <div style={S.modalFooter}>
              {modalMode === 'view' ? (
                <button style={S.btnCancel} onClick={handleCloseModal}>Cerrar</button>
              ) : (
                <>
                  <button style={S.btnCancel} onClick={handleCloseModal}>Cancelar</button>
                  <button style={S.btnSave} onClick={handleSave}>Guardar registro</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, k, type = "text", opts, req, span, form, onChange, disabled }) {
  const style = {
    display: 'flex', flexDirection: 'column', gap: '6px',
    ...(span ? { gridColumn: `span ${span}` } : {})
  };
  const inputStyle = {
    padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
    fontSize: '0.95rem', outline: 'none',
    background: disabled ? '#f8fafc' : '#fff',
    color: disabled ? '#6b7280' : '#111827',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    width: '100%'
  };

  return (
    <div style={style}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
        {label}
        {req && <span style={{ color: '#ef4444', marginLeft: '4px', fontWeight: 'bold' }}>*</span>}
      </label>
      {opts ? (
        <select style={inputStyle} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled}>
          <option value="">-- Selecciona --</option>
          {opts.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea style={{ ...inputStyle, minHeight: '40px', resize: 'vertical' }} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled} />
      ) : (
        <input type={type} style={inputStyle} value={form[k] ?? ''} onChange={onChange(k)} disabled={disabled} />
      )}
    </div>
  );
}

const S = {
  // Toolbar
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '15px' },
  filters: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  searchInput: {
    padding: '10px 16px 10px 38px', borderRadius: '20px', border: '1px solid #e5e7eb',
    fontSize: '0.9rem', outline: 'none', minWidth: '280px', background: '#fff',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: '14px center', backgroundSize: '16px'
  },
  btnFilter: {
    padding: '10px 16px', borderRadius: '20px', border: '1px solid #e5e7eb', background: '#fff',
    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#374151', fontWeight: 500
  },
  btnNuevo: {
    padding: '10px 20px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: '20px',
    cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px',
    boxShadow: '0 2px 4px rgba(13, 148, 136, 0.15)'
  },
  
  // Table
  tableContainer: {
    width: '100%', overflowX: 'auto', border: '1px solid #f0fdfa', borderRadius: '12px', background: '#fff',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
  },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '1000px' },
  th: {
    padding: '16px 14px', background: '#f0fdfa', color: '#115e59', fontWeight: 600, fontSize: '0.75rem',
    textAlign: 'left', borderBottom: '1px solid #ccfbf1', textTransform: 'uppercase', letterSpacing: '0.05em'
  },
  tr: { borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' },
  td: { padding: '14px', fontSize: '0.85rem', color: '#374151', textAlign: 'left', verticalAlign: 'middle' },
  
  // Badges
  badge: (bg, text) => ({
    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
    background: bg, color: text, display: 'inline-block', whiteSpace: 'nowrap'
  }),
  
  // Action Buttons
  actionBtn: (color, bg) => ({
    background: bg, border: 'none', color: color, cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px', transition: 'all 0.2s',
  }),
  
  // Pagination
  paginationWrap: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '0 8px', flexWrap: 'wrap', gap: '10px' },
  pageInfo: { color: '#6b7280', fontSize: '0.85rem' },
  pageControls: { display: 'flex', alignItems: 'center', gap: '6px' },
  pageBtn: (active) => ({
    padding: '6px 12px', background: active ? '#0d9488' : '#fff', color: active ? '#fff' : '#374151',
    border: `1px solid ${active ? '#0d9488' : '#e5e7eb'}`, borderRadius: '6px', cursor: 'pointer',
    fontSize: '0.85rem', fontWeight: active ? 600 : 500, transition: 'all 0.2s', minWidth: '32px'
  }),
  pageEllipsis: { padding: '6px', color: '#9ca3af' },

  // Modal
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overscrollBehavior: 'none', backdropFilter: 'blur(2px)' },
  modal: { background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', maxHeight: '90vh', overflow: 'hidden' },
  modalHeader: { padding: '20px 24px', background: '#0d9488', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.02em' },
  closeBtn: { background: 'none', border: 'none', color: '#ccfbf1', cursor: 'pointer', display: 'flex', padding: 4, transition: 'color 0.2s' },
  modalBody: { padding: '32px 24px', overflowY: 'auto', flex: 1, maxHeight: 'calc(90vh - 140px)', overscrollBehavior: 'contain', background: '#f8fafc' },
  modalFooter: { padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#fff' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' },
  btnCancel: { padding: '10px 18px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#4b5563', fontSize: '0.9rem', transition: 'all 0.2s' },
  btnSave: { padding: '10px 18px', background: '#0d9488', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#fff', fontSize: '0.9rem', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(13, 148, 136, 0.2)' }
};
