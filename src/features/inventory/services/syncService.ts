import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../../../core/database';
import { supabase } from '../../../core/database/supabase';
import { Logger } from '../../../core/services/LoggerService';
import { ErrorService } from '../../../core/services/ErrorService';
import NetInfo from '@react-native-community/netinfo';
import SyncHistory from '../../../core/database/models/SyncHistory';
import Envio from '../../../core/database/models/Envio';
import { Model } from '@nozbe/watermelondb';

/**
 * Mapea los estados de Supabase/WooCommerce a los estados internos de la App.
 */
function mapearEstadoEntrante(estadoOriginal: string): 'Pendiente' | 'En_Tienda' | 'Entregado' {
  return Envio.fromExternalStatus(estadoOriginal);
}

interface ProductoRemote {
  id: string;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  stock?: number;
  categoria?: string;
  imagen_url?: string;
  codigo_barras?: string;
  fv_actual?: string;
  comentarios?: string;
  created_at: string;
  updated_at: string;
  cod_barras?: string;
  sku?: string;
  stock_master?: number;
  precio_web?: number;
  precio_tienda?: number;
  fv_actual_ts?: number;
  fecha_edicion?: string;
  marca?: string;
  imagen?: string;
}

interface EnvioRemote {
  id: string;
  cod_pedido: string;
  cliente: string;
  direccion?: string;
  telefono?: string;
  estado: string;
  url_foto?: string;
  created_at: string;
  updated_at: string;
  operador?: string;
  notas?: string;
  distrito?: string;
  gmaps_url?: string;
  referencia?: string;
}

interface SyncChanges {
  [key: string]: {
    created: Model[];
    updated: Model[];
    deleted: string[];
  };
}

let isSyncing = false;

/**
 * Sincronización Local-First con Resolución de Conflictos y Auditoría.
 */
