// ARCHIVO: src/repositories/inventarioRepository.ts
/**
 * InventarioRepository — Director de Orquesta
 * 
 * Responsabilidad: Coordinar las operaciones de datos entre las capas de 
 * infraestructura sin implementar los detalles de ninguna.
 * 
 * Sabe QUÉ hacer, pero delega el CÓMO a:
 *   - Firebase SDK:     Persistencia primaria (online/offline)
 *   - QueueService:     Cola de webhooks fallidos (AsyncStorage)
 *   - Webhook endpoint: Sincronización secundaria con Google Sheets
 */
import { collection, onSnapshot, doc, setDoc, query, addDoc, orderBy, limit } from 'firebase/firestore';
import { Platform } from 'react-native';
import { dbFirebase } from '../services/firebase';
import { QueueService, WebhookPayload } from '../services/QueueService';
import { ProductoInventario, EntradaHistorial, TipoAccionHistorial } from '../types/inventario';

const API_URL = 'https://script.google.com/macros/s/AKfycbzzR_MZN7wCGawPkKCHgVawMVEiMqX-l52tZEBFiJ9W-e2TbAcna66XPEIyj8pYuq279Q/exec';
const AUTH_TOKEN = 'MASCOTIFY_SECURE_TOKEN_2026';

export const InventarioRepository = {

    // ─────────────────────────────────────────────
    // INVENTARIO (Lectura)
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

    /**
     * Actualiza un producto en todas las capas de persistencia.
     * 
     * Flujo:
     * 1. Firebase → Persistencia primaria (garantía offline del SDK)
     * 2. Audit log  → Fire and forget (no bloquea la operación)
     * 3. Webhook    → Sincronización con Sheets (delega fallo al QueueService)
     * 
     * @returns { exito: boolean; webhookEncolado: boolean }
     *   - exito: false SOLO si Firebase falló (error catastrófico)
     *   - webhookEncolado: true si Sheets falló y el payload está en cola offline
     */
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

    /**
     * Delega el procesamiento de la cola pendiente al QueueService.
     * Llamado al iniciar la app cuando hay conectividad.
     */
    async vaciarColaSync(): Promise<void> {
        await QueueService.procesarCola();
    },

    // ─────────────────────────────────────────────
    // COMUNICACIÓN EXTERNA (Privado — solo para uso interno del Repo)
    // ─────────────────────────────────────────────

    /**
     * Intenta enviar el webhook a Sheets. Si falla por red, delega el
     * almacenamiento al QueueService. El Repo no sabe CÓMO se almacena.
     * @private
     */
    async _enviarWebhook(payload: WebhookPayload): Promise<{ exito: boolean }> {
        try {
            const respuesta = await fetch(API_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'text/plain;charset=utf-8',
                    'X-Auth-Token': AUTH_TOKEN,
                },
                body: JSON.stringify({ accion: 'webhook_modificacion', datos: payload, token: AUTH_TOKEN }),
            });

            const rawText = await respuesta.text();

            // Respuesta no-JSON = error del App Script
            if (!rawText.trim().startsWith('{')) {
                console.warn('[Webhook] Error en servidor (no JSON):', rawText);
                await QueueService.encolar(payload);
                return { exito: false };
            }

            const json = JSON.parse(rawText);
            if (json.status === 'success') {
                // Éxito: aprovechamos para vaciar items pendientes en background
                QueueService.procesarCola().catch(e => console.warn('[Queue] Error auto-procesando:', e));
                return { exito: true };
            }

            console.warn('[Webhook] Respuesta negativa del servidor:', json);
            await QueueService.encolar(payload);
            return { exito: false };

        } catch (error: any) {
            const esRed = error.message?.includes('Network') || error.message?.includes('fetch');
            if (esRed) {
                await QueueService.encolar(payload);
            }
            return { exito: false };
        }
    },
};
