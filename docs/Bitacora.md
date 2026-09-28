# HospedaSync · Bitácora de Desarrollo

Historial de sesiones de trabajo, hitos completados y estado del proyecto.

---

## Sesiones Recientes

### Sesión 7: Correcciones Críticas de Auditoría — Precisión Financiera, Sync Real y Seguridad
* **Fecha:** 28 de Septiembre de 2026
* **Fuente:** Auditoría exhaustiva de sesión anterior (4 críticos, 8 altos, 6 medios, 3 bajos)
* **Hitos completados:**
  1. **A5 — Precisión Financiera (float64 → int64):**
     * Migración completa de `float64` a `int64` en toda la capa Go para campos monetarios (`InitialCash`, `CurrentCash`, `ActualCash`, `Difference`, `Price`).
     * Archivos: `domain/shift.go`, `domain/inventory.go`, `handler/shift_handler.go`, `service/shift_service.go`, `repository/postgres_repository.go`.
     * Conversión DB↔Go: scan desde `NUMERIC(12,2)` a `float64` temporal → `int64(math.Round())`. Escritura directa de `int64` a NUMERIC.
     * Tests actualizados y pasando: `shift_service_test.go` con todos los tipos migrados.
  2. **C1 — Sincronización Real de Habitaciones (fin del mock):**
     * **Backend:** Nuevo endpoint `PUT /api/v1/rooms/{id}/status` con clean architecture completa:
       * `domain/room.go` — entidad Room con estados tipados.
       * `service/room_service.go` — validación de estados permitidos.
       * `handler/room_handler.go` — transporte HTTP con error handling semántico.
       * `repository/postgres_repository.go` — `UpdateRoomStatus` con query parametrizada.
     * **SQL:** Migración `sql/migrations/002_rooms.sql` con tabla `rooms`.
     * **Frontend:** `syncService.ts` `UPDATE_ROOM_STATUS` ahora hace `fetch PUT` real al endpoint con payload tipado (`UpdateRoomStatusPayload`).
  3. **C3 — CORS Restringido:**
     * Reemplazo de `Access-Control-Allow-Origin: *` por verificación de orígenes configurables.
     * Nueva variable de entorno `CORS_ORIGINS` (comma-separated) con default dev: `http://localhost:5173,http://localhost:8080`.
     * `Access-Control-Allow-Credentials: true` solo cuando el origen coincide.
  4. **A4 — Config Endurecida:**
     * Campo `CORSOrigins` añadido a `config.Config` con lectura desde env.
  5. **A1 — Erradicación de Estilos Inline (Regla 1 "Impeccable"):**
     * `App.tsx`: 4 bloques `style={{}}` migrados a clases `.app-loading`, `.app-shell`, `.app-main`, `.app-footer`.
     * `Header.tsx`, `NotificationToast.tsx`, `HousekeeperView.tsx`: todos los estilos inline migrados a clases semánticas en `index.css`.
     * Verificación: `grep -rn 'style={{' src/` retorna 0 resultados en archivos corregidos.
* **Verificaciones:**
  * `go vet ./...` — limpio
  * `go test ./...` — 6/6 tests PASS
  * `npx tsc --noEmit` — 0 errores TypeScript

### Sesión 6: Sincronización de Entornos, Aislamiento de Orígenes y Purga de Caché de Service Worker
* **Fecha:** 27 de Septiembre de 2026
* **Hitos completados:**
  1. **Diagnóstico de Discrepancia de Versiones (Tailscale vs Localhost / LAN):**
     * Identificación del comportamiento del Service Worker (`sw.js`) con política `stale-while-revalidate` (`hospedasync-v1`), el cual servía bundles y HTML antiguos cacheados bajo el origen local (`http://192.168.1.18:5173` y `http://localhost:5173`).
     * Explicación de la separación de orígenes (*Origin Scoping*): los navegadores aíslan `CacheStorage` estrictamente por `protocolo + dominio + puerto`. Al abrir por primera vez la IP Tailscale (`100.94.80.83:5173` o `100.84.162.38`), el navegador no tenía caché previa y servía la versión en vivo.
  2. **Desactivación de Service Worker en Entornos de Desarrollo:**
     * Modificación de `frontend/index.html` para detectar el puerto `5173` o `localhost` y proceder a desregistrar automáticamente cualquier Service Worker activo y vaciar `CacheStorage`, garantizando HMR en vivo sin interferencias.
  3. **Actualización de Service Worker a v2 con Estrategia Network-First:**
     * Actualización de `frontend/public/sw.js` a `hospedasync-v2` con eliminación de cachés obsoletas en el evento `activate`.
     * Implementación de estrategia Network-First para peticiones de navegación (`mode === 'navigate'`) con fallback a `/index.html` solo cuando el dispositivo esté offline.
  4. **Compilación y Sincronización en Homelab Móvil (`cel-server`):**
     * Compilación de producción con TypeScript y Vite.
     * Despliegue de `frontend/dist` en `cel-server:~/HospedaSync/frontend/dist` vía SSH (puerto 8022) y purga de bundles anteriores.

