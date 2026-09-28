import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthUser {
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
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('hospedasync_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        const res = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setUser(data.data);
            localStorage.setItem('hospedasync_user', JSON.stringify(data.data));
          } else {
            setUser(null);
            localStorage.removeItem('hospedasync_user');
          }
        } else {
          setUser(null);
          localStorage.removeItem('hospedasync_user');
        }
      } catch (err) {
        console.error('Failed to check auth:', err);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setUser(data.data);
        localStorage.setItem('hospedasync_user', JSON.stringify(data.data));
      } else {
        setError(data.message || 'Error al iniciar sesión');
        throw new Error('Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Failed to logout:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('hospedasync_user');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
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
