import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Building2, Eye, EyeOff, AlertCircle, Layers, Sparkles, BarChart3, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { springTouch } from '../utils/motion';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const { login, loginAsRole, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);
    
    try {
      await login(email, password);
    } catch (err: any) {
      setLocalError(err.message || 'Credenciales incorrectas o error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="hq-login-container">
      <div className="hq-login-visual">
        <div className="hq-visual-overlay"></div>
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="hq-visual-content"
        >
          <div className="hq-brand-mark">
            <Building2 size={28} strokeWidth={1.5} />
          </div>
          <h2 className="hq-visual-title">La nueva forma de gestionar tu hotel.</h2>
          <p className="hq-visual-subtitle">
            HospedaFlow unifica recepción, minibar y caja en un ecosistema offline-first ultrarrápido y seguro.
          </p>
        </m.div>
      </div>

      <div className="hq-login-form-wrapper">
        <m.div 
          className="hq-login-form-inner"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hq-login-header">
            <h1>Bienvenido a HospedaFlow</h1>
            <p>Ingresa a tu cuenta o elige un perfil de prueba</p>
          </div>

          <form onSubmit={handleSubmit} className="hq-form">
            <div className="hq-input-group">
              <label htmlFor="email">Correo electrónico</label>
              <div className="hq-input-container">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hospedaflow.local"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="hq-input-group">
              <label htmlFor="password">Contraseña</label>
              <div className="hq-input-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="hq-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {(localError || error) && (
                <m.div 
                  className="hq-error-banner"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                >
                  <AlertCircle size={16} />
                  <span>{localError || error}</span>
                </m.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              className="hq-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verificando credenciales...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Acceso Rápido para Demostración */}
          <div className="hq-demo-divider">
            <span className="hq-demo-divider-line" />
            <span className="hq-demo-divider-text">Acceso rápido para evaluación</span>
            <span className="hq-demo-divider-line" />
          </div>

          <div className="hq-demo-roles">
            <m.button
              type="button"
              className="hq-demo-btn"
              onClick={() => loginAsRole('receptionist')}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={springTouch}
            >
              <div className="hq-demo-btn-icon">
                <Layers size={16} />
              </div>
              <div className="hq-demo-btn-info">
                <strong>Recepción</strong>
                <small>Rack interactivo y caja</small>
              </div>
              <ArrowRight size={14} className="hq-demo-arrow" />
            </m.button>

            <m.button
              type="button"
              className="hq-demo-btn"
              onClick={() => loginAsRole('housekeeper')}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={springTouch}
            >
              <div className="hq-demo-btn-icon">
                <Sparkles size={16} />
              </div>
              <div className="hq-demo-btn-info">
                <strong>Aseo (Móvil)</strong>
                <small>Terminal de camareras</small>
              </div>
              <ArrowRight size={14} className="hq-demo-arrow" />
            </m.button>

            <m.button
              type="button"
              className="hq-demo-btn"
              onClick={() => loginAsRole('admin')}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={springTouch}
            >
              <div className="hq-demo-btn-icon">
                <BarChart3 size={16} />
              </div>
              <div className="hq-demo-btn-info">
                <strong>Gerencia</strong>
                <small>Auditoría de turnos y KPIs</small>
              </div>
              <ArrowRight size={14} className="hq-demo-arrow" />
            </m.button>
          </div>

          <div className="hq-demo-hint">
            <span>Credenciales demo: <code>admin1234</code></span>
          </div>

          <div className="hq-login-footer">
            <p>HospedaFlow PMS · <span>Modo Autónomo Offline-First</span></p>
          </div>
        </m.div>
      </div>
    </div>
  );
};
