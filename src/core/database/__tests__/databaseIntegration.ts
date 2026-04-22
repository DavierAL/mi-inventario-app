import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from '../schema';
import Producto from '../models/Producto';
import Movimiento from '../models/Movimiento';
import Envio from '../models/Envio';
import OutboxJob from '../models/OutboxJob';
import Log from '../models/Log';
import SyncHistory from '../models/SyncHistory';
import Usuario from '../models/Usuario';

/**
 * Crea una instancia de base de datos en memoria para tests de integración.
 * Utiliza LokiJSAdapter ideal para entornos de Node.js (Jest).
 */
export const createTestDatabase = () => {
  const adapter = new LokiJSAdapter({
    schema,
    useIncrementalIndexedDB: false,
    useWebWorker: false,
  });

  return new Database({
    adapter,
    modelClasses: [Producto, Movimiento, Envio, OutboxJob, Log, SyncHistory, Usuario],
  });
};
