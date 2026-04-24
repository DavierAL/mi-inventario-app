# ADR 018: Refactorización de Edge Functions bajo Estándares Mascotify

## Estado
Aceptado

## Fecha
2026-04-23

## Contexto
Tras estabilizar la conexión técnica entre Supabase y Google Sheets (ADR-017), se identificó que el código de la Edge Function `sync-logistica-sheets` contenía residuos de deuda técnica (tipado laxo y propiedades obsoletas como `pod_url`) que no se alineaban con las reglas estrictas de desarrollo definidas en el archivo `SKILL.md` del proyecto Mascotify.

## Diagnóstico
Se realizó una auditoría de la función contra las reglas de la arquitectura Mascotify, encontrando los siguientes puntos de mejora:
1. **Propiedades Muertas**: La existencia de `pod_url` en las interfaces generaba confusión con respecto al esquema real de la base de datos remota (`url_foto`).
2. **Naming y Logs**: Los logs no seguían el estándar de prefijado por módulo para facilitar la trazabilidad en entornos productivos.
3. **Consistencia de Tipado**: Uso innecesario de fallbacks para columnas inexistentes en la base de datos remota.

## Decisiones Tomadas

### 1. Eliminación de Deuda Técnica (Clean Code)
Se refactorizaron las interfaces `EnvioRecord` y `WebhookPayload` para eliminar cualquier referencia a `pod_url`. La propiedad `url_foto` queda como la única fuente de verdad para la evidencia fotográfica en la nube, cumpliendo con la **Regla 5 (Tipado Estricto)**.

### 2. Cumplimiento de Reglas Supabase (Regla 85)
Se validó y blindó el uso de selecciones de columnas explícitas (`.select('id, cod_pedido, ...')`) para asegurar que la función sea eficiente en términos de transferencia de datos y memoria.

### 3. Estandarización de Logs (Regla 205)
Se actualizaron todos los `console.log` y `console.error` para incluir el prefijo `[sync-logistica-sheets]`, asegurando que en el dashboard de Supabase se identifique rápidamente el origen de cualquier mensaje.

### 4. Blindaje de Protocolo (doPost)
Se mantuvo la compatibilidad con el controlador de Google Sheets (`table: 'pedidos'`) pero encapsulándolo en una lógica de mapeo más limpia y descriptiva.

## Consecuencias
- **Positivas**: 
  - Código "Production-Ready" alineado al 100% con los estándares del equipo.
  - Reducción del tamaño del payload y mayor claridad para futuros desarrolladores.
  - Eliminación total de riesgos de errores `42703` (columna inexistente) por consultas residuales.
- **Negativas**: Ninguna. El cambio es puramente de calidad de código y estandarización sin afectar la funcionalidad establecida.

## Reglas Mascotify Aplicadas
- **Regla 0**: Entender el Apps Script antes de modificar el Relay.
- **Regla 5**: Tipado estricto sin propiedades huérfanas.
- **Regla 157**: Protección de Secrets mediante variables de entorno en Deno.
- **Regla 205**: Logs estandarizados con prefijo de módulo.
