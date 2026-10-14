# HospedaFlow PMS

Sistema de gestión hotelera (PMS - *Property Management System*) diseñado bajo la filosofía **Offline-First**. Garantiza la continuidad operativa integral de hoteles, hostales y alojamientos turísticos (recepción, caja, check-in, minibar, limpieza de habitaciones y auditoría gerencial) frente a caídas de conexión a internet o fallas de red local.

---

## 1. Características Principales

* **Continuidad Operativa Offline-First:** Toda la operación se persiste de forma inmediata en el navegador mediante IndexedDB (Dexie.js), garantizando latencia cero y funcionamiento ininterrumpido sin depender de una conexión activa a internet.
* **3 Entornos Operacionales Desacoplados:**
  * **Recepción (PC / Escritorio):** Matriz visual de habitaciones por pisos (Rack), apertura y arqueo de turnos de caja, check-in flexible (inmediato o diferido), venta de minibar y cobro de consumos.
  * **Personal de Aseo / Camareras (Móvil):** Interfaz táctil ergonómica con tarjetas de acción rápida, cambio de estado de limpieza en tiempo real y reporte de novedades o averías.
  * **Gerencia y Auditoría (Administración):** Panel de KPIs en tiempo real (ocupación, habitaciones disponibles y en mantenimiento) y módulo de auditoría de turnos cerrados con punteo de movimientos y verificación de sobres de efectivo.
* **Seguridad y Control de Acceso:** Aislamiento de vistas por roles y validación con PIN de seguridad para funciones administrativas.
* **Diseño e Interacciones Fluidas:** Sistema de diseño oscuro y descansado (`#1b2230`) con microinteracciones basadas en físicas de resortes (*spring physics*) vía Framer Motion.

---

## 2. Acceso y Demostración en Vivo

Para evaluar la aplicación de manera pública e inmediata:

1. **Ingreso Rápido con 1 Clic:** Desde la pantalla de bienvenida se puede acceder directamente a los perfiles de prueba:
   * **Recepción** (Rack interactivo y caja)
   * **Aseo Móvil** (Terminal de camareras)
   * **Gerencia** (Auditoría y control de arqueos)
2. **Credenciales de Prueba:**
   * **Administrador:** `admin@hospedaflow.local` | Contraseña: `admin1234`
   * **Recepcionista:** `recepcion@hospedaflow.local` | Contraseña: `admin1234`
   * **PIN de Gerencia:** `1234`
3. **Guía de Exposición:** Consulta [Guía de Presentación](docs/Guia_Presentacion.md) para un guión estructurado de 3 a 5 minutos.

---

## 3. Arquitectura y Sincronización

El sistema implementa el patrón **Outbox Transaccional** en el cliente:

```text
[UI / Vistas de Rol]
        │
        ▼
[Dexie.js (IndexedDB)] ──► Persistencia local inmediata (UI no bloqueante)
        │
        ▼
 [Sync Queue (Outbox)]
        │
   (Evento Online)
        │
        ▼
[SyncService Dispatcher] ──► Resolución de IDs locales a identificadores de servidor
        │
        ▼
 [API REST Backend Go] ──► Persistencia central en PostgreSQL
```

1. **Escritura Local Inmediata:** Toda transacción se persiste primero en IndexedDB. La interfaz responde instantáneamente.
2. **Cola de Sincronización:** Cada acción se encola con identificadores temporales (`localId`).
3. **Resolución Dinámica de Dependencias:** Al restablecerse la red, las acciones maestras (como apertura de turno) resuelven dinámicamente los IDs del servidor para las acciones dependientes subsecuentes.
4. **Resiliencia:** Reintentos automáticos e idempotencia en las operaciones de despacho.

---

## 4. Stack Tecnológico

### Frontend (PWA)
* **Framework:** React 19 + TypeScript
* **Herramienta de Construcción:** Vite 8
* **Base de Datos Local:** Dexie.js (IndexedDB)
* **Animaciones:** Framer Motion (Spring Physics)
* **Iconografía:** Lucide React
* **Estilos:** CSS puro con tokens semánticos corporativos (Modo Claro / Modo Oscuro)

### Backend (API REST)
* **Lenguaje:** Go 1.22+
* **Router HTTP:** Chi v5
* **Base de Datos:** PostgreSQL con pool transaccional `pgx/v5`
* **Migraciones:** DDL UP/DOWN estructuradas en SQL

---

## 5. Ejecución Local y Despliegue

### Entorno de Desarrollo Frontend
```bash
cd frontend
npm install
npm run dev
```
La aplicación se iniciará en `http://localhost:5173`.

### Despliegue en la Nube (Vercel / Cloudflare Pages)
El proyecto incluye configuración lista para despliegue estático y SPA routing en `vercel.json`:
* **Comando de compilación:** `cd frontend && npm install && npm run build`
* **Directorio de salida:** `frontend/dist`
* **Modo de enrutamiento:** Reescritura completa a `/index.html` para soporte SPA.

### Entorno de Desarrollo Backend (Opcional)
```bash
go run cmd/api/main.go
```

---

## 6. Documentación Adicional

* [Guía de Presentación y Pitch](docs/Guia_Presentacion.md)
* [Visión General del Sistema](docs/Overview.md)
* [Arquitectura Técnica](docs/Arquitectura.md)
* [Registro de Decisiones de Arquitectura (ADR)](docs/ADR_Decisiones.md)
* [Bitácora de Desarrollo](docs/Bitacora.md)
