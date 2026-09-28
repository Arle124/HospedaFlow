import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { LocalShift } from '../../db/db';
import { springModal, springTouch } from '../../utils/motion';
import { X, Unlock, Lock, Banknote, QrCode, CreditCard } from 'lucide-react';

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
        <m.div
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Fondo Inicial en Efectivo (Base de Gaveta)
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
                  Efectivo físico inicial con el que recibes el cajón de recepción.
                </span>
              </div>
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
                <Unlock size={13} />
                <span>Registrar e Iniciar Turno</span>
              </m.button>
            </div>
          </form>
        </m.div>
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
  totalTransfers: number;
  totalCards: number;
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
  totalTransfers,
  totalCards,
  onSubmit,
  onClose,
}) => {
  if (!isOpen || !activeShift) return null;

  const actual = parseFloat(actualCash) || 0;
  const difference = actual - activeShift.currentCash;
  const totalDigital = totalTransfers + totalCards;
  const grandTotalTurno = activeShift.currentCash + totalDigital;

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
          <form onSubmit={onSubmit}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} color="var(--status-dirty-text)" />
                <span className="room-number" style={{ fontSize: '16px' }}>Arqueo y Cierre de Turno</span>
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
              {/* Desglose Contable por Medios de Pago */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '12px',
                }}
              >
                <div style={{ fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  CONCILIACIÓN POR MEDIOS DE PAGO DEL TURNO
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Banknote size={13} color="var(--status-available-text)" />
                    Efectivo Esperado en Gaveta:
                  </span>
                  <span className="tabular-nums" style={{ fontWeight: '700', fontSize: '14px', color: 'var(--status-available-text)' }}>
                    $ {activeShift.currentCash.toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <QrCode size={13} color="var(--border-focus)" />
                    Transferencias (Nequi / QR):
                  </span>
                  <span className="tabular-nums" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    $ {totalTransfers.toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={13} color="#8b5cf6" />
                    Datáfono / Tarjetas:
                  </span>
                  <span className="tabular-nums" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    $ {totalCards.toLocaleString()}
                  </span>
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: '700',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Total Operacional Recaudado:</span>
                  <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    $ {grandTotalTurno.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Conteo Real de Billetes en Gaveta */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Efectivo Físico en Gaveta (Conteo real de billetes)
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
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Digita únicamente el dinero físico del cajón. Las transferencias y datáfonos se concilian por separado.
                </span>
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
                  {difference === 0 ? 'Gaveta de Efectivo Cuadrada Exacta' : difference > 0 ? 'Sobrante en efectivo' : 'Faltante en efectivo (Descuadre)'}:
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
                  placeholder="Ej. Se dejan 50.000 de base para el siguiente turno, lote datáfono #4182 cerrado..."
                  value={closeNotes}
                  onChange={(e) => onCloseNotesChange(e.target.value)}
                />
              </div>
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
                <Lock size={13} />
                <span>Confirmar y Cerrar Turno</span>
              </m.button>
            </div>
          </form>
        </m.div>
      </div>
    </AnimatePresence>
  );
};
