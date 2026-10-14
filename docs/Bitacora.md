# HospedaFlow · Bitácora de Desarrollo

Historial de sesiones de trabajo, hitos completados y estado del proyecto.

---

## Sesiones Recientes

### Sesión 16: Rebranding a HospedaFlow, Modo Demo Autónomo y Despliegue Público
* **Fecha:** 14 de Octubre de 2026
* **Hitos completados:**
  1. **Rebranding Integral a HospedaFlow:**
     * Actualización sistemática de la identidad corporativa en el frontend (`index.html`, PWA manifest en `vite.config.ts`, `App.tsx`, `Header.tsx`, `LoginPage.tsx`, CSS design tokens en `index.css`).
     * Actualización del nombre de base de datos Dexie a `HospedaFlowDB` manteniendo exportación compatible de `HospedaSyncDatabase`.
     * Renombrado de canales de comunicación en tiempo real (`hospedaflow_live_bus`) y claves de almacenamiento (`hospedaflow_user`, `hospedaflow_token`, `hospedaflow_theme`) con lectura retrocompatible.
     * Actualización de documentación de arquitectura, directivas de agente (`AGENTS.md`, `.cursorrules`, `Overview.md`, `Arquitectura.md`, `ADR_Decisiones.md`).
  2. **Modo Demo Autónomo y Acceso Público Inmediato:**
     * Para que cualquier evaluador, profesor o compañero de clase pueda acceder sin fricción ni fallos de red en despliegues estáticos, se implementó `loginAsRole` en `AuthContext.tsx` y botones de acceso rápido de 1-clic en `LoginPage.tsx` (Recepción, Aseo Móvil, Gerencia).
     * Soporte de autenticación híbrida: si el backend API está disponible intenta autenticar contra `/api/auth/login`; si el backend está ausente o no responde, autentica localmente con credenciales demo (`admin1234`).
     * Persistencia de sesión protegida en `checkAuth()` para que los refrescos de página en despliegues estáticos conserven la sesión del usuario.
  3. **Configuración de Despliegue Público Gratuito (Vercel / Cloudflare Pages):**
     * Creación de `vercel.json` en raíz y en `frontend/` con directivas completas de reescritura SPA hacia `/index.html` y script de build automático.
  4. **Documentación de Apoyo para Exposición:**
     * Creación de `docs/Guia_Presentacion.md`: guión estructurado de 3 a 5 minutos paso a paso para la exposición académica de la novia del usuario.
     * Reescritura completa del `README.md` orientado a presentación ejecutiva y técnica.
* **Verificaciones:**
  * Build de producción Vite (`npm run build`) ejecutado con éxito (0 errores).
  * Suite de pruebas Vitest (`npm test -- --run`) 100% PASS (6/6).

### Sesión 15: Diagnóstico y Estabilización Integral de Conexión en cel-server
* **Fecha:** 12 de Octubre de 2026
* **Hitos completados:**
  1. **Diagnóstico de Caída de PostgreSQL en cel-server:**
     * Se identificó que tras reinicios o suspensión del móvil en Termux, el motor PostgreSQL no se iniciaba automáticamente.
     * En `internal/repository/repository.go` (`NewDBPool`), pgxpool no realizaba un ping activo, reportando falsamente una conexión exitosa mientras la base de datos estaba inactiva.
     * En `internal/handler/auth_handler.go`, cualquier error de BD en login se enmascaraba como `401 credenciales inválidas`, ocultando la caída del servicio.
  2. **Corrección Crítica en Script de Migraciones (`manage.sh`):**
     * El patrón `$CEL_PATH/sql/migrations/00*.sql` ejecutaba accidentalmente `000001_init_schema.down.sql` en cada despliegue, eliminando las tablas `shifts`, `shift_transactions` y `products`.
     * Se corrigió el loop de migración para ignorar estrictamente los archivos `*.down.sql` y ordenar lexicográficamente solo los archivos up y esquemas numéricos.
  3. **Corrección de Cookie `Secure` en Entornos HTTP / Tailscale:**
     * En producción bajo HTTP (`http://100.84.162.38:8080`), la cookie `hospedasync_session` se enviaba con el atributo `Secure`, provocando que Chrome y Android rechazaran/descartaran la cookie de sesión.
     * Se ajustó el atributo `Secure` de manera dinámica (`r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"`).
     * Se agregó retorno explícito de token JWT en el payload de login y soporte de fallback Bearer (`Authorization: Bearer <token>`) en `AuthContext.tsx` y `syncService.ts`.
  4. **Persistencia y Sembrado de Habitaciones (404 en Sincronización):**
     * La tabla `rooms` en PostgreSQL estaba vacía, ocasionando errores `404 Not Found` en la cola de sincronización al invocar `/api/v1/rooms/:id/status`.
     * Se creó la migración `006_seed_rooms_and_products.sql` alineada con las 7 habitaciones y productos base de Dexie.js.
     * Se transformó `UpdateRoomStatus` en `postgres_repository.go` a una operación UPSERT (`ON CONFLICT (id) DO UPDATE`), garantizando que la sincronización nunca falle por inexistencia de registro.
  5. **Autoarranque de PostgreSQL en Scripts Móviles:**
     * Se configuró verificación y arranque automático de PostgreSQL (`pg_ctl start`) en `manage.sh`, `manage.example.sh`, `bin/start-pocket.sh` y `~/start.sh` en `cel-server`.
  6. **CORS Dinámico para Tailscale:**
     * Inclusión de variables `CORS_ORIGINS` completas en `.env` en cel-server cubriendo IPs de Tailscale (`100.84.162.38`, `100.94.80.83`, `100.88.37.120`).
