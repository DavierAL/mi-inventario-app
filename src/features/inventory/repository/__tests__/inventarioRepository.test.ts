import { InventarioRepository } from '../inventarioRepository';
import { database } from '../../../../core/database';
import { Q } from '@nozbe/watermelondb';

describe('InventarioRepository', () => {
    let mockTable: any;

    beforeEach(() => {
        mockTable = {
            query: jest.fn().mockReturnThis(),
            fetch: jest.fn().mockResolvedValue([]),
            find: jest.fn(),
            create: jest.fn(),
        };
        (database.get as jest.Mock).mockReturnValue(mockTable);
    });

    it('debe buscar por codigo de barras', async () => {
        await InventarioRepository.buscarPorCodigoBarras('12345');
        expect(mockTable.query).toHaveBeenCalled();
    });

    it('debe registrar un movimiento de historial', async () => {
        await InventarioRepository.registrarMovimiento({
            productoId: 'p1',
            sku: 'SKU1',
            descripcion: 'Test',
            marca: 'Marca',
            accion: 'EDICION_COMPLETA',
            cambios: {}
        });
        expect(database.write).toHaveBeenCalled();
    });
});
