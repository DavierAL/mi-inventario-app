# ADR 011: Implementación de Trazabilidad y Auditoría en Logística

## Estado
Aceptado

## Contexto
Con la migración del sistema de logística a una arquitectura "Supabase-Native", surgió la necesidad de tener una visibilidad clara sobre cuándo y quién realiza cambios en el estado de los pedidos. 
Anteriormente, solo se persistía el último estado en la tabla `envios`, perdiendo el registro de la evolución del pedido (ej: cuándo pasó de "Pendiente" a "Listo para envío"). 
Además, se requería una interfaz de usuario que permitiera a los operadores consultar estos movimientos de forma rápida y con soporte offline.

## Decisión
Se ha decidido implementar un sistema de auditoría local-first para el módulo de logística.

### Acciones Tomadas:

1. **Evolución del Esquema (WatermelonDB v12):**
   - Se creó la tabla `logistica_historial` con las columnas: `envio_id`, `cod_pedido`, `estado_anterior`, `estado_nuevo`, `timestamp` y `operador`.
   - Se incrementó la versión del esquema para forzar la migración en los dispositivos.

2. **Modelo y Repositorio de Auditoría:**
   - Se implementó `LogisticaHistorial` como modelo reactivo.
   - Se creó `LogisticaHistorialRepository` centralizando la lógica de inserción para evitar duplicidad de código.

3. **Hooks de Negocio:**
   - Se actualizaron los puntos críticos de cambio de estado (`LogisticsRepository` y `StorePanelScreen`) para insertar automáticamente una entrada en el historial antes de confirmar el cambio en la tabla principal.
   - Se creó el hook `useLogisticaHistorial` para observar la base de datos y actualizar la UI en tiempo real.

4. **Navegación Contextual:**
   - Se modificó la lógica de la `BottomBar` para que el botón "Historial" detecte el contexto de navegación. Si el usuario está en el flujo de logística, se muestra el historial de logística; si está en inventario, se muestra el de productos.

5. **UI/UX (Notion Design System):**
   - Se diseñó la pantalla `LogisticsHistoryScreen` siguiendo la estética premium del proyecto (timeline, superficies elevadas, badges de colores).
   - Uso de `FlashList` (via `FastList` alias) para garantizar 60fps en listas largas de auditoría.

## Consecuencias

### Positivas:
- **Trazabilidad Total:** Ahora es posible saber exactamente cuánto tiempo pasa un pedido en cada estado.
- **Resiliencia Offline:** El historial se registra localmente de forma transaccional, garantizando que no se pierdan datos incluso sin conexión.
- **Mejor UX:** Los operadores tienen feedback visual inmediato de sus acciones recientes.

### Negativas/Riesgos:
- **Crecimiento de la DB:** El historial genera más registros que el inventario base. Se deberá monitorear el tamaño de la base de datos local a largo plazo.

## Referencias
- Reglas Mascotify (`SKILL.md`).
- ADR 010: Estandarización de Estados.