* **Verificaciones:**
  * Pruebas unitarias de Go (`go test ./...`) y Vitest (`npm test -- --run`) 100% PASS.
  * Verificación directa vía curl sobre Tailscale en `cel-server`: login 200 OK con cookies y Bearer, persistencia de sesión en `/api/auth/me`, actualización de habitaciones 200 OK (`rooms/101/status`) y conteo de BD validado (7 habitaciones, 4 productos, 2 usuarios).

### Sesión 14: Refinamientos Operativos, UI de Aseo y Auditoría Gerencial
* **Fecha:** 06 de Octubre de 2026
* **Hitos completados:**
  1. **Validaciones y Turnos de Caja Estrictos:**
     * Bloqueo de check-in pagado, ventas de minibar y registro de gastos si no hay un turno de caja abierto (aislamiento contable correcto).
     * En el cierre de caja, se incluyó el desglose de "Base dejada para el siguiente turno" y cálculo de "Efectivo a entregar al gerente".
  2. **Rediseño de Vista de Aseo (Housekeeper UI):**
     * Cumplimiento estricto de las reglas "Impeccable" y "Emil Kowalski Skill" usando tokens semánticos y Framer Motion (`springTouch`, `springModal`).
     * Las habitaciones se dividen jerárquicamente en dos grupos: "Por atender" (Sucias, Mantenimiento) destacadas visualmente y "Al día" (Ocupadas, Disponibles) con estilo atenuado.
     * Integración con `eventBus` para el refresco reactivo automático de la lista sin necesidad de recargar la página.
  3. **Auditoría Gerencial (Manager Audit UI):**
     * Nuevo modal `ShiftAuditModal` para la revisión exhaustiva de cierres de caja.
     * Permite al gerente "puntear" (marcar con check) cada movimiento individual (ingresos/egresos).
     * Módulo de firma de revisión donde el jefe confirma cuánto efectivo recibió, registrando el turno como `APPROVED` o `OBSERVED`.
     * `AdminView` actualizado con tarjetas/filas indicando qué cierres de caja están "Pendientes de revisión".
  4. **Mejoras en el Timeline y Recepción:**
     * Se añadieron tooltips informativos rápidos en las barras de la línea de tiempo.
     * **Auto-Release (No Show):** Las reservaciones cuya fecha de check-in ya pasó y seguían pendientes cambian automáticamente a `NO_SHOW`, liberando la habitación en el rack para clientes físicos.
  5. **UX Global:**
     * Corrección de contraste y opacidad en las notificaciones flotantes (Toasts) para que sean completamente legibles.

