// ARCHIVO: src/services/api.ts

import { ProductoInventario, RespuestaAPI } from '../types/inventario';
import { guardarCatalogoEnDB, leerCatalogoDesdeDB, initDB } from './db';

const API_URL = 'https://script.google.com/macros/s/AKfycbyykgRWrpkmAedMW57GZWMQmIAs_Pu8XLRlS7EaIzViBLOH7FGQIqy3WY9_UMZPJfVIow/exec';

// Inicializar la DB nada más cargar el módulo
initDB().catch(e => console.error("Fallo al inicializar DB nativa", e));

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

// AsyncStorage helpers removidos (Reemplazados por SQLite)

/**
 * Obtiene el catálogo de productos.
 * Primero intenta la API. Si falla, usa la Base de Datos local.
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
            // Guardamos velozmente masivo con SQLite
            await guardarCatalogoEnDB(json.data);
            return { datos: json.data, fromCache: false };
        } else {
            throw new Error(json.message || 'Error desconocido al leer la base de datos');
        }
    } catch (error) {
        console.warn('Fallo la API, intentando Base de Datos local...', error);

        // Intentamos el caché en SQLite offline
        const cache = await leerCatalogoDesdeDB();
        if (cache) {
            return { 
                datos: cache.datos, 
                fromCache: true, 
                lastSync: formatearTiempoTranscurrido(cache.timestamp) 
            };
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
            redirect: 'follow',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'text/plain;charset=utf-8',
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
        
        const responseText = await respuesta.text();
        let json: RespuestaAPI;
        try {
            json = JSON.parse(responseText);
        } catch (parseError) {
            console.error('El servidor no devolvió JSON. Devolvió:', responseText);
            // Si el servidor (Google) escupió HTML por un colapso en lugar del JSON,
            // lo mandamos a la cola para reintentar luego en lugar de perder el dato.
            return { exito: false, isNetworkError: true };
        }

        if (json.status === 'success') {
            return { exito: true };
        } else {
            console.error('Error del servidor:', json.message);
            return { exito: false, isNetworkError: false }; // 👈 Especifico que fue el backend
        }
    } catch (error: any) {
        const isNetwork = error.message === 'Aborted' || error.message?.includes('Network') || error.message?.includes('fetch') || error.message?.includes('OKHTTP');
        
        if (isNetwork) {
            console.warn(`📡 Background Sync pausado automáticamente por latencia/timeout: ${error.message} (Se reintentará silenciosamente luego)`);
        } else {
            console.error('Error Crítico en actualizarProducto:', error.message);
        }
        
        return { exito: false, isNetworkError: isNetwork };
    }
};