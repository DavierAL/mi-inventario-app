import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Movimiento extends Model {
  static table = 'movimientos';

  @text('producto_id') productoId!: string;
  @text('sku') sku!: string;
  @text('descripcion') descripcion!: string;
  @text('marca') marca!: string;
  @text('accion') accion!: string;
  @text('fv_anterior') fvAnterior?: string;
  @text('fv_nuevo') fvNuevo?: string;
  @text('comentario') comentario?: string;
  @text('dispositivo') dispositivo!: string;
  
  @field('timestamp') timestamp!: number;
}
