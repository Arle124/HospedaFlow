import React, { useState, useEffect } from 'react';
import { db, type Room, type LocalShift, type LocalProduct, type CashMovement } from '../db/db';
import { syncService } from '../services/syncService';
import { eventBus } from '../services/eventBus';
import {
  TrendingUp,
  DollarSign,
  Package,
  FileText,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  ArrowDownRight,
  Receipt
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [shifts, setShifts] = useState<LocalShift[]>([]);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);

  const loadAdminData = async () => {
    const allRooms = await db.rooms.toArray();
    setRooms(allRooms);

    const allShifts = await db.shifts.toArray();
    // Ordenar turnos más recientes primero
    allShifts.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    setShifts(allShifts);

    const allProducts = await db.inventory.toArray();
    setProducts(allProducts);

    const allMoves = await db.cashMovements.toArray();
    allMoves.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setCashMovements(allMoves);
  };

  useEffect(() => {
    loadAdminData();

    const unsubscribe = eventBus.subscribe(() => {
      loadAdminData();
    });

    return () => unsubscribe();
  }, []);

  const handleResolveIncident = async (room: Room) => {
    if (!window.confirm(`¿Confirmar que la avería o novedad en la Hab #${room.number} ("${room.notes}") ya fue reparada y resuelta?`)) {
      return;
    }

    // Si estaba bloqueada por mantenimiento, se pasa a 'dirty' para que aseo la desinfecte y aliste
    const nextStatus = room.status === 'maintenance' ? 'dirty' : room.status;

    await db.rooms.update(room.id, {
      notes: undefined,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });

    await syncService.enqueueAction('RESOLVE_INCIDENT', {
      roomId: room.id,
      notes: '',
      status: nextStatus,
    });

    eventBus.emit({
      type: 'room_issue',
      title: `Reparación Finalizada: Hab #${room.number}`,
      message: `Gerencia certificó la solución del arreglo. ${nextStatus === 'dirty' ? 'Habitación enviada a Aseo para alistamiento.' : 'Habitación normalizada.'}`,
      roomNumber: room.number,
    });

    loadAdminData();
  };

  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const availableCount = rooms.filter((r) => r.status === 'available').length;
  const dirtyCount = rooms.filter((r) => r.status === 'dirty').length;
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0;
  const activeShift = shifts.find((s) => s.status === 'OPEN');
  const roomsWithIncidents = rooms.filter((r) => Boolean(r.notes));
  const supplierExpenses = cashMovements.filter((m) => m.type === 'EXPENSE_SUPPLIER');
  const totalSupplierExpenses = supplierExpenses.reduce((acc, m) => acc + m.amount, 0);

  // Total recaudado en turnos cerrados
  const totalClosedCash = shifts
    .filter((s) => s.status === 'CLOSED' && s.actualCash !== undefined)
    .reduce((acc, s) => acc + (s.actualCash || 0), 0);

  return (
    <div className="container-fluid" style={{ paddingBottom: '50px' }}>
      {/* Encabezado Gerencial */}
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
          Panel de Control Gerencial y Auditoría
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Supervisión consolidada de ocupación, arqueos de caja, inventario y novedades de infraestructura.
        </p>
      </div>

      {/* Grid de KPIs Ejecutivos (Responsive: 5 cols en desktop, 2 cols en móvil) */}
      <div className="admin-kpi-grid">
        {/* KPI 1: Ocupación */}
        <div className="admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Tasa de Ocupación</span>
            <TrendingUp size={16} color="#60a5fa" />
          </div>
          <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {occupancyRate}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {occupiedCount} ocupadas · {availableCount} listas · {dirtyCount} sucias
          </div>
          {/* Barra de progreso de ocupación */}
          <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-input)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${occupancyRate}%`, height: '100%', backgroundColor: '#2563eb', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* KPI 2: Caja en Operación */}
        <div className="admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Caja Turno Activo</span>
            <DollarSign size={16} color="var(--status-available-text)" />
          </div>
          <div className="tabular-nums kpi-value" style={{ color: 'var(--status-available-text)' }}>
            ${(activeShift?.currentCash || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: activeShift ? 'var(--status-available-text)' : 'var(--text-muted)', marginTop: '4px' }}>
            {activeShift ? `Turno activo · Base: $${activeShift.initialCash.toLocaleString()}` : 'Sin turno activo en recepción'}
          </div>
        </div>

        {/* KPI 3: Recaudación Histórica */}
        <div className="admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Total en Arqueos Cerrados</span>
            <FileText size={16} color="var(--border-focus)" />
          </div>
          <div className="tabular-nums kpi-value" style={{ color: 'var(--text-primary)' }}>
            ${totalClosedCash.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {shifts.filter((s) => s.status === 'CLOSED').length} turnos arqueados y registrados
          </div>
        </div>

        {/* KPI 4: Novedades / Averías Activas */}
        <div className="admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Avisos de Aseo / Averías</span>
            <Wrench size={16} color={roomsWithIncidents.length > 0 ? 'var(--status-dirty-text)' : 'var(--text-muted)'} />
          </div>
          <div className="tabular-nums kpi-value" style={{ color: roomsWithIncidents.length > 0 ? 'var(--status-dirty-text)' : 'var(--text-primary)' }}>
            {roomsWithIncidents.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {roomsWithIncidents.length > 0 ? 'Habitaciones reportan novedades' : 'Sin reportes de averías o faltantes'}
          </div>
        </div>

        {/* KPI 5: Pagos a Proveedores / Egresos */}
        <div className="admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Egresos a Proveedores</span>
            <ArrowDownRight size={16} color="var(--status-maintenance-text)" />
          </div>
          <div className="tabular-nums kpi-value" style={{ color: totalSupplierExpenses > 0 ? 'var(--status-maintenance-text)' : 'var(--text-primary)' }}>
            ${totalSupplierExpenses.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {supplierExpenses.length} comprobantes de egreso registrados
          </div>
        </div>
      </div>

      {/* Sección 1: Avisos de Habitaciones (Reportes en caliente de la Aseadora) */}
      {roomsWithIncidents.length > 0 && (
        <section
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--status-dirty-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={16} color="var(--status-dirty-text)" />
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Novedades de Infraestructura e Insumos (Reportadas por Camareras)
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {roomsWithIncidents.map((r) => (
              <div
                key={r.id}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Hab #{r.number}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Piso {r.floor}</span>
                    {r.status === 'maintenance' && (
                      <span className="status-pill status-maintenance" style={{ fontSize: '10px' }}>Mantenimiento</span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--status-dirty-text)', marginTop: '4px' }}>
                    {r.notes}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleResolveIncident(r)}
                  style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
                >
                  <CheckCircle2 size={12} />
                  <span>Marcar Solucionado</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sección 2: Tabla de Auditoría de Arqueos de Caja */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="#60a5fa" />
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Auditoría Histórica de Arqueos de Turno
            </h2>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Registro inmutable de control financiero
          </span>
        </div>

        {shifts.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>
            No se registran turnos anteriores en la base de datos local.
          </div>
        ) : (
          <>
            {/* Tabla para Desktop / Tablets */}
            <div className="desktop-only" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Fecha y Turno</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Estado</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Fondo Base</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Esperado</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Entregado</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Diferencia (Cuadre)</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Observaciones de Cierre</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => {
                    const isOpen = s.status === 'OPEN';
                    const isBalanced = s.difference === 0;
                    const isShortage = s.difference !== undefined && s.difference < 0;
                    const isSurplus = s.difference !== undefined && s.difference > 0;

                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px' }}>
                          <div className="tabular-nums" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {s.id.startsWith('shift_') ? s.id.substring(0, 14) : `Turno #${s.id}`}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(s.startedAt).toLocaleDateString()} {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td style={{ padding: '10px' }}>
                          {isOpen ? (
                            <span className="status-pill status-cleaning">En Operación</span>
                          ) : (
                            <span className="status-pill status-available">Cerrado</span>
                          )}
                        </td>

                        <td className="tabular-nums" style={{ padding: '10px' }}>
                          ${s.initialCash.toLocaleString()}
                        </td>

                        <td className="tabular-nums" style={{ padding: '10px', fontWeight: '600' }}>
                          ${s.currentCash.toLocaleString()}
                        </td>

                        <td className="tabular-nums" style={{ padding: '10px' }}>
                          {s.actualCash !== undefined ? `$${s.actualCash.toLocaleString()}` : '—'}
                        </td>

                        <td style={{ padding: '10px' }}>
                          {isOpen ? (
                            <span style={{ color: 'var(--text-muted)' }}>Pendiente cierre</span>
                          ) : isBalanced ? (
                            <span style={{ color: 'var(--status-available-text)', fontWeight: '600' }}>
                              $0 (Cuadre Exacto)
                            </span>
                          ) : isShortage ? (
                            <span style={{ color: 'var(--status-maintenance-text)', fontWeight: '700' }}>
                              ${s.difference?.toLocaleString()} (Faltante)
                            </span>
                          ) : isSurplus ? (
                            <span style={{ color: 'var(--status-dirty-text)', fontWeight: '700' }}>
                              +${s.difference?.toLocaleString()} (Sobrante)
                            </span>
                          ) : null}
                        </td>

                        <td style={{ padding: '10px', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                          {s.notes || <span style={{ color: 'var(--text-muted)' }}>Sin notas</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas Optimizadas para Móvil (Sin scroll horizontal) */}
            <div className="mobile-only mobile-shifts-card-list">
              {shifts.map((s) => {
                const isOpen = s.status === 'OPEN';
                const isBalanced = s.difference === 0;
                const isShortage = s.difference !== undefined && s.difference < 0;
                const isSurplus = s.difference !== undefined && s.difference > 0;

                return (
                  <div key={s.id} className="mobile-card-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div className="tabular-nums" style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                          {s.id.startsWith('shift_') ? s.id.substring(0, 14) : `Turno #${s.id}`}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(s.startedAt).toLocaleDateString()} · {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span className={`status-pill ${isOpen ? 'status-cleaning' : 'status-available'}`} style={{ fontSize: '11px' }}>
                        {isOpen ? 'En Operación' : 'Cerrado'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', backgroundColor: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Esperado: </span>
                        <strong className="tabular-nums" style={{ color: 'var(--text-primary)' }}>${(s.currentCash || 0).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Entregado: </span>
                        <strong className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{s.actualCash !== undefined ? `$${s.actualCash.toLocaleString()}` : '—'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Fondo Base: </span>
                        <span className="tabular-nums">${s.initialCash.toLocaleString()}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Cuadre: </span>
                        <span
                          className="tabular-nums"
                          style={{
                            fontWeight: '700',
                            color: isBalanced
                              ? 'var(--status-available-text)'
                              : isShortage
                              ? 'var(--status-maintenance-text)'
                              : isSurplus
                              ? '#3b82f6'
                              : 'var(--text-muted)',
                          }}
                        >
                          {isOpen
                            ? 'Pendiente'
                            : isBalanced
                            ? '$0'
                            : isShortage
                            ? `-$${Math.abs(s.difference || 0).toLocaleString()}`
                            : `+$${(s.difference || 0).toLocaleString()}`}
                        </span>
                      </div>
                    </div>

                    {s.notes && (
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic', borderLeft: '2px solid var(--border-medium)', paddingLeft: '8px' }}>
                        "{s.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Sección 3: Auditoría de Pagos a Proveedores y Egresos de Caja */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={16} color="var(--status-maintenance-text)" />
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Auditoría de Pagos a Proveedores y Egresos de Caja
            </h2>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Control inmutable de facturas y salidas de caja de recepción
          </span>
        </div>

        {supplierExpenses.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>
            No se registran pagos a proveedores o salidas de caja en los turnos locales.
          </div>
        ) : (
          <>
            {/* Tabla para Desktop / Tablets */}
            <div className="desktop-only" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Fecha y Hora</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Proveedor / Beneficiario</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Categoría</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Concepto / Detalle</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Nº Factura / Recibo</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Monto Pagado</th>
                    <th style={{ padding: '8px 10px', fontWeight: '600' }}>Turno</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierExpenses.map((exp) => (
                    <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                        <div className="tabular-nums" style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                          {new Date(exp.createdAt).toLocaleDateString()} {new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ padding: '10px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {exp.supplier || 'Proveedor no especificado'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 7px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-xs)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {exp.category || 'Varios'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)', maxWidth: '260px' }}>
                        {exp.concept}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                        {exp.receipt || '—'}
                      </td>
                      <td className="tabular-nums" style={{ padding: '10px', fontWeight: '700', color: 'var(--status-maintenance-text)' }}>
                        -${exp.amount.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        {exp.shiftId.startsWith('shift_') ? exp.shiftId.substring(0, 14) : `Turno #${exp.shiftId}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas Optimizadas para Móvil (Sin scroll horizontal) */}
            <div className="mobile-only mobile-expenses-card-list">
              {supplierExpenses.map((exp) => (
                <div key={exp.id} className="mobile-card-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      {exp.supplier || 'Proveedor no especificado'}
                    </strong>
                    <span className="tabular-nums" style={{ fontWeight: '800', color: 'var(--status-maintenance-text)', fontSize: '14px' }}>
                      -${exp.amount.toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {exp.concept}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{exp.category || 'Varios'} {exp.receipt ? `· Doc: ${exp.receipt}` : ''}</span>
                    <span className="tabular-nums">
                      {new Date(exp.createdAt).toLocaleDateString()} {new Date(exp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Sección 4: Control de Minibar e Insumos */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Package size={16} color="#34d399" />
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Supervisión de Minibar e Inventario
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
          {products.map((p) => {
            const isLowStock = p.stock <= p.minStock;
            return (
              <div
                key={p.id}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: `1px solid ${isLowStock ? 'var(--status-dirty-border)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-xs)',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 6px 0' }}>SKU: {p.sku}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: '700' }}>
                    ${p.price.toLocaleString()}
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: isLowStock ? 'var(--status-dirty-bg)' : 'var(--status-available-bg)',
                      color: isLowStock ? 'var(--status-dirty-text)' : 'var(--status-available-text)',
                      border: `1px solid ${isLowStock ? 'var(--status-dirty-border)' : 'var(--status-available-border)'}`,
                    }}
                  >
                    Stock: {p.stock} {isLowStock ? '(Bajo)' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
