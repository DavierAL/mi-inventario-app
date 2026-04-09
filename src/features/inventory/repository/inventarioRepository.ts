// ARCHIVO: src/features/inventory/repository/inventarioRepository.ts
/**
 * InventarioRepository — Director de Orquesta
 * 
 * Responsabilidad: Coordinar las operaciones de datos entre las capas de 
 * infraestructura sin implementar los detalles de ninguna.
 */
import { collection, onSnapshot, doc, setDoc, query, addDoc, orderBy, limit } from 'firebase/firestore';
import { Platform } from 'react-native';
import { dbFirebase } from '../../../core/database/firebase';
import { QueueService, WebhookPayload } from '../../../core/services/QueueService';
import { ProductoInventario, EntradaHistorial, TipoAccionHistorial } from '../../../core/types/inventario';

const API_URL = 'https://script.google.com/macros/s/AKfycbzzR_MZN7wCGawPkKCHgVawMVEiMqX-l52tZEBFiJ9W-e2TbAcna66XPEIyj8pYuq279Q/exec';
const AUTH_TOKEN = 'MASCOTIFY_SECURE_TOKEN_2026';


export const InventarioRepository = {

    // ─────────────────────────────────────────────
    // INVENTARIO (Lectura con límite de seguridad)
    // ─────────────────────────────────────────────

    suscribir(
        onUpdate: (datos: ProductoInventario[], fromCache: boolean) => void,
        onError: (error: any) => void
    ) {
        const q = query(
            collection(dbFirebase, 'productos')
        );
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

            // 2. Registro de Auditoría — Fire and forget
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

            const resWebhook = await this._enviarWebhook(payload);

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
    // HISTORIAL / AUDITORÍA
    // ─────────────────────────────────────────────

    async registrarMovimiento(entrada: Omit<EntradaHistorial, 'id' | 'timestamp' | 'dispositivo'>) {
        const docHistorial = {
            ...entrada,
            timestamp: Date.now(),
            dispositivo: Platform.OS === 'ios' ? '📱 iPhone' : '🤖 Android',
        };
        await addDoc(collection(dbFirebase, 'historial'), docHistorial);
    },

    suscribirHistorial(onUpdate: (e: EntradaHistorial[]) => void, onError: (e: any) => void) {
        const q = query(collection(dbFirebase, 'historial'), orderBy('timestamp', 'desc'), limit(50));
        return onSnapshot(q, snap => {
            onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as EntradaHistorial)));
        }, onError);
    },

    // ─────────────────────────────────────────────
    // PUNTO DE ENTRADA PARA EL STORE (Lifecycle)
    // ─────────────────────────────────────────────

    async vaciarColaSync(): Promise<void> {
        await QueueService.procesarCola();
    },

    // ─────────────────────────────────────────────
    // COMUNICACIÓN EXTERNA (Privado)
    // ─────────────────────────────────────────────

    // ─────────────────────────────────────────────
    // COMUNICACIÓN EXTERNA (Webhook) - VERSIÓN BLINDADA PARA APK
    // ─────────────────────────────────────────────
    async _enviarWebhook(payload: WebhookPayload): Promise<{ exito: boolean }> {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', API_URL);
            
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
            xhr.setRequestHeader('X-Auth-Token', AUTH_TOKEN);

            xhr.onload = async () => {
                const rawText = xhr.responseText;
                
                if (!rawText.trim().startsWith('{')) {
                    console.warn('[Webhook] Error en Servidor (no JSON):', rawText);
                    await QueueService.encolar(payload); 
                    resolve({ exito: false });
                    return;
                }

                try {
                    const json = JSON.parse(rawText);
                    if (json.status === 'success') {
                        // Al tener éxito, intentamos procesar el resto de la cola
                        QueueService.procesarCola().catch(e => console.warn('[Queue] Error auto-procesando:', e));
                        resolve({ exito: true });
                    } else {
                        console.warn('[Webhook] Respuesta negativa del servidor:', json);
                        await QueueService.encolar(payload);
                        resolve({ exito: false });
                    }
                } catch (e) {
                    await QueueService.encolar(payload);
                    resolve({ exito: false });
                }
            };

            xhr.onerror = async () => {
                // Error de red (offline), encolamos
                await QueueService.encolar(payload);
                resolve({ exito: false });
            };

            xhr.send(JSON.stringify({ 
                accion: 'webhook_modificacion', 
                datos: payload, 
                token: AUTH_TOKEN 
            }));
        });
    },
};
