import { database } from '../../../core/database';
import Pedido, { EstadoPedido } from '../../../core/database/models/Pedido';

export const LogisticsRepository = {
  /**
   * Actualiza el estado de un pedido en la base de datos local.
   * El syncService se encargará de propagar el cambio a Supabase.
   */
  async actualizarEstado(pedido: Pedido, nuevoEstado: EstadoPedido): Promise<void> {
    await database.write(async () => {
      await pedido.update((p) => {
        p.estado = nuevoEstado;
      });
    });
  },

  /**
   * Busca un pedido por su ID de WatermelonDB.
   */
  async obtenerPorId(id: string): Promise<Pedido> {
    return await database.get<Pedido>('pedidos').find(id);
  }
};
