# ADR 031: Sincronización Segmentada por Roles

## Fecha
2026-05-01

## Contexto y Problema
Con el crecimiento de la base de datos de envíos a más de 33,000 registros, la sincronización inicial ("Full Sync") en dispositivos móviles se volvió inmanejable para roles operativos:
1.  **Agotamiento de Memoria**: WatermelonDB intentaba insertar miles de registros innecesarios en el dispositivo de usuarios que solo necesitan ver una fracción de la data.
2.  **Tiempo de Espera**: Sincronizaciones que duraban minutos, frustrando la experiencia de usuario en campo.
3.  **Invisibilidad de Datos**: Errores en la lógica de `lastPulledAt` hacían que, tras borrar la caché de la App, el sistema no detectara que necesitaba una descarga completa, dejando la App vacía.

## Decisiones y Solución
Se ha implementado una estrategia de **Sincronización Selectiva** en el `syncService.ts`.

1.  **Validación Previa de Sesión**:
    - Antes de iniciar el proceso de `synchronize`, el servicio valida que exista una sesión activa y extrae el rol del usuario de los metadatos de Auth.
    - Si no hay sesión, el proceso aborta preventivamente para evitar inconsistencias.

2.  **Filtrado por Rol en PULL**:
    - Se modificó la consulta a la tabla `envios` para aplicar filtros dinámicos según el rol:
        - **Logística**: Solo descarga envíos donde `operador = 'Salva'`.
        - **Tienda**: Solo descarga envíos de operadores locales (`Tienda`, `Yango`, `Cabify`).
        - **Admin/Atención**: Mantiene la descarga completa para visibilidad total.
    - Esto reduce el volumen de descarga inicial para personal de campo en un ~90%.

3.  **Garantía de Sincronización Completa**:
    - Se ajustó la lógica de `lastPulledDate` para que, si `lastPulledAt` es nulo o 0, se fuerce explícitamente el timestamp `1970-01-01`, garantizando que ningún registro se pierda en el primer inicio.

## Consecuencias

### Positivas
- **Velocidad de Inicio**: Los usuarios de Logística ahora inician sesión y sincronizan en segundos en lugar de minutos.
- **Estabilidad**: Menor presión sobre el puente JSI y la memoria SQLite del dispositivo.
- **Confiabilidad**: El sistema ahora es determinista en cuanto a cuándo debe realizar una carga completa vs. incremental.

### Negativas
- **Flexibilidad Limitada**: Si un usuario de Logística necesita ver un pedido que no está asignado a su operador, no lo encontrará localmente (debe usar el buscador global que consulta directamente a Supabase).

## Regla de Prevención
Cualquier tabla nueva que crezca masivamente debe ser evaluada en `syncService.ts` para determinar si requiere un filtro por rol o `tenant_id` durante el PULL inicial.
