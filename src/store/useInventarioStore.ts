// ARCHIVO: src/store/useInventarioStore.ts
import { create } from 'zustand';
import { ProductoInventario } from '../types/inventario';
import { suscribirAInventario, actualizarProducto, vaciarColaWebhooks } from '../services/api';
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
    // Offline Tracking is inherently managed by Firebase, we just keep UI flags
    pendientesSync: number;
    sincronizandoFondo: boolean;

    // Acciones
    conectarInventario: () => () => void; // Retorna función de desconexión
    setBusqueda: (texto: string) => void;
    setProductoEditando: (producto: ProductoInventario | null) => void;
    guardarEdicion: (fv: string, fechaEdicion: string, comentario: string) => Promise<boolean>;
    guardarEdicionDirecta: (producto: ProductoInventario) => Promise<boolean>;
    // Carga manual (legacy / forzar refresco visual si offline)
    cargarDatosSync: () => void; 
}

export const useInventarioStore = create<InventarioState>((set, get) => ({
    inventario: [],
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
        
        // Limpiamos cola de pendientes al conectar (si hay internet)
        vaciarColaWebhooks();

        // Iniciamos la suscripción onSnapshot
        const unsubscribe = suscribirAInventario(
            (datos, fromCache) => {
                set({
                    inventario: datos,
                    modoOffline: fromCache,
                    cargando: false,
                    lastSync: new Date().toLocaleTimeString(),
                    error: null
                });
            },
            (error) => {
                set({ 
                    error: 'Error de conexión en tiempo real. Reintentando...',
                    cargando: false 
                });
            }
        );

        return unsubscribe; // Para usar en useEffect cleanup
    },

    cargarDatosSync: () => {
        // En onSnapshot, "cargar" es simplemente esperar la primera emisión.
        // Mantenemos esta función por compatibilidad con Pull-to-refresh
        set({ cargando: true });
        // El listener ya está corriendo, el set anterior disparará el skeleton
        // y onSnapshot refrescará la data apenas la reciba del servidor.
        setTimeout(() => set({ cargando: false }), 500);
    },

    setBusqueda: (texto: string) => set({ busqueda: texto }),

    setProductoEditando: (producto) => set({ productoEditando: producto }),

    guardarEdicion: async (fv: string, fechaEdicion: string, comentario: string) => {
        const state = get();
        if (!state.productoEditando) return false;

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

        // MEJORA: Si falla el webhook por red (isNetworkError), NO revertimos la UI.
        // El dato ya está en Firebase y se encoló para Google Sheets.
        if (!respuesta.exito && !respuesta.isNetworkError) {
            set({ inventario: inventarioPrevio }); // Revertir solo si falló Firebase
            reproducirSonido('error');
            Toast.show({
                type: 'error',
                text1: '❌ Error al guardar',
                text2: 'No se pudo insertar en la base de datos.',
                visibilityTime: 4000,
            });
            return false;
        }

        reproducirSonido('success');
        
        if (respuesta.isNetworkError) {
            Toast.show({
                type: 'info',
                text1: '✅ Guardado (Modo Offline)',
                text2: 'Cambio guardado. Se enviará a Excel al recuperar conexión.',
                visibilityTime: 3500,
            });
        } else {
            Toast.show({
                type: 'success',
                text1: '✅ Guardado exitoso',
                text2: `Las modificaciones de ${codigo} se sincronizaron.`,
                visibilityTime: 2500,
            });
        }
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
                ? { ...item, FV_Actual: fv, Fecha_edicion: fechaEdicion, Comentarios: comentario }
                : item
        );
        
        set({ inventario: nuevoInventario });
        
        const respuesta = await actualizarProducto(codigo, undefined, fv, fechaEdicion, comentario);

        // Si falló Firebase (exito false) y no es error de red (el webhook), revertimos.
        if (!respuesta.exito && !respuesta.isNetworkError) {
            set({ inventario: inventarioPrevio }); 
            return false;
        }

        return true;
    }
}));
