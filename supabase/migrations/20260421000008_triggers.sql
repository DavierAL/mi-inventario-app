-- ============================================================
-- Migration 008: Triggers
-- Automatizaciones a nivel de base de datos
-- ============================================================


-- ─── 1. updated_at automático ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_usuarios ON public.usuarios;
CREATE TRIGGER set_updated_at_usuarios
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_productos ON public.productos;
CREATE TRIGGER set_updated_at_productos
  BEFORE UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_pedidos ON public.pedidos;
CREATE TRIGGER set_updated_at_pedidos
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_despachos ON public.despachos;
CREATE TRIGGER set_updated_at_despachos
  BEFORE UPDATE ON public.despachos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ─── 2. Auditoría automática de cambios de estado en pedidos ─────────────────

CREATE OR REPLACE FUNCTION public.audit_pedido_estado()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registra si el estado cambió
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.audit_log (
      tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id
    ) VALUES (
      'pedidos',
      NEW.id,
      'ESTADO_CAMBIADO',
      jsonb_build_object(
        'estado', OLD.estado,
        'operador_id', OLD.operador_id
      ),
      jsonb_build_object(
        'estado', NEW.estado,
        'operador_id', NEW.operador_id
      ),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_pedido_estado_trigger ON public.pedidos;
CREATE TRIGGER audit_pedido_estado_trigger
  AFTER UPDATE OF estado ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.audit_pedido_estado();


-- ─── 3. Auto-actualizar estado del pedido cuando todos los items son verificados

CREATE OR REPLACE FUNCTION public.sync_estado_pedido_por_items()
RETURNS TRIGGER AS $$
DECLARE
  v_total_items     integer;
  v_items_verificados integer;
  v_tiene_faltante  boolean;
  v_estado_actual   public.estado_pedido;
BEGIN
  -- Obtener estadísticas de los items del pedido
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE verificado = true),
    BOOL_OR(falta_stock) AS hay_faltante
  INTO v_total_items, v_items_verificados, v_tiene_faltante
  FROM public.pedido_items
  WHERE pedido_id = NEW.pedido_id;

  -- Obtener estado actual del pedido
  SELECT estado INTO v_estado_actual
  FROM public.pedidos
  WHERE id = NEW.pedido_id;

  -- Solo actuar si el pedido está en proceso y todos los items fueron verificados
  IF v_estado_actual = 'en_proceso' 
     AND v_total_items > 0 
     AND v_items_verificados = v_total_items 
  THEN
    IF v_tiene_faltante THEN
      UPDATE public.pedidos
      SET estado = 'con_faltante', tiene_faltante = true
      WHERE id = NEW.pedido_id;
    ELSE
      UPDATE public.pedidos
      SET estado = 'verificado'
      WHERE id = NEW.pedido_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_estado_pedido_trigger ON public.pedido_items;
CREATE TRIGGER sync_estado_pedido_trigger
  AFTER UPDATE OF verificado, falta_stock ON public.pedido_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_estado_pedido_por_items();


-- ─── 4. Sincronizar stock del producto cuando se inserta un movimiento ────────

CREATE OR REPLACE FUNCTION public.sync_stock_desde_movimiento()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualiza el stock_master del producto con el valor final del movimiento
  UPDATE public.productos
  SET stock_master = NEW.cantidad_despues
  WHERE id = NEW.producto_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_stock_trigger ON public.movimientos;
CREATE TRIGGER sync_stock_trigger
  AFTER INSERT ON public.movimientos
  FOR EACH ROW 
  -- Solo para movimientos que afectan stock (no escaneo_fv)
  WHEN (NEW.tipo <> 'escaneo_fv')
  EXECUTE FUNCTION public.sync_stock_desde_movimiento();


-- ─── 5. Actualizar contador de despacho cuando se escanea un item ────────────

CREATE OR REPLACE FUNCTION public.sync_contador_despacho()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando un item se marca como escaneado, incrementar el contador del despacho
  IF NEW.escaneado = true AND (OLD.escaneado = false OR OLD.escaneado IS NULL) THEN
    UPDATE public.despachos
    SET total_escaneado = total_escaneado + 1
    WHERE id = NEW.despacho_id;
  END IF;

  -- Si se desmarca (caso de corrección), decrementar
  IF NEW.escaneado = false AND OLD.escaneado = true THEN
    UPDATE public.despachos
    SET total_escaneado = GREATEST(0, total_escaneado - 1)
    WHERE id = NEW.despacho_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_contador_despacho_trigger ON public.despacho_items;
CREATE TRIGGER sync_contador_despacho_trigger
  AFTER UPDATE OF escaneado ON public.despacho_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_contador_despacho();


-- ─── 6. Generar tracking_interno automático para nuevos pedidos ──────────────
-- Replica el formato numérico que usa Mascotify actualmente (ej: 4612919738911)

CREATE OR REPLACE FUNCTION public.generar_tracking_interno()
RETURNS TRIGGER AS $$
DECLARE
  v_tracking text;
BEGIN
  -- Genera un número de 13 dígitos único usando timestamp + random
  -- Formato similar al actual: 4612919XXXXXXX
  v_tracking := '4612919' || LPAD(
    (EXTRACT(EPOCH FROM now())::bigint % 1000000)::text || 
    (FLOOR(RANDOM() * 100))::text,
    6, '0'
  );
  NEW.tracking_interno = v_tracking;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generar_tracking_trigger ON public.pedidos;
CREATE TRIGGER generar_tracking_trigger
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW
  WHEN (NEW.tracking_interno IS NULL)
  EXECUTE FUNCTION public.generar_tracking_interno();


-- ─── 7. Crear usuario en public.usuarios cuando se registra en auth ──────────
-- Facilita el onboarding: el admin solo necesita asignar el rol

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar con rol 'almacen' por defecto y activo=false hasta que el admin lo active
  INSERT INTO public.usuarios (id, nombre, email, rol, activo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    'almacen',    -- rol por defecto
    false         -- inactivo hasta que admin lo active y asigne rol correcto
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
