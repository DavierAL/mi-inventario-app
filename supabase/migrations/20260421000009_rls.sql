-- ============================================================
-- Migration 009: Row Level Security (RLS)
-- Control de acceso granular por rol para cada tabla
-- 
-- Roles: almacen | logistica | atencion | admin
-- La función get_user_rol() se creó en migration 002
-- ============================================================


-- ─── Habilitar RLS en todas las tablas ───────────────────────────────────────

ALTER TABLE public.usuarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faltantes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrada_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despachos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despacho_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_versions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log        ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- USUARIOS
-- ============================================================

-- Cada usuario ve su propio perfil; admin ve todos
CREATE POLICY "usuarios_select" ON public.usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_user_rol() = 'admin');

-- Solo admin puede crear usuarios
CREATE POLICY "usuarios_insert" ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() = 'admin');

-- Cada usuario puede actualizar su propio perfil; admin puede actualizar cualquiera
CREATE POLICY "usuarios_update" ON public.usuarios
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR get_user_rol() = 'admin')
  WITH CHECK (id = auth.uid() OR get_user_rol() = 'admin');

-- Solo admin puede desactivar usuarios (no delete, usamos activo=false)
CREATE POLICY "usuarios_delete" ON public.usuarios
  FOR DELETE TO authenticated
  USING (get_user_rol() = 'admin');


-- ============================================================
-- PRODUCTOS
-- ============================================================

-- Todos los roles autenticados pueden ver el catálogo
CREATE POLICY "productos_select" ON public.productos
  FOR SELECT TO authenticated
  USING (true);

-- Almacén y admin pueden agregar/actualizar productos
CREATE POLICY "productos_insert" ON public.productos
  FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() IN ('almacen', 'admin'));

CREATE POLICY "productos_update" ON public.productos
  FOR UPDATE TO authenticated
  USING (get_user_rol() IN ('almacen', 'admin'));

-- Solo admin puede eliminar productos (preferir activo=false)
CREATE POLICY "productos_delete" ON public.productos
  FOR DELETE TO authenticated
  USING (get_user_rol() = 'admin');


-- ============================================================
-- PEDIDOS
-- ============================================================

-- SELECT: cada rol ve lo que le corresponde
CREATE POLICY "pedidos_select" ON public.pedidos
  FOR SELECT TO authenticated
  USING (
    -- Admin y Atención al cliente ven todos
    get_user_rol() IN ('admin', 'atencion')
    -- Almacén ve sus propios pedidos O los pedidos pendientes disponibles para tomar
    OR (get_user_rol() = 'almacen' AND (
      operador_id = auth.uid() OR estado = 'pendiente'
    ))
    -- Logística ve pedidos desde verificado en adelante (listos para despacho)
    OR (get_user_rol() = 'logistica' AND estado IN (
      'verificado', 'impresion_etiqueta', 'listo_envio', 
      'en_ruta', 'entregado', 'reprogramado', 'devolucion_pendiente'
    ))
  );

-- INSERT: solo via Edge Function (service role) o admin
-- Los pedidos los crea el webhook, no los usuarios directamente
-- Usamos service role en la Edge Function que bypasea RLS
CREATE POLICY "pedidos_insert" ON public.pedidos
  FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() = 'admin');

-- UPDATE: cada rol puede modificar según su dominio
CREATE POLICY "pedidos_update" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (
    get_user_rol() = 'admin'
    -- Almacén: solo sus pedidos asignados
    OR (get_user_rol() = 'almacen' AND operador_id = auth.uid())
    -- Logística: pedidos en estados que le corresponden
    OR (get_user_rol() = 'logistica' AND estado IN (
      'verificado', 'impresion_etiqueta', 'listo_envio', 'en_ruta'
    ))
    -- Atención al cliente: puede agregar notas o marcar faltantes
    OR get_user_rol() = 'atencion'
  );


-- ============================================================
-- PEDIDO ITEMS
-- ============================================================

CREATE POLICY "pedido_items_select" ON public.pedido_items
  FOR SELECT TO authenticated
  USING (
    -- Verificar permiso en el pedido padre
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_items.pedido_id
      AND (
        get_user_rol() IN ('admin', 'atencion')
        OR (get_user_rol() = 'almacen' AND (p.operador_id = auth.uid() OR p.estado = 'pendiente'))
        OR (get_user_rol() = 'logistica' AND p.estado IN (
          'verificado', 'impresion_etiqueta', 'listo_envio', 'en_ruta', 
          'entregado', 'reprogramado', 'devolucion_pendiente'
        ))
      )
    )
  );

-- INSERT: solo admin (los items los crea la Edge Function con service role)
CREATE POLICY "pedido_items_insert" ON public.pedido_items
  FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() = 'admin');

