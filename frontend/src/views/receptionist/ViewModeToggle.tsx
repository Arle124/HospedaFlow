import React from 'react';
import { m } from 'framer-motion';
import { LayoutGrid, CalendarRange } from 'lucide-react';
import { springTouch, springSegment } from '../../utils/motion';

export type ViewMode = 'rack' | 'timeline';

interface ViewModeToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

const MODES = [
  { id: 'rack' as const, label: 'Rack', icon: LayoutGrid },
  { id: 'timeline' as const, label: 'Línea de Tiempo', icon: CalendarRange },
];

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ mode, onModeChange }) => {
  return (
    <nav className="view-mode-nav" aria-label="Modo de vista">
      {MODES.map(({ id, label, icon: Icon }) => {
        const isActive = mode === id;
        return (
          <m.button
            key={id}
            type="button"
            onClick={() => onModeChange(id)}
            className={`view-mode-btn ${isActive ? 'active' : ''}`}
            whileTap={{ scale: 0.97 }}
            transition={springTouch}
          >
            {isActive && (
              <m.div
                layoutId="viewModeIndicator"
                className="view-mode-indicator"
                transition={springSegment}
              />
            )}
            <Icon size={14} />
            <span>{label}</span>
          </m.button>
        );
      })}
    </nav>
  );
};
