import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Movimiento extends Model {
  static table = 'movimientos';

  @text('producto_id') productoId!: string;
  @text('sku') sku!: string;
  @text('descripcion') descripcion!: string;
  @text('marca') marca!: string;
  @text('accion') accion!: string;
  @date('fv_anterior_ts') fvAnteriorTs?: Date; // V4
  @date('fv_nuevo_ts') fvNuevoTs?: Date; // V4
  @text('comentario') comentario?: string;
  @text('dispositivo') dispositivo!: string;
  
  @field('timestamp') timestamp!: number;
}
