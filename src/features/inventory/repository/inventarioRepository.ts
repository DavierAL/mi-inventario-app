import { Platform } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../core/database';
import { QueueActions } from '../../../core/services/queue';
import { ProductoInventario, EntradaHistorial, TipoAccionHistorial } from '../../../core/types/inventario';
import Movimiento from '../../../core/database/models/Movimiento';
import Producto from '../../../core/database/models/Producto';
import { parseFVToTimestamp, parseFVToDate, formatearFecha } from '../../../core/utils/fecha';

/**
 * InventarioRepository — Director de Orquesta
 * 
 * Responsabilidad: Coordinar las operaciones de datos entre las capas de 
 * infraestructura siguiendo el principio Local-First.
 */
export const InventarioRepository = {

    async buscarPorCodigoBarras(codigo: string): Promise<Producto | null> {
        try {
            const queryCode = String(codigo).trim().toLowerCase();
            const results = await database.get<Producto>('productos')
                .query(
                    Q.where('cod_barras', Q.like(`${queryCode}%`))
                )
                .fetch();
            
            // Si no hay resultados exactos con like, intentamos búsqueda exacta normal por si acaso
            if (results.length === 0) {
                const exactResults = await database.get<Producto>('productos')
                    .query(Q.where('cod_barras', queryCode))
                    .fetch();
                return exactResults.length > 0 ? exactResults[0] : null;
            }

            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error('[Repo] Error al buscar producto:', error);
            return null;
        }
    },

    /**
     * Actualiza un producto siguiendo el flujo Local-First:
     * 1. Escribe en SQLite (WatermelonDB).
     * 2. Registra el movimiento de auditoría en SQLite.
     * 3. El motor de sincronización se encargará de subir los cambios a la nube.
     */
    async actualizarProducto(
        codigoBarras: string,
        datos: Partial<ProductoInventario>,
        infoAuditoria?: {
            descripcion: string;
            marca: string;
            sku: string;
            fvAnteriorTs?: number;
            accion?: TipoAccionHistorial;
            rolUsuario?: string;
        }
    ): Promise<{ exito: boolean; webhookEncolado: boolean }> {
        try {
            const codigoLimpio = String(codigoBarras).trim();
            
            // 1. Persistencia Local (WatermelonDB) — FUENTE DE VERDAD
            await database.write(async () => {
                const p = await InventarioRepository.buscarPorCodigoBarras(codigoLimpio);
                if (p) {
                    await p.update(record => {
                        if (datos.Stock_Master !== undefined) record.stockMaster = datos.Stock_Master;
                        if (datos.FV_Actual_TS !== undefined) record.fvActualTs = new Date(datos.FV_Actual_TS);
                        else record.fvActualTs = parseFVToDate(datos.FV_Actual);
                        
                        if (datos.Fecha_edicion) record.fechaEdicion = datos.Fecha_edicion;
                        if (datos.Comentarios) record.comentarios = datos.Comentarios;
                        record.updatedAt = Date.now();
                    });
                }
            });

            // 2. Registro de Auditoría Local
            if (infoAuditoria) {
                await InventarioRepository.registrarMovimiento({
                    productoId: codigoLimpio,
                    descripcion: infoAuditoria.descripcion,
                    marca: infoAuditoria.marca,
                    sku: infoAuditoria.sku,
                    accion: infoAuditoria.accion ?? 'EDICION_COMPLETA',
                    cambios: {
                        fvAnteriorTs: infoAuditoria.fvAnteriorTs,
                        fvNuevoTs: datos.FV_Actual_TS ?? (datos.FV_Actual ? parseFVToTimestamp(datos.FV_Actual) : undefined),
                        comentario: datos.Comentarios,
                    },
                    rolUsuario: infoAuditoria.rolUsuario
                });
            }

            // 3. Notificación inmediata (Opcional, el SyncService lo hará eventualmente, 
            // pero para Sheets a veces se prefiere el webhook directo para disparar otros procesos)
            const payload = {
                codigoBarras: codigoLimpio,
                nuevoStock: datos.Stock_Master,
                nuevoFV: datos.FV_Actual || (datos.FV_Actual_TS ? formatearFecha(datos.FV_Actual_TS) : undefined),
                nuevoFechaEdicion: datos.Fecha_edicion,
                nuevoComentario: datos.Comentarios,
            };
            
            // Encolamos para el proxy de Sheets
            QueueActions.enqueueWebhook(payload).catch(() => {});

            return { exito: true, webhookEncolado: true };

        } catch (error) {
            console.error('[Repo] Error Fatal en Actualización:', error);
            return { exito: false, webhookEncolado: false };
        }
    },

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
                    m.rolUsuario = entrada.rolUsuario;
                });
            });
        } catch (error) {
            console.error('[Repo] Error en SQLite History:', error);
        }
    }
};
