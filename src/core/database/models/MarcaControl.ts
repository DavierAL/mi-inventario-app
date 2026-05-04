import { Model } from '@nozbe/watermelondb';
import { field, text, date } from '@nozbe/watermelondb/decorators';

export default class MarcaControl extends Model {
  static table = 'marcas_control';

  @text('nombre') nombre!: string;
  @field('dias_rango') diasRango!: number;
  @date('ultimo_conteo') ultimoConteo?: Date;
  @field('inventariar') inventariar!: boolean;

  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
}
