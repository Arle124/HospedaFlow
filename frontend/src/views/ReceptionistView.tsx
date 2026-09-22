import React, { useState, useEffect } from 'react';
import { db, type Room, type LocalShift, type LocalProduct, type CashMovement } from '../db/db';
import { syncService } from '../services/syncService';
import { eventBus } from '../services/eventBus';
import {
  Lock,
  Unlock,
  UserCheck,
  AlertTriangle,
  Search,
  LogIn,
  LogOut,
  ShoppingBag,
  ArrowDownRight,
  CheckCircle2,
  Plus,
  Minus,
  Receipt,
  FileText
} from 'lucide-react';

export const ReceptionistView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeShift, setActiveShift] = useState<LocalShift | null>(null);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [shiftMovements, setShiftMovements] = useState<CashMovement[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modales
  const [showOpenModal, setShowOpenModal] = useState<boolean>(false);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [showCheckInModal, setShowCheckInModal] = useState<Room | null>(null);
  const [showMinibarModal, setShowMinibarModal] = useState<boolean>(false);
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);

  // Form states
  const [initialCashInput, setInitialCashInput] = useState<string>('50000');
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [closeNotesInput, setCloseNotesInput] = useState<string>('');
  const [guestNameInput, setGuestNameInput] = useState<string>('');

  // Minibar form state
  const [minibarQuantities, setMinibarQuantities] = useState<Record<number, number>>({});
  const [minibarDestination, setMinibarDestination] = useState<'cash' | 'room'>('cash');
  const [minibarRoomId, setMinibarRoomId] = useState<string>('');

  // Expense form state
  const [expenseSupplier, setExpenseSupplier] = useState<string>('');
  const [expenseConcept, setExpenseConcept] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>('Insumos y Limpieza');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseReceipt, setExpenseReceipt] = useState<string>('');

  const loadData = async () => {
    const loadedRooms = await db.rooms.toArray();
    setRooms(loadedRooms);

    const openShifts = await db.shifts.where('status').equals('OPEN').toArray();
    const currentShift = openShifts.length > 0 ? openShifts[0] : null;
    setActiveShift(currentShift);

    const prods = await db.inventory.toArray();
    setProducts(prods);

    if (currentShift) {
      const moves = await db.cashMovements.where('shiftId').equals(currentShift.id).toArray();
      setShiftMovements(moves);
    } else {
      setShiftMovements([]);
    }
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
      await db.cashMovements.add({
        id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        shiftId: activeShift.id,
        type: 'INCOME_ROOM',
        amount: showCheckInModal.price,
        concept: `Check-in Hab #${showCheckInModal.number} (${guestNameInput})`,
        roomNumber: showCheckInModal.number,
        createdAt: new Date().toISOString(),
      });
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

  const handleMinibarSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) {
      alert('Debes tener un turno de caja abierto para registrar ventas.');
      return;
    }

    const itemsToSell = Object.entries(minibarQuantities)
      .map(([idStr, qty]) => {
        const prod = products.find((p) => p.id === Number(idStr));
        return { prod, qty };
      })
      .filter((item): item is { prod: LocalProduct; qty: number } => Boolean(item.prod && item.qty > 0));

    if (itemsToSell.length === 0) {
      alert('Selecciona al menos 1 unidad de producto para registrar la venta.');
      return;
    }

    const totalSale = itemsToSell.reduce((acc, { prod, qty }) => acc + prod.price * qty, 0);

    // Descontar inventario local
    for (const { prod, qty } of itemsToSell) {
      const nextStock = Math.max(0, prod.stock - qty);
      await db.inventory.update(prod.id, { stock: nextStock });
    }

    const itemsSummary = itemsToSell.map(({ prod, qty }) => `${qty}x ${prod.name}`).join(', ');
    const targetRoom = rooms.find((r) => r.id === minibarRoomId);
    const roomDetail = targetRoom ? ` · Hab #${targetRoom.number} (${targetRoom.guestName || 'Huésped'})` : '';

    const isCash = minibarDestination === 'cash' || !targetRoom;
    if (isCash) {
      const newCash = activeShift.currentCash + totalSale;
      await db.shifts.update(activeShift.id, { currentCash: newCash });
      setActiveShift({ ...activeShift, currentCash: newCash });
    }

    await db.cashMovements.add({
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      shiftId: activeShift.id,
      type: 'INCOME_MINIBAR',
      amount: totalSale,
      concept: `Venta Minibar: ${itemsSummary}${roomDetail}`,
      roomNumber: targetRoom ? targetRoom.number : undefined,
      createdAt: new Date().toISOString(),
    });

    await syncService.enqueueAction('ADD_TRANSACTION', {
      shiftId: activeShift.id,
      type: 'INCOME_MINIBAR',
      amount: totalSale,
      isCash,
      items: itemsToSell.map((i) => ({ id: i.prod.id, name: i.prod.name, qty: i.qty, price: i.prod.price })),
      roomId: targetRoom ? targetRoom.id : undefined,
    });

    eventBus.emit({
      type: 'shift_event',
      title: 'Venta de Minibar Registrada',
      message: `${isCash ? 'Cobro en efectivo' : 'Cargado a habitación'}: $ ${totalSale.toLocaleString()} (${itemsSummary})`,
    });

    setMinibarQuantities({});
    setMinibarDestination('cash');
    setMinibarRoomId('');
    setShowMinibarModal(false);
    loadData();
  };

  const handleSupplierExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) {
      alert('Debes tener un turno de caja abierto para registrar pagos a proveedores.');
      return;
    }

    const amount = parseFloat(expenseAmount) || 0;
    if (amount <= 0) {
      alert('Por favor ingresa un monto válido.');
      return;
    }

    if (amount > activeShift.currentCash) {
      alert(`El monto a retirar ($ ${amount.toLocaleString()}) supera el efectivo en caja ($ ${activeShift.currentCash.toLocaleString()}).`);
      return;
    }

    const newCash = activeShift.currentCash - amount;
    await db.shifts.update(activeShift.id, { currentCash: newCash });
    setActiveShift({ ...activeShift, currentCash: newCash });

    await db.cashMovements.add({
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      shiftId: activeShift.id,
      type: 'EXPENSE_SUPPLIER',
      amount,
      concept: expenseConcept,
      category: expenseCategory,
      supplier: expenseSupplier,
      receipt: expenseReceipt || undefined,
      createdAt: new Date().toISOString(),
    });

    await syncService.enqueueAction('ADD_TRANSACTION', {
      shiftId: activeShift.id,
      type: 'EXPENSE_SUPPLIER',
      amount,
      supplier: expenseSupplier,
      concept: expenseConcept,
      category: expenseCategory,
      receipt: expenseReceipt,
    });

    eventBus.emit({
      type: 'shift_event',
      title: 'Egreso de Caja: Pago a Proveedor',
      message: `$ ${amount.toLocaleString()} a ${expenseSupplier} (${expenseConcept}). Descontado de caja.`,
    });

    setExpenseSupplier('');
    setExpenseConcept('');
    setExpenseCategory('Insumos y Limpieza');
    setExpenseAmount('');
    setExpenseReceipt('');
    setShowExpenseModal(false);
    loadData();
  };

  const handleClearRoomNotes = async (room: Room) => {
    if (!window.confirm(`¿Confirmar que la novedad en la Hab #${room.number} ya fue atendida?`)) {
      return;
    }

    await db.rooms.update(room.id, {
      notes: undefined,
      updatedAt: new Date().toISOString(),
    });

    await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId: room.id,
      notes: '',
    });

    eventBus.emit({
      type: 'room_issue',
      title: `Aviso Atendido: Hab #${room.number}`,
      message: `Recepción confirmó la atención de la novedad.`,
      roomNumber: room.number,
    });

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
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied');

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
                backgroundColor: activeShift ? 'var(--status-available-text)' : 'var(--status-dirty-text)',
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
                <span className="tabular-nums" style={{ fontWeight: '700', color: 'var(--status-available-text)', fontSize: '14px' }}>
                  $ {activeShift.currentCash.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {activeShift && (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowMinibarModal(true)}
                title="Vender o cargar consumibles del minibar"
              >
                <ShoppingBag size={13} color="var(--border-focus)" />
                <span>Venta Minibar</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowExpenseModal(true)}
                title="Registrar pago a proveedor y descontar de caja"
              >
                <ArrowDownRight size={13} color="var(--status-maintenance-text)" />
                <span>Pago a Proveedor</span>
              </button>
            </>
          )}

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
              <span>Arqueo y Cierre</span>
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
            { id: 'available', label: `Disponibles (${availableCount})`, color: 'var(--status-available-border)' },
            { id: 'occupied', label: `Ocupadas (${occupiedCount})`, color: 'var(--status-occupied-border)' },
            { id: 'dirty', label: `Por asear (${dirtyCount})`, color: 'var(--status-dirty-border)' },
            { id: 'cleaning', label: `En limpieza (${cleaningCount})`, color: 'var(--status-cleaning-border)' },
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
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
          width: '100%',
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
                      backgroundColor: 'var(--status-occupied-bg)',
                      borderLeft: '2px solid var(--border-focus)',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      color: 'var(--status-occupied-text)',
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
                      backgroundColor: 'var(--status-dirty-bg)',
                      borderLeft: '2px solid var(--status-dirty-border)',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      color: 'var(--status-dirty-text)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <AlertTriangle size={13} color="var(--status-dirty-text)" style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span>{room.notes}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleClearRoomNotes(room)}
                      title="Marcar aviso como atendido y quitarlo"
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--status-dirty-border)',
                        color: 'var(--status-dirty-text)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '1px 6px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <CheckCircle2 size={10} />
                      <span>Resolver</span>
                    </button>
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
                    style={{
                      width: '100%',
                      padding: '6px',
                      fontSize: '12px',
                      borderColor: 'var(--status-maintenance-border)',
                      color: 'var(--status-maintenance-text)',
                    }}
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
                  <div style={{ fontSize: '11px', color: 'var(--status-cleaning-text)', textAlign: 'center', padding: '4px 0', fontWeight: '500' }}>
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
                {/* Desglose Financiero del Turno */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '10px 12px',
                    marginBottom: '14px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={13} color="var(--border-focus)" />
                    <span>Auditoría Financiera del Turno</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Fondo base inicial:</span>
                    <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>${activeShift.initialCash.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>(+) Check-in de habitaciones:</span>
                    <span className="tabular-nums" style={{ color: 'var(--status-available-text)' }}>
                      +${shiftMovements.filter((m) => m.type === 'INCOME_ROOM').reduce((acc, m) => acc + m.amount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>(+) Ventas de minibar:</span>
                    <span className="tabular-nums" style={{ color: 'var(--status-available-text)' }}>
                      +${shiftMovements.filter((m) => m.type === 'INCOME_MINIBAR').reduce((acc, m) => acc + m.amount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>(-) Pagos a proveedores / egresos:</span>
                    <span className="tabular-nums" style={{ color: 'var(--status-maintenance-text)' }}>
                      -${shiftMovements.filter((m) => m.type === 'EXPENSE_SUPPLIER').reduce((acc, m) => acc + m.amount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '5px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>Saldo Esperado en Sistema:</span>
                    <span className="tabular-nums" style={{ color: 'var(--status-occupied-text)' }}>${activeShift.currentCash.toLocaleString()}</span>
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
                          : 'var(--status-maintenance-bg)',
                      color:
                        parseFloat(actualCashInput) - activeShift.currentCash === 0
                          ? 'var(--status-available-text)'
                          : 'var(--status-maintenance-text)',
                      border: `1px solid ${
                        parseFloat(actualCashInput) - activeShift.currentCash === 0
                          ? 'var(--status-available-border)'
                          : 'var(--status-maintenance-border)'
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

      {/* Modal: Venta de Minibar / Consumibles */}
      {showMinibarModal && activeShift && (
        <div className="modal-overlay" onClick={() => setShowMinibarModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={16} color="var(--border-focus)" />
                <span style={{ fontSize: '14px', fontWeight: '700' }}>
                  Venta de Minibar y Consumibles
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMinibarModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMinibarSale}>
              <div className="modal-body">
                {/* Catálogo de Productos y Selector de Cantidad */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
                    Catálogo de Productos
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                    {products.map((p) => {
                      const qty = minibarQuantities[p.id] || 0;
                      const isLowStock = p.stock <= p.minStock;

                      return (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-xs)',
                            gap: '8px',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                              <span>${p.price.toLocaleString()} c/u</span>
                              <span>·</span>
                              <span style={{ color: isLowStock ? 'var(--status-dirty-text)' : 'var(--text-muted)' }}>
                                Stock: {p.stock} {isLowStock ? '(Bajo)' : ''}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              disabled={qty <= 0}
                              onClick={() => setMinibarQuantities((prev) => ({ ...prev, [p.id]: Math.max(0, qty - 1) }))}
                              style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Minus size={12} />
                            </button>
                            <span className="tabular-nums" style={{ minWidth: '22px', textAlign: 'center', fontWeight: '700', fontSize: '13px' }}>
                              {qty}
                            </span>
                            <button
                              type="button"
                              className="btn-secondary"
                              disabled={qty >= p.stock}
                              onClick={() => setMinibarQuantities((prev) => ({ ...prev, [p.id]: Math.min(p.stock, qty + 1) }))}
                              style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Destino del Cobro */}
                <div style={{ marginBottom: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    Destino del Cobro
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setMinibarDestination('cash')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        fontSize: '12px',
                        fontWeight: minibarDestination === 'cash' ? 600 : 400,
                        backgroundColor: minibarDestination === 'cash' ? 'var(--status-available-bg)' : 'var(--bg-input)',
                        color: minibarDestination === 'cash' ? 'var(--status-available-text)' : 'var(--text-secondary)',
                        border: `1px solid ${minibarDestination === 'cash' ? 'var(--status-available-border)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-xs)',
                        cursor: 'pointer',
                      }}
                    >
                      Efectivo en Caja (Ingreso Directo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMinibarDestination('room')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        fontSize: '12px',
                        fontWeight: minibarDestination === 'room' ? 600 : 400,
                        backgroundColor: minibarDestination === 'room' ? 'var(--status-occupied-bg)' : 'var(--bg-input)',
                        color: minibarDestination === 'room' ? 'var(--status-occupied-text)' : 'var(--text-secondary)',
                        border: `1px solid ${minibarDestination === 'room' ? 'var(--status-occupied-border)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-xs)',
                        cursor: 'pointer',
                      }}
                    >
                      Cargar a Habitación
                    </button>
                  </div>

                  {minibarDestination === 'room' && (
                    <div>
                      <label htmlFor="minibar_room_select" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Selecciona la Habitación Ocupada *
                      </label>
                      <select
                        id="minibar_room_select"
                        value={minibarRoomId}
                        onChange={(e) => setMinibarRoomId(e.target.value)}
                        required={minibarDestination === 'room'}
                      >
                        <option value="">Seleccione una habitación...</option>
                        {occupiedRooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            Hab #{r.number} - {r.guestName || 'Sin nombre'} (Piso {r.floor})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Subtotal */}
                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total a Facturar:</span>
                  <span className="tabular-nums" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    $ {Object.entries(minibarQuantities)
                      .reduce((acc, [idStr, qty]) => {
                        const p = products.find((prod) => prod.id === Number(idStr));
                        return acc + (p ? p.price * qty : 0);
                      }, 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowMinibarModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    Object.values(minibarQuantities).reduce((a, b) => a + b, 0) === 0 ||
                    (minibarDestination === 'room' && !minibarRoomId)
                  }
                >
                  <ShoppingBag size={13} />
                  <span>Confirmar Venta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registro de Gasto / Pago a Proveedor */}
      {showExpenseModal && activeShift && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowDownRight size={16} color="var(--status-maintenance-text)" />
                <span style={{ fontSize: '14px', fontWeight: '700' }}>
                  Pago a Proveedor / Egreso de Caja
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSupplierExpense}>
              <div className="modal-body">
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Registra compras, facturas de insumos o pagos a proveedores. El valor se restará del efectivo esperado en el turno.
                </p>

                <div style={{ marginBottom: '12px' }}>
                  <label htmlFor="expense_supplier" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Proveedor o Beneficiario *
                  </label>
                  <input
                    id="expense_supplier"
                    type="text"
                    required
                    placeholder="Ej. Lavandería Central, Distribuidora El Sol"
                    value={expenseSupplier}
                    onChange={(e) => setExpenseSupplier(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label htmlFor="expense_category" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Categoría del Gasto *
                    </label>
                    <select
                      id="expense_category"
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                    >
                      <option value="Insumos y Limpieza">Insumos y Limpieza</option>
                      <option value="Lavandería">Lavandería</option>
                      <option value="Mantenimiento y Reparación">Mantenimiento y Reparación</option>
                      <option value="Bebidas y Alimentos">Bebidas y Alimentos</option>
                      <option value="Servicios y Varios">Servicios y Varios</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="expense_receipt" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Nº Recibo o Factura (Opcional)
                    </label>
                    <input
                      id="expense_receipt"
                      type="text"
                      placeholder="Ej. FACT-2031 / Vale 05"
                      value={expenseReceipt}
                      onChange={(e) => setExpenseReceipt(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label htmlFor="expense_concept" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Concepto o Descripción del Pedido *
                  </label>
                  <textarea
                    id="expense_concept"
                    rows={2}
                    required
                    placeholder="Detalle de los productos recibidos o servicio prestado..."
                    value={expenseConcept}
                    onChange={(e) => setExpenseConcept(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label htmlFor="expense_amount" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Monto a Retirar de Caja ($) *
                  </label>
                  <input
                    id="expense_amount"
                    type="number"
                    min="1"
                    max={activeShift.currentCash}
                    step="500"
                    required
                    placeholder="0"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                  />
                </div>

                {/* Validaciones de saldo en tiempo real */}
                <div
                  style={{
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Efectivo disponible en turno:</span>
                    <span className="tabular-nums" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      ${activeShift.currentCash.toLocaleString()}
                    </span>
                  </div>
                  {expenseAmount && parseFloat(expenseAmount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: parseFloat(expenseAmount) > activeShift.currentCash ? 'var(--status-maintenance-text)' : 'var(--text-secondary)' }}>
                      <span>Saldo resultante tras el pago:</span>
                      <span className="tabular-nums" style={{ fontWeight: '700' }}>
                        ${Math.max(0, activeShift.currentCash - parseFloat(expenseAmount)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowExpenseModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-danger"
                  disabled={!expenseAmount || parseFloat(expenseAmount) <= 0 || parseFloat(expenseAmount) > activeShift.currentCash}
                >
                  <Receipt size={13} />
                  <span>Descontar de Caja y Pagar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
