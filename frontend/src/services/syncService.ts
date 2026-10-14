import { db, type SyncQueueItem, type SyncPayload, type UpdateRoomStatusPayload } from '../db/db';

type OnlineStatusCallback = (isOnline: boolean) => void;

class SyncService {
  private isOnline: boolean = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
  private listeners: Set<OnlineStatusCallback> = new Set();
  private isSyncing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.setOnlineStatus(true);
        this.processSyncQueue();
      });

      window.addEventListener('offline', () => {
        this.setOnlineStatus(false);
      });
    }
  }

  public setOnlineStatus(status: boolean) {
    this.isOnline = status;
    this.listeners.forEach((callback) => callback(status));
  }

  public subscribeOnlineStatus(callback: OnlineStatusCallback): () => void {
    this.listeners.add(callback);
    callback(this.isOnline);
    return () => this.listeners.delete(callback);
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public async enqueueAction(action: SyncQueueItem['action'], payload: SyncPayload): Promise<SyncQueueItem> {
    const item: SyncQueueItem = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      payload,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    await db.syncQueue.add(item);

    // Si estamos online, intentar sincronizar de inmediato
    if (this.isOnline) {
      this.processSyncQueue();
    }

    return item;
  }

  public async getPendingCount(): Promise<number> {
    return await db.syncQueue.where('status').equals('pending').count();
  }

  public async processSyncQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing || !this.isOnline) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();

      for (const item of pendingItems) {
        try {
          const success = await this.dispatchToServer(item);
          if (success) {
            await db.syncQueue.update(item.id, { status: 'synced' });
            synced++;
          } else {
            await db.syncQueue.update(item.id, {
              retryCount: item.retryCount + 1,
              status: item.retryCount >= 3 ? 'failed' : 'pending',
            });
            failed++;
          }
        } catch (error: unknown) {
          await db.syncQueue.update(item.id, {
            retryCount: item.retryCount + 1,
            error: error instanceof Error ? error.message : 'Error de conexion con el servidor',
          });
          failed++;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { synced, failed };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('hospedaflow_token') || localStorage.getItem('hospedasync_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private async dispatchToServer(item: SyncQueueItem): Promise<boolean> {
    const API_BASE = '/api/v1';

    try {
      switch (item.action) {
        case 'OPEN_SHIFT': {
          const payload = item.payload as import('../db/db').OpenShiftPayload;
          const res = await fetch(`${API_BASE}/shifts`, {
            method: 'POST',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.data?.id) {
              await db.shifts.update(payload.localId, {
                serverId: data.data.id,
                isSynced: true,
              });
            }
            return true;
          }
          return false;
        }

        case 'CLOSE_SHIFT': {
          const payload = item.payload as import('../db/db').CloseShiftPayload;
          let targetServerId = payload.shiftId;
          // Si no tiene serverId directo, buscar en Dexie por si OPEN_SHIFT ya se sincronizó
          if (!targetServerId && payload.localShiftId) {
            const localShift = await db.shifts.get(payload.localShiftId);
            if (localShift?.serverId) {
              targetServerId = localShift.serverId;
            }
          }

          // Si aún no tiene serverId (OPEN_SHIFT sigue en cola), posponer para la siguiente vuelta
          if (!targetServerId) {
            return false;
          }

          const res = await fetch(`${API_BASE}/shifts/${targetServerId}/close`, {
            method: 'POST',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({
              actual_cash: payload.actual_cash,
              notes: payload.notes,
            }),
          });
          if (res.ok) {
            if (payload.localShiftId) {
              await db.shifts.update(payload.localShiftId, { isSynced: true });
            }
            return true;
          }
          return false;
        }

        case 'UPDATE_ROOM_STATUS': {
          const roomPayload = item.payload as UpdateRoomStatusPayload;
          const res = await fetch(`${API_BASE}/rooms/${roomPayload.roomId}/status`, {
            method: 'PUT',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({
              status: roomPayload.status,
              notes: roomPayload.notes || '',
            }),
          });
          return res.ok;
        }

        
        case 'CREATE_RESERVATION': {
          const payload = item.payload; // Already a reservation
          const res = await fetch(`${API_BASE}/reservations`, {
            method: 'POST',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify(payload),
          });
          return res.ok;
        }

        case 'UPDATE_RESERVATION': {
          const payload = item.payload as import('../db/db').UpdateReservationPayload;
          const res = await fetch(`${API_BASE}/reservations/${payload.id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify(payload),
          });
          return res.ok;
        }

        case 'RESOLVE_INCIDENT': {
          const payload = item.payload as import('../db/db').ResolveIncidentPayload & { status?: string; notes?: string };
          const res = await fetch(`${API_BASE}/rooms/${payload.roomId}/status`, {
            method: 'PUT',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({
              status: payload.status || 'available',
              notes: payload.notes || '',
            }),
          });
          return res.ok;
        }

        case 'ADD_TRANSACTION': {
          const payload = item.payload as import('../db/db').AddTransactionPayload;
          let targetServerId = payload.shiftId;
          // Si el shiftId es local (no numérico), resolver desde Dexie si OPEN_SHIFT ya sincronizó
          if (isNaN(Number(targetServerId))) {
            const localShift = await db.shifts.get(targetServerId);
            if (localShift?.serverId) {
              targetServerId = String(localShift.serverId);
            }
          }
          if (isNaN(Number(targetServerId))) {
            // Aún no tiene serverId asignado, posponer para la siguiente vuelta
            return false;
          }

          const res = await fetch(`${API_BASE}/shifts/${targetServerId}/transactions`, {
            method: 'POST',
            headers: this.getHeaders(),
            credentials: 'include',
            body: JSON.stringify({
              amount: payload.amount,
              type: payload.type,
              concept: payload.concept || (payload.type === 'INCOME_MINIBAR' ? 'Venta de Minibar' : 'Gasto de Caja'),
            }),
          });
          return res.ok;
        }

        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}

export const syncService = new SyncService();
