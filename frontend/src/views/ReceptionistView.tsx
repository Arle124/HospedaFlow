import React, { useState, useEffect } from 'react';
import { db, type Room, type LocalShift } from '../db/db';
import { syncService } from '../services/syncService';
import { eventBus } from '../services/eventBus';
import {
  Lock,
  Unlock,
  UserCheck,
  AlertTriangle,
  Search,
  LogIn,
  LogOut
} from 'lucide-react';

export const ReceptionistView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeShift, setActiveShift] = useState<LocalShift | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modales
  const [showOpenModal, setShowOpenModal] = useState<boolean>(false);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [showCheckInModal, setShowCheckInModal] = useState<Room | null>(null);

  // Form states
  const [initialCashInput, setInitialCashInput] = useState<string>('50000');
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [closeNotesInput, setCloseNotesInput] = useState<string>('');
  const [guestNameInput, setGuestNameInput] = useState<string>('');

  const loadData = async () => {
    const loadedRooms = await db.rooms.toArray();
    setRooms(loadedRooms);

    const openShifts = await db.shifts.where('status').equals('OPEN').toArray();
    setActiveShift(openShifts.length > 0 ? openShifts[0] : null);
  };

  useEffect(() => {
    loadData();

    // Suscripción al bus en caliente: si la aseadora actualiza una habitación, refrescar el rack de inmediato
    const unsubscribe = eventBus.subscribe(() => {
      loadData();
    });

    return () => unsubscribe();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const cash = parseFloat(initialCashInput) || 0;
    const localId = `shift_${Date.now()}`;

    const newShift: LocalShift = {
      id: localId,
      userId: 1, // Recepcionista de turno
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

    eventBus.emit({
      type: 'shift_event',
      title: 'Turno de Caja Abierto',
      message: `Base inicial de $ ${cash.toLocaleString()} registrada.`,
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
      localShiftId: activeShift.id,
      shiftId: activeShift.serverId,
      actual_cash: actual,
      notes: closeNotesInput,
    });

    eventBus.emit({
      type: 'shift_event',
      title: 'Turno de Caja Cerrado',
      message: `Arqueo finalizado: $ ${actual.toLocaleString()} en efectivo (Diferencia: $ ${diff.toLocaleString()}).`,
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

  const handleCheckOut = async (room: Room) => {
    if (!window.confirm(`¿Confirmar Check-out de la Habitación #${room.number}? Pasará a estado SUCIA para personal de aseo.`)) {
      return;
    }

    await db.rooms.update(room.id, {
      status: 'dirty',
      guestName: undefined,
      updatedAt: new Date().toISOString(),
    });

    await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId: room.id,
      status: 'dirty',
    });

    eventBus.emit({
      type: 'room_issue',
      title: `Check-out: Hab #${room.number}`,
      message: `Habitación desocupada. Requiere aseo y desinfección.`,
      roomNumber: room.number,
    });

    loadData();
  };

  // Filtrado y búsqueda
  const filteredRooms = rooms.filter((r) => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesSearch =
      r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.guestName && r.guestName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const availableCount = rooms.filter((r) => r.status === 'available').length;
  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const dirtyCount = rooms.filter((r) => r.status === 'dirty').length;
  const cleaningCount = rooms.filter((r) => r.status === 'cleaning').length;

  return (
    <div className="container-fluid" style={{ paddingBottom: '40px' }}>
      {/* Barra Operativa Superior: Caja y Turno */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: activeShift ? '#10b981' : '#f59e0b',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-secondary)' }}>
              {activeShift ? 'Turno de Caja Activo' : 'Caja Cerrada'}
            </span>
          </div>

          {activeShift && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Fondo Base: </span>
                <span className="tabular-nums" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                  $ {activeShift.initialCash.toLocaleString()}
                </span>
              </div>
              <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-subtle)' }} />
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Efectivo Actual: </span>
                <span className="tabular-nums" style={{ fontWeight: '700', color: '#34d399', fontSize: '14px' }}>
                  $ {activeShift.currentCash.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div>
          {activeShift ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setActualCashInput(activeShift.currentCash.toString());
                setShowCloseModal(true);
              }}
            >
              <Lock size={13} />
              <span>Arqueo y Cierre de Turno</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowOpenModal(true)}
            >
              <Unlock size={13} />
              <span>Abrir Turno de Caja</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda del Rack de Habitaciones */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        {/* Filtros rápidos por estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `Todas (${rooms.length})` },
            { id: 'available', label: `Disponibles (${availableCount})`, color: '#34d399' },
            { id: 'occupied', label: `Ocupadas (${occupiedCount})`, color: '#93c5fd' },
            { id: 'dirty', label: `Por asear (${dirtyCount})`, color: '#fcd34d' },
            { id: 'cleaning', label: `En limpieza (${cleaningCount})`, color: '#67e8f9' },
          ].map((tab) => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                style={{
                  backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                  border: `1px solid ${isActive ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                  color: isActive ? '#f8fafc' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.color && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: tab.color,
                      display: 'inline-block',
                    }}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Buscador rápido de mostrador */}
        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '9px', top: '10px' }} />
          <input
            type="text"
            placeholder="Buscar hab o huésped..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '28px' }}
          />
        </div>
      </div>

      {/* Matriz / Rack de Habitaciones (Grid Compacto de Alto Rendimiento) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '12px',
        }}
      >
        {filteredRooms.map((room) => {
          const isAvailable = room.status === 'available';
          const isOccupied = room.status === 'occupied';
          const isDirty = room.status === 'dirty';
          const isCleaning = room.status === 'cleaning';

          let statusClass = 'status-available';
          let statusLabel = 'Disponible';
          if (isOccupied) {
            statusClass = 'status-occupied';
            statusLabel = 'Ocupada';
          } else if (isDirty) {
            statusClass = 'status-dirty';
            statusLabel = 'Requiere Aseo';
          } else if (isCleaning) {
            statusClass = 'status-cleaning';
            statusLabel = 'En Limpieza';
          }

          return (
            <div
              key={room.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
                position: 'relative',
              }}
            >
              {/* Parte superior de la celda */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="tabular-nums" style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
                    #{room.number}
                  </span>
                  <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Piso {room.floor} · {room.type} · <span className="tabular-nums">${room.price.toLocaleString()}/noche</span>
                </div>

                {/* Huésped actual si está ocupada */}
                {isOccupied && room.guestName && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '5px 8px',
                      backgroundColor: 'rgba(37, 99, 235, 0.1)',
                      borderLeft: '2px solid #2563eb',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      color: '#bfdbfe',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <UserCheck size={12} />
                    <span style={{ fontWeight: '500' }}>{room.guestName}</span>
                  </div>
                )}

                {/* Aviso / Novedad de la aseadora en caliente */}
                {room.notes && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '5px 8px',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      borderLeft: '2px solid var(--status-dirty-border)',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      color: '#fef3c7',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                    }}
                  >
                    <AlertTriangle size={13} color="var(--status-dirty-text)" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{room.notes}</span>
                  </div>
                )}
              </div>

              {/* Botones de acción rápida por habitación */}
              <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                {isAvailable && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: '100%', padding: '6px', fontSize: '12px' }}
                    onClick={() => {
                      if (!activeShift) {
                        alert('Debes abrir un turno de caja antes de registrar un check-in.');
                        return;
                      }
                      setShowCheckInModal(room);
                    }}
                  >
                    <LogIn size={13} />
                    <span>Check-in</span>
                  </button>
                )}

                {isOccupied && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: '100%', padding: '6px', fontSize: '12px', borderColor: '#b91c1c', color: '#fca5a5' }}
                    onClick={() => handleCheckOut(room)}
                  >
                    <LogOut size={13} />
                    <span>Check-out</span>
                  </button>
                )}

                {isDirty && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
                    Aviso enviado a camarera
                  </div>
                )}

                {isCleaning && (
                  <div style={{ fontSize: '11px', color: '#67e8f9', textAlign: 'center', padding: '4px 0' }}>
                    Personal limpiando en piso...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Check-in */}
      {showCheckInModal && (
        <div className="modal-overlay" onClick={() => setShowCheckInModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontSize: '14px', fontWeight: '700' }}>
                Registro de Check-in · Hab #{showCheckInModal.number}
              </span>
              <button
                type="button"
                onClick={() => setShowCheckInModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCheckIn}>
              <div className="modal-body">
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Tipo y Tarifa
                  </span>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    {showCheckInModal.type} — <strong className="tabular-nums">${showCheckInModal.price.toLocaleString()}</strong> por noche
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label htmlFor="guest_name" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Nombre Completo del Huésped *
                  </label>
                  <input
                    id="guest_name"
                    type="text"
                    required
                    autoFocus
                    placeholder="Ej. Carlos Mendoza"
                    value={guestNameInput}
                    onChange={(e) => setGuestNameInput(e.target.value)}
                  />
                </div>

                <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-xs)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Al confirmar, el valor de la noche (${showCheckInModal.price.toLocaleString()}) se sumará automáticamente al efectivo esperado en la caja del turno activo.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCheckInModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <LogIn size={13} />
                  <span>Confirmar e Ingresar a Caja</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Abrir Turno */}
      {showOpenModal && (
        <div className="modal-overlay" onClick={() => setShowOpenModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontSize: '14px', fontWeight: '700' }}>
                Apertura de Turno y Fondo de Caja
              </span>
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpenShift}>
              <div className="modal-body">
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Ingresa el efectivo inicial entregado por administración para cambios e inicio de operaciones.
                </p>

                <div style={{ marginBottom: '14px' }}>
                  <label htmlFor="initial_cash" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Fondo Inicial de Caja ($) *
                  </label>
                  <input
                    id="initial_cash"
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={initialCashInput}
                    onChange={(e) => setInitialCashInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowOpenModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Unlock size={13} />
                  <span>Iniciar Turno</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cerrar Turno y Arqueo */}
      {showCloseModal && activeShift && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontSize: '14px', fontWeight: '700' }}>
                Arqueo y Cierre de Turno
              </span>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloseShift}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fondo Inicial</span>
                    <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: '600' }}>
                      ${activeShift.initialCash.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Esperado en Sistema</span>
                    <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: '700', color: '#60a5fa' }}>
                      ${activeShift.currentCash.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label htmlFor="actual_cash" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Efectivo Real en Caja (Contado Físicamente) *
                  </label>
                  <input
                    id="actual_cash"
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(e.target.value)}
                  />
                </div>

                {/* Cálculo de descuadre en tiempo real */}
                {actualCashInput && (
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-xs)',
                      marginBottom: '12px',
                      fontSize: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor:
                        parseFloat(actualCashInput) - activeShift.currentCash === 0
                          ? 'var(--status-available-bg)'
                          : 'rgba(239, 68, 68, 0.12)',
                      color:
                        parseFloat(actualCashInput) - activeShift.currentCash === 0
                          ? 'var(--status-available-text)'
                          : '#fca5a5',
                      border: `1px solid ${
                        parseFloat(actualCashInput) - activeShift.currentCash === 0
                          ? 'var(--status-available-border)'
                          : '#b91c1c'
                      }`,
                    }}
                  >
                    <span>Diferencia de Arqueo:</span>
                    <strong className="tabular-nums">
                      ${(parseFloat(actualCashInput) - activeShift.currentCash).toLocaleString()}
                      {parseFloat(actualCashInput) - activeShift.currentCash === 0 ? ' (Cuadre Exacto)' : ''}
                    </strong>
                  </div>
                )}

                <div style={{ marginBottom: '6px' }}>
                  <label htmlFor="notes" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Notas de Entrega o Justificación de Descuadre
                  </label>
                  <textarea
                    id="notes"
                    rows={2}
                    placeholder="Observaciones para el administrador..."
                    value={closeNotesInput}
                    onChange={(e) => setCloseNotesInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCloseModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-danger">
                  <Lock size={13} />
                  <span>Cerrar Turno Definitivamente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
