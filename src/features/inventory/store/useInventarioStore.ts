// ARCHIVO: src/features/inventory/store/useInventarioStore.ts
import { create } from 'zustand';
import { ProductoInventario } from '../../../core/types/inventario';
import { InventarioRepository } from '../repository/inventarioRepository';
import { MENSAJES } from '../../../core/constants/mensajes';

/**
 * DTO (Data Transfer Object) para el resultado de las operaciones de inventario.
 * Permite que la capa de UI decida qué feedback (Toast, Sonidos) mostrar.
 */
export interface ResultadoOperacion {
    exito: boolean;
    webhookEncolado?: boolean;
    codigo?: string;
    mensajeError?: string;
}

interface InventarioState {
    inventario: Record<string, ProductoInventario>;
    cargando: boolean;
    error: string | null;
    modoOffline: boolean;
    lastSync?: string;
    busqueda: string;
    productoEditando: ProductoInventario | null;
    pendientesSync: number;
    sincronizandoFondo: boolean;

    // Acciones
    conectarInventario: () => () => void;
    setBusqueda: (texto: string) => void;
    setProductoEditando: (producto: ProductoInventario | null) => void;
    guardarEdicion: (fv: string, fechaEdicion: string, comentario: string) => Promise<ResultadoOperacion>;
    guardarEdicionDirecta: (producto: ProductoInventario) => Promise<ResultadoOperacion>;
    cargarDatosSync: () => void; 
}

export const useInventarioStore = create<InventarioState>((set, get) => ({
    inventario: {},
    cargando: true,
    error: null,
    modoOffline: false,
    lastSync: undefined,
    busqueda: '',
    productoEditando: null,
    pendientesSync: 0,
    sincronizandoFondo: false,

    conectarInventario: () => {
        set({ cargando: true, error: null });
        InventarioRepository.vaciarColaSync();

        return InventarioRepository.suscribir(
            (datos, fromCache) => {
                const dict = datos.reduce((acc, curr) => {
                    const key = String(curr.Cod_Barras || curr.SKU).trim();
                    if (key) acc[key] = curr;
                    return acc;
                }, {} as Record<string, ProductoInventario>);

                set({
                    inventario: dict,
                    modoOffline: fromCache,
                    cargando: false,
                    lastSync: new Date().toLocaleTimeString(),
                    error: null
                });
            },
            (err) => set({ error: MENSAJES.ERROR_CONEXION_REALTIME, cargando: false })
        );
    },

    cargarDatosSync: () => {
        set({ cargando: true });
        setTimeout(() => set({ cargando: false }), 500);
    },

    setBusqueda: (busqueda) => set({ busqueda }),
    setProductoEditando: (productoEditando) => set({ productoEditando }),

    guardarEdicion: async (fv, fechaEdicion, comentario) => {
        const { productoEditando, inventario } = get();
        if (!productoEditando) return { exito: false, mensajeError: 'No hay producto seleccionado' };

        const codigo = String(productoEditando.Cod_Barras).trim();
        const original = inventario[codigo];
        if (!original) return { exito: false, mensajeError: 'Producto no encontrado en el mapa local' };

        // 1. Actualización Optimista
        const actualizado: ProductoInventario = { 
            ...original, 
            FV_Actual: fv, 
            Fecha_edicion: fechaEdicion, 
            Comentarios: comentario 
        };
        set({ 
            inventario: { ...inventario, [codigo]: actualizado },
            productoEditando: null 
        });

        // 2. Persistencia en Capas
        const res = await InventarioRepository.actualizarProducto(
            codigo,
            { FV_Actual: fv, Fecha_edicion: fechaEdicion, Comentarios: comentario },
            {
                descripcion: original.Descripcion,
                marca: original.Marca,
                sku: original.SKU,
                fvAnterior: original.FV_Actual,
                accion: comentario && !original.Comentarios ? 'COMENTARIO_AGREGADO' : 'FV_ACTUALIZADO'
            }
        );

        // 3. Rollback si Firebase falló
        if (!res.exito) {
            set({ inventario }); 
            return { exito: false, codigo };
        }

        // 4. Retorno puro del estado de la operación (DTO)
        return { 
            exito: true, 
            webhookEncolado: res.webhookEncolado, 
            codigo 
        };
    },

    guardarEdicionDirecta: async (producto) => {
        const { inventario } = get();
        const codigo = String(producto.Cod_Barras).trim();
        const fecha = new Date().toISOString();

        // Actualización optimista
        set({ inventario: { ...inventario, [codigo]: { ...producto, Fecha_edicion: fecha } } });
        
        const res = await InventarioRepository.actualizarProducto(codigo, {
            FV_Actual: producto.FV_Actual,
            Fecha_edicion: fecha,
            Comentarios: producto.Comentarios
        });

        if (!res.exito) {
            set({ inventario });
            return { exito: false, codigo };
        }

        return { exito: true, codigo, webhookEncolado: res.webhookEncolado };
    }
}));
