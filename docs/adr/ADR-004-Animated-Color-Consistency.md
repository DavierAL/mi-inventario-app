# ADR 004: Consistencia de Colores en Animaciones

## Status
Accepted

## Contexto
Se detectó un error en el componente `Shimmer` causado por el uso de `interpolateColor` con formatos de color mixtos (Hex y RGBA). En React Native Reanimated, interpolar entre un color sólido (Hex) y uno con transparencia (RGBA) sin normalizar el formato puede causar fallos de renderizado o cierres inesperados en el hilo de UI.

## Decisión
1. **Formatos Unificados**: Al usar `interpolateColor`, todos los colores en el array de destino DEBEN tener el mismo formato.
2. **Dependencias de useAnimatedStyle**: Cualquier variable externa (como tokens de color) usada dentro de `useAnimatedStyle` debe pasarse en el array de dependencias para asegurar que el worklet se regenere si el valor cambia (ej. cambio de tema).
3. **Normalización Pre-Vuelo**: Si un color proviene de un objeto de tema dinámico, se recomienda normalizarlo a un formato estable antes de pasarlo al worklet.

## Consecuencias
- **Positivo**: Eliminación de errores críticos de interpolación en dispositivos Android e iOS.
- **Positivo**: Mayor claridad sobre cómo manejar estados dinámicos en animaciones de Reanimated.
- **Neutral**: Requiere un pequeño paso extra de normalización de strings en componentes animados.
