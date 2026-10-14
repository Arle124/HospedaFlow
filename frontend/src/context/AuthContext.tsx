import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'receptionist' | 'housekeeper' | 'admin';
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsRole: (role: 'receptionist' | 'housekeeper' | 'admin') => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const STORAGE_USER_KEY = 'hospedaflow_user';
const STORAGE_TOKEN_KEY = 'hospedaflow_token';
const LEGACY_USER_KEY = 'hospedasync_user';
const LEGACY_TOKEN_KEY = 'hospedasync_token';

export const DEMO_USERS: Record<'receptionist' | 'housekeeper' | 'admin', AuthUser> = {
  admin: {
    id: 1,
    name: 'Administrador Demo',
    email: 'admin@hospedaflow.local',
    role: 'admin',
  },
  receptionist: {
    id: 2,
    name: 'Recepcionista Demo',
    email: 'recepcion@hospedaflow.local',
    role: 'receptionist',
  },
  housekeeper: {
    id: 3,
    name: 'Camarera Demo',
    email: 'aseo@hospedaflow.local',
    role: 'housekeeper',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem(STORAGE_USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            localStorage.removeItem(STORAGE_USER_KEY);
            localStorage.removeItem(LEGACY_USER_KEY);
          }
        }

        const token = localStorage.getItem(STORAGE_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        try {
          const res = await fetch('/api/auth/me', {
            credentials: 'include',
            headers,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              const userObj = (data.data.user || data.data) as AuthUser;
              setUser(userObj);
              localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userObj));
            }
          } else if (res.status === 401) {
            // El servidor rechazó explícitamente el token/sesión
            setUser(null);
            localStorage.removeItem(STORAGE_USER_KEY);
            localStorage.removeItem(STORAGE_TOKEN_KEY);
            localStorage.removeItem(LEGACY_USER_KEY);
            localStorage.removeItem(LEGACY_TOKEN_KEY);
          }
          // Si es 404 u otro error (despliegue estático sin API), preservamos storedUser para offline/demo
        } catch {
          // Servidor no disponible o modo offline: preservamos sesión local activa
        }
      } catch (err) {
        console.error('Failed to check auth:', err);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loginAsRole = async (role: 'receptionist' | 'housekeeper' | 'admin') => {
    setError(null);
    const demoUser = DEMO_USERS[role];
    setUser(demoUser);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(demoUser));
    localStorage.setItem(STORAGE_TOKEN_KEY, `hospedaflow_demo_${role}_token`);
  };

  const login = async (email: string, password: string) => {
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();

    // Intentar autenticación con el backend Go si existe
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: normalizedEmail, password })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const userObj = (data.data.user || data.data) as AuthUser;
          if (data.data?.token) {
            localStorage.setItem(STORAGE_TOKEN_KEY, data.data.token);
          }
          setUser(userObj);
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userObj));
          return;
        }
      }
    } catch {
      // Backend no disponible en red (típico en despliegue estático de presentación)
      console.info('Backend API no disponible. Evaluando autenticación autónoma offline/demo.');
    }

    // Fallback de Autenticación Autónoma / Modo Demo Offline
    if (password === 'admin1234' || password === '1234' || password === 'demo') {
      let role: 'receptionist' | 'housekeeper' | 'admin' = 'receptionist';
      if (normalizedEmail.includes('admin') || normalizedEmail.includes('gerent')) {
        role = 'admin';
      } else if (normalizedEmail.includes('aseo') || normalizedEmail.includes('cama') || normalizedEmail.includes('limp')) {
        role = 'housekeeper';
      }

      const localUser: AuthUser = {
        id: role === 'admin' ? 1 : role === 'housekeeper' ? 3 : 2,
        name: role === 'admin' ? 'Administrador' : role === 'housekeeper' ? 'Personal de Aseo' : 'Recepcionista',
        email: normalizedEmail,
        role,
      };

      setUser(localUser);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(localUser));
      localStorage.setItem(STORAGE_TOKEN_KEY, `hospedaflow_offline_${role}_token`);
      return;
    }

    const errorMsg = 'Credenciales no válidas. (Para el modo demo usa contraseña: admin1234)';
    setError(errorMsg);
    throw new Error(errorMsg);
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem(STORAGE_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers,
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to logout:', err);
    } finally {
      setUser(null);
      localStorage.removeItem(STORAGE_USER_KEY);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      loginAsRole,
      logout,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
