# HospedaSync

Sistema de gestión hotelera (PMS - *Property Management System*) diseñado bajo la metodología **Offline-First**. Garantiza la continuidad operativa integral de hoteles y alojamientos (recepción, caja, check-in, limpieza de habitaciones y auditoría) frente a caídas de conexión a internet o interrupciones en el suministro eléctrico.

---

## 1. Descripción del Sistema

En entornos hoteleros, los cortes en el servicio de internet o fallas de red local suelen congelar la operación en recepción y la asignación de habitaciones. HospedaSync elimina esta dependencia mediante un modelo de datos local en cada dispositivo, sincronizando automáticamente las transacciones en segundo plano una vez que la conectividad es restablecida.

### Perfiles de Usuario

* **Recepción (PC / Terminal de Escritorio):**
  * **Control de Caja y Turnos:** Apertura de turno con fondo de caja, registro de ingresos/egresos y arqueo de cierre con cálculo automático de descuadres (sobrantes o faltantes) y notas de entrega.
  * **Tablero de Habitaciones:** Matriz visual con filtrado por estado (*Disponibles, Ocupadas, Sucias, En Limpieza*) y flujos directos de Check-in (asignación de huésped y cargo a caja) y Check-out.

* **Personal de Aseo / Housekeeping (Dispositivo Móvil):**
  * **Interfaz Táctil Optimizada:** Botones y tarjetas de gran tamaño diseñados para operar con una sola mano en pasillos y pisos.
  * **Ciclo de Limpieza:** Transición rápida de estados (*"Comenzar a limpiar"* a *"Limpia y lista"*), habilitando la habitación de inmediato en recepción.
  * **Reporte de Novedades:** Registro ágil de faltantes de insumos o daños en la infraestructura.
  * **Garantía Sin Conexión:** Indicadores visuales claros para operar con total tranquilidad en áreas sin cobertura Wi-Fi.

* **Administración y Auditoría (Gerencial - PC / Móvil):**
  * **Métricas en Tiempo Real:** Indicadores clave de desempeño (KPIs) como porcentaje de ocupación, balance actual en caja y distribución de habitaciones.
  * **Auditoría de Turnos:** Historial de arqueos con desglose detallado de diferencias registradas por usuario.
  * **Control de Inventario:** Supervisión de existencias y productos de minibar.

---

## 2. Arquitectura Offline-First y Sincronización

El sistema implementa el patrón **Outbox Transaccional** en el cliente:

```
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
[SyncService Dispatcher] ──► Resolución de IDs locales a IDs de servidor
        │
        ▼
 [API REST Backend Go] ──► Persistencia central en PostgreSQL
```

1. **Escritura Local Inmediata:** Toda operación (apertura de turno, cambio de estado de habitación o cobro) se persiste primero en IndexedDB mediante Dexie.js. La interfaz responde instantáneamente sin esperar respuesta del servidor.
2. **Cola de Sincronización (Sync Queue):** Las acciones pendientes se encolan con identificadores locales temporales (`localId`).
3. **Resolución Dinámica de Dependencias:** Al restablecerse la red, las acciones maestras (como `OPEN_SHIFT`) obtienen el ID numérico asignado por PostgreSQL. Las acciones subsecuentes dependientes (como `CLOSE_SHIFT`) resuelven dinámicamente este identificador en la base local antes de su envío a la API, evitando errores de referencia o transacciones huérfanas.
4. **Tolerancia a Fallos:** Reintentos con control de errores e idempotencia en las operaciones de despacho.

---

## 3. Stack Tecnológico

### Backend (API REST en Go)
* **Lenguaje:** Go (v1.22+)
* **Enrutador HTTP y Middlewares:** Chi v5 (`Logger`, `Recoverer`, `Timeout`, `RequestID`).
* **Base de Datos y Persistencia:** PostgreSQL con pool transaccional de alto rendimiento vía `pgx/v5` (`pgxpool`).
* **Arranque Tolerante:** Capacidad de inicializar el servidor en modo degradado si PostgreSQL no está accesible de inmediato, manteniendo activo el endpoint de salud `/healthz`.
* **Pruebas Automatizadas:** Pruebas unitarias nativas con el paquete estándar `testing`, validando casos límite de arqueo y máquinas de estado.

