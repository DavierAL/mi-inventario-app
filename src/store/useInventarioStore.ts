// ARCHIVO: src/store/useInventarioStore.ts
import { create } from 'zustand';
import { ProductoInventario } from '../types/inventario';
import { InventarioRepository } from '../repositories/inventarioRepository';
import { MENSAJES } from '../constants/mensajes';
import Toast from 'react-native-toast-message';
import { reproducirSonido } from '../utils/sonidos';

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
    guardarEdicion: (fv: string, fechaEdicion: string, comentario: string) => Promise<boolean>;
    guardarEdicionDirecta: (producto: ProductoInventario) => Promise<boolean>;
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
        if (!productoEditando) return false;

        const codigo = String(productoEditando.Cod_Barras).trim();
        const original = inventario[codigo];
        if (!original) return false;

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

        // 3. Manejo de Feedback (Sin rollback si Firebase funcionó)
        if (!res.exito) {
            set({ inventario }); // Solo revertimos si Firebase falló (fallo catastrófico)
            reproducirSonido('error');
            Toast.show({ type: 'error', text1: MENSAJES.ERROR_GUARDADO, text2: 'No se pudo guardar en la nube.' });
            return false;
        }

        reproducirSonido('success');
        
        if (res.webhookEncolado) {
            Toast.show({
                type: 'info',
                text1: 'Guardado (Sync pendiente)',
                text2: 'El cambio está seguro, pero se enviará a Sheets al recuperar conexión.',
                visibilityTime: 4000
            });
        } else {
            Toast.show({
                type: 'success',
                text1: MENSAJES.EXITO_GUARDADO,
                text2: MENSAJES.EXITO_GUARDADO_SUB(codigo),
                visibilityTime: 2500
            });
        }

        return true;
    },

    guardarEdicionDirecta: async (producto) => {
        const { inventario } = get();
        const codigo = String(producto.Cod_Barras).trim();
        const fecha = new Date().toISOString();

        set({ inventario: { ...inventario, [codigo]: { ...producto, Fecha_edicion: fecha } } });
        
        const res = await InventarioRepository.actualizarProducto(codigo, {
            FV_Actual: producto.FV_Actual,
            Fecha_edicion: fecha,
            Comentarios: producto.Comentarios
        });

        if (!res.exito) {
            set({ inventario });
            return false;
        }

        return true;
    }
}));
