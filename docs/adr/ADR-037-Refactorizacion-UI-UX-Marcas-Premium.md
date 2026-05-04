# ADR-037: Refactorización UI/UX de Marcas a Estándar Premium

## Estado
Aceptado

## Fecha
2026-05-04

## Contexto
La pantalla de Control de Marcas presentaba varios problemas críticos de usabilidad y cumplimiento técnico:
1.  **Layout Breaking:** Con un volumen alto de marcas atrasadas (más de 100), la caja de alerta roja crecía verticalmente sin control, desplazando los botones de acción y el contenido principal fuera de la pantalla, haciendo la app inutilizable.
2.  **Rendimiento en Listas:** Se utilizaba un `ScrollView` estándar para renderizar cientos de elementos, lo cual degradaba el rendimiento (FPS) y violaba la **Regla 2** del proyecto (usar siempre `@shopify/flash-list` para listas largas).
3.  **Inconsistencia Visual:** La interfaz no aprovechaba el sistema de componentes "Premium" del core (`HeaderPremium`, `Badge`, `AnimatedPressable`), resultando en una estética básica que no cumplía con el objetivo de "visual excellence" del proyecto.
4.  **Buscabilidad:** No existía forma de filtrar marcas, lo cual dificultaba la gestión operativa en una base de datos con más de 100 registros.

## Decisión
Se ha realizado una refactorización integral de la feature `brands` bajo el skill `ui-ux-pro-max`:

### 1. Cambio de Motor de Renderizado
Se sustituyó `ScrollView` por `@shopify/flash-list` en `ControlMarcasScreen.tsx`, configurando un `estimatedItemSize` de 70 para asegurar un scroll fluido a 60fps, cumpliendo con las reglas técnicas de performance.

### 2. Implementación de Buscador
Se añadió un campo de búsqueda en el hook `useControlMarcas.ts` y la UI, permitiendo filtrado instantáneo por nombre de marca mediante `useMemo` para evitar re-renders innecesarios.

### 3. Integración de Componentes Core "Premium"
*   **HeaderPremium:** Se integró el encabezado corporativo, extendiéndolo para soportar acciones extra (`extraAction`) como la generación y envío de reportes PDF.
*   **BrandItem (Nuevo):** Se creó un componente especializado para las filas que utiliza `AnimatedPressable` para feedback táctil y `Badge` para indicar el estado (Atrasada / Al día / Deshabilitada).
*   **Typography e Input:** Se estandarizaron todos los textos y campos de entrada usando los componentes del core para mantener la estética inspirada en Notion.

### 4. Mejora de Accesibilidad y Feedback
*   Se añadieron `accessibilityLabel` y `accessibilityRole` en todos los elementos interactivos.
*   Se integró `expo-haptics` para proporcionar retroalimentación táctil en acciones clave (guardar configuración, enviar PDF).
*   Se implementó una lógica de "Summarized Alert" que agrupa las marcas pendientes si superan las 5 unidades, evitando el desbordamiento visual.

## Consecuencias
*   **Positivas:**
    *   **Escalabilidad:** La pantalla ahora maneja cientos de marcas sin degradación de UI o performance.
    *   **UX Superior:** El uso de animaciones, haptics y componentes premium eleva la calidad percibida de la aplicación.
    *   **Consistencia:** Se alineó la feature de marcas con el resto de la aplicación "Notion Style".
*   **Negativas:**
    *   Ninguna identificada; la refactorización simplifica el mantenimiento al usar componentes compartidos.
