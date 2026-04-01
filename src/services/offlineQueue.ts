// ARCHIVO: src/services/offlineQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EdicionPendiente {
    id: string;
    codigoBarras: string;
    nuevoFV: string;
    nuevoFechaEdicion: string;
    nuevoComentario: string;
}

const CACHE_KEY_OFFLINE_QUEUE = 'inventario_offline_queue';

export const agregarACola = async (edicion: Omit<EdicionPendiente, 'id'>) => {
    try {
        const colaActual = await obtenerCola();
        const nuevaEdicion: EdicionPendiente = { ...edicion, id: Date.now().toString() };
        colaActual.push(nuevaEdicion);
        await AsyncStorage.setItem(CACHE_KEY_OFFLINE_QUEUE, JSON.stringify(colaActual));
    } catch(e) {
        console.warn('Error al guardar en cola offline', e);
    }
};

export const obtenerCola = async (): Promise<EdicionPendiente[]> => {
    try {
        const json = await AsyncStorage.getItem(CACHE_KEY_OFFLINE_QUEUE);
        return json ? JSON.parse(json) : [];
    } catch(e) {
        console.warn('Error al obtener cola offline', e);
        return [];
    }
};

export const removerDeCola = async (id: string) => {
    try {
        const colaActual = await obtenerCola();
        const nuevaCola = colaActual.filter(item => item.id !== id);
        await AsyncStorage.setItem(CACHE_KEY_OFFLINE_QUEUE, JSON.stringify(nuevaCola));
    } catch(e) {
        console.warn('Error al remover de la cola offline', e);
    }
};

export const vaciarCola = async () => {
    try {
        await AsyncStorage.removeItem(CACHE_KEY_OFFLINE_QUEUE);
    } catch(e) {
        console.warn('Error al vaciar cola offline', e);
    }
};
