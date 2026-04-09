// ARCHIVO: src/core/services/QueueService.ts
/**
 * QueueService — Responsabilidad Única: Gestión de la cola offline
 * 
 * Este servicio es el ÚNICO que conoce AsyncStorage y la estructura
 * de la cola de webhooks pendientes. El Repositorio solo le habla a través
 * de su API pública, sin saber cómo funciona internamente.
 * 
 * Principio: Single Responsibility (SRP)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEBHOOK_QUEUE_KEY = '@webhook_queue_mascotify';

const getApiUrl = () => process.env.EXPO_PUBLIC_API_URL || '';
const getAuthToken = () => process.env.EXPO_PUBLIC_AUTH_TOKEN || '';

export interface WebhookPayload {
    codigoBarras: string;
    nuevoStock?: number;
    nuevoFV?: string;
    nuevoFechaEdicion?: string;
    nuevoComentario?: string;
}

export const QueueService = {

    /**
     * Agrega un payload fallido al final de la cola persistente.
     */
    async encolar(payload: WebhookPayload): Promise<void> {
        try {
            const colaActual = await this.leer();
            colaActual.push(payload);
            await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify(colaActual));
            console.log(`[Queue] Item encolado. Cola total: ${colaActual.length}`);
        } catch (error) {
            console.error('[Queue] Error crítico al encolar:', error);
        }
    },

    /**
     * Lee todos los items pendientes de la cola.
     */
    async leer(): Promise<WebhookPayload[]> {
        try {
            const raw = await AsyncStorage.getItem(WEBHOOK_QUEUE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (error) {
            console.error('[Queue] Error al leer la cola:', error);
            return [];
        }
    },

    /**
     * Retorna cuántos items hay pendientes en la cola.
     */
    async contarPendientes(): Promise<number> {
        const cola = await this.leer();
        return cola.length;
    },

    /**
     * Intenta enviar todos los items pendientes al servidor.
     * Los items que fallen permanecen en la cola.
     * @returns El número de items que continúan pendientes.
     */
    async procesarCola(): Promise<number> {
        const cola = await this.leer();
        if (cola.length === 0) return 0;

        console.log(`[Queue] Procesando ${cola.length} item(s) pendiente(s)...`);
        const restantes: WebhookPayload[] = [];

        for (const item of cola) {
            const enviado = await this._intentarEnvio(item);
            if (!enviado) {
                restantes.push(item);
            }
        }

        await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify(restantes));

        if (restantes.length < cola.length) {
            console.log(`[Queue] ${cola.length - restantes.length} item(s) sincronizado(s). ${restantes.length} pendiente(s).`);
        }

        return restantes.length;
    },

    /**
     * Limpia la cola por completo (solo usar si el servidor confirma).
     * @internal
     */
    async vaciar(): Promise<void> {
        await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify([]));
    },

    /**
     * Intenta enviar un único payload al webhook remoto.
     * @returns true si el envío fue un éxito, false si debe reintentarse.
     * @private
     */
    async _intentarEnvio(payload: WebhookPayload): Promise<boolean> {
        try {
            const res = await fetch(getApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                    'X-Auth-Token': getAuthToken(),
                },
                body: JSON.stringify({ accion: 'webhook_modificacion', datos: payload, token: getAuthToken() }),
            });
            const txt = await res.text();
            return txt.includes('"status":"success"');
        } catch {
            return false; // Error de red, permanece en la cola
        }
    },
};
