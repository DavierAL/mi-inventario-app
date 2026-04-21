// scripts/run-migration.js
const URL = "https://xfqyqhpcnyjlkbvkukdz.supabase.co/functions/v1/migrate-orders";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcXlxaHBjbnlqbGtidmt1a2R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQzMzE5MSwiZXhwIjoyMDkyMDA5MTkxfQ.-CZVZGarxy9Gqenk2N4dWHDOcYtEGLGHWmy7oYXm6RE";

async function runMigration() {
  let page = 1;
  let hasMore = true;
  let totalMigrados = 0;

  console.log("🚀 Iniciando migración automática...");

  while (hasMore) {
    console.log(`\n📦 Procesando página ${page}...`);
    
    try {
      const response = await fetch(URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page, per_page: 50 })
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ ${result.message}`);
        totalMigrados += (result.migrados || 0);
        hasMore = result.hasMore;
        page = result.nextPage;
        
        if (hasMore) {
          // Pequeña pausa para evitar bloqueos por rate limit
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        console.error("❌ Error en la migración:", result.error || result);
        hasMore = false;
      }
    } catch (error) {
      console.error("💥 Error de conexión:", error.message);
      hasMore = false;
    }
  }

  console.log(`\n🏁 Migración finalizada. Total pedidos nuevos procesados: ${totalMigrados}`);
}

runMigration();
