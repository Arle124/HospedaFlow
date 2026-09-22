import React, { useState, useEffect } from 'react';
import { db, type Room } from '../db/db';
import { syncService } from '../services/syncService';
import { eventBus } from '../services/eventBus';
import {
  CheckCircle2,
  Brush,
  AlertTriangle,
  Send,
  WifiOff,
  Wrench
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
    const unsub = syncService.subscribeOnlineStatus(setIsOnline);
    return () => unsub();
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

  return (
    <div style={{ maxWidth: '580px', margin: '0 auto', padding: '16px 16px 80px 16px' }}>
      {/* Alerta sin conexión amigable para camarera */}
      {!isOnline && (
        <div
          style={{
            backgroundColor: 'var(--status-dirty-bg)',
            border: '1px solid var(--status-dirty-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <WifiOff size={18} color="var(--status-dirty-text)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '12px', color: 'var(--status-dirty-text)', lineHeight: 1.3 }}>
            <strong>Modo sin señal:</strong> Puedes seguir marcando habitaciones. Se guardan en el teléfono y se enviarán a recepción apenas haya Wi-Fi.
          </div>
        </div>
      )}

      {/* Barra de progreso de aseo */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Aseo de Habitaciones
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {dirtyCount > 0
                ? `${dirtyCount} por asear · ${cleaningCount} en proceso`
                : 'Piso al día: no hay habitaciones sucias pendientes'}
            </p>
          </div>
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: dirtyCount > 0 ? 'var(--status-dirty-bg)' : 'var(--status-available-bg)',
              color: dirtyCount > 0 ? 'var(--status-dirty-text)' : 'var(--status-available-text)',
              border: `1px solid ${dirtyCount > 0 ? 'var(--status-dirty-border)' : 'var(--status-available-border)'}`,
              borderRadius: 'var(--radius-xs)',
              fontSize: '12px',
              fontWeight: '700',
            }}
          >
            {dirtyCount} pendientes
          </div>
        </div>
      </div>

      {/* Lista táctil vertical de habitaciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedRooms.map((room) => {
          const isDirty = room.status === 'dirty';
          const isCleaning = room.status === 'cleaning';
          const isAvailable = room.status === 'available';
          const isOccupied = room.status === 'occupied';

          return (
            <div
              key={room.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: isDirty
                  ? '1px solid var(--status-dirty-border)'
                  : isCleaning
                  ? '1px solid var(--border-focus)'
                  : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* Encabezado de la tarjeta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>
                    Piso {room.floor} · {room.type}
                  </span>
                  <div style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                    #{room.number}
                  </div>
                </div>

                <div>
                  {isDirty && <span className="status-pill status-dirty">Sucia / Desocupada</span>}
                  {isCleaning && <span className="status-pill status-cleaning">En Limpieza</span>}
                  {isAvailable && <span className="status-pill status-available">Limpia / Lista</span>}
                  {isOccupied && (
                    <span
                      style={{
                        padding: '2px 7px',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Huésped adentro
                    </span>
                  )}
                </div>
              </div>

              {/* Novedad reportada si existe */}
              {room.notes && (
                <div
                  style={{
                    padding: '8px 10px',
                    backgroundColor: 'rgba(217, 119, 6, 0.1)',
                    borderLeft: '3px solid var(--status-dirty-border)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '12px',
                    color: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <AlertTriangle size={15} color="var(--status-dirty-text)" style={{ flexShrink: 0 }} />
                  <span>{room.notes}</span>
                </div>
              )}

              {/* Acciones principales de campo (1 solo toque grande) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                {isDirty && (
                  <button
                    type="button"
                    onClick={() => handleStartCleaning(room.id)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      backgroundColor: '#1d4ed8',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <Brush size={16} />
                    <span>Comenzar a Limpiar</span>
                  </button>
                )}

                {isCleaning && (
                  <button
                    type="button"
                    onClick={() => handleFinishCleaning(room.id)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '700',
                      backgroundColor: '#047857',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <CheckCircle2 size={17} />
                    <span>¡Limpia y Lista para Recepción!</span>
                  </button>
                )}

                {/* Botón secundario para reportar avería o falta de insumos */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoomForNote(room);
                    setQuickNote(room.notes || '');
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-secondary)',
                    padding: '7px',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  <Wrench size={13} />
                  <span>{room.notes ? 'Modificar aviso a recepción' : 'Aviso a recepción (avería o insumos)'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Reportar Novedad Rápida */}
      {selectedRoomForNote && (
        <div className="modal-overlay" onClick={() => setSelectedRoomForNote(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Aviso a Recepción · Hab #{selectedRoomForNote.number}
              </span>
              <button
                type="button"
                onClick={() => setSelectedRoomForNote(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Toca una opción rápida o escribe el detalle para que el recepcionista lo vea al instante:
              </p>

              {/* Chips rápidos de 1 toque */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
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
                    style={{
                      padding: '5px 9px',
                      fontSize: '11px',
                      backgroundColor: quickNote === preset ? '#1e293b' : 'var(--bg-input)',
                      border: `1px solid ${quickNote === preset ? 'var(--border-focus)' : 'var(--border-medium)'}`,
                      color: quickNote === preset ? '#93c5fd' : 'var(--text-secondary)',
                      borderRadius: 'var(--radius-xs)',
                    }}
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
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
          </div>
        </div>
      )}
    </div>
  );
};
