import React, { useState, useEffect } from 'react';
import { db, type Room, type RoomConsumption, type LocalShift, type LocalProduct, type CashMovement } from '../db/db';
import { syncService } from '../services/syncService';
import { eventBus } from '../services/eventBus';

// Componentes modulares de diseño
import { ShiftBanner } from './receptionist/ShiftBanner';
import { RoomFilterBar } from './receptionist/RoomFilterBar';
import { RoomCard } from './receptionist/RoomCard';
import { RoomDetailModal } from './receptionist/RoomDetailModal';
import { CheckInModal } from './receptionist/CheckInModal';
import { CheckOutModal } from './receptionist/CheckOutModal';
import { OpenShiftModal, CloseShiftModal } from './receptionist/ShiftModals';
import { MinibarModal } from './receptionist/MinibarModal';
import { ExpenseModal } from './receptionist/ExpenseModal';

export const ReceptionistView: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeShift, setActiveShift] = useState<LocalShift | null>(null);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [, setShiftMovements] = useState<CashMovement[]>([]);
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

  // Estados de formularios
  const [initialCashInput, setInitialCashInput] = useState<string>('50000');
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [closeNotesInput, setCloseNotesInput] = useState<string>('');
  const [guestNameInput, setGuestNameInput] = useState<string>('');
  const [guestsCountInput, setGuestsCountInput] = useState<number>(1);
  const [checkInPaymentOption, setCheckInPaymentOption] = useState<'PENDING' | 'PAID'>('PENDING');

  // Minibar
  const [minibarQuantities, setMinibarQuantities] = useState<Record<number, number>>({});
  const [minibarDestination, setMinibarDestination] = useState<'cash' | 'room'>('cash');
  const [minibarRoomId, setMinibarRoomId] = useState<string>('');

  // Gastos
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
      userId: 1,
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
      Boolean(r.guestName && r.guestName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const availableCount = rooms.filter((r) => r.status === 'available').length;
  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const dirtyCount = rooms.filter((r) => r.status === 'dirty').length;
  const cleaningCount = rooms.filter((r) => r.status === 'cleaning').length;

  return (
    <div className="container-fluid" style={{ paddingBottom: '40px' }}>
      {/* 1. Barra de Turno y Caja */}
      <ShiftBanner
        activeShift={activeShift}
        onOpenShiftClick={() => setShowOpenModal(true)}
        onCloseShiftClick={() => {
          if (activeShift) {
            setActualCashInput(activeShift.currentCash.toString());
            setShowCloseModal(true);
          }
        }}
        onMinibarClick={() => setShowMinibarModal(true)}
        onExpenseClick={() => setShowExpenseModal(true)}
      />

      {/* 2. Barra de Filtros y Búsqueda */}
      <RoomFilterBar
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={rooms.length}
        availableCount={availableCount}
        occupiedCount={occupiedCount}
        dirtyCount={dirtyCount}
        cleaningCount={cleaningCount}
      />

      {/* 3. Rack de Habitaciones (Grid con Spring Physics) */}
      <div className="room-grid">
        {filteredRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onCheckInClick={setShowCheckInModal}
            onCheckOutClick={setShowCheckOutModal}
            onDetailClick={setSelectedRoomDetail}
            onClearNotes={handleClearRoomNotes}
          />
        ))}
      </div>

      {/* 4. Modales Desacoplados */}
      <RoomDetailModal
        room={selectedRoomDetail}
        onClose={() => setSelectedRoomDetail(null)}
        onOpenMinibarForRoom={(roomId) => {
          setMinibarDestination('room');
          setMinibarRoomId(roomId);
          setShowMinibarModal(true);
        }}
        onCheckOutClick={setShowCheckOutModal}
      />

      <CheckInModal
        room={showCheckInModal}
        guestName={guestNameInput}
        onGuestNameChange={setGuestNameInput}
        guestsCount={guestsCountInput}
        onGuestsCountChange={setGuestsCountInput}
        paymentOption={checkInPaymentOption}
        onPaymentOptionChange={setCheckInPaymentOption}
        onConfirm={handleCheckIn}
        onClose={() => {
          setShowCheckInModal(null);
          setGuestNameInput('');
          setGuestsCountInput(1);
          setCheckInPaymentOption('PENDING');
        }}
      />

      <CheckOutModal
        room={showCheckOutModal}
        onConfirmCheckOut={handleConfirmCheckOut}
        onClose={() => setShowCheckOutModal(null)}
      />

      <OpenShiftModal
        isOpen={showOpenModal}
        initialCash={initialCashInput}
        onInitialCashChange={setInitialCashInput}
        onSubmit={handleOpenShift}
        onClose={() => setShowOpenModal(false)}
      />

      <CloseShiftModal
        isOpen={showCloseModal}
        activeShift={activeShift}
        actualCash={actualCashInput}
        onActualCashChange={setActualCashInput}
        closeNotes={closeNotesInput}
        onCloseNotesChange={setCloseNotesInput}
        onSubmit={handleCloseShift}
        onClose={() => setShowCloseModal(false)}
      />

      <MinibarModal
        isOpen={showMinibarModal}
        products={products}
        rooms={rooms}
        quantities={minibarQuantities}
        onQuantityChange={(prodId, qty) =>
          setMinibarQuantities((prev) => ({ ...prev, [prodId]: qty }))
        }
        destination={minibarDestination}
        onDestinationChange={setMinibarDestination}
        roomId={minibarRoomId}
        onRoomIdChange={setMinibarRoomId}
        onSubmit={handleMinibarSale}
        onClose={() => {
          setShowMinibarModal(false);
          setMinibarQuantities({});
          setMinibarDestination('cash');
          setMinibarRoomId('');
        }}
      />

      <ExpenseModal
        isOpen={showExpenseModal}
        supplier={expenseSupplier}
        onSupplierChange={setExpenseSupplier}
        concept={expenseConcept}
        onConceptChange={setExpenseConcept}
        category={expenseCategory}
        onCategoryChange={setExpenseCategory}
        amount={expenseAmount}
        onAmountChange={setExpenseAmount}
        receipt={expenseReceipt}
        onReceiptChange={setExpenseReceipt}
        maxCash={activeShift ? activeShift.currentCash : 0}
        onSubmit={handleSupplierExpense}
        onClose={() => {
          setShowExpenseModal(false);
          setExpenseSupplier('');
          setExpenseConcept('');
          setExpenseAmount('');
          setExpenseReceipt('');
        }}
      />
    </div>
  );
};
