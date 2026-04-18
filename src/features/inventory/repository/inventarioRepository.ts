import { supabase } from '../../../core/database/supabase';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../core/database';
import { QueueService, WebhookPayload } from '../../../core/services/QueueService';
import { ProductoInventario, EntradaHistorial, TipoAccionHistorial } from '../../../core/types/inventario';
import Movimiento from '../../../core/database/models/Movimiento';
import Producto from '../../../core/database/models/Producto';
import { parseFVToTimestamp, parseFVToDate, formatearFecha } from '../../../core/utils/fecha';

const API_URL = process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL || '';
const WEBHOOK_QUEUE_KEY = '@webhook_queue_mascotify';

/**
 * InventarioRepository — Director de Orquesta
 * 
 * Responsabilidad: Coordinar las operaciones de datos entre las capas de 
 * infraestructura sin implementar los detalles de ninguna.
 */
export const InventarioRepository = {

    // ─────────────────────────────────────────────
    // LECTURA (Búsqueda)
    // ─────────────────────────────────────────────

    async buscarPorCodigoBarras(codigo: string): Promise<Producto | null> {
        try {
            const results = await database.get<Producto>('productos')
                .query(Q.where('cod_barras', codigo.trim()))
                .fetch();
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error('[Repo] Error al buscar producto:', error);
            return null;
        }
    },

    // ─────────────────────────────────────────────
    // INVENTARIO (Lectura legado/compatibilidad)
    // ─────────────────────────────────────────────

    /**
     * @deprecated Usar WatermelonDB withObservables para tiempo real local.
     */
    suscribir(
        onUpdate: (datos: ProductoInventario[], fromCache: boolean) => void,
        onError: (error: any) => void
    ) {
        // Implementación mínima para evitar errores de compilación, 
        // pero se recomienda migrar a observables locales.
        return () => { };
    },

    // ─────────────────────────────────────────────
    // ACTUALIZACIÓN (Escritura)
    // ─────────────────────────────────────────────

    async actualizarProducto(
        codigoBarras: string,
        datos: Partial<ProductoInventario>,
        infoAuditoria?: {
            descripcion: string;
            marca: string;
            sku: string;
            fvAnteriorTs?: number;
            accion?: TipoAccionHistorial;
        }
    ): Promise<{ exito: boolean; webhookEncolado: boolean }> {
        try {
            const codigoLimpio = String(codigoBarras).trim();
            // 1. Registro de Auditoría Local — PRIORIDAD MÁXIMA (Local-First)
            if (infoAuditoria) {
                InventarioRepository.registrarMovimiento({
                    productoId: codigoLimpio,
                    descripcion: infoAuditoria.descripcion,
                    marca: infoAuditoria.marca,
                    sku: infoAuditoria.sku,
                    accion: infoAuditoria.accion ?? 'EDICION_COMPLETA',
                    cambios: {
                        fvAnteriorTs: infoAuditoria.fvAnteriorTs,
                        fvNuevoTs: datos.FV_Actual_TS ?? parseFVToTimestamp(datos.FV_Actual),
                        comentario: datos.Comentarios,
                    },
                }).catch(e => console.warn('[Audit] Error local:', e));
            }

            // 2. Persistencia en la Nube: Supabase
            // Mapeo a nombres de columnas de PostgreSQL
            const toUpsert = {
                id: codigoLimpio,
                stock_master: datos.Stock_Master,
                fv_actual_ts: datos.FV_Actual_TS ?? parseFVToTimestamp(datos.FV_Actual),
                fecha_edicion: datos.Fecha_edicion,
                comentarios: datos.Comentarios,
                updated_at: Date.now()
            };

            const { error: sbError } = await supabase
                .from('productos')
                .upsert(toUpsert);

            if (sbError) throw sbError;

            // 3. Sincronización Secundaria: Sheets Webhook (Proxy)
            const payload: WebhookPayload = {
                codigoBarras: codigoLimpio,
                nuevoStock: datos.Stock_Master,
                nuevoFV: datos.FV_Actual || (datos.FV_Actual_TS ? formatearFecha(datos.FV_Actual_TS) : undefined),
                nuevoFechaEdicion: datos.Fecha_edicion,
                nuevoComentario: datos.Comentarios,
            };

            const resWebhook = await InventarioRepository.enviarWebhook(payload);

            return {
                exito: true,
                webhookEncolado: !resWebhook.exito,
            };

        } catch (error) {
            console.error('[Repo] Error Fatal en Supabase:', error);
            return { exito: false, webhookEncolado: false };
        }
    },

    // ─────────────────────────────────────────────
    // HISTORIAL / AUDITORÍA (Local-First)
    // ─────────────────────────────────────────────

    async registrarMovimiento(entrada: Omit<EntradaHistorial, 'id' | 'timestamp' | 'dispositivo'>) {
        try {
            await database.write(async () => {
                await database.get<Movimiento>('movimientos').create((m: Movimiento) => {
                    m.productoId = entrada.productoId;
                    m.sku = entrada.sku;
                    m.descripcion = entrada.descripcion;
                    m.marca = entrada.marca;
                    m.accion = entrada.accion;
                    m.fvAnteriorTs = (entrada.cambios.fvAnteriorTs ? new Date(entrada.cambios.fvAnteriorTs) : undefined);
                    m.fvNuevoTs = (entrada.cambios.fvNuevoTs ? new Date(entrada.cambios.fvNuevoTs) : undefined);
                    m.comentario = entrada.cambios.comentario;
                    m.dispositivo = Platform.OS === 'ios' ? '📱 iPhone' : '🤖 Android';
                    m.timestamp = Date.now();
                });
                console.log('[Audit] Movimiento registrado con éxito en SQLite');
            });
        } catch (error) {
            console.error('[Repo] Error en SQLite History:', error);
        }
    },

    suscribirHistorial(onUpdate: (e: EntradaHistorial[]) => void, onError: (e: any) => void) {
        // Tarea 4.3: Manejado por withObservables en la UI
        return () => { };
    },

    // ─────────────────────────────────────────────
    // PUNTO DE ENTRADA PARA EL STORE (Lifecycle)
    // ─────────────────────────────────────────────

    async vaciarColaSync() {
        const q = JSON.parse(await AsyncStorage.getItem(WEBHOOK_QUEUE_KEY) || '[]');
        if (q.length === 0) return;

        const restantes: any[] = [];

        // Procesamiento en paralelo for mayor velocidad usando el método blindado
        const promesas = q.map(async (item: any) => {
            const res = await this.enviarWebhook(item);
            // Si la petición falla, regresamos el item a la cola de restantes
            if (!res.exito) {
                restantes.push(item);
            }
        });

        await Promise.all(promesas);
        await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify(restantes));
    },

    // ─────────────────────────────────────────────
    // COMUNICACIÓN EXTERNA (Webhook)
    // ─────────────────────────────────────────────
    async enviarWebhook(payload: WebhookPayload): Promise<{ exito: boolean }> {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', API_URL);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('Content-Type', 'application/json');

            xhr.onload = async () => {
                const rawText = xhr.responseText;
                if (!rawText.trim().startsWith('{')) {
                    await QueueService.encolar(payload);
                    resolve({ exito: false });
                    return;
                }
                try {
                    const json = JSON.parse(rawText);
                    if (json.status === 'success') {
                        QueueService.procesarCola().catch(() => { });
                        resolve({ exito: true });
                    } else {
                        await QueueService.encolar(payload);
                        resolve({ exito: false });
                    }
                } catch (e) {
                    await QueueService.encolar(payload);
                    resolve({ exito: false });
                }
            };
            xhr.onerror = async () => {
                await QueueService.encolar(payload);
                resolve({ exito: false });
            };
            xhr.send(JSON.stringify(payload));
        });
    },
};