### Sesión 13: Finalización de SyncService, API de Actualización y Tests Unitarios
* **Fecha:** 01 de Octubre de 2026
* **Hitos completados:**
  1. **Finalización de `syncService.ts`:**
     * Despacho completo para todas las acciones de la cola: `CREATE_RESERVATION`, `UPDATE_RESERVATION` (reprogramación y cambio de estado), `RESOLVE_INCIDENT` (normalización de habitación y notas) y `ADD_TRANSACTION` (ventas directas y gastos a proveedores).
     * Resolución de IDs locales a identificadores de servidor para turnos aún no sincronizados.
     * Corrección de detección del estado online en entornos no navegador (`navigator.onLine`).
  2. **Drag & Drop de Reservas enlazado a Sincronización:**
     * Enlace de `syncService.enqueueAction('UPDATE_RESERVATION', ...)` al evento de soltar (`onDrop`) en `ReservationTimeline.tsx`.
     * Corrección de tipado TypeScript para eventos nativos de arrastre HTML5 sobre componentes Framer Motion.
     * Actualización del modelo `Reservation` y payload en `db.ts` incorporando marcas temporales y campos opcionales de edición.
  3. **Backend en Go (Actualización y Transacciones):**
     * Corrección de precisión financiera en `postgres_repository.go`: erradicación de división y multiplicación por 100 en `TotalPrice` y `AdvancePayment`, alineándolo con la convención de enteros COP del sistema.
     * Implementación de `UpdateReservation` en repository, service, handler y enrutador (`PUT /api/v1/reservations/{id}`).
     * Implementación de registro de transacciones de turno `AddShiftTransaction` en repository, service, handler y enrutador (`POST /api/v1/shifts/{id}/transactions`) con ajuste reactivo del saldo en caja.
  4. **Pruebas Unitarias Integrales:**
     * **Go:** `reservation_service_test.go` y `shift_service_test.go` cubriendo creación, rangos de fechas, actualización, ingresos y egresos de caja (100% PASS).
     * **Frontend:** Suite de pruebas con Vitest en `syncService.test.ts` evaluando encolado offline, procesamiento online, reintentos y mapeo de IDs (6/6 PASS).
  5. **Disciplina Git:**
     * 4 commits atómicos convencionales y descriptivos en la rama `main`.

### Sesión 12: Estabilización de Reservas y Saneamiento
* **Fecha:** 29 de Septiembre de 2026
* **Hitos completados:**
  1. **Estabilización de Frontend (Reservas Fase 1):** Resolución de errores TypeScript en `syncService.ts` tipando las acciones `CREATE_RESERVATION` y `UPDATE_RESERVATION`. Limpieza de dependencias y advertencias en el build de Vite.
  2. **Saneamiento del Repositorio:** Limpieza profunda de archivos temporales de Go y logs de depuración del despliegue en homelab. Consolidación de la Fase 1 UI en la rama `main`.
  3. **Preparación de Backend (Reservas):** Inicio de la implementación de la API en Go para persistencia de reservas y sincronización offline-first.

### Sesión 10: Motor de Reservas (Fase 1) y Hotfixes en cel-server
* **Fecha:** 28 de Septiembre de 2026
* **Hitos completados:**
  1. **Hotfix de Entorno y Despliegue en cel-server:**
     * Diagnóstico y solución del error HTTP 401 en login: El servidor Go fallaba silenciosamente al no contar con la base de datos `hospedasync` y `DATABASE_URL`.
     * Se crearon las bases de datos y se aplicaron las migraciones faltantes (`002` a `004`) en el `cel-server`.
     * Despliegue exitoso de binario ARM64 sobre SSH (`scp .new`) e inicio en segundo plano usando `nohup`.
  2. **Estrategia Channel Manager:**
     * Creación del ADR/Documento técnico: `docs/Estrategia_Reservas.md` delineando la evolución de Excel a un sistema nativo Offline-First y posterior sincronización con Booking.com mediante `iCal`.
  3. **Módulo de Reservas (Backend & BD local):**
     * Migración SQL `005_reservations.sql` con esquema para reservas futuras.
     * Actualización de Dexie.js a `version(4)` en `db.ts` añadiendo la colección `reservations` compatible con la arquitectura Offline-First.
* **Próximos pasos (Pendientes para próxima sesión):**
  * Crear la interfaz visual (Gantt/Timeline) en `ReceptionistView` mediante un Segmented Control para alternar entre "Rack" y "Línea de Tiempo".

