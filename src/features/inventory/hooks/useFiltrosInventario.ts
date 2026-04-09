// ARCHIVO: src/features/inventory/hooks/useFiltrosInventario.ts
import { useMemo, useState } from 'react';
import { useDebounce } from '../../../core/utils/useDebounce';
import { ProductoInventario } from '../../../core/types/inventario';
import { calcularDiasRestantes } from '../../../core/utils/fecha';

export type FiltroCaducidad = 'TODOS' | 'VENCIDOS' | '30_DIAS' | '90_DIAS';
export type Ordenamiento = 'MARCA' | 'STOCK' | 'FV';

import Producto from '../../../core/database/models/Producto';

export const useFiltrosInventario = (productos: Producto[], busqueda: string) => {
    const [filtroRapido, setFiltroRapido] = useState<FiltroCaducidad>('TODOS');
    const [ordenamiento, setOrdenamiento] = useState<Ordenamiento>('MARCA');
    
    // Retardo artificial para búsquedas para no saturar el renderizado en cada tecla
    const busquedaDebounced = useDebounce(busqueda, 300);

    const { inventarioProcesado, conteos } = useMemo(() => {
        let vencidos = 0, en30Dias = 0, en90Dias = 0;
        
        // 1. Calculamos los días restantes y conteos
        const inventarioConDias = productos.map(item => {
            const diasRestantes = calcularDiasRestantes(item.fvActual);
            
            if (diasRestantes < 0) vencidos++;
            else if (diasRestantes <= 30) en30Dias++;
            else if (diasRestantes <= 90) en90Dias++;

            return { item, diasRestantes };
        });

        // 2. Filtramos según botón de caducidad
        let listaFiltrada = inventarioConDias;
        if (filtroRapido === 'VENCIDOS') listaFiltrada = listaFiltrada.filter(i => i.diasRestantes < 0);
        if (filtroRapido === '30_DIAS') listaFiltrada = listaFiltrada.filter(i => i.diasRestantes >= 0 && i.diasRestantes <= 30);
        if (filtroRapido === '90_DIAS') listaFiltrada = listaFiltrada.filter(i => i.diasRestantes > 30 && i.diasRestantes <= 90);

        // 3. Aplicamos la búsqueda de texto
        const termino = busquedaDebounced.toLowerCase().trim();
        if (termino) {
            listaFiltrada = listaFiltrada.filter(({ item }) =>
                String(item.sku).toLowerCase().includes(termino) ||
                String(item.descripcion).toLowerCase().includes(termino) ||
                String(item.codBarras).toLowerCase().includes(termino)
            );
        }

        // 4. Ordenamiento
        if (ordenamiento === 'MARCA') {
            listaFiltrada.sort((a, b) => String(a.item.marca || '').localeCompare(String(b.item.marca || '')));
        } else if (ordenamiento === 'STOCK') {
            listaFiltrada.sort((a, b) => (Number(b.item.stockMaster) || 0) - (Number(a.item.stockMaster) || 0));
        } else if (ordenamiento === 'FV') {
            listaFiltrada.sort((a, b) => a.diasRestantes - b.diasRestantes);
        }

        return { 
            inventarioProcesado: listaFiltrada.map(i => i.item), 
            conteos: { vencidos, en30Dias, en90Dias } 
        };
    }, [busquedaDebounced, productos, filtroRapido, ordenamiento]);

    return {
        inventarioProcesado,
        conteos,
        filtroRapido,
        setFiltroRapido,
        ordenamiento,
        setOrdenamiento
    };
};
