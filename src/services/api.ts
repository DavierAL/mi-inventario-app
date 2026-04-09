// ARCHIVO: src/services/api.ts
import { ProductoInventario } from '../types/inventario';
import { dbFirebase } from './firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

/**
 * Formatea la diferencia de tiempo entre ahora y una fecha dada en texto legible.
 */
function formatearTiempoTranscurrido(timestamp: number): string {
    const ahora = Date.now();
    const diffMs = ahora - timestamp;
    const diffMinutos = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutos < 1) return 'hace un momento';
    if (diffMinutos < 60) return `hace ${diffMinutos} min`;
    if (diffHoras < 24) return `hace ${diffHoras} h`;
    return `hace ${diffDias} día(s)`;
}

// Servicios de API centralizada de Firestore y Webhooks

/**
 * Obtiene el catálogo de productos desde Firestore.
 * Gracias al caché persistente de Firebase, si no hay internet leerá de IndexedDB transparente.
 */
export const obtenerInventario = async (): Promise<{
    datos: ProductoInventario[];
    fromCache: boolean;
    lastSync?: string;
}> => {
    try {
        const querySnapshot = await getDocs(collection(dbFirebase, 'productos'));
        const datos: ProductoInventario[] = [];
        
        querySnapshot.forEach((doc) => {
            datos.push(doc.data() as ProductoInventario);
        });

        // NOTA: Firebase maneja su propio caché, falseamos fromCache y lastSync a nivel UI
        // para simplificar nuestro Zustand ya que Firestore garantiza "eventual consistency".
        return { 
            datos, 
            fromCache: querySnapshot.metadata.fromCache 
        };
    } catch (error) {
        console.error('Fallo al leer Firestore', error);
        throw error;
    }
};

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://script.google.com/macros/s/AKfycbzzR_MZN7wCGawPkKCHgVawMVEiMqX-l52tZEBFiJ9W-e2TbAcna66XPEIyj8pYuq279Q/exec';
const WEBHOOK_QUEUE_KEY = '@webhook_queue_mascotify';

export const vaciarColaWebhooks = async () => {
    try {
        const queueStr = await AsyncStorage.getItem(WEBHOOK_QUEUE_KEY);
        if (!queueStr) return;
        
        let cola = JSON.parse(queueStr);
        if (!Array.isArray(cola) || cola.length === 0) return;

        console.log(`Despachando cola de Webhooks: ${cola.length} pendientes...`);
        let restantes = [];
        
        for (const item of cola) {
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    redirect: 'follow',
                    headers: { 'Accept': 'application/json', 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ accion: 'webhook_modificacion', datos: item }),
                });
                
                const responseText = await res.text();
                let json = JSON.parse(responseText);
                if (json.status !== 'success') {
                    console.error('Error procesando webhook de cola:', json.message);
                }
            } catch (e) {
                // Si vuelve a fallar la red, lo conservamos.
                restantes.push(item);
            }
        }
        
        await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify(restantes));
    } catch(err) {
        console.error("Fallo vaciando cola de webhooks", err);
    }
};

/**
 * Actualiza datos de un producto específico.
 * PASO 1: Guarda en Firebase local (Milisegundos, protección Offline nativa).
 * PASO 2: Dispara Webhook directo a Google Sheets. (Detecta caídas de red para la cola externa).
 */
export const actualizarProducto = async (
    codigoBarras: string,
    nuevoStock?: number,
    nuevoFV?: string,
    nuevoFechaEdicion?: string,
    nuevoComentario?: string
): Promise<{ exito: boolean; isNetworkError?: boolean }> => {
    try {
        const ref = doc(dbFirebase, 'productos', String(codigoBarras).trim());
        
        const updateData: any = {};
        if (nuevoFV !== undefined) updateData.FV_Actual = nuevoFV;
        if (nuevoFechaEdicion !== undefined) updateData.Fecha_edicion = nuevoFechaEdicion;
        if (nuevoComentario !== undefined) updateData.Comentarios = nuevoComentario;
        if (nuevoStock !== undefined) updateData.Stock_Master = nuevoStock;

        // 1. Guardado Inmediato Firebase (Offline-first garantizado)
        await setDoc(ref, updateData, { merge: true });

        const payloadWebhook = { codigoBarras, nuevoStock, nuevoFV, nuevoFechaEdicion, nuevoComentario };

        // 2. Notificación Directa a Excel (Webhook)
        try {
            const respuesta = await fetch(API_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    accion: 'webhook_modificacion',
                    datos: payloadWebhook,
                }),
            });
            
            const responseText = await respuesta.text();
            let json = JSON.parse(responseText);
            if (json.status !== 'success') {
                 console.error('Error del webhook:', json.message);
            }
            // Si funciona, de paso vaciamos correos viejos
            vaciarColaWebhooks();
        } catch (fetchError: any) {
            const isNetwork = fetchError.message === 'Aborted' || fetchError.message?.includes('Network') || fetchError.message?.includes('fetch') || fetchError.message?.includes('OKHTTP');
            if (isNetwork) {
                 // GUARDAMOS EN UNA COLA SECRETA EL WEBHOOK FALLIDO
                 const queueStr = await AsyncStorage.getItem(WEBHOOK_QUEUE_KEY) || '[]';
                 const cola = JSON.parse(queueStr);
                 cola.push(payloadWebhook);
                 await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify(cola));
                 
                 return { exito: false, isNetworkError: true };
            } else {
                 return { exito: false, isNetworkError: false };
            }
        }

        return { exito: true };
    } catch (error: any) {
        console.error('Error Crítico en actualizarProducto Firebase:', error.message);
        return { exito: false, isNetworkError: false };
    }
};