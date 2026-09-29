import React, { useState, useCallback, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { springModal, springTouch } from '../../utils/motion';
import { parseCsv, parseFlexibleDate, autoMapColumn, type CsvFieldId, type CsvParseResult } from '../../utils/csvParser';
import { db, type Room, type Reservation } from '../../db/db';
import { eventBus } from '../../services/eventBus';

/* ─────────── Tipos ─────────── */

interface CsvImportModalProps {
  isOpen: boolean;
  rooms: Room[];
  onClose: () => void;
}

type ImportStep = 'upload' | 'map' | 'result';

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

const FIELD_OPTIONS: { id: CsvFieldId; label: string }[] = [
  { id: 'skip', label: '— Omitir —' },
  { id: 'room', label: 'Habitación (#)' },
  { id: 'guest', label: 'Huésped' },
  { id: 'contact', label: 'Contacto' },
  { id: 'checkIn', label: 'Fecha Entrada' },
  { id: 'checkOut', label: 'Fecha Salida' },
  { id: 'price', label: 'Precio Total' },
  { id: 'source', label: 'Origen' },
  { id: 'notes', label: 'Notas' },
];

/* ─────────── Componente ─────────── */

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, rooms, onClose }) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<CsvParseResult | null>(null);
  const [columnMap, setColumnMap] = useState<CsvFieldId[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setCsvData(null);
    setColumnMap([]);
    setResult(null);
    setIsDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ─── Paso 1: Parsear archivo ───
  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const parsed = parseCsv(text);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        return;
      }

      setCsvData(parsed);

      // Auto-mapear columnas
      const mapping = parsed.headers.map((h) => autoMapColumn(h));
      setColumnMap(mapping);
      setStep('map');
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt') || file.type.includes('csv') || file.type.includes('text'))) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  // ─── Paso 2: Mapear e importar ───
  const handleImport = useCallback(async () => {
    if (!csvData) return;

    const roomMap = new Map<string, Room>();
    for (const r of rooms) {
      roomMap.set(r.number, r);
      roomMap.set(r.number.toLowerCase(), r);
      // Soportar "101", "#101", "Hab 101"
      roomMap.set(`#${r.number}`, r);
    }

    const findColIdx = (field: CsvFieldId): number => columnMap.indexOf(field);

    const roomIdx = findColIdx('room');
    const guestIdx = findColIdx('guest');
    const checkInIdx = findColIdx('checkIn');
    const checkOutIdx = findColIdx('checkOut');
    const contactIdx = findColIdx('contact');
    const priceIdx = findColIdx('price');
    const sourceIdx = findColIdx('source');
    const notesIdx = findColIdx('notes');

    // Campos obligatorios
    if (roomIdx === -1 || guestIdx === -1 || checkInIdx === -1 || checkOutIdx === -1) {
      setResult({
        imported: 0,
        skipped: csvData.rows.length,
        errors: ['Faltan columnas obligatorias: Habitación, Huésped, Fecha Entrada y Fecha Salida deben estar mapeadas.'],
      });
      setStep('result');
      return;
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const reservationsToAdd: Reservation[] = [];

    for (let i = 0; i < csvData.rows.length; i++) {
      const row = csvData.rows[i];
      const rowNum = i + 2; // +1 por header, +1 por 1-indexed

      const rawRoom = (row[roomIdx] ?? '').trim().replace(/^#/, '').replace(/^hab\s*/i, '');
      const rawGuest = (row[guestIdx] ?? '').trim();
      const rawCheckIn = (row[checkInIdx] ?? '').trim();
      const rawCheckOut = (row[checkOutIdx] ?? '').trim();

      // Validar habitación
      const room = roomMap.get(rawRoom) ?? roomMap.get(rawRoom.toLowerCase());
      if (!room) {
        errors.push(`Fila ${rowNum}: Habitación "${rawRoom}" no encontrada.`);
        skipped++;
        continue;
      }

      // Validar huésped
      if (!rawGuest) {
        errors.push(`Fila ${rowNum}: Sin nombre de huésped.`);
        skipped++;
        continue;
      }

      // Parsear fechas
      const checkIn = parseFlexibleDate(rawCheckIn);
      const checkOut = parseFlexibleDate(rawCheckOut);

      if (!checkIn) {
        errors.push(`Fila ${rowNum}: Fecha de entrada inválida "${rawCheckIn}".`);
        skipped++;
        continue;
      }
      if (!checkOut) {
        errors.push(`Fila ${rowNum}: Fecha de salida inválida "${rawCheckOut}".`);
        skipped++;
        continue;
      }
      if (checkOut <= checkIn) {
        errors.push(`Fila ${rowNum}: La salida (${checkOut}) no es posterior a la entrada (${checkIn}).`);
        skipped++;
        continue;
      }

      // Campos opcionales
      const contact = contactIdx !== -1 ? (row[contactIdx] ?? '').trim() : '';
      const rawPrice = priceIdx !== -1 ? (row[priceIdx] ?? '').trim() : '';
      const rawSource = sourceIdx !== -1 ? (row[sourceIdx] ?? '').trim().toUpperCase() : '';
      const rawNotes = notesIdx !== -1 ? (row[notesIdx] ?? '').trim() : '';

      const price = parseFloat(rawPrice.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;

      let source: Reservation['source'] = 'EXCEL_IMPORT';
      if (rawSource.includes('BOOKING')) source = 'BOOKING';
      else if (rawSource.includes('AIRBNB')) source = 'AIRBNB';
      else if (rawSource.includes('MANUAL') || rawSource.includes('DIRECTA') || rawSource.includes('TELEFONO'))
        source = 'MANUAL';

      reservationsToAdd.push({
        id: `res_import_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
        roomId: room.id,
        guestName: rawGuest,
        guestContact: contact || undefined,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        status: 'CONFIRMED',
        source,
        totalPrice: price || room.price * Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000)),
        advancePayment: 0,
        notes: rawNotes || undefined,
      });

      imported++;
    }

    // Bulk insert
    if (reservationsToAdd.length > 0) {
      await db.reservations.bulkAdd(reservationsToAdd);
    }

    setResult({ imported, skipped, errors: errors.slice(0, 20) }); // Limitar a 20 errores
    setStep('result');

    if (imported > 0) {
      eventBus.emit({
        type: 'shift_event',
        title: 'Importación CSV Completada',
        message: `${imported} reservas importadas${skipped > 0 ? `, ${skipped} omitidas` : ''}.`,
      });
    }
  }, [csvData, columnMap, rooms]);

  const updateColumnMap = useCallback((colIdx: number, field: CsvFieldId) => {
    setColumnMap((prev) => {
      const next = [...prev];
      next[colIdx] = field;
      return next;
    });
  }, []);

  // ─── Validación: campos obligatorios mapeados ───
  const requiredMapped =
    columnMap.includes('room') &&
    columnMap.includes('guest') &&
    columnMap.includes('checkIn') &&
    columnMap.includes('checkOut');

  const previewRows = csvData?.rows.slice(0, 5) ?? [];

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <m.div
            className="modal-dialog modal-dialog-xl"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={springModal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h3 className="modal-title">
                <FileSpreadsheet size={16} />
                Importar Reservas desde CSV
              </h3>
              <m.button
                type="button"
                className="modal-close-btn"
                onClick={handleClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={springTouch}
              >
                <X size={16} />
              </m.button>
            </div>

            <div className="modal-body">
              {/* ═══ PASO 1: Subir archivo ═══ */}
              {step === 'upload' && (
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={springTouch}
                >
                  <div
                    className={`csv-dropzone ${isDragOver ? 'active' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={32} className="csv-dropzone-icon" />
                    <p className="csv-dropzone-title">
                      Arrastra tu archivo CSV aquí
                    </p>
                    <p className="csv-dropzone-hint">
                      o haz clic para seleccionar. Exporta tu hoja de Excel como .csv primero.
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileChange}
                      hidden
                    />
                  </div>

                  <div className="csv-format-hint">
                    <p><strong>Formato esperado:</strong></p>
                    <code className="csv-format-example">
                      Habitación,Huésped,Entrada,Salida,Precio,Origen{'\n'}
                      101,Juan Pérez,15/10/2026,18/10/2026,180000,Booking{'\n'}
                      203,María López,2026-10-20,2026-10-22,120000,Directa
                    </code>
                  </div>
                </m.div>
              )}

              {/* ═══ PASO 2: Mapear columnas ═══ */}
              {step === 'map' && csvData && (
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={springTouch}
                >
                  <p className="csv-step-label">
                    Verifica el mapeo de columnas. Muestra {previewRows.length} de {csvData.rows.length} filas.
                  </p>

                  <div className="csv-preview-scroll">
                    <table className="csv-preview-table">
                      <thead>
                        <tr>
                          {csvData.headers.map((h, i) => (
                            <th key={i}>
                              <span className="csv-header-original">{h}</span>
                              <select
                                className="csv-map-select"
                                value={columnMap[i] ?? 'skip'}
                                onChange={(e) => updateColumnMap(i, e.target.value as CsvFieldId)}
                              >
                                {FIELD_OPTIONS.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td key={ci}>{cell || '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!requiredMapped && (
                    <div className="overlap-warning">
                      <AlertTriangle size={14} />
                      <span>
                        Mapea al menos: <strong>Habitación</strong>, <strong>Huésped</strong>,{' '}
                        <strong>Fecha Entrada</strong> y <strong>Fecha Salida</strong>.
                      </span>
                    </div>
                  )}
                </m.div>
              )}

              {/* ═══ PASO 3: Resultado ═══ */}
              {step === 'result' && result && (
                <m.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={springTouch}
                  className="csv-result"
                >
                  {result.imported > 0 ? (
                    <div className="csv-result-success">
                      <CheckCircle2 size={28} />
                      <div>
                        <p className="csv-result-title">
                          {result.imported} reservas importadas
                        </p>
                        {result.skipped > 0 && (
                          <p className="csv-result-subtitle">
                            {result.skipped} filas omitidas por errores
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="csv-result-error">
                      <AlertTriangle size={28} />
                      <div>
                        <p className="csv-result-title">No se importó ninguna reserva</p>
                        <p className="csv-result-subtitle">
                          {result.skipped} filas con errores
                        </p>
                      </div>
                    </div>
                  )}

                  {result.errors.length > 0 && (
                    <div className="csv-error-list">
                      <p className="csv-error-list-title">Detalle de errores:</p>
                      <ul>
                        {result.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </m.div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              {step === 'upload' && (
                <m.button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  whileTap={{ scale: 0.97 }}
                  transition={springTouch}
                >
                  Cancelar
                </m.button>
              )}

              {step === 'map' && (
                <>
                  <m.button
                    type="button"
                    className="btn btn-secondary"
                    onClick={reset}
                    whileTap={{ scale: 0.97 }}
                    transition={springTouch}
                  >
                    Volver
                  </m.button>
                  <m.button
                    type="button"
                    className="btn btn-primary"
                    disabled={!requiredMapped}
                    onClick={handleImport}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={springTouch}
                  >
                    <ArrowRight size={14} />
                    Importar {csvData?.rows.length ?? 0} filas
                  </m.button>
                </>
              )}

              {step === 'result' && (
                <m.button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleClose}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springTouch}
                >
                  <CheckCircle2 size={14} />
                  Listo
                </m.button>
              )}
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
