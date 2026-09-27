import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Room, PaymentMethod } from '../../db/db';
import { springModal, springTouch } from '../../utils/motion';
import { X, LogOut, Receipt, Sparkles, Banknote, QrCode, CreditCard } from 'lucide-react';

interface CheckOutModalProps {
  room: Room | null;
  onConfirmCheckOut: (room: Room, method: PaymentMethod, reference?: string, surcharge?: number) => void;
  onClose: () => void;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  room,
  onConfirmCheckOut,
  onClose,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [applySurcharge, setApplySurcharge] = useState<boolean>(false);

  if (!room) return null;

  const roomDebt = room.paymentStatus === 'PAID' ? 0 : room.price;
  const consumptions = room.consumptions || [];
  const minibarDebt = consumptions.reduce((acc, c) => acc + c.total, 0);
  const baseDebt = roomDebt + minibarDebt;

  const surcharge = paymentMethod === 'CARD' && applySurcharge ? Math.round(baseDebt * 0.06) : 0;
  const totalDebt = baseDebt + surcharge;

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
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={16} color="var(--status-maintenance-text)" />
              <span className="room-number" style={{ fontSize: '16px' }}>
                Liquidación de Salida · Hab #{room.number}
              </span>
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
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Confirmar salida para el huésped{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{room.guestName || 'Huésped registrado'}</strong>.
            </div>

            {/* Factura Consolidada */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', fontWeight: '700', fontSize: '12px', color: 'var(--text-secondary)' }}>
                DESGLOSE DE CUENTA
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Hospedaje ({room.type}):</span>
                  <span className="tabular-nums" style={{ fontWeight: '600' }}>
                    {room.paymentStatus === 'PAID' ? '✓ Pagado en check-in ($0)' : `$ ${room.price.toLocaleString()}`}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Consumos de Minibar ({consumptions.length}):</span>
                  <span className="tabular-nums" style={{ fontWeight: '600' }}>
                    $ {minibarDebt.toLocaleString()}
                  </span>
                </div>

                {surcharge > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <span>Recargo Datáfono (6%):</span>
                    <span className="tabular-nums" style={{ fontWeight: '600' }}>
                      +$ {surcharge.toLocaleString()}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    borderTop: '1px solid var(--border-medium)',
                    paddingTop: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '14px',
                    fontWeight: '800',
                  }}
                >
                  <span style={{ color: 'var(--text-primary)' }}>Total a Liquidar:</span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '16px',
                      color: totalDebt > 0 ? 'var(--status-maintenance-text)' : 'var(--status-available-text)',
                    }}
                  >
                    $ {totalDebt.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Selector de Medio de Pago para el saldo */}
            {baseDebt > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  MEDIO DE PAGO DE LA LIQUIDACIÓN
                </span>

                <div className="payment-methods-grid">
                  <motion.button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`payment-method-tile ${paymentMethod === 'CASH' ? 'active' : ''}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    transition={springTouch}
                  >
                    <Banknote size={16} />
                    <span>Efectivo</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFER')}
                    className={`payment-method-tile ${paymentMethod === 'TRANSFER' ? 'active' : ''}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    transition={springTouch}
                  >
                    <QrCode size={16} />
                    <span>Nequi / QR</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`payment-method-tile ${paymentMethod === 'CARD' ? 'active' : ''}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    transition={springTouch}
                  >
                    <CreditCard size={16} />
                    <span>Datáfono</span>
                  </motion.button>
                </div>

                {paymentMethod === 'TRANSFER' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                      Nº de Comprobante / Aprobación Transferencia
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. NQ-981248"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                    />
                  </div>
                )}

                {paymentMethod === 'CARD' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                      <input
                        type="checkbox"
                        checked={applySurcharge}
                        onChange={(e) => setApplySurcharge(e.target.checked)}
                        style={{ width: 'auto' }}
                      />
                      <span>Aplicar recargo de datáfono (6%): <strong>+${Math.round(baseDebt * 0.06).toLocaleString()}</strong></span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Aviso de pase a aseo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--status-dirty-bg)',
                border: '1px solid var(--status-dirty-border)',
                color: 'var(--status-dirty-text)',
                fontSize: '11px',
              }}
            >
              <Sparkles size={14} style={{ flexShrink: 0 }} />
              <span>Al liquidar, la habitación pasará de inmediato a <strong>Requiere Aseo</strong> para la camarera.</span>
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
              type="button"
              className="btn-primary"
              onClick={() => onConfirmCheckOut(room, paymentMethod, paymentReference, surcharge)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={springTouch}
              style={{ backgroundColor: '#be123c', borderColor: '#9f1239' }}
            >
              <LogOut size={13} />
              <span>Confirmar Check-out y Cobro</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
