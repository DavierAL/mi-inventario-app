// ARCHIVO: src/repositories/inventarioRepository.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, onSnapshot, doc, setDoc, query, addDoc, orderBy, limit } from 'firebase/firestore';
import { Platform } from 'react-native';
import { dbFirebase } from '../services/firebase';
import { ProductoInventario, EntradaHistorial, TipoAccionHistorial } from '../types/inventario';

const API_URL = 'https://script.google.com/macros/s/AKfycbzzR_MZN7wCGawPkKCHgVawMVEiMqX-l52tZEBFiJ9W-e2TbAcna66XPEIyj8pYuq279Q/exec';
const WEBHOOK_QUEUE_KEY = '@webhook_queue_mascotify';
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
     * Actualiza un producto.
     * @returns Éxito si Firebase se actualiza. Los fallos del Webhook NO fallan la operación principal.
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

            // 1. Persistencia Primaria: Firebase (SDK Offline manejado automáticamente)
            await setDoc(ref, datos, { merge: true });

            // 2. Registro de Auditoría (Línea de tiempo) - Fire and forget
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
            const payload = {
                codigoBarras: codigoLimpio,
                nuevoStock: datos.Stock_Master,
                nuevoFV: datos.FV_Actual,
                nuevoFechaEdicion: datos.Fecha_edicion,
                nuevoComentario: datos.Comentarios,
            };

            const resWebhook = await this.enviarWebhook(payload);

            return { 
                exito: true, 
                webhookEncolado: resWebhook.isNetworkError || !resWebhook.exito 
            };

        } catch (error) {
            console.error('[Repo] Error Fatal:', error);
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
    // COMUNICACIÓN EXTERNA (Webhook)
    // ─────────────────────────────────────────────

    async enviarWebhook(payload: any): Promise<{ exito: boolean; isNetworkError: boolean }> {
        try {
            const respuesta = await fetch(API_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: { 'Accept': 'application/json', 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ accion: 'webhook_modificacion', datos: payload, token: AUTH_TOKEN }),
            });

            const rawText = await respuesta.text();
            
            // Si la respuesta no empieza por '{', es un error de texto (App Script Error)
            if (!rawText.trim().startsWith('{')) {
                console.warn('[Webhook] Error en Servidor (No JSON):', rawText);
                await this.encolarWebhook(payload); // Lo encolamos por si acaso fue un error temporal
                return { exito: false, isNetworkError: false };
            }

            const json = JSON.parse(rawText);
            if (json.status === 'success') {
                this.vaciarColaSync();
                return { exito: true, isNetworkError: false };
            }

            console.warn('[Webhook] Respuesta Negativa:', json);
            return { exito: false, isNetworkError: false };

        } catch (error: any) {
            const esRed = error.message?.includes('Network') || error.message?.includes('fetch');
            if (esRed) await this.encolarWebhook(payload);
            return { exito: false, isNetworkError: esRed };
        }
    },

    async encolarWebhook(p: any) {
        const q = JSON.parse(await AsyncStorage.getItem(WEBHOOK_QUEUE_KEY) || '[]');
        q.push(p);
        await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify(q));
    },

    async vaciarColaSync() {
        const q = JSON.parse(await AsyncStorage.getItem(WEBHOOK_QUEUE_KEY) || '[]');
        if (q.length === 0) return;

        const restantes = [];
        for (const item of q) {
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ accion: 'webhook_modificacion', datos: item, token: AUTH_TOKEN }),
                });
                const txt = await res.text();
                if (!txt.includes('"status":"success"')) restantes.push(item);
            } catch { restantes.push(item); }
        }
        await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify(restantes));
    }
};
