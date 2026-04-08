import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProductoInventario } from '../types/inventario';

// En Expo SDK 50+, la API es openDatabaseSync
export const db = SQLite.openDatabaseSync('inventarioscanner.db');

export const initDB = async (): Promise<void> => {
    // Creamos la tabla de caché de inventario
    // Guardaremos el RAW json de cada producto para mantener compatibilidad con tipos y extenderlo facil,
    // pero indexamos Cod_Barras para accesos futuros ultrarrápidos.
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS inventario_cache (
            Cod_Barras TEXT PRIMARY KEY,
            data_json TEXT NOT NULL
        );
    `);

    // Guardaremos metadatos (ej. fecha de última sincronización)
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS metadatos (
            clave TEXT PRIMARY KEY,
            valor TEXT NOT NULL
        );
    `);
    
    // Tabla para la Cola Offline transaccional
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS cola_offline (
            id TEXT PRIMARY KEY,
            codigoBarras TEXT NOT NULL,
            nuevoFV TEXT,
            nuevoFechaEdicion TEXT,
            nuevoComentario TEXT,
            timestamp INTEGER NOT NULL
        );
    `);

    // Migración Silenciosa: Purgar los ~5MB de AsyncStorage viejo para liberar memoria
    try {
        await AsyncStorage.multiRemove([
            'inventario_cache_datos', 
            'inventario_cache_timestamp', 
            'inventario_offline_queue'
        ]);
    } catch(e) {
        console.warn("No se pudo purgar la caché antigua", e);
    }
};

// ==========================================
// CACHÉ DEL CATÁLOGO
// ==========================================
export const guardarCatalogoEnDB = async (datos: ProductoInventario[]): Promise<void> => {
    // Guardado Masivo. En SQLite, para insertar 5,000 registros rapidísimo, debes usar un Transaction Statement
    // pero 'execAsync' admite queries grandes o usar 'runAsync' con variables.
    try {
        await db.withTransactionAsync(async () => {
            // Limpiamos la caché anterior
            await db.execAsync('DELETE FROM inventario_cache;');
            
            // Preparamos statement
            const statement = await db.prepareAsync(
                'INSERT INTO inventario_cache (Cod_Barras, data_json) VALUES ($codigo, $json);'
            );
            
            try {
                for (const item of datos) {
                    await statement.executeAsync({
                        $codigo: String(item.Cod_Barras),
                        $json: JSON.stringify(item)
                    });
                }
            } finally {
                await statement.finalizeAsync();
            }
        });
        
        // Actualizamos timestamp global de última recarga exitosa
        await db.runAsync(
            'INSERT OR REPLACE INTO metadatos (clave, valor) VALUES (?, ?)',
            ['lastSync', String(Date.now())]
        );
    } catch (e) {
        console.error('Error insertando lote masivo en SQLite:', e);
        throw e;
    }
};

export const leerCatalogoDesdeDB = async (): Promise<{ datos: ProductoInventario[]; timestamp: number } | null> => {
    try {
        const rows = await db.getAllAsync<{ data_json: string }>('SELECT data_json FROM inventario_cache;');
        
        if (!rows || rows.length === 0) return null;
        
        const datos: ProductoInventario[] = rows.map(r => JSON.parse(r.data_json));
        
        const timestampRow = await db.getFirstAsync<{ valor: string }>(
            'SELECT valor FROM metadatos WHERE clave = ?',
            ['lastSync']
        );
        
        const timestamp = timestampRow ? Number(timestampRow.valor) : Date.now();
        
        return { datos, timestamp };
    } catch (e) {
        console.error('Error leyendo SQLite:', e);
        return null;
    }
};

export const purgarBaseDeDatos = async () => {
    await db.execAsync('DELETE FROM inventario_cache; DELETE FROM metadatos; DELETE FROM cola_offline;');
};
