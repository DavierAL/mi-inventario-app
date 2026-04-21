// src/core/services/queue/QueueRetryStrategy.ts
import OutboxJob from '../../database/models/OutboxJob';

export class QueueRetryStrategy {
  private readonly maxAttempts = 10;
  private readonly baseDelayMs = 1000; // 1s

  shouldRetry(job: OutboxJob): boolean {
    return job.attempts < this.maxAttempts;
  }

  calculateNextRetryDelay(attempts: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    const backoff = this.baseDelayMs * Math.pow(2, attempts);
    
    // Add jitter: ±20%
    const jitter = backoff * 0.2 * (Math.random() * 2 - 1);
    
    return backoff + jitter;
  }

  getNextRetryTime(job: OutboxJob): Date {
    const delay = this.calculateNextRetryDelay(job.attempts);
    return new Date(Date.now() + delay);
  }

  async executeWithRetry<T>(fn: () => Promise<T>, attempts = 0): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempts >= this.maxAttempts) {
        throw error;
      }
      
      const delay = this.calculateNextRetryDelay(attempts);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.executeWithRetry(fn, attempts + 1);
    }
  }
}
