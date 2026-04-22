const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfqyqhpcnyjlkbvkukdz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcXlxaHBjbnlqbGtidmt1a2R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQzMzE5MSwiZXhwIjoyMDkyMDA5MTkxfQ.-CZVZGarxy9Gqenk2N4dWHDOcYtEGLGHWmy7oYXm6RE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConstraints() {
  const { data: users, error: userError } = await supabase.from('usuarios').select('rol');
  if (userError) {
      console.error(userError);
  } else {
      const uniqueRoles = Array.from(new Set(users.map(u => u.rol)));
      console.log('Roles actuales en la tabla:', uniqueRoles);
  }
}

checkConstraints();
