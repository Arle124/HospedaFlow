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
      <div className="app-loading">
        Iniciando almacén local de HospedaSync...
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header currentRole={currentRole} onRoleChange={setCurrentRole} />
      <NotificationToast />

      <main className="app-main">
        {currentRole === 'receptionist' && <ReceptionistView />}
        {currentRole === 'housekeeper' && <HousekeeperView />}
        {currentRole === 'admin' && <AdminView />}
      </main>

      <footer className="app-footer">
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
