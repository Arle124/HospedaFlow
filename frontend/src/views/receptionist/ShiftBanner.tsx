import React from 'react';
import { motion } from 'framer-motion';
import type { LocalShift } from '../../db/db';
import { springTouch } from '../../utils/motion';
import { ShoppingBag, ArrowDownRight, Lock, Unlock } from 'lucide-react';

interface ShiftBannerProps {
  activeShift: LocalShift | null;
  onOpenShiftClick: () => void;
  onCloseShiftClick: () => void;
  onMinibarClick: () => void;
  onExpenseClick: () => void;
}

export const ShiftBanner: React.FC<ShiftBannerProps> = ({
  activeShift,
  onOpenShiftClick,
  onCloseShiftClick,
  onMinibarClick,
  onExpenseClick,
}) => {
  return (
    <div className="shift-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="pulse-dot"
            style={{
              color: activeShift ? 'var(--status-available-text)' : 'var(--status-dirty-text)',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
            {activeShift ? 'Turno de Caja Activo' : 'Caja Cerrada'}
          </span>
        </div>

        {activeShift && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Fondo Base:</span>
              <span className="tabular-nums" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                $ {activeShift.initialCash.toLocaleString()}
              </span>
            </div>
            <div className="header-divider" style={{ height: '14px' }} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Efectivo Actual:</span>
              <span className="tabular-nums" style={{ fontWeight: '700', color: 'var(--status-available-text)', fontSize: '14px' }}>
                $ {activeShift.currentCash.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {activeShift && (
          <>
            <motion.button
              type="button"
              className="btn-secondary"
              onClick={onMinibarClick}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={springTouch}
              title="Vender o cargar consumibles del minibar"
            >
              <ShoppingBag size={13} color="var(--border-focus)" />
              <span>Venta Minibar</span>
            </motion.button>

            <motion.button
              type="button"
              className="btn-secondary"
              onClick={onExpenseClick}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={springTouch}
              title="Registrar pago a proveedor y descontar de caja"
            >
              <ArrowDownRight size={13} color="var(--status-maintenance-text)" />
              <span>Pago a Proveedor</span>
            </motion.button>
          </>
        )}

        {activeShift ? (
          <motion.button
            type="button"
            className="btn-secondary"
            onClick={onCloseShiftClick}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={springTouch}
          >
            <Lock size={13} />
            <span>Arqueo y Cierre</span>
          </motion.button>
        ) : (
          <motion.button
            type="button"
            className="btn-primary"
            onClick={onOpenShiftClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={springTouch}
          >
            <Unlock size={13} />
            <span>Abrir Turno de Caja</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};
