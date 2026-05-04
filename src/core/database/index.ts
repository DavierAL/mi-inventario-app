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
import Usuario from './models/Usuario';
import LogisticaHistorial from './models/LogisticaHistorial';
import MarcaControl from './models/MarcaControl';

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
    {
      toVersion: 9,
      steps: [
        createTable({
          name: 'usuarios',
          columns: [
            { name: 'nombre', type: 'string' },
            { name: 'email', type: 'string', isIndexed: true },
            { name: 'rol', type: 'string' },
            { name: 'activo', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 10,
      steps: [
        addColumns({
          table: 'envios',
          columns: [
            { name: 'supabase_id', type: 'string', isOptional: true },
            { name: 'pod_url', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 11,
      steps: [
        addColumns({
          table: 'productos',
          columns: [
            { name: 'fv_actual_ts', type: 'number', isOptional: true },
            { name: 'fecha_edicion', type: 'string', isOptional: true },
            { name: 'comentarios', type: 'string', isOptional: true },
            { name: 'marca', type: 'string', isOptional: true },
            { name: 'imagen', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 12,
      steps: [
        createTable({
          name: 'logistica_historial',
          columns: [
            { name: 'envio_id', type: 'string', isIndexed: true },
            { name: 'cod_pedido', type: 'string', isIndexed: true },
            { name: 'estado_anterior', type: 'string' },
            { name: 'estado_nuevo', type: 'string' },
            { name: 'timestamp', type: 'number', isIndexed: true },
            { name: 'operador', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 13,
      steps: [
        addColumns({
          table: 'logistica_historial',
          columns: [
            { name: 'rol_usuario', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 14,
      steps: [
        createTable({
          name: 'marcas_control',
          columns: [
            { name: 'nombre', type: 'string', isIndexed: true },
            { name: 'dias_rango', type: 'number' },
            { name: 'ultimo_conteo', type: 'number', isOptional: true },
            { name: 'inventariar', type: 'boolean' },
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
  jsi: true,
  onSetUpError: error => {
    console.error('Database failed to load', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Producto, Movimiento, Envio, OutboxJob, Log, SyncHistory, Usuario, LogisticaHistorial, MarcaControl],
});
