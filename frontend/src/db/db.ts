import Dexie, { type Table } from 'dexie';

export type RoomStatus = 'available' | 'occupied' | 'dirty' | 'cleaning' | 'maintenance';
export type RoomType = 'single' | 'double' | 'matrimonial' | 'suite';

export interface RoomConsumption {
  id: string;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD';

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  price: number;
  guestName?: string;
  guestsCount?: number;
  paymentStatus?: 'PAID' | 'PENDING';
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  consumptions?: RoomConsumption[];
  notes?: string;
  updatedAt: string;
}

export interface LocalShift {
  id: string;
  serverId?: number;
  userId: number;
  initialCash: number;
  currentCash: number;
  actualCash?: number;
  difference?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  startedAt: string;
  endedAt?: string;
  isSynced: boolean;
}

export type CashMovementType = 'INCOME_ROOM' | 'INCOME_MINIBAR' | 'EXPENSE_SUPPLIER';

export interface CashMovement {
  id: string;
  shiftId: string;
  type: CashMovementType;
  amount: number;
  paymentMethod?: PaymentMethod;
  reference?: string;
  surcharge?: number;
  concept: string;
  category?: string;
  supplier?: string;
  receipt?: string;
  roomNumber?: string;
  createdAt: string;
}

export interface SyncQueueItem {
  id: string;
  action: 'OPEN_SHIFT' | 'CLOSE_SHIFT' | 'UPDATE_ROOM_STATUS' | 'ADD_TRANSACTION' | 'RESOLVE_INCIDENT';
  payload: any;
  status: 'pending' | 'synced' | 'failed';
  createdAt: string;
  retryCount: number;
  error?: string;
}

export interface LocalProduct {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  minStock: number;
}

export class HospedaSyncDatabase extends Dexie {
  rooms!: Table<Room>;
  shifts!: Table<LocalShift>;
  syncQueue!: Table<SyncQueueItem>;
  inventory!: Table<LocalProduct>;
  cashMovements!: Table<CashMovement>;

  constructor() {
    super('HospedaSyncDB');
    this.version(1).stores({
      rooms: 'id, number, floor, status',
      shifts: 'id, status, isSynced',
      syncQueue: 'id, status, createdAt',
      inventory: 'id, sku'
    });
    this.version(2).stores({
      rooms: 'id, number, floor, status',
      shifts: 'id, status, isSynced',
      syncQueue: 'id, status, createdAt',
      inventory: 'id, sku',
      cashMovements: 'id, shiftId, type, createdAt'
    });
    this.version(3).stores({
      rooms: 'id, number, floor, status',
      shifts: 'id, status, isSynced',
      syncQueue: 'id, status, createdAt',
      inventory: 'id, sku',
      cashMovements: 'id, shiftId, type, paymentMethod, createdAt'
    });
  }
}

export const db = new HospedaSyncDatabase();

// Sembrado inicial de habitaciones y productos si la base local está vacía
export async function seedInitialDataIfNeeded() {
  const count = await db.rooms.count();
  if (count === 0) {
    const initialRooms: Room[] = [
      { id: '101', number: '101', floor: 1, type: 'matrimonial', status: 'available', price: 80000, updatedAt: new Date().toISOString() },
      {
        id: '102',
        number: '102',
        floor: 1,
        type: 'double',
        status: 'occupied',
        price: 95000,
        guestName: 'Carlos Gómez',
        guestsCount: 2,
        paymentStatus: 'PENDING',
        paidAmount: 0,
        consumptions: [
          {
            id: 'cons_init_1',
            productId: 1,
            productName: 'Agua Mineral 600ml',
            unitPrice: 3000,
            quantity: 2,
            total: 6000,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'cons_init_2',
            productId: 3,
            productName: 'Paquete de Snacks',
            unitPrice: 3500,
            quantity: 1,
            total: 3500,
            createdAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      },
      { id: '103', number: '103', floor: 1, type: 'single', status: 'dirty', price: 60000, notes: 'Salida de huésped a las 09:00', updatedAt: new Date().toISOString() },
      { id: '201', number: '201', floor: 2, type: 'suite', status: 'available', price: 140000, updatedAt: new Date().toISOString() },
      { id: '202', number: '202', floor: 2, type: 'matrimonial', status: 'cleaning', price: 85000, updatedAt: new Date().toISOString() },
      { id: '203', number: '203', floor: 2, type: 'double', status: 'dirty', price: 95000, updatedAt: new Date().toISOString() },
      { id: '204', number: '204', floor: 2, type: 'single', status: 'maintenance', price: 60000, notes: 'Fuga de agua en lavamanos', updatedAt: new Date().toISOString() },
    ];
    await db.rooms.bulkPut(initialRooms);
  } else {
    // Si ya existían habitaciones de una versión anterior, asegurar que Hab #102 tenga datos completos de prueba
    const room102 = await db.rooms.get('102');
    if (room102 && !room102.paymentStatus) {
      await db.rooms.update('102', {
        guestsCount: 2,
        paymentStatus: 'PENDING',
        paidAmount: 0,
        consumptions: [
          {
            id: 'cons_init_1',
            productId: 1,
            productName: 'Agua Mineral 600ml',
            unitPrice: 3000,
            quantity: 2,
            total: 6000,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'cons_init_2',
            productId: 3,
            productName: 'Paquete de Snacks',
            unitPrice: 3500,
            quantity: 1,
            total: 3500,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }
  }

  const invCount = await db.inventory.count();
  if (invCount === 0) {
    const initialProducts: LocalProduct[] = [
      { id: 1, name: 'Agua Mineral 600ml', sku: 'AGUA-600', price: 3000, stock: 24, minStock: 5 },
      { id: 2, name: 'Gaseosa 400ml', sku: 'GAS-400', price: 4000, stock: 18, minStock: 5 },
      { id: 3, name: 'Paquete de Snacks', sku: 'SNK-01', price: 3500, stock: 15, minStock: 4 },
      { id: 4, name: 'Cerveza Club Colombia 330ml', sku: 'CERV-330', price: 6000, stock: 20, minStock: 6 },
      { id: 5, name: 'Kit Aseo Dental', sku: 'KIT-DEN', price: 5000, stock: 12, minStock: 3 },
    ];
    await db.inventory.bulkPut(initialProducts);
  }
}
