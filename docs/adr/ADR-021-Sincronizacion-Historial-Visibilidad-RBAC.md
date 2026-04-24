# ADR 021: Sincronización de Historiales y Seguridad de Visibilidad Logística

## Estado
Aceptado

## Contexto
La aplicación Mascotify operaba bajo un esquema donde ciertos historiales críticos para la auditoría eran locales o unidireccionales, lo que impedía una supervisión real multi-dispositivo. Además, los roles de logística y tienda visualizaban todos los pedidos sin distinción, lo que generaba ruido operacional y riesgos de seguridad en la gestión de entregas.

### Problemas Detectados
1. **Historial Logístico**: Solo vivía en el dispositivo que realizaba el cambio.
2. **Historial de Productos**: Se subía a la nube pero no se descargaba (unidireccional), impidiendo ver cambios hechos por otros usuarios en la app.
3. **Visibilidad Granular**: El rol `logistica` veía pedidos de terceros (Yango/Cabify) y el rol `tienda` veía pedidos asignados al operador interno ("Salva").

## Decisiones
1. **Sincronización Bi-direccional (PULL + PUSH)**:
    - Integrar las tablas `logistica_historial` y `movimientos` (mapeada a `historial` en Supabase) en el motor central de sincronización de WatermelonDB.
    - Esto garantiza que cualquier auditoría realizada en un dispositivo sea visible en todos los demás.
2. **Evolución de Esquema (Supabase)**:
    - Añadir columnas `created_at` y `updated_at` a la tabla `historial` (productos) y crear la tabla `logistica_historial` con las mismas columnas para soportar la lógica de "delta sync" (solo descargar cambios desde el último timestamp).
3. **Seguridad de Visibilidad (RBAC)**:
    - Implementar filtrado en la capa de datos (`WatermelonDB Query`) basado en el operador asignado.
    - Operador "Salva" -> Exclusivo para Rol `logistica`.
    - Operadores "Tienda", "Yango", "Cabify" -> Exclusivos para Rol `tienda`.

## Consecuencias
- **Positivas**:
    - Auditoría total y persistente: Los supervisores pueden ver quién hizo qué cambio desde cualquier dispositivo.
    - Reducción de errores: Los operadores solo ven y gestionan los pedidos que les corresponden.
    - Consistencia Local-First: Se mantiene la velocidad nativa de WatermelonDB mientras se sincroniza en segundo plano.
- **Neutrales**:
    - Ligero incremento en el volumen de datos sincronizados (mitigado mediante paginación de 1000 registros).
