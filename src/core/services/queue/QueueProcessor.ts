// src/core/services/queue/QueueProcessor.ts
import { PersistentQueue } from './PersistentQueue';
import { QueueRetryStrategy } from './QueueRetryStrategy';
import { jobHandlers } from './jobHandlers';
import { JobType } from './types';

export class QueueProcessor {
  private queue = new PersistentQueue();
  private retryStrategy = new QueueRetryStrategy();
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private pollIntervalMs: number;

  constructor(config: { pollIntervalMs?: number } = {}) {
    this.pollIntervalMs = config.pollIntervalMs || 5000; // 5s default
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.run();
    console.log('[QueueProcessor] Started');
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('[QueueProcessor] Stopped');
  }

  private async run() {
    if (!this.isRunning) return;

    try {
      await this.processNext();
    } catch (error) {
      console.error('[QueueProcessor] Error in run loop:', error);
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => this.run(), this.pollIntervalMs);
    }
  }

  private async processNext() {
    const job = await this.queue.dequeue();
    if (!job) return;

    console.log(`[QueueProcessor] Processing job ${job.id} (${job.jobType})`);

    try {
      const payload = JSON.parse(job.payload);
      const handler = jobHandlers[job.jobType as JobType];

      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.jobType}`);
      }

      const success = await handler(payload);

      if (success) {
        await this.queue.markComplete(job.id);
        console.log(`[QueueProcessor] Job ${job.id} completed`);
      } else {
        // Handler returned false, maybe a logic error, we retry
        await this.handleFailure(job, new Error('Handler returned false'));
      }
    } catch (error: any) {
      console.error(`[QueueProcessor] Job ${job.id} failed:`, error.message);
      await this.handleFailure(job, error);
    }
  }

  private async handleFailure(job: any, error: Error) {
    if (this.retryStrategy.shouldRetry(job)) {
      const nextRetry = this.retryStrategy.getNextRetryTime(job);
      await this.queue.updateRetry(job.id, nextRetry.getTime(), error.message);
      console.log(`[QueueProcessor] Job ${job.id} scheduled for retry at ${nextRetry.toISOString()}`);
    } else {
      await this.queue.updateStatus(job.id, 'FAILED');
      console.log(`[QueueProcessor] Job ${job.id} failed after max attempts`);
    }
  }

  async getStats() {
    return this.queue.getStats();
  }
}

// Export singleton instance
export const queueProcessor = new QueueProcessor();
