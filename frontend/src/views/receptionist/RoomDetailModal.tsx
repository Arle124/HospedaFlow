import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { Room } from '../../db/db';
import { springModal, springTouch } from '../../utils/motion';
import { X, Users, ShoppingBag, LogOut } from 'lucide-react';

interface RoomDetailModalProps {
  room: Room | null;
  onClose: () => void;
  onOpenMinibarForRoom: (roomId: string) => void;
  onCheckOutClick: (room: Room) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  onClose,
  onOpenMinibarForRoom,
  onCheckOutClick,
}) => {
  if (!room) return null;

  const roomDebt = room.paymentStatus === 'PAID' ? 0 : room.price;
  const consumptions = room.consumptions || [];
  const minibarDebt = consumptions.reduce((acc, c) => acc + c.total, 0);
  const totalDebt = roomDebt + minibarDebt;

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <m.div
          className="modal-dialog"
          style={{ maxWidth: '540px' }}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={springModal}
        >
          {/* Cabecera del Modal */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="room-number">Habitación #{room.number}</span>
              <span className="status-pill status-occupied">Ocupada</span>
            </div>
            <m.button
              type="button"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={springTouch}
              className="btn-secondary"
              style={{ padding: '4px', borderRadius: '4px', border: 'none' }}
              aria-label="Cerrar modal"
            >
              <X size={16} />
            </m.button>
          </div>

          {/* Cuerpo */}
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Tarjeta resumen de Huésped */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Huésped:</span>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>{room.guestName || 'Sin registrar'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Huéspedes:</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                  <Users size={13} /> {room.guestsCount || 1} {(room.guestsCount || 1) === 1 ? 'persona' : 'personas'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Tarifa de Noche:</span>
                <span className="tabular-nums" style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>${room.price.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Estado de Pago:</span>
                <span
                  className={`status-pill ${room.paymentStatus === 'PAID' ? 'status-available' : 'status-dirty'}`}
                  style={{ fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}
                >
                  {room.paymentStatus === 'PAID' ? '✓ Pagado' : '⏳ Pendiente'}
                </span>
              </div>
            </div>

            {/* Desglose de Consumos de Minibar */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingBag size={14} color="var(--border-focus)" />
                  Consumos de Minibar ({consumptions.length})
                </span>
                <m.button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onOpenMinibarForRoom(room.id)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springTouch}
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  + Agregar consumo
                </m.button>
              </div>

              {consumptions.length === 0 ? (
                <div
                  style={{
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                  }}
                >
                  No se han registrado consumos de minibar en esta estancia.
                </div>
              ) : (
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px', color: 'var(--text-muted)', fontWeight: '600' }}>Producto</th>
                        <th style={{ padding: '6px 10px', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'center' }}>Cant.</th>
                        <th style={{ padding: '6px 10px', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumptions.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--text-primary)', fontWeight: '500' }}>{c.productName}</td>
                          <td className="tabular-nums" style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>{c.quantity}</td>
                          <td className="tabular-nums" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            ${c.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Total Consolidado */}
            <div
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', display: 'block' }}>
                  Saldo Total por Cobrar
                </span>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.3 }}>
                  Hospedaje: <strong style={{ color: 'var(--text-primary)' }}>${roomDebt.toLocaleString()}</strong> · Minibar: <strong style={{ color: 'var(--text-primary)' }}>${minibarDebt.toLocaleString()}</strong>
                </div>
              </div>
              <span
                className="tabular-nums"
                style={{
                  fontSize: '20px',
                  fontWeight: '800',
                  color: totalDebt > 0 ? 'var(--status-maintenance-text)' : 'var(--status-available-text)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  textAlign: 'right',
                }}
              >
                ${totalDebt.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Footer de Acciones */}
          <div className="modal-footer">
            <m.button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              whileTap={{ scale: 0.97 }}
              transition={springTouch}
            >
              Cerrar
            </m.button>

            <m.button
              type="button"
              className="btn-primary"
              onClick={() => {
                onClose();
                onCheckOutClick(room);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={springTouch}
              style={{ backgroundColor: '#be123c', borderColor: '#9f1239' }}
            >
              <LogOut size={13} />
              <span>Proceder a Check-out</span>
            </m.button>
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  );
};
