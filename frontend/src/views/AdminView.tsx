import React, { useState, useEffect } from 'react';
import { db, type Room, type LocalShift, type LocalProduct } from '../db/db';
import {
  TrendingUp,
  DollarSign,
  Sparkles,
  Package,
  FileText
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [shifts, setShifts] = useState<LocalShift[]>([]);
  const [products, setProducts] = useState<LocalProduct[]>([]);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    const allRooms = await db.rooms.toArray();
    setRooms(allRooms);

    const allShifts = await db.shifts.toArray();
    setShifts(allShifts);

    const allProducts = await db.inventory.toArray();
    setProducts(allProducts);
  };

  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0;
  const activeShift = shifts.find((s) => s.status === 'OPEN');
  const dirtyCount = rooms.filter((r) => r.status === 'dirty' || r.status === 'cleaning').length;

  return (
    <div className="container" style={{ paddingBottom: '50px' }}>
      {/* Header del Jefe */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.4px' }}>
          Panel de Control Gerencial
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Supervisión en tiempo real de ocupación, caja y arqueos del hotel.
        </p>
      </div>

      {/* Tarjetas de Métricas Clave (KPIs) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '18px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tasa de Ocupación</span>
            <TrendingUp size={20} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-main)' }}>
            {occupancyRate}%
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
            {occupiedCount} de {rooms.length} habitaciones alquiladas
          </span>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '18px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Caja Turno Activo</span>
            <DollarSign size={20} color="var(--success)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-main)' }}>
            ${(activeShift?.currentCash || 0).toLocaleString('es-CO')}
          </div>
          <span style={{ fontSize: '12px', color: activeShift ? 'var(--success)' : 'var(--danger)' }}>
            {activeShift ? '● Turno abierto en recepción' : '○ Sin turno abierto'}
          </span>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '18px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Aseo Pendiente</span>
            <Sparkles size={20} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-main)' }}>
            {dirtyCount}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
            Habitaciones por limpiar o en proceso
          </span>
        </div>
      </div>

      {/* Historial de Turnos y Auditoría de Arqueos */}
      <section style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px',
        marginBottom: '28px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <FileText size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Auditoría de Turnos y Arqueos de Caja</h3>
        </div>

        {shifts.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            No hay registros de turnos aún.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px' }}>ID / Fecha</th>
                  <th style={{ padding: '10px' }}>Estado</th>
                  <th style={{ padding: '10px' }}>Base Inicial</th>
                  <th style={{ padding: '10px' }}>Esperado</th>
                  <th style={{ padding: '10px' }}>Real Entregado</th>
                  <th style={{ padding: '10px' }}>Diferencia (Cuadre)</th>
                  <th style={{ padding: '10px' }}>Notas</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ fontWeight: '600' }}>{s.id.substring(0, 10)}...</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                        {new Date(s.startedAt).toLocaleDateString()} {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span className={`badge ${s.status === 'OPEN' ? 'badge-success' : 'badge-info'}`}>
                        {s.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px' }}>${s.initialCash.toLocaleString('es-CO')}</td>
                    <td style={{ padding: '12px 10px' }}>${s.currentCash.toLocaleString('es-CO')}</td>
                    <td style={{ padding: '12px 10px' }}>
                      {s.actualCash !== undefined ? `$${s.actualCash.toLocaleString('es-CO')}` : '-'}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      {s.difference !== undefined ? (
                        <span style={{
                          fontWeight: '700',
                          color: s.difference === 0 ? 'var(--success)' : s.difference < 0 ? 'var(--danger)' : 'var(--warning)'
                        }}>
                          {s.difference > 0 ? `+$${s.difference.toLocaleString('es-CO')}` : `$${s.difference.toLocaleString('es-CO')}`}
                          {s.difference < 0 ? ' (Faltante)' : s.difference > 0 ? ' (Sobrante)' : ' (Exacto)'}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>
                      {s.notes || 'Sin novedades'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Resumen de Inventario */}
      <section style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Package size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Control de Minibar e Insumos</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {products.map((p) => (
            <div
              key={p.id}
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px'
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{p.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>SKU: {p.sku}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px' }}>${p.price.toLocaleString('es-CO')}</span>
                <span className={`badge ${p.stock <= p.minStock ? 'badge-danger' : 'badge-success'}`}>
                  Stock: {p.stock}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
