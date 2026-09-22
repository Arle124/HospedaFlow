import { useState, useEffect } from 'react';
import { Header, type UserRole } from './components/Header';
import { NotificationToast } from './components/NotificationToast';
import { ReceptionistView } from './views/ReceptionistView';
import { HousekeeperView } from './views/HousekeeperView';
import { AdminView } from './views/AdminView';
import { seedInitialDataIfNeeded } from './db/db';

function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('receptionist');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    seedInitialDataIfNeeded().then(() => {
      setIsInitialized(true);
    });
  }, []);

  if (!isInitialized) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-canvas)',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Iniciando almacén local de HospedaSync...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-canvas)' }}>
      <Header currentRole={currentRole} onRoleChange={setCurrentRole} />
      <NotificationToast />

      <main style={{ flex: 1 }}>
        {currentRole === 'receptionist' && <ReceptionistView />}
        {currentRole === 'housekeeper' && <HousekeeperView />}
        {currentRole === 'admin' && <AdminView />}
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '12px 20px',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1360px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        <div>
          <span>HospedaSync PMS</span> · <span>Terminal Local Autónomo</span>
        </div>
        <div>
          <span>Persistencia: IndexedDB (Dexie)</span> · <span>Modo Offline-First</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
