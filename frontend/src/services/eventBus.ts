export interface LiveNotification {
  id: string;
  type: 'room_cleaned' | 'room_issue' | 'shift_event' | 'sync_event';
  title: string;
  message: string;
  timestamp: string;
  roomNumber?: string;
}

type NotificationListener = (notification: LiveNotification) => void;

class EventBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<NotificationListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('hospedaflow_live_bus');
        this.channel.onmessage = (event) => {
          if (event.data && typeof event.data === 'object') {
            this.notifyLocalListeners(event.data as LiveNotification);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel no soportado o bloqueado:', err);
      }
    }
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyLocalListeners(notification: LiveNotification) {
    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (err) {
        console.error('Error en listener de notificación:', err);
      }
    });
  }

  public emit(notification: Omit<LiveNotification, 'id' | 'timestamp'>) {
    const fullNotification: LiveNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    // Notificar a oyentes en la misma pestaña/ventana
    this.notifyLocalListeners(fullNotification);

    // Enviar a otras pestañas/ventanas abiertas (ej. PC recepción vs móvil)
    if (this.channel) {
      try {
        this.channel.postMessage(fullNotification);
      } catch (err) {
        console.warn('Error al transmitir en BroadcastChannel:', err);
      }
    }
  }
}

export const eventBus = new EventBus();
