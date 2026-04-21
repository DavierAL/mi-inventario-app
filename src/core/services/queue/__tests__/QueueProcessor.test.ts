// src/core/services/queue/__tests__/QueueProcessor.test.ts
import { QueueProcessor } from '../QueueProcessor';
import { PersistentQueue } from '../PersistentQueue';
import { jobHandlers } from '../jobHandlers';

jest.mock('../PersistentQueue');
jest.mock('../jobHandlers');

describe('QueueProcessor', () => {
  let processor: QueueProcessor;
  let mockQueue: jest.Mocked<PersistentQueue>;

  beforeEach(() => {
    jest.useFakeTimers();
    processor = new QueueProcessor({ pollIntervalMs: 100 });
    mockQueue = (processor as any).queue;
    jest.clearAllMocks();
  });

  afterEach(() => {
    processor.stop();
    jest.useRealTimers();
  });

  test('processNext handles successful job', async () => {
    const mockJob = {
      id: '123',
      jobType: 'webhook',
      payload: JSON.stringify({ data: 'test' }),
    };

    mockQueue.dequeue.mockResolvedValueOnce(mockJob as any);
    (jobHandlers.webhook as jest.Mock).mockResolvedValueOnce(true);

    await (processor as any).processNext();

    expect(jobHandlers.webhook).toHaveBeenCalledWith({ data: 'test' });
    expect(mockQueue.markComplete).toHaveBeenCalledWith('123');
  });

  test('processNext handles job failure with retry', async () => {
    const mockJob = {
      id: '123',
      jobType: 'webhook',
      payload: JSON.stringify({ data: 'test' }),
      attempts: 0,
    };

    mockQueue.dequeue.mockResolvedValueOnce(mockJob as any);
    (jobHandlers.webhook as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

    await (processor as any).processNext();

    expect(mockQueue.updateRetry).toHaveBeenCalledWith(
      '123',
      expect.any(Number),
      'Network Error'
    );
  });

  test('start and stop management', () => {
    processor.start();
    expect((processor as any).isRunning).toBe(true);
    
    processor.stop();
    expect((processor as any).isRunning).toBe(false);
  });
});
