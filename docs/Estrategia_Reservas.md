# Estrategia de Módulo de Reservas y Sincronización OTA (Channel Manager)

Este documento detalla la arquitectura, el modelo de datos y la estrategia de implementación para dotar a **HospedaSync** de un motor avanzado de reservas, permitiendo a los hoteles abandonar sus hojas de cálculo (Excel) y, eventualmente, sincronizarse automáticamente con agencias de viaje online (OTAs) como Booking.com, Airbnb y Expedia.

---

## 1. El Problema Actual y la Visión
Actualmente, el hotel maneja las reservas futuras (por correo, teléfono o Booking) en una hoja de Excel. Esto genera tres riesgos críticos:
1. **Overbooking:** Al no estar el Excel conectado al PMS (HospedaSync) en tiempo real, un recepcionista puede asignar una habitación a un cliente de paso ("walk-in") que ya estaba reservada para esa misma tarde.
2. **Carga Operativa (Doble Digitación):** Cada reserva de Booking.com debe copiarse manualmente al Excel, y cuando el cliente llega, debe pasarse del Excel a HospedaSync.
3. **Pérdida de Datos:** Un Excel compartido es propenso a errores humanos, sobreescrituras accidentales y corrupción.

**La Visión:** Convertir HospedaSync en la única fuente de verdad (Single Source of Truth). Un recepcionista verá una línea de tiempo gráfica e interactiva, y el sistema bloqueará y desbloqueará las habitaciones automáticamente interactuando con el exterior.

---

## 2. Fase 1: El Módulo Central de Reservas (Reemplazo del Excel)
El objetivo inmediato es que el hotel deje de usar Excel. Todo debe vivir dentro de la PWA de HospedaSync respetando la filosofía **Offline-First**.

### 2.1. Modelo de Datos (Dexie.js / PostgreSQL)
Se creará la entidad `Reservation` con la siguiente estructura:

```typescript
interface Reservation {
  id: string;                    // UUID
  roomId: string;                // FK a la habitación
  guestName: string;
  guestContact?: string;         // Teléfono o Email
  checkInDate: string;           // ISO 8601 (Ej: "2026-10-15")
  checkOutDate: string;          // ISO 8601
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED' | 'NO_SHOW';
  source: 'MANUAL' | 'EXCEL_IMPORT' | 'BOOKING' | 'AIRBNB';
  totalPrice: number;
  advancePayment: number;        // Abono o anticipo pagado
  notes?: string;
  externalId?: string;           // ID de la reserva en Booking/Airbnb
}
```

### 2.2. Diseño UI/UX: El Timeline (Gantt)
* **Vista Principal:** Una cuadrícula donde el Eje Y son las Habitaciones (101, 102, 103) y el Eje X son los Días del Mes.
* **Interacción:** Arrastrar (Drag & Drop) sobre los días para crear una reserva. Extender o reducir los bordes de la tarjeta para cambiar fechas.
* **Componente React:** Desarrollaremos un componente a la medida con `framer-motion` para desplazamiento suave, o usaremos una librería robusta, adaptada a nuestras reglas de diseño (cero IA slop, físicas de resorte).

### 2.3. Herramienta de Migración "One-Click"
Para asegurar la adopción inmediata, desarrollaremos un importador CSV/Excel en el frontend.
* El administrador sube el `.csv` de su Excel actual.
* El sistema lee las columnas (Habitación, Cliente, Entrada, Salida) usando la librería `papaparse` o similar.
* Transforma los datos y los inyecta masivamente en Dexie.

---

## 3. Fase 2: Motor de Sincronización Estándar (iCal Channel Manager)
Una vez el calendario interno esté en uso, conectaremos HospedaSync con el mundo exterior utilizando el estándar **iCalendar (.ics)**, que es gratuito, no requiere certificaciones corporativas y es soportado por Booking, Airbnb y Expedia.

### 3.1. Exportación (HospedaSync ➔ OTAs)
Generar un endpoint en Go que exporte nuestras reservas para que Booking sepa qué fechas bloquear.
* **Endpoint:** `GET /api/v1/sync/ical/{room_id}` o global.
* **Formato:**
  ```text
  BEGIN:VCALENDAR
  VERSION:2.0
  PRODID:-//HospedaSync//PMS//ES
  BEGIN:VEVENT
  UID:res-12345
  DTSTART;VALUE=DATE:20261015
  DTEND;VALUE=DATE:20261020
  SUMMARY:Reserva HospedaSync
  END:VEVENT
  END:VCALENDAR
  ```
* **Uso:** El hotel pega este enlace en la extranet de Booking.com.

### 3.2. Importación (OTAs ➔ HospedaSync)
Leer las reservas que entran por Booking.com automáticamente.
* En el backend (Go), implementaremos un **Background Cron Job** (usando `robfig/cron`).
* Cada 15/30 minutos, Go descargará el enlace `.ics` provisto por Booking.
* Parseará los eventos (bloques de fechas) y creará o actualizará registros en la base de datos de PostgreSQL con origen `BOOKING`.
* Cuando el recepcionista recargue o la red del frontend sincronice, verá las nuevas reservas reflejadas.

---

## 4. Fase 3: Integración Directa por API (Avanzado)
En un escenario de alto volumen o expansión de software, el estándar iCal puede ser lento (sincroniza cada 30 min / 1 hora, existiendo un leve riesgo de overbooking).
La evolución a largo plazo es usar la **Connectivity API de Booking.com**:
* Sincronización en tiempo real (milisegundos) mediante Webhooks.
* Actualización de tarifas y disponibilidad (Rate & Inventory Management).
* Requiere ser *Connectivity Partner* registrado, por lo que esta fase se abordará solo cuando HospedaSync busque monetización B2B a escala regional.

---

## 5. Resumen del Plan de Ejecución Inmediata
Si decidimos iniciar esta iniciativa, los primeros Commits / Pull Requests deben enfocarse estrictamente en la **Fase 1**:
1. Crear migraciones SQL en Go para la tabla `reservations`.
2. Actualizar Dexie `db.ts` con la colección de reservas.
3. Crear el componente visual de calendario en React (`ReservationTimeline.tsx`).
4. Conectar la lógica offline-first (crear reserva local ➔ sincronizar ➔ guardar en DB).
