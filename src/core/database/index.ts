import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';
import { schema } from './schema';
import Producto from './models/Producto';
import Movimiento from './models/Movimiento';
import Pedido from './models/Pedido';
import OutboxJob from './models/OutboxJob';

const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 5,
      steps: [] // Limpieza lógica de columnas obsoletas V4
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'productos',
          columns: [
            { name: 'fv_actual_ts', type: 'number', isOptional: true, isIndexed: true },
          ],
        }),
        addColumns({
          table: 'movimientos',
          columns: [
            { name: 'fv_anterior_ts', type: 'number', isOptional: true, isIndexed: true },
            { name: 'fv_nuevo_ts', type: 'number', isOptional: true, isIndexed: true },
          ],
        }),
        createTable({
          name: 'outbox_jobs',
          columns: [
            { name: 'payload', type: 'string' },
            { name: 'job_type', type: 'string', isIndexed: true },
            { name: 'status', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
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
  // JSI habilita comunicación directa entre JS y C++ (SQLite) — más rápido
  jsi: true,
  onSetUpError: error => {
    console.error('Database failed to load', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Producto, Movimiento, Pedido, OutboxJob],
});
