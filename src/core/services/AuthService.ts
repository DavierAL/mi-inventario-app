import { supabase } from '../database/supabase';
import { UserProfile, UserRole } from '../types/auth';

export const AuthService = {
  async getProfile(userId: string): Promise<{ profile: UserProfile | null; error?: string }> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol, activo, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('[Auth] Error al obtener perfil:', profileError);
        return { profile: null, error: 'Perfil no encontrado en la base de datos' };
      }

      return {
        profile: {
          id: profile.id,
          nombre: profile.nombre,
          email: profile.email,
          rol: profile.rol as UserRole,
          activo: profile.activo,
          createdAt: new Date(profile.created_at).getTime(),
          updatedAt: new Date(profile.updated_at).getTime(),
        }
      };
    } catch (err) {
      console.error('[Auth] Error fatal en getProfile:', err);
      return { profile: null, error: 'Error inesperado al obtener perfil' };
    }
  },

  async login(email: string, pass: string): Promise<{ user: UserProfile | null; error?: string }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (authError) return { user: null, error: authError.message };
      if (!authData.user) return { user: null, error: 'No se pudo obtener el usuario' };

      const { profile, error } = await this.getProfile(authData.user.id);
      if (error) return { user: null, error };

      return { user: profile };
    } catch (err) {
      console.error('[Auth] Fatal Error:', err);
      return { user: null, error: 'Ocurrió un error inesperado durante el login' };
    }
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }
};
