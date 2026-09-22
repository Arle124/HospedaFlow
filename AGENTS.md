# HospedaSync · Reglas del Agente y Memoria Persistente

## Memoria y Documentación Técnica
* La documentación destilada, arquitectura técnica y bitácora residen en el repositorio local:
  * Bitácora y estado actual: `docs/Bitacora.md` (o en la Bóveda de Obsidian en `~/Vault/HospedaSync/Bitacora.md`)
  * Arquitectura técnica y modelo contable: `docs/Arquitectura.md`
  * Decisiones arquitectónicas (ADRs): `docs/ADR_Decisiones.md`
  * Visión general y stack: `docs/Overview.md`
  * Grafo y lienzo visual de entidades: `~/Vault/HospedaSync/Grafo/` (en Obsidian)

## Directrices de Eficiencia de Tokens
1. **Consulta primero la documentación:** Antes de inspeccionar o buscar a ciegas en decenas de archivos fuente, consulta `docs/Arquitectura.md` o `docs/Bitacora.md` para entender el modelo de datos y el estado actual. Esto ahorra hasta un 95% de tokens en cada sesión.
2. **Actualización de bitácora:** Al finalizar un cambio significativo o hito de desarrollo, actualiza la sección de sesiones recientes en `docs/Bitacora.md` (y sincroniza con la bóveda si aplica).

## Estilo de Desarrollo
* Mantener la filosofía offline-first (Dexie.js en IndexedDB con sincronización en background).
* No sobrecargar de emojis el código, mensajes ni la interfaz de usuario.
* Mantener la paleta suave del modo oscuro (`#1b2230`) para consistencia visual.
