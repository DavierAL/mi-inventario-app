import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class LogisticaHistorial extends Model {
  static table = 'logistica_historial';

  @text('envio_id') envioId!: string;
  @text('cod_pedido') codPedido!: string;
  @text('estado_anterior') estadoAnterior!: string;
  @text('estado_nuevo') estadoNuevo!: string;
  @field('timestamp') timestamp!: number;
  @text('operador') operador?: string;
  @text('rol_usuario') rolUsuario?: string;
}
