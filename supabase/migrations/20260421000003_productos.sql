-- ============================================================
-- Migration 003: Tabla productos
-- Catálogo maestro SKU — reemplaza la pestaña SKU de Google Sheets
-- ============================================================

CREATE TABLE IF NOT EXISTS public.productos (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  -- Identificadores
  cod_barras      text UNIQUE NOT NULL,
  sku             text UNIQUE NOT NULL,
  -- Descripción
  descripcion     text NOT NULL,
  marca           text NOT NULL,
  -- Precios
  precio_web      numeric(10,2) NOT NULL DEFAULT 0 CHECK (precio_web >= 0),
  precio_tienda   numeric(10,2) NOT NULL DEFAULT 0 CHECK (precio_tienda >= 0),
  -- Stock
  stock_master    integer NOT NULL DEFAULT 0,
  -- Fecha de vencimiento (Unix timestamp ms — compatible con WatermelonDB)
  fv_actual_ts    bigint,
  -- Metadata
  imagen          text,
  activo          boolean NOT NULL DEFAULT true,
  comentarios     text,
  fecha_edicion   text,
  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.productos IS 'Catálogo maestro de productos. Reemplaza pestaña SKU de Google Sheets.';
COMMENT ON COLUMN public.productos.cod_barras IS 'Código de barras EAN-13/EAN-8/Code128 — el que escanea la app móvil';
COMMENT ON COLUMN public.productos.sku IS 'SKU interno de Mascotify (ej: CNT007OMG60U)';
COMMENT ON COLUMN public.productos.fv_actual_ts IS 'Fecha de vencimiento como Unix timestamp en milisegundos. NULL = sin fecha de vencimiento.';
COMMENT ON COLUMN public.productos.precio_web IS 'Precio en WooCommerce — referencia para verificación de pedidos';
COMMENT ON COLUMN public.productos.precio_tienda IS 'Precio en tienda física / referencia interna';
COMMENT ON COLUMN public.productos.activo IS 'false = producto dado de baja. precio_web y precio_tienda se ponen en 0 antes de desactivar.';
