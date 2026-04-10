import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../../../core/database';
import { collection, query, where, getDocs, writeBatch, doc, limit } from 'firebase/firestore';
import { dbFirebase } from '../../../core/database/firebase';

export async function syncConFirebase(options: { forceFull?: boolean } = {}) {
  await synchronize({
    database,
    // 1. PULL: Descargar cambios desde la nube (Firestore)
    pullChanges: async ({ lastPulledAt }: { lastPulledAt?: number }) => {
      // Si forzamos sincronización completa o es la primera vez, empezamos en 0
      const timestamp = options.forceFull ? 0 : (lastPulledAt ? lastPulledAt : 0);
      
      if (options.forceFull) {
        console.log("=====> SYNC RECOVERY: Forzando descarga completa desde el servidor...");
      }

      const productosRef = collection(dbFirebase, 'productos');
      // Importante: Requerimos el campo 'server_updated_at' en Firestore para sync eficiente
      const q = query(productosRef, where('server_updated_at', '>', timestamp));
      const snapshot = await getDocs(q);


      const updated: any[] = [];
      const deleted: string[] = [];

      snapshot.forEach((snapshotDoc) => {
        const data = snapshotDoc.data();
        
        // Helper defensivo para manejar inconsistencia de mayúsculas en Firestore
        const getVal = (key: string) => data[key] ?? data[key.toLowerCase()] ?? data[key.charAt(0).toUpperCase() + key.slice(1)];

        const codBarras = getVal('Cod_Barras');
        const sku = getVal('SKU');
        const desc = getVal('Descripcion');

        // VALIDACIÓN CRÍTICA: No aceptar objetos corruptos que borrarían la DB local
        if (!codBarras && !sku && !desc) {
          console.warn(`[Sync] Saltando doc ${snapshotDoc.id} por falta de campos críticos.`);
          return;
        }

        updated.push({
          id: snapshotDoc.id,
          cod_barras: codBarras,
          sku: sku,
          descripcion: desc,
          stock_master: getVal('Stock_Master') ?? 0,
          precio_web: getVal('Precio_Web') ?? 0,
          precio_tienda: getVal('Precio_Tienda') ?? 0,
          fv_actual: getVal('FV_Actual'),
          fecha_edicion: getVal('Fecha_edicion'),
          comentarios: getVal('Comentarios'),
          marca: getVal('Marca'),
          imagen: getVal('Imagen'),
          created_at: data.created_at || Date.now(),
          updated_at: data.server_updated_at || Date.now()
        });
      });

      return {
        changes: {
          productos: { created: [], updated, deleted },
          movimientos: { created: [], updated: [], deleted: [] }, // El historial es push-only
        },
        timestamp: Date.now(),
      };
    },

    // 2. PUSH: Enviar cambios locales (SQLite) a la nube (Firestore)
    pushChanges: async ({ changes }: { changes: any }) => {
      const batch = writeBatch(dbFirebase);

      // --- Sincronizar Productos ---
      const productosChanges = changes.productos;
      if (productosChanges) {
        const allProdChanges = [...productosChanges.created, ...productosChanges.updated];
        allProdChanges.forEach((record: any) => {
          const ref = doc(dbFirebase, 'productos', record.id);
          batch.set(ref, {
            Cod_Barras: record.cod_barras,
            SKU: record.sku,
            Descripcion: record.descripcion,
            Stock_Master: record.stock_master,
            Precio_Web: record.precio_web,
            Precio_Tienda: record.precio_tienda,
            FV_Actual: record.fv_actual,
            Fecha_edicion: record.fecha_edicion,
            Comentarios: record.comentarios,
            Marca: record.marca,
            Imagen: record.imagen,
            server_updated_at: Date.now()
          }, { merge: true });
        });
      }

      // --- Sincronizar Historial (Movimientos) ---
      const movimientosChanges = changes.movimientos;
      if (movimientosChanges) {
        const allMovChanges = [...movimientosChanges.created, ...movimientosChanges.updated];
        allMovChanges.forEach((record: any) => {
          // Usamos addDoc indirectamente mediante setDoc con ID de Watermelon o un ID nuevo
          const ref = doc(collection(dbFirebase, 'historial'));
          batch.set(ref, {
            productoId: record.producto_id,
            sku: record.sku,
            descripcion: record.descripcion,
            marca: record.marca,
            accion: record.accion,
            cambios: {
              fvAnterior: record.fv_anterior,
              fvNuevo: record.fv_nuevo,
              comentario: record.comentario
            },
            dispositivo: record.dispositivo,
            timestamp: record.timestamp
          });
        });
      }

      await batch.commit();
    },
    migrationsEnabledAtVersion: 1,
  });
}
