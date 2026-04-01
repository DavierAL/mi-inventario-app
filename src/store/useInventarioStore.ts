// ARCHIVO: src/store/useInventarioStore.ts
import { create } from 'zustand';
import { ProductoInventario } from '../types/inventario';
import { obtenerInventario, actualizarProducto } from '../services/api';

interface InventarioState {
    inventario: ProductoInventario[];
    cargando: boolean;
    error: string | null;
    modoOffline: boolean;
    lastSync?: string;
    
    busqueda: string;
    
    productoEditando: ProductoInventario | null;
    guardando: boolean;

    // Acciones
    cargarDatos: (refrescando?: boolean) => Promise<void>;
    setBusqueda: (texto: string) => void;
    setProductoEditando: (producto: ProductoInventario | null) => void;
    guardarEdicion: (fv: string, fechaEdicion: string, comentario: string) => Promise<boolean>;
}

export const useInventarioStore = create<InventarioState>((set, get) => ({
    inventario: [],
    cargando: true,
    error: null,
    modoOffline: false,
    lastSync: undefined,
    
    busqueda: '',
    
    productoEditando: null,
    guardando: false,

    cargarDatos: async (refrescando = false) => {
        try {
            // Si está refrescando manualmente, no queremos la UI principal tapada entera con un ActivityIndicator:
            if (!refrescando) set({ cargando: true });
            
            set({ error: null });
            
            const resultado = await obtenerInventario();
            
            set({
                inventario: resultado.datos,
                modoOffline: resultado.fromCache,
                lastSync: resultado.lastSync,
                cargando: false
            });
        } catch (err) {
            set({ 
                error: 'No se pudo conectar con la base de datos.\nVerifica tu conexión a internet.',
                cargando: false
            });
        }
    },

    setBusqueda: (texto: string) => set({ busqueda: texto }),

    setProductoEditando: (producto) => set({ productoEditando: producto }),

    guardarEdicion: async (fv: string, fechaEdicion: string, comentario: string) => {
        const state = get();
        if (!state.productoEditando) return false;

        set({ guardando: true });
        
        const codigo = state.productoEditando.Cod_Barras;
        const inventarioPrevio = state.inventario;

        // Optimistic UI update
        const nuevoInventario = state.inventario.map(item =>
            String(item.Cod_Barras).trim() === String(codigo).trim()
                ? { ...item, FV_Actual: fv, Fecha_edicion: fechaEdicion, Comentarios: comentario }
                : item
        );
        
        set({ inventario: nuevoInventario, productoEditando: null });

        const exito = await actualizarProducto(codigo, undefined, fv, fechaEdicion, comentario);

        if (!exito) {
            // Revertir
            set({ inventario: inventarioPrevio, guardando: false });
            return false;
        }

        set({ guardando: false });
        return true;
    }
}));
