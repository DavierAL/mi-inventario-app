# ADR 009: Evolución Interfaz Minimalista (Estilo Notion)

## Estado
Aceptado

## Contexto
La aplicación Mascotify presentaba una carga visual significativa debido al uso extensivo de elevaciones (sombras), tarjetas con bordes pesados y un botón de navegación flotante (FAB) que rompía la jerarquía visual plana. El usuario solicitó una transformación hacia la estética de **Notion**: minimalista, basada en tipografía, espacios en blanco y superficies planas.

## Decisiones de Diseño y Arquitectura

### 1. Sistema de Colores (Warm Charcoal)
Se ha migrado el fondo base de modo oscuro de `#1a1917` a `#2f3437`. Esta tonalidad es característica de Notion Dark y permite una mejor transición entre el texto y el fondo sin fatiga visual.

### 2. Navegación Plana (Eliminación del FAB)
Se eliminó el botón central flotante en la `BottomBar`. La navegación ahora es estrictamente plana, integrando el Escáner como una pestaña equivalente. Esto reduce el ruido visual y alinea la app con los estándares de diseño de productividad modernos.

### 3. Jerarquía Operativa en Logística
- **Tarjetas Clickeables:** Se eliminó la necesidad de botones de acción secundarios dentro de las listas. La tarjeta completa actúa como disparador de navegación.
- **Tipografía "Tiny Bold":** Se introdujo el uso de etiquetas en negrita de 10px para metadatos (ej: "PEDIDO", "OPERADOR"), dejando los encabezados `h1/h2` para los datos variables.

### 4. Lógica de Negocio Visual (Smart Badges)
En lugar de badges estáticos, se implementó lógica programática que evalúa la fecha de vencimiento (`fv_actual_ts`) en tiempo real para asignar colores semánticos:
- **Error (Rojo):** Producto vencido.
- **Warning (Naranja):** Vence en menos de 90 días.
- **Neutral/Texto:** Más de 90 días.

### 5. Seguridad en el Flujo de Entrega (POD)
Se reforzó la lógica en `StorePanelScreen` para que el botón "Confirmar Entrega" solo se habilite tras la captura exitosa de una fotografía (Proof of Delivery). Esto garantiza que no se pierdan evidencias en el flujo de última milla.

## Consecuencias

### Positivas
- **Mejor legibilidad:** Menos distracciones visuales permiten al operario enfocarse en los códigos y cantidades.
- **Consistencia:** Un lenguaje visual unificado en todas las pantallas (Almacén, Logística, Historial).
- **Feedback Sensorial:** La integración de `expo-haptics` mejora la percepción de "calidad" y confirma acciones sin necesidad de mirar la pantalla constantemente.

### Neutrales
- **Curva de aprendizaje:** Los usuarios acostumbrados a botones gigantes deberán adaptarse a la interactividad de la tarjeta completa.

## Validación Técnica
- **TypeScript:** Verificación de tipos exitosa tras el refactor.
- **Rendimiento:** Uso de `memo` y `FlashList` mantenido para asegurar 60fps a pesar de los cambios de estilo.
- **Sincronización:** Restauración del `syncService` para asegurar que el nuevo diseño se alimente de datos íntegros.
