import React, { useState, useEffect } from 'react';
import { db, type Room, type RoomConsumption, type LocalShift, type LocalProduct, type CashMovement } from '../db/db';
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
  FileText,
  Users,
  Eye,
  DollarSign
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
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<Room | null>(null);
  const [showCheckOutModal, setShowCheckOutModal] = useState<Room | null>(null);

  // Form states
  const [initialCashInput, setInitialCashInput] = useState<string>('50000');
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [closeNotesInput, setCloseNotesInput] = useState<string>('');
  const [guestNameInput, setGuestNameInput] = useState<string>('');
  const [guestsCountInput, setGuestsCountInput] = useState<number>(1);
  const [checkInPaymentOption, setCheckInPaymentOption] = useState<'PENDING' | 'PAID'>('PENDING');

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

    const isPaidNow = checkInPaymentOption === 'PAID';
    const guests = Math.max(1, Number(guestsCountInput) || 1);

    await db.rooms.update(showCheckInModal.id, {
      status: 'occupied',
      guestName: guestNameInput,
      guestsCount: guests,
      paymentStatus: isPaidNow ? 'PAID' : 'PENDING',
      paidAmount: isPaidNow ? showCheckInModal.price : 0,
      consumptions: [],
      updatedAt: new Date().toISOString(),
    });

    // Si el huésped paga de una vez en Check-in, sumar a caja
    if (isPaidNow && activeShift) {
      const newCash = activeShift.currentCash + showCheckInModal.price;
      await db.shifts.update(activeShift.id, { currentCash: newCash });
      await db.cashMovements.add({
        id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        shiftId: activeShift.id,
        type: 'INCOME_ROOM',
        amount: showCheckInModal.price,
        concept: `Check-in Hab #${showCheckInModal.number} (${guestNameInput} - ${guests} pers.)`,
        roomNumber: showCheckInModal.number,
        createdAt: new Date().toISOString(),
      });
      setActiveShift({ ...activeShift, currentCash: newCash });
    }

    await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId: showCheckInModal.id,
      status: 'occupied',
      guestName: guestNameInput,
      guestsCount: guests,
      paymentStatus: isPaidNow ? 'PAID' : 'PENDING',
    });

    eventBus.emit({
      type: 'shift_event',
      title: `Check-in: Hab #${showCheckInModal.number}`,
      message: `${guestNameInput} (${guests} ${guests === 1 ? 'persona' : 'personas'}). ${isPaidNow ? 'Pagado en check-in.' : 'Pago pendiente al check-out.'}`,
      roomNumber: showCheckInModal.number,
    });

    setShowCheckInModal(null);
    setGuestNameInput('');
    setGuestsCountInput(1);
    setCheckInPaymentOption('PENDING');
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

    const isCash = minibarDestination === 'cash' || !targetRoom;
    if (isCash) {
      const newCash = activeShift.currentCash + totalSale;
      await db.shifts.update(activeShift.id, { currentCash: newCash });
      setActiveShift({ ...activeShift, currentCash: newCash });

      await db.cashMovements.add({
        id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        shiftId: activeShift.id,
        type: 'INCOME_MINIBAR',
        amount: totalSale,
        concept: `Venta Minibar (Efectivo): ${itemsSummary}`,
        createdAt: new Date().toISOString(),
      });
    } else if (targetRoom) {
      // Cargar directamente a la cuenta de la habitación
      const newConsumptions: RoomConsumption[] = itemsToSell.map(({ prod, qty }) => ({
        id: `cons_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        productId: prod.id,
        productName: prod.name,
        unitPrice: prod.price,
        quantity: qty,
        total: prod.price * qty,
        createdAt: new Date().toISOString(),
      }));

      const existingConsumptions = targetRoom.consumptions || [];
      const updatedList = [...existingConsumptions, ...newConsumptions];

      await db.rooms.update(targetRoom.id, {
        consumptions: updatedList,
        updatedAt: new Date().toISOString(),
      });

      if (selectedRoomDetail && selectedRoomDetail.id === targetRoom.id) {
        setSelectedRoomDetail({ ...targetRoom, consumptions: updatedList });
      }
    }

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
      message: `${isCash ? 'Cobro en efectivo ingresado a caja' : `Cargado a Hab #${targetRoom?.number}`}: $ ${totalSale.toLocaleString()} (${itemsSummary})`,
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

  const handleConfirmCheckOut = async (room: Room) => {
    const roomCharge = room.paymentStatus === 'PAID' ? 0 : room.price;
    const minibarTotal = (room.consumptions || []).reduce((acc, c) => acc + c.total, 0);
    const totalToCollect = roomCharge + minibarTotal;

    if (totalToCollect > 0 && !activeShift) {
      alert('Debes tener un turno de caja abierto para cobrar la liquidación del check-out.');
      return;
    }

    // Si hay saldo pendiente por cobrar, ingresarlo a caja
    if (totalToCollect > 0 && activeShift) {
      const newCash = activeShift.currentCash + totalToCollect;
      await db.shifts.update(activeShift.id, { currentCash: newCash });

      const breakdownParts: string[] = [];
      if (roomCharge > 0) breakdownParts.push(`Hospedaje: $${roomCharge.toLocaleString()}`);
      if (minibarTotal > 0) breakdownParts.push(`Minibar: $${minibarTotal.toLocaleString()}`);

      await db.cashMovements.add({
        id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        shiftId: activeShift.id,
        type: 'INCOME_ROOM',
        amount: totalToCollect,
        concept: `Check-out Hab #${room.number} (${room.guestName || 'Huésped'}) · ${breakdownParts.join(' + ')}`,
        roomNumber: room.number,
        createdAt: new Date().toISOString(),
      });

      setActiveShift({ ...activeShift, currentCash: newCash });
    }

    await db.rooms.update(room.id, {
      status: 'dirty',
      guestName: undefined,
      guestsCount: undefined,
      paymentStatus: undefined,
      paidAmount: undefined,
      consumptions: [],
      updatedAt: new Date().toISOString(),
    });

    await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId: room.id,
      status: 'dirty',
    });

    eventBus.emit({
      type: 'room_issue',
      title: `Check-out: Hab #${room.number}`,
      message: `Habitación desocupada. Liquidado: $ ${totalToCollect.toLocaleString()}. Pasa a personal de aseo.`,
      roomNumber: room.number,
    });

    setShowCheckOutModal(null);
    if (selectedRoomDetail && selectedRoomDetail.id === room.id) {
      setSelectedRoomDetail(null);
    }
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

          const consumptions = room.consumptions || [];
          const minibarTotal = consumptions.reduce((acc, c) => acc + c.total, 0);
          const roomCharge = room.paymentStatus === 'PAID' ? 0 : room.price;
          const totalDue = isOccupied ? (roomCharge + minibarTotal) : 0;

          return (
            <div
              key={room.id}
              onClick={() => setSelectedRoomDetail(room)}
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
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-medium)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
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

                {/* Huésped actual y estado de cuenta si está ocupada */}
                {isOccupied && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Huésped y número de personas */}
                    <div
                      style={{
                        padding: '6px 8px',
                        backgroundColor: 'var(--status-occupied-bg)',
                        borderLeft: '2px solid var(--border-focus)',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '11px',
                        color: 'var(--status-occupied-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <UserCheck size={12} style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {room.guestName || 'Huésped Registrado'}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontWeight: '600',
                          opacity: 0.9,
                          flexShrink: 0,
                        }}
                      >
                        <Users size={10} />
                        <span>{room.guestsCount || 1}</span>
                      </span>
                    </div>

                    {/* Etiquetas de estado de cobro */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {room.paymentStatus === 'PAID' ? (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: 'var(--status-available-bg)',
                            color: 'var(--status-available-text)',
                            border: '1px solid var(--status-available-border)',
                            fontWeight: '600',
                          }}
                        >
                          Hospedaje Pagado
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: 'var(--status-dirty-bg)',
                            color: 'var(--status-dirty-text)',
                            border: '1px solid var(--status-dirty-border)',
                            fontWeight: '600',
                          }}
                        >
                          Debe Habitación: ${room.price.toLocaleString()}
                        </span>
                      )}

                      {minibarTotal > 0 && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: 'var(--status-occupied-bg)',
                            color: 'var(--status-occupied-text)',
                            border: '1px solid var(--border-subtle)',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <ShoppingBag size={10} />
                          <span>${minibarTotal.toLocaleString()}</span>
                        </span>
                      )}
                    </div>

                    {/* Resumen saldo pendiente */}
                    <div
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'var(--bg-input)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>Cuenta por cobrar:</span>
                      <strong
                        className="tabular-nums"
                        style={{
                          color: totalDue > 0 ? 'var(--status-dirty-text)' : 'var(--status-available-text)',
                          fontWeight: '700',
                        }}
                      >
                        {totalDue > 0 ? `$${totalDue.toLocaleString()}` : 'Al día ($0)'}
                      </strong>
                    </div>
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <AlertTriangle size={13} color="var(--status-dirty-text)" style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span>{room.notes}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearRoomNotes(room);
                      }}
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
              <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '6px 4px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      onClick={() => setSelectedRoomDetail(room)}
                      title="Ver cuenta detallada y consumos"
                    >
                      <Eye size={12} />
                      <span>Detalles</span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{
                        padding: '6px 4px',
                        fontSize: '11px',
                        borderColor: 'var(--status-maintenance-border)',
                        color: 'var(--status-maintenance-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                      onClick={() => setShowCheckOutModal(room)}
                    >
                      <LogOut size={12} />
                      <span>Salida</span>
                    </button>
                  </div>
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
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
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
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                    Tipo y Tarifa
                  </span>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    {showCheckInModal.type} — <strong className="tabular-nums">${showCheckInModal.price.toLocaleString()}</strong> por noche
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label htmlFor="guest_name" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Nombre del Huésped *
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

                  <div>
                    <label htmlFor="guest_count" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Nº Personas *
                    </label>
                    <input
                      id="guest_count"
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={guestsCountInput}
                      onChange={(e) => setGuestsCountInput(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                </div>

                {/* Modalidad de Pago de la Habitación */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Modalidad de Cobro del Hospedaje *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: checkInPaymentOption === 'PENDING' ? '2px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                        backgroundColor: checkInPaymentOption === 'PENDING' ? 'var(--status-occupied-bg)' : 'var(--bg-input)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <input
                        type="radio"
                        name="payment_option"
                        value="PENDING"
                        checked={checkInPaymentOption === 'PENDING'}
                        onChange={() => setCheckInPaymentOption('PENDING')}
                        style={{ marginTop: '2px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          Pagar al Check-out (Cuenta Abierta - Recomendado)
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          El huésped cancela la habitación junto con sus consumos de minibar al momento de su salida. No se suma dinero a caja en este momento.
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: checkInPaymentOption === 'PAID' ? '2px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                        backgroundColor: checkInPaymentOption === 'PAID' ? 'var(--status-available-bg)' : 'var(--bg-input)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <input
                        type="radio"
                        name="payment_option"
                        value="PAID"
                        checked={checkInPaymentOption === 'PAID'}
                        onChange={() => setCheckInPaymentOption('PAID')}
                        style={{ marginTop: '2px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          Pagar de Inmediato (Anticipado)
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          El huésped paga el valor de la noche (${showCheckInModal.price.toLocaleString()}) ahora mismo. Se sumará inmediatamente al efectivo de caja del turno activo.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCheckInModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <LogIn size={13} />
                  <span>
                    {checkInPaymentOption === 'PAID'
                      ? `Confirmar e Ingresar $${showCheckInModal.price.toLocaleString()} a Caja`
                      : 'Confirmar Check-in (Cuenta Abierta)'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Flotante: Detalles de Habitación y Cuenta de Huésped */}
      {selectedRoomDetail && (
        <div className="modal-overlay" onClick={() => setSelectedRoomDetail(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="var(--brand-primary)" />
                <span style={{ fontSize: '14px', fontWeight: '700' }}>
                  Habitación #{selectedRoomDetail.number} · {selectedRoomDetail.type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomDetail(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Encabezado de la habitación */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: 'var(--radius-xs)',
                  marginBottom: '14px',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Piso {selectedRoomDetail.floor} · Tarifa:{' '}
                  <strong className="tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    ${selectedRoomDetail.price.toLocaleString()}
                  </strong>
                  /noche
                </div>
                <span className={`status-pill status-${selectedRoomDetail.status}`}>
                  {selectedRoomDetail.status === 'occupied'
                    ? 'Ocupada'
                    : selectedRoomDetail.status === 'available'
                    ? 'Disponible'
                    : selectedRoomDetail.status === 'dirty'
                    ? 'Requiere Aseo'
                    : 'En Limpieza'}
                </span>
              </div>

              {/* Si la habitación está ocupada: Mostrar datos del huésped y estado de cuenta */}
              {selectedRoomDetail.status === 'occupied' ? (
                <div>
                  {/* Tarjeta 1: Información del Huésped */}
                  <div
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      backgroundColor: 'var(--bg-surface)',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      Datos del Huésped
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Nombre</span>
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          {selectedRoomDetail.guestName || 'Huésped Sin Nombre'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Huéspedes</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-primary)' }}>
                          <Users size={13} />
                          <strong>{selectedRoomDetail.guestsCount || 1} persona(s)</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estado de pago de la habitación:</span>
                      {selectedRoomDetail.paymentStatus === 'PAID' ? (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--status-available-bg)', color: 'var(--status-available-text)', border: '1px solid var(--status-available-border)', fontWeight: '700' }}>
                          Pagado por anticipado ($0 pendiente)
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--status-dirty-bg)', color: 'var(--status-dirty-text)', border: '1px solid var(--status-dirty-border)', fontWeight: '700' }}>
                          Pendiente al check-out (${selectedRoomDetail.price.toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tarjeta 2: Consumos de Minibar */}
                  <div
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      backgroundColor: 'var(--bg-surface)',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShoppingBag size={14} color="var(--brand-primary)" />
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Consumos de Minibar y Tienda
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                        onClick={() => {
                          setMinibarDestination('room');
                          setMinibarRoomId(selectedRoomDetail.id);
                          setShowMinibarModal(true);
                        }}
                      >
                        <Plus size={11} />
                        <span>+ Cargar Consumo</span>
                      </button>
                    </div>

                    {selectedRoomDetail.consumptions && selectedRoomDetail.consumptions.length > 0 ? (
                      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)', textAlign: 'left' }}>
                              <th style={{ padding: '6px 8px' }}>Producto</th>
                              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Cant.</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Unitario</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRoomDetail.consumptions.map((c, idx) => (
                              <tr key={c.id || idx} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                <td style={{ padding: '6px 8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                                  {c.productName}
                                  {c.createdAt && (
                                    <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)' }}>
                                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                  {c.quantity}
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                                  ${c.unitPrice.toLocaleString()}
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', color: 'var(--text-primary)' }}>
                                  ${c.total.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                            <tr style={{ borderTop: '2px solid var(--border-medium)', backgroundColor: 'var(--bg-input)', fontWeight: '700' }}>
                              <td colSpan={3} style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>
                                Total Consumos Minibar:
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-primary)' }}>
                                ${(selectedRoomDetail.consumptions || []).reduce((acc, c) => acc + c.total, 0).toLocaleString()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-xs)' }}>
                        No hay consumos de minibar registrados para esta habitación.
                      </div>
                    )}
                  </div>

                  {/* Tarjeta 3: Resumen Total de Liquidación */}
                  {(() => {
                    const roomCharge = selectedRoomDetail.paymentStatus === 'PAID' ? 0 : selectedRoomDetail.price;
                    const minibarTotal = (selectedRoomDetail.consumptions || []).reduce((acc, c) => acc + c.total, 0);
                    const totalPending = roomCharge + minibarTotal;

                    return (
                      <div
                        style={{
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px',
                          backgroundColor: 'var(--bg-input)',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          Estado de Cuenta / Saldo Total
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>Hospedaje ({selectedRoomDetail.type}):</span>
                            <span className="tabular-nums">
                              {selectedRoomDetail.paymentStatus === 'PAID'
                                ? '$0 (Pagado en Check-in)'
                                : `$${selectedRoomDetail.price.toLocaleString()} (Pendiente)`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>Consumos Minibar:</span>
                            <span className="tabular-nums">${minibarTotal.toLocaleString()}</span>
                          </div>
                          <div
                            style={{
                              marginTop: '6px',
                              paddingTop: '6px',
                              borderTop: '1px solid var(--border-subtle)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '14px',
                              fontWeight: '800',
                              color: totalPending > 0 ? 'var(--status-dirty-text)' : 'var(--status-available-text)',
                            }}
                          >
                            <span>Total por Cobrar al Check-out:</span>
                            <span className="tabular-nums">${totalPending.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Habitación no ocupada (Disponible / Aseo / Limpieza) */
                <div style={{ padding: '16px', textAlign: 'center', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {selectedRoomDetail.status === 'available'
                      ? 'Esta habitación se encuentra limpia, desinfectada y lista para asignar a un nuevo huésped.'
                      : selectedRoomDetail.status === 'dirty'
                      ? 'Habitación desocupada pendiente de aseo por la camarera.'
                      : 'Habitación en proceso de limpieza actualmente.'}
                  </p>
                  {selectedRoomDetail.notes && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--status-dirty-bg)', borderRadius: 'var(--radius-xs)', fontSize: '11px', color: 'var(--status-dirty-text)', textAlign: 'left' }}>
                      <strong>Novedad de Aseo:</strong> {selectedRoomDetail.notes}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn-secondary" onClick={() => setSelectedRoomDetail(null)}>
                Cerrar
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedRoomDetail.status === 'available' && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      const r = selectedRoomDetail;
                      setSelectedRoomDetail(null);
                      if (!activeShift) {
                        alert('Debes abrir un turno de caja antes de registrar un check-in.');
                        return;
                      }
                      setShowCheckInModal(r);
                    }}
                  >
                    <LogIn size={13} />
                    <span>Realizar Check-in</span>
                  </button>
                )}

                {selectedRoomDetail.status === 'occupied' && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ backgroundColor: 'var(--status-maintenance-text)', borderColor: 'var(--status-maintenance-border)' }}
                    onClick={() => {
                      const r = selectedRoomDetail;
                      setSelectedRoomDetail(null);
                      setShowCheckOutModal(r);
                    }}
                  >
                    <LogOut size={13} />
                    <span>Proceder a Check-out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Liquidación y Cobro de Check-out */}
      {showCheckOutModal && (
        <div className="modal-overlay" onClick={() => setShowCheckOutModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={16} color="var(--brand-primary)" />
                <span style={{ fontSize: '14px', fontWeight: '700' }}>
                  Liquidación de Check-out · Hab #{showCheckOutModal.number}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckOutModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Huésped Registrado</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                  {showCheckOutModal.guestName || 'Huésped'} ({showCheckOutModal.guestsCount || 1} persona{showCheckOutModal.guestsCount === 1 ? '' : 's'})
                </strong>
              </div>

              {(() => {
                const roomCharge = showCheckOutModal.paymentStatus === 'PAID' ? 0 : showCheckOutModal.price;
                const minibarItems = showCheckOutModal.consumptions || [];
                const minibarTotal = minibarItems.reduce((acc, c) => acc + c.total, 0);
                const totalToCollect = roomCharge + minibarTotal;

                return (
                  <div>
                    {/* Desglose de Factura */}
                    <div
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px',
                        backgroundColor: 'var(--bg-input)',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Detalle de Cargos
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                        {/* Cargo Hospedaje */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span>Hospedaje Hab #{showCheckOutModal.number}</span>
                            {showCheckOutModal.paymentStatus === 'PAID' && (
                              <span style={{ fontSize: '10px', color: 'var(--status-available-text)', marginLeft: '6px', fontWeight: '600' }}>
                                (Pagado en Check-in)
                              </span>
                            )}
                          </div>
                          <span className="tabular-nums" style={{ fontWeight: '600' }}>
                            {showCheckOutModal.paymentStatus === 'PAID' ? '$0' : `$${showCheckOutModal.price.toLocaleString()}`}
                          </span>
                        </div>

                        {/* Cargos Minibar */}
                        {minibarItems.length > 0 ? (
                          <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px', marginTop: '2px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                              Consumos de Minibar ({minibarItems.length}):
                            </div>
                            {minibarItems.map((item, i) => (
                              <div key={item.id || i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', paddingLeft: '8px' }}>
                                <span>{item.quantity}x {item.productName}</span>
                                <span className="tabular-nums">${item.total.toLocaleString()}</span>
                              </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600', marginTop: '4px', color: 'var(--text-primary)' }}>
                              <span>Subtotal Minibar:</span>
                              <span className="tabular-nums">${minibarTotal.toLocaleString()}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px' }}>
                            <span>Consumos Minibar:</span>
                            <span>$0 (Sin consumos)</span>
                          </div>
                        )}

                        {/* Total a cobrar */}
                        <div
                          style={{
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid var(--border-medium)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '15px',
                            fontWeight: '800',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span>Total a Cobrar en Efectivo:</span>
                          <span className="tabular-nums" style={{ color: totalToCollect > 0 ? 'var(--brand-primary)' : 'var(--status-available-text)' }}>
                            ${totalToCollect.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Explicación de arqueo */}
                    <div
                      style={{
                        padding: '8px 10px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {totalToCollect > 0 ? (
                        <>
                          Al confirmar, el monto total de <strong>${totalToCollect.toLocaleString()}</strong> ingresará de inmediato al turno activo de caja y la habitación pasará a estado <strong>Requiere Aseo</strong>.
                        </>
                      ) : (
                        <>
                          La cuenta se encuentra totalmente pagada ($0 por cobrar). La habitación pasará a estado <strong>Requiere Aseo</strong> para el personal de limpieza.
                        </>
                      )}
                    </div>

                    <div className="modal-footer" style={{ marginTop: '14px' }}>
                      <button type="button" className="btn-secondary" onClick={() => setShowCheckOutModal(null)}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleConfirmCheckOut(showCheckOutModal)}
                      >
                        <DollarSign size={13} />
                        <span>
                          {totalToCollect > 0
                            ? `Cobrar $${totalToCollect.toLocaleString()} y Finalizar`
                            : 'Finalizar Check-out'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
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
