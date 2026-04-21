import { Model } from '@nozbe/watermelondb';
import { field, text, readonly } from '@nozbe/watermelondb/decorators';

export default class Usuario extends Model {
  static table = 'usuarios';

  @text('nombre') nombre!: string;
  @text('email') email!: string;
  @text('rol') rol!: string;
  @field('activo') activo!: boolean;

  @readonly @field('created_at') createdAt!: number;
  @readonly @field('updated_at') updatedAt!: number;
}
