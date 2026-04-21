import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children } from '@nozbe/watermelondb/decorators';

export type EstadoPedido = 'Pendiente' | 'En_Tienda' | 'Entregado';

export default class Envio extends Model {
  static table = 'envios';

  @text('cod_pedido') codPedido!: string;
  @text('cliente') cliente!: string;
  @text('estado') estado!: string;
  @text('operador') operador?: string;
  @text('url_foto') urlFoto?: string;
  @text('pod_local_uri') podLocalUri?: string;
  @text('notas') notas?: string;
  @text('direccion') direccion?: string;
  @text('distrito') distrito?: string;
  @text('telefono') telefono?: string;
  @text('gmaps_url') gmapsUrl?: string;
  @text('referencia') referencia?: string;
  @text('forma_pago') formaPago?: string;
  @field('a_pagar') aPagar?: number;
  @field('recaudado') recaudado?: number;
  @field('costo_envio') costoEnvio?: number;
  @text('operacion') operacion?: string;
  @text('tamano') tamano?: string;
  @field('peso') peso?: number;
  @field('bultos') bultos?: number;
  @text('hora_desde') horaDesde?: string;
  @text('hora_hasta') horaHasta?: string;

  @children('pedido_items') items!: any;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}
