import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class OutboxJob extends Model {
  static table = 'outbox_jobs';

  @field('payload') payload!: string;
  @field('job_type') jobType!: string;
  @field('status') status!: string; // 'PENDING' | 'COMPLETED' | 'FAILED'
  @field('attempts') attempts!: number;
  @field('next_retry_at') nextRetryAt?: number;
  @field('last_error') lastError?: string;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}
