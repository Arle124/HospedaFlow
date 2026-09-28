import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { Room, PaymentMethod } from '../../db/db';
import { springModal, springTouch } from '../../utils/motion';
import { X, LogIn, Users, Banknote, QrCode, CreditCard } from 'lucide-react';

interface CheckInModalProps {
  room: Room | null;
  guestName: string;
  onGuestNameChange: (val: string) => void;
  guestsCount: number;
  onGuestsCountChange: (val: number) => void;
  paymentOption: 'PENDING' | 'PAID';
  onPaymentOptionChange: (opt: 'PENDING' | 'PAID') => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (m: PaymentMethod) => void;
  paymentReference: string;
  onPaymentReferenceChange: (r: string) => void;
  applySurcharge: boolean;
  onApplySurchargeChange: (val: boolean) => void;
  onConfirm: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  room,
  guestName,
  onGuestNameChange,
  guestsCount,
  onGuestsCountChange,
  paymentOption,
  onPaymentOptionChange,
  paymentMethod,
  onPaymentMethodChange,
  paymentReference,
  onPaymentReferenceChange,
  applySurcharge,
  onApplySurchargeChange,
  onConfirm,
  onClose,
}) => {
  if (!room) return null;

  const basePrice = room.price;
  const surcharge = paymentMethod === 'CARD' && applySurcharge ? Math.round(basePrice * 0.06) : 0;
  const totalPrice = basePrice + surcharge;

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <m.div
          className="modal-dialog"
          style={{ maxWidth: '520px' }}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={springModal}
        >
          <form onSubmit={onConfirm}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="room-number">Check-in Habitación #{room.number}</span>
                <span className="status-pill status-available">Tarifa: ${room.price.toLocaleString()}</span>
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

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Nombre Completo del Huésped
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos Gómez"
                  value={guestName}
                  onChange={(e) => onGuestNameChange(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Número de Huéspedes
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="number"
                    min={1}
                    max={6}
                    required
                    value={guestsCount}
                    onChange={(e) => onGuestsCountChange(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Modalidad de Pago
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${paymentOption === 'PENDING' ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                      backgroundColor: paymentOption === 'PENDING' ? 'var(--bg-surface-elevated)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentOption"
                      checked={paymentOption === 'PENDING'}
                      onChange={() => onPaymentOptionChange('PENDING')}
                      style={{ width: 'auto', marginTop: '3px' }}
                    />
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>
                        Pagar al Check-out (Cuenta abierta)
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Recomendado: se liquida junto con consumos de minibar al momento de la salida.
                      </span>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${paymentOption === 'PAID' ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                      backgroundColor: paymentOption === 'PAID' ? 'var(--bg-surface-elevated)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentOption"
                      checked={paymentOption === 'PAID'}
                      onChange={() => onPaymentOptionChange('PAID')}
                      style={{ width: 'auto', marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>
                        Pagar de inmediato (${totalPrice.toLocaleString()})
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Se registra el pago del hospedaje en el turno actual.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Sub-selector de Medio de Pago cuando paga de inmediato */}
              {paymentOption === 'PAID' && (
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
                    MEDIO DE PAGO
                  </span>

                  <div className="payment-methods-grid">
                    <m.button
                      type="button"
                      onClick={() => onPaymentMethodChange('CASH')}
                      className={`payment-method-tile ${paymentMethod === 'CASH' ? 'active' : ''}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      transition={springTouch}
                    >
                      <Banknote size={16} />
                      <span>Efectivo</span>
                    </m.button>

                    <m.button
                      type="button"
                      onClick={() => onPaymentMethodChange('TRANSFER')}
                      className={`payment-method-tile ${paymentMethod === 'TRANSFER' ? 'active' : ''}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      transition={springTouch}
                    >
                      <QrCode size={16} />
                      <span>Nequi / QR</span>
                    </m.button>

                    <m.button
                      type="button"
                      onClick={() => onPaymentMethodChange('CARD')}
                      className={`payment-method-tile ${paymentMethod === 'CARD' ? 'active' : ''}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      transition={springTouch}
                    >
                      <CreditCard size={16} />
                      <span>Datáfono</span>
                    </m.button>
                  </div>

                  {paymentMethod === 'TRANSFER' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                        Nº de Comprobante / Aprobación Nequi o Bancolombia (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. M1892837"
                        value={paymentReference}
                        onChange={(e) => onPaymentReferenceChange(e.target.value)}
                      />
                    </div>
                  )}

                  {paymentMethod === 'CARD' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                        <input
                          type="checkbox"
                          checked={applySurcharge}
                          onChange={(e) => onApplySurchargeChange(e.target.checked)}
                          style={{ width: 'auto' }}
                        />
                        <span>Sumar recargo de datáfono (6%): <strong>+${Math.round(basePrice * 0.06).toLocaleString()}</strong></span>
                      </label>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Total a pasar en el datáfono: <strong className="tabular-nums" style={{ color: 'var(--text-primary)' }}>${totalPrice.toLocaleString()}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <m.button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                whileTap={{ scale: 0.97 }}
                transition={springTouch}
              >
                Cancelar
              </m.button>
              <m.button
                type="submit"
                className="btn-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={springTouch}
              >
                <LogIn size={13} />
                <span>Completar Check-in</span>
              </m.button>
            </div>
          </form>
        </m.div>
      </div>
    </AnimatePresence>
  );
};
