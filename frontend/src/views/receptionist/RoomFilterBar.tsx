import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { springTouch } from '../../utils/motion';

interface RoomFilterBarProps {
  filterStatus: string;
  onFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCount: number;
  availableCount: number;
  occupiedCount: number;
  dirtyCount: number;
  cleaningCount: number;
}

export const RoomFilterBar: React.FC<RoomFilterBarProps> = ({
  filterStatus,
  onFilterChange,
  searchQuery,
  onSearchChange,
  totalCount,
  availableCount,
  occupiedCount,
  dirtyCount,
  cleaningCount,
}) => {
  const tabs = [
    { id: 'all', label: `Todas (${totalCount})` },
    { id: 'available', label: `Disponibles (${availableCount})`, dot: 'var(--status-available-border)' },
    { id: 'occupied', label: `Ocupadas (${occupiedCount})`, dot: 'var(--status-occupied-border)' },
    { id: 'dirty', label: `Por asear (${dirtyCount})`, dot: 'var(--status-dirty-border)' },
    { id: 'cleaning', label: `En limpieza (${cleaningCount})`, dot: 'var(--status-cleaning-border)' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
      }}
    >
      {/* Pills de estado */}
      <div className="filter-group">
        {tabs.map((tab) => {
          const isActive = filterStatus === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange(tab.id)}
              className={`filter-pill ${isActive ? 'active' : ''}`}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={springTouch}
            >
              {tab.dot && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: tab.dot,
                    display: 'inline-block',
                  }}
                />
              )}
              <span>{tab.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Buscador reactivo */}
      <div className="search-box">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          placeholder="Buscar hab o huésped..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar habitación o huésped"
        />
      </div>
    </div>
  );
};
