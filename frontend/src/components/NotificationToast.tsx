import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus, type LiveNotification } from '../services/eventBus';
import { springToast, springTouch } from '../utils/motion';
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
      // Audio bloqueado si no hay interacción previa de usuario
    }
  };

  useEffect(() => {
    const unsubscribe = eventBus.subscribe((notif) => {
      setNotifications((prev) => [notif, ...prev.slice(0, 3)]);
      playChime();

      // Auto-dismiss tras 6 segundos
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      }, 6000);
    });

    return () => unsubscribe();
  }, []);

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="toast-viewport" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {notifications.map((n) => {
          const isClean = n.type === 'room_cleaned';
          const isIssue = n.type === 'room_issue';

          let toastTypeClass = 'toast-default';
          if (isClean) toastTypeClass = 'toast-clean';
          if (isIssue) toastTypeClass = 'toast-issue';

          return (
            <motion.div
              key={n.id}
              layout
              role="alert"
              className={`toast-item ${toastTypeClass}`}
              initial={{ opacity: 0, y: -20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.15 } }}
              transition={springToast}
            >
              <div className="toast-icon-wrapper">
                {isClean && <Sparkles size={18} />}
                {isIssue && <AlertCircle size={18} />}
                {!isClean && !isIssue && <Info size={18} />}
              </div>

              <div className="toast-content">
                <div className="toast-header">
                  <span className="toast-title">
                    {n.title}
                  </span>
                  <span className="tabular-nums toast-time">
                    {n.timestamp}
                  </span>
                </div>
                <p className="toast-message">
                  {n.message}
                </p>
              </div>

              <motion.button
                type="button"
                onClick={() => dismiss(n.id)}
                aria-label="Cerrar notificación"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                transition={springTouch}
                className="toast-close-btn"
              >
                <X size={14} />
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
