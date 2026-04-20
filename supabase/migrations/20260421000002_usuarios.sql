-- ============================================================
-- Migration 002: Tabla usuarios
-- Extiende auth.users de Supabase con datos del negocio
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usuarios (
  -- Mismo ID que auth.users — se crea automáticamente al registrarse
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        text NOT NULL,
  email         text NOT NULL,
  rol           text NOT NULL CHECK (rol IN ('almacen', 'logistica', 'atencion', 'admin')),
  activo        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Comentarios descriptivos
COMMENT ON TABLE public.usuarios IS 'Usuarios internos del sistema Mascotify';
COMMENT ON COLUMN public.usuarios.rol IS 'almacen | logistica | atencion | admin';
COMMENT ON COLUMN public.usuarios.activo IS 'false = cuenta deshabilitada, no puede hacer login operacional';

-- ─── Función helper: obtener rol del usuario autenticado ──────────────────────
-- SECURITY DEFINER: se ejecuta con permisos del owner, no del caller
-- Usada en todas las políticas RLS para evitar queries recursivos
CREATE OR REPLACE FUNCTION public.get_user_rol()
RETURNS text AS $$
  SELECT rol 
  FROM public.usuarios 
  WHERE id = auth.uid() AND activo = true
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_rol IS 
  'Retorna el rol del usuario autenticado. Usado en políticas RLS.';
