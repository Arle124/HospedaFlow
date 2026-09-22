import React, { useState, useEffect } from 'react';
import { db, type Room, type LocalShift, type LocalProduct } from '../db/db';
import { eventBus } from '../services/eventBus';
import {
  TrendingUp,
  DollarSign,
  Package,
  FileText,
  AlertTriangle,
  Wrench
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [shifts, setShifts] = useState<LocalShift[]>([]);
  const [products, setProducts] = useState<LocalProduct[]>([]);

  const loadAdminData = async () => {
    const allRooms = await db.rooms.toArray();
    setRooms(allRooms);

    const allShifts = await db.shifts.toArray();
    // Ordenar turnos más recientes primero
    allShifts.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    setShifts(allShifts);

    const allProducts = await db.inventory.toArray();
    setProducts(allProducts);
  };

  useEffect(() => {
    loadAdminData();

    const unsubscribe = eventBus.subscribe(() => {
      loadAdminData();
    });

    return () => unsubscribe();
  }, []);

  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const availableCount = rooms.filter((r) => r.status === 'available').length;
  const dirtyCount = rooms.filter((r) => r.status === 'dirty').length;
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0;
  const activeShift = shifts.find((s) => s.status === 'OPEN');
  const roomsWithIncidents = rooms.filter((r) => Boolean(r.notes));

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

      {/* Grid de KPIs Ejecutivos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* KPI 1: Ocupación */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}
        >
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
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Caja Turno Activo</span>
            <DollarSign size={16} color="#34d399" />
          </div>
          <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: '800', color: '#34d399' }}>
            ${(activeShift?.currentCash || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: activeShift ? '#34d399' : 'var(--text-muted)', marginTop: '4px' }}>
            {activeShift ? `Turno activo · Base: $${activeShift.initialCash.toLocaleString()}` : 'Sin turno activo en recepción'}
          </div>
        </div>

        {/* KPI 3: Recaudación Histórica */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Total en Arqueos Cerrados</span>
            <FileText size={16} color="#a78bfa" />
          </div>
          <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>
            ${totalClosedCash.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {shifts.filter((s) => s.status === 'CLOSED').length} turnos arqueados y registrados
          </div>
        </div>

        {/* KPI 4: Novedades / Averías Activas */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Avisos de Aseo / Averías</span>
            <Wrench size={16} color={roomsWithIncidents.length > 0 ? '#f59e0b' : 'var(--text-muted)'} />
          </div>
          <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: '800', color: roomsWithIncidents.length > 0 ? '#fcd34d' : 'var(--text-primary)' }}>
            {roomsWithIncidents.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {roomsWithIncidents.length > 0 ? 'Habitaciones reportan novedades' : 'Sin reportes de averías o faltantes'}
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
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Hab #{r.number}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Piso {r.floor}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#fef3c7', marginTop: '4px' }}>
                    {r.notes}
                  </p>
                </div>
                <span className="status-pill status-dirty">Pendiente</span>
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
          <div style={{ overflowX: 'auto' }}>
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
                          <span style={{ color: '#f87171', fontWeight: '700' }}>
                            ${s.difference?.toLocaleString()} (Faltante)
                          </span>
                        ) : isSurplus ? (
                          <span style={{ color: '#fbbf24', fontWeight: '700' }}>
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
        )}
      </section>

      {/* Sección 3: Control de Minibar e Insumos */}
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
