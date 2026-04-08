// ARCHIVO: src/services/offlineQueue.ts
import { db } from './db';

export interface EdicionPendiente {
    id: string;
    codigoBarras: string;
    nuevoFV: string;
    nuevoFechaEdicion: string;
    nuevoComentario: string;
}

export const agregarACola = async (edicion: Omit<EdicionPendiente, 'id'>) => {
    try {
        // Agregamos semilla aleatoria para evitar ráfagas del mismo milisegundo colisionando
        const id = Date.now().toString() + Math.random().toString(36).substring(7);
        await db.runAsync(
            'INSERT INTO cola_offline (id, codigoBarras, nuevoFV, nuevoFechaEdicion, nuevoComentario, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            [id, edicion.codigoBarras, edicion.nuevoFV || '', edicion.nuevoFechaEdicion || '', edicion.nuevoComentario || '', Date.now()]
        );
    } catch(e) {
        console.warn('Error al guardar en cola offline SQLite', e);
    }
};

export const obtenerCola = async (): Promise<EdicionPendiente[]> => {
    try {
        const rows = await db.getAllAsync<any>('SELECT * FROM cola_offline ORDER BY timestamp ASC;');
        return rows as EdicionPendiente[];
    } catch(e) {
        console.warn('Error al obtener cola offline SQLite', e);
        return [];
    }
};

export const removerDeCola = async (id: string) => {
    try {
        await db.runAsync('DELETE FROM cola_offline WHERE id = ?', [id]);
    } catch(e) {
        console.warn('Error al remover de la cola offline SQLite', e);
    }
};

export const vaciarCola = async () => {
    try {
        await db.runAsync('DELETE FROM cola_offline');
    } catch(e) {
        console.warn('Error al vaciar cola offline SQLite', e);
    }
};