export async function syncConSupabase(options: { forceFull?: boolean } = {}) {
  if (isSyncing) {
    Logger.warn('[Sync] Sincronización ya en curso. Abortando nueva solicitud.');
    return;
  }

  isSyncing = true;
  const startTime = Date.now();
  const netInfo = await NetInfo.fetch();
  
  if (!netInfo.isConnected) {
    Logger.warn('[Sync] Abortado: Sin conexión a internet');
    isSyncing = false;
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
        let productosRemote: ProductoRemote[] = [];
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;

        while (hasMore) {
          let query = supabase.from('productos')
            .select('id, cod_barras, sku, descripcion, stock_master, precio_web, precio_tienda, fv_actual_ts, fecha_edicion, comentarios, marca, imagen, created_at, updated_at')
            .range(page * pageSize, (page + 1) * pageSize - 1);
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
          id: row.id?.toString() || '',
          cod_barras: row.cod_barras || row.codigo_barras || '',
          sku: row.sku || '',
          descripcion: row.descripcion || '',
          stock_master: row.stock_master ?? row.stock ?? 0,
          precio_web: row.precio_web ?? row.precio ?? 0,
          precio_tienda: row.precio_tienda ?? row.precio ?? 0,
          fv_actual_ts: row.fv_actual_ts || (row.fv_actual ? new Date(row.fv_actual).getTime() : null),
          fecha_edicion: row.fecha_edicion || null,
          comentarios: row.comentarios || null,
          marca: row.marca || 'Genérico',
          imagen: row.imagen || row.imagen_url || null,
          created_at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          updated_at: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
        }));

        // --- PULL ENVIOS ---
        let enviosRemote: EnvioRemote[] = [];
        let hasMoreEnv = true;
        let pageEnv = 0;
        
        while (hasMoreEnv) {
          let queryEnv = supabase.from('envios')
            .select('id, cod_pedido, cliente, direccion, telefono, estado, operador, url_foto, pod_url, notas, distrito, gmaps_url, referencia, bultos, created_at, updated_at')
            .range(pageEnv * pageSize, (pageEnv + 1) * pageSize - 1);
          if (lastPulledAt && !options.forceFull) {
            queryEnv = queryEnv.gte('updated_at', lastPulledDate);
          }
          const { data, error } = await queryEnv;
          if (error) {
            Logger.error('[Sync] Error al descargar envíos', error);
            throw error;
          }
          if (data && data.length > 0) {
            enviosRemote = [...enviosRemote, ...data];
            hasMoreEnv = data.length === pageSize;
            pageEnv++;
          } else {
            hasMoreEnv = false;
          }
        }

        const enviosUpdated = enviosRemote.map(row => ({
          id: row.id?.toString() || '',
          supabase_id: row.id?.toString() || '',
          cod_pedido: row.cod_pedido,
          cliente: row.cliente,
          estado: mapearEstadoEntrante(row.estado),
          operador: row.operador || null,
          url_foto: row.url_foto || null,
          pod_url: row.pod_url || null,
          notas: row.notas || null,
          direccion: row.direccion || null,
          distrito: row.distrito || null,
          telefono: row.telefono || null,
          gmaps_url: row.gmaps_url || null,
          referencia: row.referencia || null,
          created_at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          updated_at: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
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
      pushChanges: async ({ changes }: { changes: SyncChanges }) => {
        // --- PUSH PRODUCTOS ---
        if (changes.productos) {
          const all = [...changes.productos.created, ...changes.productos.updated];
          if (all.length > 0) {
            const updates = all
              .map((r: any) => {
                const cod = r.cod_barras || r.codBarras || r.codigo_barras || '';
                if (!cod) {
                  Logger.warn(`[Sync] Saltando producto sin código de barras: ${r.sku || r.id}`);
                  return null;
                }
                return {
                  id: r.id,
                  cod_barras: cod,
                  sku: r.sku || '',
                  descripcion: r.descripcion || '',
                  marca: r.marca || 'Genérico',
                  stock_master: r.stock_master ?? r.stockMaster ?? 0,
                  precio_web: r.precio_web ?? r.precioWeb ?? 0,
                  precio_tienda: r.precio_tienda ?? r.precioTienda ?? 0,
                  fv_actual_ts: r.fv_actual_ts ?? r.fvActualTs ?? null,
                  comentarios: r.comentarios || null,
                  fecha_edicion: r.fecha_edicion || null,
                  imagen: r.imagen || null,
                  updated_at: new Date().toISOString()
                };
              })
              .filter(u => u !== null);

            if (updates.length > 0) {
              const { error } = await supabase.from('productos').upsert(updates);
              if (error) throw error;
              pushedCount += updates.length;
            }
          }
        }

        // --- PUSH ENVIOS ---
        if (changes.envios) {
          const all = [...changes.envios.created, ...changes.envios.updated];
          if (all.length > 0) {
            const updates = all.map((r: any) => {
              const codPedido = r.cod_pedido || r.codPedido;
              if (!codPedido) {
                Logger.warn(`[Sync] Saltando envío sin cod_pedido: ${r.id}`);
                return null;
              }
              return {
                id: r.id,
                cod_pedido: codPedido,
                cliente: r.cliente,
                estado: Envio.toExternalStatus(r.estado),
                operador: r.operador || null,
                url_foto: r.urlFoto || null,
                pod_url: r.podUrl || null,
                notas: r.notas || null,
                direccion: r.direccion || null,
                distrito: r.distrito || null,
                telefono: r.telefono || null,
                gmaps_url: r.gmapsUrl || null,
                referencia: r.referencia || null,
                updated_at: new Date().toISOString()
              };
            }).filter(u => u !== null);
            const { error } = await supabase.from('envios').upsert(updates);
            if (error) throw error;
            pushedCount += updates.length;
          }
        }
      },

      conflictResolver: (table, local, remote, resolved) => {
        const localRec = local as Record<string, unknown>;
        const remoteRec = remote as Record<string, unknown>;

        if (table === 'productos' && localRec.stock_master !== remoteRec.stock_master) {
          if ((localRec.updated_at as unknown as number) > (remoteRec.updated_at as unknown as number)) {
            return { ...remoteRec, stock_master: localRec.stock_master };
          }
          return remoteRec;
        }
        return resolved;
      }
    });

    // Registrar éxito
    await database.write(async () => {
      await database.get<SyncHistory>('sync_history').create((h) => {
        h.lastSyncAt = Date.now();
        h.status = 'SUCCESS';
        h.pulledCount = pulledCount;
        h.pushedCount = pushedCount;
      });
    });

    Logger.info(`[Sync] Éxito: ${pulledCount} ↓, ${pushedCount} ↑ (${Date.now() - startTime}ms)`);

  } catch (error) {
    const err = error as Error;
    console.error('[Sync] Error fatal durante la sincronización:', err);
    ErrorService.handle(err, { component: 'syncService', operation: 'syncConSupabase' });
    
    // Registrar fallo
    try {
      await database.write(async () => {
        await database.get<SyncHistory>('sync_history').create((h) => {
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
  } finally {
    isSyncing = false;
  }
}
