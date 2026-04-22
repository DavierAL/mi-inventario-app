# ADR 010: Estandarización de Estados y Persistencia de URLs en Logística

## Estado
Aceptado

## Contexto
Durante la fase de estabilización del módulo de logística, se detectaron inconsistencias en la sincronización de datos entre la App Móvil, Supabase y Google Sheets:
1. **Mapeo de Estados Inconsistente:** La app utilizaba estados internos (ej: `En_Tienda`) que no coincidían con las etiquetas esperadas por los sistemas administrativos (ej: `Listo para envío`), provocando fallos en la automatización de reportes.
2. **Pérdida de Información de Producto:** Al actualizar el estado de entrega (POD), el sistema sobrescribía la columna `url_foto` (que contenía la imagen del producto) con la foto del comprobante de entrega, eliminando la trazabilidad visual del ítem.
3. **Sincronización de URLs Incompleta:** El `syncService` (WatermelonDB Sync) no estaba configurado para incluir la columna `pod_url`, lo que impedía que las fotos de entrega subidas en un dispositivo fueran visibles en otros o en el dashboard administrativo si se usaba el flujo de sincronización automática.

## Decisión
Se ha decidido rediseñar el flujo de mapeo y persistencia para asegurar la integridad de los datos y la compatibilidad entre plataformas.

### Acciones Tomadas:

1. **Centralización del Mapeo de Estados:**
   - Se incorporaron métodos estáticos en el modelo `Envio.ts` (`toExternalStatus` y `fromExternalStatus`) para actuar como única fuente de verdad.
   - **Mapeo Definido:**
     - `Pendiente` <-> `Impresión Etiqueta`
     - `En_Tienda` <-> `Listo para envío`
     - `Entregado` <-> `Entregado`

2. **Segregación de URLs (Producto vs. POD):**
   - Se eliminó la redundancia forzada que igualaba `url_foto` y `pod_url` en la App.
   - **Supabase:** Ahora coexisten ambas columnas. `url_foto` preserva la imagen del producto y `pod_url` almacena la evidencia de entrega.
   - **Edge Function:** Se modificó la lógica de la función `sync-logistica-sheets` para priorizar `pod_url` sobre `url_foto` al enviar el reporte a Google Sheets, garantizando que se muestre la evidencia de entrega si está disponible.

3. **Optimización del Motor de Sincronización:**
   - Se actualizó `syncService.ts` para incluir explícitamente `pod_url` en los procesos de PULL y PUSH.
   - Se integró el mapeo de estados salientes en el proceso de sincronización por lotes de WatermelonDB.

4. **Refuerzo de Estándares de Código:**
   - Se eliminaron patrones prohibidos (`select('*')`, uso de `any`) en las áreas modificadas del feature de logística.

## Consecuencias

### Positivas:
- **Integridad de Datos:** Se mantiene la trazabilidad del producto incluso después de la entrega.
- **Consistencia Administrativa:** Los estados en Google Sheets ahora reflejan exactamente la terminología del negocio.
- **Sincronización Completa:** Los administradores pueden ver las fotos de entrega directamente en Supabase sin depender de triggers manuales.

### Negativas/Riesgos:
- **Dependencia de la Edge Function:** La visibilidad en Google Sheets sigue dependiendo de la correcta configuración de la Edge Function, aunque ahora con una lógica de selección de fotos más inteligente.

## Referencias
- Reglas Mascotify (`SKILL.md`).
- Reporte de errores de sincronización de logística (Abril 2026).
