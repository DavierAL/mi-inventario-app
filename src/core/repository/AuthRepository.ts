import { database } from '../database';
import Usuario from '../database/models/Usuario';
import { UserProfile, UserRole } from '../types/auth';

export const AuthRepository = {
  async saveLocalProfile(profile: UserProfile): Promise<void> {
    await database.write(async () => {
      const usersCollection = database.get<Usuario>('usuarios');
      const existing = await usersCollection.query().fetch();
      
      // Limpiar perfiles anteriores (solo debería haber uno)
      if (existing.length > 0) {
        await Promise.all(existing.map(u => u.destroyPermanently()));
      }

      await usersCollection.create(u => {
        u._raw.id = profile.id; // Usar el ID de Supabase
        u.nombre = profile.nombre;
        u.email = profile.email;
        u.rol = profile.rol;
        u.activo = profile.activo;
      });
    });
  },

  async getLocalProfile(): Promise<UserProfile | null> {
    try {
      const usersCollection = database.get<Usuario>('usuarios');
      const users = await usersCollection.query().fetch();
      if (users.length === 0) return null;

      const u = users[0];
      return {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol as UserRole,
        activo: u.activo,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    } catch (e) {
      console.error('[AuthRepo] Error al cargar perfil local:', e);
      return null;
    }
  },

  async clearLocalProfile(): Promise<void> {
    await database.write(async () => {
      const usersCollection = database.get<Usuario>('usuarios');
      const existing = await usersCollection.query().fetch();
      await Promise.all(existing.map(u => u.destroyPermanently()));
    });
  }
};
