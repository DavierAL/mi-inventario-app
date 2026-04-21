// src/core/services/queue/__tests__/QueueRetryStrategy.test.ts
import { QueueRetryStrategy } from '../QueueRetryStrategy';

describe('QueueRetryStrategy', () => {
  let strategy: QueueRetryStrategy;

  beforeEach(() => {
    strategy = new QueueRetryStrategy();
  });

  test('shouldRetry returns true if attempts < maxAttempts', () => {
    const mockJob = { attempts: 0 } as any;
    expect(strategy.shouldRetry(mockJob)).toBe(true);

    const maxedJob = { attempts: 10 } as any;
    expect(strategy.shouldRetry(maxedJob)).toBe(false);
  });

  test('calculateNextRetryDelay increases exponentially', () => {
    const delay0 = strategy.calculateNextRetryDelay(0);
    const delay1 = strategy.calculateNextRetryDelay(1);
    const delay2 = strategy.calculateNextRetryDelay(2);

    // Allowing for jitter (±20%)
    expect(delay0).toBeGreaterThanOrEqual(800);
    expect(delay0).toBeLessThanOrEqual(1200);

    expect(delay1).toBeGreaterThanOrEqual(1600);
    expect(delay1).toBeLessThanOrEqual(2400);

    expect(delay2).toBeGreaterThanOrEqual(3200);
    expect(delay2).toBeLessThanOrEqual(4800);
  });

  test('getNextRetryTime returns a date in the future', () => {
    const mockJob = { attempts: 0 } as any;
    const nextTime = strategy.getNextRetryTime(mockJob);
    
    expect(nextTime.getTime()).toBeGreaterThan(Date.now());
  });
});
