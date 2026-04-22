# ADR 007: Migración de Logística a Supabase-Native y Limpieza de WooCommerce

## Estado
Aceptado

## Contexto
La aplicación dependía originalmente de una integración con WooCommerce para la gestión de pedidos y sincronización de envíos. Esta arquitectura presentaba varios problemas:
1. **Latencia y Complejidad:** El flujo de datos entre WooCommerce, Webhooks y Supabase añadía puntos de fallo y retrasos.
2. **Deuda Técnica:** Existían múltiples Edge Functions y tipos de datos específicos de WooCommerce que ya no se alineaban con la visión "Logistics-First" del proyecto.
3. **Falta de Fiabilidad en Campo:** Las actualizaciones de estado de envíos y la subida de evidencias (fotos) no eran resilientes a fallos de conexión en tiempo real.

## Decisión
Se ha decidido migrar el sistema de logística a una arquitectura **Supabase-Native** y eliminar completamente el acoplamiento con WooCommerce.

### Acciones Tomadas:
1. **Eliminación de Infraestructura Obsoleta:**
   - Remoción de Edge Functions de WooCommerce (`webhook-woocommerce`, `cron-*`).
   - Limpieza de tipos y utilidades en `_shared`.
   - Eliminación de configuraciones en `README`, `SECURITY`, CI y variables de entorno.

2. **Evolución del Esquema de Datos (WatermelonDB):**
   - Incremento a Versión 10.
   - Adición de campos `supabase_id` y `pod_url` en la tabla `envios` para permitir una sincronización bidireccional fiable sin depender de IDs generados por terceros.

3. **Nuevo Flujo de Persistencia de Envíos:**
   - **Direct-to-Supabase:** Las actualizaciones de estado ahora se realizan directamente sobre la tabla `envios` de Supabase mediante un nuevo `EnviosService`.
   - **Resiliencia Offline:** Se integró un nuevo tipo de trabajo en la cola persistente (`ESTADO_ENVIO`) que encapsula la subida de fotos y la actualización de estado, garantizando que el cambio llegue al servidor incluso tras periodos de desconexión.
   - **Notificación Desacoplada:** El reporte a Google Sheets se delegó a una Edge Function (`sync-logistica-sheets`) invocada tras la persistencia exitosa en Supabase, eliminando el bloqueo del hilo principal de la UI.

4. **Correcciones de Calidad y Estándares:**
   - Ajuste de componentes UI (`Badge`) para mejorar la testabilidad con React Testing Library.
   - Corrección de la jerarquía de hooks en `AnalyticsScreen` para cumplir con las reglas de React.

## Consecuencias

### Positivas:
- **Simplificación Arquitectónica:** Se reduce la superficie de ataque y los puntos de fallo al eliminar intermediarios.
- **Mayor Velocidad de Desarrollo:** Al estandarizar sobre Supabase, se eliminan las transformaciones de datos complejas (WooCommerce Meta fields).
- **UX Robusta:** Los repartidores pueden confirmar entregas sin preocuparse por la cobertura de red, sabiendo que el sistema de colas completará la tarea.

### Negativas/Riesgos:
- **Migración de Datos:** Se requiere asegurar que todos los clientes locales actualicen a la v10 del esquema para evitar colisiones.
- **Despliegue de Functions:** Dependencia de la nueva Edge Function `sync-logistica-sheets` para mantener la visibilidad administrativa en hojas de cálculo.

## Referencias
- Plan de Implementación de Abril 2026.
- Reglas de arquitectura Mascotify (WatermelonDB + Supabase).
