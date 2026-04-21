import { logisticsRepository } from '../logisticsRepository';
import { database } from '../../../core/database';

describe('LogisticsRepository', () => {
    let mockTable: any;

    beforeEach(() => {
        mockTable = {
            query: jest.fn().mockReturnThis(),
            fetch: jest.fn().mockResolvedValue([]),
        };
        (database.get as jest.Mock).mockReturnValue(mockTable);
    });

    it('obtiene envios pendientes', async () => {
        await logisticsRepository.getEnviosPendientes();
        expect(mockTable.query).toHaveBeenCalled();
    });
});
