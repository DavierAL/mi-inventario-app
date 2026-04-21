// supabase/functions/webhook-woocommerce/index.ts
//
// Recibe pedidos nuevos de WooCommerce via webhook.
// Reemplaza el Google Apps Script doPost() que escribía en Google Sheets.
//
// Flujo:
//   1. Valida firma HMAC (seguridad)
//   2. Responde 200 OK inmediatamente (WooCommerce no espera más de 5s)
//   3. Procesa el pedido de forma asíncrona:
//      a. Mapea campos de WooCommerce a nuestro schema
//      b. Determina estado según método de pago
//      c. Inserta pedido + pedido_items en Supabase
//      d. Registra en audit_log

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  validarFirmaWebhook,
  determinarEstadoYPago,
  getMetaValue,
  extraerGmapsUrl,
  parsearFechaEntrega,
  determinarOperadorLogistico,
  CORS_HEADERS,
  jsonResponse,
  errorResponse,
} from '../_shared/helpers.ts';
import type {
  WooOrder,
  PedidoInsert,
  PedidoItemInsert,
} from '../_shared/types.ts';

// ─── Supabase client con service role (bypasea RLS) ──────────────────────────

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

// ─── Handler principal ───────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // ─── 1. Leer body RAW (antes de parsear — necesario para validar HMAC) ───
  const rawBody = await req.text();

  // ─── 2. Verificar Topic (Permitir pings de WooCommerce sin validar firma) ──
  const topic = req.headers.get('x-wc-webhook-topic') || '';
  
  // Si no es un tema de pedidos (ej: es un ping de verificación), respondemos 200
  if (!topic.includes('order')) {
    console.log(`[webhook-woocommerce] Recibido topic: ${topic}. Respondiendo 200 OK.`);
    return jsonResponse({ success: true, message: 'Topic accepted' });
  }

  // ─── 3. Validar firma HMAC (Solo para pedidos reales) ─────────────────────
  const signature = req.headers.get('x-wc-webhook-signature');
  const webhookSecret = Deno.env.get('WOO_WEBHOOK_SECRET') ?? '';

  const firmaValida = await validarFirmaWebhook(rawBody, signature, webhookSecret);

  if (!firmaValida) {
    console.error(`[webhook-woocommerce] Firma HMAC inválida.`);
    console.log(`[debug] Signature recibida: ${signature}`);
    console.log(`[debug] Secret length: ${webhookSecret.length}`);
    console.log(`[debug] Secret starts with: ${webhookSecret.substring(0, 3)}...`);
    console.log(`[debug] Topic: ${topic}`);

    // Registrar intento rechazado en audit_log
    await supabase.from('audit_log').insert({
      tabla: 'pedidos',
      accion: 'WEBHOOK_REJECTED',
      datos_nuevos: { 
        motivo: 'firma_hmac_invalida',
        signature_recibida: signature,
        topic: topic,
        ip: req.headers.get('x-forwarded-for') 
      },
      ip: req.headers.get('x-forwarded-for'),
    });

    return errorResponse('Unauthorized', 401);
  }

  // ─── 4. Parsear payload ───────────────────────────────────────────────────
  let order: WooOrder;
  try {
    order = JSON.parse(rawBody);
  } catch {
    return errorResponse('Invalid JSON payload', 400);
  }

  console.log(`[webhook-woocommerce] Procesando pedido WooCommerce #${order.number} (id: ${order.id})`);

  // ─── 4. Verificar que el pedido no existe ya (idempotencia) ─────────────
  const { data: existente } = await supabase
    .from('pedidos')
    .select('id, estado')
    .eq('woo_order_id', order.id)
    .maybeSingle();

  if (existente) {
    console.log(`[webhook-woocommerce] Pedido #${order.id} ya existe (id: ${existente.id}). Ignorando.`);
    return jsonResponse({ success: true, message: 'Order already exists', id: existente.id });
  }

  // ─── 5. Extraer metadatos de WooCommerce ─────────────────────────────────
  const distrito     = getMetaValue(order.meta_data, '_billing_wooccm10');
  const referenciaRaw = getMetaValue(order.meta_data, '_billing_referencia') 
                     || getMetaValue(order.meta_data, '_billing_wooccm9');
  const fechaEntregaRaw = getMetaValue(order.meta_data, '_additional_wooccm0');
  const tipoDocumento   = getMetaValue(order.meta_data, '_billing_wccheckoutfields_cpf_field')
                       || getMetaValue(order.meta_data, '_billing_wooccm8') 
                       || 'DNI';
  const numeroDocumento = getMetaValue(order.meta_data, '_billing_wooccm7');

  // ─── 6. Lógica de negocio: estado + método de pago ───────────────────────
  const { estado, metodo_pago_display, total_woo } = determinarEstadoYPago(order);
  const operador_logistico = determinarOperadorLogistico(distrito, referenciaRaw);
  const gmapsUrl = extraerGmapsUrl(referenciaRaw);
  const fechaEntrega = parsearFechaEntrega(fechaEntregaRaw);

  // ─── 7. Construir objeto pedido para insertar ────────────────────────────
  const pedidoData: PedidoInsert = {
    woo_order_id:       order.id,
    woo_order_key:      order.order_key,
    woo_status:         order.status,
    woo_created_at:     order.date_created,
    canal:              'woocommerce',
    // Cliente
    cliente_nombre:     order.billing.first_name || '',
    cliente_apellido:   order.billing.last_name  || undefined,
    cliente_email:      order.billing.email       || undefined,
    cliente_telefono:   order.billing.phone       || undefined,
    // Dirección
    direccion:          order.billing.address_1   || undefined,
    distrito:           distrito                  || undefined,
    referencia:         referenciaRaw             || undefined,
    gmaps_url:          gmapsUrl                  || undefined,
    // Documento
    tipo_documento:     tipoDocumento             || undefined,
    numero_documento:   numeroDocumento           || undefined,
    // Pago
    metodo_pago_raw:    order.payment_method_title,
    metodo_pago_display,
    total_woo,
    // Logística
    fecha_entrega:      fechaEntrega              || undefined,
    bultos:             1, // Valor inicial, el operador puede ajustar
    operador_logistico,
    // Estado
    estado,
    notas:              order.customer_note        || undefined,
  };

  // ─── 8. Insertar pedido ───────────────────────────────────────────────────
  const { data: pedidoCreado, error: errorPedido } = await supabase
    .from('pedidos')
    .insert(pedidoData)
    .select('id')
    .single();

  if (errorPedido || !pedidoCreado) {
    console.error('[webhook-woocommerce] Error insertando pedido:', errorPedido);
    
    await supabase.from('audit_log').insert({
      tabla: 'pedidos',
      accion: 'WEBHOOK_RECEIVED',
      datos_nuevos: { 
        woo_order_id: order.id,
        error: errorPedido?.message,
        estado: 'ERROR'
      },
    });

    return errorResponse(`Error creating order: ${errorPedido?.message}`, 500);
  }

  console.log(`[webhook-woocommerce] Pedido creado con id: ${pedidoCreado.id}`);

  // ─── 9. Buscar productos en nuestro catálogo para enlazar los items ──────
  // Extraemos todos los SKUs del pedido para hacer una sola query
  const skusDelPedido = order.line_items.map((item) => item.sku).filter(Boolean);

  let productosMap: Map<string, string> = new Map(); // sku → producto_id

  if (skusDelPedido.length > 0) {
    const { data: productos } = await supabase
      .from('productos')
      .select('id, sku, cod_barras')
      .in('sku', skusDelPedido);

    if (productos) {
      for (const p of productos) {
        productosMap.set(p.sku, p.id);
      }
    }
  }

  // ─── 10. Insertar items del pedido ────────────────────────────────────────
  const itemsData: PedidoItemInsert[] = order.line_items.map((lineItem) => ({
    pedido_id:            pedidoCreado.id,
    producto_id:          lineItem.sku ? productosMap.get(lineItem.sku) : undefined,
    descripcion_woo:      lineItem.name,
    sku_woo:              lineItem.sku || undefined,
    woo_line_item_id:     lineItem.id,
    cantidad_pedida:      lineItem.quantity,
    precio_unitario_woo:  lineItem.price,
  }));

  const { error: errorItems } = await supabase
    .from('pedido_items')
    .insert(itemsData);

  if (errorItems) {
    console.error('[webhook-woocommerce] Error insertando items:', errorItems);
    // El pedido ya se creó, no hacer rollback aquí
    // Los items se pueden re-insertar manualmente
  }

  // ─── 11. Registrar en audit_log ───────────────────────────────────────────
  await supabase.from('audit_log').insert({
    tabla:        'pedidos',
    registro_id:  pedidoCreado.id,
    accion:       'WEBHOOK_RECEIVED',
    datos_nuevos: {
      woo_order_id: order.id,
      woo_order_number: order.number,
      estado,
      metodo_pago_display,
      total_items: order.line_items.length,
      productos_mapeados: productosMap.size,
      productos_sin_mapear: order.line_items.length - productosMap.size,
    },
    ip: req.headers.get('x-forwarded-for'),
  });

  // ─── 12. Log de items sin mapear (para detectar productos nuevos) ────────
  const itemsSinMapear = order.line_items.filter(
    (item) => item.sku && !productosMap.has(item.sku)
  );
  if (itemsSinMapear.length > 0) {
    console.warn(
      `[webhook-woocommerce] ${itemsSinMapear.length} items sin mapear en el catálogo:`,
      itemsSinMapear.map((i) => `${i.sku} — ${i.name}`)
    );
  }

  console.log(
    `[webhook-woocommerce] ✅ Pedido #${order.number} procesado. ` +
    `Estado: ${estado} | Items: ${order.line_items.length} | ` +
    `Sin mapear: ${itemsSinMapear.length}`
  );

  return jsonResponse({
    success: true,
    pedido_id: pedidoCreado.id,
    woo_order_id: order.id,
    estado,
    items_creados: itemsData.length,
    items_sin_mapear: itemsSinMapear.map((i) => i.sku),
  });
});
