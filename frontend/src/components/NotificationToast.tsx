import React, { useEffect, useState } from 'react';
import { eventBus, type LiveNotification } from '../services/eventBus';
import { Sparkles, AlertCircle, Info, X } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);

  const playChime = () => {
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // Audio bloqueado si no hay interacción de usuario
    }
  };

  useEffect(() => {
    const unsubscribe = eventBus.subscribe((notif) => {
      setNotifications((prev) => [notif, ...prev.slice(0, 4)]);
      playChime();

      // Auto-eliminar después de 6 segundos
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      }, 6000);
    });

    return () => unsubscribe();
  }, []);

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '68px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '380px',
        width: 'calc(100% - 48px)',
        pointerEvents: 'none',
      }}
    >
      {notifications.map((n) => {
        const isClean = n.type === 'room_cleaned';
        const isIssue = n.type === 'room_issue';

        const borderColor = isClean
          ? 'var(--status-available-border)'
          : isIssue
          ? 'var(--status-dirty-border)'
          : 'var(--border-focus)';
        const bgColor = isClean
          ? 'var(--status-available-bg)'
          : isIssue
          ? 'var(--status-dirty-bg)'
          : 'var(--status-occupied-bg)';
        const iconColor = isClean
          ? 'var(--status-available-text)'
          : isIssue
          ? 'var(--status-dirty-text)'
          : 'var(--status-occupied-text)';

        return (
          <div
            key={n.id}
            role="alert"
            style={{
              pointerEvents: 'auto',
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderLeft: `4px solid ${borderColor}`,
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              boxShadow: 'var(--shadow-modal)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ marginTop: '2px', flexShrink: 0 }}>
              {isClean && <Sparkles size={18} color={iconColor} />}
              {isIssue && <AlertCircle size={18} color={iconColor} />}
              {!isClean && !isIssue && <Info size={18} color={iconColor} />}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                  {n.title}
                </span>
                <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {n.timestamp}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                {n.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => dismiss(n.id)}
              aria-label="Cerrar notificación"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
