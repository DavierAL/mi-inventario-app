import { database } from '../../../core/database';
import LogisticaHistorial from '../../../core/database/models/LogisticaHistorial';
import { Q } from '@nozbe/watermelondb';

export const LogisticaHistorialRepository = {
  /**
   * Registra un cambio de estado en el historial local.
   */
  async registrarCambio(params: {
    envioId: string;
    codPedido: string;
    estadoAnterior: string;
    estadoNuevo: string;
    operador?: string;
  }): Promise<void> {
    await database.write(async () => {
      await database.get<LogisticaHistorial>('logistica_historial').create((h) => {
        h.envioId = params.envioId;
        h.codPedido = params.codPedido;
        h.estadoAnterior = params.estadoAnterior;
        h.estadoNuevo = params.estadoNuevo;
        h.timestamp = Date.now();
        h.operador = params.operador;
      });
    });
  },

  /**
   * Obtiene el historial completo ordenado por fecha descendente.
   */
  async obtenerHistorial(): Promise<LogisticaHistorial[]> {
    return await database
      .get<LogisticaHistorial>('logistica_historial')
      .query(Q.sortBy('timestamp', Q.desc))
      .fetch();
  },

  /**
   * Obtiene el historial de un envío específico.
   */
  async obtenerPorEnvio(envioId: string): Promise<LogisticaHistorial[]> {
    return await database
      .get<LogisticaHistorial>('logistica_historial')
      .query(
        Q.where('envio_id', envioId),
        Q.sortBy('timestamp', Q.desc)
      )
      .fetch();
  }
};
