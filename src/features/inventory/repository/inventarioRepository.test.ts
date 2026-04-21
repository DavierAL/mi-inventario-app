import { InventarioRepository } from './inventarioRepository';
import { database } from '../../../core/database';
import { benchmark } from '../../../core/utils/benchmark';

// Mock de QueueService
jest.mock('../../../core/services/QueueService', () => ({
  QueueService: {
    encolar: jest.fn().mockResolvedValue({}),
  },
}));

describe('InventarioRepository - Operations & Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('buscarPorCodigoBarras performance', async () => {
    const { metrics } = await benchmark('Repo Search By Barcode', async () => {
      await InventarioRepository.buscarPorCodigoBarras('123456789');
    });

    expect(metrics.durationMs).toBeLessThan(50);
  });

  test('actualizarProducto workflow (SQLite + Audit)', async () => {
    // Mocking database behavior
    const mockProducto = {
        update: jest.fn(fn => fn({})),
        codBarras: '123456789',
        stockMaster: 10,
    };
    
    (database.get as jest.Mock).mockReturnValue({
        query: jest.fn().mockReturnThis(),
        fetch: jest.fn().mockResolvedValue([mockProducto]),
        create: jest.fn().mockResolvedValue({}),
    });

    const { metrics } = await benchmark('Repo Full Update Flow', async () => {
      await InventarioRepository.actualizarProducto('123456789', { Stock_Master: 20 });
    });

    expect(database.write).toHaveBeenCalled();
    expect(metrics.durationMs).toBeLessThan(100);
  });
});
