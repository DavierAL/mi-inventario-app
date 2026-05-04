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

/**
 * Divide un array en trozos (chunks) de un tamaño máximo.
 * Útil para cumplir con la Regla 2 de batching (máx 500 ops).
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
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

interface HistorialRemote {
  id: string;
  envio_id: string;
  cod_pedido: string;
  estado_anterior: string;
  estado_nuevo: string;
  timestamp: number | string;
  operador?: string;
  rol_usuario?: string;
  created_at: string;
  updated_at: string;
}

interface MovimientoRemote {
  id: string;
  producto_id: string;
  sku: string;
  descripcion: string;
  marca: string;
  accion: string;
  fv_anterior_ts?: number | string;
  fv_nuevo_ts?: number | string;
  comentario?: string;
  dispositivo?: string;
  timestamp: number | string;
  rol_usuario?: string;
  created_at: string;
  updated_at: string;
}

interface MarcaControlRemote {
  id: string;
  nombre: string;
  dias_rango: number;
  ultimo_conteo?: string;
  inventariar: boolean;
  created_at: string;
  updated_at: string;
}

interface MarcaControlLocalRecord {
  id: string;
  nombre: string;
  diasRango: number;
  ultimoConteo?: number;
  inventariar: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ProductoLocalRecord {
  id: string;
  codBarras?: string;
  sku?: string;
  descripcion?: string;
  marca?: string;
  stockMaster?: number;
  precioWeb?: number;
  precioTienda?: number;
  fvActualTs?: number | null;
  comentarios?: string | null;
  fechaEdicion?: string | null;
  imagen?: string | null;
}

interface EnvioLocalRecord {
  id: string;
  codPedido?: string;
  cliente?: string;
  estado?: string;
  operador?: string | null;
  urlFoto?: string | null;
  podUrl?: string | null;
  notas?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  telefono?: string | null;
  gmapsUrl?: string | null;
  referencia?: string | null;
}

interface HistorialLocalRecord {
  id: string;
  envioId?: string;
  codPedido?: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  timestamp?: number;
  operador?: string | null;
  rolUsuario?: string | null;
}

interface MovimientoLocalRecord {
  id: string;
  productoId?: string;
  sku?: string;
  descripcion?: string;
  marca?: string;
  accion?: string;
  fvAnteriorTs?: number | null;
  fvNuevoTs?: number | null;
  comentario?: string | null;
  dispositivo?: string;
  timestamp?: number;
  rolUsuario?: string | null;
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
        let historialRemote: HistorialRemote[] = [];
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
        let movimientosRemote: MovimientoRemote[] = [];
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

        // --- PULL MARCAS CONTROL ---
        let marcasRemote: MarcaControlRemote[] = [];
        let hasMoreMarcas = true;
        let pageMarcas = 0;

        while (hasMoreMarcas) {
          let queryMarcas = supabase.from('marcas_control')
            .select('id, nombre, dias_rango, ultimo_conteo, inventariar, created_at, updated_at')
            .range(pageMarcas * pageSize, (pageMarcas + 1) * pageSize - 1);
          if (lastPulledAt && !options.forceFull) {
            queryMarcas = queryMarcas.gte('updated_at', lastPulledDate);
          }
          const { data, error } = await queryMarcas;
          if (error) {
            Logger.error('[Sync] Error al descargar marcas_control', error);
            throw error;
          }
          if (data && data.length > 0) {
            marcasRemote = [...marcasRemote, ...data];
            hasMoreMarcas = data.length === pageSize;
            pageMarcas++;
          } else {
            hasMoreMarcas = false;
          }
        }

        const marcasUpdated = marcasRemote.map(row => ({
          id: row.id?.toString() || '',
          nombre: row.nombre,
          dias_rango: row.dias_rango,
          ultimo_conteo: row.ultimo_conteo ? new Date(row.ultimo_conteo).getTime() : null,
          inventariar: row.inventariar,
          created_at: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          updated_at: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
        }));

        pulledCount = productosUpdated.length + enviosUpdated.length + historialUpdated.length + movimientosUpdated.length + marcasUpdated.length;

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
            marcas_control: {
              created: !lastPulledAt || options.forceFull ? marcasUpdated : [],
              updated: lastPulledAt && !options.forceFull ? marcasUpdated : [],
              deleted: []
            },
          },
          timestamp: Date.now(),
        };
      },

      // 2. PUSH: Enviar cambios locales (Máx 500 por lote - Regla 2)
      pushChanges: async ({ changes }: { changes: SyncChanges }) => {
        const CHUNK_SIZE = 500;

        // --- PUSH PRODUCTOS ---
        if (changes.productos) {
          const all = [...changes.productos.created, ...changes.productos.updated];
          if (all.length > 0) {
            const updates = all
              .map((r: Model) => {
                const rec = r as unknown as ProductoLocalRecord;
                const cod = rec.codBarras || '';
                if (!cod) {
                  Logger.warn(`[Sync] Saltando producto sin código de barras: ${rec.sku || rec.id}`);
                  return null;
                }
                return {
                  id: rec.id,
                  cod_barras: cod,
                  sku: rec.sku || '',
                  descripcion: rec.descripcion || '',
                  marca: rec.marca || 'Genérico',
                  stock_master: rec.stockMaster ?? 0,
                  precio_web: rec.precioWeb ?? 0,
                  precio_tienda: rec.precioTienda ?? 0,
                  fv_actual_ts: rec.fvActualTs ?? null,
                  comentarios: rec.comentarios || null,
                  fecha_edicion: rec.fechaEdicion || null,
                  imagen: rec.imagen || null,
                  updated_at: new Date().toISOString()
                };
              })
              .filter((u): u is NonNullable<typeof u> => u !== null);

            const chunks = chunkArray(updates, CHUNK_SIZE);
            for (const chunk of chunks) {
              const { error } = await supabase.from('productos').upsert(chunk);
              if (error) throw error;
              pushedCount += chunk.length;
            }
          }
        }

        // --- PUSH ENVIOS ---
        if (changes.envios) {
          const all = [...changes.envios.created, ...changes.envios.updated];
          if (all.length > 0) {
            const updates = all.map((r: Model) => {
              const rec = r as unknown as EnvioLocalRecord;
              const codPedido = rec.codPedido;
              if (!codPedido) {
                Logger.warn(`[Sync] Saltando envío sin cod_pedido: ${rec.id}`);
                return null;
              }
              return {
                id: rec.id,
                cod_pedido: codPedido,
                cliente: rec.cliente,
                estado: Envio.toExternalStatus(rec.estado || 'Pendiente'),
                operador: rec.operador || null,
                url_foto: rec.urlFoto || rec.podUrl || null,
                notas: rec.notas || null,
                direccion: rec.direccion || null,
                distrito: rec.distrito || null,
                telefono: rec.telefono || null,
                gmaps_url: rec.gmapsUrl || null,
                referencia: rec.referencia || null,
                updated_at: new Date().toISOString()
              };
            }).filter((u): u is NonNullable<typeof u> => u !== null);

            const chunks = chunkArray(updates, CHUNK_SIZE);
            for (const chunk of chunks) {
              const { error } = await supabase.from('envios').upsert(chunk);
              if (error) throw error;
              pushedCount += chunk.length;
            }
          }
        }

        // --- PUSH LOGISTICA HISTORIAL ---
        if (changes.logistica_historial) {
          const all = [...changes.logistica_historial.created, ...changes.logistica_historial.updated];
          if (all.length > 0) {
            const updates = all.map((r: Model) => {
              const rec = r as unknown as HistorialLocalRecord;
              return {
                id: rec.id,
                envio_id: rec.envioId,
                cod_pedido: rec.codPedido,
                estado_anterior: rec.estadoAnterior,
                estado_nuevo: rec.estadoNuevo,
                timestamp: rec.timestamp,
                operador: rec.operador || null,
                rol_usuario: rec.rolUsuario || null,
                created_at: rec.timestamp ? new Date(rec.timestamp).toISOString() : new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            });

            const chunks = chunkArray(updates, CHUNK_SIZE);
            for (const chunk of chunks) {
              const { error } = await supabase.from('logistica_historial').upsert(chunk);
              if (error) throw error;
              pushedCount += chunk.length;
            }
          }
        }

        // --- PUSH PRODUCTOS HISTORIAL (MOVIMIENTOS) ---
        if (changes.movimientos) {
          const all = [...changes.movimientos.created, ...changes.movimientos.updated];
          if (all.length > 0) {
            const updates = all.map((r: Model) => {
              const rec = r as unknown as MovimientoLocalRecord;
              return {
                id: rec.id,
                producto_id: rec.productoId,
                sku: rec.sku,
                descripcion: rec.descripcion,
                marca: rec.marca,
                accion: rec.accion,
                fv_anterior_ts: rec.fvAnteriorTs,
                fv_nuevo_ts: rec.fvNuevoTs,
                comentario: rec.comentario || null,
                dispositivo: rec.dispositivo || '📱 App',
                timestamp: rec.timestamp,
                rol_usuario: rec.rolUsuario || null,
                updated_at: new Date().toISOString()
              };
            });

            const chunks = chunkArray(updates, CHUNK_SIZE);
            for (const chunk of chunks) {
              const { error } = await supabase.from('historial').upsert(chunk);
              if (error) throw error;
              pushedCount += chunk.length;
            }
          }
        }

        // --- PUSH MARCAS CONTROL ---
        if (changes.marcas_control) {
          const all = [...changes.marcas_control.created, ...changes.marcas_control.updated];
          if (all.length > 0) {
            const updates = all.map((r: Model) => {
              const rec = r as unknown as MarcaControlLocalRecord;
              return {
                id: rec.id,
                nombre: rec.nombre,
                dias_rango: rec.diasRango,
                ultimo_conteo: rec.ultimoConteo ? new Date(rec.ultimoConteo).toISOString() : null,
                inventariar: rec.inventariar,
                updated_at: new Date().toISOString()
              };
            });

            const chunks = chunkArray(updates, CHUNK_SIZE);
            for (const chunk of chunks) {
              const { error } = await supabase.from('marcas_control').upsert(chunk);
              if (error) throw error;
              pushedCount += chunk.length;
            }
          }
        }
      },

      conflictResolver: (table, local, remote, resolved) => {
        if (table === 'productos') {
          const localProd = local as unknown as ProductoLocalRecord;
          const remoteProd = remote as unknown as ProductoRemote;

          if (localProd.stockMaster !== remoteProd.stock_master) {
            // Si el local es más reciente, priorizamos el stock_master local
            const localUpdatedAt = (local as any).updatedAt || 0;
            const remoteUpdatedAt = new Date(remoteProd.updated_at).getTime();

            if (localUpdatedAt > remoteUpdatedAt) {
              return { ...resolved, stock_master: localProd.stockMaster };
            }
          }
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
    const err = error instanceof Error ? error : new Error(String(error));
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
      ErrorService.handle(dbErr, { component: 'syncService', operation: 'registrarFalloSync' });
    }
  } finally {
    isSyncing = false;
  }
}
