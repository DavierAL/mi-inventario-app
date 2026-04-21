import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../../../core/database';
import { supabase } from '../../../core/database/supabase';
import { Logger } from '../../../core/services/LoggerService';
import { ErrorService } from '../../../core/services/ErrorService';
import NetInfo from '@react-native-community/netinfo';

/**
 * Mapea los estados de Supabase/WooCommerce a los estados internos de la App.
 */
function mapearEstadoEntrante(estadoOriginal: string): 'Pendiente' | 'En_Tienda' | 'Entregado' {
  const norm = (estadoOriginal || '').toLowerCase().replace(/_/g, ' ').trim();
  if (norm.includes('impresion etiqueta') || norm === 'pendiente' || norm.includes('revisar pago')) return 'Pendiente';
  if (norm.includes('listo para envio') || norm === 'en tienda' || norm === 'en_tienda') return 'En_Tienda';
  if (norm.includes('entregado')) return 'Entregado';
  return 'Pendiente';
}

/**
 * Sincronización Local-First con Resolución de Conflictos y Auditoría.
 */
export async function syncConSupabase(options: { forceFull?: boolean } = {}) {
  const startTime = Date.now();
  const netInfo = await NetInfo.fetch();
  
  if (!netInfo.isConnected) {
    Logger.warn('[Sync] Abortado: Sin conexión a internet');
    return;
  }

  Logger.info('[Sync] Iniciando sincronización...');

  let pulledCount = 0;
  let pushedCount = 0;

  try {
    await synchronize({
      database,
      // 1. PULL: Descargar cambios
      pullChanges: async ({ lastPulledAt }: { lastPulledAt?: number }) => {
        const lastPulledDate = options.forceFull ? new Date(0).toISOString() : new Date(lastPulledAt || 0).toISOString();
        
        // --- PULL PRODUCTOS ---
        let productosRemote: any[] = [];
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;

        while (hasMore) {
          let query = supabase.from('productos').select('*').range(page * pageSize, (page + 1) * pageSize - 1);
          if (lastPulledAt && !options.forceFull) {
            query = query.gte('updated_at', lastPulledDate);
          }
          const { data, error } = await query;
          if (error) throw error;
          if (data && data.length > 0) {
            productosRemote = [...productosRemote, ...data];
            hasMore = data.length === pageSize;
            page++;
          } else {
            hasMore = false;
          }
        }

        const productosUpdated = productosRemote.map(row => ({
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
          created_at: new Date(row.created_at).getTime(),
          updated_at: new Date(row.updated_at).getTime(),
        }));

        // --- PULL ENVIOS ---
        let queryEnv = supabase.from('envios').select('*');
        if (lastPulledAt && !options.forceFull) {
          queryEnv = queryEnv.gte('updated_at', lastPulledDate);
        }
        const { data: enviosRemote, error: errEnv } = await queryEnv;
        if (errEnv) throw errEnv;

        const enviosUpdated = (enviosRemote || []).map(row => ({
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
          created_at: new Date(row.created_at).getTime(),
          updated_at: new Date(row.updated_at).getTime(),
        }));

        pulledCount = productosUpdated.length + enviosUpdated.length;

        return {
          changes: {
            productos: { 
              created: !lastPulledAt || options.forceFull ? productosUpdated : [], 
              updated: lastPulledAt && !options.forceFull ? productosUpdated : [], 
              deleted: [] 
            },
            envios: { 
              created: !lastPulledAt || options.forceFull ? enviosUpdated : [], 
              updated: lastPulledAt && !options.forceFull ? enviosUpdated : [], 
              deleted: [] 
            },
          },
          timestamp: Date.now(),
        };
      },

      // 2. PUSH: Enviar cambios locales
      pushChanges: async ({ changes }: { changes: any }) => {
        // --- PUSH PRODUCTOS ---
        if (changes.productos) {
          const all = [...changes.productos.created, ...changes.productos.updated];
          if (all.length > 0) {
            const updates = all.map(record => ({
              id: record.id,
              stock_master: record.stock_master,
              fv_actual_ts: record.fv_actual_ts,
              comentarios: record.comentarios,
              fecha_edicion: record.fecha_edicion,
              updated_at: new Date().toISOString()
            }));
            const { error } = await supabase.from('productos').upsert(updates);
            if (error) throw error;
            pushedCount += updates.length;
          }
        }

        // --- PUSH ENVIOS ---
        if (changes.envios) {
          const all = [...changes.envios.created, ...changes.envios.updated];
          if (all.length > 0) {
            const updates = all.map(record => ({
              id: record.id,
              estado: record.estado.toLowerCase(),
              url_foto: record.url_foto,
              updated_at: new Date().toISOString()
            }));
            const { error } = await supabase.from('envios').upsert(updates);
            if (error) throw error;
            pushedCount += updates.length;
          }
        }
      },

      // 3. Resolución de Conflictos
      conflictResolver: (table, local, remote, resolved) => {
        // Si el servidor tiene un stock_master diferente, comparamos timestamps
        if (table === 'productos' && local.stock_master !== remote.stock_master) {
          if (local.updated_at > remote.updated_at) {
            Logger.info(`[Sync] Conflicto resuelto: Local gana para ${local.sku}`);
            return { ...remote, stock_master: local.stock_master };
          }
          Logger.info(`[Sync] Conflicto resuelto: Remoto gana para ${local.sku}`);
          return remote;
        }
        return resolved;
      }
    });

    // Registrar éxito
    await database.write(async () => {
      await database.get('sync_history').create((h: any) => {
        h.lastSyncAt = Date.now();
        h.status = 'SUCCESS';
        h.pulledCount = pulledCount;
        h.pushedCount = pushedCount;
      });
    });

    Logger.info(`[Sync] Éxito: ${pulledCount} ↓, ${pushedCount} ↑ (${Date.now() - startTime}ms)`);

  } catch (error) {
    const err = error as Error;
    ErrorService.handle(err, { component: 'syncService', operation: 'syncConSupabase' });
    
    // Registrar fallo
    try {
      await database.write(async () => {
        await database.get('sync_history').create((h: any) => {
          h.lastSyncAt = Date.now();
          h.status = 'FAILED';
          h.pulledCount = pulledCount;
          h.pushedCount = pushedCount;
          h.errorMessage = err.message;
        });
      });
    } catch (dbErr) {
      console.error('[Sync] No se pudo registrar el fallo en DB', dbErr);
    }
  }
}
