# ADR-039: Corrección de Errores TypeScript en Compilación

## Estado
Aceptado

## Fecha
2026-05-04

## Contexto
Al ejecutar `npx tsc --noEmit` se identificaron 24 errores TypeScript分布在6 archivos. Los errores correspondían a:
1.  Binding elements implícitos `any` en mocks de test
2.  Prop `estimatedItemSize` no válida en `FlashList`
3.  Import faltante de `useRoute`
4.  Export faltante de `PedidoCard`

## Decisión
Se aplicaron las siguientes correcciones:

### 1. Test Files - Tipado de Mocks
**Archivos modificados:**
*   `src/core/ui/components/__tests__/AnimatedPressable.test.tsx`
*   `src/core/ui/components/__tests__/Button.test.tsx`

**Solución:** Agregar tipo explícito al parámetro del mock de AnimatedPressable:
```typescript
{ children, onPress, disabled, style, testID, ... }: {
    children?: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    style?: object;
    testID?: string;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: ...;
    haptic?: object;
}
```

### 2. FlashList - Remover estimatedItemSize
**Archivos modificados:**
*   `src/features/brands/screens/BrandAuditScreen.tsx`
*   `src/features/brands/screens/ControlMarcasScreen.tsx`

**Solución:** Remover la prop `estimatedItemSize` ya que el tipo `FlashListProps` de `@shopify/flash-list` no la incluye en la definición pública actual.

### 3. InventarioListScreen - Import useRoute
**Archivo modificado:**
*   `src/features/inventory/screens/InventarioListScreen.tsx`

**Solución:** Agregar `useRoute` al import existente:
```typescript
import { useNavigation, useRoute } from '@react-navigation/native';
```

### 4. PickingScreen - Export PedidoCard
**Archivo modificado:**
*   `src/features/logistics/screens/PickingScreen.tsx`

**Solución:** Exports explícitos al final del archivo:
```typescript
export { PedidoCard };
```

## Consecuencias
- La compilación TypeScript ahora pasa sin errores
- Los tests mantienen su funcionalidad con los mocks tipados
- FlashList funciona correctamente sin la prop problemática

## Referencias
- Error TS7031: Binding element implicitly has an 'any' type
- Error TS2322: Property 'estimatedItemSize' does not exist
- Error TS2304: Cannot find name 'useRoute'
- Error TS2459: Module declares locally but is not exported