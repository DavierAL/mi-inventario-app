-- ============================================================
-- Migration 006: Movimientos, App Versions, Audit Log
-- ============================================================


-- ─── MOVIMIENTOS ─────────────────────────────────────────────────────────────
-- Historial completo de cambios de stock. Append-only, nunca se modifica.

DO $$ BEGIN
  CREATE TYPE public.tipo_movimiento AS ENUM (
    'entrada_proveedor',  -- Stock entra de un proveedor
    'salida_pedido',      -- Stock sale por un pedido despachado
    'ajuste_positivo',    -- Ajuste manual que aumenta stock
    'ajuste_negativo',    -- Ajuste manual que disminuye stock
    'baja_vencimiento',   -- Producto dado de baja por vencimiento (precio → 0)
    'escaneo_fv',         -- Actualización de fecha de vencimiento (no afecta stock)
    'devolucion'          -- Producto devuelto por cliente, vuelve al stock
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.movimientos (
  id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  producto_id       text NOT NULL REFERENCES public.productos(id),
  tipo              public.tipo_movimiento NOT NULL,
  -- Referencias opcionales al origen del movimiento
  pedido_id         text REFERENCES public.pedidos(id),
  entrada_id        text REFERENCES public.entradas(id),
  -- Stock antes y después
  cantidad_antes    integer NOT NULL,
  cantidad_despues  integer NOT NULL,
  -- delta es calculado automáticamente
  delta             integer GENERATED ALWAYS AS (cantidad_despues - cantidad_antes) STORED,
  -- Quién y desde dónde
  operador_id       uuid REFERENCES public.usuarios(id),
  dispositivo       text,   -- modelo del teléfono (app móvil)
  -- Datos adicionales flexibles (FV anterior/nuevo, comentarios, etc.)
  metadata          jsonb NOT NULL DEFAULT '{}',
  -- Append-only: nunca se actualiza
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.movimientos IS 
  'Historial inmutable de todos los cambios de stock. Append-only — nunca se modifica un registro.';
COMMENT ON COLUMN public.movimientos.delta IS 
  'Columna calculada: cantidad_despues - cantidad_antes. Positivo = entrada, Negativo = salida.';
COMMENT ON COLUMN public.movimientos.metadata IS 
  'Datos extra según el tipo. Ej: {fv_anterior: "15/04/26", fv_nuevo: "20/06/26", comentario: "..."}';


-- ─── APP VERSIONS ────────────────────────────────────────────────────────────
-- Versiones de la app móvil para el sistema de actualización OTA

CREATE TABLE IF NOT EXISTS public.app_versions (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  version         text UNIQUE NOT NULL,   -- semver: "1.4.0"
  build_number    integer NOT NULL,
  plataforma      text NOT NULL DEFAULT 'android' CHECK (plataforma IN ('android', 'ios', 'all')),
  url_descarga    text NOT NULL,           -- URL del APK en GitHub Releases
  changelog       text,                   -- Qué hay de nuevo en esta versión
  force_update    boolean NOT NULL DEFAULT false,  -- true = la app no deja operar sin actualizar
  activa          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_versions IS 
  'Control de versiones de la app móvil. La app consulta este endpoint al arrancar para saber si hay actualización.';
COMMENT ON COLUMN public.app_versions.force_update IS 
  'Si true, la app muestra un modal bloqueante que no permite operar hasta actualizar.';
COMMENT ON COLUMN public.app_versions.activa IS 
  'Solo la versión activa más reciente se retorna al endpoint /api-versiones.';


-- ─── AUDIT LOG ───────────────────────────────────────────────────────────────
-- Registro de auditoría de acciones críticas. Append-only.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tabla             text NOT NULL,
  registro_id       text,
  accion            text NOT NULL CHECK (accion IN (
                      'INSERT', 'UPDATE', 'DELETE',
                      'WEBHOOK_RECEIVED', 'WEBHOOK_REJECTED',
                      'CRON_EJECUTADO', 'LOGIN', 'ESTADO_CAMBIADO'
                    )),
  datos_anteriores  jsonb,
  datos_nuevos      jsonb,
  usuario_id        uuid REFERENCES public.usuarios(id),
  ip                text,
  user_agent        text,
  -- Append-only: nunca se actualiza
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_log IS 
  'Registro de auditoría inmutable. Todos los cambios críticos quedan registrados aquí.';