-- UPDATE: almacén puede actualizar los items de sus pedidos
CREATE POLICY "pedido_items_update" ON public.pedido_items
  FOR UPDATE TO authenticated
  USING (
    get_user_rol() = 'admin'
    OR (
      get_user_rol() = 'almacen' AND
      EXISTS (
        SELECT 1 FROM public.pedidos p
        WHERE p.id = pedido_items.pedido_id
        AND p.operador_id = auth.uid()
      )
    )
  );


-- ============================================================
-- FALTANTES
-- ============================================================

CREATE POLICY "faltantes_select" ON public.faltantes
  FOR SELECT TO authenticated
  USING (get_user_rol() IN ('almacen', 'atencion', 'admin'));

CREATE POLICY "faltantes_insert" ON public.faltantes
  FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() IN ('almacen', 'atencion', 'admin'));

-- Atención al cliente resuelve los faltantes
CREATE POLICY "faltantes_update" ON public.faltantes
  FOR UPDATE TO authenticated
  USING (get_user_rol() IN ('atencion', 'admin'));


-- ============================================================
-- ENTRADAS
-- ============================================================

CREATE POLICY "entradas_select" ON public.entradas
  FOR SELECT TO authenticated
  USING (get_user_rol() IN ('almacen', 'admin'));

CREATE POLICY "entradas_insert" ON public.entradas
  FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() IN ('almacen', 'admin'));

-- Solo admin puede corregir entradas ya registradas
CREATE POLICY "entradas_update" ON public.entradas
  FOR UPDATE TO authenticated
  USING (get_user_rol() = 'admin');

CREATE POLICY "entrada_items_select" ON public.entrada_items
  FOR SELECT TO authenticated
  USING (
    get_user_rol() IN ('admin')
    OR (
      get_user_rol() = 'almacen' AND
      EXISTS (SELECT 1 FROM public.entradas e WHERE e.id = entrada_items.entrada_id)
    )
  );

CREATE POLICY "entrada_items_insert" ON public.entrada_items
  FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() IN ('almacen', 'admin'));

CREATE POLICY "entrada_items_update" ON public.entrada_items
  FOR UPDATE TO authenticated
  USING (get_user_rol() = 'admin');


-- ============================================================
-- DESPACHOS
-- ============================================================

CREATE POLICY "despachos_select" ON public.despachos
  FOR SELECT TO authenticated
  USING (get_user_rol() IN ('logistica', 'admin', 'atencion'));

CREATE POLICY "despachos_insert" ON public.despachos
  FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() IN ('logistica', 'admin'));

CREATE POLICY "despachos_update" ON public.despachos
  FOR UPDATE TO authenticated
  USING (get_user_rol() IN ('logistica', 'admin'));

CREATE POLICY "despacho_items_select" ON public.despacho_items
  FOR SELECT TO authenticated
  USING (get_user_rol() IN ('logistica', 'admin', 'atencion'));

CREATE POLICY "despacho_items_insert" ON public.despacho_items
  FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() IN ('logistica', 'admin'));

-- Logística actualiza el estado_final y si fue escaneado
CREATE POLICY "despacho_items_update" ON public.despacho_items
  FOR UPDATE TO authenticated
  USING (get_user_rol() IN ('logistica', 'admin'));


-- ============================================================
-- MOVIMIENTOS
-- ============================================================

-- Almacén ve sus propios movimientos; admin ve todos
CREATE POLICY "movimientos_select" ON public.movimientos
  FOR SELECT TO authenticated
  USING (
    get_user_rol() = 'admin'
    OR (get_user_rol() = 'almacen' AND operador_id = auth.uid())
    OR get_user_rol() = 'atencion'
  );

-- Movimientos se crean via triggers (SECURITY DEFINER) y service role
-- Desde la UI solo admin puede insertar manualmente (ajustes)
CREATE POLICY "movimientos_insert" ON public.movimientos
  FOR INSERT TO authenticated
  WITH CHECK (get_user_rol() = 'admin');

-- Los movimientos NUNCA se modifican (append-only)
-- No hay políticas UPDATE ni DELETE intencionalmente


-- ============================================================
-- APP VERSIONS
-- ============================================================

-- Anon también puede leer (la app consulta sin autenticar el endpoint de versión)
CREATE POLICY "app_versions_select_public" ON public.app_versions
  FOR SELECT TO anon, authenticated
  USING (activa = true);

-- Solo admin gestiona las versiones
CREATE POLICY "app_versions_manage" ON public.app_versions
  FOR ALL TO authenticated
  USING (get_user_rol() = 'admin')
  WITH CHECK (get_user_rol() = 'admin');


-- ============================================================
-- AUDIT LOG
-- ============================================================

-- Solo admin puede leer el audit log
CREATE POLICY "audit_select_admin" ON public.audit_log
  FOR SELECT TO authenticated
  USING (get_user_rol() = 'admin');

-- Los inserts vienen de triggers (SECURITY DEFINER) que bypasean RLS
-- También permitimos inserts desde authenticated para Edge Functions con JWT
CREATE POLICY "audit_insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);
