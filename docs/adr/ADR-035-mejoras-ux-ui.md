# ADR: Mejoras Integrales de UX/UI

## Meta Información

| Campo | Valor |
|-------|-------|
| **ID** | ADR-001 |
| **Título** | Mejoras Integrales de UX/UI para mi-inventario-app |
| **Fecha** | 2026-05-02 |
| **Autores** | Equipo de Desarrollo |
| **Estado** | Aprobado |
| **Tags** | UX, UI, React Native, Animaciones |

---

## Resumen Ejecutivo

Este ADR documenta las mejoras implementadas en la experiencia de usuario (UX) e interfaz de usuario (UI) de la aplicación **mi-inventario-app**. Las mejoras abarcan cinco áreas principales: Feedback al usuario, Modales y diálogos, Navegación y transiciones, Listas con animaciones, y Micro-interacciones.

**Decisión principal**: Implementar componentes UI reutilizables con animaciones nativas usando `react-native-reanimated` y mejorar las transiciones de navegación.

---

## Contexto y Antecedentes

### Estado Anterior de la UI

La aplicación `mi-inventario-app` es una aplicación de inventario desenvolvida con **React Native** (Expo) que 管理aba productos, logística y escaneo de códigos de barras. Sin embargo, presentaba deficiencias en la experiencia de usuario:

1. **Sin estados de carga estructurados**: Los indicadores de carga eran inconsistentes
2. **Dialogs básicos**: Solo existían modales nativos de React Native o el componente `EditProductoModal` especializado
3. **Transiciones de navegación por defecto**: Sin personalización de animaciones
4. **Listas sin animaciones de entrada**: Los items aparecían instantáneamente sin feedback visual
5. **Interacciones limitadas**: Aunque existía haptic feedback, faltaban respuestas visuales

### Análisis de Usabilidad

Se identificaron las siguientes oportunidades de mejora:

| Área | Problema | Impacto UX |
|------|----------|------------|
| Feedback | Carga sin feedback estructurado | Medio |
| Modales | Solo modales básicos disponibles | Alto |
| Navegación | Transiciones genéricas | Bajo |
| Listas | Sin animaciones de entrada | Medio |
| Micro-interacciones | Respuestas solo hápticas | Bajo |

---

## Decisión Tomada

Se implementaron los siguientes componentes y mejoras:

### Componentes Nuevos Creados

1. **LoadingOverlay** (`src/core/ui/components/LoadingOverlay.tsx`)
2. **ConfirmDialog** (`src/core/ui/components/ConfirmDialog.tsx`)
3. **BottomSheet** (`src/core/ui/components/BottomSheet.tsx`)
4. **AnimatedListItem** (`src/core/ui/components/AnimatedListItem.tsx`)

### Mejoras a Componentes Existentes

1. **Button**: Agregada variante `outline`
2. **AppNavigator**: Transiciones personalizadas con gesture enabled
3. **exports**: Nuevos componentes exportados desde `index.ts`

---

## Detalle de Cambios

### 1. LoadingOverlay Component

**Archivo**: `src/core/ui/components/LoadingOverlay.tsx`

**Propósito**: Proporcionar un indicador de carga overlay accesible y personalizado.

**Props**:
- `visible: boolean` - Controla la visibilidad
- `message?: string` - Mensaje opcional a mostrar

**Características técnicas**:
- Usa `Modal` nativo de React Native con `animationType="fade"`
- Fondo con opacidad RGBA (0.5 de negro)
- `ActivityIndicator` con color primario de tema
- Soporte para mensaje de texto

**Impacto UX**:
- Estados de carga visibles y consistentes
- Usuario recibe feedback claro durante operaciones largas
- Evita interacción mientras carga

---

### 2. ConfirmDialog Component

**Archivo**: `src/core/ui/components/ConfirmDialog.tsx`

**Propósito**: Diálogo de confirmación con animaciones y feedback háptico.

**Props**:
- `visible: boolean`
- `title: string` - Título del diálogo
- `message: string` - Mensaje descriptivo
- `confirmText?: string` - Texto del botón confirmar (default: "Confirmar")
- `cancelText?: string` - Texto del botón cancelar (default: "Cancelar")
- `onConfirm: () => void` - Callback confirmación
- `onCancel: () => void` - Callback cancelación
- `type?: 'danger' | 'warning' | 'info'` - Tipo de diálogo (default: 'warning')

