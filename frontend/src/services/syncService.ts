import { db, type SyncQueueItem } from '../db/db';

type OnlineStatusCallback = (isOnline: boolean) => void;

class SyncService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
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

  private setOnlineStatus(status: boolean) {
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

  public async enqueueAction(action: SyncQueueItem['action'], payload: any): Promise<SyncQueueItem> {
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
        } catch (error: any) {
          await db.syncQueue.update(item.id, {
            retryCount: item.retryCount + 1,
            error: error?.message || 'Error de conexión con el servidor',
          });
          failed++;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { synced, failed };
  }

  private async dispatchToServer(item: SyncQueueItem): Promise<boolean> {
    const API_BASE = '/api/v1';

    try {
      switch (item.action) {
        case 'OPEN_SHIFT': {
          const res = await fetch(`${API_BASE}/shifts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.data?.id) {
              await db.shifts.update(item.payload.localId, {
                serverId: data.data.id,
                isSynced: true,
              });
            }
            return true;
          }
          return false;
        }

        case 'CLOSE_SHIFT': {
          const res = await fetch(`${API_BASE}/shifts/${item.payload.shiftId}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              actual_cash: item.payload.actual_cash,
              notes: item.payload.notes,
            }),
          });
          return res.ok;
        }

        case 'UPDATE_ROOM_STATUS': {
          // Mock o endpoint de habitaciones cuando esté conectado
          return true;
        }

        default:
          return true;
      }
    } catch {
      return false;
    }
  }
}

export const syncService = new SyncService();
