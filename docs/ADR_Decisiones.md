# HospedaFlow · Registro de Decisiones de Arquitectura (ADR)

Historial formal de decisiones de diseño para evitar regresiones o replanteamientos innecesarios en futuras sesiones con agentes de IA.

---

## ADR-001: Arquitectura Offline-First con Dexie.js (IndexedDB)
* **Fecha:** Septiembre 2026
* **Contexto:** Los hoteles frecuentemente experimentan caídas de Internet o inestabilidad de red en recepción y pisos altos. Un corte no puede detener el check-in ni la entrega de habitaciones.
* **Decisión:** Operar en el navegador como fuente local de verdad usando IndexedDB a través de Dexie.js. Todas las mutaciones se aplican en local y se encolan en `sync_queue`.
* **Consecuencias:** Experiencia instantánea (0ms de latencia de red en UI) y resiliencia ante cortes, con necesidad de resolución de conflictos en el backend.

---

## ADR-002: Flexibilidad de Cobro en Check-in (Cuenta Abierta por Defecto)
* **Fecha:** 22 de Septiembre de 2026
* **Contexto:** En hotelería real, la gran mayoría de huéspedes liquidan la noche junto con los consumos de la tienda/minibar al momento de la salida (Check-out). Forzar el cobro al ingresar descuadraba los hábitos del hotel y la caja del recepcionista.
* **Decisión:** Permitir dos modalidades en el formulario de Check-in:
  1. *Pagar al Check-out (Cuenta abierta)*: Predeterminado. No ingresa dinero a caja en ese momento.
  2. *Pagar de inmediato (Anticipado)*: Ingresa el cobro al turno de caja activo en el instante.
* **Consecuencias:** Reflejo fidedigno de la operación real hotelera y consolidación limpia de factura en el Check-out.

---

## ADR-003: Paleta de Modo Oscuro Suavizada (Carbón Pizarra vs. Negro Absoluto)
* **Fecha:** 22 de Septiembre de 2026
* **Contexto:** El modo oscuro anterior usaba negro puro `#090d16`. El contraste extremo generaba fatiga visual y pérdida de delimitación entre tarjetas en turnos prolongados nocturnos.
* **Decisión:** Elevar el fondo de lienzo a un carbón pizarra `#1b2230`, superficies en `#242c3d`, y bordes perceptibles `#343f54`.
* **Consecuencias:** Mayor legibilidad, jerarquía de sombras natural y menor fatiga ocular para el personal de turno.
