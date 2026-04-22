# 🧪 Guía de Pruebas de Roles - Mascotify

Esta guía detalla los escenarios de prueba para cada rol de usuario en la aplicación Mascotify. Utiliza estas pruebas para validar que la segmentación de funciones y la integridad de los datos sean correctas.

---

## 🔑 Credenciales Generales
**Contraseña para todos:** `TestPassword123!`

---

## 👤 1. ROL: Administrador (`admin@mascotify.app`)
**Objetivo:** Supervisión total y gestión de maestros.

### Escenarios de Prueba:
1. **Acceso Total:**
   - [ ] Iniciar sesión y verificar que el nombre "Mascotify" aparezca en la cabecera.
   - [ ] Navegar entre Almacén, Logística e Historial sin restricciones.
2. **Gestión de Inventario:**
   - [ ] Editar un producto (nombre, FV, stock) y verificar que se sincronice con Supabase.
   - [ ] Escanear un código de barras para buscar un producto existente.
3. **Auditoría de Logística:**
   - [ ] Ver todos los pedidos en el panel de Picking (Pendientes, En Tienda, Entregados).

---

## 👤 2. ROL: Logística (`logistica@mascotify.app`)
**Objetivo:** Ejecución de la cadena de entrega y captura de evidencia (POD).

### Escenarios de Prueba:
1. **Flujo de Picking:**
   - [ ] Seleccionar un pedido 'Pendiente' y marcarlo como 'Despachar a Logística'.
   - [ ] Verificar que el estado cambie a 'En Tienda' (Color Primario).
2. **Confirmación de Entrega (POD):**
   - [ ] Entrar al "Panel Tienda" de un pedido.
   - [ ] **Intento fallido:** Verificar que el botón "Confirmar Entrega" esté **gris y deshabilitado** si no hay foto.
   - [ ] **Éxito:** Tomar una foto de evidencia, verificar que el botón se habilite (Verde) y confirmar la entrega.
3. **Sincronización:**
   - [ ] Realizar una entrega en modo avión (Offline) y verificar que el sistema encole el trabajo para cuando vuelva la red.

---

## 👤 3. ROL: Almacén / Tienda (`almacen@mascotify.app` / `tienda@mascotify.app`)
**Objetivo:** Control de stock local y recepción de mercancía.

### Escenarios de Prueba:
1. **Validación de Fechas (FV):**
   - [ ] Buscar productos con la insignia roja (Vencidos).
   - [ ] Buscar productos con la insignia naranja (<90 días) y validar que muestre los días restantes.
2. **Actualización de Stock:**
   - [ ] Ajustar el stock de un producto tras una recepción física.
   - [ ] Verificar que el cambio se refleje en el Historial de movimientos.
3. **Escáner de Inventario:**
   - [ ] Usar el botón central de la barra inferior para realizar un conteo rápido escaneando bultos.

---

## 👤 4. ROL: Atención al Cliente (`atencion@mascotify.app`)
**Objetivo:** Consulta de disponibilidad y estados de pedido.

### Escenarios de Prueba:
1. **Consulta de Disponibilidad:**
   - [ ] Buscar un producto por nombre o SKU para responder a una duda de cliente.
   - [ ] Verificar el stock en tiempo real.
2. **Estado de Envío:**
   - [ ] Buscar un pedido por código en el panel de Logística para informar al cliente si ya fue entregado o sigue en camino.

---

## 🛡️ Pruebas de Integridad de Datos (Cross-Role)
- [ ] **Persistencia:** Cerrar la app y volver a entrar con otro rol; verificar que los datos locales (WatermelonDB) se mantengan consistentes.
- [ ] **Sync Realtime:** Realizar un cambio como `admin` y verificar que el usuario `logistica` vea la actualización tras pulsar el botón de Sincronizar (icono de flechas).

---

> [!IMPORTANT]
> **Nota sobre el Rol Tienda:** 
> Si el script SQL aún no ha sido ejecutado en el Dashboard de Supabase, el usuario `tienda@mascotify.app` funcionará temporalmente con permisos de `almacen`.
