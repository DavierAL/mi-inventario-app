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
  pod_url?: string;
  bultos?: number;
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
    // 0. Validar Sesión y Obtener Rol
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      Logger.warn('[Sync] Abortado: No hay sesión activa.');
      isSyncing = false;
      return;
    }

    const userId = session.user.id;
    let userRole = session.user.app_metadata?.rol;

    // Fallback si el metadata está vacío (sesión antigua)
    if (!userRole) {
      Logger.info('[Sync] Rol no encontrado en metadata, consultando base de datos...');
      const { data: userData } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', userId)
        .single();
      userRole = userData?.rol;
    }

    if (!userRole) {
      Logger.warn('[Sync] Abortado: Rol de usuario no identificado.');
      isSyncing = false;
      return;
    }
    
    Logger.info(`[Sync] Usuario: ${session.user.email} (Rol detectado: ${userRole})`);

    await synchronize({
      database,
      // 1. PULL: Descargar cambios
      pullChanges: async ({ lastPulledAt }: { lastPulledAt?: number }) => {
        // Aseguramos que si lastPulledAt es 0 o null, sea realmente el inicio de los tiempos
        // 0.5 Verificar si la tabla de envíos está vacía (para forzar carga inicial si hubo fallo previo)
        const enviosCount = await database.get<Envio>('envios').query().fetchCount();
        const isFullSync = !lastPulledAt || options.forceFull || enviosCount === 0;

        const lastPulledDate = (isFullSync) 
          ? new Date(0).toISOString() 
          : new Date(lastPulledAt!).toISOString();
        
        if (enviosCount === 0 && lastPulledAt) {
          Logger.info('[Sync] Tabla envíos vacía detectada. Reparando con carga completa...');
        }
        
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
            .select('id, cod_pedido, cliente, direccion, telefono, estado, operador, url_foto, notas, distrito, gmaps_url, referencia, bultos, created_at, updated_at')
            .range(pageEnv * pageSize, (pageEnv + 1) * pageSize - 1);

          // Filtrado por Rol para optimizar descarga inicial
          if (userRole === 'logistica') {
            queryEnv = queryEnv.eq('operador', 'Salva');
          } else if (userRole === 'tienda') {
            queryEnv = queryEnv.in('operador', ['Tienda', 'Yango', 'Cabify']);
          }

          // OPTIMIZACIÓN: Descargar últimos 3 meses (90 días) para tener historial en el móvil
          if (isFullSync && userRole !== 'admin') {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            // Traer activos O entregados de los últimos 90 días
            queryEnv = queryEnv.or(`estado.in.(pendiente,en_tienda,en_ruta,reprogramado),created_at.gte.${ninetyDaysAgo.toISOString()}`);
          }

          if (lastPulledAt && !options.forceFull) {
            queryEnv = queryEnv.gte('updated_at', lastPulledDate);
          }
          
          Logger.info(`[Sync] Descargando envíos (página ${pageEnv})...`);
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
          pod_url: row.url_foto || null, // Se mantiene el nombre de la propiedad local mapeado a la columna real url_foto
          notas: row.notas || null,
          direccion: row.direccion || null,
          distrito: row.distrito || null,
          telefono: row.telefono || null,
          gmaps_url: row.gmaps_url || null,
          referencia: row.referencia || null,
          bultos: row.bultos || 1,
          pod_local_uri: null,
          forma_pago: null,
          a_pagar: 0,
          recaudado: 0,
          costo_envio: 0,
          operacion: null,
          tamano: null,
          peso: 0,
          hora_desde: null,
          hora_hasta: null,
          created_at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          updated_at: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
        }));

        // --- PULL LOGISTICA HISTORIAL ---
        let historialRemote: any[] = [];
        let hasMoreHist = true;
        let pageHist = 0;
        
        while (hasMoreHist) {
          let queryHist = supabase.from('logistica_historial')
            .select('id, envio_id, cod_pedido, estado_anterior, estado_nuevo, timestamp, operador, rol_usuario, created_at, updated_at')
            .range(pageHist * pageSize, (pageHist + 1) * pageSize - 1);
          if (lastPulledAt && !options.forceFull) {
            queryHist = queryHist.gte('updated_at', lastPulledDate);
          }
          const { data, error } = await queryHist;
          if (error) {
            Logger.error('[Sync] Error al descargar historial logística', error);
            throw error;
          }
          if (data && data.length > 0) {
            historialRemote = [...historialRemote, ...data];
            hasMoreHist = data.length === pageSize;
            pageHist++;
          } else {
            hasMoreHist = false;
          }
        }

        const historialUpdated = historialRemote.map(row => ({
          id: row.id?.toString() || '',
          envio_id: row.envio_id,
          cod_pedido: row.cod_pedido,
          estado_anterior: row.estado_anterior,
          estado_nuevo: row.estado_nuevo,
          timestamp: row.timestamp ? Number(row.timestamp) : Date.now(),
          operador: row.operador || null,
          rol_usuario: row.rol_usuario || null,
          created_at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          updated_at: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
        }));

        // --- PULL PRODUCTOS HISTORIAL (MOVIMIENTOS) ---
        let movimientosRemote: any[] = [];
        let hasMoreMov = true;
        let pageMov = 0;
        
        while (hasMoreMov) {
          let queryMov = supabase.from('historial')
            .select('id, producto_id, sku, descripcion, marca, accion, fv_anterior_ts, fv_nuevo_ts, comentario, dispositivo, rol_usuario, timestamp, created_at, updated_at')
            .range(pageMov * pageSize, (pageMov + 1) * pageSize - 1);
          if (lastPulledAt && !options.forceFull) {
            queryMov = queryMov.gte('updated_at', lastPulledDate);
          }
          const { data, error } = await queryMov;
          if (error) {
            Logger.error('[Sync] Error al descargar historial productos', error);
            throw error;
          }
          if (data && data.length > 0) {
            movimientosRemote = [...movimientosRemote, ...data];
            hasMoreMov = data.length === pageSize;
            pageMov++;
          } else {
            hasMoreMov = false;
          }
        }

        const movimientosUpdated = movimientosRemote.map(row => ({
          id: row.id?.toString() || '',
          producto_id: row.producto_id,
          sku: row.sku,
          descripcion: row.descripcion,
          marca: row.marca,
          accion: row.accion,
          fv_anterior_ts: row.fv_anterior_ts ? Number(row.fv_anterior_ts) : null,
          fv_nuevo_ts: row.fv_nuevo_ts ? Number(row.fv_nuevo_ts) : null,
          comentario: row.comentario || null,
          dispositivo: row.dispositivo || '📱 App',
          timestamp: row.timestamp ? Number(row.timestamp) : Date.now(),
          rol_usuario: row.rol_usuario || null,
          created_at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          updated_at: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
        }));

        pulledCount = productosUpdated.length + enviosUpdated.length + historialUpdated.length + movimientosUpdated.length;

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
            logistica_historial: {
              created: !lastPulledAt || options.forceFull ? historialUpdated : [],
              updated: lastPulledAt && !options.forceFull ? historialUpdated : [],
              deleted: []
            },
            movimientos: {
              created: !lastPulledAt || options.forceFull ? movimientosUpdated : [],
              updated: lastPulledAt && !options.forceFull ? movimientosUpdated : [],
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
                url_foto: r.url_foto || r.urlFoto || null,
                notas: r.notas || null,
                direccion: r.direccion || null,
                distrito: r.distrito || null,
                telefono: r.telefono || null,
                gmaps_url: r.gmaps_url || r.gmapsUrl || null,
                referencia: r.referencia || null,
                updated_at: new Date().toISOString()
              };
            }).filter(u => u !== null);
            const { error } = await supabase.from('envios').upsert(updates);
            if (error) throw error;
            pushedCount += updates.length;
          }
        }

        // --- PUSH LOGISTICA HISTORIAL ---
        if (changes.logistica_historial) {
          const all = [...changes.logistica_historial.created, ...changes.logistica_historial.updated];
          if (all.length > 0) {
            const updates = all.map((r: any) => ({
              id: r.id,
              envio_id: r.envio_id || r.envioId,
              cod_pedido: r.cod_pedido || r.codPedido,
              estado_anterior: r.estado_anterior || r.estadoAnterior,
              estado_nuevo: r.estado_nuevo || r.estadoNuevo,
              timestamp: r.timestamp,
              operador: r.operador || null,
              rol_usuario: r.rol_usuario || r.rolUsuario || null,
              created_at: new Date(r.timestamp).toISOString(),
              updated_at: new Date().toISOString()
            }));
            const { error } = await supabase.from('logistica_historial').upsert(updates);
            if (error) throw error;
            pushedCount += updates.length;
          }
        }

        // --- PUSH PRODUCTOS HISTORIAL (MOVIMIENTOS) ---
        if (changes.movimientos) {
          const all = [...changes.movimientos.created, ...changes.movimientos.updated];
          if (all.length > 0) {
            const updates = all.map((r: any) => ({
              id: r.id,
              producto_id: r.producto_id || r.productoId,
              sku: r.sku,
              descripcion: r.descripcion,
              marca: r.marca,
              accion: r.accion,
              fv_anterior_ts: r.fv_anterior_ts || r.fvAnteriorTs,
              fv_nuevo_ts: r.fv_nuevo_ts || r.fvNuevoTs,
              comentario: r.comentario || null,
              dispositivo: r.dispositivo || '📱 App',
              timestamp: r.timestamp,
              rol_usuario: r.rol_usuario || r.rolUsuario || null,
              updated_at: new Date().toISOString()
            }));
            const { error } = await supabase.from('historial').upsert(updates);
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
