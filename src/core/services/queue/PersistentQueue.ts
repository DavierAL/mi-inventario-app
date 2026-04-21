// src/core/services/queue/PersistentQueue.ts
import { database } from '../../database';
import { Q } from '@nozbe/watermelondb';
import OutboxJob from '../../database/models/OutboxJob';
import { JobStatus, JobType, QueueStats } from './types';

export class PersistentQueue {
  private get collection() {
    return database.get<OutboxJob>('outbox_jobs');
  }

  async enqueue(type: JobType, payload: any): Promise<OutboxJob> {
    return await database.write(async () => {
      return await this.collection.create((job) => {
        job.jobType = type;
        job.payload = JSON.stringify(payload);
        job.status = 'PENDING';
        job.attempts = 0;
      });
    });
  }

  async dequeue(): Promise<OutboxJob | null> {
    const now = Date.now();
    const pendingJobs = await this.collection
      .query(
        Q.and(
          Q.where('status', Q.oneOf(['PENDING', 'FAILED'])),
          Q.or(
            Q.where('next_retry_at', Q.eq(null)),
            Q.where('next_retry_at', Q.lt(now))
          )
        ),
        Q.sortBy('created_at', Q.asc), 
        Q.take(1)
      )
      .fetch();
    
    if (pendingJobs.length === 0) return null;
    
    const job = pendingJobs[0];
    await database.write(async () => {
      await job.update((j) => {
        j.status = 'PROCESSING';
      });
    });
    
    return job;
  }

  async updateRetry(jobId: string, nextRetryAt: number, error: string): Promise<void> {
    const job = await this.collection.find(jobId);
    await database.write(async () => {
      await job.update((j) => {
        j.status = 'FAILED';
        j.attempts += 1;
        j.nextRetryAt = nextRetryAt;
        j.lastError = error;
      });
    });
  }

  async updateStatus(jobId: string, status: JobStatus): Promise<void> {
    const job = await this.collection.find(jobId);
    await database.write(async () => {
      await job.update((j) => {
        j.status = status;
      });
    });
  }

  async markComplete(jobId: string): Promise<void> {
    const job = await this.collection.find(jobId);
    await database.write(async () => {
      await job.update((j) => {
        j.status = 'COMPLETED';
      });
    });
  }

  async cleanup(daysOld = 7): Promise<number> {
    const dateLimit = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const oldJobs = await this.collection
      .query(Q.where('status', 'COMPLETED'), Q.where('created_at', Q.lt(dateLimit)))
      .fetch();
    
    await database.write(async () => {
      for (const job of oldJobs) {
        await job.destroyPermanently();
      }
    });
    
    return oldJobs.length;
  }

  async getStats(): Promise<QueueStats> {
    const pending = await this.collection.query(Q.where('status', 'PENDING')).fetchCount();
    const processing = await this.collection.query(Q.where('status', 'PROCESSING')).fetchCount();
    const completed = await this.collection.query(Q.where('status', 'COMPLETED')).fetchCount();
    const failed = await this.collection.query(Q.where('status', 'FAILED')).fetchCount();
    
    return { pending, processing, completed, failed };
  }
}
