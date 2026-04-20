// supabase/functions/cron-completar-pedidos/index.ts
//
// Cron cada 30 minutos.
// Marca como 'completed' en WooCommerce los pedidos que ya fueron entregados.
// Reemplaza el Google Apps Script facturacionAutomatica().

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS_HEADERS, jsonResponse, errorResponse } from '../_shared/helpers.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

const WOO_URL  = Deno.env.get('WOO_STORE_URL') ?? '';
const WOO_CK   = Deno.env.get('WOO_CONSUMER_KEY') ?? '';
const WOO_CS   = Deno.env.get('WOO_CONSUMER_SECRET') ?? '';
const WOO_AUTH = 'Basic ' + btoa(`${WOO_CK}:${WOO_CS}`);

// ─── Batch update en WooCommerce (igual que el script original) ───────────────

async function completarPedidosEnWoo(wooIds: number[]): Promise<void> {
  const updates = wooIds.map((id) => ({ id, status: 'completed' }));

  const res = await fetch(`${WOO_URL}/orders/batch`, {
    method: 'POST',
    headers: {
      'Authorization': WOO_AUTH,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ update: updates }),
  });

  if (!res.ok) {
    throw new Error(`WooCommerce batch error: ${res.status} — ${await res.text()}`);
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const startTime = Date.now();
  console.log('[cron-completar-pedidos] Iniciando...');

  try {
    // Pedidos entregados que aún no fueron marcados como completed en WooCommerce
    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select('id, woo_order_id')
      .eq('estado', 'entregado')
      .is('woo_completed_at', null)
      .limit(50); // WooCommerce batch acepta hasta 100

    if (error) throw new Error(error.message);

    if (!pedidos || pedidos.length === 0) {
      console.log('[cron-completar-pedidos] No hay pedidos pendientes de completar.');
      return jsonResponse({ success: true, completados: 0 });
    }

    console.log(`[cron-completar-pedidos] ${pedidos.length} pedidos a completar en WooCommerce.`);

    const wooIds = pedidos.map((p) => p.woo_order_id);
    const ids    = pedidos.map((p) => p.id);

    // ─── Marcar como completed en WooCommerce ─────────────────────────────
    await completarPedidosEnWoo(wooIds);

    // ─── Actualizar woo_completed_at en nuestra BD ────────────────────────
    await supabase
      .from('pedidos')
      .update({ woo_completed_at: new Date().toISOString() })
      .in('id', ids);

    // ─── Audit log ────────────────────────────────────────────────────────
    await supabase.from('audit_log').insert({
      tabla: 'cron',
      accion: 'CRON_EJECUTADO',
      datos_nuevos: {
        cron: 'completar-pedidos',
        completados: pedidos.length,
        woo_ids: wooIds,
        duracion_ms: Date.now() - startTime,
      },
    });

    console.log(`[cron-completar-pedidos] ✅ ${pedidos.length} pedidos marcados como completed en WooCommerce.`);

    return jsonResponse({ success: true, completados: pedidos.length, duracion_ms: Date.now() - startTime });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron-completar-pedidos] Error:', msg);
    return errorResponse(msg, 500);
  }
});
