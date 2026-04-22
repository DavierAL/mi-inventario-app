const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfqyqhpcnyjlkbvkukdz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcXlxaHBjbnlqbGtidmt1a2R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQzMzE5MSwiZXhwIjoyMDkyMDA5MTkxfQ.-CZVZGarxy9Gqenk2N4dWHDOcYtEGLGHWmy7oYXm6RE';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const roles = ['admin', 'logistica', 'tienda', 'almacen', 'atencion'];

async function createTestUsers() {
  for (const role of roles) {
    const email = `${role}@mascotify.app`;
    const password = 'TestPassword123!';
    
    console.log(`Creando usuario: ${email} con rol: ${role}...`);
    
    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre: `Usuario ${role.charAt(0).toUpperCase() + role.slice(1)}` }
    });
    
    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`El usuario ${email} ya existe.`);
        // Si existe, intentar actualizar el rol en la tabla usuarios
        const { data: existingUser } = await supabase.from('usuarios').select('id').eq('email', email).single();
        if (existingUser) {
           await supabase.from('usuarios').update({ rol: role }).eq('id', existingUser.id);
           console.log(`Rol actualizado para ${email}`);
        }
        continue;
      }
      console.error(`Error creando auth user ${email}:`, authError.message);
      continue;
    }
    
    const userId = authData.user.id;
    console.log(`Usuario Auth creado ID: ${userId}`);
    
    // 2. Insertar o actualizar en la tabla public.usuarios
    // Es probable que haya un trigger, pero forzamos el rol por si acaso.
    const { error: profileError } = await supabase
      .from('usuarios')
      .upsert({
        id: userId,
        nombre: `Usuario ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        email: email,
        rol: role,
        activo: true
      });
      
    if (profileError) {
      console.error(`Error creando perfil para ${email}:`, profileError.message);
    } else {
      console.log(`Perfil creado exitosamente para ${email} con rol ${role}`);
    }
  }
}

createTestUsers();
