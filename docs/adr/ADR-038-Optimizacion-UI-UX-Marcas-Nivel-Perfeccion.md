# ADR-038: Optimización UI/UX de Marcas - Nivel Perfección

## Estado
Aceptado

## Fecha
2026-05-04

## Contexto
Tras la refactorización inicial de la sección de marcas (ADR-037), se identificó que para alcanzar un estándar de "excelencia visual" y usabilidad profesional, se requerían patrones de interacción más avanzados y una mejor gestión de la percepción de carga. La pantalla necesitaba pasar de ser "funcional y limpia" a ser "fluida y de alta gama".

## Decisión
Se implementaron optimizaciones de nivel avanzado en la feature `brands`, basándose en los principios de `ui-ux-pro-max`:

### 1. Sistema de Filtrado Segmentado
Se introdujo un `filtroEstado` en el hook `useControlMarcas.ts`. Técnicamente, esto permite:
*   **Reducción de Carga Cognitiva:** El usuario puede enfocarse solo en "Pendientes" sin ser abrumado por la lista total.
*   **Eficiencia de Datos:** El filtrado se realiza mediante un `useMemo` dependiente del estado del filtro, asegurando que la lógica de negocio esté desacoplada de la UI.

### 2. Micro-animaciones y Motion Design
Se integró `react-native-reanimated` para implementar:
*   **Staggered Entrance:** Los elementos de la lista entran con un retraso incremental (`index * 30ms`), lo que suaviza la carga visual y guía el ojo del usuario.
*   **Layout Transitions:** Cambios fluidos entre estados de búsqueda y filtrado.

### 3. Gestión de Latencia Percibida (Skeleton Loaders)
Se sustituyó el `ActivityIndicator` (spinner) por un sistema de **Skeleton Loaders (Shimmer)**:
*   **Beneficio:** Mantiene la estructura visual de la app mientras los datos se recuperan de Watermelondb, reduciendo la ansiedad del usuario y el "salto" de contenido al cargar.

### 4. Refinamiento de UX en Búsqueda
*   Se añadió un botón de limpieza rápida (`rightIcon` condicional) en el componente `Input`.
*   Se implementó un estado vacío (`ListEmptyComponent`) con iconografía de baja opacidad y mensajes de recuperación claros (error recovery path).

### 5. Rediseño de Alertas Estructurales
La alerta de marcas pendientes se transformó de una simple caja roja a un componente de dashboard informativo:
*   Uso de bordes punteados y contenedores de iconos con opacidad reducida (`colors.error + '15'`) para evitar una sensación de error crítico y pasar a una de "acción pendiente".

## Consecuencias
*   **Positivas:**
    *   **Percepción de Marca:** La aplicación se siente significativamente más robusta y profesional.
    *   **Usabilidad:** El filtrado segmentado mejora drásticamente la eficiencia operativa para usuarios con catálogos grandes.
    *   **Rendimiento:** El uso de animaciones no bloqueantes y `FlashList` mantiene la interfaz reactiva en todo momento.
*   **Negativas:**
    *   Leve incremento en la complejidad del código del hook debido a la gestión de estados de filtrado combinados (búsqueda + estado).
