import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Simular el entorno de base de datos Dexie
const mockSyncQueue: any[] = [];
const mockShifts: Record<string, any> = {};

vi.mock('../db/db', () => {
  return {
    db: {
      syncQueue: {
        add: vi.fn(async (item: any) => {
          mockSyncQueue.push(item);
          return item.id;
        }),
        where: vi.fn((field: string) => {
          return {
            equals: (val: string) => ({
              count: async () => mockSyncQueue.filter((x) => x[field] === val).length,
              toArray: async () => mockSyncQueue.filter((x) => x[field] === val),
            }),
          };
        }),
        update: vi.fn(async (id: string, changes: any) => {
          const item = mockSyncQueue.find((x) => x.id === id);
          if (item) {
            Object.assign(item, changes);
          }
        }),
      },
      shifts: {
        get: vi.fn(async (id: string) => mockShifts[id]),
        update: vi.fn(async (id: string, changes: any) => {
          if (mockShifts[id]) {
            Object.assign(mockShifts[id], changes);
          }
        }),
      },
    },
  };
});

describe('syncService', () => {
  let syncService: typeof import('./syncService').syncService;

  beforeEach(async () => {
    mockSyncQueue.length = 0;
    Object.keys(mockShifts).forEach((k) => delete mockShifts[k]);
    vi.clearAllMocks();

    // Mock global fetch
    globalThis.fetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ success: true, data: { id: 101 } }),
    }));

    const mod = await import('./syncService');
    syncService = mod.syncService;
    // Empezamos en modo offline para controlar el procesamiento de la cola en cada test
    syncService.setOnlineStatus(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe encolar acciones en modo offline y mantenerse en pending', async () => {
    const item = await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId: '101',
      status: 'occupied',
    });

    expect(item).toBeDefined();
    expect(item.action).toBe('UPDATE_ROOM_STATUS');
    expect(item.status).toBe('pending');
    expect(mockSyncQueue).toHaveLength(1);
    expect(mockSyncQueue[0].status).toBe('pending');
  });

  it('debe procesar la cola y sincronizar CREATE_RESERVATION cuando vuelve online', async () => {
    await syncService.enqueueAction('CREATE_RESERVATION', {
      id: 'res-test-1',
      roomId: '102',
      guestName: 'María Pérez',
      checkInDate: '2026-10-15',
      checkOutDate: '2026-10-18',
      status: 'CONFIRMED',
      source: 'MANUAL',
      totalPrice: 200000,
      advancePayment: 50000,
    });

    syncService.setOnlineStatus(true);
    const result = await syncService.processSyncQueue();

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/reservations',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(mockSyncQueue[0].status).toBe('synced');
  });

  it('debe procesar la cola y sincronizar UPDATE_RESERVATION para drag & drop', async () => {
    await syncService.enqueueAction('UPDATE_RESERVATION', {
      id: 'res-test-1',
      roomId: '201',
      checkInDate: '2026-10-16',
      checkOutDate: '2026-10-19',
    });

    syncService.setOnlineStatus(true);
    const result = await syncService.processSyncQueue();

    expect(result.synced).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/reservations/res-test-1',
      expect.objectContaining({
        method: 'PUT',
      })
    );
    expect(mockSyncQueue[0].status).toBe('synced');
  });

  it('debe sincronizar RESOLVE_INCIDENT hacia el endpoint de rooms', async () => {
    await syncService.enqueueAction('RESOLVE_INCIDENT', {
      roomId: '103',
      resolution: 'Llave reparada',
    });

    syncService.setOnlineStatus(true);
    const result = await syncService.processSyncQueue();

    expect(result.synced).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/rooms/103/status',
      expect.objectContaining({
        method: 'PUT',
      })
    );
    expect(mockSyncQueue[0].status).toBe('synced');
  });

  it('debe sincronizar ADD_TRANSACTION resolviendo shiftId local a serverId', async () => {
    mockShifts['shift_local_123'] = {
      id: 'shift_local_123',
      serverId: 42,
    };

    await syncService.enqueueAction('ADD_TRANSACTION', {
      shiftId: 'shift_local_123',
      type: 'INCOME_MINIBAR',
      amount: 15000,
      concept: 'Agua y galletas',
    });

    syncService.setOnlineStatus(true);
    const result = await syncService.processSyncQueue();

    expect(result.synced).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/shifts/42/transactions',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(mockSyncQueue[0].status).toBe('synced');
  });

  it('debe incrementar retryCount y marcar failed tras fallos repetidos del servidor', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => ({
      ok: false,
      status: 500,
    }));

    const item = await syncService.enqueueAction('UPDATE_ROOM_STATUS', {
      roomId: '101',
      status: 'cleaning',
    });

    // Simulamos que ya falló 3 veces
    item.retryCount = 3;

    syncService.setOnlineStatus(true);
    const result = await syncService.processSyncQueue();

    expect(result.failed).toBe(1);
    expect(result.synced).toBe(0);
    expect(mockSyncQueue[0].status).toBe('failed');
    expect(mockSyncQueue[0].retryCount).toBe(4);
  });
});
