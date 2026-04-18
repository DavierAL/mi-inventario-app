import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 5,
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
      name: 'pedidos',
      columns: [
        { name: 'cod_pedido', type: 'string', isIndexed: true },
        { name: 'cliente', type: 'string' },
        { name: 'estado', type: 'string', isIndexed: true }, // Pendiente | Picking | En_Tienda | Entregado
        { name: 'operador', type: 'string', isOptional: true },
        { name: 'pod_local_uri', type: 'string', isOptional: true }, // URI foto local (pre-upload)
        { name: 'url_foto', type: 'string', isOptional: true },      // URL Firebase Storage (post-upload)
        { name: 'notas', type: 'string', isOptional: true },
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
