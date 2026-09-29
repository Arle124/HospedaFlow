import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, CalendarPlus, User, Phone, DollarSign, StickyNote, Globe, AlertTriangle } from 'lucide-react';
import { springModal, springTouch } from '../../utils/motion';
import { db, type Room, type Reservation } from '../../db/db';
import { syncService } from '../../services/syncService';
import { eventBus } from '../../services/eventBus';

/* ─────────── Tipos ─────────── */

interface CreateReservationModalProps {
  isOpen: boolean;
  rooms: Room[];
  initialRoomId?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  onClose: () => void;
}

const SOURCES: { id: Reservation['source']; label: string }[] = [
  { id: 'MANUAL', label: 'Directa / Teléfono' },
  { id: 'BOOKING', label: 'Booking.com' },
  { id: 'AIRBNB', label: 'Airbnb' },
  { id: 'EXCEL_IMPORT', label: 'Importada (Excel)' },
];

/* ─────────── Componente ─────────── */

export const CreateReservationModal: React.FC<CreateReservationModalProps> = ({
  isOpen,
  rooms,
  initialRoomId,
  initialCheckIn,
  initialCheckOut,
  onClose,
}) => {
  const [roomId, setRoomId] = useState(initialRoomId ?? '');
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [checkIn, setCheckIn] = useState(initialCheckIn ?? '');
  const [checkOut, setCheckOut] = useState(initialCheckOut ?? '');
  const [source, setSource] = useState<Reservation['source']>('MANUAL');
  const [totalPrice, setTotalPrice] = useState('');
  const [advancePayment, setAdvancePayment] = useState('0');
  const [notes, setNotes] = useState('');

  // Sincronizar con props iniciales al abrir
  useEffect(() => {
    if (isOpen) {
      setRoomId(initialRoomId ?? '');
      setCheckIn(initialCheckIn ?? '');
      setCheckOut(initialCheckOut ?? '');
      setGuestName('');
      setGuestContact('');
      setSource('MANUAL');
      setTotalPrice('');
      setAdvancePayment('0');
      setNotes('');
    }
  }, [isOpen, initialRoomId, initialCheckIn, initialCheckOut]);

  // Calcular precio automático basado en noches y tarifa de habitación
  const selectedRoom = rooms.find((r) => r.id === roomId);
  useEffect(() => {
    if (selectedRoom && checkIn && checkOut) {
      const inDate = new Date(checkIn);
      const outDate = new Date(checkOut);
      const nights = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / 86_400_000));
      setTotalPrice(String(selectedRoom.price * nights));
    }
  }, [selectedRoom, checkIn, checkOut]);

  const sortedRooms = [...rooms].sort((a, b) =>
    a.number.localeCompare(b.number, undefined, { numeric: true })
  );

  // Validación anti-overbooking: detectar solapamiento en tiempo real
  const [overlapConflict, setOverlapConflict] = useState<Reservation | null>(null);

  useEffect(() => {
    if (!roomId || !checkIn || !checkOut || checkOut <= checkIn) {
      setOverlapConflict(null);
      return;
    }
    const checkOverlap = async () => {
      const overlapping = await db.reservations
        .where('roomId')
        .equals(roomId)
        .filter(
          (r) =>
            r.status !== 'CANCELLED' &&
            r.status !== 'NO_SHOW' &&
            r.checkInDate < checkOut &&
            r.checkOutDate > checkIn
        )
        .first();
      setOverlapConflict(overlapping ?? null);
    };
    checkOverlap();
  }, [roomId, checkIn, checkOut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomId || !guestName.trim() || !checkIn || !checkOut) return;

    const id = `res_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newReservation: Reservation = {
      id,
      roomId,
      guestName: guestName.trim(),
      guestContact: guestContact.trim() || undefined,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      status: 'CONFIRMED',
      source,
      totalPrice: parseFloat(totalPrice) || 0,
      advancePayment: parseFloat(advancePayment) || 0,
      notes: notes.trim() || undefined,
    };

    await db.reservations.add(newReservation);

    await syncService.enqueueAction('CREATE_RESERVATION', {
      ...newReservation,
    });

    eventBus.emit({
      type: 'shift_event',
      title: 'Reserva Creada',
      message: `${guestName} – Hab #${selectedRoom?.number ?? '?'} · ${checkIn} al ${checkOut}`,
    });

    onClose();
  };

  // Validación de fechas
  const todayStr = new Date().toISOString().split('T')[0];
  const isValid =
    roomId && guestName.trim() && checkIn && checkOut && checkOut > checkIn && !overlapConflict;

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <m.div
            className="modal-dialog modal-dialog-lg"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={springModal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h3 className="modal-title">
                <CalendarPlus size={16} />
                Nueva Reserva
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
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Habitación */}
                <div className="form-group">
                  <label className="form-label">Habitación</label>
                  <select
                    className="form-input"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {sortedRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        #{r.number} · {r.type} · ${r.price.toLocaleString()}/noche
                      </option>
                    ))}
                  </select>
                </div>

                {/* Huésped */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <User size={12} /> Huésped
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nombre completo"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <Phone size={12} /> Contacto
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Tel o email (opcional)"
                      value={guestContact}
                      onChange={(e) => setGuestContact(e.target.value)}
                    />
                  </div>
                </div>

                {/* Fechas */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Entrada</label>
                    <input
                      type="date"
                      className="form-input"
                      value={checkIn}
                      min={todayStr}
                      onChange={(e) => setCheckIn(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Salida</label>
                    <input
                      type="date"
                      className="form-input"
                      value={checkOut}
                      min={checkIn || todayStr}
                      onChange={(e) => setCheckOut(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Alerta de solapamiento */}
                {overlapConflict && (
                  <m.div
                    className="overlap-warning"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={springTouch}
                  >
                    <AlertTriangle size={14} />
                    <span>
                      <strong>Overbooking:</strong> {overlapConflict.guestName} ya tiene reserva en esta
                      habitación del {overlapConflict.checkInDate} al {overlapConflict.checkOutDate}.
                    </span>
                  </m.div>
                )}

                {/* Origen y Precio */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <Globe size={12} /> Origen
                    </label>
                    <select
                      className="form-input"
                      value={source}
                      onChange={(e) => setSource(e.target.value as Reservation['source'])}
                    >
                      {SOURCES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <DollarSign size={12} /> Precio Total
                    </label>
                    <input
                      type="number"
                      className="form-input tabular-nums"
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>

                {/* Anticipo */}
                <div className="form-group">
                  <label className="form-label">
                    <DollarSign size={12} /> Anticipo / Abono
                  </label>
                  <input
                    type="number"
                    className="form-input tabular-nums"
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(e.target.value)}
                    min="0"
                  />
                </div>

                {/* Notas */}
                <div className="form-group">
                  <label className="form-label">
                    <StickyNote size={12} /> Notas
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Observaciones (opcional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <m.button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  whileTap={{ scale: 0.97 }}
                  transition={springTouch}
                >
                  Cancelar
                </m.button>
                <m.button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!isValid}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springTouch}
                >
                  <CalendarPlus size={14} />
                  Confirmar Reserva
                </m.button>
              </div>
            </form>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
