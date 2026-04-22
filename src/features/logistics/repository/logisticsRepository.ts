import { database } from '../../../core/database';
import Envio from '../../../core/database/models/Envio';
import { LogisticaHistorialRepository } from './logisticaHistorialRepository';

export const LogisticsRepository = {
  /**
   * Actualiza el estado de un envío en la base de datos local.
   * El syncService se encargará de propagar el cambio a Supabase.
   */
  async actualizarEstado(envio: Envio, nuevoEstado: string): Promise<void> {
    const estadoAnterior = envio.estado;
    const codPedido = envio.codPedido;
    const envioId = envio.id;

    await database.write(async () => {
      await envio.update((p) => {
        p.estado = nuevoEstado;
      });
    });

    // Registrar en historial local
    await LogisticaHistorialRepository.registrarCambio({
      envioId,
      codPedido,
      estadoAnterior,
      estadoNuevo: nuevoEstado,
    });

    // Trigger sync to Supabase immediately
    const { syncConSupabase } = require('../../inventory/services/syncService');
    syncConSupabase().catch((err: Error) => console.error('[Logistics] Sync failed:', err.message));
  },

  /**
   * Busca un envío por su ID de WatermelonDB.
   */
  async obtenerPorId(id: string): Promise<Envio> {
    return await database.get<Envio>('envios').find(id);
  }
};
