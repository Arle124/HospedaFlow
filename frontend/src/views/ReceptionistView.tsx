import React, { useState, useEffect } from 'react';
import { db, type Room, type LocalShift, type RoomStatus } from '../db/db';
import { syncService } from '../services/syncService';
import {
  DollarSign,
  Lock,
  Unlock,
  BedDouble,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Brush
} from 'lucide-react';

export const ReceptionistView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeShift, setActiveShift] = useState<LocalShift | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modales
  const [showOpenModal, setShowOpenModal] = useState<boolean>(false);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [showCheckInModal, setShowCheckInModal] = useState<Room | null>(null);

  // Form states
  const [initialCashInput, setInitialCashInput] = useState<string>('50000');
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [closeNotesInput, setCloseNotesInput] = useState<string>('');
  const [guestNameInput, setGuestNameInput] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedRooms = await db.rooms.toArray();
    setRooms(loadedRooms);

    const openShifts = await db.shifts.where('status').equals('OPEN').toArray();
    setActiveShift(openShifts.length > 0 ? openShifts[0] : null);
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const cash = parseFloat(initialCashInput) || 0;
    const localId = `shift_${Date.now()}`;

    const newShift: LocalShift = {
      id: localId,
      userId: 1, // Recepcionista actual
      initialCash: cash,
      currentCash: cash,
      status: 'OPEN',
      startedAt: new Date().toISOString(),
      isSynced: false,
    };

    await db.shifts.add(newShift);
    await syncService.enqueueAction('OPEN_SHIFT', {
      localId,
      user_id: 1,
      initial_cash: cash,
    });

    setActiveShift(newShift);
    setShowOpenModal(false);
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    const actual = parseFloat(actualCashInput) || 0;
    const diff = actual - activeShift.currentCash;
    const now = new Date().toISOString();

    await db.shifts.update(activeShift.id, {
      actualCash: actual,
      difference: diff,
      status: 'CLOSED',
      notes: closeNotesInput,
      endedAt: now,
    });

    await syncService.enqueueAction('CLOSE_SHIFT', {
      shiftId: activeShift.serverId || activeShift.id,
      actual_cash: actual,
      notes: closeNotesInput,
    });

    setActiveShift(null);
    setShowCloseModal(false);
    setActualCashInput('');
    setCloseNotesInput('');
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCheckInModal) return;

    await db.rooms.update(showCheckInModal.id, {
      status: 'occupied',
      guestName: guestNameInput,
      updatedAt: new Date().toISOString(),
    });

    // Sumar el cobro al turno de caja si está abierto
    if (activeShift) {
      const newCash = activeShift.currentCash + showCheckInModal.price;
      await db.shifts.update(activeShift.id, { currentCash: newCash });
      setActiveShift({ ...activeShift, currentCash: newCash });
    }

    await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId: showCheckInModal.id,
      status: 'occupied',
      guestName: guestNameInput,
    });

    setShowCheckInModal(null);
    setGuestNameInput('');
    loadData();
  };

  const handleStatusChange = async (roomId: string, newStatus: RoomStatus) => {
    await db.rooms.update(roomId, {
      status: newStatus,
      guestName: newStatus === 'available' || newStatus === 'dirty' ? '' : undefined,
      updatedAt: new Date().toISOString(),
    });

    await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId,
      status: newStatus,
    });

    loadData();
  };

  const filteredRooms = rooms.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case 'available':
        return <span className="badge badge-success"><CheckCircle2 size={12} /> Disponible</span>;
      case 'occupied':
        return <span className="badge badge-info"><UserCheck size={12} /> Ocupada</span>;
      case 'dirty':
        return <span className="badge badge-warning"><AlertCircle size={12} /> Sucia</span>;
      case 'cleaning':
        return <span className="badge badge-warning"><Brush size={12} /> En Limpieza</span>;
      case 'maintenance':
        return <span className="badge badge-danger"><AlertCircle size={12} /> Mantenimiento</span>;
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '40px' }}>
      {/* Panel Superior: Control de Turno y Caja */}
      <section style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <DollarSign size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Caja y Turno de Recepción</h2>
              {activeShift ? (
                <span className="badge badge-success">Turno Abierto</span>
              ) : (
                <span className="badge badge-danger">Turno Cerrado</span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {activeShift
                ? `Iniciado a las ${new Date(activeShift.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'No hay turno activo en esta estación de trabajo'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {activeShift && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Efectivo Actual en Caja</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)' }}>
                  ${activeShift.currentCash.toLocaleString('es-CO')}
                </div>
              </div>
            )}

            {activeShift ? (
              <button
                onClick={() => setShowCloseModal(true)}
                style={{
                  backgroundColor: 'var(--danger)',
                  color: '#fff',
                  padding: '10px 18px',
                  fontSize: '14px'
                }}
              >
                <Lock size={16} />
                <span>Cerrar Turno y Arqueo</span>
              </button>
            ) : (
              <button
                onClick={() => setShowOpenModal(true)}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  padding: '10px 18px',
                  fontSize: '14px'
                }}
              >
                <Unlock size={16} />
                <span>Abrir Turno de Recepción</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Barra de Filtros de Habitaciones */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BedDouble size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Tablero de Habitaciones</h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>({rooms.length} totales)</span>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'Todas' },
            { key: 'available', label: 'Disponibles' },
            { key: 'occupied', label: 'Ocupadas' },
            { key: 'dirty', label: 'Por Limpiar' },
            { key: 'cleaning', label: 'En Limpieza' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                backgroundColor: filterStatus === tab.key ? 'var(--border-highlight)' : 'var(--bg-card)',
                color: filterStatus === tab.key ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border-color)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Habitaciones */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '16px'
      }}>
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                    Piso {room.floor} · {room.type}
                  </span>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)' }}>
                    #{room.number}
                  </div>
                </div>
                {getStatusBadge(room.status)}
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Tarifa: <strong style={{ color: 'var(--text-main)' }}>${room.price.toLocaleString('es-CO')}</strong>/noche
              </div>

              {room.guestName && (
                <div style={{
                  marginTop: '8px',
                  padding: '6px 10px',
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px'
                }}>
                  👤 Huésped: <strong>{room.guestName}</strong>
                </div>
              )}

              {room.notes && (
                <div style={{
                  marginTop: '6px',
                  fontSize: '11px',
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <AlertCircle size={12} /> {room.notes}
                </div>
              )}
            </div>

            {/* Acciones por Habitación */}
            <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              {room.status === 'available' && (
                <button
                  onClick={() => setShowCheckInModal(room)}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    padding: '8px',
                    fontSize: '13px'
                  }}
                >
                  <UserCheck size={15} />
                  <span>Check-in</span>
                </button>
              )}

              {room.status === 'occupied' && (
                <button
                  onClick={() => handleStatusChange(room.id, 'dirty')}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--warning)',
                    color: '#000',
                    padding: '8px',
                    fontSize: '13px'
                  }}
                >
                  <Clock size={15} />
                  <span>Check-out (Salida)</span>
                </button>
              )}

              {room.status === 'dirty' && (
                <button
                  onClick={() => handleStatusChange(room.id, 'cleaning')}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '8px',
                    fontSize: '13px'
                  }}
                >
                  <Brush size={15} />
                  <span>Avisar a Limpieza</span>
                </button>
              )}

              {room.status === 'cleaning' && (
                <button
                  onClick={() => handleStatusChange(room.id, 'available')}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--success)',
                    color: '#fff',
                    padding: '8px',
                    fontSize: '13px'
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Marcar Disponible</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Abrir Turno */}
      {showOpenModal && (
        <div className="modal-backdrop" onClick={() => setShowOpenModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Abrir Nuevo Turno</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Ingresa el monto de base en efectivo con el que se inicia la caja física de recepción.
            </p>
            <form onSubmit={handleOpenShift}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Efectivo Inicial en Caja (COP)
                </label>
                <input
                  type="number"
                  required
                  style={{ width: '100%' }}
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                  placeholder="Ej. 100000"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  style={{ padding: '8px 14px', backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', backgroundColor: 'var(--primary)', color: '#fff' }}
                >
                  Confirmar Apertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cerrar Turno y Arqueo */}
      {showCloseModal && activeShift && (
        <div className="modal-backdrop" onClick={() => setShowCloseModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Arqueo y Cierre de Turno</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              El sistema esperaba <strong>${activeShift.currentCash.toLocaleString('es-CO')}</strong> en caja. Ingresa el dinero real contado físicamente.
            </p>
            <form onSubmit={handleCloseShift}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Dinero Real en Caja Física (COP)
                </label>
                <input
                  type="number"
                  required
                  style={{ width: '100%' }}
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  placeholder="Total contado"
                />
              </div>

              {actualCashInput !== '' && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '14px',
                  backgroundColor:
                    parseFloat(actualCashInput) - activeShift.currentCash === 0
                      ? 'var(--success-bg)'
                      : 'var(--danger-bg)',
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>Diferencia de Cuadre:</span>
                  <strong>
                    ${(parseFloat(actualCashInput) - activeShift.currentCash).toLocaleString('es-CO')}
                  </strong>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Notas de Entrega / Justificación
                </label>
                <textarea
                  rows={2}
                  style={{ width: '100%' }}
                  value={closeNotesInput}
                  onChange={(e) => setCloseNotesInput(e.target.value)}
                  placeholder="Observaciones de caja o novedades de turno..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  style={{ padding: '8px 14px', backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', backgroundColor: 'var(--danger)', color: '#fff' }}
                >
                  Cerrar Turno Definitivamente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Check-In */}
      {showCheckInModal && (
        <div className="modal-backdrop" onClick={() => setShowCheckInModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              Check-in Habitación #{showCheckInModal.number}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Tarifa a cobrar: <strong>${showCheckInModal.price.toLocaleString('es-CO')}</strong>
            </p>
            <form onSubmit={handleCheckIn}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Nombre Completo del Huésped
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  style={{ width: '100%' }}
                  value={guestNameInput}
                  onChange={(e) => setGuestNameInput(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(null)}
                  style={{ padding: '8px 14px', backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', backgroundColor: 'var(--primary)', color: '#fff' }}
                >
                  Registrar Entrada y Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
