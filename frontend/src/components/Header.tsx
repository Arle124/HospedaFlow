import React, { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { syncService } from '../services/syncService';
import { getInitialTheme, applyTheme, type ThemeMode } from '../services/themeService';
import { springTouch, springSegment } from '../utils/motion';
import { GerenciaPinModal } from './GerenciaPinModal';
import { RoleSelectSheet } from './RoleSelectSheet';
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
  ChevronDown,
  Lock,
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
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [showRoleSheet, setShowRoleSheet] = useState<boolean>(false);

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

  const handleRoleClick = (role: UserRole) => {
    if (role === 'admin' && !isUnlocked) {
      setShowRoleSheet(false);
      setShowPinModal(true);
      return;
    }
    onRoleChange(role);
    setShowRoleSheet(false);
  };

  const handlePinSuccess = () => {
    setIsUnlocked(true);
    setShowPinModal(false);
    onRoleChange('admin');
  };

  const currentRoleObj = ROLES.find((r) => r.id === currentRole) || ROLES[0];
  const CurrentIcon = currentRoleObj.icon;

  return (
    <>
      <header className="app-header">
        <div className="header-container">
          {/* Identidad y Selector de Entorno Operacional */}
          <div className="header-left-group">
            <div className="header-brand-group">
              <m.div
                className="brand-badge"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={springTouch}
              >
                <Hotel size={16} />
              </m.div>
              <div className="header-nav-wrapper">
                <span className="brand-title">
                  HospedaSync
                </span>
                <span className="brand-tag">PMS</span>
              </div>
            </div>

            <div className="header-divider" />

            {/* Selector de Roles Desktop (Segmented Control con resortes) */}
            <nav className="role-nav-desktop" aria-label="Navegación por rol">
              {ROLES.map(({ id, label, icon: Icon }) => {
                const isActive = currentRole === id;
                const isRestricted = id === 'admin' && !isUnlocked;

                return (
                  <m.button
                    key={id}
                    type="button"
                    onClick={() => handleRoleClick(id)}
                    className={`role-tab-btn ${isActive ? 'active' : ''}`}
                    whileTap={{ scale: 0.97 }}
                    transition={springTouch}
                  >
                    {isActive && (
                      <m.div
                        layoutId="roleIndicator"
                        className="role-tab-indicator"
                        transition={springSegment}
                      />
                    )}
                    <Icon size={14} />
                    <span>{label}</span>
                    {isRestricted && (
                      <Lock size={10} className="header-lock-icon" />
                    )}
                  </m.button>
                );
              })}
            </nav>

            {/* Selector de Rol Móvil (Pill Compacto con Dropdown Sheet) */}
            <m.button
              type="button"
              onClick={() => setShowRoleSheet(true)}
              className="role-nav-mobile"
              whileTap={{ scale: 0.96 }}
              transition={springTouch}
              aria-label="Cambiar entorno operacional"
            >
              <CurrentIcon size={13} />
              <span className="header-role-text">
                {currentRoleObj.label.replace(' (Móvil)', '')}
              </span>
              <ChevronDown size={12} className="header-chevron-icon" />
            </m.button>
          </div>

          {/* Controles de Sistema: Conectividad, Sincronización y Modo Oscuro */}
          <div className="header-brand-group">
            {/* Conmutador de Tema con rotación spring */}
            <m.button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              transition={springTouch}
              aria-label={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
              title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
            >
              <m.div
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="header-nav-wrapper"
              >
                {theme === 'light' ? <Moon size={13} /> : <Sun size={13} color="#f59e0b" />}
              </m.div>
              <span className="hide-on-mobile">{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
            </m.button>

            {/* Indicador de Conectividad Offline-First */}
            <div className={`network-badge ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Conectado a la red' : 'Operando offline'}>
              <span className="pulse-dot" />
              {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span className="hide-on-mobile">{isOnline ? 'En línea' : 'Sin conexión'}</span>
            </div>

            {/* Cola de Sincronización en Background */}
            <AnimatePresence>
              {pendingCount > 0 && (
                <m.button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={!isOnline || isSyncing}
                  className="btn-secondary header-btn-small"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.96 }}
                  transition={springTouch}
                >
                  <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                  <span className="hide-on-mobile">
                    {pendingCount} {pendingCount === 1 ? 'pendiente' : 'pendientes'}
                  </span>
                  <span className="show-on-mobile tabular-nums header-mobile-time">
                    {pendingCount}
                  </span>
                </m.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Modal Táctil de PIN de 4 dígitos para Gerencia */}
      <GerenciaPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
      />

      {/* Bottom Sheet Táctil para Selector de Rol Móvil */}
      <RoleSelectSheet
        isOpen={showRoleSheet}
        currentRole={currentRole}
        isUnlocked={isUnlocked}
        onClose={() => setShowRoleSheet(false)}
        onSelectRole={handleRoleClick}
      />
    </>
  );
};