**Características técnicas**:
- Animación de escala con `withSpring` (damping: 15, stiffness: 200)
- Animación de opacidad con `withTiming` (200ms)
- Iconos dinámicos según tipo (warning, info-circle, alert-circle)
- Colores semánticos del tema (error para danger, primario para otros)
- Feedback háptico: notification success para confirmar, impact light para cancelar

**Impacto UX**:
- Confirmación visual antes de acciones destructivas
- Reducción de errores por clicks accidentales
- Feedback visual y háptico confirma la acción

---

### 3. BottomSheet Component

**Archivo**: `src/core/ui/components/BottomSheet.tsx`

**Propósito**: Hoja inferior desplegable con gestos de arrastre.

**Props**:
- `visible: boolean`
- `title?: string` - Título opcional
- `options: BottomSheetOption[]` - Array de opciones
- `onSelect: (value: string) => void` - Callback selección
- `onClose: () => void` - Callback cierre

**Características técnicas**:
- Animación de entrada/salida con `withSpring`
- Gesture detector con `PanGesture` de react-native-gesture-handler
- Cierre por arrastre (threshold: 100px o velocity > 500)
- Overlay con opacidad animable
- Handle visual para indicar área de arrastre
- Safe area insets para notch/dispositivos con notch

**Impacto UX**:
- Patrón familiar (iOS/Android) para selección de opciones
- Gesture natural para cerrar
- Acceso rápido a acciones sin navegar
- Mantiene contexto visual (overlay oscuro)

---

### 4. AnimatedListItem Component

**Archivo**: `src/core/ui/components/AnimatedListItem.tsx`

**Propósito**: Wrapper que provee animación de entrada escalonada para items de lista.

**Props**:
- `index: number` - Índice del item (determina delay)
- `children: React.ReactNode` - Contenido a renderizar

**Características técnicas**:
- Animación de opacidad con `withDelay` (min(index * 50, 300))
- Animación de translateY con spring
- Delay escalonado máximo de 300ms para evitar espera larga

**Impacto UX**:
- Feedback visual de carga de lista
- Percepción de velocidad por animación escalonada
- Experiencia más fluida y moderna

---

### 5. Mejora en Button - Variante Outline

**Archivo**: `src/core/ui/components/Button.tsx`

**Cambio**: Agregada variante `outline` al tipo `variant`.

**Estilos aplicados**:
- Background: transparent
- Border: 1px con color `borde` del tema

**Impacto UX**:
- Opción de botón secundario para diálogos
- Jerarquía visual clara (primario vs secundario)

---

### 6. Transiciones de Navegación

**Archivo**: `src/core/navigation/AppNavigator.tsx`

**Cambio**: Configuración de screenOptions para el Stack.Navigator.

**Configuración aplicada**:
- `animation: 'slide_from_right'` - Animación slide horizontal
- `gestureEnabled: true` - Habilitar gestos de navegación
- `gestureDirection: 'horizontal'` - Dirección del gesto

**Impacto UX**:
- Transiciones fluidas y familiares (estándar iOS)
- Posibilidad de volver con swipe (gesto natural)
- Mayor feeling de app nativa

---

## Consideraciones Técnicas

### Dependencias Utilizadas

Las dependencias ya estaban instaladas en el proyecto:

| Paquete | Versión | Uso |
|---------|---------|-----|
| react-native-reanimated | ^4.3.0 | Animaciones de spring y timing |
| react-native-gesture-handler | ~2.28.0 | Gestos para BottomSheet |
| expo-haptics | ~15.0.8 | Feedback háptico |

### Patrones de Diseño Aplicados

1. **Composición**: Todos los componentes usan composición React
2. **Theming**: Uso de `useTheme()` para colores del tema
3. **Animaciones declarativas**: Uso de hooks de Reanimated
4. **TypeScript**: Tipado completo de props

### Compatibilidad

- ✅ Expo SDK 54
- ✅ React Native 0.81.5
- ✅ iOS y Android
- ✅ Dark/Light mode soportado en todos los componentes

---

## Impacto en UX

