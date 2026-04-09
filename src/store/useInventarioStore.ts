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
    // Estado Inicial
    inventario: {},
    cargando: true,
    error: null,
    modoOffline: false,
    lastSync: undefined,
    busqueda: '',
    productoEditando: null,
    pendientesSync: 0,
    sincronizandoFondo: false,

    // Conexión y Sincronización
    conectarInventario: () => {
        set({ cargando: true, error: null });
        
        InventarioRepository.vaciarColaSync();

        const unsubscribe = InventarioRepository.suscribir(
            (datos, fromCache) => {
                // NORMALIZACIÓN O(n): Transformamos arreglo a Diccionario para búsquedas O(1)
                const inventarioNormalizado = datos.reduce((acc, curr) => {
                    const key = String(curr.Cod_Barras || curr.SKU).trim();
                    if (key) acc[key] = curr;
                    return acc;
                }, {} as Record<string, ProductoInventario>);

                set({
                    inventario: inventarioNormalizado,
                    modoOffline: fromCache,
                    cargando: false,
                    lastSync: new Date().toLocaleTimeString(),
                    error: null
                });
            },
            (error) => {
                set({ 
                    error: MENSAJES.ERROR_CONEXION_REALTIME,
                    cargando: false 
                });
            }
        );

        return unsubscribe;
    },

    cargarDatosSync: () => {
        set({ cargando: true });
        // Simulación de "refresco" visual ya que onSnapshot es reactivo
        setTimeout(() => set({ cargando: false }), 500);
    },

    setBusqueda: (texto: string) => set({ busqueda: texto }),

    setProductoEditando: (producto) => set({ productoEditando: producto }),

    // Persistencia O(1)
    guardarEdicion: async (fv: string, fechaEdicion: string, comentario: string) => {
        const state = get();
        if (!state.productoEditando) return false;

        const codigo = String(state.productoEditando.Cod_Barras).trim();
        const productoPrevio = state.inventario[codigo];
        if (!productoPrevio) return false;

        // Actualización Optimista O(1)
        const nuevoProducto = {
            ...productoPrevio,
            FV_Actual: fv,
            Fecha_edicion: fechaEdicion,
            Comentarios: comentario
        };

        const nuevoInventario = {
            ...state.inventario,
            [codigo]: nuevoProducto
        };
        
        set({ inventario: nuevoInventario, productoEditando: null });

        const respuesta = await InventarioRepository.actualizarProducto(
            codigo,
            {
                FV_Actual: fv,
                Fecha_edicion: fechaEdicion,
                Comentarios: comentario
            },
            // Info para el historial de auditoría
            {
                descripcion: productoPrevio.Descripcion || '',
                marca: productoPrevio.Marca || '',
                sku: productoPrevio.SKU || '',
                fvAnterior: productoPrevio.FV_Actual,
                accion: comentario && !productoPrevio.Comentarios ? 'COMENTARIO_AGREGADO' : 'FV_ACTUALIZADO',
            }
        );

        if (!respuesta.exito && !respuesta.isNetworkError) {
            // Revertir solo si falló la base de datos (no por red, que se encolará)
            set({ inventario: state.inventario }); 
            reproducirSonido('error');
            Toast.show({
                type: 'error',
                text1: MENSAJES.ERROR_GUARDADO,
                text2: MENSAJES.ERROR_GUARDADO_DB,
                visibilityTime: 4000,
            });
            return false;
        }

        reproducirSonido('success');
        
        if (respuesta.isNetworkError) {
            Toast.show({
                type: 'info',
                text1: MENSAJES.EXITO_MODO_OFFLINE,
                text2: MENSAJES.EXITO_MODO_OFFLINE_SUB,
                visibilityTime: 3500,
            });
        } else {
            Toast.show({
                type: 'success',
                text1: MENSAJES.EXITO_GUARDADO,
                text2: MENSAJES.EXITO_GUARDADO_SUB(codigo),
                visibilityTime: 2500,
            });
        }
        return true;
    },

    guardarEdicionDirecta: async (producto: ProductoInventario) => {
        const state = get();
        const codigo = String(producto.Cod_Barras).trim();
        const fv = producto.FV_Actual;
        const fechaEdicion = new Date().toISOString();
        const comentario = producto.Comentarios || '';

        // Actualización O(1)
        const nuevoInventario = {
            ...state.inventario,
            [codigo]: { ...producto, Fecha_edicion: fechaEdicion }
        };
        
        set({ inventario: nuevoInventario });
        
        const respuesta = await InventarioRepository.actualizarProducto(codigo, {
            FV_Actual: fv,
            Fecha_edicion: fechaEdicion,
            Comentarios: comentario
        });

        if (!respuesta.exito && !respuesta.isNetworkError) {
            set({ inventario: state.inventario }); 
            return false;
        }

        return true;
    }
}));
