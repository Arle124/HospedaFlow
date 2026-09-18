import React, { useState, useEffect } from 'react';
import { db, type Room } from '../db/db';
import { syncService } from '../services/syncService';
import {
  Sparkles,
  CheckCircle2,
  Brush,
  AlertTriangle,
  Send,
  WifiOff
} from 'lucide-react';

export const HousekeeperView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomForNote, setSelectedRoomForNote] = useState<Room | null>(null);
  const [quickNote, setQuickNote] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(syncService.getOnlineStatus());

  useEffect(() => {
    loadRooms();
    const unsub = syncService.subscribeOnlineStatus(setIsOnline);
    return () => unsub();
  }, []);

  const loadRooms = async () => {
    const loaded = await db.rooms.toArray();
    setRooms(loaded);
  };

  const handleStartCleaning = async (roomId: string) => {
    await db.rooms.update(roomId, {
      status: 'cleaning',
      updatedAt: new Date().toISOString(),
    });
    await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId,
      status: 'cleaning',
    });
    loadRooms();
  };

  const handleFinishCleaning = async (roomId: string) => {
    await db.rooms.update(roomId, {
      status: 'available',
      notes: undefined, // Limpiar novedades resueltas
      updatedAt: new Date().toISOString(),
    });
    await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId,
      status: 'available',
    });
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

    setSelectedRoomForNote(null);
    setQuickNote('');
    loadRooms();
  };

  // Priorizar habitaciones que necesitan atención (sucias o en limpieza)
  const sortedRooms = [...rooms].sort((a, b) => {
    const order: Record<string, number> = { dirty: 1, cleaning: 2, maintenance: 3, available: 4, occupied: 5 };
    return (order[a.status] || 99) - (order[b.status] || 99);
  });

  const pendingCount = rooms.filter((r) => r.status === 'dirty' || r.status === 'cleaning').length;

  return (
    <div className="container" style={{ maxWidth: '600px', paddingBottom: '60px' }}>
      {/* Alerta si está sin internet */}
      {!isOnline && (
        <div style={{
          backgroundColor: 'var(--warning-bg)',
          border: '1px solid var(--warning)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <WifiOff size={22} color="var(--warning)" />
          <div style={{ fontSize: '13px', lineHeight: 1.3 }}>
            <strong>Modo Sin Señal:</strong> Puedes seguir marcando habitaciones. Todo se guarda seguro en tu teléfono y se avisará a recepción apenas tengas Wi-Fi.
          </div>
        </div>
      )}

      {/* Encabezado Housekeeping */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        marginBottom: '18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--warning)" />
            Aseo y Habitaciones
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {pendingCount > 0
              ? `Tienes ${pendingCount} habitaciones pendientes de aseo.`
              : '¡Todo el hotel se encuentra al día y limpio! 🎉'}
          </p>
        </div>
      </div>

      {/* Lista vertical de tarjetas grandes para tocar fácil */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {sortedRooms.map((room) => {
          const isDirty = room.status === 'dirty';
          const isCleaning = room.status === 'cleaning';
          const isAvailable = room.status === 'available';
          const isOccupied = room.status === 'occupied';

          return (
            <div
              key={room.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: isDirty
                  ? '2px solid var(--warning)'
                  : isCleaning
                  ? '2px solid var(--primary)'
                  : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              {/* Header de la tarjeta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                    Piso {room.floor} · {room.type}
                  </span>
                  <div style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px' }}>
                    Hab #{room.number}
                  </div>
                </div>

                <div>
                  {isDirty && <span className="badge badge-warning" style={{ fontSize: '13px', padding: '6px 12px' }}>Requiere Aseo</span>}
                  {isCleaning && <span className="badge badge-info" style={{ fontSize: '13px', padding: '6px 12px' }}>En Limpieza</span>}
                  {isAvailable && <span className="badge badge-success" style={{ fontSize: '13px', padding: '6px 12px' }}>Limpia / Libre</span>}
                  {isOccupied && <span className="badge" style={{ backgroundColor: '#334155', color: '#cbd5e1' }}>Huésped adentro</span>}
                </div>
              </div>

              {/* Novedades o notas */}
              {room.notes && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-input)',
                  borderLeft: '4px solid var(--warning)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} color="var(--warning)" />
                  <span>{room.notes}</span>
                </div>
              )}

              {/* Botones de acción táctiles grandes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isDirty && (
                  <button
                    onClick={() => handleStartCleaning(room.id)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '700',
                      backgroundColor: 'var(--primary)',
                      color: '#fff',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <Brush size={20} />
                    <span>Comenzar a Limpiar</span>
                  </button>
                )}

                {isCleaning && (
                  <button
                    onClick={() => handleFinishCleaning(room.id)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '700',
                      backgroundColor: 'var(--success)',
                      color: '#fff',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <CheckCircle2 size={20} />
                    <span>¡Lista y Limpia para Huésped!</span>
                  </button>
                )}

                {/* Botón secundario para reportar novedad */}
                <button
                  onClick={() => {
                    setSelectedRoomForNote(room);
                    setQuickNote(room.notes || '');
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    padding: '10px',
                    fontSize: '13px'
                  }}
                >
                  <AlertTriangle size={15} />
                  <span>{room.notes ? 'Editar novedad' : 'Reportar daño o falta de insumos'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Reportar Novedad */}
      {selectedRoomForNote && (
        <div className="modal-backdrop" onClick={() => setSelectedRoomForNote(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              Novedad en Habitación #{selectedRoomForNote.number}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Selecciona o escribe una nota para que recepción esté enterada.
            </p>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {['Faltan toallas', 'Cama requiere cambio', 'Bombillo fundido', 'Falta jabón', 'Llave con problemas'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuickNote(preset)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveNote}>
              <textarea
                rows={3}
                style={{ width: '100%', marginBottom: '16px' }}
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Escribe el detalle aquí..."
                required
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedRoomForNote(null)}
                  style={{ padding: '8px 14px', backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', backgroundColor: 'var(--primary)', color: '#fff' }}
                >
                  <Send size={15} />
                  <span>Guardar Novedad</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
