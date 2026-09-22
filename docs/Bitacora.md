# HospedaSync · Bitácora de Desarrollo

Historial de sesiones de trabajo, hitos completados y estado del proyecto.

---

## Sesiones Recientes

### Sesión 3: Cobro Flexible, Minibar en Habitación, Modal Flotante y Modo Oscuro
* **Fecha:** 22 de Septiembre de 2026
* **Hitos completados:**
  1. **Modalidad de pago flexible en Check-in:**
     * Opción por defecto: *Pagar al Check-out (cuenta abierta)* para liquidar junto con minibar.
     * Opción anticipada: *Pagar de inmediato* (ingresa el valor de la noche directamente al turno de caja activo).
     * Registro de número de huéspedes por habitación.
  2. **Trazabilidad de Consumos de Minibar:**
     * Modelo `RoomConsumption` en IndexedDB (`db.ts`).
     * Las ventas de minibar con destino habitación acumulan el detalle ítem por ítem en la estancia del huésped.
  3. **Ventana Flotante de Detalles de Habitación:**
     * Al hacer clic en cualquier tarjeta del rack se abre el detalle de la habitación: huésped, personas, tarifa, estado de pago de hospedaje, tabla de consumos de minibar y saldo total pendiente por cobrar.
  4. **Liquidación y Cobro Automático al Check-out:**
     * Modal con factura consolidada (hospedaje pendiente + total minibar).
     * Ingreso contable automático a la caja del turno activo.
     * Habitación pasa a *Requiere Aseo* para que la camarera la despache.
  5. **Ajuste del Modo Oscuro:**
     * Reemplazo de negro absoluto (`#090d16`) por carbón pizarra suave (`#1b2230`) con superficies en `#242c3d` y bordes bien definidos para evitar la fatiga visual.

---

### Sesión 2: Separación de Roles, Vista Móvil de Camarera y Avisos en Caliente
* **Fecha:** 22 de Septiembre de 2026
* **Hitos completados:**
  * Creación de `HousekeeperView.tsx` (vista móvil para personal de aseo).
  * Creación de `AdminView.tsx` (auditoría financiera para el gerente).
  * Flujo de avisos de novedades: la camarera reporta incidencias y tanto recepción como gerencia pueden resolverlas y retirarlas.

---

### Sesión 1: Arquitectura Offline-First y Turnos de Caja
* **Fecha:** 18 de Septiembre de 2026
* **Hitos completados:**
  * Configuración de Dexie.js para IndexedDB local con cola de sincronización (`sync_queue`).
  * Gestión de turnos de caja: fondo inicial, arqueo de cierre y cálculo de descuadres.
  * Backend Go con router Chi y migraciones.

---

## Tareas Pendientes y Backlog Priorizado

- [ ] **Sincronización WebSocket en Tiempo Real:** Reemplazar el polling de sincronización por eventos bidireccionales con WebSockets en Go para avisos inmediatos entre camarera y recepcionista.
- [ ] **Impresión de Comprobante / Recibo:** Generación de recibo térmico (80mm) para check-out y minibar.
- [ ] **Reporte Exportable en PDF/Excel para Gerencia:** Descarga de auditoría de turnos cerrados y arqueos de caja.
- [ ] **Módulo de Reservas Futuras:** Calendario tipo Timeline para agendar habitaciones con fechas de entrada y salida programadas.
