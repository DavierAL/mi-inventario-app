import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Producto extends Model {
  static table = 'productos';

  @text('cod_barras') codBarras!: string;
  @text('sku') sku!: string;
  @text('descripcion') descripcion!: string;
  @field('stock_master') stockMaster!: number;
  @field('precio_web') precioWeb!: number;
  @field('precio_tienda') precioTienda!: number;
  @date('fv_actual_ts') fvActualTs?: Date; // V4
  @text('fecha_edicion') fechaEdicion?: string;
  @text('comentarios') comentarios?: string;
  @text('marca') marca!: string;
  @text('imagen') imagen?: string;

  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
}
