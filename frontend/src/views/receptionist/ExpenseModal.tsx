import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springModal, springTouch } from '../../utils/motion';
import { X, ArrowDownRight } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  supplier: string;
  onSupplierChange: (val: string) => void;
  concept: string;
  onConceptChange: (val: string) => void;
  category: string;
  onCategoryChange: (val: string) => void;
  amount: string;
  onAmountChange: (val: string) => void;
  receipt: string;
  onReceiptChange: (val: string) => void;
  maxCash: number;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const CATEGORIES = [
  'Insumos y Limpieza',
  'Lavandería y Lencería',
  'Mantenimiento y Reparaciones',
  'Servicios Públicos',
  'Alimentos y Bebidas (Reposición)',
  'Varios / Caja Menor',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  supplier,
  onSupplierChange,
  concept,
  onConceptChange,
  category,
  onCategoryChange,
  amount,
  onAmountChange,
  receipt,
  onReceiptChange,
  maxCash,
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
                <ArrowDownRight size={16} color="var(--status-maintenance-text)" />
                <span className="room-number" style={{ fontSize: '16px' }}>Registro de Egreso / Pago a Proveedor</span>
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

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Efectivo Disponible en Caja:</span>
                <span className="tabular-nums" style={{ fontWeight: '700', color: 'var(--status-available-text)' }}>
                  $ {maxCash.toLocaleString()}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Nombre del Proveedor o Beneficiario
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Distribuidora El Sol"
                  value={supplier}
                  onChange={(e) => onSupplierChange(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Concepto del Pago
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Compra de jabones y cloro"
                  value={concept}
                  onChange={(e) => onConceptChange(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Categoría de Gasto
                  </label>
                  <select value={category} onChange={(e) => onCategoryChange(e.target.value)}>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Monto a Egresar ($)
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    max={maxCash}
                    step="100"
                    placeholder="Ej. 25000"
                    value={amount}
                    onChange={(e) => onAmountChange(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Nº de Factura / Recibo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. FAC-4892"
                  value={receipt}
                  onChange={(e) => onReceiptChange(e.target.value)}
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
                style={{ backgroundColor: '#be123c', borderColor: '#9f1239' }}
              >
                <ArrowDownRight size={13} />
                <span>Registrar y Descontar de Caja</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
