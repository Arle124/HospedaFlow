import React, { useState, useEffect } from 'react';
import { db, type Room } from '../db/db';
import { syncService } from '../services/syncService';
import { eventBus } from '../services/eventBus';
import { m, AnimatePresence } from 'framer-motion';
import { springTouch, springModal } from '../utils/motion';
import {
  CheckCircle2,
  Brush,
  AlertTriangle,
  Send,
  WifiOff,
  Wrench,
  X
} from 'lucide-react';

export const HousekeeperView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomForNote, setSelectedRoomForNote] = useState<Room | null>(null);
  const [quickNote, setQuickNote] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(syncService.getOnlineStatus());

  const loadRooms = async () => {
    const loaded = await db.rooms.toArray();
    setRooms(loaded);
  };

  useEffect(() => {
    loadRooms();
    const unsubOnline = syncService.subscribeOnlineStatus(setIsOnline);
    const unsubBus = eventBus.subscribe(loadRooms);
    return () => { unsubOnline(); unsubBus(); };
  }, []);

  const handleStartCleaning = async (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    await db.rooms.update(roomId, {
      status: 'cleaning',
      updatedAt: new Date().toISOString(),
    });
    await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId,
      status: 'cleaning',
    });

    if (room) {
      eventBus.emit({
        type: 'room_issue',
        title: `Aseo en Curso: Hab #${room.number}`,
        message: `Personal de aseo comenzó limpieza en Piso ${room.floor}.`,
        roomNumber: room.number,
      });
    }

    loadRooms();
  };

  const handleFinishCleaning = async (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    await db.rooms.update(roomId, {
      status: 'available',
      notes: undefined, // Se limpia la novedad al terminar aseo
      updatedAt: new Date().toISOString(),
    });
    await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId,
      status: 'available',
    });

    if (room) {
      eventBus.emit({
        type: 'room_cleaned',
        title: `¡Habitación #${room.number} Lista!`,
        message: `Despachada por Aseo. Lista y disponible para recepción inmediata.`,
        roomNumber: room.number,
      });
    }

    loadRooms();
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForNote) return;

    await db.rooms.update(selectedRoomForNote.id, {
      notes: quickNote,
      updatedAt: new Date().toISOString(),
    });

    await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId: selectedRoomForNote.id,
      status: selectedRoomForNote.status,
      notes: quickNote,
    });

    eventBus.emit({
      type: 'room_issue',
      title: `Aviso: Hab #${selectedRoomForNote.number}`,
      message: `Novedad reportada: "${quickNote}"`,
      roomNumber: selectedRoomForNote.number,
    });

    setSelectedRoomForNote(null);
    setQuickNote('');
    loadRooms();
  };

  // Orden de prioridad operacional: Sucias -> En limpieza -> Mantenimiento -> Disponibles -> Ocupadas
  const sortedRooms = [...rooms].sort((a, b) => {
    const order: Record<string, number> = { dirty: 1, cleaning: 2, maintenance: 3, available: 4, occupied: 5 };
    return (order[a.status] || 99) - (order[b.status] || 99);
  });

  const dirtyCount = rooms.filter((r) => r.status === 'dirty').length;
  const cleaningCount = rooms.filter((r) => r.status === 'cleaning').length;
  const porAtender = sortedRooms.filter((r) => r.status === 'dirty' || r.status === 'cleaning' || r.status === 'maintenance');
  const alDia = sortedRooms.filter((r) => r.status === 'available' || r.status === 'occupied');

  const renderRoom = (room: Room, isCompact: boolean) => {
    const isDirty = room.status === 'dirty';
    const isCleaning = room.status === 'cleaning';
    const isAvailable = room.status === 'available';
    const isOccupied = room.status === 'occupied';
    const isMaintenance = room.status === 'maintenance';

    return (
      <div
        key={room.id}
        className={`hk-room-card ${isDirty ? "dirty" : isCleaning ? "cleaning" : isMaintenance ? "maintenance" : isCompact ? "al-dia" : "default"}`}
      >
        <div className="hk-room-header">
          <div>
            <span className="hk-room-meta">
              Piso {room.floor} · {room.type}
            </span>
            <div className="hk-room-number">
              #{room.number}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            {isDirty && <span className="status-pill status-dirty">Sucia / Desocupada</span>}
            {isCleaning && <span className="status-pill status-cleaning">En Limpieza</span>}
            {isMaintenance && <span className="status-pill status-maintenance">En Mantenimiento</span>}
            {isAvailable && <span className="status-pill status-available">Limpia / Lista</span>}
            {isOccupied && (
              <span className="hk-room-occupied-badge">
                Huésped adentro
              </span>
            )}
          </div>
        </div>

        {isMaintenance && (
          <div className="hk-room-notes" style={{ backgroundColor: 'transparent', borderLeft: 'none', padding: '0 0 10px 0' }}>
            <span style={{ fontSize: '12px', color: 'var(--status-maintenance-text)', fontWeight: 500 }}>Bloqueada hasta que gerencia confirme la reparación</span>
          </div>
        )}

        {room.notes && (
          <div className="hk-room-notes">
            <AlertTriangle size={15} color={isMaintenance ? "var(--status-maintenance-text)" : "var(--status-dirty-text)"} className="hk-offline-alert-icon" />
            <span style={{ color: isMaintenance ? "var(--status-maintenance-text)" : "var(--status-dirty-text)" }}>{room.notes}</span>
          </div>
        )}

        <div className="hk-room-actions">
          {isDirty && (
            <m.button
              type="button"
              onClick={() => handleStartCleaning(room.id)}
              className="hk-btn-start"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={springTouch}
            >
              <Brush size={16} />
              <span>Comenzar a Limpiar</span>
            </m.button>
          )}

          {isCleaning && (
            <m.button
              type="button"
              onClick={() => handleFinishCleaning(room.id)}
              className="hk-btn-finish"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={springTouch}
            >
              <CheckCircle2 size={17} />
              <span>¡Limpia y Lista para Recepción!</span>
            </m.button>
          )}

          <m.button
            type="button"
            onClick={() => {
              setSelectedRoomForNote(room);
              setQuickNote(room.notes || '');
            }}
            className="hk-btn-note"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springTouch}
          >
            <Wrench size={13} />
            <span>{room.notes ? 'Modificar aviso a recepción' : 'Aviso a recepción (avería o insumos)'}</span>
          </m.button>
        </div>
      </div>
    );
  };

  return (
    <div className="hk-container">
      {/* Alerta sin conexión amigable para camarera */}
      {!isOnline && (
        <div className="hk-offline-alert">
          <WifiOff size={18} color="var(--status-dirty-text)" className="hk-offline-alert-icon" />
          <div className="hk-offline-alert-text">
            <strong>Modo sin señal:</strong> Puedes seguir marcando habitaciones. Se guardan en el teléfono y se enviarán a recepción apenas haya Wi-Fi.
          </div>
        </div>
      )}

      {/* Barra de progreso de aseo */}
      <div className="hk-progress-card">
        <div className="hk-progress-header">
          <div>
            <h1 className="hk-progress-title">Aseo de Habitaciones</h1>
            <p className="hk-progress-subtitle">
              {dirtyCount > 0
                ? `${dirtyCount} por asear · ${cleaningCount} en proceso`
                : 'Piso al día: no hay habitaciones sucias pendientes'}
            </p>
          </div>
          <div className={`hk-progress-badge ${dirtyCount > 0 ? "dirty" : "clean"}`}>
            {dirtyCount} pendientes
          </div>
        </div>
      </div>

      <div className="hk-room-list">
        {porAtender.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Por atender</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {porAtender.map(r => renderRoom(r, false))}
            </div>
          </div>
        )}

        {alDia.length > 0 && (
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Al día</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alDia.map(r => renderRoom(r, true))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Reportar Novedad Rápida */}
      <AnimatePresence>
        {selectedRoomForNote && (
          <m.div
            className="modal-overlay"
            onClick={() => setSelectedRoomForNote(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <m.div
              className="modal-dialog"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={springModal}
            >
              <div className="modal-header">
                <span className="hk-modal-title">
                  Aviso a Recepción · Hab #{selectedRoomForNote.number}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRoomForNote(null)}
                  className="hk-modal-close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <p className="hk-modal-subtitle">
                  Toca una opción rápida o escribe el detalle para que el recepcionista lo vea al instante:
                </p>

                {/* Chips rápidos de 1 toque */}
                <div className="hk-chips-container">
                  {[
                    'Faltan toallas',
                    'Falta jabón / shampoo',
                    'Bombillo quemado',
                    'Fuga en baño',
                    'Cerradura dura',
                    'Control remoto sin pilas',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuickNote(preset)}
                      className={`hk-chip ${quickNote === preset ? "active" : "inactive"}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSaveNote}>
                  <textarea
                    rows={3}
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    placeholder="Detalle de la novedad..."
                    required
                  />

                  <div className="hk-modal-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setSelectedRoomForNote(null)}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary">
                      <Send size={13} />
                      <span>Enviar a Recepción</span>
                    </button>
                  </div>
                </form>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};
