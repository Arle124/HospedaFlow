import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Sparkles, BarChart3, Lock, Check, X } from 'lucide-react';
import { springTouch } from '../utils/motion';
import type { UserRole } from './Header';

interface RoleSelectSheetProps {
  isOpen: boolean;
  currentRole: UserRole;
  isUnlocked: boolean;
  onClose: () => void;
  onSelectRole: (role: UserRole) => void;
}

const ROLE_OPTIONS: {
  id: UserRole;
  label: string;
  sublabel: string;
  icon: React.FC<{ size?: number; color?: string }>;
  isRestricted?: boolean;
}[] = [
  {
    id: 'receptionist',
    label: 'Recepción',
    sublabel: 'Gestión de caja, check-in, check-out y rack de habitaciones',
    icon: Layers,
  },
  {
    id: 'housekeeper',
    label: 'Aseo (Housekeeping)',
    sublabel: 'Alistamiento de cuartos, reporte de averías y modo una mano',
    icon: Sparkles,
  },
  {
    id: 'admin',
    label: 'Gerencia y Auditoría',
    sublabel: 'Métricas financieras, auditoría de turnos y control de inventario',
    icon: BarChart3,
    isRestricted: true,
  },
];

export const RoleSelectSheet: React.FC<RoleSelectSheetProps> = ({
  isOpen,
  currentRole,
  isUnlocked,
  onClose,
  onSelectRole,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={onClose} style={{ alignItems: 'flex-end', padding: 0 }}>
        <motion.div
          className="modal-card"
          onClick={(e) => e.stopPropagation()}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{
            maxWidth: '100%',
            width: '100%',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px 18px 30px',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
        >
          {/* Indicador táctil de arrastre (Handle) */}
          <div
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '2px',
              backgroundColor: 'var(--border-medium)',
              margin: '0 auto 16px',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Entorno Operacional
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Cambiar de perfil operativo en este dispositivo
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '6px', borderRadius: '50%', width: '28px', height: '28px' }}
              aria-label="Cerrar selector"
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ROLE_OPTIONS.map(({ id, label, sublabel, icon: Icon, isRestricted }) => {
              const isSelected = currentRole === id;
              return (
                <motion.button
                  key={id}
                  type="button"
                  onClick={() => onSelectRole(id)}
                  whileTap={{ scale: 0.98 }}
                  transition={springTouch}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-input)',
                    border: `1px solid ${isSelected ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isSelected ? '#2563eb' : 'var(--bg-surface)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {label}
                        </span>
                        {isRestricted && !isUnlocked && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '10px',
                              fontWeight: '600',
                              color: 'var(--status-dirty-text)',
                              backgroundColor: 'var(--status-dirty-bg)',
                              border: '1px solid var(--status-dirty-border)',
                              borderRadius: '4px',
                              padding: '1px 5px',
                            }}
                          >
                            <Lock size={10} /> PIN
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.3' }}>
                        {sublabel}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={14} />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
