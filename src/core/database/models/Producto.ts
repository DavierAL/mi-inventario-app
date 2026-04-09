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
  @text('fv_actual') fvActual?: string;
  @text('fecha_edicion') fechaEdicion?: string;
  @text('comentarios') comentarios?: string;
  @text('marca') marca!: string;
  @text('imagen') imagen?: string;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}
