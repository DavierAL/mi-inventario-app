// src/core/services/queue/__tests__/PersistentQueue.test.ts
import { PersistentQueue } from '../PersistentQueue';
import { database } from '../../../database';

describe('PersistentQueue', () => {
  let queue: PersistentQueue;

  beforeEach(() => {
    queue = new PersistentQueue();
    jest.clearAllMocks();
  });

  test('enqueue creates a job with PENDING status', async () => {
    const payload = { test: 'data' };
    await queue.enqueue('webhook', payload);

    expect(database.get('outbox_jobs').create).toHaveBeenCalledWith(expect.any(Function));
  });

  test('dequeue fetches and updates a pending job', async () => {
    const mockJob = {
      id: '123',
      status: 'PENDING',
      update: jest.fn(fn => fn(mockJob)),
    };

    (database.get('outbox_jobs').query().fetch as jest.Mock).mockResolvedValueOnce([mockJob]);

    const job = await queue.dequeue();

    expect(job).toBe(mockJob);
    expect(mockJob.update).toHaveBeenCalled();
    expect(mockJob.status).toBe('PROCESSING');
  });

  test('markComplete updates status to COMPLETED', async () => {
    const mockJob = {
      id: '123',
      update: jest.fn(fn => fn(mockJob)),
    };

    (database.get('outbox_jobs').find as jest.Mock).mockResolvedValueOnce(mockJob);

    await queue.markComplete('123');

    expect(mockJob.status).toBe('COMPLETED');
  });

  test('getStats returns counts for each status', async () => {
    (database.get('outbox_jobs').query().fetchCount as jest.Mock).mockResolvedValue(5);

    const stats = await queue.getStats();

    expect(stats).toEqual({
      pending: 5,
      processing: 5,
      completed: 5,
      failed: 5,
    });
  });
});
