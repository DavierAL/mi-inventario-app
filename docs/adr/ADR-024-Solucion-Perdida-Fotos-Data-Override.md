# ADR 024: Solución Definitiva a Pérdida de Fotos por Carrera de Sincronización (Data Override)

## Fecha
2026-04-25

## Contexto y Problema
Se reportó que, al actualizar el estado de un pedido a "Entregado" y capturar una foto de evidencia en el panel de logística (`StorePanelScreen`), la URL de la foto no se persistía en Supabase y, como consecuencia, tampoco llegaba a Google Sheets.

Tras una auditoría técnica, se identificaron tres problemas subyacentes que provocaban una pérdida silenciosa de datos ("Data Override") e interacciones desordenadas entre el motor offline y la nube:

1. **Bug en el Mapeo de Sincronización (`syncService.ts`):** 
   Durante el proceso de sincronización en segundo plano de WatermelonDB (`pushChanges`), el objeto recibido (de tipo `RawRecord`) contiene las claves originales de la base de datos local en `snake_case` (ej. `url_foto`, `gmaps_url`). El servicio intentaba acceder a la versión `camelCase` (ej. `r.urlFoto`), obteniendo un valor `undefined`. Al forzar un valor por defecto, convertía esta omisión en un `null` explícito que se enviaba en un `UPSERT` a Supabase, borrando cualquier URL previamente guardada.

2. **Violación de Arquitectura y Carrera de Red (`StorePanelScreen.tsx`):**
   Para "parchar" problemas previos, el componente UI llamaba manualmente al método `EnviosService.actualizarEstado` directo a Supabase. Esto generaba un conflicto con la regla estricta de **"Local-First Priority"**:
   - (A) El componente guardaba el estado y la URL en SQLite.
   - (B) El componente actualizaba Supabase manualmente.
   - (C) Casi simultáneamente, WatermelonDB detectaba el cambio (A) y disparaba un Sync en segundo plano.
   - (D) El Sync enviaba un `url_foto: null` a Supabase (debido al bug #1), machacando la subida correcta (B).

3. **Inconsistencia al Notificar al Webhook (Google Sheets):**
   Al notificar a la "Edge Function" de Google Sheets (`notificarSheets`), solo se enviaba el `envio_id`. La Edge Function hacía una consulta a Supabase. Dependiendo del milisegundo exacto de ejecución (Race Condition), podía leer el registro original antes de actualizarse, el actualizado manual, o el machacado en `null` por el Sync.

## Decisiones y Solución

1. **Corregir Lectura de RawRecords en Sincronización:**
   Se actualizó el payload del `upsert` en `pushChanges` dentro de `syncService.ts` para que extraiga los valores considerando el formato de almacenamiento de SQLite.
   - *Antes:* `url_foto: r.urlFoto || null`
   - *Ahora:* `url_foto: r.url_foto || r.urlFoto || null` (también se aplicó a `gmaps_url`).

2. **Restaurar el "Local-First Priority":**
   Se refactorizó el componente `StorePanelScreen.tsx` para seguir el modelo correcto offline-first:
   - Paso 1: Subir foto a Supabase Storage y obtener la URL.
   - Paso 2: Ejecutar un único `database.write` que guarde en SQLite el estado "Entregado" y asigne el `urlFoto`.
   - Paso 3: Permitir silenciosamente que WatermelonDB (`syncService`) propague el cambio en segundo plano sin usar llamadas HTTP manuales.

3. **Inyección Directa en Webhook para Evitar Lecturas Obsoletas:**
   Se modificó `EnviosService.notificarSheets` para aceptar un *payload* extendido (con estado y foto). En `StorePanelScreen.tsx` ahora se envía el registro recién preparado a la Edge Function de Supabase para que esta retransmita la información a Google Sheets directamente sin necesidad de volver a consultar la base de datos (evitando latencia o esperas de sincronización).

## Consecuencias
* **Positivas:** 
  - La URL de la evidencia ya no se sobreescribe con nulo.
  - La sincronización hacia la nube es completamente coherente con la base de datos local y 100% resiliente a caídas de internet (fallback a "cola offline").
  - Eliminación de la "race condition" (carrera de condiciones) al notificar a Google Sheets, mejorando los tiempos de transmisión de los PODs.
* **Negativas:** Ninguna. Se refuerza y solidifica la arquitectura.
