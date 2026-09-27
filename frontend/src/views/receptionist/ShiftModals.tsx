import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LocalShift } from '../../db/db';
import { springModal, springTouch } from '../../utils/motion';
import { X, Unlock, Lock } from 'lucide-react';

interface OpenShiftModalProps {
  isOpen: boolean;
  initialCash: string;
  onInitialCashChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({
  isOpen,
  initialCash,
  onInitialCashChange,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

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
          <form onSubmit={onSubmit}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Unlock size={16} color="var(--border-focus)" />
                <span className="room-number" style={{ fontSize: '16px' }}>Abrir Turno de Caja</span>
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Fondo Inicial en Efectivo (Base de Caja)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="50000"
                  value={initialCash}
                  onChange={(e) => onInitialCashChange(e.target.value)}
                  autoFocus
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Ingresa el efectivo físico con el que recibes la gaveta de caja.
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={springTouch}
              >
                <Unlock size={13} />
                <span>Registrar e Iniciar Turno</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface CloseShiftModalProps {
  isOpen: boolean;
  activeShift: LocalShift | null;
  actualCash: string;
  onActualCashChange: (val: string) => void;
  closeNotes: string;
  onCloseNotesChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({
  isOpen,
  activeShift,
  actualCash,
  onActualCashChange,
  closeNotes,
  onCloseNotesChange,
  onSubmit,
  onClose,
}) => {
  if (!isOpen || !activeShift) return null;

  const actual = parseFloat(actualCash) || 0;
  const difference = actual - activeShift.currentCash;

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
          <form onSubmit={onSubmit}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} color="var(--status-dirty-text)" />
                <span className="room-number" style={{ fontSize: '16px' }}>Arqueo y Cierre de Turno</span>
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
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Efectivo Calculado por Sistema:</span>
                <span className="tabular-nums" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  $ {activeShift.currentCash.toLocaleString()}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Efectivo Físico en Caja (Conteo real)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="0"
                  value={actualCash}
                  onChange={(e) => onActualCashChange(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Diferencia o Descuadre */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: difference === 0 ? 'var(--status-available-bg)' : 'var(--status-dirty-bg)',
                  border: `1px solid ${difference === 0 ? 'var(--status-available-border)' : 'var(--status-dirty-border)'}`,
                  fontSize: '12px',
                }}
              >
                <span style={{ color: difference === 0 ? 'var(--status-available-text)' : 'var(--status-dirty-text)', fontWeight: '600' }}>
                  {difference === 0 ? 'Caja Cuadrada Exacta' : difference > 0 ? 'Sobrante en caja' : 'Faltante (Descuadre)'}:
                </span>
                <span className="tabular-nums" style={{ fontWeight: '800', color: difference === 0 ? 'var(--status-available-text)' : 'var(--status-dirty-text)' }}>
                  $ {difference.toLocaleString()}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Notas u Observaciones del Cierre
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Se dejan 50.000 para el siguiente turno..."
                  value={closeNotes}
                  onChange={(e) => onCloseNotesChange(e.target.value)}
                />
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
                <Lock size={13} />
                <span>Confirmar y Cerrar Turno</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
