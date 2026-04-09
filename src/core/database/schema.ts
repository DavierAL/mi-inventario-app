import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2,
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
        { name: 'fv_actual', type: 'string', isOptional: true },
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
        { name: 'fv_anterior', type: 'string', isOptional: true },
        { name: 'fv_nuevo', type: 'string', isOptional: true },
        { name: 'comentario', type: 'string', isOptional: true },
        { name: 'dispositivo', type: 'string' },
        { name: 'timestamp', type: 'number', isIndexed: true },
      ]
    }),
  ]
});
