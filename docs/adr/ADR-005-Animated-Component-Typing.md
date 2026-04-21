# ADR 005: Tipado de Componentes Animados (Reanimated + TS)

## Status
Accepted

## Contexto
Al usar `Animated.View` de Reanimated con props dinámicas de estilo (especialmente `width` y `height`), TypeScript suele arrojar errores de asignación debido a la complejidad de los tipos que soportan `SharedValues`. El error se manifiesta como una incompatibilidad entre `string | number` y `DimensionValue | SharedValue`.

## Decisión
1. **DimensionValue**: Para props de dimensiones (`width`, `height`, `flexBasis`), usar siempre el tipo `DimensionValue` de `react-native` en lugar de `string | number`.
2. **Explicit Casting**: Al pasar objetos de estilo estáticos a componentes animados en un array de estilos, extraer el objeto a una constante tipada como `ViewStyle` (o usar `as ViewStyle`). Esto evita que Reanimated intente validar el objeto literal contra sus tipos internos complejos.
3. **Preferencia de Dimensiones**: Definir las dimensiones en el estilo base y dejar el `useAnimatedStyle` solo para las propiedades que realmente cambian en el hilo de UI.

## Consecuencias
- **Positivo**: Código libre de errores de compilación de TS.
- **Positivo**: Mayor claridad en la separación de estilos estáticos y animados.
- **Positivo**: Mejora la compatibilidad multiplataforma (Web/Native) al usar tipos estándar de RN.
