# ADR 025: Mejoras de UI/UX, Accesibilidad y Ergonomía Táctil

## Fecha
2026-05-01

## Contexto y Problema
Tras una auditoría exhaustiva realizada con el motor `ui-ux-pro-max`, se identificaron varios puntos de fricción que afectaban la profesionalidad, accesibilidad y usabilidad en campo de la aplicación Mascotify:

1.  **Uso de Emojis como Iconos Estructurales**: Se utilizaba el emoji `📦` como placeholder en tarjetas de productos y modales. Esto resultaba en una apariencia inconsistente entre plataformas (iOS vs Android) y una falta de integración con el sistema de temas.
2.  **Targets Táctiles Reducidos (Touch Targets)**: Varios botones de la cabecera y acciones rápidas tenían áreas interactivas inferiores al estándar de 44x44pt (Apple HIG) o 48x48dp (Material Design), lo que dificultaba su uso para transportistas en movimiento.
3.  **Falta de Soporte para Tecnologías de Asistencia**: Los componentes base carecían de propiedades de accesibilidad (`accessibilityLabel`, `accessibilityRole`), haciendo la aplicación inoperable para usuarios con discapacidad visual que dependen de lectores de pantalla (VoiceOver/TalkBack).

## Decisiones y Solución

Se implementaron las siguientes mejoras transversales para elevar el estándar de calidad del producto:

1.  **Estandarización de Iconografía Vectorial**:
    - Se reemplazaron todos los emojis estructurales (`📦`, `📅`) por iconos de la librería `Ionicons`.
    - Esto permite que los iconos hereden correctamente los colores del tema (`colors.textoTerciario`, `colors.primario`) y mantengan una nitidez vectorial consistente en cualquier densidad de pantalla.

2.  **Optimización de Ergonomía Táctil (HitSlop)**:
    - Se aplicó la propiedad `hitSlop` a los botones de retroceso y controles de cabecera (`HeaderPremium`, `StorePanelScreen`).
    - Esto expande el área interactiva efectiva sin alterar el diseño visual, permitiendo toques exitosos incluso si el dedo del usuario no aterriza exactamente sobre el icono.

3.  **Inyección Global de Accesibilidad en Componentes Core**:
    - **`AnimatedPressable`**: Se actualizó para aceptar y pasar props de accesibilidad al `Animated.View` nativo. Se definió `accessibilityRole="button"` por defecto.
    - **`Button`**: Ahora genera automáticamente un `accessibilityLabel` basado en su texto (`label`) si no se provee uno explícito.
    - **`Input`**: Se vinculó la etiqueta (`label`) con la propiedad `accessibilityLabel` del `TextInput` interno.
    - **Componentes de Negocio**: Se añadieron descripciones semánticas (ej. *"Producto: [Nombre]. Stock: [Cantidad]"*) a las tarjetas de la lista de inventario.

## Consecuencias

### Positivas
- **Calidad de Producción**: La aplicación deja de parecer un prototipo al eliminar emojis y usar iconografía profesional.
- **Inclusión**: La app es ahora detectable y operable por lectores de pantalla, cumpliendo con estándares WCAG básicos.
- **Reducción de Errores en Campo**: Los operadores logísticos tendrán menos fallos al presionar botones críticos (Atrás, Sincronizar, Llamar) gracias a los targets táctiles expandidos.

### Negativas
- Ninguna identificada. Se mantiene la simplicidad del código mientras se añade valor funcional y de cumplimiento.
