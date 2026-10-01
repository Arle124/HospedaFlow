import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { m } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, FileSpreadsheet } from 'lucide-react';
import { db, type Room, type Reservation } from '../../db/db';
import { eventBus } from '../../services/eventBus';
import { syncService } from '../../services/syncService';
import { springTouch, springModal } from '../../utils/motion';

/* ─────────── Helpers de Fecha ─────────── */

const DAY_MS = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function formatDayLabel(d: Date): { weekday: string; day: number; month: string } {
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return {
    weekday: weekdays[d.getDay()],
    day: d.getDate(),
    month: months[d.getMonth()],
  };
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/* ─────────── Colores de Estado ─────────── */

const STATUS_COLORS: Record<Reservation['status'], { bg: string; border: string; text: string }> = {
  PENDING: {
    bg: 'var(--status-dirty-bg)',
    border: 'var(--status-dirty-border)',
    text: 'var(--status-dirty-text)',
  },
  CONFIRMED: {
    bg: 'var(--status-occupied-bg)',
    border: 'var(--status-occupied-border)',
    text: 'var(--status-occupied-text)',
  },
  CHECKED_IN: {
    bg: 'var(--status-available-bg)',
    border: 'var(--status-available-border)',
    text: 'var(--status-available-text)',
  },
  CANCELLED: {
    bg: 'var(--status-maintenance-bg)',
    border: 'var(--status-maintenance-border)',
    text: 'var(--status-maintenance-text)',
  },
  NO_SHOW: {
    bg: 'var(--status-maintenance-bg)',
    border: 'var(--status-maintenance-border)',
    text: 'var(--status-maintenance-text)',
  },
};

const STATUS_LABELS: Record<Reservation['status'], string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'Hospedado',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No Show',
};

/* ─────────── Constantes de Layout ─────────── */

const VISIBLE_DAYS = 14;
const COL_WIDTH = 88; // px por día
const ROW_HEIGHT = 52; // px por habitación
const LABEL_COL_WIDTH = 80; // columna fija de números de habitación

/* ─────────── Props ─────────── */

interface ReservationTimelineProps {
  rooms: Room[];
  onCreateReservation: (roomId: string, checkIn: string, checkOut: string) => void;
  onSelectReservation: (reservation: Reservation) => void;
  onImportCsv: () => void;
}

/* ─────────── Componente Principal ─────────── */

