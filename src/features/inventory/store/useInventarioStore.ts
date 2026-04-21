import { create } from 'zustand';
import { database } from '../../../core/database';
import Producto from '../../../core/database/models/Producto';
import { syncConSupabase } from '../services/syncService';
import { InventarioRepository } from '../repository/inventarioRepository';
import { MENSAJES } from '../../../core/constants/mensajes';
import { TipoAccionHistorial } from '../../../core/types/inventario';
import { parseFVToDate } from '../../../core/utils/fecha';

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
                console.error("Sync Error:", err);
                const msg = err instanceof Error ? err.message : String(err);
                set({ error: `${MENSAJES.ERROR_CONEXION_REALTIME}\n(${msg})`, cargando: false });
            });
    },

    cargarDatosSync: () => {
        set({ sincronizandoFondo: true });
        syncConSupabase()
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
            console.error("Repair Sync Error:", err);
            const msg = err instanceof Error ? err.message : String(err);
            set({ error: `No se pudo completar la reparación.\n${msg}` });
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

        try {
            // 1. ACTUALIZAR SQLITE (Para que la interfaz cambie al instante sin lag)
            await database.write(async () => {
                await productoEditando.update((p: Producto) => {
                    p.fvActualTs = parseFVToDate(fv);
                    p.fechaEdicion = fechaEdicion;
                    p.comentarios = comentario;
                });
            });

            // 2. REGISTRO DE AUDITORÍA LOCAL (Historial)
            await InventarioRepository.registrarMovimiento({
                productoId: codigo,
                descripcion: productoEditando.descripcion,
                marca: productoEditando.marca,
                sku: productoEditando.sku,
                accion: (comentario && !productoEditando.comentarios) ? 'COMENTARIO_AGREGADO' : 'FV_ACTUALIZADO',
                cambios: {
                    fvAnteriorTs: fvAnteriorTs?.getTime(),
                    fvNuevoTs: parseFVToDate(fv)?.getTime(),
                    comentario: comentario
                }
            });

            // 3. PUENTE A FIREBASE Y GOOGLE SHEETS (Usando el Repositorio original)
            const accion: TipoAccionHistorial = (comentario && !productoEditando.comentarios) ? 'COMENTARIO_AGREGADO' : 'FV_ACTUALIZADO';

            InventarioRepository.actualizarProducto(
                codigo,
                {
                    FV_Actual: fv,
                    Fecha_edicion: fechaEdicion,
                    Comentarios: comentario,
                    Stock_Master: productoEditando.stockMaster // 👈 Vital para que el Webhook mande el stock
                },
                {
                    descripcion: productoEditando.descripcion,
                    marca: productoEditando.marca,
                    sku: productoEditando.sku,
                    fvAnteriorTs: fvAnteriorTs?.getTime(),
                    accion: accion
                }
            ).catch(e => console.warn('[Store] Error en actualizarProducto:', e));

            // 4. Sincronización secundaria en 2do plano
            syncConSupabase().catch(e => console.warn('[Sync] Background error:', e));

            set({ productoEditando: null });
            return { exito: true, codigo };

        } catch (error) {
            console.error('[Store] Error al guardar en SQLite:', error);
            return { exito: false, mensajeError: 'Error al persistir localmente' };
        }
    }
}));

