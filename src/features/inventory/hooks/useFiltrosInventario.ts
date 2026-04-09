// ARCHIVO: src/features/inventory/hooks/useFiltrosInventario.ts
import { useMemo, useState } from 'react';
import { useDebounce } from '../../../core/utils/useDebounce';
import { ProductoInventario } from '../../../core/types/inventario';
import { calcularDiasRestantes } from '../../../core/utils/fecha';

export type FiltroCaducidad = 'TODOS' | 'VENCIDOS' | '30_DIAS' | '90_DIAS';
export type Ordenamiento = 'MARCA' | 'STOCK' | 'FV';

export const useFiltrosInventario = (inventario: Record<string, ProductoInventario>, busqueda: string) => {
    const [filtroRapido, setFiltroRapido] = useState<FiltroCaducidad>('TODOS');
    const [ordenamiento, setOrdenamiento] = useState<Ordenamiento>('MARCA');
    
    // Retardo artificial para búsquedas para no saturar el renderizado en cada tecla
    const busquedaDebounced = useDebounce(busqueda, 300);

    const { inventarioProcesado, conteos } = useMemo(() => {
        let vencidos = 0, en30Dias = 0, en90Dias = 0;
        
        const inventarioArray = Object.values(inventario);

        // 1. Calculamos los días restantes y conteos
        const inventarioConDias = inventarioArray.map(item => {
            const diasRestantes = calcularDiasRestantes(item.FV_Actual);
            
            if (diasRestantes < 0) vencidos++;
            else if (diasRestantes <= 30) en30Dias++;
            else if (diasRestantes <= 90) en90Dias++;

            return { ...item, diasRestantes };
        });

        // 2. Filtramos según botón de caducidad
        let listaFiltrada = inventarioConDias;
        if (filtroRapido === 'VENCIDOS') listaFiltrada = listaFiltrada.filter(i => i.diasRestantes < 0);
        if (filtroRapido === '30_DIAS') listaFiltrada = listaFiltrada.filter(i => i.diasRestantes >= 0 && i.diasRestantes <= 30);
        if (filtroRapido === '90_DIAS') listaFiltrada = listaFiltrada.filter(i => i.diasRestantes > 30 && i.diasRestantes <= 90);

        // 3. Aplicamos la búsqueda de texto
        const termino = busquedaDebounced.toLowerCase().trim();
        if (termino) {
            listaFiltrada = listaFiltrada.filter(p =>
                String(p.SKU).toLowerCase().includes(termino) ||
                String(p.Descripcion).toLowerCase().includes(termino) ||
                String(p.Cod_Barras).toLowerCase().includes(termino)
            );
        }

        // 4. Ordenamiento
        if (ordenamiento === 'MARCA') {
            listaFiltrada.sort((a, b) => String(a.Marca || '').localeCompare(String(b.Marca || '')));
        } else if (ordenamiento === 'STOCK') {
            listaFiltrada.sort((a, b) => (Number(b.Stock_Master) || 0) - (Number(a.Stock_Master) || 0));
        } else if (ordenamiento === 'FV') {
            listaFiltrada.sort((a, b) => a.diasRestantes - b.diasRestantes);
        }

        return { 
            inventarioProcesado: listaFiltrada, 
            conteos: { vencidos, en30Dias, en90Dias } 
        };
    }, [busquedaDebounced, inventario, filtroRapido, ordenamiento]);

    return {
        inventarioProcesado,
        conteos,
        filtroRapido,
        setFiltroRapido,
        ordenamiento,
        setOrdenamiento
    };
};
