import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export type EstadoPedido = 'Pendiente' | 'Picking' | 'En_Tienda' | 'Entregado';

export default class Pedido extends Model {
  static table = 'pedidos';

  @text('cod_pedido') codPedido!: string;
  @text('cliente') cliente!: string;
  @text('estado') estado!: EstadoPedido;
  @text('operador') operador?: string;
  @text('pod_local_uri') podLocalUri?: string;
  @text('url_foto') urlFoto?: string;
  @text('notas') notas?: string;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}
