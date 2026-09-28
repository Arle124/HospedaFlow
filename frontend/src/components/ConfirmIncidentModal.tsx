import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { Room } from '../db/db';
import { springModal, springTouch } from '../utils/motion';
import { CheckCircle2, X, Wrench, Sparkles } from 'lucide-react';

interface ConfirmIncidentModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (room: Room) => void;
}

export const ConfirmIncidentModal: React.FC<ConfirmIncidentModalProps> = ({
  room,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !room) return null;

  const isMaintenance = room.status === 'maintenance';

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <m.div
          className="modal-dialog"
          style={{ maxWidth: '440px' }}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={springModal}
        >
          {/* Cabecera */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={16} color="var(--border-focus)" />
              <span className="room-number" style={{ fontSize: '15px' }}>
                Solucionar Novedad · Hab #{room.number}
              </span>
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
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              ¿Deseas certificar que la siguiente novedad reportada en la habitación ya fue reparada y resuelta?
            </p>

            {/* Tarjeta de Novedad */}
            <div
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Habitación #{room.number}</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Piso {room.floor}</span>
                {isMaintenance && (
                  <span className="status-pill status-maintenance" style={{ fontSize: '10px' }}>
                    Mantenimiento
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--status-dirty-text)',
                  margin: 0,
                  fontStyle: 'italic',
                  lineHeight: 1.4,
                }}
              >
                "{room.notes}"
              </p>
            </div>

            {/* Aviso informativo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isMaintenance ? 'var(--status-dirty-bg)' : 'var(--status-available-bg)',
                border: `1px solid ${isMaintenance ? 'var(--status-dirty-border)' : 'var(--status-available-border)'}`,
                color: isMaintenance ? 'var(--status-dirty-text)' : 'var(--status-available-text)',
                fontSize: '11px',
              }}
            >
              <Sparkles size={14} style={{ flexShrink: 0 }} />
              <span>
                {isMaintenance
                  ? 'Al solucionar, la habitación pasará a Requiere Aseo para que camareras la desinfecten y alisten.'
                  : 'Al solucionar, la novedad se retirará y la habitación quedará normalizada.'}
              </span>
            </div>
          </div>

          {/* Footer */}
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
              type="button"
              className="btn-primary"
              onClick={() => {
                onConfirm(room);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={springTouch}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle2 size={14} />
              <span>Confirmar Solución</span>
            </m.button>
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  );
};
