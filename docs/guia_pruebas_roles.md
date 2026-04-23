# 🧪 Guía de Pruebas de Roles y Seguridad - Mascotify (Post-Upgrade)

Esta guía detalla los escenarios de prueba para validar el sistema de seguridad multi-capa (RLS + Navigation Guards) implementado en la aplicación.

---

## 🔑 Credenciales de Prueba
*Contraseña para todos:* `TestPassword123!`

1. **Administrador:** `admin@mascotify.app`
2. **Logística:** `logistica@mascotify.app`
3. **Almacén:** `almacen@mascotify.app`
4. **Atención al Cliente:** `atencion@mascotify.app`

---

## 👤 Escenario 1: ROL Logística (Operador de Ruta)
*Objetivo:* Validar que solo vea su área de trabajo y pueda operar.

1. **Visibilidad de UI:**
   - [ ] Al entrar, las únicas pestañas visibles en la barra inferior deben ser: **Logística** e **Historial**.
   - [ ] La pestaña de **Almacén** y **Análisis** deben estar ocultas.
2. **Restricción de Navegación:**
   - [ ] Intentar navegar (si fuera posible) al Almacén no debería funcionar.
3. **Acciones Autorizadas:**
   - [ ] En el panel de Picking, el botón "Despachar a Logística" debe estar visible y funcional.
   - [ ] Debe poder tomar fotos de evidencia (POD) y confirmar entregas.

---

## 👤 Escenario 2: ROL Atención al Cliente (Soporte)
*Objetivo:* Validar el modo "Solo Lectura" en áreas críticas.

1. **Visibilidad de UI:**
   - [ ] Pestañas visibles: **Almacén**, **Logística** y **Análisis**.
   - [ ] La pestaña de **Historial** debe estar oculta.
2. **Restricción de Acciones (Critical):**
   - [ ] **Almacén:** Al pulsar sobre un producto, **NO** debe abrirse el modal de edición (está deshabilitado).
   - [ ] **Logística:** En el panel de Picking, los botones de "Despachar" deben estar **ocultos**, permitiendo solo buscar y ver estados.
3. **Validación de Datos:**
   - [ ] Verificar que pueda ver el stock actual y el estado de los pedidos de logística.

---

## 👤 Escenario 3: ROL Almacén / Tienda (Control de Stock)
*Objetivo:* Validar gestión de inventario sin acceso a rutas.

1. **Visibilidad de UI:**
   - [ ] Pestañas visibles: **Almacén**, **Escáner** e **Historial**.
   - [ ] La pestaña de **Logística** y **Análisis** deben estar ocultas.
2. **Acciones de Inventario:**
   - [ ] Al pulsar un producto, debe abrirse el modal de edición para ajustar fechas y stock.
   - [ ] Verificar que los cambios se guarden localmente y se marquen para sincronización.

---

## 🛡️ Pruebas de Seguridad en Base de Datos (Backend)
*Estas pruebas verifican que incluso si se vulnera la App, Supabase protege los datos.*

1. **Acceso no autorizado a Usuarios:**
   - [ ] Verificar que el usuario `logistica` no pueda hacer un `select * from usuarios` (solo debe ver su propio perfil).
2. **Escritura prohibida en Envios:**
   - [ ] Intentar actualizar un pedido de logística con el usuario `almacen` (debe retornar Error 403 / Policy Violation).
3. **Escritura prohibida en Productos:**
   - [ ] Intentar editar un producto con el usuario `atencion` (debe retornar Error 403).

---

> [!IMPORTANT]
> **Nota de Sincronización:** 
> Tras cambiar de usuario en el mismo dispositivo físico, se recomienda realizar una sincronización manual (icono de flechas en cabecera) para asegurar que la vista local de WatermelonDB se actualice según los nuevos permisos del RLS.