### Sesión 5: Renovación Estética del Frontend, Eliminación de IA Slop y Motion Táctil
* **Fecha:** 27 de Septiembre de 2026
* **Hitos completados:**
  1. **Integración de Design Skills:** Creación de `.cursorrules` y actualización de directivas en `AGENTS.md` (Impeccable, Taste Skill y Emil Kowalski Skill).
  2. **Instalación de Dependencias de Motion:** Integración de `framer-motion`, `clsx` y `tailwind-merge` en `frontend/package.json`.
  3. **Tokens de Movimiento (`motion.ts`):** Definición de físicas de resortes estándar (`springTouch`, `springSegment`, `springToast`, `springModal`).
  4. **Rediseño Completo de Header (`Header.tsx`):**
     * Erradicación de estilos inline y reemplazo por clases semánticas de diseño en `index.css`.
     * Segmented control elástico con `layoutId` para alternar fluidamente entre Recepción, Aseo y Gerencia.
     * Conmutador de modo claro/oscuro con rotación spring.
     * Badge de conectividad offline-first con pulso sutil.
  5. **Rediseño de Toasts (`NotificationToast.tsx`):**
     * Integración con `AnimatePresence` en modo `popLayout`.
     * Desplazamiento reactivo de toasts con físicas elásticas al descartar avisos.
  6. **Desarticulación y Modularización de `ReceptionistView.tsx`:**
     * Reducción del monolito de 2.089 líneas a 365 líneas desacopladas.
     * Creación de 8 subcomponentes atómicos en `views/receptionist/`: `ShiftBanner`, `RoomFilterBar`, `RoomCard`, `RoomDetailModal`, `CheckInModal`, `CheckOutModal`, `ShiftModals`, `MinibarModal` y `ExpenseModal`.
     * Eliminación masiva de CSS inline en favor de clases semánticas de diseño en `index.css`.
     * Inyección de físicas de resorte Framer Motion (`whileHover`, `whileTap`, `springModal`) en tarjetas y modales emergentes.
  7. **Arquitectura Contable de Multimedios de Pago (Efectivo vs Digital):**
     * Integración en Dexie.js (`db.ts` v3) de `PaymentMethod`: `CASH`, `TRANSFER` (Nequi/Daviplata/QR) y `CARD` (Datáfono con opción de recargo del 6%).
     * Selector de medio de pago en Check-in, Check-out y Venta de Minibar.
     * Separación contable estricta: los pagos digitales NO contaminan la gaveta física de billetes.
     * Arqueo y Cierre de Turno con conciliación por canales: arqueo de efectivo físico independiente y resumen auditado de Nequi y Datáfonos.
  8. **Soporte de Despliegue Móvil y Servidor Autónomo (`cel-server`):**
     * Configuración de proxy inverso `/api` y escucha en todas las interfaces de red (`host: true`) en `vite.config.ts`.
     * Capacidad en el router Chi de Go para servir la SPA de frontend directamente desde `frontend/dist` en el puerto 8080 si existe la compilación de producción.
     * Cross-compilación de binario estático optimizado para ARM64 (`bin/hospedasync-arm64`) para ejecución nativa en Android / Termux.
  9. **Adaptabilidad Móvil Completa, Role Bottom Sheet y Protección con PIN Gerencial:**
     * **Header Adaptativo Móvil:** Segmented control en desktop colapsado a un selector táctil compacto (*Role Pill*) en móvil (`<= 640px`), simplificando indicadores secundarios.
     * **Bottom Sheet Táctil de Selección de Rol:** Menú inferior táctil para alternar fluidamente entre Recepción, Aseo y Gerencia.
     * **Protección de Seguridad con PIN:** Modal numérico táctil de 4 dígitos para Gerencia (por defecto `1234`), con físicas de sacudida (*shake animation*) ante fallos y atajo de autocompletado para demostraciones comerciales.
     * **Vista Gerencial Móvil (`AdminView`):** Grid táctil de métricas 2x2 y transformación automática de tablas contables en tarjetas tipo recibo legibles sin scroll horizontal.

### Sesión 4: Validación de Mercado y Modelo Econométrico
* **Fecha:** 27 de Septiembre de 2026
* **Hitos completados:**
  * Estudio de mercado formal, proyección MCO en Python y evaluación financiera de flujo de caja libre.

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
