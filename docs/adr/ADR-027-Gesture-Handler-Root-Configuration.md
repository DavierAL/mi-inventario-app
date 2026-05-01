# ADR 027: Configuración de Root para Gesture Handler

## Fecha
2026-05-01

## Contexto y Problema
Al migrar el sistema de interacción táctil (`AnimatedPressable`) al motor nativo de `react-native-gesture-handler` (v2+) para alcanzar un rendimiento de 60fps en animaciones, se detectó un fallo crítico en Android donde ningún botón de la aplicación respondía a los toques.

El problema radicaba en la ausencia del componente `GestureHandlerRootView` en la raíz de la aplicación. Sin este contenedor, el sistema operativo Android no puede interceptar ni propagar los eventos táctiles hacia los gestos declarados dentro de la jerarquía de vistas.

## Decisiones y Solución

1.  **Envoltura Global obligatoria**:
    - Se ha modificado `App.tsx` para envolver toda la jerarquía de componentes (incluyendo `ErrorBoundary` y `AppNavigator`) dentro de `<GestureHandlerRootView style={{ flex: 1 }}>`.
    - Esta configuración es un requisito técnico innegociable para que las librerías basadas en gestos nativos funcionen en la plataforma Android.

2.  **Estandarización de Callbacks**:
    - Se estandarizó el uso de `.onEnd((event, success) => { if (success) ... })` en lugar de `.onTouchesUp()` para garantizar que la lógica de negocio solo se dispare cuando el gesto se complete de forma válida y no sea cancelado por el sistema.

## Consecuencias

### Positivas
- **Respuesta Táctil Garantizada**: Todos los componentes interactivos ahora responden correctamente en Android e iOS.
- **Rendimiento Nativo**: Se mantiene la ventaja competitiva de procesar gestos en el *UI Thread* sin bloqueos causados por el *JS Thread*.

### Negativas
- Ninguna. Es un ajuste de infraestructura estándar necesario para el stack tecnológico elegido.

## Regla de Prevención
Cualquier futura migración de componentes táctiles (`TouchableOpacity`, `Pressable`) hacia soluciones basadas en `GestureDetector` debe validar primero que el contexto de root esté correctamente inicializado.
