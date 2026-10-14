# Guía de Presentación · HospedaFlow PMS
> **Documento de apoyo para demostración en clase**  
> *Duración estimada de exposición: 3 a 5 minutos*

---

## 1. El Gancho Inicial (Elevator Pitch - 30 segundos)

> *"Buenas tardes a todos. Hoy les presento **HospedaFlow**, un sistema moderno de gestión hotelera (PMS) diseñado con una propuesta técnica innovadora: **Offline-First**.  
> ¿Cuál es el problema que resuelve? En la hotelería tradicional, si la conexión a internet falla o el proveedor de la nube tiene problemas, la recepción queda paralizada: no se pueden hacer check-ins, no se puede cobrar y se pierde el control de caja.  
> Con **HospedaFlow**, cada terminal de recepción y cada celular del personal funciona de manera autónoma con persistencia en el navegador y sincronización fluida en segundo plano."*

---

## 2. Paso a Paso de la Demostración en Vivo (Flujo Recomendado)

### Paso 1: Ingreso Rápido al Sistema
1. Abre el enlace de la aplicación en el navegador.
2. Muestra la pantalla de bienvenida con la propuesta de valor.
3. Haz clic en el botón de acceso rápido **"Recepción"** (o ingresa con `recepcion@hospedaflow.local` y clave `admin1234`).
4. **Qué decir:** *"Ingresamos con un solo clic. La base de datos local en IndexedDB se inicializa al instante sin tiempos de espera."*

---

### Paso 2: Apertura de Turno de Caja (Seguridad Financiera)
1. Al entrar a Recepción, si no hay turno abierto, pulsa el botón **"Abrir Turno"**.
2. Ingresa un fondo de caja inicial (ejemplo: `$100,000 COP`).
3. Confirma la apertura.
4. **Qué decir:** *"HospedaFlow aplica disciplina contable estricta: ninguna habitación se puede cobrar ni se pueden registrar ventas de minibar si el recepcionista no ha abierto formalmente su turno con su fondo de caja."*

---

### Paso 3: Asignación y Check-in de Huésped
1. En la matriz visual de habitaciones (Rack), busca una habitación en estado **Verde (Disponible)**, por ejemplo la **101**.
2. Haz clic en ella y selecciona **"Check-in"**.
3. Ingresa el nombre de un huésped (ejemplo: *"Laura Restrepo"*), número de acompañantes y selecciona **"Cobro Inmediato (Pagado)"** o **"Cuenta Abierta (Diferido)"**.
4. Confirma. Verás que la habitación cambia inmediatamente a color **Azul (Ocupada)** y el efectivo en caja se actualiza en tiempo real.
5. **Qué decir:** *"El cambio de estado es instantáneo gracias a la persistencia local. No hay pantallas de carga congeladas."*

---

### Paso 4: Venta de Minibar y Consumos
1. Haz clic en la habitación que acabas de ocupar.
2. Abre la pestaña o sección de **Minibar / Consumos**.
3. Añade productos (ejemplo: *Agua Mineral* o *Snack*) y selecciona cargarlo a la cuenta de la habitación.
4. **Qué decir:** *"El recepcionista puede registrar consumos que se van acumulando en el folio del huésped para liquidarse al momento de la salida."*

---

### Paso 5: Terminal Móvil de Aseo / Camareras (Housekeeping)
1. En la barra superior, cambia el entorno a **"Aseo (Móvil)"**.
2. Muestra la interfaz táctil adaptada: tarjetas grandes, botones de acción ergonómicos.
3. Elige una habitación sucia o lista para limpieza, presiona **"Comenzar Limpieza"** y luego **"Habitación Limpia"**.
4. (Opcional) Registra una novedad o avería (ejemplo: *"Falta toalla adicional"*).
5. **Qué decir:** *"Las camareras operan desde sus celulares en pasillos o sótanos donde muchas veces no llega el Wi-Fi. Las habitaciones marcadas como limpias quedan habilitadas de inmediato para recepción."*

---

### Paso 6: Check-out y Liquidación de Salida
1. Regresa a la vista de **"Recepción"**.
2. Haz clic en la habitación ocupada del paso 3 y pulsa **"Check-out"**.
3. El sistema muestra la liquidación consolidada: tarifa de hospedaje pendiente + consumos de minibar.
4. Confirma el pago y la salida.
5. La habitación pasa automáticamente a **Amarillo (Sucia)** en espera del equipo de aseo.
6. **Qué decir:** *"Se cierra el ciclo de la estancia, la cuenta queda en cero y la habitación entra a la cola de limpieza de las camareras."*

---

### Paso 7: Cierre de Turno y Auditoría Gerencial
1. Haz clic en el botón de **"Cerrar Turno"** de caja.
2. Declara el efectivo físico contado en el cajón (el sistema calculará automáticamente si el cuadre es exacto o si hay sobrante/faltante).
3. Cambia en el menú superior al rol de **"Gerencia"** (PIN de seguridad: `1234`).
4. Muestra la pestaña de **Auditoría de Turnos**: se ve el turno recién cerrado con su sobre de efectivo para ser verificado y punteado por el dueño o gerente.
5. **Qué decir:** *"Todo el flujo de dinero queda sellado con trazabilidad total para la administración."*

---

## 3. Preguntas Frecuentes de Profesores o Evaluadores

* **¿Qué tecnología utiliza el frontend?**  
  React 19, TypeScript, Vite y Framer Motion para microinteracciones fluidas. La base de datos cliente corre sobre **IndexedDB gestionada con Dexie.js**.
* **¿Qué pasa si cierran la pestaña o se apaga el dispositivo?**  
  Los datos persisten de manera intacta en el almacenamiento local del navegador. Al volver a abrir la página, todo sigue exactamente en el estado en que se dejó.
* **¿Cómo se conecta con la nube?**  
  El frontend incluye una cola de salida transaccional (*Outbox Pattern*). Cuando hay internet, despacha las transacciones acumuladas hacia la API REST en Go y base de datos relacional PostgreSQL.
* **¿Por qué el nombre HospedaFlow?**  
  Porque representa el flujo ágil, ininterrumpido y sin fricciones de los procesos hoteleros diarios (Recepción ➔ Aseo ➔ Gerencia).
