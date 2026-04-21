import { inventarioRepository } from '../inventarioRepository';
import { database } from '../../../core/database';
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

    it('busca productos por descripcion o barcode', async () => {
        await inventarioRepository.buscar('test');
        expect(mockTable.query).toHaveBeenCalled();
    });

    it('obtiene productos con stock bajo', async () => {
        await inventarioRepository.getProductosBajoStock(5);
        expect(mockTable.query).toHaveBeenCalledWith(
            expect.arrayContaining([expect.anything()])
        );
    });
});
