import { useState, useEffect } from 'react';
import { EntradaHistorial } from '../../../core/types/inventario';
import { database } from '../../../core/database';
import { Q } from '@nozbe/watermelondb';
import { formatearFecha } from '../../../core/utils/fecha';
import { Movimiento } from '../../../core/database/models/Movimiento';

interface HistorialState {
    entradas: EntradaHistorial[];
    cargando: boolean;
    error: string | null;
}

/**
 * Hook reactivo que expone los movimientos del historial
 * en tiempo real desde la base de datos local.
 */
export const useHistorial = () => {
    const [entradas, setEntradas] = useState<EntradaHistorial[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const subscription = database.collections.get<Movimiento>('movimientos')
            .query(Q.sortBy('timestamp', Q.desc))
            .observe()
            .subscribe({
                next: (movimientos) => {
                    const mapped = movimientos.map(m => ({
                        id: m.id,
                        productoId: m.productoId,
                        descripcion: m.descripcion,
                        marca: m.marca,
                        sku: m.sku,
                        accion: m.accion as any,
                        cambios: {
                            fvAnterior: m.fvAnteriorTs ? formatearFecha(m.fvAnteriorTs) : undefined,
                            fvNuevo: m.fvNuevoTs ? formatearFecha(m.fvNuevoTs) : undefined,
                            comentario: m.comentario
                        },
                        timestamp: m.timestamp,
                        dispositivo: m.dispositivo
                    }));
                    setEntradas(mapped);
                    setCargando(false);
                },
                error: (err) => {
                    console.error('[useHistorial] Error:', err);
                    setError('No se pudo cargar el historial');
                    setCargando(false);
                }
            });

        return () => subscription.unsubscribe();
    }, []);

    return { 
        entradas, 
        cargando, 
        error 
    };
};

