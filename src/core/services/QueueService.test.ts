import { QueueService } from './QueueService';
import { database } from '../database';
import { benchmark } from '../utils/benchmark';

// Mock FileSystem
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  readAsStringAsync: jest.fn().mockResolvedValue('base64data'),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { Base64: 'base64' },
}));

describe('QueueService - Offline Sync & Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('encolar webhook performance', async () => {
    const { metrics } = await benchmark('Queue Enqueue Webhook', async () => {
      await QueueService.encolar({ codigoBarras: '123', nuevoStock: 10 });
    });

    expect(database.write).toHaveBeenCalled();
    expect(metrics.durationMs).toBeLessThan(50);
  });

  test('procesarCola con mock de red', async () => {
      global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          text: jest.fn().mockResolvedValue(JSON.stringify({ status: 'success' })),
      });

      const mockJob = {
          payload: JSON.stringify({ codigoBarras: '123' }),
          update: jest.fn(fn => fn({})),
      };

      (database.get as jest.Mock).mockReturnValue({
          query: jest.fn().mockReturnThis(),
          fetch: jest.fn().mockResolvedValue([mockJob]),
      });

      const { metrics } = await benchmark('Queue Process Webhooks', async () => {
          await QueueService.procesarCola();
      });

      expect(global.fetch).toHaveBeenCalled();
      expect(metrics.durationMs).toBeLessThan(100);
  });
});
