// ARCHIVO: src/hooks/useHistorial.ts
import { useState, useEffect } from 'react';
import { EntradaHistorial } from '../types/inventario';
import { InventarioRepository } from '../repositories/inventarioRepository';

interface HistorialState {
    entradas: EntradaHistorial[];
    cargando: boolean;
    error: string | null;
}

/**
 * Hook reactivo que expone los últimos 50 movimientos del historial
 * en tiempo real mediante onSnapshot de Firestore.
 */
export const useHistorial = (): HistorialState => {
    const [entradas, setEntradas] = useState<EntradaHistorial[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = InventarioRepository.suscribirHistorial(
            (nuevasEntradas) => {
                setEntradas(nuevasEntradas);
                setCargando(false);
                setError(null);
            },
            (err) => {
                console.error('[useHistorial] Error:', err);
                setError('No se pudo cargar el historial. Verifica tu conexión.');
                setCargando(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return { entradas, cargando, error };
};
