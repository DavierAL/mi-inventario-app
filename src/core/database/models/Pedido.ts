import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children } from '@nozbe/watermelondb/decorators';

export type EstadoPedido = 'Pendiente' | 'En_Tienda' | 'Entregado';

export default class Pedido extends Model {
  static table = 'pedidos';

  @text('cod_pedido') codPedido!: string;
  @text('cliente') cliente!: string;
  @text('estado') estado!: EstadoPedido;
  @text('operador') operador?: string;
  @text('pod_local_uri') podLocalUri?: string;
  @text('url_foto') urlFoto?: string;
  @text('notas') notas?: string;

  // --- Nuevos campos V6 ---
  @field('woo_order_id') wooOrderId?: number;
  @text('canal') canal?: string;
  @text('cliente_telefono') clienteTelefono?: string;
  @text('direccion') direccion?: string;
  @text('distrito') distrito?: string;
  @text('referencia') referencia?: string;
  @text('gmaps_url') gmapsUrl?: string;
  @text('fecha_entrega') fechaEntrega?: string;
  @text('metodo_pago_display') metodoPagoDisplay?: string;
  @field('total_woo') totalWoo?: number;
  @text('operador_logistico') operadorLogistico?: string;
  @text('tracking_interno') trackingInterno?: string;

  @children('pedido_items') items!: any; // Relación con los items del pedido

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}
