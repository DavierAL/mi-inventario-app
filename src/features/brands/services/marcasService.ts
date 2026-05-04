import { database } from '../../../core/database';
import { ErrorService } from '../../../core/services/ErrorService';
import MarcaControl from '../../../core/database/models/MarcaControl';

export interface MarcaEstado {
  id: string;
  nombre: string;
  diasRango: number;
  ultimoConteo?: Date;
  inventariar: boolean;
  diasDesdeUltimoConteo: number;
  proximoConteoEn: number;
  estaAtrasada: boolean;
}

export const MarcasService = {
  async obtenerMarcas(): Promise<MarcaControl[]> {
    try {
      return await database.get<MarcaControl>('marcas_control').query().fetch();
    } catch (error) {
      ErrorService.handle(error, { component: 'MarcasService', operation: 'obtenerMarcas' });
      return [];
    }
  },

  async actualizarUltimoConteo(marcaNombre: string): Promise<void> {
    try {
      const marcas = await database.get<MarcaControl>('marcas_control')
        .query()
        .fetch();
      const marca = marcas.find(m => m.nombre === marcaNombre);
      if (marca) {
        await database.write(async () => {
          await marca.update((m: MarcaControl) => {
            m.ultimoConteo = new Date();
          });
        });
      }
    } catch (error) {
      ErrorService.handle(error, { component: 'MarcasService', operation: 'actualizarUltimoConteo' });
    }
  },

  async actualizarMarca(
    marcaId: string,
    datos: { diasRango?: number; inventariar?: boolean }
  ): Promise<void> {
    try {
      const marca = await database.get<MarcaControl>('marcas_control').find(marcaId);
      if (marca) {
        await database.write(async () => {
          await marca.update((m: MarcaControl) => {
            if (datos.diasRango !== undefined) m.diasRango = datos.diasRango;
            if (datos.inventariar !== undefined) m.inventariar = datos.inventariar;
          });
        });
      }
    } catch (error) {
      ErrorService.handle(error, { component: 'MarcasService', operation: 'actualizarMarca' });
    }
  },

  calcularEstado(marcas: MarcaControl[]): MarcaEstado[] {
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);

    return marcas.map(marca => {
      const ultimo = marca.ultimoConteo;
      const diasDesde = ultimo
        ? Math.floor((ahora.getTime() - ultimo.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;
      const proximo = marca.diasRango - diasDesde;
      const atrasada = marca.inventariar && diasDesde >= marca.diasRango;

      return {
        id: marca.id,
        nombre: marca.nombre,
        diasRango: marca.diasRango,
        ultimoConteo: ultimo,
        inventariar: marca.inventariar,
        diasDesdeUltimoConteo: diasDesde === Infinity ? -1 : diasDesde,
        proximoConteoEn: proximo,
        estaAtrasada: atrasada,
      };
    });
  },

  marcasAtrasadas(estados: MarcaEstado[]): MarcaEstado[] {
    return estados.filter(e => e.inventariar && e.estaAtrasada);
  },

  marcasAlDia(estados: MarcaEstado[]): MarcaEstado[] {
    return estados.filter(e => e.inventariar && !e.estaAtrasada);
  },

  marcasNoInventariar(estados: MarcaEstado[]): MarcaEstado[] {
    return estados.filter(e => !e.inventariar);
  },
};
