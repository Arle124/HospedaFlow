import React from 'react';
import { m } from 'framer-motion';
import type { Room, Reservation } from '../../db/db';
import { springTouch } from '../../utils/motion';
import { LogIn, LogOut, Eye, Users, AlertTriangle, CheckCircle2, CalendarClock } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  reservationForToday?: Reservation;
  onCheckInClick: (room: Room) => void;
  onCheckOutClick: (room: Room) => void;
  onDetailClick: (room: Room) => void;
  onClearNotes: (room: Room) => void;
}

export const RoomCard: React.FC<RoomCardProps> = React.memo(({
  room,
  reservationForToday,
  onCheckInClick,
  onCheckOutClick,
  onDetailClick,
  onClearNotes,
}) => {
  const isOccupied = room.status === 'occupied';
  const isDirty = room.status === 'dirty';
  const isCleaning = room.status === 'cleaning';
  const isMaintenance = room.status === 'maintenance';
  const isAvailable = room.status === 'available';
  const isReserved = isAvailable && !!reservationForToday;

  // Cálculo de saldos
  const roomDebt = isOccupied ? (room.paymentStatus === 'PAID' ? 0 : room.price) : 0;
  const minibarDebt = (room.consumptions || []).reduce((acc, c) => acc + c.total, 0);
  const totalDebt = roomDebt + minibarDebt;

  let displayStatus: string = room.status;
  if (isReserved) {
    displayStatus = 'reserved';
  }

  const statusLabels: Record<string, { label: string; className: string }> = {
    available: { label: 'Disponible', className: 'status-available' },
    occupied: { label: 'Ocupada', className: 'status-occupied' },
    dirty: { label: 'Requiere Aseo', className: 'status-dirty' },
    cleaning: { label: 'En Limpieza', className: 'status-cleaning' },
    maintenance: { label: 'Mantenimiento', className: 'status-maintenance' },
    reserved: { label: 'Reservada (Hoy)', className: 'status-reserved' },
  };

  const statusInfo = statusLabels[displayStatus] || { label: displayStatus, className: 'status-available' };

  return (
    <m.div
      className="room-card"
      whileHover={{ y: -3 }}
      transition={springTouch}
    >
      <div>
        {/* Cabecera: Número y Badge de Estado */}
        <div className="room-card-header">
          <span className="room-number">#{room.number}</span>
          <span className={`status-pill ${statusInfo.className}`} style={displayStatus === 'reserved' ? { backgroundColor: 'var(--status-occupied-bg)', color: 'var(--status-occupied-text)', border: '1px solid var(--status-occupied-border)' } : undefined}>
            {statusInfo.label}
          </span>
        </div>

        {/* Metadatos de Habitación */}
        <div className="room-meta">
          <span>Piso {room.floor}</span> · <span style={{ textTransform: 'capitalize' }}>{room.type}</span> ·{' '}
          <span className="tabular-nums" style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
            ${room.price.toLocaleString()}/noche
          </span>
        </div>

        {/* Ficha de Huésped (si está ocupada) */}
        {isOccupied && (
          <div className="guest-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <Users size={13} style={{ color: 'var(--border-focus)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {room.guestName || 'Huésped registrado'}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                {room.guestsCount || 1} {(room.guestsCount || 1) === 1 ? 'persona' : 'personas'}
              </span>
            </div>

            {/* Balances de cobro */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '11px', marginTop: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Saldo pendiente:</span>
              <span
                className="tabular-nums"
                style={{
                  fontWeight: '700',
                  color: totalDebt > 0 ? 'var(--status-maintenance-text)' : 'var(--status-available-text)',
                  fontSize: '12px',
                }}
              >
                {totalDebt > 0 ? `$ ${totalDebt.toLocaleString()}` : 'Al día ($0)'}
              </span>
            </div>
          </div>
        )}

        {/* Reserva del día (si está disponible pero reservada) */}
        {isReserved && reservationForToday && (
          <div className="guest-box" style={{ backgroundColor: 'var(--bg-canvas)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <CalendarClock size={13} style={{ color: 'var(--status-occupied-text)', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                Llega: {reservationForToday.guestName}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Abono: ${reservationForToday.advancePayment.toLocaleString()}</span>
              <span>Total: ${reservationForToday.totalPrice.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Aviso de Incidencia / Novedad de Camarera */}
        {room.notes && (
          <div className="room-alert-callout">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {room.notes}
              </span>
            </div>
            <m.button
              type="button"
              onClick={() => onClearNotes(room)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={springTouch}
              className="btn-secondary"
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                height: '22px',
                flexShrink: 0,
              }}
              title="Marcar novedad como atendida"
            >
              <CheckCircle2 size={11} color="var(--status-available-text)" />
              <span>Resolver</span>
            </m.button>
          </div>
        )}
      </div>

      {/* Acciones de la Tarjeta */}
      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
        {isAvailable && !isReserved && (
          <m.button
            type="button"
            className="btn-secondary"
            onClick={() => onCheckInClick(room)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={springTouch}
            style={{ width: '100%', color: 'var(--border-focus)', fontWeight: '600' }}
          >
            <LogIn size={13} />
            <span>Check-in (Walk-in)</span>
          </m.button>
        )}

        {isReserved && (
          <m.button
            type="button"
            className="btn-primary"
            onClick={() => {
              // Si está reservada, el check-in se hace con los datos de la reserva
              // Aquí podemos pre-llenar o avisar. Por simplicidad usamos el onCheckInClick estándar
              // pero la vista de CheckInModal podría usar el guestName si lo pasamos, o lo llenan a mano.
              onCheckInClick(room);
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={springTouch}
            style={{ width: '100%', fontWeight: '600' }}
          >
            <LogIn size={13} />
            <span>Hacer Check-in (Reserva)</span>
          </m.button>
        )}

        {isOccupied && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <m.button
              type="button"
              className="btn-secondary"
              onClick={() => onDetailClick(room)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={springTouch}
            >
              <Eye size={13} />
              <span>Detalles</span>
            </m.button>

            <m.button
              type="button"
              className="btn-secondary"
              onClick={() => onCheckOutClick(room)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={springTouch}
              style={{ color: 'var(--status-maintenance-text)' }}
            >
              <LogOut size={13} />
              <span>Salida</span>
            </m.button>
          </div>
        )}

        {isDirty && (
          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', padding: '6px 0' }}>
            Aviso enviado a camarera
          </div>
        )}

        {isCleaning && (
          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--status-cleaning-text)', fontWeight: '500', padding: '6px 0' }}>
            Personal limpiando en piso...
          </div>
        )}

        {isMaintenance && (
          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--status-maintenance-text)', fontWeight: '500', padding: '6px 0' }}>
            Bloqueada por mantenimiento
          </div>
        )}
      </div>
    </m.div>
  );
});
