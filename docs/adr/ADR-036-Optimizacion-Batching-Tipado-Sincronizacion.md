# ADR-036: Optimización de Batching, Tipado y Sincronización Local-First

## Estado
Aceptado

## Fecha
2026-05-04

## Contexto
Durante una auditoría del servicio de sincronización (`syncService.ts`), se identificaron múltiples puntos de fallo potencial y violaciones de las reglas técnicas del proyecto:
1.  **Falta de Batching:** El servicio enviaba todos los cambios locales a Supabase en una sola petición, lo cual violaba la **Regla 2** (límite de 500 operaciones por lote) y ponía en riesgo la estabilidad con grandes volúmenes de datos.
2.  **Inconsistencia de Tipado y Naming:** Existía una mezcla de `snake_case` y `camelCase` en las interfaces de registros locales, dificultando el mantenimiento y violando la **Regla 4**.
3.  **Redundancia de Campos de Fotos:** Los campos `url_foto` y `pod_url` se usaban de forma inconsistente, lo que causaba confusión en la persistencia de evidencias de entrega.
4.  **Casts Inseguros:** El uso excesivo de `as any` y `Record<string, unknown>` en la resolución de conflictos reducía la robustez del sistema.

Además, se requería la implementación de una nueva tabla para el control de inventario por marcas (`marcas_control`).

## Decisión
Se implementaron los siguientes cambios estructurales y lógicos:

### 1. Migración de Base de Datos
Se ejecutó la migración `20260504_marcas_control.sql` via MCP de Supabase para:
*   Crear la tabla `public.marcas_control`.
*   Implementar RLS (lectura para autenticados, escritura para admins).
*   Seed de frecuencias de conteo para más de 100 marcas.

### 2. Implementación de Batching (Chunking)
Se introdujo una utilidad `chunkArray` en `syncService.ts` para dividir todas las operaciones de `upsert` hacia Supabase en lotes de máximo **500 registros**. Esto asegura el cumplimiento estricto de la Regla 2.

### 3. Refactorización de Interfaces y Tipado
*   Se estandarizaron las interfaces `ProductoLocalRecord`, `EnvioLocalRecord`, `HistorialLocalRecord`, `MovimientoLocalRecord` y `MarcaControlLocalRecord` al formato `camelCase`.
*   Se eliminaron propiedades obsoletas o duplicadas en las interfaces locales para reflejar con precisión el modelo de WatermelonDB.

### 4. Consolidación de Evidencias (url_foto / pod_url)
*   Se aclaró el uso de `urlFoto` y `podUrl` en el modelo `Envio.ts` mediante comentarios.
*   En `syncService.ts`, se ajustó la lógica de `pushChanges` para priorizar y unificar ambos campos al sincronizar con Supabase, evitando la pérdida de URLs de fotos.

### 5. Resolución de Conflictos Tipada
Se refactorizó el `conflictResolver` para usar tipos explícitos y una lógica de comparación de fechas (`updatedAt`) más segura, priorizando el stock local si es más reciente.

## Consecuencias
*   **Positivas:**
    *   Cumplimiento total de las reglas de arquitectura de Mascotify.
    *   Capacidad de sincronizar miles de registros sin fallos de red o límites de API.
    *   Mejor experiencia de desarrollo gracias a un tipado más coherente y documentado.
*   **Negativas:**
    *   Ligero incremento en el tiempo total de sincronización debido a la serialización de lotes (mitigado por la estabilidad ganada).
