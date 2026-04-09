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

        // 1. Condición de Búsqueda (LIKE)
        const termino = busquedaDebounced.toLowerCase().trim();
        if (termino) {
            conditions.push(
                Q.or(
                    Q.where('descripcion', Q.like(`%${Q.sanitizeLikeString(termino)}%`)),
                    Q.where('sku', Q.like(`%${Q.sanitizeLikeString(termino)}%`)),
                    Q.where('cod_barras', Q.like(`%${Q.sanitizeLikeString(termino)}%`))
                )
            );
        }

        // 2. Condición de Filtros Especiales
        if (filtroRapido === 'VENCIDOS') {
            // Nota: Aquí se asume que fv_actual se guarda de forma que SQLite pueda comparar 
            // (por ejemplo, ISO o similar). Ajustar según el formato real.
            // Para este ejemplo, solo mostramos cómo se estructuraría:
            // conditions.push(Q.where('fv_actual', Q.lt(new Date().toISOString())));
        } else if (filtroRapido === '30_DIAS') {
             // Lógica de fecha similar...
        }

        // 3. Ordenamiento delegado a la Base de Datos
        if (ordenamiento === 'MARCA') {
            conditions.push(Q.sortBy('marca', Q.asc));
        } else if (ordenamiento === 'STOCK') {
            conditions.push(Q.sortBy('stock_master', Q.desc));
        } else if (ordenamiento === 'FV') {
            conditions.push(Q.sortBy('fv_actual', Q.asc));
        }

        return database.collections.get<Producto>('productos').query(...conditions);
    }, [busquedaDebounced, filtroRapido, ordenamiento]);

    return {
        queryProductos, // Retorna un objeto Query de WatermelonDB
        filtroRapido,
        setFiltroRapido,
        ordenamiento,
        setOrdenamiento
    };
};
