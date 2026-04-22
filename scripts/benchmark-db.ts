import { createTestDatabase } from '../src/core/database/__tests__/databaseIntegration';
import { Q } from '@nozbe/watermelondb';

/**
 * Script de Benchmark para WatermelonDB (LokiJS - Memoria)
 * Mide el rendimiento de operaciones CRUD básicas.
 */

// Polyfills para Node.js
(global as any).self = global;

const runBenchmark = async () => {
  console.log('🚀 Iniciando Benchmark de WatermelonDB...');
  const db = createTestDatabase();
  const productosTable = db.get('productos');

  // --- ESCRITURA SECUENCIAL ---
  console.log('📝 Test 1: Escritura secuencial (100 registros)...');
  const startWrite = Date.now();
  for (let i = 0; i < 100; i++) {
    await db.write(async () => {
      await productosTable.create((p: any) => {
        p.codBarras = `TEST-${i}`;
        p.sku = `SKU-${i}`;
        p.descripcion = `Producto de prueba ${i}`;
        p.stockMaster = i * 10;
        p.precioWeb = 10.5;
        p.precioTienda = 12.0;
        p.marca = 'Marca Test';
        p.fvActualTs = new Date();
        p.createdAt = Date.now();
        p.updatedAt = Date.now();
      });
    });
  }
  const endWrite = Date.now();
  console.log(`✅ Escritura secuencial completada en ${endWrite - startWrite}ms (${((endWrite - startWrite) / 100).toFixed(2)}ms por registro)`);

  // --- LECTURA ---
  console.log('🔍 Test 2: Lectura con filtros (100 registros)...');
  const startRead = Date.now();
  const allResults = await productosTable.query(Q.where('marca', 'Marca Test')).fetch();
  const endRead = Date.now();
  console.log(`✅ Lectura completada en ${endRead - startRead}ms. Registros encontrados: ${allResults.length}`);

  // --- ACTUALIZACIÓN EN LOTE (BATCH) ---
  console.log('🔄 Test 3: Actualización en lote (100 registros)...');
  const startBatch = Date.now();
  await db.write(async () => {
    const batches = allResults.map(p => 
      p.prepareUpdate((record: any) => {
        record.stockMaster += 1;
      })
    );
    await db.batch(...batches);
  });
  const endBatch = Date.now();
  console.log(`✅ Actualización en lote completada en ${endBatch - startBatch}ms`);

  // --- CONCLUSIÓN ---
  console.log('\n📊 Resumen de Rendimiento:');
  console.log(`- Escritura: ${((100 * 1000) / (endWrite - startWrite)).toFixed(2)} ops/seg`);
  console.log(`- Lectura: ${((100 * 1000) / (endRead - startRead)).toFixed(2)} ops/seg`);
  console.log(`- Batch: ${((100 * 1000) / (endBatch - startBatch)).toFixed(2)} ops/seg`);
};

runBenchmark().catch(err => {
  console.error('❌ Error en el benchmark:', err);
  process.exit(1);
});
