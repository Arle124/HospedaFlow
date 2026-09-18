# HospedaSync 🏨

**HospedaSync** es un sistema integral de gestión hotelera (PMS - *Property Management System*) diseñado bajo la metodología **Offline-First**. Su objetivo es garantizar la continuidad operativa total del hotel (recepción, caja, check-in, limpieza de habitaciones y auditoría) incluso ante cortes prolongados de energía o caídas del servicio de internet.

---

## 📌 Descripción del Programa

En establecimientos hoteleros y de hospedaje, las fallas de conectividad a internet suelen paralizar la recepción y el registro de habitaciones. HospedaSync resuelve esta problemática permitiendo que cada terminal trabaje de forma autónoma con almacenamiento local y se sincronice automáticamente en segundo plano con el servidor central al restablecerse la red.

### Perfiles de Usuario Adaptados:
1. **🖥️ Recepcionista (PC / Escritorio):**
   * **Control de Caja y Turnos:** Apertura de turnos con base en efectivo, registro de entradas/salidas de dinero y arqueo de caja de cierre con cálculo automático de descuadres (faltante/sobrante) y notas de entrega.
   * **Tablero de Habitaciones:** Matriz visual con filtros rápidos (*Disponibles, Ocupadas, Sucias, En Limpieza*) y flujo de Check-in (asignación de huésped y cobro a caja) y Check-out.
2. **🧹 Personal de Aseo / Housekeeping (Celular / Móvil):**
   * **Interfaz Táctil de 1 Toque:** Tarjetas grandes con botones diseñados para uso ágil en pasillos y pisos con una sola mano.
   * **Flujo Operativo:** Marcar habitación como *"Comenzar a limpiar"* y posterior confirmación de *"¡Limpia y Lista!"* (pasa inmediatamente a disponible para recepción).
   * **Reporte de Novedades:** Registro rápido de faltantes de insumos (toallas, jabones) o daños en la infraestructura.
   * **Garantía Offline:** Alertas explícitas para tranquilidad del personal cuando limpian en zonas sin cobertura Wi-Fi.
3. **📊 Administrador / Dueño (Gerencial - Celular / PC):**
   * **Métricas en Tiempo Real (KPIs):** % de Ocupación actual, habitaciones disponibles vs ocupadas y dinero en caja del turno activo.
   * **Auditoría de Turnos:** Histórico de arqueos con desglose de diferencias de caja y registro de novedades.
   * **Control de Minibar:** Monitoreo de stock de productos e inventario.

---

## 🛠️ Herramientas y Tecnologías Utilizadas

