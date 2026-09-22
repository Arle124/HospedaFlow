import React, { useEffect, useState } from 'react';
import { syncService } from '../services/syncService';
import {
  Hotel,
  Wifi,
  WifiOff,
  RefreshCw,
  Layers,
  Sparkles,
  BarChart3
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

  const updatePending = async () => {
    const count = await syncService.getPendingCount();
    setPendingCount(count);
  };

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

  return (
    <header
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '0 20px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Marca y Entorno */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '4px',
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
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)' }} />

          {/* Selector de Entornos Operativos (Roles delimitados) */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => onRoleChange('receptionist')}
              style={{
                backgroundColor: currentRole === 'receptionist' ? 'var(--bg-surface-elevated)' : 'transparent',
                color: currentRole === 'receptionist' ? '#60a5fa' : 'var(--text-secondary)',
                border: currentRole === 'receptionist' ? '1px solid var(--border-medium)' : '1px solid transparent',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: currentRole === 'receptionist' ? 600 : 400,
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
                color: currentRole === 'housekeeper' ? '#34d399' : 'var(--text-secondary)',
                border: currentRole === 'housekeeper' ? '1px solid var(--border-medium)' : '1px solid transparent',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: currentRole === 'housekeeper' ? 600 : 400,
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
                color: currentRole === 'admin' ? '#a78bfa' : 'var(--text-secondary)',
                border: currentRole === 'admin' ? '1px solid var(--border-medium)' : '1px solid transparent',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: currentRole === 'admin' ? 600 : 400,
              }}
            >
              <BarChart3 size={14} />
              Gerencia
            </button>
          </nav>
        </div>

        {/* Indicadores de Conectividad & Sincronización */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Badge de Red */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '500',
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
                padding: '4px 9px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#f8fafc',
                borderRadius: '4px',
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
