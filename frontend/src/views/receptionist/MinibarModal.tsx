import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LocalProduct, Room, PaymentMethod } from '../../db/db';
import { springModal, springTouch } from '../../utils/motion';
import { X, ShoppingBag, Plus, Minus, Banknote, QrCode, CreditCard } from 'lucide-react';

interface MinibarModalProps {
  isOpen: boolean;
  products: LocalProduct[];
  rooms: Room[];
  quantities: Record<number, number>;
  onQuantityChange: (prodId: number, qty: number) => void;
  destination: 'cash' | 'room';
  onDestinationChange: (dest: 'cash' | 'room') => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (m: PaymentMethod) => void;
  paymentReference: string;
  onPaymentReferenceChange: (r: string) => void;
  roomId: string;
  onRoomIdChange: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const MinibarModal: React.FC<MinibarModalProps> = ({
  isOpen,
  products,
  rooms,
  quantities,
  onQuantityChange,
  destination,
  onDestinationChange,
  paymentMethod,
  onPaymentMethodChange,
  paymentReference,
  onPaymentReferenceChange,
  roomId,
  onRoomIdChange,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  const totalSale = Object.entries(quantities).reduce((acc, [idStr, qty]) => {
    const prod = products.find((p) => p.id === Number(idStr));
    return acc + (prod ? prod.price * qty : 0);
  }, 0);

  const occupiedRooms = rooms.filter((r) => r.status === 'occupied');

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <motion.div
          className="modal-dialog"
          style={{ maxWidth: '520px' }}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={springModal}
        >
          <form onSubmit={onSubmit}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={16} color="var(--border-focus)" />
                <span className="room-number" style={{ fontSize: '16px' }}>Venta y Consumos de Minibar</span>
              </div>
              <motion.button
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
              </motion.button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Destino de la venta */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Destino de la Venta
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${destination === 'cash' ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                      backgroundColor: destination === 'cash' ? 'var(--bg-surface-elevated)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: destination === 'cash' ? '600' : '400',
                    }}
                  >
                    <input
                      type="radio"
                      name="minibarDestination"
                      checked={destination === 'cash'}
                      onChange={() => onDestinationChange('cash')}
                      style={{ width: 'auto' }}
                    />
                    <span>Cobro Inmediato (Recepción)</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${destination === 'room' ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                      backgroundColor: destination === 'room' ? 'var(--bg-surface-elevated)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: destination === 'room' ? '600' : '400',
                    }}
                  >
                    <input
                      type="radio"
                      name="minibarDestination"
                      checked={destination === 'room'}
                      onChange={() => onDestinationChange('room')}
                      style={{ width: 'auto' }}
                    />
                    <span>Cargar a Habitación</span>
                  </label>
                </div>
              </div>

              {/* Si es cobro inmediato, selector de medio de pago */}
              {destination === 'cash' && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                    MEDIO DE PAGO
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => onPaymentMethodChange('CASH')}
                      className={`filter-pill ${paymentMethod === 'CASH' ? 'active' : ''}`}
                      style={{ justifyContent: 'center', padding: '5px 8px', fontSize: '11px' }}
                    >
                      <Banknote size={12} />
                      <span>Efectivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPaymentMethodChange('TRANSFER')}
                      className={`filter-pill ${paymentMethod === 'TRANSFER' ? 'active' : ''}`}
                      style={{ justifyContent: 'center', padding: '5px 8px', fontSize: '11px' }}
                    >
                      <QrCode size={12} />
                      <span>Nequi/QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPaymentMethodChange('CARD')}
                      className={`filter-pill ${paymentMethod === 'CARD' ? 'active' : ''}`}
                      style={{ justifyContent: 'center', padding: '5px 8px', fontSize: '11px' }}
                    >
                      <CreditCard size={12} />
                      <span>Datáfono</span>
                    </button>
                  </div>

                  {paymentMethod === 'TRANSFER' && (
                    <input
                      type="text"
                      placeholder="Nº comprobante Nequi (opcional)"
                      value={paymentReference}
                      onChange={(e) => onPaymentReferenceChange(e.target.value)}
                      style={{ fontSize: '12px', padding: '6px 10px' }}
                    />
                  )}
                </div>
              )}

              {/* Selector de habitación si destino es habitación */}
              {destination === 'room' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Seleccionar Habitación Ocupada
                  </label>
                  <select
                    required
                    value={roomId}
                    onChange={(e) => onRoomIdChange(e.target.value)}
                  >
                    <option value="">-- Elige la habitación --</option>
                    {occupiedRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Hab #{r.number} - {r.guestName || 'Huésped'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Catálogo de Productos con contador táctil */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Selección de Productos
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  {products.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      No hay productos registrados en el inventario.
                    </div>
                  ) : (
                    products.map((p) => {
                      const qty = quantities[p.id] || 0;
                      return (
                        <div
                          key={p.id}
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>
                              {p.name}
                            </span>
                            <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              $ {p.price.toLocaleString()} · Stock: {p.stock}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <motion.button
                              type="button"
                              onClick={() => onQuantityChange(p.id, Math.max(0, qty - 1))}
                              disabled={qty <= 0}
                              className="btn-secondary"
                              whileTap={{ scale: 0.9 }}
                              transition={springTouch}
                              style={{ width: '26px', height: '26px', padding: 0 }}
                            >
                              <Minus size={12} />
                            </motion.button>
                            <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>
                              {qty}
                            </span>
                            <motion.button
                              type="button"
                              onClick={() => onQuantityChange(p.id, Math.min(p.stock, qty + 1))}
                              disabled={qty >= p.stock}
                              className="btn-secondary"
                              whileTap={{ scale: 0.9 }}
                              transition={springTouch}
                              style={{ width: '26px', height: '26px', padding: 0 }}
                            >
                              <Plus size={12} />
                            </motion.button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Totalizador */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Venta:</span>
                <span className="tabular-nums" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--status-available-text)' }}>
                  $ {totalSale.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <motion.button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                whileTap={{ scale: 0.97 }}
                transition={springTouch}
              >
                Cancelar
              </motion.button>
              <motion.button
                type="submit"
                className="btn-primary"
                disabled={totalSale <= 0}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={springTouch}
              >
                <ShoppingBag size={13} />
                <span>Confirmar Venta</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
