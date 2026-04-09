// ARCHIVO: src/repositories/inventarioRepository.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, onSnapshot, doc, setDoc, query, addDoc, orderBy, limit } from 'firebase/firestore';
import { Platform } from 'react-native';
import { dbFirebase } from '../services/firebase';
import { ProductoInventario, EntradaHistorial, TipoAccionHistorial } from '../types/inventario';

const API_URL = 'https://script.google.com/macros/s/AKfycbzzR_MZN7wCGawPkKCHgVawMVEiMqX-l52tZEBFiJ9W-e2TbAcna66XPEIyj8pYuq279Q/exec';
const WEBHOOK_QUEUE_KEY = '@webhook_queue_mascotify';
const AUTH_TOKEN = 'MASCOTIFY_SECURE_TOKEN_2026';

/**
 * Patrón Repositorio: Centraliza el acceso a datos.
 * Desacopla la lógica de Firebase/Sheets del estado global (Zustand).
 */
export const InventarioRepository = {

    // ─────────────────────────────────────────────
    // INVENTARIO
    // ─────────────────────────────────────────────

    /** Suscripción en tiempo real al inventario de productos. */
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

    /**
     * Actualización dual (Firebase + Webhook Sheets) con registro automático en historial.
     * @param infoProducto - Si se provee, registra la entrada en el historial.
     */
    async actualizarProducto(
        codigoBarras: string,
        datos: Partial<ProductoInventario>,
        infoProducto?: {
            descripcion: string;
            marca: string;
            sku: string;
            fvAnterior?: string;
            accion?: TipoAccionHistorial;
        }
    ): Promise<{ exito: boolean; isNetworkError?: boolean }> {
        try {
            const ref = doc(dbFirebase, 'productos', String(codigoBarras).trim());

            // 1. Persistencia Inmediata en Firebase (Offline-first)
            await setDoc(ref, datos, { merge: true });

            // 2. Registrar en historial (fire-and-forget, no bloquea el flujo)
            if (infoProducto) {
                this.registrarMovimiento({
                    productoId: codigoBarras,
                    descripcion: infoProducto.descripcion,
                    marca: infoProducto.marca,
                    sku: infoProducto.sku,
                    accion: infoProducto.accion ?? 'EDICION_COMPLETA',
                    cambios: {
                        fvAnterior: infoProducto.fvAnterior,
                        fvNuevo: datos.FV_Actual,
                        comentario: datos.Comentarios,
                    },
                }).catch(e => console.warn('[Historial] No se pudo registrar:', e));
            }

            // 3. Sincronización con Google Sheets via Webhook
            const payload = {
                codigoBarras,
                nuevoStock: datos.Stock_Master,
                nuevoFV: datos.FV_Actual,
                nuevoFechaEdicion: datos.Fecha_edicion,
                nuevoComentario: datos.Comentarios,
            };

            return await this.enviarWebhook(payload);
        } catch (error) {
            console.error('[Repositorio] Error en actualizarProducto:', error);
            return { exito: false, isNetworkError: false };
        }
    },

    // ─────────────────────────────────────────────
    // HISTORIAL DE AUDITORÍA
    // ─────────────────────────────────────────────

    /**
     * Registra un movimiento en la colección 'historial' de Firestore.
     * Se llama automáticamente desde actualizarProducto() con fire-and-forget.
     */
    async registrarMovimiento(
        entrada: Omit<EntradaHistorial, 'id' | 'timestamp' | 'dispositivo'>
    ): Promise<void> {
        const documento = {
            ...entrada,
            timestamp: Date.now(),
            dispositivo: Platform.OS === 'ios' ? '📱 iPhone' : '🤖 Android',
        };
        await addDoc(collection(dbFirebase, 'historial'), documento);
    },

    /**
     * Suscripción en tiempo real a los últimos 50 movimientos del historial.
     * Ordenados por timestamp descendente (más reciente primero).
     */
    suscribirHistorial(
        onUpdate: (entradas: EntradaHistorial[]) => void,
        onError: (error: any) => void
    ) {
        const q = query(
            collection(dbFirebase, 'historial'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        return onSnapshot(q, (snapshot) => {
            const entradas: EntradaHistorial[] = snapshot.docs.map(d => ({
                id: d.id,
                ...(d.data() as Omit<EntradaHistorial, 'id'>),
            }));
            onUpdate(entradas);
        }, onError);
    },

    // ─────────────────────────────────────────────
    // WEBHOOK GOOGLE SHEETS (con cola offline)
    // ─────────────────────────────────────────────

    async enviarWebhook(payload: any): Promise<{ exito: boolean; isNetworkError?: boolean }> {
        try {
            const respuesta = await fetch(API_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({ accion: 'webhook_modificacion', datos: payload, token: AUTH_TOKEN }),
            });

            const json = JSON.parse(await respuesta.text());
            if (json.status === 'success') {
                this.vaciarColaSync();
                return { exito: true };
            }
            return { exito: false };
        } catch (error: any) {
            const isNetwork = error.message?.includes('Network') || error.message?.includes('fetch');
            if (isNetwork) {
                await this.encolarWebhook(payload);
                return { exito: false, isNetworkError: true };
            }
            return { exito: false };
        }
    },

    async encolarWebhook(payload: any): Promise<void> {
        const queueStr = await AsyncStorage.getItem(WEBHOOK_QUEUE_KEY) || '[]';
        const cola = JSON.parse(queueStr);
        cola.push(payload);
        await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify(cola));
    },

    async vaciarColaSync(): Promise<void> {
        try {
            const queueStr = await AsyncStorage.getItem(WEBHOOK_QUEUE_KEY);
            if (!queueStr) return;

            let cola = JSON.parse(queueStr);
            if (!Array.isArray(cola) || cola.length === 0) return;

            const restantes = [];
            for (const item of cola) {
                try {
                    const res = await fetch(API_URL, {
                        method: 'POST',
                        redirect: 'follow',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'text/plain;charset=utf-8',
                            'X-Auth-Token': AUTH_TOKEN,
                        },
                        body: JSON.stringify({ accion: 'webhook_modificacion', datos: item, token: AUTH_TOKEN }),
                    });
                    const json = JSON.parse(await res.text());
                    if (json.status !== 'success') restantes.push(item);
                } catch {
                    restantes.push(item);
                }
            }
            await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify(restantes));
        } catch (err) {
            console.error('[Repositorio] Error vaciando cola:', err);
        }
    },
};
