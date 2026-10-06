import type { CashMovement, LocalShift, PaymentMethod } from '../db/db';

export interface ProductLine {
  name: string;
  qty: number;
  total: number;
}

export interface ShiftSummary {
  /** Ingresos por medio de pago (hospedaje + minibar). */
  incomeByMethod: Record<PaymentMethod, number>;
  incomeRoom: number;
  incomeMinibar: number;
  totalSales: number;
  /** Egresos pagados desde la gaveta. */
  expenses: number;
  surcharges: number;
  /** Efectivo que debería haber en gaveta: base + ingresos en efectivo - egresos. */
  expectedCash: number;
  totalDigital: number;
  /** Unidades vendidas por producto (minibar directo y consumos liquidados). */
  products: ProductLine[];
  roomCount: number;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Nequi / QR',
  CARD: 'Datáfono',
};

export function summarizeShift(shift: LocalShift, movements: CashMovement[]): ShiftSummary {
  const incomeByMethod: Record<PaymentMethod, number> = { CASH: 0, TRANSFER: 0, CARD: 0 };
  let incomeRoom = 0;
  let incomeMinibar = 0;
  let expenses = 0;
  let surcharges = 0;
  let roomCount = 0;
  const productMap = new Map<string, ProductLine>();

  for (const m of movements) {
    if (m.type === 'EXPENSE_SUPPLIER') {
      expenses += m.amount;
      continue;
    }
    incomeByMethod[m.paymentMethod ?? 'CASH'] += m.amount;
    surcharges += m.surcharge ?? 0;
    if (m.type === 'INCOME_ROOM') {
      incomeRoom += m.amount;
      roomCount += 1;
    } else {
      incomeMinibar += m.amount;
    }
    for (const item of m.items ?? []) {
      const line = productMap.get(item.name) ?? { name: item.name, qty: 0, total: 0 };
      line.qty += item.qty;
      line.total += item.qty * item.unitPrice;
      productMap.set(item.name, line);
    }
  }

  return {
    incomeByMethod,
    incomeRoom,
    incomeMinibar,
    totalSales: incomeRoom + incomeMinibar,
    expenses,
    surcharges,
    expectedCash: shift.initialCash + incomeByMethod.CASH - expenses,
    totalDigital: incomeByMethod.TRANSFER + incomeByMethod.CARD,
    products: [...productMap.values()].sort((a, b) => b.total - a.total),
    roomCount,
  };
}

export function formatCOP(value: number): string {
  return `$ ${Math.round(value).toLocaleString('es-CO')}`;
}

/** Etiqueta corta y legible para un turno. */
export function shiftLabel(shift: LocalShift): string {
  const d = new Date(shift.startedAt);
  const date = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}
