import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import Producto from './models/Producto';
import Movimiento from './models/Movimiento';

const adapter = new SQLiteAdapter({
  schema,
  // Tarea: JSI habilita una comunicación mucho más rápida entre JS y C++ (SQLite)
  jsi: true, 
  onSetUpError: error => {
      console.error("Database failed to load", error);
  }
});

export const database = new Database({
  adapter,
  modelClasses: [Producto, Movimiento],
});
