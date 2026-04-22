const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfqyqhpcnyjlkbvkukdz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcXlxaHBjbnlqbGtidmt1a2R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQzMzE5MSwiZXhwIjoyMDkyMDA5MTkxfQ.-CZVZGarxy9Gqenk2N4dWHDOcYtEGLGHWmy7oYXm6RE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function trySql() {
  const sql = `
    ALTER TABLE public.usuarios 
    DROP CONSTRAINT IF EXISTS usuarios_rol_check;

    ALTER TABLE public.usuarios 
    ADD CONSTRAINT usuarios_rol_check 
    CHECK (rol IN ('admin', 'logistica', 'tienda', 'almacen', 'atencion'));

    UPDATE public.usuarios 
    SET rol = 'tienda' 
    WHERE email = 'tienda@mascotify.app';
  `;

  console.log('Intentando ejecutar SQL vía RPC genérico...');
  
  // Lista de nombres comunes de RPC para ejecutar SQL
  const rpcs = ['exec_sql', 'sql', 'run_sql', 'query'];
  
  for (const rpcName of rpcs) {
    try {
      const { data, error } = await supabase.rpc(rpcName, { sql });
      if (!error) {
        console.log(`Éxito con RPC: ${rpcName}`);
        return;
      }
      console.log(`Fallo con ${rpcName}: ${error.message}`);
    } catch (e) {
      console.log(`Error con ${rpcName}: ${e.message}`);
    }
  }
  
  console.log('No se pudo ejecutar el SQL automáticamente. El usuario deberá hacerlo manualmente en el Dashboard.');
}

trySql();
