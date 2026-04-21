import { useState, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../core/database';
import { useDebounce } from '../../../core/utils/useDebounce';
import Producto from '../../../core/database/models/Producto';

export type FiltroCaducidad = 'TODOS' | 'VENCIDOS' | '30_DIAS' | '90_DIAS';
export type Ordenamiento = 'MARCA' | 'STOCK' | 'FV';

/**
 * useFiltrosInventario — Refactor Pro
 * 
 * Responsabilidad: Generar una Consulta (Query) de WatermelonDB basada en el estado de la UI.
 * Ventaja: El filtrado ocurre en SQLite, no en el hilo de JavaScript, evitando bloqueos.
 */
export const useFiltrosInventario = (busqueda: string) => {
    const [filtroRapido, setFiltroRapido] = useState<FiltroCaducidad>('TODOS');
    const [ordenamiento, setOrdenamiento] = useState<Ordenamiento>('MARCA');
    const busquedaDebounced = useDebounce(busqueda, 300);

    // Devolvemos la CONSULTA en crudo a SQLite, no el array evaluado.
    const queryProductos = useMemo(() => {
        const conditions: Q.Clause[] = [];

        // 1. Condición de Búsqueda
        const termino = busquedaDebounced.toLowerCase().trim();
        if (termino) {
            conditions.push(
                Q.or(
                    Q.where('descripcion', Q.like(`%${Q.sanitizeLikeString(termino)}%`)),
                    Q.where('sku', Q.like(`%${Q.sanitizeLikeString(termino)}%`)),
                    Q.where('cod_barras', Q.like(`%${Q.sanitizeLikeString(termino)}%`)),
                    Q.where('marca', Q.like(`%${Q.sanitizeLikeString(termino)}%`))
                )
            );
        }

        // 2. Ordenamiento
        if (ordenamiento === 'MARCA') conditions.push(Q.sortBy('marca', Q.asc));
        else if (ordenamiento === 'STOCK') conditions.push(Q.sortBy('stock_master', Q.desc));
        else if (ordenamiento === 'FV') conditions.push(Q.sortBy('fv_actual_ts', Q.asc));

        // Retornamos la Query pura (el filtro de fechas lo haremos en RxJS)
        return database.collections.get<Producto>('productos').query(...conditions);
    }, [busquedaDebounced, ordenamiento]); // Quita filtroRapido de estas dependencias

    return {
        queryProductos, // Retorna un objeto Query de WatermelonDB
        filtroRapido,
        setFiltroRapido,
        ordenamiento,
        setOrdenamiento
    };
};
