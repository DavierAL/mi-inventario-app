// supabase/functions/cron-verificar-pagos/index.ts
//
// Cron cada 5 minutos.
// Verifica pedidos en estado 'revisar_pago' consultando la API de WooCommerce.
// Reemplaza el Google Apps Script actualizaPagos() que corría como trigger.
//
// Lógica:
//   - Obtiene pedidos en estado 'revisar_pago' de las últimas 48h
//   - Consulta WooCommerce API en lote (batch)
//   - Si el pago fue confirmado → cambia a 'impresion_etiqueta'
//   - Si fue cancelado → cambia a 'anulado'
//   - Registra todo en audit_log

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  CORS_HEADERS,
  jsonResponse,
  errorResponse,
} from '../_shared/helpers.ts';
import type { WooOrder } from '../_shared/types.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

const WOO_URL    = Deno.env.get('WOO_STORE_URL') ?? '';
const WOO_CK     = Deno.env.get('WOO_CONSUMER_KEY') ?? '';
const WOO_CS     = Deno.env.get('WOO_CONSUMER_SECRET') ?? '';
const WOO_AUTH   = 'Basic ' + btoa(`${WOO_CK}:${WOO_CS}`);

// ─── Helper: llamar a la API de WooCommerce ───────────────────────────────────

async function wooFetch(endpoint: string): Promise<WooOrder[]> {
  const url = `${WOO_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Authorization': WOO_AUTH, 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`WooCommerce API error: ${res.status} — ${await res.text()}`);
  }

  return res.json();
}

// ─── Handler principal ────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const startTime = Date.now();
  console.log('[cron-verificar-pagos] Iniciando verificación de pagos pendientes...');

  try {
    // ─── 1. Obtener pedidos en revisar_pago de las últimas 48h ───────────
    const hace48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: pedidosPendientes, error: errorQuery } = await supabase
      .from('pedidos')
      .select('id, woo_order_id, metodo_pago_raw, metodo_pago_display, created_at')
      .eq('estado', 'revisar_pago')
      .gte('created_at', hace48h)
      .order('created_at', { ascending: true })
      .limit(50); // WooCommerce acepta hasta 100 en batch, usamos 50 por seguridad

    if (errorQuery) {
      throw new Error(`Error obteniendo pedidos: ${errorQuery.message}`);
    }

    if (!pedidosPendientes || pedidosPendientes.length === 0) {
      console.log('[cron-verificar-pagos] No hay pedidos pendientes de verificación.');
      return jsonResponse({ success: true, procesados: 0, message: 'No pending orders' });
    }

    console.log(`[cron-verificar-pagos] ${pedidosPendientes.length} pedidos a verificar.`);

    // ─── 2. Consultar WooCommerce en lote ────────────────────────────────
    const wooIds = pedidosPendientes.map((p) => p.woo_order_id).join(',');
    const ordenes = await wooFetch(`/orders?include=${wooIds}&per_page=50`);

    // Crear mapa para acceso rápido: woo_order_id → orden
    const ordenesMap = new Map<number, WooOrder>(
      ordenes.map((o) => [o.id, o])
    );

    // ─── 3. Procesar cada pedido ──────────────────────────────────────────
    const resultados = {
      confirmados: 0,
      anulados: 0,
      sin_cambio: 0,
      errores: 0,
    };

    const logsAcumulados = [];

    for (const pedido of pedidosPendientes) {
      const orden = ordenesMap.get(pedido.woo_order_id);

      if (!orden) {
        console.warn(`[cron-verificar-pagos] Pedido ${pedido.woo_order_id} no encontrado en WooCommerce.`);
        resultados.errores++;
        continue;
      }

      const estadoWoo = orden.status.toLowerCase();
      let nuevoEstado: string | null = null;
      let razon = '';

      // ─── Lógica de verificación por método de pago ─────────────────────
      
      // YAPE en línea → confirmado cuando estado es 'procesando-yape'
      if (
        pedido.metodo_pago_display === 'YAPE_ONLINE' &&
        estadoWoo === 'procesando-yape'
      ) {
        nuevoEstado = 'impresion_etiqueta';
        razon = 'Estado WooCommerce: procesando-yape';
      }

      // Plin en línea → confirmado con processing
      else if (
        pedido.metodo_pago_display === 'PLIN_ONLINE' &&
        estadoWoo === 'processing'
      ) {
        nuevoEstado = 'impresion_etiqueta';
        razon = 'Estado WooCommerce: processing (Plin confirmado)';
      }

      // Tarjeta → confirmado cuando processing + Culqi Cargo Creado
      else if (pedido.metodo_pago_display === 'TARJETA_ONLINE') {
        if (estadoWoo === 'processing') {
          const culqiMeta = orden.meta_data.find((m) => m.key === 'culqi_log');
          const culqiLog = culqiMeta ? JSON.stringify(culqiMeta.value) : '';
          if (culqiLog.includes('Culqi Cargo Creado')) {
            nuevoEstado = 'impresion_etiqueta';
            razon = 'Tarjeta: processing + Culqi Cargo Creado';
          }
        }
      }

      // Cualquier método → cancelado si WooCommerce lo canceló
      if (estadoWoo === 'cancelled' || estadoWoo === 'failed' || estadoWoo === 'refunded') {
        nuevoEstado = 'anulado';
        razon = `Cancelado en WooCommerce: ${estadoWoo}`;
      }

      // ─── Aplicar cambio de estado si corresponde ────────────────────────
      if (nuevoEstado) {
        const { error: errorUpdate } = await supabase
          .from('pedidos')
          .update({
            estado: nuevoEstado,
            woo_status: orden.status,
            ...(nuevoEstado === 'impresion_etiqueta' && { 
              total_woo: parseFloat(orden.total) 
            }),
          })
          .eq('id', pedido.id);

        if (errorUpdate) {
          console.error(`[cron-verificar-pagos] Error actualizando pedido ${pedido.id}:`, errorUpdate);
          resultados.errores++;
        } else {
          if (nuevoEstado === 'impresion_etiqueta') resultados.confirmados++;
          if (nuevoEstado === 'anulado') resultados.anulados++;

          logsAcumulados.push({
            tabla: 'pedidos',
            registro_id: pedido.id,
            accion: 'ESTADO_CAMBIADO',
            datos_anteriores: { estado: 'revisar_pago', woo_status: pedido.woo_order_id },
            datos_nuevos: { estado: nuevoEstado, razon, woo_status: orden.status },
          });

          console.log(
            `[cron-verificar-pagos] Pedido #${pedido.woo_order_id}: ` +
            `revisar_pago → ${nuevoEstado} (${razon})`
          );
        }
      } else {
        resultados.sin_cambio++;
      }
    }

    // ─── 4. Escribir logs en bloque ───────────────────────────────────────
    if (logsAcumulados.length > 0) {
      await supabase.from('audit_log').insert(logsAcumulados);
    }

    // ─── 5. Registrar ejecución del cron ──────────────────────────────────
    await supabase.from('audit_log').insert({
      tabla: 'cron',
      accion: 'CRON_EJECUTADO',
      datos_nuevos: {
        cron: 'verificar-pagos',
        duracion_ms: Date.now() - startTime,
        pedidos_verificados: pedidosPendientes.length,
        ...resultados,
      },
    });

    const resumen = `✅ Verificados: ${pedidosPendientes.length} | Confirmados: ${resultados.confirmados} | Anulados: ${resultados.anulados} | Sin cambio: ${resultados.sin_cambio} | Errores: ${resultados.errores}`;
    console.log(`[cron-verificar-pagos] ${resumen}`);

    return jsonResponse({ success: true, ...resultados, duracion_ms: Date.now() - startTime });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron-verificar-pagos] Error crítico:', msg);

    await supabase.from('audit_log').insert({
      tabla: 'cron',
      accion: 'CRON_EJECUTADO',
      datos_nuevos: { cron: 'verificar-pagos', error: msg, duracion_ms: Date.now() - startTime },
    });

    return errorResponse(msg, 500);
  }
});
