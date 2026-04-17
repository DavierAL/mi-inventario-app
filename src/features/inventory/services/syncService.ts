import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../../../core/database';
import { supabase } from '../../../core/database/supabase';
import { parseFVToTimestamp, formatearFecha } from '../../../core/utils/fecha';

export async function syncConSupabase(options: { forceFull?: boolean } = {}) {
  await synchronize({
    database,
    // 1. PULL: Descargar cambios desde Supabase
    pullChanges: async ({ lastPulledAt }: { lastPulledAt?: number }) => {
      const timestamp = options.forceFull ? 0 : (lastPulledAt ? lastPulledAt : 0);
      
      if (options.forceFull) {
        console.log("=====> SYNC RECOVERY: Forzando descarga completa desde Supabase...");
      }

      // ── Pull productos ───────────────────────────────────────────────────
      let query = supabase.from('productos').select('*');
      
      if (timestamp > 0) {
        query = query.gt('server_updated_at', timestamp);
      }

      const { data: productosData, error: prodError } = await query;
      if (prodError) throw prodError;

      const updated = (productosData || []).map(row => ({
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
        created_at: row.created_at || Date.now(),
        updated_at: row.server_updated_at || Date.now()
      }));

      // ── Pull pedidos ─────────────────────────────────────────────────────
      let pedQuery = supabase.from('pedidos').select('*');
      if (timestamp > 0) {
        pedQuery = pedQuery.gt('server_updated_at', timestamp);
      }

      const { data: pedidosData, error: pedError } = await pedQuery;
      if (pedError) throw pedError;

      const pedidosUpdated = (pedidosData || []).map(row => ({
        id: row.id,
        cod_pedido: row.cod_pedido,
        cliente: row.cliente ?? '',
        estado: row.estado ?? 'Pendiente',
        operador: row.operador ?? null,
        pod_local_uri: null,
        url_foto: row.url_foto ?? null,
        notas: row.notas ?? null,
        created_at: row.created_at || Date.now(),
        updated_at: row.server_updated_at || Date.now(),
      }));

      return {
        changes: {
          productos: { created: [], updated, deleted: [] },
          movimientos: { created: [], updated: [], deleted: [] },
          pedidos: { created: [], updated: pedidosUpdated, deleted: [] },
        },
        timestamp: Date.now(),
      };
    },

    // 2. PUSH: Enviar cambios locales a Supabase
    pushChanges: async ({ changes }: { changes: any }) => {
      // --- Sincronizar Productos ---
      if (changes.productos) {
        const allProdChanges = [...changes.productos.created, ...changes.productos.updated];
        if (allProdChanges.length > 0) {
          const toUpsert = allProdChanges.map((record: any) => ({
            id: record.id,
            cod_barras: record.cod_barras,
            sku: record.sku,
            descripcion: record.descripcion,
            stock_master: record.stock_master,
            precio_web: record.precio_web,
            precio_tienda: record.precio_tienda,
            fv_actual_ts: record.fv_actual_ts,
            fecha_edicion: record.fecha_edicion,
            comentarios: record.comentarios,
            marca: record.marca,
            imagen: record.imagen,
            updated_at: Date.now(),
            // server_updated_at se actualiza por Trigger en DB
          }));

          const { error } = await supabase.from('productos').upsert(toUpsert);
          if (error) throw error;
        }
      }

      // --- Sincronizar Historial (Movimientos) ---
      if (changes.movimientos && changes.movimientos.created.length > 0) {
        const toInsert = changes.movimientos.created.map((record: any) => ({
          producto_id: record.producto_id,
          sku: record.sku,
          descripcion: record.descripcion,
          marca: record.marca,
          accion: record.accion,
          fv_anterior_ts: record.fv_anterior_ts,
          fv_nuevo_ts: record.fv_nuevo_ts,
          comentario: record.comentario,
          dispositivo: record.dispositivo,
          timestamp: record.timestamp
        }));

        const { error } = await supabase.from('historial').insert(toInsert);
        if (error) throw error;
      }

      // --- Sincronizar Pedidos ---
      if (changes.pedidos) {
        const allPedidoChanges = [...changes.pedidos.created, ...changes.pedidos.updated];
        if (allPedidoChanges.length > 0) {
          const toUpsert = allPedidoChanges.map((record: any) => ({
            id: record.id,
            cod_pedido: record.cod_pedido,
            cliente: record.cliente,
            estado: record.estado,
            operador: record.operador,
            url_foto: record.url_foto,
            notas: record.notas,
            created_at: record.created_at,
            updated_at: Date.now()
          }));

          const { error } = await supabase.from('pedidos').upsert(toUpsert);
          if (error) throw error;
        }
      }
    },
  });
}