### Sesión 11: Interfaz Visual de Línea de Tiempo de Reservas (Fase 1 UI)
* **Fecha:** 28 de Septiembre de 2026
* **Hitos completados:**
  1. **Segmented Control Rack / Línea de Tiempo:**
     * Nuevo componente `ViewModeToggle.tsx` con patrón `layoutId` animado (resortes `springSegment`) para alternar fluidamente entre la vista de Rack de habitaciones y la Línea de Tiempo de reservas.
  2. **Componente Gantt `ReservationTimeline.tsx`:**
     * Grid CSS con eje Y = habitaciones (columna sticky) y eje X = 14 días visibles (scrollable horizontal).
     * Navegación temporal: botones Semana anterior / siguiente + "Hoy" para saltar a la fecha actual.
     * Barras de reserva coloreadas por estado (Pendiente/Confirmada/Hospedado) con `springTouch` y `scaleX` de entrada.
     * Indicador visual del día actual y fines de semana con fondos diferenciados.
     * Click en celda vacía abre modal de creación con habitación y fecha pre-pobladas.
     * Click en barra de reserva abre modal de detalle.
     * Leyenda visual de estados al pie del timeline.
  3. **Modal `CreateReservationModal.tsx`:**
     * Formulario completo: habitación, huésped, contacto, fechas de entrada/salida, origen (Manual/Booking/Airbnb), precio total (auto-calculado por noches × tarifa), anticipo y notas.
     * Persistencia Offline-First en Dexie.js (`db.reservations`) con enqueue a `sync_queue` (`CREATE_RESERVATION`).
  4. **Modal `ReservationDetailModal.tsx`:**
     * Vista de detalle con grid de información: huésped, contacto, estancia, origen, tarifa, anticipo, saldo pendiente y notas.
     * Acciones: Confirmar (PENDING→CONFIRMED), Cancelar (con doble confirmación de seguridad), No Show.
     * Persistencia de cambios de estado con enqueue a sync.
  5. **CSS Semántico (Regla 1 "Impeccable"):**
     * ~300 líneas de CSS usando exclusivamente tokens semánticos de `index.css`. Cero estilos inline excepto el grid template dinámico calculado.
     * Responsive mobile con colapso de formularios a columna única.
* **Verificaciones:**
  * `npx tsc --noEmit` — 0 errores TypeScript.
  * `npx vite build` — Build exitoso en 239ms. Peso total del CSS: 31.21 KB (5.66 KB gzip).
* **Iteración 11b: Refresh Reactivo, Anti-Overbooking y Limpieza de Estilos:**
  1. **EventBus → Timeline:** `ReservationTimeline` suscrito al `eventBus`. Toda creación, cancelación o cambio de estado emite un evento que recarga automáticamente las barras del timeline sin cambiar de vista.
  2. **Validación Anti-Overbooking en tiempo real:**
     * Al seleccionar habitación + fechas en `CreateReservationModal`, se ejecuta una query Dexie que busca reservaciones activas con solapamiento (`checkInDate < checkOut && checkOutDate > checkIn`).
     * Si detecta conflicto, muestra un banner animado con el nombre del huésped conflictivo y bloquea el botón de confirmación.
  3. **Limpieza Regla 1 "Impeccable" — `RoomFilterBar.tsx`:**
     * Wrapper `div` con `style={{...}}` migrado a clase `.filter-bar-wrapper`.
     * Dot de estado inline migrado a clase `.filter-pill-dot` (el `backgroundColor` permanece dinámico por ser computado).
  * Build verificado: 0 errores TS, build 240ms.
* **Iteración 11c: Importador de CSV para Migración (Fase 1):**
  1. **Parser CSV Nativo sin Dependencias:** Creación de `utils/csvParser.ts` con auto-detección de delimitador (coma, punto y coma, tab), soporte para celdas entre comillas, auto-mapeo basado en expresiones regulares (identifica términos en inglés y español), y parseo de fechas flexible con heurística para Colombia (DD/MM/YYYY vs MM/DD/YYYY).
  2. **Interfaz de 3 Pasos (`CsvImportModal.tsx`):**
     * **Paso 1:** Zona Drag & Drop interactiva con pista de formato esperado.
     * **Paso 2:** Previsualización de tabla (las primeras 5 filas) con selectores para corregir el mapeo automático de columnas de manera manual.
     * **Paso 3:** Resumen de importación con conteo de éxito e inserción directa (vía Dexie `.bulkAdd()`) más volcado de errores de validación.
  3. **Integración:** El modal se enlazó a un botón de la barra de herramientas del timeline (`ReceptionistView` & `ReservationTimeline`), emitiendo un evento `shift_event` al completarse para recarga reactiva de los datos visuales.
