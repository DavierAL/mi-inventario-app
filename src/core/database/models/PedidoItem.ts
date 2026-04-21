import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export default class PedidoItem extends Model {
  static table = 'pedido_items';

  static associations = {
    pedidos: { type: 'belongs_to', key: 'pedido_id' },
  } as const;

  @field('pedido_id') pedidoId!: string;
  @text('descripcion_woo') descripcionWoo!: string;
  @text('sku_woo') skuWoo?: string;
  @field('cantidad_pedida') cantidadPedida!: number;
  @field('precio_unitario_woo') precioUnitarioWoo!: number;

  @relation('pedidos', 'pedido_id') pedido!: any;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}
