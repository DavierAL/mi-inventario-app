-- ============================================================
-- Migration 007: Índices de rendimiento
-- Cubre los patrones de query más frecuentes del sistema
-- ============================================================


-- ─── USUARIOS ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios(rol) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);


-- ─── PRODUCTOS ───────────────────────────────────────────────────────────────
-- Búsqueda por scanner de código de barras (query más frecuente de la app móvil)
CREATE INDEX IF NOT EXISTS idx_productos_cod_barras ON public.productos(cod_barras);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON public.productos(sku);
CREATE INDEX IF NOT EXISTS idx_productos_marca ON public.productos(marca);
-- Solo indexa productos con FV definida (evita indexar NULLs innecesariamente)
CREATE INDEX IF NOT EXISTS idx_productos_fv ON public.productos(fv_actual_ts) 
  WHERE fv_actual_ts IS NOT NULL;
-- Para la pantalla de analytics: productos activos con stock
CREATE INDEX IF NOT EXISTS idx_productos_activos_stock ON public.productos(stock_master) 
  WHERE activo = true AND stock_master > 0;


-- ─── PEDIDOS ─────────────────────────────────────────────────────────────────
-- El query más común: pedidos de HOY por estado
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON public.pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_created ON public.pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_entrega ON public.pedidos(fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_pedidos_operador ON public.pedidos(operador_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_distrito ON public.pedidos(distrito);
-- Para el webhook: verificar si ya existe un pedido con ese woo_order_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_woo_order_id ON public.pedidos(woo_order_id);
-- Búsqueda por nombre de cliente (panel de atención al cliente)
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos 
  USING gin(to_tsvector('spanish', cliente_nombre || ' ' || COALESCE(cliente_apellido, '')));
-- Para crons: pedidos en estado revisar_pago pendientes de confirmación
CREATE INDEX IF NOT EXISTS idx_pedidos_revisar_pago ON public.pedidos(woo_order_id) 
  WHERE estado = 'revisar_pago';
-- Para facturación automática: pedidos listos para marcar completed en WooCommerce
CREATE INDEX IF NOT EXISTS idx_pedidos_completar ON public.pedidos(woo_order_id) 
  WHERE estado = 'entregado' AND woo_completed_at IS NULL;


-- ─── PEDIDO ITEMS ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON public.pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_producto ON public.pedido_items(producto_id);
-- Para verificar si todos los items de un pedido fueron procesados
CREATE INDEX IF NOT EXISTS idx_pedido_items_verificacion ON public.pedido_items(pedido_id, verificado);


-- ─── FALTANTES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_faltantes_pedido ON public.faltantes(pedido_id);
CREATE INDEX IF NOT EXISTS idx_faltantes_estado ON public.faltantes(estado) WHERE estado = 'pendiente';


-- ─── ENTRADAS ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_entradas_operador ON public.entradas(operador_id);
CREATE INDEX IF NOT EXISTS idx_entradas_fecha ON public.entradas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entrada_items_entrada ON public.entrada_items(entrada_id);
CREATE INDEX IF NOT EXISTS idx_entrada_items_producto ON public.entrada_items(producto_id);


-- ─── DESPACHOS ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_despachos_fecha ON public.despachos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_despachos_operador_logistico ON public.despachos(operador_logistico);
CREATE INDEX IF NOT EXISTS idx_despacho_items_despacho ON public.despacho_items(despacho_id);
CREATE INDEX IF NOT EXISTS idx_despacho_items_pedido ON public.despacho_items(pedido_id);
-- Para ControlSalida: items pendientes de escanear en un despacho
CREATE INDEX IF NOT EXISTS idx_despacho_items_pendientes ON public.despacho_items(despacho_id) 
  WHERE escaneado = false;


-- ─── MOVIMIENTOS ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON public.movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_pedido ON public.movimientos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON public.movimientos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON public.movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_operador ON public.movimientos(operador_id);


-- ─── AUDIT LOG ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_tabla ON public.audit_log(tabla);
CREATE INDEX IF NOT EXISTS idx_audit_registro ON public.audit_log(registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_fecha ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON public.audit_log(usuario_id);


-- ─── APP VERSIONS ────────────────────────────────────────────────────────────
-- La app consulta la versión activa más reciente
CREATE INDEX IF NOT EXISTS idx_app_versions_activa ON public.app_versions(created_at DESC) 
  WHERE activa = true;
