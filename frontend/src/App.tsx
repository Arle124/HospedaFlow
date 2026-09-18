import { useState, useEffect } from 'react';
import { Header, type UserRole } from './components/Header';
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--text-muted)'
      }}>
        Cargando HospedaSync...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header currentRole={currentRole} onRoleChange={setCurrentRole} />

      <main style={{ flex: 1, paddingTop: '20px' }}>
        {currentRole === 'receptionist' && <ReceptionistView />}
        {currentRole === 'housekeeper' && <HousekeeperView />}
        {currentRole === 'admin' && <AdminView />}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '16px 20px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-subtle)',
        backgroundColor: 'var(--bg-card)'
      }}>
        HospedaSync v1.0 · Arquitectura Offline-First con Sincronización Automática
      </footer>
    </div>
  );
}

export default App;
