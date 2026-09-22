# HospedaSync · Visión General

* **Proyecto:** Sistema de Gestión Hotelera (PMS - Property Management System)
* **Objetivo:** Operación ágil, desacoplada por roles, con capacidad offline-first ininterrumpida y sincronización en segundo plano.
* **Ubicación en disco:** `/home/asher/HospedaSync`

---

## Roles y Espacios de Trabajo

El sistema está diseñado para 3 tipos de usuarios con responsabilidades y vistas totalmente independientes:

1. **Recepcionista (Recepción / PC):**
   * Matriz visual de habitaciones por pisos.
   * Apertura, arqueo y cierre de turnos de caja con control de descuadres.
   * Check-in flexible (cobro inmediato o cuenta abierta diferida al check-out).
   * Venta de minibar y tienda (en efectivo a caja o cargado a la habitación).
   * Registro de gastos de caja para pago a proveedores y compras de insumos.
   * Ventana flotante de cuenta de habitación con consumos detallados y liquidación de salida.

2. **Personal de Aseo / Camarera (Móvil):**
   * Interfaz optimizada para dispositivos móviles (touch, botones grandes).
   * Cola de habitaciones sucias y en limpieza.
   * Envío de avisos y novedades en caliente (averías, objetos olvidados) a recepción.
   * Sin acceso a funciones financieras ni arqueos de caja.

3. **Gerente / Dueño (Administración / Finanzas):**
   * Panel de control y KPIs (ingresos, ocupación, habitaciones en mantenimiento).
   * Auditoría de turnos de caja cerrados con notas de arqueo.
   * Registro y resolución de averías o novedades de mantenimiento.

---

## Stack Tecnológico

* **Frontend:**
  * React 18 con TypeScript y Vite.
  * Dexie.js (IndexedDB local) para persistencia local offline-first.
  * Lucide React para iconografía consistente.
  * Paleta CSS corporativa con tokens en modo claro y modo oscuro descansado (`#1b2230`).
* **Backend:**
  * Go 1.22+ con router Chi.
  * Base de datos SQLite / PostgreSQL con migraciones SQL limpias.
  * Autenticación JWT y endpoints de sincronización transaccional.

---

## Enlaces Rápidos en la Bóveda

* [[HospedaSync/Bitacora|Bitácora de Desarrollo]]
* [[HospedaSync/Arquitectura|Arquitectura Técnica Detallada]]
* [[HospedaSync/ADR_Decisiones|Decisiones de Diseño y Arquitectura (ADR)]]
* [[HospedaSync/Grafo/graph.canvas|Lienzo de Arquitectura (Canvas)]]
