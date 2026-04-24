# ADR 016: Resolución de Error de Base de Datos (Column pod_url does not exist)

## Estado
Aceptado

## Fecha
2026-04-23

## Contexto y Problema
Tras implementar la corrección en la subida de evidencias fotográficas (ADR-015), se identificó un error crítico de base de datos (`Postgres Error 42703`) que impedía la actualización de los envíos:
- **Mensaje de Error**: `column envios.pod_url does not exist`.
- **Impacto**: El sistema abortaba cualquier intento de lectura o actualización de pedidos que incluyera este campo, dejando al motorizado sin capacidad de confirmar entregas y bloqueando el relay hacia Google Sheets.

## Diagnóstico
Utilizando las herramientas de auditoría de Supabase (MCP), se comparó el código fuente con el esquema real de la base de datos:
1. **Esquema Real**: La tabla `envios` solo posee la columna `url_foto` para almacenar links de imágenes.
2. **Código App**: El `syncService.ts` realizaba un `.select()` incluyendo `pod_url`, lo que causaba que la consulta SQL fallara antes de ser procesada.
3. **Código Edge Function**: La función `sync-logistica-sheets` también intentaba seleccionar `pod_url` de la base de datos, provocando el fallo del relay.

## Decisiones Tomadas

### 1. Saneamiento de Consultas (Selects)
Se eliminó cualquier referencia a la columna `pod_url` en las llamadas a la API de Supabase en los siguientes componentes:
- **`syncService.ts`**: Se modificó la consulta de descarga (Pull) para solicitar solo columnas existentes.
- **`sync-logistica-sheets (Edge Function)`**: Se limpió la lógica de extracción de datos para evitar el error de columna inexistente.

### 2. Mapeo de Compatibilidad Local
Para no romper la lógica interna de WatermelonDB (que usa `pod_url` como nombre de propiedad local), se mantuvo el mapeo en el frontend pero vinculándolo exclusivamente a la columna `url_foto` en las operaciones de entrada/salida hacia la nube.

### 3. Redespliegue de Infraestructura
Se realizó un despliegue forzado de la Edge Function actualizada mediante el CLI de Supabase para asegurar que el entorno de producción estuviera libre de consultas erróneas.

### 4. Prueba de Integración Real
Se ejecutó una prueba controlada sobre el pedido **#163706**, verificando:
- Generación de imagen de prueba.
- Actualización de estado en DB (exitosa).
- Persistencia de URL en `url_foto` (exitosa).
- Desencadenamiento del relay hacia Google Sheets (exitoso).

## Consecuencias
- **Positivas**: 
  - Estabilidad total del módulo de logística.
  - Eliminación de errores de sincronización en el `syncService`.
  - Garantía de que los datos llegan a Google Sheets sin interrupciones por errores de esquema.
- **Negativas**: Requiere mantener un mapeo manual en el `syncService` entre el nombre local (`pod_url`) y el remoto (`url_foto`) hasta que se decida unificar nombres en una futura migración de base de datos local.
