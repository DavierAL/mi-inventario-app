import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';
import { schema } from './schema';
import Producto from './models/Producto';
import Movimiento from './models/Movimiento';
import Envio from './models/Envio';
import OutboxJob from './models/OutboxJob';
import Log from './models/Log';
import SyncHistory from './models/SyncHistory';

const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 7,
      steps: [
        addColumns({
          table: 'outbox_jobs',
          columns: [
            { name: 'attempts', type: 'number' },
            { name: 'next_retry_at', type: 'number', isOptional: true },
            { name: 'last_error', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 8,
      steps: [
        createTable({
          name: 'logs',
          columns: [
            { name: 'level', type: 'string' },
            { name: 'message', type: 'string' },
            { name: 'context', type: 'string' },
            { name: 'timestamp', type: 'number' },
          ],
        }),
        createTable({
          name: 'sync_history',
          columns: [
            { name: 'last_sync_at', type: 'number' },
            { name: 'status', type: 'string' },
            { name: 'pulled_count', type: 'number' },
            { name: 'pushed_count', type: 'number' },
            { name: 'error_message', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
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
  modelClasses: [Producto, Movimiento, Envio, OutboxJob, Log, SyncHistory],
});
