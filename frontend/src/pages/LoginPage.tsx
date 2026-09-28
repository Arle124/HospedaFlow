import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { springModal, springTouch } from '../utils/motion';

export const LoginPage: React.FC = () => {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);
    
    try {
      await login(email, password);
    } catch (err) {
      setIsShaking(true);
      setLocalError(error || 'Credenciales incorrectas.');
      setTimeout(() => {
        setIsShaking(false);
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          x: isShaking ? [-8, 8, -6, 6, -3, 3, 0] : 0 
        }}
        transition={springModal}
      >
        <div className="login-header">
          <div className="login-icon-wrapper">
            <Building2 size={24} />
          </div>
          <h1 className="login-title">HospedaSync</h1>
          <p className="login-subtitle">Sistema de Gestión Hotelera</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label" htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@hotel.com"
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">Contraseña</label>
            <div className="login-password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {(localError || error) && (
              <motion.div
                className="login-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <ShieldAlert size={14} />
                <span>{localError || error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            className="login-button btn-primary"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springTouch}
          >
            <LogIn size={16} />
            {isSubmitting ? 'Verificando...' : 'Iniciar Sesión'}
          </motion.button>
        </form>

        <div className="login-footer">
          HospedaSync PMS · Sistema de Gestion Hotelera
        </div>
      </motion.div>
    </div>
  );
};
