// supabase/functions/migrate-orders/index.ts
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  determinarEstadoYPago,
  getMetaValue,
  extraerGmapsUrl,
  parsearFechaEntrega,
  determinarOperadorLogistico,
  CORS_HEADERS,
  jsonResponse,
  errorResponse,
} from '../_shared/helpers.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const { page = 1, per_page = 20, after = '2025-04-20T00:00:00Z' } = await req.json().catch(() => ({}));

    const wooUrl = Deno.env.get('WOO_URL');
    const ck = Deno.env.get('WOO_CONSUMER_KEY');
    const cs = Deno.env.get('WOO_CONSUMER_SECRET');
    const auth = btoa(`${ck}:${cs}`);

    console.log(`[migracion] Consultando página ${page} (per_page: ${per_page})...`);
    
    const response = await fetch(
      `${wooUrl}/wp-json/wc/v3/orders?after=${after}&per_page=${per_page}&page=${page}&order=asc`,
      { headers: { 'Authorization': `Basic ${auth}` } }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Error WC API (${response.status}): ${errBody}`);
    }

    const orders = await response.json();
    if (orders.length === 0) {
      return jsonResponse({
        success: true,
        message: 'No hay más pedidos para migrar.',
        totalMigrados: 0,
        hasMore: false
      });
    }

    // 1. Verificar existencia
    const idsBatch = orders.map((o: any) => o.id);
    const { data: existentes } = await supabase
      .from('pedidos')
      .select('woo_order_id')
      .in('woo_order_id', idsBatch);

    const idsExistentes = new Set(existentes?.map(e => e.woo_order_id) || []);
    
    const pedidosToInsert = [];
    const itemsByWooId: Record<number, any[]> = {};

    for (const order of orders) {
      if (idsExistentes.has(order.id)) continue;

      const { estado, metodo_pago_display, total_woo } = determinarEstadoYPago(order);
      const distrito      = getMetaValue(order.meta_data, '_billing_wooccm10');
      const referenciaRaw = getMetaValue(order.meta_data, '_billing_referencia') 
                         || getMetaValue(order.meta_data, '_billing_wooccm9');
      const fechaEntregaRaw = getMetaValue(order.meta_data, '_additional_wooccm0');
      
      pedidosToInsert.push({
        woo_order_id:       order.id,
        woo_order_key:      order.order_key,
        woo_status:         order.status,
        woo_created_at:     order.date_created + 'Z',
        canal:              'woocommerce',
        cliente_nombre:     order.billing?.first_name || '',
        cliente_apellido:   order.billing?.last_name || '',
        cliente_email:      order.billing?.email || '',
        cliente_telefono:   order.billing?.phone || '',
        direccion:          order.shipping?.address_1 || order.billing?.address_1 || '',
        distrito:           distrito || order.shipping?.city || order.billing?.city || '',
        referencia:         referenciaRaw || '',
        gmaps_url:          extraerGmapsUrl(referenciaRaw),
        fecha_entrega:      parsearFechaEntrega(fechaEntregaRaw),
        metodo_pago_raw:    order.payment_method_title,
        metodo_pago_display,
        total_woo,
        estado,
        operador_logistico: determinarOperadorLogistico(distrito, referenciaRaw),
        tracking_interno:   order.number.toString(),
        notas:              order.customer_note || '',
      });

      itemsByWooId[order.id] = order.line_items;
    }

    if (pedidosToInsert.length === 0) {
      return jsonResponse({
        success: true,
        message: 'Todos los pedidos de esta página ya existen.',
        migrados: 0,
        nextPage: page + 1,
        hasMore: orders.length === per_page
      });
    }

    // 2. Insertar pedidos en lote y obtener IDs generados
    const { data: pedidosCreados, error: errP } = await supabase
      .from('pedidos')
      .insert(pedidosToInsert)
      .select('id, woo_order_id');

    if (errP) throw errP;

    // 3. Mapear items con los nuevos IDs de pedido
    const allItemsToInsert: any[] = [];
    pedidosCreados.forEach(p => {
      const wooItems = itemsByWooId[p.woo_order_id] || [];
      wooItems.forEach(item => {
        allItemsToInsert.push({
          pedido_id:            p.id,
          descripcion_woo:      item.name,
          sku_woo:              item.sku || '',
          woo_line_item_id:     item.id,
          cantidad_pedida:      item.quantity,
          precio_unitario_woo:  item.price,
        });
      });
    });

    if (allItemsToInsert.length > 0) {
      const { error: errI } = await supabase.from('pedido_items').insert(allItemsToInsert);
      if (errI) {
        console.error(`[migracion] Error insertando items:`, errI.message);
      }
    }

    return jsonResponse({
      success: true,
      message: `Página ${page} procesada. Migrados ${pedidosCreados.length} pedidos.`,
      migrados: pedidosCreados.length,
      nextPage: page + 1,
      hasMore: orders.length === per_page
    });

  } catch (err: any) {
    console.error('[migracion] Error fatal:', err.message);
    return errorResponse(err.message, 500);
  }
});
