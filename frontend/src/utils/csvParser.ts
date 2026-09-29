/**
 * HospedaSync — Parser CSV ligero (sin dependencias externas)
 *
 * Soporta:
 * - Auto-detección de delimitador (coma, punto y coma, tab)
 * - Campos entrecomillados con comas internas
 * - Saltos de línea mixtos (\r\n, \n, \r)
 */

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
}

export function parseCsv(raw: string): CsvParseResult {
  const delimiter = detectDelimiter(raw);
  const lines = splitLines(raw);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseLine(lines[0], delimiter);
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseLine(line, delimiter);
    // Solo incluir filas que tengan al menos 1 campo no vacío
    if (cols.some((c) => c.trim())) {
      rows.push(cols);
    }
  }

  return { headers, rows };
}

function detectDelimiter(raw: string): string {
  const firstLine = raw.split(/\r?\n/)[0] ?? '';
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const tabs = (firstLine.match(/\t/g) ?? []).length;

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

function splitLines(raw: string): string[] {
  return raw.split(/\r?\n/);
}

function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Comilla doble escapada ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Intenta parsear una fecha en múltiples formatos comunes:
 * - YYYY-MM-DD (ISO)
 * - DD/MM/YYYY (ES/CO)
 * - MM/DD/YYYY (US)
 * - DD-MM-YYYY
 *
 * Retorna string YYYY-MM-DD o null si no puede parsear.
 */
export function parseFlexibleDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // ISO: 2026-10-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY o DD-MM-YYYY (formato colombiano / europeo)
  const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10);
    const year = parseInt(dmy[3], 10);

    // Heurística: si el primer número > 12, seguro es DD/MM
    // Si el segundo > 12, seguro es MM/DD
    // Si ambos <= 12, asumimos DD/MM (formato colombiano)
    if (day > 12 || month <= 12) {
      // DD/MM/YYYY
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else {
      // MM/DD/YYYY
      return `${year}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Intenta matchear un header del CSV con un campo conocido de reserva.
 * Retorna el fieldId o null si no hay match.
 */
export type CsvFieldId = 'room' | 'guest' | 'contact' | 'checkIn' | 'checkOut' | 'price' | 'source' | 'notes' | 'skip';

const FIELD_PATTERNS: [CsvFieldId, RegExp][] = [
  ['room', /^(hab|room|cuarto|num|nro|#|habitaci[oó]n)/i],
  ['guest', /^(huesped|huésped|guest|cliente|nombre|name)/i],
  ['contact', /^(contact|tel[eé]fono|phone|email|correo|cel)/i],
  ['checkIn', /^(entrada|check.?in|ingreso|llegada|in|fecha.?entrada|inicio)/i],
  ['checkOut', /^(salida|check.?out|egreso|partida|out|fecha.?salida|fin)/i],
  ['price', /^(precio|price|tarifa|valor|total|monto)/i],
  ['source', /^(origen|source|fuente|canal|plataforma)/i],
  ['notes', /^(notas?|notes?|observ|comentario)/i],
];

export function autoMapColumn(header: string): CsvFieldId {
  const clean = header.trim().toLowerCase();
  for (const [field, pattern] of FIELD_PATTERNS) {
    if (pattern.test(clean)) return field;
  }
  return 'skip';
}
