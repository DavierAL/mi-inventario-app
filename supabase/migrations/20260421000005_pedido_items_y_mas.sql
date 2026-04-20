-- ============================================================
-- Migration 005: Pedido items, Faltantes, Entradas, Despachos
-- ============================================================


-- ─── PEDIDO ITEMS ────────────────────────────────────────────────────────────
-- Un registro por cada producto en el pedido de WooCommerce

CREATE TABLE IF NOT EXISTS public.pedido_items (
  id                      text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pedido_id               text NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  -- producto_id puede ser NULL si el SKU de WooCommerce no matchea con nuestro catálogo
  producto_id             text REFERENCES public.productos(id),

  -- ─── Datos de WooCommerce ─────────────────────────────────────────────
  descripcion_woo         text NOT NULL,      -- nombre del producto en el pedido
  sku_woo                 text,               -- SKU según WooCommerce
  woo_line_item_id        integer,            -- ID del line item en WooCommerce
  cantidad_pedida         integer NOT NULL CHECK (cantidad_pedida > 0),
  precio_unitario_woo     numeric(10,2) NOT NULL CHECK (precio_unitario_woo >= 0),

  -- ─── Datos del operador de almacén ───────────────────────────────────
  cantidad_descargada     integer DEFAULT 0 CHECK (cantidad_descargada >= 0),
  codigo_escaneado        text,               -- el barcode que leyó el scanner físicamente

  -- ─── Verificación automática ─────────────────────────────────────────
  verificado              boolean NOT NULL DEFAULT false,
  discrepancia_cant       boolean NOT NULL DEFAULT false, -- cantidad_pedida != cantidad_descargada
  producto_vencido        boolean NOT NULL DEFAULT false, -- producto con precio=0 (dado de baja)
  falta_stock             boolean NOT NULL DEFAULT false, -- no hay unidades disponibles

  created_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pedido_items IS 
  'Items individuales de cada pedido. Un registro por producto en el pedido de WooCommerce.';
COMMENT ON COLUMN public.pedido_items.producto_id IS 
  'NULL si el SKU de WooCommerce no existe en nuestro catálogo — requiere revisión manual.';
COMMENT ON COLUMN public.pedido_items.producto_vencido IS 
  'true cuando el operador escanea un producto que está dado de baja (precio=0). Genera discrepancia automática.';


-- ─── FALTANTES ───────────────────────────────────────────────────────────────
-- Productos que faltan en stock para completar un pedido

DO $$ BEGIN
  CREATE TYPE public.estado_faltante AS ENUM (
    'pendiente',    -- Atención al cliente no lo ha atendido aún
    'resuelto',     -- Se resolvió (reemplazo, cancelación parcial, etc.)
    'anulado'       -- Se anuló el pedido completo
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.faltantes (
  id                      text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pedido_id               text NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  producto_id             text REFERENCES public.productos(id),
  descripcion_producto    text NOT NULL,      -- guardamos la descripción por si el producto se elimina
  cantidad_faltante       integer NOT NULL CHECK (cantidad_faltante > 0),
  estado                  public.estado_faltante NOT NULL DEFAULT 'pendiente',
  resolucion              text,               -- descripción de cómo se resolvió
  atendido_por            uuid REFERENCES public.usuarios(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  resuelto_at             timestamptz
);

COMMENT ON TABLE public.faltantes IS 
  'Faltantes de stock detectados al verificar un pedido. Atención al cliente notifica al cliente.';


-- ─── ENTRADAS ────────────────────────────────────────────────────────────────
-- Mercadería que entra de proveedores — reemplaza pestaña ENTRADAS de Google Sheets

CREATE TABLE IF NOT EXISTS public.entradas (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proveedor       text NOT NULL,
  operador_id     uuid NOT NULL REFERENCES public.usuarios(id),
  notas           text,
  total_costo     numeric(10,2),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.entrada_items (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entrada_id      text NOT NULL REFERENCES public.entradas(id) ON DELETE CASCADE,
  producto_id     text NOT NULL REFERENCES public.productos(id),
  cantidad        integer NOT NULL CHECK (cantidad > 0),
  precio_costo    numeric(10,2) CHECK (precio_costo >= 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.entradas IS 
  'Registro de mercadería ingresada de proveedores. Reemplaza pestaña ENTRADAS de Google Sheets.';


-- ─── DESPACHOS ───────────────────────────────────────────────────────────────
-- Lotes de entrega diarios — reemplaza ControlSalida + Constancia2 de Google Sheets

CREATE TABLE IF NOT EXISTS public.despachos (
  id                      text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fecha                   date NOT NULL DEFAULT CURRENT_DATE,
  operador_id             uuid REFERENCES public.usuarios(id),
  operador_logistico      public.operador_logistico_tipo NOT NULL DEFAULT 'salva',
  total_programado        integer NOT NULL DEFAULT 0,
  total_escaneado         integer NOT NULL DEFAULT 0,
  constancia_url          text,               -- URL del PDF en Supabase Storage
  enviado_email           boolean NOT NULL DEFAULT false,
  completado              boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.despacho_items (
  id                      text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  despacho_id             text NOT NULL REFERENCES public.despachos(id) ON DELETE CASCADE,
  pedido_id               text NOT NULL REFERENCES public.pedidos(id),
  tracking_interno        text,               -- mismo valor que pedidos.tracking_interno
  escaneado               boolean NOT NULL DEFAULT false,
  estado_final            text CHECK (estado_final IN (
                            'entregado', 'reprogramado', 'devolucion_pendiente', NULL
                          )),
  escaneado_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE(despacho_id, pedido_id)
);

COMMENT ON TABLE public.despachos IS 
  'Lotes de despacho diarios. Reemplaza ControlSalida y Constancia2 de Google Sheets.';
COMMENT ON COLUMN public.despachos.total_escaneado IS 
  'Se actualiza automáticamente vía trigger cuando un despacho_item se marca como escaneado.';