export const ReservationTimeline: React.FC<ReservationTimelineProps> = ({
  rooms,
  onCreateReservation,
  onSelectReservation,
  onImportCsv,
}) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [offsetDays, setOffsetDays] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const windowStart = useMemo(() => addDays(today, offsetDays), [today, offsetDays]);
  const windowEnd = useMemo(() => addDays(windowStart, VISIBLE_DAYS), [windowStart]);

  const windowStartStr = toDateStr(windowStart);
  const windowEndStr = toDateStr(windowEnd);

  // Cargar reservaciones para la ventana visible
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const loadReservations = useCallback(async () => {
    const results = await db.reservations
      .where('checkInDate')
      .belowOrEqual(windowEndStr)
      .filter((r) => r.checkOutDate >= windowStartStr && r.status !== 'CANCELLED')
      .toArray();
    setReservations(results);
  }, [windowStartStr, windowEndStr]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // Re-cargar cuando se emita cualquier evento (reserva creada, cancelada, etc.)
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(() => {
      loadReservations();
    });
    return () => unsubscribe();
  }, [loadReservations]);

  // Agrupar reservaciones por habitación
  const reservationsByRoom = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations ?? []) {
      const list = map.get(r.roomId) ?? [];
      list.push(r);
      map.set(r.roomId, list);
    }
    return map;
  }, [reservations]);

  // Días visibles como array
  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < VISIBLE_DAYS; i++) {
      arr.push(addDays(windowStart, i));
    }
    return arr;
  }, [windowStart]);

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
    [rooms]
  );

  const handlePrev = useCallback(() => setOffsetDays((d) => d - 7), []);
  const handleNext = useCallback(() => setOffsetDays((d) => d + 7), []);
  const handleToday = useCallback(() => setOffsetDays(0), []);

  // Determinar el índice del día de hoy dentro de la ventana visible
  const todayIdx = daysBetween(windowStart, today);
  const isTodayVisible = todayIdx >= 0 && todayIdx < VISIBLE_DAYS;

  // Click en celda vacía para crear reserva
  const handleCellClick = useCallback(
    (roomId: string, dayDate: Date) => {
      const checkIn = toDateStr(dayDate);
      const checkOut = toDateStr(addDays(dayDate, 1));
      onCreateReservation(roomId, checkIn, checkOut);
    },
    [onCreateReservation]
  );

  // Mes y año del header
  const headerLabel = useMemo(() => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const startMonth = months[windowStart.getMonth()];
    const endMonth = months[addDays(windowStart, VISIBLE_DAYS - 1).getMonth()];
    const startYear = windowStart.getFullYear();
    const endYear = addDays(windowStart, VISIBLE_DAYS - 1).getFullYear();

    if (startMonth === endMonth) return `${startMonth} ${startYear}`;
    if (startYear === endYear) return `${startMonth} – ${endMonth} ${startYear}`;
    return `${startMonth} ${startYear} – ${endMonth} ${endYear}`;
  }, [windowStart]);

  return (
    <m.div
      className="timeline-container"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springModal}
    >
      {/* ─── Barra de Navegación Temporal ─── */}
      <div className="timeline-toolbar">
        <div className="timeline-toolbar-left">
          <h3 className="timeline-month-label">{headerLabel}</h3>
        </div>
        <div className="timeline-toolbar-right">
          <m.button
            type="button"
            className="timeline-nav-btn"
            onClick={onImportCsv}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={springTouch}
          >
            <FileSpreadsheet size={14} />
            <span>Importar CSV</span>
          </m.button>
          <m.button
            type="button"
            className="timeline-nav-btn"
            onClick={handleToday}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={springTouch}
            disabled={offsetDays === 0}
          >
            <CalendarDays size={14} />
            <span>Hoy</span>
          </m.button>
          <m.button
            type="button"
            className="timeline-nav-btn"
            onClick={handlePrev}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={springTouch}
            aria-label="Semana anterior"
          >
            <ChevronLeft size={16} />
          </m.button>
          <m.button
            type="button"
            className="timeline-nav-btn"
            onClick={handleNext}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={springTouch}
            aria-label="Semana siguiente"
          >
            <ChevronRight size={16} />
          </m.button>
        </div>
      </div>

      {/* ─── Grid del Timeline ─── */}
      <div className="timeline-scroll-wrapper" ref={scrollRef}>
        <div
          className="timeline-grid"
          style={{
            gridTemplateColumns: `${LABEL_COL_WIDTH}px repeat(${VISIBLE_DAYS}, ${COL_WIDTH}px)`,
            gridTemplateRows: `40px repeat(${sortedRooms.length}, ${ROW_HEIGHT}px)`,
          }}
        >
          {/* Header vacío esquina */}
          <div className="timeline-corner">Hab.</div>

          {/* Header de días */}
          {days.map((d, i) => {
            const { weekday, day } = formatDayLabel(d);
            const isToday = isTodayVisible && i === todayIdx;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div
                key={i}
                className={`timeline-day-header ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}
              >
                <span className="timeline-day-weekday">{weekday}</span>
                <span className="timeline-day-num">{day}</span>
              </div>
            );
          })}

          {/* Filas de habitaciones */}
          {sortedRooms.map((room) => {
            const roomReservations = reservationsByRoom.get(room.id) ?? [];

            return (
              <React.Fragment key={room.id}>
                {/* Label de habitación (sticky) */}
                <div className="timeline-room-label">
                  <span className="timeline-room-num">{room.number}</span>
                  <span className="timeline-room-type">{room.type}</span>
                </div>

                {/* Celdas de días */}
                {days.map((d, colIdx) => {
                  const isToday = isTodayVisible && colIdx === todayIdx;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={colIdx}
                      className={`timeline-cell ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}
                      onClick={() => handleCellClick(room.id, d)}
                      title={`Crear reserva: Hab ${room.number} – ${toDateStr(d)}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('drag-over');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('drag-over');
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('drag-over');
                        const resId = e.dataTransfer.getData('text/plain');
                        if (!resId) return;

                        const res = reservations.find((x) => x.id === resId);
                        if (!res) return;

                        const oldStart = parseDate(res.checkInDate);
                        const oldEnd = parseDate(res.checkOutDate);
                        const durationDays = daysBetween(oldStart, oldEnd);

                        const newStart = d;
                        const newEnd = addDays(newStart, durationDays);

                        const newCheckInStr = toDateStr(newStart);
                        const newCheckOutStr = toDateStr(newEnd);

                        if (res.roomId === room.id && res.checkInDate === newCheckInStr) {
                          return;
                        }

                        await db.reservations.update(res.id, {
                          roomId: room.id,
                          checkInDate: newCheckInStr,
                          checkOutDate: newCheckOutStr,
                          updatedAt: new Date().toISOString()
                        });

                        await syncService.enqueueAction('UPDATE_RESERVATION', {
                          id: res.id,
                          roomId: room.id,
                          checkInDate: newCheckInStr,
                          checkOutDate: newCheckOutStr,
                        });

                        eventBus.emit({
                          type: 'sync_event',
                          title: 'Reserva Movida',
                          message: `La reserva de ${res.guestName} fue movida a la Hab ${room.number}`,
                        });
                      }}
                    >
                      {/* Barras de reserva se renderizan solo desde la celda de inicio */}
                      {colIdx === 0 || true
                        ? roomReservations
                            .filter((r) => {
                              const rStart = parseDate(r.checkInDate);
                              const cellDate = d;
                              // Renderizar la barra solo en la celda donde inicia (o en la primera celda visible si ya empezó)
                              const renderStart = rStart < windowStart ? windowStart : rStart;
                              return (
                                cellDate.getTime() === renderStart.getTime() &&
                                cellDate.getTime() === d.getTime()
                              );
                            })
                            .map((r) => {
                              const rStart = parseDate(r.checkInDate);
                              const rEnd = parseDate(r.checkOutDate);
                              const visStart = rStart < windowStart ? windowStart : rStart;
                              const visEnd = rEnd > windowEnd ? windowEnd : rEnd;
                              const spanDays = daysBetween(visStart, visEnd);
                              const colors = STATUS_COLORS[r.status];

                              return (
                                <m.div
                                  key={r.id}
                                  className="timeline-bar"
                                  style={{
                                    width: `${spanDays * COL_WIDTH - 6}px`,
                                    backgroundColor: colors.bg,
                                    borderColor: colors.border,
                                    color: colors.text,
                                    cursor: 'grab',
                                  }}
                                  initial={{ opacity: 0, scaleX: 0.7 }}
                                  animate={{ opacity: 1, scaleX: 1 }}
                                  transition={springTouch}
                                  whileHover={{ y: -2 }}
                                  draggable={true}
                                  onDragStart={((e: React.DragEvent<HTMLDivElement>) => {
                                    e.stopPropagation();
                                    e.dataTransfer.setData('text/plain', r.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                  }) as any}
                                  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                    e.stopPropagation();
                                    onSelectReservation(r);
                                  }}
                                  title={`${r.guestName} · ${STATUS_LABELS[r.status]}`}
                                >
                                  <span className="timeline-bar-text">{r.guestName}</span>
                                  {spanDays >= 3 && (
                                    <span className="timeline-bar-dates">
                                      {rStart.getDate()}–{rEnd.getDate()}
                                    </span>
                                  )}
                                </m.div>
                              );
                            })
                        : null}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="timeline-legend">
        {Object.entries(STATUS_LABELS)
          .filter(([key]) => key !== 'CANCELLED' && key !== 'NO_SHOW')
          .map(([key, label]) => {
            const colors = STATUS_COLORS[key as Reservation['status']];
            return (
              <div key={key} className="timeline-legend-item">
                <span
                  className="timeline-legend-dot"
                  style={{ backgroundColor: colors.border }}
                />
                <span>{label}</span>
              </div>
            );
          })}
      </div>
    </m.div>
  );
};
