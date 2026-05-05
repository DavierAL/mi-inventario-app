import { MarcasService, MarcaEstado } from '../services/marcasService';
import MarcaControl from '../../../core/database/models/MarcaControl';

describe('MarcasService', () => {
  const crearMarcaMock = (overrides: Partial<MarcaControl> = {}): MarcaControl => {
    const now = new Date();
    return {
      id: overrides.id || '1',
      nombre: overrides.nombre || 'Marca Test',
      diasRango: overrides.diasRango || 30,
      ultimoConteo: overrides.ultimoConteo || now,
      inventariar: overrides.inventariar ?? true,
    } as MarcaControl;
  };

  describe('calcularEstado', () => {
    it('calcula estado correctamente para marca al día', () => {
      const hace10Dias = new Date();
      hace10Dias.setDate(hace10Dias.getDate() - 10);
      
      const marcas = [crearMarcaMock({ diasRango: 30, ultimoConteo: hace10Dias })];
      const result = MarcasService.calcularEstado(marcas);

      expect(result).toHaveLength(1);
      expect(result[0].estaAtrasada).toBe(false);
      expect(result[0].proximoConteoEn).toBeGreaterThan(0);
    });

    it('marca marca como atrasada cuando dias desde ultimo conteo >= diasRango', () => {
      const hace31Dias = new Date();
      hace31Dias.setDate(hace31Dias.getDate() - 31);
      
      const marcas = [crearMarcaMock({ diasRango: 30, ultimoConteo: hace31Dias })];
      const result = MarcasService.calcularEstado(marcas);

      expect(result[0].estaAtrasada).toBe(true);
    });

    it('marca diasDesdeUltimoConteo como -1 cuando ultimoConteo es null', () => {
      const marcas = [crearMarcaMock({ ultimoConteo: null as any })];
      const result = MarcasService.calcularEstado(marcas);

      expect(result[0].diasDesdeUltimoConteo).toBe(-1);
    });

    it('marca como no inventariar cuando inventariar es false', () => {
      const ahora = new Date();
      const marcas = [crearMarcaMock({ inventariar: false, ultimoConteo: ahora })];
      const result = MarcasService.calcularEstado(marcas);

      expect(result[0].inventariar).toBe(false);
      expect(result[0].estaAtrasada).toBe(false);
    });
  });

  describe('marcasAtrasadas', () => {
    it('filtra solo marcas atrasadas que se inventarian', () => {
      const hace10Dias = new Date();
      hace10Dias.setDate(hace10Dias.getDate() - 10);

      const estados: MarcaEstado[] = [
        { id: '1', nombre: 'Atrasada', diasRango: 30, ultimoConteo: new Date(), inventariar: true, diasDesdeUltimoConteo: 10, proximoConteoEn: 20, estaAtrasada: true },
        { id: '2', nombre: 'AlDia', diasRango: 30, ultimoConteo: new Date(), inventariar: true, diasDesdeUltimoConteo: 5, proximoConteoEn: 25, estaAtrasada: false },
        { id: '3', nombre: 'NoInv', diasRango: 30, ultimoConteo: new Date(), inventariar: false, diasDesdeUltimoConteo: 10, proximoConteoEn: 20, estaAtrasada: false },
      ];

      const result = MarcasService.marcasAtrasadas(estados);

      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe('Atrasada');
    });
  });

  describe('marcasAlDia', () => {
    it('filtra solo marcas al día que se inventarian', () => {
      const estados: MarcaEstado[] = [
        { id: '1', nombre: 'Atrasada', diasRango: 30, ultimoConteo: new Date(), inventariar: true, diasDesdeUltimoConteo: 10, proximoConteoEn: 20, estaAtrasada: true },
        { id: '2', nombre: 'AlDia', diasRango: 30, ultimoConteo: new Date(), inventariar: true, diasDesdeUltimoConteo: 5, proximoConteoEn: 25, estaAtrasada: false },
        { id: '3', nombre: 'NoInv', diasRango: 30, ultimoConteo: new Date(), inventariar: false, diasDesdeUltimoConteo: 10, proximoConteoEn: 20, estaAtrasada: false },
      ];

      const result = MarcasService.marcasAlDia(estados);

      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe('AlDia');
    });
  });

  describe('marcasNoInventariar', () => {
    it('filtra marcas con inventariar false', () => {
      const estados: MarcaEstado[] = [
        { id: '1', nombre: 'Activa', diasRango: 30, ultimoConteo: new Date(), inventariar: true, diasDesdeUltimoConteo: 5, proximoConteoEn: 25, estaAtrasada: false },
        { id: '2', nombre: 'Inactiva', diasRango: 30, ultimoConteo: new Date(), inventariar: false, diasDesdeUltimoConteo: 5, proximoConteoEn: 25, estaAtrasada: false },
      ];

      const result = MarcasService.marcasNoInventariar(estados);

      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe('Inactiva');
    });
  });
});