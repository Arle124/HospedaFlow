# HospedaSync · Arquitectura Técnica

Documento de referencia para agentes de IA y desarrolladores. Permite comprender el funcionamiento del sistema sin necesidad de re-inspeccionar todo el código fuente.

---

## 1. Esquema de Persistencia Local (IndexedDB / Dexie)

Definido en `frontend/src/db/db.ts`:

* **`rooms`:**
  * `id`: string
  * `number`: string (ej. "101")
  * `floor`: number
  * `type`: string ('Simple', 'Doble', 'Suite')
  * `price`: number (tarifa por noche)
  * `status`: 'available' | 'occupied' | 'dirty' | 'cleaning' | 'maintenance'
  * `guestName`?: string
  * `guestsCount`?: number (default 1)
  * `paymentStatus`?: 'PAID' | 'PENDING'
  * `paidAmount`?: number
  * `consumptions`?: `RoomConsumption[]`
  * `notes`?: string (novedades o avisos de aseo)
* **`shifts` (Turnos de Caja):**
  * `id`: string
  * `openedAt`, `closedAt`: string (ISO)
  * `initialCash`: number (fondo de caja)
  * `currentCash`: number (efectivo acumulado en tiempo real)
  * `expectedCash`?: number
  * `actualCash`?: number (declarado por el recepcionista)
  * `difference`?: number (sobrante o faltante)
  * `status`: 'OPEN' | 'CLOSED'
* **`cashMovements`:**
  * `id`: string
  * `shiftId`: string
  * `type`: 'INITIAL' | 'INCOME_ROOM' | 'INCOME_MINIBAR' | 'EXPENSE_SUPPLIER'
  * `amount`: number
  * `concept`: string
  * `roomNumber`?: string
  * `supplier`?: string
  * `receipt`?: string

---

## 2. Flujo Financiero y Contable

1. **Apertura de Turno:**
   * El recepcionista ingresa el efectivo base inicial (`initialCash`). Se crea el turno en estado `OPEN`.
2. **Check-in:**
   * Si `paymentStatus === 'PAID'`: Se suma el valor de la habitación a `activeShift.currentCash` y se genera movimiento `INCOME_ROOM`.
   * Si `paymentStatus === 'PENDING'`: La habitación queda ocupada con cuenta abierta. No ingresa dinero a caja hasta el Check-out.
3. **Ventas de Minibar:**
   * Si destino es `cash`: Ingresa inmediatamente a caja (`INCOME_MINIBAR`).
   * Si destino es `room`: Se acumula en `room.consumptions` sin ingresar a caja.
4. **Pago a Proveedores / Egresos:**
   * Se descuenta de `activeShift.currentCash` (`EXPENSE_SUPPLIER`) con validación de saldo.
5. **Check-out y Liquidación:**
   * Se consolida: `(room.paymentStatus === 'PAID' ? 0 : room.price) + totalConsumptions`.
   * El valor liquidado se ingresa a caja, la habitación pasa a `dirty` y se limpia el folio.

---

## 3. Flujo Offline-First y Sincronización

* Administrado por `frontend/src/services/syncService.ts`.
* Cada acción (`ADD_TRANSACTION`, `UPDATE_ROOM_STATUS`, `SYNC_SHIFT`) se almacena localmente en `sync_queue`.
* El listener de estado de red (`window.addEventListener('online')`) detecta conectividad y despacha la cola hacia la API en Go en `/api/v1/sync`.
