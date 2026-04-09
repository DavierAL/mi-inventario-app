import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProductoInventario } from '../types/inventario';
import { dbFirebase } from './firebase';
import { collection, onSnapshot, doc, setDoc, query } from 'firebase/firestore';

const API_URL = 'https://script.google.com/macros/s/AKfycbzzR_MZN7wCGawPkKCHgVawMVEiMqX-l52tZEBFiJ9W-e2TbAcna66XPEIyj8pYuq279Q/exec';
const WEBHOOK_QUEUE_KEY = '@webhook_queue_mascotify';
const AUTH_TOKEN = 'MASCOTIFY_SECURE_TOKEN_2026'; // Token de validación simple

/**
 * Crea una suscripción en tiempo real al inventario.
 * Firebase solo descargará los cambios (Delta Sync), ahorrando un 95% en costos de lectura.
 */
export const suscribirAInventario = (
    onUpdate: (datos: ProductoInventario[], fromCache: boolean) => void,
    onError: (error: any) => void
) => {
    const q = query(collection(dbFirebase, 'productos'));
    
    return onSnapshot(q, (snapshot) => {
        const datos: ProductoInventario[] = [];
        snapshot.forEach((doc) => {
            datos.push(doc.data() as ProductoInventario);
        });
        
        onUpdate(datos, snapshot.metadata.fromCache);
    }, (error) => {
        console.error('Error en Listener Real-Time:', error);
        onError(error);
    });
};

// Servicios de API centralizada de Firestore y Webhooks

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
                    headers: { 
                        'Accept': 'application/json', 
                        'Content-Type': 'text/plain;charset=utf-8',
                        'X-Auth-Token': AUTH_TOKEN 
                    },
                    body: JSON.stringify({ accion: 'webhook_modificacion', datos: item, token: AUTH_TOKEN }),
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
                    token: AUTH_TOKEN
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