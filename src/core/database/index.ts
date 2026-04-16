import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations';
import { schema } from './schema';
import Producto from './models/Producto';
import Movimiento from './models/Movimiento';
import Pedido from './models/Pedido';

const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
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
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'pedidos',
          columns: [
            { name: 'cod_pedido', type: 'string', isIndexed: true },
            { name: 'cliente', type: 'string' },
            { name: 'estado', type: 'string', isIndexed: true },
            { name: 'operador', type: 'string', isOptional: true },
            { name: 'pod_local_uri', type: 'string', isOptional: true },
            { name: 'url_foto', type: 'string', isOptional: true },
            { name: 'notas', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
});

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  migrationsEnabledAtVersion: 2,
  // JSI habilita comunicación directa entre JS y C++ (SQLite) — más rápido
  jsi: true,
  onSetUpError: error => {
    console.error('Database failed to load', error);
  },
});

let databaseInstance: Database;

try {
  databaseInstance = new Database({
    adapter,
    modelClasses: [Producto, Movimiento, Pedido],
  });
} catch (error) {
  console.error('[DB] Critical error initializing database:', error);
  throw error;
}

export const database = databaseInstance;