* **Próximos pasos:**
  * Sincronización P2P en Background para la cola de reservas.
  * Drag & Drop en el timeline para extender fechas o cambiar habitaciones visualmente.


### Sesión 9: Optimización de Rendimiento y Migración a PWA Nativa
* **Fecha:** 28 de Septiembre de 2026
* **Hitos completados:**
  1. **Refactor de Rendimiento (A3):**
     * `ReceptionistView.tsx` refactorizado aplicando `React.memo` a `RoomCard` y envolviendo funciones handlers con `useCallback`. Esto evita el masivo re-renderizado del grid de habitaciones cuando se manipula un modal de cobro.
  2. **Lazy Loading de Animaciones (M6):**
     * Framer Motion migrado a carga diferida con `<LazyMotion features={domAnimation}>`.
     * Todas las etiquetas `<motion.div>` migradas a `<m.div>`. Esto divide el peso de la librería para que no bloquee el hilo principal en carga inicial.
  3. **Migración PWA (A2 y M1):**
     * Service Worker manual eliminado. Implementado `vite-plugin-pwa` para caché robusta mediante Workbox.
     * Manifest inyectado dinámicamente, asegurando que `theme_color` y `background_color` sean el corporativo `#1b2230`.
     * El tamaño pre-cacheado total es de apenas ~550 KB.
* **Verificaciones:**
  * Build optimizado usando _Code Splitting_ (vendors, db, motion, app).
  * 0 errores de TypeScript (`npx tsc --noEmit`).

### Sesión 8: Autenticación Integral, Seguridad Perimetral y Cierre de Deuda Técnica (C2)
* **Fecha:** 28 de Septiembre de 2026
* **Fuente:** Análisis de patrones del proyecto Novapalma (Express) adaptados a Go
* **Hitos completados:**
  1. **Core de Autenticación en Go:**
     * Hashing seguro con `bcrypt` (costo 10).
     * JWT (JSON Web Tokens) firmados con expiración de 12 horas.
     * Revocación stateful en base de datos (`user_sessions`).
  2. **Middlewares de Seguridad (Reemplazo de Helmet/Zod):**
     * `SecurityHeaders`: Inyección de cabeceras de seguridad estrictas (XSS, Sniffing, Frame-Options).
     * `Rate Limiting`: 15 intentos cada 15 minutos por IP en el endpoint de login.
     * `AuthMiddleware`: Validación robusta de cookies HttpOnly con fallback a Bearer token.
     * `RoleMiddleware`: RBAC (Control de Acceso Basado en Roles) para `admin`, `receptionist`, `housekeeper`.
  3. **Transporte Seguro (Offline-First Preservado):**
     * Tokens transmitidos 100% mediante **Cookies HttpOnly**, invisibles para XSS.
     * Frontend adaptado con `credentials: 'include'` en `syncService.ts`. Dexie jamás toca las credenciales, manteniendo la operación offline intacta tras el login.
  4. **Frontend Auth UI:**
     * `AuthContext` global con caché en `localStorage` del perfil del usuario.
     * `LoginPage` desarrollada siguiendo las 3 Reglas de Diseño: Cero inline styles, paleta oscura, y **Framer Motion spring physics** para animaciones de entrada y feedback de error (shake).
* **Verificaciones:**
  * Tests automáticos pasando (`go test ./...`).
  * Análisis de tipos estricto (`tsc --noEmit`) sin errores.

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

#### Sesión 7: Estabilización de Despliegue Remoto (cel-server) y Calendario Drag & Drop
* **Fecha:** 30 de Septiembre de 2026
* **Hitos completados:**
  1. **Solución a Conexión de Base de Datos en Producción:** Identificación y parche de variable `DATABASE_URL` ausente en el entorno del servidor móvil que causaba errores 401 silenciosos al conectarse a una base de datos vacía por defecto de PostgreSQL.
  2. **Refinamiento de Despliegue Automatizado (`manage.sh`):**
     * Copiado automático de credenciales correctas (`u0_a285` local de Termux) mediante creación remota de `.env`.
     * Solución al bloqueo de SSH por colgado de `stdin` agregando redirección `< /dev/null`.
     * Reemplazo de `pkill -f` por `pkill -x` para prevenir autoterminación prematura de la conexión SSH de despliegue.
  3. **Drag & Drop Nativo en Timeline de Reservas:**
     * Implementación usando la API nativa de arrastre de HTML5 (preservando filosofía offline-first ligera sin librerías externas).
     * Arrastre de barras de reserva entre celdas del calendario para reasignar fechas (`checkInDate`/`checkOutDate`) y habitaciones (`roomId`) visualmente.
     * Actualización instantánea en IndexedDB y sincronización mediante `eventBus`.

