import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 6,
  tables: [
    tableSchema({
      name: 'productos',
      columns: [
        { name: 'cod_barras', type: 'string', isIndexed: true },
        { name: 'sku', type: 'string', isIndexed: true },
        { name: 'descripcion', type: 'string' },
        { name: 'stock_master', type: 'number' },
        { name: 'precio_web', type: 'number' },
        { name: 'precio_tienda', type: 'number' },
        { name: 'fv_actual_ts', type: 'number', isOptional: true, isIndexed: true }, // Nuevo campo V4
        { name: 'fecha_edicion', type: 'string', isOptional: true },
        { name: 'comentarios', type: 'string', isOptional: true },
        { name: 'marca', type: 'string' },
        { name: 'imagen', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }
      ]
    }),
    tableSchema({
      name: 'movimientos',
      columns: [
        { name: 'producto_id', type: 'string', isIndexed: true },
        { name: 'sku', type: 'string' },
        { name: 'descripcion', type: 'string' },
        { name: 'marca', type: 'string' },
        { name: 'accion', type: 'string' },
        { name: 'fv_anterior_ts', type: 'number', isOptional: true, isIndexed: true }, // Nuevo campo V4
        { name: 'fv_nuevo_ts', type: 'number', isOptional: true, isIndexed: true }, // Nuevo campo V4
        { name: 'comentario', type: 'string', isOptional: true },
        { name: 'dispositivo', type: 'string' },
        { name: 'timestamp', type: 'number', isIndexed: true },
      ]
    }),
    tableSchema({
      name: 'envios',
      columns: [
        { name: 'cod_pedido', type: 'string', isIndexed: true },
        { name: 'cliente', type: 'string' },
        { name: 'estado', type: 'string', isIndexed: true },
        { name: 'operador', type: 'string', isOptional: true },
        { name: 'url_foto', type: 'string', isOptional: true },
        { name: 'pod_local_uri', type: 'string', isOptional: true },
        { name: 'notas', type: 'string', isOptional: true },
        { name: 'direccion', type: 'string', isOptional: true },
        { name: 'distrito', type: 'string', isOptional: true },
        { name: 'telefono', type: 'string', isOptional: true },
        { name: 'gmaps_url', type: 'string', isOptional: true },
        { name: 'referencia', type: 'string', isOptional: true },
        { name: 'forma_pago', type: 'string', isOptional: true },
        { name: 'a_pagar', type: 'number', isOptional: true },
        { name: 'recaudado', type: 'number', isOptional: true },
        { name: 'costo_envio', type: 'number', isOptional: true },
        { name: 'operacion', type: 'string', isOptional: true },
        { name: 'tamano', type: 'string', isOptional: true },
        { name: 'peso', type: 'number', isOptional: true },
        { name: 'bultos', type: 'number', isOptional: true },
        { name: 'hora_desde', type: 'string', isOptional: true },
        { name: 'hora_hasta', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    // Nueva tabla para reemplazar AsyncStorage (V4)
    tableSchema({
      name: 'outbox_jobs',
      columns: [
        { name: 'payload', type: 'string' },
        { name: 'job_type', type: 'string', isIndexed: true },
        { name: 'status', type: 'string', isIndexed: true }, // PENDING | COMPLETED | FAILED
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    })
  ]
});
