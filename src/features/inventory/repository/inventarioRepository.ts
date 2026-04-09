import { collection, onSnapshot, doc, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbFirebase } from '../../../core/database/firebase';
import { QueueService, WebhookPayload } from '../../../core/services/QueueService';
import { ProductoInventario, EntradaHistorial, TipoAccionHistorial } from '../../../core/types/inventario';
import { database } from '../../../core/database';
import Movimiento from '../../../core/database/models/Movimiento';

const API_URL = process.env.EXPO_PUBLIC_SHEETS_WEBHOOK_URL || '';
const AUTH_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN || '';
const WEBHOOK_QUEUE_KEY = '@webhook_queue_mascotify';

/**
 * InventarioRepository — Director de Orquesta
 * 
 * Responsabilidad: Coordinar las operaciones de datos entre las capas de 
 * infraestructura sin implementar los detalles de ninguna.
 */
export const InventarioRepository = {

    // ─────────────────────────────────────────────
    // INVENTARIO (Lectura legado/compatibilidad)
    // ─────────────────────────────────────────────

    suscribir(
        onUpdate: (datos: ProductoInventario[], fromCache: boolean) => void,
        onError: (error: any) => void
    ) {
        const q = query(collection(dbFirebase, 'productos'));
        return onSnapshot(q, (snapshot) => {
            const datos: ProductoInventario[] = [];
            snapshot.forEach((d) => datos.push(d.data() as ProductoInventario));
            onUpdate(datos, snapshot.metadata.fromCache);
        }, onError);
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
            fvAnterior?: string;
            accion?: TipoAccionHistorial;
        }
    ): Promise<{ exito: boolean; webhookEncolado: boolean }> {
        try {
            const codigoLimpio = String(codigoBarras).trim();
            const ref = doc(dbFirebase, 'productos', codigoLimpio);

            // 1. Persistencia Primaria: Firebase
            await setDoc(ref, datos, { merge: true });

            // 2. Registro de Auditoría — Local-First
            if (infoAuditoria) {
                this.registrarMovimiento({
                    productoId: codigoLimpio,
                    descripcion: infoAuditoria.descripcion,
                    marca: infoAuditoria.marca,
                    sku: infoAuditoria.sku,
                    accion: infoAuditoria.accion ?? 'EDICION_COMPLETA',
                    cambios: {
                        fvAnterior: infoAuditoria.fvAnterior,
                        fvNuevo: datos.FV_Actual,
                        comentario: datos.Comentarios,
                    },
                }).catch(e => console.warn('[Audit] Error:', e));
            }

            // 3. Sincronización Secundaria: Sheets Webhook
            const payload: WebhookPayload = {
                codigoBarras: codigoLimpio,
                nuevoStock: datos.Stock_Master,
                nuevoFV: datos.FV_Actual,
                nuevoFechaEdicion: datos.Fecha_edicion,
                nuevoComentario: datos.Comentarios,
            };

            const resWebhook = await this.enviarWebhook(payload);

            return {
                exito: true,
                webhookEncolado: !resWebhook.exito,
            };

        } catch (error) {
            console.error('[Repo] Error Fatal en Firebase:', error);
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
                    m.fvAnterior = entrada.cambios.fvAnterior;
                    m.fvNuevo = entrada.cambios.fvNuevo;
                    m.comentario = entrada.cambios.comentario;
                    m.dispositivo = Platform.OS === 'ios' ? '📱 iPhone' : '🤖 Android';
                });
            });
        } catch (error) {
            console.error('[Repo] Error en SQLite History:', error);
        }
    },

    suscribirHistorial(onUpdate: (e: EntradaHistorial[]) => void, onError: (e: any) => void) {
        // Tarea 4.3: Manejado por withObservables en la UI
        return () => {}; 
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
            xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
            xhr.setRequestHeader('X-Auth-Token', AUTH_TOKEN);

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
                        QueueService.procesarCola().catch(() => {});
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
            xhr.send(JSON.stringify({ accion: 'webhook_modificacion', datos: payload, token: AUTH_TOKEN }));
        });
    },
};
