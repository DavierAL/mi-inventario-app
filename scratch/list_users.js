const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfqyqhpcnyjlkbvkukdz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcXlxaHBjbnlqbGtidmt1a2R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQzMzE5MSwiZXhwIjoyMDkyMDA5MTkxfQ.-CZVZGarxy9Gqenk2N4dWHDOcYtEGLGHWmy7oYXm6RE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAll() {
  console.log('--- USUARIOS EN AUTH ---');
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) console.error(authError);
  else users.forEach(u => console.log(`- ${u.email} (${u.id})`));

  console.log('\n--- PERFILES EN PUBLIC.USUARIOS ---');
  const { data: profiles, error: profError } = await supabase.from('usuarios').select('email, rol');
  if (profError) console.error(profError);
  else profiles.forEach(p => console.log(`- ${p.email}: ${p.rol}`));
}

listAll();
