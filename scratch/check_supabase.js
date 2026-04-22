const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfqyqhpcnyjlkbvkukdz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcXlxaHBjbnlqbGtidmt1a2R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQzMzE5MSwiZXhwIjoyMDkyMDA5MTkxfQ.-CZVZGarxy9Gqenk2N4dWHDOcYtEGLGHWmy7oYXm6RE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking envios table columns...');
  const { data, error } = await supabase
    .from('envios')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching envios:', error);
  } else if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
  } else {
    console.log('No data in envios table to check columns.');
    // Try to get columns from another way or insert a dummy
  }

  console.log('\nChecking productos table columns...');
  const { data: dataP, error: errorP } = await supabase
    .from('productos')
    .select('*')
    .limit(1);
    
  if (errorP) {
    console.error('Error fetching productos:', errorP);
  } else if (dataP && dataP.length > 0) {
    console.log('Columns found:', Object.keys(dataP[0]));
  }
}

checkSchema();
