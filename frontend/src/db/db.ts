import Dexie, { type Table } from 'dexie';

export type RoomStatus = 'available' | 'occupied' | 'dirty' | 'cleaning' | 'maintenance';
export type RoomType = 'single' | 'double' | 'matrimonial' | 'suite';

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  price: number;
  guestName?: string;
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

export interface SyncQueueItem {
  id: string;
  action: 'OPEN_SHIFT' | 'CLOSE_SHIFT' | 'UPDATE_ROOM_STATUS' | 'ADD_TRANSACTION';
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

  constructor() {
    super('HospedaSyncDB');
    this.version(1).stores({
      rooms: 'id, number, floor, status',
      shifts: 'id, status, isSynced',
      syncQueue: 'id, status, createdAt',
      inventory: 'id, sku'
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
      { id: '102', number: '102', floor: 1, type: 'double', status: 'occupied', price: 95000, guestName: 'Carlos Gómez', updatedAt: new Date().toISOString() },
      { id: '103', number: '103', floor: 1, type: 'single', status: 'dirty', price: 60000, notes: 'Salida de huésped a las 09:00', updatedAt: new Date().toISOString() },
      { id: '201', number: '201', floor: 2, type: 'suite', status: 'available', price: 140000, updatedAt: new Date().toISOString() },
      { id: '202', number: '202', floor: 2, type: 'matrimonial', status: 'cleaning', price: 85000, updatedAt: new Date().toISOString() },
      { id: '203', number: '203', floor: 2, type: 'double', status: 'dirty', price: 95000, updatedAt: new Date().toISOString() },
      { id: '204', number: '204', floor: 2, type: 'single', status: 'maintenance', price: 60000, notes: 'Fuga de agua en lavamanos', updatedAt: new Date().toISOString() },
    ];
    await db.rooms.bulkAdd(initialRooms);

    const initialProducts: LocalProduct[] = [
      { id: 1, name: 'Agua Mineral 600ml', sku: 'AGUA-600', price: 3000, stock: 24, minStock: 5 },
      { id: 2, name: 'Gaseosa 400ml', sku: 'GAS-400', price: 4000, stock: 18, minStock: 5 },
      { id: 3, name: 'Paquete de Snacks', sku: 'SNK-01', price: 3500, stock: 15, minStock: 4 },
    ];
    await db.inventory.bulkAdd(initialProducts);
  }
}
