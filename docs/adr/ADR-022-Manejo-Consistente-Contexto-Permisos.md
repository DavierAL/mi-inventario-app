# ADR 022: Manejo Consistente del Contexto de Permisos (RBAC)

## Estado
Aceptado

## Contexto
Durante la implementación de la visibilidad granular por roles en la pantalla `PickingScreen`, se produjo un error de compilación `Cannot find name 'role'`. Este error ocurrió porque, a pesar de que la lógica de filtrado dependía del rol del usuario, la variable no fue extraída del hook de permisos en el componente principal.

Este tipo de omisiones rompe el flujo de seguridad Local-First y puede llevar a que los filtros no se apliquen correctamente si se manejan valores por defecto (ej. `undefined`) de forma silenciosa.

## Decisión
Para evitar errores de referencia y asegurar que el sistema de permisos sea robusto, se establecen las siguientes reglas:

1. **Uso Obligatorio de `usePermissions`**: Cualquier componente que necesite filtrar datos o mostrar/ocultar UI basándose en el usuario DEBE usar el hook centralizado `src/core/hooks/usePermissions.ts`.
2. **Destructuración Explícita**: No se deben usar accesos indirectos al estado de autenticación (ej. llamar al store directamente dentro de pantallas de negocio). Se debe extraer explícitamente `role` o `hasPermission` desde el hook.
3. **Propagación de Props**: Los componentes que envuelven consultas de WatermelonDB (como `PickingList` con `withObservables`) deben recibir el rol como una prop explícita (`userRole`) para que la reactividad del hook de permisos dispare una nueva consulta a la base de datos si el contexto cambia.

## Cómo evitarlo en el futuro
Siguiendo las [Reglas Mascotify](file:///c:/mi-inventario-app/.agent/skills/reglas-mascotify/SKILL.md):

* **SOLID (SRP)**: La lógica de determinar "quién tiene permiso" reside en el hook; la pantalla solo debe encargarse de consumirlo y pasarlo a la capa de datos.
* **Tipado Estricto**: Se debe evitar el uso de `any` en los parámetros de los componentes de lista. Al definir interfaces claras (como `ListaReactivaParams`), TypeScript alertará inmediatamente si falta una propiedad obligatoria como `userRole`.
* **Code Review Interno (Agente)**: Antes de dar por finalizada una tarea de seguridad, el agente debe verificar que todas las dependencias del filtro (en este caso `role`) estén debidamente instanciadas en el scope de ejecución.

## Consecuencias
* **Positivas**: Mayor seguridad y trazabilidad. Los errores de contexto se detectan en tiempo de compilación y no en tiempo de ejecución.
* **Neutrales**: Requiere un paso adicional de destructuración en cada pantalla que use lógica de negocio sensible al rol.
