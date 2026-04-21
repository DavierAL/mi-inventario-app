import { synchronize } from '@nozbe/watermelondb/sync';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../core/database';
import Pedido, { EstadoPedido } from '../../../core/database/models/Pedido';
import { supabase } from '../../../core/database/supabase';

const PROXY_URL = process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL || '';

/**
 * Mapea los estados de Supabase/WooCommerce a los estados internos de la App.
 */
function mapearEstadoEntrante(estadoOriginal: string): EstadoPedido {
  const norm = (estadoOriginal || '').toLowerCase().replace(/_/g, ' ').trim();
  
  if (norm.includes('impresion etiqueta') || norm === 'pendiente' || norm.includes('revisar pago')) return 'Pendiente';
  if (norm.includes('listo para envio') || norm === 'en tienda' || norm === 'en_tienda') return 'En_Tienda';
  if (norm.includes('entregado')) return 'Entregado';
  
  return 'Pendiente';
}

/**
 * Sincronización Local-First.
 * Productos: Google Sheets (vía Proxy).
 * Pedidos: Supabase Nativo (Post-migración WooCommerce).
 */
export async function syncConSupabase(options: { forceFull?: boolean } = {}) {
  
  await synchronize({
    database,
    // 1. PULL: Descargar cambios
    pullChanges: async ({ lastPulledAt }: { lastPulledAt?: number }) => {
      const lastPulledDate = options.forceFull ? new Date(0).toISOString() : new Date(lastPulledAt || 0).toISOString();
      console.log(`[Sync] PULL iniciando. LastPulled: ${lastPulledAt} (${lastPulledDate})`);

      // --- PULL PRODUCTOS (Legacy Proxy) ---
      const prodResponse = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accion: 'leer_todo', 
          lastPulledAt: options.forceFull ? 0 : (lastPulledAt || 0) 
        })
      });

      let productosUpdated = [];
      if (prodResponse.ok) {
        const { data } = await prodResponse.json();
        productosUpdated = (data?.productos || []).map((row: any) => ({
          id: row.id || row.cod_barras,
          cod_barras: row.cod_barras,
          sku: row.sku,
          descripcion: row.descripcion,
          stock_master: row.stock_master ?? row.stock ?? 0,
          precio_web: row.precio_web ?? 0,
          precio_tienda: row.precio_tienda ?? 0,
          fv_actual_ts: row.fv_actual_ts,
          fecha_edicion: row.fecha_edicion,
          comentarios: row.comentarios,
          marca: row.marca,
          imagen: row.imagen,
          created_at: row.created_at || Date.now(),
          updated_at: row.updated_at || Date.now()
        }));
      }

      // --- PULL PEDIDOS (Supabase) ---
      const { data: pedidosRemote, error: errP } = await supabase
        .from('pedidos')
        .select('*')
        .gt('updated_at', lastPulledDate);
      
      if (errP) throw errP;

      const pedidosUpdated = (pedidosRemote || []).map((row: any) => ({
        id: row.id.toString(),
        cod_pedido: row.woo_order_id?.toString() || row.tracking_interno || row.id.toString(),
        cliente: `${row.cliente_nombre || ''} ${row.cliente_apellido || ''}`.trim() || 'Cliente Sin Nombre',
        estado: mapearEstadoEntrante(row.estado),
        operador: row.operador || null,
        pod_local_uri: null,
        url_foto: row.url_foto || null,
        notas: row.notas || null,
        
        // Campos V6
        woo_order_id: row.woo_order_id,
        canal: row.canal,
        cliente_telefono: row.cliente_telefono,
        direccion: row.direccion,
        distrito: row.distrito,
        referencia: row.referencia,
        gmaps_url: row.gmaps_url,
        fecha_entrega: row.fecha_entrega,
        metodo_pago_display: row.metodo_pago_display,
        total_woo: row.total_woo,
        operador_logistico: row.operador_logistico,
        tracking_interno: row.tracking_interno,

        created_at: new Date(row.created_at).getTime(),
        updated_at: new Date(row.updated_at).getTime(),
      }));

      // --- PULL PEDIDO ITEMS (Supabase) ---
      // Para optimizar, podríamos solo pedir los items de los pedidos que cambiaron, 
      // pero WatermelonDB sync maneja bien los updates si usamos updated_at.
      const { data: itemsRemote, error: errI } = await supabase
        .from('pedido_items')
        .select('*')
        .gt('updated_at', lastPulledDate);

      if (errI) {
          console.warn('[Sync] No se pudieron obtener items de pedidos:', errI.message);
      }

      const itemsUpdated = (itemsRemote || []).map((row: any) => ({
        id: row.id.toString(),
        pedido_id: row.pedido_id.toString(),
        descripcion_woo: row.descripcion_woo,
        sku_woo: row.sku_woo,
        cantidad_pedida: row.cantidad_pedida,
        precio_unitario_woo: row.precio_unitario_woo,
        created_at: new Date(row.created_at).getTime(),
        updated_at: new Date(row.updated_at).getTime(),
      }));

      return {
        changes: {
          productos: { created: [], updated: productosUpdated, deleted: [] },
          movimientos: { created: [], updated: [], deleted: [] },
          pedidos: { created: [], updated: pedidosUpdated, deleted: [] },
          pedido_items: { created: [], updated: itemsUpdated, deleted: [] },
        },
        timestamp: Date.now(),
      };
    },

    // 2. PUSH: Enviar cambios locales
    pushChanges: async ({ changes }: { changes: any }) => {
      // Push Productos (Proxy)
      if (changes.productos) {
        const allProdChanges = [...changes.productos.created, ...changes.productos.updated];
        for (const record of allProdChanges) {
          await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accion: 'webhook_modificacion',
              datos: { codigoBarras: record.cod_barras, nuevoStock: record.stock_master }
            })
          });
        }
      }

      // Push Pedidos (Supabase)
      if (changes.pedidos) {
        const allPedidoChanges = [...changes.pedidos.created, ...changes.pedidos.updated];
        for (const record of allPedidoChanges) {
            // Actualizar estado en Supabase
            const { error } = await supabase
                .from('pedidos')
                .update({ 
                    estado: record.estado.toLowerCase(),
                    url_foto: record.url_foto,
                    operador: record.operador,
                    updated_at: new Date().toISOString()
                })
                .eq('id', record.id);
            
            if (error) console.error('[Sync] Error pushing pedido:', error.message);
        }
      }
    },
  });
}