### Métricas de Mejora Esperadas

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Percepción de carga | Sin feedback estructurado | Overlay con spinner | +30% satisfacción |
| Confirmación de acciones | Alert básico | Dialog con animación | +40% reducción errores |
| Selección de opciones | Navegación a nueva screen | BottomSheet | -50% pasos |
| Fluidez de navegación | Transiciones genéricas | Slide personalizado | +25% percepción velocidad |
| Engagement de listas | Entrada instantánea | Animación escalonada | +20% engagement |

### Principios UX Aplicados

1. **Feedback**: Todo acción tiene respuesta visual/háptica
2. **Affordance**: Los elementos comunican su interacción posible
3. **Consistencia**: Mismos patrones en toda la app
4. **Eficiencia**: Menos pasos para completar tareas
5. **Seguridad**: Confirmación antes de acciones destructivas

---

## Alternatives Consideradas

### 1. Usar biblioteca de componentes UI (UI Kitten, React Native Paper)

**Razón del descarte**: Añadiría dependencias adicionales y no permitiría personalización completa con el diseño existente del proyecto.

### 2. Modales nativos sin personalización

**Razón del descarte**: No permiten animaciones fluidas ni control de gestos.

### 3. Animaciones con Animated API de React Native

**Razón del descarte**: Reanimated ofrece mejor rendimiento y mayor flexibilidad para interacciones complejas.

---

## Implementación y Uso

### Exportación de Componentes

Todos los nuevos componentes se exportan desde:
```typescript
// src/core/ui/components/index.ts
export * from './LoadingOverlay';
export * from './ConfirmDialog';
export * from './BottomSheet';
export * from './AnimatedListItem';
```

### Ejemplo de Uso

```typescript
import { 
  LoadingOverlay, 
  ConfirmDialog, 
  BottomSheet,
  AnimatedListItem 
} from '../core/ui/components';

// LoadingOverlay
<LoadingOverlay visible={loading} message="Guardando..." />

// ConfirmDialog
<ConfirmDialog
  visible={showDeleteConfirm}
  title="Eliminar producto"
  message="¿Estás seguro de eliminar este producto?"
  type="danger"
  onConfirm={handleDelete}
  onCancel={() => setShowDeleteConfirm(false)}
/>

// BottomSheet
<BottomSheet
  visible={showOptions}
  title="Opciones"
  options={[
    { label: 'Editar', value: 'edit' },
    { label: 'Eliminar', value: 'delete', destructive: true }
  ]}
  onSelect={handleOptionSelect}
  onClose={() => setShowOptions(false)}
/>

// AnimatedListItem (en lista)
<FlashList
  renderItem={({ item, index }) => (
    <AnimatedListItem index={index}>
      <ProductoCard item={item} onPress={onPress} />
    </AnimatedListItem>
  )}
/>
```

---

## Costes y Riesgos

### Costes de Implementación

| Área | Estimación |
|------|-------------|
| Desarrollo componentes | 4 horas |
| Testing y ajustes | 2 horas |
| Documentación | 1 hora |
| **Total** | **7 horas** |

### Riesgos Identificados

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Animaciones degradan rendimiento | Baja | Usar worklets de Reanimated |
| Compatibilidad con futuras versiones RN | Media | Mantener dependencias actualizadas |
| Componentes no usados por equipo | Media | Documentar y promover uso |

---

## Resultados y Seguimiento

### Checklist de Implementación

- [x] LoadingOverlay component creado
- [x] ConfirmDialog component creado
- [x] BottomSheet component creado
- [x] AnimatedListItem component creado
- [x] Button variante outline agregada
- [x] Transiciones de navegación mejoradas
- [x] TypeScript compila sin errores
- [x] Componentes exportados

### Trabajo Futuro Sugerido

1. **Skeleton Loaders**: Reemplazar ActivityIndicator con skeleton para contenido
2. **Pull-to-refresh animado**: Mejorar experiencia de refresh en listas
3. **Toast personalizado**: Mejoras al toast existente
4. **Onboarding**: Pantallas de bienvenida con animations

---

## Referencias

- [React Native Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- [React Navigation Transitions](https://reactnavigation.org/docs/stack-navigator/)
- [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [Design System del proyecto](./colores.ts)

---

## Historial de Versiones

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2026-05-02 | Equipo Dev | Versión inicial del ADR |