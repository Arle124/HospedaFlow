import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Phone,
  Calendar,
  Globe,
  DollarSign,
  StickyNote,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { springModal, springTouch } from '../../utils/motion';
import { db, type Reservation, type Room } from '../../db/db';
import { syncService } from '../../services/syncService';
import { eventBus } from '../../services/eventBus';

/* ─────────── Tipos ─────────── */

interface ReservationDetailModalProps {
  reservation: Reservation | null;
  rooms: Room[];
  onClose: () => void;
}

const STATUS_LABELS: Record<Reservation['status'], string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'Hospedado',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No Show',
};

const SOURCE_LABELS: Record<Reservation['source'], string> = {
  MANUAL: 'Directa / Teléfono',
  EXCEL_IMPORT: 'Importada (Excel)',
  BOOKING: 'Booking.com',
  AIRBNB: 'Airbnb',
};

/* ─────────── Componente ─────────── */

export const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({
  reservation,
  rooms,
  onClose,
}) => {
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!reservation) return null;

  const room = rooms.find((r) => r.id === reservation.roomId);
  const inDate = new Date(reservation.checkInDate + 'T12:00:00');
  const outDate = new Date(reservation.checkOutDate + 'T12:00:00');
  const nights = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / 86_400_000));
  const balance = reservation.totalPrice - reservation.advancePayment;

  const isCancelled = reservation.status === 'CANCELLED';
  const isNoShow = reservation.status === 'NO_SHOW';
  const isDead = isCancelled || isNoShow;

  const handleConfirm = async () => {
    await db.reservations.update(reservation.id, { status: 'CONFIRMED' });
    await syncService.enqueueAction('UPDATE_RESERVATION', {
      id: reservation.id,
      status: 'CONFIRMED',
    });
    eventBus.emit({
      type: 'shift_event',
      title: 'Reserva Confirmada',
      message: `${reservation.guestName} – Hab #${room?.number ?? '?'}`,
    });
    onClose();
  };

  const handleCancel = async () => {
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    await db.reservations.update(reservation.id, { status: 'CANCELLED' });
    await syncService.enqueueAction('UPDATE_RESERVATION', {
      id: reservation.id,
      status: 'CANCELLED',
    });
    eventBus.emit({
      type: 'room_issue',
      title: 'Reserva Cancelada',
      message: `${reservation.guestName} – Hab #${room?.number ?? '?'}`,
    });
    setConfirmCancel(false);
    onClose();
  };

  const handleNoShow = async () => {
    await db.reservations.update(reservation.id, { status: 'NO_SHOW' });
    await syncService.enqueueAction('UPDATE_RESERVATION', {
      id: reservation.id,
      status: 'NO_SHOW',
    });
    eventBus.emit({
      type: 'room_issue',
      title: 'No Show registrado',
      message: `${reservation.guestName} no se presentó. Hab #${room?.number ?? '?'} liberada.`,
    });
    onClose();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <AnimatePresence>
      <m.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          setConfirmCancel(false);
          onClose();
        }}
      >
        <m.div
          className="modal-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={springModal}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <h3 className="modal-title">
              <Calendar size={16} />
              Reserva · Hab #{room?.number ?? '?'}
            </h3>
            <m.button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={springTouch}
            >
              <X size={16} />
            </m.button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Estado */}
            <div className={`reservation-status-badge status-${reservation.status.toLowerCase()}`}>
              {STATUS_LABELS[reservation.status]}
            </div>

            {/* Detalles */}
            <div className="detail-grid">
              <div className="detail-row">
                <User size={14} className="detail-icon" />
                <span className="detail-label">Huésped</span>
                <span className="detail-value">{reservation.guestName}</span>
              </div>

              {reservation.guestContact && (
                <div className="detail-row">
                  <Phone size={14} className="detail-icon" />
                  <span className="detail-label">Contacto</span>
                  <span className="detail-value">{reservation.guestContact}</span>
                </div>
              )}

              <div className="detail-row">
                <Calendar size={14} className="detail-icon" />
                <span className="detail-label">Estancia</span>
                <span className="detail-value">
                  {formatDate(reservation.checkInDate)} → {formatDate(reservation.checkOutDate)}{' '}
                  <span className="text-muted">({nights} {nights === 1 ? 'noche' : 'noches'})</span>
                </span>
              </div>

              <div className="detail-row">
                <Globe size={14} className="detail-icon" />
                <span className="detail-label">Origen</span>
                <span className="detail-value">{SOURCE_LABELS[reservation.source]}</span>
              </div>

              <div className="detail-row">
                <DollarSign size={14} className="detail-icon" />
                <span className="detail-label">Tarifa</span>
                <span className="detail-value tabular-nums">
                  $ {reservation.totalPrice.toLocaleString()}
                </span>
              </div>

              <div className="detail-row">
                <DollarSign size={14} className="detail-icon" />
                <span className="detail-label">Anticipo</span>
                <span className="detail-value tabular-nums">
                  $ {reservation.advancePayment.toLocaleString()}
                </span>
              </div>

              {balance > 0 && (
                <div className="detail-row detail-row-highlight">
                  <DollarSign size={14} className="detail-icon" />
                  <span className="detail-label">Saldo pendiente</span>
                  <span className="detail-value tabular-nums">
                    $ {balance.toLocaleString()}
                  </span>
                </div>
              )}

              {reservation.notes && (
                <div className="detail-row">
                  <StickyNote size={14} className="detail-icon" />
                  <span className="detail-label">Notas</span>
                  <span className="detail-value">{reservation.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer con Acciones */}
          {!isDead && (
            <div className="modal-footer modal-footer-spread">
              {/* Acciones negativas a la izquierda */}
              <div className="modal-footer-left">
                {confirmCancel ? (
                  <m.button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleCancel}
                    whileTap={{ scale: 0.97 }}
                    transition={springTouch}
                  >
                    <Trash2 size={14} />
                    Confirmar Cancelación
                  </m.button>
                ) : (
                  <m.button
                    type="button"
                    className="btn btn-ghost-danger"
                    onClick={handleCancel}
                    whileTap={{ scale: 0.97 }}
                    transition={springTouch}
                  >
                    <XCircle size={14} />
                    Cancelar Reserva
                  </m.button>
                )}

                <m.button
                  type="button"
                  className="btn btn-ghost-danger"
                  onClick={handleNoShow}
                  whileTap={{ scale: 0.97 }}
                  transition={springTouch}
                >
                  <AlertTriangle size={14} />
                  No Show
                </m.button>
              </div>

              {/* Acciones positivas a la derecha */}
              {reservation.status === 'PENDING' && (
                <m.button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirm}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springTouch}
                >
                  <CheckCircle2 size={14} />
                  Confirmar
                </m.button>
              )}
            </div>
          )}
        </m.div>
      </m.div>
    </AnimatePresence>
  );
};
