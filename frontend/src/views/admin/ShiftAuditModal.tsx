import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, CheckSquare, Square, ClipboardCheck, Clock, User } from 'lucide-react';
import { type LocalShift, type CashMovement, type PaymentMethod, db } from '../../db/db';
import { summarizeShift, formatCOP, shiftLabel, PAYMENT_METHOD_LABELS } from '../../utils/shiftSummary';
import { springModal, springTouch } from '../../utils/motion';
import { eventBus } from '../../services/eventBus';
import './ShiftAudit.css';

interface ShiftAuditModalProps {
  shiftId: string | null;
  onClose: () => void;
}

export const ShiftAuditModal: React.FC<ShiftAuditModalProps> = ({ shiftId, onClose }) => {
  const [shift, setShift] = useState<LocalShift | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  // Formulario
  const [reviewerName, setReviewerName] = useState('');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!shiftId) return;
    const load = async () => {
      const s = await db.shifts.get(shiftId);
      if (!s) return;
      setShift(s);
      const moves = await db.cashMovements.where('shiftId').equals(shiftId).sortBy('createdAt');
      setMovements(moves);
      
      if (s.review?.checkedMovementIds) {
        setCheckedIds(new Set(s.review.checkedMovementIds));
      } else {
        setCheckedIds(new Set());
      }
      
      if (s.review) {
        setReviewerName(s.review.reviewedBy);
        setCashReceived(s.review.cashReceived.toString());
        setNotes(s.review.notes || '');
      } else if (s.status === 'CLOSED') {
        const expected = s.cashToDeliver ?? s.actualCash ?? 0;
        setCashReceived(expected.toString());
      }
    };
    load();
  }, [shiftId]);

  if (!shiftId || !shift) return null;

  const summary = summarizeShift(shift, movements);
  const isOpen = shift.status === 'OPEN';
  const isClosed = shift.status === 'CLOSED';
  const isReviewed = !!shift.review;

  const handleToggleCheck = (id: string) => {
    if (isReviewed) return;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim()) return;

    const cash = parseFloat(cashReceived) || 0;
    const cashToDeliver = shift.cashToDeliver ?? shift.actualCash ?? 0;
    
    // Si la diferencia del turno no es 0, o lo que entregan no cuadra con lo que el gerente recibe, es observado
    const diff = shift.difference || 0;
    const isExact = cash === cashToDeliver && diff === 0;
    const status: 'APPROVED' | 'OBSERVED' = isExact ? 'APPROVED' : 'OBSERVED';
    
    if (status === 'OBSERVED' && !notes.trim()) {
      alert('Se requiere añadir una nota para una revisión con observación.');
      return;
    }

    const review = {
      status,
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
      cashReceived: cash,
      notes,
      checkedMovementIds: Array.from(checkedIds),
    };

    await db.shifts.update(shift.id, { review });

    eventBus.emit({
      type: 'shift_event',
      title: 'Cierre Revisado',
      message: `El cierre de ${shiftLabel(shift)} fue firmado por ${reviewerName}. Estado: ${status === 'APPROVED' ? 'Aprobado' : 'Con Observación'}.`,
    });

    onClose();
  };

  // Cálculo de tiempos
  const start = new Date(shift.startedAt);
  const end = shift.endedAt ? new Date(shift.endedAt) : new Date();
  const durationHs = ((end.getTime() - start.getTime()) / 3600000).toFixed(1);

  return (
    <AnimatePresence>
      <m.div
        className="modal-overlay sa-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <m.div
          className="sa-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={springModal}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sa-header">
            <div>
              <h2 className="sa-title">Auditoría de Turno</h2>
              <p className="sa-subtitle">{shiftLabel(shift)}</p>
            </div>
            <button className="sa-close-btn" onClick={onClose}><X size={20} /></button>
          </div>

          <div className="sa-body">
            {/* Cabecera Info */}
            <div className="sa-info-row">
              <div className="sa-info-item">
                <User size={14} />
                <span>{shift.receptionistName || 'Turnero'}</span>
              </div>
              <div className="sa-info-item">
                <Clock size={14} />
                <span>{durationHs}h {isOpen ? '(en curso)' : ''}</span>
              </div>
              <div className="sa-info-item">
                <span className={`sa-status-pill sa-status-${isOpen ? 'open' : isReviewed ? shift.review!.status.toLowerCase() : 'pending'}`}>
                  {isOpen ? 'En operación' : isReviewed ? (shift.review!.status === 'APPROVED' ? 'Revisado' : 'Con Observación') : 'Pdte. Revisión'}
                </span>
              </div>
            </div>

            {/* Bloque Cuadre de Caja */}
            <div className="sa-block">
              <h3 className="sa-block-title">Cuadre de Efectivo</h3>
              <div className="sa-summary-grid">
                <div className="sa-summary-item">
                  <span>Base inicial</span>
                  <span className="tabular-nums">{formatCOP(shift.initialCash)}</span>
                </div>
                <div className="sa-summary-item">
                  <span>Ingresos (Efvo)</span>
                  <span className="tabular-nums sa-positive">+{formatCOP(summary.incomeByMethod.CASH)}</span>
                </div>
                <div className="sa-summary-item">
                  <span>Egresos (Efvo)</span>
                  <span className="tabular-nums sa-negative">-{formatCOP(summary.expenses)}</span>
                </div>
                <div className="sa-summary-item sa-summary-total">
                  <span>Efectivo Esperado</span>
                  <span className="tabular-nums">{formatCOP(summary.expectedCash)}</span>
                </div>
              </div>
              
              {!isOpen && (
                <div className="sa-declaration-box">
                  <div className="sa-decl-row">
                    <span>Efectivo Declarado:</span>
                    <span className="tabular-nums">{formatCOP(shift.actualCash || 0)}</span>
                  </div>
                  <div className="sa-decl-row">
                    <span>Diferencia:</span>
                    <span className={`tabular-nums ${(shift.difference || 0) < 0 ? 'sa-negative' : (shift.difference || 0) > 0 ? 'sa-positive' : 'sa-exact'}`}>
                      {formatCOP(shift.difference || 0)}
                    </span>
                  </div>
                  <div className="sa-decl-row">
                    <span>Base que dejó:</span>
                    <span className="tabular-nums">{formatCOP(shift.baseLeft || 0)}</span>
                  </div>
                  <div className="sa-decl-row sa-decl-deliver">
                    <span>Efectivo a entregar a gerencia:</span>
                    <span className="tabular-nums sa-highlight-text">{formatCOP(shift.cashToDeliver ?? shift.actualCash ?? 0)}</span>
                  </div>
                  {shift.notes && (
                    <div className="sa-notes-callout">
                      <strong>Nota del turnero:</strong> {shift.notes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ventas y Digital */}
            <div className="sa-block">
              <h3 className="sa-block-title">Resumen de Ventas</h3>
              <div className="sa-sales-grid">
                <div className="sa-sales-card">
                  <div className="sa-sales-label">Hospedaje</div>
                  <div className="sa-sales-value">{formatCOP(summary.incomeRoom)}</div>
                </div>
                <div className="sa-sales-card">
                  <div className="sa-sales-label">Minibar</div>
                  <div className="sa-sales-value">{formatCOP(summary.incomeMinibar)}</div>
                </div>
                <div className="sa-sales-card">
                  <div className="sa-sales-label">Recargos</div>
                  <div className="sa-sales-value">{formatCOP(summary.surcharges)}</div>
                </div>
              </div>
              <div className="sa-methods-row">
                {Object.entries(summary.incomeByMethod).map(([m, amt]) => (
                  <div key={m} className="sa-method-pill">
                    {PAYMENT_METHOD_LABELS[m as PaymentMethod]}: <strong>{formatCOP(amt)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Movimientos */}
            <div className="sa-block">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 className="sa-block-title" style={{ margin: 0 }}>Movimientos</h3>
                <span className="sa-ticks-count">{checkedIds.size} de {movements.length} punteados</span>
              </div>
              <div className="sa-movements-list">
                {movements.map((m) => {
                  const d = new Date(m.createdAt);
                  const isExp = m.amount < 0 || m.type === 'EXPENSE_SUPPLIER';
                  const isChecked = checkedIds.has(m.id);
                  return (
                    <div 
                      key={m.id} 
                      className={`sa-mov-row ${isChecked ? 'sa-mov-checked' : ''}`}
                      onClick={() => handleToggleCheck(m.id)}
                    >
                      <div className="sa-mov-checkbox">
                        {isChecked ? <CheckSquare size={16} className="sa-checked-icon" /> : <Square size={16} className="sa-unchecked-icon" />}
                      </div>
                      <div className="sa-mov-time">{d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="sa-mov-desc">
                        <div className="sa-mov-concept">{m.concept}</div>
                        {m.reference && <div className="sa-mov-ref">Ref: {m.reference}</div>}
                      </div>
                      <div className={`sa-mov-amt tabular-nums ${isExp ? 'sa-negative' : ''}`}>
                        {isExp ? '-' : ''}{formatCOP(Math.abs(m.amount))}
                      </div>
                    </div>
                  );
                })}
                {movements.length === 0 && <div className="sa-empty">No hay movimientos.</div>}
              </div>
            </div>

            {/* Formulario de Firma (sólo si está cerrado y no revisado) */}
            {isClosed && !isReviewed && (
              <form className="sa-sign-form" onSubmit={handleSubmit}>
                <h3 className="sa-block-title">Firma y Recepción de Dinero</h3>
                
                <div className="sa-input-group">
                  <label>Efectivo Físico Recibido</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="sa-input"
                  />
                </div>
                
                <div className="sa-input-group">
                  <label>Nombre de quien revisa</label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Ej. Gerente"
                    className="sa-input"
                  />
                </div>

                <div className="sa-input-group">
                  <label>Observaciones (Opcional, requerido si no cuadra)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="sa-textarea"
                    rows={2}
                  />
                </div>

                <m.button
                  type="submit"
                  className="sa-btn-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={springTouch}
                >
                  <ClipboardCheck size={16} />
                  Firmar Revisión
                </m.button>
              </form>
            )}

            {/* Bloque Read-only de Firma */}
            {isReviewed && shift.review && (
              <div className="sa-reviewed-box">
                <h3 className="sa-block-title"><ClipboardCheck size={16} /> Revisión Firmada</h3>
                <div className="sa-reviewed-grid">
                  <span>Por:</span> <strong>{shift.review.reviewedBy}</strong>
                  <span>Efectivo recibido:</span> <strong>{formatCOP(shift.review.cashReceived)}</strong>
                  <span>Fecha:</span> <span>{new Date(shift.review.reviewedAt).toLocaleString('es-CO')}</span>
                  {shift.review.notes && (
                    <>
                      <span>Notas:</span> <span className="sa-reviewed-notes">{shift.review.notes}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
};
