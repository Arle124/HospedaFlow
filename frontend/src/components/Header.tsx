import React, { useEffect, useState } from 'react';
import { syncService } from '../services/syncService';
import { getInitialTheme, applyTheme, type ThemeMode } from '../services/themeService';
import {
  Hotel,
  Wifi,
  WifiOff,
  RefreshCw,
  Layers,
  Sparkles,
  BarChart3,
  Sun,
  Moon
} from 'lucide-react';

export type UserRole = 'receptionist' | 'housekeeper' | 'admin';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

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
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <header
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          padding: '0 24px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Marca y Selector de Espacio Operacional */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Hotel size={16} />
            </div>
            <div>
              <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
                HospedaSync
              </span>
              <span
                style={{
                  marginLeft: '6px',
                  fontSize: '10px',
                  fontWeight: '600',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                }}
              >
                PMS
              </span>
            </div>
          </div>

          {/* Separador vertical */}
          <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-subtle)' }} />

          {/* Selector de Entornos */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => onRoleChange('receptionist')}
              style={{
                backgroundColor: currentRole === 'receptionist' ? 'var(--bg-surface-elevated)' : 'transparent',
                color: currentRole === 'receptionist' ? 'var(--border-focus)' : 'var(--text-secondary)',
                border: currentRole === 'receptionist' ? '1px solid var(--border-medium)' : '1px solid transparent',
                borderRadius: 'var(--radius-xs)',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: currentRole === 'receptionist' ? 600 : 500,
              }}
            >
              <Layers size={14} />
              Recepción
            </button>

            <button
              type="button"
              onClick={() => onRoleChange('housekeeper')}
              style={{
                backgroundColor: currentRole === 'housekeeper' ? 'var(--bg-surface-elevated)' : 'transparent',
                color: currentRole === 'housekeeper' ? 'var(--status-available-text)' : 'var(--text-secondary)',
                border: currentRole === 'housekeeper' ? '1px solid var(--border-medium)' : '1px solid transparent',
                borderRadius: 'var(--radius-xs)',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: currentRole === 'housekeeper' ? 600 : 500,
              }}
            >
              <Sparkles size={14} />
              Aseo (Móvil)
            </button>

            <button
              type="button"
              onClick={() => onRoleChange('admin')}
              style={{
                backgroundColor: currentRole === 'admin' ? 'var(--bg-surface-elevated)' : 'transparent',
                color: currentRole === 'admin' ? '#8b5cf6' : 'var(--text-secondary)',
                border: currentRole === 'admin' ? '1px solid var(--border-medium)' : '1px solid transparent',
                borderRadius: 'var(--radius-xs)',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: currentRole === 'admin' ? 600 : 500,
              }}
            >
              <BarChart3 size={14} />
              Gerencia
            </button>
          </nav>
        </div>

        {/* Indicadores de Conectividad, Sincronización y Switcher de Tema */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Botón de Modo Claro / Modo Oscuro */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
            title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
            style={{
              padding: '6px 9px',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-xs)',
              fontSize: '11px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {theme === 'light' ? <Moon size={13} /> : <Sun size={13} color="#f59e0b" />}
            <span>{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
          </button>

          {/* Badge de Conectividad */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 9px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: isOnline ? 'var(--status-available-bg)' : 'var(--status-dirty-bg)',
              color: isOnline ? 'var(--status-available-text)' : 'var(--status-dirty-text)',
              border: `1px solid ${isOnline ? 'var(--status-available-border)' : 'var(--status-dirty-border)'}`,
            }}
          >
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{isOnline ? 'En línea' : 'Sin conexión'}</span>
          </div>

          {/* Cola de Sincronización */}
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={!isOnline || isSyncing}
              style={{
                fontSize: '11px',
                padding: '5px 9px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              <span>{pendingCount} {pendingCount === 1 ? 'pendiente' : 'pendientes'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
