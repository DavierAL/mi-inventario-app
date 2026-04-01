// ARCHIVO: src/services/api.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProductoInventario, RespuestaAPI } from '../types/inventario';

const API_URL = 'https://script.google.com/macros/s/AKfycbyykgRWrpkmAedMW57GZWMQmIAs_Pu8XLRlS7EaIzViBLOH7FGQIqy3WY9_UMZPJfVIow/exec';

const CACHE_KEY_DATOS = 'inventario_cache_datos';
const CACHE_KEY_TIMESTAMP = 'inventario_cache_timestamp';

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

/**
 * Guarda los datos del inventario en el caché local.
 */
async function guardarEnCache(datos: ProductoInventario[]): Promise<void> {
    try {
        await AsyncStorage.setItem(CACHE_KEY_DATOS, JSON.stringify(datos));
        await AsyncStorage.setItem(CACHE_KEY_TIMESTAMP, String(Date.now()));
    } catch (e) {
        console.warn('No se pudo guardar el caché local:', e);
    }
}

/**
 * Lee el inventario desde el caché local.
 * Devuelve null si no hay caché o si ocurre un error.
 */
async function leerDesdeCache(): Promise<{ datos: ProductoInventario[]; lastSync: string } | null> {
    try {
        const datosJSON = await AsyncStorage.getItem(CACHE_KEY_DATOS);
        const timestampStr = await AsyncStorage.getItem(CACHE_KEY_TIMESTAMP);

        if (!datosJSON || !timestampStr) return null;

        const datos: ProductoInventario[] = JSON.parse(datosJSON);
        const lastSync = formatearTiempoTranscurrido(Number(timestampStr));
        return { datos, lastSync };
    } catch (e) {
        console.warn('No se pudo leer el caché local:', e);
        return null;
    }
}

/**
 * Obtiene el catálogo de productos.
 * Primero intenta la API. Si falla, usa el caché local.
 */
export const obtenerInventario = async (): Promise<{
    datos: ProductoInventario[];
    fromCache: boolean;
    lastSync?: string;
}> => {
    try {
        const respuesta = await fetch(`${API_URL}?action=leerInventario`);
        const json: RespuestaAPI = await respuesta.json();

        if (json.status === 'success' && json.data) {
            // Guardamos en caché para uso offline futuro
            await guardarEnCache(json.data);
            return { datos: json.data, fromCache: false };
        } else {
            throw new Error(json.message || 'Error desconocido al leer la base de datos');
        }
    } catch (error) {
        console.warn('Fallo la API, intentando caché local...', error);

        // Intentamos el caché offline
        const cache = await leerDesdeCache();
        if (cache) {
            return { datos: cache.datos, fromCache: true, lastSync: cache.lastSync };
        }

        // Sin API ni caché: lanzamos el error para que la UI lo muestre
        throw error;
    }
};

/**
 * Actualiza datos de un producto específico (Petición POST).
 * El stock queda excluido intencionalmente (se gestionará en un módulo aparte).
 */
export const actualizarProducto = async (
    codigoBarras: string,
    nuevoStock?: number,
    nuevoFV?: string,
    nuevoFechaEdicion?: string,
    nuevoComentario?: string
): Promise<{ exito: boolean; isNetworkError?: boolean }> => {
    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                accion: 'actualizarDatoManual',
                datos: {
                    codigoBarras,
                    nuevoStock,
                    nuevoFV,
                    nuevoFechaEdicion,
                    nuevoComentario,
                },
            }),
        });

        const json: RespuestaAPI = await respuesta.json();

        if (json.status === 'success') {
            return { exito: true };
        } else {
            console.error('Error del servidor:', json.message);
            return { exito: false };
        }
    } catch (error: any) {
        console.error('Error en actualizarProducto:', error);
        // Si fecth falla (por timeout o dns), tira exception "Network request failed"
        return { exito: false, isNetworkError: true };
    }
};