-- ============================================================
-- Migration 001: Extensions
-- Habilita las extensiones necesarias para el sistema Mascotify
-- ============================================================

-- UUID generation para primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptography para validación HMAC de webhooks
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- pg_cron para tareas programadas (verificar pagos, completar pedidos)
-- NOTA: Activar manualmente en el Dashboard: Database → Extensions → pg_cron
-- CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- http para llamadas HTTP desde PostgreSQL (usado por pg_cron)
-- NOTA: Activar manualmente si se usa pg_cron
-- CREATE EXTENSION IF NOT EXISTS "http";
