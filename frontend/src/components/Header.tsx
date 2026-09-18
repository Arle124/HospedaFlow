import React, { useEffect, useState } from 'react';
import { syncService } from '../services/syncService';
import {
  Hotel,
  Wifi,
  WifiOff,
  RefreshCw,
  Monitor,
  Sparkles,
  ShieldCheck
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

  const updatePending = async () => {
    const count = await syncService.getPendingCount();
    setPendingCount(count);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await syncService.processSyncQueue();
    await updatePending();
    setIsSyncing(false);
  };

  return (
    <header style={{
      backgroundColor: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    }}>
      <div className="container" style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        paddingTop: '12px',
        paddingBottom: '12px'
      }}>
        {/* Marca & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            backgroundColor: 'var(--primary)',
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Hotel size={22} />
          </div>
          <div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: '700',
              letterSpacing: '-0.3px',
              color: 'var(--text-main)',
              lineHeight: 1.2
            }}>
              HospedaSync
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Hotel PMS · Offline-First
            </span>
          </div>
        </div>

        {/* Selector de Roles */}
        <nav style={{
          display: 'flex',
          backgroundColor: 'var(--bg-input)',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
          gap: '4px'
        }}>
          <button
            onClick={() => onRoleChange('receptionist')}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              backgroundColor: currentRole === 'receptionist' ? 'var(--primary)' : 'transparent',
              color: currentRole === 'receptionist' ? '#fff' : 'var(--text-muted)',
            }}
          >
            <Monitor size={15} />
            <span>Recepción (PC)</span>
          </button>
          <button
            onClick={() => onRoleChange('housekeeper')}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              backgroundColor: currentRole === 'housekeeper' ? 'var(--primary)' : 'transparent',
              color: currentRole === 'housekeeper' ? '#fff' : 'var(--text-muted)',
            }}
          >
            <Sparkles size={15} />
            <span>Aseo (Móvil)</span>
          </button>
          <button
            onClick={() => onRoleChange('admin')}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              backgroundColor: currentRole === 'admin' ? 'var(--primary)' : 'transparent',
              color: currentRole === 'admin' ? '#fff' : 'var(--text-muted)',
            }}
          >
            <ShieldCheck size={15} />
            <span>Gerencia</span>
          </button>
        </nav>

        {/* Estado de Conectividad & Sincronización */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`}>
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isOnline ? 'En Línea' : 'Offline'}
          </span>

          {pendingCount > 0 && (
            <span className="badge badge-warning" title="Cambios locales pendientes de enviar al servidor">
              {pendingCount} pend.
            </span>
          )}

          <button
            onClick={handleSyncNow}
            disabled={!isOnline || isSyncing}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '12px'
            }}
            title="Sincronizar cambios locales con la base de datos central"
          >
            <RefreshCw size={14} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
