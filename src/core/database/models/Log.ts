// src/core/database/models/Log.ts
import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Log extends Model {
  static table = 'logs';

  @field('level') level!: string;
  @field('message') message!: string;
  @field('context') context!: string;
  @readonly @date('timestamp') timestamp!: number;
}
