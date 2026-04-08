// ARCHIVO: src/store/useInventarioStore.ts
import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { ProductoInventario } from '../types/inventario';
import { obtenerInventario, actualizarProducto } from '../services/api';
import { agregarACola, obtenerCola, removerDeCola } from '../services/offlineQueue';
import Toast from 'react-native-toast-message';
import { reproducirSonido } from '../utils/sonidos';

interface InventarioState {
    inventario: ProductoInventario[];
    cargando: boolean;
    error: string | null;
    modoOffline: boolean;
    lastSync?: string;
    
    busqueda: string;
    
    productoEditando: ProductoInventario | null;
    guardando: boolean;
    
    // Offline Tracking
    pendientesSync: number;
    sincronizandoFondo: boolean;

    // Acciones
    cargarDatos: (refrescando?: boolean) => Promise<void>;
    setBusqueda: (texto: string) => void;
    setProductoEditando: (producto: ProductoInventario | null) => void;
    guardarEdicion: (fv: string, fechaEdicion: string, comentario: string) => Promise<boolean>;
    guardarEdicionDirecta: (producto: ProductoInventario) => Promise<boolean>;
    iniciarListenerInternet: () => void;
    sincronizarColaPendientes: () => Promise<void>;
}

let internetListenerRegistrado = false;

export const useInventarioStore = create<InventarioState>((set, get) => ({
    inventario: [],
    cargando: true,
    error: null,
    modoOffline: false,
    lastSync: undefined,
    
    busqueda: '',
    
    productoEditando: null,
    guardando: false,

    pendientesSync: 0,
    sincronizandoFondo: false,

    cargarDatos: async (refrescando = false) => {
        try {
            if (!refrescando) set({ cargando: true });
            
            set({ error: null });
            
            const resultado = await obtenerInventario();
            const pendientes = await obtenerCola();
            
            set({
                inventario: resultado.datos,
                modoOffline: resultado.fromCache,
                lastSync: resultado.lastSync,
                cargando: false,
                pendientesSync: pendientes.length
            });
            
            // Si cargó y hay red, intentamos enviar cola.
            if (!resultado.fromCache && pendientes.length > 0) {
                get().sincronizarColaPendientes();
            }
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

        // Actualización optimista. No la revertiremos si es error de red.
        const nuevoInventario = state.inventario.map(item =>
            String(item.Cod_Barras).trim() === String(codigo).trim()
                ? { ...item, FV_Actual: fv, Fecha_edicion: fechaEdicion, Comentarios: comentario }
                : item
        );
        
        set({ inventario: nuevoInventario, productoEditando: null });

        const respuesta = await actualizarProducto(codigo, undefined, fv, fechaEdicion, comentario);

        // Si falló por mala conexión, encolamos el request de manera silenciosa!
        if (!respuesta.exito && respuesta.isNetworkError) {
            await agregarACola({
                codigoBarras: codigo,
                nuevoFV: fv,
                nuevoFechaEdicion: fechaEdicion,
                nuevoComentario: comentario
            });
            const pendientes = await obtenerCola();
            set({ guardando: false, pendientesSync: pendientes.length });
            
            reproducirSonido('success');
            Toast.show({
                type: 'info',
                text1: '📥 Guardado en cola offline',
                text2: 'Se enviará cuando recuperes la conexión.',
                visibilityTime: 3000,
            });
            return true; // Mentimos a la UI, le decimos "Sí guardó" en el teléfono de momento. 
        }

        // Si falló y no era problema de red (servidor rechazó)
        if (!respuesta.exito && !respuesta.isNetworkError) {
            set({ inventario: inventarioPrevio, guardando: false }); // Revertir
            reproducirSonido('error');
            Toast.show({
                type: 'error',
                text1: '❌ Error de servidor',
                text2: 'No se pudo guardar la modificación.',
                visibilityTime: 4000,
            });
            return false;
        }

        set({ guardando: false });
        reproducirSonido('success');
        Toast.show({
            type: 'success',
            text1: '✅ Guardado con éxito',
            text2: `Las modificaciones de ${codigo} se sincronizaron.`,
            visibilityTime: 2500,
        });
        return true;
    },

    guardarEdicionDirecta: async (producto: ProductoInventario) => {
        const state = get();
        const codigo = producto.Cod_Barras;
        const fv = producto.FV_Actual || '';
        const fechaEdicion = new Date().toLocaleDateString('es-ES');
        const comentario = producto.Comentarios || '';
        
        const inventarioPrevio = state.inventario;
        const nuevoInventario = state.inventario.map(item =>
            String(item.Cod_Barras).trim() === String(codigo).trim()
                ? { ...item, Fecha_edicion: fechaEdicion }
                : item
        );
        
        set({ inventario: nuevoInventario });
        
        const respuesta = await actualizarProducto(codigo, undefined, fv, fechaEdicion, comentario);

        if (!respuesta.exito && respuesta.isNetworkError) {
            await agregarACola({ codigoBarras: codigo, nuevoFV: fv, nuevoFechaEdicion: fechaEdicion, nuevoComentario: comentario });
            const pendientes = await obtenerCola();
            set({ pendientesSync: pendientes.length });
            return true;
        }

        if (!respuesta.exito && !respuesta.isNetworkError) {
            set({ inventario: inventarioPrevio }); // Revertir
            return false;
        }

        return true;
    },

    sincronizarColaPendientes: async () => {
        if (get().sincronizandoFondo) return;
        
        const cola = await obtenerCola();
        if (cola.length === 0) return;

        set({ sincronizandoFondo: true });

        for (const item of cola) {
            const respuesta = await actualizarProducto(
                item.codigoBarras,
                undefined,
                item.nuevoFV,
                item.nuevoFechaEdicion,
                item.nuevoComentario
            );
            
            // Solo si tiene éxito verdadero lo quitamos de la cola de pendientes
            if (respuesta.exito) {
                await removerDeCola(item.id);
            } else if (!respuesta.isNetworkError) {
                // Si dió error del sistema y NO de internet, es mejor borrarlo 
                // para que no tranque el sistema.
                await removerDeCola(item.id);
            }
        }

        const colaRestante = await obtenerCola();
        set({ sincronizandoFondo: false, pendientesSync: colaRestante.length });
    },

    iniciarListenerInternet: () => {
        if (internetListenerRegistrado) return;
        internetListenerRegistrado = true;

        NetInfo.addEventListener(state => {
            if (state.isConnected && state.isInternetReachable) {
                const pendientes = get().pendientesSync;
                if (pendientes > 0) {
                    get().sincronizarColaPendientes();
                }
            }
        });
    }
}));
