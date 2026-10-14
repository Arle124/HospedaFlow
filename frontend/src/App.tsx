import { LazyMotion, domAnimation } from "framer-motion";
import { useState, useEffect } from 'react';
import { Header, type UserRole } from './components/Header';
import { NotificationToast } from './components/NotificationToast';
import { ReceptionistView } from './views/ReceptionistView';
import { HousekeeperView } from './views/HousekeeperView';
import { AdminView } from './views/AdminView';
import { seedInitialDataIfNeeded } from './db/db';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>('receptionist');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    seedInitialDataIfNeeded()
      .then(() => {
        setIsInitialized(true);
      })
      .catch((err) => {
        console.error('Error al inicializar IndexedDB (Dexie):', err);
        // Evitamos que la app quede en pantalla negra si falla IndexedDB
        setIsInitialized(true); 
      });
  }, []);

  useEffect(() => {
    if (user?.role) {
      setCurrentRole(user.role);
    }
  }, [user]);

  if (isLoading || !isInitialized) {
    return (
      <div className="app-loading">
        Iniciando almacén local de HospedaFlow...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
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
          <span>HospedaFlow PMS</span> · <span>Terminal Local Autónomo</span>
        </div>
        <div>
          <span>Persistencia: IndexedDB (Dexie)</span> · <span>Modo Offline-First</span>
        </div>
      </footer>
    </div>
  );
}


function App() {
  return (
    <LazyMotion features={domAnimation}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LazyMotion>
  );
}

export default App;