### Sesión 7: Refactorización Estética "Design Pro Max" y Correcciones Backend
* **Fecha:** 02 de Octubre de 2026
* **Hitos completados:**
  1. **Motor y Autenticación:**
     * Corrección crítica en `cmd/api/main.go` sobre el pool de conexiones de base de datos (`pgxpool`), evitando el bloqueo (hang) por expiración prematura del contexto.
     * Actualización de migraciones y esquema local de base de datos (`users.active`) para habilitar el inicio de sesión exitoso sin latencias de 30s.
  2. **Resolución de Conflictos PWA y Seguridad (CSP):**
     * Desactivación del secuestro de rutas `/api` y `/healthz` por parte del Service Worker de Vite PWA (`navigateFallbackDenylist`).
     * Relajación estructurada de Content-Security-Policy en el middleware de Go para soportar fuentes, imágenes externas e integraciones offline-first fluidas.
  3. **Refactorización Completa "Design Pro Max":**
     * Eliminación de saturación del color azul ("Blue Abuse") en el dashboard y tarjetas de habitaciones (`btn-secondary` para estados predeterminados).
     * Reescritura del sistema global de estilos en `index.css` a una estética ultra-premium (estilo Vercel/Linear) con negros absolutos (`#09090b`), bordes de cristal, tipografías tabulares y semáforo de operación rediseñado.
     * Depuración manual de CSS duplicado y heredado (más de 2,000 líneas) para corregir bugs de contraste (texto blanco en botones blancos del modal gerencial).
     * Rediseño y pulido estético en la página de Login y el Navbar de la aplicación (eliminación de logos fijos en azul, adaptación inteligente al tema del SO).

### Sesión 6: Calendario Visual de Reservas (Timeline) e Importación CSV
* **Fecha:** 30 de Septiembre de 2026
* **Hitos completados:**
  1. **Motor de Búsqueda y Persistencia Temporal:**
     * Renderizado eficiente de matriz temporal para 14 días con paginación horizontal y persistencia de memoria.
  2. **Diseño Visual e Integración de Framer Motion:**
     * Creación de grilla pegajosa (sticky headers) y renderizado de celdas según el estado dinámico (Días de Fin de Semana, Día Actual).
  3. **Servicio y Adaptador de Eventos Frontend (`eventBus.ts`):**
     * Mecanismo de notificaciones para comunicar actualizaciones de UI sin forzar re-renders masivos.
  4. **Adaptación Offline-First PWA:**
     * Configuración avanzada en Vite para desactivación estratégica del Service Worker durante el modo de desarrollo.

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

- [ ] **Fase 2 de Reservas (Channel Manager iCal):** Endpoint en Go para exportar (.ics) y Cron job para importar reservas desde OTAs (Booking, Airbnb).
- [ ] **Sincronización WebSocket en Tiempo Real:** Reemplazar el polling de sincronización por eventos bidireccionales con WebSockets en Go para avisos inmediatos entre camarera y recepcionista.
- [ ] **Impresión de Comprobante / Recibo:** Generación de recibo térmico (80mm) para check-out y minibar.
- [ ] **Reporte Exportable en PDF/Excel para Gerencia:** Descarga de auditoría de turnos cerrados y arqueos de caja.
- [x] **Módulo de Reservas Futuras:** Calendario tipo Timeline implementado con Drag & Drop y edición táctil.
- [ ] **Modularización del Frontend:** Desacoplar y organizar componentes para evitar acumulación excesiva (evitar archivos de 5k+ líneas).
- [ ] **Auditoría de Seguridad:** Revisión exhaustiva de vulnerabilidades, sanitización, límites de tasa y autenticación.
- [ ] **Actualización de Despliegue:** Automatización de despliegue en servidor personal local (`cel-server`) y vía VPN Tailscale.

