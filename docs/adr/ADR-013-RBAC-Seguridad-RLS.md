# ADR 013: Implementación de RBAC y Seguridad Multi-capa (RLS + Navigation Guards)

## Estado
Aceptado

## Contexto
Se identificó que la aplicación carecía de restricciones de acceso efectivas. A pesar de tener roles definidos en la base de datos, cualquier usuario autenticado podía navegar a cualquier pantalla, visualizar todos los datos y realizar acciones críticas (como despachar pedidos o editar stock) independientemente de su función. Además, existían vulnerabilidades en la configuración de Row Level Security (RLS) en Supabase, incluyendo políticas redundantes y permisos excesivamente amplios.

## Decisión
Se ha implementado un sistema de seguridad de tres capas para garantizar que el acceso esté estrictamente limitado por el rol del usuario:

1.  **Capa de Base de Datos (Supabase RLS):** 
    *   Se eliminaron todas las políticas de seguridad existentes para limpiar redundancias y "huecos" de seguridad.
    *   Se habilitó RLS en las tablas `usuarios`, `productos` y `envios`.
    *   Se unificaron las políticas utilizando el helper `get_user_rol()` para validar tanto el rol como el estado activo del usuario.
    *   Se restringió el acceso de escritura (INSERT/UPDATE/DELETE) exclusivamente a los roles autorizados (`admin`, `almacen`, `tienda` para productos; `admin`, `logistica` para envíos).

2.  **Capa de Navegación (Frontend - React Navigation):**
    *   Se implementaron "Navigation Guards" en el `AppNavigator`. Las pantallas (Screens) ahora se renderizan condicionalmente.
    *   Si un usuario no tiene permiso para una funcionalidad, la pantalla correspondiente ni siquiera existe en el stack de navegación, impidiendo accesos accidentales o forzados.

3.  **Capa de Interfaz (Frontend - UI/UX):**
    *   Se creó el hook `usePermissions` para centralizar la lógica de permisos.
    *   El `BottomBar` filtra las pestañas visibles según el rol.
    *   Los componentes de acción dentro de las pantallas (botones de edición, botones de despacho) se ocultan o deshabilitan dinámicamente si el usuario no tiene permisos de escritura.

## Consecuencias
*   **Positivas:** 
    *   Seguridad robusta: Incluso si un usuario intenta saltarse la UI, la base de datos rechazará las operaciones no autorizadas vía RLS.
    *   UX Limpia: Los usuarios solo ven lo que necesitan para su trabajo diario, reduciendo la carga cognitiva y errores accidentales.
    *   Mantenibilidad: La lógica de permisos está centralizada en un solo hook.
*   **Negativas:**
    *   Requiere mayor rigor al crear nuevos roles o funcionalidades, asegurando que se actualicen las tres capas.

## Roles y Permisos Definidos
| Rol | Almacén (Lectura/Escritura) | Logística (Lectura/Escritura) | Análisis |
| :--- | :--- | :--- | :--- |
| **admin** | ✅ / ✅ | ✅ / ✅ | ✅ |
| **logistica** | ❌ / ❌ | ✅ / ✅ | ❌ |
| **almacen** | ✅ / ✅ | ❌ / ❌ | ❌ |
| **tienda** | ✅ / ✅ | ❌ / ❌ | ❌ |
| **atencion** | ✅ / ❌ | ✅ / ❌ | ✅ |
