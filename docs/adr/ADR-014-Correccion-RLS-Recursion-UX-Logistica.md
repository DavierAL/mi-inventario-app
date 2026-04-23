# ADR 014: Corrección de Recursión en RLS y Optimización de UX por Roles

## Estado
Aceptado

## Contexto
Tras la implementación inicial del sistema RBAC (ADR 013), se reportaron dos problemas críticos:
1.  **Fallo de Inicio de Sesión:** Los usuarios no podían loguearse, recibiendo el error "Perfil no encontrado".
2.  **Experiencia de Logística "Rota":** El rol de logística, al tener restringido el acceso al almacén (landing page por defecto), aterrizaba en una pantalla de escáner sin navegación, quedando bloqueado.

## Análisis Técnico (Pensamiento)
1.  **Recursión en RLS:** Al investigar las políticas de la tabla `usuarios`, se descubrió que la regla para administradores utilizaba una subconsulta que consultaba la misma tabla `usuarios`. Como las políticas se aplican a todas las consultas, la evaluación de la política para la subconsulta disparaba de nuevo la evaluación de la política, creando un bucle infinito de recursión. Esto provocaba que Supabase devolviera un error 500, que el frontend interpretaba como "perfil no encontrado".
2.  **Landing Pages Estáticas:** El `AppNavigator` tenía un orden de pantallas fijo donde `InventarioList` siempre era la primera. Al ser eliminada del stack para el rol de logística, la siguiente pantalla disponible era `Scanner`. Sin embargo, `Scanner` no cuenta con una `BottomBar` integrada, rompiendo el flujo de navegación.

## Decisiones

1.  **Solución a la Recursión (RLS):**
    *   Se creó una función especializada `is_admin()` con privilegios de ejecutor definidos (`SECURITY DEFINER`). Al ejecutarse con los privilegios del propietario de la base de datos, esta función **ignora el RLS** de la tabla `usuarios` internamente, rompiendo el bucle recursivo.
    *   Se simplificaron las políticas de `usuarios` para usar comparaciones directas (`auth.uid() = id`) para el acceso propio y la función `is_admin()` para el acceso administrativo.

2.  **Optimización de Navegación (UX):**
    *   Se reestructuró el orden de las pantallas en `AppNavigator.tsx`. Ahora, el bloque de pantallas de Logística (`PickingList`) se define antes que las pantallas de utilidad como el `Scanner`.
    *   Esto garantiza que para el rol de **Logística**, la primera pantalla válida en el stack sea su panel de trabajo principal, asegurando una experiencia fluida desde el inicio de sesión.

3.  **Seguridad por Estado (Activo):**
    *   Se integró la validación de `activo = true` en todas las funciones de ayuda de RLS (`get_user_rol()` e `is_admin()`).
    *   Cualquier usuario marcado como inactivo en la base de datos pierde automáticamente todo acceso a los datos (`productos`, `envios`), incluso si su sesión de autenticación sigue vigente.

## Consecuencias

*   **Positivas:**
    *   **Estabilidad:** Se restauró la capacidad de inicio de sesión para todos los usuarios.
    *   **Navegación Intuitiva:** Cada rol aterriza ahora en la pantalla que mejor se adapta a su función diaria.
    *   **Blindaje:** Mayor control sobre usuarios inactivos o suspendidos directamente desde el motor de base de datos.
*   **Negativas:**
    *   Añade una dependencia a funciones personalizadas en la base de datos, las cuales deben ser migradas junto con el esquema.

## Verificación de Solución
- [x] Prueba de login exitosa con múltiples roles.
- [x] Verificación de landing page correcta para Logística (aterriza en PickingList).
- [x] Validación de rechazo de datos para usuarios inactivos en Supabase.
