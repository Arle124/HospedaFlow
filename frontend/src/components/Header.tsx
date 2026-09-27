import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { syncService } from '../services/syncService';
import { getInitialTheme, applyTheme, type ThemeMode } from '../services/themeService';
import { springTouch, springSegment } from '../utils/motion';
import {
  Hotel,
  Wifi,
  WifiOff,
  RefreshCw,
  Layers,
  Sparkles,
  BarChart3,
  Sun,
  Moon,
} from 'lucide-react';

export type UserRole = 'receptionist' | 'housekeeper' | 'admin';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const ROLES: { id: UserRole; label: string; icon: React.FC<{ size?: number }> }[] = [
  { id: 'receptionist', label: 'Recepción', icon: Layers },
  { id: 'housekeeper', label: 'Aseo (Móvil)', icon: Sparkles },
  { id: 'admin', label: 'Gerencia', icon: BarChart3 },
];

export const Header: React.FC<HeaderProps> = ({ currentRole, onRoleChange }) => {
  const [isOnline, setIsOnline] = useState<boolean>(syncService.getOnlineStatus());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  const updatePending = async () => {
    const count = await syncService.getPendingCount();
    setPendingCount(count);
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = syncService.subscribeOnlineStatus((online) => {
      setIsOnline(online);
      updatePending();
    });

    const interval = setInterval(updatePending, 3000);
    updatePending();

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await syncService.processSyncQueue();
    await updatePending();
    setIsSyncing(false);
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Identidad y Selector de Entorno Operacional */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <motion.div
              className="brand-badge"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={springTouch}
            >
              <Hotel size={16} />
            </motion.div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
                HospedaSync
              </span>
              <span className="brand-tag">PMS</span>
            </div>
          </div>

          <div className="header-divider" />

          {/* Segmented Control con Spring Physics nativo */}
          <nav className="role-nav-group" aria-label="Navegación por rol">
            {ROLES.map(({ id, label, icon: Icon }) => {
              const isActive = currentRole === id;
              return (
                <motion.button
                  key={id}
                  type="button"
                  onClick={() => onRoleChange(id)}
                  className={`role-tab-btn ${isActive ? 'active' : ''}`}
                  whileTap={{ scale: 0.97 }}
                  transition={springTouch}
                >
                  {isActive && (
                    <motion.div
                      layoutId="roleIndicator"
                      className="role-tab-indicator"
                      transition={springSegment}
                    />
                  )}
                  <Icon size={14} />
                  <span>{label}</span>
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* Controles de Sistema: Conectividad, Sincronización y Modo Oscuro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Conmutador de Tema con rotación spring */}
          <motion.button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            transition={springTouch}
            aria-label={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
            title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              {theme === 'light' ? <Moon size={13} /> : <Sun size={13} color="#f59e0b" />}
            </motion.div>
            <span>{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
          </motion.button>

          {/* Indicador de Conectividad Offline-First */}
          <div className={`network-badge ${isOnline ? 'online' : 'offline'}`}>
            <span className="pulse-dot" />
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{isOnline ? 'En línea' : 'Sin conexión'}</span>
          </div>

          {/* Cola de Sincronización en Background */}
          <AnimatePresence>
            {pendingCount > 0 && (
              <motion.button
                type="button"
                onClick={handleSyncNow}
                disabled={!isOnline || isSyncing}
                className="btn-secondary"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileTap={{ scale: 0.96 }}
                transition={springTouch}
                style={{ fontSize: '11px', padding: '5px 10px', height: '30px' }}
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                <span>
                  {pendingCount} {pendingCount === 1 ? 'pendiente' : 'pendientes'}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
