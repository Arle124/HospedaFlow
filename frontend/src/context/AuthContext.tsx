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

        const token = localStorage.getItem('hospedasync_token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          headers,
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            const userObj = (data.data.user || data.data) as AuthUser;
            setUser(userObj);
            localStorage.setItem('hospedasync_user', JSON.stringify(userObj));
          } else {
            setUser(null);
            localStorage.removeItem('hospedasync_user');
            localStorage.removeItem('hospedasync_token');
          }
        } else {
          setUser(null);
          localStorage.removeItem('hospedasync_user');
          localStorage.removeItem('hospedasync_token');
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
        const userObj = (data.data.user || data.data) as AuthUser;
        if (data.data?.token) {
          localStorage.setItem('hospedasync_token', data.data.token);
        }
        setUser(userObj);
        localStorage.setItem('hospedasync_user', JSON.stringify(userObj));
      } else {
        setError(data.error || data.message || 'Error al iniciar sesión');
        throw new Error(data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
      throw err;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('hospedasync_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
    } catch (err) {
      console.error('Failed to logout:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('hospedasync_user');
      localStorage.removeItem('hospedasync_token');
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
