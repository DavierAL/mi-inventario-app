# ADR 030: Optimización de RLS mediante Metadata de Auth (Supabase)

## Fecha
2026-05-01

## Contexto y Problema
En la arquitectura anterior, las políticas de Row Level Security (RLS) en Supabase dependían de una función `get_user_rol()` que consultaba directamente la tabla `public.usuarios` en cada evaluación de fila. 

Para tablas con gran volumen de datos (como `envios` con más de 33,000 registros), este patrón generaba:
1.  **Latencia Crítica**: Una consulta SQL adicional por cada fila procesada por el motor de RLS.
2.  **Riesgo de Recursión**: La función consultaba una tabla que también tenía RLS activo, lo que en situaciones de alta concurrencia o errores de caché de sesión provocaba fallos silenciosos (retorno de 0 filas para usuarios no-admin).
3.  **Fallo de Sincronización**: Al realizar un PULL inicial desde la App móvil, las consultas excedían el timeout de Supabase o devolvían listas vacías injustificadamente.

## Decisiones y Solución
Se ha implementado una arquitectura basada en **Claims de JWT** (Metadatos de Auth), moviendo la validación del rol del plano de datos al plano de identidad.

1.  **Sincronización de Metadatos**:
    - Se creó un trigger en PostgreSQL (`sync_user_rol_to_auth`) que sincroniza automáticamente el campo `rol` de `public.usuarios` hacia `auth.users.raw_app_meta_data`.
    - Cada vez que se crea o actualiza un usuario, su rol se inyecta en el sistema de autenticación de Supabase.

2.  **Validación vía JWT**:
    - Se actualizó la función `get_user_rol()` para priorizar la lectura del claim inyectado en el token: `auth.jwt() -> 'app_metadata' ->> 'rol'`.
    - Esta operación es O(1) y no requiere accesos a disco ni Joins adicionales.

3.  **Marcado de Funciones como `STABLE`**:
    - Se marcaron `get_user_rol()` e `is_admin()` como `STABLE SECURITY DEFINER`. Esto permite que el planificador de consultas de PostgreSQL cachee el resultado de la función para el contexto de una misma transacción/consulta.

## Consecuencias

### Positivas
- **Rendimiento Masivo**: Reducción drástica del tiempo de ejecución de consultas SELECT en tablas grandes.
- **Robustez**: Se eliminó la dependencia de la tabla `usuarios` durante la evaluación de RLS, resolviendo los fallos de sincronización para roles de Logística y Atención.
- **Seguridad**: El rol está protegido dentro del JWT firmado por Supabase.

### Negativas
- **Desfase de Token**: Tras un cambio de rol, el usuario debe refrescar su sesión o volver a loguearse para que el nuevo rol se refleje en su JWT (aunque el fallback a tabla en la función mitiga esto).

## Regla de Prevención
Para cualquier nueva política de RLS que requiera validar roles, utiliza siempre la función centralizada `get_user_rol()`, la cual ya implementa la lógica de prioridad por metadatos. Evita hacer Joins manuales con la tabla `usuarios` dentro de las políticas.
