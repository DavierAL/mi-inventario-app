import { synchronize } from '@nozbe/watermelondb/sync';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../core/database';
import Envio, { EstadoPedido } from '../../../core/database/models/Envio';
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
  
  // Si viene del trigger de Supabase como 'en_tienda', asegurar mapeo
  if (norm === 'en_tienda') return 'En_Tienda';
  
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

      // --- PULL PRODUCTOS (Supabase) con Paginación ---
      let productosRemote: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let queryProd = supabase
          .from('productos')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if ((lastPulledAt || 0) > 0 && !options.forceFull) {
          queryProd = queryProd.gte('updated_at', lastPulledDate);
        }

        const { data: batch, error: errProd } = await queryProd;

        if (errProd) {
          console.error('[Sync] Error pulling productos batch:', errProd.message);
          hasMore = false;
        } else if (batch && batch.length > 0) {
          productosRemote = [...productosRemote, ...batch];
          if (batch.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }
      
      const productosUpdated = (productosRemote || []).map((row: any) => ({
        id: row.id,
        cod_barras: row.cod_barras,
        sku: row.sku,
        descripcion: row.descripcion,
        stock_master: row.stock_master ?? 0,
        precio_web: row.precio_web ?? 0,
        precio_tienda: row.precio_tienda ?? 0,
        fv_actual_ts: row.fv_actual_ts,
        fecha_edicion: row.fecha_edicion,
        comentarios: row.comentarios,
        marca: row.marca,
        imagen: row.imagen,
        created_at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updated_at: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      }));

      // --- PULL ENVIOS (Supabase) ---
      let queryEnv = supabase.from('envios').select('*');
      if ((lastPulledAt || 0) > 0 && !options.forceFull) {
        queryEnv = queryEnv.gte('updated_at', lastPulledDate);
      }
      const { data: enviosRemote, error: errP } = await queryEnv;
      
      if (errP) throw errP;

      const enviosUpdated = (enviosRemote || []).map((row: any) => ({
        id: row.id.toString(),
        cod_pedido: row.cod_pedido,
        cliente: row.cliente,
        estado: mapearEstadoEntrante(row.estado),
        operador: row.operador || null,
        url_foto: row.url_foto || null,
        notas: row.notas || null,
        direccion: row.direccion || null,
        distrito: row.distrito || null,
        telefono: row.telefono || null,
        gmaps_url: row.gmaps_url || null,
        referencia: row.referencia || null,
        forma_pago: row.forma_pago || null,
        a_pagar: Number(row.a_pagar) || 0,
        recaudado: Number(row.recaudado) || 0,
        costo_envio: Number(row.costo_envio) || 0,
        operacion: row.operacion || null,
        tamano: row.tamano || null,
        peso: Number(row.peso) || 0,
        bultos: Number(row.bultos) || 1,
        hora_desde: row.hora_desde || null,
        hora_hasta: row.hora_hasta || null,

        created_at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updated_at: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      }));

      // --- PULL PEDIDO ITEMS (Supabase) ---
      let queryItems = supabase.from('pedido_items').select('*');
      if ((lastPulledAt || 0) > 0 && !options.forceFull) {
        queryItems = queryItems.gte('updated_at', lastPulledDate);
      }
      const { data: itemsRemote, error: errI } = await queryItems;

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
        created_at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        updated_at: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      }));

      // Separación lógica para WatermelonDB (created vs updated)
      const isInitialSync = !lastPulledAt || options.forceFull;

      return {
        changes: {
          productos: { created: isInitialSync ? productosUpdated : [], updated: isInitialSync ? [] : productosUpdated, deleted: [] },
          movimientos: { created: [], updated: [], deleted: [] },
          envios: { created: isInitialSync ? enviosUpdated : [], updated: isInitialSync ? [] : enviosUpdated, deleted: [] },
        },
        timestamp: Date.now(),
      };
    },

    // 2. PUSH: Enviar cambios locales
    pushChanges: async ({ changes }: { changes: any }) => {
      // Push Productos (Supabase) - Batching
      if (changes.productos) {
        const allProdChanges = [...changes.productos.created, ...changes.productos.updated];
        const prodBatchSize = 100;
        for (let i = 0; i < allProdChanges.length; i += prodBatchSize) {
            const batch = allProdChanges.slice(i, i + prodBatchSize);
            const updates = batch.map(record => ({
                id: record.id,
                cod_barras: record.cod_barras,
                stock_master: record.stock_master,
                fv_actual_ts: record.fv_actual_ts,
                comentarios: record.comentarios,
                fecha_edicion: record.fecha_edicion,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('productos')
                .upsert(updates);
            
            if (error) console.error('[Sync] Error pushing producto batch:', error.message);
        }
      }

      // Push Envios (Supabase) - Batching Rule 4.1
      if (changes.envios) {
        const allEnvioChanges = [...changes.envios.created, ...changes.envios.updated];
        const batchSize = 100;
        for (let i = 0; i < allEnvioChanges.length; i += batchSize) {
          const batch = allEnvioChanges.slice(i, i + batchSize);
          const updates = batch.map(record => ({
            id: record.id,
            estado: record.estado.toLowerCase(),
            url_foto: record.url_foto,
            operador: record.operador,
            updated_at: new Date().toISOString()
          }));

          const { error } = await supabase
            .from('envios')
            .upsert(updates);
          
          if (error) console.error('[Sync] Error pushing envio batch:', error.message);
        }
      }
    },
  });
}
