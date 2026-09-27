import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Delete, X, Sparkles } from 'lucide-react';
import { springModal, springTouch } from '../utils/motion';

interface GerenciaPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CORRECT_PIN = '1234';

export const GerenciaPinModal: React.FC<GerenciaPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    if (pin.length >= 4) return;
    setError('');
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      validatePin(newPin);
    }
  };

  const handleDelete = () => {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError('');
    setPin('');
  };

  const validatePin = (inputPin: string) => {
    if (inputPin === CORRECT_PIN) {
      onSuccess();
      setPin('');
      setError('');
    } else {
      setIsShaking(true);
      setError('PIN incorrecto. Intenta de nuevo.');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 600);
    }
  };

  const handleDemoBypass = () => {
    setPin(CORRECT_PIN);
    setTimeout(() => {
      onSuccess();
      setPin('');
      setError('');
    }, 200);
  };

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={onClose}>
        <motion.div
          className="modal-card"
          style={{ maxWidth: '360px', width: '100%', padding: '24px 20px', textAlign: 'center' }}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            x: isShaking ? [-8, 8, -6, 6, -3, 3, 0] : 0,
          }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={springModal}
        >
          {/* Cabecera del Modal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ width: '28px' }} />
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
                margin: '0 auto',
              }}
            >
              <Lock size={22} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '6px', borderRadius: '50%', width: '28px', height: '28px' }}
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>

          <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Acceso Gerencial Protegido
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Ingresa el PIN de 4 dígitos del propietario para autorizar la vista de auditoría.
          </p>

          {/* Indicadores de 4 dígitos */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '18px' }}>
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <motion.div
                  key={index}
                  animate={{
                    scale: isFilled ? [1, 1.2, 1] : 1,
                    backgroundColor: isFilled ? '#2563eb' : 'var(--bg-input)',
                    borderColor: isFilled ? '#3b82f6' : 'var(--border-medium)',
                  }}
                  transition={{ duration: 0.15 }}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid var(--border-medium)',
                  }}
                />
              );
            })}
          </div>

          {/* Mensaje de Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: '12px', color: 'var(--status-dirty-text)', marginBottom: '12px', fontWeight: '600' }}
            >
              {error}
            </motion.p>
          )}

          {/* Teclado Numérico Táctil */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              maxWidth: '260px',
              margin: '0 auto 16px',
            }}
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <motion.button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                whileTap={{ scale: 0.92 }}
                transition={springTouch}
                className="btn-secondary"
                style={{
                  height: '48px',
                  fontSize: '18px',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {digit}
              </motion.button>
            ))}

            <motion.button
              type="button"
              onClick={handleClear}
              whileTap={{ scale: 0.92 }}
              transition={springTouch}
              className="btn-secondary"
              style={{ height: '48px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}
            >
              Borrar
            </motion.button>

            <motion.button
              type="button"
              onClick={() => handleKeyPress('0')}
              whileTap={{ scale: 0.92 }}
              transition={springTouch}
              className="btn-secondary"
              style={{
                height: '48px',
                fontSize: '18px',
                fontWeight: '700',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              0
            </motion.button>

            <motion.button
              type="button"
              onClick={handleDelete}
              whileTap={{ scale: 0.92 }}
              transition={springTouch}
              className="btn-secondary"
              style={{ height: '48px' }}
              aria-label="Retroceder"
            >
              <Delete size={16} />
            </motion.button>
          </div>

          {/* Atajo Rápido para Demostraciones Comerciales */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '10px' }}>
            <motion.button
              type="button"
              onClick={handleDemoBypass}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={springTouch}
              className="btn-primary"
              style={{
                width: '100%',
                fontSize: '12px',
                fontWeight: '600',
                padding: '9px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={14} />
              <span>Autocompletar Acceso Demo (PIN: 1234)</span>
            </motion.button>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
              En producción este botón no existe y la camarera no puede acceder sin autorización.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
