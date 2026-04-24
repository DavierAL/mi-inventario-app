# ADR 019: Corrección de Persistencia de Evidencia Fotográfica en Flujo Offline

## Estado
Aceptado

## Fecha
2026-04-24

## Contexto y Problema
Se reportó un bug crítico en el módulo de Logística: al confirmar una entrega, el estado se actualizaba a "entregado" en Supabase, pero la URL de la evidencia fotográfica (POD) no se guardaba en la base de datos remota.

## Diagnóstico
Tras auditar el código fuente y contrastar con el esquema de base de datos en Supabase, se identificó la causa raíz:
- **Discrepancia de Naming**: Mientras que el servicio principal `EnviosService.ts` utilizaba la columna correcta (`url_foto`), el manejador de la cola de tareas offline (`jobHandlers.ts`) intentaba actualizar una columna inexistente llamada `pod_url`.
- **Falla en el Relay Offline**: Cuando el motorizado capturaba la foto en una zona de baja cobertura o cuando el procesamiento se delegaba a la cola (`QueueProcessor`), el sistema fallaba silenciosamente al intentar escribir en un campo que no existe en el esquema físico de Postgres.

## Decisiones Tomadas

### 1. Unificación de Esquema en Job Handlers
Se modificó el archivo `src/core/services/queue/jobHandlers.ts` para cambiar la referencia de `pod_url` a `url_foto`. Esto asegura que el `QueueProcessor` sea capaz de persistir la evidencia correctamente sin importar las condiciones de red en el momento de la captura.

### 2. Sincronización de Tipos
Se validó que el objeto de actualización enviado a Supabase en el flujo de segundo plano incluya exclusivamente las columnas definidas en el esquema de producción.

## Verificación Realizada
1. **Prueba Técnica**: Se realizó una actualización simulada sobre el pedido `#156210` utilizando el MCP de Supabase.
2. **Resultado**: La actualización de la columna `url_foto` fue exitosa y se confirmó mediante una consulta `SELECT` posterior.
3. **Validación de Reglas**: El cambio respeta la arquitectura Local-First y los principios de tipado del proyecto Mascotify.

## Consecuencias
- **Positivas**: 
  - Restablecimiento de la trazabilidad completa (Estado + Foto) en el sistema logístico.
  - Mayor robustez en el manejo de entregas con conexión inestable.
  - Eliminación de errores 404/400 latentes en las peticiones de actualización de Supabase.
- **Negativas**: Ninguna identificada. La solución es un hotfix de compatibilidad de esquema.