### Frontend (Progressive Web App)
* **Framework y Lenguaje:** React 19 + TypeScript sobre Vite.
* **Almacenamiento Local:** Dexie.js sobre IndexedDB del navegador.
* **Capacidades PWA:**
  * Web App Manifest (`manifest.json`) para instalación nativa en sistemas operativos de escritorio (Windows, macOS, Linux) y móviles (Android, iOS).
  * Service Worker (`sw.js`) para almacenamiento en caché estático del shell de la aplicación.
* **Iconografía e Interfaz:** Lucide React, con estilos CSS modulares y soporte para modo oscuro mediante variables CSS.

### Herramientas de Desarrollo y Calidad
* **Air:** Recarga en caliente (*live-reload*) para el backend en Go.
* **Oxlint:** Linter de alto rendimiento para validación estática en el frontend.
* **Graphify:** Mapeo de conocimiento arquitectónico, detección de dependencias y auditoría de grafos (`graphify-out/`).

---

## 4. Estructura del Repositorio

```text
HospedaSync/
├── cmd/
│   └── api/
│       └── main.go                 # Punto de entrada HTTP, pool pgx y graceful shutdown
├── internal/
│   ├── config/                     # Carga de variables de entorno y configuración
│   ├── domain/                     # Modelos de dominio y definición de errores canónicos
│   ├── handler/                    # Controladores HTTP (Router Chi, ShiftHandler)
│   ├── repository/                 # Interfaces de persistencia y repositorio PostgreSQL
│   └── service/                    # Lógica de negocio (ShiftService) y pruebas unitarias
├── pkg/
│   └── response/                   # Respuestas JSON estandarizadas y manejo de errores HTTP
├── sql/
│   ├── migrations/                 # Migraciones DDL (UP / DOWN) para PostgreSQL
│   ├── queries/                    # Consultas SQL preparadas
│   └── schema/                     # Esquema canónico relacional
├── frontend/                       # Aplicación React + TypeScript + Vite (PWA)
│   ├── public/                     # Manifest PWA, Service Worker e iconos
│   └── src/
│       ├── components/             # Componentes comunes (Header, semáforo de conectividad)
│       ├── db/                     # Esquema IndexedDB con Dexie y datos semilla
│       ├── services/               # Servicio Outbox de sincronización en segundo plano
│       └── views/                  # Vistas especializadas por rol (Recepción, Aseo, Gerencia)
├── graphify-out/                   # Grafo de dependencias arquitectónicas y diagramas de flujo
├── .air.toml                       # Configuración de recarga en caliente
└── README.md                       # Documentación técnica del proyecto
```

---

## 5. Guía de Ejecución y Desarrollo Local

### Requisitos Previos
* Go 1.22 o superior
* Node.js v20 o v22 LTS y npm
* PostgreSQL (opcional para desarrollo local desacoplado)

---

### Ejecución del Backend

1. Configuración de variables de entorno (opcional, utiliza valores por defecto para entorno local):
   ```bash
   export PORT=8080
   export DATABASE_URL="postgres://postgres:postgres@localhost:5432/hospedasync?sslmode=disable"
   export APP_ENV=development
   ```

2. Iniciar el servidor:
   ```bash
   go run cmd/api/main.go
   ```
   *(O mediante Air para recarga automática: `air`)*

3. Endpoints disponibles:
   * Chequeo de salud: `http://localhost:8080/healthz`
   * API de Turnos: `http://localhost:8080/api/v1/shifts`

---

### Ejecución del Frontend

1. Instalar dependencias e iniciar el servidor de desarrollo:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. Abrir en el navegador: `http://localhost:5173`

---

### Verificación y Calidad de Código

* **Pruebas del Backend:**
  ```bash
  go test -v ./...
  ```
* **Linter del Frontend:**
  ```bash
  cd frontend && npm run lint
  ```
* **Compilación de Producción:**
  * Backend:
    ```bash
    go build -ldflags="-s -w" -o bin/hospedasync-api ./cmd/api
    ```
  * Frontend:
    ```bash
    cd frontend && npm run build
    ```

---

## 6. Licencia

Proyecto privado desarrollado para HospedaSync. Todos los derechos reservados.
