import { create } from 'zustand';
import { database } from '../../../core/database';
import Producto from '../../../core/database/models/Producto';
import { syncConFirebase } from '../services/syncService';
import { InventarioRepository } from '../repository/inventarioRepository';
import { MENSAJES } from '../../../core/constants/mensajes';
import { TipoAccionHistorial } from '../../../core/types/inventario';

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
    conectarInventario: () => void;
    setProductoEditando: (producto: Producto | null) => void;
    guardarEdicion: (fv: string, fechaEdicion: string, comentario: string) => Promise<ResultadoOperacion>;
    guardarEdicionDirecta: (producto: Producto) => Promise<ResultadoOperacion>;
    cargarDatosSync: () => void; 
}

export const useInventarioStore = create<InventarioState>((set, get) => ({
    cargando: false,
    error: null,
    modoOffline: false,
    lastSync: undefined,
    productoEditando: null,
    pendientesSync: 0,
    sincronizandoFondo: false,

    conectarInventario: () => {
        set({ cargando: true, error: null });
        syncConFirebase()
            .then(() => set({ cargando: false, lastSync: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }))
            .catch(err => {
                console.error("Sync Error:", err);
                set({ error: MENSAJES.ERROR_CONEXION_REALTIME, cargando: false });
            });
    },

    cargarDatosSync: () => {
        set({ sincronizandoFondo: true });
        syncConFirebase()
            .finally(() => set({ 
                sincronizandoFondo: false, 
                lastSync: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) 
            }));
    },

    setProductoEditando: (productoEditando) => set({ productoEditando }),

    guardarEdicion: async (fv, fechaEdicion, comentario) => {
        const { productoEditando } = get();
        if (!productoEditando) return { exito: false, mensajeError: 'No hay producto seleccionado' };

        const codigo = productoEditando.codBarras;

        try {
            await database.write(async () => {
                await productoEditando.update((p: Producto) => {
                    p.fvActual = fv;
                    p.fechaEdicion = fechaEdicion;
                    p.comentarios = comentario;
                });
            });

            // Registro de Auditoría Local-First
            InventarioRepository.registrarMovimiento({
                productoId: codigo,
                sku: productoEditando.sku,
                descripcion: productoEditando.descripcion,
                marca: productoEditando.marca,
                accion: (comentario && !productoEditando.comentarios) ? 'COMENTARIO_AGREGADO' : 'FV_ACTUALIZADO',
                cambios: {
                    fvAnterior: productoEditando.fvActual,
                    fvNuevo: fv,
                    comentario: comentario
                }
            }).catch(e => console.warn('[Store] Audit error:', e));
            
            syncConFirebase().catch(e => console.warn('[Sync] Background error:', e));

            set({ productoEditando: null });
            return { exito: true, codigo };

        } catch (error) {
            console.error('[Store] Error al guardar en SQLite:', error);
            return { exito: false, mensajeError: 'Error al persistir localmente' };
        }
    },

    guardarEdicionDirecta: async (producto) => {
        const codigo = producto.codBarras;
        const fecha = new Date().toISOString();

        try {
            await database.write(async () => {
                await producto.update((p: Producto) => {
                    p.fechaEdicion = fecha;
                });
            });

            InventarioRepository.registrarMovimiento({
                productoId: codigo,
                sku: producto.sku,
                descripcion: producto.descripcion,
                marca: producto.marca,
                accion: 'RAFAGA_PROCESADA',
                cambios: { fvNuevo: producto.fvActual }
            }).catch(() => {});

            syncConFirebase().catch(e => console.warn('[Sync] Background error:', e));
            return { exito: true, codigo };
        } catch (error) {
            return { exito: false, codigo };
        }
    }
}));

