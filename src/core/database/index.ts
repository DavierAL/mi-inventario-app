import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';
import { schema } from './schema';
import Producto from './models/Producto';
import Movimiento from './models/Movimiento';
import Envio from './models/Envio';
import OutboxJob from './models/OutboxJob';

const migrations = schemaMigrations({
  migrations: [
    // ... (keeping migrations as they are for now, though they refer to old tables)
  ],
});

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
  onSetUpError: error => {
    console.error('Database failed to load', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Producto, Movimiento, Envio, OutboxJob],
});
