// src/core/database/models/SyncHistory.ts
import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class SyncHistory extends Model {
  static table = 'sync_history';

  @field('last_sync_at') lastSyncAt!: number;
  @field('status') status!: string; // SUCCESS | FAILED
  @field('pulled_count') pulledCount!: number;
  @field('pushed_count') pushedCount!: number;
  @field('error_message') errorMessage?: string;
}
