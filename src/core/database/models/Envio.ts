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
  @field('supabase_id') supabaseId!: string;
  @field('pod_url') podUrl?: string | null;

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

  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;

  /**
   * Mapea un estado interno de la app al estado externo de Supabase/Google Sheets.
   */
  static toExternalStatus(interno: string): string {
    const status = interno.trim();
    if (status === 'Pendiente') return 'Impresión Etiqueta';
    if (status === 'En_Tienda') return 'Listo para envío';
    if (status === 'Entregado') return 'Entregado';
    return status;
  }

  /**
   * Mapea un estado externo de Supabase/Google Sheets al estado interno de la app.
   */
  static fromExternalStatus(externo: string): EstadoPedido {
    const norm = (externo || '').toLowerCase().replace(/_/g, ' ').trim();
    if (norm.includes('impresion etiqueta') || norm === 'pendiente' || norm.includes('revisar pago')) return 'Pendiente';
    if (norm.includes('listo para envio') || norm === 'en tienda' || norm === 'en_tienda') return 'En_Tienda';
    if (norm.includes('entregado')) return 'Entregado';
    return 'Pendiente';
  }
}
