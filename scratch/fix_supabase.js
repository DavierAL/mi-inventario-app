const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfqyqhpcnyjlkbvkukdz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcXlxaHBjbnlqbGtidmt1a2R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQzMzE5MSwiZXhwIjoyMDkyMDA5MTkxfQ.-CZVZGarxy9Gqenk2N4dWHDOcYtEGLGHWmy7oYXm6RE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumn() {
  console.log('Attempting to add pod_url column to envios table...');
  // We can use RPC or just try to run a raw SQL if we had an endpoint for it.
  // Supabase JS client doesn't support raw SQL unless via an RPC.
  // Let's check if there's a 'exec_sql' RPC or similar.
  
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE envios ADD COLUMN IF NOT EXISTS pod_url TEXT;' });
  
  if (error) {
    console.error('Error adding column via RPC:', error);
    console.log('Trying another way: updating syncService to NOT select pod_url');
  } else {
    console.log('Column added successfully!');
  }
}

addColumn();
