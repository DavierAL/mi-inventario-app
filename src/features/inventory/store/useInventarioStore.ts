import { create } from 'zustand';
import { Platform } from 'react-native';
import { database } from '../../../core/database';
import Producto from '../../../core/database/models/Producto';
import Movimiento from '../../../core/database/models/Movimiento';
import { syncConSupabase } from '../services/syncService';
import { InventarioRepository } from '../repository/inventarioRepository';
import { MENSAJES } from '../../../core/constants/mensajes';
import { TipoAccionHistorial } from '../../../core/types/inventario';
import { parseFVToDate } from '../../../core/utils/fecha';
import { useAuthStore } from '../../../core/store/useAuthStore';
import { ErrorService } from '../../../core/services/ErrorService';

/**
 * DTO (Data Transfer Object) para el resultado de las operaciones de inventario.
 */
export interface ResultadoOperacion {
    exito: boolean;
    webhookEncolado?: boolean;
    codigo?: string;
    mensajeError?: string;
}

interface InventarioState {
    cargando: boolean;
    error: string | null;
    modoOffline: boolean;
    lastSync?: string;
    productoEditando: Producto | null;
    pendientesSync: number;
    sincronizandoFondo: boolean;

    // Acciones
    conectarInventario: () => Promise<void>;
    setProductoEditando: (producto: Producto | null) => void;
    guardarEdicion: (fv: string, fechaEdicion: string, comentario: string) => Promise<ResultadoOperacion>;
    cargarDatosSync: () => void;
    repararBaseDeDatos: () => Promise<void>;
    reset: () => void;
}

const initialState = {
    cargando: false,
    error: null,
    modoOffline: false,
    lastSync: undefined,
    productoEditando: null,
    pendientesSync: 0,
    sincronizandoFondo: false,
};

export const useInventarioStore = create<InventarioState>((set, get) => ({
    ...initialState,

    reset: () => set(initialState),

    conectarInventario: () => {
        set({ cargando: true, error: null });
        return syncConSupabase()
            .then(() => set({ cargando: false, lastSync: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }))
            .catch(err => {
                const error = err instanceof Error ? err : new Error(String(err));
                ErrorService.handle(error, { component: 'useInventarioStore', operation: 'conectarInventario' });
                set({ error: `${MENSAJES.ERROR_CONEXION_REALTIME}\n(${error.message})`, cargando: false });
            });
    },

    cargarDatosSync: () => {
        set({ sincronizandoFondo: true });
        syncConSupabase()
            .catch((err) => {
                const error = err instanceof Error ? err : new Error(String(err));
                ErrorService.handle(error, { component: 'useInventarioStore', operation: 'cargarDatosSync' });
            })
            .finally(() => set({
                sincronizandoFondo: false,
                lastSync: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            }));
    },

    repararBaseDeDatos: async () => {
        set({ sincronizandoFondo: true, error: null });
        try {
            await syncConSupabase({ forceFull: true });
            set({
                lastSync: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                error: null
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            ErrorService.handle(error, { component: 'useInventarioStore', operation: 'repararBaseDeDatos' });
            set({ error: `No se pudo completar la reparación.\n${error.message}` });
        } finally {
            set({ sincronizandoFondo: false });
        }
    },

    setProductoEditando: (productoEditando) => set({ productoEditando }),

    guardarEdicion: async (fv, fechaEdicion, comentario) => {
        const { productoEditando } = get();
        if (!productoEditando) return { exito: false, mensajeError: 'No hay producto seleccionado' };

        const codigo = productoEditando.codBarras;
        const fvAnteriorTs = productoEditando.fvActualTs;
        const comentarioPrevio = productoEditando.comentarios;
        const userRole = useAuthStore.getState().user?.rol;
        const accion: TipoAccionHistorial = (comentario && !comentarioPrevio) ? 'COMENTARIO_AGREGADO' : 'FV_ACTUALIZADO';

        try {
            // Transacción atómica: actualizar producto + registrar movimiento local en una sola escritura
            await database.write(async () => {
                await productoEditando.update((p: Producto) => {
                    p.fvActualTs = parseFVToDate(fv);
                    p.fechaEdicion = fechaEdicion;
                    p.comentarios = comentario;
                });

                await database.get<Movimiento>('movimientos').create((m: Movimiento) => {
                    m.productoId = codigo;
                    m.sku = productoEditando.sku;
                    m.descripcion = productoEditando.descripcion;
                    m.marca = productoEditando.marca;
                    m.accion = accion;
                    m.fvAnteriorTs = fvAnteriorTs ?? undefined;
                    m.fvNuevoTs = parseFVToDate(fv) ?? undefined;
                    m.comentario = comentario;
                    m.dispositivo = Platform.OS === 'ios' ? '📱 iPhone' : '🤖 Android';
                    m.timestamp = Date.now();
                    m.rolUsuario = userRole;
                });
            });

            // Operaciones secundarias: webhook y sync en segundo plano (no críticas para la transacción local)
            InventarioRepository.actualizarProducto(
                codigo,
                {
                    FV_Actual: fv,
                    Fecha_edicion: fechaEdicion,
                    Comentarios: comentario,
                    Stock_Master: productoEditando.stockMaster
                },
                {
                    descripcion: productoEditando.descripcion,
                    marca: productoEditando.marca,
                    sku: productoEditando.sku,
                    fvAnteriorTs: fvAnteriorTs?.getTime(),
                    accion: accion,
                    rolUsuario: userRole
                }
            ).catch((error) => {
                ErrorService.handle(error, { component: 'useInventarioStore', operation: 'actualizarProductoWebhook' });
            });

            syncConSupabase().catch((error) => {
                ErrorService.handle(error, { component: 'useInventarioStore', operation: 'syncConSupabase' });
            });

            set({ productoEditando: null });
            return { exito: true, codigo };

        } catch (error) {
            ErrorService.handle(error, { component: 'useInventarioStore', operation: 'guardarEdicion', showToast: true });
            return { exito: false, mensajeError: 'Error al persistir localmente' };
        }
    }
}));

