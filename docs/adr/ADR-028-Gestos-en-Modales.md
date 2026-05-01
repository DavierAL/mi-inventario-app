# ADR 028: Soporte de Gestos dentro de Componentes Modal

## Fecha
2026-05-01

## Contexto y Problema
Tras la implementación de `GestureHandlerRootView` en la raíz de la aplicación (ADR 027) para habilitar los toques y animaciones nativas a 60fps (`AnimatedPressable`), se identificó que **los botones ubicados dentro de componentes `<Modal>` (nativos y librerías de terceros) dejaban de responder** en Android.

Esto ocurría en flujos críticos como:
- Captura de foto de evidencia de entrega (POD) en `StorePanelScreen`.
- Escáner de códigos QR en `StorePanelScreen`.
- Edición de inventario en `EditProductoModal`.

**Causa Raíz:** En Android, un componente `<Modal>` renderiza su contenido en una ventana / vista nativa completamente nueva, separada de la jerarquía de vistas principal de la aplicación. Por lo tanto, el `<GestureHandlerRootView>` declarado en `App.tsx` no tiene alcance sobre el contenido del modal, dejando los gestos sin un "orquestador" que intercepte y procese los toques.

## Decisiones y Solución

1.  **Aislamiento de Contexto de Gestos en Modales**:
    - Se decidió inyectar un nuevo contenedor `<GestureHandlerRootView style={{ flex: 1 }}>` **directamente como hijo primario** dentro de cada componente `<Modal>`.
    - Esto aplica tanto a modales nativos de `react-native` como a modales de terceros (`react-native-modal`).

2.  **Archivos Intervenidos**:
    - `src/features/logistics/screens/StorePanelScreen.tsx` (Cámara y Escáner QR).
    - `src/features/inventory/components/EditProductoModal.tsx` (Edición de producto).

3.  **Aislamiento de Hardware Nativo (`CameraView`)**:
    - Se descubrió que si `GestureHandlerRootView` envuelve un componente de superficie hardware como `CameraView`, en ciertos dispositivos Android se genera una colisión de memoria al momento de ejecutar `takePictureAsync`, resultando en un cierre inesperado de la aplicación (crash).
    - **Solución**: En los modales de cámara y escáner, se separó la jerarquía. El `CameraView` se mantiene en el fondo (fuera del control de gestos) y el `GestureHandlerRootView` se utiliza exclusivamente para envolver los controles superpuestos (botones) usando `StyleSheet.absoluteFill`.

## Consecuencias

### Positivas
- **Restauración de la Operatividad**: Los botones de cámara, captura, cierre y confirmar dentro de los modales vuelven a ser 100% operativos.
- **Mantenimiento de 60fps**: Podemos seguir utilizando los componentes premium (`AnimatedPressable`) dentro de los modales sin degradar la experiencia de usuario a `TouchableOpacity` estándar.

### Negativas
- Aumento marginal del boilerplate al construir nuevos modales, ya que los desarrolladores deben recordar incluir este envoltorio.

## Regla de Prevención
Cualquier nueva implementación de un Modal en la aplicación que requiera interactividad mediante componentes basados en la UI unificada (`Button`, `AnimatedPressable`, `Input`) DEBE estar obligatoriamente envuelta en un `<GestureHandlerRootView>` interno.
