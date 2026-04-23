-- 
-- Mascotify Security Migration: RBAC & RLS
-- 

-- 1. Enable RLS on core tables
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.envios ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.usuarios;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.usuarios;
DROP POLICY IF EXISTS "Everyone authenticated can view products" ON public.productos;
DROP POLICY IF EXISTS "Write access for inventory roles" ON public.productos;
DROP POLICY IF EXISTS "Access for logistics and support roles" ON public.envios;
DROP POLICY IF EXISTS "Write access for logistics roles" ON public.envios;

-- 3. Usuarios Policies
-- Users can see their own profile
CREATE POLICY "Users can view their own profile" ON public.usuarios
FOR SELECT USING (auth.uid() = id);

-- Admins can do everything on profiles
CREATE POLICY "Admins can manage all profiles" ON public.usuarios
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- 4. Productos Policies
-- Any authenticated user can see products (needed for logistics/support to check info)
CREATE POLICY "Everyone authenticated can view products" ON public.productos
FOR SELECT USING (auth.role() = 'authenticated');

-- Only admin, almacen and tienda can modify products
CREATE POLICY "Write access for inventory roles" ON public.productos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND rol IN ('admin', 'almacen', 'tienda')
  )
);

-- 5. Envios Policies
-- Access for logistics roles and customer service
CREATE POLICY "Access for logistics and support roles" ON public.envios
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND rol IN ('admin', 'logistica', 'atencion')
  )
);

-- Only logistics operators and admins can update shipments
CREATE POLICY "Write access for logistics roles" ON public.envios
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND rol IN ('admin', 'logistica')
  )
);
