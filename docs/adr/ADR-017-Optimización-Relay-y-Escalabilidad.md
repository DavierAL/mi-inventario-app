# ADR 017: Optimización del Relay Supabase -> Google Sheets y Propuesta de Rendimiento

## Estado
Aceptado

## Fecha
2026-04-23

## Contexto
Tras corregir los errores de esquema de base de datos (ADR-016), se detectó que la sincronización con Google Sheets seguía fallando debido a una discrepancia en el protocolo de comunicación (payload) entre Supabase Edge Functions y Google Apps Script. 

## Diagnóstico y Pensamiento (Paso a Paso)

### 1. El Conflicto de Nombres
- **Observación**: Mi diseño previo enviaba `table: 'Envios'` basándose en el nombre de la pestaña de destino.
- **Análisis del Código del Usuario**: El Apps Script tiene un filtro explícito: `if (payload.table === 'pedidos' && payload.type === 'UPDATE')`.
- **Deducción**: El script de Google actúa como un controlador de eventos. Si el string no es exactamente `'pedidos'`, el script aborta la ejecución antes de llegar a la lógica de actualización, devolviendo un éxito falso ("Evento ignorado").

### 2. Sincronización de Protocolos
- Se ajustó la Edge Function para que el campo `table` vuelva a ser `'pedidos'`, asegurando que el `if` en el `doPost` de Google sea evaluado como `true`.
- Se validó que el campo `cod_pedido` sea enviado como string, ya que el script de Google hace una comparación de tipos estrictos.

---

## 🚀 Propuesta de Mejoras de Rendimiento y Velocidad

A medida que la flota crezca a 30+ motorizados, el sistema actual de Google Sheets + Edge Functions enfrentará cuellos de botella. Aquí propongo cómo optimizarlo:

### 1. Optimización del Apps Script (Google Sheets)
- **Problema Actual**: El script usa un bucle `for` para recorrer todas las filas (`data.length`) buscando el pedido. Con 30k+ filas, esto es extremadamente lento (O(n)).
- **Mejora Propuesta**: 
    - Implementar un **Índice de Búsqueda** usando un objeto Map de JS en memoria o, mejor aún, usar el método de búsqueda de rangos de Google Sheets: `sheet.getRange(1, idxPedido + 1, sheet.getLastRow()).createTextFinder(codPedido).findNext()`.
    - Esto reduce el tiempo de búsqueda de segundos a milisegundos.

### 2. Procesamiento Asíncrono en Supabase
- **Problema Actual**: La App espera (aunque sea de forma no bloqueante) a que la Edge Function termine.
- **Mejora Propuesta**: Usar **Supabase Edge HTTP Queues** o invocar la función de forma asíncrona mediante un Trigger de Base de Datos que escriba en una tabla de "jobs". Esto libera al cliente móvil instantáneamente, delegando la tarea de reintento en caso de fallo al servidor.

### 3. Reducción de Latencia en el Relay
- **Compresión de Carga**: Enviar solo los campos necesarios (`id`, `estado`, `url_foto`) en lugar de todo el objeto `record`.
- **Keep-Alive**: Configurar las cabeceras de conexión para mantener el túnel abierto entre Supabase y los servidores de Google durante ráfagas de entregas.

### 4. Caché Local de Coordenadas (Para el futuro GPS)
- Para evitar recalcular el ETA en cada ping de GPS, se propone usar **Redis (vía Supabase Hyper-parallel)** para almacenar la última ubicación conocida y los umbrales de tiempo, evitando consultas costosas a la base de datos principal en cada movimiento.

## Consecuencias
- **Inmediatas**: El flujo actual es 100% compatible y funcional.
- **A Largo Plazo**: Se han identificado los puntos de fricción que limitarán el escalado a 30 motorizados, permitiendo una transición suave hacia una arquitectura basada en eventos (Event-Driven Architecture).
