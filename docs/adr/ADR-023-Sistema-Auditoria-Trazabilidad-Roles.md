# ADR 023: Sistema de Auditoría y Trazabilidad por Rol de Usuario

## Estado
Aceptado

## Contexto
Aunque la aplicación ya contaba con un sistema de historial de cambios, existía una brecha crítica en la trazabilidad: no se persistía el **rol del usuario** que realizaba la operación. En un entorno multi-rol (admin, logística, tienda, almacén), es imperativo para la seguridad y la resolución de conflictos saber qué perfil de usuario disparó una transición de estado o una edición de inventario.

### Problemas Identificados
1. **Anonimato en Auditoría**: Los logs registraban el cambio pero no el nivel de privilegio del ejecutor.
2. **Cumplimiento (Compliance)**: Falta de trazabilidad RBAC (Role-Based Access Control) exigida para auditorías de inventario.
3. **Desacople de Identidad**: El sistema de sincronización ignoraba la metadata de identidad al propagar cambios a la nube.

## Decisiones
1. **Extensión de Esquema (Local y Remoto)**:
    - Añadir la columna `rol_usuario` (`text`) a las tablas `historial` (productos) y `logistica_historial` en Supabase.
    - Incrementar la versión del esquema de WatermelonDB a la **v13** para incluir `rol_usuario` en las tablas locales equivalentes.
2. **Inyección de Contexto en Repositorios**:
    - Modificar la firma de los métodos de guardado en `InventarioRepository`, `LogisticsRepository` y `LogisticaHistorialRepository` para aceptar el rol del usuario.
    - Utilizar el `useAuthStore` para capturar el rol del usuario logueado en la capa de Store/Pantalla y pasarlo a los servicios de persistencia.
3. **Visualización de Auditoría en UI**:
    - Actualizar las pantallas de historial (`HistorialScreen` y `LogisticsHistoryScreen`) para mostrar el rol mediante etiquetas visuales y iconos de seguridad (`shield-checkmark`), permitiendo una supervisión rápida.
4. **Sincronización Transparente**:
    - Actualizar el `syncService.ts` para que el campo `rol_usuario` sea parte integral del flujo de PUSH/PULL, asegurando que la metadata de rol se preserve en la nube.

## Consecuencias
- **Positivas**:
    - **Trazabilidad Total**: Se puede identificar exactamente qué tipo de usuario realizó cada movimiento de stock o despacho.
    - **Seguridad Mejorada**: Facilita la detección de anomalías o uso indebido de permisos.
    - **Transparencia Operacional**: Los usuarios pueden ver en el historial no solo qué pasó, sino quién (por rol) fue responsable.
- **Negativas**:
    - Ligero incremento en el tamaño de la base de datos (mínimo).
    - Requiere que todas las futuras funciones de escritura inyecten explícitamente el rol del usuario.

## Verificación
- Migración exitosa de Supabase.
- Actualización de esquema local validada mediante ejecución.
- Verificación visual de los nuevos campos en las pantallas de historial.
