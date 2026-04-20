-- ============================================================
-- Migration 010: Realtime + Cron Schedules
-- ============================================================


-- ─── Habilitar Realtime en tablas críticas ────────────────────────────────────
-- El panel web y la app móvil reciben cambios en tiempo real

-- NOTA: También configurar en el Dashboard de Supabase:
-- Database → Replication → supabase_realtime publication → Add tables

ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.faltantes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.despachos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.despacho_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.productos;


-- ─── Cron Schedules ──────────────────────────────────────────────────────────
-- REQUISITO: pg_cron y pg_net deben estar habilitados en el Dashboard
-- Dashboard → Database → Extensions → pg_cron + pg_net → Enable
--
-- Reemplazar YOUR_PROJECT_REF con el reference ID de tu proyecto Supabase
-- Reemplazar YOUR_SERVICE_ROLE_KEY con tu service role key

-- ⚠️ EJECUTAR MANUALMENTE EN EL SQL EDITOR después de habilitar pg_cron y pg_net:

-- -- Verificar pagos online pendientes (YAPE, Plin, Tarjeta) cada 5 minutos
-- SELECT cron.schedule(
--   'mascotify-verificar-pagos',
--   '*/5 * * * *',
--   $$
--   SELECT net.http_post(
--     url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cron-verificar-pagos',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body    := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );
-- 
-- -- Marcar pedidos entregados como "completed" en WooCommerce cada 30 minutos
-- SELECT cron.schedule(
--   'mascotify-completar-pedidos',
--   '*/30 * * * *',
--   $$
--   SELECT net.http_post(
--     url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cron-completar-pedidos',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body    := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );

-- ─── Para verificar los crons activos ────────────────────────────────────────
-- SELECT * FROM cron.job;

-- ─── Para eliminar un cron ────────────────────────────────────────────────────
-- SELECT cron.unschedule('mascotify-verificar-pagos');
-- SELECT cron.unschedule('mascotify-completar-pedidos');
