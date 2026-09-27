import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Room } from '../../db/db';
import { springModal, springTouch } from '../../utils/motion';
import { X, LogIn, Users } from 'lucide-react';

interface CheckInModalProps {
  room: Room | null;
  guestName: string;
  onGuestNameChange: (val: string) => void;
  guestsCount: number;
  onGuestsCountChange: (val: number) => void;
  paymentOption: 'PENDING' | 'PAID';
  onPaymentOptionChange: (opt: 'PENDING' | 'PAID') => void;
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
  onConfirm,
  onClose,
}) => {
  if (!room) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <motion.div
          className="modal-dialog"
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
                  Modalidad de Pago de la Habitación
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
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>
                        Pagar de inmediato ($ {room.price.toLocaleString()})
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Ingresa el valor total de la noche directamente al turno de caja activo.
                      </span>
                    </div>
                  </label>
                </div>
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={springTouch}
              >
                <LogIn size={13} />
                <span>Completar Check-in</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
