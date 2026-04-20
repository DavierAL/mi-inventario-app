-- ============================================================
-- Migration 004: Tabla pedidos
-- Órdenes de WooCommerce — reemplaza pestaña Envios de Google Sheets
-- ============================================================

-- ─── Tipos ENUM ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.estado_pedido AS ENUM (
    'pendiente',            -- Llegó el webhook, nadie lo ha tomado
    'en_proceso',           -- Un operador lo tomó y está escaneando items
    'con_faltante',         -- Todos los items escaneados, pero hay faltante de stock
    'verificado',           -- Todos los items escaneados correctamente
    'revisar_pago',         -- Pago online pendiente de confirmación (YAPE/Plin/Tarjeta)
    'impresion_etiqueta',   -- Pago confirmado, listo para imprimir etiqueta
    'listo_envio',          -- Etiqueta impresa, paquete sellado y listo
    'en_ruta',              -- Salva o Urbano lo recogió y está en camino
    'entregado',            -- Entrega confirmada al cliente
    'reprogramado',         -- Cliente no disponible, segundo intento pendiente
    'devolucion_pendiente', -- Paquete rechazado, esperando devolución al almacén
    'anulado'               -- Pedido cancelado
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.operador_logistico_tipo AS ENUM (
    'salva',        -- Salva Logística — Lima Metropolitana
    'urbano_olva',  -- Urbano/Olva — Provincias
    'otro'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── Tabla principal ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pedidos (
  id                      text PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- ─── WooCommerce ───────────────────────────────────────────────────────
  woo_order_id            integer UNIQUE NOT NULL,
  woo_order_key           text,
  woo_status              text,               -- estado crudo de WooCommerce para auditoría
  woo_created_at          timestamptz,        -- fecha de creación en WooCommerce
  woo_completed_at        timestamptz,        -- cuando se marcó 'completed' en WooCommerce

  -- ─── Canal ─────────────────────────────────────────────────────────────
  canal                   text NOT NULL DEFAULT 'woocommerce',

  -- ─── Cliente ───────────────────────────────────────────────────────────
  cliente_nombre          text NOT NULL,
  cliente_apellido        text,
  cliente_email           text,
  cliente_telefono        text,

  -- ─── Dirección de entrega ──────────────────────────────────────────────
  direccion               text,
  distrito                text,
  referencia              text,
  gmaps_url               text,

  -- ─── Documento ─────────────────────────────────────────────────────────
  tipo_documento          text CHECK (tipo_documento IN ('DNI', 'RUC', NULL)),
  numero_documento        text,

  -- ─── Pago ──────────────────────────────────────────────────────────────
  -- metodo_pago_raw: valor original de WooCommerce ("Contra entrega TARJETA - YAPE - PLIN")
  -- metodo_pago_display: valor simplificado para mostrar en UI ("POS YAPE PLIN")
  metodo_pago_raw         text,
  metodo_pago_display     text,
  total_woo               numeric(10,2),

  -- ─── Logística ─────────────────────────────────────────────────────────
  fecha_entrega           date,
  bultos                  integer NOT NULL DEFAULT 1 CHECK (bultos > 0),
  tamanio                 text CHECK (tamanio IN ('muy_pequeño', 'pequeño', 'mediano', 'grande', NULL)),
  operador_logistico      public.operador_logistico_tipo DEFAULT 'salva',
  tracking_interno        text,               -- código generado por Mascotify para ControlSalida

  -- ─── Estado operacional ────────────────────────────────────────────────
  estado                  public.estado_pedido NOT NULL DEFAULT 'pendiente',
  operador_id             uuid REFERENCES public.usuarios(id),
  tiene_discrepancia      boolean NOT NULL DEFAULT false,
  tiene_faltante          boolean NOT NULL DEFAULT false,

  -- ─── Financiero post-entrega ───────────────────────────────────────────
  recaudado               numeric(10,2),      -- lo que cobró el repartidor (contra entrega)
  costo_envio             numeric(10,2),

  -- ─── Metadata ──────────────────────────────────────────────────────────
  notas                   text,

  -- ─── Timestamps ────────────────────────────────────────────────────────
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ─── Comentarios ─────────────────────────────────────────────────────────────

COMMENT ON TABLE public.pedidos IS 
  'Órdenes de venta. Reemplaza la pestaña Envios de Google Sheets. Fuente de verdad única para todos los módulos.';

COMMENT ON COLUMN public.pedidos.estado IS 
  'Estado operacional del pedido. La transición de estados está controlada por triggers y RLS.';

COMMENT ON COLUMN public.pedidos.operador_id IS 
  'El operador que tomó el pedido. La asignación es atómica (SELECT FOR UPDATE) para evitar duplicados.';

COMMENT ON COLUMN public.pedidos.woo_status IS 
  'Estado crudo de WooCommerce: processing, procesando-yape, completed, cancelled, etc.';

COMMENT ON COLUMN public.pedidos.metodo_pago_display IS 
  'Valores posibles: POS YAPE PLIN | EFECTIVO | TARJETA_ONLINE | YAPE_ONLINE | PLIN_ONLINE | REVISAR';

COMMENT ON COLUMN public.pedidos.tracking_interno IS 
  'Código numérico generado por Mascotify para ControlSalida. Ej: 4612919738911. Distinto al tracking de Salva.';
