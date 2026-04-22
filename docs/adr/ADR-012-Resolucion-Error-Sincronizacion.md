# ADR 012: Resolución de Error Crítico de Sincronización por Inconsistencia de Esquema

## Estado
Aceptado

## Contexto
Tras la implementación del historial de logística y la actualización del esquema local a la versión 12, la aplicación comenzó a mostrar un error fatal persistente ("Ha ocurrido un problema. Ocurrió un error inesperado") en las pantallas de Almacén y Logística. Este error bloqueaba completamente la carga de datos y la sincronización inicial, incluso después de reinstalar la aplicación y limpiar la caché.

## Identificación del Problema
Para identificar la causa raíz, se realizaron los siguientes pasos de diagnóstico:

1. **Análisis de Logs:** Se revisaron los archivos de error locales, confirmando que el fallo ocurría durante la ejecución de `syncConSupabase`.
2. **Script de Diagnóstico Remoto:** Se creó un script de scratch (`scratch/check_supabase.js`) utilizando las credenciales del `.env` para consultar directamente el esquema de la tabla `envios` en Supabase mediante el cliente de Node.js.
3. **Hallazgo:** El script reveló que la columna **`pod_url` NO existe** en la tabla remota de Supabase, a pesar de estar definida en el modelo local de WatermelonDB y en las consultas de selección. 

La ejecución de `.select('..., pod_url, ...')` sobre una tabla que carece de dicha columna provoca un error `400 Bad Request` por parte de PostgREST (Supabase), lo que disparaba la excepción capturada por el `ErrorService`.

## Decisión
Se decidió desacoplar la dependencia de la columna `pod_url` en el servidor para restaurar la estabilidad de la aplicación sin requerir cambios inmediatos en el esquema de producción de Supabase.

### Acciones Tomadas:

1. **Saneamiento de Consultas (Pull):** Se eliminó `pod_url` de la cadena de selección en `syncService.ts`.
2. **Estrategia de Fallback:** En el mapeo de datos entrantes, se implementó un fallback donde el campo local `pod_url` hereda el valor de `url_foto`. Esto garantiza la "coexistencia" local requerida para el funcionamiento de los componentes de UI que ya dependen de este campo.
3. **Saneamiento de Escritura (Push):** Se eliminó el envío de `pod_url` en los métodos de `upsert` para evitar errores de escritura en el servidor.
4. **Corrección de Modelos:** Se eliminó una referencia a la tabla inexistente `pedido_items` en el modelo `Envio.ts` y se corrigieron los decoradores de tipo (`@text` vs `@field`) para mayor precisión en el motor SQLite.
5. **Migración Segura:** Se modificó la migración v11 para que la columna `marca` sea opcional, evitando fallos de SQLite al intentar añadir columnas `NOT NULL` a tablas con datos pre-existentes.

## Consecuencias

### Positivas:
- **Estabilidad Restaurada:** La aplicación vuelve a ser operativa y sincroniza correctamente los datos de inventario y pedidos.
- **Transparencia:** El historial de logística sigue funcionando localmente gracias al mapeo de fallback.
- **Robustez:** Las consultas ahora solo solicitan columnas verificadas en el servidor.

### Negativas/Riesgos:
- **Divergencia de Esquema:** Existe una discrepancia entre el modelo local (v12) y el esquema de Supabase. Se recomienda una migración en el servidor para añadir `pod_url` de forma oficial en el futuro si se desea persistencia independiente de este campo.

## Referencias
- ADR 011: Trazabilidad y Auditoría en Logística.
- Script de Diagnóstico: `scratch/check_supabase.js`.
- Reglas Mascotify (`SKILL.md`).