### Backend (API REST en Go)
* **Lenguaje:** [Go](https://go.dev/) (v1.26+)
* **Enrutador HTTP & Middlewares:** [Chi v5](https://github.com/go-chi/chi) con `Logger`, `Recoverer`, `Timeout` y `RequestID`.
* **Persistencia & Base de Datos:** [PostgreSQL](https://www.postgresql.org/) con pool de conexiones transaccional de alto rendimiento vía [pgx/v5](https://github.com/jackc/pgx).
* **Compilación de Consultas SQL:** [sqlc](https://sqlc.dev/) para generación de código Go seguro a partir de esquemas y queries SQL.
* **Migraciones de Base de Datos:** Scripts DDL estructurados (`UP` y `DOWN`) para control de versiones del esquema relacional.
* **Live Reload:** [Air](https://github.com/air-verse/air) para recarga en caliente del binario Go en desarrollo.
* **Auditoría de Arquitectura:** [Graphify](https://github.com/safishamsi/graphify) para detección de grafos de dependencias, centralidad de componentes (*god nodes*) y reporte de comunidades.

### Frontend (PWA Offline-First)
* **Framework & Lenguaje:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) empaquetado con [Vite](https://vitejs.dev/).
* **Almacenamiento Local (Local-First):** [Dexie.js](https://dexie.org/) sobre **IndexedDB** del navegador para persistencia sin conexión de turnos, habitaciones, inventario y cola de sincronización.
* **Capacidades PWA (Progressive Web App):**
  * `manifest.json` para instalación en pantalla de inicio (celulares) o como app de escritorio independiente en Windows/Mac/Linux (Chrome/Edge).
  * Service Worker (`sw.js`) para almacenamiento en caché estático del shell de la aplicación.
* **Sincronización (Outbox Pattern):** `syncService` con escucha de eventos de red (`online`/`offline`) y procesamiento en cola FIFO contra los endpoints del backend.
* **Iconografía & Estilos:** [Lucide React](https://lucide.dev/) + CSS responsivo con variables de diseño en modo oscuro.

---

## 📐 Estructura del Repositorio

```text
HospedaSync/
├── cmd/
│   └── api/
│       └── main.go                 # Punto de entrada HTTP con Graceful Shutdown y arranque tolerante
├── internal/
│   ├── config/                     # Carga de variables de entorno y timeouts
│   ├── domain/                     # Entidades de dominio (Turnos, Habitaciones, Insumos, Errores)
│   ├── handler/                    # Transporte HTTP (Router Chi, ShiftHandler)
│   ├── repository/                 # Interfaces de persistencia y repositorio Postgres (pgxpool)
│   └── service/                    # Casos de uso y reglas de negocio (ShiftService)
├── pkg/
│   └── response/                   # Envoltorios estandarizados de respuestas JSON y errores
├── sql/
│   ├── migrations/                 # Migraciones UP/DOWN para PostgreSQL
│   ├── queries/                    # Consultas SQL preparadas para sqlc
│   └── schema/                     # DDL canónico de la base de datos
├── frontend/                       # Aplicación React + TypeScript + Vite (PWA)
│   ├── public/                     # Manifest PWA, Service Worker e iconos
│   └── src/
│       ├── components/             # Header con selector de roles y semáforo de red
│       ├── db/                     # Esquema IndexedDB con Dexie y datos semilla
│       ├── services/               # Servicio de sincronización y cola Outbox
│       └── views/                  # Vistas especializadas (Recepción, Aseo, Gerencia)
├── graphify-out/                   # Grafo de conocimiento arquitectónico y reporte visual
├── .air.toml                       # Configuración de recarga en caliente para Go
├── sqlc.yaml                       # Configuración del compilador sqlc
└── README.md                       # Documentación técnica del proyecto
```

---

## 🚀 Despliegue y Ejecución en el Estado Actual

El sistema está configurado para que puedas levantar tanto el backend como el frontend en pocos pasos:

### 1. Requisitos Previos
* **Go:** 1.22 o superior (recomendado 1.26+)
* **Node.js:** v20 o v22 LTS con npm
* **PostgreSQL (Opcional en desarrollo local):** El backend cuenta con arranque tolerante a fallos; si la base de datos no está disponible, el servidor inicia en modo degradado respondiendo en `/healthz` sin abortar.

---

### 2. Ejecutar el Backend (API Go)

1. Configura opcionalmente las variables de entorno (por defecto usará puerto `8080` y Postgres local):
   ```bash
   export PORT=8080
   export DATABASE_URL="postgres://postgres:postgres@localhost:5432/hospedasync?sslmode=disable"
   export APP_ENV=development
   ```

2. Ejecutar directamente:
   ```bash
   go run cmd/api/main.go
   ```

3. *(Alternativa con recarga automática en caliente)*:
   ```bash
   air
   ```

El servidor estará escuchando en:
* Salud del servicio: `http://localhost:8080/healthz`
* API de Turnos: `http://localhost:8080/api/v1/shifts`

---

### 3. Ejecutar el Frontend (PWA)

1. Ingresar al directorio del frontend e instalar dependencias:
   ```bash
   cd frontend
   npm install
   ```

2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Abre en tu navegador `http://localhost:5173`.
   * **Instalación:** En la barra de direcciones de Chrome o Edge, pulsa el botón **"Instalar HospedaSync"** para obtener el ícono en tu escritorio de Windows.
   * **Prueba Offline:** En las herramientas de desarrollador (F12) $\rightarrow$ pestaña *Network*, selecciona *"Offline"* y observa cómo la creación de turnos, check-in y limpieza siguen funcionando al 100% de manera ininterrumpida.

---

### 4. Compilación para Producción

* **Binario del Backend:**
  ```bash
  go build -ldflags="-s -w" -o bin/hospedasync-api ./cmd/api
  ```
* **Build del Frontend:**
  ```bash
  cd frontend
  npm run build
  ```
  Los archivos estáticos optimizados se generarán en `frontend/dist/` listos para ser servidos por Nginx, Caddy o directamente embebidos en el servidor Go.

---

## 📄 Licencia
Este proyecto es propiedad de **HospedaSync**. Todos los derechos reservados.
