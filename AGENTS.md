# HospedaSync · Reglas del Agente y Memoria Persistente

## Memoria a Largo Plazo (Obsidian Vault)
* La documentación destilada, arquitectura técnica y bitácora de este proyecto residen en tu Segundo Cerebro:
  * Bitácora y estado actual: `/home/asher/Vault/HospedaSync/Bitacora.md`
  * Arquitectura técnica y modelo contable: `/home/asher/Vault/HospedaSync/Arquitectura.md`
  * Decisiones arquitectónicas (ADRs): `/home/asher/Vault/HospedaSync/ADR_Decisiones.md`
  * Grafo y lienzo visual de entidades: `/home/asher/Vault/HospedaSync/Grafo/`

## Directrices de Eficiencia de Tokens
1. **Consulta primero la bóveda:** Antes de inspeccionar o buscar a ciegas en decenas de archivos fuente, consulta `Arquitectura.md` o `Bitacora.md` para entender el modelo de datos y el estado actual. Esto ahorra hasta un 95% de tokens en cada sesión.
2. **Actualización de bitácora:** Al finalizar un cambio significativo o hito de desarrollo, actualiza la sección de sesiones recientes en `/home/asher/Vault/HospedaSync/Bitacora.md` para que la siguiente sesión continúe sin pérdida de contexto.

## Estilo de Desarrollo
* Mantener la filosofía offline-first (Dexie.js en IndexedDB con sincronización en background).
* No sobrecargar de emojis el código, mensajes ni la interfaz de usuario.
* Mantener la paleta suave del modo oscuro (`#1b2230`) para consistencia visual.
